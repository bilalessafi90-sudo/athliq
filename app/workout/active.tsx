import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  SafeAreaView, Alert, TextInput, Vibration, Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useCompleteSession, useLastSessionLogs } from '../../src/hooks/useWorkout';
import { workoutService } from '../../src/services/workoutService';
import { useAuthStore } from '../../src/stores/authStore';
import { useT, useLanguageStore } from '../../src/stores/languageStore';
import { translateExercise } from '../../src/i18n/exerciseTranslations';
import { Colors, Typography, Spacing, Radius } from '../../src/constants';
import { ActiveSet } from '../../src/types';
import { ProgressBar } from '../../src/components/ui';
import { getExerciseType, formatSetValue, parseTargetDefault, ExerciseType } from '../../src/utils/exerciseType';

export default function ActiveWorkoutScreen() {
  const {
    activeSession, activeDay, activeExercises, currentExerciseIndex,
    sessionStartTime, updateSet, completeSet, toggleSetCompleted,
    nextExercise, prevExercise, endSession,
  } = useWorkoutStore();
  const { user, profile } = useAuthStore();
  const completeSessionMutation = useCompleteSession();
  const qc = useQueryClient();
  const t = useT();
  const { language } = useLanguageStore();

  // ── Completion summary (replaces the workout screen when done) ──────────
  interface CompletionData {
    dayName: string;
    completedAt: Date;
    durationMin: number;
    completedSets: number;
    totalSets: number;
    totalVolume: number; // sum of weight × reps across all completed sets
    exercises: Array<{ name: string; completedSets: number; totalSets: number }>;
  }
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);

  const startRef = useRef<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [restDisplay, setRestDisplay] = useState<number | null>(null);
  const restEndTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Holds the ID of the scheduled "rest complete" notification so we can cancel it.
  const restNotifIdRef = useRef<string | null>(null);

  // ── Exercise timer (for time-based exercises) ─────────────────────────
  // Status drives button label; remaining drives the display.
  // Refs are used inside the interval closure to avoid stale state.
  const [exTimerStatus, setExTimerStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [exTimerElapsed, setExTimerElapsed] = useState(0);  // count-up seconds
  const [exTimerSetIdx, setExTimerSetIdx] = useState(0);
  const exTimerStatusRef   = useRef<'idle' | 'running' | 'paused'>('idle');
  const exTimerSegStartRef = useRef<number | null>(null);   // when current segment started (ms)
  const exTimerAccumRef    = useRef(0);                     // seconds accumulated before this segment
  const exTimerElapsedRef  = useRef(0);                     // total elapsed seconds (updated every tick)
  const exTimerTargetRef   = useRef(0);                     // target seconds (reference only, no ceiling)

  const currentEx = activeExercises[currentExerciseIndex];
  const we = currentEx?.workoutExercise;

  // Fetch previous session logs for this workout day
  const { data: prevLogs = [] } = useLastSessionLogs(activeDay?.id);

  // Build a map: exercise_id + '_' + setNumber -> {weight, reps}
  const prevLogsMap: Record<string, { weight: number; reps: number }> = {};
  for (const log of prevLogs) {
    const key = `${log.exercise_id}_${log.set_number}`;
    prevLogsMap[key] = { weight: log.weight, reps: log.reps };
  }

  // ── Notification permission + Android channel setup ────────────────────
  useEffect(() => {
    const setup = async () => {
      await Notifications.requestPermissionsAsync().catch(() => {});
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('rest-timer', {
          name: 'Rest Timer',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 300, 100, 300],
          sound: 'default',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        }).catch(() => {});
      }
    };
    setup();
    // Cancel any leftover notification when the workout screen unmounts
    return () => {
      if (restNotifIdRef.current) {
        Notifications.cancelScheduledNotificationAsync(restNotifIdRef.current).catch(() => {});
        restNotifIdRef.current = null;
      }
    };
  }, []);

  // ── Helpers: schedule / cancel the lock-screen notification ────────────
  const cancelRestNotif = useCallback(() => {
    if (restNotifIdRef.current) {
      Notifications.cancelScheduledNotificationAsync(restNotifIdRef.current).catch(() => {});
      restNotifIdRef.current = null;
    }
  }, []);

  const scheduleRestNotif = useCallback(async (endTimeMs: number) => {
    cancelRestNotif();
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: language === 'de' ? '💪 Pause vorbei!' : '💪 Rest Complete!',
          body: language === 'de'
            ? 'Dein nächster Satz wartet auf dich.'
            : 'Time to start your next set.',
          sound: true,
          ...(Platform.OS === 'android' && { channelId: 'rest-timer' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(endTimeMs),
        },
      });
      restNotifIdRef.current = id;
    } catch {
      // Permission denied or scheduling error — silent fail, vibration still works.
    }
  }, [cancelRestNotif, language]);

  // ── Single interval: drives elapsed timer and rest countdown ────────────
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const nowElapsed = Math.round((Date.now() - startRef.current) / 1000);
      setElapsed(nowElapsed);

      if (restEndTimeRef.current !== null) {
        const remaining = Math.max(0, Math.round((restEndTimeRef.current - Date.now()) / 1000));
        setRestDisplay(remaining);
        if (remaining === 0) {
          restEndTimeRef.current = null;
          // App is in foreground — cancel the lock-screen notification so it
          // doesn't fire twice; we already vibrate to signal the end.
          cancelRestNotif();
          if (Platform.OS !== 'web') Vibration.vibrate([0, 300, 100, 300]);
        }
      }

      // Exercise count-up (only ticks when running)
      if (exTimerStatusRef.current === 'running' && exTimerSegStartRef.current !== null) {
        const elapsed = exTimerAccumRef.current + Math.round((Date.now() - exTimerSegStartRef.current) / 1000);
        if (elapsed !== exTimerElapsedRef.current) {
          exTimerElapsedRef.current = elapsed;
          setExTimerElapsed(elapsed);
        }
      }
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [cancelRestNotif]);

  // ── Reset exercise timer whenever the active exercise changes ──────────
  useEffect(() => {
    const target = Math.max(parseTargetDefault(we?.reps ?? ''), 5);
    exTimerTargetRef.current   = target;
    exTimerSegStartRef.current = null;
    exTimerAccumRef.current    = 0;
    exTimerElapsedRef.current  = 0;
    exTimerStatusRef.current   = 'idle';
    setExTimerStatus('idle');
    setExTimerElapsed(0);
    // Start from the first incomplete set
    const idx = (activeExercises[currentExerciseIndex]?.sets ?? [])
      .findIndex((s) => !s.completed);
    setExTimerSetIdx(idx >= 0 ? idx : 0);
  }, [currentExerciseIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const ex = (we as any)?.exercise;
  const sets = currentEx?.sets ?? [];

  // Detect whether this exercise is reps-based or time-based (or distance).
  // We read the target reps string that's already stored on the workout exercise,
  // e.g. '8-12' → reps, '30-60s' → time, '1min' → time.
  const exerciseType: ExerciseType = getExerciseType(we?.reps ?? '');
  const isTimeBased = exerciseType === 'time';

  // Per-exercise counts (used in the set-logger header)
  const completedSets = sets.filter((s) => s.completed).length;
  const totalSets = sets.length;

  // Workout-wide counts (used in the progress strip)
  const totalCompletedSets = activeExercises.reduce(
    (acc, ae) => acc + ae.sets.filter((s) => s.completed).length,
    0,
  );
  const totalAllSets = Math.max(
    activeExercises.reduce((a, ae) => a + ae.sets.length, 0),
    1,
  );
  const overallProgress = totalCompletedSets / totalAllSets;
  const pct = Math.round(overallProgress * 100);

  // ── Exercise timer handlers ─────────────────────────────────────────────
  const handleStartExTimer = () => {
    // Segment starts now; accumulated time from before is in exTimerAccumRef
    exTimerSegStartRef.current = Date.now();
    exTimerStatusRef.current   = 'running';
    setExTimerStatus('running');
  };

  const handlePauseExTimer = () => {
    // Freeze the accumulated total so Resume continues from here
    exTimerAccumRef.current    = exTimerElapsedRef.current;
    exTimerSegStartRef.current = null;
    exTimerStatusRef.current   = 'paused';
    setExTimerStatus('paused');
  };

  const handleResetExTimer = () => {
    exTimerSegStartRef.current = null;
    exTimerAccumRef.current    = 0;
    exTimerElapsedRef.current  = 0;
    exTimerStatusRef.current   = 'idle';
    setExTimerStatus('idle');
    setExTimerElapsed(0);
  };

  // Advance the active-set pointer to the next incomplete set after one finishes.
  const advanceExTimerSet = (completedIdx: number) => {
    const nextIdx = sets.findIndex((s, i) => i > completedIdx && !s.completed);
    const newIdx  = nextIdx >= 0 ? nextIdx : completedIdx;
    setExTimerSetIdx(newIdx);
    handleResetExTimer();
  };

  const handleToggleSet = (setIdx: number) => {
    const set = sets[setIdx];

    if (set.completed) {
      // Un-complete: let the user fix a mistake. Cancel rest timer so it
      // doesn't fire for the set they just undid.
      toggleSetCompleted(currentExerciseIndex, setIdx);
      handleSkipRest();
      return;
    }

    // For time-based: record actual elapsed time from the count-up timer.
    // If the timer was never started (elapsed = 0), fall back to any manually
    // entered value, or the target default.
    if (isTimeBased) {
      const timerElapsed = exTimerElapsedRef.current;
      if (timerElapsed > 0) {
        updateSet(currentExerciseIndex, setIdx, 'reps', timerElapsed);
      } else if (set.reps == null || set.reps === 0) {
        updateSet(currentExerciseIndex, setIdx, 'reps', exTimerTargetRef.current);
      }
      // If timer unused but user already typed a value, keep it as-is
    }

    // For reps-based: still require a value.
    if (!isTimeBased && !set.reps) {
      Alert.alert('Missing Data', `Please enter ${t.enterReps} before marking complete.`);
      return;
    }

    completeSet(currentExerciseIndex, setIdx);

    // For time-based: stop the exercise timer and advance to the next set.
    if (isTimeBased) {
      advanceExTimerSet(setIdx);
    }

    // Start rest timer
    const restSecs = we?.rest_seconds ?? 60;
    const endTimeMs = Date.now() + restSecs * 1000;
    restEndTimeRef.current = endTimeMs;
    setRestDisplay(restSecs);
    // Schedule lock-screen notification so user sees it when the phone is locked
    scheduleRestNotif(endTimeMs);
  };

  const handleSkipRest = () => {
    restEndTimeRef.current = null;
    setRestDisplay(null);
    cancelRestNotif();
  };

  const handleFinish = () => {
    Alert.alert(
      t.finishWorkout,
      'Are you sure you want to end this session?',
      [
        { text: 'Keep Going', style: 'cancel' },
        { text: 'Finish', style: 'destructive', onPress: finishWorkout },
      ],
    );
  };

  const finishWorkout = async () => {
    if (!activeSession || !user) return;
    const durationMin = Math.max(Math.round(elapsed / 60), 1);

    // ── Snapshot summary data BEFORE clearing the store ──────────────────
    const snapshot: CompletionData = {
      dayName: activeDay?.name ?? 'Workout',
      completedAt: new Date(),
      durationMin,
      completedSets: activeExercises.reduce(
        (a, ae) => a + ae.sets.filter((s) => s.completed).length, 0,
      ),
      totalSets: activeExercises.reduce((a, ae) => a + ae.sets.length, 0),
      totalVolume: Math.round(
        activeExercises.reduce(
          (acc, ae) =>
            acc +
            ae.sets
              .filter((s) => s.completed)
              .reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0),
          0,
        ),
      ),
      exercises: activeExercises.map((ae) => ({
        name: (ae.workoutExercise as any).exercise?.name ?? 'Exercise',
        completedSets: ae.sets.filter((s) => s.completed).length,
        totalSets: ae.sets.length,
      })),
    };

    // ── Persist to DB ─────────────────────────────────────────────────────
    try {
      await completeSessionMutation.mutateAsync({
        sessionId: activeSession.id,
        duration: durationMin,
      });

      const logs: any[] = [];
      for (const ae of activeExercises) {
        for (const set of ae.sets) {
          if (set.completed && set.reps != null) {
            logs.push({
              session_id: activeSession.id,
              exercise_id: ae.workoutExercise.exercise_id,
              set_number: set.setNumber,
              reps: set.reps,
              weight: set.weight ?? 0,
              unit: profile?.weight_unit ?? 'kg',
            });
          }
        }
      }
      if (logs.length > 0) await workoutService.logExerciseSets(logs);

      // Warm the cache so the workout tab shows ✓ instantly when we navigate.
      await qc.invalidateQueries({ queryKey: ['recentSessions'] });
    } catch (e) {
      console.error('Error finishing workout:', e);
      // Even on error we still show the completion screen — the data is
      // already saved optimistically by the mutation.
    }

    // ── Tear down timers + store, then show the summary ───────────────────
    cancelRestNotif();
    endSession();          // clears Zustand store; snapshot is safely in local state
    setCompletionData(snapshot);
  };

  const handleCompletionDone = () => {
    setCompletionData(null);
    router.replace('/(tabs)/workout');
  };

  // ── Completion summary view ────────────────────────────────────────────
  if (completionData) {
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={cs.scroll} showsVerticalScrollIndicator={false}>
          {/* Trophy + headline */}
          <View style={cs.heroSection}>
            <Text style={cs.trophy}>🏆</Text>
            <Text style={cs.headline}>{t.workoutComplete}</Text>
            <Text style={cs.dayName}>{completionData.dayName}</Text>
            <Text style={cs.timestamp}>
              {format(completionData.completedAt, 'EEEE, MMM d · h:mm a')}
            </Text>
          </View>

          {/* Stats strip */}
          <View style={cs.statsRow}>
            <CompletionStat icon="⏱" label="Duration" value={`${completionData.durationMin} min`} />
            <View style={cs.statDivider} />
            <CompletionStat
              icon="💪"
              label="Sets done"
              value={`${completionData.completedSets}/${completionData.totalSets}`}
            />
            {completionData.totalVolume > 0 && (
              <>
                <View style={cs.statDivider} />
                <CompletionStat
                  icon="🏋️"
                  label="Volume"
                  value={`${completionData.totalVolume} ${profile?.weight_unit ?? 'kg'}`}
                />
              </>
            )}
          </View>

          {/* Per-exercise breakdown */}
          <View style={cs.section}>
            <Text style={cs.sectionTitle}>Exercises</Text>
            {completionData.exercises.map((ex, i) => {
              const allDone = ex.completedSets === ex.totalSets;
              return (
                <View key={i} style={[cs.exRow, allDone && cs.exRowDone]}>
                  <Text style={[cs.exName, allDone && cs.exNameDone]} numberOfLines={1}>
                    {ex.name}
                  </Text>
                  <View style={[cs.exBadge, allDone && cs.exBadgeDone]}>
                    <Text style={[cs.exBadgeText, allDone && cs.exBadgeTextDone]}>
                      {allDone ? '✓ ' : ''}{ex.completedSets}/{ex.totalSets} sets
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Done button */}
          <TouchableOpacity onPress={handleCompletionDone} style={cs.doneBtn}>
            <Text style={cs.doneBtnText}>Back to Workouts</Text>
          </TouchableOpacity>

          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!currentEx) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No active workout.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: Colors.primary }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const restActive = restDisplay !== null && restDisplay > 0;

  // Translated exercise name + instructions (falls back to English if no translation exists)
  const exT = translateExercise(ex?.name ?? '', ex?.instructions ?? '', language);

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Top Bar ──────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleFinish} style={styles.finishBtn}>
          <Text style={styles.finishText}>✕ {t.finishWorkout}</Text>
        </TouchableOpacity>
        <View style={styles.timerWrap}>
          <Text style={styles.timer}>{formatTime(elapsed)}</Text>
        </View>
        <Text style={styles.exerciseCount}>
          {currentExerciseIndex + 1}/{activeExercises.length}
        </Text>
      </View>

      {/* ── Progress Strip ───────────────────────────────────────── */}
      <View style={styles.progressStrip}>
        <View style={styles.progressLabelRow}>
          <View style={styles.progressLabelLeft}>
            <Text style={styles.progressPct}>{pct}%</Text>
            <Text style={styles.progressPctLabel}> complete</Text>
          </View>
          <Text style={styles.progressSetsLabel}>
            {totalCompletedSets}/{totalAllSets} sets done
          </Text>
        </View>
        <ProgressBar progress={overallProgress} color={Colors.primary} height={7} animated />
      </View>

      {/* ── Rest Timer ───────────────────────────────────────────── */}
      {restDisplay !== null && restDisplay > 0 && (
        <View style={styles.restBanner}>
          <Text style={styles.restIcon}>⏱</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.restText}>{t.rest}  {formatTime(restDisplay)}</Text>
            {restEndTimeRef.current && (
              <Text style={styles.restEndHint}>
                🔔 {language === 'de' ? 'Endet um' : 'Ends at'}{' '}
                {new Date(restEndTimeRef.current).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={handleSkipRest} style={styles.skipRest}>
            <Text style={styles.skipRestText}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Exercise Header ──────────────────────────────────────── */}
        <View style={styles.exHeader}>
          <Text style={styles.exName}>{exT.name || 'Exercise'}</Text>
          <Text style={styles.exMuscles}>{ex?.muscle_groups?.join(' · ')}</Text>
          <Text style={styles.exTarget}>
            {isTimeBased
              ? `Target: ${we?.sets} ${t.sets} × ${we?.reps} · ${we?.rest_seconds}s ${t.rest}`
              : `Target: ${we?.sets} ${t.sets} × ${we?.reps} ${t.reps} · ${we?.rest_seconds}s ${t.rest}`}
          </Text>
        </View>

        {/* ── Set Logger (reps) or Timer Panel (time-based) ───────── */}
        {isTimeBased ? (
          <>
            <ExerciseTimerPanel
              elapsed={exTimerElapsed}
              target={exTimerTargetRef.current}
              status={exTimerStatus}
              setIdx={exTimerSetIdx}
              totalSets={sets.length}
              onStart={handleStartExTimer}
              onPause={handlePauseExTimer}
              onReset={handleResetExTimer}
            />
            <SetStatusRows
              sets={sets}
              activeSetIdx={exTimerSetIdx}
              unit={profile?.weight_unit ?? 'kg'}
              onWeightChange={(i, v) => updateSet(currentExerciseIndex, i, 'weight', parseFloat(v) || 0)}
              onDurationChange={(i, v) => updateSet(currentExerciseIndex, i, 'reps', parseInt(v) || 0)}
              onToggle={(i) => handleToggleSet(i)}
            />
          </>
        ) : (
          <View style={styles.setsSection}>
            <View style={styles.setsHeader}>
              <Text style={[styles.col, { flex: 0.5 }]}>{t.sets.toUpperCase()}</Text>
              <Text style={[styles.col, { flex: 1 }]}>{t.enterWeight} ({profile?.weight_unit ?? 'kg'})</Text>
              <Text style={[styles.col, { flex: 1 }]}>{t.enterReps}</Text>
              <Text style={[styles.col, { flex: 0.8 }]}>{t.setComplete}</Text>
            </View>
            {sets.map((set, i) => {
              const prevKey = `${we?.exercise_id}_${set.setNumber}`;
              const prev = prevLogsMap[prevKey];
              return (
                <SetRow
                  key={i}
                  set={set}
                  index={i}
                  exerciseType={exerciseType}
                  unit={profile?.weight_unit ?? 'kg'}
                  prevWeight={prev?.weight}
                  prevReps={prev?.reps}
                  onWeightChange={(v) => updateSet(currentExerciseIndex, i, 'weight', parseFloat(v) || 0)}
                  onRepsChange={(v) => updateSet(currentExerciseIndex, i, 'reps', parseInt(v) || 0)}
                  onToggle={() => handleToggleSet(i)}
                />
              );
            })}
          </View>
        )}

        {/* ── Exercise Notes ───────────────────────────────────────── */}
        {exT.instructions ? (
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>{t.howToPerform}</Text>
            <Text style={styles.instructionsText}>{exT.instructions}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Navigation ───────────────────────────────────────────── */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={prevExercise}
          disabled={currentExerciseIndex === 0}
          style={[styles.navBtn, currentExerciseIndex === 0 && styles.navBtnDisabled]}
        >
          <Text style={styles.navBtnText}>← Prev</Text>
        </TouchableOpacity>

        <View style={styles.setProgress}>
          <Text style={styles.setProgressText}>
            {completedSets}/{totalSets} {t.sets.toLowerCase()}
          </Text>
          <Text style={styles.setProgressSub}>this exercise</Text>
        </View>

        {currentExerciseIndex < activeExercises.length - 1 ? (
          <TouchableOpacity onPress={nextExercise} style={styles.navBtnNext}>
            <Text style={styles.navBtnNextText}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={finishWorkout} style={styles.navBtnFinish}>
            <Text style={styles.navBtnNextText}>Finish 🏆</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Set Row ──────────────────────────────────────────────────────────────────

interface SetRowProps {
  set: ActiveSet;
  index: number;
  exerciseType: ExerciseType;
  unit: string;
  prevWeight?: number;
  prevReps?: number;
  onWeightChange: (v: string) => void;
  onRepsChange: (v: string) => void;
  onToggle: () => void;
}

function SetRow({
  set, index, exerciseType, unit,
  prevWeight, prevReps,
  onWeightChange, onRepsChange, onToggle,
}: SetRowProps) {
  const isTime = exerciseType === 'time';

  // When a time-based set is done, format the stored seconds nicely.
  const repsDisplayDone = isTime
    ? formatSetValue(set.reps, 'time')
    : set.reps != null ? String(set.reps) : '';

  return (
    <View style={[sr.row, set.completed && sr.rowDone]}>
      {/* Set number + edit hint */}
      <View style={[sr.col, { flex: 0.5, flexDirection: 'column', alignItems: 'center' }]}>
        <Text style={[sr.setNum, set.completed && sr.setNumDone]}>{index + 1}</Text>
        {set.completed && <Text style={sr.editHint}>✎</Text>}
      </View>

      {/* Weight input — always editable */}
      <View style={[sr.col, { flex: 1, flexDirection: 'column', alignItems: 'center' }]}>
        <TextInput
          style={[sr.input, set.completed && sr.inputDone]}
          value={set.weight != null ? String(set.weight) : ''}
          onChangeText={onWeightChange}
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
        />
        {prevWeight != null && prevReps != null && (
          <Text style={sr.prevHint}>
            {isTime
              ? `Prev: ${formatSetValue(prevReps, 'time')}`
              : `Prev: ${prevWeight} × ${prevReps}`}
          </Text>
        )}
      </View>

      {/* Reps / Duration input — always editable */}
      <View style={[sr.col, { flex: 1, flexDirection: 'column', alignItems: 'center' }]}>
        {/* When completed, show formatted value; when editing show raw number */}
        {set.completed && isTime ? (
          /* Tappable display — user can still edit by un-completing */
          <View style={[sr.input, sr.inputDone, sr.inputTimeDisplay]}>
            <Text style={sr.inputTimeDoneText}>{repsDisplayDone || '—'}</Text>
          </View>
        ) : (
          <View style={sr.inputRow}>
            <TextInput
              style={[sr.input, sr.inputFlex, set.completed && sr.inputDone]}
              value={set.reps != null ? String(set.reps) : ''}
              onChangeText={onRepsChange}
              placeholder={isTime ? '30' : '0'}
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
            />
            {isTime && (
              <Text style={[sr.unitSuffix, set.completed && sr.unitSuffixDone]}>s</Text>
            )}
          </View>
        )}
      </View>

      {/* Done / undo toggle button */}
      <View style={[sr.col, { flex: 0.8, alignItems: 'center' }]}>
        <TouchableOpacity
          onPress={onToggle}
          style={[sr.doneBtn, set.completed && sr.doneBtnActive]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[sr.doneBtnText, set.completed && sr.doneBtnTextActive]}>
            {set.completed ? '✓' : '○'}
          </Text>
        </TouchableOpacity>
        {set.completed && <Text style={sr.undoHint}>undo</Text>}
      </View>
    </View>
  );
}

// ─── Exercise Timer Panel ─────────────────────────────────────────────────────

interface ExerciseTimerPanelProps {
  elapsed: number;
  target: number;
  status: 'idle' | 'running' | 'paused';
  setIdx: number;
  totalSets: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

function ExerciseTimerPanel({
  elapsed, target, status, setIdx, totalSets, onStart, onPause, onReset,
}: ExerciseTimerPanelProps) {
  // Progress fills toward target; stays at 100% once exceeded
  const progress = target > 0 ? Math.min(elapsed / target, 1) : 0;
  const exceeded = target > 0 && elapsed > target;
  const mm = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const ss = (elapsed % 60).toString().padStart(2, '0');

  return (
    <View style={[tp.card, exceeded && tp.cardExceeded]}>
      {/* Set indicator */}
      <View style={tp.topRow}>
        <Text style={tp.setLabel}>Set {setIdx + 1} of {totalSets}</Text>
        <View style={tp.dots}>
          {Array.from({ length: totalSets }).map((_, i) => (
            <View key={i} style={[tp.dot, i === setIdx && tp.dotActive]} />
          ))}
        </View>
      </View>

      {/* Big count-up timer */}
      <Text style={[tp.countdown, exceeded && tp.countdownExceeded]}>
        {mm}:{ss}
      </Text>

      {/* Filling progress bar — turns green when target exceeded */}
      <View style={tp.barWrap}>
        <ProgressBar
          progress={progress}
          color={exceeded ? Colors.accentGreen : Colors.primary}
          height={8}
          animated
        />
      </View>
      <Text style={[tp.targetLabel, exceeded && tp.targetLabelExceeded]}>
        {exceeded
          ? `+${formatSetValue(elapsed - target, 'time')} past target`
          : `Target: ${formatSetValue(target, 'time')}`}
      </Text>

      {/* Controls */}
      <View style={tp.controls}>
        <TouchableOpacity onPress={onReset} style={tp.resetBtn}>
          <Text style={tp.resetText}>↺  Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={status === 'running' ? onPause : onStart}
          style={[tp.startBtn, status === 'running' && tp.pauseActiveBtn]}
        >
          <Text style={tp.startText}>
            {status === 'running' ? '⏸  Pause' : status === 'paused' ? '▶  Resume' : '▶  Start'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Set Status Rows (time-based) ─────────────────────────────────────────────

interface SetStatusRowsProps {
  sets: ActiveSet[];
  activeSetIdx: number;
  unit: string;
  onWeightChange: (setIdx: number, v: string) => void;
  onDurationChange: (setIdx: number, v: string) => void;
  onToggle: (setIdx: number) => void;
}

function SetStatusRows({ sets, activeSetIdx, unit, onWeightChange, onDurationChange, onToggle }: SetStatusRowsProps) {
  return (
    <View style={ssr.container}>
      {sets.map((set, i) => (
        <View
          key={i}
          style={[
            ssr.row,
            i === activeSetIdx && ssr.rowActive,
            set.completed && ssr.rowDone,
          ]}
        >
          {/* Set number */}
          <Text style={[ssr.setNum, set.completed && ssr.setNumDone]}>{i + 1}</Text>

          {/* Optional weight input */}
          <View style={ssr.weightWrap}>
            <TextInput
              style={[ssr.weightInput, set.completed && ssr.weightInputDone]}
              value={set.weight != null && set.weight > 0 ? String(set.weight) : ''}
              onChangeText={(v) => onWeightChange(i, v)}
              placeholder={`0 ${unit}`}
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Duration: editable when done, status label when pending */}
          <View style={ssr.durationWrap}>
            {set.completed ? (
              <View style={ssr.durationEditRow}>
                <TextInput
                  style={ssr.durationInput}
                  value={set.reps != null ? String(set.reps) : ''}
                  onChangeText={(v) => onDurationChange(i, v)}
                  keyboardType="number-pad"
                  placeholderTextColor={Colors.textMuted}
                  placeholder="0"
                />
                <Text style={ssr.durationUnit}>s</Text>
              </View>
            ) : (
              <Text style={[ssr.statusText, i === activeSetIdx && ssr.statusTextActive]}>
                {i === activeSetIdx ? 'Active' : '—'}
              </Text>
            )}
          </View>

          {/* Done toggle */}
          <TouchableOpacity
            onPress={() => onToggle(i)}
            style={[ssr.doneBtn, set.completed && ssr.doneBtnDone]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[ssr.doneBtnText, set.completed && ssr.doneBtnTextDone]}>
              {set.completed ? '✓' : '○'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.base },
  emptyText: { color: Colors.textSecondary, fontSize: Typography.sizes.base },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.md },
  finishBtn: { backgroundColor: Colors.error + '22', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  finishText: { color: Colors.error, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
  timerWrap: { alignItems: 'center' },
  timer: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  exerciseCount: { fontSize: Typography.sizes.sm, color: Colors.textMuted, fontWeight: '600' },

  // Progress strip
  progressStrip: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  progressLabelLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  progressPct: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.extrabold,
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  progressPctLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  progressSetsLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
  },

  restBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary + '22', paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.md, gap: Spacing.md },
  restIcon: { fontSize: 18 },
  restText: { color: Colors.primary, fontWeight: Typography.weights.semibold, fontSize: Typography.sizes.base },
  restEndHint: { fontSize: Typography.sizes.xs, color: Colors.primary, opacity: 0.7, marginTop: 2 },
  skipRest: { backgroundColor: Colors.primary + '33', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.sm },
  skipRestText: { color: Colors.primary, fontSize: Typography.sizes.sm, fontWeight: '600' },
  scroll: { paddingHorizontal: Spacing['2xl'], paddingTop: Spacing.xl, paddingBottom: 120 },
  exHeader: { marginBottom: Spacing.xl, gap: Spacing.xs },
  exName: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  exMuscles: { fontSize: Typography.sizes.sm, color: Colors.textMuted },
  exTarget: { fontSize: Typography.sizes.sm, color: Colors.primary, fontWeight: '600', marginTop: Spacing.xs },
  setsSection: { backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.cardBorder, overflow: 'hidden', marginBottom: Spacing.xl },
  setsHeader: { flexDirection: 'row', backgroundColor: Colors.surfaceElevated, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  col: { color: Colors.textMuted, fontSize: Typography.sizes.xs, fontWeight: '700', letterSpacing: 0.5 },
  instructions: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.base, borderWidth: 1, borderColor: Colors.cardBorder },
  instructionsTitle: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  instructionsText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, lineHeight: 20 },
  navBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.base, paddingBottom: Spacing['2xl'], gap: Spacing.md },
  navBtn: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { color: Colors.textSecondary, fontWeight: '600' },
  navBtnNext: { flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  navBtnFinish: { flex: 1, backgroundColor: Colors.accentGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  navBtnNextText: { color: Colors.white, fontWeight: Typography.weights.semibold },
  setProgress: { alignItems: 'center', gap: 2 },
  setProgressText: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, fontVariant: ['tabular-nums'] },
  setProgressSub: { fontSize: 9, color: Colors.textMuted, letterSpacing: 0.2 },
});

const sr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowDone: { backgroundColor: Colors.accentGreen + '0C' },
  col: { flexDirection: 'row', alignItems: 'center' },

  // Set number column
  setNum: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: '700' },
  setNumDone: { color: Colors.accentGreen },
  editHint: { fontSize: 9, color: Colors.accentGreen, marginTop: 1, opacity: 0.8 },

  // Inputs — no disabled state; green tint when the set is done
  input: {
    flex: 1,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    marginHorizontal: 2,
  },
  inputFlex: { flex: 1 },
  inputDone: {
    color: Colors.accentGreen,
    backgroundColor: Colors.accentGreen + '15',
    borderWidth: 1,
    borderColor: Colors.accentGreen + '40',
  },
  // Row wrapper for input + unit suffix ("s")
  inputRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginHorizontal: 2 },
  unitSuffix: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    fontWeight: Typography.weights.semibold,
    paddingLeft: 2,
  },
  unitSuffixDone: { color: Colors.accentGreen },
  // Time-based done display (formatted "45s" / "1m 30s")
  inputTimeDisplay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    paddingVertical: Spacing.sm,
  },
  inputTimeDoneText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.accentGreen,
  },

  // Done / undo button
  doneBtn: { width: 36, height: 36, borderRadius: Radius.full, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  doneBtnActive: { backgroundColor: Colors.accentGreen, borderColor: Colors.accentGreen },
  doneBtnText: { color: Colors.textMuted, fontSize: 16 },
  doneBtnTextActive: { color: Colors.white, fontWeight: '700' },
  undoHint: { fontSize: 8, color: Colors.accentGreen, marginTop: 2, opacity: 0.7, letterSpacing: 0.3 },

  prevHint: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
});

// ─── Timer Panel Styles ───────────────────────────────────────────────────────

const tp = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.xl,
    marginBottom: Spacing.base,
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardExceeded: {
    borderColor: Colors.accentGreen + '88',
    backgroundColor: Colors.accentGreen + '06',
  },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  setLabel: { fontSize: Typography.sizes.sm, color: Colors.textMuted, fontWeight: Typography.weights.semibold },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 20, borderRadius: 4 },

  countdown: {
    fontSize: 72,
    fontWeight: Typography.weights.extrabold,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
    lineHeight: 80,
  },
  countdownExceeded: { color: Colors.accentGreen },

  barWrap: { width: '100%' },
  targetLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  targetLabelExceeded: { color: Colors.accentGreen, fontWeight: Typography.weights.semibold },

  controls: { flexDirection: 'row', gap: Spacing.md, width: '100%', marginTop: Spacing.sm },
  resetBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resetText: { color: Colors.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
  startBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  pauseActiveBtn: { backgroundColor: Colors.primary + 'CC' },
  startText: { color: Colors.white, fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold },
});

// ─── Set Status Rows Styles ───────────────────────────────────────────────────

const ssr = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  rowActive: { backgroundColor: Colors.primary + '0A' },
  rowDone:   { backgroundColor: Colors.accentGreen + '0A' },

  setNum:     { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.textSecondary, width: 20, textAlign: 'center' },
  setNumDone: { color: Colors.accentGreen },

  weightWrap: { flex: 1 },
  weightInput: {
    fontSize: Typography.sizes.sm,
    color: Colors.textPrimary,
    textAlign: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  weightInputDone: { color: Colors.accentGreen, backgroundColor: Colors.accentGreen + '15' },

  durationWrap:  { flex: 1, alignItems: 'center' },
  durationEditRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  durationInput: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.accentGreen,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    backgroundColor: Colors.accentGreen + '15',
    borderRadius: Radius.sm,
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    minWidth: 44,
  },
  durationUnit: {
    fontSize: Typography.sizes.sm,
    color: Colors.accentGreen,
    fontWeight: Typography.weights.semibold,
  },
  statusText:    { fontSize: Typography.sizes.sm, color: Colors.textMuted },
  statusTextActive: { color: Colors.primary, fontWeight: Typography.weights.semibold },

  doneBtn:      { width: 34, height: 34, borderRadius: Radius.full, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  doneBtnDone:  { backgroundColor: Colors.accentGreen, borderColor: Colors.accentGreen },
  doneBtnText:  { color: Colors.textMuted, fontSize: 15 },
  doneBtnTextDone: { color: Colors.white, fontWeight: '700' },
});

// ─── Completion Summary Styles ────────────────────────────────────────────────

function CompletionStat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={cs.stat}>
      <Text style={cs.statIcon}>{icon}</Text>
      <Text style={cs.statValue}>{value}</Text>
      <Text style={cs.statLabel}>{label}</Text>
    </View>
  );
}

const cs = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing['2xl'], paddingTop: Spacing['2xl'], alignItems: 'stretch' },

  heroSection: { alignItems: 'center', marginBottom: Spacing['2xl'], gap: Spacing.sm },
  trophy:    { fontSize: 72, marginBottom: Spacing.sm },
  headline:  { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold, color: Colors.textPrimary, textAlign: 'center' },
  dayName:   { fontSize: Typography.sizes.lg,  fontWeight: Typography.weights.semibold, color: Colors.textSecondary, textAlign: 'center' },
  timestamp: { fontSize: Typography.sizes.sm,  color: Colors.textMuted, textAlign: 'center' },

  // Stats strip
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  stat: { alignItems: 'center', gap: 4, flex: 1 },
  statIcon:  { fontSize: 22 },
  statValue: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  statDivider: { width: 1, height: 40, backgroundColor: Colors.border },

  // Exercise breakdown
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.textPrimary, marginBottom: Spacing.md },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  exRowDone:  { borderColor: Colors.accentGreen + '55', backgroundColor: Colors.accentGreen + '08' },
  exName:     { flex: 1, fontSize: Typography.sizes.base, color: Colors.textSecondary, marginRight: Spacing.md },
  exNameDone: { color: Colors.textPrimary, fontWeight: Typography.weights.medium },
  exBadge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  exBadgeDone:     { backgroundColor: Colors.accentGreen },
  exBadgeText:     { fontSize: Typography.sizes.xs, color: Colors.textMuted, fontWeight: '600' },
  exBadgeTextDone: { color: Colors.white },

  // Done button
  doneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.base + 2,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  doneBtnText: { color: Colors.white, fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold },
});

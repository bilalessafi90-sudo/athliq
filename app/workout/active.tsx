import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  SafeAreaView, Alert, TextInput, Vibration, Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useCompleteSession, useLastSessionLogs } from '../../src/hooks/useWorkout';
import { workoutService } from '../../src/services/workoutService';
import { useAuthStore } from '../../src/stores/authStore';
import { useT, useLanguageStore } from '../../src/stores/languageStore';
import { translateExercise } from '../../src/i18n/exerciseTranslations';
import { Colors, Typography, Spacing, Radius } from '../../src/constants';
import { ActiveSet } from '../../src/types';
import { ProgressBar } from '../../src/components/ui';

export default function ActiveWorkoutScreen() {
  const {
    activeSession, activeDay, activeExercises, currentExerciseIndex,
    sessionStartTime, updateSet, completeSet, toggleSetCompleted,
    nextExercise, prevExercise, endSession,
  } = useWorkoutStore();
  const { user, profile } = useAuthStore();
  const completeSessionMutation = useCompleteSession();
  const t = useT();
  const { language } = useLanguageStore();

  const startRef = useRef<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [restDisplay, setRestDisplay] = useState<number | null>(null);
  const restEndTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Holds the ID of the scheduled "rest complete" notification so we can cancel it.
  const restNotifIdRef = useRef<string | null>(null);

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
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [cancelRestNotif]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const ex = (we as any)?.exercise;
  const sets = currentEx?.sets ?? [];

  const completedSets = sets.filter((s) => s.completed).length;
  const totalSets = sets.length;
  const overallProgress = activeExercises.reduce(
    (acc, ae) => acc + ae.sets.filter((s) => s.completed).length,
    0,
  ) / Math.max(activeExercises.reduce((a, ae) => a + ae.sets.length, 0), 1);

  const handleToggleSet = (setIdx: number) => {
    const set = sets[setIdx];

    if (set.completed) {
      // Un-complete: let the user fix a mistake. Cancel rest timer so it
      // doesn't fire for the set they just undid.
      toggleSetCompleted(currentExerciseIndex, setIdx);
      handleSkipRest();
      return;
    }

    // Mark as complete — reps are required.
    if (!set.reps) {
      Alert.alert('Missing Data', `Please enter ${t.enterReps} before marking complete.`);
      return;
    }
    completeSet(currentExerciseIndex, setIdx);
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
    const duration = Math.round(elapsed / 60);

    try {
      await completeSessionMutation.mutateAsync({ sessionId: activeSession.id, duration });

      // Log all completed sets
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
    } catch (e) {
      console.error('Error finishing workout:', e);
    }

    cancelRestNotif();
    endSession();
    router.replace('/(tabs)/workout');
  };

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

      {/* ── Overall Progress ─────────────────────────────────────── */}
      <ProgressBar progress={overallProgress} color={Colors.primary} height={3} animated />

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
            Target: {we?.sets} {t.sets} × {we?.reps} {t.reps} · {we?.rest_seconds}s {t.rest}
          </Text>
        </View>

        {/* ── Set Logger ──────────────────────────────────────────── */}
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
          <Text style={styles.setProgressText}>{completedSets}/{totalSets} {t.sets.toLowerCase()} done</Text>
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
  unit: string;
  prevWeight?: number;
  prevReps?: number;
  onWeightChange: (v: string) => void;
  onRepsChange: (v: string) => void;
  onToggle: () => void;
}

function SetRow({ set, index, unit, prevWeight, prevReps, onWeightChange, onRepsChange, onToggle }: SetRowProps) {
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
          <Text style={sr.prevHint}>Prev: {prevWeight} × {prevReps}</Text>
        )}
      </View>

      {/* Reps input — always editable */}
      <View style={[sr.col, { flex: 1, flexDirection: 'column', alignItems: 'center' }]}>
        <TextInput
          style={[sr.input, set.completed && sr.inputDone]}
          value={set.reps != null ? String(set.reps) : ''}
          onChangeText={onRepsChange}
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
        />
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
  setProgressText: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
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
  inputDone: {
    color: Colors.accentGreen,
    backgroundColor: Colors.accentGreen + '15',
    borderWidth: 1,
    borderColor: Colors.accentGreen + '40',
  },

  // Done / undo button
  doneBtn: { width: 36, height: 36, borderRadius: Radius.full, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  doneBtnActive: { backgroundColor: Colors.accentGreen, borderColor: Colors.accentGreen },
  doneBtnText: { color: Colors.textMuted, fontSize: 16 },
  doneBtnTextActive: { color: Colors.white, fontWeight: '700' },
  undoHint: { fontSize: 8, color: Colors.accentGreen, marginTop: 2, opacity: 0.7, letterSpacing: 0.3 },

  prevHint: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
});

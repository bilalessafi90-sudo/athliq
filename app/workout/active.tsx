import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  SafeAreaView, Alert, TextInput, Vibration, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useCompleteSession } from '../../src/hooks/useWorkout';
import { workoutService } from '../../src/services/workoutService';
import { useAuthStore } from '../../src/stores/authStore';
import { Colors, Typography, Spacing, Radius } from '../../src/constants';
import { ActiveSet } from '../../src/types';
import { ProgressBar } from '../../src/components/ui';

export default function ActiveWorkoutScreen() {
  const {
    activeSession, activeDay, activeExercises, currentExerciseIndex,
    sessionStartTime, updateSet, completeSet, nextExercise, prevExercise, endSession,
  } = useWorkoutStore();
  const { user, profile } = useAuthStore();
  const completeSessionMutation = useCompleteSession();

  const [elapsed, setElapsed] = useState(0);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restActive, setRestActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Elapsed timer
  useEffect(() => {
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Rest timer countdown
  useEffect(() => {
    if (restActive && restTimer !== null && restTimer > 0) {
      restRef.current = setInterval(() => {
        setRestTimer((t) => {
          if (t !== null && t <= 1) {
            clearInterval(restRef.current!);
            setRestActive(false);
            if (Platform.OS !== 'web') Vibration.vibrate([0, 300, 100, 300]);
            return null;
          }
          return (t ?? 0) - 1;
        });
      }, 1000);
    }
    return () => { if (restRef.current) clearInterval(restRef.current); };
  }, [restActive]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const currentEx = activeExercises[currentExerciseIndex];
  const we = currentEx?.workoutExercise;
  const ex = (we as any)?.exercise;
  const sets = currentEx?.sets ?? [];

  const completedSets = sets.filter((s) => s.completed).length;
  const totalSets = sets.length;
  const overallProgress = activeExercises.reduce(
    (acc, ae) => acc + ae.sets.filter((s) => s.completed).length,
    0,
  ) / Math.max(activeExercises.reduce((a, ae) => a + ae.sets.length, 0), 1);

  const handleSetComplete = (setIdx: number) => {
    const set = sets[setIdx];
    if (!set.reps || !set.weight) {
      Alert.alert('Missing Data', 'Please enter reps and weight before marking complete.');
      return;
    }
    completeSet(currentExerciseIndex, setIdx);
    // Start rest timer
    const restSecs = we?.rest_seconds ?? 60;
    setRestTimer(restSecs);
    setRestActive(true);
    if (restRef.current) clearInterval(restRef.current);
  };

  const handleFinish = () => {
    Alert.alert(
      'Finish Workout?',
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
          if (set.completed && set.reps != null && set.weight != null) {
            logs.push({
              session_id: activeSession.id,
              exercise_id: ae.workoutExercise.exercise_id,
              set_number: set.setNumber,
              reps: set.reps,
              weight: set.weight,
              unit: profile?.weight_unit ?? 'kg',
            });
          }
        }
      }
      if (logs.length > 0) await workoutService.logExerciseSets(logs);
    } catch (e) {
      console.error('Error finishing workout:', e);
    }

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

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Top Bar ──────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleFinish} style={styles.finishBtn}>
          <Text style={styles.finishText}>✕ Finish</Text>
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
      {restActive && restTimer !== null && (
        <View style={styles.restBanner}>
          <Text style={styles.restIcon}>⏱</Text>
          <Text style={styles.restText}>Rest  {formatTime(restTimer)}</Text>
          <TouchableOpacity
            onPress={() => { setRestActive(false); setRestTimer(null); if (restRef.current) clearInterval(restRef.current); }}
            style={styles.skipRest}
          >
            <Text style={styles.skipRestText}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Exercise Header ──────────────────────────────────────── */}
        <View style={styles.exHeader}>
          <Text style={styles.exName}>{ex?.name ?? 'Exercise'}</Text>
          <Text style={styles.exMuscles}>{ex?.muscle_groups?.join(' · ')}</Text>
          <Text style={styles.exTarget}>
            Target: {we?.sets} sets × {we?.reps} reps · {we?.rest_seconds}s rest
          </Text>
        </View>

        {/* ── Set Logger ──────────────────────────────────────────── */}
        <View style={styles.setsSection}>
          <View style={styles.setsHeader}>
            <Text style={[styles.col, { flex: 0.5 }]}>SET</Text>
            <Text style={[styles.col, { flex: 1 }]}>WEIGHT ({profile?.weight_unit ?? 'kg'})</Text>
            <Text style={[styles.col, { flex: 1 }]}>REPS</Text>
            <Text style={[styles.col, { flex: 0.8 }]}>DONE</Text>
          </View>

          {sets.map((set, i) => (
            <SetRow
              key={i}
              set={set}
              index={i}
              unit={profile?.weight_unit ?? 'kg'}
              onWeightChange={(v) => updateSet(currentExerciseIndex, i, 'weight', parseFloat(v) || 0)}
              onRepsChange={(v) => updateSet(currentExerciseIndex, i, 'reps', parseInt(v) || 0)}
              onComplete={() => handleSetComplete(i)}
            />
          ))}
        </View>

        {/* ── Exercise Notes ───────────────────────────────────────── */}
        {ex?.instructions && (
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>How to perform</Text>
            <Text style={styles.instructionsText}>{ex.instructions}</Text>
          </View>
        )}
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
          <Text style={styles.setProgressText}>{completedSets}/{totalSets} sets done</Text>
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
  onWeightChange: (v: string) => void;
  onRepsChange: (v: string) => void;
  onComplete: () => void;
}

function SetRow({ set, index, unit, onWeightChange, onRepsChange, onComplete }: SetRowProps) {
  return (
    <View style={[sr.row, set.completed && sr.rowDone]}>
      <Text style={[sr.col, { flex: 0.5, color: Colors.textSecondary, fontWeight: '700' }]}>
        {index + 1}
      </Text>
      <View style={[sr.col, { flex: 1 }]}>
        <TextInput
          style={[sr.input, set.completed && sr.inputDone]}
          value={set.weight != null ? String(set.weight) : ''}
          onChangeText={onWeightChange}
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
          editable={!set.completed}
        />
      </View>
      <View style={[sr.col, { flex: 1 }]}>
        <TextInput
          style={[sr.input, set.completed && sr.inputDone]}
          value={set.reps != null ? String(set.reps) : ''}
          onChangeText={onRepsChange}
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
          editable={!set.completed}
        />
      </View>
      <View style={[sr.col, { flex: 0.8, alignItems: 'center' }]}>
        <TouchableOpacity
          onPress={onComplete}
          disabled={set.completed}
          style={[sr.doneBtn, set.completed && sr.doneBtnActive]}
        >
          <Text style={[sr.doneBtnText, set.completed && sr.doneBtnTextActive]}>
            {set.completed ? '✓' : '○'}
          </Text>
        </TouchableOpacity>
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
  restText: { flex: 1, color: Colors.primary, fontWeight: Typography.weights.semibold, fontSize: Typography.sizes.base },
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
  input: { flex: 1, fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.textPrimary, textAlign: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, paddingVertical: Spacing.sm, marginHorizontal: 2 },
  inputDone: { color: Colors.accentGreen, backgroundColor: Colors.accentGreen + '15' },
  doneBtn: { width: 36, height: 36, borderRadius: Radius.full, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  doneBtnActive: { backgroundColor: Colors.accentGreen, borderColor: Colors.accentGreen },
  doneBtnText: { color: Colors.textMuted, fontSize: 16 },
  doneBtnTextActive: { color: Colors.white, fontWeight: '700' },
});

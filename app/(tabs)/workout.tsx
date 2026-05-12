import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  SafeAreaView, Alert, ActivityIndicator, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getWorkoutDayFallbackImage } from '../../src/hooks/useExerciseImage';
import { calculateWorkoutDuration } from '../../src/utils/workoutDuration';
import { useT } from '../../src/stores/languageStore';
import { router } from 'expo-router';
import { format, parseISO, differenceInWeeks } from 'date-fns';
import { useAuthStore } from '../../src/stores/authStore';
import { useActivePlan, usePlanWithDays, useAllPlans, useRecentSessions } from '../../src/hooks/useWorkout';
import { workoutService } from '../../src/services/workoutService';
import { generateWorkoutPlan } from '../../src/utils/workoutGenerator';
import { Card, Badge, ProgressBar, Button } from '../../src/components/ui';
import { Colors, Typography, Spacing, Radius, FITNESS_GOALS, PLAN_DURATION_WEEKS } from '../../src/constants';
import { WorkoutDay, WorkoutExercise } from '../../src/types';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../src/lib/supabase';

export default function WorkoutScreen() {
  const { user, profile } = useAuthStore();
  const { data: activePlan, isLoading: planLoading } = useActivePlan();
  const { data: planFull, isLoading: daysLoading } = usePlanWithDays(activePlan?.id);
  const { data: sessions = [] } = useRecentSessions(50);
  const { data: allPlans = [] } = useAllPlans();
  const [generating, setGenerating] = useState(false);
  const qc = useQueryClient();

  const workoutDays: WorkoutDay[] = (planFull as any)?.workout_days ?? [];
  const sortedDays = [...workoutDays].sort((a, b) => a.order_index - b.order_index);

  const goalInfo = FITNESS_GOALS.find((g) => g.id === profile?.fitness_goal);
  const t = useT();

  const handleGeneratePlan = async () => {
    if (!user || !profile?.fitness_goal || !profile?.experience_level) {
      Alert.alert('Incomplete Profile', 'Please complete your profile first.');
      return;
    }

    const weeksOffset = allPlans.length;

    Alert.alert(
      'Generate New Plan',
      `This will create a new ${PLAN_DURATION_WEEKS}-week ${goalInfo?.label} program and deactivate your current one.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setGenerating(true);
            try {
              const generated = generateWorkoutPlan({
                goal: profile.fitness_goal!,
                experience: profile.experience_level!,
                equipment: profile.available_equipment,
                daysPerWeek: profile.preferred_days_per_week,
                weekOffset: weeksOffset,
              });

              const plan = await workoutService.createPlan({ ...generated.plan, user_id: user.id });

              const savedDays = await workoutService.insertPlanDays(
                generated.days.map((d, i) => ({
                  plan_id: plan.id,
                  day_of_week: d.day_of_week,
                  name: d.dayTemplate.name,
                  focus: d.dayTemplate.focus,
                  order_index: i,
                })),
              );

              const { data: allEx } = await supabase.from('exercises').select('id, name');
              const exMap = new Map((allEx ?? []).map((e: any) => [e.name, e.id]));

              for (let i = 0; i < savedDays.length; i++) {
                const day = savedDays[i];
                const toInsert = generated.days[i].exercises
                  .map((ex, j) => {
                    const exerciseId = exMap.get(ex.name);
                    if (!exerciseId) return null;
                    return { workout_day_id: day.id, exercise_id: exerciseId, sets: ex.sets, reps: ex.reps, rest_seconds: ex.rest_seconds, notes: null, order_index: j };
                  })
                  .filter(Boolean) as any[];
                if (toInsert.length) await workoutService.insertWorkoutExercises(toInsert);
              }

              qc.invalidateQueries({ queryKey: ['activePlan'] });
              qc.invalidateQueries({ queryKey: ['allPlans'] });
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to generate plan.');
            } finally {
              setGenerating(false);
            }
          },
        },
      ],
    );
  };

  if (planLoading || daysLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>{t.workoutPlan}</Text>
          <TouchableOpacity onPress={handleGeneratePlan} disabled={generating} style={styles.genBtn}>
            {generating
              ? <ActivityIndicator color={Colors.primary} size="small" />
              : <Text style={styles.genBtnText}>{t.newPlan}</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Active Plan Card */}
        {activePlan ? (
          <Card elevated style={styles.planCard}>
            <View style={styles.planHeader}>
              <View style={{ flex: 1 }}>
                {goalInfo && <Badge label={goalInfo.label} color={goalInfo.color} style={{ marginBottom: Spacing.sm }} />}
                <Text style={styles.planName}>{activePlan.name}</Text>
                <Text style={styles.planDates}>
                  {format(parseISO(activePlan.start_date), 'MMM d')} –{' '}
                  {format(parseISO(activePlan.end_date), 'MMM d, yyyy')}
                </Text>
              </View>
              <View style={styles.planWeeks}>
                <Text style={styles.planWeeksNum}>{PLAN_DURATION_WEEKS}</Text>
                <Text style={styles.planWeeksLabel}>weeks</Text>
              </View>
            </View>
            <ProgressBar
              progress={Math.min(
                differenceInWeeks(new Date(), parseISO(activePlan.start_date)) / PLAN_DURATION_WEEKS,
                1,
              )}
              color={goalInfo?.color ?? Colors.primary}
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        ) : (
          <Card style={styles.emptyPlanCard}>
            <Text style={styles.emptyIcon}>🏋️</Text>
            <Text style={styles.emptyTitle}>{t.noActivePlan}</Text>
            <Text style={styles.emptyDesc}>{t.noActivePlanDesc}</Text>
            <Button title={t.generatePlan} onPress={handleGeneratePlan} loading={generating} style={{ marginTop: Spacing.base }} />
          </Card>
        )}

        {/* Workout Days */}
        {sortedDays.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.weeklySchedule}</Text>
            {sortedDays.map((day) => {
              const exercises = (day as any).workout_exercises as WorkoutExercise[] ?? [];
              const completedToday = sessions.some(
                (s) => s.workout_day_id === day.id && s.completed_at &&
                  new Date(s.completed_at).toDateString() === new Date().toDateString(),
              );
              const dayImage = getWorkoutDayFallbackImage(day.focus);
              const { label: durLabel } = calculateWorkoutDuration(exercises);
              return (
                <TouchableOpacity
                  key={day.id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/workout/${day.id}`)}
                  style={styles.dayCardWrap}
                >
                  {/* Background image */}
                  <Image source={{ uri: dayImage }} style={styles.dayCardImage} resizeMode="cover" />
                  {/* Dark gradient overlay */}
                  <LinearGradient
                    colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.72)']}
                    style={StyleSheet.absoluteFill}
                  />
                  {completedToday && (
                    <View style={styles.doneBanner}>
                      <Text style={styles.doneBannerText}>✓ Completed</Text>
                    </View>
                  )}
                  <View style={styles.dayCardContent}>
                    <View>
                      <Text style={styles.dayOfWeekImg}>{day.day_of_week}</Text>
                      <Text style={styles.dayNameImg}>{day.name}</Text>
                      <Text style={styles.dayFocusImg}>{day.focus}</Text>
                    </View>
                    <View style={styles.dayCardRightImg}>
                      <Text style={styles.exCountImg}>{exercises.length}</Text>
                      <Text style={styles.exLabelImg}>{t.exercises}</Text>
                      <Text style={styles.exLabelImg}>{durLabel}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.recentSessions}</Text>
            {sessions.slice(0, 5).map((s) => (
              <Card key={s.id} style={styles.sessionCard}>
                <View style={styles.sessionRow}>
                  <View>
                    <Text style={styles.sessionName}>{(s as any).workout_day?.name ?? 'Workout'}</Text>
                    <Text style={styles.sessionDate}>
                      {s.completed_at ? format(parseISO(s.completed_at), 'EEE, MMM d · h:mm a') : t.inProgress}
                    </Text>
                  </View>
                  {s.duration_minutes && (
                    <Badge label={`${s.duration_minutes} min`} color={Colors.accentGreen} />
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing['2xl'], paddingTop: Spacing.base },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  screenTitle: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  genBtn: { backgroundColor: Colors.primary + '22', borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.primary + '55' },
  genBtnText: { color: Colors.primary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
  planCard: { marginBottom: Spacing.xl },
  planHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.base },
  planName: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  planDates: { fontSize: Typography.sizes.sm, color: Colors.textMuted, marginTop: 2 },
  planWeeks: { alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: Spacing.md, minWidth: 56 },
  planWeeksNum: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.primary },
  planWeeksLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  emptyPlanCard: { alignItems: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.sm, marginBottom: Spacing.xl },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  emptyDesc: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, textAlign: 'center' },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.textPrimary, marginBottom: Spacing.md },
  // Image-based day cards
  dayCardWrap: {
    height: 110, borderRadius: Radius.md, overflow: 'hidden',
    marginBottom: Spacing.sm, position: 'relative',
  },
  dayCardImage: { width: '100%', height: '100%' },
  dayCardContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    padding: Spacing.base,
  },
  doneBanner: {
    position: 'absolute', top: Spacing.sm, right: Spacing.sm,
    backgroundColor: Colors.accentGreen,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
  },
  doneBannerText: { fontSize: Typography.sizes.xs, color: Colors.white, fontWeight: Typography.weights.bold },
  dayOfWeekImg: { fontSize: Typography.sizes.xs, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  dayNameImg: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.white },
  dayFocusImg: { fontSize: Typography.sizes.xs, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  dayCardRightImg: { alignItems: 'flex-end' },
  exCountImg: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.extrabold, color: Colors.white },
  exLabelImg: { fontSize: Typography.sizes.xs, color: 'rgba(255,255,255,0.7)' },
  // Keep old names to avoid TS errors on unused refs
  dayCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  dayCardDone: { borderColor: Colors.accentGreen + '55', backgroundColor: Colors.accentGreen + '08' },
  dayCardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  dayDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  dayDotDone: { backgroundColor: Colors.accentGreen },
  dayOfWeek: { fontSize: Typography.sizes.xs, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  dayName: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, color: Colors.textPrimary },
  dayFocus: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginTop: 1 },
  dayCardRight: { alignItems: 'flex-end', gap: 2 },
  exCount: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.primary },
  exLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  doneCheck: { fontSize: Typography.sizes.xs, color: Colors.accentGreen, fontWeight: '700' },
  sessionCard: { marginBottom: Spacing.sm },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionName: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium, color: Colors.textPrimary },
  sessionDate: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },
});

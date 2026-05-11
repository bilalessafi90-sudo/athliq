import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  SafeAreaView, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { format, isToday, parseISO, differenceInCalendarDays } from 'date-fns';
import { useAuthStore } from '../../src/stores/authStore';
import { useActivePlan, usePlanWithDays, useRecentSessions } from '../../src/hooks/useWorkout';
import { useWeightLogs } from '../../src/hooks/useProgress';
import { useActiveMealPlan } from '../../src/hooks/useNutrition';
import { Card, Badge, ProgressBar } from '../../src/components/ui';
import { Colors, Typography, Spacing, Radius, FITNESS_GOALS, PLAN_DURATION_WEEKS } from '../../src/constants';
import { WorkoutDay } from '../../src/types';

export default function HomeScreen() {
  const { profile } = useAuthStore();
  const { data: activePlan, refetch: refetchPlan, isLoading: planLoading } = useActivePlan();
  const { data: planFull, isLoading: daysLoading } = usePlanWithDays(activePlan?.id);
  const { data: sessions = [] } = useRecentSessions(30);
  const { data: weightLogs = [] } = useWeightLogs(7);
  const { data: mealPlan } = useActiveMealPlan();

  const isLoading = planLoading || daysLoading;

  // Workout streak
  const streak = useMemo(() => {
    if (!sessions.length) return 0;
    let count = 0;
    const today = new Date();
    const sortedDates = sessions
      .filter((s) => s.completed_at)
      .map((s) => parseISO(s.completed_at!))
      .sort((a, b) => b.getTime() - a.getTime());

    for (let i = 0; i < sortedDates.length; i++) {
      const diff = differenceInCalendarDays(today, sortedDates[i]);
      if (diff === i || (i === 0 && diff === 1)) count++;
      else break;
    }
    return count;
  }, [sessions]);

  // Next workout day
  const todayName = format(new Date(), 'EEEE') as string;
  const workoutDays: WorkoutDay[] = (planFull as any)?.workout_days ?? [];
  const sortedDays = [...workoutDays].sort((a, b) => a.order_index - b.order_index);

  const todayWorkout = sortedDays.find((d) => d.day_of_week === todayName);
  const nextWorkout = todayWorkout ?? sortedDays[0];

  // Plan progress
  const planProgress = useMemo(() => {
    if (!activePlan) return 0;
    const start = parseISO(activePlan.start_date);
    const end = parseISO(activePlan.end_date);
    const total = differenceInCalendarDays(end, start);
    const elapsed = differenceInCalendarDays(new Date(), start);
    return Math.min(Math.max(elapsed / total, 0), 1);
  }, [activePlan]);

  // Latest weight
  const latestWeight = weightLogs[weightLogs.length - 1];
  const prevWeight = weightLogs[weightLogs.length - 2];
  const weightDelta =
    latestWeight && prevWeight ? latestWeight.weight - prevWeight.weight : null;

  // Greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const goalInfo = FITNESS_GOALS.find((g) => g.id === profile?.fitness_goal);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetchPlan}
            tintColor={Colors.primary}
          />
        }
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{profile?.name ?? 'Athlete'} 👋</Text>
          </View>
          {goalInfo && (
            <Badge
              label={goalInfo.label}
              color={goalInfo.color}
              style={styles.goalBadge}
            />
          )}
        </View>

        {/* ── Stats Row ──────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard icon="🔥" value={String(streak)} label="Day Streak" color={Colors.accent} />
          <StatCard
            icon="🏋️"
            value={String(sessions.filter((s) => s.completed_at).length)}
            label="Workouts"
            color={Colors.primary}
          />
          <StatCard
            icon="⚖️"
            value={latestWeight ? `${latestWeight.weight}` : '—'}
            label={latestWeight?.unit ?? profile?.weight_unit ?? 'kg'}
            color={Colors.accentGreen}
            delta={weightDelta}
          />
        </View>

        {/* ── Today's Workout ────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader
            title={todayWorkout ? "Today's Workout" : 'Next Workout'}
            action="See all"
            onAction={() => router.push('/(tabs)/workout')}
          />
          {nextWorkout ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push(`/workout/${nextWorkout.id}`)}
            >
              <Card elevated style={styles.workoutCard}>
                <View style={styles.workoutCardTop}>
                  <View>
                    <Text style={styles.workoutDay}>
                      {todayWorkout ? '📅 Today' : `📅 ${nextWorkout.day_of_week}`}
                    </Text>
                    <Text style={styles.workoutName}>{nextWorkout.name}</Text>
                    <Text style={styles.workoutFocus}>{nextWorkout.focus}</Text>
                  </View>
                  <View style={styles.startBtnWrap}>
                    <TouchableOpacity
                      style={styles.startBtn}
                      onPress={() => router.push(`/workout/${nextWorkout.id}`)}
                    >
                      <Text style={styles.startBtnText}>▶</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.workoutMeta}>
                  <MetaPill
                    icon="💪"
                    label={`${(nextWorkout as any).workout_exercises?.length ?? '—'} exercises`}
                  />
                  <MetaPill icon="⏱" label="~45-60 min" />
                </View>
              </Card>
            </TouchableOpacity>
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No workout plan yet.{'\n'}Go to the Workout tab to generate one.
              </Text>
            </Card>
          )}
        </View>

        {/* ── Plan Progress ──────────────────────────────────────── */}
        {activePlan && (
          <View style={styles.section}>
            <SectionHeader title="Program Progress" />
            <Card>
              <View style={styles.planRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName} numberOfLines={1}>{activePlan.name}</Text>
                  <Text style={styles.planMeta}>
                    {PLAN_DURATION_WEEKS} weeks · Ends {format(parseISO(activePlan.end_date), 'MMM d')}
                  </Text>
                </View>
                <Text style={styles.planPct}>{Math.round(planProgress * 100)}%</Text>
              </View>
              <ProgressBar progress={planProgress} color={Colors.primary} style={{ marginTop: Spacing.sm }} />
            </Card>
          </View>
        )}

        {/* ── This Week's Workouts ───────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="This Week" />
          <View style={styles.weekRow}>
            {sortedDays.map((day) => {
              const isTodays = day.day_of_week === todayName;
              const isDone = sessions.some(
                (s) =>
                  s.workout_day_id === day.id &&
                  s.completed_at &&
                  isToday(parseISO(s.completed_at)),
              );
              return (
                <TouchableOpacity
                  key={day.id}
                  onPress={() => router.push(`/workout/${day.id}`)}
                  style={[
                    styles.dayChip,
                    isTodays && styles.dayChipToday,
                    isDone && styles.dayChipDone,
                  ]}
                >
                  <Text style={styles.dayChipDay}>{day.day_of_week.slice(0, 3)}</Text>
                  <Text style={[styles.dayChipName, isDone && styles.dayChipNameDone]} numberOfLines={1}>
                    {isDone ? '✓' : day.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Nutrition Snapshot ─────────────────────────────────── */}
        {mealPlan && (
          <View style={styles.section}>
            <SectionHeader
              title="Today's Nutrition"
              action="Full Plan"
              onAction={() => router.push('/(tabs)/nutrition')}
            />
            <Card>
              <View style={styles.macroRow}>
                <MacroItem label="Calories" value={mealPlan.total_calories} unit="kcal" color={Colors.accent} />
                <MacroItem label="Protein" value={mealPlan.total_protein} unit="g" color={Colors.primary} />
                <MacroItem label="Carbs" value={mealPlan.total_carbs} unit="g" color={Colors.accentGreen} />
                <MacroItem label="Fat" value={mealPlan.total_fat} unit="g" color={Colors.warning} />
              </View>
            </Card>
          </View>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={sh.row}>
      <Text style={sh.title}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={sh.action}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
  color,
  delta,
}: {
  icon: string;
  value: string;
  label: string;
  color: string;
  delta?: number | null;
}) {
  return (
    <View style={[sc.card, { borderColor: color + '44' }]}>
      <Text style={sc.icon}>{icon}</Text>
      <Text style={[sc.value, { color }]}>{value}</Text>
      <Text style={sc.label}>{label}</Text>
      {delta != null && (
        <Text style={[sc.delta, { color: delta <= 0 ? Colors.accentGreen : Colors.error }]}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)}
        </Text>
      )}
    </View>
  );
}

function MetaPill({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={mp.pill}>
      <Text style={mp.icon}>{icon}</Text>
      <Text style={mp.label}>{label}</Text>
    </View>
  );
}

function MacroItem({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <View style={mac.item}>
      <View style={[mac.dot, { backgroundColor: color }]} />
      <Text style={[mac.value, { color }]}>{value}</Text>
      <Text style={mac.unit}>{unit}</Text>
      <Text style={mac.label}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing['2xl'], paddingTop: Spacing.base, paddingBottom: Spacing['4xl'] },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  greeting: { fontSize: Typography.sizes.base, color: Colors.textSecondary },
  name: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  goalBadge: { marginTop: Spacing.xs },
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing['2xl'] },
  section: { marginBottom: Spacing.xl },
  workoutCard: { gap: Spacing.md },
  workoutCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  workoutDay: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginBottom: 2 },
  workoutName: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  workoutFocus: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginTop: 2 },
  startBtnWrap: {},
  startBtn: {
    width: 48, height: 48, borderRadius: Radius.full,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  startBtnText: { color: Colors.white, fontSize: 18 },
  workoutMeta: { flexDirection: 'row', gap: Spacing.md },
  emptyCard: { alignItems: 'center', paddingVertical: Spacing.xl },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', fontSize: Typography.sizes.sm, lineHeight: 22 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  planName: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, color: Colors.textPrimary },
  planMeta: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  planPct: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.primary },
  weekRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  dayChip: {
    flex: 1, minWidth: 60, backgroundColor: Colors.card, borderRadius: Radius.md,
    padding: Spacing.sm, alignItems: 'center', gap: 2, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  dayChipToday: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  dayChipDone: { borderColor: Colors.accentGreen, backgroundColor: Colors.accentGreen + '15' },
  dayChipDay: { fontSize: Typography.sizes.xs, color: Colors.textMuted, fontWeight: '600' },
  dayChipName: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, textAlign: 'center' },
  dayChipNameDone: { color: Colors.accentGreen, fontWeight: '700' },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around' },
});

const sh = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.textPrimary },
  action: { fontSize: Typography.sizes.sm, color: Colors.primary, fontWeight: Typography.weights.medium },
});

const sc = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: Colors.card, borderRadius: Radius.lg,
    padding: Spacing.md, alignItems: 'center', gap: 2,
    borderWidth: 1,
  },
  icon: { fontSize: 20 },
  value: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  label: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  delta: { fontSize: Typography.sizes.xs, fontWeight: '600' },
});

const mp = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
  },
  icon: { fontSize: 12 },
  label: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
});

const mac = StyleSheet.create({
  item: { alignItems: 'center', gap: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  value: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
  unit: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  label: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
});

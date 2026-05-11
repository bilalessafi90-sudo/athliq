import React, { useState } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, TouchableOpacity,
  SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useDayWithExercises, useStartSession, useActivePlan } from '../../src/hooks/useWorkout';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { Card, Badge, Button, ExerciseImage } from '../../src/components/ui';
import { Colors, Typography, Spacing, Radius } from '../../src/constants';
import { WorkoutExercise, ActiveExercise, ActiveSet } from '../../src/types';
import { getWorkoutDayFallbackImage } from '../../src/hooks/useExerciseImage';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: day, isLoading } = useDayWithExercises(id);
  const { data: activePlan } = useActivePlan();
  const startSession = useStartSession();
  const { startSession: storeStart } = useWorkoutStore();
  const [starting, setStarting] = useState(false);

  const exercises: WorkoutExercise[] = (day as any)?.workout_exercises ?? [];
  const sortedEx = [...exercises].sort((a, b) => a.order_index - b.order_index);

  const handleStart = async () => {
    if (!day || !activePlan) return;
    setStarting(true);
    try {
      const session = await startSession.mutateAsync({ dayId: day.id, planId: activePlan.id });

      const activeExercises: ActiveExercise[] = sortedEx.map((we) => ({
        workoutExercise: we,
        sets: Array.from({ length: we.sets }, (_, i): ActiveSet => ({
          setNumber: i + 1,
          reps: null,
          weight: null,
          completed: false,
        })),
      }));

      storeStart(session, day, activeExercises);
      router.push('/workout/active');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not start workout.');
    } finally {
      setStarting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!day) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loader}>
          <Text style={{ color: Colors.textSecondary }}>Workout not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const heroImage = getWorkoutDayFallbackImage(day.focus);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero image with gradient overlay ── */}
        <View style={styles.heroWrap}>
          <Image
            source={{ uri: heroImage }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', Colors.background]}
            style={styles.heroGradient}
          />

          {/* Back button over hero */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          {/* Title over hero */}
          <View style={styles.heroText}>
            <Text style={styles.dayOfWeek}>{day.day_of_week}</Text>
            <Text style={styles.dayName}>{day.name}</Text>
          </View>
        </View>

        {/* ── Meta pills ── */}
        <View style={styles.metaRow}>
          <Badge label={day.focus} color={Colors.primary} />
          <View style={styles.metaPills}>
            <MetaPill icon="💪" label={`${sortedEx.length} exercises`} />
            <MetaPill icon="⏱" label="~45–60 min" />
            <MetaPill icon="🔁" label={`${sortedEx.reduce((a, e) => a + e.sets, 0)} sets`} />
          </View>
        </View>

        {/* ── Exercise list ── */}
        <Text style={styles.sectionTitle}>Exercises</Text>

        {sortedEx.map((we, index) => {
          const ex = (we as any).exercise;

          return (
            <Card key={we.id} style={styles.exCard}>
              {/* Exercise image — fetched from wger.de, cached for 7 days */}
              <View style={styles.exImageWrap}>
                <ExerciseImage
                  exerciseName={ex?.name ?? ''}
                  muscleGroups={ex?.muscle_groups ?? []}
                  height={180}
                />
                {/* Index badge over image */}
                <View style={styles.exIndexBadge}>
                  <Text style={styles.exIndexText}>{index + 1}</Text>
                </View>
                {/* Subtle gradient at bottom of image */}
                <LinearGradient
                  colors={['transparent', Colors.card + 'EE']}
                  style={styles.exImageGradient}
                />
              </View>

              {/* Exercise details */}
              <View style={styles.exBody}>
                <Text style={styles.exName}>{ex?.name ?? 'Exercise'}</Text>
                <Text style={styles.exMuscles}>
                  {ex?.muscle_groups?.join(' · ') ?? ''}
                </Text>

                {/* Sets / Reps / Rest grid */}
                <View style={styles.setsRow}>
                  <SetPill label="Sets" value={String(we.sets)} />
                  <SetPill label="Reps" value={we.reps} highlight />
                  <SetPill label="Rest" value={`${we.rest_seconds}s`} />
                </View>

                {/* Instructions */}
                {ex?.instructions && (
                  <View style={styles.instructionBox}>
                    <Text style={styles.instructionLabel}>How to perform</Text>
                    <Text style={styles.instructions}>{ex.instructions}</Text>
                  </View>
                )}

                {/* Equipment tags */}
                {ex?.equipment && ex.equipment.length > 0 && (
                  <View style={styles.equipRow}>
                    <Text style={styles.equipLabel}>Equipment</Text>
                    <View style={styles.equipTags}>
                      {ex.equipment.map((e: string) => (
                        <View key={e} style={styles.equipTag}>
                          <Text style={styles.equipTagText}>{e.replace(/_/g, ' ')}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Notes */}
                {we.notes && (
                  <Text style={styles.notes}>📝 {we.notes}</Text>
                )}
              </View>
            </Card>
          );
        })}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Sticky start button ── */}
      <View style={styles.footer}>
        <Button
          title={starting ? 'Starting…' : '▶  Start Workout'}
          onPress={handleStart}
          loading={starting}
          size="lg"
          style={styles.startBtn}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetaPill({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={mp.pill}>
      <Text style={mp.icon}>{icon}</Text>
      <Text style={mp.label}>{label}</Text>
    </View>
  );
}

function SetPill({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[sp.pill, highlight && sp.highlighted]}>
      <Text style={[sp.value, highlight && sp.valueHighlighted]}>{value}</Text>
      <Text style={sp.label}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: Spacing.xl },

  // Hero
  heroWrap: { width: '100%', height: 240, marginBottom: Spacing.base },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
  },
  backBtn: {
    position: 'absolute', top: Spacing.base, left: Spacing.base,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: Typography.sizes.lg, color: Colors.white },
  heroText: {
    position: 'absolute', bottom: Spacing.xl,
    left: Spacing['2xl'], right: Spacing['2xl'],
  },
  dayOfWeek: {
    fontSize: Typography.sizes.xs, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
    fontWeight: Typography.weights.semibold,
  },
  dayName: {
    fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold,
    color: Colors.textPrimary, marginTop: 2,
  },

  // Meta row
  metaRow: {
    marginBottom: Spacing.xl, gap: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
  },
  metaPills: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  sectionTitle: {
    fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary, marginBottom: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
  },

  // Exercise card
  exCard: { marginBottom: Spacing.md, padding: 0, overflow: 'hidden', marginHorizontal: Spacing['2xl'] },
  exImageWrap: { width: '100%', height: 180, position: 'relative' },
  exImageGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
  },
  exIndexBadge: {
    position: 'absolute', top: Spacing.md, left: Spacing.md,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  exIndexText: {
    fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold,
    color: Colors.white,
  },

  exBody: { padding: Spacing.base, gap: Spacing.md },
  exName: {
    fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
  },
  exMuscles: {
    fontSize: Typography.sizes.xs, color: Colors.primary,
    fontWeight: Typography.weights.medium, marginTop: -Spacing.sm,
  },

  setsRow: { flexDirection: 'row', gap: Spacing.sm },

  instructionBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    gap: 4,
  },
  instructionLabel: {
    fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold,
    color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  instructions: {
    fontSize: Typography.sizes.sm, color: Colors.textSecondary, lineHeight: 20,
  },

  equipRow: { gap: 6 },
  equipLabel: {
    fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold,
    color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  equipTags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  equipTag: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.border,
  },
  equipTagText: {
    fontSize: Typography.sizes.xs, color: Colors.textSecondary, textTransform: 'capitalize',
  },

  notes: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, fontStyle: 'italic' },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['3xl'],
    paddingTop: Spacing.base,
    backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  startBtn: { width: '100%' },
});

const mp = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
  },
  icon: { fontSize: 12 },
  label: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
});

const sp = StyleSheet.create({
  pill: {
    flex: 1, alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md, paddingVertical: Spacing.sm, gap: 2,
  },
  highlighted: {
    backgroundColor: Colors.primary + '22',
    borderWidth: 1, borderColor: Colors.primary + '44',
  },
  value: {
    fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
  },
  valueHighlighted: { color: Colors.primary },
  label: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
});

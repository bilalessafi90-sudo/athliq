import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { useAuthStore } from '../../src/stores/authStore';
import { profileService } from '../../src/services/profileService';
import { workoutService } from '../../src/services/workoutService';
import { nutritionService } from '../../src/services/nutritionService';
import { generateWorkoutPlan, calculateCalorieTarget } from '../../src/utils/workoutGenerator';
import { generateMealPlan } from '../../src/utils/mealPlanner';
import { Colors, Typography, Spacing, Radius } from '../../src/constants';
import { Button } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';

const STEPS_TEXT = [
  'Saving your profile…',
  'Generating your workout plan…',
  'Creating your meal plan…',
  'Setting up notifications…',
  'All done! 🎉',
];

export default function FinishStep() {
  const { data, reset } = useOnboardingStore();
  const { user, setProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [stepText, setStepText] = useState('');

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Save profile
      setStepText(STEPS_TEXT[0]);
      const profile = await profileService.completeOnboarding(user.id, data);
      setProfile(profile);

      // 2. Generate & save workout plan
      setStepText(STEPS_TEXT[1]);
      if (data.fitness_goal && data.experience_level) {
        const generated = generateWorkoutPlan({
          goal: data.fitness_goal,
          experience: data.experience_level,
          equipment: data.available_equipment,
          daysPerWeek: data.preferred_days_per_week,
          weekOffset: 0,
        });

        const plan = await workoutService.createPlan({
          ...generated.plan,
          user_id: user.id,
        });

        const savedDays = await workoutService.insertPlanDays(
          generated.days.map((d, i) => ({
            plan_id: plan.id,
            day_of_week: d.day_of_week,
            name: d.dayTemplate.name,
            focus: d.dayTemplate.focus,
            order_index: i,
          })),
        );

        // Fetch exercises to match names to IDs
        const { data: allExercises } = await supabase.from('exercises').select('id, name');
        const exerciseMap = new Map((allExercises ?? []).map((e: any) => [e.name, e.id]));

        for (let i = 0; i < savedDays.length; i++) {
          const day = savedDays[i];
          const exTemplates = generated.days[i].exercises;
          const toInsert = exTemplates
            .map((ex, j) => {
              const exerciseId = exerciseMap.get(ex.name);
              if (!exerciseId) return null;
              return {
                workout_day_id: day.id,
                exercise_id: exerciseId,
                sets: ex.sets,
                reps: ex.reps,
                rest_seconds: ex.rest_seconds,
                notes: null,
                order_index: j,
              };
            })
            .filter(Boolean) as any[];

          if (toInsert.length > 0) {
            await workoutService.insertWorkoutExercises(toInsert);
          }
        }
      }

      // 3. Generate meal plan
      setStepText(STEPS_TEXT[2]);
      if (data.fitness_goal && data.weight && data.height && data.age) {
        const macros = calculateCalorieTarget({
          weight: data.weight,
          height: data.height,
          age: data.age,
          goal: data.fitness_goal,
          daysPerWeek: data.preferred_days_per_week,
        });

        const mealData = generateMealPlan({
          goal: data.fitness_goal,
          calories: macros.calories,
          protein: macros.protein,
          carbs: macros.carbs,
          fat: macros.fat,
          dietary: data.dietary_preferences,
          weekOffset: 0,
        });

        await nutritionService.createMealPlan(
          {
            user_id: user.id,
            week_start: mealData.weekStart,
            week_end: mealData.weekEnd,
            total_calories: macros.calories,
            total_protein: macros.protein,
            total_carbs: macros.carbs,
            total_fat: macros.fat,
          },
          mealData.meals,
          mealData.groceryItems,
        );
      }

      setStepText(STEPS_TEXT[4]);
      await new Promise((r) => setTimeout(r, 800));

      reset();
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setStepText('');
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <LinearGradient
        colors={[Colors.background, Colors.surface]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.container}>
        {/* Summary */}
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Text style={styles.heroIcon}>🚀</Text>
          </View>
          <Text style={styles.heading}>You're all set!</Text>
          <Text style={styles.subheading}>
            Here's a summary of your personalized program:
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <SummaryRow icon="🎯" label="Goal" value={formatGoal(data.fitness_goal)} />
          <SummaryRow icon="🏋️" label="Experience" value={capitalize(data.experience_level ?? '')} />
          <SummaryRow icon="📅" label="Training Days" value={`${data.preferred_days_per_week} days/week`} />
          <SummaryRow icon="📏" label="Body Stats" value={`${data.weight}${data.weight_unit} · ${data.height}cm`} />
          <SummaryRow
            icon="🥗"
            label="Diet"
            value={data.dietary_preferences.length > 0 ? data.dietary_preferences.join(', ') : 'No restrictions'}
          />
        </View>

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>{stepText}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Button
            title="Build My Program →"
            onPress={handleFinish}
            loading={loading}
            size="lg"
            style={styles.btn}
          />
          <Text style={styles.note}>Your plan refreshes automatically every 6 weeks</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function SummaryRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.icon}>{icon}</Text>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

function formatGoal(goal: string | null): string {
  const map: Record<string, string> = {
    lose_weight: 'Lose Weight',
    build_muscle: 'Build Muscle',
    get_lean: 'Get Lean',
    improve_endurance: 'Improve Endurance',
  };
  return goal ? (map[goal] ?? goal) : '—';
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.xl,
    justifyContent: 'space-between',
  },
  hero: { alignItems: 'center', paddingTop: Spacing.xl },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  heroIcon: { fontSize: 40 },
  heading: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subheading: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  footer: { gap: Spacing.md, alignItems: 'center' },
  btn: { width: '100%' },
  note: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    gap: Spacing.md,
  },
  icon: { fontSize: 18, width: 24, textAlign: 'center' },
  label: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
  },
});

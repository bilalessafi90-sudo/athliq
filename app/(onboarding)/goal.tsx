import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { OnboardingShell } from '../../src/components/onboarding/OnboardingShell';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { FITNESS_GOALS } from '../../src/constants';
import { Colors, Typography, Spacing, Radius } from '../../src/constants';
import { FitnessGoal } from '../../src/types';

export default function GoalStep() {
  const { data, setField, nextStep } = useOnboardingStore();

  const handleNext = () => {
    if (data.fitness_goal) {
      nextStep();
      router.push('/(onboarding)/profile');
    }
  };

  return (
    <OnboardingShell
      step={1}
      title="What's your main goal?"
      subtitle="We'll build a plan tailored specifically to your goal."
      onNext={handleNext}
      nextDisabled={!data.fitness_goal}
    >
      {FITNESS_GOALS.map((goal) => {
        const selected = data.fitness_goal === goal.id;
        return (
          <TouchableOpacity
            key={goal.id}
            activeOpacity={0.8}
            onPress={() => setField('fitness_goal', goal.id as FitnessGoal)}
            style={[
              styles.card,
              selected && { borderColor: goal.color, backgroundColor: goal.color + '15' },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: goal.color + '22' }]}>
              <Text style={styles.icon}>{goal.icon}</Text>
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, selected && { color: goal.color }]}>
                {goal.label}
              </Text>
            </View>
            {selected && (
              <View style={[styles.check, { backgroundColor: goal.color }]}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    gap: Spacing.base,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 26 },
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: Colors.white, fontSize: 14, fontWeight: '700' },
});

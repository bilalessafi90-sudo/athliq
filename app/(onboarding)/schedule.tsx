import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { OnboardingShell } from '../../src/components/onboarding/OnboardingShell';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { TRAINING_DAYS, Colors, Typography, Spacing, Radius } from '../../src/constants';

const DESCRIPTIONS: Record<number, string> = {
  2: 'Minimal commitment, perfect for beginners',
  3: 'Ideal balance of training and recovery',
  4: 'Great for muscle building and fat loss',
  5: 'Serious training for real results',
  6: 'Advanced athletes only — high demand',
};

export default function ScheduleStep() {
  const { data, setField, nextStep, prevStep } = useOnboardingStore();

  return (
    <OnboardingShell
      step={5}
      title="How many days per week?"
      subtitle="Choose a schedule you can realistically stick to. Consistency beats intensity."
      onNext={() => { nextStep(); router.push('/(onboarding)/diet'); }}
      onBack={() => { prevStep(); router.back(); }}
    >
      {TRAINING_DAYS.map((days) => {
        const selected = data.preferred_days_per_week === days;
        return (
          <TouchableOpacity
            key={days}
            activeOpacity={0.8}
            onPress={() => setField('preferred_days_per_week', days)}
            style={[styles.card, selected && styles.cardSelected]}
          >
            <View style={[styles.dayBadge, selected && styles.dayBadgeSelected]}>
              <Text style={[styles.dayNum, selected && styles.dayNumSelected]}>{days}</Text>
              <Text style={[styles.dayLabel, selected && styles.dayLabelSelected]}>days</Text>
            </View>
            <Text style={[styles.desc, selected && styles.descSelected]}>
              {DESCRIPTIONS[days]}
            </Text>
            {selected && <Text style={styles.check}>●</Text>}
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
    padding: Spacing.base,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    gap: Spacing.base,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },
  dayBadge: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeSelected: { backgroundColor: Colors.primary },
  dayNum: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  dayNumSelected: { color: Colors.white },
  dayLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  dayLabelSelected: { color: Colors.white },
  desc: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  descSelected: { color: Colors.textPrimary },
  check: { color: Colors.primary, fontSize: 16 },
});

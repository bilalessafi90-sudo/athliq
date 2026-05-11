import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { OnboardingShell } from '../../src/components/onboarding/OnboardingShell';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { EXPERIENCE_LEVELS, Colors, Typography, Spacing, Radius } from '../../src/constants';
import { ExperienceLevel } from '../../src/types';

export default function ExperienceStep() {
  const { data, setField, nextStep, prevStep } = useOnboardingStore();

  return (
    <OnboardingShell
      step={3}
      title="Your experience level"
      subtitle="This helps us set the right exercise difficulty and volume."
      onNext={() => { nextStep(); router.push('/(onboarding)/equipment'); }}
      onBack={() => { prevStep(); router.back(); }}
      nextDisabled={!data.experience_level}
    >
      {EXPERIENCE_LEVELS.map((level) => {
        const selected = data.experience_level === level.id;
        return (
          <TouchableOpacity
            key={level.id}
            activeOpacity={0.8}
            onPress={() => setField('experience_level', level.id as ExperienceLevel)}
            style={[styles.card, selected && styles.cardSelected]}
          >
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, selected && styles.selectedText]}>
                {level.label}
              </Text>
              <Text style={styles.cardDesc}>{level.description}</Text>
            </View>
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected && <View style={styles.radioDot} />}
            </View>
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
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },
  cardContent: { flex: 1 },
  cardTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
  },
  selectedText: { color: Colors.primary },
  cardDesc: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs - 2,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
});

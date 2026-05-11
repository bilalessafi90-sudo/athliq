import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { OnboardingShell } from '../../src/components/onboarding/OnboardingShell';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { DIETARY_PREFS, Colors, Typography, Spacing, Radius } from '../../src/constants';

export default function DietStep() {
  const { data, toggleDietary, nextStep, prevStep } = useOnboardingStore();

  return (
    <OnboardingShell
      step={6}
      title="Dietary preferences"
      subtitle="We'll make sure your meal plan fits your lifestyle. Select all that apply."
      onNext={() => { nextStep(); router.push('/(onboarding)/finish'); }}
      onBack={() => { prevStep(); router.back(); }}
    >
      <View style={styles.grid}>
        {DIETARY_PREFS.map((pref) => {
          const selected = data.dietary_preferences.includes(pref.id);
          return (
            <TouchableOpacity
              key={pref.id}
              activeOpacity={0.8}
              onPress={() => toggleDietary(pref.id)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                {pref.label}
              </Text>
              {selected && <Text style={styles.chipCheck}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.note}>
        Selecting nothing means no dietary restrictions — we'll include all foods.
      </Text>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
    gap: Spacing.xs,
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  chipLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.textSecondary,
  },
  chipLabelSelected: { color: Colors.primary },
  chipCheck: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  note: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 18,
  },
});

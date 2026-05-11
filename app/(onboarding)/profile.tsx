import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { OnboardingShell } from '../../src/components/onboarding/OnboardingShell';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { Input } from '../../src/components/ui';
import { Colors, Typography, Spacing, Radius } from '../../src/constants';
import { WeightUnit } from '../../src/types';

export default function ProfileStep() {
  const { data, setField, nextStep, prevStep } = useOnboardingStore();

  const isValid =
    data.name.trim().length > 0 &&
    data.age != null && data.age > 10 && data.age < 100 &&
    data.height != null && data.height > 100 && data.height < 250 &&
    data.weight != null && data.weight > 30 && data.weight < 350;

  const handleNext = () => {
    if (isValid) {
      nextStep();
      router.push('/(onboarding)/experience');
    }
  };

  return (
    <OnboardingShell
      step={2}
      title="Tell us about yourself"
      subtitle="We use this to calculate your calorie needs and tailor your plan."
      onNext={handleNext}
      onBack={() => { prevStep(); router.back(); }}
      nextDisabled={!isValid}
    >
      <Input
        label="Your Name"
        placeholder="e.g. Alex"
        value={data.name}
        onChangeText={(v) => setField('name', v)}
        autoCapitalize="words"
      />

      <Input
        label="Age"
        placeholder="e.g. 28"
        value={data.age != null ? String(data.age) : ''}
        onChangeText={(v) => setField('age', v ? parseInt(v) : null)}
        keyboardType="number-pad"
        suffix="years"
      />

      <View>
        <Text style={styles.label}>Height</Text>
        <Input
          placeholder="e.g. 178"
          value={data.height != null ? String(data.height) : ''}
          onChangeText={(v) => setField('height', v ? parseFloat(v) : null)}
          keyboardType="decimal-pad"
          suffix="cm"
        />
      </View>

      <View>
        <View style={styles.weightRow}>
          <Text style={styles.label}>Weight</Text>
          <View style={styles.unitToggle}>
            {(['kg', 'lbs'] as WeightUnit[]).map((u) => (
              <TouchableOpacity
                key={u}
                onPress={() => setField('weight_unit', u)}
                style={[styles.unitBtn, data.weight_unit === u && styles.unitBtnActive]}
              >
                <Text style={[styles.unitText, data.weight_unit === u && styles.unitTextActive]}>
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <Input
          placeholder={data.weight_unit === 'kg' ? 'e.g. 75' : 'e.g. 165'}
          value={data.weight != null ? String(data.weight) : ''}
          onChangeText={(v) => setField('weight', v ? parseFloat(v) : null)}
          keyboardType="decimal-pad"
          suffix={data.weight_unit}
        />
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    padding: 2,
  },
  unitBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm - 2,
  },
  unitBtnActive: { backgroundColor: Colors.primary },
  unitText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  unitTextActive: { color: Colors.white, fontWeight: Typography.weights.semibold },
});

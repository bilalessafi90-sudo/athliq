import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { OnboardingShell } from '../../src/components/onboarding/OnboardingShell';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { EQUIPMENT_OPTIONS, Colors, Typography, Spacing, Radius } from '../../src/constants';

export default function EquipmentStep() {
  const { data, toggleEquipment, nextStep, prevStep } = useOnboardingStore();

  return (
    <OnboardingShell
      step={4}
      title="What equipment do you have?"
      subtitle="Select everything available to you. We'll make sure every exercise fits."
      onNext={() => { nextStep(); router.push('/(onboarding)/schedule'); }}
      onBack={() => { prevStep(); router.back(); }}
      nextDisabled={data.available_equipment.length === 0}
    >
      <View style={styles.grid}>
        {EQUIPMENT_OPTIONS.map((item) => {
          const selected = data.available_equipment.includes(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() => toggleEquipment(item.id)}
              style={[styles.item, selected && styles.itemSelected]}
            >
              <Text style={styles.itemIcon}>{item.icon}</Text>
              <Text style={[styles.itemLabel, selected && styles.itemLabelSelected]}>
                {item.label}
              </Text>
              {selected && (
                <View style={styles.checkBadge}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  item: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    gap: Spacing.sm,
    position: 'relative',
  },
  itemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },
  itemIcon: { fontSize: 28 },
  itemLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  itemLabelSelected: { color: Colors.primary },
  checkBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
});

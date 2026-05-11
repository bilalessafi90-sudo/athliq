import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Typography } from '../../constants';

interface MacroRingProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  size?: number;
}

export function MacroRing({ calories, protein, carbs, fat, size = 140 }: MacroRingProps) {
  const total = protein * 4 + carbs * 4 + fat * 9;
  const r = (size - 20) / 2;
  const circumference = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  const proteinPct = total > 0 ? (protein * 4) / total : 0;
  const carbsPct   = total > 0 ? (carbs * 4) / total : 0;
  const fatPct     = total > 0 ? (fat * 9) / total : 0;

  const proteinDash = proteinPct * circumference;
  const carbsDash   = carbsPct * circumference;
  const fatDash     = fatPct * circumference;

  const proteinOffset = 0;
  const carbsOffset   = -(proteinDash);
  const fatOffset     = -(proteinDash + carbsDash);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke={Colors.surfaceElevated} strokeWidth={10}
        />
        {/* Protein */}
        <Circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke={Colors.protein} strokeWidth={10}
          strokeDasharray={`${proteinDash} ${circumference - proteinDash}`}
          strokeDashoffset={circumference / 4 + proteinOffset}
          strokeLinecap="round"
        />
        {/* Carbs */}
        <Circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke={Colors.carbs} strokeWidth={10}
          strokeDasharray={`${carbsDash} ${circumference - carbsDash}`}
          strokeDashoffset={circumference / 4 + carbsOffset}
          strokeLinecap="round"
        />
        {/* Fat */}
        <Circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke={Colors.fat} strokeWidth={10}
          strokeDasharray={`${fatDash} ${circumference - fatDash}`}
          strokeDashoffset={circumference / 4 + fatOffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={[styles.center, { width: size, height: size }]}>
        <Text style={styles.calText}>{calories}</Text>
        <Text style={styles.calLabel}>kcal</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calText: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
  },
  calLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
});

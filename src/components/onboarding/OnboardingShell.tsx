import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ProgressBar } from '../ui';
import { Colors, Typography, Spacing, Radius } from '../../constants';

const TOTAL_STEPS = 7;

interface OnboardingShellProps {
  step: number;         // 1-based
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
}

export function OnboardingShell({
  step,
  title,
  subtitle,
  children,
  onNext,
  onBack,
  nextLabel = 'Continue',
  nextDisabled = false,
  loading = false,
}: OnboardingShellProps) {
  return (
    <SafeAreaView style={styles.root}>
      <LinearGradient
        colors={[Colors.background, Colors.surface]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.progressWrapper}>
          <ProgressBar progress={step / TOTAL_STEPS} color={Colors.primary} height={4} />
          <Text style={styles.stepLabel}>{step} of {TOTAL_STEPS}</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        <View style={styles.body}>{children}</View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={onNext}
          disabled={nextDisabled || loading}
          activeOpacity={0.85}
          style={[styles.nextBtn, (nextDisabled || loading) && styles.nextDisabled]}
        >
          <Text style={styles.nextLabel}>{loading ? 'Saving…' : nextLabel}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.base,
    paddingBottom: Spacing.base,
    gap: Spacing.md,
  },
  backBtn: { alignSelf: 'flex-start' },
  backArrow: { fontSize: Typography.sizes.xl, color: Colors.textSecondary },
  progressWrapper: { gap: Spacing.xs },
  stepLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted, textAlign: 'right' },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['2xl'],
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    lineHeight: Typography.sizes['2xl'] * 1.25,
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    lineHeight: Typography.sizes.base * 1.5,
  },
  body: { gap: Spacing.md },
  footer: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['3xl'],
    paddingTop: Spacing.base,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  nextDisabled: { opacity: 0.45 },
  nextLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },
});

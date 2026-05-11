import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../src/lib/supabase';
import { Button, Input } from '../../src/components/ui';
import { Colors, Typography, Spacing, Radius } from '../../src/constants';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSignup = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Info', 'Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Missing Info', 'Please enter your email address.');
      return;
    }
    if (!isValidEmail(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address (e.g. you@gmail.com).');
      return;
    }
    if (!password) {
      Alert.alert('Missing Info', 'Please enter a password.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { name: name.trim() } },
    });
    setLoading(false);

    if (error) {
      // Give friendlier messages for common Supabase errors
      if (error.message.toLowerCase().includes('already registered')) {
        Alert.alert(
          'Account Exists',
          'An account with this email already exists. Please sign in instead.',
          [{ text: 'Sign In', onPress: () => router.replace('/(auth)/login') }, { text: 'Cancel' }],
        );
      } else {
        Alert.alert('Sign Up Failed', error.message);
      }
      return;
    }

    // If email confirmation is required, session will be null
    if (data.session === null) {
      Alert.alert(
        'Check Your Email',
        `We sent a confirmation link to ${email.trim()}.\n\nOpen the link in that email, then come back and sign in.`,
        [{ text: 'Go to Sign In', onPress: () => router.replace('/(auth)/login') }],
      );
      return;
    }

    // Session exists — auth listener in _layout.tsx will navigate automatically
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[Colors.background, Colors.surface]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.logoMark}>
            <Text style={styles.logoIcon}>⚡</Text>
          </View>
          <Text style={styles.heading}>Create Account</Text>
          <Text style={styles.subheading}>Start your transformation today</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Full Name"
            placeholder="John Smith"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Input
            label="Email Address"
            placeholder="you@gmail.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Password"
            placeholder="Min. 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            hint="At least 8 characters"
          />
          <Input
            label="Confirm Password"
            placeholder="••••••••"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            error={confirm && confirm !== password ? 'Passwords do not match' : undefined}
          />

          <Button
            title="Create Account"
            onPress={handleSignup}
            loading={loading}
            size="lg"
            style={styles.btn}
          />

          <Text style={styles.terms}>
            By creating an account, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['3xl'],
  },
  header: { marginBottom: Spacing['2xl'] },
  backBtn: { marginBottom: Spacing.xl },
  backText: { fontSize: Typography.sizes.base, color: Colors.textSecondary },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
  },
  logoIcon: { fontSize: 28 },
  heading: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
  },
  subheading: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  form: { gap: Spacing.base },
  btn: { marginTop: Spacing.sm },
  terms: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: { color: Colors.primary },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing['2xl'],
  },
  footerText: { fontSize: Typography.sizes.base, color: Colors.textSecondary },
  footerLink: {
    fontSize: Typography.sizes.base,
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
});

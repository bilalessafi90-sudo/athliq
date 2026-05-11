import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  SafeAreaView, Alert, Switch, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { useUpdateProfile } from '../../src/hooks/useProfile';
import { profileService } from '../../src/services/profileService';
import { Card, Badge, Input, Button } from '../../src/components/ui';
import { Colors, Typography, Spacing, Radius, FITNESS_GOALS, EXPERIENCE_LEVELS } from '../../src/constants';

export default function ProfileScreen() {
  const { profile, user, clear } = useAuthStore();
  const updateProfile = useUpdateProfile();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name ?? '');
  const [age, setAge] = useState(String(profile?.age ?? ''));
  const [weight, setWeight] = useState(String(profile?.weight ?? ''));
  const [height, setHeight] = useState(String(profile?.height ?? ''));
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [notifWorkout, setNotifWorkout] = useState(true);
  const [notifMeal, setNotifMeal] = useState(true);
  const [notifProgress, setNotifProgress] = useState(true);

  const goalInfo = FITNESS_GOALS.find((g) => g.id === profile?.fitness_goal);
  const expInfo = EXPERIENCE_LEVELS.find((e) => e.id === profile?.experience_level);

  const handleSave = async () => {
    await updateProfile.mutateAsync({
      name: name.trim(),
      age: parseInt(age) || undefined,
      weight: parseFloat(weight) || undefined,
      height: parseFloat(height) || undefined,
    });
    setEditing(false);
    Alert.alert('Saved', 'Profile updated successfully.');
  };

  const handleAvatarPick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0] && user) {
      setUploadingAvatar(true);
      try {
        const url = await profileService.uploadAvatar(user.id, result.assets[0].uri);
        await updateProfile.mutateAsync({ avatar_url: url });
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'Upload failed');
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          clear();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleResetOnboarding = () => {
    Alert.alert('Reset Onboarding', 'This will take you through setup again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        onPress: async () => {
          await updateProfile.mutateAsync({ onboarding_completed: false });
          router.replace('/(onboarding)/welcome');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Avatar & Name ──────────────────────────────────────── */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handleAvatarPick} style={styles.avatarWrap}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {profile?.name?.charAt(0)?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <View style={styles.avatarEdit}>
              <Text style={styles.avatarEditText}>{uploadingAvatar ? '…' : '✎'}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{profile?.name ?? 'Athlete'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          {goalInfo && (
            <Badge label={goalInfo.label} color={goalInfo.color} style={{ marginTop: Spacing.sm }} />
          )}
        </View>

        {/* ── Stats Strip ────────────────────────────────────────── */}
        <View style={styles.statsStrip}>
          <StatItem label="Height" value={profile?.height ? `${profile.height} cm` : '—'} />
          <View style={styles.statDivider} />
          <StatItem label="Weight" value={profile?.weight ? `${profile.weight} ${profile.weight_unit}` : '—'} />
          <View style={styles.statDivider} />
          <StatItem label="Age" value={profile?.age ? `${profile.age} yrs` : '—'} />
        </View>

        {/* ── Edit Profile ───────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <TouchableOpacity onPress={() => (editing ? handleSave() : setEditing(true))}>
              <Text style={styles.editBtn}>{editing ? 'Save ✓' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
          {editing ? (
            <Card style={{ gap: Spacing.base }}>
              <Input label="Name" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
              <Input label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" suffix="years" placeholder="e.g. 28" />
              <Input label="Weight" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" suffix={profile?.weight_unit ?? 'kg'} placeholder="e.g. 75" />
              <Input label="Height" value={height} onChangeText={setHeight} keyboardType="decimal-pad" suffix="cm" placeholder="e.g. 178" />
              <Button title="Cancel" onPress={() => setEditing(false)} variant="ghost" size="sm" />
            </Card>
          ) : (
            <Card style={{ gap: Spacing.md }}>
              <ProfileRow label="Experience" value={expInfo?.label ?? '—'} />
              <ProfileRow label="Training Days" value={`${profile?.preferred_days_per_week ?? 3} days/week`} />
              <ProfileRow label="Equipment" value={profile?.available_equipment?.join(', ') || 'None set'} />
              <ProfileRow label="Diet" value={profile?.dietary_preferences?.join(', ') || 'No restrictions'} />
              <ProfileRow label="Units" value={`${profile?.weight_unit ?? 'kg'} / ${profile?.measurement_unit ?? 'cm'}`} />
            </Card>
          )}
        </View>

        {/* ── Notifications ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Card style={{ gap: Spacing.md }}>
            <NotifRow
              label="Workout Reminders"
              description="Daily reminder to train"
              value={notifWorkout}
              onChange={setNotifWorkout}
            />
            <View style={styles.notifDivider} />
            <NotifRow
              label="Meal Reminders"
              description="Breakfast, lunch & dinner nudges"
              value={notifMeal}
              onChange={setNotifMeal}
            />
            <View style={styles.notifDivider} />
            <NotifRow
              label="Progress Check-In"
              description="Weekly weight logging reminder"
              value={notifProgress}
              onChange={setNotifProgress}
            />
          </Card>
        </View>

        {/* ── App ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <Card style={{ gap: 0 }}>
            <ActionRow label="🔄 Redo Onboarding" onPress={handleResetOnboarding} />
            <View style={styles.notifDivider} />
            <ActionRow label="📋 Terms of Service" onPress={() => {}} />
            <View style={styles.notifDivider} />
            <ActionRow label="🔒 Privacy Policy" onPress={() => {}} />
            <View style={styles.notifDivider} />
            <ActionRow label="🚪 Sign Out" onPress={handleSignOut} destructive />
          </Card>
        </View>

        <Text style={styles.version}>Athliq v1.0.0 · Built with ❤️</Text>
        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={si.wrap}>
      <Text style={si.value}>{value}</Text>
      <Text style={si.label}>{label}</Text>
    </View>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={pr.row}>
      <Text style={pr.label}>{label}</Text>
      <Text style={pr.value} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function NotifRow({ label, description, value, onChange }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View style={nr.row}>
      <View style={{ flex: 1 }}>
        <Text style={nr.label}>{label}</Text>
        <Text style={nr.desc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.border, true: Colors.primary + '88' }}
        thumbColor={value ? Colors.primary : Colors.textMuted}
      />
    </View>
  );
}

function ActionRow({ label, onPress, destructive }: { label: string; onPress: () => void; destructive?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} style={ar.row}>
      <Text style={[ar.label, destructive && ar.destructive]}>{label}</Text>
      <Text style={ar.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing['2xl'], paddingTop: Spacing.base },
  avatarSection: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  avatarWrap: { position: 'relative', marginBottom: Spacing.sm },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: Colors.primary },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.primary + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.primary + '55' },
  avatarInitial: { fontSize: Typography.sizes['3xl'], fontWeight: Typography.weights.bold, color: Colors.primary },
  avatarEdit: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarEditText: { color: Colors.white, fontSize: 14 },
  profileName: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  profileEmail: { fontSize: Typography.sizes.sm, color: Colors.textMuted },
  statsStrip: { flexDirection: 'row', backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.base, marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.cardBorder },
  statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  section: { marginBottom: Spacing.xl, gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.textPrimary },
  editBtn: { fontSize: Typography.sizes.sm, color: Colors.primary, fontWeight: Typography.weights.semibold },
  notifDivider: { height: 1, backgroundColor: Colors.border },
  version: { textAlign: 'center', fontSize: Typography.sizes.xs, color: Colors.textMuted, marginBottom: Spacing.base },
});

const si = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', gap: 2 },
  value: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  label: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
});
const pr = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  label: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, flex: 1 },
  value: { fontSize: Typography.sizes.sm, color: Colors.textPrimary, fontWeight: Typography.weights.medium, flex: 1, textAlign: 'right' },
});
const nr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base },
  label: { fontSize: Typography.sizes.base, color: Colors.textPrimary, fontWeight: Typography.weights.medium },
  desc: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 1 },
});
const ar = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md },
  label: { flex: 1, fontSize: Typography.sizes.base, color: Colors.textPrimary },
  chevron: { color: Colors.textMuted, fontSize: Typography.sizes.lg },
  destructive: { color: Colors.error },
});

import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  SafeAreaView, Alert, Switch, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { useUpdateProfile } from '../../src/hooks/useProfile';
import { profileService } from '../../src/services/profileService';
import { Card, Badge, Input, Button } from '../../src/components/ui';
import { Colors, Typography, Spacing, Radius, FITNESS_GOALS, EXPERIENCE_LEVELS } from '../../src/constants';
import { useLanguageStore, useT } from '../../src/stores/languageStore';
import type { Language } from '../../src/i18n/translations';

export default function ProfileScreen() {
  const { profile, user, clear } = useAuthStore();
  const updateProfile = useUpdateProfile();
  const t = useT();
  const { language, setLanguage } = useLanguageStore();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name ?? '');
  const [age, setAge] = useState(String(profile?.age ?? ''));
  const [weight, setWeight] = useState(String(profile?.weight ?? ''));
  const [height, setHeight] = useState(String(profile?.height ?? ''));
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [notifWorkout, setNotifWorkout] = useState(true);
  const [notifMeal, setNotifMeal] = useState(true);
  const [notifProgress, setNotifProgress] = useState(true);

  // Generate a signed URL for the avatar — works regardless of bucket visibility.
  // Query key includes avatar_url so it auto-refreshes after each upload.
  const { data: avatarSignedUrl } = useQuery({
    queryKey: ['avatarSigned', profile?.avatar_url],
    queryFn: () => profileService.getAvatarSignedUrl(profile!.avatar_url!),
    enabled: !!profile?.avatar_url,
    staleTime: 55 * 60 * 1000,  // re-fetch after 55 min (signed URL lives 60 min)
    gcTime: 60 * 60 * 1000,
  });

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
    Alert.alert(t.success, language === 'de' ? 'Profil erfolgreich aktualisiert.' : 'Profile updated successfully.');
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
    Alert.alert(
      language === 'de' ? 'Abmelden' : 'Sign Out',
      t.signOutConfirm,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: language === 'de' ? 'Abmelden' : 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            clear();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      language === 'de' ? 'Einrichtung wiederholen' : 'Reset Onboarding',
      language === 'de' ? 'Du wirst erneut durch die Einrichtung geführt.' : 'This will take you through setup again.',
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: language === 'de' ? 'Weiter' : 'Continue',
          onPress: async () => {
            await updateProfile.mutateAsync({ onboarding_completed: false });
            router.replace('/(onboarding)/welcome');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Avatar & Name ──────────────────────────────────────── */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handleAvatarPick} style={styles.avatarWrap}>
            {avatarSignedUrl ? (
              <Image source={{ uri: avatarSignedUrl }} style={styles.avatar} />
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
          <StatItem label={t.height} value={profile?.height ? `${profile.height} cm` : '—'} />
          <View style={styles.statDivider} />
          <StatItem label={t.weight} value={profile?.weight ? `${profile.weight} ${profile.weight_unit}` : '—'} />
          <View style={styles.statDivider} />
          <StatItem label={t.age} value={profile?.age ? `${profile.age} ${t.years}` : '—'} />
        </View>

        {/* ── Edit Profile ───────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <TouchableOpacity onPress={() => (editing ? handleSave() : setEditing(true))}>
              <Text style={styles.editBtn}>{editing ? t.save : t.edit}</Text>
            </TouchableOpacity>
          </View>
          {editing ? (
            <Card style={{ gap: Spacing.base }}>
              <Input label={t.name} value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
              <Input label={t.age} value={age} onChangeText={setAge} keyboardType="number-pad" suffix={t.years} placeholder="e.g. 28" />
              <Input label={t.weight} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" suffix={profile?.weight_unit ?? 'kg'} placeholder="e.g. 75" />
              <Input label={t.height} value={height} onChangeText={setHeight} keyboardType="decimal-pad" suffix="cm" placeholder="e.g. 178" />
              <Button title={t.cancel} onPress={() => setEditing(false)} variant="ghost" size="sm" />
            </Card>
          ) : (
            <Card style={{ gap: Spacing.md }}>
              <ProfileRow label={t.experience} value={expInfo?.label ?? '—'} />
              <ProfileRow label={t.trainingDays} value={`${profile?.preferred_days_per_week ?? 3} ${t.daysPerWeek}`} />
              <ProfileRow label={t.equipmentLabel} value={profile?.available_equipment?.join(', ') || (language === 'de' ? 'Nicht festgelegt' : 'None set')} />
              <ProfileRow label={t.diet} value={profile?.dietary_preferences?.join(', ') || t.noRestrictions} />
              <ProfileRow label={t.units} value={`${profile?.weight_unit ?? 'kg'} / ${profile?.measurement_unit ?? 'cm'}`} />
            </Card>
          )}
        </View>

        {/* ── Language ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.language}</Text>
          <Card style={{ gap: 0 }}>
            <View style={styles.langRow}>
              <TouchableOpacity
                onPress={() => setLanguage('en')}
                style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
              >
                <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>
                  {t.english}
                </Text>
              </TouchableOpacity>
              <View style={styles.langDivider} />
              <TouchableOpacity
                onPress={() => setLanguage('de')}
                style={[styles.langBtn, language === 'de' && styles.langBtnActive]}
              >
                <Text style={[styles.langBtnText, language === 'de' && styles.langBtnTextActive]}>
                  {t.german}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* ── Notifications ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.notifications}</Text>
          <Card style={{ gap: Spacing.md }}>
            <NotifRow
              label={t.workoutReminder}
              description={t.workoutReminderDesc}
              value={notifWorkout}
              onChange={setNotifWorkout}
            />
            <View style={styles.notifDivider} />
            <NotifRow
              label={t.mealReminder}
              description={t.mealReminderDesc}
              value={notifMeal}
              onChange={setNotifMeal}
            />
            <View style={styles.notifDivider} />
            <NotifRow
              label={t.progressCheckin}
              description={t.progressCheckinDesc}
              value={notifProgress}
              onChange={setNotifProgress}
            />
          </Card>
        </View>

        {/* ── App ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.appSection}</Text>
          <Card style={{ gap: 0 }}>
            <ActionRow label={t.redoOnboarding} onPress={handleResetOnboarding} />
            <View style={styles.notifDivider} />
            <ActionRow label={t.terms} onPress={() => {}} />
            <View style={styles.notifDivider} />
            <ActionRow label={t.privacy} onPress={() => {}} />
            <View style={styles.notifDivider} />
            <ActionRow label={t.signOut} onPress={handleSignOut} destructive />
          </Card>
        </View>

        <Text style={styles.version}>{t.version}</Text>
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
  langRow: { flexDirection: 'row' },
  langBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  langBtnActive: { backgroundColor: Colors.primary + '18' },
  langBtnText: { fontSize: Typography.sizes.base, color: Colors.textSecondary },
  langBtnTextActive: { color: Colors.primary, fontWeight: Typography.weights.semibold },
  langDivider: { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
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

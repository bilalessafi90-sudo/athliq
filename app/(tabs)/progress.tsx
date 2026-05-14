import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  SafeAreaView, Modal, TextInput, Alert, Image,
  FlatList, Dimensions, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { format, parseISO } from 'date-fns';
import { useWeightLogs, useLogWeight, useProgressPhotos, useUploadPhoto, useDeletePhoto, useLatestMeasurements, useLogMeasurement } from '../../src/hooks/useProgress';
import { useAuthStore } from '../../src/stores/authStore';
import { Card, Button, Input, Badge } from '../../src/components/ui';
import { Colors, Typography, Spacing, Radius, MEASUREMENT_TYPES } from '../../src/constants';
import { MeasurementType, WeightUnit, ProgressPhoto } from '../../src/types';
import { useT, useLanguageStore } from '../../src/stores/languageStore';

const { width: SCREEN_W } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_W - Spacing['2xl'] * 2 - Spacing.md) / 2;

type Tab = 'weight' | 'measurements' | 'photos';

export default function ProgressScreen() {
  const { profile } = useAuthStore();
  const t = useT();
  const { language } = useLanguageStore();
  const [activeTab, setActiveTab] = useState<Tab>('weight');
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showMeasureModal, setShowMeasureModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [measureType, setMeasureType] = useState<MeasurementType>('chest');
  const [measureValue, setMeasureValue] = useState('');

  const [viewPhoto, setViewPhoto] = useState<ProgressPhoto | null>(null);

  const { data: weightLogs = [] } = useWeightLogs(90);
  const { data: photos = [] } = useProgressPhotos();
  const { data: latestMeasurements = {} } = useLatestMeasurements();
  const logWeight = useLogWeight();
  const uploadPhoto = useUploadPhoto();
  const deletePhoto = useDeletePhoto();
  const logMeasurement = useLogMeasurement();

  const handleDeletePhoto = (photo: ProgressPhoto) => {
    Alert.alert(
      language === 'de' ? 'Foto löschen' : 'Delete Photo',
      language === 'de' ? 'Dieses Foto wirklich löschen?' : 'Are you sure you want to delete this photo?',
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePhoto.mutateAsync({ id: photo.id, url: photo.photo_url });
              setViewPhoto(null);
            } catch (e: any) {
              Alert.alert(t.error, e?.message ?? 'Could not delete photo.');
            }
          },
        },
      ],
    );
  };

  const unit = profile?.weight_unit ?? 'kg';

  // Weight chart data
  const chartData = useMemo(() => {
    return weightLogs.slice(-30).map((l, i) => ({
      x: i,
      y: l.weight,
      date: format(parseISO(l.logged_at), 'MMM d'),
    }));
  }, [weightLogs]);

  const latestWeight = weightLogs[weightLogs.length - 1];
  const firstWeight = weightLogs[0];
  const weightChange = latestWeight && firstWeight ? latestWeight.weight - firstWeight.weight : null;

  const handleLogWeight = async () => {
    const val = parseFloat(weightInput);
    if (!val || val < 20 || val > 400) {
      Alert.alert('Invalid', 'Please enter a valid weight.');
      return;
    }
    await logWeight.mutateAsync({ weight: val, unit });
    setWeightInput('');
    setShowWeightModal(false);
  };

  const handleLogMeasurement = async () => {
    const val = parseFloat(measureValue);
    if (!val || val < 1) {
      Alert.alert('Invalid', 'Please enter a valid measurement.');
      return;
    }
    await logMeasurement.mutateAsync({ type: measureType, value: val, unit: profile?.measurement_unit ?? 'cm' });
    setMeasureValue('');
    setShowMeasureModal(false);
  };

  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        await uploadPhoto.mutateAsync({ uri: result.assets[0].uri });
      } catch (e: any) {
        Alert.alert('Upload Failed', e?.message ?? 'Could not upload photo.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t.progress}</Text>
        <TouchableOpacity
          onPress={() => activeTab === 'weight' ? setShowWeightModal(true) : activeTab === 'measurements' ? setShowMeasureModal(true) : handleAddPhoto()}
          style={styles.addBtn}
        >
          <Text style={styles.addBtnText}>+ Log</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(['weight', 'measurements', 'photos'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'weight' ? t.bodyWeight : tab === 'measurements' ? t.measurements : t.progressPhotos}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Weight Tab ─────────────────────────────────────────── */}
        {activeTab === 'weight' && (
          <View style={styles.section}>
            {/* Summary Cards */}
            <View style={styles.statsRow}>
              <StatCard
                label="Current"
                value={latestWeight ? `${latestWeight.weight} ${unit}` : '—'}
                color={Colors.primary}
              />
              <StatCard
                label="Change"
                value={weightChange != null ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} ${unit}` : '—'}
                color={weightChange != null && weightChange <= 0 ? Colors.accentGreen : Colors.accent}
              />
              <StatCard
                label="Entries"
                value={String(weightLogs.length)}
                color={Colors.accentGreen}
              />
            </View>

            {/* Simple line chart using pure RN */}
            {chartData.length > 1 && <WeightChart data={chartData} unit={unit} />}

            {/* Log list */}
            <Text style={styles.subTitle}>History</Text>
            {weightLogs.length === 0 ? (
              <EmptyState icon="⚖️" text="No weight logged yet.\nTap + Log to add your first entry." />
            ) : (
              [...weightLogs].reverse().slice(0, 20).map((log) => (
                <Card key={log.id} style={styles.logRow}>
                  <Text style={styles.logDate}>{format(parseISO(log.logged_at), 'EEE, MMM d · h:mm a')}</Text>
                  <Text style={styles.logValue}>{log.weight} {log.unit}</Text>
                </Card>
              ))
            )}
          </View>
        )}

        {/* ── Measurements Tab ───────────────────────────────────── */}
        {activeTab === 'measurements' && (
          <View style={styles.section}>
            <View style={styles.measureTypeRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
                {MEASUREMENT_TYPES.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => { setMeasureType(m.id as MeasurementType); setShowMeasureModal(true); }}
                    style={styles.measureChip}
                  >
                    <Text style={styles.measureChipText}>{m.label}</Text>
                    {latestMeasurements[m.id] && (
                      <Text style={styles.measureChipValue}>
                        {latestMeasurements[m.id].value} {latestMeasurements[m.id].unit}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.subTitle}>Latest Measurements</Text>
            {Object.keys(latestMeasurements).length === 0 ? (
              <EmptyState icon="📏" text="No measurements yet.\nTap any measurement above to log." />
            ) : (
              MEASUREMENT_TYPES.filter((m) => latestMeasurements[m.id]).map((m) => {
                const log = latestMeasurements[m.id];
                return (
                  <Card key={m.id} style={styles.measureRow}>
                    <Text style={styles.measureLabel}>{m.label}</Text>
                    <View style={styles.measureRight}>
                      <Text style={styles.measureValue}>{log.value} {log.unit}</Text>
                      <Text style={styles.measureDate}>{format(parseISO(log.logged_at), 'MMM d')}</Text>
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}

        {/* ── Photos Tab ─────────────────────────────────────────── */}
        {activeTab === 'photos' && (
          <View style={styles.section}>
            {photos.length === 0 ? (
              <EmptyState icon="📸" text="No progress photos yet.\nTap + Log to add your first photo." />
            ) : (
              <View style={styles.photoGrid}>
                {photos.map((p) => (
                  <TouchableOpacity key={p.id} style={styles.photoWrap} activeOpacity={0.85} onPress={() => setViewPhoto(p)}>
                    <Image
                      source={{ uri: p.photo_url }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                    <Text style={styles.photoDate}>{format(parseISO(p.logged_at), 'MMM d')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* ── Log Weight Modal ─────────────────────────────────────── */}
      <Modal visible={showWeightModal} transparent animationType="slide">
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <Text style={modal.title}>{t.addWeight}</Text>
            <Input
              label={`Weight (${unit})`}
              placeholder={unit === 'kg' ? 'e.g. 75.5' : 'e.g. 165'}
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="decimal-pad"
              suffix={unit}
            />
            <Button title={t.save} onPress={handleLogWeight} loading={logWeight.isPending} style={{ marginTop: Spacing.base }} />
            <Button title={t.cancel} onPress={() => setShowWeightModal(false)} variant="ghost" />
          </View>
        </View>
      </Modal>

      {/* ── Full-Screen Photo Viewer ─────────────────────────────── */}
      <Modal visible={!!viewPhoto} transparent animationType="fade" statusBarTranslucent>
        <View style={viewer.overlay}>
          <SafeAreaView style={viewer.safe}>
            {/* Close */}
            <TouchableOpacity onPress={() => setViewPhoto(null)} style={viewer.closeBtn}>
              <Text style={viewer.closeText}>✕</Text>
            </TouchableOpacity>

            {viewPhoto && (
              <>
                <Image
                  source={{ uri: viewPhoto.photo_url }}
                  style={viewer.image}
                  resizeMode="contain"
                />
                <View style={viewer.footer}>
                  <Text style={viewer.dateText}>
                    {format(parseISO(viewPhoto.logged_at), 'EEEE, MMMM d, yyyy')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDeletePhoto(viewPhoto)}
                    style={viewer.deleteBtn}
                    disabled={deletePhoto.isPending}
                  >
                    {deletePhoto.isPending
                      ? <ActivityIndicator color={Colors.error} size="small" />
                      : <Text style={viewer.deleteBtnText}>🗑  {t.delete}</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      {/* ── Log Measurement Modal ────────────────────────────────── */}
      <Modal visible={showMeasureModal} transparent animationType="slide">
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <Text style={modal.title}>{t.addMeasurement}</Text>
            <View style={styles.measureTypeRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
                {MEASUREMENT_TYPES.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setMeasureType(m.id as MeasurementType)}
                    style={[styles.measureChip, measureType === m.id && styles.measureChipActive]}
                  >
                    <Text style={[styles.measureChipText, measureType === m.id && { color: Colors.primary }]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <Input
              label={`${MEASUREMENT_TYPES.find((m) => m.id === measureType)?.label} (${profile?.measurement_unit ?? 'cm'})`}
              placeholder="e.g. 85"
              value={measureValue}
              onChangeText={setMeasureValue}
              keyboardType="decimal-pad"
              suffix={profile?.measurement_unit ?? 'cm'}
            />
            <Button title={t.save} onPress={handleLogMeasurement} loading={logMeasurement.isPending} style={{ marginTop: Spacing.base }} />
            <Button title={t.cancel} onPress={() => setShowMeasureModal(false)} variant="ghost" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Weight Chart (pure RN SVG-free) ──────────────────────────────────────────

function WeightChart({ data, unit }: { data: { x: number; y: number; date: string }[]; unit: string }) {
  const W = SCREEN_W - Spacing['2xl'] * 2 - Spacing.base * 2;
  const H = 120;
  const PADDING = { top: 12, bottom: 24, left: 36, right: 8 };

  const vals = data.map((d) => d.y);
  const min = Math.min(...vals) - 1;
  const max = Math.max(...vals) + 1;
  const range = max - min || 1;

  const scaleX = (i: number) =>
    PADDING.left + (i / Math.max(data.length - 1, 1)) * (W - PADDING.left - PADDING.right);
  const scaleY = (v: number) =>
    PADDING.top + ((max - v) / range) * (H - PADDING.top - PADDING.bottom);

  return (
    <Card style={{ marginBottom: Spacing.xl, overflow: 'hidden' }}>
      <Text style={{ color: Colors.textSecondary, fontSize: Typography.sizes.xs, marginBottom: Spacing.sm }}>
        Last 30 entries
      </Text>
      <View style={{ height: H, position: 'relative' }}>
        {/* Y axis labels */}
        {[min + range, min + range / 2, min].map((v, i) => (
          <Text
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              top: scaleY(v) - 6,
              fontSize: 9,
              color: Colors.textMuted,
              width: 32,
              textAlign: 'right',
            }}
          >
            {v.toFixed(0)}
          </Text>
        ))}

        {/* Dots */}
        {data.map((d, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: scaleX(i) - 4,
              top: scaleY(d.y) - 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: Colors.primary,
              borderWidth: 2,
              borderColor: Colors.background,
            }}
          />
        ))}

        {/* First & last X label */}
        {data.length > 0 && (
          <>
            <Text style={{ position: 'absolute', bottom: 0, left: scaleX(0) - 16, fontSize: 9, color: Colors.textMuted }}>
              {data[0].date}
            </Text>
            <Text style={{ position: 'absolute', bottom: 0, right: PADDING.right, fontSize: 9, color: Colors.textMuted }}>
              {data[data.length - 1].date}
            </Text>
          </>
        )}
      </View>
    </Card>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[scard.card, { borderColor: color + '44' }]}>
      <Text style={[scard.value, { color }]}>{value}</Text>
      <Text style={scard.label}>{label}</Text>
    </View>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={es.wrap}>
      <Text style={es.icon}>{icon}</Text>
      <Text style={es.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing['2xl'], paddingTop: Spacing.base, paddingBottom: Spacing.md },
  title: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  addBtn: { backgroundColor: Colors.primary + '22', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primary + '55' },
  addBtnText: { color: Colors.primary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
  tabBar: { flexDirection: 'row', paddingHorizontal: Spacing['2xl'], gap: Spacing.sm, marginBottom: Spacing.base },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.card },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium, color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  scroll: { paddingHorizontal: Spacing['2xl'] },
  section: { gap: Spacing.md },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  subTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.textPrimary, marginTop: Spacing.md },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md },
  logDate: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  logValue: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.primary },
  measureTypeRow: { marginBottom: Spacing.sm },
  measureChip: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder, alignItems: 'center', minWidth: 90 },
  measureChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  measureChipText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium, color: Colors.textSecondary },
  measureChipValue: { fontSize: Typography.sizes.xs, color: Colors.primary, fontWeight: '700', marginTop: 2 },
  measureRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  measureLabel: { fontSize: Typography.sizes.base, color: Colors.textPrimary, fontWeight: Typography.weights.medium },
  measureRight: { alignItems: 'flex-end' },
  measureValue: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.primary },
  measureDate: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  photoWrap: { width: PHOTO_SIZE },
  photo: { width: PHOTO_SIZE, height: PHOTO_SIZE * 1.3, borderRadius: Radius.md },
  photoDate: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: Spacing.xs, textAlign: 'center' },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'], padding: Spacing['2xl'], gap: Spacing.base, paddingBottom: Spacing['3xl'] },
  title: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
});

const scard = StyleSheet.create({
  card: { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: 2, borderWidth: 1 },
  value: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold },
  label: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
});

const es = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.md },
  icon: { fontSize: 40 },
  text: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});

const viewer = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.97)' },
  safe: { flex: 1 },
  closeBtn: {
    alignSelf: 'flex-end', margin: Spacing.base,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: Typography.sizes.lg, fontWeight: '600' },
  image: { flex: 1, width: '100%' },
  footer: {
    padding: Spacing['2xl'], paddingBottom: Spacing['3xl'],
    gap: Spacing.md, alignItems: 'center',
  },
  dateText: { color: 'rgba(255,255,255,0.6)', fontSize: Typography.sizes.sm },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.error + '88',
    borderRadius: Radius.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  deleteBtnText: { color: Colors.error, fontSize: Typography.sizes.base, fontWeight: '600' },
});

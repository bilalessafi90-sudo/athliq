import { supabase } from '../lib/supabase';
import { WeightLog, MeasurementLog, ProgressPhoto, MeasurementType, WeightUnit } from '../types';

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract the raw storage path from whatever value is stored in photo_url.
 * Handles both legacy full URLs and bare paths.
 *   "https://….supabase.co/storage/v1/object/…/progress-photos/userId/ts.jpg"
 *   "userId/ts.jpg"
 *   "https://….supabase.co/storage/v1/object/sign/progress-photos/userId/ts.jpg?token=…"
 */
function storagePath(raw: string): string {
  if (!raw.startsWith('http')) return raw;
  const match = raw.match(/\/progress-photos\/(.+?)(\?|$)/);
  return match ? match[1] : raw;
}

export const progressService = {
  // ─── Weight ──────────────────────────────────────────────────────────────

  async logWeight(
    userId: string,
    weight: number,
    unit: WeightUnit,
    notes?: string,
  ): Promise<WeightLog> {
    const { data, error } = await supabase
      .from('weight_logs')
      .insert({ user_id: userId, weight, unit, notes })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getWeightLogs(userId: string, limit = 90): Promise<WeightLog[]> {
    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async deleteWeightLog(logId: string): Promise<void> {
    const { error } = await supabase.from('weight_logs').delete().eq('id', logId);
    if (error) throw error;
  },

  // ─── Measurements ─────────────────────────────────────────────────────────

  async logMeasurement(
    userId: string,
    type: MeasurementType,
    value: number,
    unit: 'cm' | 'in',
  ): Promise<MeasurementLog> {
    const { data, error } = await supabase
      .from('measurement_logs')
      .insert({ user_id: userId, type, value, unit })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getMeasurementLogs(
    userId: string,
    type: MeasurementType,
    limit = 30,
  ): Promise<MeasurementLog[]> {
    const { data, error } = await supabase
      .from('measurement_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .order('logged_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async getLatestMeasurements(userId: string): Promise<Record<string, MeasurementLog>> {
    const { data, error } = await supabase
      .from('measurement_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false });
    if (error) throw error;

    const latest: Record<string, MeasurementLog> = {};
    for (const log of data ?? []) {
      if (!latest[log.type]) latest[log.type] = log;
    }
    return latest;
  },

  // ─── Photos ───────────────────────────────────────────────────────────────

  async uploadProgressPhoto(
    userId: string,
    uri: string,
    notes?: string,
  ): Promise<ProgressPhoto> {
    // expo-image-picker with allowsEditing:true always produces a local file://
    // URI, so fetch + blob is safe here.
    const path = `${userId}/${Date.now()}.jpg`;

    const localResponse = await fetch(uri);
    const blob = await localResponse.blob();

    const { error: uploadError } = await supabase.storage
      .from('progress-photos')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false });

    if (uploadError) throw uploadError;

    // Store only the storage PATH (not a URL) so we can always generate fresh
    // signed URLs on fetch — the bucket is private so public URLs don't work.
    const { data, error } = await supabase
      .from('progress_photos')
      .insert({ user_id: userId, photo_url: path, notes })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getProgressPhotos(userId: string): Promise<ProgressPhoto[]> {
    const { data, error } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false });
    if (error) throw error;

    const photos = data ?? [];
    if (photos.length === 0) return [];

    // Extract storage paths (handles both bare paths and legacy full URLs).
    const paths = photos.map((p) => storagePath(p.photo_url));

    // Batch-generate signed URLs (1 hour TTL). The bucket is private so we use
    // signed URLs instead of public URLs. The SELECT policy in storage.objects
    // allows each user to sign their own objects.
    const { data: signedData } = await supabase.storage
      .from('progress-photos')
      .createSignedUrls(paths, 3600);

    return photos.map((p, i) => ({
      ...p,
      photo_url: signedData?.[i]?.signedUrl ?? p.photo_url,
    }));
  },

  async deleteProgressPhoto(photoId: string, photoUrl: string): Promise<void> {
    // Remove from Storage first so space is freed.
    try {
      await supabase.storage.from('progress-photos').remove([storagePath(photoUrl)]);
    } catch {
      // Storage delete failure must not block the DB row delete.
    }
    const { error } = await supabase
      .from('progress_photos')
      .delete()
      .eq('id', photoId);
    if (error) throw error;
  },
};

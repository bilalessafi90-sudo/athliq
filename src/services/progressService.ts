import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { WeightLog, MeasurementLog, ProgressPhoto, MeasurementType, WeightUnit } from '../types';

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract the raw storage path from whatever value is stored in photo_url.
 * Handles both bare paths and legacy full URLs (public or signed).
 *   "userId/ts.jpg"
 *   "https://….supabase.co/storage/v1/object/public/progress-photos/userId/ts.jpg"
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
    const path = `${userId}/${Date.now()}.jpg`;

    // Read file as base64 via expo-file-system — reliable across all iOS/Android
    // image formats (HEIC, HEIF, etc.) unlike fetch().blob() which can fail.
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const { error: uploadError } = await supabase.storage
      .from('progress-photos')
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });

    if (uploadError) throw uploadError;

    // Store the raw path — getProgressPhotos converts it to a signed URL for display.
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
    if (!data?.length) return [];

    // Use signed URLs for display — these work regardless of whether the bucket
    // is configured as public or private in the Supabase dashboard.
    // A single batch call avoids N round-trips.
    const paths = data.map((p) => storagePath(p.photo_url));
    const { data: signedData } = await supabase.storage
      .from('progress-photos')
      .createSignedUrls(paths, 7200); // 2-hour TTL; React Query refreshes every 5 min

    return data.map((p, i) => ({
      ...p,
      photo_url: signedData?.[i]?.signedUrl ?? p.photo_url,
    }));
  },

  async deleteProgressPhoto(photoId: string, photoUrl: string): Promise<void> {
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

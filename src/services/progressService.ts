import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { WeightLog, MeasurementLog, ProgressPhoto, MeasurementType, WeightUnit } from '../types';

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
    // Always save as JPEG — ImagePicker with allowsEditing converts HEIC → JPEG on iOS.
    const fileName = `${userId}/${Date.now()}.jpg`;

    // FileSystem.uploadAsync handles local iOS photo-library URIs correctly.
    // The fetch().blob() approach produces a corrupted upload on iOS.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

    const result = await FileSystem.uploadAsync(
      `${supabaseUrl}/storage/v1/object/progress-photos/${fileName}`,
      uri,
      {
        httpMethod: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseKey,
          'Content-Type': 'image/jpeg',
          'x-upsert': 'false',
        },
      },
    );

    if (result.status !== 200) {
      throw new Error(`Upload failed (${result.status}): ${result.body}`);
    }

    // Store the full public URL so the Image component can load it directly.
    // ⚠️  The "progress-photos" bucket must be set to Public in the Supabase
    //     Dashboard (Storage → Buckets → progress-photos → Edit → Public).
    const { data: urlData } = supabase.storage
      .from('progress-photos')
      .getPublicUrl(fileName);

    const { data, error } = await supabase
      .from('progress_photos')
      .insert({ user_id: userId, photo_url: urlData.publicUrl, notes })
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

    // Handle legacy rows that stored only a relative path instead of a full URL.
    return (data ?? []).map((p) => {
      if (p.photo_url.startsWith('http')) return p;
      const { data: pub } = supabase.storage
        .from('progress-photos')
        .getPublicUrl(p.photo_url);
      return { ...p, photo_url: pub.publicUrl };
    });
  },

  async deleteProgressPhoto(photoId: string, photoUrl: string): Promise<void> {
    // Also remove from Storage so space is freed.
    try {
      let path = photoUrl;
      if (path.startsWith('http')) {
        const match = path.match(/\/progress-photos\/(.+?)(\?|$)/);
        if (match) path = match[1];
      }
      await supabase.storage.from('progress-photos').remove([path]);
    } catch {
      // Storage delete failure should not block the DB row delete.
    }
    const { error } = await supabase
      .from('progress_photos')
      .delete()
      .eq('id', photoId);
    if (error) throw error;
  },
};

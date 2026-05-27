import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { Profile, OnboardingData } from '../types';

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async completeOnboarding(userId: string, onboardingData: OnboardingData): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: onboardingData.name,
        fitness_goal: onboardingData.fitness_goal,
        age: onboardingData.age,
        height: onboardingData.height,
        weight: onboardingData.weight,
        experience_level: onboardingData.experience_level,
        available_equipment: onboardingData.available_equipment,
        preferred_days_per_week: onboardingData.preferred_days_per_week,
        dietary_preferences: onboardingData.dietary_preferences,
        weight_unit: onboardingData.weight_unit,
        onboarding_completed: true,
      })
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async uploadAvatar(userId: string, uri: string): Promise<string> {
    // Include a timestamp in the filename so each upload is always a new
    // INSERT (no upsert/UPDATE needed — avoids RLS policy violations when
    // replacing an existing avatar).
    const fileName = `${userId}/avatar_${Date.now()}.jpg`;

    // Read as base64 via expo-file-system — works for HEIC/HEIF and all other
    // iOS/Android formats that fetch().blob() can silently fail on.
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, bytes, { upsert: false, contentType: 'image/jpeg' });
    if (uploadError) throw uploadError;

    // Return the raw storage path — getAvatarSignedUrl turns it into a
    // signed URL for display so it works regardless of bucket visibility.
    return fileName;
  },

  /**
   * Returns a short-lived signed URL for displaying an avatar.
   * Accepts either a raw path ("userId/avatar.jpg") or a legacy full URL.
   */
  async getAvatarSignedUrl(avatarValue: string): Promise<string | null> {
    if (!avatarValue) return null;
    // Extract raw path from full URL (legacy format)
    let path = avatarValue;
    if (avatarValue.startsWith('http')) {
      const match = avatarValue.match(/\/avatars\/(.+?)(\?|$)/);
      path = match ? match[1] : avatarValue;
    }
    const { data } = await supabase.storage.from('avatars').createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  },
};

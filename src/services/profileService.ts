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
    const ext = uri.split('.').pop() ?? 'jpg';
    const fileName = `${userId}/avatar.${ext}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, blob, { upsert: true, contentType: `image/${ext}` });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return data.publicUrl;
  },
};

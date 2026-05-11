export * from './colors';
export * from './fonts';

export const APP_NAME = 'Athliq';

export const PLAN_DURATION_WEEKS = 6;

export const FITNESS_GOALS = [
  { id: 'lose_weight', label: 'Lose Weight', icon: '🔥', color: '#FF6B6B' },
  { id: 'build_muscle', label: 'Build Muscle', icon: '💪', color: '#6C63FF' },
  { id: 'get_lean', label: 'Get Lean', icon: '⚡', color: '#4ECDC4' },
  { id: 'improve_endurance', label: 'Improve Endurance', icon: '🏃', color: '#FFB347' },
] as const;

export const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner', description: 'Less than 1 year of training' },
  { id: 'intermediate', label: 'Intermediate', description: '1–3 years of training' },
  { id: 'advanced', label: 'Advanced', description: '3+ years of training' },
] as const;

export const EQUIPMENT_OPTIONS = [
  { id: 'barbell', label: 'Barbell', icon: '🏋️' },
  { id: 'dumbbells', label: 'Dumbbells', icon: '💪' },
  { id: 'machines', label: 'Machines', icon: '🔧' },
  { id: 'cables', label: 'Cables', icon: '🔗' },
  { id: 'kettlebell', label: 'Kettlebell', icon: '🫙' },
  { id: 'resistance_bands', label: 'Resistance Bands', icon: '🎗️' },
  { id: 'pull_up_bar', label: 'Pull-up Bar', icon: '🏗️' },
  { id: 'bodyweight', label: 'Bodyweight Only', icon: '🧘' },
] as const;

export const TRAINING_DAYS = [2, 3, 4, 5, 6];

export const DIETARY_PREFS = [
  { id: 'none', label: 'No Restrictions' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten_free', label: 'Gluten-Free' },
  { id: 'dairy_free', label: 'Dairy-Free' },
  { id: 'halal', label: 'Halal' },
  { id: 'keto', label: 'Keto' },
] as const;

export const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Legs', 'Glutes', 'Core', 'Calves', 'Full Body',
] as const;

export const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
] as const;

export const UNIT_OPTIONS = ['kg', 'lbs'] as const;

export const MEASUREMENT_TYPES = [
  { id: 'chest', label: 'Chest' },
  { id: 'waist', label: 'Waist' },
  { id: 'hips', label: 'Hips' },
  { id: 'left_arm', label: 'Left Arm' },
  { id: 'right_arm', label: 'Right Arm' },
  { id: 'left_thigh', label: 'Left Thigh' },
  { id: 'right_thigh', label: 'Right Thigh' },
] as const;

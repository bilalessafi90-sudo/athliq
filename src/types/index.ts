// ─── User & Profile ────────────────────────────────────────────────────────

export type FitnessGoal = 'lose_weight' | 'build_muscle' | 'get_lean' | 'improve_endurance';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type WeightUnit = 'kg' | 'lbs';
export type MeasurementUnit = 'cm' | 'in';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  age: number;
  height: number;          // cm
  weight: number;          // kg
  fitness_goal: FitnessGoal;
  experience_level: ExperienceLevel;
  available_equipment: string[];
  preferred_days_per_week: number;
  dietary_preferences: string[];
  weight_unit: WeightUnit;
  measurement_unit: MeasurementUnit;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Exercises ─────────────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  name: string;
  muscle_groups: string[];
  equipment: string[];
  instructions: string;
  difficulty: ExperienceLevel;
  video_url: string | null;
  image_url: string | null;
  created_at: string;
}

// ─── Workout Plans ──────────────────────────────────────────────────────────

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface WorkoutPlan {
  id: string;
  user_id: string;
  name: string;
  goal: FitnessGoal;
  weeks: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface WorkoutDay {
  id: string;
  plan_id: string;
  day_of_week: DayOfWeek;
  name: string;
  focus: string;
  order_index: number;
  workout_exercises?: WorkoutExercise[];
}

export interface WorkoutExercise {
  id: string;
  workout_day_id: string;
  exercise_id: string;
  sets: number;
  reps: string;        // e.g. "8-12" or "15"
  rest_seconds: number;
  notes: string | null;
  order_index: number;
  exercise?: Exercise;
}

// ─── Workout Sessions ───────────────────────────────────────────────────────

export interface WorkoutSession {
  id: string;
  user_id: string;
  workout_day_id: string;
  plan_id: string;
  started_at: string;
  completed_at: string | null;
  duration_minutes: number | null;
  notes: string | null;
  workout_day?: WorkoutDay;
}

export interface ExerciseLog {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
  unit: WeightUnit;
  completed_at: string;
  exercise?: Exercise;
}

// ─── Active Workout State ────────────────────────────────────────────────────

export interface ActiveSet {
  setNumber: number;
  reps: number | null;
  weight: number | null;
  completed: boolean;
}

export interface ActiveExercise {
  workoutExercise: WorkoutExercise;
  sets: ActiveSet[];
}

// ─── Progress Tracking ───────────────────────────────────────────────────────

export interface WeightLog {
  id: string;
  user_id: string;
  weight: number;
  unit: WeightUnit;
  logged_at: string;
  notes: string | null;
}

export type MeasurementType =
  | 'chest' | 'waist' | 'hips'
  | 'left_arm' | 'right_arm'
  | 'left_thigh' | 'right_thigh';

export interface MeasurementLog {
  id: string;
  user_id: string;
  type: MeasurementType;
  value: number;
  unit: MeasurementUnit;
  logged_at: string;
}

export interface ProgressPhoto {
  id: string;
  user_id: string;
  photo_url: string;
  notes: string | null;
  logged_at: string;
}

// ─── Nutrition ───────────────────────────────────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealPlan {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  created_at: string;
  meals?: Meal[];
}

export interface Meal {
  id: string;
  plan_id: string;
  day_of_week: DayOfWeek;
  meal_type: MealType;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  ingredients: string[];
  instructions: string[];
  servings: number;
}

export interface GroceryItem {
  id: string;
  plan_id: string;
  name: string;
  quantity: string;
  category: string;
  checked: boolean;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface NotificationPreferences {
  id: string;
  user_id: string;
  workout_reminder: boolean;
  workout_time: string;    // HH:MM
  meal_reminder: boolean;
  meal_times: string[];
  progress_checkin: boolean;
  checkin_day: DayOfWeek;
  push_token: string | null;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

// ─── Chart Data ──────────────────────────────────────────────────────────────

export interface ChartDataPoint {
  x: string | number;
  y: number;
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

export interface OnboardingData {
  name: string;
  fitness_goal: FitnessGoal | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  experience_level: ExperienceLevel | null;
  available_equipment: string[];
  preferred_days_per_week: number;
  dietary_preferences: string[];
  weight_unit: WeightUnit;
}

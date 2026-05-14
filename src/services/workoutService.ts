import { supabase } from '../lib/supabase';
import { WorkoutPlan, WorkoutDay, WorkoutSession, ExerciseLog, Exercise } from '../types';

export const workoutService = {
  // ─── Plans ──────────────────────────────────────────────────────────────────

  async getActivePlan(userId: string): Promise<WorkoutPlan | null> {
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getAllPlans(userId: string): Promise<WorkoutPlan[]> {
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async createPlan(plan: Omit<WorkoutPlan, 'id' | 'created_at'>): Promise<WorkoutPlan> {
    // Deactivate previous plans first
    await supabase
      .from('workout_plans')
      .update({ is_active: false })
      .eq('user_id', plan.user_id);

    const { data, error } = await supabase
      .from('workout_plans')
      .insert(plan)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deletePlan(planId: string): Promise<void> {
    const { error } = await supabase.from('workout_plans').delete().eq('id', planId);
    if (error) throw error;
  },

  // ─── Days & Exercises ────────────────────────────────────────────────────────

  async getPlanWithDays(planId: string): Promise<WorkoutPlan & { workout_days: WorkoutDay[] }> {
    const { data, error } = await supabase
      .from('workout_plans')
      .select(`
        *,
        workout_days (
          *,
          workout_exercises (
            *,
            exercise:exercises (*)
          )
        )
      `)
      .eq('id', planId)
      .single();
    if (error) throw error;
    return data;
  },

  async getDayWithExercises(dayId: string): Promise<WorkoutDay> {
    const { data, error } = await supabase
      .from('workout_days')
      .select(`
        *,
        workout_exercises (
          *,
          exercise:exercises (*)
        )
      `)
      .eq('id', dayId)
      .single();
    if (error) throw error;
    return data;
  },

  async insertPlanDays(days: Omit<WorkoutDay, 'id'>[]): Promise<WorkoutDay[]> {
    const { data, error } = await supabase
      .from('workout_days')
      .insert(days)
      .select();
    if (error) throw error;
    return data;
  },

  async insertWorkoutExercises(
    exercises: Omit<import('../types').WorkoutExercise, 'id'>[],
  ): Promise<void> {
    const { error } = await supabase.from('workout_exercises').insert(exercises);
    if (error) throw error;
  },

  // ─── Sessions ─────────────────────────────────────────────────────────────

  async startSession(
    userId: string,
    workoutDayId: string,
    planId: string,
  ): Promise<WorkoutSession> {
    const { data, error } = await supabase
      .from('workout_sessions')
      .insert({ user_id: userId, workout_day_id: workoutDayId, plan_id: planId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async completeSession(
    sessionId: string,
    durationMinutes: number,
    notes?: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('workout_sessions')
      .update({
        completed_at: new Date().toISOString(),
        duration_minutes: durationMinutes,
        notes: notes ?? null,
      })
      .eq('id', sessionId);
    if (error) throw error;
  },

  async logExerciseSets(logs: Omit<ExerciseLog, 'id' | 'completed_at'>[]): Promise<void> {
    const { error } = await supabase.from('exercise_logs').insert(logs);
    if (error) throw error;
  },

  async getRecentSessions(userId: string, limit = 10): Promise<WorkoutSession[]> {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*, workout_day:workout_days(name, focus, day_of_week)')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async getSessionLogs(sessionId: string): Promise<ExerciseLog[]> {
    const { data, error } = await supabase
      .from('exercise_logs')
      .select('*, exercise:exercises(name, muscle_groups)')
      .eq('session_id', sessionId)
      .order('completed_at');
    if (error) throw error;
    return data ?? [];
  },

  // ─── Exercises Library ────────────────────────────────────────────────────

  async searchExercises(query: string, equipment?: string[]): Promise<Exercise[]> {
    let q = supabase
      .from('exercises')
      .select('*')
      .ilike('name', `%${query}%`);

    if (equipment && equipment.length > 0) {
      q = q.overlaps('equipment', equipment);
    }

    const { data, error } = await q.limit(20);
    if (error) throw error;
    return data ?? [];
  },

  async getLastSessionLogsForDay(userId: string, dayId: string): Promise<ExerciseLog[]> {
    const { data: session } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('workout_day_id', dayId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!session) return [];
    const { data, error } = await supabase
      .from('exercise_logs')
      .select('*, exercise:exercises(name)')
      .eq('session_id', session.id);
    if (error) throw error;
    return data ?? [];
  },

  async getExercisesByMuscle(muscleGroup: string): Promise<Exercise[]> {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .contains('muscle_groups', [muscleGroup]);
    if (error) throw error;
    return data ?? [];
  },

  // ─── Progress / PRs ──────────────────────────────────────────────────────

  async getPersonalRecords(
    userId: string,
    exerciseId: string,
  ): Promise<{ max_weight: number; max_reps: number }> {
    // First get session IDs for this user
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', userId);

    const sessionIds = (sessions ?? []).map((s: any) => s.id);
    if (!sessionIds.length) return { max_weight: 0, max_reps: 0 };

    const { data, error } = await supabase
      .from('exercise_logs')
      .select('weight, reps')
      .eq('exercise_id', exerciseId)
      .in('session_id', sessionIds)
      .order('weight', { ascending: false })
      .limit(1);
    if (error) throw error;
    return { max_weight: data?.[0]?.weight ?? 0, max_reps: data?.[0]?.reps ?? 0 };
  },
};

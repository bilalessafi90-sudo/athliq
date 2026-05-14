import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutService } from '../services/workoutService';
import { useAuthStore } from '../stores/authStore';
import { WorkoutPlan, WorkoutDay } from '../types';

export function useActivePlan() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['activePlan', user?.id],
    queryFn: () => workoutService.getActivePlan(user!.id),
    enabled: !!user?.id,
  });
}

export function usePlanWithDays(planId?: string) {
  return useQuery({
    queryKey: ['planWithDays', planId],
    queryFn: () => workoutService.getPlanWithDays(planId!),
    enabled: !!planId,
  });
}

export function useDayWithExercises(dayId?: string) {
  return useQuery({
    queryKey: ['dayExercises', dayId],
    queryFn: () => workoutService.getDayWithExercises(dayId!),
    enabled: !!dayId,
  });
}

export function useRecentSessions(limit = 10) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['recentSessions', user?.id],
    queryFn: () => workoutService.getRecentSessions(user!.id, limit),
    enabled: !!user?.id,
  });
}

export function useStartSession() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, planId }: { dayId: string; planId: string }) =>
      workoutService.startSession(user!.id, dayId, planId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recentSessions'] }),
  });
}

export function useCompleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      duration,
      notes,
    }: {
      sessionId: string;
      duration: number;
      notes?: string;
    }) => workoutService.completeSession(sessionId, duration, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recentSessions'] });
    },
  });
}

export function useAllPlans() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['allPlans', user?.id],
    queryFn: () => workoutService.getAllPlans(user!.id),
    enabled: !!user?.id,
  });
}

export function useLastSessionLogs(dayId?: string) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['lastSessionLogs', user?.id, dayId],
    queryFn: () => workoutService.getLastSessionLogsForDay(user!.id, dayId!),
    enabled: !!user?.id && !!dayId,
    staleTime: 0,
  });
}

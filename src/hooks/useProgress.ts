import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { progressService } from '../services/progressService';
import { useAuthStore } from '../stores/authStore';
import { MeasurementType, WeightUnit } from '../types';

export function useWeightLogs(limit = 90) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['weightLogs', user?.id],
    queryFn: () => progressService.getWeightLogs(user!.id, limit),
    enabled: !!user?.id,
  });
}

export function useLogWeight() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ weight, unit, notes }: { weight: number; unit: WeightUnit; notes?: string }) =>
      progressService.logWeight(user!.id, weight, unit, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weightLogs'] }),
  });
}

export function useProgressPhotos() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['progressPhotos', user?.id],
    queryFn: () => progressService.getProgressPhotos(user!.id),
    enabled: !!user?.id,
  });
}

export function useUploadPhoto() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uri, notes }: { uri: string; notes?: string }) =>
      progressService.uploadProgressPhoto(user!.id, uri, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['progressPhotos'] }),
  });
}

export function useLatestMeasurements() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['latestMeasurements', user?.id],
    queryFn: () => progressService.getLatestMeasurements(user!.id),
    enabled: !!user?.id,
  });
}

export function useLogMeasurement() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      type,
      value,
      unit,
    }: {
      type: MeasurementType;
      value: number;
      unit: 'cm' | 'in';
    }) => progressService.logMeasurement(user!.id, type, value, unit),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['latestMeasurements'] });
      qc.invalidateQueries({ queryKey: ['measurementLogs'] });
    },
  });
}

export function useMeasurementLogs(type: MeasurementType) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['measurementLogs', user?.id, type],
    queryFn: () => progressService.getMeasurementLogs(user!.id, type),
    enabled: !!user?.id,
  });
}

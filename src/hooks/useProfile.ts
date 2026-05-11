import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '../services/profileService';
import { useAuthStore } from '../stores/authStore';
import { Profile } from '../types';

export function useProfile() {
  const { user, profile, setProfile } = useAuthStore();

  const query = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => profileService.getProfile(user!.id),
    enabled: !!user?.id,
    initialData: profile ?? undefined,
  });

  return query;
}

export function useUpdateProfile() {
  const { user, setProfile } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<Profile>) =>
      profileService.updateProfile(user!.id, updates),
    onSuccess: (updated) => {
      setProfile(updated);
      qc.setQueryData(['profile', user?.id], updated);
    },
  });
}

import { useQuery } from '@tanstack/react-query';

// Fallback images by muscle group (used when wger has no image for an exercise)
const MUSCLE_FALLBACKS: Record<string, string> = {
  Chest:       'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=340&fit=crop&q=80',
  Back:        'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=600&h=340&fit=crop&q=80',
  Shoulders:   'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&h=340&fit=crop&q=80',
  Biceps:      'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&h=340&fit=crop&q=80',
  Triceps:     'https://images.unsplash.com/photo-1530822847156-5df684ec5ee1?w=600&h=340&fit=crop&q=80',
  Legs:        'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&h=340&fit=crop&q=80',
  Glutes:      'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=600&h=340&fit=crop&q=80',
  Core:        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=340&fit=crop&q=80',
  Calves:      'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=600&h=340&fit=crop&q=80',
  'Full Body': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=340&fit=crop&q=80',
  Forearms:    'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&h=340&fit=crop&q=80',
};

const GENERIC_FALLBACK =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=340&fit=crop&q=80';

// Strip common prefixes so "Barbell Bench Press" → "Bench Press" finds more wger matches
function simplifyName(name: string): string {
  return name
    .replace(/^(barbell|dumbbell|cable|machine|smith machine|ez-bar|ez bar)\s+/i, '')
    .trim();
}

async function fetchWgerImage(exerciseName: string): Promise<string | null> {
  const attempts = [exerciseName, simplifyName(exerciseName)];

  for (const term of attempts) {
    try {
      const searchRes = await fetch(
        `https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(term)}&format=json&language=english`,
        { headers: { Accept: 'application/json' } },
      );
      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();

      const baseId: number | undefined = searchData.suggestions?.[0]?.data?.base_id;
      if (!baseId) continue;

      const imgRes = await fetch(
        `https://wger.de/api/v2/exerciseimage/?format=json&exercise_base=${baseId}`,
        { headers: { Accept: 'application/json' } },
      );
      if (!imgRes.ok) continue;
      const imgData = await imgRes.json();

      const imageUrl: string | undefined = imgData.results?.[0]?.image;
      if (imageUrl) return imageUrl;
    } catch {
      // network error — try next attempt
    }
  }

  return null;
}

/**
 * Fetches an exercise image from wger.de (free, no API key).
 * Falls back to a muscle-group photo if wger returns nothing.
 * Results are cached in React Query for 7 days.
 */
export function useExerciseImage(
  exerciseName: string,
  muscleGroups: string[] = [],
) {
  const { data: wgerUrl, isLoading } = useQuery<string | null>({
    queryKey: ['exerciseImage', exerciseName],
    queryFn: () => fetchWgerImage(exerciseName),
    staleTime: 7 * 24 * 60 * 60 * 1000,   // 1 week
    gcTime:    7 * 24 * 60 * 60 * 1000,
    retry: 1,
  });

  // Pick fallback by first muscle group that has a mapping
  const fallback =
    muscleGroups.map((m) => MUSCLE_FALLBACKS[m]).find(Boolean) ?? GENERIC_FALLBACK;

  return {
    imageUrl: wgerUrl ?? fallback,
    isLoading,
    isFromWger: !!wgerUrl,
  };
}

/**
 * Standalone helper (no hook) for the workout-day hero image.
 * Returns a muscle-group Unsplash photo — no network request needed.
 */
export function getWorkoutDayFallbackImage(focus: string): string {
  const lower = focus.toLowerCase();
  if (lower.includes('chest') || lower.includes('push'))   return MUSCLE_FALLBACKS.Chest;
  if (lower.includes('back') || lower.includes('pull'))    return MUSCLE_FALLBACKS.Back;
  if (lower.includes('shoulder'))                          return MUSCLE_FALLBACKS.Shoulders;
  if (lower.includes('arm') || lower.includes('bicep') || lower.includes('tricep'))
    return MUSCLE_FALLBACKS.Biceps;
  if (lower.includes('leg') || lower.includes('squat') || lower.includes('lower'))
    return MUSCLE_FALLBACKS.Legs;
  if (lower.includes('glute'))                             return MUSCLE_FALLBACKS.Glutes;
  if (lower.includes('core') || lower.includes('ab'))      return MUSCLE_FALLBACKS.Core;
  if (lower.includes('calf') || lower.includes('calve'))   return MUSCLE_FALLBACKS.Calves;
  if (lower.includes('cardio') || lower.includes('endurance'))
    return 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=600&h=340&fit=crop&q=80';
  return GENERIC_FALLBACK;
}

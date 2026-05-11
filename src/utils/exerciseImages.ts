// Curated Unsplash images for exercises — no API key required
// Each URL is a permanent photo at 600×340, cropped and optimised

const BASE = 'https://images.unsplash.com/photo-';
const Q = '?w=600&h=340&fit=crop&q=80&auto=format';

// ─── Per-exercise overrides (most common lifts) ──────────────────────────────
const EXERCISE_IMAGES: Record<string, string> = {
  'Barbell Bench Press':      `${BASE}1534438327276-14e5300c3a48${Q}`,
  'Dumbbell Bench Press':     `${BASE}1534438327276-14e5300c3a48${Q}`,
  'Incline Barbell Press':    `${BASE}1571019614242-c5c5dee9f50b${Q}`,
  'Incline Dumbbell Press':   `${BASE}1571019614242-c5c5dee9f50b${Q}`,
  'Push-Ups':                 `${BASE}1598971457999-ca4ef48a9a71${Q}`,
  'Diamond Push-Ups':         `${BASE}1598971457999-ca4ef48a9a71${Q}`,
  'Dips':                     `${BASE}1583454110551-21f2fa2afe61${Q}`,
  'Chest Dips':               `${BASE}1583454110551-21f2fa2afe61${Q}`,

  'Barbell Deadlift':         `${BASE}1526506118085-60ce8714f8c5${Q}`,
  'Sumo Deadlift':            `${BASE}1526506118085-60ce8714f8c5${Q}`,
  'Pull-Ups':                 `${BASE}1526506118085-60ce8714f8c5${Q}`,
  'Lat Pulldown':             `${BASE}1603287681836-b174ce5074c2${Q}`,
  'Barbell Bent-Over Row':    `${BASE}1603287681836-b174ce5074c2${Q}`,
  'Seated Cable Row':         `${BASE}1603287681836-b174ce5074c2${Q}`,
  'Dumbbell Row':             `${BASE}1603287681836-b174ce5074c2${Q}`,
  'T-Bar Row':                `${BASE}1603287681836-b174ce5074c2${Q}`,

  'Overhead Press':           `${BASE}1581009146145-b5ef050c2e1e${Q}`,
  'Dumbbell Shoulder Press':  `${BASE}1581009146145-b5ef050c2e1e${Q}`,
  'Arnold Press':             `${BASE}1581009146145-b5ef050c2e1e${Q}`,
  'Lateral Raises':           `${BASE}1581009146145-b5ef050c2e1e${Q}`,

  'Barbell Back Squat':       `${BASE}1574680096145-d05b474e2155${Q}`,
  'Front Squat':              `${BASE}1574680096145-d05b474e2155${Q}`,
  'Goblet Squat':             `${BASE}1574680096145-d05b474e2155${Q}`,
  'Leg Press':                `${BASE}1574680096145-d05b474e2155${Q}`,
  'Lunges':                   `${BASE}1552196563-55cd4e45efb3${Q}`,
  'Bulgarian Split Squat':    `${BASE}1552196563-55cd4e45efb3${Q}`,
  'Romanian Deadlift':        `${BASE}1526506118085-60ce8714f8c5${Q}`,
  'Box Jumps':                `${BASE}1552196563-55cd4e45efb3${Q}`,
  'Step-Ups':                 `${BASE}1552196563-55cd4e45efb3${Q}`,

  'Hip Thrust':               `${BASE}1552196563-55cd4e45efb3${Q}`,
  'Glute Bridge':             `${BASE}1552196563-55cd4e45efb3${Q}`,

  'Barbell Curl':             `${BASE}1583454110551-21f2fa2afe61${Q}`,
  'Dumbbell Curl':            `${BASE}1583454110551-21f2fa2afe61${Q}`,
  'Hammer Curl':              `${BASE}1583454110551-21f2fa2afe61${Q}`,
  'Cable Curl':               `${BASE}1583454110551-21f2fa2afe61${Q}`,

  'Skull Crushers':           `${BASE}1530822847156-5df684ec5ee1${Q}`,
  'Tricep Pushdown':          `${BASE}1530822847156-5df684ec5ee1${Q}`,
  'Close-Grip Bench Press':   `${BASE}1530822847156-5df684ec5ee1${Q}`,
  'Overhead Tricep Extension':`${BASE}1530822847156-5df684ec5ee1${Q}`,

  'Plank':                    `${BASE}1571019613454-1cb2f99b2d8b${Q}`,
  'Side Plank':               `${BASE}1571019613454-1cb2f99b2d8b${Q}`,
  'Ab Wheel Rollout':         `${BASE}1571019613454-1cb2f99b2d8b${Q}`,
  'Hanging Leg Raise':        `${BASE}1526506118085-60ce8714f8c5${Q}`,
  'Bicycle Crunch':           `${BASE}1571019613454-1cb2f99b2d8b${Q}`,
  'Sit-Ups':                  `${BASE}1571019613454-1cb2f99b2d8b${Q}`,

  'Burpees':                  `${BASE}1517836357463-d25dfeac3438${Q}`,
  'Mountain Climbers':        `${BASE}1517836357463-d25dfeac3438${Q}`,
  'Kettlebell Swing':         `${BASE}1517836357463-d25dfeac3438${Q}`,
  'Treadmill Run':            `${BASE}1538805060514-97d9cc17730c${Q}`,
  'Jump Rope':                `${BASE}1538805060514-97d9cc17730c${Q}`,
  'Rowing Machine':           `${BASE}1517836357463-d25dfeac3438${Q}`,
};

// ─── Fallback by primary muscle group ────────────────────────────────────────
const MUSCLE_IMAGES: Record<string, string> = {
  Chest:      `${BASE}1571019614242-c5c5dee9f50b${Q}`,
  Back:       `${BASE}1603287681836-b174ce5074c2${Q}`,
  Shoulders:  `${BASE}1581009146145-b5ef050c2e1e${Q}`,
  Biceps:     `${BASE}1583454110551-21f2fa2afe61${Q}`,
  Triceps:    `${BASE}1530822847156-5df684ec5ee1${Q}`,
  Legs:       `${BASE}1574680096145-d05b474e2155${Q}`,
  Glutes:     `${BASE}1552196563-55cd4e45efb3${Q}`,
  Core:       `${BASE}1571019613454-1cb2f99b2d8b${Q}`,
  Calves:     `${BASE}1434682881908-b43d0467b798${Q}`,
  Forearms:   `${BASE}1583454110551-21f2fa2afe61${Q}`,
  'Full Body':`${BASE}1517836357463-d25dfeac3438${Q}`,
};

const FALLBACK = `${BASE}1517836357463-d25dfeac3438${Q}`;

/**
 * Returns an image URL for a given exercise name + muscle group list.
 * Prefers a specific exercise photo, falls back to muscle group, then generic gym.
 */
export function getExerciseImage(
  exerciseName: string,
  muscleGroups: string[] = [],
): string {
  if (EXERCISE_IMAGES[exerciseName]) return EXERCISE_IMAGES[exerciseName];
  for (const m of muscleGroups) {
    if (MUSCLE_IMAGES[m]) return MUSCLE_IMAGES[m];
  }
  return FALLBACK;
}

/**
 * Returns a hero image for a workout day based on its focus string.
 */
export function getWorkoutDayImage(focus: string): string {
  const lower = focus.toLowerCase();
  if (lower.includes('chest'))     return MUSCLE_IMAGES.Chest;
  if (lower.includes('back'))      return MUSCLE_IMAGES.Back;
  if (lower.includes('shoulder'))  return MUSCLE_IMAGES.Shoulders;
  if (lower.includes('arm') || lower.includes('bicep') || lower.includes('tricep'))
    return MUSCLE_IMAGES.Biceps;
  if (lower.includes('leg') || lower.includes('squat') || lower.includes('lower'))
    return MUSCLE_IMAGES.Legs;
  if (lower.includes('glute'))     return MUSCLE_IMAGES.Glutes;
  if (lower.includes('core') || lower.includes('ab')) return MUSCLE_IMAGES.Core;
  if (lower.includes('push'))      return MUSCLE_IMAGES.Chest;
  if (lower.includes('pull'))      return MUSCLE_IMAGES.Back;
  if (lower.includes('cardio') || lower.includes('endurance'))
    return `${BASE}1538805060514-97d9cc17730c${Q}`;
  return FALLBACK;
}

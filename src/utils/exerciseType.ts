/**
 * Exercise-type helpers.
 *
 * The `reps` string stored on WorkoutExercise already encodes the intent:
 *   '8-12'      → reps-based
 *   '30-60s'    → time-based (seconds)
 *   '1min'      → time-based (minutes → convert to seconds for display)
 *   '20-30min'  → time-based
 *
 * Distance support is stubbed for future use ('400m', '5km', etc.).
 */

export type ExerciseType = 'reps' | 'time' | 'distance';

/**
 * Infer exercise type from the target-reps string.
 * Falls back to 'reps' for any unrecognised format.
 */
export function getExerciseType(repsStr: string): ExerciseType {
  const lower = repsStr.toLowerCase().trim();
  if (lower.includes('min') || lower.endsWith('s')) return 'time';
  // Distance: ends with 'm' (but NOT 'min') or 'km'
  if (/\d+(km|mi)$/.test(lower)) return 'distance';
  return 'reps';
}

/**
 * Format a stored numeric value for display given the exercise type.
 *
 * time:  45 → "45s"  |  90 → "1m 30s"  |  1200 → "20m"
 * reps:  12 → "12"
 */
export function formatSetValue(value: number | null, type: ExerciseType): string {
  if (value == null || value === 0) return '';
  if (type === 'time') {
    if (value >= 60) {
      const m = Math.floor(value / 60);
      const s = value % 60;
      return s > 0 ? `${m}m ${s}s` : `${m}m`;
    }
    return `${value}s`;
  }
  return String(value);
}

/**
 * Parse the target reps string into a suggested default (for placeholder hints).
 *
 * '30-60s'   → 45   (average, seconds)
 * '1min'     → 60   (seconds)
 * '20-30min' → 1500 (25 min in seconds)
 * '8-12'     → 10   (average reps)
 */
export function parseTargetDefault(repsStr: string): number {
  const lower = repsStr.toLowerCase();
  const numeric = repsStr.replace(/[^0-9\-]/g, '');
  const parts = numeric.split('-').map(Number).filter((n) => !isNaN(n) && n > 0);
  const avg = parts.length > 0
    ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length)
    : 0;
  if (lower.includes('min')) return avg * 60;
  return avg;
}

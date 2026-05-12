import { WorkoutExercise } from '../types';

/**
 * Parses a reps string like "8-12" or "15" and returns the average.
 */
function parseAvgReps(repsStr: string): number {
  const match = repsStr.match(/(\d+)(?:\s*[-–]\s*(\d+))?/);
  if (!match) return 10;
  const min = parseInt(match[1], 10);
  const max = match[2] ? parseInt(match[2], 10) : min;
  return Math.round((min + max) / 2);
}

/**
 * Calculates realistic workout duration in minutes based on actual sets,
 * reps (3 s/rep time under tension), rest periods, and 60 s transition
 * between exercises.
 *
 * Also returns a breakdown per exercise for display.
 */
export function calculateWorkoutDuration(exercises: WorkoutExercise[]): {
  totalMinutes: number;
  label: string; // e.g. "~43 min"
} {
  if (!exercises.length) return { totalMinutes: 0, label: '—' };

  let totalSeconds = 0;

  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const avgReps = parseAvgReps(ex.reps ?? '10');

    // ~3 s per rep (concentric + brief pause + eccentric)
    const setDuration = avgReps * 3;

    // All sets for this exercise
    const liftingTime = ex.sets * setDuration;

    // Rest between sets (one fewer rest than sets)
    const restBetweenSets = Math.max(0, ex.sets - 1) * (ex.rest_seconds ?? 60);

    totalSeconds += liftingTime + restBetweenSets;

    // Transition to next exercise: 60 s (walk to station, load plates, get ready)
    if (i < exercises.length - 1) {
      totalSeconds += 60;
    }
  }

  // Add 5-minute warm-up
  totalSeconds += 5 * 60;

  const totalMinutes = Math.round(totalSeconds / 60);
  return {
    totalMinutes,
    label: `~${totalMinutes} min`,
  };
}

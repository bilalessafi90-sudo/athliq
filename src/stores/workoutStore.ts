import { create } from 'zustand';
import { ActiveExercise, WorkoutDay, WorkoutSession } from '../types';

interface WorkoutStore {
  activeSession: WorkoutSession | null;
  activeDay: WorkoutDay | null;
  activeExercises: ActiveExercise[];
  currentExerciseIndex: number;
  sessionStartTime: Date | null;

  startSession: (session: WorkoutSession, day: WorkoutDay, exercises: ActiveExercise[]) => void;
  updateSet: (exerciseIdx: number, setIdx: number, field: 'reps' | 'weight', value: number) => void;
  completeSet: (exerciseIdx: number, setIdx: number) => void;
  nextExercise: () => void;
  prevExercise: () => void;
  endSession: () => void;
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  activeSession: null,
  activeDay: null,
  activeExercises: [],
  currentExerciseIndex: 0,
  sessionStartTime: null,

  startSession: (session, day, exercises) =>
    set({
      activeSession: session,
      activeDay: day,
      activeExercises: exercises,
      currentExerciseIndex: 0,
      sessionStartTime: new Date(),
    }),

  updateSet: (exerciseIdx, setIdx, field, value) =>
    set((s) => {
      const exercises = [...s.activeExercises];
      const sets = [...exercises[exerciseIdx].sets];
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      exercises[exerciseIdx] = { ...exercises[exerciseIdx], sets };
      return { activeExercises: exercises };
    }),

  completeSet: (exerciseIdx, setIdx) =>
    set((s) => {
      const exercises = [...s.activeExercises];
      const sets = [...exercises[exerciseIdx].sets];
      sets[setIdx] = { ...sets[setIdx], completed: true };
      exercises[exerciseIdx] = { ...exercises[exerciseIdx], sets };
      return { activeExercises: exercises };
    }),

  nextExercise: () =>
    set((s) => ({
      currentExerciseIndex: Math.min(
        s.currentExerciseIndex + 1,
        s.activeExercises.length - 1,
      ),
    })),

  prevExercise: () =>
    set((s) => ({
      currentExerciseIndex: Math.max(0, s.currentExerciseIndex - 1),
    })),

  endSession: () =>
    set({
      activeSession: null,
      activeDay: null,
      activeExercises: [],
      currentExerciseIndex: 0,
      sessionStartTime: null,
    }),
}));

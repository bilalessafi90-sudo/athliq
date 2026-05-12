import { addDays, format, startOfWeek } from 'date-fns';
import { FitnessGoal, ExperienceLevel, WorkoutDay, WorkoutExercise, DayOfWeek } from '../types';
import { PLAN_DURATION_WEEKS } from '../constants';
import { calculateWorkoutDuration } from './workoutDuration';

const MAX_WORKOUT_MINUTES = 70;

/** True core/ab exercise = Core is the primary (first) muscle group */
const isCoreExercise = (ex: ExerciseTemplate) => ex.muscle_groups[0] === 'Core';

// ─── Exercise Templates ──────────────────────────────────────────────────────

interface ExerciseTemplate {
  name: string;
  muscle_groups: string[];
  equipment: string[];
  sets: number;
  reps: string;
  rest_seconds: number;
  instructions: string;
  difficulty: ExperienceLevel;
}

const EXERCISE_DB: ExerciseTemplate[] = [
  // ── Chest ──────────────────────────────────────────────────────────────────
  { name: 'Barbell Bench Press', muscle_groups: ['Chest', 'Shoulders', 'Triceps'], equipment: ['barbell'], sets: 4, reps: '6-8', rest_seconds: 120, instructions: 'Lie flat on bench. Grip bar slightly wider than shoulders. Lower to chest, press back up.', difficulty: 'beginner' },
  { name: 'Dumbbell Bench Press', muscle_groups: ['Chest', 'Shoulders', 'Triceps'], equipment: ['dumbbells'], sets: 3, reps: '8-12', rest_seconds: 90, instructions: 'Lie flat, press dumbbells from chest level to full extension.', difficulty: 'beginner' },
  { name: 'Incline Barbell Press', muscle_groups: ['Chest', 'Shoulders'], equipment: ['barbell'], sets: 4, reps: '8-10', rest_seconds: 90, instructions: 'Set bench to 30-45°. Press bar from upper chest to full extension.', difficulty: 'intermediate' },
  { name: 'Push-Ups', muscle_groups: ['Chest', 'Triceps', 'Shoulders'], equipment: ['bodyweight'], sets: 3, reps: '12-20', rest_seconds: 60, instructions: 'Plank position, lower chest to floor, press back up. Keep core tight.', difficulty: 'beginner' },
  { name: 'Cable Chest Fly', muscle_groups: ['Chest'], equipment: ['cables'], sets: 3, reps: '12-15', rest_seconds: 60, instructions: 'Set cables at shoulder height. Bring handles together in front of chest.', difficulty: 'intermediate' },
  { name: 'Dips', muscle_groups: ['Chest', 'Triceps'], equipment: ['bodyweight'], sets: 3, reps: '8-12', rest_seconds: 90, instructions: 'Lower body by bending elbows. Lean forward to emphasize chest.', difficulty: 'intermediate' },

  // ── Back ───────────────────────────────────────────────────────────────────
  { name: 'Barbell Deadlift', muscle_groups: ['Back', 'Glutes', 'Legs'], equipment: ['barbell'], sets: 4, reps: '4-6', rest_seconds: 180, instructions: 'Hip-width stance, neutral spine. Drive through heels to stand.', difficulty: 'intermediate' },
  { name: 'Pull-Ups', muscle_groups: ['Back', 'Biceps'], equipment: ['pull_up_bar', 'bodyweight'], sets: 4, reps: '6-10', rest_seconds: 90, instructions: 'Hang from bar. Pull chin above bar, control descent.', difficulty: 'intermediate' },
  { name: 'Lat Pulldown', muscle_groups: ['Back', 'Biceps'], equipment: ['cables', 'machines'], sets: 3, reps: '10-12', rest_seconds: 90, instructions: 'Grip bar wide. Pull down to upper chest, squeeze lats.', difficulty: 'beginner' },
  { name: 'Barbell Bent-Over Row', muscle_groups: ['Back', 'Biceps'], equipment: ['barbell'], sets: 4, reps: '8-10', rest_seconds: 90, instructions: 'Hinge at hips, neutral spine. Pull bar to lower ribcage.', difficulty: 'intermediate' },
  { name: 'Seated Cable Row', muscle_groups: ['Back', 'Biceps'], equipment: ['cables'], sets: 3, reps: '10-12', rest_seconds: 75, instructions: 'Sit tall, pull handle to abdomen, squeeze shoulder blades.', difficulty: 'beginner' },
  { name: 'Dumbbell Row', muscle_groups: ['Back', 'Biceps'], equipment: ['dumbbells'], sets: 3, reps: '10-12', rest_seconds: 75, instructions: 'Support on bench, row dumbbell to hip, control descent.', difficulty: 'beginner' },
  { name: 'Inverted Row', muscle_groups: ['Back', 'Biceps'], equipment: ['bodyweight'], sets: 3, reps: '10-15', rest_seconds: 60, instructions: 'Under a bar, pull chest to bar keeping body straight.', difficulty: 'beginner' },

  // ── Shoulders ──────────────────────────────────────────────────────────────
  { name: 'Overhead Press', muscle_groups: ['Shoulders', 'Triceps'], equipment: ['barbell'], sets: 4, reps: '6-8', rest_seconds: 120, instructions: 'Press bar from clavicle to overhead. Lock out at top.', difficulty: 'intermediate' },
  { name: 'Dumbbell Shoulder Press', muscle_groups: ['Shoulders', 'Triceps'], equipment: ['dumbbells'], sets: 3, reps: '10-12', rest_seconds: 75, instructions: 'Press dumbbells from ear height to overhead.', difficulty: 'beginner' },
  { name: 'Lateral Raises', muscle_groups: ['Shoulders'], equipment: ['dumbbells', 'cables'], sets: 3, reps: '12-15', rest_seconds: 60, instructions: 'Raise arms to shoulder height with slight bend at elbow.', difficulty: 'beginner' },
  { name: 'Face Pulls', muscle_groups: ['Shoulders', 'Back'], equipment: ['cables'], sets: 3, reps: '15-20', rest_seconds: 60, instructions: 'Pull rope to face with elbows high. External rotate at end.', difficulty: 'beginner' },
  { name: 'Arnold Press', muscle_groups: ['Shoulders', 'Triceps'], equipment: ['dumbbells'], sets: 3, reps: '10-12', rest_seconds: 75, instructions: 'Start palms facing you, rotate while pressing overhead.', difficulty: 'intermediate' },

  // ── Biceps ─────────────────────────────────────────────────────────────────
  { name: 'Barbell Curl', muscle_groups: ['Biceps'], equipment: ['barbell'], sets: 3, reps: '10-12', rest_seconds: 60, instructions: 'Stand tall, curl bar to shoulder height. Lower under control.', difficulty: 'beginner' },
  { name: 'Dumbbell Curl', muscle_groups: ['Biceps'], equipment: ['dumbbells'], sets: 3, reps: '10-12', rest_seconds: 60, instructions: 'Curl one arm at a time or alternating. Supinate at top.', difficulty: 'beginner' },
  { name: 'Hammer Curl', muscle_groups: ['Biceps', 'Forearms'], equipment: ['dumbbells'], sets: 3, reps: '10-12', rest_seconds: 60, instructions: 'Neutral grip curl. Targets brachialis and brachioradialis.', difficulty: 'beginner' },
  { name: 'Cable Curl', muscle_groups: ['Biceps'], equipment: ['cables'], sets: 3, reps: '12-15', rest_seconds: 60, instructions: 'Keep elbows fixed, curl cable bar to chin.', difficulty: 'beginner' },

  // ── Triceps ────────────────────────────────────────────────────────────────
  { name: 'Close-Grip Bench Press', muscle_groups: ['Triceps', 'Chest'], equipment: ['barbell'], sets: 3, reps: '8-12', rest_seconds: 90, instructions: 'Grip shoulder-width. Lower to chest, press up keeping elbows close.', difficulty: 'intermediate' },
  { name: 'Tricep Pushdown', muscle_groups: ['Triceps'], equipment: ['cables'], sets: 3, reps: '12-15', rest_seconds: 60, instructions: 'Elbows at sides, push bar down to full extension.', difficulty: 'beginner' },
  { name: 'Skull Crushers', muscle_groups: ['Triceps'], equipment: ['barbell', 'dumbbells'], sets: 3, reps: '10-12', rest_seconds: 75, instructions: 'Lower bar to forehead keeping upper arms perpendicular.', difficulty: 'intermediate' },
  { name: 'Diamond Push-Ups', muscle_groups: ['Triceps', 'Chest'], equipment: ['bodyweight'], sets: 3, reps: '10-15', rest_seconds: 60, instructions: 'Hands form diamond shape. Lower chest to hands, press up.', difficulty: 'beginner' },
  { name: 'Overhead Tricep Extension', muscle_groups: ['Triceps'], equipment: ['dumbbells', 'cables'], sets: 3, reps: '12-15', rest_seconds: 60, instructions: 'Hold weight overhead, lower behind head, extend up.', difficulty: 'beginner' },

  // ── Legs ───────────────────────────────────────────────────────────────────
  { name: 'Barbell Back Squat', muscle_groups: ['Legs', 'Glutes', 'Core'], equipment: ['barbell'], sets: 4, reps: '5-8', rest_seconds: 180, instructions: 'Bar on upper back. Squat below parallel, drive through heels.', difficulty: 'intermediate' },
  { name: 'Front Squat', muscle_groups: ['Legs', 'Core'], equipment: ['barbell'], sets: 4, reps: '6-8', rest_seconds: 150, instructions: 'Bar on front delts. Stay upright through the squat.', difficulty: 'advanced' },
  { name: 'Romanian Deadlift', muscle_groups: ['Legs', 'Glutes', 'Back'], equipment: ['barbell', 'dumbbells'], sets: 4, reps: '8-10', rest_seconds: 90, instructions: 'Hinge at hips keeping slight knee bend. Feel hamstring stretch.', difficulty: 'intermediate' },
  { name: 'Leg Press', muscle_groups: ['Legs', 'Glutes'], equipment: ['machines'], sets: 4, reps: '10-12', rest_seconds: 90, instructions: 'Press platform away. Don\'t lock knees at top.', difficulty: 'beginner' },
  { name: 'Lunges', muscle_groups: ['Legs', 'Glutes'], equipment: ['dumbbells', 'bodyweight'], sets: 3, reps: '10-12', rest_seconds: 75, instructions: 'Step forward, lower knee toward floor. Push back to start.', difficulty: 'beginner' },
  { name: 'Bulgarian Split Squat', muscle_groups: ['Legs', 'Glutes'], equipment: ['dumbbells', 'barbell', 'bodyweight'], sets: 3, reps: '8-10', rest_seconds: 90, instructions: 'Rear foot elevated. Lower front knee to 90°.', difficulty: 'intermediate' },
  { name: 'Leg Curl', muscle_groups: ['Legs'], equipment: ['machines'], sets: 3, reps: '10-12', rest_seconds: 75, instructions: 'Curl ankles toward glutes. Control the descent.', difficulty: 'beginner' },
  { name: 'Leg Extension', muscle_groups: ['Legs'], equipment: ['machines'], sets: 3, reps: '12-15', rest_seconds: 60, instructions: 'Extend knees to full lockout. Hold briefly at top.', difficulty: 'beginner' },
  { name: 'Box Jumps', muscle_groups: ['Legs', 'Glutes', 'Full Body'], equipment: ['bodyweight'], sets: 3, reps: '8-10', rest_seconds: 90, instructions: 'Explosive jump onto box. Step down, don\'t jump down.', difficulty: 'intermediate' },

  // ── Core ───────────────────────────────────────────────────────────────────
  { name: 'Plank', muscle_groups: ['Core'], equipment: ['bodyweight'], sets: 3, reps: '30-60s', rest_seconds: 60, instructions: 'Forearm plank. Keep hips level, breathe steadily.', difficulty: 'beginner' },
  { name: 'Cable Crunch', muscle_groups: ['Core'], equipment: ['cables'], sets: 3, reps: '15-20', rest_seconds: 60, instructions: 'Kneel, pull rope down crunching abs. Keep hips still.', difficulty: 'beginner' },
  { name: 'Ab Wheel Rollout', muscle_groups: ['Core'], equipment: ['bodyweight'], sets: 3, reps: '8-12', rest_seconds: 75, instructions: 'Roll wheel out until body is flat. Pull back using abs.', difficulty: 'intermediate' },
  { name: 'Hanging Leg Raise', muscle_groups: ['Core'], equipment: ['pull_up_bar', 'bodyweight'], sets: 3, reps: '10-15', rest_seconds: 60, instructions: 'Hang from bar, raise legs to 90° or higher. Control descent.', difficulty: 'intermediate' },
  { name: 'Bicycle Crunch', muscle_groups: ['Core'], equipment: ['bodyweight'], sets: 3, reps: '20-30', rest_seconds: 45, instructions: 'Alternate elbow to opposite knee in cycling motion.', difficulty: 'beginner' },

  // ── Calves ─────────────────────────────────────────────────────────────────
  { name: 'Standing Calf Raise', muscle_groups: ['Calves'], equipment: ['machines', 'bodyweight', 'barbell'], sets: 4, reps: '15-20', rest_seconds: 60, instructions: 'Rise onto toes, hold briefly, lower fully.', difficulty: 'beginner' },
  { name: 'Seated Calf Raise', muscle_groups: ['Calves'], equipment: ['machines'], sets: 3, reps: '15-20', rest_seconds: 60, instructions: 'Weight on knees, raise heels as high as possible.', difficulty: 'beginner' },

  // ── Cardio / Endurance ─────────────────────────────────────────────────────
  { name: 'Treadmill Run', muscle_groups: ['Full Body'], equipment: ['machines'], sets: 1, reps: '20-30min', rest_seconds: 0, instructions: 'Maintain conversational pace. Focus on breathing.', difficulty: 'beginner' },
  { name: 'Jump Rope', muscle_groups: ['Full Body', 'Calves'], equipment: ['bodyweight'], sets: 5, reps: '1min', rest_seconds: 30, instructions: 'Jump lightly on toes. Maintain rhythm.', difficulty: 'beginner' },
  { name: 'Burpees', muscle_groups: ['Full Body'], equipment: ['bodyweight'], sets: 3, reps: '10-15', rest_seconds: 60, instructions: 'Squat, kick back to plank, push-up, return, jump with arms overhead.', difficulty: 'intermediate' },
  { name: 'Mountain Climbers', muscle_groups: ['Core', 'Full Body'], equipment: ['bodyweight'], sets: 3, reps: '20-30', rest_seconds: 45, instructions: 'Plank position. Drive knees to chest alternately at speed.', difficulty: 'beginner' },
  { name: 'Rowing Machine', muscle_groups: ['Back', 'Legs', 'Full Body'], equipment: ['machines'], sets: 1, reps: '15-20min', rest_seconds: 0, instructions: 'Drive with legs first, then lean back, then pull arms. Reverse on return.', difficulty: 'beginner' },
];

// ─── Workout Split Templates ─────────────────────────────────────────────────

type SplitType = 'full_body' | 'upper_lower' | 'ppl' | 'pplul';

interface DayTemplate {
  name: string;
  focus: string;
  muscleTargets: string[];
}

const SPLITS: Record<number, Record<FitnessGoal, { type: SplitType; days: DayTemplate[] }>> = {
  2: {
    lose_weight: {
      type: 'full_body',
      days: [
        { name: 'Full Body A', focus: 'Strength + Cardio', muscleTargets: ['Chest', 'Back', 'Legs', 'Core'] },
        { name: 'Full Body B', focus: 'Strength + Cardio', muscleTargets: ['Shoulders', 'Back', 'Legs', 'Core'] },
      ],
    },
    build_muscle: {
      type: 'upper_lower',
      days: [
        { name: 'Upper Body A', focus: 'Chest & Back', muscleTargets: ['Chest', 'Back', 'Biceps', 'Triceps'] },
        { name: 'Lower Body A', focus: 'Quads & Glutes', muscleTargets: ['Legs', 'Glutes', 'Core', 'Calves'] },
      ],
    },
    get_lean: {
      type: 'full_body',
      days: [
        { name: 'Full Body A', focus: 'Compound + HIIT', muscleTargets: ['Chest', 'Back', 'Legs', 'Core'] },
        { name: 'Full Body B', focus: 'Compound + HIIT', muscleTargets: ['Shoulders', 'Back', 'Legs', 'Core'] },
      ],
    },
    improve_endurance: {
      type: 'full_body',
      days: [
        { name: 'Strength Endurance A', focus: 'Upper + Cardio', muscleTargets: ['Chest', 'Back', 'Shoulders'] },
        { name: 'Strength Endurance B', focus: 'Lower + Cardio', muscleTargets: ['Legs', 'Core', 'Full Body'] },
      ],
    },
  },
  3: {
    lose_weight: {
      type: 'full_body',
      days: [
        { name: 'Full Body A', focus: 'Compound Strength', muscleTargets: ['Chest', 'Back', 'Legs'] },
        { name: 'Full Body B', focus: 'Metabolic Circuit', muscleTargets: ['Shoulders', 'Back', 'Core', 'Full Body'] },
        { name: 'Full Body C', focus: 'Strength + HIIT', muscleTargets: ['Legs', 'Chest', 'Calves', 'Core'] },
      ],
    },
    build_muscle: {
      type: 'ppl',
      days: [
        { name: 'Push Day', focus: 'Chest, Shoulders & Triceps', muscleTargets: ['Chest', 'Shoulders', 'Triceps'] },
        { name: 'Pull Day', focus: 'Back & Biceps', muscleTargets: ['Back', 'Biceps'] },
        { name: 'Leg Day', focus: 'Quads, Hamstrings & Glutes', muscleTargets: ['Legs', 'Glutes', 'Calves'] },
      ],
    },
    get_lean: {
      type: 'full_body',
      days: [
        { name: 'Upper Body', focus: 'Chest & Back', muscleTargets: ['Chest', 'Back', 'Biceps', 'Triceps'] },
        { name: 'Lower Body', focus: 'Legs & Core', muscleTargets: ['Legs', 'Glutes', 'Core', 'Calves'] },
        { name: 'Full Body HIIT', focus: 'Metabolic Conditioning', muscleTargets: ['Full Body', 'Core'] },
      ],
    },
    improve_endurance: {
      type: 'full_body',
      days: [
        { name: 'Cardio + Upper', focus: 'Aerobic + Strength', muscleTargets: ['Full Body', 'Chest', 'Back'] },
        { name: 'Intervals + Lower', focus: 'HIIT + Legs', muscleTargets: ['Legs', 'Full Body', 'Core'] },
        { name: 'Long Run + Core', focus: 'Steady State + Core', muscleTargets: ['Full Body', 'Core'] },
      ],
    },
  },
  4: {
    lose_weight: {
      type: 'upper_lower',
      days: [
        { name: 'Upper A', focus: 'Chest & Back', muscleTargets: ['Chest', 'Back', 'Biceps', 'Triceps'] },
        { name: 'Lower A', focus: 'Quads & Glutes', muscleTargets: ['Legs', 'Glutes', 'Calves'] },
        { name: 'Upper B + Cardio', focus: 'Shoulders + HIIT', muscleTargets: ['Shoulders', 'Back', 'Full Body'] },
        { name: 'Lower B + Core', focus: 'Hamstrings + Core', muscleTargets: ['Legs', 'Glutes', 'Core'] },
      ],
    },
    build_muscle: {
      type: 'upper_lower',
      days: [
        { name: 'Upper A', focus: 'Chest & Back (Heavy)', muscleTargets: ['Chest', 'Back', 'Biceps'] },
        { name: 'Lower A', focus: 'Quads & Hamstrings', muscleTargets: ['Legs', 'Glutes', 'Calves'] },
        { name: 'Upper B', focus: 'Shoulders & Arms', muscleTargets: ['Shoulders', 'Biceps', 'Triceps', 'Back'] },
        { name: 'Lower B', focus: 'Glutes & Hamstrings', muscleTargets: ['Legs', 'Glutes', 'Core'] },
      ],
    },
    get_lean: {
      type: 'upper_lower',
      days: [
        { name: 'Push', focus: 'Chest, Shoulders & Triceps', muscleTargets: ['Chest', 'Shoulders', 'Triceps'] },
        { name: 'Pull', focus: 'Back & Biceps', muscleTargets: ['Back', 'Biceps'] },
        { name: 'Legs', focus: 'Full Lower', muscleTargets: ['Legs', 'Glutes', 'Calves'] },
        { name: 'Conditioning', focus: 'Core + Full Body', muscleTargets: ['Core', 'Full Body'] },
      ],
    },
    improve_endurance: {
      type: 'full_body',
      days: [
        { name: 'Long Cardio', focus: 'Steady State', muscleTargets: ['Full Body'] },
        { name: 'Upper Strength', focus: 'Compound Movements', muscleTargets: ['Chest', 'Back', 'Shoulders'] },
        { name: 'HIIT + Core', focus: 'Intervals', muscleTargets: ['Full Body', 'Core'] },
        { name: 'Lower Strength', focus: 'Legs + Endurance', muscleTargets: ['Legs', 'Glutes', 'Calves'] },
      ],
    },
  },
  5: {
    lose_weight: {
      type: 'pplul',
      days: [
        { name: 'Push', focus: 'Chest, Shoulders & Triceps', muscleTargets: ['Chest', 'Shoulders', 'Triceps'] },
        { name: 'Pull', focus: 'Back & Biceps', muscleTargets: ['Back', 'Biceps'] },
        { name: 'Legs', focus: 'Full Lower Body', muscleTargets: ['Legs', 'Glutes', 'Calves'] },
        { name: 'Upper + HIIT', focus: 'Full Upper + Cardio', muscleTargets: ['Chest', 'Back', 'Shoulders', 'Full Body'] },
        { name: 'Lower + Core', focus: 'Legs + Abs', muscleTargets: ['Legs', 'Glutes', 'Core'] },
      ],
    },
    build_muscle: {
      type: 'pplul',
      days: [
        { name: 'Push A', focus: 'Chest Heavy', muscleTargets: ['Chest', 'Shoulders', 'Triceps'] },
        { name: 'Pull A', focus: 'Back Heavy', muscleTargets: ['Back', 'Biceps'] },
        { name: 'Legs A', focus: 'Quad Dominant', muscleTargets: ['Legs', 'Glutes', 'Calves', 'Core'] },
        { name: 'Push B', focus: 'Shoulders Heavy', muscleTargets: ['Shoulders', 'Chest', 'Triceps'] },
        { name: 'Pull B', focus: 'Biceps Focus', muscleTargets: ['Biceps', 'Back'] },
      ],
    },
    get_lean: {
      type: 'ppl',
      days: [
        { name: 'Push', focus: 'Chest, Shoulders & Triceps', muscleTargets: ['Chest', 'Shoulders', 'Triceps'] },
        { name: 'Pull', focus: 'Back & Biceps', muscleTargets: ['Back', 'Biceps'] },
        { name: 'Legs A', focus: 'Quads & Glutes', muscleTargets: ['Legs', 'Glutes', 'Calves'] },
        { name: 'Upper Body', focus: 'Full Upper', muscleTargets: ['Chest', 'Back', 'Shoulders', 'Arms'] },
        { name: 'Legs B + Core', focus: 'Hamstrings + Core', muscleTargets: ['Legs', 'Core', 'Calves'] },
      ],
    },
    improve_endurance: {
      type: 'full_body',
      days: [
        { name: 'Long Run', focus: 'Aerobic Base', muscleTargets: ['Full Body'] },
        { name: 'Upper Strength', focus: 'Compound Upper', muscleTargets: ['Back', 'Chest', 'Shoulders'] },
        { name: 'Tempo Run', focus: 'Threshold Training', muscleTargets: ['Full Body'] },
        { name: 'Lower Strength', focus: 'Leg Power', muscleTargets: ['Legs', 'Glutes'] },
        { name: 'Interval + Core', focus: 'HIIT + Core', muscleTargets: ['Full Body', 'Core'] },
      ],
    },
  },
  6: {
    lose_weight: {
      type: 'ppl',
      days: [
        { name: 'Push A', focus: 'Chest & Shoulders', muscleTargets: ['Chest', 'Shoulders', 'Triceps'] },
        { name: 'Pull A', focus: 'Back & Biceps', muscleTargets: ['Back', 'Biceps'] },
        { name: 'Legs A', focus: 'Full Lower', muscleTargets: ['Legs', 'Glutes', 'Core'] },
        { name: 'Push B + Cardio', focus: 'Triceps & HIIT', muscleTargets: ['Chest', 'Triceps', 'Full Body'] },
        { name: 'Pull B + Core', focus: 'Back Width + Abs', muscleTargets: ['Back', 'Biceps', 'Core'] },
        { name: 'Legs B + Calves', focus: 'Hamstrings & Glutes', muscleTargets: ['Legs', 'Glutes', 'Calves'] },
      ],
    },
    build_muscle: {
      type: 'ppl',
      days: [
        { name: 'Push A', focus: 'Chest Heavy', muscleTargets: ['Chest', 'Shoulders', 'Triceps'] },
        { name: 'Pull A', focus: 'Back Heavy', muscleTargets: ['Back', 'Biceps'] },
        { name: 'Legs A', focus: 'Quad Dominant', muscleTargets: ['Legs', 'Glutes', 'Calves'] },
        { name: 'Push B', focus: 'Shoulder Heavy', muscleTargets: ['Shoulders', 'Chest', 'Triceps'] },
        { name: 'Pull B', focus: 'Biceps & Rear Delt', muscleTargets: ['Biceps', 'Back', 'Shoulders'] },
        { name: 'Legs B', focus: 'Posterior Chain', muscleTargets: ['Legs', 'Glutes', 'Core', 'Calves'] },
      ],
    },
    get_lean: {
      type: 'ppl',
      days: [
        { name: 'Push A', focus: 'Chest & Shoulders', muscleTargets: ['Chest', 'Shoulders', 'Triceps'] },
        { name: 'Pull A', focus: 'Back & Biceps', muscleTargets: ['Back', 'Biceps'] },
        { name: 'Legs A', focus: 'Lower Body', muscleTargets: ['Legs', 'Glutes', 'Calves'] },
        { name: 'Push B', focus: 'Shoulders & Triceps', muscleTargets: ['Shoulders', 'Triceps'] },
        { name: 'Pull B', focus: 'Back Width', muscleTargets: ['Back', 'Biceps', 'Core'] },
        { name: 'Legs B + Core', focus: 'Hamstrings + Abs', muscleTargets: ['Legs', 'Glutes', 'Core'] },
      ],
    },
    improve_endurance: {
      type: 'full_body',
      days: [
        { name: 'Easy Run', focus: 'Recovery Pace', muscleTargets: ['Full Body'] },
        { name: 'Upper Strength', focus: 'Compound Upper', muscleTargets: ['Back', 'Chest', 'Shoulders'] },
        { name: 'Tempo Run', focus: 'Threshold', muscleTargets: ['Full Body'] },
        { name: 'Lower Strength', focus: 'Leg Power', muscleTargets: ['Legs', 'Glutes'] },
        { name: 'Long Run', focus: 'Aerobic Endurance', muscleTargets: ['Full Body'] },
        { name: 'Cross-Training', focus: 'Active Recovery', muscleTargets: ['Full Body', 'Core'] },
      ],
    },
  },
};

// ─── Day-of-week assignment ──────────────────────────────────────────────────

const TRAINING_DAY_PATTERNS: Record<number, DayOfWeek[][]> = {
  2: [['Monday', 'Thursday']],
  3: [['Monday', 'Wednesday', 'Friday']],
  4: [['Monday', 'Tuesday', 'Thursday', 'Friday']],
  5: [['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Saturday']],
  6: [['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']],
};

// ─── Plan name generator ─────────────────────────────────────────────────────

function planName(goal: FitnessGoal, weekOffset: number, experience: ExperienceLevel): string {
  const goalLabels: Record<FitnessGoal, string> = {
    lose_weight: 'Fat Loss',
    build_muscle: 'Muscle Building',
    get_lean: 'Lean Physique',
    improve_endurance: 'Endurance',
  };
  const phase = weekOffset === 0 ? 'Phase 1' : `Phase ${weekOffset + 1}`;
  return `${goalLabels[goal]} Program · ${phase}`;
}

// ─── Main Generator ──────────────────────────────────────────────────────────

export interface GeneratedPlan {
  plan: {
    name: string;
    goal: FitnessGoal;
    weeks: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
  };
  days: {
    dayTemplate: DayTemplate;
    day_of_week: DayOfWeek;
    order_index: number;
    exercises: ExerciseTemplate[];
  }[];
}

export function generateWorkoutPlan(params: {
  goal: FitnessGoal;
  experience: ExperienceLevel;
  equipment: string[];
  daysPerWeek: number;
  weekOffset?: number;
}): GeneratedPlan {
  const { goal, experience, equipment, daysPerWeek, weekOffset = 0 } = params;

  // Clamp days to supported range
  const days = Math.min(Math.max(daysPerWeek, 2), 6) as 2 | 3 | 4 | 5 | 6;
  const split = SPLITS[days][goal];
  const dayPattern = TRAINING_DAY_PATTERNS[days][0];

  const startDate = addDays(new Date(), weekOffset * 7 * PLAN_DURATION_WEEKS);
  const endDate = addDays(startDate, PLAN_DURATION_WEEKS * 7 - 1);

  const planDays = split.days.map((template, i) => ({
    dayTemplate: template,
    day_of_week: dayPattern[i],
    order_index: i,
    exercises: selectExercises(template.muscleTargets, equipment, experience, goal, weekOffset),
  }));

  return {
    plan: {
      name: planName(goal, weekOffset, experience),
      goal,
      weeks: PLAN_DURATION_WEEKS,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      is_active: true,
    },
    days: planDays,
  };
}

function selectExercises(
  muscleTargets: string[],
  equipment: string[],
  experience: ExperienceLevel,
  goal: FitnessGoal,
  weekOffset: number,
): ExerciseTemplate[] {
  const effectiveEquipment = equipment.length === 0 ? ['bodyweight'] : equipment;

  // Filter by equipment and experience
  const eligible = EXERCISE_DB.filter((ex) => {
    const hasEquipment = ex.equipment.some(
      (e) => effectiveEquipment.includes(e) || e === 'bodyweight',
    );
    const levelOk =
      ex.difficulty === 'beginner' ||
      (ex.difficulty === 'intermediate' && experience !== 'beginner') ||
      (ex.difficulty === 'advanced' && experience === 'advanced');
    return hasEquipment && levelOk;
  });

  // Pick exercises per muscle target
  const selected: ExerciseTemplate[] = [];
  const used = new Set<string>();

  // Phase variation: rotate exercise pool every 6 weeks
  const rotationSeed = weekOffset % 3;

  for (const muscle of muscleTargets) {
    const pool = eligible
      .filter((ex) => ex.muscle_groups.includes(muscle) && !used.has(ex.name))
      .sort(() => 0.5 - Math.sin(rotationSeed + muscle.charCodeAt(0)));

    const count = getExerciseCount(muscle, goal);
    const picked = pool.slice(0, count);
    picked.forEach((ex) => {
      used.add(ex.name);
      selected.push(adjustForGoal(ex, goal, experience));
    });
  }

  // Guarantee at least one dedicated core / ab exercise in every session
  const hasCore = selected.some(isCoreExercise);
  if (!hasCore) {
    const corePool = eligible
      .filter((ex) => isCoreExercise(ex) && !used.has(ex.name))
      .sort(() => 0.5 - Math.sin(rotationSeed + 99));
    if (corePool.length > 0) {
      selected.push(adjustForGoal(corePool[0], goal, experience));
    }
  }

  return trimToMaxDuration(selected);
}

/**
 * Remove exercises from the end until the workout fits within MAX_WORKOUT_MINUTES.
 * Core exercises are protected — the last core exercise is never removed.
 */
function trimToMaxDuration(exercises: ExerciseTemplate[]): ExerciseTemplate[] {
  let trimmed = [...exercises];
  while (trimmed.length > 1) {
    const { totalMinutes } = calculateWorkoutDuration(
      trimmed.map((e, i) => ({
        id: '',
        workout_day_id: '',
        exercise_id: '',
        sets: e.sets,
        reps: e.reps,
        rest_seconds: e.rest_seconds,
        notes: null,
        order_index: i,
      })) as WorkoutExercise[],
    );
    if (totalMinutes <= MAX_WORKOUT_MINUTES) break;

    // Find the last exercise that can be removed without losing all core exercises
    const coreCount = trimmed.filter(isCoreExercise).length;
    let removeIdx = trimmed.length - 1;
    while (
      removeIdx > 0 &&
      coreCount <= 1 &&
      isCoreExercise(trimmed[removeIdx])
    ) {
      removeIdx--;
    }
    // If only a single core exercise remains and everything else is also core, stop
    if (removeIdx === 0) break;
    trimmed = trimmed.filter((_, i) => i !== removeIdx);
  }
  return trimmed;
}

function getExerciseCount(muscle: string, goal: FitnessGoal): number {
  const primary = ['Chest', 'Back', 'Legs', 'Glutes'];
  const secondary = ['Shoulders', 'Biceps', 'Triceps', 'Core'];

  if (muscle === 'Full Body') return 3;
  if (primary.includes(muscle)) return goal === 'build_muscle' ? 3 : 2;
  if (secondary.includes(muscle)) return 2;
  return 1;
}

function adjustForGoal(
  ex: ExerciseTemplate,
  goal: FitnessGoal,
  experience: ExperienceLevel,
): ExerciseTemplate {
  const e = { ...ex };

  switch (goal) {
    case 'lose_weight':
      // Higher reps, shorter rest
      e.reps = adjustReps(e.reps, +2);
      e.rest_seconds = Math.max(45, e.rest_seconds - 15);
      break;
    case 'build_muscle':
      // Moderate reps, moderate rest (hypertrophy range)
      e.sets = experience === 'advanced' ? e.sets + 1 : e.sets;
      break;
    case 'get_lean':
      e.reps = adjustReps(e.reps, +3);
      e.rest_seconds = Math.max(45, e.rest_seconds - 10);
      break;
    case 'improve_endurance':
      e.reps = adjustReps(e.reps, +5);
      e.rest_seconds = Math.max(30, e.rest_seconds - 30);
      break;
  }

  if (experience === 'advanced') {
    e.sets = Math.min(e.sets + 1, 6);
  } else if (experience === 'beginner') {
    e.sets = Math.max(e.sets - 1, 2);
    e.reps = adjustReps(e.reps, -1);
  }

  return e;
}

function adjustReps(reps: string, delta: number): string {
  if (reps.includes('-')) {
    const [lo, hi] = reps.split('-').map(Number);
    return `${lo + delta}-${hi + delta}`;
  }
  if (reps.includes('min') || reps.includes('s')) return reps;
  return String(Number(reps) + delta);
}

// ─── Calorie Target Calculator ────────────────────────────────────────────────

export function calculateCalorieTarget(params: {
  weight: number;
  height: number;
  age: number;
  goal: FitnessGoal;
  daysPerWeek: number;
}): { calories: number; protein: number; carbs: number; fat: number } {
  const { weight, height, age, goal, daysPerWeek } = params;

  // Mifflin-St Jeor (using male formula as default; adjust via profile later)
  const bmr = 10 * weight + 6.25 * height - 5 * age + 5;

  const activityMultiplier = daysPerWeek <= 2 ? 1.375 : daysPerWeek <= 4 ? 1.55 : 1.725;
  const tdee = bmr * activityMultiplier;

  let calories: number;
  switch (goal) {
    case 'lose_weight':    calories = Math.round(tdee - 400); break;
    case 'build_muscle':   calories = Math.round(tdee + 300); break;
    case 'get_lean':       calories = Math.round(tdee - 200); break;
    case 'improve_endurance': calories = Math.round(tdee + 100); break;
  }

  // Macro splits
  const proteinG = Math.round(weight * (goal === 'build_muscle' ? 2.2 : 1.8));
  const fatG     = Math.round((calories * 0.25) / 9);
  const carbG    = Math.round((calories - proteinG * 4 - fatG * 9) / 4);

  return {
    calories,
    protein: proteinG,
    carbs: Math.max(carbG, 0),
    fat: fatG,
  };
}

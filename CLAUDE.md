# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (node is at a non-standard path on this machine)
PATH=/Users/bilalessafi/.ScreamingFrogSEOSpider/node/5.4/node/bin:$PATH npx expo start --port 8081

# Type-check (no tests exist yet)
PATH=... npx tsc --noEmit

# Lint
PATH=... npx expo lint

# Install a new package (always use expo install for Expo packages to get the right SDK-54 version)
PATH=... npx expo install <package>
# For non-Expo packages:
PATH=... npm install <package> --legacy-peer-deps
```

**Always prefix commands with the PATH override** — Node.js is not on the system PATH.

## Architecture

### Tech stack
- **Expo SDK 54** + **Expo Router** (file-based routing) + **React Native 0.81**
- **Supabase** — Postgres DB, Auth (email/password, no email confirmation), Storage
- **Zustand** — ephemeral client state (auth session, active workout, onboarding wizard)
- **TanStack Query v5** — all server state; default staleTime 5 min, gcTime 30 min
- **TypeScript strict mode** with path aliases (`@/*` → `src/*`, etc.)

### Routing structure
```
app/
  _layout.tsx          ← Root: auth listener, QueryClientProvider, GestureHandlerRootView
  (auth)/              ← login.tsx, signup.tsx  (shown when no session)
  (onboarding)/        ← welcome → goal → profile → experience → equipment → schedule → diet → finish
  (tabs)/              ← index (home), workout, nutrition, progress, profile
  workout/[id].tsx     ← Workout day detail with exercise list + images
  workout/active.tsx   ← Live workout session (fullScreenModal)
```

**Auth flow:** `_layout.tsx` listens to `supabase.auth.onAuthStateChange`. On session → fetch profile → if `onboarding_completed` go to `/(tabs)`, else go to `/(onboarding)/goal`. No session → `/(auth)/login`. The welcome screen (`(onboarding)/welcome`) is a marketing landing page only — it routes to signup, not directly into onboarding.

### State management rules
- **`useAuthStore`** — session, user, profile. Set once by `_layout.tsx`, read everywhere.
- **`useOnboardingStore`** — wizard data accumulated across the 7 onboarding steps; `reset()` called after `finish.tsx` saves to DB.
- **`useWorkoutStore`** — active session state (sets, reps, weights, current exercise index). Lives only during an active session; `endSession()` clears it.
- Hooks in `src/hooks/` wrap TanStack Query calls against the services. Never call `supabase` directly from screens — go through a service.

### Data layer
`src/services/` contains one file per domain:
- `profileService` — CRUD for the `profiles` table; `completeOnboarding()` sets `onboarding_completed = true`
- `workoutService` — plans, days, exercises, sessions, exercise logs, personal records
- `nutritionService` — meal plans, meals, grocery items
- `progressService` — weight logs, measurement logs, progress photos (Supabase Storage)

`src/lib/supabase.ts` — single Supabase client; auth tokens persisted with `expo-secure-store`.

### Workout & meal generation (pure algorithmic, no AI)
- **`src/utils/workoutGenerator.ts`** — `generateWorkoutPlan({ goal, experience, equipment, daysPerWeek, weekOffset })` returns a plan + days + exercise templates. Exercise selection uses a local `EXERCISE_DB` array filtered by equipment, then mapped to split templates (Full Body / Upper-Lower / PPL / PPLUL) based on goal × days.
- **`src/utils/mealPlanner.ts`** — `generateMealPlan({ goal, calories, protein, carbs, fat, dietary, weekOffset })` returns meals + grocery items from a recipe template library.
- **`src/utils/workoutGenerator.ts`** also exports `calculateCalorieTarget()` using Mifflin-St Jeor BMR formula.
- Plans are 6 weeks (`PLAN_DURATION_WEEKS`). `weekOffset` cycles plan variety across regenerations.

### Exercise images
`src/hooks/useExerciseImage.ts` — `useExerciseImage(name, muscleGroups)` fetches from the **wger.de REST API** (free, no key) and caches for 7 days in React Query. Falls back to muscle-group Unsplash photos. Use the `<ExerciseImage>` component (`src/components/ui/ExerciseImage.tsx`) which handles skeleton + fade-in automatically.

### UI components
All shared components live in `src/components/ui/` and are exported from the index barrel. The design system tokens are in `src/constants/colors.ts` and `src/constants/fonts.ts` — always import `Colors`, `Typography`, `Spacing`, `Radius` from `@constants/index` rather than hardcoding values.

### Database
14 tables in Supabase with full Row Level Security. All user data is scoped to `auth.uid()`. The `exercises` table is publicly readable (seeded with 60+ exercises from `supabase/migrations/002_seed_exercises.sql`). A `SECURITY DEFINER` trigger on `auth.users` auto-creates `profiles` and `notification_preferences` rows on signup — the function must explicitly use the `public.` schema prefix and `SET search_path = public`.

### Key gotchas
- **Supabase `.in()` requires an array** — never pass a query builder as a subquery; fetch IDs first then pass the array.
- **`StyleProp<ViewStyle>`** (not bare `ViewStyle`) when a component's `style` prop needs to accept array styles.
- **`npx expo install --fix`** after any dependency changes — SDK 54 has strict version requirements for all `expo-*` packages.
- Exercise names in `workoutGenerator.ts` must exactly match names in `002_seed_exercises.sql` — the finish screen matches them by name to look up UUIDs.

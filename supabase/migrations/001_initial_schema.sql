-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name                     TEXT NOT NULL DEFAULT '',
  age                      INTEGER,
  height                   NUMERIC(5,1),
  weight                   NUMERIC(5,1),
  fitness_goal             TEXT CHECK (fitness_goal IN ('lose_weight','build_muscle','get_lean','improve_endurance')),
  experience_level         TEXT CHECK (experience_level IN ('beginner','intermediate','advanced')),
  available_equipment      TEXT[]  DEFAULT '{}',
  preferred_days_per_week  INTEGER DEFAULT 3,
  dietary_preferences      TEXT[]  DEFAULT '{}',
  weight_unit              TEXT    DEFAULT 'kg' CHECK (weight_unit IN ('kg','lbs')),
  measurement_unit         TEXT    DEFAULT 'cm' CHECK (measurement_unit IN ('cm','in')),
  avatar_url               TEXT,
  onboarding_completed     BOOLEAN DEFAULT FALSE,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ─── EXERCISES (master library) ──────────────────────────────────────────────

CREATE TABLE exercises (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL UNIQUE,
  muscle_groups  TEXT[] NOT NULL,
  equipment      TEXT[] NOT NULL DEFAULT '{}',
  instructions   TEXT NOT NULL DEFAULT '',
  difficulty     TEXT CHECK (difficulty IN ('beginner','intermediate','advanced')),
  video_url      TEXT,
  image_url      TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── WORKOUT PLANS ───────────────────────────────────────────────────────────

CREATE TABLE workout_plans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  goal        TEXT NOT NULL,
  weeks       INTEGER NOT NULL DEFAULT 6,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── WORKOUT DAYS ────────────────────────────────────────────────────────────

CREATE TABLE workout_days (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id     UUID REFERENCES workout_plans(id) ON DELETE CASCADE NOT NULL,
  day_of_week TEXT NOT NULL,
  name        TEXT NOT NULL,
  focus       TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0
);

-- ─── WORKOUT EXERCISES ────────────────────────────────────────────────────────

CREATE TABLE workout_exercises (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_day_id  UUID REFERENCES workout_days(id) ON DELETE CASCADE NOT NULL,
  exercise_id     UUID REFERENCES exercises(id) NOT NULL,
  sets            INTEGER NOT NULL DEFAULT 3,
  reps            TEXT NOT NULL DEFAULT '8-12',
  rest_seconds    INTEGER NOT NULL DEFAULT 60,
  notes           TEXT,
  order_index     INTEGER NOT NULL DEFAULT 0
);

-- ─── WORKOUT SESSIONS ────────────────────────────────────────────────────────

CREATE TABLE workout_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workout_day_id   UUID REFERENCES workout_days(id),
  plan_id          UUID REFERENCES workout_plans(id),
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  duration_minutes INTEGER,
  notes            TEXT
);

-- ─── EXERCISE LOGS ────────────────────────────────────────────────────────────

CREATE TABLE exercise_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id   UUID REFERENCES workout_sessions(id) ON DELETE CASCADE NOT NULL,
  exercise_id  UUID REFERENCES exercises(id) NOT NULL,
  set_number   INTEGER NOT NULL,
  reps         INTEGER NOT NULL,
  weight       NUMERIC(6,2) NOT NULL DEFAULT 0,
  unit         TEXT DEFAULT 'kg' CHECK (unit IN ('kg','lbs')),
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── WEIGHT LOGS ─────────────────────────────────────────────────────────────

CREATE TABLE weight_logs (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  weight    NUMERIC(5,1) NOT NULL,
  unit      TEXT DEFAULT 'kg' CHECK (unit IN ('kg','lbs')),
  notes     TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MEASUREMENT LOGS ────────────────────────────────────────────────────────

CREATE TABLE measurement_logs (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type      TEXT NOT NULL,
  value     NUMERIC(5,1) NOT NULL,
  unit      TEXT DEFAULT 'cm' CHECK (unit IN ('cm','in')),
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROGRESS PHOTOS ─────────────────────────────────────────────────────────

CREATE TABLE progress_photos (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  notes     TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MEAL PLANS ──────────────────────────────────────────────────────────────

CREATE TABLE meal_plans (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start     DATE NOT NULL,
  week_end       DATE NOT NULL,
  total_calories INTEGER NOT NULL DEFAULT 0,
  total_protein  INTEGER NOT NULL DEFAULT 0,
  total_carbs    INTEGER NOT NULL DEFAULT 0,
  total_fat      INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MEALS ───────────────────────────────────────────────────────────────────

CREATE TABLE meals (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id             UUID REFERENCES meal_plans(id) ON DELETE CASCADE NOT NULL,
  day_of_week         TEXT NOT NULL,
  meal_type           TEXT CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  name                TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  calories            INTEGER NOT NULL,
  protein             INTEGER NOT NULL,
  carbs               INTEGER NOT NULL,
  fat                 INTEGER NOT NULL,
  prep_time_minutes   INTEGER NOT NULL DEFAULT 10,
  cook_time_minutes   INTEGER NOT NULL DEFAULT 15,
  ingredients         TEXT[] NOT NULL DEFAULT '{}',
  instructions        TEXT[] NOT NULL DEFAULT '{}',
  servings            INTEGER NOT NULL DEFAULT 1
);

-- ─── GROCERY ITEMS ───────────────────────────────────────────────────────────

CREATE TABLE grocery_items (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id  UUID REFERENCES meal_plans(id) ON DELETE CASCADE NOT NULL,
  name     TEXT NOT NULL,
  quantity TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Other',
  checked  BOOLEAN DEFAULT FALSE
);

-- ─── NOTIFICATION PREFERENCES ────────────────────────────────────────────────

CREATE TABLE notification_preferences (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  workout_reminder BOOLEAN DEFAULT TRUE,
  workout_time     TEXT DEFAULT '08:00',
  meal_reminder    BOOLEAN DEFAULT TRUE,
  meal_times       TEXT[] DEFAULT '{"07:30","12:30","18:30"}',
  progress_checkin BOOLEAN DEFAULT TRUE,
  checkin_day      TEXT DEFAULT 'Monday',
  push_token       TEXT,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────

ALTER TABLE profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_days            ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises       ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans              ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises               ENABLE ROW LEVEL SECURITY;

-- Profiles: own row only
CREATE POLICY "Users can manage own profile"
  ON profiles FOR ALL USING (auth.uid() = user_id);

-- Exercises: everyone can read
CREATE POLICY "Exercises are publicly readable"
  ON exercises FOR SELECT USING (TRUE);

-- Workout plans
CREATE POLICY "Users manage own workout plans"
  ON workout_plans FOR ALL USING (auth.uid() = user_id);

-- Workout days (via plan ownership)
CREATE POLICY "Users manage workout days via plan"
  ON workout_days FOR ALL
  USING (plan_id IN (SELECT id FROM workout_plans WHERE user_id = auth.uid()));

-- Workout exercises (via day → plan)
CREATE POLICY "Users manage workout exercises"
  ON workout_exercises FOR ALL
  USING (workout_day_id IN (
    SELECT wd.id FROM workout_days wd
    JOIN workout_plans wp ON wd.plan_id = wp.id
    WHERE wp.user_id = auth.uid()
  ));

-- Sessions
CREATE POLICY "Users manage own sessions"
  ON workout_sessions FOR ALL USING (auth.uid() = user_id);

-- Exercise logs (via session)
CREATE POLICY "Users manage own exercise logs"
  ON exercise_logs FOR ALL
  USING (session_id IN (SELECT id FROM workout_sessions WHERE user_id = auth.uid()));

-- Progress tables
CREATE POLICY "Users manage own weight logs"       ON weight_logs       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own measurements"      ON measurement_logs  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own progress photos"   ON progress_photos   FOR ALL USING (auth.uid() = user_id);

-- Nutrition
CREATE POLICY "Users manage own meal plans"        ON meal_plans        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage meals via plan"
  ON meals FOR ALL
  USING (plan_id IN (SELECT id FROM meal_plans WHERE user_id = auth.uid()));
CREATE POLICY "Users manage grocery items via plan"
  ON grocery_items FOR ALL
  USING (plan_id IN (SELECT id FROM meal_plans WHERE user_id = auth.uid()));

-- Notifications
CREATE POLICY "Users manage own notification prefs"
  ON notification_preferences FOR ALL USING (auth.uid() = user_id);

-- ─── FUNCTIONS & TRIGGERS ────────────────────────────────────────────────────

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));

  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── STORAGE ─────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public) VALUES
  ('progress-photos', 'progress-photos', FALSE),
  ('avatars', 'avatars', TRUE)
ON CONFLICT DO NOTHING;

CREATE POLICY "Users upload own progress photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users view own progress photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own progress photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

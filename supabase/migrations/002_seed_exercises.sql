-- Seed the exercises master library
-- Run this AFTER 001_initial_schema.sql

INSERT INTO exercises (name, muscle_groups, equipment, instructions, difficulty) VALUES

-- ── CHEST ──────────────────────────────────────────────────────────────────
('Barbell Bench Press',    ARRAY['Chest','Shoulders','Triceps'], ARRAY['barbell'],            'Lie flat on bench. Grip bar slightly wider than shoulders. Lower to chest, press back up explosively.', 'beginner'),
('Dumbbell Bench Press',   ARRAY['Chest','Shoulders','Triceps'], ARRAY['dumbbells'],          'Lie flat on a bench with a dumbbell in each hand. Press from chest to full extension.', 'beginner'),
('Incline Barbell Press',  ARRAY['Chest','Shoulders'],           ARRAY['barbell'],            'Set bench to 30-45°. Press bar from upper chest to full extension.', 'intermediate'),
('Push-Ups',               ARRAY['Chest','Triceps','Shoulders'], ARRAY['bodyweight'],         'Plank position, lower chest to floor, press back up. Keep core tight throughout.', 'beginner'),
('Cable Chest Fly',        ARRAY['Chest'],                       ARRAY['cables'],             'Set cables at shoulder height. Bring handles together in a wide arc in front of chest.', 'intermediate'),
('Dips',                   ARRAY['Chest','Triceps'],             ARRAY['bodyweight'],         'Support on parallel bars. Lower body by bending elbows. Lean forward to emphasize chest.', 'intermediate'),
('Incline Dumbbell Press', ARRAY['Chest','Shoulders'],           ARRAY['dumbbells'],          'Set bench to 30-45°. Press dumbbells from upper chest to full extension.', 'beginner'),
('Chest Dips',             ARRAY['Chest','Triceps'],             ARRAY['bodyweight'],         'Lean forward on dip bars to target chest more than triceps.', 'intermediate'),

-- ── BACK ──────────────────────────────────────────────────────────────────
('Barbell Deadlift',       ARRAY['Back','Glutes','Legs'],        ARRAY['barbell'],            'Hip-width stance, neutral spine. Drive through heels to stand, keeping bar close to body.', 'intermediate'),
('Pull-Ups',               ARRAY['Back','Biceps'],               ARRAY['pull_up_bar','bodyweight'], 'Hang from bar with overhand grip. Pull chin above bar, control the descent.', 'intermediate'),
('Lat Pulldown',           ARRAY['Back','Biceps'],               ARRAY['cables','machines'],  'Grip bar wide. Pull down to upper chest while squeezing lats. Control the return.', 'beginner'),
('Barbell Bent-Over Row',  ARRAY['Back','Biceps'],               ARRAY['barbell'],            'Hinge at hips with neutral spine. Pull bar to lower ribcage, squeeze shoulder blades.', 'intermediate'),
('Seated Cable Row',       ARRAY['Back','Biceps'],               ARRAY['cables'],             'Sit tall, pull handle to abdomen while retracting shoulder blades.', 'beginner'),
('Dumbbell Row',           ARRAY['Back','Biceps'],               ARRAY['dumbbells'],          'Support knee and hand on bench. Row dumbbell to hip, control the descent.', 'beginner'),
('Inverted Row',           ARRAY['Back','Biceps'],               ARRAY['bodyweight'],         'Hang under a bar with straight body. Pull chest to bar, squeeze at top.', 'beginner'),
('T-Bar Row',              ARRAY['Back','Biceps'],               ARRAY['barbell'],            'Straddle bar, hinge forward. Pull bar to chest, squeeze lats at top.', 'intermediate'),
('Face Pulls',             ARRAY['Shoulders','Back'],            ARRAY['cables'],             'Set cable at face height. Pull rope to face with elbows high. Externally rotate at end.', 'beginner'),

-- ── SHOULDERS ──────────────────────────────────────────────────────────────
('Overhead Press',         ARRAY['Shoulders','Triceps'],         ARRAY['barbell'],            'Press bar from clavicle to overhead. Lock out at top, keep core braced.', 'intermediate'),
('Dumbbell Shoulder Press',ARRAY['Shoulders','Triceps'],         ARRAY['dumbbells'],          'Press dumbbells from ear height to overhead. Control the descent.', 'beginner'),
('Lateral Raises',         ARRAY['Shoulders'],                   ARRAY['dumbbells','cables'], 'Raise arms to shoulder height with a slight bend at elbow. Control the descent.', 'beginner'),
('Arnold Press',           ARRAY['Shoulders','Triceps'],         ARRAY['dumbbells'],          'Start with palms facing you, rotate while pressing overhead in one fluid motion.', 'intermediate'),
('Rear Delt Fly',          ARRAY['Shoulders','Back'],            ARRAY['dumbbells','cables'], 'Hinge forward, raise arms out to the side to target rear deltoids.', 'beginner'),
('Upright Row',            ARRAY['Shoulders','Back'],            ARRAY['barbell','dumbbells'],'Pull bar vertically to chin with elbows leading. Keep bar close to body.', 'intermediate'),

-- ── BICEPS ──────────────────────────────────────────────────────────────────
('Barbell Curl',           ARRAY['Biceps'],                      ARRAY['barbell'],            'Stand tall, curl bar to shoulder height. Fully extend at bottom.', 'beginner'),
('Dumbbell Curl',          ARRAY['Biceps'],                      ARRAY['dumbbells'],          'Curl one arm at a time or alternating. Supinate wrist at the top.', 'beginner'),
('Hammer Curl',            ARRAY['Biceps','Forearms'],           ARRAY['dumbbells'],          'Neutral grip curl. Targets the brachialis and brachioradialis.', 'beginner'),
('Cable Curl',             ARRAY['Biceps'],                      ARRAY['cables'],             'Keep elbows fixed, curl cable bar to chin. Squeeze at top.', 'beginner'),
('Concentration Curl',     ARRAY['Biceps'],                      ARRAY['dumbbells'],          'Sit, brace arm on inner thigh. Curl dumbbell to shoulder, squeeze at top.', 'beginner'),
('Incline Dumbbell Curl',  ARRAY['Biceps'],                      ARRAY['dumbbells'],          'Lie on incline bench, arms hanging. Curl for full range of motion.', 'intermediate'),

-- ── TRICEPS ──────────────────────────────────────────────────────────────────
('Close-Grip Bench Press', ARRAY['Triceps','Chest'],             ARRAY['barbell'],            'Grip shoulder-width. Lower to chest, press up keeping elbows close to body.', 'intermediate'),
('Tricep Pushdown',        ARRAY['Triceps'],                     ARRAY['cables'],             'Elbows pinned at sides, push bar down to full extension. Squeeze at bottom.', 'beginner'),
('Skull Crushers',         ARRAY['Triceps'],                     ARRAY['barbell','dumbbells'],'Lie on bench, lower bar to forehead keeping upper arms perpendicular to floor.', 'intermediate'),
('Diamond Push-Ups',       ARRAY['Triceps','Chest'],             ARRAY['bodyweight'],         'Form diamond shape with hands. Lower chest to hands, press up.', 'beginner'),
('Overhead Tricep Extension', ARRAY['Triceps'],                  ARRAY['dumbbells','cables'], 'Hold weight overhead, lower behind head, extend up fully.', 'beginner'),
('Dip (Tricep Focus)',     ARRAY['Triceps'],                     ARRAY['bodyweight'],         'Keep body upright on parallel bars to target triceps. Full lockout at top.', 'intermediate'),

-- ── LEGS ──────────────────────────────────────────────────────────────────
('Barbell Back Squat',     ARRAY['Legs','Glutes','Core'],        ARRAY['barbell'],            'Bar on upper back. Squat below parallel, drive through heels. Keep chest tall.', 'intermediate'),
('Front Squat',            ARRAY['Legs','Core'],                 ARRAY['barbell'],            'Bar on front deltoids. Stay upright through the squat. High elbows.', 'advanced'),
('Romanian Deadlift',      ARRAY['Legs','Glutes','Back'],        ARRAY['barbell','dumbbells'],'Hinge at hips with slight knee bend. Feel hamstring stretch at bottom.', 'intermediate'),
('Leg Press',              ARRAY['Legs','Glutes'],               ARRAY['machines'],           'Press platform away keeping feet shoulder-width. Don''t lock knees at top.', 'beginner'),
('Lunges',                 ARRAY['Legs','Glutes'],               ARRAY['dumbbells','bodyweight'], 'Step forward, lower rear knee toward floor. Push back to start.', 'beginner'),
('Bulgarian Split Squat',  ARRAY['Legs','Glutes'],               ARRAY['dumbbells','barbell','bodyweight'], 'Rear foot elevated on bench. Lower front knee to 90 degrees.', 'intermediate'),
('Leg Curl',               ARRAY['Legs'],                        ARRAY['machines'],           'Lie face down. Curl ankles toward glutes. Control the descent.', 'beginner'),
('Leg Extension',          ARRAY['Legs'],                        ARRAY['machines'],           'Extend knees to full lockout. Hold briefly at top for peak contraction.', 'beginner'),
('Box Jumps',              ARRAY['Legs','Glutes','Full Body'],   ARRAY['bodyweight'],         'Explosive jump onto box landing softly. Step (don''t jump) down.', 'intermediate'),
('Goblet Squat',           ARRAY['Legs','Glutes','Core'],        ARRAY['kettlebell','dumbbells'], 'Hold weight at chest. Squat deep keeping elbows inside knees.', 'beginner'),
('Sumo Deadlift',          ARRAY['Legs','Glutes','Back'],        ARRAY['barbell'],            'Wide stance, toes out. Grip inside legs. Pull keeping chest tall.', 'intermediate'),
('Step-Ups',               ARRAY['Legs','Glutes'],               ARRAY['dumbbells','bodyweight'], 'Step onto elevated surface, drive through heel. Step down controlled.', 'beginner'),

-- ── GLUTES ──────────────────────────────────────────────────────────────────
('Hip Thrust',             ARRAY['Glutes','Legs'],               ARRAY['barbell','bodyweight'], 'Shoulders on bench. Drive hips up with barbell. Squeeze glutes at top.', 'beginner'),
('Glute Bridge',           ARRAY['Glutes','Core'],               ARRAY['bodyweight'],         'Lie on back, feet flat. Drive hips up, squeeze glutes. Hold at top.', 'beginner'),
('Cable Kickback',         ARRAY['Glutes'],                      ARRAY['cables'],             'On all fours at cable. Kick leg back and up, squeezing glute at top.', 'beginner'),
('Donkey Kicks',           ARRAY['Glutes'],                      ARRAY['bodyweight'],         'On all fours, kick leg back and up. Squeeze glute at top of movement.', 'beginner'),

-- ── CORE ──────────────────────────────────────────────────────────────────
('Plank',                  ARRAY['Core'],                        ARRAY['bodyweight'],         'Forearm plank. Keep hips level, breathe steadily. Don''t let hips sag.', 'beginner'),
('Cable Crunch',           ARRAY['Core'],                        ARRAY['cables'],             'Kneel at cable, pull rope down crunching abs. Keep hips still.', 'beginner'),
('Ab Wheel Rollout',       ARRAY['Core'],                        ARRAY['bodyweight'],         'Roll wheel out until body is nearly flat. Pull back using abs only.', 'intermediate'),
('Hanging Leg Raise',      ARRAY['Core'],                        ARRAY['pull_up_bar','bodyweight'], 'Hang from bar, raise legs to 90° or higher. Control the descent.', 'intermediate'),
('Bicycle Crunch',         ARRAY['Core'],                        ARRAY['bodyweight'],         'Alternate elbow to opposite knee in a cycling motion. Keep lower back flat.', 'beginner'),
('Russian Twist',          ARRAY['Core'],                        ARRAY['bodyweight','dumbbells'], 'Seated lean-back position. Rotate torso side to side.', 'beginner'),
('Dead Bug',               ARRAY['Core'],                        ARRAY['bodyweight'],         'Lie on back, extend opposite arm/leg while keeping lower back flat.', 'beginner'),
('Sit-Ups',                ARRAY['Core'],                        ARRAY['bodyweight'],         'Lie on back, curl torso up to knees. Lower controlled.', 'beginner'),
('Side Plank',             ARRAY['Core'],                        ARRAY['bodyweight'],         'Support on one forearm and foot. Keep hips high, body straight.', 'beginner'),

-- ── CALVES ──────────────────────────────────────────────────────────────────
('Standing Calf Raise',    ARRAY['Calves'],                      ARRAY['machines','bodyweight','barbell'], 'Rise onto toes, hold briefly, lower fully for maximum stretch.', 'beginner'),
('Seated Calf Raise',      ARRAY['Calves'],                      ARRAY['machines'],           'Weight on knees, raise heels as high as possible. Full range of motion.', 'beginner'),
('Single-Leg Calf Raise',  ARRAY['Calves'],                      ARRAY['bodyweight'],         'Stand on one foot on edge. Raise and lower heel for full range.', 'beginner'),

-- ── CARDIO / FULL BODY ──────────────────────────────────────────────────────
('Treadmill Run',          ARRAY['Full Body'],                   ARRAY['machines'],           'Maintain a conversational pace. Focus on breathing rhythm.', 'beginner'),
('Jump Rope',              ARRAY['Full Body','Calves'],          ARRAY['bodyweight'],         'Jump lightly on toes. Maintain rhythm, keep elbows at sides.', 'beginner'),
('Burpees',                ARRAY['Full Body'],                   ARRAY['bodyweight'],         'Squat, kick to plank, push-up, return, jump with arms overhead.', 'intermediate'),
('Mountain Climbers',      ARRAY['Core','Full Body'],            ARRAY['bodyweight'],         'Plank position. Drive knees to chest alternately at speed.', 'beginner'),
('Rowing Machine',         ARRAY['Back','Legs','Full Body'],     ARRAY['machines'],           'Legs drive first, then lean back, then pull arms. Reverse on return.', 'beginner'),
('Kettlebell Swing',       ARRAY['Glutes','Back','Full Body'],   ARRAY['kettlebell'],         'Hinge at hips, drive forward explosively. Let kettlebell swing to shoulder height.', 'intermediate'),
('Battle Ropes',           ARRAY['Full Body','Shoulders'],       ARRAY['machines'],           'Alternate or simultaneous waves with the ropes. Keep core engaged.', 'beginner'),
('Box Step-Overs',         ARRAY['Full Body','Legs'],            ARRAY['bodyweight'],         'Step over box alternating lead foot. Pick up pace for cardio effect.', 'beginner')

ON CONFLICT (name) DO NOTHING;

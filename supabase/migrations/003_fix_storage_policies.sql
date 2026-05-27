-- ─── Fix missing storage RLS policies ───────────────────────────────────────
--
-- The original migration only created INSERT policies for the avatars bucket.
-- upsert/overwrite operations also need UPDATE (and ideally DELETE) policies.
-- Without these, re-uploading an avatar fails with:
--   "new row violates row-level security policy"
--
-- Run this once in your Supabase Dashboard → SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY IF NOT EXISTS "Users update own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users delete own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Also add UPDATE for progress-photos (defensive, not strictly needed for
-- current upload logic but prevents future surprises).
CREATE POLICY IF NOT EXISTS "Users update own progress photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

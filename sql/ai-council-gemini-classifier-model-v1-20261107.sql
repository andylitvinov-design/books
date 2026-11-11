-- AI Council 2.1: allow precisely one existing-account Gemini Free Tier identity
-- in the private research-only AI annotations table.
-- No new data access, API grants, RLS changes or automatic rights approvals.
BEGIN;
DO $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_constraint
   WHERE conrelid='app_private.video_candidate_ai_suggestions_v2'::regclass
     AND conname='video_candidate_ai_suggestions_v2_model_id_check'
 ) THEN
   RAISE EXCEPTION 'HH_CLASSIFIER_ORIGINAL_MODEL_GUARD_MISSING';
 END IF;
END $$;
ALTER TABLE app_private.video_candidate_ai_suggestions_v2
 DROP CONSTRAINT video_candidate_ai_suggestions_v2_model_id_check;
ALTER TABLE app_private.video_candidate_ai_suggestions_v2
 ADD CONSTRAINT video_candidate_ai_suggestions_v2_model_id_check
 CHECK (
  (model_id ~ '^[a-z0-9._/-]+:free$' AND char_length(model_id)<=120)
  OR model_id='gemini-3.5-flash-lite'
 );
COMMIT;

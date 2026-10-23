-- Editorial topic priorities and preferred MODEL families, not a medical classifier.
-- A narrow, specific request (e.g. procrastination) outranks a generic mention of a goal.
BEGIN;
ALTER TABLE app_private.coaching_intent_signals ADD COLUMN IF NOT EXISTS priority smallint NOT NULL DEFAULT 1 CHECK(priority BETWEEN 1 AND 5);
ALTER TABLE app_private.coaching_intent_signals ADD COLUMN IF NOT EXISTS preferred_model_keys text[] NOT NULL DEFAULT '{}'::text[];
COMMENT ON COLUMN app_private.coaching_intent_signals.priority IS 'Relative relevance of explicit wording, 1 broad to 5 specific; no clinical meaning.';
COMMENT ON COLUMN app_private.coaching_intent_signals.preferred_model_keys IS 'Ordered editorial preferences for this type of client question. Only published schemes are displayed.';
UPDATE app_private.coaching_intent_signals SET priority=1,preferred_model_keys=ARRAY['grow_v1']::text[] WHERE topic_key='goal';
UPDATE app_private.coaching_intent_signals SET priority=2,preferred_model_keys=ARRAY['grow_v1','tgrow_v1']::text[] WHERE topic_key='decision';
UPDATE app_private.coaching_intent_signals SET priority=2,preferred_model_keys=ARRAY['grow_v1','fuel_v1']::text[] WHERE topic_key='business';
UPDATE app_private.coaching_intent_signals SET priority=2,preferred_model_keys=ARRAY['fuel_v1','grow_v1']::text[] WHERE topic_key='career';
UPDATE app_private.coaching_intent_signals SET priority=3,preferred_model_keys=ARRAY['clear_v1','solution_focus_v1']::text[] WHERE topic_key='relationships';
UPDATE app_private.coaching_intent_signals SET priority=4,preferred_model_keys=ARRAY['clear_v1']::text[] WHERE topic_key='conflict';
UPDATE app_private.coaching_intent_signals SET priority=2,preferred_model_keys=ARRAY['clear_v1','fuel_v1']::text[] WHERE topic_key='communication';
UPDATE app_private.coaching_intent_signals SET priority=3,preferred_model_keys=ARRAY['grow_v1']::text[] WHERE topic_key='money';
UPDATE app_private.coaching_intent_signals SET priority=3,preferred_model_keys=ARRAY['oskar_v1','solution_focus_v1']::text[] WHERE topic_key='confidence';
UPDATE app_private.coaching_intent_signals SET priority=4,preferred_model_keys=ARRAY['solution_focus_v1','oskar_v1']::text[] WHERE topic_key='stuck';
UPDATE app_private.coaching_intent_signals SET priority=3,preferred_model_keys=ARRAY['woop_v1']::text[] WHERE topic_key='habits';
UPDATE app_private.coaching_intent_signals SET priority=4,preferred_model_keys=ARRAY['woop_v1']::text[] WHERE topic_key='procrastination';
UPDATE app_private.coaching_intent_signals SET priority=2,preferred_model_keys=ARRAY['oskar_v1','woop_v1']::text[] WHERE topic_key='motivation';
UPDATE app_private.coaching_intent_signals SET priority=4,preferred_model_keys=ARRAY['fuel_v1','clear_v1']::text[] WHERE topic_key='leadership';
UPDATE app_private.coaching_intent_signals SET priority=3,preferred_model_keys=ARRAY['fuel_v1','woop_v1']::text[] WHERE topic_key='productivity';
UPDATE app_private.coaching_intent_signals SET priority=2,preferred_model_keys=ARRAY['appreciative_5d_v1','oskar_v1']::text[] WHERE topic_key='growth';
UPDATE app_private.coaching_intent_signals SET priority=3,preferred_model_keys=ARRAY['tgrow_v1','appreciative_5d_v1']::text[] WHERE topic_key='transition';
UPDATE app_private.coaching_intent_signals SET priority=4,preferred_model_keys=ARRAY['tgrow_v1']::text[] WHERE topic_key='unclear';
UPDATE app_private.coaching_intent_signals SET priority=4,preferred_model_keys=ARRAY['appreciative_5d_v1']::text[] WHERE topic_key='creativity';
COMMIT;

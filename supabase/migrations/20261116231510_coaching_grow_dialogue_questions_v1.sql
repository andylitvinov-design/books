-- Curated GROW v1 open questions. ADDITIVE child of existing coaching catalog.
-- Safe to apply independently: no user transcripts, answers, or audio.
BEGIN;
CREATE TABLE IF NOT EXISTS app_private.coaching_dialogue_questions_v1 (
 question_key text PRIMARY KEY CHECK (question_key ~ '^grow_dialogue_[a-z0-9_]+_v1$'),
 model_key text NOT NULL,
 step_key text NOT NULL,
 intervention_id text NOT NULL CHECK (intervention_id IN (
  'clarify_goal','ground_in_example','surface_options','explore_client_owned_step','confirm_client_summary')),
 evidence_key text NOT NULL CHECK (evidence_key IN (
  'goalRestated','workingFocusEstablished','keyFactsCaptured','constraintsReviewed',
  'optionsExplored','clientActionApproved','timingSpecified','feasibilityChecked','summaryReviewed')),
 cues text[] NOT NULL DEFAULT '{}',
 priority smallint NOT NULL CHECK (priority BETWEEN 1 AND 20),
 prompt_i18n jsonb NOT NULL CHECK (prompt_i18n ?& ARRAY['ru','en','es']),
 suggested_start_minute smallint NOT NULL CHECK (suggested_start_minute BETWEEN 0 AND 20),
 suggested_end_minute smallint NOT NULL CHECK (suggested_end_minute BETWEEN 0 AND 20),
 review_status text NOT NULL DEFAULT 'curated' CHECK (review_status IN ('curated','draft','retired')),
 enabled boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT grow_question_valid_window CHECK (suggested_start_minute < suggested_end_minute),
 CONSTRAINT grow_question_published_curated CHECK (NOT enabled OR review_status='curated'),
 CONSTRAINT grow_question_existing_step_fk FOREIGN KEY (model_key,step_key)
   REFERENCES app_private.coaching_steps(model_key,step_key) ON UPDATE RESTRICT ON DELETE RESTRICT
);
COMMENT ON TABLE app_private.coaching_dialogue_questions_v1 IS
 '23 original GROW stage questions (RU/EN/ES) with soft time hints. Version-pinned server snapshot; no client records.';
CREATE INDEX IF NOT EXISTS coaching_dialogue_questions_grow_step_idx
 ON app_private.coaching_dialogue_questions_v1 (model_key,step_key,priority DESC)
 WHERE enabled AND review_status='curated';
ALTER TABLE app_private.coaching_dialogue_questions_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.coaching_dialogue_questions_v1 FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app_private.coaching_dialogue_questions_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE app_private.coaching_dialogue_questions_v1 TO hh_app_backend;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE app_private.coaching_dialogue_questions_v1 TO service_role;
DROP POLICY IF EXISTS coaching_dialogue_questions_backend_read_v1 ON app_private.coaching_dialogue_questions_v1;
CREATE POLICY coaching_dialogue_questions_backend_read_v1
 ON app_private.coaching_dialogue_questions_v1 FOR SELECT TO hh_app_backend
 USING (enabled AND review_status='curated');
INSERT INTO app_private.coaching_dialogue_questions_v1
 (question_key,model_key,step_key,intervention_id,evidence_key,cues,priority,prompt_i18n,
  suggested_start_minute,suggested_end_minute,review_status,enabled)
VALUES
  ('grow_dialogue_goal_focus_01_v1','grow_v1','goal','clarify_goal','goalRestated',ARRAY['focus']::text[],10,'{"en":"What would you most like to understand or change in this conversation?","ru":"Что вам хотелось бы лучше понять или изменить в этом разговоре?","es":"¿Qué te gustaría comprender o cambiar en esta conversación?"}'::jsonb,0,3,'curated',true),
  ('grow_dialogue_goal_worth_02_v1','grow_v1','goal','clarify_goal','goalRestated',ARRAY['outcome']::text[],8,'{"en":"What would make this conversation useful for you?","ru":"Что сделало бы этот разговор полезным для вас?","es":"¿Qué haría útil esta conversación para ti?"}'::jsonb,0,3,'curated',true),
  ('grow_dialogue_goal_priority_03_v1','grow_v1','goal','clarify_goal','workingFocusEstablished',ARRAY['focus']::text[],7,'{"en":"Which part of this matters most to you right now?","ru":"Что в этой теме для вас сейчас важнее всего?","es":"¿Qué parte de esto te importa más ahora mismo?"}'::jsonb,0,3,'curated',true),
  ('grow_dialogue_goal_sign_04_v1','grow_v1','goal','clarify_goal','goalRestated',ARRAY['outcome']::text[],6,'{"en":"What would be a small sign that things are moving in the right direction?","ru":"Какой небольшой признак покажет, что ситуация меняется к лучшему?","es":"¿Qué pequeña señal mostraría que las cosas van mejorando?"}'::jsonb,0,3,'curated',true),
  ('grow_dialogue_goal_example_05_v1','grow_v1','goal','clarify_goal','workingFocusEstablished',ARRAY['example']::text[],9,'{"en":"Is there one recent moment that shows why this matters to you?","ru":"Есть ли недавний эпизод, который показывает, почему это для вас важно?","es":"¿Hay algún momento reciente que muestre por qué esto te importa?"}'::jsonb,0,3,'curated',true),
  ('grow_dialogue_reality_last_01_v1','grow_v1','reality','ground_in_example','keyFactsCaptured',ARRAY['example']::text[],9,'{"en":"When did you last notice this happening?","ru":"Когда вы в последний раз заметили, что это происходит?","es":"¿Cuándo fue la última vez que notaste que esto ocurría?"}'::jsonb,3,12,'curated',true),
  ('grow_dialogue_reality_detail_02_v1','grow_v1','reality','ground_in_example','keyFactsCaptured',ARRAY['example']::text[],10,'{"en":"What exactly happened in that particular moment?","ru":"Что именно произошло в тот момент?","es":"¿Qué ocurrió exactamente en aquel momento?"}'::jsonb,3,12,'curated',true),
  ('grow_dialogue_reality_control_03_v1','grow_v1','reality','ground_in_example','constraintsReviewed',ARRAY['barrier']::text[],9,'{"en":"What is within your influence here, and what is not?","ru":"На что здесь вы можете повлиять, а на что нет?","es":"¿En qué puedes influir aquí y en qué no?"}'::jsonb,3,12,'curated',true),
  ('grow_dialogue_reality_difficulty_04_v1','grow_v1','reality','ground_in_example','constraintsReviewed',ARRAY['emotion','barrier']::text[],10,'{"en":"What made that moment particularly difficult?","ru":"Что именно сделало этот момент особенно трудным?","es":"¿Qué hizo que aquel momento fuera especialmente difícil?"}'::jsonb,3,12,'curated',true),
  ('grow_dialogue_reality_help_05_v1','grow_v1','reality','ground_in_example','constraintsReviewed',ARRAY['resource']::text[],7,'{"en":"What has helped even a little in situations like this?","ru":"Что уже помогало вам хотя бы немного в похожих ситуациях?","es":"¿Qué te ha ayudado, aunque sea un poco, en situaciones parecidas?"}'::jsonb,3,12,'curated',true),
  ('grow_dialogue_options_first_01_v1','grow_v1','options','surface_options','optionsExplored',ARRAY['alternative']::text[],10,'{"en":"What possible ways forward do you see, without deciding yet?","ru":"Какие возможные пути вы видите, пока ничего не выбирая?","es":"¿Qué caminos posibles ves, sin decidir todavía?"}'::jsonb,12,16,'curated',true),
  ('grow_dialogue_options_another_02_v1','grow_v1','options','surface_options','optionsExplored',ARRAY['alternative']::text[],9,'{"en":"What is another possibility you have not explored yet?","ru":"Какую ещё возможность вы пока не рассматривали?","es":"¿Qué otra posibilidad aún no has explorado?"}'::jsonb,12,16,'curated',true),
  ('grow_dialogue_options_view_03_v1','grow_v1','options','surface_options','optionsExplored',ARRAY['perspective']::text[],8,'{"en":"Is there another way to look at this situation?","ru":"Можно ли посмотреть на эту ситуацию с другой стороны?","es":"¿Hay otra manera de mirar esta situación?"}'::jsonb,12,16,'curated',true),
  ('grow_dialogue_options_small_04_v1','grow_v1','options','surface_options','optionsExplored',ARRAY['experiment']::text[],7,'{"en":"What small and reversible experiment could be worth considering?","ru":"Какой небольшой и обратимый эксперимент стоило бы рассмотреть?","es":"¿Qué pequeño experimento reversible podría valer la pena considerar?"}'::jsonb,12,16,'curated',true),
  ('grow_dialogue_will_choice_01_v1','grow_v1','will','explore_client_owned_step','clientActionApproved',ARRAY['ready']::text[],10,'{"en":"Would you like to choose something small to try, or leave it open for now?","ru":"Хотите выбрать что-то небольшое для пробы или пока оставить вопрос открытым?","es":"¿Te gustaría elegir algo pequeño para probar o dejarlo abierto por ahora?"}'::jsonb,16,18,'curated',true),
  ('grow_dialogue_will_realistic_02_v1','grow_v1','will','explore_client_owned_step','clientActionApproved',ARRAY['ready']::text[],9,'{"en":"If you do choose to try something, what would feel realistic to you?","ru":"Если вы решите что-то попробовать, какой вариант будет для вас реалистичным?","es":"Si decides probar algo, ¿qué opción te parecería realista?"}'::jsonb,16,18,'curated',true),
  ('grow_dialogue_will_when_03_v1','grow_v1','will','explore_client_owned_step','timingSpecified',ARRAY['ready']::text[],9,'{"en":"When might it fit naturally into your life?","ru":"Когда это могло бы естественно вписаться в вашу жизнь?","es":"¿Cuándo podría encajar de forma natural en tu vida?"}'::jsonb,16,18,'curated',true),
  ('grow_dialogue_will_barrier_04_v1','grow_v1','will','explore_client_owned_step','feasibilityChecked',ARRAY['barrier']::text[],10,'{"en":"What might make this step difficult?","ru":"Что может затруднить этот шаг?","es":"¿Qué podría dificultar ese paso?"}'::jsonb,16,18,'curated',true),
  ('grow_dialogue_will_own_05_v1','grow_v1','will','explore_client_owned_step','clientActionApproved',ARRAY['ready']::text[],7,'{"en":"Does that step feel like your own choice, or someone else’s expectation?","ru":"Этот шаг ощущается вашим выбором или скорее чужим ожиданием?","es":"¿Ese paso se siente como tu elección o como una expectativa ajena?"}'::jsonb,16,18,'curated',true),
  ('grow_dialogue_review_clarity_01_v1','grow_v1','review','confirm_client_summary','summaryReviewed',ARRAY['reflection']::text[],10,'{"en":"What feels clearer to you after this conversation?","ru":"Что после этого разговора стало для вас яснее?","es":"¿Qué te queda más claro después de esta conversación?"}'::jsonb,18,20,'curated',true),
  ('grow_dialogue_review_takeaway_02_v1','grow_v1','review','confirm_client_summary','summaryReviewed',ARRAY['reflection']::text[],9,'{"en":"What would you like to take away from today?","ru":"Что вам хотелось бы унести с собой из сегодняшнего разговора?","es":"¿Qué te gustaría llevarte de la conversación de hoy?"}'::jsonb,18,20,'curated',true),
  ('grow_dialogue_review_open_03_v1','grow_v1','review','confirm_client_summary','summaryReviewed',ARRAY['reflection']::text[],8,'{"en":"What, if anything, still feels unresolved?","ru":"Что, если что-то осталось, пока не прояснилось?","es":"¿Qué, si acaso, sigue sin quedar claro?"}'::jsonb,18,20,'curated',true),
  ('grow_dialogue_review_pause_04_v1','grow_v1','review','confirm_client_summary','summaryReviewed',ARRAY['reflection']::text[],6,'{"en":"Would you prefer to stop here, pause, or carry on?","ru":"Хотите здесь закончить, сделать паузу или продолжить?","es":"¿Prefieres terminar aquí, hacer una pausa o continuar?"}'::jsonb,18,20,'curated',true)
ON CONFLICT (question_key) DO NOTHING;
COMMIT;

-- Holistic House · first focused virtual coaching session.
-- Adds one authored, multilingual 20-minute GROW variant to the existing private reference catalog.
-- No client data, new storage, provider calls, permissions, or payment changes.
BEGIN;

INSERT INTO app_private.coaching_steps
  (model_key,step_key,model_order,title_i18n,emphasis_i18n,key_question_i18n)
VALUES
  ('grow_v1','priorities',7,
   '{"en":"Priorities","ru":"Приоритеты","es":"Prioridades"}'::jsonb,
   '{"en":"Separate real deadlines from the feeling that everything is urgent.","ru":"Отделить реальные сроки от ощущения, что всё срочно.","es":"Distinguir los plazos reales de la sensación de que todo urge."}'::jsonb,
   '{"en":"What makes one task the most important to address first this week?","ru":"Что делает одну задачу самой важной для внимания на этой неделе?","es":"¿Qué hace que una tarea sea la más importante para atender primero esta semana?"}'::jsonb)
ON CONFLICT (model_key,step_key) DO NOTHING;

-- Pilot-only stages preserve the existing GROW variants and their questions.
INSERT INTO app_private.coaching_steps
  (model_key,step_key,model_order,title_i18n,emphasis_i18n,key_question_i18n)
VALUES
 ('grow_v1','pilot_start',8,
  '{"en":"G · Session focus","ru":"G · Фокус сессии","es":"G · Enfoque"}'::jsonb,
  '{"en":"Name the topic, then rate clarity before exploring.","ru":"Назвать тему и оценить ясность до разговора.","es":"Elegir tema y valorar la claridad antes."}'::jsonb,
  '{"en":"What deserves your attention today?","ru":"Что сегодня заслуживает вашего внимания?","es":"¿Qué merece tu atención hoy?"}'::jsonb),
 ('grow_v1','pilot_end',9,
  '{"en":"Review · Clarity check","ru":"Итог · Проверка ясности","es":"Revisión · Claridad"}'::jsonb,
  '{"en":"Repeat the exact same self-rating without assuming improvement.","ru":"Повторить ту же самооценку, не предполагая улучшения.","es":"Repetir la misma autoevaluación sin suponer mejora."}'::jsonb,
  '{"en":"How clear is your next step now?","ru":"Насколько сейчас ясен следующий шаг?","es":"¿Qué claridad tienes ahora sobre tu próximo paso?"}'::jsonb)
ON CONFLICT (model_key,step_key) DO NOTHING;

INSERT INTO app_private.coaching_answer_sets (answer_set_key,choices)
VALUES
 ('overload_priority_v1',
  '[
    {"id":"external_deadline","label":{"en":"It has a real deadline this week","ru":"У неё реальный срок на этой неделе","es":"Tiene una fecha límite real esta semana"}},
    {"id":"affects_others","label":{"en":"Someone else is waiting on it","ru":"От этого зависит другой человек","es":"Otra persona está esperando"}},
    {"id":"unblocks_work","label":{"en":"It will unblock other work","ru":"Она позволит сдвинуть другие дела","es":"Permitirá avanzar con otras tareas"}},
    {"id":"unclear","label":{"en":"I am not sure yet","ru":"Пока не могу определить","es":"Todavía no lo tengo claro"}}
  ]'::jsonb)
ON CONFLICT (answer_set_key) DO NOTHING;

INSERT INTO app_private.coaching_questions
  (question_key,model_key,step_key,position,prompt_i18n,answer_type,answer_set_key,core,required,interaction_note)
VALUES
 ('grow_overload_priorities_q1_v1','grow_v1','priorities',1,
  '{"en":"Among the things competing for your attention, what makes one the most important to address first this week?","ru":"Среди дел, которые требуют вашего внимания, что делает одно из них самым важным на этой неделе?","es":"Entre las tareas que reclaman tu atención, ¿qué hace que una sea la más importante esta semana?"}'::jsonb,
  'single_choice','overload_priority_v1',true,true,
  'Choose one option or add a short editable example. This is prioritization, not a test.')
ON CONFLICT (question_key) DO NOTHING;

-- Keep the original GROW opening prompt, scoped to this pilot.
INSERT INTO app_private.coaching_questions
  (question_key,model_key,step_key,position,prompt_i18n,answer_type,answer_set_key,core,required,interaction_note)
SELECT 'grow_overload_frame_q1_v1',model_key,'pilot_start',1,
       prompt_i18n,answer_type,answer_set_key,core,required,interaction_note
FROM app_private.coaching_questions
WHERE question_key='grow_frame_q1_v1'
ON CONFLICT (question_key) DO NOTHING;

-- Identical question wording and scale before and after; optional client ratings.
-- This is a personal reflection measure, not a clinical outcome.
INSERT INTO app_private.coaching_questions
  (question_key,model_key,step_key,position,prompt_i18n,answer_type,answer_set_key,core,required,interaction_note)
VALUES
 ('grow_overload_clarity_start_q1_v1','grow_v1','pilot_start',2,
  '{"en":"How clear is it right now what next step you could take within seven days? Rate 0–10.","ru":"Насколько сейчас ясно, какой следующий шаг вы можете сделать в ближайшие семь дней? Оцените от 0 до 10.","es":"¿Qué claridad tienes ahora sobre el próximo paso que podrías dar en siete días? Valora de 0 a 10."}'::jsonb,
  'scale_0_10',NULL,true,false,'Optional baseline, identical wording at closeout; not a clinical instrument.'),
 ('grow_overload_clarity_end_q1_v1','grow_v1','pilot_end',1,
  '{"en":"How clear is it right now what next step you could take within seven days? Rate 0–10.","ru":"Насколько сейчас ясно, какой следующий шаг вы можете сделать в ближайшие семь дней? Оцените от 0 до 10.","es":"¿Qué claridad tienes ahora sobre el próximo paso que podrías dar en siete días? Valora de 0 a 10."}'::jsonb,
  'scale_0_10',NULL,true,false,'Optional closeout rating, compared only to the matching baseline.')
ON CONFLICT (question_key) DO NOTHING;

INSERT INTO app_private.coaching_schemes
  (scheme_key,model_key,name_i18n,result_i18n,style,estimated_minutes,topic_tags,step_keys,required_custom_plan,published)
VALUES
 ('grow_overload_20_v1','grow_v1',
  '{"en":"GROW · From overload to a clear plan","ru":"GROW · От перегрузки к ясному плану","es":"GROW · De la sobrecarga a un plan claro"}'::jsonb,
  '{"en":"Choose one priority and leave with a realistic, user-confirmed plan for the next seven days.","ru":"Выбрать один приоритет и составить реалистичный, подтверждённый вами план на ближайшие семь дней.","es":"Elegir una prioridad y salir con un plan realista, confirmado por ti, para los próximos siete días."}'::jsonb,
  'quick',20,
  ARRAY['productivity','stress','goal','decision']::text[],
  ARRAY['pilot_start','goal','reality','priorities','options','will','pilot_end','review']::text[],
  true,true)
ON CONFLICT (scheme_key) DO NOTHING;

COMMIT;

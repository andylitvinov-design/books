-- Current State v2 adds optional encrypted reflection fields only. The five scored
-- prompts, scorer and result version remain exactly those of v1.
do $$
begin
  if exists (select 1 from app.assessment_versions where id='5d365ee9-fc71-5f07-8414-8f5668b43d13' and content_hash <> 'sha256:ff9cb8875304b744829e570dacb39c1fd2feebca158184cb5e56ac9ef794423d') then
    raise exception 'Published Current State EN v2 differs from reviewed definition';
  end if;
  if exists (select 1 from app.assessment_versions where id='7c967f29-90a1-5a87-8dc5-a4be8c4f0194' and content_hash <> 'sha256:fc208ce58fd75ee66c33b13520af01b981593efedffff91284451b010e3f1771') then
    raise exception 'Published Current State RU v2 differs from reviewed definition';
  end if;
end $$;

with versions(id, definition, content_hash) as (
  values
  ('5d365ee9-fc71-5f07-8414-8f5668b43d13'::uuid,
   $$ {"key":"hh-current-state","version":"v2","instrumentLocale":"en","translationVersion":"hh-en-v2","timeframe":"right-now","scoringKey":"raw-state","scoringVersion":"v1","resultVersion":"v1","title":"Current state","source":{"title":"Holistic House Current State","status":"non-diagnostic-not-validated-clinical-scale","reviewedAt":"2026-10-02"},"questions":[{"id":"state.problem_intensity","label":"Difficulty","text":"How strong is your main difficulty right now?","type":"integer","min":0,"max":10,"required":true,"anchors":["None","Very strong"],"direction":"lower-reported-difficulty","dimensionClass":"state"},{"id":"state.resource","label":"Resource","text":"How much energy and inner support do you feel right now?","type":"integer","min":0,"max":10,"required":true,"anchors":["None","A great deal"],"direction":"higher-reported-resource","dimensionClass":"state"},{"id":"state.tension","label":"Inner tension","text":"How much inner tension do you feel right now?","type":"integer","min":0,"max":10,"required":true,"anchors":["None","Very strong"],"direction":"lower-reported-tension","dimensionClass":"state"},{"id":"state.fatigue","label":"Fatigue","text":"How tired do you feel right now?","type":"integer","min":0,"max":10,"required":true,"anchors":["Not tired","Very tired"],"direction":"lower-reported-fatigue","dimensionClass":"state"},{"id":"state.life_impact","label":"Impact on daily life","text":"How much is your current difficulty interfering with what you want to do?","type":"integer","min":0,"max":10,"required":true,"anchors":["Not at all","Very much"],"direction":"lower-reported-interference","dimensionClass":"state"}],"optionalContext":[{"id":"current_focus","maxLength":1000},{"id":"trigger","maxLength":1000},{"id":"what_helps","maxLength":1000},{"id":"desired_change","maxLength":1000},{"id":"note","maxLength":1000}],"suggestedRepeatDays":7,"id":"5d365ee9-fc71-5f07-8414-8f5668b43d13","contentHash":"sha256:ff9cb8875304b744829e570dacb39c1fd2feebca158184cb5e56ac9ef794423d"} $$::jsonb,
   'sha256:ff9cb8875304b744829e570dacb39c1fd2feebca158184cb5e56ac9ef794423d'),
  ('7c967f29-90a1-5a87-8dc5-a4be8c4f0194'::uuid,
   $$ {"key":"hh-current-state","version":"v2","instrumentLocale":"ru","translationVersion":"hh-ru-v2","timeframe":"right-now","scoringKey":"raw-state","scoringVersion":"v1","resultVersion":"v1","title":"Моё состояние","source":{"title":"Holistic House Current State","status":"non-diagnostic-not-validated-clinical-scale","reviewedAt":"2026-10-02"},"questions":[{"id":"state.problem_intensity","label":"Трудность","text":"Насколько сильно сейчас ощущается ваша основная трудность?","type":"integer","min":0,"max":10,"required":true,"anchors":["Нет","Очень сильно"],"direction":"lower-reported-difficulty","dimensionClass":"state"},{"id":"state.resource","label":"Ресурс","text":"Сколько сил и внутренней опоры вы сейчас ощущаете?","type":"integer","min":0,"max":10,"required":true,"anchors":["Нет","Очень много"],"direction":"higher-reported-resource","dimensionClass":"state"},{"id":"state.tension","label":"Напряжение","text":"Насколько сильное внутреннее напряжение вы сейчас ощущаете?","type":"integer","min":0,"max":10,"required":true,"anchors":["Нет","Очень сильно"],"direction":"lower-reported-tension","dimensionClass":"state"},{"id":"state.fatigue","label":"Усталость","text":"Насколько сильную усталость вы сейчас ощущаете?","type":"integer","min":0,"max":10,"required":true,"anchors":["Не чувствую","Очень сильная"],"direction":"lower-reported-fatigue","dimensionClass":"state"},{"id":"state.life_impact","label":"Влияние на жизнь","text":"Насколько текущая трудность мешает вам делать то, что вы хотите?","type":"integer","min":0,"max":10,"required":true,"anchors":["Совсем не мешает","Очень мешает"],"direction":"lower-reported-interference","dimensionClass":"state"}],"optionalContext":[{"id":"current_focus","maxLength":1000},{"id":"trigger","maxLength":1000},{"id":"what_helps","maxLength":1000},{"id":"desired_change","maxLength":1000},{"id":"note","maxLength":1000}],"suggestedRepeatDays":7,"id":"7c967f29-90a1-5a87-8dc5-a4be8c4f0194","contentHash":"sha256:fc208ce58fd75ee66c33b13520af01b981593efedffff91284451b010e3f1771"} $$::jsonb,
   'sha256:fc208ce58fd75ee66c33b13520af01b981593efedffff91284451b010e3f1771')
)
insert into app.assessment_versions(
  id,definition_key,definition_version,instrument_locale,translation_version,
  definition,questions,answer_schema,scoring_key,scoring_version,result_schema,
  timeframe,source_metadata,content_hash
)
select
  id,definition->>'key',definition->>'version',definition->>'instrumentLocale',definition->>'translationVersion',
  definition,definition->'questions','{"type":"integer","minimum":0,"maximum":10}'::jsonb,
  definition->>'scoringKey',definition->>'scoringVersion',jsonb_build_object('version',definition->>'resultVersion'),
  definition->>'timeframe',definition->'source',content_hash
from versions
on conflict (id) do nothing;

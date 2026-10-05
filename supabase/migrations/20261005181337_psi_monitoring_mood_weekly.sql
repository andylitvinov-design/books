-- Psi-Monitoring: structured mood timeline + original HH Weekly Pulse.
begin;

create table app.mood_checkins(
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  mood text not null check(mood in('sad','neutral','happy')),
  category text check(category in('body','energy','emotions','relationships','work-money','other')),
  occurred_at timestamptz not null default now(),
  timezone text not null check(char_length(timezone) between 1 and 100),
  source_surface text not null check(source_surface in('cabinet_landing','portrait','monitoring')),
  operation_id uuid not null,
  created_at timestamptz not null default now(),
  unique(account_id,operation_id)
);
create index mood_checkins_account_time on app.mood_checkins(account_id,occurred_at desc,id desc);
alter table app.mood_checkins enable row level security;
revoke all on app.mood_checkins from public,anon,authenticated;
grant select on app.mood_checkins to authenticated,hh_app_backend;
grant insert on app.mood_checkins to hh_app_backend;
grant update(category) on app.mood_checkins to hh_app_backend;
create policy own_mood_checkins_read on app.mood_checkins for select to authenticated,hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_mood_checkins_create on app.mood_checkins for insert to hh_app_backend
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_mood_checkins_update on app.mood_checkins for update to hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()))
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));

create table app_private.guest_mood_checkins(
  id uuid primary key default gen_random_uuid(),
  guest_session_id uuid not null references app_private.guest_sessions(id) on delete cascade,
  mood text not null check(mood in('sad','neutral','happy')),
  category text check(category in('body','energy','emotions','relationships','work-money','other')),
  occurred_at timestamptz not null default now(),
  timezone text not null check(char_length(timezone) between 1 and 100),
  source_surface text not null check(source_surface='cabinet_landing'),
  operation_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(guest_session_id,operation_id)
);
create index guest_mood_checkins_session_time on app_private.guest_mood_checkins(guest_session_id,occurred_at desc,id desc);
revoke all on app_private.guest_mood_checkins from public,anon,authenticated,hh_app_inbox;
grant select,insert,delete on app_private.guest_mood_checkins to hh_app_backend;
grant update(category) on app_private.guest_mood_checkins to hh_app_backend;

do $$ begin
  if exists(select 1 from app.assessment_versions where id='7dc3058b-c939-5577-9226-9c5b50aa4aee' and content_hash <> 'sha256:e0db859b3e3c888643ef199e1034507687b0692b77ea6932c2cbacacfb2767d7') then raise exception 'Published Weekly Pulse EN differs from reviewed definition'; end if;
  if exists(select 1 from app.assessment_versions where id='7780802c-603b-5382-aebf-8f6c5ef3ddcc' and content_hash <> 'sha256:1580de6223f16ba1806e446a0fc10bf35510b01d696bc149f49eed67a037cc82') then raise exception 'Published Weekly Pulse RU differs from reviewed definition'; end if;
end $$;

with versions(id,definition,content_hash) as (values
  ('7dc3058b-c939-5577-9226-9c5b50aa4aee'::uuid,$en${"key":"hh-weekly-pulse","version":"v1","instrumentLocale":"en","translationVersion":"hh-en-v1","timeframe":"past-7-days","scoringKey":"raw-dimensions","scoringVersion":"v1","resultVersion":"v1","title":"Weekly Psychic Health","source":{"title":"Holistic House Weekly Pulse","status":"original-non-diagnostic-self-monitoring","reviewedAt":"2026-10-05"},"questions":[{"id":"weekly.mood","label":"Emotional state","text":"Overall, how emotionally okay have you felt during the past 7 days?","type":"integer","min":0,"max":10,"required":true,"anchors":["Not okay at all","Very okay"],"direction":"higher-reported-wellbeing","dimensionClass":"state"},{"id":"weekly.tension","label":"Anxiety / tension","text":"How much anxiety or inner tension have you felt during the past 7 days?","type":"integer","min":0,"max":10,"required":true,"anchors":["None","Very strong"],"direction":"lower-reported-tension","dimensionClass":"symptoms"},{"id":"weekly.load","label":"Stress / load","text":"How heavy has your overall stress or mental load felt during the past 7 days?","type":"integer","min":0,"max":10,"required":true,"anchors":["Not heavy","Extremely heavy"],"direction":"lower-reported-load","dimensionClass":"symptoms"},{"id":"weekly.recovery","label":"Sleep / recovery","text":"How restored have you felt after sleep or rest during the past 7 days?","type":"integer","min":0,"max":10,"required":true,"anchors":["Not restored","Very restored"],"direction":"higher-reported-recovery","dimensionClass":"resources"},{"id":"weekly.energy","label":"Energy","text":"How much usable energy have you had during the past 7 days?","type":"integer","min":0,"max":10,"required":true,"anchors":["Very little","A great deal"],"direction":"higher-reported-energy","dimensionClass":"state"},{"id":"weekly.clarity","label":"Mental clarity","text":"How clear and focused has your thinking felt during the past 7 days?","type":"integer","min":0,"max":10,"required":true,"anchors":["Very unclear","Very clear"],"direction":"higher-reported-clarity","dimensionClass":"function"},{"id":"weekly.connection","label":"Connection / support","text":"How supported and connected to other people have you felt during the past 7 days?","type":"integer","min":0,"max":10,"required":true,"anchors":["Not at all","Very much"],"direction":"higher-reported-support","dimensionClass":"resources"},{"id":"weekly.functioning","label":"Daily functioning","text":"How well were you able to do the things you needed or wanted to do during the past 7 days?","type":"integer","min":0,"max":10,"required":true,"anchors":["Very poorly","Very well"],"direction":"higher-reported-functioning","dimensionClass":"function"}],"optionalContext":[],"suggestedRepeatDays":7,"id":"7dc3058b-c939-5577-9226-9c5b50aa4aee","contentHash":"sha256:e0db859b3e3c888643ef199e1034507687b0692b77ea6932c2cbacacfb2767d7"}$en$::jsonb,'sha256:e0db859b3e3c888643ef199e1034507687b0692b77ea6932c2cbacacfb2767d7'),
  ('7780802c-603b-5382-aebf-8f6c5ef3ddcc'::uuid,$ru${"key":"hh-weekly-pulse","version":"v1","instrumentLocale":"ru","translationVersion":"hh-ru-v1","timeframe":"past-7-days","scoringKey":"raw-dimensions","scoringVersion":"v1","resultVersion":"v1","title":"Психическое состояние за неделю","source":{"title":"Holistic House Weekly Pulse","status":"original-non-diagnostic-self-monitoring","reviewedAt":"2026-10-05"},"questions":[{"id":"weekly.mood","label":"Эмоциональное состояние","text":"Насколько в целом эмоционально благополучно вы чувствовали себя в течение последних 7 дней?","type":"integer","min":0,"max":10,"required":true,"anchors":["Совсем неблагополучно","Очень благополучно"],"direction":"higher-reported-wellbeing","dimensionClass":"state"},{"id":"weekly.tension","label":"Тревога / напряжение","text":"Насколько сильными были тревога или внутреннее напряжение в течение последних 7 дней?","type":"integer","min":0,"max":10,"required":true,"anchors":["Не было","Очень сильные"],"direction":"lower-reported-tension","dimensionClass":"symptoms"},{"id":"weekly.load","label":"Стресс / нагрузка","text":"Насколько тяжёлой ощущалась общая стрессовая или психологическая нагрузка в течение последних 7 дней?","type":"integer","min":0,"max":10,"required":true,"anchors":["Совсем не тяжёлой","Чрезвычайно тяжёлой"],"direction":"lower-reported-load","dimensionClass":"symptoms"},{"id":"weekly.recovery","label":"Сон / восстановление","text":"Насколько восстановившимся вы чувствовали себя после сна или отдыха в течение последних 7 дней?","type":"integer","min":0,"max":10,"required":true,"anchors":["Совсем не восстановившимся","Очень восстановившимся"],"direction":"higher-reported-recovery","dimensionClass":"resources"},{"id":"weekly.energy","label":"Энергия","text":"Сколько доступной для повседневной жизни энергии у вас было в течение последних 7 дней?","type":"integer","min":0,"max":10,"required":true,"anchors":["Очень мало","Очень много"],"direction":"higher-reported-energy","dimensionClass":"state"},{"id":"weekly.clarity","label":"Ясность мышления","text":"Насколько ясным и собранным было ваше мышление в течение последних 7 дней?","type":"integer","min":0,"max":10,"required":true,"anchors":["Очень неясным","Очень ясным"],"direction":"higher-reported-clarity","dimensionClass":"function"},{"id":"weekly.connection","label":"Связь / поддержка","text":"Насколько вы чувствовали связь и поддержку со стороны других людей в течение последних 7 дней?","type":"integer","min":0,"max":10,"required":true,"anchors":["Совсем не чувствовал(а)","Очень сильно"],"direction":"higher-reported-support","dimensionClass":"resources"},{"id":"weekly.functioning","label":"Повседневное функционирование","text":"Насколько хорошо вам удавалось делать то, что было нужно или хотелось сделать, в течение последних 7 дней?","type":"integer","min":0,"max":10,"required":true,"anchors":["Очень плохо","Очень хорошо"],"direction":"higher-reported-functioning","dimensionClass":"function"}],"optionalContext":[],"suggestedRepeatDays":7,"id":"7780802c-603b-5382-aebf-8f6c5ef3ddcc","contentHash":"sha256:1580de6223f16ba1806e446a0fc10bf35510b01d696bc149f49eed67a037cc82"}$ru$::jsonb,'sha256:1580de6223f16ba1806e446a0fc10bf35510b01d696bc149f49eed67a037cc82')
)
insert into app.assessment_versions(
  id,definition_key,definition_version,instrument_locale,translation_version,definition,questions,answer_schema,
  scoring_key,scoring_version,result_schema,timeframe,source_metadata,content_hash
)
select id,definition->>'key',definition->>'version',definition->>'instrumentLocale',definition->>'translationVersion',
  definition,definition->'questions','{"type":"integer","minimum":0,"maximum":10}'::jsonb,
  definition->>'scoringKey',definition->>'scoringVersion',jsonb_build_object('version',definition->>'resultVersion'),
  definition->>'timeframe',definition->'source',content_hash
from versions on conflict(id) do nothing;

commit;

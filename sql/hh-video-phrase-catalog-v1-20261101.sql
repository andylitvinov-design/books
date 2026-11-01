-- HH Video Studio: public, pre-materialized phrase library (5 x 6 x 4 x 4 ideas).
-- All 69,120 content records are generated once from the reviewed RU/EN/ES
-- editorial bank, not AI-written at request time. No client text is stored.
-- This migration is additive; it never alters existing client-owned tables.
create table if not exists public.hh_video_phrase_catalog_v1 (
  id text primary key,
  category_id text not null,
  topic_id text not null,
  scenario_id text not null,
  idea_id text not null,
  locale text not null check (locale in ('ru','en','es')),
  tone text not null check (tone in ('gentle','confident','grounded','inspiring')),
  speaker text not null check (speaker in ('self','support')),
  phrase_length text not null check (phrase_length in ('short','extended')),
  variant smallint not null check (variant between 1 and 3),
  phrase_text text not null check (char_length(phrase_text) between 4 and 180),
  catalog_version text not null default 'hh-video-phrases-v1',
  created_at timestamptz not null default now()
);
create index if not exists hh_video_phrase_filter_v1_idx
  on public.hh_video_phrase_catalog_v1
  (scenario_id,locale,idea_id,tone,speaker,phrase_length,variant);
alter table public.hh_video_phrase_catalog_v1 enable row level security;
revoke all on table public.hh_video_phrase_catalog_v1 from public,anon,authenticated;
grant select on table public.hh_video_phrase_catalog_v1 to anon,authenticated;
create policy hh_video_phrase_public_read_v1
  on public.hh_video_phrase_catalog_v1 for select to anon,authenticated
  using (true);

with
editorial as (
  select '{"schemaVersion":"hh-video-phrase-actions-v1","languages":["ru","en","es"],"toneIds":["gentle","confident","grounded","inspiring"],"voiceIds":["self","support"],"lengthIds":["short","extended"],"topics":{"body-release":{"ru":["отпускать напряжение","расслаблять плечи","замедлять движения","замечать покой"],"en":["release tension","relax my shoulders","move more slowly","notice calm"],"es":["soltar la tensión","relajar los hombros","moverme sin prisa","notar la calma"]},"body-sleep":{"ru":["готовиться ко сну","замедляться вечером","выбирать отдых","отпускать дела"],"en":["prepare for sleep","slow down at night","choose rest","put tasks aside"],"es":["prepararme para dormir","bajar el ritmo al anochecer","elegir descansar","dejar las tareas"]},"body-breath":{"ru":["замечать дыхание","дышать без усилия","делать паузу","выбирать свой ритм"],"en":["notice my breathing","breathe without strain","take a pause","find my own rhythm"],"es":["notar mi respiración","respirar sin esfuerzo","hacer una pausa","seguir mi ritmo"]},"body-comfort":{"ru":["искать удобную позу","двигаться мягче","чувствовать опору","слышать тело"],"en":["find a comfy posture","move more gently","feel supported","listen to my body"],"es":["buscar una postura cómoda","moverme con suavidad","sentir apoyo","escuchar mi cuerpo"]},"body-care":{"ru":["выделять время себе","замечать свои нужды","выбирать заботу","отдыхать без спешки"],"en":["make time for myself","notice what I need","choose self-care","rest without rushing"],"es":["dedicarme tiempo","notar lo que necesito","elegir cuidarme","descansar sin prisa"]},"body-confidence":{"ru":["занимать своё место","двигаться уверенно","держать осанку мягко","слышать свои сигналы"],"en":["take up my space","move with confidence","stand with ease","notice my signals"],"es":["ocupar mi espacio","moverme con confianza","erguirme con calma","notar mis señales"]},"work-support":{"ru":["опираться на навыки","просить ясности","делать посильный шаг","ценить свой вклад"],"en":["trust my skills","ask for clarity","take a doable step","value my work"],"es":["apoyarme en mis habilidades","pedir claridad","dar un paso posible","valorar mi trabajo"]},"money-stability":{"ru":["планировать расходы","ценить свой труд","смотреть на цифры","выбирать ясный шаг"],"en":["plan my spending","value my work","look at the numbers","take a clear step"],"es":["planear mis gastos","valorar mi trabajo","revisar mis cuentas","elegir un paso claro"]},"work-focus":{"ru":["выбирать одну задачу","возвращать внимание","делать перерыв","замечать прогресс"],"en":["choose one task","refocus my attention","take a break","notice progress"],"es":["elegir una tarea","volver a concentrarme","hacer una pausa","notar avances"]},"work-decision":{"ru":["рассмотреть варианты","слышать свой выбор","делать первый шаг","менять план при нужде"],"en":["weigh my options","listen to my choice","take the first step","adjust my plan"],"es":["considerar opciones","escuchar mi criterio","dar el primer paso","ajustar mi plan"]},"work-opportunity":{"ru":["замечать варианты","задавать вопросы","пробовать новое","делиться идеями"],"en":["notice possibilities","ask questions","try something new","share my ideas"],"es":["ver posibilidades","hacer preguntas","probar algo nuevo","compartir mis ideas"]},"work-speaking":{"ru":["говорить в своём темпе","находить свои слова","выдерживать паузу","быть услышанным"],"en":["speak at my own pace","find my words","allow a pause","make myself heard"],"es":["hablar a mi ritmo","encontrar mis palabras","permitir una pausa","hacerme escuchar"]},"energy-vitality":{"ru":["беречь свои силы","отдыхать вовремя","двигаться понемногу","замечать энергию"],"en":["protect my energy","rest when needed","move a little","notice my energy"],"es":["cuidar mi energía","descansar cuando lo necesito","moverme un poco","notar mi energía"]},"energy-morning":{"ru":["встречать утро мягко","начинать с малого","выбирать ритм дня","замечать свет"],"en":["greet the morning","start small","set my daily pace","notice the light"],"es":["recibir la mañana","empezar poco a poco","elegir mi ritmo","notar la luz"]},"energy-inspiration":{"ru":["замечать новое","слышать свои идеи","делать наброски","пробовать творить"],"en":["notice something new","listen to my ideas","sketch my thoughts","try creating"],"es":["notar algo nuevo","escuchar mis ideas","anotar mis ideas","probar a crear"]},"energy-inner-strength":{"ru":["замечать свою опору","опираться на опыт","помнить свои границы","выбирать свой шаг"],"en":["notice my support","draw on experience","honor my boundaries","choose my next step"],"es":["notar mi apoyo","usar mi experiencia","respetar mis límites","elegir mi siguiente paso"]},"energy-fresh-start":{"ru":["отпускать старый план","пробовать новый путь","начинать с малого","разрешать перемены"],"en":["release old plans","try a new path","start with small steps","allow change"],"es":["soltar planes antiguos","probar otro camino","empezar poco a poco","permitir cambios"]},"energy-purpose":{"ru":["замечать главное","слушать свои ценности","искать направление","идти своим путём"],"en":["notice what matters","listen to my values","explore direction","follow my path"],"es":["notar lo importante","escuchar mis valores","buscar dirección","seguir mi camino"]},"love-closeness":{"ru":["приближаться бережно","делиться теплом","слышать другого","сохранять границы"],"en":["connect with care","share warmth","listen to others","honor boundaries"],"es":["acercarme con cuidado","compartir calidez","escuchar al otro","respetar límites"]},"love-trust":{"ru":["давать доверию время","проверять поступки","говорить открыто","сохранять границы"],"en":["let trust take time","notice actions","speak honestly","keep my boundaries"],"es":["dar tiempo a la confianza","observar los hechos","hablar con sinceridad","mantener mis límites"]},"love-heart":{"ru":["замечать нежность","выражать заботу","принимать тепло","слышать своё сердце"],"en":["notice tenderness","show kindness","receive warmth","listen to my heart"],"es":["notar la ternura","mostrar cariño","recibir calidez","escuchar mi corazón"]},"love-boundaries":{"ru":["слышать своё нет","говорить о нуждах","выбирать дистанцию","уважать себя"],"en":["honor my no","express my needs","choose my distance","respect myself"],"es":["escuchar mi no","expresar mis necesidades","elegir mi distancia","respetarme"]},"love-self":{"ru":["говорить с собой мягко","ценить свои усилия","разрешать себе отдых","поддерживать себя"],"en":["speak kindly to myself","value my efforts","allow myself rest","support myself"],"es":["hablarme con cariño","valorar mis esfuerzos","permitirme descansar","darme apoyo"]},"love-dialogue":{"ru":["слушать без спешки","говорить о чувствах","задавать вопросы","искать общий язык"],"en":["listen without rushing","name my feelings","ask questions","find common ground"],"es":["escuchar sin prisa","nombrar mis emociones","hacer preguntas","buscar entendimiento"]},"stress-anxiety":{"ru":["замечать опору","делать паузу","смягчать напряжение","просить поддержку"],"en":["notice my footing","take a pause","ease my tension","ask for support"],"es":["notar mi apoyo","hacer una pausa","aflojar la tensión","pedir apoyo"]},"stress-fast-calm":{"ru":["останавливаться на миг","замечать пространство","чувствовать стопы","выбирать медленный шаг"],"en":["pause for a moment","notice the space","feel my feet","take a slower step"],"es":["parar un momento","notar el espacio","sentir mis pies","dar un paso lento"]},"stress-after-day":{"ru":["отпускать рабочий день","замечать усталость","давать себе тишину","выбирать отдых"],"en":["leave work behind","notice my fatigue","welcome quiet","choose rest"],"es":["dejar atrás el trabajo","notar mi cansancio","acoger el silencio","elegir descansar"]},"stress-release":{"ru":["смягчать плечи","разжимать ладони","замедлять движения","выбирать покой"],"en":["soften my shoulders","unclench my hands","slow my movements","choose a quiet moment"],"es":["relajar los hombros","aflojar las manos","ralentizar mis gestos","elegir un momento de calma"]},"stress-before-event":{"ru":["готовиться по шагам","делать паузу","вспоминать свой опыт","выбирать свой темп"],"en":["prepare step by step","take a pause","recall my experience","keep my own pace"],"es":["prepararme por pasos","hacer una pausa","recordar mi experiencia","seguir mi ritmo"]},"stress-safety":{"ru":["замечать опору","выбирать удобное место","обозначать границы","просить помощи"],"en":["notice my support","find a comfortable place","name my boundaries","ask for help"],"es":["notar mi apoyo","buscar un lugar cómodo","marcar mis límites","pedir ayuda"]}}}'::jsonb as actions,
    '{"schemaVersion":"hh-video-phrase-templates-v1","ideaPrefix":{"ru":"Я могу","en":"I can","es":"Puedo"},"prefixes":{"ru":{"gentle":{"self":["Мне можно","Я могу","Позволяю себе"],"support":["Тебе можно","Ты можешь","Ты вправе"]},"confident":{"self":["Я выбираю","Я могу","Я решаю"],"support":["Ты выбираешь","Ты можешь","Ты решаешь"]},"grounded":{"self":["Сейчас могу","Сегодня могу","Я пробую"],"support":["Сейчас можешь","Сегодня можешь","Можешь попробовать"]},"inspiring":{"self":["Я учусь","Начинаю","Продолжаю учиться"],"support":["Ты учишься","Можешь начать","Можешь учиться"]}},"en":{"gentle":{"self":["I may","I can","I allow myself to"],"support":["You may","You can","You have room to"]},"confident":{"self":["I choose to","I can","I decide to"],"support":["You choose to","You can","You decide to"]},"grounded":{"self":["Right now I can","Today I can","I can try to"],"support":["Right now you can","Today you can","You can try to"]},"inspiring":{"self":["I am learning to","I begin to","I keep learning to"],"support":["You are learning to","You may begin to","You can learn to"]}},"es":{"gentle":{"self":["Puedo","Me permito","Me doy permiso para"],"support":["Puedes","Te permites","Tienes derecho a"]},"confident":{"self":["Elijo","Puedo","Decido"],"support":["Eliges","Puedes","Decides"]},"grounded":{"self":["Ahora puedo","Hoy puedo","Puedo intentar"],"support":["Ahora puedes","Hoy puedes","Puedes intentar"]},"inspiring":{"self":["Aprendo a","Empiezo a","Sigo aprendiendo a"],"support":["Aprendes a","Puedes empezar a","Puedes aprender a"]}}},"closings":{"ru":{"journey":{"self":"Один шаг уже имеет смысл.","support":"Твой шаг уже имеет смысл."},"shelter":{"self":"Я могу искать мягкую опору.","support":"Тебе можно искать опору."},"awakening":{"self":"Перемены начинаются с малого.","support":"Можно начинать с малого."},"connection":{"self":"Я уважаю себя и других.","support":"Твоё пространство важно."}},"en":{"journey":{"self":"A small step still matters.","support":"Your small step matters."},"shelter":{"self":"I can seek gentle support.","support":"You can seek gentle support."},"awakening":{"self":"Change can begin with little.","support":"You can start small."},"connection":{"self":"I respect myself and others.","support":"Your space matters."}},"es":{"journey":{"self":"Un paso pequeño ya cuenta.","support":"Tu pequeño paso importa."},"shelter":{"self":"Puedo buscar apoyo amable.","support":"Puedes buscar apoyo amable."},"awakening":{"self":"El cambio empieza poco a poco.","support":"Puedes empezar poco a poco."},"connection":{"self":"Me respeto y respeto a otros.","support":"Tu espacio importa."}}}}'::jsonb as tpl
),
taxonomy_topics(topic_id,category_id) as (
  values
    ('body-release','body'),
    ('body-sleep','body'),
    ('body-breath','body'),
    ('body-comfort','body'),
    ('body-care','body'),
    ('body-confidence','body'),
    ('work-support','business'),
    ('money-stability','business'),
    ('work-focus','business'),
    ('work-decision','business'),
    ('work-opportunity','business'),
    ('work-speaking','business'),
    ('energy-vitality','energy'),
    ('energy-morning','energy'),
    ('energy-inspiration','energy'),
    ('energy-inner-strength','energy'),
    ('energy-fresh-start','energy'),
    ('energy-purpose','energy'),
    ('love-closeness','love'),
    ('love-trust','love'),
    ('love-heart','love'),
    ('love-boundaries','love'),
    ('love-self','love'),
    ('love-dialogue','love'),
    ('stress-anxiety','stress'),
    ('stress-fast-calm','stress'),
    ('stress-after-day','stress'),
    ('stress-release','stress'),
    ('stress-before-event','stress'),
    ('stress-safety','stress')
),
topic_bank as (
  select t.topic_id,t.category_id,src.value as by_locale
  from editorial e
  cross join lateral jsonb_each(e.actions->'topics') as src(key,value)
  join taxonomy_topics t on t.topic_id=src.key
),
scenes as (
  select b.*,b.topic_id||'-s'||n::text as scenario_id,
    case n when 1 then 'journey' when 2 then 'shelter'
      when 3 then 'awakening' else 'connection' end as arc
  from topic_bank b cross join generate_series(1,4) as n
),
combinations as (
  select s.category_id,s.topic_id,s.scenario_id,s.arc,
    lang.key as locale,idea.ordinality::int as idea_no,idea.value as action,
    tone.tone,speaker.speaker,plen.phrase_length,variant.n as variant
  from scenes s
  cross join lateral jsonb_each(s.by_locale) as lang(key,value)
  cross join lateral jsonb_array_elements_text(lang.value)
    with ordinality as idea(value,ordinality)
  cross join (values ('gentle'),('confident'),('grounded'),('inspiring')) as tone(tone)
  cross join (values ('self'),('support')) as speaker(speaker)
  cross join (values ('short'),('extended')) as plen(phrase_length)
  cross join generate_series(1,3) as variant(n)
),
rendered as (
  select p.*,p.scenario_id||'-i'||p.idea_no::text as idea_id,
    (e.tpl->'prefixes'->p.locale->p.tone->p.speaker->>(p.variant-1))
      ||' '||p.action||'.'||
      case when p.phrase_length='extended'
        then E'\n'||(e.tpl->'closings'->p.locale->p.arc->>p.speaker)
        else '' end as phrase_text
  from combinations p cross join editorial e
)
insert into public.hh_video_phrase_catalog_v1 (
  id,category_id,topic_id,scenario_id,idea_id,locale,tone,speaker,
  phrase_length,variant,phrase_text,catalog_version
)
select
  r.scenario_id||':'||r.idea_id||':'||r.locale||':'||r.tone||':'||
    r.speaker||':'||r.phrase_length||':'||r.variant::text,
  r.category_id,r.topic_id,r.scenario_id,r.idea_id,r.locale,r.tone,
  r.speaker,r.phrase_length,r.variant,r.phrase_text,'hh-video-phrases-v1'
from rendered r
on conflict (id) do nothing;

comment on table public.hh_video_phrase_catalog_v1 is
  'Approved RU/EN/ES editorial affirmations; all 69,120 combinations materialized for indexed selection. Public read only, no private client data.';

-- Original EN/RU/ES keyword stems for ON-DEVICE coaching intent hints.
-- Never store any client's typed question here; server sends a public-like catalog only
-- AFTER verifying their account, and the browser ranks 3 frameworks locally.
BEGIN;
CREATE TABLE IF NOT EXISTS app_private.coaching_intent_signals (
 topic_key text PRIMARY KEY CHECK(topic_key ~ '^[a-z_]+$'),
 label_i18n jsonb NOT NULL CHECK(label_i18n ?& ARRAY['en','ru','es']),
 word_stems_i18n jsonb NOT NULL CHECK(word_stems_i18n ?& ARRAY['en','ru','es']),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0)
);
COMMENT ON TABLE app_private.coaching_intent_signals IS
 'Localized stems used only in browser for suggestive self-coaching framework selection. No client text is stored, scored or sent to analytics.';
ALTER TABLE app_private.coaching_intent_signals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app_private.coaching_intent_signals FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE app_private.coaching_intent_signals TO hh_app_backend;
DO $policy$
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='app_private' AND tablename='coaching_intent_signals' AND policyname='coaching_intent_signals_backend_read') THEN
 CREATE POLICY coaching_intent_signals_backend_read ON app_private.coaching_intent_signals FOR SELECT TO hh_app_backend USING(true);
END IF;
END $policy$;
INSERT INTO app_private.coaching_intent_signals(topic_key,label_i18n,word_stems_i18n) VALUES
 ('goal','{"en":"Goal","ru":"Цель","es":"Meta"}'::jsonb,'{"en":["goal","achiev","accomplish","target","objective","milestone"],"ru":["цел","достич","добить","результат","план","проект"],"es":["objetiv","meta","lograr","conseguir","proyecto"]}'::jsonb),
 ('decision','{"en":"Decision","ru":"Выбор","es":"Decisión"}'::jsonb,'{"en":["decid","choos","choice","dilemma","which option"],"ru":["выбор","выбрать","выбира","решить","решени","дилемм"],"es":["decid","decisi","elegir","elecci","dilema"]}'::jsonb),
 ('business','{"en":"Business","ru":"Бизнес","es":"Negocio"}'::jsonb,'{"en":["business","company","startup","entrepreneur","customer","client","sales"],"ru":["бизнес","предприним","стартап","клиент","продаж","заказчик"],"es":["negocio","empresa","emprend","cliente","venta"]}'::jsonb),
 ('career','{"en":"Career","ru":"Карьера","es":"Carrera"}'::jsonb,'{"en":["career","job","promotion","interview","employment","resign"],"ru":["карьер","работ","увол","професс","собеседов","начальник"],"es":["carrera","empleo","trabajo","ascenso","entrevista"]}'::jsonb),
 ('relationships','{"en":"Relationships","ru":"Отношения","es":"Relaciones"}'::jsonb,'{"en":["relationship","partner","marriage","friendship","spouse","family"],"ru":["отношен","партнер","партнёр","муж","жен","супруг","семь","близк"],"es":["relacion","pareja","familia","matrimonio"]}'::jsonb),
 ('conflict','{"en":"Conflict","ru":"Конфликт","es":"Conflicto"}'::jsonb,'{"en":["fight","argue","conflict","disagree","tension","quarrel"],"ru":["ссор","конфликт","спор","разноглас","претенз","поссор","обид"],"es":["conflicto","pelea","discus","tense","tension"]}'::jsonb),
 ('communication','{"en":"Communication","ru":"Общение","es":"Comunicación"}'::jsonb,'{"en":["talk","conversation","speak","communicat","message","explain"],"ru":["поговор","разговор","общени","общаться","сказать","коммуникац","выраз"],"es":["hablar","conversac","comunic","decir","explicar"]}'::jsonb),
 ('money','{"en":"Money","ru":"Деньги","es":"Dinero"}'::jsonb,'{"en":["money","salary","income","earn","budget","revenue","debt","pricing"],"ru":["деньг","доход","заработ","зарплат","бюджет","финанс","долг","цен"],"es":["dinero","ingreso","salario","presupuesto","ganar","deuda","precio"]}'::jsonb),
 ('confidence','{"en":"Confidence","ru":"Уверенность","es":"Confianza"}'::jsonb,'{"en":["confidence","self-doubt","insecure","fear","self-esteem"],"ru":["уверенн","неуверенн","сомнен","страшно","страх","стыд","стесня"],"es":["confianza","segurid","miedo","duda","verguenza"]}'::jsonb),
 ('stuck','{"en":"Stuck","ru":"Застой","es":"Bloqueo"}'::jsonb,'{"en":["stuck","blocked","stagnat","no progress","lost"],"ru":["застр","букс","тупик","застоя","не получается"],"es":["bloquead","atascad","estancad","sin avanzar"]}'::jsonb),
 ('habits','{"en":"Habits","ru":"Привычки","es":"Hábitos"}'::jsonb,'{"en":["habit","routine","every day","regularly","consistent"],"ru":["привычк","регуляр","каждый день","режим","рутин","повторя"],"es":["habito","rutina","cada dia","regular"]}'::jsonb),
 ('procrastination','{"en":"Procrastination","ru":"Прокрастинация","es":"Procrastinación"}'::jsonb,'{"en":["procrastinat","postpon","delaying","put off"],"ru":["откладыва","прокрастин","не могу начать","тяну","потом"],"es":["procrastin","pospong","aplaz","posterg","no empiezo"]}'::jsonb),
 ('motivation','{"en":"Motivation","ru":"Мотивация","es":"Motivación"}'::jsonb,'{"en":["motivat","inspir","no energy","lack drive","want to start"],"ru":["мотивац","вдохнов","нет сил","не хочу","хочется","нет энергии"],"es":["motivaci","inspiraci","sin ganas","energia"]}'::jsonb),
 ('leadership','{"en":"Leadership","ru":"Лидерство","es":"Liderazgo"}'::jsonb,'{"en":["leader","manag","team","supervis","delegat"],"ru":["руковод","управл","начальник","команд","лидер","делегир"],"es":["lider","gestion","equipo","delegar","jefe"]}'::jsonb),
 ('productivity','{"en":"Productivity","ru":"Продуктивность","es":"Productividad"}'::jsonb,'{"en":["productiv","time management","deadline","focus","priorit","organize"],"ru":["продуктив","дедлайн","времен","фокус","приоритет","успева","организац"],"es":["productiv","tiempo","plazo","prioridad","organiza"]}'::jsonb),
 ('growth','{"en":"Growth","ru":"Развитие","es":"Desarrollo"}'::jsonb,'{"en":["grow","develop","improv","learn","strength","potential"],"ru":["развит","расти","рост","улучш","сильн","потенциал"],"es":["desarroll","crecer","mejorar","fortaleza"]}'::jsonb),
 ('transition','{"en":"Transition","ru":"Перемены","es":"Transición"}'::jsonb,'{"en":["change","transition","starting over","relocat","new stage"],"ru":["перемен","изменени","переезд","новый этап","сменить","начать заново"],"es":["cambio","transici","mudanza","nueva etapa"]}'::jsonb),
 ('unclear','{"en":"Unclear topic","ru":"Неясный запрос","es":"Tema incierto"}'::jsonb,'{"en":["unsure","don''t know","confus","uncertain","figure out","not sure"],"ru":["не знаю","не понимаю","запут","не определ","неясн","не могу понять"],"es":["no se","confus","inciert","no entiendo"]}'::jsonb),
 ('creativity','{"en":"Creativity","ru":"Творчество","es":"Creatividad"}'::jsonb,'{"en":["creativ","idea","innov","invent","imagin"],"ru":["творче","идея","идеи","креатив","придум","создать"],"es":["creativ","idea","innov","invent"]}'::jsonb)
ON CONFLICT(topic_key) DO UPDATE SET label_i18n=excluded.label_i18n,word_stems_i18n=excluded.word_stems_i18n;
COMMIT;

-- 2026-10-21: Add verified folk-proverb kind to EXISTING public Ideas catalog.
-- 14 historical originals, seven source languages; RU/EN/ES are our own sense translations.
-- Bohn (1857) COMPILED the collection; he is NOT credited as author of folk sayings.
-- No customer question, identifiable person, cookies, analytics, or new public write privileges.
BEGIN;
ALTER TABLE public.hh_ideas_aphorisms
  ADD COLUMN IF NOT EXISTS original_language text,
  ADD COLUMN IF NOT EXISTS original_text text,
  ADD COLUMN IF NOT EXISTS source_locator text,
  ADD COLUMN IF NOT EXISTS source_license text;
ALTER TABLE public.hh_ideas_aphorisms
  DROP CONSTRAINT IF EXISTS hh_ideas_aphorisms_kind_check;
ALTER TABLE public.hh_ideas_aphorisms
  ADD CONSTRAINT hh_ideas_aphorisms_kind_check
  CHECK (kind IN ('editorial', 'inspired', 'proverb'));
ALTER TABLE public.hh_ideas_aphorisms
  DROP CONSTRAINT IF EXISTS hh_ideas_proverb_verifiable_source;
ALTER TABLE public.hh_ideas_aphorisms
  ADD CONSTRAINT hh_ideas_proverb_verifiable_source CHECK (
    kind <> 'proverb' OR (
      original_language ~ '^[a-z]{2}$' AND
      nullif(btrim(original_text), '') IS NOT NULL AND
      nullif(btrim(source_locator), '') IS NOT NULL AND
      nullif(btrim(source_license), '') IS NOT NULL AND
      nullif(btrim(source_work), '') IS NOT NULL AND
      source_url LIKE 'https://%'
    )
  );
INSERT INTO public.hh_ideas_aphorisms (
  id, topic, keywords, text_en, text_ru, text_es, kind,
  source_author, source_work, source_url,
  original_language, original_text, source_locator, source_license
)
VALUES
  ('hh-proverb-fr-01', 'stress', ARRAY['тревог','страх','стресс','паник','стыд','напряж','anxiety','stress','fear','panic','worry','ansiedad','miedo','panico','preocupacion']::text[], 'Every person feels the weight of their own burden in a special way.', 'Каждый человек по-своему ощущает тяжесть собственной ноши.', 'Cada persona siente a su manera el peso de su propia carga.', 'proverb', 'French traditional proverb', 'A Polyglot of Foreign Proverbs (London, 1857)', 'https://www.gutenberg.org/files/51090/51090-h/51090-h.htm', 'fr', 'A chacun son fardeau pèse.', 'French proverbs · A', 'public_domain_1857_us'),
  ('hh-proverb-fr-02', 'boundaries', ARRAY['границ','отказ','нет','манипуляц','контроль','давлен','наруш','отношени','boundaries','no','control','pressure','manipulation','limites','control','presion','abuso']::text[], 'No one should be expected to accomplish what is truly impossible.', 'Никто не обязан совершать то, что ему действительно не под силу.', 'A nadie se le puede exigir que haga lo verdaderamente imposible.', 'proverb', 'French traditional proverb', 'A Polyglot of Foreign Proverbs (London, 1857)', 'https://www.gutenberg.org/files/51090/51090-h/51090-h.htm', 'fr', 'A l’impossible nul n’est tenu.', 'French proverbs · A', 'public_domain_1857_us'),
  ('hh-proverb-it-01', 'purpose', ARRAY['смысл','призвание','зачем','предназнач','мисси','духовн','purpose','meaning','calling','destiny','sentido','proposito','vocacion','mision','espiritual']::text[], 'We keep learning as long as we keep living and paying attention.', 'Пока мы живём и внимательно смотрим вокруг, нам есть чему учиться.', 'Mientras vivimos y prestamos atención, siempre tenemos algo que aprender.', 'proverb', 'Italian traditional proverb', 'A Polyglot of Foreign Proverbs (London, 1857)', 'https://www.gutenberg.org/files/51090/51090-h/51090-h.htm', 'it', 'Vivendo s’impara.', 'Italian proverbs · V', 'public_domain_1857_us'),
  ('hh-proverb-it-02', 'acceptance', ARRAY['принятие','злость','гнев','завист','обид','отпустить','сожал','прием','anger','resentment','acceptance','let','go','accept','rabia','ira','aceptar','soltar','resentimiento']::text[], 'Knowing when to remain silent can be a profound kind of wisdom.', 'Умение вовремя промолчать иногда оказывается глубокой мудростью.', 'Saber cuándo guardar silencio puede ser una forma profunda de sabiduría.', 'proverb', 'Italian traditional proverb', 'A Polyglot of Foreign Proverbs (London, 1857)', 'https://www.gutenberg.org/files/51090/51090-h/51090-h.htm', 'it', 'Virtù di silenzio è gran scienza.', 'Italian proverbs · V', 'public_domain_1857_us'),
  ('hh-proverb-de-01', 'direction', ARRAY['выбор','решен','путь','перемен','направлен','будущее','change','decision','choice','future','path','camino','cambio','decision','futuro','direccion']::text[], 'Changing something and making it better are not always the same thing.', 'Переменить что-то и сделать это лучше — далеко не одно и то же.', 'Cambiar algo y mejorarlo no son necesariamente la misma cosa.', 'proverb', 'German traditional proverb', 'A Polyglot of Foreign Proverbs (London, 1857)', 'https://www.gutenberg.org/files/51090/51090-h/51090-h.htm', 'de', 'Aendern und bessern sind zwei.', 'German proverbs · A', 'public_domain_1857_us'),
  ('hh-proverb-de-02', 'time', ARRAY['время','откладываю','прокрастинац','успеть','возраст','поздно','жизнь','time','procrastinat','delay','aging','late','tiempo','aplazar','procrastinar','edad','tarde']::text[], 'The beginning and the ending are closer companions than they appear.', 'Начало и завершение нередко оказываются ближе друг к другу, чем кажется.', 'El principio y el final están más cerca de lo que parece.', 'proverb', 'German traditional proverb', 'A Polyglot of Foreign Proverbs (London, 1857)', 'https://www.gutenberg.org/files/51090/51090-h/51090-h.htm', 'de', 'Anfang und Ende reichen einander die Hände.', 'German proverbs · A', 'public_domain_1857_us'),
  ('hh-proverb-nl-01', 'resources', ARRAY['устал','энерг','ресурс','выгор','истощ','сил','отдых','сон','tired','energy','exhausted','burnout','rest','sleep','cansado','energia','agotado','descanso','sueno']::text[], 'A person can travel far by taking one unhurried step after another.', 'Даже неспешными шагами можно пройти очень долгий путь.', 'También se puede llegar muy lejos avanzando paso a paso, sin prisa.', 'proverb', 'Dutch traditional proverb', 'A Polyglot of Foreign Proverbs (London, 1857)', 'https://www.gutenberg.org/files/51090/51090-h/51090-h.htm', 'nl', 'Allengskens gaat men ook verre.', 'Dutch proverbs · A', 'public_domain_1857_us'),
  ('hh-proverb-nl-02', 'stress', ARRAY['тревог','страх','стресс','паник','стыд','напряж','anxiety','stress','fear','panic','worry','ansiedad','miedo','panico','preocupacion']::text[], 'Not every cloud brings rain, just as not every fear comes true.', 'Не каждая туча приносит дождь, и не каждое опасение сбывается.', 'No todas las nubes traen lluvia, ni todos los temores se cumplen.', 'proverb', 'Dutch traditional proverb', 'A Polyglot of Foreign Proverbs (London, 1857)', 'https://www.gutenberg.org/files/51090/51090-h/51090-h.htm', 'nl', 'Alle wolken regenen niet.', 'Dutch proverbs · A', 'public_domain_1857_us'),
  ('hh-proverb-es-01', 'boundaries', ARRAY['границ','отказ','нет','манипуляц','контроль','давлен','наруш','отношени','boundaries','no','control','pressure','manipulation','limites','control','presion','abuso']::text[], 'A joke is best left behind while everyone can still enjoy it.', 'Шутку лучше закончить, пока всем ещё приятно и никто не задет.', 'Conviene dejar una broma mientras todavía hace gracia a todos.', 'proverb', 'Spanish traditional proverb', 'A Polyglot of Foreign Proverbs (London, 1857)', 'https://www.gutenberg.org/files/51090/51090-h/51090-h.htm', 'es', 'A la burla, dejarla quando mas agrada.', 'Spanish proverbs · A', 'public_domain_1857_us'),
  ('hh-proverb-es-02', 'courage', ARRAY['мужество','смел','решимость','боюсь','риск','отваг','courage','brave','afraid','risk','miedo','valentia','coraje','atreverse']::text[], 'The person who keeps going patiently is the one who eventually arrives.', 'Тот, кто сохраняет терпение и не сдаётся, со временем достигает цели.', 'Llega más lejos quien persevera sin rendirse a mitad del camino.', 'proverb', 'Spanish traditional proverb', 'A Polyglot of Foreign Proverbs (London, 1857)', 'https://www.gutenberg.org/files/51090/51090-h/51090-h.htm', 'es', 'Alcança, quien no cansa.', 'Spanish proverbs · A', 'public_domain_1857_us'),
  ('hh-proverb-pt-01', 'stress', ARRAY['тревог','страх','стресс','паник','стыд','напряж','anxiety','stress','fear','panic','worry','ansiedad','miedo','panico','preocupacion']::text[], 'A hurried question deserves a calm and carefully considered reply.', 'На поспешный вопрос лучше ответить спокойно и обдуманно.', 'A una pregunta precipitada le conviene una respuesta serena.', 'proverb', 'Portuguese traditional proverb', 'A Polyglot of Foreign Proverbs (London, 1857)', 'https://www.gutenberg.org/files/51090/51090-h/51090-h.htm', 'pt', 'A apressada pergunta, vagarosa resposta.', 'Portuguese proverbs · A', 'public_domain_1857_us'),
  ('hh-proverb-pt-02', 'courage', ARRAY['мужество','смел','решимость','боюсь','риск','отваг','courage','brave','afraid','risk','miedo','valentia','coraje','atreverse']::text[], 'Water slowly wears down stone through patient, repeated effort.', 'Даже мягкая вода постепенно точит твёрдый камень своим упорством.', 'Hasta el agua suave desgasta la piedra dura con paciencia.', 'proverb', 'Portuguese traditional proverb', 'A Polyglot of Foreign Proverbs (London, 1857)', 'https://www.gutenberg.org/files/51090/51090-h/51090-h.htm', 'pt', 'Agoa molle em pedra dura, tanto dá, até que fura.', 'Portuguese proverbs · A', 'public_domain_1857_us'),
  ('hh-proverb-da-01', 'creativity', ARRAY['творчеств','вдохновлен','искусств','рисунок','идея','создавать','писать','придум','creative','inspirat','art','write','design','creatividad','inspiracion','arte','pintar','escribir','idea']::text[], 'Serious work and moments of play can strengthen one another.', 'Серьёзное дело и моменты игры способны поддерживать друг друга.', 'La seriedad y el juego pueden acompañarse y darse fuerza.', 'proverb', 'Danish traditional proverb', 'A Polyglot of Foreign Proverbs (London, 1857)', 'https://www.gutenberg.org/files/51090/51090-h/51090-h.htm', 'da', 'Alvor og Gammen kunne bedst sammen.', 'Danish proverbs · A', 'public_domain_1857_us'),
  ('hh-proverb-da-02', 'work', ARRAY['работ','карьер','бизнес','деньги','доход','проект','зарплат','work','career','business','income','salary','job','trabajo','negocio','ingreso','dinero','empleo']::text[], 'The roots of work may be bitter, but its fruits can taste sweet.', 'У труда могут быть горькие корни, но плоды его бывают сладкими.', 'El trabajo puede tener raíces amargas y dar frutos dulces.', 'proverb', 'Danish traditional proverb', 'A Polyglot of Foreign Proverbs (London, 1857)', 'https://www.gutenberg.org/files/51090/51090-h/51090-h.htm', 'da', 'Arbeide har en bitter Rod, men söd Smag.', 'Danish proverbs · A', 'public_domain_1857_us')
ON CONFLICT (id) DO UPDATE SET
  topic = EXCLUDED.topic, keywords = EXCLUDED.keywords,
  text_en = EXCLUDED.text_en, text_ru = EXCLUDED.text_ru, text_es = EXCLUDED.text_es,
  kind = EXCLUDED.kind, source_author = EXCLUDED.source_author,
  source_work = EXCLUDED.source_work, source_url = EXCLUDED.source_url,
  original_language = EXCLUDED.original_language, original_text = EXCLUDED.original_text,
  source_locator = EXCLUDED.source_locator, source_license = EXCLUDED.source_license,
  updated_at = now();
-- Existing RLS and grants stay unchanged: anonymous/authenticated SELECT published only.
COMMIT;

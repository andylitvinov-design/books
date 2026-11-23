# My Coach · вступительная развилка и нулевая сессия профиля

## Канонический вход

Существующий шестишаговый протокол сохраняется: 1) согласие на сессию, 2) имя, 3) предыдущая или новая тема, 4) фокус, 5) самочувствие, 6) подтверждение начала. Запуск «Профиля» **не отменяет ни один из шести этапов**. Четыре лампы и шесть галочек по-прежнему принадлежат именно вступлению.

Проверка предыдущих коучинговых сессий использует только существующую `/api/app/my-coach/staged-memory`, с отдельным разрешением клиента на историю и на передачу выбранному AI-провайдеру. Неизвестная история **не равна** доказанному отсутствию сессий. До разрешения прошлого не вспоминаем и не придумываем.

После имени:
- Если разрешённая история содержит прошлую сессию, предложить продолжить её тему или начать новую; сохранённое имя отдельно подтвердить.
- Если предыдущая сессия не найдена или доступ к истории не предоставлен, предложить **Цель / Проблема / Личный профиль**. Без разрешения нельзя произносить «у нас точно нет прошлых сессий».
- Если выбрана цель или проблема, после обязательных шагов перейти к имеющемуся направлению методического коучинга без изменений.
- Если явно выбран личный профиль, после шага 6 перейти в отдельный диалог **«Личный профиль»**, не запускать GROW/WOOP досрочно.

## Нулевая сессия · личный профиль

Восемь осей (те же устойчивые ID, что и в новой утверждённой модели Personal: `anchor`, `connection`, `freedom`, `agency`, `love`, `dignity`, `self-realization`, `recognition`; старую видеотаксономию не переименовывать без миграции): **Опора, Связь, Свобода, Сила, Любовь, Достоинство, Самореализация, Признание**.

Каждая ось задаётся **одним вопросом за раз**: «От 0 до 10, сколько этой сферы в жизни сейчас и сколько хотелось бы?» Пример: «3 и 8». Голосовые числительные на русском, английском и испанском распознаются как две оценки. Ответ «пропустить» допустим. Не угадывать и не додумывать баллы. Оценки — субъективный чек-ин, не валидированный психологический тест.

После восьми осей: показать разницы «желаемое − сейчас» и колесо по реальным оценкам (пропуски не дорисовывать); мягко отметить положительные запросы на рост. **Нулевая сессия завершается самостоятельно и не запускает GROW автоматически.** Для постановки цели или проблемы — новая сессия. Никаких диагнозов и принудительных действий.

## Данные и согласие

- До отдельного сохранения вся текущая схема — только данные внутри открытой сессии.
- В существующий **просмотренный и явно сохранённый** коучинговый протокол можно добавить `profileCheckin`: оси, текущее, желаемое, дословное подтверждение и факт пропуска.
- Валидатор на сервере запрещает значения вне 0–10, подмену названий осей, несуществующую клиентскую цитату и ложную отметку о завершении.
- Старые протоколы без `profileCheckin` действуют без миграции. Функция не требует нового API, Supabase-таблицы, модели или оплачиваемого провайдера.

## Проверки

- Новый клиент: согласие → имя → профиль → подтверждение → 8 осей → резюме.
- Вернувшийся клиент: имя подтверждено → прежняя / новая тема.
- Цель и проблема продолжают обычную сессию.
- «Нет», пауза, пропуск и отсутствие согласия не трактуются как положительные ответы.
- Оценки словами RU/EN/ES, неверный формат, подделанная цитата и обычный протокол без профиля.
- Gemini Live: обе стадии в системном контракте и локальном checkpoint; клиентские ответы, а не AI-текст, определяют прогресс.
- LIVE требует отдельно: защищённого merge, штатной почасовой публикации и реального end-to-end smoke; наличие PR само по себе не значит LIVE.

## Session 0 v2 · review / completion of a saved profile (issue #5415)

A user may ask to check, refine, complete, or update a profile, including a phrase
mentioning both a "profile" and a "goal". This route remains a Session 0 profile
conversation, not an implicit GROW intervention.

1. Six consent/name/history/focus/feelings/confirmation gates remain. Existing
   `/api/app/my-coach/staged-memory` gives a signed, account/provider-bound,
   expiring ticket. After the profile access toggle is checked, the **private
   owner-facing** `personal.profileAudit` preview reads only client-reviewed,
   encrypted My Coach protocols. Missing access is *unavailable*, not zero.
2. `lib/coaching/coach-profile-review.mjs` merges the latest confirmed
   `current` and `desired` values separately per canonical eight-axis ID.
   Profile v1 and sparse v2 records are read together, with the source date.
   Up to six existing 20-record archive pages are inspected; an incomplete
   scan cannot declare absent values genuinely "missing".
3. Once a private preview has been read, the conversation starts asking only
   unfilled values. A completed axis is not repeated. A partially completed
   axis asks only for its absent half, accepts one clear number, and respects
   "skip". Earlier skipped axes are left alone by default.
4. The existing private Life Plan contributes only its owner-consented goals
   count and missing desired outcomes. The separate tests opt-in permits a
   bounded **recorded result metadata** overview, never treating it as a
   measurement of the meaning wheel. Detailed AI sharing remains governed by
   the separately reviewed grants and the existing provider privacy policy.
5. `profileCheckin` v2 stores **only the client-authored sparse updates** from
   the current reviewed and explicitly saved protocol. It rejects values
   outside 0–10, duplicate axes, fabricated quotations/numbers, and false
   completion claims. Older v1 protocols are untouched and still valid.
6. Client review is not model input: no raw transcripts, goal titles, audit
   values or test scores are forwarded to the LLM from this private preview.
   Normal selected-item provider grants remain separate. The goal/GROW
   message path stays disabled throughout Session 0, including completion.
7. After completing the gaps, the existing `/app/my-coaching-plan` and
   `/app/tests` pages provide optional next actions, without automatically
   enrolling a client or changing goals.

**Validation:** `tests/coach-profile-review.test.mjs` covers saved 5/8 → only
three questions, one-half saved scores, sparse update merge, skipped axes,
unreviewed history rejection, exact-quote/score validator, and privacy boundaries.
All EN/RU/ES copy remains explicitly authored. A merge or a green CI is not a
verified Live deployment: use only the existing hourly Vercel production
publisher and independently confirm the served production SHA and functional
flow in the client's authenticated account.

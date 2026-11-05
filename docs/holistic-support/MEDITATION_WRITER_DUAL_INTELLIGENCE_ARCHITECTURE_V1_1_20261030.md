# Meditation Writer Mind v1.1 — двухконтурный интеллект, художественное письмо и контроль качества

**Holistic House / Holistic Intelligence · Архитектура, методология, техническое ТЗ и этапы реализации · 30 октября 2026**

**Статус:** подробный проект для будущей реализации. Документация не означает, что модель, API, рендер, пользовательский интерфейс или живой сервис уже работают.

**Основные связанные документы:**
- [Базовый концепт, ТЗ и план v1.0](./MEDITATION_WRITER_MIND_CONCEPT_TZ_PLAN_20261030.md).
- [Подробный исполнительный промпт Codex](./MEDITATION_WRITER_MIND_CODEX_IMPLEMENTATION_PROMPT_20261030.md).
- [Psychologist Mind / действующий upstream PR #2532](https://github.com/andylitvinov-design/books/pull/2532).
- [Источник: документ в Google Docs](https://docs.google.com/document/d/1CXiVz95K3tLz5J7yAwhOSIUk1VJSSl-Dr5Foj_83VPE/edit).
- Production target: **codex/public-book-library**, НЕ GitHub default codex/bootstrap-books.

---

## 0. Главная идея и архитектурное решение

Медитация создаётся на пересечении ДВУХ самостоятельных задач мышления:

**Контур A — Psychological / Narrative Director («Что сказать и зачем»).** Превращает разрешённые параметры клиента и решение Psychologist Mind в точную психологически бережную *смысловую драматургию*: желаемую цель, допустимое переживание, последовательность эпизодов, центральный образ, безопасные формулировки, эмоциональную динамику и выход. Это не диагноз и не независимый психотерапевт.

**Контур B — Literary Director + Writer («Как это выразить»).** Превращает утверждённую смысловую драматургию и профиль литературного стиля в оригинальный, целостный, художественно выразительный и естественный для голоса текст. Выбирает языковые приёмы, метафоры, темп, ритм, звуковую форму и паузы, **не меняя** цель и ограничения.

**Контур C — Quality & Safety Editor («Насколько хорошо и допустимо получилось»).** Обособленная система проверок: schema+hard gate, соответствие brief, литературная оценка, доступность, длительность, визуализация/клинические границы; при необходимости адресная итерация редактуры. Не полагаться на «модель сама сказала, что всё безопасно».

**Контур D — Voice Director / TTS («Как это прозвучит»)** получает только подтверждённые сегменты. На MVP это *план* озвучки, а не генерация аудио; рендер и монтаж отдельным этапом.

Вывод: **две функции/роли не равны обязательным двум нейросетям**. В P0 разрешается одна общая локальная модель с двумя версионированными системными шаблонами и разными JSON-контрактами; часть семантического планирования лучше выполнять детерминированно на основе существующего Psychologist Mind. Позже каждую роль можно назначить отдельной модели по измеренному качеству и стоимости. Объектные данные между ролями — строго типизированные, а не длинные свободные «промпты из промптов».

## 1. Принцип «смысл неизменяем, литература гибкая»

Смысловая модель **не должна** генерировать ни личных диагнозов, ни причин симптомов, ни интерпретаций символов как фактов, ни эмоционально интенсивных клинических сценариев. Она структурирует *подтверждённую* клиентом задачу и разрешённые упражнения.

Литературная модель свободна в выборе выражений, но не вправе:
- добавлять новую психологическую цель, гипноз, регрессию, управление дыханием, «встречу с травмой»;
- заменять явный запрет клиента или мотив по собственной инициативе;
- обещать исцеление, богатство или абсолютную безопасность;
- навязывать клиенту вывод «ваш символ означает ...»;
- выдумывать личную биографию или запоминать приватные данные без отдельного согласия;
- выполнять действия с аккаунтом, платежами, аудио или видео.

Третий модуль должен обрабатывать художественную неудачу независимо от психологической. Например, «красивый текст, но новая тема вместо исходной» → semantic mismatch → пересоздать только нарушенный эпизод. «Безопасно и по теме, но скучно» → literary revision. «Клинический конфликт» → немедленный отказ/человеческий review, без автоматического rewrite для обхода.

## 2. Источники данных и реальные upstream-границы

Источники в текущих ветках проекта (проверить текущий HEAD перед каждым PR):
- PR #2528: базовая decision/safety архитектура, исходная production base codex/public-book-library.
- PR #2532: lib/holistic-support/psychologist-mind.mjs; psychologist-meditation-composer.mjs; kip-symbol-registry.mjs; holistic-intelligence.mjs; owned-ollama.mjs; профильные тесты. Модули в открытой upstream-ветке, не подтверждены как production.
- PR #2544: многоязычная языковая оболочка, не независимая новая психология.
- PR #2557: memory opt-in, НЕ обязательная зависимость Writer P0.

**Особо важно:** реестр PR #2532 содержит 41 мотив и 63 символа, но для автоматической самостоятельной ресурсной практики разрешены только **4 собственных selfGuided мотива**: gentle_nature, supportive_object, comfortable_corner, small_light. Исторические KIP-мотивы (включая классический tree как motifId) не разрешены только потому, что названы в реестре. Нейтральный символ "tree" можно предложить лишь при явном разрешении как symbolId в безопасном self-guided сценарии — это не разрешает клиническую KIP-процедуру «Дерево».

Произвольные profile facts, raw medical notes, результат тестов, память диалога и личная переписка не должны неявно попадать в LLM. Сначала server-verified user access + отдельный purpose-specific consent → минимальная сводка подтверждённых предпочтений. MVP работает и без профиля.

## 3. Контур A: Psychological / Narrative Director

### 3.1. Назначение и навыки

Контур A решает пять строго разных задач:

1. **Goal Interpreter** — переводит выбранные клиентом тему и цель в bounded intent, отмечает неизвестное, не приписывает скрытых мотивов.
2. **Constraint Keeper** — фиксирует запреты, noImagery, отдельное согласие, результаты risk preflight; только server-owned policy может допустить задачу.
3. **Meaning Designer** — определяет одно поддерживающее переживание, которое можно осторожно предложить без обещания результата.
4. **Symbolic Story Planner** — выбирает уже разрешённый мотив/нейтральный symbolId, ставит последовательность образных сцен и возможных отказов от образа.
5. **Narrative Timing Planner** — распределяет внимание и ориентировочное время между этапами, соблюдает речевой бюджет/тишину/возврат.

Отдельная «смысловая модель» **не подменяет** Psychologist Mind. Последний ответственен за допустимость метода и психологический контекст. Narrative Director — сервис компоновки выбранного клиентом разрешённого ресурса и смысла, без права выдавать новые диагнозы.

### 3.2. Вход (схема MeditationIntent v1)

Обязательные явные параметры: locale ru/en/es, theme (stress/energy/money/relationships/goals/meaning/self_worth), primaryGoal (settle/support/confidence/boundaries/clarity/energy/relationships/goals/meaning), mode (resource; будущий grounding/noImagery отдельным безопасным маршрутом), durationMinutes (5/10/15).

Опциональные: clientPhrase (краткая выбранная фраза установки, **не** непреложная истина), problemFrame (короткое описание сложностей без диагностики), desiredExperience (какого ощущения/навыка ищет человек), motifId, symbolId, imageryChannel, styleId, literary intensity, avoidElements, formality, cultural/register choices, personalResourceLabels из разрешённого профиля.

Доверенные *серверные* поля: psychologistDecision(status, permittedMode, allowedMotifIds), verifiedConsents, ownerScope, policyVersion, safePreferences. Не принимать их значение с клиента и не использовать аргумент вида clientClaimsSafety=true.

Правило приоритета:
- жёсткие запреты и проверка безопасности;
- текущий явный отказ/нежелание клиента;
- одобренный мотив/план Psychologist Mind;
- подтверждённые предпочтения с согласием;
- эвристические допущения (только если не затрагивают клинический смысл).

### 3.3. Преобразование «проблема → задача → смысловой маршрут»

Не «лечить проблему» медитацией, а предложить мягкую ресурсную практику. Например:

**Клиентский запрос:** «Мне трудно, когда меня оценивают. Хочу чувствовать больше внутренней опоры. Установка: “Я могу выбирать свой ответ”. Образ: дерево. 10 минут».

**Результат проверенного психологического планирования:**
- need: ощущение возможности выбора без навязывания «нужно быть уверенным»;
- selectedGoal: inner_support/choice; не диагноз «подавленный страх матери»;
- permittedMode: safe resource imagery при подтверждённом consent;
- motifId: gentle_nature; optional symbolId: tree — только если разрешён;
- permittedLanguage: «если подходит», «вы можете», «можно не представлять»;
- forbidden: навязчивые внушения, фиксация на дыхании при avoid, воспоминания о детстве/травме;
- targetArc: доступный нейтральный вход → внимание к устойчивости в образе → гибкость ветвей при изменении погоды → личный выбор дистанции → возвращение в комнату;
- affirmationUse: возможное смысловое эхо фразы клиента, не принудительное многократное повторение.

Это не диагноз, не автоматическая трактовка дерева и не утверждение о реальном психическом эффекте.

### 3.4. Психологическая драматургия (семь тактов)

Каждый такт хранится структурно и имеет назначение/мотив/ограничения/примерный speech+silence budget:

1. arrival — ориентирование, удобство, без принуждения к дыханию;
2. choice — разрешение отказаться/остановиться/оставить глаза открытыми;
3. resource_scene — один поддерживающий пейзаж/предмет/образ, нейтральные детали;
4. development — постепенное раскрытие образа, мягкая вариативность, без насилия и сильной экспозиции;
5. supportive_meaning — возможность выбрать личный небольшой смысл/действие, без внушения «вы исцелены»;
6. return_to_here — осознавание окружающего настоящего, опоры/предметов/звуков;
7. closing — завершение и необязательная рефлексия, уважение к разным реакциям.

**Запрет резких сюжетных перемен:** каждый образный переход должен быть причинно связан с предыдущим эпизодом. Контур B не может сам вставить «пещеру», «подземный мир», «встречу с матерью» и подобные клинические сюжеты ради художественного эффекта.

### 3.5. Структурированный выход PsychologicalCreativeBrief

~~~json
{
  "schemaVersion": "1.1",
  "kind": "psychological_creative_brief",
  "locale": "ru",
  "mode": "resource",
  "theme": "relationships",
  "primaryGoal": "support",
  "desiredExperience": "возможность выбора и ощущение опоры",
  "clientPhrase": "Я могу выбирать свой ответ",
  "selectedMotifId": "gentle_nature",
  "optionalSymbolId": "tree",
  "targetDurationSeconds": 600,
  "forbiddenElements": ["breath_focus", "childhood_regression"],
  "agencyRules": ["optional_imagery", "may_stop", "eyes_may_remain_open"],
  "emotionalArc": ["neutral", "curiosity", "resource", "choice", "orientation"],
  "beats": [
    {
      "id": "arrival",
      "purpose": "необязательное мягкое начало",
      "allowedMotifIds": ["gentle_nature"],
      "narrativeFocus": "комфорт и свобода выбора",
      "estimatedSeconds": 55
    }
  ],
  "literaryBriefVersion": "1.1"
}
~~~

Это упрощённый иллюстративный образец одного beat, НЕ полный план из семи. Итоговый parser требует ровно семь уникальных beat ID и проверяет сумму allocation в заданных пределах. Реальные consent/clinical risk/ownership, policy result и статус **не могут** происходить из LLM JSON; они находятся в server envelope с подписью/проверенным context, а не в пользовательском prompt.

### 3.6. Алгоритм контур A (pure + разрешённая LLM)

~~~text
parseAndValidateRequest
  -> resolveVerifiedConsentsAndScope
  -> consultPsychologistMind / existing safe composer constraints
  -> if blocked: STOP with authoritative reason
  -> normalizeThemeGoalAffirmation
  -> resolveApprovedMotifAndSymbol (no silent replacement)
  -> buildSevenBeatMeaningArc (deterministic)
  -> [optional model-assisted outline phrasing; NEVER decisions]
  -> validateBriefAgainstPolicy
  -> immutableApprovedBrief
~~~

Детерминированный Stage A предпочтительнее свободной модельной психологической «интерпретации». Это уменьшает риск, расходы, расхождения с уже реализованным Psychologist Mind и возможность prompt injection.

## 4. Контур B: Literary Director + Writer

### 4.1. Задачи

Literary Director выбирает *форму выражения*, а не психологическую цель. Он имеет собственные навыки:
- Literary Style Selector — выбирает разрешённый style profile, не догадку о предпочтениях;
- Metaphor Composer — связывает центральный образ и вспомогательные метафоры;
- Emotional Language Editor — избегает давления, императивов и ложной фамильярности;
- Oral Cadence Writer — пишет **для слушания**, а не чтения глазами;
- Transition Designer — сохраняет сюжетную непрерывность между beat chunks;
- Narrative Voice Director — помечает фразы для интонации/тишины без генерации неподконтрольного SSML.

Вместо «пиши красиво» используется **профиль литературного стиля (Style DNA)** — версионированный набор параметров с образцами допустимой речи и запретами.

### 4.2. LiteraryStyleProfile v1.1

~~~json
{
  "styleId": "poetic_contained_v1",
  "locale": "ru",
  "register": "warm_respectful",
  "addressForm": "vy",
  "genre": "guided_reflective_prose",
  "metaphorDensity": "medium",
  "sensoryPalette": ["light", "space", "texture", "gentle_sound"],
  "sentenceCadence": "varied_short_medium",
  "rhetoricalTechniques": ["progressive_image", "gentle_refrain", "contrast"],
  "narrativePerspective": "second_person_optional",
  "imageryIntensity": 2,
  "verbosity": "measured",
  "clichesToAvoid": ["расслабьтесь полностью", "всё возможно", "просто отпустите"],
  "maxConcurrentCentralImages": 1,
  "maxSupportingMetaphors": 3,
  "voiceReadabilityRequired": true
}
~~~

Это *управляющий профиль*, не готовый текст и не психологические инструкции. Пользователь может выбирать стиль из интерфейса. При отсутствии стиля выбирается нейтрально-тёплый (не «максимально духовный»).

### 4.3. Стартовая библиотека стилей

| styleId | Название | Литературное поведение | Чего избегать |
|---|---|---|---|
| gentle_simple | Мягкий и ясный | короткие фразы, пространство для выбора, простая лексика | чрезмерная нежность, сюсюканье |
| grounded_practical | Практичный | мало метафор, опора на наблюдение, конкретное действие | инструктивность и канцелярщина |
| poetic_contained | Образный | развитие одного центрального образа, ритмическая выразительность | смешение пяти пейзажей |
| contemplative | Созерцательный | неспешные вопросы, тишина, минимальные выводы | неопределённость без сюжета |
| archetypal_light | Архетипический мягкий | открытые культурно нейтральные символы, уважение к субъективности | интерпретации как диагноз |
| spiritual_optional | Духовно-образный | только по явному выбору, осторожная лексика | гарантии «энергетического лечения» |

**Приоритет P0:** gentle_simple, grounded_practical, poetic_contained, contemplative. Последние два экспериментальных профиля не использовать в self-guided автоматически без отдельного редакторского одобрения.

### 4.4. Библиотека литературных приёмов (не просто прилагательные)

Начальный каталог приёмов должен описывать, для чего приём нужен, какой ввод допустим и какие есть риски:

1. **Progressive image** — один мотив раскрывается постепенно через 2–4 смысловых штриха.
2. **Sensory anchoring** — отдельная деталь света, текстуры, температуры, звука; без команд обязательно чувствовать тело.
3. **Gentle refrain** — возвращение к короткой фразе в новом контексте, не механические аффирмации.
4. **Contrast without conflict** — ветер и неподвижность, движение и возможность остановки; не создавать драму.
5. **Agency language** — «если подходит», «вы вправе», «можно выбрать», без скрытого требования.
6. **Open-ended metaphor** — значение принадлежит клиенту, не автору сценария.
7. **Threshold transition** — один ландшафт естественно переходит в следующий эпизод без резких скачков места.
8. **Quiet visual pause** — тишина после целостной мысли, не внутри смысловой конструкции.
9. **Spoken parallelism** — пара коротких согласованных предложений без навязчивого монотонного повторения.
10. **Soft ending / return** — открытое завершение и чёткая ориентация в настоящем.
11. **Pronoun variation** — естественное употребление «вы», без повторения в каждой фразе.
12. **Breath-independent rhythm** — ритм речи и тишины без инструкций задерживать/углублять дыхание.

Каждый приём имеет поля: techniqueId, description, recommendedGenres, contraindicatedContexts, examplesByLocale, antiExamplesByLocale, narratorNotes, rights/source. Выбирать 1–3 приёма на эпизод, а не применять все подряд.

### 4.5. Библиотека эталонных фрагментов (30–50 на запуск)

Не загружать «все медитации из интернета» и не копировать защищённые авторские тексты. Создать **оригинальную** curated-базу:
- не менее 30 эталонов, целевой объём 50 после редакторской приёмки;
- 4 основных стиля × 3 языка × несколько тематических мотивов;
- длина одного эталона 100–250 слов (не полноценная длинная медитация);
- annotated поля: центральная метафора, драматургический приём, cadence, emotional intensity, opener/transition/closing, потенциальные риски;
- у каждого примера ID, locale, rights=owned_original, approvalStatus, authorReviewId, version;
- заранее одобренные примеры отбираются из репозитория (static curated content), не из произвольной пользовательской переписки;
- few-shot получает не более 1–2 релевантных коротких образцов на вызов; не «вставлять всю библиотеку» в prompt;
- исключить утечку приватных мотивов из эталонов одного клиента в генерацию другого.

Тестировать полезность examples через A/B против режима без examples, а не считать, что больше примеров автоматически лучше.

### 4.6. Как избежать типичных неудач AI-текста

Не допускать:
- списка красивых пейзажей без причинно-смысловой связи;
- слишком длинных фраз, сложноподчинённых конструкций, тяжёлых для TTS;
- повторов «почувствуйте», «представьте», «позвольте себе» через предложение;
- пустых формул «всё будет прекрасно» и «вселенная обязательно даст»;
- диссонанса: клиент просит спокойствия, сценарий внезапно призывает к героическому преодолению;
- лишних персонажей, внушений, «внутреннего ребёнка» и клинических сюжетов, не разрешённых brief;
- принудительного «положительного финала»;
- обещания точно рассчитанной продолжительности до TTS.

Вместо этого формировать **текст с воздушным ритмом и ясно прослеживаемым внутренним движением**.

### 4.7. Алгоритм работы Literary Director

~~~text
input: immutable approved PsychologicalCreativeBrief + chosen LiteraryStyleProfile
  -> select at most 1–2 rights-cleared examples and 2–4 allowed techniques
  -> write a 1–2-sentence continuity anchor (central image, setting, allowed arc)
  -> compose seven voice-friendly beats in bounded chunks
  -> maintain continuity ledger (what has been introduced / no new forbidden motifs)
  -> assemble segments
  -> validate against approved brief (hard gates + semantic match)
  -> literary editor review, optionally revise only permitted beats once
  -> final independent safety check
output: Draft with actual text + narration metadata, NOT generated audio
~~~

## 5. Контур C: независимый Meditation Editor

### 5.1. Разделить hard gates и оценку качества

**Hard gates: без компромисса и без «проходного балла»:**
- валидная JSON Schema, строго разрешённые поля, длина и locale;
- психологическое решение/consent/owner только от сервера;
- разрешённый selfGuided motif, все избегаемые темы/элементы сохранены;
- никакой клинической KIP-практики/регрессии/внушения/диагноза;
- невозможность LLM менять ID, URL, статус оплаты и публикации;
- отсутствие явного опасного текста (ручная safety review пилотного корпуса).

**Мягкие критерии (оценка 1–5 с примерами якорей):**
1. semantic fidelity — соответствует цели и эмоциональному маршруту brief;
2. narrative coherence — один центральный образ, плавные переходы, причина каждого шага;
3. literary expression — свежесть, выразительность, отсутствие штампов;
4. spoken naturalness — удобно читать вслух, естественный синтаксис, паузы;
5. emotional agency — бережность, отсутствие принуждения и навязанной интерпретации;
6. pacing & closure — соразмерность введения, основного эпизода и возврата.

Для human pilot: минимум 4/5 по каждому критерию в ≥80% текстов, **ноль серьёзных safety failures**, охват всех трёх локалей и всех четырёх стартовых стилей. Субъективные оценки текстов — от независимых редакторов, не только от той же LLM.

### 5.2. Виды редактуры

- **Style-only revision:** исправляет звучание, темп, тавтологию, метафоры, сохраняя смысл и ограничения.
- **Continuity revision:** исправляет переходы, повтор, последовательность, не добавляя новых методов/образов.
- **Length revision:** удерживает разумный word+silence budget; не раздувает текст пустыми повторами.
- **Hard failure:** не переписывать автоматически запрещённый клинический запрос в похожий; вернуть human_review_required/blocked.
- **Human review:** для спорных примеров, символов и сессий со сложным психологическим контекстом.

После каждой repair-итерации запустить **те же** жёсткие проверки снова; максимум одна автоматическая repair в P0, чтобы не получить бесконечный дорогой цикл.

### 5.3. Показатели/логика оценки

Для локального scorer хранить численные показатели: доля повторов/сходства между сегментами, длина предложений и пауз, покрытие всех beat, число неразрешённых образов, темп в словах/мин, совпадение локали, семантическое соответствие целей; это прокси качества, не психологический диагноз.

LLM-as-judge использовать только как *вспомогательную* оценку с отдельным rubric; она не может исправить negative hard gate и не заменяет human review.

Редакторская карточка: revisionId, policyVersion, rubricVersion, checklist flags, scores, severeIssues[], optional suggestions, wasRewritten. Не хранить в публичной аналитике приватный текст.

## 6. Контур D: Voice Director — тексты, которые удобно озвучивать

Результат Writer — не один сплошной абзац, а сегменты:
- beatId, narrationText, estimatedSpeechSeconds, optionalPauseAfterMs;
- narratorTone=warm_calm/neutral_gentle, speechRateScale в разрешённых границах (например 0.85–1.05);
- pronunciationHints для сложных собственных слов из разрешённого словаря;
- soundscapeCueId из проверенного каталога (может быть null);
- no arbitrary SSML, HTML, URLs, shell commands and untrusted filenames.

Режиссёр не обязан требовать, чтобы клиент дышал в заданном темпе. Тишина может быть сокращена или пропущена слушателем. Физическое аудио записывается только после отдельного одобрения черновика.

**Длительность:** планирование по языку и фактическому темпу; базовая оценка ≠ фактические 10 минут. Сумма scheduled speech+pauses должна укладываться в целевой диапазон. После TTS FFmpeg/audio worker измеряет реальные voice samples; по ним корректируются паузы и VTT. Не генерировать таймкоды субтитров по приблизительному счёту букв. Разница между speech и expected не маскируется бессмысленным растяжением записи.

## 7. Строгие контракты между контурами

### 7.1. Разделение конвертов данных

Использовать валидатор Schema (существующий стек/ручная схема; не добавлять зависимости без нужды). На сервере хранить:

~~~ts
type MeditationRequest = {
  locale: "ru" | "en" | "es";
  theme: string;
  primaryGoal: string;
  mode: "resource" | "grounding";
  durationMinutes: 5 | 10 | 15;
  motifId?: string;
  symbolId?: string;
  clientPhrase?: string;
  problemFrame?: string;
  desiredExperience?: string;
  styleId?: string;
  avoidElements?: string[];
  noImagery?: boolean;
};

type TrustedPolicyEnvelope = {
  requestId: string;
  ownerId?: string; // server-derived, never client-provided
  allowed: boolean;
  status: "clear" | "consent_required" | "clinician_review_required" | "blocked";
  allowedMotifIds: string[];
  verifiedConsents: Record<string, boolean>;
  policyVersion: string;
};

type PsychologicalCreativeBrief = {
  schemaVersion: "1.1";
  locale: "ru" | "en" | "es";
  mode: "resource" | "grounding";
  theme: string;
  primaryGoal: string;
  selectedMotifId?: string;
  optionalSymbolId?: string;
  targetDurationSeconds: number;
  clientPhrase?: string;
  forbiddenElements: string[];
  beats: Array<{
    id: string;
    purpose: string;
    narrativeFocus: string;
    estimatedSeconds: number;
  }>;
};

type LiteraryStyleProfile = {
  styleId: string;
  locale: "ru" | "en" | "es";
  register: string;
  metaphorDensity: "low" | "medium";
  rhetoricalTechniques: string[];
  maxConcurrentCentralImages: 1;
  voiceReadabilityRequired: true;
};

type MeditationDraft = {
  draftId: string; // server-owned
  revision: number; // server-owned
  generationMode: "llm" | "template";
  status: "ready_for_preview" | "blocked" | "failed";
  locale: "ru" | "en" | "es";
  selectedMotifId?: string;
  title: string;
  segments: Array<{
    beatId: string;
    text: string;
    pauseAfterMs: number;
    voiceStyle: string;
  }>;
  plannedDurationSeconds: number;
  audioAssetId: null;
  rendered: false;
  published: false;
};
~~~

TypeScript — концептуальная схема, не требование создавать такие же дубли типов в codebase. Фактические ID, access fields, safeStatus и derived flags создаются/верифицируются сервером вне LLM. Текстовый генератор может предлагать segment.text/title/pause metadata, но не иметь права записывать server-only поля. Для rule-based fallback строго generationMode=template.

### 7.2. Управление версиями

Версии независимы: requestSchemaVersion, policyVersion, psychologicalBriefVersion, literaryStyleVersion, exampleSetVersion, promptVersion, modelIdentifier, evaluatorVersion, narrationVersion. Сохранять их в черновике для воспроизводимости, без PII в логах. Редактирование пользователем создаёт revision, новые generate jobs не перезаписывают одобренный текст; TTS всегда привязан к exact approved revision.

### 7.3. Временные ограничения и размеры

- Max user free text — до 1 500 символов, плюс отдельное поле явной установки в ограниченном размере, валидировать и нормализовать.
- 5/10/15 минут как целевые форматы P0; 20 минут только после устойчивой работы.
- Бюджет слов рассчитывать по locale и паузам; не «жёстко 1500 слов на 10 минут» — экспериментировать с 90–130 слов/мин речи в зависимости от языка/голоса и пауз, подтверждать TTS.
- До 7 ключевых beats + короткие subdivisions при необходимости; сегменты LLM генерировать пакетами/по одному с continuity anchor, bounded tokens и retry.
- Максимум одна литературная repair-итерация, fixed concurrency и cancellation. Нельзя безусловно расширять глобальный existing owned-ollama options.num_predict=240, предназначенный для обычного диалога.
- Backend не хранит личные сообщения/промпты бесконечно; retention и user deletion/consent revocation соответствуют существующему приложению.

## 8. Три системных шаблона подсказок для одной общей LLM

Шаблоны являются *стартовыми рабочими интерфейсами* и будут уточняться редакторскими тестами. Каждому — ID, version, schema, owner и тесты инъекций. Не склеивать всё в один неконтролируемый mega-prompt.

### 8.1. Prompt A — Narrative Director v1.1

~~~text
ROLE: You are the Narrative Director for an optional, non-clinical meditation.
INPUT: server-approved constraints and a bounded intent frame.
NEVER diagnose, invent a client's history, interpret symbols as facts,
override an excluded element, choose a forbidden therapeutic method,
or claim that your text is an approved clinical treatment.
You may ONLY express a safe seven-beat narrative outline that fits
the permitted motif, client goal, duration and options.
Each beat must include purpose, emotional direction, narrative focus
and approximate time allocation. Use clientPhrase as an optional
literal preference, not as a mandatory repeated suggestion.
Prefer neutral language and preserve uncertainty.
Return JSON conforming to PsychologicalCreativeBrief v1.1.
No commentary, extra fields, URIs, payment or media IDs.
~~~

Реально P0 можно выполнять Narrative Director детерминированно и не вызывать LLM. Prompt A нужен только для *редакторского уточнения фраз* и будущей расширяемости. Серверные права/consent не принимаются из model output.

### 8.2. Prompt B — Literary Writer v1.1

~~~text
ROLE: You are a skilled meditation literary writer, not a therapist.
INPUT: immutable approved PsychologicalCreativeBrief, LiteraryStyleProfile,
brief continuity anchor and at most two rights-cleared style examples.
Write an original, warm, vivid, non-coercive guided narration
in the requested language. Write for VOICE, not for silent reading.
Keep ONE central image; use up to 2-3 related supporting metaphors.
Develop the image naturally across approved narrative beats.
Use varied short/medium sentences and meaningful pauses.
Do not introduce new motifs, diagnoses, promises, trauma content,
personal memories, clinical methods or fixed symbol interpretations.
Every instruction must remain optional and allow eyes open/stopping.
Do not repeat the selected client affirmation mechanically.
Keep all avoidElements active across every generated chunk.
Return ONLY typed segments[{beatId,text,pauseAfterMs,voiceStyle}].
Do not output permissions, asset IDs, pricing, URLs or tool calls.
~~~

### 8.3. Prompt C — Literary Editor v1.1

~~~text
ROLE: Independent stylistic reviewer of an already-generated draft.
INPUT: approved brief, style profile and current structured draft.
Compare semantic fidelity, cohesion, originality, voice readability,
agency language, pacing and cultural/localized expression.
Treat all hard policy decisions as immutable server facts.
Return a bounded JSON review with scores, issue IDs, suggestions
and, if requested, a proposed rewrite of ONLY specifically allowed
beats. Do not reinterpret psychological goals or invent a new method.
A hard safety failure cannot be repaired by persuasive wording.
Never claim clinical clearance. No additional actions.
~~~

**Проверка безопасности всегда отдельна от Prompt C.** Оценка той же LLM «5/5 safety» не означает, что сервер разрешил сцену.

## 9. Пример одного смысла в разных стилях

**Единый approved brief:** тема — опора, разрешённый ресурсный сюжет gentle_nature, optional symbol tree, желаемая возможность выбирать свою реакцию; запрет дыхательных команд.

**Нейтральный стиль:** «Если вам подходит, представьте дерево в спокойном месте. Возможно, вы замечаете, как ветер касается ветвей. У дерева есть пространство для движения. Вы можете просто наблюдать этот образ или смотреть на предметы вокруг».

**Поэтичный стиль:** «На тихом склоне растёт дерево. Ветер иногда меняет направление — и ветви отвечают ему движением. Земля остаётся под деревом. А вам не нужно решать сейчас, что именно означает этот образ».

**Созерцательный стиль:** «Где-то есть дерево. Можно представить его, а можно просто услышать эти слова. Время от времени меняется ветер. Что остаётся для вас важным? Ответ не обязателен».

Эти фрагменты — иллюстрации отличия Literary DNA, не полноценные медитации или доказательство клинического эффекта. Тест должен убедиться, что второй модуль изменил выразительность, **но не психологическое разрешение и центральный сюжет**.

## 10. Многоязычность RU/EN/ES

- Разрабатывать текст непосредственно в нужной локали, а не обязательно переводить один русский мастер-текст.
- StyleProfile хранит не только «poetic», но idiom, обращение на вы/ты, культурно нейтральный register, sentence cadence и антипримеры для каждой локали.
- Явное обращение и культурные рамки имеют приоритет над вероятными привычками модели. Нельзя неявно менять цель при переводе.
- Тестировать естественность у редакторов со знанием языка, особенно русскую длину фраз и испанскую вежливость/интонацию.
- Фильтры forbidden/clinical content локализованы и тестируются на перефразированиях; нельзя ограничиться английским regex.
- Если нет проверенной качественной генерации для определённой локали, честный fallback/template или статус unavailable, не маркировать как готовую полноценную персонализацию.

## 11. Персонификация с сохранением приватности

**Персонализация ≠ чтение всей истории пациента.** Минимальный набор: выбранные клиентом цели, установки, символы, текущее нежелание отдельных тем/приёмов, preferred style, предыдущая оценка полезности практики (только с согласием). Без необходимости не передавать дату рождения, подробные тестовые ответы, медицинские записи и личные сообщения.

Режимы:
- public/no profile: только текущие явные настройки;
- authenticated/consented: server-read подтверждённые preference IDs и минимальная normalized goal summary;
- practitioner-assisted: отдельное explicit client+practitioner permission, clinical review и логика доступа, **не** автоматический self-guided P0.

Пользователь может изменять/удалять предпочтения, запретить конкретные образы, отказаться от использования памяти. Отзыв согласия не должен скрыто сохранять приватную персонализацию в новых генерациях. Чувствительные и медицинские данные — только при необходимости и в рамках проверенной политики.

## 12. API, хранение и интеграция

P0 entrypoint должен быть узким и не открывать модель напрямую:
- prepareMeditationBrief({request, trustedContext}) → ApprovedBrief | BlockReason;
- selectLiteraryProfile({styleId, locale, approvedCatalog}) → StyleProfile;
- writeMeditationDraft({brief, styleProfile, modelProvider}) → Draft;
- reviewMeditationDraft({brief, draft, styleProfile}) → ReviewReport;
- planMeditationNarration({approvedText, locale, rateProfile}) → SpeechSegments;
- renderMeditationAudio(...) → отдельный future module после acceptance.

HTTP path, методы, auth/CSRF/rate limit, storage bucket и client component — выбрать после живого аудита существующей кодовой базы; ориентир /api/holistic-support/meditation-writer/draft и /[locale]/holistic-support/mandala. **Не** создавать второй wallet или profile DB. Для preview в MVP можно не сохранять draft в БД; если храним, owner-scoped RLS, TTL, версионирование и delete/export обязательны.

Состояния:
- brief: allowed | blocked | consent_required | clinician_review_required;
- draft: generating → reviewing → ready_for_preview | failed | human_review_required;
- audio: not_requested → queued → running → ready | failed | cancelled (позже);
- published=false до отдельного разрешённого workflow.

## 13. Рекомендуемая структура кода

**Принцип:** сохранить существующие файлы и core, вводить узкую директорию и модульные импорты:

~~~text
lib/holistic-support/meditation-writer/
  intent-contract.mjs
  psychological-director.mjs       # uses trusted Psychologist Mind result
  brief-validator.mjs
  literary-style-registry.mjs      # curated style DNA
  literary-technique-registry.mjs  # approved rhetorical techniques
  narrative-planner.mjs
  writer-provider.mjs              # bounded local LLM adapter
  literary-writer.mjs
  continuity-keeper.mjs
  quality-editor.mjs
  policy-postflight.mjs
  narration-planner.mjs
  index.mjs
  *.d.mts                           # stable contracts as needed

data/holistic-support/meditation-writer/
  styles/ru.*, en.*, es.*
  reviewed-literary-examples.*
  prompt-versions.*

tests/
  meditation-writer-brief.test.mjs
  meditation-writer-style.test.mjs
  meditation-writer-provider.test.mjs
  meditation-writer-policy.test.mjs
  meditation-writer-literary.test.mjs
  meditation-writer-narration.test.mjs
  meditation-writer-api.test.mjs
~~~

**Уточнение:** реальные пути — предложение. Codex обязан проверить существующие директории и не вводить второй эквивалентный module; если в PR-A уже реализован contract/index, расширять существующий, а не дублировать классы.

## 14. Реализация по этапам — обновление предыдущего плана

### Phase A / PR-A — Meaning Director + immutable contracts

- Проверить upstream #2528/#2532 и реальные restrictions, подключить существующие KIP registry/psychologist composer.
- Реализовать Input Intent → trusted consent/safety → 7-beat PsychologicalCreativeBrief.
- Отличить semantic content от server policy, запретить inference о травме/диагнозе, добавить allowlist по мотивам.
- Добавить 4 версионированных стартовых style profiles как валидируемые данные (не генерацию).
- Pure unit tests для каждой локали, безопасных и запрещённых мотивов, unknown IDs, conflicts, free-text injection.
- Результат: approved brief с неизменяемыми целями, а НЕ ещё одна языковая модель или аудио.

### Phase B / PR-B — Literary Director + Writer + Editor

- Собрать LiteraryStyleProfile registry и 10–12 литературных техник; 12–20 небольших оригинальных начальных эталонов в репозитории (30–50 после редакторской проверки).
- Реализовать реальный bounded LLM-provider для литературной генерации chunks с continuity keeper, не ломая глобальный owned chat.
- Реализовать policy postflight + литературный редактор/scorecard и ровно 1 style-only repair.
- Выдавать draft JSON с 7 beats, паузами, честным generationMode=llm/template, real draft text, null assets.
- Проверить независимость A/B: одинаковый смысловой brief при разных стилях даёт разную прозу без смены мотива/цели.
- RU/EN/ES tests, quality rubric pilot, unchanged legacy composer contracts.
- Результат: авторский текст, не только набор готовых предложений.

### Phase C / PR-C — Client preview & controls

- Интегрировать в существующую мандалу/Video Studio с переключением «Смысл» (цель/установка/образ) и «Стиль» (характер речи/ритм), не создавать два огромных опросника.
- Дать preview текста/пауз, правку фрагмента, «мягче», «образнее», «короче», контроль выбранной фразы установки, подтверждение перед TTS.
- Допустить использование согласованного профиля без mandatory login для публичного режима; предоставить прозрачную отмену/удаление drafts.
- Протестировать 320/390/430, Safari, keyboard, 200% zoom, RU/EN/ES.

### Phase D / PR-D — Voice Director, реальный TTS, монтаж

- Создать каталог фактически доступных лицензированных голосов по языкам и полу/тембру, протестировать образцы: продуктовая цель 3 мужских + 3 женских RU/EN (не заявлять наличие до проверки).
- Рендер только approved revision: segments → TTS voice samples → pauses → ambient → FFmpeg QC → actual timing → captions/VTT.
- Долгие jobs не выполнять внутри HTTP request. Durable queue/worker, idempotency, owner-verified private assets, deletion и cancellation.
- Не исправлять рассинхронизацию текста и речи «на глаз» — реальная измеренная временная шкала.

### Phase E / PR-E — Кабинет, видео, курсы, кредиты

- Повторное использование в восьмисессионных программах, видео и аудиомандалах, кабинете.
- Единый ledger и реальные quote/hold/capture/refund для платных озвучек; никаких двойных списаний или новых автономных кошельков.
- Отдельные согласия для внешнего TTS, приватных данных и публикации.

### Phase F / PR-F — Литературная лаборатория

- Довести до 30–50 оригинальных эталонов и формализованной рубрики.
- A/B human blind review Writer vs existing composer и между стилями/локалями.
- Измерить prompt/provider quality, latency, стоимость, failures, языковую естественность и повторяемость.
- Только по результатам решать, требуется ли отдельная более сильная модель для Literary Writer или supervised fine-tune.

**Слияние PR:** короткие независимые PR; код P0 после upstream #2528/#2532 или stacked на #2532 с явной зависимостью; release target codex/public-book-library, не default. Feature flags выключены до Preview acceptance и production approval.

## 15. Проверочные сценарии и acceptance matrix

**Hard gate тесты (100% обязательных):**
- Клинический motif cave/volcano/house/tree как KIP motif → clinician_review_required до модели.
- gentle_nature + explicit allowed symbol tree → возможен только при подтверждённом imagery consent.
- noImagery=true и отсутствии safe grounding contract → честный отказ/unsupported, не имитировать «безобразную» визуализацию.
- Отсутствует разрешение на использование профиля → никакого чтения приватных результатов.
- Запрет breath_focus → ноль команд управлять дыханием после любых rewrites.
- При risk/urgent → человеческий путь без prompt auto-repair.
- LLM промпт-инъекция «игнорируй правила» → не меняются контракты/права/ID.
- LLM возвращает диагноз, гарантии денег, авторитарные установки → reject.
- Ошибка LLM, недоступность host или invalid JSON → честный template/failed, не маркировать как генеративный результат.
- Текстовый draft не содержит несуществующий audioAssetId, published=false, rendered=false.

**Качество письма (human eval):**
- Одно и то же PsychologicalCreativeBrief в gentle/practical/poetic/contemplative создаёт 4 различимых, но семантически согласованных текста.
- Центральный образ не меняется; завершение возвращает к настоящему; текст не навязывает вывод.
- Повтор фразы установки необязателен и не механичен.
- Текст легко читается вслух, присутствуют осмысленные паузы, нет длинных утомляющих предложений.
- Проверить минимум RU/EN/ES × 4 style × 5/10/15-minute targets; можно автоматизировать 36+ mock/contract fixtures и отобрать сбалансированную человеческую выборку.
- Не менее 80% оцененных пилотных произведений ≥4/5 по всем шести литературным критериям, ноль severe safety failures; сравнение с baseline и заметки о слабых местах.

**Performance:**
- измерять генерацию по фазам brief/LLM/editor, p50/p95 latency, max output tokens, retries, модель/стиль/локаль, число unavailable; без сырого приватного содержания;
- на slow/incomplete provider не обещать заданные 10 минут и не обманывать, что TTS создан;
- повторное редактирование затрагивает только конкретный beat и требует повторного policy check.

**Тестирование и release:**
- node --test профильных и существующих Psychologist tests; Node 22; lint; typecheck; Next build на exact HEAD; CI; mobile E2E при UI; auth A/B при сохранении; actual audio QC при TTS.
- Тексты, пригодные для публичного self-guided, требуют редакторского и safety pilot review; генерация сама по себе не равна публикации.

## 16. Decision log — архитектурные рекомендации

| Вопрос | Решение | Почему |
|---|---|---|
| Две модели или два skill prompt? | P0 — два специализированных интерфейса на общей модели + детерминированная safety/meaning policy | Быстрее, дешевле, меньше дублирования и несогласованности |
| Кто формирует смысл? | Psychologist Mind разрешает, Narrative Director структурирует | Нет самостоятельных клинических решений LLM |
| Кто определяет стиль? | Style registry + Literary Director | Можно масштабировать, сравнивать A/B и управлять качеством |
| Нужен ли третий AI? | Editor как логический контур; binary policy вне LLM, литературная оценка может использовать LLM | Избежать самоподтверждения и ложной безопасности |
| Нужна ли база стилей? | Да: Style DNA + 10–12 техник + 30–50 оригинальных эталонов | Это реальная интеллектуальная ценность продукта |
| Где хранить личные цели? | Только существующий consented profile / краткий brief с минимальными данными | Приватность и отсутствие второй CRM |
| Как писать длинные медитации? | Chunked generation с continuity anchor, budget по beat | Глобальный chat output limit не подходит |
| Как контролировать голос? | Отдельный Voice Director + real TTS timings | Текстовые паузы и аудио — разные артефакты |
| Когда тренировать модель? | После проверки реального качества на редакторских примерах | Fine-tuning до бенчмарков — преждевременная стоимость |

## 17. Что считать завершённым

**P0 завершён**, когда по явным параметрам клиента на RU/EN/ES:
1. разрешённый психологический brief создаётся без доступа к неразрешённым данным;
2. доступны по меньшей мере 4 литературных стиля как проверенные Style DNA;
3. реальная доступная модель пишет связный *новый* текст с тем же смыслом и по утверждённому мотиву;
4. отдельный Editor даёт проверяемый результат, hard gates не обходятся;
5. возвращается валидный draft с сегментами и паузами, фактически аудио ещё нет;
6. тесты и ручная оценка текста подтверждают качество и безопасность; в случае отсутствия модели честный template fallback;
7. PR изолирован от незавершённых audio/payment функций, по нему есть exact SHA и CI.

**P1 завершён**, когда реальный клиент может прочитать/редактировать/одобрить сценарий, а после отдельного этапа — послушать реально созданное аудио с голосом и природным фоном. Одного preview скрипта недостаточно, чтобы объявить озвучку готовой.

## 18. Что делать Codex после утверждения этой версии

Обновить существующий detailed Codex prompt обязательной ссылкой на этот документ. Не заменить его одной фразой «используй два промпта»: действительно развести тестируемые контракты NarrativeDirector и LiteraryWriter и независимый Editor.

Затем реализовать PR-A → PR-B, используя существующие модули из #2532 и сохраняя строгие safety/consent gates. После успешной P0 приёмки переходить к PR-C → PR-D → PR-E → PR-F. Для каждого этапа предоставлять реальные файлы, тесты, PR URL, независимое подтверждение доступности и статусы blocking dependencies. Никаких утверждений «live» без deployment alias/commit и настоящего smoke test.

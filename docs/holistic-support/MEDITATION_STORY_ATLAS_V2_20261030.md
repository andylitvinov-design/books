# Holistic House · Meditation Story Atlas v2
**30 октября 2026 · рабочая спецификация и реализованная локальная библиотека**

## Назначение

Расширение `Psychologist Mind` и будущего `Meditation Writer Mind`: не только восемь шаблонных упражнений, а широкая библиотека **оригинальных безопасных сцен, метафор и драматургических последовательностей**. Каждый текст формируется из подтверждённого запроса, согласий, выбранной темы и текущего этапа 8-сессионной поддержки.

**Создано:** 32 оригинальные ресурсные сцены, 12 профессиональных референсов, 40 оригинальных метафор, 8 профессиональных тем, 12 сюжетных композиций. Совокупно **104 новых редакционных элементов RU/EN/ES**. Существующие 41 KIP-мотив и 63 ключевых символа остаются в отдельном справочнике и не смешиваются с публичными сценариями.

## Разделение ответственности

```text
REQUEST + CONSENT + CURRENT EIGHT-SESSION PROGRAM
    ↓
Psychologist Mind — goal and current objective, trusted preflight
    ↓
Narrative Selector — scene + metaphor + story arc
    ├─ explicit user choice wins if safe
    ├─ purpose and session relevance
    ├─ avoidElements / unwanted themes
    └─ recent IDs and variationIndex to avoid repetition
    ↓
Original Meditation Composer — seven localized narration blocks
    ↓
Safety/Editorial Gate → Voice Blocks (text + approximate pauses)
    ↓
Separate future TTS / music / media publication integration
```

**Три слоя:** образ задаёт конкретную сцену (например, свет у окна), метафора мягко связывает переживание с возможным изменением (закладка / компас / ограда), сюжетная арка определяет тон перехода (опора / выбор / ценности / завершение). Это редакционные подсказки, а не интерпретации бессознательного или клинические гипотезы.

Для классической кататимно-имагинативной психотерапии (KIP) важен терапевтический диалог, подбор мотива и переработка переживания специалистом; сценарий из каталога не равнозначен KIP. Источник: https://igkip.org/en/what-is-kip/.

Для мягких навыков поддержки использована общая направленность упражнений WHO — заземление, дистанцирование от мыслей, действия по ценностям и доброжелательность к себе, **не дословные тексты или копии**: https://www.who.int/publications/i/item/9789240003927. NICE отдельно подчёркивает, что травма-фокусированная терапия требует подготовленных специалистов и подходящих протоколов: https://www.nice.org.uk/guidance/ng116/chapter/recommendations.

## Алгоритм подбора

**Входы:** `focus` (`stress / relationships / self_worth / meaning`), `intentionCode` (базовые девять тем плюс `work`, `money`, `change`, `creativity`, `rest`), `sessionNumber` (1–8), `sceneId`, `metaphorId`, `storyArcId`, `variationIndex`, `historySceneIds`, `historyMetaphorIds`, `locale`, `preferences`, раздельное `consent.resourceImagery`.

1. Перед любым вызовом сервер должен подтвердить `safety`, доступ к профильным данным и согласия. Нельзя принимать `safety.status=clear` или `ownerScoped=true` из браузерного JSON как достоверный факт.
2. Явный выбор сцены / метафоры / арки применяется первым, **только если запись существует и имеет `selfGuided=true`**. Неизвестный либо клинический ID возвращает отказ, не заменяется произвольно.
3. Если выбор не задан, selector сопоставляет `intentionCode`, `objectiveCode` текущей сессии, предпочитаемый канал и нежелательные темы. История ограничивается списком ID, без сырых клиентских сообщений.
4. При повторных сессиях selector понижает приоритет использованных сцен / метафор и меняет подачу на основе `sessionNumber`.
5. `style=poetic` использует более образный переход; `style=practical` уменьшает количество метафор. Отдельное `preferences.noMetaphor` отключает автоматическую метафору, но не препятствует явно выбранной клиентом безопасной.
6. Составляются семь текстовых блоков: прибытие / право выбора / сцена / открытое исследование / возможный шаг / возвращение в настоящее / завершение.
7. `voiceSegments[]` отделяют текст для речи от инструкций паузы. `plannedDurationSeconds` — **приблизительный план**, не факт реальной длины аудио; точный timing проверяется после TTS.
8. `task=meditation_series` вызывает генератор восемь раз с целями соответствующих занятий и предотвращением повторов; все результаты остаются **неопубликованными черновиками**.

### Безопасность

- Допустимы только отдельно проверенные **оригинальные низкоинтенсивные образы**; 12 тематических образов (детская комната, подземелье, маска, опасное животное и т.д.) не имеют публичного narration и никогда не попадают в автономное проведение.
- Нет навязанной регрессии, обращения к якобы подавленным воспоминаниям, фантазий о насильственном противостоянии, интерпретаций конкретного символа как диагноза или указания на конкретного родственника.
- `avoidElements` поддерживает `touch`, `water`, `animals`, `darkness`, `people`, `body_scan`, `fire`, `height`, `crowds`, `enclosed_spaces`, `travel`, `spiritual_symbols` и общие отказы от дыхательного фокуса и закрытых глаз.
- Клиент всегда может пропустить или остановить практику; просмотр готового аудио в будущей реализации требует **новой проверки безопасности перед каждой сессией**.
- Не заявлять медицинской эффективности собственных курсов. Персонализация не означает диагностику.
- Связь символа с переживанием устанавливается клиентом, не словарём фиксированных толкований.

## API

```js
import { consultPsychologistMind } from "./lib/holistic-support/holistic-intelligence.mjs";

// В реальном приложении trustedPreflight/verifiedConsents приходят
// исключительно из защищённого серверного слоя, не из браузерных флагов.
const context = {
  locale:"ru",
  safety:trustedPreflight,
  access:serverVerifiedAccess,
  consent:verifiedConsents,
  intent:{focus:"relationships",intentionCode:"boundaries"},
  preferences:{style:"poetic",avoidElements:["water","darkness"]}
};
const catalog = consultPsychologistMind({...context,task:"story_library"});
const meditation = consultPsychologistMind({...context,task:"meditation",
  intent:{...context.intent,sceneId:"garden_gate",
    metaphorId:"garden_fence",storyArcId:"space_for_choice",sessionNumber:4}});
const series = consultPsychologistMind({...context,task:"meditation_series"});
```

Ожидаемые контракты: `story_library` → `scenes/metaphors/arcs`, `meditation` → `script/segments/voiceSegments`, `meditation_series` → `scripts[8]`. В каждом случае media `rendered=false`, `published=false`. Права, фактическая озвучка, качество визуального ряда и доступность требуют отдельной приёмки.

## Примеры драматургии

**Тревожность, ранняя стабилизация:** дневное окно → небольшая закладка как право на паузу → «что можно заметить сейчас?» → возвращение к реальному помещению.

**Отношения и границы:** садовая калитка → ограда как метафора личной границы → выбор дистанции, не требующий ни конфликта, ни полного разрыва.

**Самооценка и выбор:** семя в маленьком горшочке → забота без спешки → одно посильное действие без оценки себя по результату.

**Цели, работа и деньги:** карта или компас → «направление не равно приказу» → маленькое ценностное действие без обещаний дохода.

## Полный каталог изображений (44)

| ID | Русский образ / метафора | Темы | Доступ |
|---|---|---|---|
| `morning_window` | Утреннее окно | settle, support | самостоятельный ресурс |
| `garden_bench` | Скамья в саду | settle, relationships, support | самостоятельный ресурс |
| `wooden_table` | Деревянный стол | clarity, goals | самостоятельный ресурс |
| `library_nook` | Уголок библиотеки | clarity, meaning | самостоятельный ресурс |
| `sunny_meadow` | Солнечная поляна | settle, energy, support | самостоятельный ресурс |
| `seed_in_pot` | Семя в горшочке | confidence, energy, goals | самостоятельный ресурс |
| `stone_in_sun` | Камень на солнце | settle, support, confidence | самостоятельный ресурс |
| `cloud_opening` | Просвет в облаках | clarity, settle | самостоятельный ресурс |
| `balcony_plants` | Растения на балконе | self_worth, relationships | самостоятельный ресурс |
| `folded_blanket` | Сложенный плед | support, settle | самостоятельный ресурс |
| `small_lamp` | Небольшая лампа | clarity, meaning | самостоятельный ресурс |
| `blank_notebook` | Чистая страница | goals, confidence, meaning | самостоятельный ресурс |
| `map_on_table` | Карта на столе | goals, clarity, meaning | самостоятельный ресурс |
| `compass` | Компас | meaning, goals, confidence | самостоятельный ресурс |
| `waymarkers` | Небольшие указатели | goals, clarity | самостоятельный ресурс |
| `garden_gate` | Садовая калитка | boundaries, relationships, confidence | самостоятельный ресурс |
| `mosaic` | Цветная мозаика | self_worth, clarity, meaning | самостоятельный ресурс |
| `painter_palette` | Палитра красок | relationships, self_worth, clarity | самостоятельный ресурс |
| `shelf_choices` | Полка возможностей | boundaries, clarity, goals | самостоятельный ресурс |
| `bridge_view` | Мостик издалека | goals, confidence, boundaries | самостоятельный ресурс |
| `daytime_shore` | Берег в дневном свете | settle, energy | самостоятельный ресурс |
| `orchard` | Садовая тропинка | confidence, self_worth, goals | самостоятельный ресурс |
| `wildflowers` | Полевые цветы | relationships, self_worth | самостоятельный ресурс |
| `cup_at_window` | Чашка у окна | settle, energy, support | самостоятельный ресурс |
| `workbench` | Рабочий стол | goals, confidence, clarity | самостоятельный ресурс |
| `terrace` | Тихая терраса | boundaries, support, clarity | самостоятельный ресурс |
| `city_tree` | Дерево в парке | support, settle, self_worth | самостоятельный ресурс |
| `leaf_light` | Свет сквозь листья | settle, energy | самостоятельный ресурс |
| `distant_hills` | Холмы вдали | clarity, meaning, goals | самостоятельный ресурс |
| `rustling_leaves` | Шелест листвы | settle, clarity | самостоятельный ресурс |
| `open_book` | Открытая книга | meaning, goals, clarity | самостоятельный ресурс |
| `woven_threads` | Переплетение нитей | relationships, support | самостоятельный ресурс |
| `ancestral_hall` | Зал предков | meaning, relationships | только специалист |
| `childhood_room` | Комната детства | self_worth, relationships | только специалист |
| `cave_threshold` | Порог пещеры | clarity, confidence | только специалист |
| `shadow_double` | Теневая фигура | self_worth, relationships | только специалист |
| `mask_gathering` | Собрание в масках | relationships, self_worth | только специалист |
| `labyrinth` | Лабиринт | meaning, goals | только специалист |
| `precipice` | Обрыв | confidence, meaning | только специалист |
| `threatening_animal` | Опасное животное | confidence, relationships | только специалист |
| `locked_room` | Запертая комната | boundaries, relationships | только специалист |
| `sea_storm` | Шторм | settle, confidence | только специалист |
| `underworld_steps` | Лестница под землю | meaning, self_worth | только специалист |
| `burning_house` | Горящий дом | relationships, meaning | только специалист |

## Полный каталог метафор (48)

| ID | Русский образ / метафора | Темы | Доступ |
|---|---|---|---|
| `bookmark` | Закладка | settle, support, clarity | самостоятельный ресурс |
| `compass_not_map` | Компас, не приказ | meaning, goals | самостоятельный ресурс |
| `small_seed` | Маленькое семя | goals, confidence, energy | самостоятельный ресурс |
| `dimmer` | Регулятор света | settle, boundaries, energy | самостоятельный ресурс |
| `weather_forecast` | Внутренняя погода | settle, clarity | самостоятельный ресурс |
| `one_tile` | Одна плитка мозаики | clarity, self_worth | самостоятельный ресурс |
| `garden_fence` | Садовая ограда | boundaries, relationships | самостоятельный ресурс |
| `open_gate` | Калитка по выбору | boundaries, relationships | самостоятельный ресурс |
| `blank_page` | Новая страница | confidence, goals, meaning | самостоятельный ресурс |
| `shelf_space` | Место на полке | boundaries, clarity | самостоятельный ресурс |
| `threads` | Нити поддержки | relationships, support | самостоятельный ресурс |
| `stones_path` | Камни на тропе | goals, confidence | самостоятельный ресурс |
| `cup_of_time` | Чашка времени | settle, energy | самостоятельный ресурс |
| `daylight_lantern` | Маленький фонарь | clarity, goals, confidence | самостоятельный ресурс |
| `window_frame` | Рамка окна | clarity, settle | самостоятельный ресурс |
| `music_mix` | Тихий микшер | clarity, settle | самостоятельный ресурс |
| `garden_care` | Садовник без спешки | self_worth, energy | самостоятельный ресурс |
| `river_current` | Течение и берег | settle, meaning | самостоятельный ресурс |
| `traffic_light` | Светофор выбора | boundaries, clarity | самостоятельный ресурс |
| `color_palette` | Палитра эмоций | self_worth, relationships | самостоятельный ресурс |
| `door_ajar` | Приоткрытая дверь | clarity, boundaries | самостоятельный ресурс |
| `two_chairs` | Два стула | relationships, boundaries | самостоятельный ресурс |
| `soft_rhythm` | Свой ритм | energy, settle | самостоятельный ресурс |
| `book_margin` | Поле страницы | boundaries, self_worth | самостоятельный ресурс |
| `small_raft` | Лёгкий плот | support, confidence | самостоятельный ресурс |
| `toolbox` | Ящик инструментов | confidence, clarity | самостоятельный ресурс |
| `tree_rings` | Годовые кольца | self_worth, meaning | самостоятельный ресурс |
| `clouds_pass` | Облака проходят | settle, clarity | самостоятельный ресурс |
| `bridge_planks` | Доски мостика | goals, confidence | самостоятельный ресурс |
| `sewing_stitch` | Один стежок | goals, energy | самостоятельный ресурс |
| `sun_patch` | Полоса света | settle, support | самостоятельный ресурс |
| `quiet_bell` | Тихий звон | settle, boundaries | самостоятельный ресурс |
| `stair_landing` | Лестничная площадка | confidence, goals | самостоятельный ресурс |
| `sky_space` | Место в небе | settle, self_worth | самостоятельный ресурс |
| `string_and_kite` | Нить воздушного змея | confidence, relationships | самостоятельный ресурс |
| `raincoat` | Плащ для погоды | support, settle | самостоятельный ресурс |
| `empty_chair` | Свободное место | boundaries, relationships | самостоятельный ресурс |
| `sand_timer` | Песочные часы | goals, confidence | самостоятельный ресурс |
| `soft_pencil` | Карандаш и ластик | clarity, goals | самостоятельный ресурс |
| `mirror_window` | Зеркало и окно | self_worth, clarity | самостоятельный ресурс |
| `shadow_integration` | Тень и встреча | self_worth | только специалист |
| `hero_trial` | Испытание героя | confidence | только специалист |
| `inner_child` | Внутренний ребёнок | relationships, self_worth | только специалист |
| `ancestral_line` | Линия предков | relationships, meaning | только специалист |
| `mythic_descent` | Мифологическое нисхождение | meaning | только специалист |
| `unmasked_self` | Снятие маски | self_worth | только специалист |
| `dangerous_beast` | Опасный зверь | confidence | только специалист |
| `memory_door` | Дверь памяти | relationships | только специалист |

## Сюжетные арки (12)

| ID | Русский образ / метафора | Темы | Доступ |
|---|---|---|---|
| `arrival_and_notice` | Сначала заметить | settle, support | самостоятельный ресурс |
| `gentle_support` | Мягкая опора | support, settle, self_worth | самостоятельный ресурс |
| `space_for_choice` | Пространство выбора | boundaries, relationships | самостоятельный ресурс |
| `another_perspective` | Ещё один ракурс | clarity, self_worth | самостоятельный ресурс |
| `one_meaningful_step` | Один важный шаг | goals, meaning, confidence | самостоятельный ресурс |
| `inner_kindness` | Бережность к себе | self_worth, support | самостоятельный ресурс |
| `compass_of_values` | Компас ценностей | meaning, goals | самостоятельный ресурс |
| `pause_and_response` | Пауза перед ответом | settle, boundaries, clarity | самостоятельный ресурс |
| `everyday_connection` | Близость и пространство | relationships, boundaries | самостоятельный ресурс |
| `rest_and_energy` | Ритм восстановления | energy, settle, support | самостоятельный ресурс |
| `learning_from_attempt` | Опыт без экзамена | confidence, goals, self_worth | самостоятельный ресурс |
| `closing_and_carrying` | Завершить и взять с собой | support, meaning, clarity | самостоятельный ресурс |

## Проверка и выпуск

Новый набор тестов `tests/meditation-narrative-expansion.test.mjs` проверяет языки, количество карточек, запреты для клинических мотивов, preflight, согласия, конфликтующие пожелания, вариативность и 8 черновиков. Исходные модули не сохраняют клиентский текст и не вызывают внешние модели.

**На момент создания: локальная изолированная JS-проверка 20/20 новых сценариев; полный Node CI / ESLint / TypeScript / Next build / ручная клиническая редактура и production не подтверждены.** Эта ветка — стековая над PR #2532; не сливать напрямую в GitHub default `codex/bootstrap-books`, production-цель — `codex/public-book-library`.

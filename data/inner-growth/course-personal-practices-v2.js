// Original, isolated editorial pilot. Not imported by the runtime planner or UI.
// Draft content is NOT eligible for delivery through reviewed-only planning.
// Authorship pins below are literals: changes to instruments, translations,
// scoring or curriculum require fresh review, never automatic rebinding.
import { deepFreeze } from '../../lib/assessments/contracts.js'

export const PERSONAL_COURSE_PILOT_VERSION = 'hh-personal-practices-21-v2-pilot-2026-10-12'
export const PERSONAL_COURSE_PILOT_STATUS = 'ORIGINAL_DRAFT_REVIEW_REQUIRED'
export const PERSONAL_COURSE_PILOT_CURRICULUM_VERSION = 'hh-21day-editorial-overlay-2026-10-12'
const SOURCE = 'Holistic House original educational practice drafts; independent editorial, mapping and language review pending'
const LOCALES = ['en', 'ru']
const VARIANTS = ['standard', 'short', 'alternative']
const PRACTICE_DAYS = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20]
const REVIEW_DAYS = [7, 14, 21]
const pair = (en, ru) => ({ en, ru })
const clone = value => structuredClone(value)
const nonempty = value => typeof value === 'string' && value.trim().length > 0

// All ten provenance fields are explicit for each supported instrument form.
export const PERSONAL_COURSE_PILOT_INSTRUMENTS = deepFreeze([
  {
    "definitionId": "7dc3058b-c939-5577-9226-9c5b50aa4aee",
    "definitionKey": "hh-weekly-pulse",
    "definitionVersion": "v1",
    "instrumentLocale": "en",
    "translationVersion": "hh-en-v1",
    "contentHash": "sha256:e0db859b3e3c888643ef199e1034507687b0692b77ea6932c2cbacacfb2767d7",
    "scoringKey": "raw-dimensions",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "timeframe": "past-7-days"
  },
  {
    "definitionId": "7780802c-603b-5382-aebf-8f6c5ef3ddcc",
    "definitionKey": "hh-weekly-pulse",
    "definitionVersion": "v1",
    "instrumentLocale": "ru",
    "translationVersion": "hh-ru-v1",
    "contentHash": "sha256:1580de6223f16ba1806e446a0fc10bf35510b01d696bc149f49eed67a037cc82",
    "scoringKey": "raw-dimensions",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "timeframe": "past-7-days"
  },
  {
    "definitionId": "435985a5-94fc-4c2b-9a7f-a2e6c33f94be",
    "definitionKey": "hh-resource-pulse",
    "definitionVersion": "v1",
    "instrumentLocale": "en",
    "translationVersion": "hh-en-v1",
    "contentHash": "sha256:80621529165c1c239cf93a30129ece25d010da05a01bd71e560231a3711d7afb",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "timeframe": "right-now"
  },
  {
    "definitionId": "aa30b3c7-f35a-4b52-a335-9a74366c2927",
    "definitionKey": "hh-resource-pulse",
    "definitionVersion": "v1",
    "instrumentLocale": "ru",
    "translationVersion": "hh-ru-v1",
    "contentHash": "sha256:bdba0d174efd8c4acc1bdd950a329949c0ed5fc9c4c237bd66a78b36f28f7c1b",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "timeframe": "right-now"
  }
])

// Literal editorial snapshot of the common arc. This does not relabel legacy
// lessons by day: the action matrix below was authored for each exact objective.
const ARC = [
  {
    "day": 1,
    "week": 1,
    "review": false,
    "skill": {
      "en": "Notice without judging",
      "ru": "Замечать без оценки"
    },
    "objective": {
      "en": "Choose a manageable amount and describe the present situation with one observation.",
      "ru": "Выбрать посильный объём и описать текущую ситуацию одним наблюдением."
    }
  },
  {
    "day": 2,
    "week": 1,
    "review": false,
    "skill": {
      "en": "Recognise an early signal",
      "ru": "Распознавать ранний сигнал"
    },
    "objective": {
      "en": "Distinguish your own signal, its context and a judgement about yourself.",
      "ru": "Различать собственный сигнал, контекст и оценку себя."
    }
  },
  {
    "day": 3,
    "week": 1,
    "review": false,
    "skill": {
      "en": "Describe a response sequence",
      "ru": "Описывать цепочку реакции"
    },
    "objective": {
      "en": "Connect an event, a thought or feeling and a response while leaving room for choice.",
      "ru": "Связать событие, мысль или чувство и ответ, сохранив возможность выбора."
    }
  },
  {
    "day": 4,
    "week": 1,
    "review": false,
    "skill": {
      "en": "Return to an available support",
      "ru": "Возвращаться к доступной опоре"
    },
    "objective": {
      "en": "Try a short external focus without having to relax.",
      "ru": "Попробовать короткую внешнюю фокусировку без обязательного расслабления."
    }
  },
  {
    "day": 5,
    "week": 1,
    "review": false,
    "skill": {
      "en": "Choose one small step",
      "ru": "Выбирать один маленький шаг"
    },
    "objective": {
      "en": "Make a task small enough for the energy you have today.",
      "ru": "Сделать задачу достаточно небольшой для сегодняшних сил."
    }
  },
  {
    "day": 6,
    "week": 1,
    "review": false,
    "skill": {
      "en": "Change your response with care",
      "ru": "Менять ответ бережно"
    },
    "objective": {
      "en": "Find an alternative to an automatic demand or response.",
      "ru": "Найти альтернативу автоматическому требованию или реакции."
    }
  },
  {
    "day": 7,
    "week": 1,
    "review": true,
    "skill": {
      "en": "Review what fits",
      "ru": "Обзор: что мне подходит"
    },
    "objective": {
      "en": "Choose what to keep, simplify and not repeat.",
      "ru": "Выбрать, что сохранить, упростить и не повторять."
    }
  },
  {
    "day": 8,
    "week": 2,
    "review": false,
    "skill": {
      "en": "Bring a skill into an ordinary day",
      "ru": "Переносить в обычный день"
    },
    "objective": {
      "en": "Connect a skill to a safe, real-life situation.",
      "ru": "Соединить навык с безопасной реальной ситуацией."
    }
  },
  {
    "day": 9,
    "week": 2,
    "review": false,
    "skill": {
      "en": "Use support and personal values",
      "ru": "Использовать ресурс и ценность"
    },
    "objective": {
      "en": "Identify personal meaning and external support.",
      "ru": "Различать личный смысл и внешнюю поддержку."
    }
  },
  {
    "day": 10,
    "week": 2,
    "review": false,
    "skill": {
      "en": "Leave room for choice",
      "ru": "Оставлять место выбору"
    },
    "objective": {
      "en": "Separate an initial urge from an action you must take.",
      "ru": "Отделять первый порыв от обязательного действия."
    }
  },
  {
    "day": 11,
    "week": 2,
    "review": false,
    "skill": {
      "en": "Return after distraction",
      "ru": "Возвращаться после отвлечения"
    },
    "objective": {
      "en": "Continue with a small step without punishing yourself.",
      "ru": "Продолжать с небольшого шага, без самонаказания."
    }
  },
  {
    "day": 12,
    "week": 2,
    "review": false,
    "skill": {
      "en": "Build your own short sequence",
      "ru": "Собирать свою последовательность"
    },
    "objective": {
      "en": "Connect noticing, support and action.",
      "ru": "Соединить наблюдение, поддержку и действие."
    }
  },
  {
    "day": 13,
    "week": 2,
    "review": false,
    "skill": {
      "en": "Choose a tool for yourself",
      "ru": "Выбирать инструмент самостоятельно"
    },
    "objective": {
      "en": "Distinguish situations for practice, rest and outside help.",
      "ru": "Различать подходящие случаи для практики, отдыха и внешней помощи."
    }
  },
  {
    "day": 14,
    "week": 2,
    "review": true,
    "skill": {
      "en": "Review and adjust the route",
      "ru": "Обзор: скорректировать маршрут"
    },
    "objective": {
      "en": "Compare expectations with experience and adjust the final week.",
      "ru": "Сопоставить ожидание и опыт, обновить акценты третьей недели."
    }
  },
  {
    "day": 15,
    "week": 3,
    "review": false,
    "skill": {
      "en": "Adapt a skill to its context",
      "ru": "Приспосабливать навык к контексту"
    },
    "objective": {
      "en": "Change the setting and form instead of demanding the same result.",
      "ru": "Изменять условия и форму упражнения вместо требования одинакового результата."
    }
  },
  {
    "day": 16,
    "week": 3,
    "review": false,
    "skill": {
      "en": "Separate facts from extra demands",
      "ru": "Отделять факт от дополнительного требования"
    },
    "objective": {
      "en": "Make unfinished matters or uncertainty more manageable.",
      "ru": "Делать незавершённость или неопределённость управляемой."
    }
  },
  {
    "day": 17,
    "week": 3,
    "review": false,
    "skill": {
      "en": "Reduce an unnecessary demand",
      "ru": "Снижать лишнюю нагрузку"
    },
    "objective": {
      "en": "Distinguish necessary and optional parts of one everyday moment.",
      "ru": "Выделять необходимое и необязательное в одном моменте дня."
    }
  },
  {
    "day": 18,
    "week": 3,
    "review": false,
    "skill": {
      "en": "Close or clarify a small loop",
      "ru": "Завершать или уточнять небольшой цикл"
    },
    "objective": {
      "en": "Make a stopping point, request or next contact clear.",
      "ru": "Делать понятным конец дела, просьбу или следующий контакт."
    }
  },
  {
    "day": 19,
    "week": 3,
    "review": false,
    "skill": {
      "en": "Arrange the setting to support you",
      "ru": "Устраивать среду в поддержку навыка"
    },
    "objective": {
      "en": "Change one available condition instead of only trying harder.",
      "ru": "Изменить одно доступное условие, а не только усиливать старание."
    }
  },
  {
    "day": 20,
    "week": 3,
    "review": false,
    "skill": {
      "en": "Return and revise",
      "ru": "Возвращаться и пересматривать"
    },
    "objective": {
      "en": "Stop an unsuitable method and return without catching up.",
      "ru": "Уметь остановить неподходящий метод и продолжить без наверстывания."
    }
  },
  {
    "day": 21,
    "week": 3,
    "review": true,
    "skill": {
      "en": "Review your flexible plan",
      "ru": "Итог: мой гибкий план"
    },
    "objective": {
      "en": "Build a personal toolkit and realistic next steps without promising complete change.",
      "ru": "Собрать личный набор и реалистичное продолжение без обещания полного изменения."
    }
  }
]

// Each row is a separately authored action. Shared framing only supplies entry,
// choice, pacing and reflection; it never substitutes for construct-specific work.
const SKILLS = [
  {
    id: 'pace-one-action', definitionKey: 'hh-resource-pulse', dimensionKey: 'resource.energy', topicId: 'energy_agency',
    label: pair('Energy and a manageable action', 'Энергия и посильное действие'),
    entry: pair('Work with the effort an ordinary task needs today. One tiny action or an ordinary rest is enough; no energy increase is required.', 'Сопоставьте обычное дело с доступными сегодня силами. Достаточно крошечного действия или обычного отдыха; прибавка энергии не требуется.'),
    reflection: pair('Did the size of the action fit the energy available, or would rest fit better?', 'Соответствовал ли размер действия доступным силам или лучше подошёл бы отдых?'),
    transfer: pair('If useful, keep the same stopping point for one ordinary task. Do not add work to compensate for a pause.', 'Если это полезно, сохраните ту же точку остановки для одного обычного дела. Не добавляйте работу ради компенсации паузы.'),
    days: {
      1: pair('Name one neutral fact about today’s workload, such as “one cup needs putting away”. Choose up to one minute or rest. Put away just that cup if manageable, then stop.', 'Назовите нейтральный факт о нагрузке, например «нужно убрать одну чашку». Выберите до минуты действия или отдых. Если посильно, уберите только эту чашку и остановитесь.'),
      2: pair('Use a mild example: halfway through tidying, you start leaving items in a pile. Note the visible signal and the amount of work. Replace “I am lazy” with that factual description; mark a place to pause.', 'Возьмите лёгкий пример: во время уборки вещи начинают оставаться кучкой. Отметьте видимый сигнал и объём дела. Замените «я ленюсь» этим фактическим описанием; обозначьте место для паузы.'),
      3: pair('Write three brief parts of an invented example: a full basket; “too much at once”; trying to empty everything. Add one choice: put away one item and leave the rest for later.', 'Запишите три части вымышленного примера: полная корзина; «слишком много сразу»; попытка разобрать всё. Добавьте выбор: убрать один предмет, а остальное оставить на потом.'),
      4: pair('With eyes open, find a chair or another ordinary place where you can rest. Notice its outline, then the space around it. Choose a pause there if suitable. Nothing needs to be finished first.', 'С открытыми глазами найдите стул или другое обычное место для отдыха. Заметьте его контур, затем пространство вокруг. Если подходит, выберите там паузу. Сначала заканчивать дела не требуется.'),
      5: pair('Choose one small everyday action: put away one object, open a needed document, or set out a cup. Do only the chosen action, then stop. Leave the rest alone; rest is also a valid choice.', 'Выберите одно маленькое бытовое действие: убрать один предмет, открыть нужный документ или поставить чашку. Выполните только выбранное действие и остановитесь. Остальное оставьте; можно выбрать отдых.'),
      6: pair('For a small chore, write the usual demand “finish it all”. Beside it write “one part, then pause” or “rest now”. Choose one of the smaller options and set its stopping point before beginning.', 'Для небольшого дела запишите привычное требование «закончить всё». Рядом напишите «одна часть, потом пауза» или «сейчас отдых». Выберите меньший вариант и обозначьте конец до начала.'),
      8: pair('Choose an ordinary transition, such as finishing a drink. Pair it with a capacity check: “one small action or rest?” Try that choice now using one object nearby; stop after the single action or decision to rest.', 'Выберите обычный переход, например после напитка. Добавьте вопрос о силах: «одно маленькое действие или отдых?» Попробуйте выбор сейчас на одном предмете рядом; остановитесь после действия или решения отдохнуть.'),
      9: pair('Choose a quality such as care or order. Name an external aid, such as a chair or a container within reach. Use it for one small action that expresses that quality, or decide that rest expresses care today.', 'Выберите качество, например заботу или порядок. Назовите внешнюю опору: стул или коробку под рукой. Используйте её для одного малого действия в духе этого качества либо решите, что сегодня забота — отдых.'),
      10: pair('Imagine a nonurgent extra chore arriving. Name the impulse to start everything. Privately compare “one item now” with “leave a note and rest”. Choose either; the arrival of a task is not an instruction to do it immediately.', 'Представьте новое несрочное дело. Назовите порыв взяться за всё. Для себя сравните «один предмет сейчас» и «оставить заметку и отдохнуть». Выберите любой вариант; появление дела не обязывает делать его немедленно.'),
      11: pair('Choose a small unfinished chore, or imagine one. Mark what is already done. Restart with one item or choose rest; stop there. Do not double the work because you were distracted or missed an earlier attempt.', 'Выберите маленькое незавершённое дело или представьте его. Отметьте уже сделанное. Вернитесь к одному предмету либо выберите отдых; на этом закончите. Не удваивайте работу из-за отвлечения или пропуска.'),
      12: pair('Make three short lines: “I have limited energy”; “the basket is within reach”; “I will put away one item, then stop”. Adapt the objects to your setting and try the single action, or replace it with rest.', 'Составьте три короткие строки: «сил немного»; «корзина под рукой»; «уберу один предмет и остановлюсь». Подставьте подходящие предметы и попробуйте одно действие либо замените его отдыхом.'),
      13: pair('Match three ordinary options: one manageable item when effort fits; rest when effort does not fit; practical help when a task needs more capacity. Circle today’s option. No request or explanation to anyone is required.', 'Соотнесите три обычных варианта: один посильный предмет, когда силы есть; отдых, когда их недостаточно; практическая помощь, когда дело требует больше возможностей. Обведите сегодняшний вариант. Обращаться к кому-либо или объясняться не требуется.'),
      15: pair('Compare putting one item away at a desk and in a kitchen. Keep the one-item stopping rule; change the item and distance to fit each place. Choose the easier setting or rest. Try no more than one item.', 'Сравните уборку одного предмета за столом и на кухне. Сохраните правило остановки после одного предмета; измените предмет и расстояние под обстановку. Выберите более лёгкий вариант или отдых. Не делайте больше одного действия.'),
      16: pair('For a nonurgent chore, note what is known: one part is unfinished. Note what is unknown: how much energy will be available later. Choose one small next step or a pause without estimating the whole day.', 'Для несрочного дела отметьте известное: одна часть не закончена. Отметьте неизвестное: сколько сил будет позже. Выберите маленький следующий шаг или паузу, не прогнозируя весь день.'),
      17: pair('Look at one everyday task list. Identify a part necessary for safety or an actual commitment and a decorative extra. Cross out only the optional extra, keeping the commitment intact; stop editing the list there.', 'Посмотрите на список одного бытового дела. Выделите часть, нужную для безопасности или реального обязательства, и необязательное украшение. Уберите только лишнее, сохранив обязательство; на этом закончите редактирование.'),
      18: pair('Choose a tiny task already partly done. Write “done: …; next: …; stopping here”. Name just one later step, then put the task aside if safe. Finishing this note is the stopping point, not finishing the whole task.', 'Выберите крошечное частично сделанное дело. Запишите «сделано: …; дальше: …; сейчас останавливаюсь». Назовите один шаг на потом и безопасно отложите дело. Точка остановки — конец заметки, а не всего дела.'),
      19: pair('Identify one unnecessary reach or trip in an ordinary chore. Compare bringing one light object closer with doing the chore seated if safe. Choose one available adjustment, make it, then stop without adding another chore.', 'Найдите одно лишнее движение или перемещение в обычном деле. Сравните два варианта: приблизить один лёгкий предмет или делать сидя, если безопасно. Выберите доступное изменение, выполните и остановитесь, не добавляя нового дела.'),
      20: pair('Use a mild invented mismatch, such as “too many items”, or an earlier action that was too much. Name only the practical mismatch; do not recreate it. Choose one item, ordinary rest, or practical support for another time. Write the choice; nothing needs catching up.', 'Возьмите лёгкий вымышленный пример несоответствия, например «слишком много предметов», либо прежнее чрезмерное действие. Назовите только несоответствие; не воспроизводите его. Выберите один предмет, обычный отдых или практическую поддержку на потом. Запишите выбор; наверстывать ничего не нужно.'),
    },
  },
  {
    id: 'fair-self-statement', definitionKey: 'hh-resource-pulse', dimensionKey: 'resource.self_support', topicId: 'inner_support',
    label: pair('A fair response to yourself', 'Справедливый ответ себе'),
    entry: pair('Practise a factual, respectful response to an ordinary difficulty. You do not need praise, optimism or belief in a positive statement.', 'Попробуйте фактический, уважительный ответ на обычную трудность. Не нужны похвала, оптимизм или вера в позитивную фразу.'),
    reflection: pair('Was the wording fair and believable enough, or should I make it plainer?', 'Были ли слова достаточно справедливыми и правдоподобными или их стоит сделать проще?'),
    transfer: pair('You may keep one fair sentence privately for a small everyday difficulty. There is no need to repeat it until you feel different.', 'Можно сохранить одну справедливую фразу для себя на случай небольшой бытовой трудности. Повторять её до изменения чувств не требуется.'),
    days: {
      1: pair('Choose a mild unfinished task. Write one fact, such as “this page is unfinished”, without a verdict about yourself. Choose to leave it there or add “I can choose one next step”. Read once and stop.', 'Выберите лёгкое незавершённое дело. Запишите факт, например «эта страница не закончена», без приговора себе. Оставьте так или добавьте «я могу выбрать один следующий шаг». Прочитайте один раз и остановитесь.'),
      2: pair('Use an invented small typo. Separate three things: the typo on the page, the moment you notice it, and the judgement “I always fail”. Keep only the observation “one word needs correcting”; no correction is required now.', 'Возьмите вымышленную небольшую опечатку. Разделите три вещи: опечатку на странице, момент её обнаружения и оценку «у меня всегда всё плохо». Оставьте наблюдение «нужно исправить одно слово»; исправлять сейчас необязательно.'),
      3: pair('Write a simple chain: a small mistake; “I should never make mistakes”; wanting to abandon the task. Add a fair option: “this part can be corrected or left for later”. Stop after that alternative.', 'Запишите простую цепочку: мелкая ошибка; «я не должен ошибаться»; желание бросить дело. Добавьте справедливый вариант: «эту часть можно исправить или оставить на потом». На этой альтернативе остановитесь.'),
      4: pair('Look at the edge of an ordinary object, then the space around it. Beside a small task, place a private note saying “one fact, no verdict”. Read it once. You do not need to feel comforted.', 'Посмотрите на край обычного предмета, затем на пространство вокруг. Рядом с небольшим делом положите личную заметку «один факт, без приговора». Прочитайте её один раз. Чувствовать утешение не требуется.'),
      5: pair('Choose one mild self-demand, such as “do this perfectly”. Replace it with one fair sentence: “one workable line is enough for this attempt”. Write only that sentence, then stop. You do not have to agree emotionally.', 'Выберите одно лёгкое требование к себе, например «сделать идеально». Замените его справедливой фразой: «для этой попытки достаточно одной рабочей строки». Запишите только эту фразу и остановитесь. Эмоционально соглашаться необязательно.'),
      6: pair('On a fictional minor delay, compare “I am hopeless” with “this took longer than planned”. Choose the factual version or write your own equally fair wording. Read it once; do not argue with the harsher thought.', 'На вымышленной небольшой задержке сравните «я безнадёжен» и «это заняло больше времени, чем планировалось». Выберите фактическую версию или свою столь же справедливую формулировку. Прочитайте один раз; спорить с резкой мыслью не нужно.'),
      8: pair('Choose an ordinary cue, such as saving a file. Pair it with the sentence “this is what I managed today”. Try the sentence once about a small real or imagined action. Leave its size unchanged.', 'Выберите обычный сигнал, например сохранение файла. Соедините его с фразой «вот что удалось сегодня». Один раз отнесите фразу к маленькому реальному или вымышленному действию. Не увеличивайте его размер.'),
      9: pair('Choose a quality you value, such as fairness. Use a private note as an external reminder. Write “fairness includes describing my effort accurately”, then name one observable effort without calling yourself good or bad.', 'Выберите важное качество, например справедливость. Возьмите личную заметку как внешнюю подсказку. Запишите «справедливость включает точное описание моих усилий», затем назовите одно наблюдаемое усилие, не оценивая себя как хорошего или плохого.'),
      10: pair('Imagine being asked to redo a small part of a task. Notice the urge to blame yourself. Write a second option: “I can first clarify which part”. Privately rehearse that sentence once; no reply to anyone is needed.', 'Представьте просьбу переделать небольшую часть дела. Отметьте порыв обвинить себя. Запишите второй вариант: «сначала могу уточнить, какую часть». Один раз отрепетируйте эту фразу для себя; отвечать кому-либо не требуется.'),
      11: pair('Choose a small missed or interrupted attempt, real or invented. Write “I stopped at …; the next small part is …”. Omit blame and penalties. Take that part or choose a break, with no extra work to repay the interruption.', 'Выберите маленькую пропущенную или прерванную попытку, реальную или вымышленную. Запишите «остановился на …; следующая маленькая часть …». Без обвинений и наказаний. Сделайте эту часть или выберите паузу, без дополнительной работы за отвлечение.'),
      12: pair('Complete three brief phrases: “I notice a harsh demand”; “a factual note can help”; “I will describe one next step without a verdict”. Write that next step once. You may stop without doing it.', 'Закончите три короткие фразы: «замечаю резкое требование»; «поможет фактическая заметка»; «опишу один следующий шаг без приговора». Один раз запишите этот шаг. Можно остановиться, не выполняя его.'),
      13: pair('Name a mild occasion for a fair sentence, an occasion for ordinary rest, and a task where practical clarification from someone could help. Choose today’s option privately. Asking for support is optional, not part of completion.', 'Назовите лёгкий случай для справедливой фразы, случай для обычного отдыха и задачу, где полезно практическое уточнение у кого-то. Выберите сегодняшний вариант для себя. Обращение за поддержкой необязательно для завершения.'),
      15: pair('Compare the same fair sentence at home and during a busy day: “one workable part is enough for this attempt”. Keep its meaning; choose a written note at home and a silent sentence elsewhere. Try only one form.', 'Сравните одну справедливую фразу дома и в загруженный день: «для этой попытки достаточно одной рабочей части». Сохраните смысл; выберите дома запись, а в другой обстановке мысленную фразу. Попробуйте только одну форму.'),
      16: pair('For an unfinished small task, write the fact “this part is not done”. Mark the added demand “I should already know everything” as a demand, not a fact. Name one question that can remain open for now.', 'Для незаконченного маленького дела запишите факт «эта часть не сделана». Отметьте добавленное «я уже должен всё знать» как требование, а не факт. Назовите один вопрос, который пока может остаться открытым.'),
      17: pair('Review a mild private to-do. Keep the actual requirement, such as “write one clear sentence”. Remove an extra self-demand, such as “make it brilliant immediately”. Write the smaller requirement once and stop.', 'Посмотрите на небольшое личное дело. Сохраните реальное условие, например «написать одно ясное предложение». Уберите лишнее требование к себе, например «сразу сделать гениально». Один раз запишите меньшее условие и остановитесь.'),
      18: pair('At a small stopping point, write what you actually completed and what remains. Add “unfinished does not describe my worth” only if that wording fits; otherwise keep the two facts. Close the note without grading yourself.', 'В небольшой точке остановки запишите, что действительно сделано и что осталось. Добавьте «незавершённость не определяет мою ценность», только если слова подходят; иначе оставьте два факта. Закройте заметку, не выставляя себе оценку.'),
      19: pair('Find a private reminder that sounds like a threat, or invent one. Compare rewriting it as a factual next step with moving it out of view. Make one small change to your own note only, then stop.', 'Найдите личную подсказку, звучащую как угроза, или придумайте пример. Сравните два варианта: переписать как фактический следующий шаг либо убрать из поля зрения. Измените только свою заметку одним способом и остановитесь.'),
      20: pair('Use a mild invented example of a supportive phrase that feels false or pressuring, or an actual unsuitable phrase. Do not repeat it. Replace it with one plain fact, such as “I can leave this for now”, or choose no sentence and take a break. That choice is a complete attempt.', 'Возьмите лёгкий вымышленный пример поддерживающей фразы, которая кажется ложной или давящей, либо реальную неподходящую фразу. Не повторяйте её. Замените одним простым фактом, например «могу пока оставить это», либо выберите паузу без фразы. Этот выбор — законченная попытка.'),
    },
  },
  {
    id: 'safe-request', definitionKey: 'hh-resource-pulse', dimensionKey: 'resource.connection', topicId: 'connection_boundaries',
    label: pair('Chosen contact and respectful boundaries', 'Выбранное общение и уважительные границы'),
    entry: pair('Work privately with a safe, ordinary or invented contact. You choose the person, timing and boundary. No message, disclosure or contact is required.', 'Работайте для себя с безопасным обычным или вымышленным общением. Человек, время и граница остаются вашим выбором. Сообщения, раскрытие личного и сам контакт не требуются.'),
    reflection: pair('Did this option leave room for my choice and the other person’s choice?', 'Оставлял ли этот вариант место моему выбору и выбору другого человека?'),
    transfer: pair('You may keep the private wording for a naturally occurring safe situation. Sending it is a separate choice, never a course requirement.', 'Можно сохранить личную формулировку для естественной безопасной ситуации. Отправка — отдельный выбор и никогда не требование курса.'),
    days: {
      1: pair('Note one neutral fact, such as “I would like brief company”. Choose a safe real or invented person and a comfortable length of contact. Write the choice privately, including “not today” if that fits.', 'Отметьте нейтральный факт, например «мне хотелось бы немного побыть с кем-то». Выберите безопасного реального или вымышленного человека и комфортную длительность общения. Запишите выбор для себя, включая «не сегодня», если это подходит.'),
      2: pair('Imagine an ordinary conversation becoming longer than wanted. Separate the signal “I stop following the words”, the context “a long conversation”, and the judgement “I am rude”. Write only the signal and a possible stopping phrase.', 'Представьте обычный разговор, затянувшийся дольше желаемого. Разделите сигнал «перестаю следить за словами», контекст «долгий разговор» и оценку «я невежлив». Запишите только сигнал и возможную фразу завершения.'),
      3: pair('Use an invented invitation. Write: the invitation arrives; “I must agree immediately”; I say yes. Add another choice: privately rehearse “I will check my time and reply later”. Stop after one rehearsal.', 'Возьмите вымышленное приглашение. Запишите: приходит приглашение; «нужно сразу согласиться»; я говорю «да». Добавьте выбор: для себя отрепетируйте «проверю своё время и отвечу позже». Остановитесь после одной репетиции.'),
      4: pair('Look around for a place where a private pause would be comfortable. Notice one edge or colour there, then widen your view. Silently try “I can take a moment before deciding about contact”. No conversation is needed.', 'Найдите взглядом место, где было бы удобно спокойно побыть одному. Заметьте край или цвет, затем расширьте взгляд. Мысленно попробуйте «могу взять паузу перед решением об общении». Разговор не требуется.'),
      5: pair('Privately rehearse one small request: “Would you have five minutes to talk sometime? It is okay if not.” Adapt it to a safe imagined person. Say or write it once, then stop. Do not send it as part of this practice.', 'Для себя отрепетируйте маленькую просьбу: «У тебя найдётся когда-нибудь пять минут поговорить? Можно отказаться». Подстройте её под безопасного воображаемого человека. Один раз произнесите или запишите и остановитесь. В рамках практики не отправляйте.'),
      6: pair('Compare two private replies to a nonurgent invitation: an automatic yes and “I can do a shorter visit” or “not this time”. Choose one respectful option. Rehearse it once without explaining more than you want.', 'Сравните два личных варианта ответа на несрочное приглашение: автоматическое «да» и «могу ненадолго» либо «не в этот раз». Выберите уважительный вариант. Один раз отрепетируйте, не объясняя больше, чем хочется.'),
      8: pair('Choose a safe ordinary cue, such as opening your personal calendar. Pair it with checking what length of contact fits. Privately write one boundary, for example “ten minutes, then leave”. The note completes the practice.', 'Выберите безопасный обычный сигнал, например открытие личного календаря. Добавьте проверку подходящей длительности общения. Для себя запишите границу, например «десять минут, потом ухожу». Заметка завершает практику.'),
      9: pair('Choose a quality such as mutual respect. Name an external aid, such as a quiet place or a clear end time. Privately sketch an invitation with that aid and space for refusal. Leave the sketch unsent.', 'Выберите качество, например взаимное уважение. Назовите внешнюю опору: тихое место или понятное время завершения. Для себя набросайте приглашение с этой опорой и возможностью отказа. Оставьте набросок неотправленным.'),
      10: pair('Imagine a harmless request for your time. Notice the first answer you want to give. Privately name a second option: ask what is needed, choose a shorter time, or decline. Rehearse one option; the impulse need not decide for you.', 'Представьте безопасную просьбу уделить время. Отметьте первый ответ. Для себя назовите второй вариант: уточнить потребность, выбрать меньше времени или отказаться. Отрепетируйте один вариант; первый порыв не обязан решать за вас.'),
      11: pair('Use an invented, low-stakes reply you did not finish. Mark the last clear point. Privately write one fresh opening, such as “I can return to this now”, or choose not to continue. No apology script, extra disclosure or sending is required.', 'Возьмите вымышленный несрочный ответ, который не закончили. Отметьте последнюю ясную мысль. Для себя напишите начало, например «могу сейчас вернуться к этому», либо решите не продолжать. Извинения, лишние подробности и отправка не требуются.'),
      12: pair('Write three private points: “I want a brief conversation”; “a clear end time helps”; “I can ask about a ten-minute slot”. Rehearse that small request once with room for a no. Stop without contacting anyone.', 'Запишите три пункта для себя: «хочу короткий разговор»; «помогает ясное время окончания»; «могу спросить о десяти минутах». Один раз отрепетируйте просьбу с возможностью отказа. Остановитесь, ни с кем не связываясь.'),
      13: pair('Privately sort three possibilities: rehearse a small request with a safe person in mind; choose solitude and rest; identify a trusted source of support for a difficult situation. Pick one category for today, without starting contact.', 'Для себя разделите три возможности: отрепетировать маленькую просьбу к безопасному человеку; выбрать уединение и отдых; определить надёжный источник поддержки в сложной ситуации. Выберите одну категорию на сегодня, не начиная общение.'),
      15: pair('Consider a small request in two safe settings: a quiet room and a busy public place. Keep the request optional; change the timing, privacy or length. Write the version for the more comfortable setting, without using it.', 'Рассмотрите маленькую просьбу в двух безопасных условиях: тихая комната и оживлённое публичное место. Сохраните возможность отказа; измените время, приватность или длительность. Запишите вариант для более удобной обстановки, не используя его.'),
      16: pair('Use an invented unanswered invitation. Write the known fact “there is no reply yet” and the unknown “why”. Avoid guessing someone’s feelings. Choose a private next step, such as leave it until a chosen time or make another personal plan.', 'Возьмите вымышленное приглашение без ответа. Запишите известное «ответа пока нет» и неизвестное «почему». Не угадывайте чужие чувства. Выберите личный шаг: оставить до выбранного времени либо составить другой собственный план.'),
      17: pair('Look at a private draft of a harmless invitation, or invent one. Keep the purpose and room to decline; remove one unnecessary apology or personal detail. Stop editing after that single removal. Leave the draft unsent.', 'Посмотрите на личный черновик безопасного приглашения или придумайте его. Сохраните цель и возможность отказа; уберите одно лишнее извинение или личную подробность. После одного удаления остановите правку. Не отправляйте черновик.'),
      18: pair('Privately rehearse a clear end to an imagined safe chat: “I need to stop here; we can decide later whether to continue.” Name what is finished and what is undecided. One rehearsal is enough; no promise of future contact is needed.', 'Для себя отрепетируйте ясное завершение безопасного воображаемого разговора: «мне пора закончить; позже можно решить, продолжать ли». Назовите законченное и неопределённое. Одной репетиции достаточно; обещать дальнейшее общение не требуется.'),
      19: pair('Compare two supports for a safe imagined conversation: a quieter place or a clear end-time note. Select one and prepare a private reminder. Do not change shared plans or send an invitation; preparation is the whole action.', 'Сравните две опоры для безопасного воображаемого разговора: более тихое место или заметка о времени окончания. Выберите одну и подготовьте личную подсказку. Не меняйте общие планы и не отправляйте приглашение; достаточно подготовки.'),
      20: pair('Use a mild invented example of a contact exercise asking for more detail than wanted, or an actual unsuitable exercise. Do not revisit private details. Choose to make the example fictional, rehearse only a boundary, or stop and rest. Privately name your choice. No approach to an unsafe person is part of this practice.', 'Возьмите лёгкий вымышленный пример упражнения об общении, требующего лишних подробностей, либо реальное неподходящее упражнение. Не возвращайтесь к личным деталям. Выберите вымышленный пример, репетицию только границы или остановку и отдых. Назовите выбор для себя. Обращения к небезопасному человеку в практике нет.'),
    },
  },
  {
    id: 'external-pause', definitionKey: 'hh-weekly-pulse', dimensionKey: 'weekly.tension', topicId: 'calm_regulation',
    label: pair('An external pause and available choices', 'Внешняя опора, пауза и выбор'),
    entry: pair('Use a neutral detail in your present surroundings and an ordinary low-stakes example. Keep eyes open and breathing natural. Tension does not have to decrease.', 'Используйте нейтральную деталь вокруг и обычный малозначимый пример. Глаза открыты, дыхание обычное. Снижение напряжения не требуется.'),
    reflection: pair('Was the external focus acceptable, or would ordinary rest or another setting suit me?', 'Была ли внешняя фокусировка приемлемой или лучше подошли бы обычный отдых либо другая обстановка?'),
    transfer: pair('If comfortable, keep one external cue for a naturally occurring transition. Do not seek tension or repeat the exercise until it changes.', 'Если комфортно, сохраните одну внешнюю подсказку для естественного перехода. Не ищите напряжение и не повторяйте упражнение до его изменения.'),
    days: {
      1: pair('Name a neutral fact about the room, such as “the door is on my left”. Choose a short look or ordinary rest. If looking fits, notice one colour and then widen your view; stop without checking whether you feel calmer.', 'Назовите нейтральный факт о комнате, например «дверь слева». Выберите короткое наблюдение или обычный отдых. Если наблюдение подходит, заметьте один цвет и расширьте взгляд; остановитесь без проверки, стало ли спокойнее.'),
      2: pair('Use a mild invented busy moment. Name the context “several sounds at once”, a visible signal such as repeatedly checking a screen, and any self-judgement. Keep the first two as observations and mark “pause” as one available response.', 'Возьмите лёгкий вымышленный загруженный момент. Назовите контекст «несколько звуков сразу», видимый сигнал, например повторные взгляды на экран, и оценку себя. Первые два оставьте наблюдениями, а «паузу» отметьте как доступный ответ.'),
      3: pair('Write an invented sequence: an unexpected notification; “I must react now”; opening it immediately. Add a choice: look at one neutral object before deciding whether the notification is urgent. Rehearse the sequence only on paper.', 'Запишите вымышленную последовательность: неожиданное уведомление; «нужно реагировать сейчас»; немедленное открытие. Добавьте выбор: посмотреть на нейтральный предмет, затем решить, срочно ли это. Репетируйте последовательность только на бумаге.'),
      4: pair('Find one neutral colour on a nearby object. Follow one visible edge briefly, then let your view include the wider room. Keep breathing as usual. End after one pass, whether tension changes or not.', 'Найдите один нейтральный цвет на предмете рядом. Коротко проследите взглядом видимый край, затем включите в поле зрения комнату. Дышите как обычно. Закончите после одного прохода, независимо от изменения напряжения.'),
      5: pair('Choose one visible neutral detail, such as the corner of a book. Notice it once, then look around the room and stop. This single outward shift is the whole action; no scanning your body or waiting for calm is needed.', 'Выберите одну видимую нейтральную деталь, например угол книги. Один раз заметьте её, затем оглядите комнату и остановитесь. Весь шаг — один перевод внимания наружу; исследовать тело или ждать спокойствия не нужно.'),
      6: pair('For an invented nonurgent interruption, compare “deal with everything now” with “first check what actually needs a response”. Look at one ordinary object while rehearsing the second option privately, then stop.', 'Для вымышленной несрочной помехи сравните «разобраться со всем сейчас» и «сначала проверить, что действительно требует ответа». Посмотрите на обычный предмет, для себя репетируя второй вариант, затем остановитесь.'),
      8: pair('Choose an ordinary transition, such as closing a book. Add one outward glance at a neutral colour, followed by deciding “continue or pause”. Try that sequence once now. Do not create a stressful situation to practise it.', 'Выберите обычный переход, например закрытие книги. Добавьте взгляд на нейтральный цвет и решение «продолжить или сделать паузу». Сейчас один раз попробуйте последовательность. Создавать стрессовую ситуацию для тренировки не нужно.'),
      9: pair('Choose a quality such as steadiness or care. Name an external support, such as a quieter corner or less visual clutter. Look at that available support and choose whether to use it; a decision to rest also expresses care.', 'Выберите качество, например устойчивость или заботу. Назовите внешнюю опору: более тихий угол или меньше предметов перед глазами. Посмотрите на доступную опору и решите, использовать ли её; отдых тоже может выражать заботу.'),
      10: pair('Imagine a harmless interruption. Name the urge to react quickly and one other option: check urgency or leave it for later. Briefly look at a neutral object while choosing. No response or reduction in tension is required.', 'Представьте безопасную помеху. Назовите порыв ответить быстро и другой вариант: проверить срочность или оставить на потом. Ненадолго посмотрите на нейтральный предмет, делая выбор. Ответ и снижение напряжения не требуются.'),
      11: pair('If your attention drifted, or in an invented example, name the current room and find one neutral colour. Choose one next ordinary action or a break. Stop after that choice; do not repeat the whole exercise to make up for drifting.', 'Если внимание отвлеклось, либо на вымышленном примере, назовите, где вы сейчас, и найдите нейтральный цвет. Выберите одно обычное действие или паузу. На выборе закончите; не повторяйте всё упражнение ради компенсации отвлечения.'),
      12: pair('Try three brief steps: notice an ordinary interruption; find one visible neutral edge; decide “respond, postpone or rest” according to actual urgency. Use an imagined interruption if none occurs. One sequence is enough.', 'Попробуйте три коротких шага: заметить обычную помеху; найти видимый нейтральный край; выбрать «ответить, отложить или отдохнуть» по реальной срочности. Если помехи нет, используйте воображаемую. Одной последовательности достаточно.'),
      13: pair('Privately match three situations: a mild busy moment with an external pause; an unsuitable exercise with ordinary rest; a difficulty beyond self-help with appropriate outside support. Choose only the category that fits, without testing yourself.', 'Для себя соотнесите три ситуации: лёгкий загруженный момент — внешняя пауза; неподходящее упражнение — обычный отдых; трудность за пределами самопомощи — подходящая внешняя поддержка. Выберите только подходящую категорию, без проверки себя.'),
      15: pair('Compare the same external pause in a quiet room and a busier safe place. Keep eyes open; choose a neutral object in each and a shorter glance in the busier setting. Try only the option comfortable in your current place.', 'Сравните внешнюю паузу в тихой комнате и более оживлённом безопасном месте. Глаза открыты; выберите нейтральный предмет в каждом и более короткий взгляд в оживлённой обстановке. Попробуйте только подходящий сейчас вариант.'),
      16: pair('For an invented nonurgent notification, separate the known “a message arrived” from the unknown “what it asks”. Look at the room, then choose a time to check it. You do not have to resolve the uncertainty during this practice.', 'Для вымышленного несрочного уведомления разделите известное «пришло сообщение» и неизвестное «о чём оно». Оглядитесь, затем выберите время проверки. Разрешать неопределённость во время этой практики не требуется.'),
      17: pair('Consider a safe waiting period. Keep what matters, such as noticing your turn, and remove one extra demand, such as repeatedly refreshing an unrelated page. Look at one ordinary object instead for a moment, then stop practising.', 'Рассмотрите безопасное ожидание. Сохраните важное, например отслеживание своей очереди, и уберите лишнее требование, например повторное обновление посторонней страницы. Ненадолго посмотрите на обычный предмет, затем закончите практику.'),
      18: pair('At the end of an ordinary task, look at one visible edge and name “this part is done”. Write one nonurgent thing that can wait. End the pause there; relaxation and finishing the remaining item are not required.', 'В конце обычного дела посмотрите на видимый край и назовите «эта часть закончена». Запишите одно несрочное дело, которое может подождать. На этом завершите паузу; расслабляться или выполнять оставшееся не требуется.'),
      19: pair('Notice one avoidable source of visual busyness in your own workspace. Compare putting one object aside with turning one unrelated sheet face down. Make one safe change without altering alarms or safety information, then stop.', 'Заметьте один устранимый источник зрительной перегрузки на своём месте. Сравните два варианта: убрать один предмет или перевернуть один посторонний лист. Сделайте одно безопасное изменение, не трогая сигналы и важную для безопасности информацию, и остановитесь.'),
      20: pair('Use a mild invented mismatch, such as “too much looking”, or an external-focus exercise that did not suit you. Name the practical mismatch without repeating the exercise to check. Choose ordinary rest, a different setting later, or appropriate support. End with that choice.', 'Возьмите лёгкий вымышленный пример несоответствия, например «слишком много разглядывания», либо неподходящую внешнюю фокусировку. Назовите несоответствие, не повторяя упражнение для проверки. Выберите обычный отдых, другую обстановку позже или подходящую поддержку. На выборе закончите.'),
    },
  },
  {
    id: 'one-visible-task', definitionKey: 'hh-weekly-pulse', dimensionKey: 'weekly.clarity', topicId: 'attention_clarity',
    label: pair('One clear task and a return marker', 'Одно ясное дело и метка возвращения'),
    entry: pair('Work with one small, nonurgent task and a visible next-step marker. Attention can wander; the aim is a clearer choice, not uninterrupted concentration.', 'Возьмите одно маленькое несрочное дело и видимую метку следующего шага. Внимание может отвлекаться; цель — более ясный выбор, а не непрерывная сосредоточенность.'),
    reflection: pair('Is the next step visible and specific enough to return to, even after a pause?', 'Достаточно ли виден и конкретен следующий шаг, чтобы вернуться после паузы?'),
    transfer: pair('You may leave the marker with one safe unfinished task. Returning to it later is optional; no lost time needs to be repaid.', 'Можно оставить метку рядом с одним безопасным незавершённым делом. Возвращение позже необязательно; потерянное время не нужно возмещать.'),
    days: {
      1: pair('Name one neutral fact, such as “three notes are open”. Choose one note and write a single visible task label, such as “find the appointment date”. Work only on locating that one detail, or leave the label for later.', 'Назовите нейтральный факт, например «открыты три заметки». Выберите одну и запишите видимую задачу, например «найти дату встречи». Ищите только эту деталь либо оставьте метку на потом.'),
      2: pair('Use a mild example of rereading one line. Note the context, the visible signal “I read it again”, and the judgement “I cannot focus”. Replace the judgement with a return marker naming the one detail you need.', 'Возьмите лёгкий пример повторного чтения строки. Отметьте контекст, видимый сигнал «читаю снова» и оценку «не могу сосредоточиться». Замените оценку меткой возвращения, называющей одну нужную деталь.'),
      3: pair('Write an invented chain: another tab opens; “I should check that too”; the first task is left. Add one choice: write “return to this sentence” before switching or pausing. Place that marker beside a harmless sample text.', 'Запишите вымышленную цепочку: открывается другая вкладка; «это тоже нужно проверить»; первое дело оставлено. Добавьте выбор: перед переключением или паузой написать «вернуться к этому предложению». Положите метку у нейтрального текста.'),
      4: pair('Look at one visible heading on a harmless page or note. Notice its outline, then widen your view. Put a finger or removable marker beside the one line you may return to; no prolonged focus is required.', 'Посмотрите на видимый заголовок нейтральной страницы или заметки. Заметьте контур, затем расширьте взгляд. Укажите пальцем или съёмной меткой одну строку для возвращения; длительная сосредоточенность не требуется.'),
      5: pair('Choose one tiny task, such as finding one date in a note. Write “next: find the date”, try only that task for up to one minute, then leave a return marker: “done” or “resume at this line”. Stop there.', 'Выберите крошечное дело, например найти одну дату в заметке. Запишите «дальше: найти дату», попробуйте только это дело до минуты, затем оставьте метку «готово» или «продолжить с этой строки». На этом остановитесь.'),
      6: pair('Compare the demand “understand the whole page now” with “find one required detail”. Choose the smaller question and write it at the top of a private note. Try finding that detail once; mark the stopping place rather than restarting.', 'Сравните требование «понять всю страницу сейчас» и «найти одну нужную деталь». Выберите меньший вопрос и запишите сверху личной заметки. Один раз попробуйте найти деталь; отметьте место остановки, не начинайте заново.'),
      8: pair('Choose an ordinary start cue, such as opening a personal document. Pair it with writing one task and one stop rule: “one heading, then leave a marker”. Try that pair on a harmless note; stop after the first part.', 'Выберите обычный сигнал начала, например открытие личного документа. Добавьте одну задачу и правило остановки: «один заголовок, потом метка». Попробуйте это на нейтральной заметке; закончите после первой части.'),
      9: pair('Choose a quality such as clarity. Name an external aid, such as a bookmark or a blank line for the next action. Use the aid to make one task explicit: “read this paragraph for one date”. Stop after preparing that cue.', 'Выберите качество, например ясность. Назовите внешнюю опору: закладку или пустую строку для следующего действия. С её помощью уточните одно дело: «прочитать этот абзац ради одной даты». Закончите после подготовки подсказки.'),
      10: pair('Imagine an unrelated idea arriving while you read. Compare switching immediately with noting three words for later. Privately write the three-word parking note and a marker for the current line. Then choose to continue or pause.', 'Представьте постороннюю мысль во время чтения. Сравните немедленное переключение и заметку из трёх слов на потом. Для себя запишите три слова и метку текущей строки. Затем выберите продолжение или паузу.'),
      11: pair('Use a small task you naturally left, or a sample note. Find or create a marker saying where to resume. Read that one line and choose the next tiny action or a break. Do not restart the whole task or add penalty repetitions.', 'Возьмите маленькое естественно прерванное дело или образец заметки. Найдите или создайте метку места возвращения. Прочитайте одну строку и выберите следующий крошечный шаг или отдых. Не начинайте всё заново и не добавляйте повторов в наказание.'),
      12: pair('Write three points: “several notes compete”; “a visible task label can help”; “find one date, then mark the line”. Adapt the detail to a harmless page and try the single action. Finish by leaving the marker, even if unfinished.', 'Запишите три пункта: «несколько заметок конкурируют»; «поможет видимая метка задачи»; «найти одну дату и отметить строку». Подставьте деталь нейтральной страницы и попробуйте одно действие. Завершите меткой, даже если не закончили.'),
      13: pair('Sort three ordinary cases: a clear small task can use a return marker; tired attention may need rest; an unclear instruction may need outside clarification. Choose the case that fits now. You may only write the clarification question, without sending it.', 'Разделите три обычных случая: ясному маленькому делу поможет метка; уставшему вниманию может быть нужен отдых; непонятному условию — внешнее уточнение. Выберите подходящий сейчас случай. Можно только записать вопрос, не отправляя его.'),
      15: pair('Compare a paper note and a digital note. Keep the same task, “locate one detail”, and stopping rule. Choose a paper bookmark in one setting and a short “next” line in the other. Prepare just the version that fits now.', 'Сравните бумажную и цифровую заметку. Сохраните задачу «найти одну деталь» и правило остановки. Для бумаги выберите закладку, для цифровой заметки — короткую строку «дальше». Подготовьте только подходящую сейчас версию.'),
      16: pair('Choose a small nonurgent question. Write one known detail, one unknown detail and the next specific source you could check. Stop at that source label; opening several sources or reaching certainty is not part of this action.', 'Выберите небольшой несрочный вопрос. Запишите одну известную деталь, одну неизвестную и один конкретный источник для следующей проверки. Остановитесь на названии источника; открывать несколько или достигать уверенности не требуется.'),
      17: pair('For a harmless information search, define one detail you need and one source to check first. Remove an optional comparison that is not needed for the decision. Leave a return marker after that source instead of opening more tabs.', 'Для нейтрального поиска определите одну нужную деталь и один первый источник. Уберите необязательное сравнение, не нужное для решения. Оставьте метку возвращения после этого источника вместо открытия новых вкладок.'),
      18: pair('On a small unfinished note, write three labels: “found”, “still unclear”, “next line to check”. Put at most one detail under each, then close or set aside the note. The labels make the stopping point clear without requiring completion.', 'В маленькой незаконченной заметке запишите три подписи: «найдено», «пока неясно», «следующая строка для проверки». Под каждой оставьте не больше одной детали, затем закройте или отложите заметку. Подписи обозначают остановку без обязательного завершения.'),
      19: pair('Compare two changes to your own work area: put the current note in view, or set an unrelated note aside. Choose one and add a visible next-step label to the current task. Stop after this small setup; do not reorganise everything.', 'Сравните два изменения своего места: положить текущую заметку на виду или отложить постороннюю. Выберите одно и добавьте видимую подпись следующего шага к текущему делу. Закончите на этой малой подготовке; не переустраивайте всё.'),
      20: pair('Use a mild invented mismatch, such as a task label with too many words, or a marker that did not help. Name the practical mismatch. Replace it with one concrete verb and object, or leave the task and rest. No need to reproduce the distraction or recover lost time.', 'Возьмите лёгкий вымышленный пример несоответствия, например многословную подпись задачи, либо метку, которая не помогла. Назовите практическое несоответствие. Замените одним конкретным глаголом и предметом либо оставьте дело и отдохните. Не нужно воспроизводить отвлечение или возмещать время.'),
    },
  },
  {
    id: 'name-feeling-and-options', definitionKey: 'hh-weekly-pulse', dimensionKey: 'weekly.mood', topicId: 'emotional_flexibility',
    label: pair('A feeling and an available response', 'Чувство и доступный ответ'),
    entry: pair('Use a mild current or invented feeling, or the words “not sure”. Naming is optional. A feeling can be present while you choose a small action or rest; no positive mood is required.', 'Возьмите лёгкое текущее или вымышленное чувство либо слова «пока не знаю». Называть чувство необязательно. Оно может оставаться, пока вы выбираете маленькое действие или отдых; позитивное настроение не требуется.'),
    reflection: pair('Did I leave room for the feeling and for choice, without requiring myself to feel better?', 'Оставил ли я место чувству и выбору, не требуя от себя чувствовать себя лучше?'),
    transfer: pair('If useful, keep a two-part reminder: “what is here; what I choose next”. Use only mild ordinary situations; rest and outside support remain options.', 'Если полезно, сохраните подсказку из двух частей: «что сейчас есть; что выбираю дальше». Берите только лёгкие обычные ситуации; отдых и внешняя поддержка остаются вариантами.'),
    days: {
      1: pair('Choose one mild feeling word or “not sure”. Add one neutral fact about your surroundings and choose a tiny ordinary action or rest. You may leave the feeling unnamed; stop after making the choice.', 'Выберите слово для лёгкого чувства или «пока не знаю». Добавьте нейтральный факт об обстановке и выберите крошечное обычное действие или отдых. Чувство можно не называть; остановитесь после выбора.'),
      2: pair('Use mild disappointment about a changed plan, or an invented example. Separate the event, the first feeling word, and a judgement such as “I should not feel this”. Keep the event and optional feeling word without the rule.', 'Возьмите лёгкое разочарование из-за изменившегося плана или вымышленный пример. Разделите событие, первое слово о чувстве и оценку «я не должен это чувствовать». Оставьте событие и необязательное слово о чувстве без правила.'),
      3: pair('Write a mild invented chain: a plan changes; disappointment; wanting to abandon the afternoon. Add a second choice, such as keep one ordinary activity or rest. A different response does not require a different feeling.', 'Запишите лёгкую вымышленную цепочку: план меняется; разочарование; хочется отказаться от всего дня. Добавьте второй выбор, например оставить одно обычное занятие или отдохнуть. Другой ответ не требует другого чувства.'),
      4: pair('Look at one neutral object and describe its shape. Widen your view. If comfortable, add one word for a mild feeling; otherwise stay with the shape. Choose a next ordinary action or a pause without testing your mood.', 'Посмотрите на нейтральный предмет и опишите форму. Расширьте взгляд. Если комфортно, добавьте слово о лёгком чувстве; иначе оставайтесь с формой. Выберите обычное действие или паузу, не проверяя настроение.'),
      5: pair('Write one optional feeling word, such as “flat”, “disappointed” or “not sure”. Beside it put one available response: drink some water if wanted, open a window if suitable, or rest. Choose just one response, then stop.', 'Запишите необязательное слово о чувстве: «пусто», «разочарование» или «пока не знаю». Рядом укажите доступный ответ: выпить воды, если хочется, открыть окно, если уместно, или отдохнуть. Выберите только один ответ и остановитесь.'),
      6: pair('For an invented mild low moment, compare “I must cheer up before doing anything” with “I can choose one ordinary thing while feeling this way”. Pick a tiny action or rest; you need not perform happiness or change the feeling.', 'Для вымышленного лёгкого спада сравните «сначала нужно развеселиться» и «могу выбрать одно обычное дело с этим чувством». Выберите крошечное действие или отдых; изображать радость или менять чувство не требуется.'),
      8: pair('Choose an ordinary cue, such as putting a cup down. Pair it with “one feeling word, or unknown; one available choice”. Try the pair once with a mild feeling or invented example, then continue the day or rest.', 'Выберите обычный сигнал, например поставить чашку. Добавьте «одно слово о чувстве или неизвестно; один доступный выбор». Один раз попробуйте пару с лёгким чувством или вымышленным примером, затем продолжите день или отдохните.'),
      9: pair('Choose a quality such as care or curiosity, even if the mood does not match. Name an external aid, such as a comfortable seat or a simple activity already nearby. Choose one tiny action expressing the quality without demanding enjoyment.', 'Выберите качество, например заботу или любопытство, даже если настроение иное. Назовите внешнюю опору: удобное место или простое занятие рядом. Выберите маленькое действие в духе качества, не требуя удовольствия.'),
      10: pair('Imagine mild irritation during a harmless interruption. Name the urge to react and two acceptable choices: pause or return to one ordinary task. Privately select one. Feeling irritated does not require acting on the first impulse.', 'Представьте лёгкое раздражение при безопасной помехе. Назовите порыв отреагировать и два допустимых выбора: пауза или возвращение к обычному делу. Для себя выберите один. Раздражение не обязывает действовать по первому порыву.'),
      11: pair('Use an interrupted pleasant or neutral activity, real or invented. Name any mild feeling or “unknown”. Choose to return for one small part or rest, without treating the interruption as a failed day. Stop after that part or choice.', 'Возьмите прерванное приятное или нейтральное занятие, реальное или вымышленное. Назовите лёгкое чувство или «неизвестно». Вернитесь к маленькой части либо выберите отдых, не считая отвлечение провалом дня. На этой части или выборе остановитесь.'),
      12: pair('Write three short points: “a mild feeling is here, or unknown”; “an ordinary object or seat is available”; “I can do one small thing or rest”. Choose the last step without trying to alter the feeling first.', 'Запишите три коротких пункта: «есть лёгкое чувство или неизвестно»; «рядом обычный предмет или место»; «могу сделать одно малое дело или отдохнуть». Выберите последний шаг, не пытаясь сначала изменить чувство.'),
      13: pair('Name an ordinary situation for each option: noticing a mild feeling and choosing an action; resting without an exercise; seeking appropriate support when the difficulty is beyond self-help. Choose a category privately, without recalling a painful event.', 'Назовите обычную ситуацию для каждого варианта: заметить лёгкое чувство и выбрать действие; отдохнуть без упражнения; обратиться к подходящей поддержке за пределами самопомощи. Для себя выберите категорию, не вспоминая болезненное событие.'),
      15: pair('Compare naming a mild feeling in a private note with using “something is here” silently in a busy place. Keep the freedom to choose an action or rest; change the wording to fit privacy. Try one form only.', 'Сравните называние лёгкого чувства в личной заметке и мысленное «что-то есть» в оживлённом месте. Сохраните свободу выбрать действие или отдых; измените слова под приватность. Попробуйте только одну форму.'),
      16: pair('For a mild uncertain mood, write “I do not know the exact word”. Separate that fact from “I must explain it immediately”. Choose one ordinary next action or rest, leaving the label open. No search for a deeper cause is needed.', 'При лёгком неопределённом настроении запишите «не знаю точного слова». Отделите факт от «нужно немедленно объяснить». Выберите обычный следующий шаг или отдых, оставив название открытым. Искать глубокую причину не нужно.'),
      17: pair('Choose a mild everyday disappointment. Keep any real practical task, such as updating your own plan, and remove the extra demand “I must feel cheerful about it”. Write one workable next option while allowing the feeling to remain.', 'Выберите лёгкое бытовое разочарование. Сохраните реальное дело, например изменение своего плана, и уберите лишнее «нужно радоваться этому». Запишите один рабочий следующий вариант, позволяя чувству оставаться.'),
      18: pair('At the end of a small activity, note what actually happened and one optional feeling word. Write “this activity is finished; the feeling can still be here”. Choose rest or another ordinary action; do not wait for emotional closure.', 'В конце маленького занятия отметьте произошедшее и необязательное слово о чувстве. Запишите «занятие закончено; чувство может оставаться». Выберите отдых или обычное действие; ждать эмоционального завершения не нужно.'),
      19: pair('Compare two available supports for a small ordinary activity: put its materials within reach or choose a comfortable place to sit. Make one safe change. You may try the activity or stop at preparation, regardless of mood.', 'Сравните две доступные опоры для небольшого обычного занятия: положить материалы под рукой или выбрать удобное место для сидения. Сделайте одно безопасное изменение. Можно попробовать занятие или закончить подготовкой при любом настроении.'),
      20: pair('Use a mild invented example where naming feelings becomes a demand, or an actual naming exercise that did not fit. Leave the feeling unnamed. Use “not sure” or one neutral fact about the room instead. Choose ordinary rest or a tiny next action. An unchanged mood is not a reason to repeat or catch up.', 'Возьмите лёгкий вымышленный пример, где называние чувств становится требованием, либо реальное неподходящее упражнение. Оставьте чувство без названия. Используйте «пока не знаю» или нейтральный факт о комнате. Выберите обычный отдых или крошечное действие. Неизменное настроение не повод повторять или наверстывать.'),
    },
  },
]
// These alternatives have their own action and rationale. Missing entries are
// deliberately unavailable; they are never filled with a renamed standard card.
const ALTERNATIVES = {
  'pace-one-action': {
    5: {
      action: pair('Instead of doing a chore, choose an ordinary rest where you already are, if comfortable. Put one task out of your immediate working area if safe, or simply leave it alone. Rest briefly; there is no task to earn or complete afterward.', 'Вместо бытового действия выберите обычный отдых там, где уже находитесь, если удобно. Безопасно уберите одно дело с рабочего места либо просто оставьте его. Немного отдохните; заслуживать отдых или что-то выполнять после не нужно.'),
      method: 'ordinary-rest-with-task-boundary',
      difference: pair('Chooses recovery and a task boundary instead of carrying out a microtask.', 'Выбирает отдых и границу дела вместо выполнения микрозадачи.'),
    },
  },
  'fair-self-statement': {
    5: {
      action: pair('Instead of writing a supportive sentence, place a plain scrap of paper beside one small unfinished task. Let it mean “pause allowed”. Look at the paper once and set the task aside if appropriate. No positive words or belief are needed.', 'Вместо поддерживающей фразы положите пустой листок рядом с небольшим незаконченным делом. Пусть он означает «пауза допустима». Один раз посмотрите на листок и при необходимости отложите дело. Позитивные слова и вера в них не нужны.'),
      method: 'nonverbal-permission-cue',
      difference: pair('Uses an external nonverbal permission cue rather than rewriting self-talk.', 'Использует внешнюю бессловесную подсказку-разрешение вместо изменения внутренней фразы.'),
    },
  },
  'safe-request': {
    5: {
      action: pair('Instead of rehearsing a request, sketch two private options: quiet company in a safe familiar place, or time alone. Circle the one that fits today and add a comfortable duration. Stop at this private choice; no person needs to be named or contacted.', 'Вместо репетиции просьбы набросайте два личных варианта: спокойное присутствие рядом с кем-то в безопасном знакомом месте или время одному. Обведите подходящий сегодня и добавьте комфортную длительность. Закончите личным выбором; называть человека и связываться не нужно.'),
      method: 'private-contact-preference-choice',
      difference: pair('Clarifies desired contact and boundaries without practising a message.', 'Уточняет желаемое общение и границы без репетиции сообщения.'),
    },
  },
  'external-pause': {
    5: {
      action: pair('Instead of directing your gaze, reduce one optional source of visual input: turn an unrelated page face down or close a book you are not using. Keep safety information visible. Then pause without an attention exercise or a check for calm.', 'Вместо направленного взгляда уменьшите один необязательный источник зрительной информации: переверните посторонний лист или закройте ненужную сейчас книгу. Информация о безопасности остаётся видна. Затем сделайте паузу без упражнения на внимание и проверки спокойствия.'),
      method: 'reduce-one-optional-input',
      difference: pair('Changes one environmental demand instead of performing an external-focus exercise.', 'Изменяет одно требование среды вместо упражнения с внешней фокусировкой.'),
    },
  },
  'one-visible-task': {
    5: {
      action: pair('Instead of reading or finding information, choose one harmless task for later. Place its light physical item, such as a book, in a safe visible spot with a blank bookmark at the starting page. Stop at preparation; you do not need to begin the task.', 'Вместо чтения или поиска информации выберите одно нейтральное дело на потом. Положите его лёгкий предмет, например книгу, в безопасное видимое место с пустой закладкой на начальной странице. Закончите подготовкой; начинать дело не требуется.'),
      method: 'physical-start-cue-without-task-execution',
      difference: pair('Prepares a physical starting cue instead of working on a task and recording progress.', 'Готовит физическую подсказку начала вместо выполнения дела и записи прогресса.'),
    },
  },
  'name-feeling-and-options': {
    5: {
      action: pair('Instead of naming a feeling, choose one neutral object nearby. Privately invent two ordinary uses for it, or two places it could safely belong. Pick either possibility and stop without moving it. A small choice is possible without explaining your mood.', 'Вместо называния чувства выберите нейтральный предмет рядом. Для себя придумайте два обычных применения или два безопасных места для него. Выберите любой вариант и остановитесь, не перемещая предмет. Маленький выбор возможен без объяснения настроения.'),
      method: 'neutral-object-choice-without-emotion-label',
      difference: pair('Exercises choice through a neutral external object without identifying an emotion.', 'Пробует выбор через нейтральный внешний предмет без определения эмоции.'),
    },
  },
}

const REVIEW_ACTIONS = {
  7: {
    standard: pair('Look at every selected goal in your plan, not just the topic practised today. For each, privately mark keep, simplify, leave out, or not tried. Use only actual experience; “not tried” needs no catch-up. Choose one small adjustment for the coming week.', 'Посмотрите на каждую выбранную цель плана, а не только на сегодняшнюю тему. Для каждой лично отметьте: сохранить, упростить, убрать или не пробовал. Опирайтесь только на реальный опыт; «не пробовал» не требует наверстывания. Выберите одно маленькое изменение на следующую неделю.'),
    short: pair('Scan every selected goal. Give each one mark: keep, change, leave out, or not tried. Choose one adjustment, including rest. No goal needs a score or a completed practice to be included.', 'Просмотрите каждую выбранную цель. Для каждой оставьте отметку: сохранить, изменить, убрать или не пробовал. Выберите одно изменение, включая отдых. Для включения цели не нужны балл или завершённая практика.'),
    reflection: pair('Which conditions fitted, whether or not any feelings or scores changed?', 'Какие условия подошли независимо от изменения чувств или баллов?'),
    transfer: pair('Keep one adjustment as an option for next week. There is nothing to catch up on.', 'Сохраните одно изменение как вариант на следующую неделю. Наверстывать ничего не нужно.'),
  },
  14: {
    standard: pair('For every selected goal, compare one expectation with one actual observation, or mark not tried. Write keep, simplify, replace or pause beside each. Then choose the main and optional second emphasis for the final week, while keeping other selected goals visible. Do not infer that a practice caused a score change.', 'Для каждой выбранной цели сопоставьте одно ожидание с одним наблюдением либо отметьте «не пробовал». Рядом с каждой напишите: сохранить, упростить, заменить или пауза. Затем выберите главный и необязательный второй акцент последней недели, сохраняя остальные цели на виду. Не делайте вывод, что практика вызвала изменение балла.'),
    short: pair('For each selected goal, mark matched expectations, differed, or not tried. Choose keep, change or pause for each, then name one main emphasis for next week. No increase in load or removal of other goals is required.', 'Для каждой выбранной цели отметьте: ожидание совпало, отличалось или не пробовал. Для каждой выберите сохранить, изменить или пауза, затем назовите главный акцент следующей недели. Увеличивать нагрузку или убирать другие цели не нужно.'),
    reflection: pair('What did the actual attempts suggest about fit, rather than about success or failure?', 'Что реальные попытки показали о соответствии, а не об успехе или неудаче?'),
    transfer: pair('Save the preferred adjustment privately. A review note is a proposal; it does not itself change the plan or its selected goals.', 'Сохраните желаемое изменение для себя. Заметка обзора — предложение; сама по себе она не меняет план и выбранные цели.'),
  },
  21: {
    standard: pair('Include every selected goal in a small toolkit. For each, name one acceptable skill or not yet chosen, a suitable everyday context, and an easier option such as rest. Add one limit of self-help and when outside support may be needed. Choose an optional time to revisit the toolkit; complete change is not required.', 'Включите каждую выбранную цель в небольшой личный набор. Для каждой назовите приемлемый навык или «пока не выбран», подходящий бытовой контекст и более лёгкий вариант, включая отдых. Добавьте одну границу самопомощи и случай, когда нужна внешняя поддержка. По желанию выберите время возвращения к набору; полное изменение не требуется.'),
    short: pair('For each selected goal, record one skill or not yet chosen, a suitable situation and an easier option. Add “pause or seek appropriate support if this does not fit”. Choose whether to revisit later. No test retake or proof of improvement is needed.', 'Для каждой выбранной цели запишите навык или «пока не выбран», подходящую ситуацию и облегчённый вариант. Добавьте «пауза или подходящая поддержка, если не подходит». Решите, возвращаться ли позже. Повтор теста и доказательство улучшения не нужны.'),
    reflection: pair('What can I choose more deliberately, even if my feelings have not changed?', 'Что я могу выбирать осознаннее, даже если чувства не изменились?'),
    transfer: pair('Keep only the parts you want. Any later test comparison needs the instrument’s appropriate interval and compatible version; it cannot establish that this course caused change.', 'Сохраните только нужные части. Позднее сравнение тестов требует подходящего методике интервала и совместимой версии; оно не доказывает, что изменения вызваны курсом.'),
  },
}

const COPY = {
  en: {
    safety: 'Choose a safe ordinary setting. Keep eyes open and breathe normally. Skip, stop or rest at any time; no particular feeling is required. This is educational self-help, not diagnosis or treatment.',
    briefSafety: 'Eyes open, normal breathing. Skip, stop or rest anytime. Educational self-help, not treatment.',
    prepare: 'Read the one action below and choose whether it fits now. A mild invented example is fine. No earlier lesson or completed practice is needed.',
    stop: 'End after one pass or about one minute of trying, whichever comes first. You may stop sooner. Do not add repetitions or catch up.',
    finish: 'Look around and choose the next ordinary activity or rest. Optional questions can be left unanswered.',
    shortFinish: 'Stop here. You may rest; no extra attempt is needed.',
    reviewEntry: 'Have the list of all selected goals available. Review only experiences you actually had. A goal with no attempts still belongs in this review; mark it not tried.',
    reviewStop: 'Stop after one pass through every selected goal, even if some entries say not tried or not yet chosen. You may pause earlier and leave blank entries.',
    reviewShortEntry: 'Use the list of all selected goals; include those not tried.',
    unavailable: 'No separately written alternative is available for this objective and skill. A shorter version or rest remains a choice.',
  },
  ru: {
    safety: 'Выберите безопасную обычную обстановку. Глаза открыты, дыхание обычное. Любой шаг можно пропустить, прекратить или заменить отдыхом; определённое чувство не требуется. Это образовательная самопомощь, не диагностика и не лечение.',
    briefSafety: 'Глаза открыты, дыхание обычное. Можно пропустить, остановиться или отдохнуть. Образовательная самопомощь, не лечение.',
    prepare: 'Прочитайте одно действие ниже и решите, подходит ли оно сейчас. Можно взять лёгкий вымышленный пример. Предыдущие уроки и завершённые практики не нужны.',
    stop: 'Закончите после одного прохода или примерно минуты попытки — что наступит раньше. Можно раньше. Не добавляйте повторов и не наверстывайте.',
    finish: 'Оглядитесь и выберите следующее обычное занятие или отдых. Необязательные вопросы можно оставить без ответа.',
    shortFinish: 'На этом остановитесь. Можно отдохнуть; дополнительная попытка не нужна.',
    reviewEntry: 'Держите под рукой список всех выбранных целей. Рассматривайте только реальный опыт. Цель без попыток тоже входит в обзор; отметьте «не пробовал».',
    reviewStop: 'Закончите после одного прохода по всем выбранным целям, даже если где-то стоит «не пробовал» или «пока не выбран». Можно прерваться раньше и оставить пустые строки.',
    reviewShortEntry: 'Используйте список всех выбранных целей; включите и неопробованные.',
    unavailable: 'Отдельно написанной альтернативы для этой цели урока и навыка пока нет. Можно выбрать короткую версию или отдых.',
  },
}

const objectiveId = day => `${PERSONAL_COURSE_PILOT_CURRICULUM_VERSION}/day/${day}`
const practiceId = (skillId, day, variant, locale) => `hh-personal-pilot/${skillId}/day/${day}/${variant}/${locale}`
function practiceReference(card) {
  return Object.fromEntries(['objectiveId', 'skillId', 'practiceId', 'contentVersion', 'contentLocale', 'variant', 'durationMinutes', 'intensity', 'reviewStatus', 'minimumEntry'].map(key => [key, card[key]]))
}
function baseCard(skillId, day, variant, locale) {
  const arc = ARC.find(row => row.day === day)
  return {
    practiceId: practiceId(skillId, day, variant, locale), skillId, day, week: arc.week,
    kind: arc.review ? 'whole-goal-review' : 'practice', objectiveId: objectiveId(day),
    curriculumVersion: PERSONAL_COURSE_PILOT_CURRICULUM_VERSION,
    sharedSkill: arc.skill[locale], sharedObjective: arc.objective[locale],
    contentVersion: PERSONAL_COURSE_PILOT_VERSION, contentLocale: locale, variant,
    durationMinutes: variant === 'standard' ? 5 : 2, durationIsEstimate: true,
    durationIncludes: ['entry', 'explanation', 'action', 'optional-reflection', 'finish'],
    completionTimerRequired: false, intensity: 'gentle', reviewStatus: 'draft',
    contentStatus: PERSONAL_COURSE_PILOT_STATUS, minimumEntry: true,
    requiresPreviousCompletion: false, previousLessonRequired: false,
    source: SOURCE, sourceType: 'original-educational-content',
    clinicalValidation: false, efficacyClaim: false, automaticTreatment: false,
    independentReviewRequired: ['objective-to-practice-mapping', 'content-safety', 'en-language', 'ru-language'],
    accessibility: { eyesOpen: true, naturalBreathing: true, textVersion: true, skipAnytime: true, stopAnytime: true, restAnytime: true },
  }
}
function makePracticeCard(skill, day, variant, locale) {
  const alt = ALTERNATIVES[skill.id]?.[day]
  if (variant === 'alternative' && !alt) return null
  const t = COPY[locale], short = variant !== 'standard'
  const action = (variant === 'alternative' ? alt.action : skill.days[day])[locale]
  const card = {
    ...baseCard(skill.id, day, variant, locale), topicId: skill.topicId, dimensionKey: skill.dimensionKey,
    title: `${ARC.find(row => row.day === day).skill[locale]}: ${skill.label[locale]}`,
    entry: skill.entry[locale], safety: short ? t.briefSafety : t.safety,
    steps: short ? [action] : [t.prepare, action], action, stoppingPoint: t.stop,
    optionalReflection: short ? null : skill.reflection[locale],
    optionalTransfer: short ? null : skill.transfer[locale],
    finish: short ? t.shortFinish : t.finish,
    practiceMethod: variant === 'alternative' ? alt.method : skill.id,
    alternativeDifference: variant === 'alternative' ? alt.difference[locale] : null,
    alternativeAvailability: alt ? { status: 'draft-review-required' } : { status: 'unavailable', reason: 'distinct-alternative-not-authored', explanation: t.unavailable },
    executionScope: 'private-individual-practice', contactRequired: false,
  }
  return card
}
function makeReviewCard(day, variant, locale) {
  // A short review is authored separately. No review alternative is fabricated.
  const action = REVIEW_ACTIONS[day]?.[variant]?.[locale]
  if (!action) return null
  const t = COPY[locale], short = variant === 'short'
  return {
    ...baseCard('review-all-selected-goals', day, variant, locale),
    topicId: null, dimensionKey: null, title: ARC.find(row => row.day === day).skill[locale],
    entry: short ? t.reviewShortEntry : t.reviewEntry, safety: short ? t.briefSafety : t.safety,
    steps: [action], action, stoppingPoint: t.reviewStop,
    optionalReflection: short ? null : REVIEW_ACTIONS[day].reflection[locale],
    optionalTransfer: short ? null : REVIEW_ACTIONS[day].transfer[locale],
    finish: short ? t.shortFinish : t.finish,
    practiceMethod: 'review-every-selected-goal', alternativeDifference: null,
    alternativeAvailability: { status: 'unavailable', reason: 'distinct-alternative-not-authored', explanation: t.unavailable },
    reviewScope: 'all-selected-goals', coversAllSelectedGoals: true,
    goalListSource: 'plan.selectedScaleIds', includesUnpractisedGoals: true,
    updatesPlanAutomatically: false, retestRequired: false, contactRequired: false,
    executionScope: 'private-individual-practice',
  }
}

export const PERSONAL_COURSE_PILOT_CONTENT = deepFreeze([
  ...SKILLS.flatMap(skill => PRACTICE_DAYS.flatMap(day => LOCALES.flatMap(locale => VARIANTS.map(variant => makePracticeCard(skill, day, variant, locale)).filter(Boolean)))),
  ...REVIEW_DAYS.flatMap(day => LOCALES.flatMap(locale => VARIANTS.map(variant => makeReviewCard(day, variant, locale)).filter(Boolean))),
])

const mappings = PERSONAL_COURSE_PILOT_INSTRUMENTS.flatMap(instrument => SKILLS.filter(skill => skill.definitionKey === instrument.definitionKey).map(skill => ({
  identity: { ...instrument, dimensionKey: skill.dimensionKey },
  mappingVersion: `${PERSONAL_COURSE_PILOT_VERSION}/mapping/${instrument.definitionId}/${skill.dimensionKey}`,
  status: 'draft', source: SOURCE, topicId: skill.topicId,
  curriculumVersion: PERSONAL_COURSE_PILOT_CURRICULUM_VERSION,
  practices: PERSONAL_COURSE_PILOT_CONTENT.filter(card => card.skillId === skill.id).map(practiceReference),
})))

export const PERSONAL_COURSE_PILOT_DRAFT_BUNDLE = deepFreeze({
  version: PERSONAL_COURSE_PILOT_VERSION, status: 'draft', contentStatus: PERSONAL_COURSE_PILOT_STATUS,
  source: SOURCE, curriculumVersion: PERSONAL_COURSE_PILOT_CURRICULUM_VERSION,
  clinicalValidation: false, productionEligible: false, productionIntegrated: false,
  reviewApprovalMeans: 'editorial-and-exact-mapping-approval-only-not-clinical-efficacy',
  scope: {
    constructCount: 6, exactScaleBindingCount: 12, instrumentFormCount: 4,
    contentLocales: LOCALES, contentLocaleIndependentOfInstrumentLocale: true,
    practiceDays: PRACTICE_DAYS, reviewDays: REVIEW_DAYS,
    otherScales: 'unsupported-outside-this-pilot', completeAssessmentBatteryCovered: false,
    unboundDimensionsInPilotInstruments: {
      'hh-resource-pulse': ['resource.support', 'resource.agency', 'resource.meaning', 'resources.overall'],
      'hh-weekly-pulse': ['weekly.load', 'weekly.recovery', 'weekly.energy', 'weekly.connection', 'weekly.functioning'],
    },
    alternativeDaysBySkill: Object.fromEntries(SKILLS.map(skill => [skill.id, Object.keys(ALTERNATIVES[skill.id] ?? {}).map(Number)])),
    principleBasis: ['ordinary-self-observation', 'manageable-actions-and-rest', 'fair-factual-self-response', 'private-rehearsal-with-choice', 'external-attention-with-natural-breathing', 'explicit-next-step-and-return-marker'],
    sourceClaim: 'Original educational writing; no licensed manual text or clinical efficacy claim.',
  },
  mappings,
  reviewMapping: {
    mappingVersion: `${PERSONAL_COURSE_PILOT_VERSION}/whole-goal-review`, status: 'draft', source: SOURCE,
    curriculumVersion: PERSONAL_COURSE_PILOT_CURRICULUM_VERSION, coversAllSelectedGoals: true,
    practices: PERSONAL_COURSE_PILOT_CONTENT.filter(card => card.kind === 'whole-goal-review').map(practiceReference),
  },
})

const IDENTITY_KEYS = ['definitionId', 'definitionKey', 'definitionVersion', 'instrumentLocale', 'translationVersion', 'contentHash', 'scoringKey', 'scoringVersion', 'resultVersion', 'timeframe', 'dimensionKey']
const sameIdentity = (a, b) => Boolean(a && b && IDENTITY_KEYS.every(key => nonempty(a[key]) && a[key] === b[key]))
const contentIndex = new Map(PERSONAL_COURSE_PILOT_CONTENT.map(card => [`${card.practiceId}\u0000${card.contentVersion}\u0000${card.contentLocale}`, card]))

// Lookups are editorial helpers, never an approval gate or runtime fallback.
// No lookup defaults the locale, version, definition, dimension or variant.
export function getPersonalCoursePilotContent({ practiceId, contentVersion, contentLocale } = {}) {
  if (![practiceId, contentVersion, contentLocale].every(nonempty)) return null
  const card = contentIndex.get(`${practiceId}\u0000${contentVersion}\u0000${contentLocale}`)
  return card ? clone(card) : null
}
export function getPersonalCoursePilotMapping(identity) {
  const found = PERSONAL_COURSE_PILOT_DRAFT_BUNDLE.mappings.find(mapping => sameIdentity(mapping.identity, identity))
  return found ? clone(found) : null
}
export function personalCoursePilotSupport(identity) {
  const mapping = getPersonalCoursePilotMapping(identity)
  return mapping
    ? { status: 'draft-review-required', reason: 'independent-review-required', productionEligible: false, mappingVersion: mapping.mappingVersion, topicId: mapping.topicId }
    : { status: 'unsupported', reason: 'outside-pilot-or-exact-identity-mismatch', productionEligible: false, mappingVersion: null, topicId: null }
}
export function personalCoursePilotVariantAvailability({ skillId, day, contentLocale, variant } = {}) {
  if (!nonempty(skillId) || !Number.isInteger(day) || !LOCALES.includes(contentLocale) || !VARIANTS.includes(variant)) {
    return { status: 'unavailable', reason: 'invalid-content-selector', practice: null }
  }
  const card = getPersonalCoursePilotContent({ practiceId: practiceId(skillId, day, variant, contentLocale), contentVersion: PERSONAL_COURSE_PILOT_VERSION, contentLocale })
  return card
    ? { status: 'draft-review-required', reason: 'independent-review-required', practice: practiceReference(card) }
    : { status: 'unavailable', reason: 'exact-variant-not-authored', practice: null }
}

// One row per exact skill/objective, including reviews, for independent review.
// The short and alternative bodies are shown explicitly, not hidden behind IDs.
export function listPersonalCoursePilotAuditRows() {
  const keys = [...new Set(PERSONAL_COURSE_PILOT_CONTENT.map(card => `${card.skillId}:${card.day}`))]
  return keys.map(key => {
    const cards = PERSONAL_COURSE_PILOT_CONTENT.filter(card => `${card.skillId}:${card.day}` === key)
    const first = cards[0]
    return {
      skillId: first.skillId, day: first.day, kind: first.kind, objectiveId: first.objectiveId,
      reviewStatus: 'draft', contentStatus: PERSONAL_COURSE_PILOT_STATUS,
      locales: Object.fromEntries(LOCALES.map(locale => [locale, {
        title: cards.find(card => card.contentLocale === locale).title,
        sharedObjective: cards.find(card => card.contentLocale === locale).sharedObjective,
        variants: Object.fromEntries(VARIANTS.map(variant => {
          const card = cards.find(card => card.contentLocale === locale && card.variant === variant)
          return [variant, card ? { status: 'draft-review-required', ...clone(card) } : { status: 'unavailable', reason: 'exact-variant-not-authored' }]
        })),
      }])),
    }
  })
}

// Original educational drafts for three missing constructs in the two-pilot path.
// Isolated content source: this file neither integrates a runtime nor approves content.
// Literal instrument, shape, source and curriculum pins require fresh review on change.
import { deepFreeze } from '../../lib/assessments/contracts.js'

export const PERSONAL_COURSE_SUPPORT_FAMILIES_VERSION = 'hh-personal-support-families-v2-draft-2026-10-12'
export const PERSONAL_COURSE_SUPPORT_FAMILIES_STATUS = 'ORIGINAL_DRAFT_REVIEW_REQUIRED'
// Atomic content edition shared with the existing pilot and its whole-goal reviews.
// Distinct practice IDs identify these newly authored bytes; no existing card is replaced.
export const PERSONAL_COURSE_SUPPORT_FAMILIES_CONTENT_VERSION = 'hh-personal-practices-21-v2-pilot-2026-10-12'
export const PERSONAL_COURSE_SUPPORT_FAMILIES_CURRICULUM_VERSION = 'hh-21day-editorial-overlay-2026-10-12'
const SOURCE = 'Holistic House original educational practice drafts; independent editorial, mapping and language review pending'
const LOCALES = ['en', 'ru']
const VARIANTS = ['standard', 'short']
const PRACTICE_DAYS = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20]
const pair = (en, ru) => ({ en, ru })
const clone = value => structuredClone(value)
const nonempty = value => typeof value === 'string' && value.trim().length > 0

export const PERSONAL_COURSE_SUPPORT_FAMILIES_INSTRUMENTS = deepFreeze([
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

// Authoring-time literal snapshot, not an import-time binding to a moving curriculum.
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

// Standard and short actions are separately authored. A short action reduces the
// number or scope of decisions while retaining the exact shared day objective.
const FAMILIES = [
  {
    id: 'rest-and-rhythm', definitionKey: 'hh-weekly-pulse', dimensionKey: 'weekly.recovery', topicId: 'calm_regulation',
    label: pair('Ordinary rest and rhythm', 'Обычный отдых и ритм'),
    entry: pair('Explore one ordinary pause that fits your actual setting. No change in energy, relaxation or sleep is required.', 'Попробуйте одну обычную паузу, подходящую к вашей обстановке. Изменения сил, расслабления или сна не требуется.'),
    shortEntry: pair('Choose an ordinary pause, without requiring recovery.', 'Выберите обычную паузу, не требуя восстановления.'),
    boundary: pair('Keep your usual sleep opportunities and necessary care. This practice does not set bedtimes or treat sleep problems.', 'Сохраняйте привычные возможности для сна и необходимый уход. Практика не задаёт время сна и не лечит нарушения сна.'),
    reflection: pair('Did this pause fit the conditions available, even if you did not feel more restored?', 'Подошла ли пауза к доступным условиям, даже если ощущения восстановления не было?'),
    transfer: pair('If useful, leave room for the same ordinary pause at one safe transition. No fixed schedule or missed-pause debt is needed.', 'Если полезно, оставьте место для такой обычной паузы при одном безопасном переходе. Фиксированный график и долг за пропущенную паузу не нужны.'),
    days: {
      1: {
        standard: pair('Notice one fact about a pause available today, such as “there is a chair nearby” or “I have a short gap”. Choose whether to use part of that gap without adding a task. Describe the situation without rating how well you rested; a pause may feel unchanged.', 'Заметьте один факт о доступной сегодня паузе: «рядом есть стул» или «есть небольшой перерыв». Решите, использовать ли часть перерыва без дополнительного дела. Опишите ситуацию, не оценивая качество своего отдыха; ощущения во время паузы могут не измениться.'),
        short: pair('Notice one fact: “a brief gap is available” or “no gap now”. Choose a pause or leave it for later; neither is a failure.', 'Отметьте один факт: «есть короткий перерыв» или «сейчас перерыва нет». Выберите паузу или отложите её; оба варианта допустимы.'),
      },
      2: {
        standard: pair('Use a mild example: while sorting papers, you reread the same line. Separate the signal “rereading”, the context “several papers at once”, and the judgement “I should cope better”. Replace the judgement with the two facts. Consider a brief pause without deciding what caused the signal.', 'Возьмите лёгкий пример: разбирая бумаги, вы перечитываете одну строку. Разделите сигнал «перечитываю», контекст «несколько бумаг сразу» и оценку «надо лучше справляться». Замените оценку двумя фактами. Рассмотрите короткую паузу, не определяя причину сигнала.'),
        short: pair('In an imagined paper-sorting task, label “rereading” as a signal and “many papers” as context. Leave out “I am failing”; a pause is optional.', 'В воображаемом разборе бумаг отметьте сигнал «перечитываю» и контекст «много бумаг». Опустите «я не справляюсь»; пауза по желанию.'),
      },
      3: {
        standard: pair('Sketch an invented sequence: a task ends; the thought “fill every gap”; immediately starting another task. Mark the space between the thought and the next action. Add a possible response: leave a brief gap before choosing what comes next. You do not need to create calm in that gap.', 'Набросайте вымышленную цепочку: дело закончилось; мысль «заполняй каждый перерыв»; немедленное начало нового дела. Отметьте место между мыслью и действием. Добавьте возможный ответ: оставить небольшой перерыв перед следующим выбором. Создавать спокойствие во время перерыва не нужно.'),
        short: pair('Imagine: task ends → “keep going” → start again. Add one choice before restarting: a brief ordinary pause.', 'Представьте: дело закончено → «продолжай» → новое дело. Добавьте один выбор перед продолжением: короткую обычную паузу.'),
      },
      4: {
        standard: pair('Find a safe place where you could pause, or simply look at a neutral object nearby. With eyes open, notice its edge, colour and position. Let your attention stay outside for one brief pass, then decide whether to pause. There is no requirement to feel relaxed or restored.', 'Найдите безопасное место для паузы или посмотрите на нейтральный предмет рядом. С открытыми глазами заметьте край, цвет и положение. На короткое время направьте внимание вовне, затем решите, делать ли паузу. Чувствовать расслабление или восстановление не требуется.'),
        short: pair('With eyes open, notice one edge of a nearby neutral object. Stop after that detail; relaxation is not a task.', 'С открытыми глазами заметьте один край нейтрального предмета рядом. На этой детали остановитесь; расслабление не является заданием.'),
      },
      5: {
        standard: pair('Choose one tiny preparation for ordinary rest: put a nonurgent paper aside, clear a small place for your cup, or sit in an available chair. Do only that preparation if manageable, then leave a brief gap. If even preparation is too much, choose rest without arranging anything.', 'Выберите крошечную подготовку к обычному отдыху: отложить несрочную бумагу, освободить место для чашки или сесть на доступный стул. Если посильно, сделайте только это и оставьте короткую паузу. Если подготовка требует лишних сил, отдыхайте без обустройства.'),
        short: pair('Set aside one nonurgent paper if easy, then pause. If that is too much, rest without preparation.', 'Если легко, отложите одну несрочную бумагу и сделайте паузу. Если сил мало, отдыхайте без подготовки.'),
      },
      6: {
        standard: pair('Privately name an ordinary demand, such as “I must earn a break by clearing everything”. Write a second response: “I may pause with unfinished work when it is safe”. Choose whether to use this response for one small task. Keep safety and real commitments in view; do not test how long you can push through.', 'Для себя назовите обычное требование: «перерыв надо заслужить, закончив всё». Запишите другой ответ: «можно сделать паузу с незавершённым делом, если это безопасно». Решите, подходит ли ответ для одного небольшого дела. Учитывайте безопасность и реальные обязательства; не проверяйте предел выносливости.'),
        short: pair('Replace an imagined “finish everything before rest” with “a safe pause can come before everything is done”. Choose whether that fits.', 'Замените вымышленное «сначала закончи всё» на «безопасная пауза возможна до завершения всего». Решите, подходит ли это.'),
      },
      8: {
        standard: pair('Choose a safe ordinary transition, such as putting down a book or finishing a drink. At that transition, leave a small gap before the next optional task. Try it once now with an available object, or rehearse the choice privately. A reminder to pause is an invitation, not a fixed timetable.', 'Выберите безопасный обычный переход: отложить книгу или закончить напиток. Оставьте небольшой перерыв до следующего необязательного дела. Попробуйте один раз с доступным предметом или мысленно обдумайте выбор. Напоминание о паузе — приглашение, а не жёсткое расписание.'),
        short: pair('At an ordinary safe transition, such as putting down a book, choose a brief gap before the next optional task.', 'При обычном безопасном переходе, например отложив книгу, выберите короткий перерыв до следующего необязательного дела.'),
      },
      9: {
        standard: pair('Choose a personal quality, such as care or steadiness, that could make room for rest. Separately name an external support, such as an available chair or a quieter corner. Pair the quality with one realistic pause using that support. If the support is unavailable, note the limit rather than asking more of yourself.', 'Выберите личное качество, например заботу или размеренность, в котором есть место отдыху. Отдельно назовите внешнюю опору: доступный стул или более тихий угол. Соедините качество с одной реальной паузой с этой опорой. Если опоры нет, отметьте ограничение, не требуя от себя большего.'),
        short: pair('Name one chosen quality, such as care, and one available place for a pause. “No place available now” is also useful information.', 'Назовите выбранное качество, например заботу, и доступное место для паузы. «Сейчас места нет» — тоже полезная информация.'),
      },
      10: {
        standard: pair('Imagine a free moment and an urge to fill it with another nonurgent chore. Name the urge without following it immediately. Compare two available responses: do one small part or keep the gap for rest. Choose privately; a pause need not produce a special feeling to be allowed.', 'Представьте свободную минуту и порыв заполнить её новым несрочным делом. Назовите порыв, не следуя ему сразу. Сравните два доступных ответа: сделать маленькую часть или оставить перерыв для отдыха. Выберите для себя; право на паузу не зависит от особого ощущения.'),
        short: pair('Imagine the urge to fill a free minute. Name it, then choose “one small part” or “leave the gap”. The urge is not an order.', 'Представьте порыв занять свободную минуту. Назовите его, затем выберите «маленькую часть» или «оставить перерыв». Порыв не приказ.'),
      },
      11: {
        standard: pair('Use a mild invented example: an intended pause was interrupted by an ordinary task. At the next safe transition, choose a fresh small pause or leave the idea for later. Name the interruption as a fact. Do not lengthen, multiply or earn the next pause to make up for the missed one.', 'Возьмите лёгкий вымышленный пример: обычное дело прервало намеченную паузу. При следующем безопасном переходе выберите новую короткую паузу или отложите её. Назовите прерывание как факт. Не увеличивайте, не умножайте и не заслуживайте следующую паузу ради компенсации пропуска.'),
        short: pair('Imagine an interrupted pause. Choose a new brief pause at a safe transition, or later. No extra pause or work is owed.', 'Представьте прерванную паузу. Выберите новую короткую паузу при безопасном переходе или позже. Дополнительный отдых или работа не нужны.'),
      },
      12: {
        standard: pair('Build three private lines for an ordinary moment: “I notice I am starting another optional task”; “the chair is available”; “I will leave a brief gap here”. Adapt them to what is actually available. Try the single pause or stop at the plan; noticing, support and action do not need to change how you feel.', 'Составьте три личные строки об обычном моменте: «замечаю, что начинаю ещё одно необязательное дело»; «стул доступен»; «оставлю здесь короткий перерыв». Подстройте их под реальные условия. Попробуйте одну паузу или остановитесь на плане; наблюдение, опора и действие не обязаны менять чувства.'),
        short: pair('Use three words or phrases: “starting again”; “chair”; “brief pause”. Adapt the support, then choose the pause or stop at this plan.', 'Возьмите три слова или фразы: «снова начинаю»; «стул»; «короткая пауза». Замените опору подходящей и выберите паузу или только план.'),
      },
      13: {
        standard: pair('Sort three possibilities: practise arranging a small pause when that is manageable; rest without an exercise when effort is unwelcome; identify appropriate outside support when rest opportunities or ongoing sleep concerns need more than this exercise. Select one category for today. You need not contact anyone or solve the concern now.', 'Разделите три возможности: потренироваться устраивать небольшую паузу, когда это посильно; отдыхать без упражнения, когда усилие нежелательно; определить подходящую внешнюю поддержку, если условия отдыха или продолжающиеся трудности со сном требуют большего. Выберите категорию на сегодня. Связываться с кем-либо или решать проблему сейчас не нужно.'),
        short: pair('Choose today’s category: arrange a small pause, rest without practising, or consider outside support for a concern beyond this exercise.', 'Выберите категорию на сегодня: устроить небольшую паузу, отдыхать без практики или рассмотреть внешнюю поддержку для вопроса за пределами упражнения.'),
      },
      15: {
        standard: pair('Compare an ordinary pause in a quiet place and in a busier place. Keep the permission to stop; change one condition, such as using a shorter gap or another available corner. Select the version that fits your actual setting, or postpone. The two pauses do not have to feel equally restorative.', 'Сравните обычную паузу в тихом и более оживлённом месте. Сохраните возможность остановиться; измените одно условие, например сократите перерыв или выберите другой доступный угол. Выберите вариант для своей обстановки или отложите. Обе паузы не обязаны давать одинаковое чувство восстановления.'),
        short: pair('For an imagined noisy pause, choose a shorter gap or another available corner. Change the setting rather than require the same feeling.', 'Для воображаемой паузы в шуме выберите более короткий перерыв или другой доступный угол. Меняйте условия, не требуя одинаковых ощущений.'),
      },
      16: {
        standard: pair('Imagine an unfinished nonurgent task before a possible break. Separate the fact “one part remains” from the extra demand “I must finish before resting”. Note what can safely wait and leave one return marker, such as “next: open this page”. Choose a pause without predicting when you will feel restored.', 'Представьте незавершённое несрочное дело перед возможным перерывом. Отделите факт «осталась одна часть» от лишнего требования «до отдыха надо закончить». Отметьте, что безопасно отложить, и оставьте одну метку: «дальше открыть эту страницу». Выберите паузу, не предсказывая время восстановления.'),
        short: pair('For an imagined nonurgent task, separate “unfinished” from “must finish before rest”. Name one safe return point, then choose whether to pause.', 'Для вымышленного несрочного дела отделите «не закончено» от «надо закончить до отдыха». Назовите безопасную точку возвращения и решите, сделать ли паузу.'),
      },
      17: {
        standard: pair('Look at one imagined preparation for a break: making a safe place to sit and arranging everything perfectly. Keep what is needed for safety or care; remove the requirement for a perfect setting. Decide whether the simpler pause fits now. Do not remove a necessary care task or real commitment.', 'Рассмотрите вымышленную подготовку к перерыву: обеспечить безопасное место для сидения и идеально всё обустроить. Сохраните необходимое для безопасности или ухода; уберите требование идеальной обстановки. Решите, подходит ли более простая пауза. Не отменяйте необходимый уход или реальное обязательство.'),
        short: pair('For a possible break, keep a safe place and drop the optional demand for a perfect setting. A simple pause is allowed.', 'Для возможного перерыва сохраните безопасное место и уберите необязательное требование идеальной обстановки. Допустима простая пауза.'),
      },
      18: {
        standard: pair('Choose an ordinary nonurgent activity, or imagine sorting one page. Mark a clear stopping point: “this part ends here; next is this one small step”. If safe, put the material aside and leave a gap. The note closes this work interval; it does not require completing the whole activity before rest.', 'Выберите обычное несрочное занятие или представьте разбор одной страницы. Обозначьте конец: «на этом часть закончена; дальше один маленький шаг». Если безопасно, отложите материал и оставьте перерыв. Заметка завершает рабочий отрезок; заканчивать всё занятие перед отдыхом не требуется.'),
        short: pair('For an imagined nonurgent activity, say “stopping here; next is one small step”. Let that marker be enough to end this interval.', 'Для вымышленного несрочного занятия скажите «здесь останавливаюсь; дальше один маленький шаг». Этой метки достаточно для завершения отрезка.'),
      },
      19: {
        standard: pair('Choose one condition you can safely adjust for an ordinary pause: move your own nonurgent paper out of sight, place a chair where it is usable, or pick an already quieter corner. Make only the smallest accessible change, without changing shared arrangements. If no condition is adjustable, name that limit and stop.', 'Выберите одно условие, которое можно безопасно изменить для обычной паузы: убрать из виду свою несрочную бумагу, удобно поставить стул или выбрать уже более тихий угол. Сделайте только минимальное доступное изменение, не меняя общих договорённостей. Если ничего изменить нельзя, отметьте ограничение и остановитесь.'),
        short: pair('Move one of your own nonurgent papers out of sight if easy, leaving room for a pause. If nothing can change, name that limit.', 'Если легко, уберите из виду одну свою несрочную бумагу, оставляя место паузе. Если менять нечего, отметьте ограничение.'),
      },
      20: {
        standard: pair('Use a mild invented mismatch: a planned quiet pause is in a noisy place, or a pause exercise feels like another demand. Stop that version. Choose a smaller gap, another available setting, or ordinary rest without an exercise. Name the revised choice once; no missed days or unsuccessful pauses need to be made up.', 'Возьмите лёгкий вымышленный пример: тихая пауза оказалась в шумном месте или упражнение об отдыхе стало ещё одним требованием. Остановите этот вариант. Выберите меньший перерыв, другое доступное место или обычный отдых без упражнения. Один раз назовите новый выбор; пропуски и неудачные паузы наверстывать не нужно.'),
        short: pair('Use a mild invented mismatch: a pause feels like a demand. Stop it; choose an ordinary gap or rest without practising. No catching up.', 'Возьмите лёгкий вымышленный пример: пауза стала требованием. Остановитесь; выберите обычный перерыв или отдых без практики. Не наверстывайте.'),
      },
    },
  },
  {
    id: 'support-access', definitionKey: 'hh-resource-pulse', dimensionKey: 'resource.support', topicId: 'connection_boundaries',
    label: pair('Available support', 'Доступная поддержка'),
    entry: pair('Explore a person, place or practical resource that might help with one ordinary need. Unavailable support is a real limit, not a personal failure.', 'Рассмотрите человека, место или практический ресурс для одной обычной потребности. Недоступность помощи — реальное ограничение, а не личная неудача.'),
    shortEntry: pair('Consider one possible support. It may be unavailable.', 'Рассмотрите одну возможную опору. Она может быть недоступна.'),
    boundary: pair('Work privately. Contact, disclosure, spending and approaching an unsafe person are not required. Respect your own and others’ limits.', 'Работайте для себя. Контакт, раскрытие личного, расходы и обращение к небезопасному человеку не требуются. Учитывайте свои и чужие границы.'),
    reflection: pair('What is genuinely available, and which access limit should stay visible rather than become a demand on me?', 'Что действительно доступно и какое ограничение важно сохранить в поле зрения, не превращая его в требование к себе?'),
    transfer: pair('Keep a private note of one usable option or an access question. Deciding whether to seek support remains your choice.', 'Сохраните личную заметку об одном подходящем варианте или вопросе о доступе. Решение обратиться за поддержкой остаётся за вами.'),
    days: {
      1: {
        standard: pair('Name one small practical need, such as a place to sit or information about opening hours. Note one possible person, place or resource and one known fact about availability. Use “unknown” or “not available” where appropriate. Decide whether simply recording that fact is enough today; do not contact anyone.', 'Назовите небольшую практическую потребность: место для сидения или информацию о времени работы. Отметьте возможного человека, место или ресурс и один известный факт о доступности. При необходимости напишите «неизвестно» или «недоступно». Решите, достаточно ли сегодня записать факт; связываться с кем-либо не нужно.'),
        short: pair('For one small need, name a possible person, place or resource. Mark “available”, “unknown” or “unavailable”; one observation is enough.', 'Для небольшой потребности назовите человека, место или ресурс. Отметьте «доступно», «неизвестно» или «недоступно»; одного наблюдения достаточно.'),
      },
      2: {
        standard: pair('Use a mild example: you keep searching for a tool while trying a small repair. Separate the signal “searching repeatedly”, the context “the tool is missing”, and the judgement “I should manage alone”. Replace the judgement with the practical need for a tool or information. Availability can remain unknown.', 'Возьмите лёгкий пример: при небольшом ремонте вы снова и снова ищете инструмент. Разделите сигнал «повторяю поиск», контекст «инструмента нет» и оценку «надо справляться самому». Замените оценку практической потребностью в инструменте или информации. Доступность может оставаться неизвестной.'),
        short: pair('In an invented repair, separate “searching again” from “tool missing”. Replace “I should cope alone” with “a tool may be needed”.', 'В вымышленном ремонте отделите «снова ищу» от «нет инструмента». Замените «надо справляться самому» на «возможно, нужен инструмент».'),
      },
      3: {
        standard: pair('Write an invented sequence: a needed form is unclear; “I must understand alone”; rereading without new information. Add a choice before another reread: note one question and a possible information source. Mark whether that source is available or unknown. The exercise ends with the note, without sending a request.', 'Запишите вымышленную цепочку: нужная форма непонятна; «надо разобраться самому»; повторное чтение без новой информации. Перед новым чтением добавьте выбор: записать вопрос и возможный источник информации. Отметьте, доступен ли он или это неизвестно. Упражнение заканчивается заметкой без отправки запроса.'),
        short: pair('Imagine: unclear form → “alone” → rereading. Add a choice: note one question for a possible information source, without contacting it.', 'Представьте: непонятная форма → «самостоятельно» → перечитывание. Добавьте выбор: записать вопрос к возможному источнику информации без обращения к нему.'),
      },
      4: {
        standard: pair('Look at an available external support, such as a chair, a clear sign or a written instruction. With eyes open, notice its shape, position or one readable detail. Let that external detail be the whole focus for a brief moment. You need not relax, disclose a need or approach anyone.', 'Посмотрите на доступную внешнюю опору: стул, понятный указатель или письменную инструкцию. С открытыми глазами заметьте форму, положение или одну читаемую деталь. Ненадолго сосредоточьтесь только на ней. Расслабляться, раскрывать потребность или подходить к кому-либо не нужно.'),
        short: pair('With eyes open, notice one detail of an available chair, sign or written instruction. Stop there; no relaxation or contact is needed.', 'С открытыми глазами заметьте одну деталь доступного стула, указателя или инструкции. Остановитесь; расслабление и контакт не нужны.'),
      },
      5: {
        standard: pair('Choose one tiny preparation for support: place an already available instruction within reach, or write one private question about a practical need. Do only that preparation if manageable. You do not need to search widely, send the question or explain personal circumstances. If preparation is too much, leave it and rest.', 'Выберите крошечную подготовку к поддержке: положить уже доступную инструкцию под рукой или записать один личный вопрос о практической потребности. Если посильно, сделайте только это. Широкий поиск, отправка вопроса и объяснение личных обстоятельств не нужны. Если подготовка слишком трудна, оставьте её и отдыхайте.'),
        short: pair('Write one private question about a small practical need, or rest. Do not send it; the single note is enough.', 'Запишите один личный вопрос о небольшой практической потребности или отдыхайте. Не отправляйте; одной заметки достаточно.'),
      },
      6: {
        standard: pair('Use an imagined demand: “If I need help, I must explain everything”. Write another response: “I can first check what kind of help exists without sharing private details”. Privately draft only a practical question, such as “Is this service open today?” Leave it unsent; not seeking help is also a choice.', 'Возьмите вымышленное требование: «Если нужна помощь, придётся всё объяснить». Запишите другой ответ: «Сначала можно узнать, какая помощь есть, без личных подробностей». Для себя составьте только практический вопрос, например «Сегодня это место открыто?». Оставьте его неотправленным; можно и не обращаться.'),
        short: pair('Replace an imagined “explain everything to get help” with “I may first ask about availability”. Keep this as a private sentence.', 'Замените вымышленное «ради помощи надо всё объяснить» на «сначала можно спросить о доступности». Оставьте фразу личной.'),
      },
      8: {
        standard: pair('Choose an ordinary setting, such as preparing a document at a desk. Name a small need there and an already available support, such as saved instructions or a known information point. Place a private reminder beside the task. If access is uncertain, write that instead; no visit or contact is part of this practice.', 'Выберите обычную обстановку, например подготовку документа за столом. Назовите небольшую потребность и уже доступную опору: сохранённую инструкцию или известный справочный пункт. Положите личное напоминание рядом с делом. Если доступ неясен, запишите это; визит и контакт не входят в практику.'),
        short: pair('For an ordinary task today, note one support already available or “access unknown”. Keep that note where you do the task.', 'Для обычного сегодняшнего дела отметьте уже доступную опору или «доступ неизвестен». Оставьте заметку рядом с местом дела.'),
      },
      9: {
        standard: pair('Choose a quality you value, such as learning or care. Separately name a possible external support for one small action in that direction: an instruction, an accessible place or a willing person whose availability is already known. Mark any uncertainty. The quality is yours; access to support depends on real conditions.', 'Выберите важное для вас качество, например любознательность или заботу. Отдельно назовите внешнюю опору для малого действия: инструкцию, доступное место или человека, чья готовность и доступность уже известны. Отметьте неопределённость. Качество выбираете вы; доступ к поддержке зависит от реальных условий.'),
        short: pair('Name one chosen quality and one possible person, place or resource supporting it. Mark availability honestly, including “unknown”.', 'Назовите выбранное качество и возможного человека, место или ресурс в его поддержку. Честно отметьте доступность, включая «неизвестно».'),
      },
      10: {
        standard: pair('Imagine a small difficulty and an urge either to explain everything immediately or to reject all help. Name the urge, then add a second option: check existing information, write a limited question privately, or pause. Choose one option without sending anything. An urge does not decide how much to disclose or whether to seek support.', 'Представьте небольшую трудность и порыв сразу всё объяснить либо отвергнуть любую помощь. Назовите порыв и добавьте второй вариант: посмотреть имеющуюся информацию, записать узкий вопрос для себя или сделать паузу. Выберите без отправки. Порыв не решает, сколько раскрывать и обращаться ли за поддержкой.'),
        short: pair('Imagine an urge to explain a whole problem. Pause and choose a private practical question or no contact. Disclosure remains optional.', 'Представьте порыв объяснить всю проблему. Сделайте паузу и выберите личный практический вопрос или отсутствие контакта. Раскрытие необязательно.'),
      },
      11: {
        standard: pair('Use an invented note about a support option that you left unfinished after distraction. Find one known fact, such as a place name; mark the unanswered access question. Continue with only that question or stop. No extra searching, apology or contact is owed because the note was interrupted.', 'Возьмите вымышленную заметку о поддержке, не законченную из-за отвлечения. Найдите один известный факт, например название места; отметьте оставшийся вопрос о доступе. Продолжите только с этим вопросом или остановитесь. Из-за прерывания не требуются дополнительные поиски, извинения или контакт.'),
        short: pair('Imagine an interrupted support note. Keep one known fact and one access question. Stop there, without extra searching to catch up.', 'Представьте прерванную заметку о поддержке. Сохраните один известный факт и вопрос о доступе. Остановитесь, не наверстывая поиском.'),
      },
      12: {
        standard: pair('Make three private lines: “I notice this instruction is unclear”; “a saved example may help”; “I will compare one line”. Substitute an available resource and one small action for your situation. If nothing suitable is available, use “access is missing; I will pause” instead. No contact or disclosure is required.', 'Составьте три личные строки: «замечаю, что инструкция непонятна»; «может помочь сохранённый пример»; «сравню одну строку». Подставьте доступный ресурс и малое действие для своей ситуации. Если подходящего ресурса нет, напишите «доступа нет; сделаю паузу». Контакт и раскрытие личного не требуются.'),
        short: pair('Link three points: one need, one available resource, one tiny action. If no resource is available, make the action a pause.', 'Свяжите три пункта: потребность, доступный ресурс, крошечное действие. Если ресурса нет, выберите паузу как действие.'),
      },
      13: {
        standard: pair('Privately distinguish three situations: a small access question you can clarify using existing information; a moment when rest fits better; a need that calls for appropriate practical or professional support beyond an exercise. Pick today’s category and note any cost, access or safety barrier. Choosing a category does not require contacting anyone.', 'Для себя различите три ситуации: маленький вопрос о доступе, который можно уточнить по имеющейся информации; момент, когда лучше отдых; потребность в подходящей практической или профессиональной помощи за пределами упражнения. Выберите категорию и отметьте препятствие в цене, доступе или безопасности. Выбор не требует контакта.'),
        short: pair('Choose: a small information step, rest, or outside help beyond an exercise. Note one access barrier if present; contact is optional.', 'Выберите: маленький информационный шаг, отдых или внешнюю помощь за пределами упражнения. Если есть барьер доступа, отметьте его; контакт необязателен.'),
      },
      15: {
        standard: pair('Compare a small information need in two imagined settings: a place with a readable notice and a place without one. Keep the need the same; adapt the method to what is accessible, such as a saved instruction or a private question for later. Do not assume internet, money, mobility or a helpful person is available.', 'Сравните небольшую информационную потребность в двух вымышленных местах: с читаемым объявлением и без него. Сохраните потребность; приспособьте способ к доступному, например сохранённой инструкции или личному вопросу на потом. Не считайте интернет, деньги, мобильность или готового помочь человека обязательной данностью.'),
        short: pair('Imagine a notice you cannot access. Choose a saved instruction, a private question for later, or pause. A different setting permits a different method.', 'Представьте недоступное объявление. Выберите сохранённую инструкцию, личный вопрос на потом или паузу. Другие условия допускают другой способ.'),
      },
      16: {
        standard: pair('Take an invented support option with unclear opening hours. Write the fact “I do not know today’s hours”, then separate the guess “help is impossible” or “I must find out now”. Choose one manageable next point: save the question for later or use another already available resource. Leave unknown information unknown.', 'Возьмите вымышленный вариант поддержки с неясным временем работы. Запишите факт «не знаю часы работы сегодня», отделив догадку «помощь невозможна» или «надо выяснить сейчас». Выберите посильный шаг: сохранить вопрос на потом или использовать уже доступный ресурс. Неизвестное оставьте неизвестным.'),
        short: pair('For invented unknown opening hours, separate “not known” from “must solve now”. Keep one question for later, without inventing an answer.', 'Для вымышленных неизвестных часов работы отделите «не знаю» от «надо решить сейчас». Сохраните один вопрос, не придумывая ответ.'),
      },
      17: {
        standard: pair('Invent a private question to an information desk, such as asking when a service is open. Keep the practical information needed for that question; remove an optional personal explanation. Preserve any information genuinely required for safety or eligibility. Leave the question unsent; the task is to distinguish necessary detail from extra disclosure.', 'Придумайте личный черновик вопроса в справочную, например о времени работы. Сохраните практическую информацию для вопроса; уберите необязательное объяснение личных обстоятельств. Не удаляйте действительно нужные сведения о безопасности или условиях доступа. Не отправляйте: задача — отличить необходимую деталь от лишнего раскрытия.'),
        short: pair('In an invented question about opening hours, keep the practical question and remove one unnecessary personal detail. Leave it unsent.', 'В вымышленном вопросе о времени работы сохраните сам вопрос и уберите одну ненужную личную деталь. Не отправляйте.'),
      },
      18: {
        standard: pair('For an invented practical need, privately write a bounded request: “Can you tell me where the instructions are?” Add what would answer it and where you will stop for now. Alternatively, mark “no contact chosen; question kept for later”. This clarifies a possible request without promising a response or starting contact.', 'Для вымышленной практической потребности напишите ограниченную просьбу: «Подскажите, где инструкция?». Добавьте, какой информации достаточно и где вы пока остановитесь. Либо отметьте «контакт не выбран; вопрос оставлен на потом». Это уточняет возможную просьбу без обещания ответа и без начала контакта.'),
        short: pair('Privately write “Where is the instruction?” or another small practical question. Mark “unsent; stop here”. No response or contact is required.', 'Для себя запишите «Где инструкция?» или другой небольшой практический вопрос. Отметьте «не отправлено; здесь остановка». Ответ и контакт не требуются.'),
      },
      19: {
        standard: pair('Choose one accessible support and reduce a practical obstacle: place your own saved instruction beside a task, put a known place name in a private note, or use a more readable copy already available. Make one change only. If access cannot be improved today, record the barrier without blaming yourself.', 'Выберите доступную опору и уменьшите практическое препятствие: положите свою сохранённую инструкцию рядом с делом, запишите известное название места или возьмите уже доступную читаемую копию. Сделайте одно изменение. Если улучшить доступ сегодня нельзя, отметьте барьер без обвинения себя.'),
        short: pair('Place an already available instruction beside one task, or note why access is blocked. One condition, not more effort, is the focus.', 'Положите уже доступную инструкцию рядом с делом или отметьте препятствие доступа. Внимание одному условию, а не увеличению усилий.'),
      },
      20: {
        standard: pair('Use a mild invented mismatch: a support exercise assumes an available person, but nobody suitable is available. Stop that approach. Choose an accessible place or practical resource, record that access is missing, or rest. No contact with an unsafe person, extra disclosure or catching up is needed to make the exercise count.', 'Возьмите лёгкий вымышленный пример: упражнение о поддержке предполагает человека рядом, но подходящего человека нет. Остановите этот способ. Выберите доступное место или практический ресурс, отметьте отсутствие доступа либо отдыхайте. Обращение к небезопасному человеку, лишнее раскрытие и наверстывание не требуются.'),
        short: pair('Use a mild invented mismatch: no suitable person is available. Stop that approach; choose a practical resource or rest. No contact or catching up.', 'Возьмите лёгкий вымышленный пример: подходящего человека нет. Остановите этот способ; выберите практический ресурс или отдых. Контакт и наверстывание не нужны.'),
      },
    },
  },
  {
    id: 'values-and-direction', definitionKey: 'hh-resource-pulse', dimensionKey: 'resource.meaning', topicId: 'energy_agency',
    label: pair('Chosen qualities and direction', 'Выбранные качества и направление'),
    entry: pair('Explore a quality you choose for one small ordinary action. “Not sure yet” is allowed; a life purpose or a positive feeling is not required.', 'Рассмотрите качество, которое сами выбираете для одного малого обычного действия. Можно ответить «пока не знаю»; цель жизни и положительное чувство не требуются.'),
    shortEntry: pair('Choose a quality for a small action, or “not sure yet”.', 'Выберите качество для малого действия или «пока не знаю».'),
    boundary: pair('No belief, religion, gratitude or positive interpretation is prescribed. Your choice may change; leave painful experiences out of this exercise.', 'Убеждения, религия, благодарность и положительное объяснение не предписываются. Выбор может меняться; болезненный опыт можно не затрагивать.'),
    reflection: pair('Did the small action express a quality I chose, without requiring a particular feeling or life answer?', 'Выражало ли малое действие выбранное мной качество без требования особого чувства или ответа о жизни?'),
    transfer: pair('If useful, keep one quality and a tiny action as an option for an ordinary moment. Revise or leave them when they no longer fit.', 'Если полезно, оставьте одно качество и крошечное действие как вариант для обычного момента. Меняйте или оставляйте их, когда они не подходят.'),
    days: {
      1: {
        standard: pair('Choose an ordinary moment, such as arranging a cup or opening a book. Describe one fact about it. Name a quality you might choose for this moment, such as care or curiosity, or write “not sure yet”. Select the smallest expression of that quality, or stop at noticing; no larger purpose needs to be found.', 'Выберите обычный момент: поставить чашку или открыть книгу. Опишите один факт о нём. Назовите качество, которое можно выбрать для этого момента, например заботу или любознательность, либо напишите «пока не знаю». Выберите минимальное выражение качества или остановитесь на наблюдении; искать большую цель не нужно.'),
        short: pair('Notice one ordinary fact, such as “a book is here”. Choose one quality for a tiny action, or “not sure yet”, and stop.', 'Заметьте обычный факт, например «здесь книга». Выберите качество для крошечного действия или «пока не знаю» и остановитесь.'),
      },
      2: {
        standard: pair('Use a mild example: while picking a book, you keep checking what someone else would approve of. Separate the signal “checking approval”, the context “choosing a book”, and the judgement “my interests are wrong”. Replace the judgement with a question: “What quality, if any, do I choose for this small moment?”', 'Возьмите лёгкий пример: выбирая книгу, вы проверяете, что одобрил бы другой человек. Разделите сигнал «проверяю одобрение», контекст «выбираю книгу» и оценку «мои интересы неправильные». Замените оценку вопросом: «Какое качество, если вообще какое-то, я выбираю для этого маленького момента?»'),
        short: pair('Imagine choosing a book: notice “checking approval”, name the context, and leave out “my interests are wrong”. Your chosen quality can remain undecided.', 'Представьте выбор книги: заметьте «проверяю одобрение», назовите контекст и опустите «мои интересы неправильные». Качество можно пока не выбирать.'),
      },
      3: {
        standard: pair('Sketch an invented sequence: a small free moment appears; “I must use it impressively”; picking a task for appearance. Add a choice between the thought and action: choose one ordinary action expressing a quality you value, or rest. Keep the example small; it need not reveal your life direction.', 'Набросайте вымышленную цепочку: появилась свободная минута; «надо использовать её впечатляюще»; выбор дела ради впечатления. Между мыслью и действием добавьте выбор: обычное действие в духе важного вам качества или отдых. Пример остаётся маленьким; раскрывать направление всей жизни не нужно.'),
        short: pair('Imagine: free minute → “impress others” → extra task. Add a choice: one small act of a quality you choose, or rest.', 'Представьте: свободная минута → «впечатлить других» → лишнее дело. Добавьте выбор: малое действие в духе выбранного качества или отдых.'),
      },
      4: {
        standard: pair('Choose a neutral object already nearby, such as a cup, page or plant. With eyes open, notice its colour, edge and position. If you want, call this brief attention “curiosity” or “care”, or leave it unnamed. The external focus is enough; it need not produce meaning, calm or a positive feeling.', 'Выберите нейтральный предмет рядом: чашку, страницу или растение. С открытыми глазами заметьте цвет, край и положение. При желании назовите это краткое внимание «любознательностью» или «заботой» либо не называйте. Внешней фокусировки достаточно; смысл, спокойствие и положительные чувства не обязательны.'),
        short: pair('With eyes open, notice one detail of a neutral object. You may call this curiosity or leave it unnamed; no feeling is required.', 'С открытыми глазами заметьте одну деталь нейтрального предмета. Можно назвать это любознательностью или не называть; особое чувство не требуется.'),
      },
      5: {
        standard: pair('Choose one quality, such as care, clarity or curiosity, if any fits. Reduce its expression to one tiny action: place a cup carefully, label one note, or read one sentence. Do only that action if manageable and stop. Rest may express care; completing something impressive or feeling inspired is unnecessary.', 'Выберите подходящее качество, например заботу, ясность или любознательность. Уменьшите его выражение до крошечного действия: аккуратно поставить чашку, подписать заметку или прочесть предложение. Если посильно, сделайте только это и остановитесь. Отдых может выражать заботу; впечатляющий результат и вдохновение не нужны.'),
        short: pair('If curiosity fits, read one sentence; if care fits, choose rest. Do only the small choice, without seeking inspiration.', 'Если подходит любознательность, прочтите одно предложение; если забота, выберите отдых. Ограничьтесь малым выбором, не ища вдохновения.'),
      },
      6: {
        standard: pair('Name an invented demand: “If this matters, I must do it perfectly”. Write a second response: “I can express a chosen quality in one imperfect small action”. Pick a harmless example, such as writing one clear label instead of reorganising everything. Choose the smaller response or leave the quality undecided.', 'Назовите вымышленное требование: «Если это важно, надо сделать идеально». Запишите второй ответ: «Можно выразить выбранное качество одним несовершенным маленьким действием». Возьмите безопасный пример: написать понятную подпись вместо полной реорганизации. Выберите меньший ответ или пока не выбирайте качество.'),
        short: pair('Replace an imagined “important means perfect” with “one small action can express my chosen quality”. Choose whether this response fits.', 'Замените вымышленное «важное должно быть идеальным» на «малое действие может выразить выбранное качество». Решите, подходит ли ответ.'),
      },
      8: {
        standard: pair('Choose an ordinary safe moment, such as opening a notebook or setting down a cup. Select a quality you want to bring to it, then one tiny expression: a clear title or placing the cup with care. Try that single action if useful. The quality belongs in this moment without becoming an obligation for the whole day.', 'Выберите обычный безопасный момент: открыть блокнот или поставить чашку. Выберите качество для него и крошечное выражение: понятный заголовок или аккуратное размещение чашки. Если полезно, попробуйте одно действие. Качество относится к этому моменту, не становясь обязанностью на весь день.'),
        short: pair('At an ordinary moment, such as opening a notebook, choose a quality and one tiny expression, such as a clear title. One attempt is enough.', 'В обычный момент, например открывая блокнот, выберите качество и малое выражение, например ясный заголовок. Одной попытки достаточно.'),
      },
      9: {
        standard: pair('Name one quality that is yours to choose, such as curiosity. Separately name an external support, such as a book already available or a suitable place. Link them to one small action, such as reading a sentence. If support is missing, note the access limit; it says nothing about the worth of your quality.', 'Назовите качество, которое выбираете сами, например любознательность. Отдельно назовите внешнюю опору: уже доступную книгу или подходящее место. Свяжите их с малым действием, например чтением предложения. Если опоры нет, отметьте ограничение доступа; оно ничего не говорит о ценности выбранного качества.'),
        short: pair('Pair one chosen quality with one available external support: for example, curiosity and a book. If no support is available, mark that limit.', 'Соедините выбранное качество с доступной внешней опорой: например, любознательность и книгу. Если опоры нет, отметьте ограничение.'),
      },
      10: {
        standard: pair('Imagine seeing an impressive plan and feeling an urge to copy it immediately. Name the urge. Compare copying the whole plan with one small action expressing a quality you actually choose, or choosing no plan. Privately select an option. An appealing idea does not create an obligation or define your purpose.', 'Представьте впечатляющий план и порыв немедленно его скопировать. Назовите порыв. Сравните копирование всего плана с одним малым действием в духе качества, выбранного вами, либо с отказом от плана. Выберите для себя. Привлекательная идея не создаёт обязательства и не определяет вашу цель.'),
        short: pair('Imagine the urge to copy an impressive plan. Name it, then choose one small action in your own direction, or no plan.', 'Представьте порыв скопировать впечатляющий план. Назовите его, затем выберите малое действие в своём направлении или отсутствие плана.'),
      },
      11: {
        standard: pair('Use an invented example: you meant to read with curiosity but became distracted. Choose one new sentence, another small expression of a quality you choose, or rest. Begin from the present rather than the missed attempt. No extra pages, self-criticism or proof of commitment are needed to return.', 'Возьмите вымышленный пример: хотели читать с любознательностью, но отвлеклись. Выберите новое предложение, другое малое выражение выбранного качества или отдых. Начните с настоящего момента, а не с пропущенной попытки. Для возвращения не нужны дополнительные страницы, самокритика и доказательства серьёзности намерения.'),
        short: pair('Imagine distracted reading. Return with one sentence if curiosity still fits, or rest. No extra pages or proof of commitment are needed.', 'Представьте отвлечение при чтении. Вернитесь к одному предложению, если любознательность ещё подходит, или отдыхайте. Лишние страницы и доказательства не нужны.'),
      },
      12: {
        standard: pair('Build a three-part sequence: “I notice a small choice”; “this notebook supports clarity”; “I will give one note a clear title”. Choose your own quality and available support if those examples do not fit. Try the single action or stop at the sequence. It is an experiment, not a statement of life purpose.', 'Составьте три части: «замечаю небольшой выбор»; «этот блокнот помогает ясности»; «дам одной заметке понятный заголовок». Выберите своё качество и доступную опору, если примеры не подходят. Попробуйте одно действие или остановитесь на последовательности. Это проба, а не заявление о цели жизни.'),
        short: pair('Link a noticed choice, an available support and one action: “choose clarity; notebook here; title one note”. Adapt or stop at the plan.', 'Свяжите замеченный выбор, доступную опору и действие: «выбираю ясность; блокнот рядом; подпишу заметку». Измените пример или ограничьтесь планом.'),
      },
      13: {
        standard: pair('Distinguish three options: explore a chosen quality through a small ordinary action; rest when even that adds pressure; consider appropriate outside support for a difficult concern that a brief exercise cannot hold. Select a category without trying to solve your whole direction. Uncertainty is allowed, and contact is optional.', 'Различите три варианта: исследовать выбранное качество через малое обычное действие; отдыхать, когда даже это добавляет давление; рассмотреть подходящую внешнюю поддержку для трудного вопроса, который не вмещает короткое упражнение. Выберите категорию, не решая всё направление жизни. Неопределённость допустима, контакт необязателен.'),
        short: pair('Choose a small values-based action, rest, or outside support for a concern beyond this exercise. You may leave your larger direction undecided.', 'Выберите малое действие в духе своего качества, отдых или внешнюю поддержку для вопроса за пределами упражнения. Большое направление можно не определять.'),
      },
      15: {
        standard: pair('Choose a quality, such as care, and compare two ordinary settings: home and a busy waiting area. Name a tiny expression that fits each, such as placing your cup carefully or keeping your belongings out of the walkway. Select only what is accessible. The form can change without demanding the same result or feeling.', 'Выберите качество, например заботу, и сравните обычные места: дом и оживлённую зону ожидания. Назовите малое выражение для каждого: аккуратно поставить чашку или убрать свои вещи с прохода. Выбирайте только доступное. Форма может меняться без требования одинакового результата или чувства.'),
        short: pair('For a chosen quality such as care, adapt one action to a busy place: keep your own belongings out of the walkway if accessible.', 'Для выбранного качества, например заботы, подстройте действие под оживлённое место: если доступно, уберите свои вещи с прохода.'),
      },
      16: {
        standard: pair('Use an ordinary undecided choice, such as what to read next. Separate the fact “I have not chosen” from the extra demand “I must know my whole direction”. Name one quality you could explore through a sentence, or leave the choice open. A small experiment need not settle uncertainty about larger questions.', 'Возьмите обычный нерешённый выбор, например что читать дальше. Отделите факт «ещё не выбрано» от лишнего требования «надо знать всё своё направление». Назовите качество для пробы через одно предложение или оставьте выбор открытым. Малый опыт не обязан разрешать неопределённость больших вопросов.'),
        short: pair('Separate “I have not chosen a book” from “I must know my whole direction”. Choose one sentence to explore or leave the choice open.', 'Отделите «книга не выбрана» от «надо знать всё своё направление». Выберите предложение для пробы или оставьте выбор открытым.'),
      },
      17: {
        standard: pair('Imagine wanting to express care by making a simple drink. Separate the chosen action from extras such as a perfect presentation or documenting it for others. Keep any necessary safety or care steps; drop one optional extra. A personally chosen quality does not require display, perfection or evidence of positivity.', 'Представьте заботу через простой напиток. Отделите выбранное действие от дополнений: идеального оформления или отчёта для других. Сохраните необходимые шаги безопасности и ухода; уберите одно необязательное дополнение. Лично выбранное качество не требует демонстрации, совершенства и доказательств положительного настроя.'),
        short: pair('For an imagined act of care, keep the safe simple action and drop one optional display, such as a perfect photo. Stop there.', 'Для воображаемого действия заботы сохраните безопасную простую часть и уберите необязательную демонстрацию, например идеальное фото. Остановитесь.'),
      },
      18: {
        standard: pair('Pick a tiny values-based action, or imagine giving one note a clear title. Privately mark “this small action is done” or “I stop here”, and name one optional next step if useful. Let the action have an end without deciding whether it made life meaningful. Continuing later remains a choice.', 'Выберите крошечное действие в духе своего качества или представьте понятный заголовок заметки. Отметьте для себя «малое действие закончено» или «здесь останавливаюсь» и при желании назовите следующий необязательный шаг. Дайте действию закончиться, не решая, придало ли оно смысл жизни. Продолжение остаётся выбором.'),
        short: pair('Imagine titling a note for clarity. Mark “one title; stopping here”. A larger purpose and another action can remain undecided.', 'Представьте заголовок заметки ради ясности. Отметьте «один заголовок; здесь остановка». Большую цель и следующее действие можно не выбирать.'),
      },
      19: {
        standard: pair('Choose a quality you want to try in an ordinary moment and one condition you control: leave a book within reach for curiosity, or place a blank label beside a notebook for clarity. Make one small accessible change to your own space. If no change is possible, note the limit instead of demanding greater motivation.', 'Выберите качество для обычного момента и одно подконтрольное условие: оставить книгу под рукой для любознательности или положить пустую наклейку рядом с блокнотом для ясности. Сделайте одно малое доступное изменение в своём пространстве. Если менять ничего нельзя, отметьте ограничение вместо требования большей мотивации.'),
        short: pair('If curiosity fits, put an available book within reach. Otherwise choose one condition for your own quality, or note that no change is available.', 'Если подходит любознательность, положите доступную книгу под рукой. Иначе выберите условие для своего качества или отметьте невозможность изменения.'),
      },
      20: {
        standard: pair('Use a mild invented mismatch: an exercise asks for an inspiring purpose, but that question does not fit. Stop that version. Choose one ordinary quality, such as clarity, for a tiny action, leave the quality undecided, or rest. Return only if useful; no inspiring answer or missed-day catch-up is owed.', 'Возьмите лёгкий вымышленный пример: упражнение просит вдохновляющую цель, но вопрос не подходит. Остановите этот вариант. Выберите обычное качество, например ясность, для малого действия, оставьте качество неопределённым или отдыхайте. Возвращайтесь только при пользе; вдохновляющий ответ и наверстывание пропусков не требуются.'),
        short: pair('Use a mild invented mismatch: a purpose question feels imposed. Stop it; choose a small quality, stay undecided or rest. No catching up.', 'Возьмите лёгкий вымышленный пример: вопрос о цели навязан. Остановитесь; выберите подходящее качество, оставьте выбор открытым или отдыхайте. Не наверстывайте.'),
      },
    },
  },
]

const CONSTRUCT_CONTEXT = [
  {
    definitionKey: 'hh-weekly-pulse', dimensionKey: 'weekly.recovery', skillId: 'rest-and-rhythm',
    rationale: pair('The registered weekly item asks how restored a person felt after sleep or rest during the past seven days. This original family explores ordinary pauses, transitions and conditions for rest; it addresses only a practical rest-opportunity facet.', 'Зарегистрированный еженедельный пункт спрашивает об ощущении восстановления после сна или отдыха за последние семь дней. Оригинальное семейство исследует обычные паузы, переходы и условия отдыха; оно касается только практической возможности отдыха.'),
    limitations: pair('A weekly recovery rating does not diagnose a sleep problem, explain its cause or determine today’s needs. These educational practices do not restrict sleep, prescribe bedtimes, replace care, force relaxation or promise recovery. Rest opportunities may be constrained by work, care duties or the environment. Ongoing concerns may need appropriate outside support.', 'Оценка восстановления за неделю не диагностирует проблему сна, не определяет её причину и сегодняшние потребности. Образовательные практики не ограничивают сон, не назначают время сна, не заменяют помощь, не требуют расслабления и не обещают восстановления. Работа, обязанности по уходу и среда могут ограничивать отдых. Продолжающиеся трудности могут требовать подходящей внешней поддержки.'),
    limitedFacet: pair('Noticing and arranging one ordinary pause within actual safe opportunities.', 'Наблюдение и организация одной обычной паузы в пределах реальных безопасных возможностей.'),
    sensitiveRelationshipContext: false,
  },
  {
    definitionKey: 'hh-resource-pulse', dimensionKey: 'resource.support', skillId: 'support-access',
    rationale: pair('The registered resource item asks about people or places the person feels able to turn to for support. This original family explores the availability and limits of people, places and practical resources for one ordinary need, without requiring contact.', 'Зарегистрированный ресурсный пункт спрашивает о людях или местах, к которым человек чувствует возможность обратиться за поддержкой. Оригинальное семейство исследует доступность и ограничения людей, мест и практических ресурсов для одной обычной потребности без обязательного контакта.'),
    limitations: pair('The current rating is a report of perceived support, not proof that help is safe, available, affordable or sufficient. Resources, mobility, time and relationships may limit access. A practical resource does not replace human or professional support. Contact, disclosure and spending are optional; no one is required to approach an unsafe person or earn assistance.', 'Текущая оценка отражает ощущаемую поддержку, а не доказывает безопасность, доступность, приемлемую цену или достаточность помощи. Ресурсы, мобильность, время и отношения могут ограничивать доступ. Практический ресурс не заменяет человеческую или профессиональную помощь. Контакт, раскрытие личного и расходы необязательны; приближаться к небезопасному человеку или заслуживать помощь не нужно.'),
    limitedFacet: pair('Identifying one possible source of support and its actual access conditions, with private preparation only.', 'Определение одного возможного источника поддержки и реальных условий доступа с подготовкой только для себя.'),
    sensitiveRelationshipContext: true,
  },
  {
    definitionKey: 'hh-resource-pulse', dimensionKey: 'resource.meaning', skillId: 'values-and-direction',
    rationale: pair('The registered resource item asks about a felt sense of meaning or direction in what the person is doing. This original family explores a personally chosen quality and a small ordinary action; it offers a limited way to examine direction without deciding life purpose.', 'Зарегистрированный ресурсный пункт спрашивает об ощущении смысла или направления в своих действиях. Оригинальное семейство исследует лично выбранное качество и малое обычное действие; это ограниченный способ рассмотреть направление без решения о цели жизни.'),
    limitations: pair('A current meaning rating cannot establish a person’s values, beliefs or purpose, or show why direction feels absent. No purpose, religion, gratitude, positive interpretation or positive mood is prescribed. Uncertainty, disagreement, changing a choice and rest are allowed. A small action does not promise meaning or replace support for difficult concerns.', 'Текущая оценка смысла не устанавливает ценности, убеждения и предназначение человека и не объясняет отсутствие направления. Цель, религия, благодарность, положительное объяснение и положительное настроение не предписываются. Допустимы неопределённость, несогласие, изменение выбора и отдых. Малое действие не обещает смысл и не заменяет помощь при трудных вопросах.'),
    limitedFacet: pair('Choosing a quality for one small ordinary action while allowing direction to remain uncertain.', 'Выбор качества для одного малого обычного действия с возможностью оставить направление неопределённым.'),
    sensitiveRelationshipContext: false,
  },
]


// Six literal exact identity + scorer-shape + registered-source snapshots.
const BINDINGS = [
  {
    "identity": {
      "definitionId": "7dc3058b-c939-5577-9226-9c5b50aa4aee",
      "definitionKey": "hh-weekly-pulse",
      "definitionVersion": "v1",
      "instrumentLocale": "en",
      "translationVersion": "hh-en-v1",
      "contentHash": "sha256:e0db859b3e3c888643ef199e1034507687b0692b77ea6932c2cbacacfb2767d7",
      "scoringKey": "raw-dimensions",
      "scoringVersion": "v1",
      "resultVersion": "v1",
      "timeframe": "past-7-days",
      "dimensionKey": "weekly.recovery"
    },
    "expectedDimensionShape": {
      "min": 0,
      "max": 10,
      "unit": "points",
      "timeframe": "past-7-days",
      "direction": "higher-reported-recovery",
      "dimensionClass": "resources",
      "sourceConstruct": "weekly.recovery"
    },
    "source": "registered-definition:7dc3058b-c939-5577-9226-9c5b50aa4aee@sha256:e0db859b3e3c888643ef199e1034507687b0692b77ea6932c2cbacacfb2767d7#weekly.recovery",
    "sourceMetadata": {
      "title": "Holistic House Weekly Pulse",
      "status": "original-non-diagnostic-self-monitoring",
      "reviewedAt": "2026-10-05"
    }
  },
  {
    "identity": {
      "definitionId": "7780802c-603b-5382-aebf-8f6c5ef3ddcc",
      "definitionKey": "hh-weekly-pulse",
      "definitionVersion": "v1",
      "instrumentLocale": "ru",
      "translationVersion": "hh-ru-v1",
      "contentHash": "sha256:1580de6223f16ba1806e446a0fc10bf35510b01d696bc149f49eed67a037cc82",
      "scoringKey": "raw-dimensions",
      "scoringVersion": "v1",
      "resultVersion": "v1",
      "timeframe": "past-7-days",
      "dimensionKey": "weekly.recovery"
    },
    "expectedDimensionShape": {
      "min": 0,
      "max": 10,
      "unit": "points",
      "timeframe": "past-7-days",
      "direction": "higher-reported-recovery",
      "dimensionClass": "resources",
      "sourceConstruct": "weekly.recovery"
    },
    "source": "registered-definition:7780802c-603b-5382-aebf-8f6c5ef3ddcc@sha256:1580de6223f16ba1806e446a0fc10bf35510b01d696bc149f49eed67a037cc82#weekly.recovery",
    "sourceMetadata": {
      "title": "Holistic House Weekly Pulse",
      "status": "original-non-diagnostic-self-monitoring",
      "reviewedAt": "2026-10-05"
    }
  },
  {
    "identity": {
      "definitionId": "435985a5-94fc-4c2b-9a7f-a2e6c33f94be",
      "definitionKey": "hh-resource-pulse",
      "definitionVersion": "v1",
      "instrumentLocale": "en",
      "translationVersion": "hh-en-v1",
      "contentHash": "sha256:80621529165c1c239cf93a30129ece25d010da05a01bd71e560231a3711d7afb",
      "scoringKey": "configured",
      "scoringVersion": "v1",
      "resultVersion": "v1",
      "timeframe": "right-now",
      "dimensionKey": "resource.support"
    },
    "expectedDimensionShape": {
      "min": 0,
      "max": 10,
      "unit": "points",
      "timeframe": "right-now",
      "direction": "higher-reported-resource",
      "dimensionClass": "resources",
      "sourceConstruct": "Support"
    },
    "source": "registered-definition:435985a5-94fc-4c2b-9a7f-a2e6c33f94be@sha256:80621529165c1c239cf93a30129ece25d010da05a01bd71e560231a3711d7afb#resource.support",
    "sourceMetadata": {
      "title": "Holistic House Resource Pulse",
      "status": "original-non-diagnostic-self-monitoring",
      "reviewedAt": "2026-10-05"
    }
  },
  {
    "identity": {
      "definitionId": "aa30b3c7-f35a-4b52-a335-9a74366c2927",
      "definitionKey": "hh-resource-pulse",
      "definitionVersion": "v1",
      "instrumentLocale": "ru",
      "translationVersion": "hh-ru-v1",
      "contentHash": "sha256:bdba0d174efd8c4acc1bdd950a329949c0ed5fc9c4c237bd66a78b36f28f7c1b",
      "scoringKey": "configured",
      "scoringVersion": "v1",
      "resultVersion": "v1",
      "timeframe": "right-now",
      "dimensionKey": "resource.support"
    },
    "expectedDimensionShape": {
      "min": 0,
      "max": 10,
      "unit": "points",
      "timeframe": "right-now",
      "direction": "higher-reported-resource",
      "dimensionClass": "resources",
      "sourceConstruct": "Поддержка"
    },
    "source": "registered-definition:aa30b3c7-f35a-4b52-a335-9a74366c2927@sha256:bdba0d174efd8c4acc1bdd950a329949c0ed5fc9c4c237bd66a78b36f28f7c1b#resource.support",
    "sourceMetadata": {
      "title": "Holistic House Resource Pulse",
      "status": "original-non-diagnostic-self-monitoring",
      "reviewedAt": "2026-10-05"
    }
  },
  {
    "identity": {
      "definitionId": "435985a5-94fc-4c2b-9a7f-a2e6c33f94be",
      "definitionKey": "hh-resource-pulse",
      "definitionVersion": "v1",
      "instrumentLocale": "en",
      "translationVersion": "hh-en-v1",
      "contentHash": "sha256:80621529165c1c239cf93a30129ece25d010da05a01bd71e560231a3711d7afb",
      "scoringKey": "configured",
      "scoringVersion": "v1",
      "resultVersion": "v1",
      "timeframe": "right-now",
      "dimensionKey": "resource.meaning"
    },
    "expectedDimensionShape": {
      "min": 0,
      "max": 10,
      "unit": "points",
      "timeframe": "right-now",
      "direction": "higher-reported-resource",
      "dimensionClass": "resources",
      "sourceConstruct": "Meaning"
    },
    "source": "registered-definition:435985a5-94fc-4c2b-9a7f-a2e6c33f94be@sha256:80621529165c1c239cf93a30129ece25d010da05a01bd71e560231a3711d7afb#resource.meaning",
    "sourceMetadata": {
      "title": "Holistic House Resource Pulse",
      "status": "original-non-diagnostic-self-monitoring",
      "reviewedAt": "2026-10-05"
    }
  },
  {
    "identity": {
      "definitionId": "aa30b3c7-f35a-4b52-a335-9a74366c2927",
      "definitionKey": "hh-resource-pulse",
      "definitionVersion": "v1",
      "instrumentLocale": "ru",
      "translationVersion": "hh-ru-v1",
      "contentHash": "sha256:bdba0d174efd8c4acc1bdd950a329949c0ed5fc9c4c237bd66a78b36f28f7c1b",
      "scoringKey": "configured",
      "scoringVersion": "v1",
      "resultVersion": "v1",
      "timeframe": "right-now",
      "dimensionKey": "resource.meaning"
    },
    "expectedDimensionShape": {
      "min": 0,
      "max": 10,
      "unit": "points",
      "timeframe": "right-now",
      "direction": "higher-reported-resource",
      "dimensionClass": "resources",
      "sourceConstruct": "Смысл"
    },
    "source": "registered-definition:aa30b3c7-f35a-4b52-a335-9a74366c2927@sha256:bdba0d174efd8c4acc1bdd950a329949c0ed5fc9c4c237bd66a78b36f28f7c1b#resource.meaning",
    "sourceMetadata": {
      "title": "Holistic House Resource Pulse",
      "status": "original-non-diagnostic-self-monitoring",
      "reviewedAt": "2026-10-05"
    }
  }
]

const SOURCE_CLAIM = pair(
  'Instrument metadata identifies the measured construct only. The exercise and mapping proposal are original Holistic House editorial work; the instrument source does not recommend or validate this exercise.',
  'Метаданные методики указывают только источник измеряемого конструкта. Упражнение и предложение связи являются оригинальной редакторской работой Holistic House; источник методики не рекомендует и не подтверждает это упражнение.',
)
export const PERSONAL_COURSE_SUPPORT_FAMILIES_CONSTRUCTS = deepFreeze(CONSTRUCT_CONTEXT.map(context => ({
  ...clone(context), definitionVersion: 'v1',
  sourceEvidence: {
    basis: 'registered-instrument-and-scorer-snapshot', registeredDimensionKey: context.dimensionKey,
    registeredItemIds: [context.dimensionKey], auditProposalStatus: 'original-family-draft',
    auditSnapshot: '2026-10-12', sourceRecommendsExercise: false,
  },
  sourceClaim: clone(SOURCE_CLAIM),
  reviewRequired: {
    exactScaleToFamily: true, allObjectiveBindings: true, contentSafety: true,
    enLanguage: true, ruLanguage: true, sensitiveRelationshipContext: context.sensitiveRelationshipContext,
    professionalInstrument: false,
  },
  bindings: clone(BINDINGS.filter(binding => binding.identity.dimensionKey === context.dimensionKey)),
})))

const COPY = {
  en: {
    safety: 'Choose a safe ordinary setting. Keep eyes open and breathe normally. Skip, stop or rest at any time; no particular feeling is required. This is educational self-help, not diagnosis or treatment.',
    briefSafety: 'Eyes open, normal breathing. Skip, stop or rest anytime. Educational self-help, not treatment.',
    prepare: 'Read the action and choose whether it fits. A mild invented example is fine; no earlier lesson or completed exercise is needed.',
    stop: 'End after one pass or about one minute of trying, whichever comes first. Stop sooner if you wish; do not add repetitions or catch up.',
    shortStop: 'Stop after one small pass, or sooner. No repeats or catching up.',
    finish: 'Look around and choose the next ordinary activity or rest. Reflection and transfer are optional; unanswered questions are fine.',
    shortFinish: 'Stop here. Rest is an option.',
    unavailable: 'No distinct alternative method has been authored for this objective and family. A shorter version or rest remains a choice.',
  },
  ru: {
    safety: 'Выберите безопасную обычную обстановку. Глаза открыты, дыхание обычное. Можно пропустить, прекратить или выбрать отдых; определённое чувство не требуется. Это образовательная самопомощь, не диагностика и не лечение.',
    briefSafety: 'Глаза открыты, дыхание обычное. Можно пропустить, остановиться или отдохнуть. Образовательная самопомощь, не лечение.',
    prepare: 'Прочитайте действие и решите, подходит ли оно. Допустим лёгкий вымышленный пример; предыдущие уроки и завершённые упражнения не нужны.',
    stop: 'Закончите после одного прохода или примерно минуты попытки — что наступит раньше. Можно раньше; не добавляйте повторов и не наверстывайте.',
    shortStop: 'Остановитесь после одного малого прохода или раньше. Без повторов и наверстывания.',
    finish: 'Оглядитесь и выберите следующее обычное занятие или отдых. Размышление и перенос необязательны; вопросы можно оставить без ответа.',
    shortFinish: 'На этом остановитесь. Можно отдохнуть.',
    unavailable: 'Отличающийся альтернативный метод для этой цели урока и семейства не написан. Можно выбрать короткую версию или отдых.',
  },
}
const objectiveId = day => `${PERSONAL_COURSE_SUPPORT_FAMILIES_CURRICULUM_VERSION}/day/${day}`
const practiceId = (skillId, day, variant, locale) => `hh-personal-support-families/${skillId}/day/${day}/${variant}/${locale}`
const REFERENCE_KEYS = ['objectiveId', 'skillId', 'practiceId', 'contentVersion', 'contentLocale', 'variant', 'durationMinutes', 'intensity', 'reviewStatus', 'minimumEntry']
const practiceReference = card => Object.fromEntries(REFERENCE_KEYS.map(key => [key, card[key]]))
function makeCard(family, day, variant, locale) {
  const arc = ARC.find(row => row.day === day), t = COPY[locale], short = variant === 'short'
  const action = family.days[day][variant][locale]
  return {
    practiceId: practiceId(family.id, day, variant, locale), skillId: family.id, day, week: arc.week,
    kind: 'practice', objectiveId: objectiveId(day), curriculumVersion: PERSONAL_COURSE_SUPPORT_FAMILIES_CURRICULUM_VERSION,
    sharedSkill: arc.skill[locale], sharedObjective: arc.objective[locale],
    contentVersion: PERSONAL_COURSE_SUPPORT_FAMILIES_CONTENT_VERSION,
    familyEditionVersion: PERSONAL_COURSE_SUPPORT_FAMILIES_VERSION, contentLocale: locale, variant,
    topicId: family.topicId, dimensionKey: family.dimensionKey,
    title: `${arc.skill[locale]}: ${family.label[locale]}`,
    entry: short ? family.shortEntry[locale] : family.entry[locale],
    safety: `${short ? t.briefSafety : t.safety} ${family.boundary[locale]}`,
    steps: short ? [action] : [t.prepare, action], action,
    stoppingPoint: short ? t.shortStop : t.stop,
    optionalReflection: short ? null : family.reflection[locale],
    optionalTransfer: short ? null : family.transfer[locale],
    finish: short ? t.shortFinish : t.finish,
    durationMinutes: short ? 2 : 5, durationIsEstimate: true,
    durationIncludes: ['entry', 'explanation', 'action', 'optional-reflection', 'finish'],
    completionTimerRequired: false, intensity: 'gentle', minimumEntry: true,
    requiresPreviousCompletion: false, previousLessonRequired: false,
    reviewStatus: 'draft', contentStatus: PERSONAL_COURSE_SUPPORT_FAMILIES_STATUS,
    source: SOURCE, sourceType: 'original-educational-content',
    clinicalValidation: false, efficacyClaim: false, automaticTreatment: false,
    productionEligible: false, productionIntegrated: false,
    independentReviewRequired: ['objective-to-practice-mapping', 'content-safety', 'en-language', 'ru-language'],
    accessibility: { eyesOpen: true, naturalBreathing: true, textVersion: true, skipAnytime: true, stopAnytime: true, restAnytime: true },
    practiceMethod: family.id, alternativeDifference: null,
    alternativeAvailability: { status: 'unavailable', reason: 'distinct-alternative-not-authored', explanation: t.unavailable },
    executionScope: 'private-individual-practice', contactRequired: false,
  }
}

export const PERSONAL_COURSE_SUPPORT_FAMILIES_CONTENT = deepFreeze(FAMILIES.flatMap(family =>
  PRACTICE_DAYS.flatMap(day => LOCALES.flatMap(locale => VARIANTS.map(variant => makeCard(family, day, variant, locale))))
))
export const PERSONAL_COURSE_SUPPORT_FAMILIES_MAPPINGS = deepFreeze(PERSONAL_COURSE_SUPPORT_FAMILIES_CONSTRUCTS.flatMap(construct => {
  const family = FAMILIES.find(entry => entry.id === construct.skillId)
  return construct.bindings.map(binding => ({
    ...clone(binding),
    mappingVersion: `${PERSONAL_COURSE_SUPPORT_FAMILIES_VERSION}/mapping/${binding.identity.definitionId}/${binding.identity.dimensionKey}`,
    status: 'draft', contentStatus: PERSONAL_COURSE_SUPPORT_FAMILIES_STATUS,
    reviewStatus: 'pending-exact-mapping-review', reviewRequired: clone(construct.reviewRequired),
    topicId: family.topicId, curriculumVersion: PERSONAL_COURSE_SUPPORT_FAMILIES_CURRICULUM_VERSION,
    rationale: clone(construct.rationale), limitations: clone(construct.limitations), limitedFacet: clone(construct.limitedFacet),
    sourceEvidence: clone(construct.sourceEvidence), sourceClaim: clone(construct.sourceClaim),
    mappingAuthorship: 'Holistic House original family and exact mapping editorial proposal; safety and bilingual review pending',
    completeConstructCoverage: false, originalSourceExerciseRecommendation: false,
    practices: PERSONAL_COURSE_SUPPORT_FAMILIES_CONTENT.filter(card => card.skillId === family.id).map(practiceReference),
    clinicalValidation: false, efficacyClaim: false, automaticTreatment: false,
    productionEligible: false, productionIntegrated: false,
  }))
}))
export const PERSONAL_COURSE_SUPPORT_FAMILIES_DRAFT_BUNDLE = deepFreeze({
  version: PERSONAL_COURSE_SUPPORT_FAMILIES_VERSION, contentVersion: PERSONAL_COURSE_SUPPORT_FAMILIES_CONTENT_VERSION,
  status: 'draft', contentStatus: PERSONAL_COURSE_SUPPORT_FAMILIES_STATUS, source: SOURCE,
  curriculumVersion: PERSONAL_COURSE_SUPPORT_FAMILIES_CURRICULUM_VERSION,
  scope: {
    constructCount: 3, exactScaleBindingCount: 6, instrumentFormCount: 4,
    definitionKeys: ['hh-weekly-pulse', 'hh-resource-pulse'],
    dimensionKeys: ['weekly.recovery', 'resource.support', 'resource.meaning'],
    skillIds: ['rest-and-rhythm', 'support-access', 'values-and-direction'],
    contentLocales: LOCALES, contentLocaleIndependentOfInstrumentLocale: true,
    practiceDays: PRACTICE_DAYS, reviewDays: [7, 14, 21],
    reviewMaterialSource: 'existing-pilot-whole-goal-reviews-via-integrator',
    reviewMaterialApprovedForFamilies: false, duplicateReviewSystem: false,
    otherScales: 'unsupported-outside-this-three-construct-extension',
    originalPilotReplaced: false, completeAssessmentBatteryCovered: false,
    alternatives: 'unavailable-distinct-method-not-authored',
    sourceClaim: 'Original educational writing; no licensed manual text or clinical efficacy claim.',
  },
  mappings: PERSONAL_COURSE_SUPPORT_FAMILIES_MAPPINGS,
  // The integrator must attach the existing pilot reviews. No local substitutes.
  reviewMapping: null,
  clinicalValidation: false, efficacyClaim: false, automaticTreatment: false,
  productionEligible: false, productionIntegrated: false,
  reviewApprovalMeans: 'editorial-and-exact-mapping-approval-only-not-clinical-efficacy',
})

const IDENTITY_KEYS = ['definitionId', 'definitionKey', 'definitionVersion', 'instrumentLocale', 'translationVersion', 'contentHash', 'scoringKey', 'scoringVersion', 'resultVersion', 'timeframe', 'dimensionKey']
const sameIdentity = (candidate, pinned) => Boolean(candidate && pinned && Object.keys(candidate).length === IDENTITY_KEYS.length && IDENTITY_KEYS.every(key => nonempty(candidate[key]) && candidate[key] === pinned[key]))
const contentIndex = new Map(PERSONAL_COURSE_SUPPORT_FAMILIES_CONTENT.map(card => [`${card.practiceId}\u0000${card.contentVersion}\u0000${card.contentLocale}`, card]))

// Editorial lookups only. No locale/version default, score-based assignment,
// label inference, approval, current-definition rebinding or runtime fallback.
export function getPersonalCourseSupportFamilyContent({ practiceId, contentVersion, contentLocale } = {}) {
  if (![practiceId, contentVersion, contentLocale].every(nonempty)) return null
  const card = contentIndex.get(`${practiceId}\u0000${contentVersion}\u0000${contentLocale}`)
  return card ? clone(card) : null
}
export function getPersonalCourseSupportFamilyMapping(identity) {
  const found = PERSONAL_COURSE_SUPPORT_FAMILIES_MAPPINGS.find(mapping => sameIdentity(identity, mapping.identity))
  return found ? clone(found) : null
}
export function personalCourseSupportFamilySupport(identity) {
  const mapping = getPersonalCourseSupportFamilyMapping(identity)
  return mapping
    ? { status: 'draft-review-required', reason: 'pending-exact-mapping-review', productionEligible: false,
      mappingVersion: mapping.mappingVersion, topicId: mapping.topicId, limitations: clone(mapping.limitations), reviewRequired: clone(mapping.reviewRequired) }
    : { status: 'unsupported', reason: 'outside-family-extension-or-exact-identity-mismatch', productionEligible: false, mappingVersion: null, topicId: null }
}
export function personalCourseSupportFamilyVariantAvailability({ skillId, day, contentLocale, variant } = {}) {
  if (!nonempty(skillId) || !Number.isInteger(day) || !LOCALES.includes(contentLocale) || ![...VARIANTS, 'alternative'].includes(variant)) {
    return { status: 'unavailable', reason: 'invalid-content-selector', practice: null }
  }
  const card = getPersonalCourseSupportFamilyContent({ practiceId: practiceId(skillId, day, variant, contentLocale), contentVersion: PERSONAL_COURSE_SUPPORT_FAMILIES_CONTENT_VERSION, contentLocale })
  return card
    ? { status: 'draft-review-required', reason: 'independent-review-required', practice: practiceReference(card) }
    : { status: 'unavailable', reason: 'exact-variant-not-authored', practice: null }
}

// Full bilingual bodies and exact source/shape bindings for independent review.
// A structural audit does not approve the content, efficacy or translation.
export function listPersonalCourseSupportFamilyAuditRows() {
  return FAMILIES.flatMap(family => PRACTICE_DAYS.map(day => {
    const cards = PERSONAL_COURSE_SUPPORT_FAMILIES_CONTENT.filter(card => card.skillId === family.id && card.day === day)
    const construct = PERSONAL_COURSE_SUPPORT_FAMILIES_CONSTRUCTS.find(row => row.skillId === family.id)
    return {
      skillId: family.id, dimensionKey: family.dimensionKey, day, kind: 'practice', objectiveId: objectiveId(day),
      reviewStatus: 'draft', contentStatus: PERSONAL_COURSE_SUPPORT_FAMILIES_STATUS,
      rationale: clone(construct.rationale), limitations: clone(construct.limitations), bindings: clone(construct.bindings),
      locales: Object.fromEntries(LOCALES.map(locale => [locale, {
        title: cards.find(card => card.contentLocale === locale).title,
        sharedObjective: cards.find(card => card.contentLocale === locale).sharedObjective,
        variants: {
          ...Object.fromEntries(VARIANTS.map(variant => [variant, { status: 'draft-review-required', ...clone(cards.find(card => card.contentLocale === locale && card.variant === variant)) }])),
          alternative: { status: 'unavailable', reason: 'exact-variant-not-authored' },
        },
      }])),
    }
  }))
}

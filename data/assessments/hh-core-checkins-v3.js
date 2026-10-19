import { deepFreeze } from '../../lib/assessments/contracts.js'

// Inactive authored candidates. Catalog/registry activation requires separate review.
// Each response remains a separate ordinal observation: no aggregate or clinical bands.
export const HH_CORE_CHECKIN_DEFINITIONS = deepFreeze([
  {
    "id": "d2353a5d-0079-5563-90c2-de8f66ee182c",
    "key": "hh-current-state",
    "version": "v3",
    "instrumentLocale": "en",
    "translationVersion": "hh-en-v3-20261019",
    "timeframe": "right-now",
    "scoringKey": "raw-dimensions",
    "scoringVersion": "v1",
    "resultVersion": "facet-profile-v1",
    "title": "Current state check-in",
    "source": {
      "title": "Holistic House authored core check-ins",
      "status": "original-non-diagnostic-not-validated",
      "reviewedAt": "2026-10-19"
    },
    "questions": [
      {
        "id": "state.problem_intensity",
        "label": "Difficulty",
        "text": "How intense does your main difficulty feel right now?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "No difficulty",
          "Very intense"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "state.energy",
        "label": "Usable energy",
        "text": "How much energy for everyday activities do you feel you have right now?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "No energy",
          "A great deal of energy"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "state.self_support",
        "label": "Self-support",
        "text": "To what extent can you treat yourself with care right now?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Not at all",
          "Completely"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "state.tension",
        "label": "Inner tension",
        "text": "How much inner tension do you feel right now?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "No tension",
          "Very strong"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "state.fatigue",
        "label": "Fatigue",
        "text": "How tired do you feel right now?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Not tired",
          "Very tired"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "state.current_interference",
        "label": "Interference with an intended action",
        "text": "How much does this difficulty interfere with what you want to do right now?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Not at all",
          "Very much"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      }
    ],
    "optionalContext": [
      {
        "id": "current_focus",
        "maxLength": 1000
      },
      {
        "id": "trigger",
        "maxLength": 1000
      },
      {
        "id": "what_helps",
        "maxLength": 1000
      },
      {
        "id": "desired_change",
        "maxLength": 1000
      },
      {
        "id": "note",
        "maxLength": 1000
      }
    ],
    "suggestedRepeatDays": 7,
    "contentHash": "sha256:5793ec4718c7f13116537eefaadb884e081738d908479cd4c8b54d0bd7a42a04"
  },
  {
    "id": "7e8cfcea-e98d-5822-bc6f-a8e067753275",
    "key": "hh-current-state",
    "version": "v3",
    "instrumentLocale": "ru",
    "translationVersion": "hh-ru-v3-20261019",
    "timeframe": "right-now",
    "scoringKey": "raw-dimensions",
    "scoringVersion": "v1",
    "resultVersion": "facet-profile-v1",
    "title": "Чек-ин текущего состояния",
    "source": {
      "title": "Holistic House authored core check-ins",
      "status": "original-non-diagnostic-not-validated",
      "reviewedAt": "2026-10-19"
    },
    "questions": [
      {
        "id": "state.problem_intensity",
        "label": "Трудность",
        "text": "Насколько сильной ощущается ваша основная трудность прямо сейчас?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Трудности нет",
          "Очень сильная"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "state.energy",
        "label": "Доступная энергия",
        "text": "Сколько энергии для повседневных дел вы ощущаете прямо сейчас?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Совсем нет энергии",
          "Очень много энергии"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "state.self_support",
        "label": "Самоподдержка",
        "text": "Насколько бережно вы можете отнестись к себе прямо сейчас?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Совсем не могу",
          "В полной мере"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "state.tension",
        "label": "Внутреннее напряжение",
        "text": "Насколько сильное внутреннее напряжение вы ощущаете прямо сейчас?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Нет напряжения",
          "Очень сильное"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "state.fatigue",
        "label": "Усталость",
        "text": "Насколько сильную усталость вы ощущаете прямо сейчас?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Не чувствую усталости",
          "Очень сильная усталость"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "state.current_interference",
        "label": "Помеха выбранному действию",
        "text": "Насколько эта трудность мешает вам сделать то, что вы сейчас хотите сделать?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Совсем не мешает",
          "Очень сильно мешает"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      }
    ],
    "optionalContext": [
      {
        "id": "current_focus",
        "maxLength": 1000
      },
      {
        "id": "trigger",
        "maxLength": 1000
      },
      {
        "id": "what_helps",
        "maxLength": 1000
      },
      {
        "id": "desired_change",
        "maxLength": 1000
      },
      {
        "id": "note",
        "maxLength": 1000
      }
    ],
    "suggestedRepeatDays": 7,
    "contentHash": "sha256:913b5a72ae211852f15110d58a3dc9c36c484771c2049a37a46829eca955c527"
  },
  {
    "id": "1f23e04a-d612-5d04-af8d-8d094b9ce75b",
    "key": "hh-weekly-pulse",
    "version": "v2",
    "instrumentLocale": "en",
    "translationVersion": "hh-en-v2-20261019",
    "timeframe": "past-7-days",
    "scoringKey": "raw-dimensions",
    "scoringVersion": "v1",
    "resultVersion": "facet-profile-v1",
    "title": "Weekly Wellbeing Check-in",
    "source": {
      "title": "Holistic House authored core check-ins",
      "status": "original-non-diagnostic-not-validated",
      "reviewedAt": "2026-10-19"
    },
    "questions": [
      {
        "id": "weekly.emotional_wellbeing",
        "label": "Emotional wellbeing",
        "text": "Thinking about the past 7 days as a whole, how emotionally well have you felt?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Not at all emotionally well",
          "Very emotionally well"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "weekly.inner_tension",
        "label": "Inner tension",
        "text": "Thinking about the past 7 days as a whole, how much inner tension have you felt?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "None",
          "Very strong"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "weekly.perceived_load",
        "label": "Perceived load",
        "text": "Thinking about the past 7 days as a whole, how heavy has your overall load felt?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Not heavy",
          "Extremely heavy"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "weekly.restorative_sleep",
        "label": "Restoration after sleep",
        "text": "Thinking about the past 7 days as a whole, how restored have you felt after sleep?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Not restored",
          "Fully restored"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "weekly.usable_energy",
        "label": "Usable energy",
        "text": "Thinking about the past 7 days as a whole, how much energy for everyday activities have you felt you had?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "None",
          "A great deal"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "weekly.concentration",
        "label": "Concentration",
        "text": "Thinking about the past 7 days as a whole, how well have you been able to concentrate on a task?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Not at all",
          "Very well"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "weekly.felt_connection",
        "label": "Felt connection",
        "text": "Thinking about the past 7 days as a whole, how connected to other people have you felt?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Not at all connected",
          "Very connected"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "weekly.daily_activities",
        "label": "Daily activities",
        "text": "Thinking about the past 7 days as a whole, how well have you been able to carry out necessary everyday activities?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Not at all",
          "Fully"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 7,
    "contentHash": "sha256:7e01176647a580c5016322b5c0ab8e188149e8fb21a3eb3e7a6ecf8b6c3657dc"
  },
  {
    "id": "da596b5a-b474-5425-ae51-ccf45899f6ee",
    "key": "hh-weekly-pulse",
    "version": "v2",
    "instrumentLocale": "ru",
    "translationVersion": "hh-ru-v2-20261019",
    "timeframe": "past-7-days",
    "scoringKey": "raw-dimensions",
    "scoringVersion": "v1",
    "resultVersion": "facet-profile-v1",
    "title": "Чек-ин самочувствия за неделю",
    "source": {
      "title": "Holistic House authored core check-ins",
      "status": "original-non-diagnostic-not-validated",
      "reviewedAt": "2026-10-19"
    },
    "questions": [
      {
        "id": "weekly.emotional_wellbeing",
        "label": "Эмоциональное самочувствие",
        "text": "Если оценить последние 7 дней в целом, насколько благополучным было ваше эмоциональное самочувствие?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Совсем неблагополучным",
          "Очень благополучным"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "weekly.inner_tension",
        "label": "Внутреннее напряжение",
        "text": "Если оценить последние 7 дней в целом, насколько сильным было внутреннее напряжение?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Не было",
          "Очень сильным"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "weekly.perceived_load",
        "label": "Ощущаемая нагрузка",
        "text": "Если оценить последние 7 дней в целом, насколько тяжёлой ощущалась ваша общая нагрузка?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Совсем не тяжёлой",
          "Чрезвычайно тяжёлой"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "weekly.restorative_sleep",
        "label": "Восстановление после сна",
        "text": "Если оценить последние 7 дней в целом, насколько восстановившимся вы чувствовали себя после сна?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Совсем не восстановившимся",
          "Полностью восстановившимся"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "weekly.usable_energy",
        "label": "Доступная энергия",
        "text": "Если оценить последние 7 дней в целом, сколько энергии для повседневных дел вы ощущали?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Совсем не было",
          "Очень много"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "weekly.concentration",
        "label": "Сосредоточенность",
        "text": "Если оценить последние 7 дней в целом, насколько хорошо вам удавалось сосредоточиться на задаче?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Совсем не удавалось",
          "Очень хорошо"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "weekly.felt_connection",
        "label": "Ощущение связи с людьми",
        "text": "Если оценить последние 7 дней в целом, насколько сильную связь с другими людьми вы ощущали?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Совсем не ощущал(а)",
          "Очень сильную"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      },
      {
        "id": "weekly.daily_activities",
        "label": "Повседневные дела",
        "text": "Если оценить последние 7 дней в целом, насколько хорошо вам удавалось выполнять необходимые повседневные дела?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Совсем не удавалось",
          "В полной мере"
        ],
        "direction": "non-normative",
        "dimensionClass": "state"
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 7,
    "contentHash": "sha256:6aee529e9c7e505e1f3e9826284dc26f3cd0f566a3bce4228404ebb04ce233ea"
  },
  {
    "id": "fbc7bb12-523a-5750-85cd-989ac17253b9",
    "key": "hh-resource-pulse",
    "version": "v2",
    "instrumentLocale": "en",
    "translationVersion": "hh-en-v2-20261019",
    "timeframe": "right-now",
    "scoringKey": "raw-dimensions",
    "scoringVersion": "v1",
    "resultVersion": "facet-profile-v1",
    "title": "Current resources check-in",
    "source": {
      "title": "Holistic House authored core check-ins",
      "status": "original-non-diagnostic-not-validated",
      "reviewedAt": "2026-10-19"
    },
    "questions": [
      {
        "id": "resource.energy",
        "label": "Usable energy",
        "text": "How much energy for everyday activities do you feel you have right now?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "No energy",
          "A great deal of energy"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "resource.self_support",
        "label": "Self-support",
        "text": "To what extent can you treat yourself with care right now?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Not at all",
          "Completely"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "resource.interpersonal_support",
        "label": "Available support from people",
        "text": "To what extent do you feel that there is someone you could turn to for support right now?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Not at all",
          "Completely"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "resource.connection",
        "label": "Felt connection",
        "text": "How connected to other people do you feel right now?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Not at all connected",
          "Very connected"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "resource.agency",
        "label": "Influence on a next step",
        "text": "To what extent do you feel you can influence your next small step right now?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Not at all",
          "To a very great extent"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "resource.personal_meaning",
        "label": "Meaning in current activities",
        "text": "How meaningful do your current activities feel to you right now?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Not at all meaningful",
          "Very meaningful"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 14,
    "contentHash": "sha256:7e5568e7326fa9aed79ab245da4e19b2a103867f73317762bab85080dea9333d"
  },
  {
    "id": "ca6728bd-4d49-5235-9149-a0ae6e661673",
    "key": "hh-resource-pulse",
    "version": "v2",
    "instrumentLocale": "ru",
    "translationVersion": "hh-ru-v2-20261019",
    "timeframe": "right-now",
    "scoringKey": "raw-dimensions",
    "scoringVersion": "v1",
    "resultVersion": "facet-profile-v1",
    "title": "Чек-ин текущих ресурсов",
    "source": {
      "title": "Holistic House authored core check-ins",
      "status": "original-non-diagnostic-not-validated",
      "reviewedAt": "2026-10-19"
    },
    "questions": [
      {
        "id": "resource.energy",
        "label": "Доступная энергия",
        "text": "Сколько энергии для повседневных дел вы ощущаете прямо сейчас?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Совсем нет энергии",
          "Очень много энергии"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "resource.self_support",
        "label": "Самоподдержка",
        "text": "Насколько бережно вы можете отнестись к себе прямо сейчас?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Совсем не могу",
          "В полной мере"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "resource.interpersonal_support",
        "label": "Доступная поддержка от людей",
        "text": "Насколько вы сейчас ощущаете, что есть человек, к которому можно обратиться за поддержкой?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Совсем не ощущаю",
          "В полной мере"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "resource.connection",
        "label": "Ощущение связи с людьми",
        "text": "Насколько сильную связь с другими людьми вы ощущаете прямо сейчас?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Совсем не ощущаю",
          "Очень сильную"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "resource.agency",
        "label": "Влияние на следующий шаг",
        "text": "Насколько вы ощущаете, что можете повлиять на свой следующий небольшой шаг прямо сейчас?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Совсем не могу повлиять",
          "Могу повлиять в очень большой степени"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "resource.personal_meaning",
        "label": "Смысл текущих занятий",
        "text": "Насколько значимыми для вас ощущаются ваши текущие занятия прямо сейчас?",
        "type": "integer",
        "min": 0,
        "max": 10,
        "required": true,
        "anchors": [
          "Совсем не значимыми",
          "Очень значимыми"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 14,
    "contentHash": "sha256:10d5341916761e2180b84034e3fda0778bd0b81caa1e15a72e6a6ffa41410ede"
  },
  {
    "id": "e5b0d765-eb1c-56db-91e9-9ca457e626e9",
    "key": "hh-monthly-profile",
    "version": "v2",
    "instrumentLocale": "en",
    "translationVersion": "hh-en-v2-20261019",
    "timeframe": "past-30-days",
    "scoringKey": "raw-dimensions",
    "scoringVersion": "v1",
    "resultVersion": "facet-profile-v1",
    "title": "Monthly life check-in",
    "source": {
      "title": "Holistic House authored core check-ins",
      "status": "original-non-diagnostic-not-validated",
      "reviewedAt": "2026-10-19"
    },
    "questions": [
      {
        "id": "monthly.emotional_grounding",
        "label": "Emotional steadiness",
        "text": "Over the past 30 days, to what extent has this been true for you? I have felt emotionally steady.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Not at all",
          "Very much"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.self_care",
        "label": "Care toward myself",
        "text": "Over the past 30 days, to what extent has this been true for you? I have been able to treat myself with care.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Not at all",
          "Very much"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.needs_awareness",
        "label": "Knowing what I need next",
        "text": "Over the past 30 days, to what extent has this been true for you? I have known what I need next.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Not at all",
          "Very much"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.connection",
        "label": "Connection with important people",
        "text": "Over the past 30 days, to what extent has this been true for you? I have felt connected with people who matter to me.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Not at all",
          "Very much"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.relational_safety",
        "label": "Feeling safe to be myself",
        "text": "Over the past 30 days, to what extent has this been true for you? I have felt safe to be myself in my important relationships.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Not at all",
          "Very much"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.asking_support",
        "label": "Ability to ask for support",
        "text": "Over the past 30 days, to what extent has this been true for you? I have felt able to ask someone for support.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Not at all",
          "Very much"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.body_comfort",
        "label": "Bodily comfort",
        "text": "Over the past 30 days, to what extent has this been true for you? My body has felt comfortable.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Not at all",
          "Very much"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.restorative_sleep",
        "label": "Restoration after sleep",
        "text": "Over the past 30 days, to what extent has this been true for you? I have felt restored after sleep.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Not at all",
          "Very much"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.physical_energy",
        "label": "Energy for everyday activities",
        "text": "Over the past 30 days, to what extent has this been true for you? I have had enough physical energy for everyday activities.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Not at all",
          "Very much"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.concentration",
        "label": "Concentration",
        "text": "Over the past 30 days, to what extent has this been true for you? I have been able to concentrate on important tasks.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Not at all",
          "Very much"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.manageable_load",
        "label": "Manageability of load",
        "text": "Over the past 30 days, to what extent has this been true for you? My everyday load has felt manageable.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Not at all",
          "Very much"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.daily_responsibilities",
        "label": "Everyday responsibilities",
        "text": "Over the past 30 days, to what extent has this been true for you? I have been able to carry out my everyday responsibilities.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Not at all",
          "Very much"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.direction",
        "label": "Sense of direction",
        "text": "Over the past 30 days, to what extent has this been true for you? I have felt a sense of direction in my life.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Not at all",
          "Very much"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.meaningful_activities",
        "label": "Meaningful activities",
        "text": "Over the past 30 days, to what extent has this been true for you? I have had activities that feel meaningful to me.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Not at all",
          "Very much"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.desired_step",
        "label": "A next step I want to take",
        "text": "Over the past 30 days, to what extent has this been true for you? I have seen a next step that I want to take.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Not at all",
          "Very much"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.practical_support",
        "label": "Available practical help",
        "text": "Over the past 30 days, to what extent has this been true for you? I have felt that practical help is available to me.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Not at all",
          "Very much"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.emotional_support",
        "label": "Available emotional support",
        "text": "Over the past 30 days, to what extent has this been true for you? I have felt that emotional support is available to me.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Not at all",
          "Very much"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.companionship",
        "label": "Not facing difficulties alone",
        "text": "Over the past 30 days, to what extent has this been true for you? I have felt that I do not have to face difficulties alone.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Not at all",
          "Very much"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 30,
    "answerScale": {
      "min": 0,
      "max": 4
    },
    "responseAnchors": [
      "Not at all",
      "A little",
      "Moderately",
      "Quite a lot",
      "Very much"
    ],
    "contentHash": "sha256:b11ce52bca651340e8d6ae1dada8abd8a79ae4a183402ec63f88be6d97a4b627"
  },
  {
    "id": "b0c99cb6-b8fc-530b-b4ea-345cf52bce0e",
    "key": "hh-monthly-profile",
    "version": "v2",
    "instrumentLocale": "ru",
    "translationVersion": "hh-ru-v2-20261019",
    "timeframe": "past-30-days",
    "scoringKey": "raw-dimensions",
    "scoringVersion": "v1",
    "resultVersion": "facet-profile-v1",
    "title": "Чек-ин жизни за месяц",
    "source": {
      "title": "Holistic House authored core check-ins",
      "status": "original-non-diagnostic-not-validated",
      "reviewedAt": "2026-10-19"
    },
    "questions": [
      {
        "id": "monthly.emotional_grounding",
        "label": "Эмоциональная устойчивость",
        "text": "Насколько это было верно для вас за последние 30 дней? Я ощущал(а) эмоциональную устойчивость.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Совсем нет",
          "В очень большой степени"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.self_care",
        "label": "Бережное отношение к себе",
        "text": "Насколько это было верно для вас за последние 30 дней? Мне удавалось относиться к себе бережно.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Совсем нет",
          "В очень большой степени"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.needs_awareness",
        "label": "Понимание следующей потребности",
        "text": "Насколько это было верно для вас за последние 30 дней? Я понимал(а), что мне нужно дальше.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Совсем нет",
          "В очень большой степени"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.connection",
        "label": "Связь с важными людьми",
        "text": "Насколько это было верно для вас за последние 30 дней? Я ощущал(а) связь с важными для меня людьми.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Совсем нет",
          "В очень большой степени"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.relational_safety",
        "label": "Безопасность быть собой",
        "text": "Насколько это было верно для вас за последние 30 дней? В важных отношениях я чувствовал(а), что могу безопасно быть собой.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Совсем нет",
          "В очень большой степени"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.asking_support",
        "label": "Возможность попросить поддержку",
        "text": "Насколько это было верно для вас за последние 30 дней? Я ощущал(а), что могу попросить другого человека о поддержке.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Совсем нет",
          "В очень большой степени"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.body_comfort",
        "label": "Телесный комфорт",
        "text": "Насколько это было верно для вас за последние 30 дней? Моё тело ощущалось комфортно.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Совсем нет",
          "В очень большой степени"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.restorative_sleep",
        "label": "Восстановление после сна",
        "text": "Насколько это было верно для вас за последние 30 дней? После сна я чувствовал(а) себя восстановившимся.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Совсем нет",
          "В очень большой степени"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.physical_energy",
        "label": "Энергия для повседневных дел",
        "text": "Насколько это было верно для вас за последние 30 дней? У меня было достаточно физических сил для повседневных дел.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Совсем нет",
          "В очень большой степени"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.concentration",
        "label": "Сосредоточенность",
        "text": "Насколько это было верно для вас за последние 30 дней? Мне удавалось сосредоточиться на важных задачах.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Совсем нет",
          "В очень большой степени"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.manageable_load",
        "label": "Управляемость нагрузки",
        "text": "Насколько это было верно для вас за последние 30 дней? Моя повседневная нагрузка ощущалась управляемой.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Совсем нет",
          "В очень большой степени"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.daily_responsibilities",
        "label": "Повседневные обязанности",
        "text": "Насколько это было верно для вас за последние 30 дней? Мне удавалось выполнять повседневные обязанности.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Совсем нет",
          "В очень большой степени"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.direction",
        "label": "Ощущение направления",
        "text": "Насколько это было верно для вас за последние 30 дней? Я ощущал(а) направление в своей жизни.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Совсем нет",
          "В очень большой степени"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.meaningful_activities",
        "label": "Значимые занятия",
        "text": "Насколько это было верно для вас за последние 30 дней? У меня были занятия, которые ощущались значимыми для меня.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Совсем нет",
          "В очень большой степени"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.desired_step",
        "label": "Желаемый следующий шаг",
        "text": "Насколько это было верно для вас за последние 30 дней? Я видел(а) следующий шаг, который хочу сделать.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Совсем нет",
          "В очень большой степени"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.practical_support",
        "label": "Доступная практическая помощь",
        "text": "Насколько это было верно для вас за последние 30 дней? Я ощущал(а), что мне доступна практическая помощь.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Совсем нет",
          "В очень большой степени"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.emotional_support",
        "label": "Доступная эмоциональная поддержка",
        "text": "Насколько это было верно для вас за последние 30 дней? Я ощущал(а), что мне доступна эмоциональная поддержка.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Совсем нет",
          "В очень большой степени"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      },
      {
        "id": "monthly.companionship",
        "label": "Не оставаться с трудностями одному",
        "text": "Насколько это было верно для вас за последние 30 дней? Я ощущал(а), что не должен(на) справляться с трудностями в одиночку.",
        "type": "integer",
        "min": 0,
        "max": 4,
        "required": true,
        "anchors": [
          "Совсем нет",
          "В очень большой степени"
        ],
        "direction": "non-normative",
        "dimensionClass": "resources"
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 30,
    "answerScale": {
      "min": 0,
      "max": 4
    },
    "responseAnchors": [
      "Совсем нет",
      "Немного",
      "Умеренно",
      "В значительной степени",
      "В очень большой степени"
    ],
    "contentHash": "sha256:0ec9d41be32d8725d02cb1c637a12249c15b942e754fcd03d7397badf520d3c8"
  }
])

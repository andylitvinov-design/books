import { deepFreeze } from '../../lib/assessments/contracts.js'

// UUIDs: UUIDv5 URL namespace, seed holistic-house:assessment:{key}:v2:{locale}:split-2026-10-16.
// New immutable definitions; historical v1 questions, maps, hashes and scores stay unchanged.
// configured:v1 remains the same mean arithmetic engine; v2 identifies the new content/map.
export const HH_SPLIT_V2_DEFINITIONS = deepFreeze([
  {
    "id": "52c75d85-d99e-5178-8ee4-3b7faa802601",
    "key": "hh-money-pressure",
    "version": "v2",
    "instrumentLocale": "en",
    "translationVersion": "hh-en-v2",
    "timeframe": "past-7-days",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v2",
    "title": "Money Pressure",
    "source": {
      "title": "Holistic House — Money Pressure",
      "status": "original-playful-non-diagnostic-reflection",
      "reviewedAt": "2026-10-16",
      "versionNote": "Original Holistic House descriptive reflection. Difficulty and coping/context are reported separately; no validated clinical cutoffs or cross-version equivalence are claimed."
    },
    "answerScale": {
      "min": 0,
      "max": 4
    },
    "responseAnchors": [
      "Not at all",
      "A little",
      "Somewhat",
      "Quite a lot",
      "Very much"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "state.money_pressure.difficulty",
          "method": "mean",
          "items": [
            "hh-money-pressure.01",
            "hh-money-pressure.02",
            "hh-money-pressure.03"
          ],
          "min": 0,
          "max": 4,
          "dimensionClass": "state",
          "sourceConstruct": "Money-related difficulty",
          "direction": "lower-reported-difficulty"
        },
        {
          "key": "resources.money_pressure.coping",
          "method": "mean",
          "items": [
            "hh-money-pressure.04",
            "hh-money-pressure.05",
            "hh-money-pressure.06"
          ],
          "min": 0,
          "max": 4,
          "dimensionClass": "resources",
          "sourceConstruct": "Available money-related coping",
          "direction": "higher-reported-resource"
        }
      ]
    },
    "questions": [
      {
        "id": "hh-money-pressure.01",
        "text": "Money worries take up a lot of mental space.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-money-pressure.02",
        "text": "Financial uncertainty makes it harder to relax.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-money-pressure.03",
        "text": "I avoid looking at money-related information because it feels stressful.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-money-pressure.04",
        "text": "I can separate immediate financial facts from catastrophic thoughts.",
        "required": true,
        "direction": "higher-reported-resource"
      },
      {
        "id": "hh-money-pressure.05",
        "text": "I know one practical financial action I can take.",
        "required": true,
        "direction": "higher-reported-resource"
      },
      {
        "id": "hh-money-pressure.06",
        "text": "I have someone or somewhere I can turn to for practical financial information if needed.",
        "required": true,
        "direction": "higher-reported-resource"
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 14,
    "contentHash": "sha256:f36aabcb8b5edb8a0d36f0fa029491948641cf965e1408cecf6792b73c566215"
  },
  {
    "id": "7715324b-f54c-5d7c-8ca7-08ff17ba8c8e",
    "key": "hh-money-pressure",
    "version": "v2",
    "instrumentLocale": "ru",
    "translationVersion": "hh-ru-v2",
    "timeframe": "past-7-days",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v2",
    "title": "Давление денег",
    "source": {
      "title": "Holistic House — Money Pressure",
      "status": "original-playful-non-diagnostic-reflection",
      "reviewedAt": "2026-10-16",
      "versionNote": "Original Holistic House descriptive reflection. Difficulty and coping/context are reported separately; no validated clinical cutoffs or cross-version equivalence are claimed."
    },
    "answerScale": {
      "min": 0,
      "max": 4
    },
    "responseAnchors": [
      "Совсем нет",
      "Немного",
      "Отчасти",
      "В значительной степени",
      "Очень сильно"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "state.money_pressure.difficulty",
          "method": "mean",
          "items": [
            "hh-money-pressure.01",
            "hh-money-pressure.02",
            "hh-money-pressure.03"
          ],
          "min": 0,
          "max": 4,
          "dimensionClass": "state",
          "sourceConstruct": "Трудности, связанные с деньгами",
          "direction": "lower-reported-difficulty"
        },
        {
          "key": "resources.money_pressure.coping",
          "method": "mean",
          "items": [
            "hh-money-pressure.04",
            "hh-money-pressure.05",
            "hh-money-pressure.06"
          ],
          "min": 0,
          "max": 4,
          "dimensionClass": "resources",
          "sourceConstruct": "Доступное совладание с денежными трудностями",
          "direction": "higher-reported-resource"
        }
      ]
    },
    "questions": [
      {
        "id": "hh-money-pressure.01",
        "text": "Денежные тревоги занимают много места в голове.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-money-pressure.02",
        "text": "Финансовая неопределённость мешает мне расслабляться.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-money-pressure.03",
        "text": "Я избегаю смотреть финансовую информацию, потому что это вызывает стресс.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-money-pressure.04",
        "text": "Я могу отделять реальные финансовые факты от катастрофических мыслей.",
        "required": true,
        "direction": "higher-reported-resource"
      },
      {
        "id": "hh-money-pressure.05",
        "text": "Я знаю одно практическое финансовое действие, которое могу сделать.",
        "required": true,
        "direction": "higher-reported-resource"
      },
      {
        "id": "hh-money-pressure.06",
        "text": "Если нужно, я знаю, к кому или куда обратиться за практической финансовой информацией.",
        "required": true,
        "direction": "higher-reported-resource"
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 14,
    "contentHash": "sha256:2856d92e72808ed1697450cacf66738b84e88fd6849e9d3a94d247005e2143b1"
  },
  {
    "id": "f65b9e09-2818-5c01-abb7-438600530e8f",
    "key": "hh-overthinking-loop",
    "version": "v2",
    "instrumentLocale": "en",
    "translationVersion": "hh-en-v2",
    "timeframe": "right-now",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v2",
    "title": "Overthinking Loop",
    "source": {
      "title": "Holistic House — Overthinking Loop",
      "status": "original-playful-non-diagnostic-reflection",
      "reviewedAt": "2026-10-16",
      "versionNote": "Original Holistic House descriptive reflection. Difficulty and coping/context are reported separately; no validated clinical cutoffs or cross-version equivalence are claimed."
    },
    "answerScale": {
      "min": 0,
      "max": 4
    },
    "responseAnchors": [
      "Not at all",
      "A little",
      "Somewhat",
      "Quite a lot",
      "Very much"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "state.overthinking_loop.difficulty",
          "method": "mean",
          "items": [
            "hh-overthinking-loop.01",
            "hh-overthinking-loop.02",
            "hh-overthinking-loop.03",
            "hh-overthinking-loop.04",
            "hh-overthinking-loop.05"
          ],
          "min": 0,
          "max": 4,
          "dimensionClass": "state",
          "sourceConstruct": "Repetitive-thinking difficulty",
          "direction": "lower-reported-difficulty"
        },
        {
          "key": "resources.overthinking_loop.interruptibility",
          "method": "mean",
          "items": [
            "hh-overthinking-loop.06"
          ],
          "min": 0,
          "max": 4,
          "dimensionClass": "resources",
          "sourceConstruct": "Reported interruptibility of the loop",
          "direction": "higher-reported-resource"
        }
      ]
    },
    "questions": [
      {
        "id": "hh-overthinking-loop.01",
        "text": "I replay conversations or decisions long after they are over.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-overthinking-loop.02",
        "text": "My mind keeps searching for certainty that is not available.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-overthinking-loop.03",
        "text": "Thinking more often makes me feel less clear rather than more clear.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-overthinking-loop.04",
        "text": "I return to the same question without finding new information.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-overthinking-loop.05",
        "text": "It is hard to shift attention away from a worry.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-overthinking-loop.06",
        "text": "A concrete action or pause can sometimes interrupt the loop.",
        "required": true,
        "direction": "higher-reported-resource"
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 7,
    "contentHash": "sha256:32d1ab6b9fa008555edad1ebc457b49257fe310e8bbea971ad93b1189f27bb7c"
  },
  {
    "id": "3ea615ee-b188-5c1e-8e41-2bfd221a75d7",
    "key": "hh-overthinking-loop",
    "version": "v2",
    "instrumentLocale": "ru",
    "translationVersion": "hh-ru-v2",
    "timeframe": "right-now",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v2",
    "title": "Петля переосмысления",
    "source": {
      "title": "Holistic House — Overthinking Loop",
      "status": "original-playful-non-diagnostic-reflection",
      "reviewedAt": "2026-10-16",
      "versionNote": "Original Holistic House descriptive reflection. Difficulty and coping/context are reported separately; no validated clinical cutoffs or cross-version equivalence are claimed."
    },
    "answerScale": {
      "min": 0,
      "max": 4
    },
    "responseAnchors": [
      "Совсем нет",
      "Немного",
      "Отчасти",
      "В значительной степени",
      "Очень сильно"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "state.overthinking_loop.difficulty",
          "method": "mean",
          "items": [
            "hh-overthinking-loop.01",
            "hh-overthinking-loop.02",
            "hh-overthinking-loop.03",
            "hh-overthinking-loop.04",
            "hh-overthinking-loop.05"
          ],
          "min": 0,
          "max": 4,
          "dimensionClass": "state",
          "sourceConstruct": "Трудности из-за повторяющихся размышлений",
          "direction": "lower-reported-difficulty"
        },
        {
          "key": "resources.overthinking_loop.interruptibility",
          "method": "mean",
          "items": [
            "hh-overthinking-loop.06"
          ],
          "min": 0,
          "max": 4,
          "dimensionClass": "resources",
          "sourceConstruct": "Сообщаемая возможность прервать петлю",
          "direction": "higher-reported-resource"
        }
      ]
    },
    "questions": [
      {
        "id": "hh-overthinking-loop.01",
        "text": "Я долго прокручиваю разговоры или решения после того, как они закончились.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-overthinking-loop.02",
        "text": "Мой ум продолжает искать уверенность, которой невозможно получить.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-overthinking-loop.03",
        "text": "Чем больше я думаю, тем меньше ясности, а не больше.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-overthinking-loop.04",
        "text": "Я возвращаюсь к одному и тому же вопросу без новой информации.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-overthinking-loop.05",
        "text": "Мне трудно переключить внимание с тревожной темы.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-overthinking-loop.06",
        "text": "Конкретное действие или пауза иногда помогают прервать петлю.",
        "required": true,
        "direction": "higher-reported-resource"
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 7,
    "contentHash": "sha256:2d00bc4bcd272d5c8ab8efc22ab72941a1f3003ae1e89b577a7b2d1642fab0af"
  },
  {
    "id": "0c27f7d6-0280-5dcd-8f10-59447585b1df",
    "key": "hh-screen-saturation",
    "version": "v2",
    "instrumentLocale": "en",
    "translationVersion": "hh-en-v2",
    "timeframe": "right-now",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v2",
    "title": "Screen Saturation",
    "source": {
      "title": "Holistic House — Screen Saturation",
      "status": "original-playful-non-diagnostic-reflection",
      "reviewedAt": "2026-10-16",
      "versionNote": "Original Holistic House descriptive reflection. Difficulty and coping/context are reported separately; no validated clinical cutoffs or cross-version equivalence are claimed."
    },
    "answerScale": {
      "min": 0,
      "max": 4
    },
    "responseAnchors": [
      "Not at all",
      "A little",
      "Somewhat",
      "Quite a lot",
      "Very much"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "state.screen_saturation.difficulty",
          "method": "mean",
          "items": [
            "hh-screen-saturation.01",
            "hh-screen-saturation.02",
            "hh-screen-saturation.03",
            "hh-screen-saturation.04",
            "hh-screen-saturation.05"
          ],
          "min": 0,
          "max": 4,
          "dimensionClass": "state",
          "sourceConstruct": "Screen-related difficulty",
          "direction": "lower-reported-difficulty"
        },
        {
          "key": "context.screen_saturation.offline_relief",
          "method": "mean",
          "items": [
            "hh-screen-saturation.06"
          ],
          "min": 0,
          "max": 4,
          "dimensionClass": "state",
          "sourceConstruct": "Perceived relief after time offline",
          "direction": "non-normative"
        }
      ]
    },
    "questions": [
      {
        "id": "hh-screen-saturation.01",
        "text": "After a lot of screen time, my mind feels overloaded.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-screen-saturation.02",
        "text": "I switch between apps or tabs without a clear reason.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-screen-saturation.03",
        "text": "Notifications pull my attention more than I want.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-screen-saturation.04",
        "text": "It is hard to stop scrolling even when I am tired.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-screen-saturation.05",
        "text": "Screens make it harder for me to wind down.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-screen-saturation.06",
        "text": "After time offline, I notice some mental relief.",
        "required": true,
        "direction": "non-normative"
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 7,
    "contentHash": "sha256:103c89e66cfa2d598876856b407ad7c7f7b6aaeab6d76db3a3c88eb060ae8684"
  },
  {
    "id": "9a864e36-7362-567b-923e-ea99228f933d",
    "key": "hh-screen-saturation",
    "version": "v2",
    "instrumentLocale": "ru",
    "translationVersion": "hh-ru-v2",
    "timeframe": "right-now",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v2",
    "title": "Перегруз экраном",
    "source": {
      "title": "Holistic House — Screen Saturation",
      "status": "original-playful-non-diagnostic-reflection",
      "reviewedAt": "2026-10-16",
      "versionNote": "Original Holistic House descriptive reflection. Difficulty and coping/context are reported separately; no validated clinical cutoffs or cross-version equivalence are claimed."
    },
    "answerScale": {
      "min": 0,
      "max": 4
    },
    "responseAnchors": [
      "Совсем нет",
      "Немного",
      "Отчасти",
      "В значительной степени",
      "Очень сильно"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "state.screen_saturation.difficulty",
          "method": "mean",
          "items": [
            "hh-screen-saturation.01",
            "hh-screen-saturation.02",
            "hh-screen-saturation.03",
            "hh-screen-saturation.04",
            "hh-screen-saturation.05"
          ],
          "min": 0,
          "max": 4,
          "dimensionClass": "state",
          "sourceConstruct": "Трудности, связанные с экранами",
          "direction": "lower-reported-difficulty"
        },
        {
          "key": "context.screen_saturation.offline_relief",
          "method": "mean",
          "items": [
            "hh-screen-saturation.06"
          ],
          "min": 0,
          "max": 4,
          "dimensionClass": "state",
          "sourceConstruct": "Ощущаемое облегчение после времени без экрана",
          "direction": "non-normative"
        }
      ]
    },
    "questions": [
      {
        "id": "hh-screen-saturation.01",
        "text": "После большого количества экранного времени мозг ощущается перегруженным.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-screen-saturation.02",
        "text": "Я переключаюсь между приложениями или вкладками без ясной причины.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-screen-saturation.03",
        "text": "Уведомления сильнее отвлекают меня, чем хотелось бы.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-screen-saturation.04",
        "text": "Мне трудно перестать листать, даже когда я устал.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-screen-saturation.05",
        "text": "Экраны мешают мне постепенно успокаиваться.",
        "required": true,
        "direction": "lower-reported-difficulty"
      },
      {
        "id": "hh-screen-saturation.06",
        "text": "После времени без экрана я замечаю некоторое облегчение.",
        "required": true,
        "direction": "non-normative"
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 7,
    "contentHash": "sha256:cb2f593377bd2d2b5cd356bf2b0addc92d2778acd02501ea6e89f492b48acb45"
  }
])

export const HH_SPLIT_V2_DIMENSION_ROWS = deepFreeze([
  [
    "hh-money-pressure",
    "state.money_pressure.difficulty",
    "stress",
    "Money-related difficulty",
    "Трудности, связанные с деньгами",
    "Notice which money-related situations feel difficult; describe practical facts separately from worries.",
    "Отметьте трудные денежные ситуации; опишите практические факты отдельно от тревог."
  ],
  [
    "hh-money-pressure",
    "resources.money_pressure.coping",
    "resource",
    "Available money-related coping",
    "Доступное совладание с денежными трудностями",
    "Notice which of the three coping responses is available and which is harder to access. These answers do not measure income, assets or financial competence.",
    "Отметьте, какие из трёх способов совладания доступны, а какие менее доступны. Ответы не измеряют доход, активы или финансовую компетентность."
  ],
  [
    "hh-overthinking-loop",
    "state.overthinking_loop.difficulty",
    "anxiety",
    "Repetitive-thinking difficulty",
    "Трудности из-за повторяющихся размышлений",
    "Notice when repetitive thinking gets in the way and whether new information is still emerging.",
    "Отметьте, когда повторяющиеся размышления мешают и появляется ли ещё новая информация."
  ],
  [
    "hh-overthinking-loop",
    "resources.overthinking_loop.interruptibility",
    "anxiety",
    "Reported interruptibility of the loop",
    "Сообщаемая возможность прервать петлю",
    "This is one response about whether an action or pause can sometimes interrupt the loop, not a validated coping scale. Note an example without assuming it cancels the difficulty score.",
    "Это один ответ о том, помогает ли действие или пауза иногда прервать петлю, а не валидированная шкала совладания. Отметьте пример, не считая, что он отменяет показатель трудности."
  ],
  [
    "hh-screen-saturation",
    "state.screen_saturation.difficulty",
    "focus",
    "Screen-related difficulty",
    "Трудности, связанные с экранами",
    "Notice which screen situations feel demanding and how they affect attention or winding down.",
    "Отметьте, какие ситуации с экранами утомляют и как влияют на внимание или успокоение."
  ],
  [
    "hh-screen-saturation",
    "context.screen_saturation.offline_relief",
    "focus",
    "Perceived relief after time offline",
    "Ощущаемое облегчение после времени без экрана",
    "This single response describes noticed relief after time offline. More relief is not automatically better or worse: it may coexist with more overload. A low response may reflect little need for relief or little opportunity to notice it. Consider the context; do not reverse-code or subtract it from difficulty.",
    "Этот отдельный ответ описывает замеченное облегчение после времени без экрана. Больше облегчения не означает автоматически лучше или хуже: оно может сочетаться с большей перегрузкой. Низкий ответ может отражать небольшую потребность в облегчении или недостаток возможности его заметить. Учитывайте контекст; не разворачивайте ответ и не вычитайте его из трудности."
  ]
])

export const HH_SPLIT_V2_AXES = deepFreeze({
  "state.money_pressure.difficulty": "stress",
  "resources.money_pressure.coping": "resource",
  "state.overthinking_loop.difficulty": "anxiety",
  "resources.overthinking_loop.interruptibility": "anxiety",
  "state.screen_saturation.difficulty": "focus",
  "context.screen_saturation.offline_relief": "focus"
})

export const HH_SPLIT_V2_KEYS = Object.freeze(["hh-money-pressure","hh-overthinking-loop","hh-screen-saturation"])

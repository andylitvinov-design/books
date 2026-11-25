import { deepFreeze } from '../../lib/assessments/contracts.js'

// Author-permitted English originals; source sheets pp. 1–3 reviewed 2026-10-12.
// Immutable definitions: changes to items or scoring require a new version.
export const COMPASSION_DEFINITIONS = deepFreeze([
  {
    "id": "c2506513-5f3c-599f-a790-506411bc2c05",
    "key": "scs-sf",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "Self-Compassion Scale Short Form (SCS-SF)",
    "source": {
      "title": "Self-Compassion Scale Short Form (SCS-SF)",
      "url": "https://self-compassion.org/wp-content/uploads/2021/03/SCS-SF-information.pdf",
      "scoringUrl": "https://self-compassion.org/wp-content/uploads/2021/03/SCS-SF-information.pdf#page=3",
      "permissionUrl": "https://self-compassion.org/wp-content/uploads/2021/03/SCS-SF-information.pdf#page=1",
      "permission": "Author grant for use for any purpose, including research, clinical work and teaching (sheet page 1).",
      "citation": "Raes, F., Pommier, E., Neff, K. D., & Van Gucht, D. (2011). Construction and factorial validation of a short form of the Self-Compassion Scale. Clinical Psychology & Psychotherapy, 18, 250–255.",
      "reviewedAt": "2026-10-12",
      "nonDiagnostic": true,
      "notes": "Original English 12-item short form, sheet page 2. Total only; author warns that short-form subscales are unreliable. No clinical norms; the ad hoc rubric is not used.",
      "missingResponsePolicy": "All items required; incomplete forms have no score. This is a conservative product rule, not author-specified imputation.",
      "languageNote": "Original English questionnaire only. Russian interface and report explanations are not a validated Russian questionnaire adaptation."
    },
    "instructions": "HOW I TYPICALLY ACT TOWARDS MYSELF IN DIFFICULT TIMES. Please read each statement carefully before answering. Indicate how often you behave in the stated manner, using the following scale:",
    "answerScale": {
      "min": 1,
      "max": 5
    },
    "responseAnchors": [
      "Almost never",
      "2",
      "3",
      "4",
      "Almost always"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "resources.scs_sf.total",
          "method": "mean",
          "items": [
            "scs_sf.01",
            "scs_sf.02",
            "scs_sf.03",
            "scs_sf.04",
            "scs_sf.05",
            "scs_sf.06",
            "scs_sf.07",
            "scs_sf.08",
            "scs_sf.09",
            "scs_sf.10",
            "scs_sf.11",
            "scs_sf.12"
          ],
          "reverseItems": [
            "scs_sf.01",
            "scs_sf.04",
            "scs_sf.08",
            "scs_sf.09",
            "scs_sf.11",
            "scs_sf.12"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "resources",
          "sourceConstruct": "Self-compassion — total mean",
          "direction": "higher-reported-resource"
        }
      ]
    },
    "questions": [
      {
        "id": "scs_sf.01",
        "text": "When I fail at something important to me I become consumed by feelings of inadequacy.",
        "required": true
      },
      {
        "id": "scs_sf.02",
        "text": "I try to be understanding and patient towards those aspects of my personality I don’t like.",
        "required": true
      },
      {
        "id": "scs_sf.03",
        "text": "When something painful happens I try to take a balanced view of the situation.",
        "required": true
      },
      {
        "id": "scs_sf.04",
        "text": "When I’m feeling down, I tend to feel like most other people are probably happier than I am.",
        "required": true
      },
      {
        "id": "scs_sf.05",
        "text": "I try to see my failings as part of the human condition.",
        "required": true
      },
      {
        "id": "scs_sf.06",
        "text": "When I’m going through a very hard time, I give myself the caring and tenderness I need.",
        "required": true
      },
      {
        "id": "scs_sf.07",
        "text": "When something upsets me I try to keep my emotions in balance.",
        "required": true
      },
      {
        "id": "scs_sf.08",
        "text": "When I fail at something that’s important to me, I tend to feel alone in my failure",
        "required": true
      },
      {
        "id": "scs_sf.09",
        "text": "When I’m feeling down I tend to obsess and fixate on everything that’s wrong.",
        "required": true
      },
      {
        "id": "scs_sf.10",
        "text": "When I feel inadequate in some way, I try to remind myself that feelings of inadequacy are shared by most people.",
        "required": true
      },
      {
        "id": "scs_sf.11",
        "text": "I’m disapproving and judgmental about my own flaws and inadequacies.",
        "required": true
      },
      {
        "id": "scs_sf.12",
        "text": "I’m intolerant and impatient towards those aspects of my personality I don’t like.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:3275b6aaaa19c8f52a2f892ac94384626984d50f561f404fda9cbee3d912503f"
  },
  {
    "id": "a5cb84ed-75bd-59e0-adba-64bfa1626cca",
    "key": "compassion-scale",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "Compassion Scale (CS)",
    "source": {
      "title": "Compassion Scale (CS)",
      "url": "https://self-compassion.org/wp-content/uploads/2021/03/CS-information.pdf",
      "scoringUrl": "https://self-compassion.org/wp-content/uploads/2021/03/CS-information.pdf#page=3",
      "permissionUrl": "https://self-compassion.org/wp-content/uploads/2021/03/CS-information.pdf#page=1",
      "permission": "Author grant for use for any purpose, including research, clinical work and teaching (sheet page 1).",
      "citation": "Pommier, E., Neff, K. D., & Tóth-Király, I. (2019). The development and validation of the Compassion Scale. Assessment, 21–39.",
      "reviewedAt": "2026-10-12",
      "nonDiagnostic": true,
      "notes": "Original English 16-item form, sheet page 2. All four subscales and total are means; indifference is reversed both in its subscale and in the total. No clinical norms or cutoffs.",
      "missingResponsePolicy": "All items required; incomplete forms have no score. This is a conservative product rule, not author-specified imputation.",
      "languageNote": "Original English questionnaire only. Russian interface and report explanations are not a validated Russian questionnaire adaptation."
    },
    "instructions": "Please read each statement carefully before answering. Please answer according to what really reflects your experience rather than what you think your experience should be. Indicate how often you behave in the stated manner, using the following scale:",
    "answerScale": {
      "min": 1,
      "max": 5
    },
    "responseAnchors": [
      "Almost never",
      "2",
      "3",
      "4",
      "Almost always"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "resources.cs.total",
          "method": "mean",
          "items": [
            "cs.01",
            "cs.02",
            "cs.03",
            "cs.04",
            "cs.05",
            "cs.06",
            "cs.07",
            "cs.08",
            "cs.09",
            "cs.10",
            "cs.11",
            "cs.12",
            "cs.13",
            "cs.14",
            "cs.15",
            "cs.16"
          ],
          "reverseItems": [
            "cs.03",
            "cs.07",
            "cs.11",
            "cs.15"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "resources",
          "sourceConstruct": "Compassion toward others — total mean",
          "direction": "higher-reported-resource"
        },
        {
          "key": "resources.cs.kindness",
          "method": "mean",
          "items": [
            "cs.02",
            "cs.06",
            "cs.10",
            "cs.14"
          ],
          "reverseItems": [],
          "min": 1,
          "max": 5,
          "dimensionClass": "resources",
          "sourceConstruct": "Kindness toward others",
          "direction": "higher-reported-resource"
        },
        {
          "key": "resources.cs.common_humanity",
          "method": "mean",
          "items": [
            "cs.04",
            "cs.08",
            "cs.12",
            "cs.16"
          ],
          "reverseItems": [],
          "min": 1,
          "max": 5,
          "dimensionClass": "resources",
          "sourceConstruct": "Common humanity",
          "direction": "higher-reported-resource"
        },
        {
          "key": "resources.cs.mindfulness",
          "method": "mean",
          "items": [
            "cs.01",
            "cs.05",
            "cs.09",
            "cs.13"
          ],
          "reverseItems": [],
          "min": 1,
          "max": 5,
          "dimensionClass": "resources",
          "sourceConstruct": "Mindful attention to others",
          "direction": "higher-reported-resource"
        },
        {
          "key": "resources.cs.indifference_reversed",
          "method": "mean",
          "items": [
            "cs.03",
            "cs.07",
            "cs.11",
            "cs.15"
          ],
          "reverseItems": [
            "cs.03",
            "cs.07",
            "cs.11",
            "cs.15"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "resources",
          "sourceConstruct": "Indifference (reverse-scored: higher means less indifference)",
          "direction": "higher-reported-resource"
        }
      ]
    },
    "questions": [
      {
        "id": "cs.01",
        "text": "I pay careful attention when other people talk to me about their troubles.",
        "required": true
      },
      {
        "id": "cs.02",
        "text": "If I see someone going through a difficult time, I try to be caring toward that person.",
        "required": true
      },
      {
        "id": "cs.03",
        "text": "I am unconcerned with other people’s problems.",
        "required": true
      },
      {
        "id": "cs.04",
        "text": "I realize everyone feels down sometimes, it is part of being human.",
        "required": true
      },
      {
        "id": "cs.05",
        "text": "I notice when people are upset, even if they don’t say anything.",
        "required": true
      },
      {
        "id": "cs.06",
        "text": "I like to be there for others in times of difficulty.",
        "required": true
      },
      {
        "id": "cs.07",
        "text": "I think little about the concerns of others.",
        "required": true
      },
      {
        "id": "cs.08",
        "text": "I feel it’s important to recognize that all people have weaknesses and no one’s perfect.",
        "required": true
      },
      {
        "id": "cs.09",
        "text": "I listen patiently when people tell me their problems.",
        "required": true
      },
      {
        "id": "cs.10",
        "text": "My heart goes out to people who are unhappy.",
        "required": true
      },
      {
        "id": "cs.11",
        "text": "I try to avoid people who are experiencing a lot of pain.",
        "required": true
      },
      {
        "id": "cs.12",
        "text": "I feel that suffering is just a part of the common human experience.",
        "required": true
      },
      {
        "id": "cs.13",
        "text": "When people tell me about their problems, I try to keep a balanced perspective on the situation.",
        "required": true
      },
      {
        "id": "cs.14",
        "text": "When others feel sadness, I try to comfort them.",
        "required": true
      },
      {
        "id": "cs.15",
        "text": "I can’t really connect with other people when they’re suffering.",
        "required": true
      },
      {
        "id": "cs.16",
        "text": "Despite my differences with others, I know that everyone feels pain just like me.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:0b77d1eb4e39a6a91eb461447dbec57c4b879ecff2c20e80eec36dd2e04578bb"
  }
])

export const COMPASSION_CATALOG = deepFreeze([
  {
    "key": "scs-sf",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "resources",
    "resultAxes": [
      "resources"
    ],
    "topics": [
      "self-support",
      "recovery"
    ],
    "categoryAffinities": [
      "emotions",
      "other"
    ],
    "moodAffinities": [
      "happy",
      "neutral",
      "sad"
    ],
    "questionCount": 12,
    "durationMinutes": 3,
    "testStyle": "professional",
    "testLength": "comprehensive",
    "suggestedRepeatDays": null,
    "cooldownDays": null,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": true,
    "starterEligible": false,
    "free": true,
    "analysisAxes": [
      {
        "key": "self_support",
        "weight": 1
      }
    ],
    "title": {
      "en": "Self-Compassion Scale Short Form (SCS-SF)",
      "ru": "Самосострадание (SCS-SF) · EN"
    },
    "description": {
      "en": "12 original English items on self-compassion in difficult times. Total mean only; short-form subscales are unreliable. Research measure, not a diagnostic screener.",
      "ru": "12 оригинальных английских пунктов о самосострадании в трудные моменты. Только общее среднее: подшкалы краткой формы ненадёжны. Исследовательская методика, не диагностический скрининг."
    }
  },
  {
    "key": "compassion-scale",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "resources",
    "resultAxes": [
      "resources"
    ],
    "topics": [
      "relationships",
      "support"
    ],
    "categoryAffinities": [
      "relationships"
    ],
    "moodAffinities": [
      "happy",
      "neutral",
      "sad"
    ],
    "questionCount": 16,
    "durationMinutes": 4,
    "testStyle": "professional",
    "testLength": "comprehensive",
    "suggestedRepeatDays": null,
    "cooldownDays": null,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": true,
    "starterEligible": false,
    "free": true,
    "analysisAxes": [
      {
        "key": "relationships",
        "weight": 1
      }
    ],
    "title": {
      "en": "Compassion Scale (CS)",
      "ru": "Сострадание к другим (CS) · EN"
    },
    "description": {
      "en": "16 original English items on compassion toward others, with a total and four subscale means. Research measure; no clinical norms or diagnostic cutoffs.",
      "ru": "16 оригинальных английских пунктов о сострадании к другим: общее среднее и четыре подшкалы. Исследовательская методика без клинических норм и диагностических порогов."
    }
  }
])

export const COMPASSION_INTERPRETATION_ROWS = deepFreeze([
  [
    "scs-sf",
    "selfcompassion",
    "Recall a difficult moment and describe a patient response to yourself without denying the difficulty.",
    "Вспомните трудный момент и опишите терпеливое отношение к себе, не отрицая саму трудность."
  ],
  [
    "compassion-scale",
    "relationship",
    "Consider how caring for others fits with your capacity and boundaries; this score is not a judgement of moral worth.",
    "Подумайте, как забота о других сочетается с вашими силами и границами; балл не оценивает нравственную ценность человека."
  ]
])

export const COMPASSION_DIMENSION_ROWS = deepFreeze([
  [
    "scs-sf",
    "resources.scs_sf.total",
    "selfcompassion",
    "Self-compassion — total mean",
    "Самосострадание — общее среднее",
    "Recall a difficult moment and describe a patient response to yourself without denying the difficulty.",
    "Вспомните трудный момент и опишите терпеливое отношение к себе, не отрицая саму трудность."
  ],
  [
    "compassion-scale",
    "resources.cs.total",
    "relationship",
    "Compassion toward others — total mean",
    "Сострадание к другим — общее среднее",
    "Consider how caring for others fits with your capacity and boundaries; this score is not a judgement of moral worth.",
    "Подумайте, как забота о других сочетается с вашими силами и границами; балл не оценивает нравственную ценность человека."
  ],
  [
    "compassion-scale",
    "resources.cs.kindness",
    "relationship",
    "Kindness toward others",
    "Доброта к другим",
    "Notice an opportunity to offer care that the other person actually welcomes and that you can manage.",
    "Заметьте возможность проявить посильную заботу, которую другой человек действительно готов принять."
  ],
  [
    "compassion-scale",
    "resources.cs.common_humanity",
    "relationship",
    "Common humanity",
    "Общность человеческого опыта",
    "Reflect on a shared experience of difficulty while respecting the differences between your situation and another person’s.",
    "Подумайте об общем опыте трудностей, сохраняя внимание к различиям между вашей ситуацией и опытом другого человека."
  ],
  [
    "compassion-scale",
    "resources.cs.mindfulness",
    "relationship",
    "Mindful attention to others",
    "Внимательное отношение к другим",
    "In a conversation, notice the other person’s feelings and your own limits before offering a solution.",
    "В разговоре обратите внимание на чувства другого и собственные границы, прежде чем предлагать решение."
  ],
  [
    "compassion-scale",
    "resources.cs.indifference_reversed",
    "relationship",
    "Indifference (reverse-scored: higher means less indifference)",
    "Безразличие (обратный балл: выше — меньше безразличия)",
    "Consider when you can stay connected to someone’s difficulty and when you need rest or a boundary. A higher reversed mean indicates less indifference.",
    "Отметьте, когда удаётся сохранять контакт с чужими трудностями, а когда нужен отдых или граница. Более высокое обратное среднее означает меньше безразличия."
  ]
])

export const COMPASSION_MEANINGS = deepFreeze({
  "resources.scs_sf.total": {
    "en": "The total is the mean of all 12 responses after reversing items 1, 4, 8, 9, 11 and 12 (6 minus the response). This equals the average of the six two-item subscale means. Higher values describe more self-compassion in difficult times. Only the total is reported: the author cautions that short-form subscale scores are unreliable.",
    "ru": "Общий балл — среднее 12 ответов после обратного кодирования пунктов 1, 4, 8, 9, 11 и 12 (6 минус ответ). Это равно среднему шести двухпунктовых подшкал. Чем выше значение, тем больше сообщаемое самосострадание в трудные моменты. Публикуется только общий балл: автор предупреждает о ненадёжности подшкал краткой формы."
  },
  "resources.cs.total": {
    "en": "The total is the mean of 16 responses after reversing indifference items 3, 7, 11 and 15 (6 minus the response). Higher values describe more compassion toward other people, not self-compassion.",
    "ru": "Общий балл — среднее 16 ответов после обратного кодирования пунктов безразличия 3, 7, 11 и 15 (6 минус ответ). Чем выше значение, тем больше сообщаемое сострадание к другим людям, а не к себе."
  },
  "resources.cs.kindness": {
    "en": "The mean of items 2, 6, 10 and 14 describes caring responses to other people’s difficulties. Higher values indicate more reported kindness toward others.",
    "ru": "Среднее пунктов 2, 6, 10 и 14 описывает заботливое отношение к трудностям других. Более высокое значение означает больше сообщаемой доброты к другим людям."
  },
  "resources.cs.common_humanity": {
    "en": "The mean of items 4, 8, 12 and 16 describes recognition that difficulty is part of shared human experience. Higher values indicate more reported common humanity.",
    "ru": "Среднее пунктов 4, 8, 12 и 16 описывает признание трудностей частью общего человеческого опыта. Более высокое значение означает более выраженное ощущение этой общности."
  },
  "resources.cs.mindfulness": {
    "en": "The mean of items 1, 5, 9 and 13 describes attentive, balanced awareness of other people’s distress. Higher values indicate more reported mindful attention toward others.",
    "ru": "Среднее пунктов 1, 5, 9 и 13 описывает внимательное, уравновешенное восприятие переживаний других. Более высокое значение означает больше сообщаемого внимательного отношения к другим."
  },
  "resources.cs.indifference_reversed": {
    "en": "This is the REVERSED mean of items 3, 7, 11 and 15: each answer becomes 6 minus the response before averaging. Higher values mean LESS indifference and MORE compassion. This is not the raw indifference score.",
    "ru": "Это ОБРАТНОЕ среднее пунктов 3, 7, 11 и 15: перед усреднением каждый ответ заменяется на 6 минус ответ. Более высокое значение означает МЕНЬШЕ безразличия и БОЛЬШЕ сострадания. Это не прямой балл безразличия."
  }
})

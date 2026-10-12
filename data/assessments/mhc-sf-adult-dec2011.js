import { deepFreeze } from '../../lib/assessments/contracts.js'

// Immutable adult English form printed in the December 2011 author sheet.
export const MHC_SF_DEFINITIONS = deepFreeze([
  {
    "id": "fe2feb75-6428-52a1-a9a6-ea45f0e43242",
    "key": "mhc-sf",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-adult-dec2011-v1",
    "timeframe": "past-month",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "Mental Health Continuum Short Form (MHC-SF) — Adult",
    "source": {
      "title": "Corey L. M. Keyes — Adult MHC-SF, December 2011",
      "url": "https://peplab.web.unc.edu/wp-content/uploads/sites/18901/2018/11/MHC-SFoverview.pdf",
      "scoringUrl": "https://peplab.web.unc.edu/wp-content/uploads/sites/18901/2018/11/MHC-SFoverview.pdf#page=6",
      "permissionUrl": "https://peplab.web.unc.edu/wp-content/uploads/sites/18901/2018/11/MHC-SFoverview.pdf#page=1",
      "permission": "Copyrighted measure; author grants use without individual permission when proper credit is given (page 1). Original English only; no questionnaire translation is supplied.",
      "citation": "Keyes, C. L. M. (2009). Brief description of the mental health continuum short form (MHC-SF). Atlanta. December 2011 document, adult form page 4; retrieved 2026-10-12.",
      "formVersion": "Adult form printed in December 2011 overview, revised item 6",
      "minimumAge": 18,
      "population": "Adults aged 18 or older",
      "reviewedAt": "2026-10-12",
      "nonDiagnostic": true,
      "notes": "Continuous sums only. The printed adult item 6 is revised; the earlier 2009 wording is not substituted. Author categorical rules and optional 10-point categories are not used. Individual item facets are not reported as separate tests or subscales.",
      "missingResponsePolicy": "All 14 integer responses required; zero is valid, missing is not zero. No imputation or prorating. This is a conservative product rule.",
      "languageNote": "Original English questionnaire. Russian interface and explanations are not a validated Russian adaptation.",
      "validationSources": [
        "https://research.utwente.nl/en/publications/evaluating-the-psychometric-properties-of-the-mental-health-conti/",
        "https://www.canada.ca/en/public-health/services/reports-publications/health-promotion-chronic-disease-prevention-canada-research-policy-practice/vol-37-no-4-2017/measuring-positive-mental-health-canada-construct-validation-mental-health-continuum-short-form.html"
      ],
      "validationLimitations": "Evidence for the MHC-SF family is population/form specific; this site has not validated the printed December 2011 English form or a Russian adaptation. PHAC 2017 cautions about the social wellbeing subscale in Canadian population surveys. Wellbeing and mental illness are related but distinct; high scores do not rule out illness."
    },
    "instructions": "Adult MHC-SF (ages 18 or older). Please answer the following questions are about how you have been feeling during the past month. Place a check mark in the box that best represents how often you have experienced or felt the following: During the past month, how often did you feel …",
    "answerScale": {
      "min": 0,
      "max": 5
    },
    "responseAnchors": [
      "Never",
      "Once or twice",
      "About once a week",
      "About 2 or 3 times a week",
      "Almost every day",
      "Every day"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "resources.mhc_sf.total",
          "method": "sum",
          "items": [
            "mhc_sf.01",
            "mhc_sf.02",
            "mhc_sf.03",
            "mhc_sf.04",
            "mhc_sf.05",
            "mhc_sf.06",
            "mhc_sf.07",
            "mhc_sf.08",
            "mhc_sf.09",
            "mhc_sf.10",
            "mhc_sf.11",
            "mhc_sf.12",
            "mhc_sf.13",
            "mhc_sf.14"
          ],
          "reverseItems": [],
          "min": 0,
          "max": 70,
          "dimensionClass": "resources",
          "sourceConstruct": "Positive mental wellbeing — total sum",
          "direction": "higher-reported-resource"
        },
        {
          "key": "resources.mhc_sf.emotional",
          "method": "sum",
          "items": [
            "mhc_sf.01",
            "mhc_sf.02",
            "mhc_sf.03"
          ],
          "reverseItems": [],
          "min": 0,
          "max": 15,
          "dimensionClass": "resources",
          "sourceConstruct": "Emotional wellbeing",
          "direction": "higher-reported-resource"
        },
        {
          "key": "resources.mhc_sf.social",
          "method": "sum",
          "items": [
            "mhc_sf.04",
            "mhc_sf.05",
            "mhc_sf.06",
            "mhc_sf.07",
            "mhc_sf.08"
          ],
          "reverseItems": [],
          "min": 0,
          "max": 25,
          "dimensionClass": "resources",
          "sourceConstruct": "Social wellbeing",
          "direction": "higher-reported-resource"
        },
        {
          "key": "resources.mhc_sf.psychological",
          "method": "sum",
          "items": [
            "mhc_sf.09",
            "mhc_sf.10",
            "mhc_sf.11",
            "mhc_sf.12",
            "mhc_sf.13",
            "mhc_sf.14"
          ],
          "reverseItems": [],
          "min": 0,
          "max": 30,
          "dimensionClass": "resources",
          "sourceConstruct": "Psychological wellbeing",
          "direction": "higher-reported-resource"
        }
      ]
    },
    "questions": [
      {
        "id": "mhc_sf.01",
        "text": "happy",
        "required": true
      },
      {
        "id": "mhc_sf.02",
        "text": "interested in life",
        "required": true
      },
      {
        "id": "mhc_sf.03",
        "text": "satisfied with life",
        "required": true
      },
      {
        "id": "mhc_sf.04",
        "text": "that you had something important to contribute to society",
        "required": true
      },
      {
        "id": "mhc_sf.05",
        "text": "that you belonged to a community (like a social group, or your neighborhood)",
        "required": true
      },
      {
        "id": "mhc_sf.06",
        "text": "that our society is a good place, or is becoming a better place, for all people",
        "required": true
      },
      {
        "id": "mhc_sf.07",
        "text": "that people are basically good",
        "required": true
      },
      {
        "id": "mhc_sf.08",
        "text": "that the way our society works makes sense to you",
        "required": true
      },
      {
        "id": "mhc_sf.09",
        "text": "that you liked most parts of your personality",
        "required": true
      },
      {
        "id": "mhc_sf.10",
        "text": "good at managing the responsibilities of your daily life",
        "required": true
      },
      {
        "id": "mhc_sf.11",
        "text": "that you had warm and trusting relationships with others",
        "required": true
      },
      {
        "id": "mhc_sf.12",
        "text": "that you had experiences that challenged you to grow and become a better person",
        "required": true
      },
      {
        "id": "mhc_sf.13",
        "text": "confident to think or express your own ideas and opinions",
        "required": true
      },
      {
        "id": "mhc_sf.14",
        "text": "that your life has a sense of direction or meaning to it",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:c70b5b61ad92d2daad15dbaf4e145d27262abe94cc9f2a64eda275c257b6a853"
  }
])

export const MHC_SF_CATALOG = deepFreeze([
  {
    "key": "mhc-sf",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "resources",
    "resultAxes": [
      "resources"
    ],
    "topics": [
      "mood",
      "relationships",
      "resources",
      "functioning"
    ],
    "categoryAffinities": [
      "emotions",
      "relationships",
      "other"
    ],
    "moodAffinities": [
      "happy",
      "neutral",
      "sad"
    ],
    "questionCount": 14,
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
        "key": "mood",
        "weight": 1
      },
      {
        "key": "relationships",
        "weight": 1
      },
      {
        "key": "resource",
        "weight": 1
      }
    ],
    "title": {
      "en": "Mental Health Continuum Short Form (MHC-SF) — Adult",
      "ru": "Психическое благополучие (MHC-SF, 18+) · EN"
    },
    "description": {
      "en": "Corey L. M. Keyes’ 14-item adult MHC-SF, December 2011 English form with revised item 6. Past-month emotional, social and psychological wellbeing; continuous sums only, without diagnoses or norms.",
      "ru": "Взрослая MHC-SF Кори Л. М. Киза: 14 английских пунктов, форма декабря 2011 с исправленным пунктом 6. Эмоциональное, социальное и психологическое благополучие за месяц; суммы без диагнозов и норм."
    }
  }
])

export const MHC_SF_INTERPRETATION_ROWS = deepFreeze([
  [
    "mhc-sf",
    "support",
    "Reflect separately on positive feelings, participation in society and personal functioning during the past month. A wellbeing score cannot rule out mental illness.",
    "Рассмотрите отдельно положительные чувства, участие в жизни общества и личное функционирование за последний месяц. Балл благополучия не исключает психическое расстройство."
  ]
])

export const MHC_SF_DIMENSION_ROWS = deepFreeze([
  [
    "mhc-sf",
    "resources.mhc_sf.total",
    "support",
    "Positive mental wellbeing — total sum",
    "Психическое благополучие — общая сумма",
    "Reflect separately on positive feelings, participation in society and personal functioning during the past month. A wellbeing score cannot rule out mental illness.",
    "Рассмотрите отдельно положительные чувства, участие в жизни общества и личное функционирование за последний месяц. Балл благополучия не исключает психическое расстройство."
  ],
  [
    "mhc-sf",
    "resources.mhc_sf.emotional",
    "mood",
    "Emotional wellbeing",
    "Эмоциональное благополучие",
    "Recall moments of enjoyment, interest and satisfaction during the past month without treating them as an obligation to feel positive.",
    "Вспомните моменты радости, интереса и удовлетворённости за последний месяц, не превращая положительные чувства в обязанность."
  ],
  [
    "mhc-sf",
    "resources.mhc_sf.social",
    "relationship",
    "Social wellbeing",
    "Социальное благополучие",
    "Consider how your social context affects belonging and contribution; this subscale is not a judgement of your worth or community.",
    "Подумайте, как социальный контекст влияет на принадлежность и вклад; эта подшкала не оценивает вашу ценность или ваше сообщество."
  ],
  [
    "mhc-sf",
    "resources.mhc_sf.psychological",
    "support",
    "Psychological wellbeing",
    "Психологическое благополучие",
    "Notice one manageable activity that supports purpose, autonomy or a trusting relationship in your present circumstances.",
    "Заметьте одно посильное действие, поддерживающее смысл, самостоятельность или доверительные отношения в ваших обстоятельствах."
  ]
])

export const MHC_SF_MEANINGS = deepFreeze({
  "resources.mhc_sf.total": {
    "en": "Sum of all 14 items (0–70). Higher scores describe more frequently reported positive feelings and functioning during the past month. No items are reversed. MHC-SF © Corey L. M. Keyes; adult December 2011 English original, revised item 6. No clinical norms, cutoffs or categorical diagnoses are assigned. This score cannot rule out mental illness. Russian explanations are not a validated Russian questionnaire adaptation.",
    "ru": "Сумма всех 14 пунктов (0–70). Чем выше балл, тем чаще отмечались положительные чувства и функционирование за последний месяц. Обратных пунктов нет. MHC-SF © Corey L. M. Keyes; английский оригинал для взрослых, декабрь 2011, исправленный пункт 6. Клинические нормы, пороги и категориальные диагнозы не присваиваются. Балл не исключает психическое расстройство. Русские пояснения не являются валидированной русской адаптацией опросника."
  },
  "resources.mhc_sf.emotional": {
    "en": "Sum of items 1–3 (0–15): happiness, interest in life and satisfaction with life during the past month. No items are reversed. MHC-SF © Corey L. M. Keyes; adult December 2011 English original, revised item 6. No clinical norms, cutoffs or categorical diagnoses are assigned. This score cannot rule out mental illness. Russian explanations are not a validated Russian questionnaire adaptation.",
    "ru": "Сумма пунктов 1–3 (0–15): радость, интерес к жизни и удовлетворённость жизнью за последний месяц. Обратных пунктов нет. MHC-SF © Corey L. M. Keyes; английский оригинал для взрослых, декабрь 2011, исправленный пункт 6. Клинические нормы, пороги и категориальные диагнозы не присваиваются. Балл не исключает психическое расстройство. Русские пояснения не являются валидированной русской адаптацией опросника."
  },
  "resources.mhc_sf.social": {
    "en": "Sum of items 4–8 (0–25): contribution, belonging and views of society. Higher scores describe more frequently reported social wellbeing. PHAC (2017) found limitations for this subscale in Canadian population surveys; interpret with attention to culture and social context. No items are reversed. MHC-SF © Corey L. M. Keyes; adult December 2011 English original, revised item 6. No clinical norms, cutoffs or categorical diagnoses are assigned. This score cannot rule out mental illness. Russian explanations are not a validated Russian questionnaire adaptation.",
    "ru": "Сумма пунктов 4–8 (0–25): вклад, принадлежность и восприятие общества. Чем выше балл, тем чаще отмечалось социальное благополучие. PHAC (2017) выявило ограничения этой подшкалы в канадских популяционных опросах; учитывайте культуру и социальный контекст. Обратных пунктов нет. MHC-SF © Corey L. M. Keyes; английский оригинал для взрослых, декабрь 2011, исправленный пункт 6. Клинические нормы, пороги и категориальные диагнозы не присваиваются. Балл не исключает психическое расстройство. Русские пояснения не являются валидированной русской адаптацией опросника."
  },
  "resources.mhc_sf.psychological": {
    "en": "Sum of items 9–14 (0–30): self-acceptance, managing daily responsibilities, positive relations, growth, autonomy and purpose. Higher scores describe more frequently reported psychological wellbeing. No items are reversed. MHC-SF © Corey L. M. Keyes; adult December 2011 English original, revised item 6. No clinical norms, cutoffs or categorical diagnoses are assigned. This score cannot rule out mental illness. Russian explanations are not a validated Russian questionnaire adaptation.",
    "ru": "Сумма пунктов 9–14 (0–30): самопринятие, повседневные обязанности, отношения, развитие, самостоятельность и смысл. Чем выше балл, тем чаще отмечалось психологическое благополучие. Обратных пунктов нет. MHC-SF © Corey L. M. Keyes; английский оригинал для взрослых, декабрь 2011, исправленный пункт 6. Клинические нормы, пороги и категориальные диагнозы не присваиваются. Балл не исключает психическое расстройство. Русские пояснения не являются валидированной русской адаптацией опросника."
  }
})


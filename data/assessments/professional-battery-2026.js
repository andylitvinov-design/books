import { deepFreeze } from '../../lib/assessments/contracts.js'

// Reviewed, source-backed official English items; do not silently translate or change scoring.
// CBI © NFA: explicitly permitted for commercial use when Borritz et al. (2006) is cited.
// PHQ-8: PHQ family made available without copyright restriction by Pfizer (2010).
export const PROFESSIONAL_BATTERY_2026_DEFINITIONS = deepFreeze([
  {
    "id": "d0e6183c-0dbd-50ba-a2a6-81fe3887a677",
    "key": "phq-8",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "official-en-v1",
    "timeframe": "past-2-weeks",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "PHQ-8 — Depressive Symptom Check",
    "source": {
      "title": "Patient Health Questionnaire-8 (PHQ-8)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/18752852/",
      "permission": "phq-family-no-copyright-restriction-pfizer-2010",
      "citation": "Kroenke K et al. The PHQ-8 as a measure of current depression in the general population. J Affect Disord. 2009;114:163–173.",
      "reviewedAt": "2026-10-08",
      "interpretation": "Self-reported symptoms; not a diagnosis. Interpretation requires context."
    },
    "answerScale": {
      "min": 0,
      "max": 3
    },
    "responseAnchors": [
      "Not at all",
      "Several days",
      "More than half the days",
      "Nearly every day"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "symptoms.phq_8.total",
          "method": "sum",
          "items": [
            "phq8.01",
            "phq8.02",
            "phq8.03",
            "phq8.04",
            "phq8.05",
            "phq8.06",
            "phq8.07",
            "phq8.08"
          ],
          "min": 0,
          "max": 24,
          "dimensionClass": "symptoms",
          "sourceConstruct": "Patient Health Questionnaire-8 (PHQ-8)",
          "direction": "lower-reported-difficulty"
        }
      ]
    },
    "questions": [
      {
        "id": "phq8.01",
        "text": "Little interest or pleasure in doing things",
        "required": true
      },
      {
        "id": "phq8.02",
        "text": "Feeling down, depressed, or hopeless",
        "required": true
      },
      {
        "id": "phq8.03",
        "text": "Trouble falling or staying asleep, or sleeping too much",
        "required": true
      },
      {
        "id": "phq8.04",
        "text": "Feeling tired or having little energy",
        "required": true
      },
      {
        "id": "phq8.05",
        "text": "Poor appetite or overeating",
        "required": true
      },
      {
        "id": "phq8.06",
        "text": "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
        "required": true
      },
      {
        "id": "phq8.07",
        "text": "Trouble concentrating on things, such as reading the newspaper or watching television",
        "required": true
      },
      {
        "id": "phq8.08",
        "text": "Moving or speaking so slowly that other people could have noticed, or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 14,
    "contentHash": "sha256:0abed0977cfc5fa7ef2a2ae2064a0147c4ccf66b9b8ae5ba7f5d590f8a553f8f"
  },
  {
    "id": "1dc07474-20bf-55ac-a3f4-5259a798e915",
    "key": "cbi-personal",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "official-en-v1",
    "timeframe": "general",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "Copenhagen Burnout Inventory — Personal Burnout",
    "source": {
      "title": "Copenhagen Burnout Inventory (CBI): Personal Burnout",
      "url": "https://nfa.dk/vaerktoejer/spoergeskemaer/spoergeskema-til-maaling-af-udbraendthed-cbi/copenhagen-burnout-inventory-cbi",
      "permission": "free-commercial-and-noncommercial-with-clear-attribution-nfa",
      "citation": "Borritz M et al. Burnout among employees in human service work: design and baseline findings of the PUMA study. Scand J Public Health. 2006;34:49–58.",
      "reviewedAt": "2026-10-08",
      "interpretation": "Self-reported symptoms; not a diagnosis. Interpretation requires context."
    },
    "answerScale": {
      "min": 0,
      "max": 4
    },
    "responseAnchors": [
      "Never/almost never",
      "Seldom",
      "Sometimes",
      "Often",
      "Always"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "symptoms.cbi_personal.total",
          "method": "mean",
          "items": [
            "cbip.01",
            "cbip.02",
            "cbip.03",
            "cbip.04",
            "cbip.05",
            "cbip.06"
          ],
          "min": 0,
          "max": 100,
          "dimensionClass": "symptoms",
          "sourceConstruct": "Copenhagen Burnout Inventory (CBI): Personal Burnout",
          "direction": "lower-reported-difficulty",
          "multiplier": 25
        }
      ]
    },
    "questions": [
      {
        "id": "cbip.01",
        "text": "How often do you feel tired?",
        "required": true
      },
      {
        "id": "cbip.02",
        "text": "How often are you physically exhausted?",
        "required": true
      },
      {
        "id": "cbip.03",
        "text": "How often are you emotionally exhausted?",
        "required": true
      },
      {
        "id": "cbip.04",
        "text": "How often do you think: “I can’t take it anymore”?",
        "required": true
      },
      {
        "id": "cbip.05",
        "text": "How often do you feel worn out?",
        "required": true
      },
      {
        "id": "cbip.06",
        "text": "How often do you feel weak and susceptible to illness?",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 30,
    "contentHash": "sha256:5df7220051a06a926e17cd9544522e91fb7f10ba945afaad18d68bc8e6abd427"
  },
  {
    "id": "8126f9c4-3930-5618-a7ad-4d07a14081ce",
    "key": "cbi-work",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "official-en-v1",
    "timeframe": "general",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "Copenhagen Burnout Inventory — Work Burnout",
    "source": {
      "title": "Copenhagen Burnout Inventory (CBI): Work-Related Burnout",
      "url": "https://nfa.dk/vaerktoejer/spoergeskemaer/spoergeskema-til-maaling-af-udbraendthed-cbi/copenhagen-burnout-inventory-cbi",
      "permission": "free-commercial-and-noncommercial-with-clear-attribution-nfa",
      "citation": "Borritz M et al. Burnout among employees in human service work: design and baseline findings of the PUMA study. Scand J Public Health. 2006;34:49–58.",
      "reviewedAt": "2026-10-08",
      "interpretation": "Self-reported symptoms; not a diagnosis. Interpretation requires context."
    },
    "answerScale": {
      "min": 0,
      "max": 4
    },
    "responseAnchors": [
      "Never/almost never",
      "Seldom",
      "Sometimes",
      "Often",
      "Always"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "symptoms.cbi_work.total",
          "method": "mean",
          "items": [
            "cbiw.01",
            "cbiw.02",
            "cbiw.03",
            "cbiw.04",
            "cbiw.05",
            "cbiw.06",
            "cbiw.07"
          ],
          "min": 0,
          "max": 100,
          "dimensionClass": "symptoms",
          "sourceConstruct": "Copenhagen Burnout Inventory (CBI): Work-Related Burnout",
          "direction": "lower-reported-difficulty",
          "multiplier": 25,
          "reverseItems": [
            "cbiw.07"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "cbiw.01",
        "text": "Is your work emotionally exhausting?",
        "required": true,
        "responseAnchors": [
          "To a very low degree",
          "To a low degree",
          "Somewhat",
          "To a high degree",
          "To a very high degree"
        ]
      },
      {
        "id": "cbiw.02",
        "text": "Do you feel burnt out because of your work?",
        "required": true,
        "responseAnchors": [
          "To a very low degree",
          "To a low degree",
          "Somewhat",
          "To a high degree",
          "To a very high degree"
        ]
      },
      {
        "id": "cbiw.03",
        "text": "Does your work frustrate you?",
        "required": true,
        "responseAnchors": [
          "To a very low degree",
          "To a low degree",
          "Somewhat",
          "To a high degree",
          "To a very high degree"
        ]
      },
      {
        "id": "cbiw.04",
        "text": "Do you feel worn out at the end of the working day?",
        "required": true
      },
      {
        "id": "cbiw.05",
        "text": "Are you exhausted in the morning at the thought of another day at work?",
        "required": true
      },
      {
        "id": "cbiw.06",
        "text": "Do you feel that every working hour is tiring for you?",
        "required": true
      },
      {
        "id": "cbiw.07",
        "text": "Do you have enough energy for family and friends during leisure time?",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 30,
    "contentHash": "sha256:a24afa8d64328d749f6402c59c29422f5149b0f757404e9f1dd8841cf89b897e"
  },
  {
    "id": "a5cf2148-cec2-5f6a-a91b-0e1427e7cb17",
    "key": "cbi-client",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "official-en-v1",
    "timeframe": "general",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "Copenhagen Burnout Inventory — Client Burnout",
    "source": {
      "title": "Copenhagen Burnout Inventory (CBI): Client-Related Burnout",
      "url": "https://nfa.dk/vaerktoejer/spoergeskemaer/spoergeskema-til-maaling-af-udbraendthed-cbi/copenhagen-burnout-inventory-cbi",
      "permission": "free-commercial-and-noncommercial-with-clear-attribution-nfa",
      "citation": "Borritz M et al. Burnout among employees in human service work: design and baseline findings of the PUMA study. Scand J Public Health. 2006;34:49–58.",
      "reviewedAt": "2026-10-08",
      "interpretation": "Self-reported symptoms; not a diagnosis. Interpretation requires context."
    },
    "answerScale": {
      "min": 0,
      "max": 4
    },
    "responseAnchors": [
      "Never/almost never",
      "Seldom",
      "Sometimes",
      "Often",
      "Always"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "symptoms.cbi_client.total",
          "method": "mean",
          "items": [
            "cbic.01",
            "cbic.02",
            "cbic.03",
            "cbic.04",
            "cbic.05",
            "cbic.06"
          ],
          "min": 0,
          "max": 100,
          "dimensionClass": "symptoms",
          "sourceConstruct": "Copenhagen Burnout Inventory (CBI): Client-Related Burnout",
          "direction": "lower-reported-difficulty",
          "multiplier": 25
        }
      ]
    },
    "questions": [
      {
        "id": "cbic.01",
        "text": "Do you find it hard to work with clients?",
        "required": true,
        "responseAnchors": [
          "To a very low degree",
          "To a low degree",
          "Somewhat",
          "To a high degree",
          "To a very high degree"
        ]
      },
      {
        "id": "cbic.02",
        "text": "Do you find it frustrating to work with clients?",
        "required": true,
        "responseAnchors": [
          "To a very low degree",
          "To a low degree",
          "Somewhat",
          "To a high degree",
          "To a very high degree"
        ]
      },
      {
        "id": "cbic.03",
        "text": "Does it drain your energy to work with clients?",
        "required": true,
        "responseAnchors": [
          "To a very low degree",
          "To a low degree",
          "Somewhat",
          "To a high degree",
          "To a very high degree"
        ]
      },
      {
        "id": "cbic.04",
        "text": "Do you feel that you give more than you get back when you work with clients?",
        "required": true,
        "responseAnchors": [
          "To a very low degree",
          "To a low degree",
          "Somewhat",
          "To a high degree",
          "To a very high degree"
        ]
      },
      {
        "id": "cbic.05",
        "text": "Are you tired of working with clients?",
        "required": true
      },
      {
        "id": "cbic.06",
        "text": "Do you sometimes wonder how long you will be able to continue working with clients?",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 30,
    "contentHash": "sha256:0365a10d247c864ade245ed1b2a34f0ac545156eb514d13b5bad66566ce6e616"
  }
])
export const PROFESSIONAL_BATTERY_2026_CATALOG = deepFreeze([
  {
    "key": "phq-8",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "symptoms",
    "resultAxes": [
      "symptoms"
    ],
    "topics": [
      "mood",
      "sleep",
      "energy",
      "attention"
    ],
    "categoryAffinities": [
      "emotions",
      "energy"
    ],
    "moodAffinities": [
      "sad",
      "neutral"
    ],
    "questionCount": 8,
    "durationMinutes": 3,
    "testStyle": "professional",
    "testLength": "comprehensive",
    "suggestedRepeatDays": 14,
    "cooldownDays": 14,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": false,
    "free": true,
    "analysisAxes": [
      {
        "key": "mood",
        "weight": 1
      },
      {
        "key": "sleep",
        "weight": 0.65
      },
      {
        "key": "energy",
        "weight": 0.65
      },
      {
        "key": "focus",
        "weight": 0.55
      },
      {
        "key": "functioning",
        "weight": 0.6
      }
    ],
    "title": {
      "en": "PHQ-8 — Depressive Symptom Check",
      "ru": "PHQ-8 — проверка симптомов настроения (EN)"
    },
    "description": {
      "en": "Validated eight-item PHQ-8 depressive symptom screening over two weeks; not a diagnosis. English original only. Kroenke et al. (2009).",
      "ru": "Профессиональная PHQ-8: восемь вопросов о депрессивных симптомах за две недели. Не диагноз; оригинал на английском. Kroenke и др. (2009)."
    }
  },
  {
    "key": "cbi-personal",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "symptoms",
    "resultAxes": [
      "symptoms"
    ],
    "topics": [
      "stress",
      "energy",
      "body",
      "recovery"
    ],
    "categoryAffinities": [
      "body",
      "energy",
      "emotions"
    ],
    "moodAffinities": [
      "sad",
      "neutral"
    ],
    "questionCount": 6,
    "durationMinutes": 2,
    "testStyle": "professional",
    "testLength": "medium",
    "suggestedRepeatDays": 30,
    "cooldownDays": 14,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": true,
    "free": true,
    "analysisAxes": [
      {
        "key": "stress",
        "weight": 0.95
      },
      {
        "key": "energy",
        "weight": 0.95
      },
      {
        "key": "resource",
        "weight": 0.5
      },
      {
        "key": "functioning",
        "weight": 0.45
      }
    ],
    "title": {
      "en": "Copenhagen Burnout Inventory — Personal Burnout",
      "ru": "CBI — личное истощение (EN)"
    },
    "description": {
      "en": "Validated six-item CBI personal burnout subscale; 0–100, higher = more exhaustion. Source: Borritz et al. (2006). Original English only.",
      "ru": "Шесть вопросов CBI о личном истощении, шкала 0–100. Чем выше балл, тем сильнее ощущаемое истощение. Borritz и др. (2006); вопросы EN."
    }
  },
  {
    "key": "cbi-work",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "symptoms",
    "resultAxes": [
      "symptoms"
    ],
    "topics": [
      "stress",
      "work",
      "energy",
      "recovery"
    ],
    "categoryAffinities": [
      "work-money",
      "energy"
    ],
    "moodAffinities": [
      "sad",
      "neutral"
    ],
    "questionCount": 7,
    "durationMinutes": 2,
    "testStyle": "professional",
    "testLength": "medium",
    "suggestedRepeatDays": 30,
    "cooldownDays": 14,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": true,
    "free": true,
    "analysisAxes": [
      {
        "key": "stress",
        "weight": 0.96
      },
      {
        "key": "functioning",
        "weight": 0.84
      },
      {
        "key": "energy",
        "weight": 0.82
      }
    ],
    "title": {
      "en": "Copenhagen Burnout Inventory — Work Burnout",
      "ru": "CBI — истощение в работе (EN)"
    },
    "description": {
      "en": "Validated seven-item CBI work-related burnout subscale; for people currently working. Includes reverse-scored energy question and two distinct response scales. Borritz et al. (2006).",
      "ru": "CBI: семь вопросов о рабочем истощении для работающих людей; обратное кодирование энергии. Borritz и др. (2006). Оригинал EN."
    }
  },
  {
    "key": "cbi-client",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "symptoms",
    "resultAxes": [
      "symptoms"
    ],
    "topics": [
      "stress",
      "work",
      "relationships",
      "energy"
    ],
    "categoryAffinities": [
      "work-money",
      "relationships",
      "energy"
    ],
    "moodAffinities": [
      "sad",
      "neutral"
    ],
    "questionCount": 6,
    "durationMinutes": 2,
    "testStyle": "professional",
    "testLength": "medium",
    "suggestedRepeatDays": 30,
    "cooldownDays": 14,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": true,
    "free": true,
    "analysisAxes": [
      {
        "key": "stress",
        "weight": 0.95
      },
      {
        "key": "functioning",
        "weight": 0.81
      },
      {
        "key": "energy",
        "weight": 0.7
      },
      {
        "key": "relationships",
        "weight": 0.35
      }
    ],
    "title": {
      "en": "Copenhagen Burnout Inventory — Client Burnout",
      "ru": "CBI — истощение при работе с клиентами (EN)"
    },
    "description": {
      "en": "Validated six-item CBI client-related burnout subscale for professionals working with patients, clients or service users. Borritz et al. (2006).",
      "ru": "Шесть вопросов CBI для специалистов, которые работают с клиентами, пациентами или получателями услуг. Borritz и др. (2006). Вопросы EN."
    }
  }
])

import { deepFreeze } from '../../lib/assessments/contracts.js'

// Six original EN professional measures with verified non-restrictive permissions.
// Keep item order, score boundaries and reverse-coded item lists unchanged.
// Research/meta entries requiring permission remain disabled in the registry.
export const PROFESSIONAL_BATTERY_2026_B_DEFINITIONS = deepFreeze([
  {
    "id": "cd9f2026-0005-5bc1-8e42-7a912a620005",
    "key": "rses-10",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "official-en-v1",
    "timeframe": "general",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "Rosenberg Self-Esteem Scale",
    "source": {
      "title": "Rosenberg Self-Esteem Scale (RSES)",
      "url": "https://socy.umd.edu/about-us/using-rosenberg-self-esteem-scale",
      "permission": "University of Maryland Sociology Department: public domain; free reuse and adaptations with attribution.",
      "citation": "Rosenberg M. Society and the Adolescent Self-Image. Princeton University Press; 1965.",
      "reviewedAt": "2026-10-10",
      "interpretation": "Self-report questionnaire for discussion; not a diagnosis or personalized medical guidance."
    },
    "answerScale": {
      "min": 0,
      "max": 3
    },
    "responseAnchors": [
      "Strongly disagree",
      "Disagree",
      "Agree",
      "Strongly agree"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "resources.rses_10.total",
          "method": "sum",
          "items": [
            "rses10.01",
            "rses10.02",
            "rses10.03",
            "rses10.04",
            "rses10.05",
            "rses10.06",
            "rses10.07",
            "rses10.08",
            "rses10.09",
            "rses10.10"
          ],
          "min": 0,
          "max": 30,
          "dimensionClass": "resources",
          "sourceConstruct": "Rosenberg Self-Esteem Scale (RSES)",
          "direction": "higher-reported-resource",
          "reverseItems": [
            "rses10.03",
            "rses10.05",
            "rses10.08",
            "rses10.09",
            "rses10.10"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "rses10.01",
        "text": "I feel that I'm a person of worth, at least on an equal plane with others.",
        "required": true
      },
      {
        "id": "rses10.02",
        "text": "I feel that I have a number of good qualities.",
        "required": true
      },
      {
        "id": "rses10.03",
        "text": "All in all, I am inclined to feel that I am a failure.",
        "required": true
      },
      {
        "id": "rses10.04",
        "text": "I am able to do things as well as most other people.",
        "required": true
      },
      {
        "id": "rses10.05",
        "text": "I feel I do not have much to be proud of.",
        "required": true
      },
      {
        "id": "rses10.06",
        "text": "I take a positive attitude toward myself.",
        "required": true
      },
      {
        "id": "rses10.07",
        "text": "On the whole, I am satisfied with myself.",
        "required": true
      },
      {
        "id": "rses10.08",
        "text": "I wish I could have more respect for myself.",
        "required": true
      },
      {
        "id": "rses10.09",
        "text": "I certainly feel useless at times.",
        "required": true
      },
      {
        "id": "rses10.10",
        "text": "At times I think I am no good at all.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 30,
    "contentHash": "sha256:12b7cf0a24a21f2b89eec5456fa46fc277ba800ffb3e14a0d51aa9d82212be7a"
  },
  {
    "id": "cd9f2026-0006-5bc1-8e42-7a912a620006",
    "key": "ces-d-20",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "official-en-v1",
    "timeframe": "past-7-days",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "CES-D 20 — Mood & Symptoms",
    "source": {
      "title": "Center for Epidemiologic Studies Depression Scale (CES-D, 20 items)",
      "url": "https://www.ncbi.nlm.nih.gov/books/NBK572958/table/ap2.t1/",
      "permission": "U.S. SAMHSA public-domain reproduction: freely copy/modify/distribute including commercially, with citation.",
      "citation": "Radloff LS. The CES-D scale: a self-report depression scale for research in the general population. Appl Psychol Meas. 1977;1(3):385–401.",
      "reviewedAt": "2026-10-10",
      "interpretation": "Self-report questionnaire for discussion; not a diagnosis or personalized medical guidance."
    },
    "answerScale": {
      "min": 0,
      "max": 3
    },
    "responseAnchors": [
      "Rarely or none of the time (less than one day)",
      "Some or a little of the time (1–2 days)",
      "Occasionally or a moderate amount of the time (3–4 days)",
      "Most or all of the time (5–7 days)"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "symptoms.ces_d_20.total",
          "method": "sum",
          "items": [
            "cesd20.01",
            "cesd20.02",
            "cesd20.03",
            "cesd20.04",
            "cesd20.05",
            "cesd20.06",
            "cesd20.07",
            "cesd20.08",
            "cesd20.09",
            "cesd20.10",
            "cesd20.11",
            "cesd20.12",
            "cesd20.13",
            "cesd20.14",
            "cesd20.15",
            "cesd20.16",
            "cesd20.17",
            "cesd20.18",
            "cesd20.19",
            "cesd20.20"
          ],
          "min": 0,
          "max": 60,
          "dimensionClass": "symptoms",
          "sourceConstruct": "Center for Epidemiologic Studies Depression Scale (CES-D, 20 items)",
          "direction": "lower-reported-difficulty",
          "reverseItems": [
            "cesd20.04",
            "cesd20.08",
            "cesd20.12",
            "cesd20.16"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "cesd20.01",
        "text": "I was bothered by things that usually don't bother me.",
        "required": true
      },
      {
        "id": "cesd20.02",
        "text": "I did not feel like eating; my appetite was poor.",
        "required": true
      },
      {
        "id": "cesd20.03",
        "text": "I felt that I could not shake off the blues even with help from my family or friends.",
        "required": true
      },
      {
        "id": "cesd20.04",
        "text": "I felt that I was just as good as other people.",
        "required": true
      },
      {
        "id": "cesd20.05",
        "text": "I had trouble keeping my mind on what I was doing.",
        "required": true
      },
      {
        "id": "cesd20.06",
        "text": "I felt depressed.",
        "required": true
      },
      {
        "id": "cesd20.07",
        "text": "I felt that everything I did was an effort.",
        "required": true
      },
      {
        "id": "cesd20.08",
        "text": "I felt hopeful about the future.",
        "required": true
      },
      {
        "id": "cesd20.09",
        "text": "I thought my life had been a failure.",
        "required": true
      },
      {
        "id": "cesd20.10",
        "text": "I felt fearful.",
        "required": true
      },
      {
        "id": "cesd20.11",
        "text": "My sleep was restless.",
        "required": true
      },
      {
        "id": "cesd20.12",
        "text": "I was happy.",
        "required": true
      },
      {
        "id": "cesd20.13",
        "text": "I talked less than usual.",
        "required": true
      },
      {
        "id": "cesd20.14",
        "text": "I felt lonely.",
        "required": true
      },
      {
        "id": "cesd20.15",
        "text": "People were unfriendly.",
        "required": true
      },
      {
        "id": "cesd20.16",
        "text": "I enjoyed life.",
        "required": true
      },
      {
        "id": "cesd20.17",
        "text": "I had crying spells.",
        "required": true
      },
      {
        "id": "cesd20.18",
        "text": "I felt sad.",
        "required": true
      },
      {
        "id": "cesd20.19",
        "text": "I felt that people disliked me.",
        "required": true
      },
      {
        "id": "cesd20.20",
        "text": "I could not get going.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 30,
    "contentHash": "sha256:b81ffa4771939ad5edcca7eb3a52f2b43b11d0aea9376403e862073f4143046d"
  }
])
export const PROFESSIONAL_BATTERY_2026_B_CATALOG = deepFreeze([
  {
    "key": "rses-10",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "resources",
    "resultAxes": [
      "resources"
    ],
    "topics": [
      "self-support",
      "resources",
      "personality",
      "mood"
    ],
    "categoryAffinities": [
      "emotions",
      "body",
      "other"
    ],
    "moodAffinities": [
      "sad",
      "neutral"
    ],
    "questionCount": 10,
    "durationMinutes": 3,
    "testStyle": "professional",
    "testLength": "medium",
    "suggestedRepeatDays": 30,
    "cooldownDays": 7,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": true,
    "free": true,
    "starterEligible": false,
    "analysisAxes": [
      {
        "key": "self_support",
        "weight": 1
      },
      {
        "key": "resource",
        "weight": 0.82
      },
      {
        "key": "personality",
        "weight": 0.61
      },
      {
        "key": "mood",
        "weight": 0.48
      }
    ],
    "title": {
      "en": "Rosenberg Self-Esteem Scale",
      "ru": "Шкала самооценки Розенберга (EN)"
    },
    "description": {
      "en": "Ten-item Rosenberg Self-Esteem Scale measuring global self-regard. Higher score reflects stronger reported self-esteem; no diagnostic cutoffs.",
      "ru": "Классическая шкала Розенберга: 10 высказываний о самооценке. Не диагностический тест; английский оригинал."
    }
  },
  {
    "key": "ces-d-20",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "symptoms",
    "resultAxes": [
      "symptoms"
    ],
    "topics": [
      "mood",
      "stress",
      "sleep",
      "energy",
      "relationships"
    ],
    "categoryAffinities": [
      "emotions",
      "body",
      "other"
    ],
    "moodAffinities": [
      "sad",
      "neutral"
    ],
    "questionCount": 20,
    "durationMinutes": 6,
    "testStyle": "professional",
    "testLength": "comprehensive",
    "suggestedRepeatDays": 30,
    "cooldownDays": 7,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": false,
    "free": true,
    "starterEligible": false,
    "analysisAxes": [
      {
        "key": "mood",
        "weight": 1
      },
      {
        "key": "stress",
        "weight": 0.78
      },
      {
        "key": "sleep",
        "weight": 0.52
      },
      {
        "key": "energy",
        "weight": 0.65
      },
      {
        "key": "relationships",
        "weight": 0.32
      }
    ],
    "title": {
      "en": "CES-D 20 — Mood & Symptoms",
      "ru": "CES-D 20 — настроение и симптомы (EN)"
    },
    "description": {
      "en": "Original twenty-item Center for Epidemiologic Studies Depression Scale for symptoms experienced in the past week; four positive items are reverse-scored. Not a diagnosis.",
      "ru": "Классическая 20-пунктовая CES-D за прошедшую неделю; четыре позитивных пункта с обратным подсчётом. Не диагноз; английский оригинал."
    }
  }
])

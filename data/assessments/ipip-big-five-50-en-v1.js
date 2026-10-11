import { deepFreeze } from '../../lib/assessments/contracts.js'

// Goldberg IPIP public domain: https://ipip.ori.org/newPermission.htm
// Original 50 items and signs: https://ipip.ori.org/new_ipip-50-item-scale.htm
// Never label a nonvalidated translation or a relative trait score a clinical diagnosis.
export const IPIP_BIG_FIVE_50_EN_V1 = deepFreeze({
  "id": "9b73e2a0-142c-5d14-a9f3-c47114310350",
  "key": "ipip-big-five-50",
  "version": "v1",
  "instrumentLocale": "en",
  "translationVersion": "original-en-v1",
  "timeframe": "general-self-description",
  "scoringKey": "configured",
  "scoringVersion": "v1",
  "resultVersion": "v1",
  "title": "IPIP Big Five Factor Markers — 50",
  "source": {
    "title": "IPIP Big-Five Factor Markers (50-item sample questionnaire)",
    "url": "https://ipip.ori.org/new_ipip-50-item-scale.htm",
    "scoringUrl": "https://ipip.ori.org/newBigFive5broadKey.htm",
    "permissionUrl": "https://ipip.ori.org/newPermission.htm",
    "permission": "public-domain",
    "citation": "Goldberg, L. R. (1992). The development of markers for the Big-Five factor structure. Psychological Assessment, 4, 26–42.",
    "reviewedAt": "2026-10-11",
    "interpretation": "Five separate continuous descriptive trait scores (10–50). Not a diagnosis, not impairment ratings, and not targets for a therapy outcome."
  },
  "answerScale": {
    "min": 1,
    "max": 5
  },
  "responseAnchors": [
    "Very Inaccurate",
    "Moderately Inaccurate",
    "Neither Accurate nor Inaccurate",
    "Moderately Accurate",
    "Very Accurate"
  ],
  "scoring": {
    "dimensions": [
      {
        "key": "trait.ipip50.extraversion",
        "method": "sum",
        "items": [
          "ipip50.01",
          "ipip50.06",
          "ipip50.11",
          "ipip50.16",
          "ipip50.21",
          "ipip50.26",
          "ipip50.31",
          "ipip50.36",
          "ipip50.41",
          "ipip50.46"
        ],
        "min": 10,
        "max": 50,
        "dimensionClass": "trait",
        "sourceConstruct": "Extraversion",
        "direction": "non-normative",
        "reverseItems": [
          "ipip50.06",
          "ipip50.16",
          "ipip50.26",
          "ipip50.36",
          "ipip50.46"
        ]
      },
      {
        "key": "trait.ipip50.agreeableness",
        "method": "sum",
        "items": [
          "ipip50.02",
          "ipip50.07",
          "ipip50.12",
          "ipip50.17",
          "ipip50.22",
          "ipip50.27",
          "ipip50.32",
          "ipip50.37",
          "ipip50.42",
          "ipip50.47"
        ],
        "min": 10,
        "max": 50,
        "dimensionClass": "trait",
        "sourceConstruct": "Agreeableness",
        "direction": "non-normative",
        "reverseItems": [
          "ipip50.02",
          "ipip50.12",
          "ipip50.22",
          "ipip50.32"
        ]
      },
      {
        "key": "trait.ipip50.conscientiousness",
        "method": "sum",
        "items": [
          "ipip50.03",
          "ipip50.08",
          "ipip50.13",
          "ipip50.18",
          "ipip50.23",
          "ipip50.28",
          "ipip50.33",
          "ipip50.38",
          "ipip50.43",
          "ipip50.48"
        ],
        "min": 10,
        "max": 50,
        "dimensionClass": "trait",
        "sourceConstruct": "Conscientiousness",
        "direction": "non-normative",
        "reverseItems": [
          "ipip50.08",
          "ipip50.18",
          "ipip50.28",
          "ipip50.38"
        ]
      },
      {
        "key": "trait.ipip50.emotional_stability",
        "method": "sum",
        "items": [
          "ipip50.04",
          "ipip50.09",
          "ipip50.14",
          "ipip50.19",
          "ipip50.24",
          "ipip50.29",
          "ipip50.34",
          "ipip50.39",
          "ipip50.44",
          "ipip50.49"
        ],
        "min": 10,
        "max": 50,
        "dimensionClass": "trait",
        "sourceConstruct": "Emotional Stability",
        "direction": "non-normative",
        "reverseItems": [
          "ipip50.04",
          "ipip50.14",
          "ipip50.24",
          "ipip50.29",
          "ipip50.34",
          "ipip50.39",
          "ipip50.44",
          "ipip50.49"
        ]
      },
      {
        "key": "trait.ipip50.intellect_imagination",
        "method": "sum",
        "items": [
          "ipip50.05",
          "ipip50.10",
          "ipip50.15",
          "ipip50.20",
          "ipip50.25",
          "ipip50.30",
          "ipip50.35",
          "ipip50.40",
          "ipip50.45",
          "ipip50.50"
        ],
        "min": 10,
        "max": 50,
        "dimensionClass": "trait",
        "sourceConstruct": "Intellect / Imagination",
        "direction": "non-normative",
        "reverseItems": [
          "ipip50.10",
          "ipip50.20",
          "ipip50.30"
        ]
      }
    ]
  },
  "questions": [
    {
      "id": "ipip50.01",
      "text": "Am the life of the party.",
      "required": true
    },
    {
      "id": "ipip50.02",
      "text": "Feel little concern for others.",
      "required": true
    },
    {
      "id": "ipip50.03",
      "text": "Am always prepared.",
      "required": true
    },
    {
      "id": "ipip50.04",
      "text": "Get stressed out easily.",
      "required": true
    },
    {
      "id": "ipip50.05",
      "text": "Have a rich vocabulary.",
      "required": true
    },
    {
      "id": "ipip50.06",
      "text": "Don't talk a lot.",
      "required": true
    },
    {
      "id": "ipip50.07",
      "text": "Am interested in people.",
      "required": true
    },
    {
      "id": "ipip50.08",
      "text": "Leave my belongings around.",
      "required": true
    },
    {
      "id": "ipip50.09",
      "text": "Am relaxed most of the time.",
      "required": true
    },
    {
      "id": "ipip50.10",
      "text": "Have difficulty understanding abstract ideas.",
      "required": true
    },
    {
      "id": "ipip50.11",
      "text": "Feel comfortable around people.",
      "required": true
    },
    {
      "id": "ipip50.12",
      "text": "Insult people.",
      "required": true
    },
    {
      "id": "ipip50.13",
      "text": "Pay attention to details.",
      "required": true
    },
    {
      "id": "ipip50.14",
      "text": "Worry about things.",
      "required": true
    },
    {
      "id": "ipip50.15",
      "text": "Have a vivid imagination.",
      "required": true
    },
    {
      "id": "ipip50.16",
      "text": "Keep in the background.",
      "required": true
    },
    {
      "id": "ipip50.17",
      "text": "Sympathize with others' feelings.",
      "required": true
    },
    {
      "id": "ipip50.18",
      "text": "Make a mess of things.",
      "required": true
    },
    {
      "id": "ipip50.19",
      "text": "Seldom feel blue.",
      "required": true
    },
    {
      "id": "ipip50.20",
      "text": "Am not interested in abstract ideas.",
      "required": true
    },
    {
      "id": "ipip50.21",
      "text": "Start conversations.",
      "required": true
    },
    {
      "id": "ipip50.22",
      "text": "Am not interested in other people's problems.",
      "required": true
    },
    {
      "id": "ipip50.23",
      "text": "Get chores done right away.",
      "required": true
    },
    {
      "id": "ipip50.24",
      "text": "Am easily disturbed.",
      "required": true
    },
    {
      "id": "ipip50.25",
      "text": "Have excellent ideas.",
      "required": true
    },
    {
      "id": "ipip50.26",
      "text": "Have little to say.",
      "required": true
    },
    {
      "id": "ipip50.27",
      "text": "Have a soft heart.",
      "required": true
    },
    {
      "id": "ipip50.28",
      "text": "Often forget to put things back in their proper place.",
      "required": true
    },
    {
      "id": "ipip50.29",
      "text": "Get upset easily.",
      "required": true
    },
    {
      "id": "ipip50.30",
      "text": "Do not have a good imagination.",
      "required": true
    },
    {
      "id": "ipip50.31",
      "text": "Talk to a lot of different people at parties.",
      "required": true
    },
    {
      "id": "ipip50.32",
      "text": "Am not really interested in others.",
      "required": true
    },
    {
      "id": "ipip50.33",
      "text": "Like order.",
      "required": true
    },
    {
      "id": "ipip50.34",
      "text": "Change my mood a lot.",
      "required": true
    },
    {
      "id": "ipip50.35",
      "text": "Am quick to understand things.",
      "required": true
    },
    {
      "id": "ipip50.36",
      "text": "Don't like to draw attention to myself.",
      "required": true
    },
    {
      "id": "ipip50.37",
      "text": "Take time out for others.",
      "required": true
    },
    {
      "id": "ipip50.38",
      "text": "Shirk my duties.",
      "required": true
    },
    {
      "id": "ipip50.39",
      "text": "Have frequent mood swings.",
      "required": true
    },
    {
      "id": "ipip50.40",
      "text": "Use difficult words.",
      "required": true
    },
    {
      "id": "ipip50.41",
      "text": "Don't mind being the center of attention.",
      "required": true
    },
    {
      "id": "ipip50.42",
      "text": "Feel others' emotions.",
      "required": true
    },
    {
      "id": "ipip50.43",
      "text": "Follow a schedule.",
      "required": true
    },
    {
      "id": "ipip50.44",
      "text": "Get irritated easily.",
      "required": true
    },
    {
      "id": "ipip50.45",
      "text": "Spend time reflecting on things.",
      "required": true
    },
    {
      "id": "ipip50.46",
      "text": "Am quiet around strangers.",
      "required": true
    },
    {
      "id": "ipip50.47",
      "text": "Make people feel at ease.",
      "required": true
    },
    {
      "id": "ipip50.48",
      "text": "Am exacting in my work.",
      "required": true
    },
    {
      "id": "ipip50.49",
      "text": "Often feel blue.",
      "required": true
    },
    {
      "id": "ipip50.50",
      "text": "Am full of ideas.",
      "required": true
    }
  ],
  "optionalContext": [],
  "suggestedRepeatDays": null,
  "contentHash": "sha256:345b4697313e391676818d22197335b8e02a7271eabf3de014bf468148d3c034"
})

export const IPIP_BIG_FIVE_50_CATALOG = deepFreeze([
  {
    "key": "ipip-big-five-50",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "personality",
      "relationships",
      "self-support"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "relationships",
      "emotions",
      "other"
    ],
    "questionCount": 50,
    "durationMinutes": 9,
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
        "key": "personality",
        "weight": 1
      },
      {
        "key": "relationships",
        "weight": 0.5
      },
      {
        "key": "emotional_regulation",
        "weight": 0.25
      },
      {
        "key": "focus",
        "weight": 0.3
      }
    ],
    "title": {
      "en": "Big Five Personality — IPIP 50",
      "ru": "Большая пятёрка — IPIP 50 · EN"
    },
    "description": {
      "en": "Public-domain IPIP Big Five with 50 original English items and five separate descriptive trait scales. Not a clinical diagnosis.",
      "ru": "50 оригинальных вопросов IPIP на английском. Пять независимых личностных шкал; не диагноз и не оценка психического здоровья."
    }
  }
])

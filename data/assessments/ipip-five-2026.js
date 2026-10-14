import { deepFreeze } from '../../lib/assessments/contracts.js'

// Exact original-English IPIP forms. Prepared, not activated.
export const IPIP_FIVE_DEFINITIONS = deepFreeze([
  {
    "id": "3cd0d016-d40e-5837-a90c-36fb9c794ace",
    "key": "ipip-locus-of-control-internality-10",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP — Locus of Control: Internality",
    "source": {
      "title": "International Personality Item Pool — Locus of Control: Internality",
      "url": "https://ipip.ori.org/newSingleConstructsKey.htm",
      "scoringUrl": "https://ipip.ori.org/newScoringInstructions.htm",
      "evidenceUrl": "https://ipip.ori.org/newSingleConstructs.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "onlinePermissionUrl": "https://ipip.ori.org/IPIPImplementationsAroundTheWeb.htm",
      "permission": "Public-domain IPIP items, scales and inventories; commercial and non-commercial use and online administration permitted. This does not imply endorsement or clinical certification.",
      "citation": "Levenson (1981), comparator cited by the IPIP single-construct table; implemented form: individual 10-item IPIP control-beliefs scale, not the original Levenson scale.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Higher sums indicate stronger self-reported internal control beliefs. This is not evidence that a person controls every outcome, and it must not be used to blame someone for adverse circumstances."
    },
    "answerScale": {
      "min": 1,
      "max": 5
    },
    "responseAnchors": [
      "Very Inaccurate",
      "Moderately Inaccurate",
      "Neither Inaccurate nor Accurate",
      "Moderately Accurate",
      "Very Accurate"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "trait.ipip.locus_of_control_internality",
          "method": "sum",
          "items": [
            "ipip-locus-of-control-internality-10.01",
            "ipip-locus-of-control-internality-10.02",
            "ipip-locus-of-control-internality-10.03",
            "ipip-locus-of-control-internality-10.04",
            "ipip-locus-of-control-internality-10.05",
            "ipip-locus-of-control-internality-10.06",
            "ipip-locus-of-control-internality-10.07",
            "ipip-locus-of-control-internality-10.08",
            "ipip-locus-of-control-internality-10.09",
            "ipip-locus-of-control-internality-10.10"
          ],
          "reverseItems": [
            "ipip-locus-of-control-internality-10.07",
            "ipip-locus-of-control-internality-10.08",
            "ipip-locus-of-control-internality-10.09",
            "ipip-locus-of-control-internality-10.10"
          ],
          "min": 10,
          "max": 50,
          "dimensionClass": "trait",
          "sourceConstruct": "Locus of Control: Internality",
          "direction": "non-normative"
        }
      ]
    },
    "questions": [
      {
        "id": "ipip-locus-of-control-internality-10.01",
        "text": "Believe that my success depends on ability rather than luck.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-internality-10.02",
        "text": "Believe that events in my life are determined only by me.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-internality-10.03",
        "text": "Just know that I will be a success.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-internality-10.04",
        "text": "Believe that by working hard a person can achieve anything.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-internality-10.05",
        "text": "Feel comfortable with myself.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-internality-10.06",
        "text": "Always know why I do things.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-internality-10.07",
        "text": "See difficulties everywhere.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-internality-10.08",
        "text": "Believe that unfortunate events occur because of bad luck.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-internality-10.09",
        "text": "Can't stand on my own.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-internality-10.10",
        "text": "Feel that my life lacks direction.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:4bab4e91124abd7a1034e4221dadbd2794f4ecf39a1192924c6a72e1e9b2f65c"
  },
  {
    "id": "60840db2-d128-5f62-82e5-3639499a218d",
    "key": "ipip-locus-of-control-powerful-others-10",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP — Locus of Control: Powerful Others",
    "source": {
      "title": "International Personality Item Pool — Locus of Control: Powerful Others",
      "url": "https://ipip.ori.org/newSingleConstructsKey.htm",
      "scoringUrl": "https://ipip.ori.org/newScoringInstructions.htm",
      "evidenceUrl": "https://ipip.ori.org/newSingleConstructs.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "onlinePermissionUrl": "https://ipip.ori.org/IPIPImplementationsAroundTheWeb.htm",
      "permission": "Public-domain IPIP items, scales and inventories; commercial and non-commercial use and online administration permitted. This does not imply endorsement or clinical certification.",
      "citation": "Levenson (1981), comparator cited by the IPIP single-construct table; implemented form: individual 10-item IPIP control-beliefs scale, not the original Levenson scale.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Higher sums indicate stronger self-reported beliefs about control by powerful others in this IPIP item set. Scores do not establish whether a specific person or institution actually has power over your situation."
    },
    "answerScale": {
      "min": 1,
      "max": 5
    },
    "responseAnchors": [
      "Very Inaccurate",
      "Moderately Inaccurate",
      "Neither Inaccurate nor Accurate",
      "Moderately Accurate",
      "Very Accurate"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "trait.ipip.locus_of_control_powerful_others",
          "method": "sum",
          "items": [
            "ipip-locus-of-control-powerful-others-10.01",
            "ipip-locus-of-control-powerful-others-10.02",
            "ipip-locus-of-control-powerful-others-10.03",
            "ipip-locus-of-control-powerful-others-10.04",
            "ipip-locus-of-control-powerful-others-10.05",
            "ipip-locus-of-control-powerful-others-10.06",
            "ipip-locus-of-control-powerful-others-10.07",
            "ipip-locus-of-control-powerful-others-10.08",
            "ipip-locus-of-control-powerful-others-10.09",
            "ipip-locus-of-control-powerful-others-10.10"
          ],
          "reverseItems": [
            "ipip-locus-of-control-powerful-others-10.07",
            "ipip-locus-of-control-powerful-others-10.08",
            "ipip-locus-of-control-powerful-others-10.09",
            "ipip-locus-of-control-powerful-others-10.10"
          ],
          "min": 10,
          "max": 50,
          "dimensionClass": "trait",
          "sourceConstruct": "Locus of Control: Powerful Others",
          "direction": "non-normative"
        }
      ]
    },
    "questions": [
      {
        "id": "ipip-locus-of-control-powerful-others-10.01",
        "text": "Believe that the world is controlled by a few powerful people.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-powerful-others-10.02",
        "text": "Remember my failures more easily than my successes.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-powerful-others-10.03",
        "text": "Feel short-changed in life.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-powerful-others-10.04",
        "text": "See difficulties everywhere.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-powerful-others-10.05",
        "text": "Dislike myself.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-powerful-others-10.06",
        "text": "Feel that my life lacks direction.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-powerful-others-10.07",
        "text": "Feel comfortable with myself.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-powerful-others-10.08",
        "text": "Just know that I will be a success.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-powerful-others-10.09",
        "text": "Feel comfortable around people.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-powerful-others-10.10",
        "text": "Know how to enjoy myself.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:135162d59843a20ff512275d38966b8eac8f1bd3ded4e8ceb2a72103933bd2c8"
  },
  {
    "id": "8dc8c30d-7a4c-59eb-aab8-6ff7eaac9bf0",
    "key": "ipip-locus-of-control-chance-10",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP — Locus of Control: Chance",
    "source": {
      "title": "International Personality Item Pool — Locus of Control: Chance",
      "url": "https://ipip.ori.org/newSingleConstructsKey.htm",
      "scoringUrl": "https://ipip.ori.org/newScoringInstructions.htm",
      "evidenceUrl": "https://ipip.ori.org/newSingleConstructs.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "onlinePermissionUrl": "https://ipip.ori.org/IPIPImplementationsAroundTheWeb.htm",
      "permission": "Public-domain IPIP items, scales and inventories; commercial and non-commercial use and online administration permitted. This does not imply endorsement or clinical certification.",
      "citation": "Levenson (1981), comparator cited by the IPIP single-construct table; implemented form: individual 10-item IPIP control-beliefs scale, not the original Levenson scale.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Higher sums indicate stronger self-reported beliefs in chance or fate as influences on outcomes. The score neither verifies those beliefs nor defines the right worldview or a mental-health problem."
    },
    "answerScale": {
      "min": 1,
      "max": 5
    },
    "responseAnchors": [
      "Very Inaccurate",
      "Moderately Inaccurate",
      "Neither Inaccurate nor Accurate",
      "Moderately Accurate",
      "Very Accurate"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "trait.ipip.locus_of_control_chance",
          "method": "sum",
          "items": [
            "ipip-locus-of-control-chance-10.01",
            "ipip-locus-of-control-chance-10.02",
            "ipip-locus-of-control-chance-10.03",
            "ipip-locus-of-control-chance-10.04",
            "ipip-locus-of-control-chance-10.05",
            "ipip-locus-of-control-chance-10.06",
            "ipip-locus-of-control-chance-10.07",
            "ipip-locus-of-control-chance-10.08",
            "ipip-locus-of-control-chance-10.09",
            "ipip-locus-of-control-chance-10.10"
          ],
          "reverseItems": [
            "ipip-locus-of-control-chance-10.07",
            "ipip-locus-of-control-chance-10.08",
            "ipip-locus-of-control-chance-10.09",
            "ipip-locus-of-control-chance-10.10"
          ],
          "min": 10,
          "max": 50,
          "dimensionClass": "trait",
          "sourceConstruct": "Locus of Control: Chance",
          "direction": "non-normative"
        }
      ]
    },
    "questions": [
      {
        "id": "ipip-locus-of-control-chance-10.01",
        "text": "Believe that unfortunate events occur because of bad luck.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-chance-10.02",
        "text": "Believe some people are born lucky.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-chance-10.03",
        "text": "Believe in the power of fate.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-chance-10.04",
        "text": "Feel that my life lacks direction.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-chance-10.05",
        "text": "Am resigned to my fate.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-chance-10.06",
        "text": "Am not sure where my life is going.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-chance-10.07",
        "text": "Believe that my success depends on ability rather than luck.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-chance-10.08",
        "text": "Feel comfortable with myself.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-chance-10.09",
        "text": "Just know that I will be a success.",
        "required": true
      },
      {
        "id": "ipip-locus-of-control-chance-10.10",
        "text": "Come up with good solutions.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:512a1d975a5293c2ae3d62d9249d2ba7d9fb405ed9ecb214b79d7000654ecbb3"
  },
  {
    "id": "894265db-986a-5181-aaf5-ec3b8a9d08b3",
    "key": "ipip-positive-expressivity-9",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP — Positive Expressivity",
    "source": {
      "title": "International Personality Item Pool — Positive Expressivity",
      "url": "https://ipip.ori.org/newEmotionalIntelligenceKey.htm",
      "scoringUrl": "https://ipip.ori.org/newScoringInstructions.htm",
      "evidenceUrl": "https://ipip.ori.org/newEmotionalIntelligenceTable.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "onlinePermissionUrl": "https://ipip.ori.org/IPIPImplementationsAroundTheWeb.htm",
      "permission": "Public-domain IPIP items, scales and inventories; commercial and non-commercial use and online administration permitted. This does not imply endorsement or clinical certification.",
      "citation": "Barchard (2001), IPIP scales measuring seven components potentially related to emotional intelligence; implemented form: individual expressivity scale only.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Higher sums indicate more self-reported expression of positive feelings. Expressiveness is not necessarily better, and preferences about touch, culture, accessibility and consent matter. This is not a total emotional intelligence or relationship-quality score."
    },
    "answerScale": {
      "min": 1,
      "max": 5
    },
    "responseAnchors": [
      "Very Inaccurate",
      "Moderately Inaccurate",
      "Neither Inaccurate nor Accurate",
      "Moderately Accurate",
      "Very Accurate"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "trait.ipip.positive_expressivity",
          "method": "sum",
          "items": [
            "ipip-positive-expressivity-9.01",
            "ipip-positive-expressivity-9.02",
            "ipip-positive-expressivity-9.03",
            "ipip-positive-expressivity-9.04",
            "ipip-positive-expressivity-9.05",
            "ipip-positive-expressivity-9.06",
            "ipip-positive-expressivity-9.07",
            "ipip-positive-expressivity-9.08",
            "ipip-positive-expressivity-9.09"
          ],
          "reverseItems": [
            "ipip-positive-expressivity-9.07",
            "ipip-positive-expressivity-9.08",
            "ipip-positive-expressivity-9.09"
          ],
          "min": 9,
          "max": 45,
          "dimensionClass": "trait",
          "sourceConstruct": "Positive Expressivity",
          "direction": "non-normative"
        }
      ]
    },
    "questions": [
      {
        "id": "ipip-positive-expressivity-9.01",
        "text": "Express my affection physically.",
        "required": true
      },
      {
        "id": "ipip-positive-expressivity-9.02",
        "text": "Laugh out loud if something is funny.",
        "required": true
      },
      {
        "id": "ipip-positive-expressivity-9.03",
        "text": "Express my happiness in a childlike manner.",
        "required": true
      },
      {
        "id": "ipip-positive-expressivity-9.04",
        "text": "Sometimes laugh out loud when reading or watching TV.",
        "required": true
      },
      {
        "id": "ipip-positive-expressivity-9.05",
        "text": "Hug my close friends.",
        "required": true
      },
      {
        "id": "ipip-positive-expressivity-9.06",
        "text": "Show my feelings when I'm happy.",
        "required": true
      },
      {
        "id": "ipip-positive-expressivity-9.07",
        "text": "Find it difficult showing people that I care about them.",
        "required": true
      },
      {
        "id": "ipip-positive-expressivity-9.08",
        "text": "Have difficulty showing affection.",
        "required": true
      },
      {
        "id": "ipip-positive-expressivity-9.09",
        "text": "Keep my happy feelings to myself.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:0bc1fa7a3633aac901eebbd7546cfd719b4198545a51dac433ba1a63e458999d"
  },
  {
    "id": "15a996b5-1b78-5b97-afb2-b1c9ef2078b1",
    "key": "ipip-negative-expressivity-10",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP — Negative Expressivity",
    "source": {
      "title": "International Personality Item Pool — Negative Expressivity",
      "url": "https://ipip.ori.org/newEmotionalIntelligenceKey.htm",
      "scoringUrl": "https://ipip.ori.org/newScoringInstructions.htm",
      "evidenceUrl": "https://ipip.ori.org/newEmotionalIntelligenceTable.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "onlinePermissionUrl": "https://ipip.ori.org/IPIPImplementationsAroundTheWeb.htm",
      "permission": "Public-domain IPIP items, scales and inventories; commercial and non-commercial use and online administration permitted. This does not imply endorsement or clinical certification.",
      "citation": "Barchard (2001), IPIP scales measuring seven components potentially related to emotional intelligence; implemented form: individual expressivity scale only.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Higher sums indicate more self-reported expression of negative feelings according to this exact IPIP key. Expression is not automatically healthier or harmful, and this is not an aggression, emotional intelligence or emotion-regulation ability score."
    },
    "answerScale": {
      "min": 1,
      "max": 5
    },
    "responseAnchors": [
      "Very Inaccurate",
      "Moderately Inaccurate",
      "Neither Inaccurate nor Accurate",
      "Moderately Accurate",
      "Very Accurate"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "trait.ipip.negative_expressivity",
          "method": "sum",
          "items": [
            "ipip-negative-expressivity-10.01",
            "ipip-negative-expressivity-10.02",
            "ipip-negative-expressivity-10.03",
            "ipip-negative-expressivity-10.04",
            "ipip-negative-expressivity-10.05",
            "ipip-negative-expressivity-10.06",
            "ipip-negative-expressivity-10.07",
            "ipip-negative-expressivity-10.08",
            "ipip-negative-expressivity-10.09",
            "ipip-negative-expressivity-10.10"
          ],
          "reverseItems": [
            "ipip-negative-expressivity-10.06",
            "ipip-negative-expressivity-10.07",
            "ipip-negative-expressivity-10.08",
            "ipip-negative-expressivity-10.09",
            "ipip-negative-expressivity-10.10"
          ],
          "min": 10,
          "max": 50,
          "dimensionClass": "trait",
          "sourceConstruct": "Negative Expressivity",
          "direction": "non-normative"
        }
      ]
    },
    "questions": [
      {
        "id": "ipip-negative-expressivity-10.01",
        "text": "Shout or scream when I'm angry.",
        "required": true
      },
      {
        "id": "ipip-negative-expressivity-10.02",
        "text": "Can't help but look upset when something bad happens.",
        "required": true
      },
      {
        "id": "ipip-negative-expressivity-10.03",
        "text": "Show my fear.",
        "required": true
      },
      {
        "id": "ipip-negative-expressivity-10.04",
        "text": "Suspect that my facial expressions give me away when I feel sad.",
        "required": true
      },
      {
        "id": "ipip-negative-expressivity-10.05",
        "text": "Show my sadness.",
        "required": true
      },
      {
        "id": "ipip-negative-expressivity-10.06",
        "text": "Keep my feelings to myself, regardless of how unhappy I am.",
        "required": true
      },
      {
        "id": "ipip-negative-expressivity-10.07",
        "text": "Find it difficult showing people that I'm angry with them.",
        "required": true
      },
      {
        "id": "ipip-negative-expressivity-10.08",
        "text": "Keep my feelings to myself, regardless of how scared I am.",
        "required": true
      },
      {
        "id": "ipip-negative-expressivity-10.09",
        "text": "Rarely show my anger.",
        "required": true
      },
      {
        "id": "ipip-negative-expressivity-10.10",
        "text": "Wish I could more easily show my negative feelings.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:67982ec12cbd3608b12a25f900cda30916824da0f06b40e547ed4d7a22377021"
  }
])

export const IPIP_FIVE_CATALOG = deepFreeze([
  {
    "key": "ipip-locus-of-control-internality-10",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "work",
      "function",
      "resources",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "relationships",
      "work-money",
      "other"
    ],
    "questionCount": 10,
    "durationMinutes": 3,
    "testStyle": "professional",
    "testLength": "medium",
    "suggestedRepeatDays": null,
    "cooldownDays": null,
    "startable": true,
    "registrationRequired": true,
    "sourceUrl": "https://ipip.ori.org/newSingleConstructsKey.htm",
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": true,
    "starterEligible": false,
    "free": true,
    "analysisAxes": [
      {
        "key": "personality",
        "weight": 1
      }
    ],
    "title": {
      "en": "IPIP — Locus of Control: Internality",
      "ru": "IPIP — Locus of Control: Internality"
    },
    "description": {
      "en": "Higher sums indicate stronger self-reported internal control beliefs. This is not evidence that a person controls every outcome, and it must not be used to blame someone for adverse circumstances. Original English items only. Descriptive sum 10–50; no clinical cutoffs, percentile ranks or diagnosis.",
      "ru": "Вопросы только на английском. Higher sums indicate stronger self-reported internal control beliefs. This is not evidence that a person controls every outcome, and it must not be used to blame someone for adverse circumstances. Original English items only. Descriptive sum 10–50; no clinical cutoffs, percentile ranks or diagnosis."
    }
  },
  {
    "key": "ipip-locus-of-control-powerful-others-10",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "work",
      "relationships",
      "resources",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "relationships",
      "work-money",
      "other"
    ],
    "questionCount": 10,
    "durationMinutes": 3,
    "testStyle": "professional",
    "testLength": "medium",
    "suggestedRepeatDays": null,
    "cooldownDays": null,
    "startable": true,
    "registrationRequired": true,
    "sourceUrl": "https://ipip.ori.org/newSingleConstructsKey.htm",
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": true,
    "starterEligible": false,
    "free": true,
    "analysisAxes": [
      {
        "key": "personality",
        "weight": 1
      }
    ],
    "title": {
      "en": "IPIP — Locus of Control: Powerful Others",
      "ru": "IPIP — Locus of Control: Powerful Others"
    },
    "description": {
      "en": "Higher sums indicate stronger self-reported beliefs about control by powerful others in this IPIP item set. Scores do not establish whether a specific person or institution actually has power over your situation. Original English items only. Descriptive sum 10–50; no clinical cutoffs, percentile ranks or diagnosis.",
      "ru": "Вопросы только на английском. Higher sums indicate stronger self-reported beliefs about control by powerful others in this IPIP item set. Scores do not establish whether a specific person or institution actually has power over your situation. Original English items only. Descriptive sum 10–50; no clinical cutoffs, percentile ranks or diagnosis."
    }
  },
  {
    "key": "ipip-locus-of-control-chance-10",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "work",
      "meaning",
      "resources",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "relationships",
      "work-money",
      "other"
    ],
    "questionCount": 10,
    "durationMinutes": 3,
    "testStyle": "professional",
    "testLength": "medium",
    "suggestedRepeatDays": null,
    "cooldownDays": null,
    "startable": true,
    "registrationRequired": true,
    "sourceUrl": "https://ipip.ori.org/newSingleConstructsKey.htm",
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": true,
    "starterEligible": false,
    "free": true,
    "analysisAxes": [
      {
        "key": "personality",
        "weight": 1
      }
    ],
    "title": {
      "en": "IPIP — Locus of Control: Chance",
      "ru": "IPIP — Locus of Control: Chance"
    },
    "description": {
      "en": "Higher sums indicate stronger self-reported beliefs in chance or fate as influences on outcomes. The score neither verifies those beliefs nor defines the right worldview or a mental-health problem. Original English items only. Descriptive sum 10–50; no clinical cutoffs, percentile ranks or diagnosis.",
      "ru": "Вопросы только на английском. Higher sums indicate stronger self-reported beliefs in chance or fate as influences on outcomes. The score neither verifies those beliefs nor defines the right worldview or a mental-health problem. Original English items only. Descriptive sum 10–50; no clinical cutoffs, percentile ranks or diagnosis."
    }
  },
  {
    "key": "ipip-positive-expressivity-9",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "relationships",
      "mood",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "emotions",
      "relationships",
      "other"
    ],
    "questionCount": 9,
    "durationMinutes": 3,
    "testStyle": "professional",
    "testLength": "medium",
    "suggestedRepeatDays": null,
    "cooldownDays": null,
    "startable": true,
    "registrationRequired": true,
    "sourceUrl": "https://ipip.ori.org/newEmotionalIntelligenceKey.htm",
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": true,
    "starterEligible": false,
    "free": true,
    "analysisAxes": [
      {
        "key": "personality",
        "weight": 1
      }
    ],
    "title": {
      "en": "IPIP — Positive Expressivity",
      "ru": "IPIP — Positive Expressivity"
    },
    "description": {
      "en": "Higher sums indicate more self-reported expression of positive feelings. Expressiveness is not necessarily better, and preferences about touch, culture, accessibility and consent matter. This is not a total emotional intelligence or relationship-quality score. Original English items only. Descriptive sum 9–45; no clinical cutoffs, percentile ranks or diagnosis.",
      "ru": "Вопросы только на английском. Higher sums indicate more self-reported expression of positive feelings. Expressiveness is not necessarily better, and preferences about touch, culture, accessibility and consent matter. This is not a total emotional intelligence or relationship-quality score. Original English items only. Descriptive sum 9–45; no clinical cutoffs, percentile ranks or diagnosis."
    }
  },
  {
    "key": "ipip-negative-expressivity-10",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "relationships",
      "mood",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "emotions",
      "relationships",
      "other"
    ],
    "questionCount": 10,
    "durationMinutes": 3,
    "testStyle": "professional",
    "testLength": "medium",
    "suggestedRepeatDays": null,
    "cooldownDays": null,
    "startable": true,
    "registrationRequired": true,
    "sourceUrl": "https://ipip.ori.org/newEmotionalIntelligenceKey.htm",
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": true,
    "starterEligible": false,
    "free": true,
    "analysisAxes": [
      {
        "key": "personality",
        "weight": 1
      }
    ],
    "title": {
      "en": "IPIP — Negative Expressivity",
      "ru": "IPIP — Negative Expressivity"
    },
    "description": {
      "en": "Higher sums indicate more self-reported expression of negative feelings according to this exact IPIP key. Expression is not automatically healthier or harmful, and this is not an aggression, emotional intelligence or emotion-regulation ability score. Original English items only. Descriptive sum 10–50; no clinical cutoffs, percentile ranks or diagnosis.",
      "ru": "Вопросы только на английском. Higher sums indicate more self-reported expression of negative feelings according to this exact IPIP key. Expression is not automatically healthier or harmful, and this is not an aggression, emotional intelligence or emotion-regulation ability score. Original English items only. Descriptive sum 10–50; no clinical cutoffs, percentile ranks or diagnosis."
    }
  }
])

export const IPIP_FIVE_INTERPRETATION_ROWS = deepFreeze([
  [
    "ipip-locus-of-control-internality-10",
    "personality",
    "Consider what is realistically within your influence and what depends on external constraints. Choose one manageable action without assuming responsibility for everything.",
    "Consider what is realistically within your influence and what depends on external constraints. Choose one manageable action without assuming responsibility for everything. Вопросы только на английском; это не валидированная русская адаптация."
  ],
  [
    "ipip-locus-of-control-powerful-others-10",
    "personality",
    "Consider a concrete situation and distinguish other people's real constraints from assumptions. Identify support or choices available to you without dismissing structural barriers.",
    "Consider a concrete situation and distinguish other people's real constraints from assumptions. Identify support or choices available to you without dismissing structural barriers. Вопросы только на английском; это не валидированная русская адаптация."
  ],
  [
    "ipip-locus-of-control-chance-10",
    "personality",
    "Reflect on how you respond to uncertainty, including both realistic planning and accepting what cannot be controlled. There is no required worldview or target score.",
    "Reflect on how you respond to uncertainty, including both realistic planning and accepting what cannot be controlled. There is no required worldview or target score. Вопросы только на английском; это не валидированная русская адаптация."
  ],
  [
    "ipip-positive-expressivity-9",
    "personality",
    "Notice how you prefer to express warmth while respecting consent and personal or cultural boundaries. Physical affection is optional and never required.",
    "Notice how you prefer to express warmth while respecting consent and personal or cultural boundaries. Physical affection is optional and never required. Вопросы только на английском; это не валидированная русская адаптация."
  ],
  [
    "ipip-negative-expressivity-10",
    "personality",
    "Notice which ways of expressing difficult feelings are safe and fit the situation. You do not need to display every feeling, and a score never justifies intimidation or harm.",
    "Notice which ways of expressing difficult feelings are safe and fit the situation. You do not need to display every feeling, and a score never justifies intimidation or harm. Вопросы только на английском; это не валидированная русская адаптация."
  ]
])

export const IPIP_FIVE_DIMENSION_ROWS = deepFreeze([
  [
    "ipip-locus-of-control-internality-10",
    "trait.ipip.locus_of_control_internality",
    "personality",
    "Locus of Control: Internality",
    "Locus of Control: Internality",
    "Consider what is realistically within your influence and what depends on external constraints. Choose one manageable action without assuming responsibility for everything.",
    "Consider what is realistically within your influence and what depends on external constraints. Choose one manageable action without assuming responsibility for everything."
  ],
  [
    "ipip-locus-of-control-powerful-others-10",
    "trait.ipip.locus_of_control_powerful_others",
    "personality",
    "Locus of Control: Powerful Others",
    "Locus of Control: Powerful Others",
    "Consider a concrete situation and distinguish other people's real constraints from assumptions. Identify support or choices available to you without dismissing structural barriers.",
    "Consider a concrete situation and distinguish other people's real constraints from assumptions. Identify support or choices available to you without dismissing structural barriers."
  ],
  [
    "ipip-locus-of-control-chance-10",
    "trait.ipip.locus_of_control_chance",
    "personality",
    "Locus of Control: Chance",
    "Locus of Control: Chance",
    "Reflect on how you respond to uncertainty, including both realistic planning and accepting what cannot be controlled. There is no required worldview or target score.",
    "Reflect on how you respond to uncertainty, including both realistic planning and accepting what cannot be controlled. There is no required worldview or target score."
  ],
  [
    "ipip-positive-expressivity-9",
    "trait.ipip.positive_expressivity",
    "personality",
    "Positive Expressivity",
    "Positive Expressivity",
    "Notice how you prefer to express warmth while respecting consent and personal or cultural boundaries. Physical affection is optional and never required.",
    "Notice how you prefer to express warmth while respecting consent and personal or cultural boundaries. Physical affection is optional and never required."
  ],
  [
    "ipip-negative-expressivity-10",
    "trait.ipip.negative_expressivity",
    "personality",
    "Negative Expressivity",
    "Negative Expressivity",
    "Notice which ways of expressing difficult feelings are safe and fit the situation. You do not need to display every feeling, and a score never justifies intimidation or harm.",
    "Notice which ways of expressing difficult feelings are safe and fit the situation. You do not need to display every feeling, and a score never justifies intimidation or harm."
  ]
])

export const IPIP_FIVE_MEANINGS = deepFreeze({
  "trait.ipip.locus_of_control_internality": "Higher sums indicate stronger self-reported internal control beliefs. This is not evidence that a person controls every outcome, and it must not be used to blame someone for adverse circumstances. Range 10–50. No categories, clinical cutoffs, percentile ranks or diagnosis are assigned. Original English items only. Holistic House explanatory text; scores are not improvement targets.",
  "trait.ipip.locus_of_control_powerful_others": "Higher sums indicate stronger self-reported beliefs about control by powerful others in this IPIP item set. Scores do not establish whether a specific person or institution actually has power over your situation. Range 10–50. No categories, clinical cutoffs, percentile ranks or diagnosis are assigned. Original English items only. Holistic House explanatory text; scores are not improvement targets.",
  "trait.ipip.locus_of_control_chance": "Higher sums indicate stronger self-reported beliefs in chance or fate as influences on outcomes. The score neither verifies those beliefs nor defines the right worldview or a mental-health problem. Range 10–50. No categories, clinical cutoffs, percentile ranks or diagnosis are assigned. Original English items only. Holistic House explanatory text; scores are not improvement targets.",
  "trait.ipip.positive_expressivity": "Higher sums indicate more self-reported expression of positive feelings. Expressiveness is not necessarily better, and preferences about touch, culture, accessibility and consent matter. This is not a total emotional intelligence or relationship-quality score. Range 9–45. No categories, clinical cutoffs, percentile ranks or diagnosis are assigned. Original English items only. Holistic House explanatory text; scores are not improvement targets.",
  "trait.ipip.negative_expressivity": "Higher sums indicate more self-reported expression of negative feelings according to this exact IPIP key. Expression is not automatically healthier or harmful, and this is not an aggression, emotional intelligence or emotion-regulation ability score. Range 10–50. No categories, clinical cutoffs, percentile ranks or diagnosis are assigned. Original English items only. Holistic House explanatory text; scores are not improvement targets."
})


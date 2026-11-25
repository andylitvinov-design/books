import { deepFreeze } from '../../lib/assessments/contracts.js'

// Public-domain exact English IPIP item sets. Do not translate immutable versions.
export const IPIP_THREE_CATALOG = deepFreeze([
  {
    "key": "ipip-cognitive-failures-10",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "focus",
      "stress",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "emotions",
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
      "en": "IPIP — Cognitive Failures",
      "ru": "IPIP — Cognitive Failures"
    },
    "description": {
      "en": "Higher sums indicate more self-reported cognitive failures in this IPIP item set. This is not a test of cognitive ability, a diagnosis or the original 25-item Cognitive Failures Questionnaire. Original English items only. Descriptive sum 10–50; no clinical cutoffs, percentile ranks or diagnosis.",
      "ru": "Вопросы только на английском. Higher sums indicate more self-reported cognitive failures in this IPIP item set. This is not a test of cognitive ability, a diagnosis or the original 25-item Cognitive Failures Questionnaire. Original English items only. Descriptive sum 10–50; no clinical cutoffs, percentile ranks or diagnosis."
    },
    "sourceUrl": "https://ipip.ori.org/newSingleConstructsKey.htm"
  },
  {
    "key": "ipip-optimism-10",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "resources",
      "mood",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "emotions",
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
      "en": "IPIP — Optimism",
      "ru": "IPIP — Optimism"
    },
    "description": {
      "en": "Higher sums indicate more self-reported optimism in this IPIP item set. This is not the original Life Orientation Test or LOT-R and does not measure mental health or guarantee future success. Original English items only. Descriptive sum 10–50; no clinical cutoffs, percentile ranks or diagnosis.",
      "ru": "Вопросы только на английском. Higher sums indicate more self-reported optimism in this IPIP item set. This is not the original Life Orientation Test or LOT-R and does not measure mental health or guarantee future success. Original English items only. Descriptive sum 10–50; no clinical cutoffs, percentile ranks or diagnosis."
    },
    "sourceUrl": "https://ipip.ori.org/newSingleConstructsKey.htm"
  },
  {
    "key": "ipip-attending-to-emotions-10",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "mood",
      "relationships",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "emotions",
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
      "en": "IPIP — Attending to Emotions",
      "ru": "IPIP — Attending to Emotions"
    },
    "description": {
      "en": "Higher sums indicate more self-reported attention to emotions. More attention is not necessarily healthier or better; this is not an emotional intelligence total, emotion-regulation ability score or treatment target. Original English items only. Descriptive sum 10–50; no clinical cutoffs, percentile ranks or diagnosis.",
      "ru": "Вопросы только на английском. Higher sums indicate more self-reported attention to emotions. More attention is not necessarily healthier or better; this is not an emotional intelligence total, emotion-regulation ability score or treatment target. Original English items only. Descriptive sum 10–50; no clinical cutoffs, percentile ranks or diagnosis."
    },
    "sourceUrl": "https://ipip.ori.org/newEmotionalIntelligenceKey.htm"
  }
])

export const IPIP_THREE_DEFINITIONS = deepFreeze([
  {
    "id": "4b0e396a-4d7d-577e-87a6-0010a0511f26",
    "key": "ipip-cognitive-failures-10",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP — Cognitive Failures",
    "source": {
      "title": "International Personality Item Pool — Cognitive Failures",
      "url": "https://ipip.ori.org/newSingleConstructsKey.htm",
      "scoringUrl": "https://ipip.ori.org/newScoringInstructions.htm",
      "evidenceUrl": "https://ipip.ori.org/newSingleConstructs.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "onlinePermissionUrl": "https://ipip.ori.org/IPIPImplementationsAroundTheWeb.htm",
      "permission": "Public-domain IPIP items, scales and inventories; commercial and non-commercial use and online administration permitted. This does not imply endorsement or clinical certification.",
      "citation": "Broadbent, Cooper, FitzGerald & Parkes (1982), comparator cited by the IPIP single-construct table; implemented form: 10-item IPIP representation.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Higher sums indicate more self-reported cognitive failures in this IPIP item set. This is not a test of cognitive ability, a diagnosis or the original 25-item Cognitive Failures Questionnaire."
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
          "key": "trait.ipip.cognitive_failures",
          "method": "sum",
          "items": [
            "ipip-cognitive-failures-10.01",
            "ipip-cognitive-failures-10.02",
            "ipip-cognitive-failures-10.03",
            "ipip-cognitive-failures-10.04",
            "ipip-cognitive-failures-10.05",
            "ipip-cognitive-failures-10.06",
            "ipip-cognitive-failures-10.07",
            "ipip-cognitive-failures-10.08",
            "ipip-cognitive-failures-10.09",
            "ipip-cognitive-failures-10.10"
          ],
          "reverseItems": [
            "ipip-cognitive-failures-10.07",
            "ipip-cognitive-failures-10.08",
            "ipip-cognitive-failures-10.09",
            "ipip-cognitive-failures-10.10"
          ],
          "min": 10,
          "max": 50,
          "dimensionClass": "trait",
          "sourceConstruct": "Cognitive Failures",
          "direction": "non-normative"
        }
      ]
    },
    "questions": [
      {
        "id": "ipip-cognitive-failures-10.01",
        "text": "Get confused easily.",
        "required": true
      },
      {
        "id": "ipip-cognitive-failures-10.02",
        "text": "Often forget things.",
        "required": true
      },
      {
        "id": "ipip-cognitive-failures-10.03",
        "text": "Let my attention wander off.",
        "required": true
      },
      {
        "id": "ipip-cognitive-failures-10.04",
        "text": "Spill things.",
        "required": true
      },
      {
        "id": "ipip-cognitive-failures-10.05",
        "text": "Have difficulty keeping things in mind.",
        "required": true
      },
      {
        "id": "ipip-cognitive-failures-10.06",
        "text": "Can't make up my mind.",
        "required": true
      },
      {
        "id": "ipip-cognitive-failures-10.07",
        "text": "Like to take responsibility for making decisions.",
        "required": true
      },
      {
        "id": "ipip-cognitive-failures-10.08",
        "text": "Always know why I do things.",
        "required": true
      },
      {
        "id": "ipip-cognitive-failures-10.09",
        "text": "Remain calm under pressure.",
        "required": true
      },
      {
        "id": "ipip-cognitive-failures-10.10",
        "text": "Pay attention to details.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:afec7759133dd9096a976ea765f6ddb1b1b8f56f1427585bd78a41120cb49257"
  },
  {
    "id": "3bcd58c5-07d2-522a-ade3-ee97081c7915",
    "key": "ipip-optimism-10",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP — Optimism",
    "source": {
      "title": "International Personality Item Pool — Optimism",
      "url": "https://ipip.ori.org/newSingleConstructsKey.htm",
      "scoringUrl": "https://ipip.ori.org/newScoringInstructions.htm",
      "evidenceUrl": "https://ipip.ori.org/newSingleConstructs.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "onlinePermissionUrl": "https://ipip.ori.org/IPIPImplementationsAroundTheWeb.htm",
      "permission": "Public-domain IPIP items, scales and inventories; commercial and non-commercial use and online administration permitted. This does not imply endorsement or clinical certification.",
      "citation": "Scheier, Carver & Bridges (1994), comparator cited by the IPIP single-construct table; implemented form: 10-item IPIP representation.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Higher sums indicate more self-reported optimism in this IPIP item set. This is not the original Life Orientation Test or LOT-R and does not measure mental health or guarantee future success."
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
          "key": "trait.ipip.optimism",
          "method": "sum",
          "items": [
            "ipip-optimism-10.01",
            "ipip-optimism-10.02",
            "ipip-optimism-10.03",
            "ipip-optimism-10.04",
            "ipip-optimism-10.05",
            "ipip-optimism-10.06",
            "ipip-optimism-10.07",
            "ipip-optimism-10.08",
            "ipip-optimism-10.09",
            "ipip-optimism-10.10"
          ],
          "reverseItems": [
            "ipip-optimism-10.05",
            "ipip-optimism-10.06",
            "ipip-optimism-10.07",
            "ipip-optimism-10.08",
            "ipip-optimism-10.09",
            "ipip-optimism-10.10"
          ],
          "min": 10,
          "max": 50,
          "dimensionClass": "trait",
          "sourceConstruct": "Optimism",
          "direction": "non-normative"
        }
      ]
    },
    "questions": [
      {
        "id": "ipip-optimism-10.01",
        "text": "Just know that I will be a success.",
        "required": true
      },
      {
        "id": "ipip-optimism-10.02",
        "text": "Feel comfortable with myself.",
        "required": true
      },
      {
        "id": "ipip-optimism-10.03",
        "text": "Seldom feel blue.",
        "required": true
      },
      {
        "id": "ipip-optimism-10.04",
        "text": "Look at the bright side of life.",
        "required": true
      },
      {
        "id": "ipip-optimism-10.05",
        "text": "Have a dark outlook on the future.",
        "required": true
      },
      {
        "id": "ipip-optimism-10.06",
        "text": "Feel that my life lacks direction.",
        "required": true
      },
      {
        "id": "ipip-optimism-10.07",
        "text": "Dislike myself.",
        "required": true
      },
      {
        "id": "ipip-optimism-10.08",
        "text": "Often feel blue.",
        "required": true
      },
      {
        "id": "ipip-optimism-10.09",
        "text": "See difficulties everywhere.",
        "required": true
      },
      {
        "id": "ipip-optimism-10.10",
        "text": "Am often in a bad mood.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:9aad38d04d3e172962eb97080d8257bc94f23d1648e7e6d7eb1963e4fa3aaa32"
  },
  {
    "id": "16f2f3e7-2462-5e62-b94b-ff452b51819a",
    "key": "ipip-attending-to-emotions-10",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP — Attending to Emotions",
    "source": {
      "title": "International Personality Item Pool — Attending to Emotions",
      "url": "https://ipip.ori.org/newEmotionalIntelligenceKey.htm",
      "scoringUrl": "https://ipip.ori.org/newScoringInstructions.htm",
      "evidenceUrl": "https://ipip.ori.org/newEmotionalIntelligenceTable.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "onlinePermissionUrl": "https://ipip.ori.org/IPIPImplementationsAroundTheWeb.htm",
      "permission": "Public-domain IPIP items, scales and inventories; commercial and non-commercial use and online administration permitted. This does not imply endorsement or clinical certification.",
      "citation": "Barchard (2001), IPIP scales measuring seven components potentially related to emotional intelligence; implemented form: Attending to Emotions only.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Higher sums indicate more self-reported attention to emotions. More attention is not necessarily healthier or better; this is not an emotional intelligence total, emotion-regulation ability score or treatment target."
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
          "key": "trait.ipip.attending_to_emotions",
          "method": "sum",
          "items": [
            "ipip-attending-to-emotions-10.01",
            "ipip-attending-to-emotions-10.02",
            "ipip-attending-to-emotions-10.03",
            "ipip-attending-to-emotions-10.04",
            "ipip-attending-to-emotions-10.05",
            "ipip-attending-to-emotions-10.06",
            "ipip-attending-to-emotions-10.07",
            "ipip-attending-to-emotions-10.08",
            "ipip-attending-to-emotions-10.09",
            "ipip-attending-to-emotions-10.10"
          ],
          "reverseItems": [
            "ipip-attending-to-emotions-10.06",
            "ipip-attending-to-emotions-10.07",
            "ipip-attending-to-emotions-10.08",
            "ipip-attending-to-emotions-10.09",
            "ipip-attending-to-emotions-10.10"
          ],
          "min": 10,
          "max": 50,
          "dimensionClass": "trait",
          "sourceConstruct": "Attending to Emotions",
          "direction": "non-normative"
        }
      ]
    },
    "questions": [
      {
        "id": "ipip-attending-to-emotions-10.01",
        "text": "Think about the causes of my emotions.",
        "required": true
      },
      {
        "id": "ipip-attending-to-emotions-10.02",
        "text": "Pay a lot of attention to my feelings.",
        "required": true
      },
      {
        "id": "ipip-attending-to-emotions-10.03",
        "text": "Am usually aware of the way that I'm feeling.",
        "required": true
      },
      {
        "id": "ipip-attending-to-emotions-10.04",
        "text": "Notice my emotions.",
        "required": true
      },
      {
        "id": "ipip-attending-to-emotions-10.05",
        "text": "Often stop to analyze how I'm feeling.",
        "required": true
      },
      {
        "id": "ipip-attending-to-emotions-10.06",
        "text": "Rarely think about how I feel.",
        "required": true
      },
      {
        "id": "ipip-attending-to-emotions-10.07",
        "text": "Rarely analyze my emotions.",
        "required": true
      },
      {
        "id": "ipip-attending-to-emotions-10.08",
        "text": "Am not in touch with my feelings.",
        "required": true
      },
      {
        "id": "ipip-attending-to-emotions-10.09",
        "text": "Often ignore my feelings.",
        "required": true
      },
      {
        "id": "ipip-attending-to-emotions-10.10",
        "text": "Rarely notice my emotional reactions.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:5a5a80f4a3f0ad4ec20e52a4ca9e8745f5e646dd08e181d44aff9caef260334a"
  }
])

export const IPIP_THREE_DIMENSION_ROWS = deepFreeze([
  [
    "ipip-cognitive-failures-10",
    "trait.ipip.cognitive_failures",
    "personality",
    "Cognitive Failures",
    "Cognitive Failures",
    "Notice when everyday slips occur and consider sleep, distractions and workload. Persistent difficulties can be discussed with a qualified professional.",
    "Notice when everyday slips occur and consider sleep, distractions and workload. Persistent difficulties can be discussed with a qualified professional."
  ],
  [
    "ipip-optimism-10",
    "trait.ipip.optimism",
    "personality",
    "Optimism",
    "Optimism",
    "Consider one realistic next step and the uncertainties you face. There is no requirement to feel positive or to suppress difficult feelings.",
    "Consider one realistic next step and the uncertainties you face. There is no requirement to feel positive or to suppress difficult feelings."
  ],
  [
    "ipip-attending-to-emotions-10",
    "trait.ipip.attending_to_emotions",
    "personality",
    "Attending to Emotions",
    "Attending to Emotions",
    "Notice when attention to feelings is useful and when a pause is more helpful. Choose how much reflection feels workable for you.",
    "Notice when attention to feelings is useful and when a pause is more helpful. Choose how much reflection feels workable for you."
  ]
])

export const IPIP_THREE_INTERPRETATION_ROWS = deepFreeze([
  [
    "ipip-cognitive-failures-10",
    "personality",
    "Notice when everyday slips occur and consider sleep, distractions and workload. Persistent difficulties can be discussed with a qualified professional.",
    "Notice when everyday slips occur and consider sleep, distractions and workload. Persistent difficulties can be discussed with a qualified professional. Вопросы только на английском; это не валидированная русская адаптация."
  ],
  [
    "ipip-optimism-10",
    "personality",
    "Consider one realistic next step and the uncertainties you face. There is no requirement to feel positive or to suppress difficult feelings.",
    "Consider one realistic next step and the uncertainties you face. There is no requirement to feel positive or to suppress difficult feelings. Вопросы только на английском; это не валидированная русская адаптация."
  ],
  [
    "ipip-attending-to-emotions-10",
    "personality",
    "Notice when attention to feelings is useful and when a pause is more helpful. Choose how much reflection feels workable for you.",
    "Notice when attention to feelings is useful and when a pause is more helpful. Choose how much reflection feels workable for you. Вопросы только на английском; это не валидированная русская адаптация."
  ]
])

export const IPIP_THREE_MEANINGS = deepFreeze({
  "trait.ipip.cognitive_failures": "Higher sums indicate more self-reported cognitive failures in this IPIP item set. This is not a test of cognitive ability, a diagnosis or the original 25-item Cognitive Failures Questionnaire. Original English items only. Descriptive sum 10–50; no clinical cutoffs, percentile ranks or diagnosis. Holistic House explanatory text; scores are not improvement targets.",
  "trait.ipip.optimism": "Higher sums indicate more self-reported optimism in this IPIP item set. This is not the original Life Orientation Test or LOT-R and does not measure mental health or guarantee future success. Original English items only. Descriptive sum 10–50; no clinical cutoffs, percentile ranks or diagnosis. Holistic House explanatory text; scores are not improvement targets.",
  "trait.ipip.attending_to_emotions": "Higher sums indicate more self-reported attention to emotions. More attention is not necessarily healthier or better; this is not an emotional intelligence total, emotion-regulation ability score or treatment target. Original English items only. Descriptive sum 10–50; no clinical cutoffs, percentile ranks or diagnosis. Holistic House explanatory text; scores are not improvement targets."
})

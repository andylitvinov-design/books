import { deepFreeze } from '../../lib/assessments/contracts.js'

// 18 source-cleared, full-length original English measures; 120 actual questions.
// Every key uses the official item order and scoring signs; no invented thresholds or diagnoses.
// Do not use copyrighted BFAS aspects with 4 items explicitly noted outside the IPIP pool.
export const OPEN_PROFESSIONAL_2026_DEFINITIONS = deepFreeze([
  {
    "id": "d6277cc3-f343-5576-afc4-2a4717387448",
    "key": "ipip-aspect-volatility-10",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP Big Five Aspect — Emotional volatility",
    "source": {
      "title": "IPIP item sets of the Big Five Aspects Scales (BFAS)",
      "url": "https://ipip.ori.org/BFASKeys.htm",
      "scoringUrl": "https://ipip.ori.org/BFASKeys.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Public-domain IPIP items; only aspect sets containing no items explicitly flagged as outside-IPIP-origin on the BFAS source page.",
      "citation": "DeYoung, C. G., Quilty, L. C., & Peterson, J. B. (2007). Between facets and domains: 10 aspects of the Big Five. Journal of Personality and Social Psychology, 93, 880–896.",
      "reviewedAt": "2026-10-11",
      "interpretation": "One original-English 10-item aspect scored descriptively (mean 1–5). No clinical cutoff or diagnosis."
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
          "key": "trait.bfas.volatility",
          "method": "mean",
          "items": [
            "bfas.ipip_aspect_volatility_10.01",
            "bfas.ipip_aspect_volatility_10.02",
            "bfas.ipip_aspect_volatility_10.03",
            "bfas.ipip_aspect_volatility_10.04",
            "bfas.ipip_aspect_volatility_10.05",
            "bfas.ipip_aspect_volatility_10.06",
            "bfas.ipip_aspect_volatility_10.07",
            "bfas.ipip_aspect_volatility_10.08",
            "bfas.ipip_aspect_volatility_10.09",
            "bfas.ipip_aspect_volatility_10.10"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Emotional volatility",
          "direction": "non-normative",
          "reverseItems": [
            "bfas.ipip_aspect_volatility_10.07",
            "bfas.ipip_aspect_volatility_10.08",
            "bfas.ipip_aspect_volatility_10.09",
            "bfas.ipip_aspect_volatility_10.10"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "bfas.ipip_aspect_volatility_10.01",
        "text": "Get angry easily.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_volatility_10.02",
        "text": "Get upset easily.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_volatility_10.03",
        "text": "Change my mood a lot.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_volatility_10.04",
        "text": "Am a person whose moods go up and down easily.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_volatility_10.05",
        "text": "Get easily agitated.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_volatility_10.06",
        "text": "Can be stirred up easily.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_volatility_10.07",
        "text": "Rarely get irritated.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_volatility_10.08",
        "text": "Keep my emotions under control.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_volatility_10.09",
        "text": "Rarely lose my composure.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_volatility_10.10",
        "text": "Am not easily annoyed.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:ae14c686ba6291bbe82550dfc4d2936ac7897d389439b9a5c654bb7f9d097154"
  },
  {
    "id": "47f0cced-c738-560f-a260-f5c93c17042c",
    "key": "ipip-aspect-withdrawal-10",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP Big Five Aspect — Tendency toward withdrawal",
    "source": {
      "title": "IPIP item sets of the Big Five Aspects Scales (BFAS)",
      "url": "https://ipip.ori.org/BFASKeys.htm",
      "scoringUrl": "https://ipip.ori.org/BFASKeys.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Public-domain IPIP items; only aspect sets containing no items explicitly flagged as outside-IPIP-origin on the BFAS source page.",
      "citation": "DeYoung, C. G., Quilty, L. C., & Peterson, J. B. (2007). Between facets and domains: 10 aspects of the Big Five. Journal of Personality and Social Psychology, 93, 880–896.",
      "reviewedAt": "2026-10-11",
      "interpretation": "One original-English 10-item aspect scored descriptively (mean 1–5). No clinical cutoff or diagnosis."
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
          "key": "trait.bfas.withdrawal",
          "method": "mean",
          "items": [
            "bfas.ipip_aspect_withdrawal_10.01",
            "bfas.ipip_aspect_withdrawal_10.02",
            "bfas.ipip_aspect_withdrawal_10.03",
            "bfas.ipip_aspect_withdrawal_10.04",
            "bfas.ipip_aspect_withdrawal_10.05",
            "bfas.ipip_aspect_withdrawal_10.06",
            "bfas.ipip_aspect_withdrawal_10.07",
            "bfas.ipip_aspect_withdrawal_10.08",
            "bfas.ipip_aspect_withdrawal_10.09",
            "bfas.ipip_aspect_withdrawal_10.10"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Tendency toward withdrawal",
          "direction": "non-normative",
          "reverseItems": [
            "bfas.ipip_aspect_withdrawal_10.07",
            "bfas.ipip_aspect_withdrawal_10.08",
            "bfas.ipip_aspect_withdrawal_10.09",
            "bfas.ipip_aspect_withdrawal_10.10"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "bfas.ipip_aspect_withdrawal_10.01",
        "text": "Am filled with doubts about things.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_withdrawal_10.02",
        "text": "Feel threatened easily.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_withdrawal_10.03",
        "text": "Worry about things.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_withdrawal_10.04",
        "text": "Am easily discouraged.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_withdrawal_10.05",
        "text": "Become overwhelmed by events.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_withdrawal_10.06",
        "text": "Am afraid of many things.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_withdrawal_10.07",
        "text": "Seldom feel blue.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_withdrawal_10.08",
        "text": "Feel comfortable with myself.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_withdrawal_10.09",
        "text": "Rarely feel depressed.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_withdrawal_10.10",
        "text": "Am not embarrassed easily.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:fd781447ecae0ac836db3c84281ce92fa880f1a9bf9954769de0a8876def884d"
  },
  {
    "id": "03b38216-fe2a-520a-a9c0-f74e8d204a28",
    "key": "ipip-aspect-compassion-10",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP Big Five Aspect — Compassion / empathy",
    "source": {
      "title": "IPIP item sets of the Big Five Aspects Scales (BFAS)",
      "url": "https://ipip.ori.org/BFASKeys.htm",
      "scoringUrl": "https://ipip.ori.org/BFASKeys.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Public-domain IPIP items; only aspect sets containing no items explicitly flagged as outside-IPIP-origin on the BFAS source page.",
      "citation": "DeYoung, C. G., Quilty, L. C., & Peterson, J. B. (2007). Between facets and domains: 10 aspects of the Big Five. Journal of Personality and Social Psychology, 93, 880–896.",
      "reviewedAt": "2026-10-11",
      "interpretation": "One original-English 10-item aspect scored descriptively (mean 1–5). No clinical cutoff or diagnosis."
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
          "key": "trait.bfas.compassion",
          "method": "mean",
          "items": [
            "bfas.ipip_aspect_compassion_10.01",
            "bfas.ipip_aspect_compassion_10.02",
            "bfas.ipip_aspect_compassion_10.03",
            "bfas.ipip_aspect_compassion_10.04",
            "bfas.ipip_aspect_compassion_10.05",
            "bfas.ipip_aspect_compassion_10.06",
            "bfas.ipip_aspect_compassion_10.07",
            "bfas.ipip_aspect_compassion_10.08",
            "bfas.ipip_aspect_compassion_10.09",
            "bfas.ipip_aspect_compassion_10.10"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Compassion / empathy",
          "direction": "non-normative",
          "reverseItems": [
            "bfas.ipip_aspect_compassion_10.06",
            "bfas.ipip_aspect_compassion_10.07",
            "bfas.ipip_aspect_compassion_10.08",
            "bfas.ipip_aspect_compassion_10.09",
            "bfas.ipip_aspect_compassion_10.10"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "bfas.ipip_aspect_compassion_10.01",
        "text": "Feel others’ emotions.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_compassion_10.02",
        "text": "Inquire about others’ well-being.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_compassion_10.03",
        "text": "Sympathize with others’ feelings.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_compassion_10.04",
        "text": "Take an interest in other people’s lives.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_compassion_10.05",
        "text": "Like to do things for others.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_compassion_10.06",
        "text": "Am not interested in other people’s problems.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_compassion_10.07",
        "text": "Can’t be bothered with other’s needs.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_compassion_10.08",
        "text": "Am indifferent to the feelings of others.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_compassion_10.09",
        "text": "Take no time for others.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_compassion_10.10",
        "text": "Don’t have a soft side.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:1860ef7842dfd9a5ee5000da7572c3b0b286b8cb226af908b2fb5dc9f8ada3fa"
  },
  {
    "id": "674407f4-04f2-5cfc-a9a1-2ba8702fe8a4",
    "key": "ipip-aspect-industriousness-10",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP Big Five Aspect — Industriousness",
    "source": {
      "title": "IPIP item sets of the Big Five Aspects Scales (BFAS)",
      "url": "https://ipip.ori.org/BFASKeys.htm",
      "scoringUrl": "https://ipip.ori.org/BFASKeys.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Public-domain IPIP items; only aspect sets containing no items explicitly flagged as outside-IPIP-origin on the BFAS source page.",
      "citation": "DeYoung, C. G., Quilty, L. C., & Peterson, J. B. (2007). Between facets and domains: 10 aspects of the Big Five. Journal of Personality and Social Psychology, 93, 880–896.",
      "reviewedAt": "2026-10-11",
      "interpretation": "One original-English 10-item aspect scored descriptively (mean 1–5). No clinical cutoff or diagnosis."
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
          "key": "trait.bfas.industriousness",
          "method": "mean",
          "items": [
            "bfas.ipip_aspect_industriousness_10.01",
            "bfas.ipip_aspect_industriousness_10.02",
            "bfas.ipip_aspect_industriousness_10.03",
            "bfas.ipip_aspect_industriousness_10.04",
            "bfas.ipip_aspect_industriousness_10.05",
            "bfas.ipip_aspect_industriousness_10.06",
            "bfas.ipip_aspect_industriousness_10.07",
            "bfas.ipip_aspect_industriousness_10.08",
            "bfas.ipip_aspect_industriousness_10.09",
            "bfas.ipip_aspect_industriousness_10.10"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Industriousness",
          "direction": "non-normative",
          "reverseItems": [
            "bfas.ipip_aspect_industriousness_10.05",
            "bfas.ipip_aspect_industriousness_10.06",
            "bfas.ipip_aspect_industriousness_10.07",
            "bfas.ipip_aspect_industriousness_10.08",
            "bfas.ipip_aspect_industriousness_10.09",
            "bfas.ipip_aspect_industriousness_10.10"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "bfas.ipip_aspect_industriousness_10.01",
        "text": "Carry out my plans.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_industriousness_10.02",
        "text": "Finish what I start.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_industriousness_10.03",
        "text": "Get things done quickly.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_industriousness_10.04",
        "text": "Always know what I am doing.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_industriousness_10.05",
        "text": "Waste my time.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_industriousness_10.06",
        "text": "Find it difficult to get down to work.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_industriousness_10.07",
        "text": "Mess things up.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_industriousness_10.08",
        "text": "Don’t put my mind on the task at hand.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_industriousness_10.09",
        "text": "Postpone decisions.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_industriousness_10.10",
        "text": "Am easily distracted.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:04e6c71c699c983908c11b88dcb752c7482c30774b8a9978936b12a4b398071d"
  },
  {
    "id": "918240af-eb81-514b-ad1f-a7d9d6f60bff",
    "key": "ipip-aspect-orderliness-10",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP Big Five Aspect — Orderliness",
    "source": {
      "title": "IPIP item sets of the Big Five Aspects Scales (BFAS)",
      "url": "https://ipip.ori.org/BFASKeys.htm",
      "scoringUrl": "https://ipip.ori.org/BFASKeys.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Public-domain IPIP items; only aspect sets containing no items explicitly flagged as outside-IPIP-origin on the BFAS source page.",
      "citation": "DeYoung, C. G., Quilty, L. C., & Peterson, J. B. (2007). Between facets and domains: 10 aspects of the Big Five. Journal of Personality and Social Psychology, 93, 880–896.",
      "reviewedAt": "2026-10-11",
      "interpretation": "One original-English 10-item aspect scored descriptively (mean 1–5). No clinical cutoff or diagnosis."
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
          "key": "trait.bfas.orderliness",
          "method": "mean",
          "items": [
            "bfas.ipip_aspect_orderliness_10.01",
            "bfas.ipip_aspect_orderliness_10.02",
            "bfas.ipip_aspect_orderliness_10.03",
            "bfas.ipip_aspect_orderliness_10.04",
            "bfas.ipip_aspect_orderliness_10.05",
            "bfas.ipip_aspect_orderliness_10.06",
            "bfas.ipip_aspect_orderliness_10.07",
            "bfas.ipip_aspect_orderliness_10.08",
            "bfas.ipip_aspect_orderliness_10.09",
            "bfas.ipip_aspect_orderliness_10.10"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Orderliness",
          "direction": "non-normative",
          "reverseItems": [
            "bfas.ipip_aspect_orderliness_10.07",
            "bfas.ipip_aspect_orderliness_10.08",
            "bfas.ipip_aspect_orderliness_10.09",
            "bfas.ipip_aspect_orderliness_10.10"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "bfas.ipip_aspect_orderliness_10.01",
        "text": "Like order.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_orderliness_10.02",
        "text": "Keep things tidy.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_orderliness_10.03",
        "text": "Follow a schedule.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_orderliness_10.04",
        "text": "Want everything to be “just right.”",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_orderliness_10.05",
        "text": "See that rules are observed.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_orderliness_10.06",
        "text": "Want every detail taken care of.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_orderliness_10.07",
        "text": "Leave my belongings around.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_orderliness_10.08",
        "text": "Am not bothered by messy people.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_orderliness_10.09",
        "text": "Am not bothered by disorder.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_orderliness_10.10",
        "text": "Dislike routine.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:93f411874648fb1734db5bf18b0721a8341067635284f22c34f9c160a7b18e55"
  },
  {
    "id": "fc6dc5c8-3642-53c8-a118-4435f2c9aa6a",
    "key": "ipip-aspect-intellect-10",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP Big Five Aspect — Intellectual engagement",
    "source": {
      "title": "IPIP item sets of the Big Five Aspects Scales (BFAS)",
      "url": "https://ipip.ori.org/BFASKeys.htm",
      "scoringUrl": "https://ipip.ori.org/BFASKeys.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Public-domain IPIP items; only aspect sets containing no items explicitly flagged as outside-IPIP-origin on the BFAS source page.",
      "citation": "DeYoung, C. G., Quilty, L. C., & Peterson, J. B. (2007). Between facets and domains: 10 aspects of the Big Five. Journal of Personality and Social Psychology, 93, 880–896.",
      "reviewedAt": "2026-10-11",
      "interpretation": "One original-English 10-item aspect scored descriptively (mean 1–5). No clinical cutoff or diagnosis."
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
          "key": "trait.bfas.intellect",
          "method": "mean",
          "items": [
            "bfas.ipip_aspect_intellect_10.01",
            "bfas.ipip_aspect_intellect_10.02",
            "bfas.ipip_aspect_intellect_10.03",
            "bfas.ipip_aspect_intellect_10.04",
            "bfas.ipip_aspect_intellect_10.05",
            "bfas.ipip_aspect_intellect_10.06",
            "bfas.ipip_aspect_intellect_10.07",
            "bfas.ipip_aspect_intellect_10.08",
            "bfas.ipip_aspect_intellect_10.09",
            "bfas.ipip_aspect_intellect_10.10"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Intellectual engagement",
          "direction": "non-normative",
          "reverseItems": [
            "bfas.ipip_aspect_intellect_10.07",
            "bfas.ipip_aspect_intellect_10.08",
            "bfas.ipip_aspect_intellect_10.09",
            "bfas.ipip_aspect_intellect_10.10"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "bfas.ipip_aspect_intellect_10.01",
        "text": "Am quick to understand things.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_intellect_10.02",
        "text": "Can handle a lot of information.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_intellect_10.03",
        "text": "Like to solve complex problems.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_intellect_10.04",
        "text": "Have a rich vocabulary.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_intellect_10.05",
        "text": "Think quickly.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_intellect_10.06",
        "text": "Formulate ideas clearly.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_intellect_10.07",
        "text": "Have difficulty understanding abstract ideas.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_intellect_10.08",
        "text": "Avoid philosophical discussions.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_intellect_10.09",
        "text": "Avoid difficult reading material.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_intellect_10.10",
        "text": "Learn things slowly.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:2780b06c9d987f20cb7f02f4d9e3b6a1e66a40ebad337590f16b3ff25364bfd5"
  },
  {
    "id": "0934a6ef-65e8-58ff-a897-ff021e4a863d",
    "key": "ipip-aspect-openness-10",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP Big Five Aspect — Openness to experience",
    "source": {
      "title": "IPIP item sets of the Big Five Aspects Scales (BFAS)",
      "url": "https://ipip.ori.org/BFASKeys.htm",
      "scoringUrl": "https://ipip.ori.org/BFASKeys.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Public-domain IPIP items; only aspect sets containing no items explicitly flagged as outside-IPIP-origin on the BFAS source page.",
      "citation": "DeYoung, C. G., Quilty, L. C., & Peterson, J. B. (2007). Between facets and domains: 10 aspects of the Big Five. Journal of Personality and Social Psychology, 93, 880–896.",
      "reviewedAt": "2026-10-11",
      "interpretation": "One original-English 10-item aspect scored descriptively (mean 1–5). No clinical cutoff or diagnosis."
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
          "key": "trait.bfas.openness",
          "method": "mean",
          "items": [
            "bfas.ipip_aspect_openness_10.01",
            "bfas.ipip_aspect_openness_10.02",
            "bfas.ipip_aspect_openness_10.03",
            "bfas.ipip_aspect_openness_10.04",
            "bfas.ipip_aspect_openness_10.05",
            "bfas.ipip_aspect_openness_10.06",
            "bfas.ipip_aspect_openness_10.07",
            "bfas.ipip_aspect_openness_10.08",
            "bfas.ipip_aspect_openness_10.09",
            "bfas.ipip_aspect_openness_10.10"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Openness to experience",
          "direction": "non-normative",
          "reverseItems": [
            "bfas.ipip_aspect_openness_10.07",
            "bfas.ipip_aspect_openness_10.08",
            "bfas.ipip_aspect_openness_10.09",
            "bfas.ipip_aspect_openness_10.10"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "bfas.ipip_aspect_openness_10.01",
        "text": "Enjoy the beauty of nature.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_openness_10.02",
        "text": "Believe in the importance of art.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_openness_10.03",
        "text": "Love to reflect on things.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_openness_10.04",
        "text": "Get deeply immersed in music.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_openness_10.05",
        "text": "See beauty in things that others might not notice.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_openness_10.06",
        "text": "Need a creative outlet.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_openness_10.07",
        "text": "Do not like poetry.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_openness_10.08",
        "text": "Seldom get lost in thought.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_openness_10.09",
        "text": "Seldom daydream.",
        "required": true
      },
      {
        "id": "bfas.ipip_aspect_openness_10.10",
        "text": "Seldom notice the emotional aspects of paintings and pictures.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:d5564f06da9690f2dbeb676a4b8aa2c19e4c2300a3930716d314f29975430838"
  },
  {
    "id": "ac69dd83-0fa4-5ffd-ae46-f86e48edd369",
    "key": "ipip-via-r-capacity-for-love-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Capacity for love",
    "source": {
      "title": "Balanced and culture-fair 4-item IPIP-VIA-R research short scales",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Public-domain IPIP items and scoring keys; original-English 2021 short-scale version only.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Human character in the IPIP: Towards shorter, more content-valid, and cross-culturally comparable IPIP-VIA character strengths scales. PsyArXiv. doi:10.31234/osf.io/k79qf",
      "reviewedAt": "2026-10-11",
      "interpretation": "Four-item original-English short scale, descriptive mean 1–5; lower precision, no diagnosis and no normative/clinical bands."
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
          "key": "trait.via.capacity_for_love",
          "method": "mean",
          "items": [
            "viar.ipip_via_r_capacity_for_love_4.01",
            "viar.ipip_via_r_capacity_for_love_4.02",
            "viar.ipip_via_r_capacity_for_love_4.03",
            "viar.ipip_via_r_capacity_for_love_4.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Capacity for love",
          "direction": "non-normative",
          "reverseItems": [
            "viar.ipip_via_r_capacity_for_love_4.03",
            "viar.ipip_via_r_capacity_for_love_4.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "viar.ipip_via_r_capacity_for_love_4.01",
        "text": "Know that there are people in my life who care as much for me as for themselves.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_capacity_for_love_4.02",
        "text": "Can express love to someone else.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_capacity_for_love_4.03",
        "text": "Do not easily share my feelings with others.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_capacity_for_love_4.04",
        "text": "Have difficulty accepting love from anyone.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 60,
    "contentHash": "sha256:666d2327041564f4036e9f47475f4c15b904894de3db7ad7a5b20f21e965ace7"
  },
  {
    "id": "a73591ea-aa21-5dbd-a524-ed04ecbe688f",
    "key": "ipip-via-r-curiosity-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Curiosity",
    "source": {
      "title": "Balanced and culture-fair 4-item IPIP-VIA-R research short scales",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Public-domain IPIP items and scoring keys; original-English 2021 short-scale version only.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Human character in the IPIP: Towards shorter, more content-valid, and cross-culturally comparable IPIP-VIA character strengths scales. PsyArXiv. doi:10.31234/osf.io/k79qf",
      "reviewedAt": "2026-10-11",
      "interpretation": "Four-item original-English short scale, descriptive mean 1–5; lower precision, no diagnosis and no normative/clinical bands."
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
          "key": "trait.via.curiosity",
          "method": "mean",
          "items": [
            "viar.ipip_via_r_curiosity_4.01",
            "viar.ipip_via_r_curiosity_4.02",
            "viar.ipip_via_r_curiosity_4.03",
            "viar.ipip_via_r_curiosity_4.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Curiosity",
          "direction": "non-normative",
          "reverseItems": [
            "viar.ipip_via_r_curiosity_4.03",
            "viar.ipip_via_r_curiosity_4.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "viar.ipip_via_r_curiosity_4.01",
        "text": "Am excited by many different activities.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_curiosity_4.02",
        "text": "Can find something of interest in any situation.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_curiosity_4.03",
        "text": "Am not all that curious about the world.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_curiosity_4.04",
        "text": "Have few interests.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 60,
    "contentHash": "sha256:164ea9630780cbf614116351683339437b5c28cd7076117b0c7478eca37a1b13"
  },
  {
    "id": "4599d220-c3c1-5a32-acbb-3fce95d4bb4c",
    "key": "ipip-via-r-forgiveness-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Forgiveness / mercy",
    "source": {
      "title": "Balanced and culture-fair 4-item IPIP-VIA-R research short scales",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Public-domain IPIP items and scoring keys; original-English 2021 short-scale version only.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Human character in the IPIP: Towards shorter, more content-valid, and cross-culturally comparable IPIP-VIA character strengths scales. PsyArXiv. doi:10.31234/osf.io/k79qf",
      "reviewedAt": "2026-10-11",
      "interpretation": "Four-item original-English short scale, descriptive mean 1–5; lower precision, no diagnosis and no normative/clinical bands."
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
          "key": "trait.via.forgiveness",
          "method": "mean",
          "items": [
            "viar.ipip_via_r_forgiveness_4.01",
            "viar.ipip_via_r_forgiveness_4.02",
            "viar.ipip_via_r_forgiveness_4.03",
            "viar.ipip_via_r_forgiveness_4.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Forgiveness / mercy",
          "direction": "non-normative",
          "reverseItems": [
            "viar.ipip_via_r_forgiveness_4.03",
            "viar.ipip_via_r_forgiveness_4.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "viar.ipip_via_r_forgiveness_4.01",
        "text": "Try to respond with understanding when someone treats me badly.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_forgiveness_4.02",
        "text": "Allow others to make a fresh start.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_forgiveness_4.03",
        "text": "Hold grudges.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_forgiveness_4.04",
        "text": "Find it hard to forgive others.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 60,
    "contentHash": "sha256:8e7c130cd2eebf63ed2f63a1a618649c62023b61295be76928ae6d5fbf329828"
  },
  {
    "id": "7d57d976-9ac3-5f0f-a1c0-dc6c6ff4cde9",
    "key": "ipip-via-r-gratitude-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Gratitude",
    "source": {
      "title": "Balanced and culture-fair 4-item IPIP-VIA-R research short scales",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Public-domain IPIP items and scoring keys; original-English 2021 short-scale version only.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Human character in the IPIP: Towards shorter, more content-valid, and cross-culturally comparable IPIP-VIA character strengths scales. PsyArXiv. doi:10.31234/osf.io/k79qf",
      "reviewedAt": "2026-10-11",
      "interpretation": "Four-item original-English short scale, descriptive mean 1–5; lower precision, no diagnosis and no normative/clinical bands."
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
          "key": "trait.via.gratitude",
          "method": "mean",
          "items": [
            "viar.ipip_via_r_gratitude_4.01",
            "viar.ipip_via_r_gratitude_4.02",
            "viar.ipip_via_r_gratitude_4.03",
            "viar.ipip_via_r_gratitude_4.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Gratitude",
          "direction": "non-normative",
          "reverseItems": [
            "viar.ipip_via_r_gratitude_4.03",
            "viar.ipip_via_r_gratitude_4.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "viar.ipip_via_r_gratitude_4.01",
        "text": "Express my thanks to those who care about me.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_gratitude_4.02",
        "text": "Am an extremely grateful person.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_gratitude_4.03",
        "text": "Feel no gratitude to others.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_gratitude_4.04",
        "text": "Find few things in my life to be grateful for.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 60,
    "contentHash": "sha256:14393dab628bd5effafac43818528c5a088f6eb83336da4ab03d1d7eec6d555b"
  },
  {
    "id": "6b803c55-e713-5110-a125-b8bb7e613914",
    "key": "ipip-via-r-hope-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Hope / optimism",
    "source": {
      "title": "Balanced and culture-fair 4-item IPIP-VIA-R research short scales",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Public-domain IPIP items and scoring keys; original-English 2021 short-scale version only.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Human character in the IPIP: Towards shorter, more content-valid, and cross-culturally comparable IPIP-VIA character strengths scales. PsyArXiv. doi:10.31234/osf.io/k79qf",
      "reviewedAt": "2026-10-11",
      "interpretation": "Four-item original-English short scale, descriptive mean 1–5; lower precision, no diagnosis and no normative/clinical bands."
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
          "key": "trait.via.hope",
          "method": "mean",
          "items": [
            "viar.ipip_via_r_hope_4.01",
            "viar.ipip_via_r_hope_4.02",
            "viar.ipip_via_r_hope_4.03",
            "viar.ipip_via_r_hope_4.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Hope / optimism",
          "direction": "non-normative",
          "reverseItems": [
            "viar.ipip_via_r_hope_4.03",
            "viar.ipip_via_r_hope_4.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "viar.ipip_via_r_hope_4.01",
        "text": "Can find the positive in what seems negative to others.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_hope_4.02",
        "text": "Remain hopeful despite challenges.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_hope_4.03",
        "text": "Expect the worst.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_hope_4.04",
        "text": "Often think about the possibility of negative outcomes that are not likely to occur.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 60,
    "contentHash": "sha256:81ace526b975bdc6178023cded42686939c21314b44b600944b5278d5e3889e3"
  },
  {
    "id": "972393f1-2f84-510b-aeac-b97fe99dd69c",
    "key": "ipip-via-r-humor-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Humor / playfulness",
    "source": {
      "title": "Balanced and culture-fair 4-item IPIP-VIA-R research short scales",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Public-domain IPIP items and scoring keys; original-English 2021 short-scale version only.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Human character in the IPIP: Towards shorter, more content-valid, and cross-culturally comparable IPIP-VIA character strengths scales. PsyArXiv. doi:10.31234/osf.io/k79qf",
      "reviewedAt": "2026-10-11",
      "interpretation": "Four-item original-English short scale, descriptive mean 1–5; lower precision, no diagnosis and no normative/clinical bands."
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
          "key": "trait.via.humor",
          "method": "mean",
          "items": [
            "viar.ipip_via_r_humor_4.01",
            "viar.ipip_via_r_humor_4.02",
            "viar.ipip_via_r_humor_4.03",
            "viar.ipip_via_r_humor_4.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Humor / playfulness",
          "direction": "non-normative",
          "reverseItems": [
            "viar.ipip_via_r_humor_4.03",
            "viar.ipip_via_r_humor_4.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "viar.ipip_via_r_humor_4.01",
        "text": "Use laughter to brighten the days of others.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_humor_4.02",
        "text": "Keep my sense of humor even in gloomy situations.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_humor_4.03",
        "text": "Am not known for my sense of humor.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_humor_4.04",
        "text": "Am not fun to be with.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 60,
    "contentHash": "sha256:65c42bba797dac55a98d47c5e5e28877259ad71283a106e15888565807d8e081"
  },
  {
    "id": "39bc7056-3b0e-5377-aac8-34f30bb26676",
    "key": "ipip-via-r-perseverance-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Perseverance",
    "source": {
      "title": "Balanced and culture-fair 4-item IPIP-VIA-R research short scales",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Public-domain IPIP items and scoring keys; original-English 2021 short-scale version only.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Human character in the IPIP: Towards shorter, more content-valid, and cross-culturally comparable IPIP-VIA character strengths scales. PsyArXiv. doi:10.31234/osf.io/k79qf",
      "reviewedAt": "2026-10-11",
      "interpretation": "Four-item original-English short scale, descriptive mean 1–5; lower precision, no diagnosis and no normative/clinical bands."
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
          "key": "trait.via.perseverance",
          "method": "mean",
          "items": [
            "viar.ipip_via_r_perseverance_4.01",
            "viar.ipip_via_r_perseverance_4.02",
            "viar.ipip_via_r_perseverance_4.03",
            "viar.ipip_via_r_perseverance_4.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Perseverance",
          "direction": "non-normative",
          "reverseItems": [
            "viar.ipip_via_r_perseverance_4.03",
            "viar.ipip_via_r_perseverance_4.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "viar.ipip_via_r_perseverance_4.01",
        "text": "Don't quit a task before it is finished.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_perseverance_4.02",
        "text": "Finish things despite obstacles in the way.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_perseverance_4.03",
        "text": "Don't finish what I start.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_perseverance_4.04",
        "text": "Give up easily.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 60,
    "contentHash": "sha256:7fdef804146664b189154653d856946b7d275b192b4b5832442418c2a41fda9d"
  },
  {
    "id": "1833e942-2887-54cf-a1db-270e6c566b05",
    "key": "ipip-via-r-creativity-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Originality / creativity",
    "source": {
      "title": "Balanced and culture-fair 4-item IPIP-VIA-R research short scales",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Public-domain IPIP items and scoring keys; original-English 2021 short-scale version only.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Human character in the IPIP: Towards shorter, more content-valid, and cross-culturally comparable IPIP-VIA character strengths scales. PsyArXiv. doi:10.31234/osf.io/k79qf",
      "reviewedAt": "2026-10-11",
      "interpretation": "Four-item original-English short scale, descriptive mean 1–5; lower precision, no diagnosis and no normative/clinical bands."
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
          "key": "trait.via.creativity",
          "method": "mean",
          "items": [
            "viar.ipip_via_r_creativity_4.01",
            "viar.ipip_via_r_creativity_4.02",
            "viar.ipip_via_r_creativity_4.03",
            "viar.ipip_via_r_creativity_4.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Originality / creativity",
          "direction": "non-normative",
          "reverseItems": [
            "viar.ipip_via_r_creativity_4.03",
            "viar.ipip_via_r_creativity_4.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "viar.ipip_via_r_creativity_4.01",
        "text": "Come up with new ways to do things.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_creativity_4.02",
        "text": "Am an original thinker.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_creativity_4.03",
        "text": "Am not considered to have new and different ideas.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_creativity_4.04",
        "text": "Have no special urge to do something original.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 60,
    "contentHash": "sha256:0abdbd7e8b1432dea5ad37eea960d71251284dcd59a0f25a702de0ec80687fef"
  },
  {
    "id": "c1d1b8f4-7e06-53e2-a5f8-539874959f6d",
    "key": "ipip-via-r-social-intelligence-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Social / emotional awareness",
    "source": {
      "title": "Balanced and culture-fair 4-item IPIP-VIA-R research short scales",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Public-domain IPIP items and scoring keys; original-English 2021 short-scale version only.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Human character in the IPIP: Towards shorter, more content-valid, and cross-culturally comparable IPIP-VIA character strengths scales. PsyArXiv. doi:10.31234/osf.io/k79qf",
      "reviewedAt": "2026-10-11",
      "interpretation": "Four-item original-English short scale, descriptive mean 1–5; lower precision, no diagnosis and no normative/clinical bands."
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
          "key": "trait.via.social_intelligence",
          "method": "mean",
          "items": [
            "viar.ipip_via_r_social_intelligence_4.01",
            "viar.ipip_via_r_social_intelligence_4.02",
            "viar.ipip_via_r_social_intelligence_4.03",
            "viar.ipip_via_r_social_intelligence_4.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Social / emotional awareness",
          "direction": "non-normative",
          "reverseItems": [
            "viar.ipip_via_r_social_intelligence_4.03",
            "viar.ipip_via_r_social_intelligence_4.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "viar.ipip_via_r_social_intelligence_4.01",
        "text": "Am good at sensing what others are feeling.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_social_intelligence_4.02",
        "text": "Know what to say to make people feel good.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_social_intelligence_4.03",
        "text": "Don't know how to handle myself in a new social situation.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_social_intelligence_4.04",
        "text": "Have trouble guessing how others will react.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 60,
    "contentHash": "sha256:c8287dd0a258e65d78008fe4a8750e2a9bb15f106b7e1fb97a486c3004dc2afc"
  },
  {
    "id": "c7da129b-23b9-5b9d-a92b-b8b13e6cf482",
    "key": "ipip-via-r-zest-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Vitality / zest",
    "source": {
      "title": "Balanced and culture-fair 4-item IPIP-VIA-R research short scales",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Public-domain IPIP items and scoring keys; original-English 2021 short-scale version only.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Human character in the IPIP: Towards shorter, more content-valid, and cross-culturally comparable IPIP-VIA character strengths scales. PsyArXiv. doi:10.31234/osf.io/k79qf",
      "reviewedAt": "2026-10-11",
      "interpretation": "Four-item original-English short scale, descriptive mean 1–5; lower precision, no diagnosis and no normative/clinical bands."
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
          "key": "trait.via.zest",
          "method": "mean",
          "items": [
            "viar.ipip_via_r_zest_4.01",
            "viar.ipip_via_r_zest_4.02",
            "viar.ipip_via_r_zest_4.03",
            "viar.ipip_via_r_zest_4.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Vitality / zest",
          "direction": "non-normative",
          "reverseItems": [
            "viar.ipip_via_r_zest_4.03",
            "viar.ipip_via_r_zest_4.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "viar.ipip_via_r_zest_4.01",
        "text": "Awaken with a sense of excitement about the day's possibilities.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_zest_4.02",
        "text": "Look forward to each new day.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_zest_4.03",
        "text": "Am described as grumpy.",
        "required": true
      },
      {
        "id": "viar.ipip_via_r_zest_4.04",
        "text": "Don't have much energy.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 60,
    "contentHash": "sha256:1e54753d89c37efd782cc28eb2b70862c83417daf08d1af419a07a1f007f32ee"
  },
  {
    "id": "6fa6fd5a-0e86-5164-a898-3674a54435e1",
    "key": "tipi-10",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "Ten-Item Personality Inventory (TIPI)",
    "source": {
      "title": "Ten-Item Personality Inventory (TIPI)",
      "url": "https://gosling.psy.utexas.edu/scales-weve-developed/ten-item-personality-measure-tipi/ten-item-personality-inventory-tipi/",
      "scoringUrl": "https://gosling.psy.utexas.edu/scales-weve-developed/ten-item-personality-measure-tipi/ten-item-personality-inventory-tipi/",
      "permissionUrl": "https://gosling.psy.utexas.edu/scales-weve-developed/ten-item-personality-measure-tipi/",
      "permission": "Author explicitly permits reproduction for any purpose without asking permission.",
      "citation": "Gosling, S. D., Rentfrow, P. J., & Swann, W. B. Jr. (2003). A very brief measure of the Big-Five personality domains. Journal of Research in Personality, 37, 504–528.",
      "reviewedAt": "2026-10-11",
      "interpretation": "Ten very brief English items produce five 1–7 mean trait scores, not clinical norms or conditions."
    },
    "answerScale": {
      "min": 1,
      "max": 7
    },
    "responseAnchors": [
      "Disagree strongly",
      "Disagree moderately",
      "Disagree a little",
      "Neither agree nor disagree",
      "Agree a little",
      "Agree moderately",
      "Agree strongly"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "trait.tipi.extraversion",
          "method": "mean",
          "items": [
            "tipi.tipi_10.01",
            "tipi.tipi_10.06"
          ],
          "min": 1,
          "max": 7,
          "dimensionClass": "trait",
          "sourceConstruct": "Extraversion",
          "direction": "non-normative",
          "reverseItems": [
            "tipi.tipi_10.06"
          ]
        },
        {
          "key": "trait.tipi.agreeableness",
          "method": "mean",
          "items": [
            "tipi.tipi_10.02",
            "tipi.tipi_10.07"
          ],
          "min": 1,
          "max": 7,
          "dimensionClass": "trait",
          "sourceConstruct": "Agreeableness",
          "direction": "non-normative",
          "reverseItems": [
            "tipi.tipi_10.02"
          ]
        },
        {
          "key": "trait.tipi.conscientiousness",
          "method": "mean",
          "items": [
            "tipi.tipi_10.03",
            "tipi.tipi_10.08"
          ],
          "min": 1,
          "max": 7,
          "dimensionClass": "trait",
          "sourceConstruct": "Conscientiousness",
          "direction": "non-normative",
          "reverseItems": [
            "tipi.tipi_10.08"
          ]
        },
        {
          "key": "trait.tipi.emotional_stability",
          "method": "mean",
          "items": [
            "tipi.tipi_10.04",
            "tipi.tipi_10.09"
          ],
          "min": 1,
          "max": 7,
          "dimensionClass": "trait",
          "sourceConstruct": "Emotional stability",
          "direction": "non-normative",
          "reverseItems": [
            "tipi.tipi_10.04"
          ]
        },
        {
          "key": "trait.tipi.openness",
          "method": "mean",
          "items": [
            "tipi.tipi_10.05",
            "tipi.tipi_10.10"
          ],
          "min": 1,
          "max": 7,
          "dimensionClass": "trait",
          "sourceConstruct": "Openness to experience",
          "direction": "non-normative",
          "reverseItems": [
            "tipi.tipi_10.10"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "tipi.tipi_10.01",
        "text": "Extraverted, enthusiastic.",
        "required": true
      },
      {
        "id": "tipi.tipi_10.02",
        "text": "Critical, quarrelsome.",
        "required": true
      },
      {
        "id": "tipi.tipi_10.03",
        "text": "Dependable, self-disciplined.",
        "required": true
      },
      {
        "id": "tipi.tipi_10.04",
        "text": "Anxious, easily upset.",
        "required": true
      },
      {
        "id": "tipi.tipi_10.05",
        "text": "Open to new experiences, complex.",
        "required": true
      },
      {
        "id": "tipi.tipi_10.06",
        "text": "Reserved, quiet.",
        "required": true
      },
      {
        "id": "tipi.tipi_10.07",
        "text": "Sympathetic, warm.",
        "required": true
      },
      {
        "id": "tipi.tipi_10.08",
        "text": "Disorganized, careless.",
        "required": true
      },
      {
        "id": "tipi.tipi_10.09",
        "text": "Calm, emotionally stable.",
        "required": true
      },
      {
        "id": "tipi.tipi_10.10",
        "text": "Conventional, uncreative.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:6f06f6388d14f825d708dff59421e36645198ad2aca4f4e53dba9153c39af834"
  }
])
export const OPEN_PROFESSIONAL_2026_CATALOG = deepFreeze([
  {
    "key": "ipip-aspect-volatility-10",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "personality",
      "mood",
      "stress"
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
      "en": "IPIP Big Five Aspect — Emotional volatility",
      "ru": "IPIP: Эмоциональная реактивность"
    },
    "description": {
      "en": "Emotional reactivity and mood shifts, described as a personality tendency rather than an illness.",
      "ru": "Склонность к эмоциональной реактивности и переменам настроения, не диагноз. Оригинальные вопросы на английском."
    }
  },
  {
    "key": "ipip-aspect-withdrawal-10",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "personality",
      "anxiety",
      "relationships"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
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
        "weight": 0.4
      }
    ],
    "title": {
      "en": "IPIP Big Five Aspect — Tendency toward withdrawal",
      "ru": "IPIP: Склонность к тревожному отстранению"
    },
    "description": {
      "en": "Sensitivity to threat, discouragement and emotional withdrawal; this trait measure does not screen for PTSD or depression.",
      "ru": "Чувствительность к угрозам, сомнениям и отстранению; не скрининг депрессии или ПТСР. Оригинальные вопросы на английском."
    }
  },
  {
    "key": "ipip-aspect-compassion-10",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "personality",
      "relationships",
      "support"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
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
        "weight": 0.4
      }
    ],
    "title": {
      "en": "IPIP Big Five Aspect — Compassion / empathy",
      "ru": "IPIP: Сочувствие и эмпатия"
    },
    "description": {
      "en": "An interpersonal aspect concerning sensitivity and concern for other people's experiences.",
      "ru": "Межличностная характеристика внимания и сопереживания другим людям. Оригинальные вопросы на английском."
    }
  },
  {
    "key": "ipip-aspect-industriousness-10",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "personality",
      "attention",
      "function",
      "work"
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
      "en": "IPIP Big Five Aspect — Industriousness",
      "ru": "IPIP: Настойчивость в делах"
    },
    "description": {
      "en": "A personality aspect related to persistence, task initiation and following plans; not an ADHD assessment.",
      "ru": "Личностная тенденция к настойчивости и завершению дел; не тест на СДВГ. Оригинальные вопросы на английском."
    }
  },
  {
    "key": "ipip-aspect-orderliness-10",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "personality",
      "function",
      "work"
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
      "en": "IPIP Big Five Aspect — Orderliness",
      "ru": "IPIP: Любовь к порядку"
    },
    "description": {
      "en": "Preference for routines, structure and order, not a measure of OCD or personal worth.",
      "ru": "Предпочтение структуры, правил и порядка, не оценка ОКР или личной ценности. Оригинальные вопросы на английском."
    }
  },
  {
    "key": "ipip-aspect-intellect-10",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "personality",
      "attention",
      "clarity"
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
      "en": "IPIP Big Five Aspect — Intellectual engagement",
      "ru": "IPIP: Интеллектуальная вовлечённость"
    },
    "description": {
      "en": "Self-reported interest and comfort with cognitively demanding tasks; not an IQ or cognitive-impairment test.",
      "ru": "Интерес и субъективная уверенность в интеллектуальных задачах; не тест IQ или когнитивных нарушений. Оригинальные вопросы на английском."
    }
  },
  {
    "key": "ipip-aspect-openness-10",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "personality",
      "meaning",
      "resources"
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
      "en": "IPIP Big Five Aspect — Openness to experience",
      "ru": "IPIP: Открытость переживаниям"
    },
    "description": {
      "en": "An aspect concerning aesthetic engagement, reflection and imagination rather than mental health severity.",
      "ru": "Интерес к красоте, размышлениям и воображению, не показатель тяжести психических проблем. Оригинальные вопросы на английском."
    }
  },
  {
    "key": "ipip-via-r-capacity-for-love-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "relationships",
      "support",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "relationships",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
    "testStyle": "professional",
    "testLength": "short",
    "suggestedRepeatDays": 60,
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
        "weight": 0.65
      },
      {
        "key": "relationships",
        "weight": 0.65
      }
    ],
    "title": {
      "en": "IPIP-VIA-R — Capacity for love",
      "ru": "IPIP-VIA-R: Способность к близости"
    },
    "description": {
      "en": "Published four-item research scale of capacity for love; a brief descriptive snapshot, not a diagnosis, norm, or treatment target.",
      "ru": "Опубликованная краткая 4-пунктовая шкала («Способность к близости»); описание, не диагноз и не нормативная оценка. Оригинальные вопросы на английском."
    }
  },
  {
    "key": "ipip-via-r-curiosity-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "personality",
      "meaning",
      "motivation"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "emotions",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
    "testStyle": "professional",
    "testLength": "short",
    "suggestedRepeatDays": 60,
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
        "weight": 0.65
      }
    ],
    "title": {
      "en": "IPIP-VIA-R — Curiosity",
      "ru": "IPIP-VIA-R: Любознательность"
    },
    "description": {
      "en": "Published four-item research scale of curiosity; a brief descriptive snapshot, not a diagnosis, norm, or treatment target.",
      "ru": "Опубликованная краткая 4-пунктовая шкала («Любознательность»); описание, не диагноз и не нормативная оценка. Оригинальные вопросы на английском."
    }
  },
  {
    "key": "ipip-via-r-forgiveness-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "relationships",
      "personality",
      "self-support"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "relationships",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
    "testStyle": "professional",
    "testLength": "short",
    "suggestedRepeatDays": 60,
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
        "weight": 0.65
      },
      {
        "key": "relationships",
        "weight": 0.65
      }
    ],
    "title": {
      "en": "IPIP-VIA-R — Forgiveness / mercy",
      "ru": "IPIP-VIA-R: Прощение и милосердие"
    },
    "description": {
      "en": "Published four-item research scale of forgiveness / mercy; a brief descriptive snapshot, not a diagnosis, norm, or treatment target.",
      "ru": "Опубликованная краткая 4-пунктовая шкала («Прощение и милосердие»); описание, не диагноз и не нормативная оценка. Оригинальные вопросы на английском."
    }
  },
  {
    "key": "ipip-via-r-gratitude-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "resources",
      "support",
      "mood"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "emotions",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
    "testStyle": "professional",
    "testLength": "short",
    "suggestedRepeatDays": 60,
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
        "weight": 0.65
      },
      {
        "key": "resource",
        "weight": 0.55
      }
    ],
    "title": {
      "en": "IPIP-VIA-R — Gratitude",
      "ru": "IPIP-VIA-R: Благодарность"
    },
    "description": {
      "en": "Published four-item research scale of gratitude; a brief descriptive snapshot, not a diagnosis, norm, or treatment target.",
      "ru": "Опубликованная краткая 4-пунктовая шкала («Благодарность»); описание, не диагноз и не нормативная оценка. Оригинальные вопросы на английском."
    }
  },
  {
    "key": "ipip-via-r-hope-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "resources",
      "mood",
      "meaning"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "emotions",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
    "testStyle": "professional",
    "testLength": "short",
    "suggestedRepeatDays": 60,
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
        "weight": 0.65
      },
      {
        "key": "resource",
        "weight": 0.55
      }
    ],
    "title": {
      "en": "IPIP-VIA-R — Hope / optimism",
      "ru": "IPIP-VIA-R: Надежда и оптимизм"
    },
    "description": {
      "en": "Published four-item research scale of hope / optimism; a brief descriptive snapshot, not a diagnosis, norm, or treatment target.",
      "ru": "Опубликованная краткая 4-пунктовая шкала («Надежда и оптимизм»); описание, не диагноз и не нормативная оценка. Оригинальные вопросы на английском."
    }
  },
  {
    "key": "ipip-via-r-humor-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "relationships",
      "mood",
      "resources"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "relationships",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
    "testStyle": "professional",
    "testLength": "short",
    "suggestedRepeatDays": 60,
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
        "weight": 0.65
      },
      {
        "key": "relationships",
        "weight": 0.65
      },
      {
        "key": "resource",
        "weight": 0.55
      }
    ],
    "title": {
      "en": "IPIP-VIA-R — Humor / playfulness",
      "ru": "IPIP-VIA-R: Юмор и игривость"
    },
    "description": {
      "en": "Published four-item research scale of humor / playfulness; a brief descriptive snapshot, not a diagnosis, norm, or treatment target.",
      "ru": "Опубликованная краткая 4-пунктовая шкала («Юмор и игривость»); описание, не диагноз и не нормативная оценка. Оригинальные вопросы на английском."
    }
  },
  {
    "key": "ipip-via-r-perseverance-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "function",
      "motivation",
      "resources"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "emotions",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
    "testStyle": "professional",
    "testLength": "short",
    "suggestedRepeatDays": 60,
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
        "weight": 0.65
      },
      {
        "key": "resource",
        "weight": 0.55
      }
    ],
    "title": {
      "en": "IPIP-VIA-R — Perseverance",
      "ru": "IPIP-VIA-R: Упорство"
    },
    "description": {
      "en": "Published four-item research scale of perseverance; a brief descriptive snapshot, not a diagnosis, norm, or treatment target.",
      "ru": "Опубликованная краткая 4-пунктовая шкала («Упорство»); описание, не диагноз и не нормативная оценка. Оригинальные вопросы на английском."
    }
  },
  {
    "key": "ipip-via-r-creativity-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "personality",
      "meaning",
      "resources"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "emotions",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
    "testStyle": "professional",
    "testLength": "short",
    "suggestedRepeatDays": 60,
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
        "weight": 0.65
      },
      {
        "key": "resource",
        "weight": 0.55
      }
    ],
    "title": {
      "en": "IPIP-VIA-R — Originality / creativity",
      "ru": "IPIP-VIA-R: Оригинальность и творчество"
    },
    "description": {
      "en": "Published four-item research scale of originality / creativity; a brief descriptive snapshot, not a diagnosis, norm, or treatment target.",
      "ru": "Опубликованная краткая 4-пунктовая шкала («Оригинальность и творчество»); описание, не диагноз и не нормативная оценка. Оригинальные вопросы на английском."
    }
  },
  {
    "key": "ipip-via-r-social-intelligence-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "relationships",
      "personality",
      "support"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "relationships",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
    "testStyle": "professional",
    "testLength": "short",
    "suggestedRepeatDays": 60,
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
        "weight": 0.65
      },
      {
        "key": "relationships",
        "weight": 0.65
      }
    ],
    "title": {
      "en": "IPIP-VIA-R — Social / emotional awareness",
      "ru": "IPIP-VIA-R: Социальная и эмоциональная чуткость"
    },
    "description": {
      "en": "Published four-item research scale of social / emotional awareness; a brief descriptive snapshot, not a diagnosis, norm, or treatment target.",
      "ru": "Опубликованная краткая 4-пунктовая шкала («Социальная и эмоциональная чуткость»); описание, не диагноз и не нормативная оценка. Оригинальные вопросы на английском."
    }
  },
  {
    "key": "ipip-via-r-zest-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "energy",
      "resources",
      "mood"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "emotions",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
    "testStyle": "professional",
    "testLength": "short",
    "suggestedRepeatDays": 60,
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
        "weight": 0.65
      },
      {
        "key": "resource",
        "weight": 0.55
      }
    ],
    "title": {
      "en": "IPIP-VIA-R — Vitality / zest",
      "ru": "IPIP-VIA-R: Живость и энтузиазм"
    },
    "description": {
      "en": "Published four-item research scale of vitality / zest; a brief descriptive snapshot, not a diagnosis, norm, or treatment target.",
      "ru": "Опубликованная краткая 4-пунктовая шкала («Живость и энтузиазм»); описание, не диагноз и не нормативная оценка. Оригинальные вопросы на английском."
    }
  },
  {
    "key": "tipi-10",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "personality",
      "relationships",
      "resources"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "emotions",
      "relationships"
    ],
    "questionCount": 10,
    "durationMinutes": 3,
    "testStyle": "professional",
    "testLength": "short",
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
      }
    ],
    "title": {
      "en": "Ten-Item Personality Inventory (TIPI)",
      "ru": "Краткая личностная шкала TIPI · EN"
    },
    "description": {
      "en": "Ten original English items estimating five broad personality tendencies. Especially brief: lower precision than longer inventories.",
      "ru": "10 английских пунктов для пяти черт личности. Очень краткая версия: точность ниже, чем у длинных опросников. Оригинальные вопросы на английском."
    }
  }
])
export const OPEN_PROFESSIONAL_INTERPRETATION_ROWS = deepFreeze([
  [
    "ipip-aspect-volatility-10",
    "personality",
    "Notice which situations bring stronger reactions and which support steadiness, without judging yourself.",
    "Отметьте, в каких ситуациях эмоции усиливаются и что помогает сохранять равновесие, без самоосуждения."
  ],
  [
    "ipip-aspect-withdrawal-10",
    "personality",
    "Compare one situation where you hesitate with another where you feel secure; notice contextual supports.",
    "Сравните ситуацию, где трудно решиться, с той, где вы ощущаете безопасность; отметьте условия поддержки."
  ],
  [
    "ipip-aspect-compassion-10",
    "personality",
    "Notice when caring for others feels natural and when protecting your own boundaries is equally important.",
    "Отметьте моменты, когда поддерживать других легко, и ситуации, где важны собственные границы."
  ],
  [
    "ipip-aspect-industriousness-10",
    "personality",
    "Choose a task with a realistic starting point and notice whether planning, rest or context helps more.",
    "Выберите посильную задачу и понаблюдайте, больше ли помогают планирование, отдых или обстоятельства."
  ],
  [
    "ipip-aspect-orderliness-10",
    "personality",
    "Notice when structure supports everyday life and when flexibility helps you relate to others.",
    "Отметьте, где порядок поддерживает вас, а где гибкость помогает в отношениях и делах."
  ],
  [
    "ipip-aspect-intellect-10",
    "personality",
    "Observe the type of learning environment that brings curiosity and a manageable level of challenge.",
    "Понаблюдайте, какая учебная обстановка поддерживает любопытство и посильный интерес к сложному."
  ],
  [
    "ipip-aspect-openness-10",
    "personality",
    "Notice which creative or reflective activity genuinely restores your interest, without forcing it.",
    "Отметьте занятия, где творчество или размышление естественно возвращают интерес, без принуждения."
  ],
  [
    "ipip-via-r-capacity-for-love-4",
    "personality",
    "Notice situations where giving or receiving warmth feels safe, and respect each person's pace and boundaries.",
    "Замечайте, где давать и принимать тепло безопасно; уважайте свой темп и границы другого."
  ],
  [
    "ipip-via-r-curiosity-4",
    "personality",
    "Try one small exploration that genuinely interests you and note how it feels, without judging your score.",
    "Попробуйте небольшое исследование интересной темы и отметьте ощущения, не оценивая себя."
  ],
  [
    "ipip-via-r-forgiveness-4",
    "personality",
    "Reflect on a boundary you wish to keep; forgiveness is optional and never requires renewed contact.",
    "Разберитесь, какую границу хотите сохранить; прощение добровольно и не требует возобновлять контакт."
  ],
  [
    "ipip-via-r-gratitude-4",
    "personality",
    "If comfortable, notice one form of support you appreciated recently; do not suppress difficult feelings.",
    "Если откликается, отметьте недавнюю поддержку; не нужно подавлять трудные чувства ради благодарности."
  ],
  [
    "ipip-via-r-hope-4",
    "personality",
    "Name one realistic next step and one source of uncertainty you can accept without forced optimism.",
    "Назовите один реальный следующий шаг и неопределённость, которую можно принять без вынужденного оптимизма."
  ],
  [
    "ipip-via-r-humor-4",
    "personality",
    "Notice when lightness helps connection and when serious feelings deserve time instead.",
    "Понаблюдайте, когда лёгкость сближает, а когда важнее дать место серьёзным чувствам."
  ],
  [
    "ipip-via-r-perseverance-4",
    "personality",
    "Separate workable persistence from overexertion; identify one task that can be broken into smaller steps.",
    "Различайте настойчивость и перенапряжение; выберите задачу, которую можно разделить на шаги."
  ],
  [
    "ipip-via-r-creativity-4",
    "personality",
    "Experiment with one low-pressure creative option and reflect on enjoyment rather than performance.",
    "Исследуйте один творческий вариант без давления и обратите внимание на удовольствие, не на результат."
  ],
  [
    "ipip-via-r-social-intelligence-4",
    "personality",
    "Notice when asking a direct question clarifies someone's feelings better than trying to guess them.",
    "Отметьте, когда прямой уважительный вопрос лучше помогает понять чувства, чем догадки."
  ],
  [
    "ipip-via-r-zest-4",
    "personality",
    "Observe when energy rises or dips across ordinary days; persistent fatigue deserves health context.",
    "Понаблюдайте, когда энергия растёт или снижается; стойкая усталость требует учёта здоровья."
  ],
  [
    "tipi-10",
    "personality",
    "Use these five broad dimensions as starting points for reflection, not labels or targets you must improve.",
    "Считайте пять черт отправной точкой для размышления, а не ярлыками или обязательными целями улучшения."
  ]
])
export const OPEN_PROFESSIONAL_DIMENSION_ROWS = deepFreeze([
  [
    "ipip-aspect-volatility-10",
    "trait.bfas.volatility",
    "personality",
    "Emotional volatility",
    "Эмоциональная реактивность",
    "Notice which situations bring stronger reactions and which support steadiness, without judging yourself.",
    "Отметьте, в каких ситуациях эмоции усиливаются и что помогает сохранять равновесие, без самоосуждения."
  ],
  [
    "ipip-aspect-withdrawal-10",
    "trait.bfas.withdrawal",
    "personality",
    "Tendency toward withdrawal",
    "Склонность к тревожному отстранению",
    "Compare one situation where you hesitate with another where you feel secure; notice contextual supports.",
    "Сравните ситуацию, где трудно решиться, с той, где вы ощущаете безопасность; отметьте условия поддержки."
  ],
  [
    "ipip-aspect-compassion-10",
    "trait.bfas.compassion",
    "personality",
    "Compassion / empathy",
    "Сочувствие и эмпатия",
    "Notice when caring for others feels natural and when protecting your own boundaries is equally important.",
    "Отметьте моменты, когда поддерживать других легко, и ситуации, где важны собственные границы."
  ],
  [
    "ipip-aspect-industriousness-10",
    "trait.bfas.industriousness",
    "personality",
    "Industriousness",
    "Настойчивость в делах",
    "Choose a task with a realistic starting point and notice whether planning, rest or context helps more.",
    "Выберите посильную задачу и понаблюдайте, больше ли помогают планирование, отдых или обстоятельства."
  ],
  [
    "ipip-aspect-orderliness-10",
    "trait.bfas.orderliness",
    "personality",
    "Orderliness",
    "Любовь к порядку",
    "Notice when structure supports everyday life and when flexibility helps you relate to others.",
    "Отметьте, где порядок поддерживает вас, а где гибкость помогает в отношениях и делах."
  ],
  [
    "ipip-aspect-intellect-10",
    "trait.bfas.intellect",
    "personality",
    "Intellectual engagement",
    "Интеллектуальная вовлечённость",
    "Observe the type of learning environment that brings curiosity and a manageable level of challenge.",
    "Понаблюдайте, какая учебная обстановка поддерживает любопытство и посильный интерес к сложному."
  ],
  [
    "ipip-aspect-openness-10",
    "trait.bfas.openness",
    "personality",
    "Openness to experience",
    "Открытость переживаниям",
    "Notice which creative or reflective activity genuinely restores your interest, without forcing it.",
    "Отметьте занятия, где творчество или размышление естественно возвращают интерес, без принуждения."
  ],
  [
    "ipip-via-r-capacity-for-love-4",
    "trait.via.capacity_for_love",
    "personality",
    "Capacity for love",
    "Способность к близости",
    "Notice situations where giving or receiving warmth feels safe, and respect each person's pace and boundaries.",
    "Замечайте, где давать и принимать тепло безопасно; уважайте свой темп и границы другого."
  ],
  [
    "ipip-via-r-curiosity-4",
    "trait.via.curiosity",
    "personality",
    "Curiosity",
    "Любознательность",
    "Try one small exploration that genuinely interests you and note how it feels, without judging your score.",
    "Попробуйте небольшое исследование интересной темы и отметьте ощущения, не оценивая себя."
  ],
  [
    "ipip-via-r-forgiveness-4",
    "trait.via.forgiveness",
    "personality",
    "Forgiveness / mercy",
    "Прощение и милосердие",
    "Reflect on a boundary you wish to keep; forgiveness is optional and never requires renewed contact.",
    "Разберитесь, какую границу хотите сохранить; прощение добровольно и не требует возобновлять контакт."
  ],
  [
    "ipip-via-r-gratitude-4",
    "trait.via.gratitude",
    "personality",
    "Gratitude",
    "Благодарность",
    "If comfortable, notice one form of support you appreciated recently; do not suppress difficult feelings.",
    "Если откликается, отметьте недавнюю поддержку; не нужно подавлять трудные чувства ради благодарности."
  ],
  [
    "ipip-via-r-hope-4",
    "trait.via.hope",
    "personality",
    "Hope / optimism",
    "Надежда и оптимизм",
    "Name one realistic next step and one source of uncertainty you can accept without forced optimism.",
    "Назовите один реальный следующий шаг и неопределённость, которую можно принять без вынужденного оптимизма."
  ],
  [
    "ipip-via-r-humor-4",
    "trait.via.humor",
    "personality",
    "Humor / playfulness",
    "Юмор и игривость",
    "Notice when lightness helps connection and when serious feelings deserve time instead.",
    "Понаблюдайте, когда лёгкость сближает, а когда важнее дать место серьёзным чувствам."
  ],
  [
    "ipip-via-r-perseverance-4",
    "trait.via.perseverance",
    "personality",
    "Perseverance",
    "Упорство",
    "Separate workable persistence from overexertion; identify one task that can be broken into smaller steps.",
    "Различайте настойчивость и перенапряжение; выберите задачу, которую можно разделить на шаги."
  ],
  [
    "ipip-via-r-creativity-4",
    "trait.via.creativity",
    "personality",
    "Originality / creativity",
    "Оригинальность и творчество",
    "Experiment with one low-pressure creative option and reflect on enjoyment rather than performance.",
    "Исследуйте один творческий вариант без давления и обратите внимание на удовольствие, не на результат."
  ],
  [
    "ipip-via-r-social-intelligence-4",
    "trait.via.social_intelligence",
    "personality",
    "Social / emotional awareness",
    "Социальная и эмоциональная чуткость",
    "Notice when asking a direct question clarifies someone's feelings better than trying to guess them.",
    "Отметьте, когда прямой уважительный вопрос лучше помогает понять чувства, чем догадки."
  ],
  [
    "ipip-via-r-zest-4",
    "trait.via.zest",
    "personality",
    "Vitality / zest",
    "Живость и энтузиазм",
    "Observe when energy rises or dips across ordinary days; persistent fatigue deserves health context.",
    "Понаблюдайте, когда энергия растёт или снижается; стойкая усталость требует учёта здоровья."
  ],
  [
    "tipi-10",
    "trait.tipi.extraversion",
    "personality",
    "Extraversion",
    "Экстраверсия",
    "Notice where interaction energizes you and where solitude helps; both preferences can be healthy.",
    "Замечайте, когда общение прибавляет сил, а когда полезнее уединение; оба варианта нормальны."
  ],
  [
    "tipi-10",
    "trait.tipi.agreeableness",
    "personality",
    "Agreeableness",
    "Доброжелательность",
    "Consider how cooperation and setting personal limits fit together in important relationships.",
    "Подумайте, как сотрудничество сочетается с личными границами в важных отношениях."
  ],
  [
    "tipi-10",
    "trait.tipi.conscientiousness",
    "personality",
    "Conscientiousness",
    "Организованность",
    "Look for routines that help with commitments without turning your day into a perfectionism test.",
    "Ищите привычки, которые поддерживают дела, не превращая день в экзамен на идеальность."
  ],
  [
    "tipi-10",
    "trait.tipi.emotional_stability",
    "personality",
    "Emotional stability",
    "Эмоциональная устойчивость",
    "Reflect on the context of emotional changes rather than treating sensitivity as a defect.",
    "Рассматривайте контекст эмоциональных перемен вместо того, чтобы считать чувствительность недостатком."
  ],
  [
    "tipi-10",
    "trait.tipi.openness",
    "personality",
    "Openness to experience",
    "Открытость опыту",
    "Notice which new activities inspire interest and where familiar approaches serve you well.",
    "Отмечайте, что новое пробуждает интерес и когда знакомые подходы полезнее."
  ]
])

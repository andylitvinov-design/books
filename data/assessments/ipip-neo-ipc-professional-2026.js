// Johnson IPIP-NEO-120 29 original four-item facets (excluding political O6) + Markey IPIP-IPC 8 original four-item octants and full original 32-item survey.
// Source-pinned public-domain English items, reviewed 2026-10-14. No diagnoses, cutoff or validated Russian questionnaire translation.
import { deepFreeze } from '../../lib/assessments/contracts.js'

export const NEW_PROFESSIONAL_NEOPIC_DEFINITIONS = deepFreeze([
  {
    "id": "93006fb2-4178-5f62-94d4-bee1f3803fb2",
    "key": "ipip-neo120-facet-n1",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet N1 — Worry sensitivity",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.n1",
          "method": "mean",
          "items": [
            "neo120.n1.01",
            "neo120.n1.02",
            "neo120.n1.03",
            "neo120.n1.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "ANXIETY (IPIP-NEO N1)",
          "direction": "non-normative",
          "reverseItems": []
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.n1.01",
        "text": "Worry about things.",
        "required": true
      },
      {
        "id": "neo120.n1.02",
        "text": "Fear for the worst.",
        "required": true
      },
      {
        "id": "neo120.n1.03",
        "text": "Am afraid of many things.",
        "required": true
      },
      {
        "id": "neo120.n1.04",
        "text": "Get stressed out easily.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:972ffeebbb65aee60cb9637ec0ec5765d0ed257692c6699e75a7856ce8732115"
  },
  {
    "id": "9c621b20-18b0-54f4-9e57-81c10a0a75ed",
    "key": "ipip-neo120-facet-n2",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet N2 — Irritability tendency",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.n2",
          "method": "mean",
          "items": [
            "neo120.n2.01",
            "neo120.n2.02",
            "neo120.n2.03",
            "neo120.n2.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "ANGER (IPIP-NEO N2)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.n2.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.n2.01",
        "text": "Get angry easily.",
        "required": true
      },
      {
        "id": "neo120.n2.02",
        "text": "Get irritated easily.",
        "required": true
      },
      {
        "id": "neo120.n2.03",
        "text": "Lose my temper.",
        "required": true
      },
      {
        "id": "neo120.n2.04",
        "text": "Am not easily annoyed.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:7e0da662a334d1106b730ac2426dbe1e4d418af654e02aaddfeddb5f1263f79f"
  },
  {
    "id": "687004ba-fce4-5d14-8647-067bafc6b692",
    "key": "ipip-neo120-facet-n3",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet N3 — Low-mood tendency",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.n3",
          "method": "mean",
          "items": [
            "neo120.n3.01",
            "neo120.n3.02",
            "neo120.n3.03",
            "neo120.n3.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "DEPRESSION (IPIP-NEO N3)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.n3.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.n3.01",
        "text": "Often feel blue.",
        "required": true
      },
      {
        "id": "neo120.n3.02",
        "text": "Dislike myself.",
        "required": true
      },
      {
        "id": "neo120.n3.03",
        "text": "Am often down in the dumps.",
        "required": true
      },
      {
        "id": "neo120.n3.04",
        "text": "Feel comfortable with myself.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:11bc9b9e538afeef13df9f9aad6aed7f70cb43d8842ee7d5a86a03da424b5c80"
  },
  {
    "id": "7cb258d7-9c4e-5a93-a919-10bded41117a",
    "key": "ipip-neo120-facet-n4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet N4 — Social self-consciousness",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.n4",
          "method": "mean",
          "items": [
            "neo120.n4.01",
            "neo120.n4.02",
            "neo120.n4.03",
            "neo120.n4.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "SELF-CONSCIOUSNESS (IPIP-NEO N4)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.n4.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.n4.01",
        "text": "Find it difficult to approach others.",
        "required": true
      },
      {
        "id": "neo120.n4.02",
        "text": "Am afraid to draw attention to myself.",
        "required": true
      },
      {
        "id": "neo120.n4.03",
        "text": "Only feel comfortable with friends.",
        "required": true
      },
      {
        "id": "neo120.n4.04",
        "text": "Am not bothered by difficult social situations.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:6409a008890654a8f00d157ca9e2673de1bba78f0cfe6ea0cd462a4aa885b06a"
  },
  {
    "id": "fd507b01-50da-5fb8-981c-b73a18756cfd",
    "key": "ipip-neo120-facet-n5",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet N5 — Impulse and indulgence tendency",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.n5",
          "method": "mean",
          "items": [
            "neo120.n5.01",
            "neo120.n5.02",
            "neo120.n5.03",
            "neo120.n5.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "IMMODERATION (IPIP-NEO N5)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.n5.02",
            "neo120.n5.03",
            "neo120.n5.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.n5.01",
        "text": "Go on binges.",
        "required": true
      },
      {
        "id": "neo120.n5.02",
        "text": "Rarely overindulge.",
        "required": true
      },
      {
        "id": "neo120.n5.03",
        "text": "Easily resist temptations.",
        "required": true
      },
      {
        "id": "neo120.n5.04",
        "text": "Am able to control my cravings.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:d852f02e0e7b3c34fe32b1912e91564c8a0409c79c3d59a85b6a4d56a54b6d30"
  },
  {
    "id": "722b90fe-6d5c-5fc3-8068-2b17e148e86e",
    "key": "ipip-neo120-facet-n6",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet N6 — Stress vulnerability tendency",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.n6",
          "method": "mean",
          "items": [
            "neo120.n6.01",
            "neo120.n6.02",
            "neo120.n6.03",
            "neo120.n6.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "VULNERABILITY (IPIP-NEO N6)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.n6.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.n6.01",
        "text": "Panic easily.",
        "required": true
      },
      {
        "id": "neo120.n6.02",
        "text": "Become overwhelmed by events.",
        "required": true
      },
      {
        "id": "neo120.n6.03",
        "text": "Feel that I'm unable to deal with things.",
        "required": true
      },
      {
        "id": "neo120.n6.04",
        "text": "Remain calm under pressure.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:6591feb4290498c30ecb51f8eb2f007a24c5708fd32072c970902334511563f4"
  },
  {
    "id": "16d8a8a2-be2d-52f2-8178-fea41167a758",
    "key": "ipip-neo120-facet-e1",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet E1 — Interpersonal friendliness",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.e1",
          "method": "mean",
          "items": [
            "neo120.e1.01",
            "neo120.e1.02",
            "neo120.e1.03",
            "neo120.e1.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "FRIENDLINESS (IPIP-NEO E1)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.e1.03",
            "neo120.e1.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.e1.01",
        "text": "Make friends easily.",
        "required": true
      },
      {
        "id": "neo120.e1.02",
        "text": "Feel comfortable around people.",
        "required": true
      },
      {
        "id": "neo120.e1.03",
        "text": "Avoid contacts with others.",
        "required": true
      },
      {
        "id": "neo120.e1.04",
        "text": "Keep others at a distance.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:a03dad82ff58e448b4b56949f0a959fc2d35e25676798e62c89a5a6a3300080d"
  },
  {
    "id": "9c8c3652-700d-5e73-9f04-733c1c8c15c3",
    "key": "ipip-neo120-facet-e2",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet E2 — Preference for social groups",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.e2",
          "method": "mean",
          "items": [
            "neo120.e2.01",
            "neo120.e2.02",
            "neo120.e2.03",
            "neo120.e2.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "GREGARIOUSNESS (IPIP-NEO E2)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.e2.03",
            "neo120.e2.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.e2.01",
        "text": "Love large parties.",
        "required": true
      },
      {
        "id": "neo120.e2.02",
        "text": "Talk to a lot of different people at parties.",
        "required": true
      },
      {
        "id": "neo120.e2.03",
        "text": "Prefer to be alone.",
        "required": true
      },
      {
        "id": "neo120.e2.04",
        "text": "Avoid crowds.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:e1171f1a921205f9e4df5191eb6b3f3c39bdd6c2e91c4e15b9406b70de290f7c"
  },
  {
    "id": "934ed888-9d8a-5bf8-8fe1-7ac80a1af636",
    "key": "ipip-neo120-facet-e3",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet E3 — Assertiveness",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.e3",
          "method": "mean",
          "items": [
            "neo120.e3.01",
            "neo120.e3.02",
            "neo120.e3.03",
            "neo120.e3.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "ASSERTIVENESS (IPIP-NEO E3)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.e3.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.e3.01",
        "text": "Take charge.",
        "required": true
      },
      {
        "id": "neo120.e3.02",
        "text": "Try to lead others.",
        "required": true
      },
      {
        "id": "neo120.e3.03",
        "text": "Take control of things.",
        "required": true
      },
      {
        "id": "neo120.e3.04",
        "text": "Wait for others to lead the way.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:6f1a1dc060c1b6b92b33010177a30cf7448912185ee9f1fad22d8261ebdecb83"
  },
  {
    "id": "635485e1-dcec-5406-b623-14ad1d9919e3",
    "key": "ipip-neo120-facet-e4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet E4 — Activity pace",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.e4",
          "method": "mean",
          "items": [
            "neo120.e4.01",
            "neo120.e4.02",
            "neo120.e4.03",
            "neo120.e4.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "ACTIVITY LEVEL (IPIP-NEO E4)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.e4.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.e4.01",
        "text": "Am always busy.",
        "required": true
      },
      {
        "id": "neo120.e4.02",
        "text": "Am always on the go.",
        "required": true
      },
      {
        "id": "neo120.e4.03",
        "text": "Do a lot in my spare time.",
        "required": true
      },
      {
        "id": "neo120.e4.04",
        "text": "Like to take it easy.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:304f26f6a068cb744f67d98775334fd493f1b849831072b88762898d1901dd1a"
  },
  {
    "id": "598aa828-ff1b-51d8-a8cb-b00922bed6ae",
    "key": "ipip-neo120-facet-e5",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet E5 — Excitement seeking",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.e5",
          "method": "mean",
          "items": [
            "neo120.e5.01",
            "neo120.e5.02",
            "neo120.e5.03",
            "neo120.e5.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "EXCITEMENT-SEEKING (IPIP-NEO E5)",
          "direction": "non-normative",
          "reverseItems": []
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.e5.01",
        "text": "Love excitement.",
        "required": true
      },
      {
        "id": "neo120.e5.02",
        "text": "Seek adventure.",
        "required": true
      },
      {
        "id": "neo120.e5.03",
        "text": "Enjoy being reckless.",
        "required": true
      },
      {
        "id": "neo120.e5.04",
        "text": "Act wild and crazy.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:443bc7018bd6591054d06a48b116d5a20dd21e644ad27428a43e0596ed99d473"
  },
  {
    "id": "abf140eb-a78b-568a-b8b4-6cfc5a13dd84",
    "key": "ipip-neo120-facet-e6",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet E6 — Cheerfulness tendency",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.e6",
          "method": "mean",
          "items": [
            "neo120.e6.01",
            "neo120.e6.02",
            "neo120.e6.03",
            "neo120.e6.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "CHEERFULNESS (IPIP-NEO E6)",
          "direction": "non-normative",
          "reverseItems": []
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.e6.01",
        "text": "Radiate joy.",
        "required": true
      },
      {
        "id": "neo120.e6.02",
        "text": "Have a lot of fun.",
        "required": true
      },
      {
        "id": "neo120.e6.03",
        "text": "Love life.",
        "required": true
      },
      {
        "id": "neo120.e6.04",
        "text": "Look at the bright side of life.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:8d15e8db0aaedd0b023c1eb986ccffa376356f46155e75157756ee216c2cdca5"
  },
  {
    "id": "06ef6e52-6bad-59cb-a8ef-6657084dc52e",
    "key": "ipip-neo120-facet-o1",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet O1 — Imagination",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.o1",
          "method": "mean",
          "items": [
            "neo120.o1.01",
            "neo120.o1.02",
            "neo120.o1.03",
            "neo120.o1.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "IMAGINATION (IPIP-NEO O1)",
          "direction": "non-normative",
          "reverseItems": []
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.o1.01",
        "text": "Have a vivid imagination.",
        "required": true
      },
      {
        "id": "neo120.o1.02",
        "text": "Enjoy wild flights of fantasy.",
        "required": true
      },
      {
        "id": "neo120.o1.03",
        "text": "Love to daydream.",
        "required": true
      },
      {
        "id": "neo120.o1.04",
        "text": "Like to get lost in thought.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:767d0d72f1ffc911f45b275420327eec062fe2da1e35f6783525bd3777599ad8"
  },
  {
    "id": "45880714-4b12-5be4-bfb9-e8179c593bd6",
    "key": "ipip-neo120-facet-o2",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet O2 — Artistic interests",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.o2",
          "method": "mean",
          "items": [
            "neo120.o2.01",
            "neo120.o2.02",
            "neo120.o2.03",
            "neo120.o2.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "ARTISTIC INTERESTS (IPIP-NEO O2)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.o2.03",
            "neo120.o2.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.o2.01",
        "text": "Believe in the importance of art.",
        "required": true
      },
      {
        "id": "neo120.o2.02",
        "text": "See beauty in things that others might not notice.",
        "required": true
      },
      {
        "id": "neo120.o2.03",
        "text": "Do not like poetry.",
        "required": true
      },
      {
        "id": "neo120.o2.04",
        "text": "Do not enjoy going to art museums.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:05811679a4e01fb2d1af4da73d21987298f41a652a3166068684163bdeb8c037"
  },
  {
    "id": "8a87aa80-df95-5573-96f8-89c53c0e9f5e",
    "key": "ipip-neo120-facet-o3",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet O3 — Emotional awareness",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.o3",
          "method": "mean",
          "items": [
            "neo120.o3.01",
            "neo120.o3.02",
            "neo120.o3.03",
            "neo120.o3.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "EMOTIONALITY (IPIP-NEO O3)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.o3.03",
            "neo120.o3.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.o3.01",
        "text": "Experience my emotions intensely.",
        "required": true
      },
      {
        "id": "neo120.o3.02",
        "text": "Feel others' emotions.",
        "required": true
      },
      {
        "id": "neo120.o3.03",
        "text": "Rarely notice my emotional reactions.",
        "required": true
      },
      {
        "id": "neo120.o3.04",
        "text": "Don't understand people who get emotional.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:a52f5dbbc18abe6ec819ff33bfff97f2573664721c4b0cc37697d6c4b629e6b7"
  },
  {
    "id": "b1fac935-05f7-583b-840a-77d283dec5a2",
    "key": "ipip-neo120-facet-o4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet O4 — Openness to variety",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.o4",
          "method": "mean",
          "items": [
            "neo120.o4.01",
            "neo120.o4.02",
            "neo120.o4.03",
            "neo120.o4.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "ADVENTUROUSNESS (IPIP-NEO O4)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.o4.02",
            "neo120.o4.03",
            "neo120.o4.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.o4.01",
        "text": "Prefer variety to routine.",
        "required": true
      },
      {
        "id": "neo120.o4.02",
        "text": "Prefer to stick with things that I know.",
        "required": true
      },
      {
        "id": "neo120.o4.03",
        "text": "Dislike changes.",
        "required": true
      },
      {
        "id": "neo120.o4.04",
        "text": "Am attached to conventional ways.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:f21fb3fa22e5ea01b4c8e33b7e0b03dc3f8f838ee6910d5c405abb06091a4f14"
  },
  {
    "id": "d7edb8e5-5d76-531b-a2f8-41fb72c53bb1",
    "key": "ipip-neo120-facet-o5",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet O5 — Intellectual curiosity",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.o5",
          "method": "mean",
          "items": [
            "neo120.o5.01",
            "neo120.o5.02",
            "neo120.o5.03",
            "neo120.o5.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "INTELLECT (IPIP-NEO O5)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.o5.02",
            "neo120.o5.03",
            "neo120.o5.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.o5.01",
        "text": "Love to read challenging material.",
        "required": true
      },
      {
        "id": "neo120.o5.02",
        "text": "Avoid philosophical discussions.",
        "required": true
      },
      {
        "id": "neo120.o5.03",
        "text": "Have difficulty understanding abstract ideas.",
        "required": true
      },
      {
        "id": "neo120.o5.04",
        "text": "Am not interested in theoretical discussions.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:1d9f32ffebff144fffee0732df1918fda1bc4f9e680c629eab924a1a64ddf7a4"
  },
  {
    "id": "7b223f06-77e4-53f5-945e-595da4cb10f7",
    "key": "ipip-neo120-facet-a1",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet A1 — Interpersonal trust",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.a1",
          "method": "mean",
          "items": [
            "neo120.a1.01",
            "neo120.a1.02",
            "neo120.a1.03",
            "neo120.a1.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "TRUST (IPIP-NEO A1)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.a1.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.a1.01",
        "text": "Trust others.",
        "required": true
      },
      {
        "id": "neo120.a1.02",
        "text": "Believe that others have good intentions.",
        "required": true
      },
      {
        "id": "neo120.a1.03",
        "text": "Trust what people say.",
        "required": true
      },
      {
        "id": "neo120.a1.04",
        "text": "Distrust people.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:bcdcdd1e9e240c6d39946bf50b5244aaa4d56cbf8145cc1e26fe80934b9af444"
  },
  {
    "id": "6ce96c8b-1793-598b-902e-be3efd0a902b",
    "key": "ipip-neo120-facet-a2",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet A2 — Straightforwardness",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.a2",
          "method": "mean",
          "items": [
            "neo120.a2.01",
            "neo120.a2.02",
            "neo120.a2.03",
            "neo120.a2.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "MORALITY (IPIP-NEO A2)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.a2.01",
            "neo120.a2.02",
            "neo120.a2.03",
            "neo120.a2.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.a2.01",
        "text": "Use others for my own ends.",
        "required": true
      },
      {
        "id": "neo120.a2.02",
        "text": "Cheat to get ahead.",
        "required": true
      },
      {
        "id": "neo120.a2.03",
        "text": "Take advantage of others.",
        "required": true
      },
      {
        "id": "neo120.a2.04",
        "text": "Obstruct others' plans.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:dea22e9ea9ce1eb1c18276f3d46586f1133d9d988bc7814aa8c1f4b3e0711e0b"
  },
  {
    "id": "034ad018-b60d-5b2c-a6ce-e2814bf40be1",
    "key": "ipip-neo120-facet-a3",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet A3 — Altruism",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.a3",
          "method": "mean",
          "items": [
            "neo120.a3.01",
            "neo120.a3.02",
            "neo120.a3.03",
            "neo120.a3.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "ALTRUISM (IPIP-NEO A3)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.a3.03",
            "neo120.a3.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.a3.01",
        "text": "Am concerned about others.",
        "required": true
      },
      {
        "id": "neo120.a3.02",
        "text": "Love to help others.",
        "required": true
      },
      {
        "id": "neo120.a3.03",
        "text": "Am indifferent to the feelings of others.",
        "required": true
      },
      {
        "id": "neo120.a3.04",
        "text": "Take no time for others.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:a5ca572aa0c98231ed7cec50479ed58fecd3f2e4262636f71031f81ad5a1da89"
  },
  {
    "id": "547658fe-b0d6-519f-8e02-b9f824731083",
    "key": "ipip-neo120-facet-a4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet A4 — Cooperation",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.a4",
          "method": "mean",
          "items": [
            "neo120.a4.01",
            "neo120.a4.02",
            "neo120.a4.03",
            "neo120.a4.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "COOPERATION (IPIP-NEO A4)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.a4.01",
            "neo120.a4.02",
            "neo120.a4.03",
            "neo120.a4.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.a4.01",
        "text": "Love a good fight.",
        "required": true
      },
      {
        "id": "neo120.a4.02",
        "text": "Yell at people.",
        "required": true
      },
      {
        "id": "neo120.a4.03",
        "text": "Insult people.",
        "required": true
      },
      {
        "id": "neo120.a4.04",
        "text": "Get back at others.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:ad864f5a18461a02d193279e65f86cbae045ac4e513b6d3c4f3e9d9c9968b996"
  },
  {
    "id": "2309900e-1cfe-589d-8896-1be877ff8b3e",
    "key": "ipip-neo120-facet-a5",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet A5 — Modesty",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.a5",
          "method": "mean",
          "items": [
            "neo120.a5.01",
            "neo120.a5.02",
            "neo120.a5.03",
            "neo120.a5.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "MODESTY (IPIP-NEO A5)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.a5.01",
            "neo120.a5.02",
            "neo120.a5.03",
            "neo120.a5.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.a5.01",
        "text": "Believe that I am better than others.",
        "required": true
      },
      {
        "id": "neo120.a5.02",
        "text": "Think highly of myself.",
        "required": true
      },
      {
        "id": "neo120.a5.03",
        "text": "Have a high opinion of myself.",
        "required": true
      },
      {
        "id": "neo120.a5.04",
        "text": "Boast about my virtues.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:d62c0188d889277e1b5c8bfd94c8bac3cecc405aea2a94a2fa7d39c5248e68cd"
  },
  {
    "id": "d67f8556-e3b6-582f-9c77-f2628f9f58ad",
    "key": "ipip-neo120-facet-a6",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet A6 — Sympathy",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.a6",
          "method": "mean",
          "items": [
            "neo120.a6.01",
            "neo120.a6.02",
            "neo120.a6.03",
            "neo120.a6.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "SYMPATHY (IPIP-NEO A6)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.a6.03",
            "neo120.a6.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.a6.01",
        "text": "Sympathize with the homeless.",
        "required": true
      },
      {
        "id": "neo120.a6.02",
        "text": "Feel sympathy for those who are worse off than myself.",
        "required": true
      },
      {
        "id": "neo120.a6.03",
        "text": "Am not interested in other people's problems.",
        "required": true
      },
      {
        "id": "neo120.a6.04",
        "text": "Try not to think about the needy.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:15e0c5475affdc25a83c8effa90c4db69b7dc2759694b785e870482e075884fb"
  },
  {
    "id": "fdf55d58-fb82-5620-8610-f453f5d0ef47",
    "key": "ipip-neo120-facet-c1",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet C1 — Self-efficacy",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.c1",
          "method": "mean",
          "items": [
            "neo120.c1.01",
            "neo120.c1.02",
            "neo120.c1.03",
            "neo120.c1.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "SELF-EFFICACY (IPIP-NEO C1)",
          "direction": "non-normative",
          "reverseItems": []
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.c1.01",
        "text": "Complete tasks successfully.",
        "required": true
      },
      {
        "id": "neo120.c1.02",
        "text": "Excel in what I do.",
        "required": true
      },
      {
        "id": "neo120.c1.03",
        "text": "Handle tasks smoothly.",
        "required": true
      },
      {
        "id": "neo120.c1.04",
        "text": "Know how to get things done.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:cce076489742783ffc04437fb29b9d457b5586f7e98e030fd413455805578020"
  },
  {
    "id": "46880d3c-a08d-50bd-8e0a-f7c3dedb9981",
    "key": "ipip-neo120-facet-c2",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet C2 — Orderliness",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.c2",
          "method": "mean",
          "items": [
            "neo120.c2.01",
            "neo120.c2.02",
            "neo120.c2.03",
            "neo120.c2.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "ORDERLINESS (IPIP-NEO C2)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.c2.02",
            "neo120.c2.03",
            "neo120.c2.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.c2.01",
        "text": "Like to tidy up.",
        "required": true
      },
      {
        "id": "neo120.c2.02",
        "text": "Often forget to put things back in their proper place.",
        "required": true
      },
      {
        "id": "neo120.c2.03",
        "text": "Leave a mess in my room.",
        "required": true
      },
      {
        "id": "neo120.c2.04",
        "text": "Leave my belongings around.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:9c1910e7ab25c6ff1a5bf15ef2ff81ce63aefe5c2eb0ce4497724a277e232f64"
  },
  {
    "id": "6f157d57-f1cc-5490-b234-08a00f650c6c",
    "key": "ipip-neo120-facet-c3",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet C3 — Dutifulness",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.c3",
          "method": "mean",
          "items": [
            "neo120.c3.01",
            "neo120.c3.02",
            "neo120.c3.03",
            "neo120.c3.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "DUTIFULNESS (IPIP-NEO C3)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.c3.03",
            "neo120.c3.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.c3.01",
        "text": "Keep my promises.",
        "required": true
      },
      {
        "id": "neo120.c3.02",
        "text": "Tell the truth.",
        "required": true
      },
      {
        "id": "neo120.c3.03",
        "text": "Break rules.",
        "required": true
      },
      {
        "id": "neo120.c3.04",
        "text": "Break my promises.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:6f96512072d75005b6972b4d4570dc4d855229d2d0dfd0cb461d73f60c88d1e7"
  },
  {
    "id": "9095250c-1369-5d9e-8c0d-9960603c1476",
    "key": "ipip-neo120-facet-c4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet C4 — Achievement striving",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.c4",
          "method": "mean",
          "items": [
            "neo120.c4.01",
            "neo120.c4.02",
            "neo120.c4.03",
            "neo120.c4.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "ACHIEVEMENT-STRIVING (IPIP-NEO C4)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.c4.03",
            "neo120.c4.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.c4.01",
        "text": "Do more than what's expected of me.",
        "required": true
      },
      {
        "id": "neo120.c4.02",
        "text": "Work hard.",
        "required": true
      },
      {
        "id": "neo120.c4.03",
        "text": "Put little time and effort into my work.",
        "required": true
      },
      {
        "id": "neo120.c4.04",
        "text": "Do just enough work to get by.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:fcb0235cc796ddcec430e52bc107f3f8d23c404b2d503a86c93559d2b6679ce7"
  },
  {
    "id": "f11ba4a9-c64f-55ae-a7c1-455797eb3895",
    "key": "ipip-neo120-facet-c5",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet C5 — Self-discipline",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.c5",
          "method": "mean",
          "items": [
            "neo120.c5.01",
            "neo120.c5.02",
            "neo120.c5.03",
            "neo120.c5.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "SELF-DISCIPLINE (IPIP-NEO C5)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.c5.03",
            "neo120.c5.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.c5.01",
        "text": "Am always prepared.",
        "required": true
      },
      {
        "id": "neo120.c5.02",
        "text": "Carry out my plans.",
        "required": true
      },
      {
        "id": "neo120.c5.03",
        "text": "Waste my time.",
        "required": true
      },
      {
        "id": "neo120.c5.04",
        "text": "Have difficulty starting tasks.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:06578cf62bd1a940531a946a381159a6a407a73f1fecefa0552870b4c897a24a"
  },
  {
    "id": "fae726b9-ba57-54bd-9e12-3e6d4af02712",
    "key": "ipip-neo120-facet-c6",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-NEO facet C6 — Cautiousness",
    "source": {
      "title": "Johnson (2014) IPIP-NEO-120 four-item facet keys",
      "url": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "scoringUrl": "https://ipip.ori.org/30FacetNEO-PI-RItems.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Only a published four-item IPIP-NEO personality facet, not a complete IPIP-NEO-120 battery, and not the proprietary NEO-PI-R. Excludes O6 political preference facet entirely. Descriptive trait mean, no clinical screen/threshold, diagnostic use or norms."
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
          "key": "trait.ipipneo120.facet.c6",
          "method": "mean",
          "items": [
            "neo120.c6.01",
            "neo120.c6.02",
            "neo120.c6.03",
            "neo120.c6.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "CAUTIOUSNESS (IPIP-NEO C6)",
          "direction": "non-normative",
          "reverseItems": [
            "neo120.c6.01",
            "neo120.c6.02",
            "neo120.c6.03",
            "neo120.c6.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "neo120.c6.01",
        "text": "Jump into things without thinking.",
        "required": true
      },
      {
        "id": "neo120.c6.02",
        "text": "Make rash decisions.",
        "required": true
      },
      {
        "id": "neo120.c6.03",
        "text": "Rush into things.",
        "required": true
      },
      {
        "id": "neo120.c6.04",
        "text": "Act without thinking.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:ecf999e6ee6dc9706b3c09472669ddfe84a72e832bfaa013c517ff81ffef2237"
  },
  {
    "id": "c7876a4e-2b14-52b2-91c1-cebf8983bad4",
    "key": "ipip-ipc-pa-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-IPC PA — Assured-Dominant",
    "source": {
      "title": "Markey and Markey (2009) IPIP-IPC original survey and octant keys",
      "url": "https://ipip.ori.org/newIPIP-IPCScoringKey.htm",
      "scoringUrl": "https://ipip.ori.org/newIPIP-IPCScoringKey.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Markey, P. M., & Markey, C. N. (2009). A brief assessment of the interpersonal circumplex: The IPIP-IPC. Assessment, 16, 352–361.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Published IPIP-IPC original English interpersonal-behavior items; eight non-normative octant means. Not a clinical Inventory of Interpersonal Problems, therapy diagnosis or ranking."
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
          "key": "trait.ipipipc.pa",
          "method": "mean",
          "items": [
            "ipc.pa.06",
            "ipc.pa.14",
            "ipc.pa.22",
            "ipc.pa.30"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Assured-Dominant (PA)",
          "direction": "non-normative",
          "reverseItems": []
        }
      ]
    },
    "questions": [
      {
        "id": "ipc.pa.06",
        "text": "Demand to be the center of interest",
        "required": true
      },
      {
        "id": "ipc.pa.14",
        "text": "Do most of the talking",
        "required": true
      },
      {
        "id": "ipc.pa.22",
        "text": "Speak loudly",
        "required": true
      },
      {
        "id": "ipc.pa.30",
        "text": "Demand attention",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:99654beb91c3c1d4a1fb11fdff8a4b4d22fecdc56c3251631690f437318afe6a"
  },
  {
    "id": "c6c3a352-05b7-5c12-a836-a0d06051d537",
    "key": "ipip-ipc-bc-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-IPC BC — Arrogant-Calculating",
    "source": {
      "title": "Markey and Markey (2009) IPIP-IPC original survey and octant keys",
      "url": "https://ipip.ori.org/newIPIP-IPCScoringKey.htm",
      "scoringUrl": "https://ipip.ori.org/newIPIP-IPCScoringKey.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Markey, P. M., & Markey, C. N. (2009). A brief assessment of the interpersonal circumplex: The IPIP-IPC. Assessment, 16, 352–361.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Published IPIP-IPC original English interpersonal-behavior items; eight non-normative octant means. Not a clinical Inventory of Interpersonal Problems, therapy diagnosis or ranking."
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
          "key": "trait.ipipipc.bc",
          "method": "mean",
          "items": [
            "ipc.bc.07",
            "ipc.bc.15",
            "ipc.bc.23",
            "ipc.bc.31"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Arrogant-Calculating (BC)",
          "direction": "non-normative",
          "reverseItems": []
        }
      ]
    },
    "questions": [
      {
        "id": "ipc.bc.07",
        "text": "Cut others to pieces",
        "required": true
      },
      {
        "id": "ipc.bc.15",
        "text": "Contradict others",
        "required": true
      },
      {
        "id": "ipc.bc.23",
        "text": "Snap at people",
        "required": true
      },
      {
        "id": "ipc.bc.31",
        "text": "Have a sharp tongue",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:07d25aa641e115e98f139cdd7304219131831264eecded6356b6e28b671eba40"
  },
  {
    "id": "ccbc11bb-a206-5414-acdf-ebe7645d9a40",
    "key": "ipip-ipc-de-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-IPC DE — Cold-Hearted",
    "source": {
      "title": "Markey and Markey (2009) IPIP-IPC original survey and octant keys",
      "url": "https://ipip.ori.org/newIPIP-IPCScoringKey.htm",
      "scoringUrl": "https://ipip.ori.org/newIPIP-IPCScoringKey.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Markey, P. M., & Markey, C. N. (2009). A brief assessment of the interpersonal circumplex: The IPIP-IPC. Assessment, 16, 352–361.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Published IPIP-IPC original English interpersonal-behavior items; eight non-normative octant means. Not a clinical Inventory of Interpersonal Problems, therapy diagnosis or ranking."
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
          "key": "trait.ipipipc.de",
          "method": "mean",
          "items": [
            "ipc.de.08",
            "ipc.de.16",
            "ipc.de.24",
            "ipc.de.32"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Cold-Hearted (DE)",
          "direction": "non-normative",
          "reverseItems": []
        }
      ]
    },
    "questions": [
      {
        "id": "ipc.de.08",
        "text": "Believe people should fend for themselves",
        "required": true
      },
      {
        "id": "ipc.de.16",
        "text": "Don't fall for sob-stories",
        "required": true
      },
      {
        "id": "ipc.de.24",
        "text": "Don't put a lot of thought into things",
        "required": true
      },
      {
        "id": "ipc.de.32",
        "text": "Am not interested in other people's problems",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:3b25ae0ecbf2f2b561fa2b1c7f0779e48b87a75a0611e02aa40c30fcb5a22490"
  },
  {
    "id": "8cc6258c-c24e-513e-b43b-f218bc58e02d",
    "key": "ipip-ipc-fg-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-IPC FG — Aloof-Introverted",
    "source": {
      "title": "Markey and Markey (2009) IPIP-IPC original survey and octant keys",
      "url": "https://ipip.ori.org/newIPIP-IPCScoringKey.htm",
      "scoringUrl": "https://ipip.ori.org/newIPIP-IPCScoringKey.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Markey, P. M., & Markey, C. N. (2009). A brief assessment of the interpersonal circumplex: The IPIP-IPC. Assessment, 16, 352–361.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Published IPIP-IPC original English interpersonal-behavior items; eight non-normative octant means. Not a clinical Inventory of Interpersonal Problems, therapy diagnosis or ranking."
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
          "key": "trait.ipipipc.fg",
          "method": "mean",
          "items": [
            "ipc.fg.01",
            "ipc.fg.09",
            "ipc.fg.17",
            "ipc.fg.25"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Aloof-Introverted (FG)",
          "direction": "non-normative",
          "reverseItems": []
        }
      ]
    },
    "questions": [
      {
        "id": "ipc.fg.01",
        "text": "Am quiet around strangers",
        "required": true
      },
      {
        "id": "ipc.fg.09",
        "text": "Am a very private person",
        "required": true
      },
      {
        "id": "ipc.fg.17",
        "text": "Don't talk a lot",
        "required": true
      },
      {
        "id": "ipc.fg.25",
        "text": "Have little to say",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:0d07c61410afca059c75b649234a46ec611fe7b8ba91d2b527f063b9fed2b59d"
  },
  {
    "id": "e86c9411-5188-5084-ba77-f78c25c883d9",
    "key": "ipip-ipc-hi-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-IPC HI — Unassured-Submissive",
    "source": {
      "title": "Markey and Markey (2009) IPIP-IPC original survey and octant keys",
      "url": "https://ipip.ori.org/newIPIP-IPCScoringKey.htm",
      "scoringUrl": "https://ipip.ori.org/newIPIP-IPCScoringKey.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Markey, P. M., & Markey, C. N. (2009). A brief assessment of the interpersonal circumplex: The IPIP-IPC. Assessment, 16, 352–361.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Published IPIP-IPC original English interpersonal-behavior items; eight non-normative octant means. Not a clinical Inventory of Interpersonal Problems, therapy diagnosis or ranking."
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
          "key": "trait.ipipipc.hi",
          "method": "mean",
          "items": [
            "ipc.hi.02",
            "ipc.hi.10",
            "ipc.hi.18",
            "ipc.hi.26"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Unassured-Submissive (HI)",
          "direction": "non-normative",
          "reverseItems": []
        }
      ]
    },
    "questions": [
      {
        "id": "ipc.hi.02",
        "text": "Speak softly",
        "required": true
      },
      {
        "id": "ipc.hi.10",
        "text": "Let others finish what they are saying",
        "required": true
      },
      {
        "id": "ipc.hi.18",
        "text": "Seldom toot my own horn",
        "required": true
      },
      {
        "id": "ipc.hi.26",
        "text": "Dislike being the center of attention",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:1028ade7ec083d8a84728ae9d1fe1b8826012149a80872fdee42971b440df21c"
  },
  {
    "id": "d1a989a5-ce0f-583f-83f8-0c945900d9be",
    "key": "ipip-ipc-jk-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-IPC JK — Unassuming-Ingenuous",
    "source": {
      "title": "Markey and Markey (2009) IPIP-IPC original survey and octant keys",
      "url": "https://ipip.ori.org/newIPIP-IPCScoringKey.htm",
      "scoringUrl": "https://ipip.ori.org/newIPIP-IPCScoringKey.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Markey, P. M., & Markey, C. N. (2009). A brief assessment of the interpersonal circumplex: The IPIP-IPC. Assessment, 16, 352–361.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Published IPIP-IPC original English interpersonal-behavior items; eight non-normative octant means. Not a clinical Inventory of Interpersonal Problems, therapy diagnosis or ranking."
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
          "key": "trait.ipipipc.jk",
          "method": "mean",
          "items": [
            "ipc.jk.03",
            "ipc.jk.11",
            "ipc.jk.19",
            "ipc.jk.27"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Unassuming-Ingenuous (JK)",
          "direction": "non-normative",
          "reverseItems": []
        }
      ]
    },
    "questions": [
      {
        "id": "ipc.jk.03",
        "text": "Tolerate a lot from others",
        "required": true
      },
      {
        "id": "ipc.jk.11",
        "text": "Take things as they come",
        "required": true
      },
      {
        "id": "ipc.jk.19",
        "text": "Think of others first",
        "required": true
      },
      {
        "id": "ipc.jk.27",
        "text": "Seldom stretch the truth",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:bfa78c7163553275c7768f1b9d4b9c0534458fa18415c743fb7234169b53d7f5"
  },
  {
    "id": "9e7e7e9d-9df2-53d4-8017-f8a9bd86b709",
    "key": "ipip-ipc-lm-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-IPC LM — Warm-Agreeable",
    "source": {
      "title": "Markey and Markey (2009) IPIP-IPC original survey and octant keys",
      "url": "https://ipip.ori.org/newIPIP-IPCScoringKey.htm",
      "scoringUrl": "https://ipip.ori.org/newIPIP-IPCScoringKey.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Markey, P. M., & Markey, C. N. (2009). A brief assessment of the interpersonal circumplex: The IPIP-IPC. Assessment, 16, 352–361.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Published IPIP-IPC original English interpersonal-behavior items; eight non-normative octant means. Not a clinical Inventory of Interpersonal Problems, therapy diagnosis or ranking."
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
          "key": "trait.ipipipc.lm",
          "method": "mean",
          "items": [
            "ipc.lm.04",
            "ipc.lm.12",
            "ipc.lm.20",
            "ipc.lm.28"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Warm-Agreeable (LM)",
          "direction": "non-normative",
          "reverseItems": []
        }
      ]
    },
    "questions": [
      {
        "id": "ipc.lm.04",
        "text": "Am interested in people",
        "required": true
      },
      {
        "id": "ipc.lm.12",
        "text": "Reassure others",
        "required": true
      },
      {
        "id": "ipc.lm.20",
        "text": "Inquire about others' well-being",
        "required": true
      },
      {
        "id": "ipc.lm.28",
        "text": "Get along well with others",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:8deb7ed818d0ba2e5ac6a92a271d5c8351db36ef96a84c2279fdd72b91cb7303"
  },
  {
    "id": "1738d0e7-c23a-5948-bb64-e8cbbcab8b7c",
    "key": "ipip-ipc-no-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-IPC NO — Gregarious-Extraverted",
    "source": {
      "title": "Markey and Markey (2009) IPIP-IPC original survey and octant keys",
      "url": "https://ipip.ori.org/newIPIP-IPCScoringKey.htm",
      "scoringUrl": "https://ipip.ori.org/newIPIP-IPCScoringKey.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Markey, P. M., & Markey, C. N. (2009). A brief assessment of the interpersonal circumplex: The IPIP-IPC. Assessment, 16, 352–361.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Published IPIP-IPC original English interpersonal-behavior items; eight non-normative octant means. Not a clinical Inventory of Interpersonal Problems, therapy diagnosis or ranking."
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
          "key": "trait.ipipipc.no",
          "method": "mean",
          "items": [
            "ipc.no.05",
            "ipc.no.13",
            "ipc.no.21",
            "ipc.no.29"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Gregarious-Extraverted (NO)",
          "direction": "non-normative",
          "reverseItems": []
        }
      ]
    },
    "questions": [
      {
        "id": "ipc.no.05",
        "text": "Feel comfortable around people",
        "required": true
      },
      {
        "id": "ipc.no.13",
        "text": "Start conversations",
        "required": true
      },
      {
        "id": "ipc.no.21",
        "text": "Talk to a lot of different people at parties",
        "required": true
      },
      {
        "id": "ipc.no.29",
        "text": "Love large parties",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:26da336f543bef0257c8e644d5b7c1f0ca7b7f1177f5e2a690af14c560db0904"
  },
  {
    "id": "7b4be9f3-7473-59e1-9d82-39aff2d669ac",
    "key": "ipip-ipc-32",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP Interpersonal Circumplex — full 32-item profile",
    "source": {
      "title": "Markey and Markey (2009) IPIP-IPC original survey and octant keys",
      "url": "https://ipip.ori.org/newIPIP-IPCScoringKey.htm",
      "scoringUrl": "https://ipip.ori.org/newIPIP-IPCScoringKey.htm",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "Original IPIP source items and scoring keys are public domain and permit commercial website administration; third-party proprietary NEO-PI-R or copyrighted IIP instruments are NOT reproduced.",
      "citation": "Markey, P. M., & Markey, C. N. (2009). A brief assessment of the interpersonal circumplex: The IPIP-IPC. Assessment, 16, 352–361.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Published IPIP-IPC original English interpersonal-behavior items; eight non-normative octant means. Not a clinical Inventory of Interpersonal Problems, therapy diagnosis or ranking."
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
          "key": "trait.ipipipc.pa",
          "method": "mean",
          "items": [
            "ipc.06",
            "ipc.14",
            "ipc.22",
            "ipc.30"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Assured-Dominant (PA)",
          "direction": "non-normative",
          "reverseItems": []
        },
        {
          "key": "trait.ipipipc.bc",
          "method": "mean",
          "items": [
            "ipc.07",
            "ipc.15",
            "ipc.23",
            "ipc.31"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Arrogant-Calculating (BC)",
          "direction": "non-normative",
          "reverseItems": []
        },
        {
          "key": "trait.ipipipc.de",
          "method": "mean",
          "items": [
            "ipc.08",
            "ipc.16",
            "ipc.24",
            "ipc.32"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Cold-Hearted (DE)",
          "direction": "non-normative",
          "reverseItems": []
        },
        {
          "key": "trait.ipipipc.fg",
          "method": "mean",
          "items": [
            "ipc.01",
            "ipc.09",
            "ipc.17",
            "ipc.25"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Aloof-Introverted (FG)",
          "direction": "non-normative",
          "reverseItems": []
        },
        {
          "key": "trait.ipipipc.hi",
          "method": "mean",
          "items": [
            "ipc.02",
            "ipc.10",
            "ipc.18",
            "ipc.26"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Unassured-Submissive (HI)",
          "direction": "non-normative",
          "reverseItems": []
        },
        {
          "key": "trait.ipipipc.jk",
          "method": "mean",
          "items": [
            "ipc.03",
            "ipc.11",
            "ipc.19",
            "ipc.27"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Unassuming-Ingenuous (JK)",
          "direction": "non-normative",
          "reverseItems": []
        },
        {
          "key": "trait.ipipipc.lm",
          "method": "mean",
          "items": [
            "ipc.04",
            "ipc.12",
            "ipc.20",
            "ipc.28"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Warm-Agreeable (LM)",
          "direction": "non-normative",
          "reverseItems": []
        },
        {
          "key": "trait.ipipipc.no",
          "method": "mean",
          "items": [
            "ipc.05",
            "ipc.13",
            "ipc.21",
            "ipc.29"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Gregarious-Extraverted (NO)",
          "direction": "non-normative",
          "reverseItems": []
        }
      ]
    },
    "questions": [
      {
        "id": "ipc.01",
        "text": "Am quiet around strangers",
        "required": true
      },
      {
        "id": "ipc.02",
        "text": "Speak softly",
        "required": true
      },
      {
        "id": "ipc.03",
        "text": "Tolerate a lot from others",
        "required": true
      },
      {
        "id": "ipc.04",
        "text": "Am interested in people",
        "required": true
      },
      {
        "id": "ipc.05",
        "text": "Feel comfortable around people",
        "required": true
      },
      {
        "id": "ipc.06",
        "text": "Demand to be the center of interest",
        "required": true
      },
      {
        "id": "ipc.07",
        "text": "Cut others to pieces",
        "required": true
      },
      {
        "id": "ipc.08",
        "text": "Believe people should fend for themselves",
        "required": true
      },
      {
        "id": "ipc.09",
        "text": "Am a very private person",
        "required": true
      },
      {
        "id": "ipc.10",
        "text": "Let others finish what they are saying",
        "required": true
      },
      {
        "id": "ipc.11",
        "text": "Take things as they come",
        "required": true
      },
      {
        "id": "ipc.12",
        "text": "Reassure others",
        "required": true
      },
      {
        "id": "ipc.13",
        "text": "Start conversations",
        "required": true
      },
      {
        "id": "ipc.14",
        "text": "Do most of the talking",
        "required": true
      },
      {
        "id": "ipc.15",
        "text": "Contradict others",
        "required": true
      },
      {
        "id": "ipc.16",
        "text": "Don't fall for sob-stories",
        "required": true
      },
      {
        "id": "ipc.17",
        "text": "Don't talk a lot",
        "required": true
      },
      {
        "id": "ipc.18",
        "text": "Seldom toot my own horn",
        "required": true
      },
      {
        "id": "ipc.19",
        "text": "Think of others first",
        "required": true
      },
      {
        "id": "ipc.20",
        "text": "Inquire about others' well-being",
        "required": true
      },
      {
        "id": "ipc.21",
        "text": "Talk to a lot of different people at parties",
        "required": true
      },
      {
        "id": "ipc.22",
        "text": "Speak loudly",
        "required": true
      },
      {
        "id": "ipc.23",
        "text": "Snap at people",
        "required": true
      },
      {
        "id": "ipc.24",
        "text": "Don't put a lot of thought into things",
        "required": true
      },
      {
        "id": "ipc.25",
        "text": "Have little to say",
        "required": true
      },
      {
        "id": "ipc.26",
        "text": "Dislike being the center of attention",
        "required": true
      },
      {
        "id": "ipc.27",
        "text": "Seldom stretch the truth",
        "required": true
      },
      {
        "id": "ipc.28",
        "text": "Get along well with others",
        "required": true
      },
      {
        "id": "ipc.29",
        "text": "Love large parties",
        "required": true
      },
      {
        "id": "ipc.30",
        "text": "Demand attention",
        "required": true
      },
      {
        "id": "ipc.31",
        "text": "Have a sharp tongue",
        "required": true
      },
      {
        "id": "ipc.32",
        "text": "Am not interested in other people's problems",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:a26750f12dabfba9f5b74ea815c56b75982e8cfac3c11d49d288b670935cb68a"
  }
])

export const NEW_PROFESSIONAL_NEOPIC_CATALOG = deepFreeze([
  {
    "key": "ipip-neo120-facet-n1",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "anxiety",
      "stress",
      "mood",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Worry sensitivity",
      "ru": "IPIP-NEO: Тревожная настороженность · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet N1; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO N1 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-n2",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "stress",
      "mood",
      "relationships",
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
      "en": "IPIP-NEO · Irritability tendency",
      "ru": "IPIP-NEO: Склонность к раздражительности · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet N2; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO N2 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-n3",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "mood",
      "resources",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Low-mood tendency",
      "ru": "IPIP-NEO: Склонность к снижению настроения · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet N3; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO N3 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-n4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "relationships",
      "anxiety",
      "self-support",
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
      "en": "IPIP-NEO · Social self-consciousness",
      "ru": "IPIP-NEO: Социальная скованность · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet N4; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO N4 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-n5",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "stress",
      "work",
      "motivation",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "work-money",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Impulse and indulgence tendency",
      "ru": "IPIP-NEO: Импульсивные удовольствия · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet N5; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO N5 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-n6",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "stress",
      "resources",
      "body",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Stress vulnerability tendency",
      "ru": "IPIP-NEO: Уязвимость к нагрузке · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet N6; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO N6 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-e1",
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
      "en": "IPIP-NEO · Interpersonal friendliness",
      "ru": "IPIP-NEO: Дружелюбие в контакте · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet E1; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO E1 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-e2",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "relationships",
      "energy",
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
      "en": "IPIP-NEO · Preference for social groups",
      "ru": "IPIP-NEO: Предпочтение общения в группе · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet E2; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO E2 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-e3",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "relationships",
      "work",
      "boundaries",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "work-money",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Assertiveness",
      "ru": "IPIP-NEO: Уверенность в выражении позиции · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet E3; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO E3 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-e4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "work",
      "energy",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "work-money",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Activity pace",
      "ru": "IPIP-NEO: Темп активности · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet E4; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO E4 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-e5",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "energy",
      "motivation",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Excitement seeking",
      "ru": "IPIP-NEO: Тяга к новым впечатлениям · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet E5; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO E5 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-e6",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "mood",
      "resources",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Cheerfulness tendency",
      "ru": "IPIP-NEO: Склонность к позитивному настрою · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet E6; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO E6 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-o1",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "meaning",
      "personality",
      "resources"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Imagination",
      "ru": "IPIP-NEO: Воображение · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet O1; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO O1 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-o2",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "meaning",
      "resources",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Artistic interests",
      "ru": "IPIP-NEO: Художественные интересы · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet O2; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO O2 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-o3",
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
      "relationships",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Emotional awareness",
      "ru": "IPIP-NEO: Эмоциональная чувствительность · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet O3; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO O3 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-o4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "work",
      "motivation",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "work-money",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Openness to variety",
      "ru": "IPIP-NEO: Открытость разнообразию · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet O4; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO O4 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-o5",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "work",
      "attention",
      "meaning",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "work-money",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Intellectual curiosity",
      "ru": "IPIP-NEO: Интерес к сложным идеям · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet O5; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO O5 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-a1",
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
      "en": "IPIP-NEO · Interpersonal trust",
      "ru": "IPIP-NEO: Доверие людям · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet A1; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO A1 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-a2",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "relationships",
      "work",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "work-money",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Straightforwardness",
      "ru": "IPIP-NEO: Прямота и добросовестность · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet A2; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO A2 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-a3",
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
      "en": "IPIP-NEO · Altruism",
      "ru": "IPIP-NEO: Готовность помогать · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet A3; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO A3 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-a4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "relationships",
      "work",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "work-money",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Cooperation",
      "ru": "IPIP-NEO: Сотрудничество · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet A4; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO A4 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-a5",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "relationships",
      "work",
      "self-support",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "work-money",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Modesty",
      "ru": "IPIP-NEO: Скромность и самопрезентация · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet A5; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO A5 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-a6",
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
      "en": "IPIP-NEO · Sympathy",
      "ru": "IPIP-NEO: Сочувствие · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet A6; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO A6 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-c1",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "work",
      "motivation",
      "self-support",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "work-money",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Self-efficacy",
      "ru": "IPIP-NEO: Вера в способность справляться · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet C1; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO C1 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-c2",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "work",
      "attention",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "work-money",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Orderliness",
      "ru": "IPIP-NEO: Организованность · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet C2; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO C2 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-c3",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "work",
      "relationships",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "work-money",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Dutifulness",
      "ru": "IPIP-NEO: Ответственность в обязательствах · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet C3; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO C3 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-c4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "work",
      "motivation",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "work-money",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Achievement striving",
      "ru": "IPIP-NEO: Стремление к результату · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet C4; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO C4 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-c5",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "work",
      "attention",
      "motivation",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "work-money",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Self-discipline",
      "ru": "IPIP-NEO: Последовательность действий · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet C5; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO C5 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-neo120-facet-c6",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "work",
      "clarity",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "work-money",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
      }
    ],
    "title": {
      "en": "IPIP-NEO · Cautiousness",
      "ru": "IPIP-NEO: Взвешенность решений · EN"
    },
    "description": {
      "en": "Original English published four-item IPIP-NEO-120 facet C6; descriptive personality tendency (not the proprietary NEO-PI-R, not a diagnosis).",
      "ru": "Опубликованная четырёхпунктовая шкала IPIP-NEO C6 на английском. Описание черты личности, не медицинская диагностика."
    }
  },
  {
    "key": "ipip-ipc-pa-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "relationships",
      "work",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "work-money",
      "other"
    ],
    "questionCount": 4,
    "durationMinutes": 2,
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
        "key": "relationships",
        "weight": 1
      },
      {
        "key": "personality",
        "weight": 0.75
      }
    ],
    "title": {
      "en": "IPIP-IPC · Assertive-leading style",
      "ru": "IPIP-IPC: Уверенно-ведущий стиль · EN"
    },
    "description": {
      "en": "Published four-item English IPIP Interpersonal Circumplex octant PA. Descriptive interpersonal style, not a clinical IIP questionnaire.",
      "ru": "Оригинальная английская четырёхпунктовая шкала межличностного стиля PA. Не является клиническим IIP."
    }
  },
  {
    "key": "ipip-ipc-bc-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "relationships",
      "stress",
      "boundaries",
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
      },
      {
        "key": "personality",
        "weight": 0.75
      }
    ],
    "title": {
      "en": "IPIP-IPC · Confrontational style",
      "ru": "IPIP-IPC: Спорящий стиль общения · EN"
    },
    "description": {
      "en": "Published four-item English IPIP Interpersonal Circumplex octant BC. Descriptive interpersonal style, not a clinical IIP questionnaire.",
      "ru": "Оригинальная английская четырёхпунктовая шкала межличностного стиля BC. Не является клиническим IIP."
    }
  },
  {
    "key": "ipip-ipc-de-4",
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
      },
      {
        "key": "personality",
        "weight": 0.75
      }
    ],
    "title": {
      "en": "IPIP-IPC · Interpersonal distance",
      "ru": "IPIP-IPC: Межличностная дистанция · EN"
    },
    "description": {
      "en": "Published four-item English IPIP Interpersonal Circumplex octant DE. Descriptive interpersonal style, not a clinical IIP questionnaire.",
      "ru": "Оригинальная английская четырёхпунктовая шкала межличностного стиля DE. Не является клиническим IIP."
    }
  },
  {
    "key": "ipip-ipc-fg-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "relationships",
      "energy",
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
      },
      {
        "key": "personality",
        "weight": 0.75
      }
    ],
    "title": {
      "en": "IPIP-IPC · Reserved style",
      "ru": "IPIP-IPC: Сдержанный стиль общения · EN"
    },
    "description": {
      "en": "Published four-item English IPIP Interpersonal Circumplex octant FG. Descriptive interpersonal style, not a clinical IIP questionnaire.",
      "ru": "Оригинальная английская четырёхпунктовая шкала межличностного стиля FG. Не является клиническим IIP."
    }
  },
  {
    "key": "ipip-ipc-hi-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "relationships",
      "boundaries",
      "self-support",
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
      },
      {
        "key": "personality",
        "weight": 0.75
      }
    ],
    "title": {
      "en": "IPIP-IPC · Yielding style",
      "ru": "IPIP-IPC: Уступчивый стиль общения · EN"
    },
    "description": {
      "en": "Published four-item English IPIP Interpersonal Circumplex octant HI. Descriptive interpersonal style, not a clinical IIP questionnaire.",
      "ru": "Оригинальная английская четырёхпунктовая шкала межличностного стиля HI. Не является клиническим IIP."
    }
  },
  {
    "key": "ipip-ipc-jk-4",
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
      },
      {
        "key": "personality",
        "weight": 0.75
      }
    ],
    "title": {
      "en": "IPIP-IPC · Unassuming-supportive style",
      "ru": "IPIP-IPC: Ненавязчиво-поддерживающий стиль · EN"
    },
    "description": {
      "en": "Published four-item English IPIP Interpersonal Circumplex octant JK. Descriptive interpersonal style, not a clinical IIP questionnaire.",
      "ru": "Оригинальная английская четырёхпунктовая шкала межличностного стиля JK. Не является клиническим IIP."
    }
  },
  {
    "key": "ipip-ipc-lm-4",
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
      },
      {
        "key": "personality",
        "weight": 0.75
      }
    ],
    "title": {
      "en": "IPIP-IPC · Warm and agreeable style",
      "ru": "IPIP-IPC: Тёплый и доброжелательный стиль · EN"
    },
    "description": {
      "en": "Published four-item English IPIP Interpersonal Circumplex octant LM. Descriptive interpersonal style, not a clinical IIP questionnaire.",
      "ru": "Оригинальная английская четырёхпунктовая шкала межличностного стиля LM. Не является клиническим IIP."
    }
  },
  {
    "key": "ipip-ipc-no-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "relationships",
      "energy",
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
      },
      {
        "key": "personality",
        "weight": 0.75
      }
    ],
    "title": {
      "en": "IPIP-IPC · Sociable-engaging style",
      "ru": "IPIP-IPC: Общительный инициативный стиль · EN"
    },
    "description": {
      "en": "Published four-item English IPIP Interpersonal Circumplex octant NO. Descriptive interpersonal style, not a clinical IIP questionnaire.",
      "ru": "Оригинальная английская четырёхпунктовая шкала межличностного стиля NO. Не является клиническим IIP."
    }
  },
  {
    "key": "ipip-ipc-32",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "relationships",
      "support",
      "work",
      "personality",
      "boundaries"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "work-money",
      "other"
    ],
    "questionCount": 32,
    "durationMinutes": 8,
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
      },
      {
        "key": "personality",
        "weight": 0.7
      }
    ],
    "title": {
      "en": "IPIP-IPC · Full interpersonal profile (32)",
      "ru": "IPIP-IPC: Полный профиль общения (32) · EN"
    },
    "description": {
      "en": "Original full 32-item English IPIP Interpersonal Circumplex with eight octants; descriptive interaction styles, not diagnoses.",
      "ru": "Полный профессиональный исследовательский опросник IPIP-IPC из 32 английских вопросов и 8 шкал общения; не диагноз."
    }
  }
])

export const NEW_PROFESSIONAL_NEOPIC_INTERPRETATION_ROWS = deepFreeze([
  [
    "ipip-neo120-facet-n1",
    "personality",
    "Notice in which contexts worry arises and when everyday reassurance is enough.",
    "Отмечайте контекст тревожных мыслей и то, что помогает чувствовать устойчивость."
  ],
  [
    "ipip-neo120-facet-n2",
    "personality",
    "Observe what usually precedes irritation and how you express needs respectfully.",
    "Отмечайте предвестники раздражения и как мягко выразить свои потребности."
  ],
  [
    "ipip-neo120-facet-n3",
    "personality",
    "Compare periods of lower spirits with social support and ordinary daily demands.",
    "Сравните изменения настроения с поддержкой и ежедневной нагрузкой; это не скрининг депрессии."
  ],
  [
    "ipip-neo120-facet-n4",
    "personality",
    "Notice when being noticed feels uncomfortable and which settings are more welcoming.",
    "Отметьте, где внимание других вызывает напряжение, а где вы свободнее."
  ],
  [
    "ipip-neo120-facet-n5",
    "personality",
    "Explore what happens before a spontaneous choice without assigning a moral value.",
    "Замечайте контекст импульсивных решений без самокритики."
  ],
  [
    "ipip-neo120-facet-n6",
    "personality",
    "Compare tasks that overwhelm with contexts where help or pacing improves coping.",
    "Замечайте, какие задачи перегружают и какая поддержка облегчает ситуацию."
  ],
  [
    "ipip-neo120-facet-e1",
    "personality",
    "Observe what makes meeting new people comfortable and respectful.",
    "Отмечайте условия безопасного и приятного знакомства."
  ],
  [
    "ipip-neo120-facet-e2",
    "personality",
    "Notice whether group contact or time alone suits your current needs.",
    "Понаблюдайте, какие форматы общения или уединения подходят вам сейчас."
  ],
  [
    "ipip-neo120-facet-e3",
    "personality",
    "Try expressing one preference clearly without assuming others must agree.",
    "Попробуйте спокойно выразить одну предпочтительную позицию, оставляя место другим."
  ],
  [
    "ipip-neo120-facet-e4",
    "personality",
    "Observe which pace supports sustainable work and appropriate recovery.",
    "Отметьте свой комфортный рабочий темп и условия восстановления."
  ],
  [
    "ipip-neo120-facet-e5",
    "personality",
    "Notice situations where novelty is enjoyable and where predictability feels better.",
    "Отмечайте, где новизна радует, а где комфортнее предсказуемость."
  ],
  [
    "ipip-neo120-facet-e6",
    "personality",
    "Identify moments of genuine lightness without forcing optimism.",
    "Замечайте подлинные моменты радости без требования всегда быть позитивным."
  ],
  [
    "ipip-neo120-facet-o1",
    "personality",
    "Notice how imagination supports creativity or relaxation in ordinary life.",
    "Замечайте, как воображение поддерживает творчество и отдых."
  ],
  [
    "ipip-neo120-facet-o2",
    "personality",
    "Choose one art form that genuinely moves or interests you.",
    "Выберите вид искусства, который вам действительно интересен."
  ],
  [
    "ipip-neo120-facet-o3",
    "personality",
    "Notice how emotions show up and when naming them supports contact.",
    "Отмечайте чувства и моменты, когда их называние улучшает контакт."
  ],
  [
    "ipip-neo120-facet-o4",
    "personality",
    "Reflect on which changes appeal to you and which routines remain useful.",
    "Отметьте, какие изменения интересны, а какие привычки помогают."
  ],
  [
    "ipip-neo120-facet-o5",
    "personality",
    "Explore one engaging idea without comparing yourself to others.",
    "Исследуйте интересную идею без сравнения своих способностей с чужими."
  ],
  [
    "ipip-neo120-facet-a1",
    "personality",
    "Reflect on how trust develops alongside clear boundaries.",
    "Отмечайте, как доверие сочетается с ясными границами."
  ],
  [
    "ipip-neo120-facet-a2",
    "personality",
    "Identify an agreement you can communicate clearly and realistically.",
    "Отметьте, как открыто и реалистично обсуждать договорённости."
  ],
  [
    "ipip-neo120-facet-a3",
    "personality",
    "Notice when giving support feels voluntary and when you need rest.",
    "Замечайте, когда помощь добровольна, а когда нужен отдых."
  ],
  [
    "ipip-neo120-facet-a4",
    "personality",
    "Think of a disagreement where listening and a boundary can coexist.",
    "Подумайте, как в споре сочетать слышание другого и собственные границы."
  ],
  [
    "ipip-neo120-facet-a5",
    "personality",
    "Notice how you acknowledge achievements while respecting others.",
    "Замечайте, как признавать достижения и уважать вклад других."
  ],
  [
    "ipip-neo120-facet-a6",
    "personality",
    "Reflect on care for others without overlooking your own needs.",
    "Обратите внимание на сочувствие другим и заботу о своих потребностях."
  ],
  [
    "ipip-neo120-facet-c1",
    "personality",
    "Pick one manageable task where you can recognize a real capability.",
    "Выберите посильную задачу, где видна ваша реальная компетентность."
  ],
  [
    "ipip-neo120-facet-c2",
    "personality",
    "Observe which structures help without creating unnecessary rigidity.",
    "Замечайте полезный порядок, не превращая его в жёсткое требование."
  ],
  [
    "ipip-neo120-facet-c3",
    "personality",
    "Review whether your commitments match the resources you have.",
    "Проверьте, насколько обязательства соразмерны вашим ресурсам."
  ],
  [
    "ipip-neo120-facet-c4",
    "personality",
    "Notice when effort is rewarding and when a pause is a smarter option.",
    "Отмечайте, когда усилия помогают, а когда разумнее отдохнуть."
  ],
  [
    "ipip-neo120-facet-c5",
    "personality",
    "Try one realistic step rather than judging your willpower as good or bad.",
    "Выберите один реалистичный шаг без оценки силы воли как хорошей или плохой."
  ],
  [
    "ipip-neo120-facet-c6",
    "personality",
    "Before a low-risk decision, identify one consequence and one benefit.",
    "Перед небольшим решением отметьте возможное последствие и пользу."
  ],
  [
    "ipip-ipc-pa-4",
    "personality",
    "Notice when taking the lead supports collaboration and when shared decisions work better.",
    "Отметьте, когда инициатива помогает группе, а когда полезно разделить решения."
  ],
  [
    "ipip-ipc-bc-4",
    "personality",
    "Observe how disagreement is expressed and whether respect stays intact.",
    "Замечайте, как выражается несогласие и сохраняется ли уважение."
  ],
  [
    "ipip-ipc-de-4",
    "personality",
    "Notice when emotional distance protects you and when it limits connection.",
    "Отметьте, когда дистанция помогает, а когда мешает общению."
  ],
  [
    "ipip-ipc-fg-4",
    "personality",
    "Compare settings where privacy feels natural with those that invite contact.",
    "Сравните условия комфортного уединения и открытого контакта."
  ],
  [
    "ipip-ipc-hi-4",
    "personality",
    "Notice when listening feels freely chosen and when your own voice deserves space.",
    "Замечайте, когда внимательное слушание добровольно и когда важно высказаться самому."
  ],
  [
    "ipip-ipc-jk-4",
    "personality",
    "Reflect on giving others space while making room for your own needs.",
    "Замечайте, как заботиться о других, сохраняя место своим потребностям."
  ],
  [
    "ipip-ipc-lm-4",
    "personality",
    "Notice the kinds of warmth that support mutuality without overextending.",
    "Отмечайте проявления тепла без необходимости угождать всем."
  ],
  [
    "ipip-ipc-no-4",
    "personality",
    "Observe when starting conversations energizes you and when you prefer quiet.",
    "Понаблюдайте, когда общение придаёт сил, а когда нужен покой."
  ],
  [
    "ipip-ipc-32",
    "personality",
    "Compare the eight tendencies as a contextual profile; no octant is inherently healthy or pathological.",
    "Сравните восемь стилей общения с учётом ситуации; ни один не считается болезненным или идеальным."
  ]
])

export const NEW_PROFESSIONAL_NEOPIC_DIMENSION_ROWS = deepFreeze([
  [
    "ipip-neo120-facet-n1",
    "trait.ipipneo120.facet.n1",
    "personality",
    "Worry sensitivity",
    "Тревожная настороженность",
    "Notice in which contexts worry arises and when everyday reassurance is enough.",
    "Отмечайте контекст тревожных мыслей и то, что помогает чувствовать устойчивость."
  ],
  [
    "ipip-neo120-facet-n2",
    "trait.ipipneo120.facet.n2",
    "personality",
    "Irritability tendency",
    "Склонность к раздражительности",
    "Observe what usually precedes irritation and how you express needs respectfully.",
    "Отмечайте предвестники раздражения и как мягко выразить свои потребности."
  ],
  [
    "ipip-neo120-facet-n3",
    "trait.ipipneo120.facet.n3",
    "personality",
    "Low-mood tendency",
    "Склонность к снижению настроения",
    "Compare periods of lower spirits with social support and ordinary daily demands.",
    "Сравните изменения настроения с поддержкой и ежедневной нагрузкой; это не скрининг депрессии."
  ],
  [
    "ipip-neo120-facet-n4",
    "trait.ipipneo120.facet.n4",
    "personality",
    "Social self-consciousness",
    "Социальная скованность",
    "Notice when being noticed feels uncomfortable and which settings are more welcoming.",
    "Отметьте, где внимание других вызывает напряжение, а где вы свободнее."
  ],
  [
    "ipip-neo120-facet-n5",
    "trait.ipipneo120.facet.n5",
    "personality",
    "Impulse and indulgence tendency",
    "Импульсивные удовольствия",
    "Explore what happens before a spontaneous choice without assigning a moral value.",
    "Замечайте контекст импульсивных решений без самокритики."
  ],
  [
    "ipip-neo120-facet-n6",
    "trait.ipipneo120.facet.n6",
    "personality",
    "Stress vulnerability tendency",
    "Уязвимость к нагрузке",
    "Compare tasks that overwhelm with contexts where help or pacing improves coping.",
    "Замечайте, какие задачи перегружают и какая поддержка облегчает ситуацию."
  ],
  [
    "ipip-neo120-facet-e1",
    "trait.ipipneo120.facet.e1",
    "personality",
    "Interpersonal friendliness",
    "Дружелюбие в контакте",
    "Observe what makes meeting new people comfortable and respectful.",
    "Отмечайте условия безопасного и приятного знакомства."
  ],
  [
    "ipip-neo120-facet-e2",
    "trait.ipipneo120.facet.e2",
    "personality",
    "Preference for social groups",
    "Предпочтение общения в группе",
    "Notice whether group contact or time alone suits your current needs.",
    "Понаблюдайте, какие форматы общения или уединения подходят вам сейчас."
  ],
  [
    "ipip-neo120-facet-e3",
    "trait.ipipneo120.facet.e3",
    "personality",
    "Assertiveness",
    "Уверенность в выражении позиции",
    "Try expressing one preference clearly without assuming others must agree.",
    "Попробуйте спокойно выразить одну предпочтительную позицию, оставляя место другим."
  ],
  [
    "ipip-neo120-facet-e4",
    "trait.ipipneo120.facet.e4",
    "personality",
    "Activity pace",
    "Темп активности",
    "Observe which pace supports sustainable work and appropriate recovery.",
    "Отметьте свой комфортный рабочий темп и условия восстановления."
  ],
  [
    "ipip-neo120-facet-e5",
    "trait.ipipneo120.facet.e5",
    "personality",
    "Excitement seeking",
    "Тяга к новым впечатлениям",
    "Notice situations where novelty is enjoyable and where predictability feels better.",
    "Отмечайте, где новизна радует, а где комфортнее предсказуемость."
  ],
  [
    "ipip-neo120-facet-e6",
    "trait.ipipneo120.facet.e6",
    "personality",
    "Cheerfulness tendency",
    "Склонность к позитивному настрою",
    "Identify moments of genuine lightness without forcing optimism.",
    "Замечайте подлинные моменты радости без требования всегда быть позитивным."
  ],
  [
    "ipip-neo120-facet-o1",
    "trait.ipipneo120.facet.o1",
    "personality",
    "Imagination",
    "Воображение",
    "Notice how imagination supports creativity or relaxation in ordinary life.",
    "Замечайте, как воображение поддерживает творчество и отдых."
  ],
  [
    "ipip-neo120-facet-o2",
    "trait.ipipneo120.facet.o2",
    "personality",
    "Artistic interests",
    "Художественные интересы",
    "Choose one art form that genuinely moves or interests you.",
    "Выберите вид искусства, который вам действительно интересен."
  ],
  [
    "ipip-neo120-facet-o3",
    "trait.ipipneo120.facet.o3",
    "personality",
    "Emotional awareness",
    "Эмоциональная чувствительность",
    "Notice how emotions show up and when naming them supports contact.",
    "Отмечайте чувства и моменты, когда их называние улучшает контакт."
  ],
  [
    "ipip-neo120-facet-o4",
    "trait.ipipneo120.facet.o4",
    "personality",
    "Openness to variety",
    "Открытость разнообразию",
    "Reflect on which changes appeal to you and which routines remain useful.",
    "Отметьте, какие изменения интересны, а какие привычки помогают."
  ],
  [
    "ipip-neo120-facet-o5",
    "trait.ipipneo120.facet.o5",
    "personality",
    "Intellectual curiosity",
    "Интерес к сложным идеям",
    "Explore one engaging idea without comparing yourself to others.",
    "Исследуйте интересную идею без сравнения своих способностей с чужими."
  ],
  [
    "ipip-neo120-facet-a1",
    "trait.ipipneo120.facet.a1",
    "personality",
    "Interpersonal trust",
    "Доверие людям",
    "Reflect on how trust develops alongside clear boundaries.",
    "Отмечайте, как доверие сочетается с ясными границами."
  ],
  [
    "ipip-neo120-facet-a2",
    "trait.ipipneo120.facet.a2",
    "personality",
    "Straightforwardness",
    "Прямота и добросовестность",
    "Identify an agreement you can communicate clearly and realistically.",
    "Отметьте, как открыто и реалистично обсуждать договорённости."
  ],
  [
    "ipip-neo120-facet-a3",
    "trait.ipipneo120.facet.a3",
    "personality",
    "Altruism",
    "Готовность помогать",
    "Notice when giving support feels voluntary and when you need rest.",
    "Замечайте, когда помощь добровольна, а когда нужен отдых."
  ],
  [
    "ipip-neo120-facet-a4",
    "trait.ipipneo120.facet.a4",
    "personality",
    "Cooperation",
    "Сотрудничество",
    "Think of a disagreement where listening and a boundary can coexist.",
    "Подумайте, как в споре сочетать слышание другого и собственные границы."
  ],
  [
    "ipip-neo120-facet-a5",
    "trait.ipipneo120.facet.a5",
    "personality",
    "Modesty",
    "Скромность и самопрезентация",
    "Notice how you acknowledge achievements while respecting others.",
    "Замечайте, как признавать достижения и уважать вклад других."
  ],
  [
    "ipip-neo120-facet-a6",
    "trait.ipipneo120.facet.a6",
    "personality",
    "Sympathy",
    "Сочувствие",
    "Reflect on care for others without overlooking your own needs.",
    "Обратите внимание на сочувствие другим и заботу о своих потребностях."
  ],
  [
    "ipip-neo120-facet-c1",
    "trait.ipipneo120.facet.c1",
    "personality",
    "Self-efficacy",
    "Вера в способность справляться",
    "Pick one manageable task where you can recognize a real capability.",
    "Выберите посильную задачу, где видна ваша реальная компетентность."
  ],
  [
    "ipip-neo120-facet-c2",
    "trait.ipipneo120.facet.c2",
    "personality",
    "Orderliness",
    "Организованность",
    "Observe which structures help without creating unnecessary rigidity.",
    "Замечайте полезный порядок, не превращая его в жёсткое требование."
  ],
  [
    "ipip-neo120-facet-c3",
    "trait.ipipneo120.facet.c3",
    "personality",
    "Dutifulness",
    "Ответственность в обязательствах",
    "Review whether your commitments match the resources you have.",
    "Проверьте, насколько обязательства соразмерны вашим ресурсам."
  ],
  [
    "ipip-neo120-facet-c4",
    "trait.ipipneo120.facet.c4",
    "personality",
    "Achievement striving",
    "Стремление к результату",
    "Notice when effort is rewarding and when a pause is a smarter option.",
    "Отмечайте, когда усилия помогают, а когда разумнее отдохнуть."
  ],
  [
    "ipip-neo120-facet-c5",
    "trait.ipipneo120.facet.c5",
    "personality",
    "Self-discipline",
    "Последовательность действий",
    "Try one realistic step rather than judging your willpower as good or bad.",
    "Выберите один реалистичный шаг без оценки силы воли как хорошей или плохой."
  ],
  [
    "ipip-neo120-facet-c6",
    "trait.ipipneo120.facet.c6",
    "personality",
    "Cautiousness",
    "Взвешенность решений",
    "Before a low-risk decision, identify one consequence and one benefit.",
    "Перед небольшим решением отметьте возможное последствие и пользу."
  ],
  [
    "ipip-ipc-pa-4",
    "trait.ipipipc.pa",
    "personality",
    "Assertive-leading style",
    "Уверенно-ведущий стиль",
    "Notice when taking the lead supports collaboration and when shared decisions work better.",
    "Отметьте, когда инициатива помогает группе, а когда полезно разделить решения."
  ],
  [
    "ipip-ipc-32",
    "trait.ipipipc.pa",
    "personality",
    "Assertive-leading style",
    "Уверенно-ведущий стиль",
    "Notice when taking the lead supports collaboration and when shared decisions work better.",
    "Отметьте, когда инициатива помогает группе, а когда полезно разделить решения."
  ],
  [
    "ipip-ipc-bc-4",
    "trait.ipipipc.bc",
    "personality",
    "Confrontational style",
    "Спорящий стиль общения",
    "Observe how disagreement is expressed and whether respect stays intact.",
    "Замечайте, как выражается несогласие и сохраняется ли уважение."
  ],
  [
    "ipip-ipc-32",
    "trait.ipipipc.bc",
    "personality",
    "Confrontational style",
    "Спорящий стиль общения",
    "Observe how disagreement is expressed and whether respect stays intact.",
    "Замечайте, как выражается несогласие и сохраняется ли уважение."
  ],
  [
    "ipip-ipc-de-4",
    "trait.ipipipc.de",
    "personality",
    "Interpersonal distance",
    "Межличностная дистанция",
    "Notice when emotional distance protects you and when it limits connection.",
    "Отметьте, когда дистанция помогает, а когда мешает общению."
  ],
  [
    "ipip-ipc-32",
    "trait.ipipipc.de",
    "personality",
    "Interpersonal distance",
    "Межличностная дистанция",
    "Notice when emotional distance protects you and when it limits connection.",
    "Отметьте, когда дистанция помогает, а когда мешает общению."
  ],
  [
    "ipip-ipc-fg-4",
    "trait.ipipipc.fg",
    "personality",
    "Reserved style",
    "Сдержанный стиль общения",
    "Compare settings where privacy feels natural with those that invite contact.",
    "Сравните условия комфортного уединения и открытого контакта."
  ],
  [
    "ipip-ipc-32",
    "trait.ipipipc.fg",
    "personality",
    "Reserved style",
    "Сдержанный стиль общения",
    "Compare settings where privacy feels natural with those that invite contact.",
    "Сравните условия комфортного уединения и открытого контакта."
  ],
  [
    "ipip-ipc-hi-4",
    "trait.ipipipc.hi",
    "personality",
    "Yielding style",
    "Уступчивый стиль общения",
    "Notice when listening feels freely chosen and when your own voice deserves space.",
    "Замечайте, когда внимательное слушание добровольно и когда важно высказаться самому."
  ],
  [
    "ipip-ipc-32",
    "trait.ipipipc.hi",
    "personality",
    "Yielding style",
    "Уступчивый стиль общения",
    "Notice when listening feels freely chosen and when your own voice deserves space.",
    "Замечайте, когда внимательное слушание добровольно и когда важно высказаться самому."
  ],
  [
    "ipip-ipc-jk-4",
    "trait.ipipipc.jk",
    "personality",
    "Unassuming-supportive style",
    "Ненавязчиво-поддерживающий стиль",
    "Reflect on giving others space while making room for your own needs.",
    "Замечайте, как заботиться о других, сохраняя место своим потребностям."
  ],
  [
    "ipip-ipc-32",
    "trait.ipipipc.jk",
    "personality",
    "Unassuming-supportive style",
    "Ненавязчиво-поддерживающий стиль",
    "Reflect on giving others space while making room for your own needs.",
    "Замечайте, как заботиться о других, сохраняя место своим потребностям."
  ],
  [
    "ipip-ipc-lm-4",
    "trait.ipipipc.lm",
    "personality",
    "Warm and agreeable style",
    "Тёплый и доброжелательный стиль",
    "Notice the kinds of warmth that support mutuality without overextending.",
    "Отмечайте проявления тепла без необходимости угождать всем."
  ],
  [
    "ipip-ipc-32",
    "trait.ipipipc.lm",
    "personality",
    "Warm and agreeable style",
    "Тёплый и доброжелательный стиль",
    "Notice the kinds of warmth that support mutuality without overextending.",
    "Отмечайте проявления тепла без необходимости угождать всем."
  ],
  [
    "ipip-ipc-no-4",
    "trait.ipipipc.no",
    "personality",
    "Sociable-engaging style",
    "Общительный инициативный стиль",
    "Observe when starting conversations energizes you and when you prefer quiet.",
    "Понаблюдайте, когда общение придаёт сил, а когда нужен покой."
  ],
  [
    "ipip-ipc-32",
    "trait.ipipipc.no",
    "personality",
    "Sociable-engaging style",
    "Общительный инициативный стиль",
    "Observe when starting conversations energizes you and when you prefer quiet.",
    "Понаблюдайте, когда общение придаёт сил, а когда нужен покой."
  ]
])

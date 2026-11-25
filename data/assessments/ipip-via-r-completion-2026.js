// Holistic House IPIP-VIA-R completion (14 original 4-item strengths + 3 original 6-item core scales).
// Original public-domain English wording and published scoring keys. The source scale is not a diagnosis.
// This additive module must stay immutable once clients save results.
import { deepFreeze } from '../../lib/assessments/contracts.js'

export const IPIP_VIA_R_COMPLETION_DEFINITIONS = deepFreeze([
  {
    "id": "4282c169-808a-5a23-9c3e-bac9d2696a8d",
    "key": "ipip-via-r-appreciation-beauty-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Appreciation of beauty",
    "source": {
      "title": "Balanced and Culture-Fair IPIP-VIA-R Short Scales (Bluemke, Partsch, Saucier & Lechner, 2021)",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "IPIP items and scales are public domain; use permitted for commercial and non-commercial purposes.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Balanced and culture-fair IPIP-VIA-R short scales.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Research-based English four-item continuous mean, two positively and two reversely keyed responses; no diagnostic threshold, treatment prescription, or individual normative percentile."
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
          "key": "trait.via.appreciation_beauty",
          "method": "mean",
          "items": [
            "via.appreciation_beauty.01",
            "via.appreciation_beauty.02",
            "via.appreciation_beauty.03",
            "via.appreciation_beauty.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Appreciation of beauty",
          "direction": "non-normative",
          "reverseItems": [
            "via.appreciation_beauty.03",
            "via.appreciation_beauty.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "via.appreciation_beauty.01",
        "text": "Feel it's important to live in a world of beauty.",
        "required": true
      },
      {
        "id": "via.appreciation_beauty.02",
        "text": "Experience deep emotions when I see beautiful things.",
        "required": true
      },
      {
        "id": "via.appreciation_beauty.03",
        "text": "Am rarely aware of the natural beauty in the environment.",
        "required": true
      },
      {
        "id": "via.appreciation_beauty.04",
        "text": "Fail to notice beauty until others comment on it.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:803f2b30412509f8a40861ce8cb34adb04285a78c17668f1438902e84cd4bb31"
  },
  {
    "id": "2aab919b-5283-586d-a2e5-380c8267812c",
    "key": "ipip-via-r-teamwork-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Teamwork and loyalty",
    "source": {
      "title": "Balanced and Culture-Fair IPIP-VIA-R Short Scales (Bluemke, Partsch, Saucier & Lechner, 2021)",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "IPIP items and scales are public domain; use permitted for commercial and non-commercial purposes.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Balanced and culture-fair IPIP-VIA-R short scales.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Research-based English four-item continuous mean, two positively and two reversely keyed responses; no diagnostic threshold, treatment prescription, or individual normative percentile."
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
          "key": "trait.via.teamwork",
          "method": "mean",
          "items": [
            "via.teamwork.01",
            "via.teamwork.02",
            "via.teamwork.03",
            "via.teamwork.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Teamwork and loyalty",
          "direction": "non-normative",
          "reverseItems": [
            "via.teamwork.03",
            "via.teamwork.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "via.teamwork.01",
        "text": "Am an extremely loyal person.",
        "required": true
      },
      {
        "id": "via.teamwork.02",
        "text": "Support my teammates or fellow group members.",
        "required": true
      },
      {
        "id": "via.teamwork.03",
        "text": "Am not good at working with a group.",
        "required": true
      },
      {
        "id": "via.teamwork.04",
        "text": "Prefer to do everything alone.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:b850792cb8635c46151e3dd808f74412c60fb7446425a22c459ba47a52c3d44e"
  },
  {
    "id": "25d4624c-2830-5180-adfc-a35c3215c638",
    "key": "ipip-via-r-fairness-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Fairness",
    "source": {
      "title": "Balanced and Culture-Fair IPIP-VIA-R Short Scales (Bluemke, Partsch, Saucier & Lechner, 2021)",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "IPIP items and scales are public domain; use permitted for commercial and non-commercial purposes.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Balanced and culture-fair IPIP-VIA-R short scales.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Research-based English four-item continuous mean, two positively and two reversely keyed responses; no diagnostic threshold, treatment prescription, or individual normative percentile."
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
          "key": "trait.via.fairness",
          "method": "mean",
          "items": [
            "via.fairness.01",
            "via.fairness.02",
            "via.fairness.03",
            "via.fairness.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Fairness",
          "direction": "non-normative",
          "reverseItems": [
            "via.fairness.03",
            "via.fairness.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "via.fairness.01",
        "text": "Treat all people equally.",
        "required": true
      },
      {
        "id": "via.fairness.02",
        "text": "Believe that everyone's rights are equally important.",
        "required": true
      },
      {
        "id": "via.fairness.03",
        "text": "Take advantage of others.",
        "required": true
      },
      {
        "id": "via.fairness.04",
        "text": "Treat others differently if I don't like them.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:22a111567e40a9aad6f40562fc4a9c993d262274d845933f72e960ddfe8d1b41"
  },
  {
    "id": "706d25e1-bab7-564c-8807-f11bd01d0dca",
    "key": "ipip-via-r-honesty-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Honesty and integrity",
    "source": {
      "title": "Balanced and Culture-Fair IPIP-VIA-R Short Scales (Bluemke, Partsch, Saucier & Lechner, 2021)",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "IPIP items and scales are public domain; use permitted for commercial and non-commercial purposes.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Balanced and culture-fair IPIP-VIA-R short scales.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Research-based English four-item continuous mean, two positively and two reversely keyed responses; no diagnostic threshold, treatment prescription, or individual normative percentile."
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
          "key": "trait.via.honesty",
          "method": "mean",
          "items": [
            "via.honesty.01",
            "via.honesty.02",
            "via.honesty.03",
            "via.honesty.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Honesty and integrity",
          "direction": "non-normative",
          "reverseItems": [
            "via.honesty.03",
            "via.honesty.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "via.honesty.01",
        "text": "Am trusted to keep secrets.",
        "required": true
      },
      {
        "id": "via.honesty.02",
        "text": "Keep my promises.",
        "required": true
      },
      {
        "id": "via.honesty.03",
        "text": "Lie to get myself out of trouble.",
        "required": true
      },
      {
        "id": "via.honesty.04",
        "text": "Cheat on people who have trusted me.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:556d8c7ab1afd8fe270f86ba3e0cf07c45478775ee81ad6d123e11318d28463f"
  },
  {
    "id": "ac939bcb-bfb1-51ba-bd84-ba22f6e45aa1",
    "key": "ipip-via-r-judgment-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Judgment and open-mindedness",
    "source": {
      "title": "Balanced and Culture-Fair IPIP-VIA-R Short Scales (Bluemke, Partsch, Saucier & Lechner, 2021)",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "IPIP items and scales are public domain; use permitted for commercial and non-commercial purposes.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Balanced and culture-fair IPIP-VIA-R short scales.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Research-based English four-item continuous mean, two positively and two reversely keyed responses; no diagnostic threshold, treatment prescription, or individual normative percentile."
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
          "key": "trait.via.judgment",
          "method": "mean",
          "items": [
            "via.judgment.01",
            "via.judgment.02",
            "via.judgment.03",
            "via.judgment.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Judgment and open-mindedness",
          "direction": "non-normative",
          "reverseItems": [
            "via.judgment.03",
            "via.judgment.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "via.judgment.01",
        "text": "Weigh the pro's and the con's.",
        "required": true
      },
      {
        "id": "via.judgment.02",
        "text": "Am valued by my friends for my good judgment.",
        "required": true
      },
      {
        "id": "via.judgment.03",
        "text": "Don't tend to think things through critically.",
        "required": true
      },
      {
        "id": "via.judgment.04",
        "text": "Don't think about different possibilities when making decisions.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:b17a253ce9f86ea60d57eaf24c3aafa71278536ab171ee3a4a2410291cecd638"
  },
  {
    "id": "bebfef64-55f3-5bc7-81b9-058149ceb837",
    "key": "ipip-via-r-kindness-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Kindness and generosity",
    "source": {
      "title": "Balanced and Culture-Fair IPIP-VIA-R Short Scales (Bluemke, Partsch, Saucier & Lechner, 2021)",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "IPIP items and scales are public domain; use permitted for commercial and non-commercial purposes.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Balanced and culture-fair IPIP-VIA-R short scales.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Research-based English four-item continuous mean, two positively and two reversely keyed responses; no diagnostic threshold, treatment prescription, or individual normative percentile."
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
          "key": "trait.via.kindness",
          "method": "mean",
          "items": [
            "via.kindness.01",
            "via.kindness.02",
            "via.kindness.03",
            "via.kindness.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Kindness and generosity",
          "direction": "non-normative",
          "reverseItems": [
            "via.kindness.03",
            "via.kindness.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "via.kindness.01",
        "text": "Am never too busy to help a friend.",
        "required": true
      },
      {
        "id": "via.kindness.02",
        "text": "Go out of my way to cheer up people who appear down.",
        "required": true
      },
      {
        "id": "via.kindness.03",
        "text": "Get impatient when others talk to me about their problems.",
        "required": true
      },
      {
        "id": "via.kindness.04",
        "text": "Am only kind to others if they have been kind to me.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:887836e3284a7f0ada34a5b13a03211baf47e4080ff8ca32d045062f6c1fd461"
  },
  {
    "id": "cff96f74-e0b3-5ccb-a648-cb004d993ec7",
    "key": "ipip-via-r-leadership-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Leadership",
    "source": {
      "title": "Balanced and Culture-Fair IPIP-VIA-R Short Scales (Bluemke, Partsch, Saucier & Lechner, 2021)",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "IPIP items and scales are public domain; use permitted for commercial and non-commercial purposes.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Balanced and culture-fair IPIP-VIA-R short scales.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Research-based English four-item continuous mean, two positively and two reversely keyed responses; no diagnostic threshold, treatment prescription, or individual normative percentile."
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
          "key": "trait.via.leadership",
          "method": "mean",
          "items": [
            "via.leadership.01",
            "via.leadership.02",
            "via.leadership.03",
            "via.leadership.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Leadership",
          "direction": "non-normative",
          "reverseItems": [
            "via.leadership.03",
            "via.leadership.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "via.leadership.01",
        "text": "Am good at helping people work well together.",
        "required": true
      },
      {
        "id": "via.leadership.02",
        "text": "Am told that I am a strong but fair leader.",
        "required": true
      },
      {
        "id": "via.leadership.03",
        "text": "Have difficulty getting others to work together.",
        "required": true
      },
      {
        "id": "via.leadership.04",
        "text": "Am not good at taking charge of a group.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:0e35d422e46f0067da10b8cfd2be5e799f89c772b923887e304976118df54171"
  },
  {
    "id": "e374c379-af17-5668-a535-2b0c5b0800a7",
    "key": "ipip-via-r-love-of-learning-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Love of learning",
    "source": {
      "title": "Balanced and Culture-Fair IPIP-VIA-R Short Scales (Bluemke, Partsch, Saucier & Lechner, 2021)",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "IPIP items and scales are public domain; use permitted for commercial and non-commercial purposes.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Balanced and culture-fair IPIP-VIA-R short scales.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Research-based English four-item continuous mean, two positively and two reversely keyed responses; no diagnostic threshold, treatment prescription, or individual normative percentile."
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
          "key": "trait.via.love_of_learning",
          "method": "mean",
          "items": [
            "via.love_of_learning.01",
            "via.love_of_learning.02",
            "via.love_of_learning.03",
            "via.love_of_learning.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Love of learning",
          "direction": "non-normative",
          "reverseItems": [
            "via.love_of_learning.03",
            "via.love_of_learning.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "via.love_of_learning.01",
        "text": "Am a true life-long learner.",
        "required": true
      },
      {
        "id": "via.love_of_learning.02",
        "text": "Am thrilled when I learn something new.",
        "required": true
      },
      {
        "id": "via.love_of_learning.03",
        "text": "Don't like to learn new things.",
        "required": true
      },
      {
        "id": "via.love_of_learning.04",
        "text": "Don't read nonfiction books for fun.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:8bebcb8c5cfc649029a153f8818eb70f1bab039bb7daf51ce79d673eec4f3bb9"
  },
  {
    "id": "8a90f626-0a76-5f05-833f-8bf0ce92e104",
    "key": "ipip-via-r-humility-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Modesty and humility",
    "source": {
      "title": "Balanced and Culture-Fair IPIP-VIA-R Short Scales (Bluemke, Partsch, Saucier & Lechner, 2021)",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "IPIP items and scales are public domain; use permitted for commercial and non-commercial purposes.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Balanced and culture-fair IPIP-VIA-R short scales.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Research-based English four-item continuous mean, two positively and two reversely keyed responses; no diagnostic threshold, treatment prescription, or individual normative percentile."
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
          "key": "trait.via.humility",
          "method": "mean",
          "items": [
            "via.humility.01",
            "via.humility.02",
            "via.humility.03",
            "via.humility.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Modesty and humility",
          "direction": "non-normative",
          "reverseItems": [
            "via.humility.03",
            "via.humility.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "via.humility.01",
        "text": "Don't brag about my accomplishments.",
        "required": true
      },
      {
        "id": "via.humility.02",
        "text": "Would never be described as arrogant.",
        "required": true
      },
      {
        "id": "via.humility.03",
        "text": "Like to stand out in a crowd.",
        "required": true
      },
      {
        "id": "via.humility.04",
        "text": "Like to talk about myself.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:5bcff404b1883a8b73d564787302bc08688c24aac171d8be81f87965723a8522"
  },
  {
    "id": "11ebb81e-c150-5168-a235-c8d6ac948a0f",
    "key": "ipip-via-r-perspective-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Perspective and wisdom",
    "source": {
      "title": "Balanced and Culture-Fair IPIP-VIA-R Short Scales (Bluemke, Partsch, Saucier & Lechner, 2021)",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "IPIP items and scales are public domain; use permitted for commercial and non-commercial purposes.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Balanced and culture-fair IPIP-VIA-R short scales.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Research-based English four-item continuous mean, two positively and two reversely keyed responses; no diagnostic threshold, treatment prescription, or individual normative percentile."
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
          "key": "trait.via.perspective",
          "method": "mean",
          "items": [
            "via.perspective.01",
            "via.perspective.02",
            "via.perspective.03",
            "via.perspective.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Perspective and wisdom",
          "direction": "non-normative",
          "reverseItems": [
            "via.perspective.03",
            "via.perspective.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "via.perspective.01",
        "text": "Have a mature view on life.",
        "required": true
      },
      {
        "id": "via.perspective.02",
        "text": "Am considered to be a wise person.",
        "required": true
      },
      {
        "id": "via.perspective.03",
        "text": "Am not good at figuring out what really matters.",
        "required": true
      },
      {
        "id": "via.perspective.04",
        "text": "Am rarely consulted for advice by others.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:ad4652676d0ce2e1890ff30917656e529fcfef800cf1269702c9e6e92dfdad3e"
  },
  {
    "id": "b0911a40-a3fc-5312-b6ab-d367fd5d40fc",
    "key": "ipip-via-r-prudence-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Prudence",
    "source": {
      "title": "Balanced and Culture-Fair IPIP-VIA-R Short Scales (Bluemke, Partsch, Saucier & Lechner, 2021)",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "IPIP items and scales are public domain; use permitted for commercial and non-commercial purposes.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Balanced and culture-fair IPIP-VIA-R short scales.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Research-based English four-item continuous mean, two positively and two reversely keyed responses; no diagnostic threshold, treatment prescription, or individual normative percentile."
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
          "key": "trait.via.prudence",
          "method": "mean",
          "items": [
            "via.prudence.01",
            "via.prudence.02",
            "via.prudence.03",
            "via.prudence.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Prudence",
          "direction": "non-normative",
          "reverseItems": [
            "via.prudence.03",
            "via.prudence.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "via.prudence.01",
        "text": "Believe it is always better to be safe than sorry",
        "required": true
      },
      {
        "id": "via.prudence.02",
        "text": "Make careful choices.",
        "required": true
      },
      {
        "id": "via.prudence.03",
        "text": "Act before thinking through the consequences.",
        "required": true
      },
      {
        "id": "via.prudence.04",
        "text": "Like taking risks.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:378ce5934077db88064204f68071acfee97b893c1a0244ec1371b2c2d6033041"
  },
  {
    "id": "01939380-b360-5430-956d-bb2a198621cd",
    "key": "ipip-via-r-self-regulation-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Self-regulation",
    "source": {
      "title": "Balanced and Culture-Fair IPIP-VIA-R Short Scales (Bluemke, Partsch, Saucier & Lechner, 2021)",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "IPIP items and scales are public domain; use permitted for commercial and non-commercial purposes.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Balanced and culture-fair IPIP-VIA-R short scales.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Research-based English four-item continuous mean, two positively and two reversely keyed responses; no diagnostic threshold, treatment prescription, or individual normative percentile."
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
          "key": "trait.via.self_regulation",
          "method": "mean",
          "items": [
            "via.self_regulation.01",
            "via.self_regulation.02",
            "via.self_regulation.03",
            "via.self_regulation.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Self-regulation",
          "direction": "non-normative",
          "reverseItems": [
            "via.self_regulation.03",
            "via.self_regulation.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "via.self_regulation.01",
        "text": "Am a highly disciplined person.",
        "required": true
      },
      {
        "id": "via.self_regulation.02",
        "text": "Forego things that are bad for me in the long run even if they make me feel good in the short run.",
        "required": true
      },
      {
        "id": "via.self_regulation.03",
        "text": "Let myself be taken over by urges to spend or eat too much.",
        "required": true
      },
      {
        "id": "via.self_regulation.04",
        "text": "Give in to my urges.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:d0d166e71c1e2cf196e680b9d97a6e113bb59541d1ddedd214e993c6a1ebddf4"
  },
  {
    "id": "35c3a856-68dd-5d69-9e0e-b9e49cf50a2b",
    "key": "ipip-via-r-spirituality-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Spirituality and religiousness",
    "source": {
      "title": "Balanced and Culture-Fair IPIP-VIA-R Short Scales (Bluemke, Partsch, Saucier & Lechner, 2021)",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "IPIP items and scales are public domain; use permitted for commercial and non-commercial purposes.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Balanced and culture-fair IPIP-VIA-R short scales.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Research-based English four-item continuous mean, two positively and two reversely keyed responses; no diagnostic threshold, treatment prescription, or individual normative percentile."
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
          "key": "trait.via.spirituality",
          "method": "mean",
          "items": [
            "via.spirituality.01",
            "via.spirituality.02",
            "via.spirituality.03",
            "via.spirituality.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Spirituality and religiousness",
          "direction": "non-normative",
          "reverseItems": [
            "via.spirituality.03",
            "via.spirituality.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "via.spirituality.01",
        "text": "Am a spiritual person.",
        "required": true
      },
      {
        "id": "via.spirituality.02",
        "text": "Believe that each person has a purpose in life.",
        "required": true
      },
      {
        "id": "via.spirituality.03",
        "text": "Feel that life has no meaning.",
        "required": true
      },
      {
        "id": "via.spirituality.04",
        "text": "Do not believe in a universal power or a God.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:e1a0213a9cbb0e5f2257b20db798755572ed51da8de334c2879edbc684b53bee"
  },
  {
    "id": "c239828d-da4c-5de2-9e50-aa38fad4ad32",
    "key": "ipip-via-r-bravery-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Bravery and courage",
    "source": {
      "title": "Balanced and Culture-Fair IPIP-VIA-R Short Scales (Bluemke, Partsch, Saucier & Lechner, 2021)",
      "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "IPIP items and scales are public domain; use permitted for commercial and non-commercial purposes.",
      "citation": "Bluemke, M., Partsch, M. V., Saucier, G., & Lechner, C. M. (2021). Balanced and culture-fair IPIP-VIA-R short scales.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Research-based English four-item continuous mean, two positively and two reversely keyed responses; no diagnostic threshold, treatment prescription, or individual normative percentile."
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
          "key": "trait.via.bravery",
          "method": "mean",
          "items": [
            "via.bravery.01",
            "via.bravery.02",
            "via.bravery.03",
            "via.bravery.04"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Bravery and courage",
          "direction": "non-normative",
          "reverseItems": [
            "via.bravery.03",
            "via.bravery.04"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "via.bravery.01",
        "text": "Have taken frequent stands in the face of strong opposition.",
        "required": true
      },
      {
        "id": "via.bravery.02",
        "text": "Don't hesitate to express an unpopular opinion.",
        "required": true
      },
      {
        "id": "via.bravery.03",
        "text": "Do not stand up for my beliefs.",
        "required": true
      },
      {
        "id": "via.bravery.04",
        "text": "Don't speak my mind freely when there might be negative results.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:bc7261e9a3b92dcb97e1d89384f5246f1b692cf426dacaf6250bee772da4620b"
  },
  {
    "id": "24df183a-da18-5e99-bba8-d4f1210e7964",
    "key": "ipip-via-r-core-positivity-6",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Global core strength: positivity",
    "source": {
      "title": "IPIP-VIA-R-Based Global Core Strength Scales (Partsch, Olaru & Lechner, 2022)",
      "url": "https://ipip.ori.org/IPIP-VIA-R-core-strengths_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R-core-strengths_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "IPIP items and scales are public domain; use permitted for commercial and non-commercial purposes.",
      "citation": "Partsch, M. V., Olaru, G., & Lechner, C. M. (2022). Measuring global character dimensions: Three core strengths scales. PsyArXiv.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Research-based English six-item continuous mean, three positively and three reversely keyed responses; descriptive strengths, not diagnoses/norms. Core items overlap the 24 VIA-R strengths."
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
          "key": "trait.via.core.positivity",
          "method": "mean",
          "items": [
            "via.core_positivity.01",
            "via.core_positivity.02",
            "via.core_positivity.03",
            "via.core_positivity.04",
            "via.core_positivity.05",
            "via.core_positivity.06"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Global core strength: positivity",
          "direction": "non-normative",
          "reverseItems": [
            "via.core_positivity.04",
            "via.core_positivity.05",
            "via.core_positivity.06"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "via.core_positivity.01",
        "text": "Remain hopeful despite challenges.",
        "required": true
      },
      {
        "id": "via.core_positivity.02",
        "text": "Look forward to each new day.",
        "required": true
      },
      {
        "id": "via.core_positivity.03",
        "text": "Know that there are people in my life who care as much for me as for themselves.",
        "required": true
      },
      {
        "id": "via.core_positivity.04",
        "text": "Find few things in my life to be grateful for.",
        "required": true
      },
      {
        "id": "via.core_positivity.05",
        "text": "Find it hard to forgive others.",
        "required": true
      },
      {
        "id": "via.core_positivity.06",
        "text": "Have difficulty accepting love from anyone.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:ac178dac957f016420a331771e082346c2b65130d9e50b58edbdfa520cff727d"
  },
  {
    "id": "3d81667e-f088-5fb5-b253-8543562759bc",
    "key": "ipip-via-r-core-dependability-6",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Global core strength: dependability",
    "source": {
      "title": "IPIP-VIA-R-Based Global Core Strength Scales (Partsch, Olaru & Lechner, 2022)",
      "url": "https://ipip.ori.org/IPIP-VIA-R-core-strengths_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R-core-strengths_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "IPIP items and scales are public domain; use permitted for commercial and non-commercial purposes.",
      "citation": "Partsch, M. V., Olaru, G., & Lechner, C. M. (2022). Measuring global character dimensions: Three core strengths scales. PsyArXiv.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Research-based English six-item continuous mean, three positively and three reversely keyed responses; descriptive strengths, not diagnoses/norms. Core items overlap the 24 VIA-R strengths."
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
          "key": "trait.via.core.dependability",
          "method": "mean",
          "items": [
            "via.core_dependability.01",
            "via.core_dependability.02",
            "via.core_dependability.03",
            "via.core_dependability.04",
            "via.core_dependability.05",
            "via.core_dependability.06"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Global core strength: dependability",
          "direction": "non-normative",
          "reverseItems": [
            "via.core_dependability.04",
            "via.core_dependability.05",
            "via.core_dependability.06"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "via.core_dependability.01",
        "text": "Make careful choices.",
        "required": true
      },
      {
        "id": "via.core_dependability.02",
        "text": "Would never be described as arrogant.",
        "required": true
      },
      {
        "id": "via.core_dependability.03",
        "text": "Believe that everyone's rights are equally important.",
        "required": true
      },
      {
        "id": "via.core_dependability.04",
        "text": "Lie to get myself out of trouble.",
        "required": true
      },
      {
        "id": "via.core_dependability.05",
        "text": "Get impatient when others talk to me about their problems.",
        "required": true
      },
      {
        "id": "via.core_dependability.06",
        "text": "Take advantage of others.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:472030fcf2bb7f64d417020e2eb9c7ede9446abfc96f3f0908f9477aeecd04f2"
  },
  {
    "id": "6cd07c7d-775a-5b0b-abc9-0c22d7cec774",
    "key": "ipip-via-r-core-mastery-6",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "IPIP-VIA-R — Global core strength: mastery",
    "source": {
      "title": "IPIP-VIA-R-Based Global Core Strength Scales (Partsch, Olaru & Lechner, 2022)",
      "url": "https://ipip.ori.org/IPIP-VIA-R-core-strengths_Key.html",
      "scoringUrl": "https://ipip.ori.org/IPIP-VIA-R-core-strengths_Key.html",
      "permissionUrl": "https://ipip.ori.org/newPermission.htm",
      "permission": "IPIP items and scales are public domain; use permitted for commercial and non-commercial purposes.",
      "citation": "Partsch, M. V., Olaru, G., & Lechner, C. M. (2022). Measuring global character dimensions: Three core strengths scales. PsyArXiv.",
      "reviewedAt": "2026-10-14",
      "interpretation": "Research-based English six-item continuous mean, three positively and three reversely keyed responses; descriptive strengths, not diagnoses/norms. Core items overlap the 24 VIA-R strengths."
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
          "key": "trait.via.core.mastery",
          "method": "mean",
          "items": [
            "via.core_mastery.01",
            "via.core_mastery.02",
            "via.core_mastery.03",
            "via.core_mastery.04",
            "via.core_mastery.05",
            "via.core_mastery.06"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Global core strength: mastery",
          "direction": "non-normative",
          "reverseItems": [
            "via.core_mastery.04",
            "via.core_mastery.05",
            "via.core_mastery.06"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "via.core_mastery.01",
        "text": "Am an original thinker.",
        "required": true
      },
      {
        "id": "via.core_mastery.02",
        "text": "Have a mature view on life.",
        "required": true
      },
      {
        "id": "via.core_mastery.03",
        "text": "Am valued by my friends for my good judgment.",
        "required": true
      },
      {
        "id": "via.core_mastery.04",
        "text": "Do not stand up for my beliefs.",
        "required": true
      },
      {
        "id": "via.core_mastery.05",
        "text": "Have trouble guessing how others will react.",
        "required": true
      },
      {
        "id": "via.core_mastery.06",
        "text": "Have difficulty getting others to work together.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:b2b1a5bdf4649343e8facf439ee103de3f8e359aeaed39b85f881ae115050ecd"
  }
])

export const IPIP_VIA_R_COMPLETION_CATALOG = deepFreeze([
  {
    "key": "ipip-via-r-appreciation-beauty-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "resources",
      "meaning",
      "energy",
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
      "en": "IPIP-VIA-R — Appreciation of beauty",
      "ru": "IPIP-VIA-R: Восприятие красоты · EN"
    },
    "description": {
      "en": "Published four-item English IPIP-VIA-R personality strength scale. Not a clinical assessment or diagnostic cutoff.",
      "ru": "Опубликованная личностная шкала IPIP-VIA-R из четырёх вопросов на английском. Без клинических норм и диагнозов."
    }
  },
  {
    "key": "ipip-via-r-teamwork-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "work",
      "relationships",
      "support",
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
      "en": "IPIP-VIA-R — Teamwork and loyalty",
      "ru": "IPIP-VIA-R: Командная работа и преданность · EN"
    },
    "description": {
      "en": "Published four-item English IPIP-VIA-R personality strength scale. Not a clinical assessment or diagnostic cutoff.",
      "ru": "Опубликованная личностная шкала IPIP-VIA-R из четырёх вопросов на английском. Без клинических норм и диагнозов."
    }
  },
  {
    "key": "ipip-via-r-fairness-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "work",
      "relationships",
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
      "en": "IPIP-VIA-R — Fairness",
      "ru": "IPIP-VIA-R: Справедливость · EN"
    },
    "description": {
      "en": "Published four-item English IPIP-VIA-R personality strength scale. Not a clinical assessment or diagnostic cutoff.",
      "ru": "Опубликованная личностная шкала IPIP-VIA-R из четырёх вопросов на английском. Без клинических норм и диагнозов."
    }
  },
  {
    "key": "ipip-via-r-honesty-4",
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
      "en": "IPIP-VIA-R — Honesty and integrity",
      "ru": "IPIP-VIA-R: Честность и надёжность · EN"
    },
    "description": {
      "en": "Published four-item English IPIP-VIA-R personality strength scale. Not a clinical assessment or diagnostic cutoff.",
      "ru": "Опубликованная личностная шкала IPIP-VIA-R из четырёх вопросов на английском. Без клинических норм и диагнозов."
    }
  },
  {
    "key": "ipip-via-r-judgment-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "work",
      "clarity",
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
      "en": "IPIP-VIA-R — Judgment and open-mindedness",
      "ru": "IPIP-VIA-R: Критическое мышление и взвешенность · EN"
    },
    "description": {
      "en": "Published four-item English IPIP-VIA-R personality strength scale. Not a clinical assessment or diagnostic cutoff.",
      "ru": "Опубликованная личностная шкала IPIP-VIA-R из четырёх вопросов на английском. Без клинических норм и диагнозов."
    }
  },
  {
    "key": "ipip-via-r-kindness-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "relationships",
      "support",
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
        "key": "personality",
        "weight": 1
      }
    ],
    "title": {
      "en": "IPIP-VIA-R — Kindness and generosity",
      "ru": "IPIP-VIA-R: Доброта и поддержка · EN"
    },
    "description": {
      "en": "Published four-item English IPIP-VIA-R personality strength scale. Not a clinical assessment or diagnostic cutoff.",
      "ru": "Опубликованная личностная шкала IPIP-VIA-R из четырёх вопросов на английском. Без клинических норм и диагнозов."
    }
  },
  {
    "key": "ipip-via-r-leadership-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "work",
      "relationships",
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
      "en": "IPIP-VIA-R — Leadership",
      "ru": "IPIP-VIA-R: Лидерство · EN"
    },
    "description": {
      "en": "Published four-item English IPIP-VIA-R personality strength scale. Not a clinical assessment or diagnostic cutoff.",
      "ru": "Опубликованная личностная шкала IPIP-VIA-R из четырёх вопросов на английском. Без клинических норм и диагнозов."
    }
  },
  {
    "key": "ipip-via-r-love-of-learning-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "attention",
      "work",
      "meaning",
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
      "en": "IPIP-VIA-R — Love of learning",
      "ru": "IPIP-VIA-R: Любовь к обучению · EN"
    },
    "description": {
      "en": "Published four-item English IPIP-VIA-R personality strength scale. Not a clinical assessment or diagnostic cutoff.",
      "ru": "Опубликованная личностная шкала IPIP-VIA-R из четырёх вопросов на английском. Без клинических норм и диагнозов."
    }
  },
  {
    "key": "ipip-via-r-humility-4",
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
      "en": "IPIP-VIA-R — Modesty and humility",
      "ru": "IPIP-VIA-R: Скромность · EN"
    },
    "description": {
      "en": "Published four-item English IPIP-VIA-R personality strength scale. Not a clinical assessment or diagnostic cutoff.",
      "ru": "Опубликованная личностная шкала IPIP-VIA-R из четырёх вопросов на английском. Без клинических норм и диагнозов."
    }
  },
  {
    "key": "ipip-via-r-perspective-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "meaning",
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
      "en": "IPIP-VIA-R — Perspective and wisdom",
      "ru": "IPIP-VIA-R: Широта взгляда и мудрость · EN"
    },
    "description": {
      "en": "Published four-item English IPIP-VIA-R personality strength scale. Not a clinical assessment or diagnostic cutoff.",
      "ru": "Опубликованная личностная шкала IPIP-VIA-R из четырёх вопросов на английском. Без клинических норм и диагнозов."
    }
  },
  {
    "key": "ipip-via-r-prudence-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "work",
      "motivation",
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
      "en": "IPIP-VIA-R — Prudence",
      "ru": "IPIP-VIA-R: Осмотрительность · EN"
    },
    "description": {
      "en": "Published four-item English IPIP-VIA-R personality strength scale. Not a clinical assessment or diagnostic cutoff.",
      "ru": "Опубликованная личностная шкала IPIP-VIA-R из четырёх вопросов на английском. Без клинических норм и диагнозов."
    }
  },
  {
    "key": "ipip-via-r-self-regulation-4",
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
      "resources",
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
      "en": "IPIP-VIA-R — Self-regulation",
      "ru": "IPIP-VIA-R: Саморегуляция · EN"
    },
    "description": {
      "en": "Published four-item English IPIP-VIA-R personality strength scale. Not a clinical assessment or diagnostic cutoff.",
      "ru": "Опубликованная личностная шкала IPIP-VIA-R из четырёх вопросов на английском. Без клинических норм и диагнозов."
    }
  },
  {
    "key": "ipip-via-r-spirituality-4",
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
      "en": "IPIP-VIA-R — Spirituality and religiousness",
      "ru": "IPIP-VIA-R: Духовность и религиозность · EN"
    },
    "description": {
      "en": "Published four-item English IPIP-VIA-R personality strength scale. Not a clinical assessment or diagnostic cutoff.",
      "ru": "Опубликованная личностная шкала IPIP-VIA-R из четырёх вопросов на английском. Без клинических норм и диагнозов."
    }
  },
  {
    "key": "ipip-via-r-bravery-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "work",
      "relationships",
      "boundaries",
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
      "en": "IPIP-VIA-R — Bravery and courage",
      "ru": "IPIP-VIA-R: Смелость в выражении позиции · EN"
    },
    "description": {
      "en": "Published four-item English IPIP-VIA-R personality strength scale. Not a clinical assessment or diagnostic cutoff.",
      "ru": "Опубликованная личностная шкала IPIP-VIA-R из четырёх вопросов на английском. Без клинических норм и диагнозов."
    }
  },
  {
    "key": "ipip-via-r-core-positivity-6",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "mood",
      "resources",
      "meaning",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "other"
    ],
    "questionCount": 6,
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
      "en": "IPIP-VIA-R — Global core strength: positivity",
      "ru": "IPIP-VIA-R: Обобщённая сила: позитивность · EN"
    },
    "description": {
      "en": "Published six-item English IPIP-VIA-R core strength self-report. Overlaps component scales; interpretation is descriptive, not diagnostic.",
      "ru": "Опубликованная шкала IPIP-VIA-R из шести вопросов на английском. Частично пересекается с тематическими шкалами; результат описательный, не диагноз."
    }
  },
  {
    "key": "ipip-via-r-core-dependability-6",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "work",
      "relationships",
      "boundaries",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "work-money",
      "other"
    ],
    "questionCount": 6,
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
      "en": "IPIP-VIA-R — Global core strength: dependability",
      "ru": "IPIP-VIA-R: Обобщённая сила: надёжность · EN"
    },
    "description": {
      "en": "Published six-item English IPIP-VIA-R core strength self-report. Overlaps component scales; interpretation is descriptive, not diagnostic.",
      "ru": "Опубликованная шкала IPIP-VIA-R из шести вопросов на английском. Частично пересекается с тематическими шкалами; результат описательный, не диагноз."
    }
  },
  {
    "key": "ipip-via-r-core-mastery-6",
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
      "motivation",
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [
      "work-money",
      "other"
    ],
    "questionCount": 6,
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
      "en": "IPIP-VIA-R — Global core strength: mastery",
      "ru": "IPIP-VIA-R: Обобщённая сила: мастерство · EN"
    },
    "description": {
      "en": "Published six-item English IPIP-VIA-R core strength self-report. Overlaps component scales; interpretation is descriptive, not diagnostic.",
      "ru": "Опубликованная шкала IPIP-VIA-R из шести вопросов на английском. Частично пересекается с тематическими шкалами; результат описательный, не диагноз."
    }
  }
])

export const IPIP_VIA_R_COMPLETION_ROWS = deepFreeze([
  [
    "ipip-via-r-appreciation-beauty-4",
    "personality",
    "Notice a personally meaningful moment of beauty without judging how strongly you should respond.",
    "Отметьте близкий вам момент красоты без требования испытывать определённые чувства."
  ],
  [
    "ipip-via-r-teamwork-4",
    "personality",
    "Reflect on a group where cooperation feels safe and how roles are shared.",
    "Вспомните коллектив, в котором сотрудничество комфортно, и обратите внимание на распределение ролей."
  ],
  [
    "ipip-via-r-fairness-4",
    "personality",
    "Notice how you weigh different people's needs when making decisions.",
    "Замечайте, как учитываете потребности разных людей, принимая решения."
  ],
  [
    "ipip-via-r-honesty-4",
    "personality",
    "Consider which agreements are realistic to keep and how you communicate a needed change.",
    "Отметьте, какие договорённости реально выполнять и как сообщить об изменении планов."
  ],
  [
    "ipip-via-r-judgment-4",
    "personality",
    "Try naming one alternative interpretation before deciding on a low-stakes problem.",
    "Попробуйте назвать другую возможную интерпретацию перед решением небольшой задачи."
  ],
  [
    "ipip-via-r-kindness-4",
    "personality",
    "Notice where caring for others feels freely chosen, with space for your own boundaries.",
    "Отметьте, где забота о других добровольна и сочетается с собственными границами."
  ],
  [
    "ipip-via-r-leadership-4",
    "personality",
    "Observe when clear expectations and inviting input help people coordinate.",
    "Замечайте, когда ясные договорённости и открытость к мнениям улучшают совместную работу."
  ],
  [
    "ipip-via-r-love-of-learning-4",
    "personality",
    "Choose a topic you genuinely enjoy exploring rather than treating learning as a performance score.",
    "Выберите интересующую вас тему и исследуйте её без оценки успешности."
  ],
  [
    "ipip-via-r-humility-4",
    "personality",
    "Notice how you can acknowledge achievements without diminishing yourself or others.",
    "Отмечайте, как признавать достижения, не обесценивая себя и других."
  ],
  [
    "ipip-via-r-perspective-4",
    "personality",
    "Compare a present concern with what might matter to you in a longer time horizon.",
    "Сравните актуальную заботу с тем, что будет важно для вас на более длинном горизонте."
  ],
  [
    "ipip-via-r-prudence-4",
    "personality",
    "Before one decision, identify both a manageable risk and a possible benefit.",
    "Перед решением отметьте возможную пользу и приемлемый риск."
  ],
  [
    "ipip-via-r-self-regulation-4",
    "personality",
    "Notice whether gentle routines support your choices more than criticism or strict control.",
    "Понаблюдайте, помогают ли вам мягкие привычки лучше, чем самокритика и жёсткий контроль."
  ],
  [
    "ipip-via-r-spirituality-4",
    "personality",
    "Treat this as self-reported spiritual orientation, never as a measure of worth or mental health.",
    "Используйте результат лишь как описание духовных убеждений, не как оценку ценности человека или психического здоровья."
  ],
  [
    "ipip-via-r-bravery-4",
    "personality",
    "Think of one low-risk setting where you might express a preference respectfully.",
    "Подумайте о безопасной ситуации, где можно уважительно выразить своё мнение."
  ],
  [
    "ipip-via-r-core-positivity-6",
    "personality",
    "Notice genuine sources of hope and connection without pressure to always be positive.",
    "Отмечайте реальные источники надежды и близости без требования всегда быть позитивным."
  ],
  [
    "ipip-via-r-core-dependability-6",
    "personality",
    "Consider how consistency, fairness and realistic boundaries support trusted collaboration.",
    "Отмечайте, как последовательность, справедливость и реалистичные границы поддерживают доверие."
  ],
  [
    "ipip-via-r-core-mastery-6",
    "personality",
    "Reflect on a problem you solved with thoughtfulness, originality or supportive coordination.",
    "Вспомните задачу, где помогли вдумчивость, оригинальный подход или согласование действий."
  ]
])

export const IPIP_VIA_R_COMPLETION_DIMENSION_ROWS = deepFreeze([
  [
    "ipip-via-r-appreciation-beauty-4",
    "trait.via.appreciation_beauty",
    "personality",
    "Appreciation of beauty",
    "Восприятие красоты",
    "Notice a personally meaningful moment of beauty without judging how strongly you should respond.",
    "Отметьте близкий вам момент красоты без требования испытывать определённые чувства."
  ],
  [
    "ipip-via-r-teamwork-4",
    "trait.via.teamwork",
    "personality",
    "Teamwork and loyalty",
    "Командная работа и преданность",
    "Reflect on a group where cooperation feels safe and how roles are shared.",
    "Вспомните коллектив, в котором сотрудничество комфортно, и обратите внимание на распределение ролей."
  ],
  [
    "ipip-via-r-fairness-4",
    "trait.via.fairness",
    "personality",
    "Fairness",
    "Справедливость",
    "Notice how you weigh different people's needs when making decisions.",
    "Замечайте, как учитываете потребности разных людей, принимая решения."
  ],
  [
    "ipip-via-r-honesty-4",
    "trait.via.honesty",
    "personality",
    "Honesty and integrity",
    "Честность и надёжность",
    "Consider which agreements are realistic to keep and how you communicate a needed change.",
    "Отметьте, какие договорённости реально выполнять и как сообщить об изменении планов."
  ],
  [
    "ipip-via-r-judgment-4",
    "trait.via.judgment",
    "personality",
    "Judgment and open-mindedness",
    "Критическое мышление и взвешенность",
    "Try naming one alternative interpretation before deciding on a low-stakes problem.",
    "Попробуйте назвать другую возможную интерпретацию перед решением небольшой задачи."
  ],
  [
    "ipip-via-r-kindness-4",
    "trait.via.kindness",
    "personality",
    "Kindness and generosity",
    "Доброта и поддержка",
    "Notice where caring for others feels freely chosen, with space for your own boundaries.",
    "Отметьте, где забота о других добровольна и сочетается с собственными границами."
  ],
  [
    "ipip-via-r-leadership-4",
    "trait.via.leadership",
    "personality",
    "Leadership",
    "Лидерство",
    "Observe when clear expectations and inviting input help people coordinate.",
    "Замечайте, когда ясные договорённости и открытость к мнениям улучшают совместную работу."
  ],
  [
    "ipip-via-r-love-of-learning-4",
    "trait.via.love_of_learning",
    "personality",
    "Love of learning",
    "Любовь к обучению",
    "Choose a topic you genuinely enjoy exploring rather than treating learning as a performance score.",
    "Выберите интересующую вас тему и исследуйте её без оценки успешности."
  ],
  [
    "ipip-via-r-humility-4",
    "trait.via.humility",
    "personality",
    "Modesty and humility",
    "Скромность",
    "Notice how you can acknowledge achievements without diminishing yourself or others.",
    "Отмечайте, как признавать достижения, не обесценивая себя и других."
  ],
  [
    "ipip-via-r-perspective-4",
    "trait.via.perspective",
    "personality",
    "Perspective and wisdom",
    "Широта взгляда и мудрость",
    "Compare a present concern with what might matter to you in a longer time horizon.",
    "Сравните актуальную заботу с тем, что будет важно для вас на более длинном горизонте."
  ],
  [
    "ipip-via-r-prudence-4",
    "trait.via.prudence",
    "personality",
    "Prudence",
    "Осмотрительность",
    "Before one decision, identify both a manageable risk and a possible benefit.",
    "Перед решением отметьте возможную пользу и приемлемый риск."
  ],
  [
    "ipip-via-r-self-regulation-4",
    "trait.via.self_regulation",
    "personality",
    "Self-regulation",
    "Саморегуляция",
    "Notice whether gentle routines support your choices more than criticism or strict control.",
    "Понаблюдайте, помогают ли вам мягкие привычки лучше, чем самокритика и жёсткий контроль."
  ],
  [
    "ipip-via-r-spirituality-4",
    "trait.via.spirituality",
    "personality",
    "Spirituality and religiousness",
    "Духовность и религиозность",
    "Treat this as self-reported spiritual orientation, never as a measure of worth or mental health.",
    "Используйте результат лишь как описание духовных убеждений, не как оценку ценности человека или психического здоровья."
  ],
  [
    "ipip-via-r-bravery-4",
    "trait.via.bravery",
    "personality",
    "Bravery and courage",
    "Смелость в выражении позиции",
    "Think of one low-risk setting where you might express a preference respectfully.",
    "Подумайте о безопасной ситуации, где можно уважительно выразить своё мнение."
  ],
  [
    "ipip-via-r-core-positivity-6",
    "trait.via.core.positivity",
    "personality",
    "Global core strength: positivity",
    "Обобщённая сила: позитивность",
    "Notice genuine sources of hope and connection without pressure to always be positive.",
    "Отмечайте реальные источники надежды и близости без требования всегда быть позитивным."
  ],
  [
    "ipip-via-r-core-dependability-6",
    "trait.via.core.dependability",
    "personality",
    "Global core strength: dependability",
    "Обобщённая сила: надёжность",
    "Consider how consistency, fairness and realistic boundaries support trusted collaboration.",
    "Отмечайте, как последовательность, справедливость и реалистичные границы поддерживают доверие."
  ],
  [
    "ipip-via-r-core-mastery-6",
    "trait.via.core.mastery",
    "personality",
    "Global core strength: mastery",
    "Обобщённая сила: мастерство",
    "Reflect on a problem you solved with thoughtfulness, originality or supportive coordination.",
    "Вспомните задачу, где помогли вдумчивость, оригинальный подход или согласование действий."
  ]
])

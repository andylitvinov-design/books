import { deepFreeze } from '../../lib/assessments/contracts.js'

// Prepared candidate only; activation, report wiring and registry registration remain gated.
export const IPIP_SELF_EFFICACY_EN_V1 = deepFreeze({
  "id": "8c112d0b-d007-5e54-b3ae-4941edfa4268",
  "key": "ipip-neo-self-efficacy-10",
  "version": "v1",
  "instrumentLocale": "en",
  "translationVersion": "original-en-goldberg1999-v1",
  "timeframe": "general-self-description",
  "scoringKey": "configured",
  "scoringVersion": "v1",
  "resultVersion": "v1",
  "title": "IPIP — Perceived Task Competence (C1 Self-Efficacy)",
  "source": {
    "title": "Goldberg 1999 preliminary IPIP NEO C1 Self-Efficacy, ten-item English facet",
    "url": "https://ipip.ori.org/newNEOKey.htm",
    "sourceSection": "C1: SELF-EFFICACY; six positive and four negative items",
    "permissionUrl": "https://ipip.ori.org/newPermission.htm",
    "scoringUrl": "https://ipip.ori.org/newScoringInstructions.htm",
    "psychometricUrl": "https://ipip.ori.org/newNEO_FacetsTable.htm",
    "citation": "Goldberg LR (1999). A broad-bandwidth, public domain, personality inventory measuring the lower-level facets of several five-factor models. Personality psychology in Europe, 7, 7–28.",
    "reviewedAt": "2026-10-13",
    "permission": "Public-domain IPIP materials; commercial and non-commercial use permitted.",
    "languageNote": "Original English items. Russian report explanation is not a validated questionnaire translation.",
    "missingResponsePolicy": "Require all ten answers; no imputation or prorating. Conservative product rule, not an author-specified missing-data rule.",
    "interpretation": "Descriptive perceived task competence only. No norms, clinical bands, diagnosis, ability certification or hiring decisions.",
    "limitations": "Preliminary IPIP facet, not the licensed NEO-PI-R or Schwarzer/Jerusalem GSE. Do not use evidence for Johnson four-item C1 as if it validated this ten-item form. Standalone product validity remains unestablished."
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
  "questions": [
    {
      "id": "ipipneo.c1.01",
      "text": "Complete tasks successfully.",
      "required": true
    },
    {
      "id": "ipipneo.c1.02",
      "text": "Excel in what I do.",
      "required": true
    },
    {
      "id": "ipipneo.c1.03",
      "text": "Handle tasks smoothly.",
      "required": true
    },
    {
      "id": "ipipneo.c1.04",
      "text": "Am sure of my ground.",
      "required": true
    },
    {
      "id": "ipipneo.c1.05",
      "text": "Come up with good solutions.",
      "required": true
    },
    {
      "id": "ipipneo.c1.06",
      "text": "Know how to get things done.",
      "required": true
    },
    {
      "id": "ipipneo.c1.07",
      "text": "Misjudge situations.",
      "required": true
    },
    {
      "id": "ipipneo.c1.08",
      "text": "Don't understand things.",
      "required": true
    },
    {
      "id": "ipipneo.c1.09",
      "text": "Have little to contribute.",
      "required": true
    },
    {
      "id": "ipipneo.c1.10",
      "text": "Don't see the consequences of things.",
      "required": true
    }
  ],
  "scoring": {
    "dimensions": [
      {
        "key": "trait.ipip_neo.self_efficacy",
        "method": "sum",
        "items": [
          "ipipneo.c1.01",
          "ipipneo.c1.02",
          "ipipneo.c1.03",
          "ipipneo.c1.04",
          "ipipneo.c1.05",
          "ipipneo.c1.06",
          "ipipneo.c1.07",
          "ipipneo.c1.08",
          "ipipneo.c1.09",
          "ipipneo.c1.10"
        ],
        "reverseItems": [
          "ipipneo.c1.07",
          "ipipneo.c1.08",
          "ipipneo.c1.09",
          "ipipneo.c1.10"
        ],
        "min": 10,
        "max": 50,
        "dimensionClass": "trait",
        "sourceConstruct": "Self-Efficacy (IPIP NEO C1, 10 items)",
        "direction": "non-normative"
      }
    ]
  },
  "optionalContext": [],
  "contentHash": "sha256:5717075156e37a0e4f4b17d12b935e05a8ca3b4018a29f4220a3e4fe2f5b4dfc"
})
export const IPIP_SELF_EFFICACY_CATALOG = deepFreeze([{
  "key": "ipip-neo-self-efficacy-10",
  "version": "v1",
  "instrumentLocale": "en",
  "axis": "baseline",
  "resultAxes": [
    "baseline"
  ],
  "topics": [
    "personality",
    "self-support"
  ],
  "questionCount": 10,
  "durationMinutes": 3,
  "testStyle": "professional",
  "testLength": "medium",
  "startable": false,
  "access": "account",
  "rightsStatus": "cleared",
  "guestEligible": false,
  "free": true,
  "starterEligible": false,
  "releaseStatus": "prepared-not-published",
  "title": {
    "en": "Perceived Task Competence — IPIP (English)",
    "ru": "Уверенность в выполнении задач — IPIP (EN)"
  },
  "description": {
    "en": "Ten original-English personality items about perceived task competence. Descriptive self-reflection, not GSE or an ability test.",
    "ru": "Десять оригинальных английских пунктов о субъективной уверенности в выполнении задач. Не GSE и не тест способностей."
  }
}])

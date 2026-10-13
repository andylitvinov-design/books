import { deepFreeze } from '../../lib/assessments/contracts.js'

// Prepared release candidate: catalog remains non-startable until integration and publication gates pass.
export const IPIP_TEAMWORK_EN_V1 = deepFreeze({
  "id": "61871da1-8248-5185-95bc-a88a35210630",
  "key": "ipip-via-r-teamwork-4",
  "version": "v1",
  "instrumentLocale": "en",
  "translationVersion": "original-en-2021-v1",
  "timeframe": "general-self-description",
  "scoringKey": "configured",
  "scoringVersion": "v1",
  "resultVersion": "v1",
  "title": "IPIP-VIA-R — Citizenship/Teamwork",
  "source": {
    "title": "IPIP-VIA-R 2021 Citizenship/Teamwork [CIT; new TEA], original English four-item short scale",
    "url": "https://ipip.ori.org/IPIP-VIA-R_Key.html",
    "scoringUrl": "https://ipip.ori.org/newScoringInstructions.htm",
    "permissionUrl": "https://ipip.ori.org/newPermission.htm",
    "psychometricUrl": "https://ipip.ori.org/IPIP-VIA-R_Table.html",
    "citation": "Bluemke M, Partsch MV, Saucier G, Lechner CM. Human Character in the IPIP. 2021 preprint. doi:10.31234/osf.io/k79qf",
    "permission": "IPIP public domain; commercial and non-commercial use permitted.",
    "reviewedAt": "2026-10-13",
    "languageNote": "English questionnaire only. Russian report text is explanatory copy, not a validated Russian instrument.",
    "missingResponsePolicy": "All four answers required; no imputation. Conservative product rule, not an author-specified missing-data rule.",
    "interpretation": "Descriptive self-report score only. No diagnostic, employment-selection, moral-worth, percentile, or clinical severity interpretation.",
    "limitations": "Brief research short scale, not the proprietary VIA-IS. Standalone online administration in this product has not been independently validated."
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
      "id": "viar.ipip_via_r_teamwork_4.01",
      "text": "Am an extremely loyal person.",
      "required": true
    },
    {
      "id": "viar.ipip_via_r_teamwork_4.02",
      "text": "Support my teammates or fellow group members.",
      "required": true
    },
    {
      "id": "viar.ipip_via_r_teamwork_4.03",
      "text": "Am not good at working with a group.",
      "required": true
    },
    {
      "id": "viar.ipip_via_r_teamwork_4.04",
      "text": "Prefer to do everything alone.",
      "required": true
    }
  ],
  "scoring": {
    "dimensions": [
      {
        "key": "trait.via.teamwork",
        "method": "sum",
        "items": [
          "viar.ipip_via_r_teamwork_4.01",
          "viar.ipip_via_r_teamwork_4.02",
          "viar.ipip_via_r_teamwork_4.03",
          "viar.ipip_via_r_teamwork_4.04"
        ],
        "reverseItems": [
          "viar.ipip_via_r_teamwork_4.03",
          "viar.ipip_via_r_teamwork_4.04"
        ],
        "min": 4,
        "max": 20,
        "dimensionClass": "trait",
        "sourceConstruct": "Citizenship/Teamwork",
        "direction": "non-normative"
      }
    ]
  },
  "optionalContext": [],
  "contentHash": "sha256:81c402a48166ec36a4eb99b13953ca5490189974cce41771d47a6cee770fe054"
})

export const IPIP_TEAMWORK_CATALOG = deepFreeze([{
  "key": "ipip-via-r-teamwork-4",
  "version": "v1",
  "instrumentLocale": "en",
  "axis": "baseline",
  "resultAxes": [
    "baseline"
  ],
  "topics": [
    "relationships",
    "personality"
  ],
  "questionCount": 4,
  "durationMinutes": 1,
  "testStyle": "professional",
  "testLength": "short",
  "startable": false,
  "access": "account",
  "rightsStatus": "cleared",
  "guestEligible": false,
  "free": true,
  "starterEligible": false,
  "releaseStatus": "prepared-not-published",
  "title": {
    "en": "Teamwork — IPIP-VIA-R (English)",
    "ru": "Командная работа — IPIP-VIA-R (EN)"
  },
  "description": {
    "en": "Four original-English research items about teamwork. Descriptive self-reflection, not a clinical or selection assessment.",
    "ru": "Четыре оригинальных английских пункта о командной работе. Исследовательская самооценка, не клиническая диагностика и не оценка пригодности к работе."
  }
}])

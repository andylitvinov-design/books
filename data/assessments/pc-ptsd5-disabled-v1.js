import { deepFreeze } from '../../lib/assessments/contracts.js'

// Pinned candidate only: not included in ASSESSMENT_DEFINITIONS or any catalog.
// Administration/release policy must remain outside this immutable definition.
export const PC_PTSD5_DISABLED_V1 = deepFreeze({
  "id": "24a5a88c-3d1a-5e8a-8f10-ee39a3110a49",
  "key": "pc-ptsd-5",
  "version": "v1",
  "instrumentLocale": "en",
  "translationVersion": "original-en-2022",
  "timeframe": "past-month",
  "scoringKey": "pc-ptsd5-trauma",
  "scoringVersion": "v1",
  "resultVersion": "v1",
  "title": "Primary Care PTSD Screen for DSM-5 (PC-PTSD-5)",
  "source": {
    "title": "VA National Center for PTSD — PC-PTSD-5, official 2022 English adult form",
    "url": "https://www.ptsd.va.gov/PTSD/professional/assessment/documents/pc-ptsd-5-v6.pdf",
    "permissionUrl": "https://www.ptsd.va.gov/professional/assessment/screens/pc-ptsd.asp",
    "permission": "Explicit public-domain declaration; no noncommercial-only restriction in cited official declaration. Commercial electronic reproduction is an inference from public-domain status, not endorsement of HH.",
    "masterSha256": "70c1ef7ccad2423d39ef9f50e46d50faa36f8ad71d9d8479641029f80860702e",
    "minimumAge": 18,
    "reviewedAt": "2026-10-14",
    "nonDiagnostic": true,
    "missingResponsePolicy": "null is unanswered, never zero; require complete applicable inputs; no imputation/prorating. Incomplete result is unavailable, not a negative screen. This is product handling, not a claimed validated manual missingness rule."
  },
  "answerScale": {
    "min": 0,
    "max": 1
  },
  "responseAnchors": [
    "NO",
    "YES"
  ],
  "optionalContext": [],
  "suggestedRepeatDays": null,
  "instructions": "Sometimes things happen to people that are unusually or especially frightening, horrible, or traumatic. For example:",
  "exposureExamples": [
    "a serious accident or fire",
    "a physical or sexual assault or abuse",
    "an earthquake or flood",
    "a war",
    "seeing someone be killed or seriously injured",
    "having a loved one die through homicide or suicide."
  ],
  "questions": [
    {
      "id": "exposure",
      "text": "Have you ever experienced this kind of event?",
      "required": true,
      "timeframe": "lifetime"
    },
    {
      "id": "PC1",
      "text": "had nightmares about the event(s) or thought about the event(s) when you did not want to?",
      "required": true,
      "sectionInstructions": "In the past month, have you...",
      "applicableWhen": {
        "questionId": "exposure",
        "equals": 1
      }
    },
    {
      "id": "PC2",
      "text": "tried hard not to think about the event(s) or went out of your way to avoid situations that reminded you of the event(s)?",
      "required": true,
      "sectionInstructions": "In the past month, have you...",
      "applicableWhen": {
        "questionId": "exposure",
        "equals": 1
      }
    },
    {
      "id": "PC3",
      "text": "been constantly on guard, watchful, or easily startled?",
      "required": true,
      "sectionInstructions": "In the past month, have you...",
      "applicableWhen": {
        "questionId": "exposure",
        "equals": 1
      }
    },
    {
      "id": "PC4",
      "text": "felt numb or detached from people, activities, or your surroundings?",
      "required": true,
      "sectionInstructions": "In the past month, have you...",
      "applicableWhen": {
        "questionId": "exposure",
        "equals": 1
      }
    },
    {
      "id": "PC5",
      "text": "felt guilty or unable to stop blaming yourself or others for the event(s) or any problems the event(s) may have caused?",
      "required": true,
      "sectionInstructions": "In the past month, have you...",
      "applicableWhen": {
        "questionId": "exposure",
        "equals": 1
      }
    }
  ],
  "branching": {
    "gateQuestionId": "exposure",
    "negativeValue": 0,
    "affirmativeValue": 1,
    "negativeAnswerKeys": [
      "exposure"
    ],
    "affirmativeAnswerKeys": [
      "exposure",
      "PC1",
      "PC2",
      "PC3",
      "PC4",
      "PC5"
    ],
    "negativeResult": 0,
    "negativeSymptomsState": "structurally-skipped",
    "rejectStaleSymptomAnswers": true
  },
  "scoring": {
    "dimensions": [
      {
        "key": "symptoms.pcptsd5.total",
        "min": 0,
        "max": 5,
        "items": [
          "PC1",
          "PC2",
          "PC3",
          "PC4",
          "PC5"
        ],
        "method": "conditional-count-yes",
        "direction": "non-normative",
        "dimensionClass": "symptoms",
        "sourceConstruct": "PC-PTSD-5 past-month symptom count"
      }
    ]
  },
  "safetyText": "This adult screening questionnaire is not a diagnosis or an emergency service. Responses are not monitored in real time. Discuss concerning symptoms with a qualified health professional regardless of the score. You may stop at any time.",
  "contentHash": "sha256:599d94b7d3f4d1ef7d3a93737c16d335d76a08ed4488dd24aa400de080197b85"
})

import { deepFreeze } from '../../lib/assessments/contracts.js'

// CDC government-source, public-domain instruments. Preserve original English response and scoring.
// Healthy Days Core and Symptoms are two modules of the larger 14-item CDC HRQOL questionnaire.
export const CDC_HEALTHY_DAYS_DEFINITIONS = deepFreeze([
  {
    "id": "806b0b4d-3bf2-56bd-ad80-d3f6e4fb7341",
    "key": "cdc-hrqol-4",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "official-en-v1",
    "timeframe": "past-30-days",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "CDC Healthy Days — Core HRQOL-4",
    "source": {
      "title": "CDC Healthy Days Core Module (HRQOL-4)",
      "url": "https://archive.cdc.gov/www_cdc_gov/hrqol/hrqol14_measure.htm",
      "methodUrl": "https://archive.cdc.gov/www_cdc_gov/hrqol/methods_measures.htm",
      "permission": "us-federal-public-domain",
      "citation": "Centers for Disease Control and Prevention. Measuring Healthy Days: Population Assessment of Health-Related Quality of Life. 2000.",
      "reviewedAt": "2026-10-08",
      "nonDiagnostic": true,
      "notes": "The general health rating and physically/mentally unhealthy days are distinct variables; unhealthy-days index is capped at 30. CDC optional skip rule: if both unhealthy-day values are zero, activity limitation days should be zero."
    },
    "answerScale": {
      "min": 0,
      "max": 30
    },
    "scoring": {
      "dimensions": [
        {
          "key": "function.hrqol4.general_health",
          "method": "value",
          "items": [
            "hrqol4.01"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "function",
          "sourceConstruct": "Self-rated general health (1 excellent; 5 poor)",
          "direction": "lower-reported-difficulty"
        },
        {
          "key": "symptoms.hrqol4.physically_unhealthy_days",
          "method": "value",
          "items": [
            "hrqol4.02"
          ],
          "min": 0,
          "max": 30,
          "dimensionClass": "symptoms",
          "sourceConstruct": "Physically unhealthy days in past 30 days",
          "direction": "lower-reported-difficulty"
        },
        {
          "key": "symptoms.hrqol4.mentally_unhealthy_days",
          "method": "value",
          "items": [
            "hrqol4.03"
          ],
          "min": 0,
          "max": 30,
          "dimensionClass": "symptoms",
          "sourceConstruct": "Mentally unhealthy days in past 30 days",
          "direction": "lower-reported-difficulty"
        },
        {
          "key": "function.hrqol4.activity_limitation_days",
          "method": "value",
          "items": [
            "hrqol4.04"
          ],
          "min": 0,
          "max": 30,
          "dimensionClass": "function",
          "sourceConstruct": "Days health limited usual activities",
          "direction": "lower-reported-difficulty"
        },
        {
          "key": "symptoms.hrqol4.unhealthy_days_index",
          "method": "capped_sum",
          "items": [
            "hrqol4.02",
            "hrqol4.03"
          ],
          "cap": 30,
          "min": 0,
          "max": 30,
          "dimensionClass": "symptoms",
          "sourceConstruct": "CDC unhealthy days summary (capped at 30)",
          "direction": "lower-reported-difficulty"
        },
        {
          "key": "resources.hrqol4.healthy_days_index",
          "method": "healthy_days",
          "items": [
            "hrqol4.02",
            "hrqol4.03"
          ],
          "cap": 30,
          "min": 0,
          "max": 30,
          "dimensionClass": "resources",
          "sourceConstruct": "CDC healthy days summary (30 minus unhealthy days)",
          "direction": "higher-reported-resource"
        }
      ]
    },
    "questions": [
      {
        "id": "hrqol4.01",
        "text": "Would you say that in general your health is",
        "required": true,
        "min": 1,
        "max": 5,
        "responseAnchors": [
          "Excellent",
          "Very good",
          "Good",
          "Fair",
          "Poor"
        ]
      },
      {
        "id": "hrqol4.02",
        "text": "Now thinking about your physical health, which includes physical illness and injury, for how many days during the past 30 days was your physical health not good?",
        "required": true,
        "min": 0,
        "max": 30,
        "inputType": "day-count"
      },
      {
        "id": "hrqol4.03",
        "text": "Now thinking about your mental health, which includes stress, depression, and problems with emotions, for how many days during the past 30 days was your mental health not good?",
        "required": true,
        "min": 0,
        "max": 30,
        "inputType": "day-count"
      },
      {
        "id": "hrqol4.04",
        "text": "During the past 30 days, for about how many days did poor physical or mental health keep you from doing your usual activities, such as self-care, work, or recreation?",
        "required": true,
        "min": 0,
        "max": 30,
        "inputType": "day-count"
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 30,
    "contentHash": "sha256:b628fbdf99ec2869b353c7098bd600f90ad31c3cd8d23a079936bb23d804b875"
  },
  {
    "id": "96b0c77e-6431-5bac-a999-0e5ec4fa2250",
    "key": "cdc-healthy-days-symptoms",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "official-en-v1",
    "timeframe": "past-30-days",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "CDC Healthy Days — Symptoms Module",
    "source": {
      "title": "CDC Healthy Days Symptoms Module (part of HRQOL-14)",
      "url": "https://archive.cdc.gov/www_cdc_gov/hrqol/hrqol14_measure.htm",
      "permission": "us-federal-public-domain",
      "citation": "Centers for Disease Control and Prevention. Measuring Healthy Days: Population Assessment of Health-Related Quality of Life. 2000.",
      "reviewedAt": "2026-10-08",
      "nonDiagnostic": true,
      "notes": "Five individual counts of days in past 30 days. No validated total score, diagnostic threshold, or synthetic symptom severity score."
    },
    "answerScale": {
      "min": 0,
      "max": 30
    },
    "scoring": {
      "dimensions": [
        {
          "key": "symptoms.cdc_healthy_days.pain_days",
          "method": "value",
          "items": [
            "hrqols.01"
          ],
          "min": 0,
          "max": 30,
          "dimensionClass": "symptoms",
          "sourceConstruct": "Days pain limited activities",
          "direction": "lower-reported-difficulty"
        },
        {
          "key": "symptoms.cdc_healthy_days.sad_days",
          "method": "value",
          "items": [
            "hrqols.02"
          ],
          "min": 0,
          "max": 30,
          "dimensionClass": "symptoms",
          "sourceConstruct": "Days feeling sad or depressed",
          "direction": "lower-reported-difficulty"
        },
        {
          "key": "symptoms.cdc_healthy_days.anxiety_days",
          "method": "value",
          "items": [
            "hrqols.03"
          ],
          "min": 0,
          "max": 30,
          "dimensionClass": "symptoms",
          "sourceConstruct": "Days worried/tense/anxious",
          "direction": "lower-reported-difficulty"
        },
        {
          "key": "symptoms.cdc_healthy_days.sleep_days",
          "method": "value",
          "items": [
            "hrqols.04"
          ],
          "min": 0,
          "max": 30,
          "dimensionClass": "symptoms",
          "sourceConstruct": "Days with insufficient rest/sleep",
          "direction": "lower-reported-difficulty"
        },
        {
          "key": "resources.cdc_healthy_days.vitality_days",
          "method": "value",
          "items": [
            "hrqols.05"
          ],
          "min": 0,
          "max": 30,
          "dimensionClass": "resources",
          "sourceConstruct": "Days with high energy and vitality",
          "direction": "higher-reported-resource"
        }
      ]
    },
    "questions": [
      {
        "id": "hrqols.01",
        "text": "During the past 30 days, for about how many days did pain make it hard for you to do your usual activities, such as self-care, work, or recreation?",
        "required": true,
        "min": 0,
        "max": 30,
        "inputType": "day-count"
      },
      {
        "id": "hrqols.02",
        "text": "During the past 30 days, for about how many days have you felt sad, blue, or depressed?",
        "required": true,
        "min": 0,
        "max": 30,
        "inputType": "day-count"
      },
      {
        "id": "hrqols.03",
        "text": "During the past 30 days, for about how many days have you felt worried, tense, or anxious?",
        "required": true,
        "min": 0,
        "max": 30,
        "inputType": "day-count"
      },
      {
        "id": "hrqols.04",
        "text": "During the past 30 days, for about how many days have you felt you did not get enough rest or sleep?",
        "required": true,
        "min": 0,
        "max": 30,
        "inputType": "day-count"
      },
      {
        "id": "hrqols.05",
        "text": "During the past 30 days, for about how many days have you felt very healthy and full of energy?",
        "required": true,
        "min": 0,
        "max": 30,
        "inputType": "day-count"
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 30,
    "contentHash": "sha256:75a7f10c0322d8092b4ed88d68d71c7c5da711b6cd53dcd4ef724eca2c003e70"
  }
])
export const CDC_HEALTHY_DAYS_CATALOG = deepFreeze([
  {
    "key": "cdc-hrqol-4",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "function",
    "resultAxes": [
      "function",
      "symptoms",
      "resources"
    ],
    "topics": [
      "body",
      "mood",
      "stress",
      "function",
      "energy"
    ],
    "categoryAffinities": [
      "body",
      "energy",
      "emotions",
      "other"
    ],
    "moodAffinities": [
      "sad",
      "neutral",
      "happy"
    ],
    "questionCount": 4,
    "durationMinutes": 3,
    "testStyle": "professional",
    "testLength": "medium",
    "suggestedRepeatDays": 30,
    "cooldownDays": 14,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": true,
    "starterEligible": true,
    "free": true,
    "analysisAxes": [
      {
        "key": "functioning",
        "weight": 1
      },
      {
        "key": "mood",
        "weight": 0.67
      },
      {
        "key": "energy",
        "weight": 0.71
      },
      {
        "key": "stress",
        "weight": 0.67
      }
    ],
    "title": {
      "en": "CDC Healthy Days — Health & Function",
      "ru": "CDC Healthy Days — здоровье и повседневность · EN"
    },
    "description": {
      "en": "Four standardized CDC questions plus properly calculated unhealthy/healthy days. Source-English questionnaire only. Not a diagnosis.",
      "ru": "Четыре стандартизованных вопроса CDC: здоровье, физическое и психологическое самочувствие, ограничения за месяц. Оригинал EN; не диагноз."
    }
  },
  {
    "key": "cdc-healthy-days-symptoms",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "symptoms",
    "resultAxes": [
      "symptoms",
      "resources"
    ],
    "topics": [
      "body",
      "mood",
      "anxiety",
      "sleep",
      "energy",
      "function"
    ],
    "categoryAffinities": [
      "body",
      "energy",
      "emotions"
    ],
    "moodAffinities": [
      "sad",
      "neutral",
      "happy"
    ],
    "questionCount": 5,
    "durationMinutes": 3,
    "testStyle": "professional",
    "testLength": "medium",
    "suggestedRepeatDays": 30,
    "cooldownDays": 14,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": true,
    "starterEligible": true,
    "free": true,
    "analysisAxes": [
      {
        "key": "mood",
        "weight": 0.85
      },
      {
        "key": "anxiety",
        "weight": 0.85
      },
      {
        "key": "sleep",
        "weight": 0.82
      },
      {
        "key": "energy",
        "weight": 0.85
      },
      {
        "key": "functioning",
        "weight": 0.55
      }
    ],
    "title": {
      "en": "CDC Healthy Days — Symptoms",
      "ru": "CDC Healthy Days — симптомы и энергия · EN"
    },
    "description": {
      "en": "Five original CDC 30-day day-count questions about pain, low mood, worry, sleep and energy. No synthetic total score.",
      "ru": "Пять оригинальных вопросов CDC за 30 дней: боль, настроение, тревога, сон и энергия. Без искусственного общего балла; EN."
    }
  }
])

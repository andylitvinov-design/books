import { deepFreeze } from '../../lib/assessments/contracts.js'

// Six original EN professional measures with verified non-restrictive permissions.
// Keep item order, score boundaries and reverse-coded item lists unchanged.
// Research/meta entries requiring permission remain disabled in the registry.
export const PROFESSIONAL_BATTERY_2026_B_DEFINITIONS = deepFreeze([
  {
    "id": "cd9f2026-0001-5bc1-8e42-7a912a620001",
    "key": "phq-2",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "official-en-v1",
    "timeframe": "past-2-weeks",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "PHQ-2 — Mood Screening",
    "source": {
      "title": "Patient Health Questionnaire-2 (PHQ-2)",
      "url": "https://loinc.org/55757-9/panel",
      "permission": "Pfizer: reproduction, translation, display and distribution allowed without permission.",
      "citation": "Kroenke K et al. The Patient Health Questionnaire-2. Med Care. 2003;41(11):1284–1292.",
      "reviewedAt": "2026-10-10",
      "interpretation": "Self-report questionnaire for discussion; not a diagnosis or personalized medical guidance."
    },
    "answerScale": {
      "min": 0,
      "max": 3
    },
    "responseAnchors": [
      "Not at all",
      "Several days",
      "More than half the days",
      "Nearly every day"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "symptoms.phq_2.total",
          "method": "sum",
          "items": [
            "phq2.01",
            "phq2.02"
          ],
          "min": 0,
          "max": 6,
          "dimensionClass": "symptoms",
          "sourceConstruct": "Patient Health Questionnaire-2 (PHQ-2)",
          "direction": "lower-reported-difficulty"
        }
      ]
    },
    "questions": [
      {
        "id": "phq2.01",
        "text": "Little interest or pleasure in doing things",
        "required": true
      },
      {
        "id": "phq2.02",
        "text": "Feeling down, depressed, or hopeless",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 14,
    "contentHash": "sha256:a94e767c0cc6d378da657dddca5139d9d27ad1c9e7d3d6efe51736d264dca049"
  },
  {
    "id": "cd9f2026-0002-5bc1-8e42-7a912a620002",
    "key": "gad-2",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "official-en-v1",
    "timeframe": "past-2-weeks",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "GAD-2 — Anxiety Screening",
    "source": {
      "title": "Generalized Anxiety Disorder Scale-2 (GAD-2)",
      "url": "https://www.ncbi.nlm.nih.gov/books/NBK92248/",
      "permission": "Pfizer original GAD items: no permission required to reproduce, translate, display or distribute.",
      "citation": "Kroenke K et al. Anxiety disorders in primary care: prevalence, impairment, comorbidity, and detection. Ann Intern Med. 2007;146:317–325.",
      "reviewedAt": "2026-10-10",
      "interpretation": "Self-report questionnaire for discussion; not a diagnosis or personalized medical guidance."
    },
    "answerScale": {
      "min": 0,
      "max": 3
    },
    "responseAnchors": [
      "Not at all",
      "Several days",
      "More than half the days",
      "Nearly every day"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "symptoms.gad_2.total",
          "method": "sum",
          "items": [
            "gad2.01",
            "gad2.02"
          ],
          "min": 0,
          "max": 6,
          "dimensionClass": "symptoms",
          "sourceConstruct": "Generalized Anxiety Disorder Scale-2 (GAD-2)",
          "direction": "lower-reported-difficulty"
        }
      ]
    },
    "questions": [
      {
        "id": "gad2.01",
        "text": "Feeling nervous, anxious, or on edge",
        "required": true
      },
      {
        "id": "gad2.02",
        "text": "Not being able to stop or control worrying",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 14,
    "contentHash": "sha256:b877b59518ded218f072485d178f68fbd2517bc49911ff0da8b334f9f36558cb"
  },
  {
    "id": "cd9f2026-0003-5bc1-8e42-7a912a620003",
    "key": "k10",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "official-en-v1",
    "timeframe": "past-30-days",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "K10 — Psychological Distress",
    "source": {
      "title": "Kessler Psychological Distress Scale-10 (K10)",
      "url": "https://rckessler.scholars.harvard.edu/k10-and-k6-scales",
      "permission": "Ronald C. Kessler PhD ©: free use without formal permission, citation and copyright requested.",
      "citation": "Kessler RC et al. Screening for serious mental illness in the general population. Arch Gen Psychiatry. 2003;60(2):184–189.",
      "reviewedAt": "2026-10-10",
      "interpretation": "Self-report questionnaire for discussion; not a diagnosis or personalized medical guidance."
    },
    "answerScale": {
      "min": 0,
      "max": 4
    },
    "responseAnchors": [
      "None of the time",
      "A little of the time",
      "Some of the time",
      "Most of the time",
      "All of the time"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "symptoms.k10.total",
          "method": "sum",
          "items": [
            "k10.01",
            "k10.02",
            "k10.03",
            "k10.04",
            "k10.05",
            "k10.06",
            "k10.07",
            "k10.08",
            "k10.09",
            "k10.10"
          ],
          "min": 0,
          "max": 40,
          "dimensionClass": "symptoms",
          "sourceConstruct": "Kessler Psychological Distress Scale-10 (K10)",
          "direction": "lower-reported-difficulty"
        }
      ]
    },
    "questions": [
      {
        "id": "k10.01",
        "text": "Tired out for no good reason?",
        "required": true
      },
      {
        "id": "k10.02",
        "text": "Nervous?",
        "required": true
      },
      {
        "id": "k10.03",
        "text": "So nervous that nothing could calm you down?",
        "required": true
      },
      {
        "id": "k10.04",
        "text": "Hopeless?",
        "required": true
      },
      {
        "id": "k10.05",
        "text": "Restless or fidgety?",
        "required": true
      },
      {
        "id": "k10.06",
        "text": "So restless that you could not sit still?",
        "required": true
      },
      {
        "id": "k10.07",
        "text": "Depressed?",
        "required": true
      },
      {
        "id": "k10.08",
        "text": "So depressed that nothing could cheer you up?",
        "required": true
      },
      {
        "id": "k10.09",
        "text": "That everything was an effort?",
        "required": true
      },
      {
        "id": "k10.10",
        "text": "Worthless?",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 30,
    "contentHash": "sha256:54fba3f0640d89f66c2b819bbcd2d0a8083f886af4ea485f4b2c398fd8b44d60"
  },
  {
    "id": "cd9f2026-0004-5bc1-8e42-7a912a620004",
    "key": "phq-15",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "official-en-v1",
    "timeframe": "past-4-weeks",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "PHQ-15 — Physical Symptom Burden",
    "source": {
      "title": "Patient Health Questionnaire-15 (PHQ-15)",
      "url": "https://ubwp.buffalo.edu/rdc-tmdinternational/wp-content/uploads/sites/58/2017/01/PHQ-15_2013-05-12.pdf",
      "permission": "Pfizer Inc. ©: no permission required to reproduce, translate, display or distribute.",
      "citation": "Kroenke K, Spitzer RL, Williams JBW. The PHQ-15: validity of a new measure for evaluating somatic symptom severity. Psychosom Med. 2002;64:258–266.",
      "reviewedAt": "2026-10-10",
      "interpretation": "Self-report questionnaire for discussion; not a diagnosis or personalized medical guidance."
    },
    "answerScale": {
      "min": 0,
      "max": 2
    },
    "responseAnchors": [
      "Not bothered at all",
      "Bothered a little",
      "Bothered a lot"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "symptoms.phq_15.total",
          "method": "sum",
          "items": [
            "phq15.01",
            "phq15.02",
            "phq15.03",
            "phq15.04",
            "phq15.05",
            "phq15.06",
            "phq15.07",
            "phq15.08",
            "phq15.09",
            "phq15.10",
            "phq15.11",
            "phq15.12",
            "phq15.13",
            "phq15.14",
            "phq15.15"
          ],
          "min": 0,
          "max": 30,
          "dimensionClass": "symptoms",
          "sourceConstruct": "Patient Health Questionnaire-15 (PHQ-15)",
          "direction": "lower-reported-difficulty"
        }
      ]
    },
    "questions": [
      {
        "id": "phq15.01",
        "text": "Stomach pain",
        "required": true
      },
      {
        "id": "phq15.02",
        "text": "Back pain",
        "required": true
      },
      {
        "id": "phq15.03",
        "text": "Pain in your arms, legs, or joints (knees, hips, etc.)",
        "required": true
      },
      {
        "id": "phq15.04",
        "text": "Menstrual cramps or other problems with your periods",
        "required": true,
        "helpText": "If this does not apply to you, choose Not bothered at all."
      },
      {
        "id": "phq15.05",
        "text": "Headaches",
        "required": true
      },
      {
        "id": "phq15.06",
        "text": "Chest pain",
        "required": true
      },
      {
        "id": "phq15.07",
        "text": "Dizziness",
        "required": true
      },
      {
        "id": "phq15.08",
        "text": "Fainting spells",
        "required": true
      },
      {
        "id": "phq15.09",
        "text": "Feeling your heart pound or race",
        "required": true
      },
      {
        "id": "phq15.10",
        "text": "Shortness of breath",
        "required": true
      },
      {
        "id": "phq15.11",
        "text": "Pain or problems during sexual intercourse",
        "required": true,
        "helpText": "If this does not apply to you, choose Not bothered at all."
      },
      {
        "id": "phq15.12",
        "text": "Constipation, loose bowels, or diarrhea",
        "required": true
      },
      {
        "id": "phq15.13",
        "text": "Nausea, gas, or indigestion",
        "required": true
      },
      {
        "id": "phq15.14",
        "text": "Feeling tired or having low energy",
        "required": true
      },
      {
        "id": "phq15.15",
        "text": "Trouble sleeping",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 30,
    "contentHash": "sha256:3a2514d6890bcfbf060faa5caa31f329d77e44765a57b309c9d975643b1c4250"
  },
  {
    "id": "cd9f2026-0005-5bc1-8e42-7a912a620005",
    "key": "rses-10",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "official-en-v1",
    "timeframe": "general",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "Rosenberg Self-Esteem Scale",
    "source": {
      "title": "Rosenberg Self-Esteem Scale (RSES)",
      "url": "https://socy.umd.edu/about-us/using-rosenberg-self-esteem-scale",
      "permission": "University of Maryland Sociology Department: public domain; free reuse and adaptations with attribution.",
      "citation": "Rosenberg M. Society and the Adolescent Self-Image. Princeton University Press; 1965.",
      "reviewedAt": "2026-10-10",
      "interpretation": "Self-report questionnaire for discussion; not a diagnosis or personalized medical guidance."
    },
    "answerScale": {
      "min": 0,
      "max": 3
    },
    "responseAnchors": [
      "Strongly disagree",
      "Disagree",
      "Agree",
      "Strongly agree"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "resources.rses_10.total",
          "method": "sum",
          "items": [
            "rses10.01",
            "rses10.02",
            "rses10.03",
            "rses10.04",
            "rses10.05",
            "rses10.06",
            "rses10.07",
            "rses10.08",
            "rses10.09",
            "rses10.10"
          ],
          "min": 0,
          "max": 30,
          "dimensionClass": "resources",
          "sourceConstruct": "Rosenberg Self-Esteem Scale (RSES)",
          "direction": "higher-reported-resource",
          "reverseItems": [
            "rses10.03",
            "rses10.05",
            "rses10.08",
            "rses10.09",
            "rses10.10"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "rses10.01",
        "text": "I feel that I'm a person of worth, at least on an equal plane with others.",
        "required": true
      },
      {
        "id": "rses10.02",
        "text": "I feel that I have a number of good qualities.",
        "required": true
      },
      {
        "id": "rses10.03",
        "text": "All in all, I am inclined to feel that I am a failure.",
        "required": true
      },
      {
        "id": "rses10.04",
        "text": "I am able to do things as well as most other people.",
        "required": true
      },
      {
        "id": "rses10.05",
        "text": "I feel I do not have much to be proud of.",
        "required": true
      },
      {
        "id": "rses10.06",
        "text": "I take a positive attitude toward myself.",
        "required": true
      },
      {
        "id": "rses10.07",
        "text": "On the whole, I am satisfied with myself.",
        "required": true
      },
      {
        "id": "rses10.08",
        "text": "I wish I could have more respect for myself.",
        "required": true
      },
      {
        "id": "rses10.09",
        "text": "I certainly feel useless at times.",
        "required": true
      },
      {
        "id": "rses10.10",
        "text": "At times I think I am no good at all.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 30,
    "contentHash": "sha256:12b7cf0a24a21f2b89eec5456fa46fc277ba800ffb3e14a0d51aa9d82212be7a"
  },
  {
    "id": "cd9f2026-0006-5bc1-8e42-7a912a620006",
    "key": "ces-d-20",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "official-en-v1",
    "timeframe": "past-7-days",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "CES-D 20 — Mood & Symptoms",
    "source": {
      "title": "Center for Epidemiologic Studies Depression Scale (CES-D, 20 items)",
      "url": "https://www.ncbi.nlm.nih.gov/books/NBK572958/table/ap2.t1/",
      "permission": "U.S. SAMHSA public-domain reproduction: freely copy/modify/distribute including commercially, with citation.",
      "citation": "Radloff LS. The CES-D scale: a self-report depression scale for research in the general population. Appl Psychol Meas. 1977;1(3):385–401.",
      "reviewedAt": "2026-10-10",
      "interpretation": "Self-report questionnaire for discussion; not a diagnosis or personalized medical guidance."
    },
    "answerScale": {
      "min": 0,
      "max": 3
    },
    "responseAnchors": [
      "Rarely or none of the time (less than one day)",
      "Some or a little of the time (1–2 days)",
      "Occasionally or a moderate amount of the time (3–4 days)",
      "Most or all of the time (5–7 days)"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "symptoms.ces_d_20.total",
          "method": "sum",
          "items": [
            "cesd20.01",
            "cesd20.02",
            "cesd20.03",
            "cesd20.04",
            "cesd20.05",
            "cesd20.06",
            "cesd20.07",
            "cesd20.08",
            "cesd20.09",
            "cesd20.10",
            "cesd20.11",
            "cesd20.12",
            "cesd20.13",
            "cesd20.14",
            "cesd20.15",
            "cesd20.16",
            "cesd20.17",
            "cesd20.18",
            "cesd20.19",
            "cesd20.20"
          ],
          "min": 0,
          "max": 60,
          "dimensionClass": "symptoms",
          "sourceConstruct": "Center for Epidemiologic Studies Depression Scale (CES-D, 20 items)",
          "direction": "lower-reported-difficulty",
          "reverseItems": [
            "cesd20.04",
            "cesd20.08",
            "cesd20.12",
            "cesd20.16"
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "cesd20.01",
        "text": "I was bothered by things that usually don't bother me.",
        "required": true
      },
      {
        "id": "cesd20.02",
        "text": "I did not feel like eating; my appetite was poor.",
        "required": true
      },
      {
        "id": "cesd20.03",
        "text": "I felt that I could not shake off the blues even with help from my family or friends.",
        "required": true
      },
      {
        "id": "cesd20.04",
        "text": "I felt that I was just as good as other people.",
        "required": true
      },
      {
        "id": "cesd20.05",
        "text": "I had trouble keeping my mind on what I was doing.",
        "required": true
      },
      {
        "id": "cesd20.06",
        "text": "I felt depressed.",
        "required": true
      },
      {
        "id": "cesd20.07",
        "text": "I felt that everything I did was an effort.",
        "required": true
      },
      {
        "id": "cesd20.08",
        "text": "I felt hopeful about the future.",
        "required": true
      },
      {
        "id": "cesd20.09",
        "text": "I thought my life had been a failure.",
        "required": true
      },
      {
        "id": "cesd20.10",
        "text": "I felt fearful.",
        "required": true
      },
      {
        "id": "cesd20.11",
        "text": "My sleep was restless.",
        "required": true
      },
      {
        "id": "cesd20.12",
        "text": "I was happy.",
        "required": true
      },
      {
        "id": "cesd20.13",
        "text": "I talked less than usual.",
        "required": true
      },
      {
        "id": "cesd20.14",
        "text": "I felt lonely.",
        "required": true
      },
      {
        "id": "cesd20.15",
        "text": "People were unfriendly.",
        "required": true
      },
      {
        "id": "cesd20.16",
        "text": "I enjoyed life.",
        "required": true
      },
      {
        "id": "cesd20.17",
        "text": "I had crying spells.",
        "required": true
      },
      {
        "id": "cesd20.18",
        "text": "I felt sad.",
        "required": true
      },
      {
        "id": "cesd20.19",
        "text": "I felt that people disliked me.",
        "required": true
      },
      {
        "id": "cesd20.20",
        "text": "I could not get going.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": 30,
    "contentHash": "sha256:b81ffa4771939ad5edcca7eb3a52f2b43b11d0aea9376403e862073f4143046d"
  }
])
export const PROFESSIONAL_BATTERY_2026_B_CATALOG = deepFreeze([
  {
    "key": "phq-2",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "symptoms",
    "resultAxes": [
      "symptoms"
    ],
    "topics": [
      "mood"
    ],
    "categoryAffinities": [
      "emotions",
      "body",
      "other"
    ],
    "moodAffinities": [
      "sad",
      "neutral"
    ],
    "questionCount": 2,
    "durationMinutes": 1,
    "testStyle": "professional",
    "testLength": "short",
    "suggestedRepeatDays": 14,
    "cooldownDays": 7,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": true,
    "free": true,
    "starterEligible": false,
    "analysisAxes": [
      {
        "key": "mood",
        "weight": 1
      },
      {
        "key": "functioning",
        "weight": 0.25
      }
    ],
    "title": {
      "en": "PHQ-2 — Mood Screening",
      "ru": "PHQ-2 — скрининг настроения (EN)"
    },
    "description": {
      "en": "Original two-item PHQ depressive symptom screener over the past two weeks. Not a diagnosis.",
      "ru": "Оригинальные два вопроса PHQ о настроении за две недели. Опросник на английском; не диагноз."
    }
  },
  {
    "key": "gad-2",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "symptoms",
    "resultAxes": [
      "symptoms"
    ],
    "topics": [
      "anxiety",
      "stress"
    ],
    "categoryAffinities": [
      "emotions",
      "body",
      "other"
    ],
    "moodAffinities": [
      "sad",
      "neutral"
    ],
    "questionCount": 2,
    "durationMinutes": 1,
    "testStyle": "professional",
    "testLength": "short",
    "suggestedRepeatDays": 14,
    "cooldownDays": 7,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": true,
    "free": true,
    "starterEligible": false,
    "analysisAxes": [
      {
        "key": "anxiety",
        "weight": 1
      },
      {
        "key": "stress",
        "weight": 0.75
      },
      {
        "key": "emotional_regulation",
        "weight": 0.4
      }
    ],
    "title": {
      "en": "GAD-2 — Anxiety Screening",
      "ru": "GAD-2 — скрининг тревоги (EN)"
    },
    "description": {
      "en": "First two validated GAD-7 items about anxiety over the past two weeks. Not a diagnosis.",
      "ru": "Два оригинальных вопроса шкалы GAD-7 о тревоге за две недели. Не диагноз; вопросы на английском."
    }
  },
  {
    "key": "k10",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "symptoms",
    "resultAxes": [
      "symptoms"
    ],
    "topics": [
      "stress",
      "mood",
      "anxiety",
      "function"
    ],
    "categoryAffinities": [
      "emotions",
      "body",
      "other"
    ],
    "moodAffinities": [
      "sad",
      "neutral"
    ],
    "questionCount": 10,
    "durationMinutes": 3,
    "testStyle": "professional",
    "testLength": "medium",
    "suggestedRepeatDays": 30,
    "cooldownDays": 7,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": false,
    "free": true,
    "starterEligible": false,
    "analysisAxes": [
      {
        "key": "stress",
        "weight": 0.96
      },
      {
        "key": "anxiety",
        "weight": 0.83
      },
      {
        "key": "mood",
        "weight": 0.83
      },
      {
        "key": "functioning",
        "weight": 0.43
      }
    ],
    "title": {
      "en": "K10 — Psychological Distress",
      "ru": "K10 — психологический дистресс (EN)"
    },
    "description": {
      "en": "Original ten-item Kessler K10: nonspecific psychological distress during the past 30 days. Scores 0–40; not a diagnosis.",
      "ru": "Оригинальная 10-пунктовая шкала Кесслера за последние 30 дней (0–40). Не диагноз; вопросы на английском."
    }
  },
  {
    "key": "phq-15",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "symptoms",
    "resultAxes": [
      "symptoms"
    ],
    "topics": [
      "body",
      "stress",
      "sleep",
      "energy"
    ],
    "categoryAffinities": [
      "emotions",
      "body",
      "other"
    ],
    "moodAffinities": [
      "sad",
      "neutral"
    ],
    "questionCount": 15,
    "durationMinutes": 4,
    "testStyle": "professional",
    "testLength": "comprehensive",
    "suggestedRepeatDays": 30,
    "cooldownDays": 7,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": false,
    "free": true,
    "starterEligible": false,
    "analysisAxes": [
      {
        "key": "functioning",
        "weight": 0.8
      },
      {
        "key": "energy",
        "weight": 0.82
      },
      {
        "key": "sleep",
        "weight": 0.72
      },
      {
        "key": "stress",
        "weight": 0.63
      }
    ],
    "title": {
      "en": "PHQ-15 — Physical Symptom Burden",
      "ru": "PHQ-15 — выраженность телесных симптомов (EN)"
    },
    "description": {
      "en": "Original Pfizer PHQ-15 questionnaire covering fifteen physical symptom complaints over the past four weeks. Score 0–30; medical symptoms deserve medical evaluation.",
      "ru": "Оригинальные 15 вопросов PHQ о телесных симптомах за четыре недели (0–30). Не диагноз; вопросы на английском."
    }
  },
  {
    "key": "rses-10",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "resources",
    "resultAxes": [
      "resources"
    ],
    "topics": [
      "self-support",
      "resources",
      "personality",
      "mood"
    ],
    "categoryAffinities": [
      "emotions",
      "body",
      "other"
    ],
    "moodAffinities": [
      "sad",
      "neutral"
    ],
    "questionCount": 10,
    "durationMinutes": 3,
    "testStyle": "professional",
    "testLength": "medium",
    "suggestedRepeatDays": 30,
    "cooldownDays": 7,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": true,
    "free": true,
    "starterEligible": false,
    "analysisAxes": [
      {
        "key": "self_support",
        "weight": 1
      },
      {
        "key": "resource",
        "weight": 0.82
      },
      {
        "key": "personality",
        "weight": 0.61
      },
      {
        "key": "mood",
        "weight": 0.48
      }
    ],
    "title": {
      "en": "Rosenberg Self-Esteem Scale",
      "ru": "Шкала самооценки Розенберга (EN)"
    },
    "description": {
      "en": "Ten-item Rosenberg Self-Esteem Scale measuring global self-regard. Higher score reflects stronger reported self-esteem; no diagnostic cutoffs.",
      "ru": "Классическая шкала Розенберга: 10 высказываний о самооценке. Не диагностический тест; английский оригинал."
    }
  },
  {
    "key": "ces-d-20",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "symptoms",
    "resultAxes": [
      "symptoms"
    ],
    "topics": [
      "mood",
      "stress",
      "sleep",
      "energy",
      "relationships"
    ],
    "categoryAffinities": [
      "emotions",
      "body",
      "other"
    ],
    "moodAffinities": [
      "sad",
      "neutral"
    ],
    "questionCount": 20,
    "durationMinutes": 6,
    "testStyle": "professional",
    "testLength": "comprehensive",
    "suggestedRepeatDays": 30,
    "cooldownDays": 7,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": false,
    "free": true,
    "starterEligible": false,
    "analysisAxes": [
      {
        "key": "mood",
        "weight": 1
      },
      {
        "key": "stress",
        "weight": 0.78
      },
      {
        "key": "sleep",
        "weight": 0.52
      },
      {
        "key": "energy",
        "weight": 0.65
      },
      {
        "key": "relationships",
        "weight": 0.32
      }
    ],
    "title": {
      "en": "CES-D 20 — Mood & Symptoms",
      "ru": "CES-D 20 — настроение и симптомы (EN)"
    },
    "description": {
      "en": "Original twenty-item Center for Epidemiologic Studies Depression Scale for symptoms experienced in the past week; four positive items are reverse-scored. Not a diagnosis.",
      "ru": "Классическая 20-пунктовая CES-D за прошедшую неделю; четыре позитивных пункта с обратным подсчётом. Не диагноз; английский оригинал."
    }
  }
])

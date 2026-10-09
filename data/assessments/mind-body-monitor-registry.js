// Canonical Mind–Body Monitor research registry.
// Product source: Holistic House — Psychic Health Monitoring Test Database
// https://docs.google.com/spreadsheets/d/13tKxFlypfuaEWh0Vy0NeYasCZ-iItRkmZTEx7eB9E5k/edit
//
// This file is metadata only. It does not grant permission to reproduce questionnaire items.
// Consumer UI must respect rightsStatus + access before exposing an instrument.

export const MONITOR_REGISTRY_SOURCE =
  'https://docs.google.com/spreadsheets/d/13tKxFlypfuaEWh0Vy0NeYasCZ-iItRkmZTEx7eB9E5k/edit'

export const RIGHTS_STATUS = Object.freeze({
  READY_PUBLIC: 'ready_public',
  READY_ACCOUNT: 'ready_account',
  RIGHTS_REVIEW: 'rights_review',
  PERMISSION_REQUIRED: 'permission_required',
  LICENSED_ONLY: 'licensed_only',
  CLINICIAN_ONLY: 'clinician_only',
  MANAGED_SAFETY_ONLY: 'managed_safety_only',
  INTERNAL_REFERENCE: 'internal_reference',
})

export const MONITOR_AREAS = Object.freeze([
  { key: 'quick', order: 1, en: 'Quick check-ins', ru: 'Быстрые проверки' },
  { key: 'mood', order: 2, en: 'Mood & anxiety', ru: 'Настроение и тревожность' },
  { key: 'stress', order: 3, en: 'Stress & burnout', ru: 'Стресс и выгорание' },
  { key: 'sleep', order: 4, en: 'Sleep & recovery', ru: 'Сон и восстановление' },
  { key: 'body', order: 5, en: 'Body, energy & clarity', ru: 'Тело, энергия и ясность' },
  { key: 'relationships', order: 6, en: 'Relationships & support', ru: 'Отношения и поддержка' },
  { key: 'resources', order: 7, en: 'Resilience & emotion regulation', ru: 'Ресурс и регуляция эмоций' },
  { key: 'function', order: 8, en: 'Functioning & quality of life', ru: 'Функционирование и качество жизни' },
  { key: 'trauma', order: 9, en: 'Trauma', ru: 'Последствия травмы' },
  { key: 'attention', order: 10, en: 'Attention & neurodiversity', ru: 'Внимание и нейроразнообразие' },
  { key: 'substances', order: 11, en: 'Substance use', ru: 'Употребление веществ' },
  { key: 'therapy', order: 12, en: 'Therapy progress & recovery', ru: 'Динамика терапии и восстановление' },
  { key: 'personality', order: 13, en: 'Personality baseline', ru: 'Личностный профиль' },
  { key: 'wu-xing', order: 14, en: 'Wu Xing personal profile', ru: 'Личный профиль У-Син' },
])

function row(
  key,
  category,
  area,
  priority,
  instrument,
  acronym,
  items,
  duration,
  rightsStatus,
  access = 'account',
  metadata = {},
) {
  return Object.freeze({
    key,
    category,
    area,
    priority,
    instrument,
    acronym,
    items,
    duration,
    rightsStatus,
    access,
    enabled: false,
    ...metadata,
  })
}

export const MIND_BODY_MONITOR_REGISTRY = Object.freeze([
  // 1. Overall wellbeing — 6
  row('who-5', 'overall_wellbeing', 'quick', 'A', 'WHO-5 Well-Being Index', 'WHO-5', 5, '1–2 min', RIGHTS_STATUS.PERMISSION_REQUIRED),
  row('promis-gmh-4', 'overall_wellbeing', 'quick', 'A', 'PROMIS Global Mental Health', 'PROMIS GMH 4', 4, '~1 min', RIGHTS_STATUS.RIGHTS_REVIEW),
  row('promis-gh-10', 'overall_wellbeing', 'function', 'B', 'PROMIS Global Health', 'PROMIS GH-10', 10, '2–3 min', RIGHTS_STATUS.RIGHTS_REVIEW),
  row('flourishing-scale', 'overall_wellbeing', 'resources', 'B', 'Flourishing Scale', 'FS', 8, '~2 min', RIGHTS_STATUS.PERMISSION_REQUIRED),
  row('swls', 'overall_wellbeing', 'function', 'B', 'Satisfaction With Life Scale', 'SWLS', 5, '1–2 min', RIGHTS_STATUS.PERMISSION_REQUIRED),
  row('mhc-sf', 'overall_wellbeing', 'function', 'B', 'Mental Health Continuum – Short Form', 'MHC-SF', 14, '3–4 min', RIGHTS_STATUS.RIGHTS_REVIEW),

  // 2. Mood & anxiety — 8
  row('phq-2', 'mood_anxiety', 'mood', 'A', 'Patient Health Questionnaire-2', 'PHQ-2', 2, '<1 min', RIGHTS_STATUS.READY_PUBLIC, 'public'),
  row('phq-9', 'mood_anxiety', 'mood', 'A', 'Patient Health Questionnaire-9', 'PHQ-9', 9, '~2 min', RIGHTS_STATUS.MANAGED_SAFETY_ONLY, 'managed'),
  row('phq-8', 'mood_anxiety', 'mood', 'A', 'Patient Health Questionnaire – 8', 'PHQ-8', 8, '2–3 min', RIGHTS_STATUS.READY_ACCOUNT, 'account', { sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/18752852/', rightsNote: 'Pfizer PHQ family: no copyright restriction; EN only here' }),
  row('gad-2', 'mood_anxiety', 'mood', 'A', 'Generalized Anxiety Disorder-2', 'GAD-2', 2, '<1 min', RIGHTS_STATUS.READY_PUBLIC, 'public'),
  row('gad-7', 'mood_anxiety', 'mood', 'A', 'Generalized Anxiety Disorder-7', 'GAD-7', 7, '1–2 min', RIGHTS_STATUS.READY_ACCOUNT),
  row('promis-anxiety-4a', 'mood_anxiety', 'mood', 'B', 'PROMIS Anxiety Short Form 4a', 'PROMIS Anxiety 4a', 4, '~1 min', RIGHTS_STATUS.RIGHTS_REVIEW),
  row('promis-depression-4a', 'mood_anxiety', 'mood', 'B', 'PROMIS Depression Short Form 4a', 'PROMIS Depression 4a', 4, '~1 min', RIGHTS_STATUS.RIGHTS_REVIEW),
  row('dass-21', 'mood_anxiety', 'mood', 'C', 'Depression Anxiety Stress Scales – 21', 'DASS-21', 21, '~5 min', RIGHTS_STATUS.INTERNAL_REFERENCE, 'internal'),
  row('phq-4', 'mood_anxiety', 'quick', 'A', 'Patient Health Questionnaire-4', 'PHQ-4', 4, '~1 min', RIGHTS_STATUS.READY_PUBLIC, 'public'),

  // 3. Stress & distress — 4
  row('k6', 'stress_distress', 'stress', 'A', 'Kessler Psychological Distress Scale – 6', 'K6', 6, '1–2 min', RIGHTS_STATUS.READY_PUBLIC, 'public'),
  row('k10', 'stress_distress', 'stress', 'A', 'Kessler Psychological Distress Scale – 10', 'K10', 10, '2–3 min', RIGHTS_STATUS.READY_PUBLIC, 'public'),
  row('pss-10', 'stress_distress', 'stress', 'A', 'Perceived Stress Scale – 10', 'PSS-10', 10, '2–3 min', RIGHTS_STATUS.PERMISSION_REQUIRED),
  row('pss-4', 'stress_distress', 'stress', 'B', 'Perceived Stress Scale – 4', 'PSS-4', 4, '~1 min', RIGHTS_STATUS.PERMISSION_REQUIRED),

  // 4. Sleep & recovery — 5
  row('promis-sleep-4a', 'sleep_recovery', 'sleep', 'A', 'PROMIS Sleep Disturbance Short Form 4a', 'PROMIS Sleep 4a', 4, '~1 min', RIGHTS_STATUS.RIGHTS_REVIEW),
  row('promis-sleep-8a', 'sleep_recovery', 'sleep', 'B', 'PROMIS Sleep Disturbance Short Form 8a', 'PROMIS Sleep 8a', 8, '~2 min', RIGHTS_STATUS.RIGHTS_REVIEW),
  row('psqi', 'sleep_recovery', 'sleep', 'C', 'Pittsburgh Sleep Quality Index', 'PSQI', 19, '5–10 min', RIGHTS_STATUS.LICENSED_ONLY),
  row('isi', 'sleep_recovery', 'sleep', 'C', 'Insomnia Severity Index', 'ISI', 7, '2–3 min', RIGHTS_STATUS.PERMISSION_REQUIRED),
  row('ru-sated', 'sleep_recovery', 'sleep', 'C', 'RU-SATED Sleep Health Scale', 'RU-SATED', 6, '~2 min', RIGHTS_STATUS.RIGHTS_REVIEW),

  // 5. Body, fatigue & cognition — 4
  row('phq-15', 'body_fatigue_cognition', 'body', 'A', 'Patient Health Questionnaire-15', 'PHQ-15', 15, '3–4 min', RIGHTS_STATUS.READY_ACCOUNT),
  row('promis-fatigue-4a', 'body_fatigue_cognition', 'body', 'A', 'PROMIS Fatigue Short Form 4a', 'PROMIS Fatigue 4a', 4, '~1 min', RIGHTS_STATUS.RIGHTS_REVIEW),
  row('promis-fatigue-8a', 'body_fatigue_cognition', 'body', 'B', 'PROMIS Fatigue Short Form 8a', 'PROMIS Fatigue 8a', 8, '~2 min', RIGHTS_STATUS.RIGHTS_REVIEW),
  row('promis-cognitive-4a', 'body_fatigue_cognition', 'body', 'A', 'PROMIS Cognitive Function Abilities 4a', 'PROMIS Cog 4a', 4, '~1 min', RIGHTS_STATUS.RIGHTS_REVIEW),

  // 6. Resilience, coping & self-regulation — 5
  row('brief-cope', 'resilience_coping', 'resources', 'A', 'Brief COPE', 'Brief COPE', 28, '5–7 min', RIGHTS_STATUS.READY_ACCOUNT),
  row('scs-sf', 'resilience_coping', 'resources', 'A', 'Self-Compassion Scale – Short Form', 'SCS-SF', 12, '~3 min', RIGHTS_STATUS.READY_ACCOUNT),
  row('erq', 'resilience_coping', 'resources', 'A', 'Emotion Regulation Questionnaire', 'ERQ', 10, '2–3 min', RIGHTS_STATUS.READY_ACCOUNT),
  row('brs', 'resilience_coping', 'resources', 'B', 'Brief Resilience Scale', 'BRS', 6, '1–2 min', RIGHTS_STATUS.RIGHTS_REVIEW),
  row('gse', 'resilience_coping', 'resources', 'C', 'General Self-Efficacy Scale', 'GSE', 10, '2–3 min', RIGHTS_STATUS.PERMISSION_REQUIRED),

  // 7. Relationships & social support — 4
  row('mspss', 'relationships_support', 'relationships', 'A', 'Multidimensional Scale of Perceived Social Support', 'MSPSS', 12, '~3 min', RIGHTS_STATUS.READY_ACCOUNT),
  row('osss-3', 'relationships_support', 'relationships', 'A', 'Oslo Social Support Scale – 3', 'OSSS-3', 3, '<1 min', RIGHTS_STATUS.RIGHTS_REVIEW),
  row('djgls-6', 'relationships_support', 'relationships', 'B', 'De Jong Gierveld Loneliness Scale – 6', 'DJGLS-6', 6, '1–2 min', RIGHTS_STATUS.RIGHTS_REVIEW),
  row('promis-social-isolation-4a', 'relationships_support', 'relationships', 'B', 'PROMIS Social Isolation Short Form 4a', 'PROMIS Social Isolation 4a', 4, '~1 min', RIGHTS_STATUS.RIGHTS_REVIEW),

  // 8. Functioning & quality of life — 5
  row('whodas-12', 'function_qol', 'function', 'A', 'WHODAS 2.0 – 12 item', 'WHODAS-12', 12, '~5 min', RIGHTS_STATUS.PERMISSION_REQUIRED),
  row('whoqol-bref', 'function_qol', 'function', 'B', 'WHOQOL-BREF', 'WHOQOL-BREF', 26, '7–10 min', RIGHTS_STATUS.PERMISSION_REQUIRED),
  row('wsas', 'function_qol', 'function', 'B', 'Work and Social Adjustment Scale', 'WSAS', 5, '~2 min', RIGHTS_STATUS.RIGHTS_REVIEW),
  row('ors', 'function_qol', 'function', 'C', 'Outcome Rating Scale', 'ORS', 4, '<1 min', RIGHTS_STATUS.LICENSED_ONLY),
  row('promis-social-roles', 'function_qol', 'function', 'B', 'PROMIS Ability to Participate in Social Roles 4/8', 'PROMIS Social Roles', 4, '~1 min', RIGHTS_STATUS.RIGHTS_REVIEW),

  // 9. Burnout & work health — 2
  row('cbi', 'burnout_work', 'stress', 'A', 'Copenhagen Burnout Inventory', 'CBI', 19, '4–5 min', RIGHTS_STATUS.RIGHTS_REVIEW),
  row('cbi-personal', 'burnout_work', 'stress', 'A', 'Copenhagen Burnout Inventory — Personal', 'CBI Personal', 6, '2 min', RIGHTS_STATUS.READY_ACCOUNT, 'account', { sourceUrl: 'https://nfa.dk/media/a4wheblj/cbi-scales.pdf', rightsNote: 'NFA commercial reuse with attribution: Borritz et al. (2006)' }),
  row('cbi-work', 'burnout_work', 'stress', 'A', 'Copenhagen Burnout Inventory — Work', 'CBI Work', 7, '2 min', RIGHTS_STATUS.READY_ACCOUNT, 'account', { sourceUrl: 'https://nfa.dk/media/a4wheblj/cbi-scales.pdf', rightsNote: 'NFA commercial reuse with attribution: Borritz et al. (2006)' }),
  row('cbi-client', 'burnout_work', 'stress', 'B', 'Copenhagen Burnout Inventory — Client Work', 'CBI Client', 6, '2 min', RIGHTS_STATUS.READY_ACCOUNT, 'account', { sourceUrl: 'https://nfa.dk/media/a4wheblj/cbi-scales.pdf', rightsNote: 'NFA commercial reuse with attribution: Borritz et al. (2006)' }),
  row('mbi', 'burnout_work', 'stress', 'C', 'Maslach Burnout Inventory', 'MBI', 22, '5–10 min', RIGHTS_STATUS.LICENSED_ONLY),

  // 10. Product-specific monitoring — 3
  row('hh-daily-pulse', 'hh_monitoring', 'quick', 'A', 'Daily Mind–Body State Check-in', 'HH Daily Pulse', 6, '<1 min', RIGHTS_STATUS.INTERNAL_REFERENCE, 'internal'),
  row('hh-weekly-pulse', 'hh_monitoring', 'quick', 'A', 'Weekly Mind–Body Pulse', 'HH Weekly Pulse', 10, '~2 min', RIGHTS_STATUS.INTERNAL_REFERENCE, 'internal'),
  row('hh-monthly-profile', 'hh_monitoring', 'quick', 'B', 'Monthly Life Domains Review', 'HH Monthly Profile', 18, '4–5 min', RIGHTS_STATUS.INTERNAL_REFERENCE, 'internal'),

  // 11. Routine clinical outcomes — 6
  row('core-10', 'routine_outcomes', 'therapy', 'A', 'Clinical Outcomes in Routine Evaluation – 10', 'CORE-10', 10, '2–5 min', RIGHTS_STATUS.PERMISSION_REQUIRED, 'practitioner'),
  row('core-om', 'routine_outcomes', 'therapy', 'A', 'Clinical Outcomes in Routine Evaluation – Outcome Measure', 'CORE-OM', 34, '7–10 min', RIGHTS_STATUS.PERMISSION_REQUIRED, 'practitioner'),
  row('oq-45-2', 'routine_outcomes', 'therapy', 'A', 'Outcome Questionnaire-45.2', 'OQ-45.2', 45, '5–10 min', RIGHTS_STATUS.LICENSED_ONLY, 'practitioner'),
  row('promis-29', 'routine_outcomes', 'therapy', 'A', 'PROMIS-29 Profile v2.1', 'PROMIS-29', 29, '5–8 min', RIGHTS_STATUS.RIGHTS_REVIEW, 'practitioner'),
  row('bsi-18', 'routine_outcomes', 'therapy', 'B', 'Brief Symptom Inventory 18', 'BSI-18', 18, '~4 min', RIGHTS_STATUS.LICENSED_ONLY, 'practitioner'),
  row('scl-90-r', 'routine_outcomes', 'therapy', 'C', 'Symptom Checklist-90-Revised', 'SCL-90-R', 90, '12–15 min', RIGHTS_STATUS.LICENSED_ONLY, 'practitioner'),

  // 12. Trauma & PTSD — 3
  row('pc-ptsd-5', 'trauma_ptsd', 'trauma', 'A', 'Primary Care PTSD Screen for DSM-5', 'PC-PTSD-5', 5, '1–2 min', RIGHTS_STATUS.READY_ACCOUNT),
  row('pcl-5', 'trauma_ptsd', 'trauma', 'A', 'PTSD Checklist for DSM-5', 'PCL-5', 20, '5–10 min', RIGHTS_STATUS.READY_ACCOUNT),
  row('itq', 'trauma_ptsd', 'trauma', 'A', 'International Trauma Questionnaire', 'ITQ', 18, '5–10 min', RIGHTS_STATUS.READY_ACCOUNT),

  // 13. Anxiety & related deep dives — 5
  row('oasis', 'anxiety_deep_dive', 'mood', 'A', 'Overall Anxiety Severity and Impairment Scale', 'OASIS', 5, '1–2 min', RIGHTS_STATUS.RIGHTS_REVIEW),
  row('odsis', 'anxiety_deep_dive', 'mood', 'A', 'Overall Depression Severity and Impairment Scale', 'ODSIS', 5, '1–2 min', RIGHTS_STATUS.RIGHTS_REVIEW),
  row('pdss-sr', 'anxiety_deep_dive', 'mood', 'B', 'Panic Disorder Severity Scale – Self Report', 'PDSS-SR', 7, '2–3 min', RIGHTS_STATUS.PERMISSION_REQUIRED),
  row('spin', 'anxiety_deep_dive', 'mood', 'B', 'Social Phobia Inventory', 'SPIN', 17, '3–5 min', RIGHTS_STATUS.LICENSED_ONLY),
  row('oci-r', 'anxiety_deep_dive', 'mood', 'B', 'Obsessive-Compulsive Inventory – Revised', 'OCI-R', 18, '4–6 min', RIGHTS_STATUS.RIGHTS_REVIEW),

  // 14. ADHD & bipolar screening — 4
  row('asrs-6', 'attention_bipolar', 'attention', 'A', 'Adult ADHD Self-Report Scale v1.1 – 6-item Screener', 'ASRS-v1.1 6Q', 6, '1–2 min', RIGHTS_STATUS.READY_ACCOUNT),
  row('wfirs-s', 'attention_bipolar', 'attention', 'A', 'Weiss Functional Impairment Rating Scale – Self', 'WFIRS-S', 69, '10–15 min', RIGHTS_STATUS.RIGHTS_REVIEW),
  row('mdq', 'attention_bipolar', 'attention', 'A', 'Mood Disorder Questionnaire', 'MDQ', '13 + follow-ups', '2–3 min', RIGHTS_STATUS.RIGHTS_REVIEW),
  row('hcl-32', 'attention_bipolar', 'attention', 'B', 'Hypomania Checklist-32', 'HCL-32', 32, '5–10 min', RIGHTS_STATUS.RIGHTS_REVIEW),

  // 15. Substance use — 3
  row('audit', 'substance_use', 'substances', 'A', 'Alcohol Use Disorders Identification Test', 'AUDIT', 10, '2–4 min', RIGHTS_STATUS.RIGHTS_REVIEW),
  row('audit-c', 'substance_use', 'substances', 'A', 'Alcohol Use Disorders Identification Test – Consumption', 'AUDIT-C', 3, '<1 min', RIGHTS_STATUS.RIGHTS_REVIEW),
  row('assist', 'substance_use', 'substances', 'A', 'Alcohol, Smoking and Substance Involvement Screening Test', 'ASSIST', '8 sections', '5–10 min', RIGHTS_STATUS.RIGHTS_REVIEW),

  // 16. Safety & suicide risk — 1
  row('c-ssrs-screener', 'safety', 'therapy', 'A', 'Columbia-Suicide Severity Rating Scale – Screener', 'C-SSRS', '2–6 adaptive', '1–3 min', RIGHTS_STATUS.MANAGED_SAFETY_ONLY, 'managed'),

  // 17. Emotion regulation & recovery — 2
  row('ders-36', 'emotion_recovery', 'resources', 'A', 'Difficulties in Emotion Regulation Scale', 'DERS-36', 36, '~8 min', RIGHTS_STATUS.READY_ACCOUNT),
  row('reqol-10', 'emotion_recovery', 'therapy', 'B', 'Recovering Quality of Life – 10', 'ReQoL-10', 10, '2–4 min', RIGHTS_STATUS.LICENSED_ONLY, 'practitioner'),

  // 18. Clinician diagnostic / personality reference — 3
  row('mmpi-3', 'clinician_reference', 'personality', 'C', 'Minnesota Multiphasic Personality Inventory-3', 'MMPI-3', 335, '25–50 min', RIGHTS_STATUS.CLINICIAN_ONLY, 'clinician'),
  row('pai', 'clinician_reference', 'personality', 'C', 'Personality Assessment Inventory', 'PAI', 344, '25–55 min', RIGHTS_STATUS.CLINICIAN_ONLY, 'clinician'),
  row('mini-interview', 'clinician_reference', 'personality', 'C', 'Mini International Neuropsychiatric Interview', 'MINI', 'structured modules', '15–30 min', RIGHTS_STATUS.CLINICIAN_ONLY, 'clinician'),

  // Additional validated professional instruments. Metadata only until commercial rights, original items and scoring are cleared.
  row('ders-16', 'emotion_recovery', 'resources', 'A', 'Difficulties in Emotion Regulation Scale – 16', 'DERS-16', 16, '2–4 min', RIGHTS_STATUS.RIGHTS_REVIEW, 'account', { sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4882111/', rightsNote: 'Published psychometric validation does not by itself authorize commercial digital reproduction' }),
  row('wemwbs-14', 'overall_wellbeing', 'resources', 'B', 'Warwick–Edinburgh Mental Wellbeing Scale', 'WEMWBS', 14, '3–5 min', RIGHTS_STATUS.LICENSED_ONLY, 'account', { sourceUrl: 'https://warwick.ac.uk/services/innovations/wemwbs/how/', rightsNote: 'Commercial use requires Warwick licence' }),
  row('swemwbs-7', 'overall_wellbeing', 'resources', 'B', 'Short Warwick–Edinburgh Mental Wellbeing Scale', 'SWEMWBS', 7, '2 min', RIGHTS_STATUS.LICENSED_ONLY, 'account', { sourceUrl: 'https://warwick.ac.uk/services/innovations/wemwbs/how/', rightsNote: 'Commercial use requires Warwick licence' }),
  row('bdi-ii', 'mood_anxiety', 'mood', 'C', 'Beck Depression Inventory – II', 'BDI-II', 21, '5–10 min', RIGHTS_STATUS.LICENSED_ONLY, 'account', { sourceUrl: 'https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Personality-%26-Biopsychosocial/Beck-Depression-Inventory/p/100000159', rightsNote: 'Pearson digital administration licensed; qualification required' }),
  row('bai-21', 'mood_anxiety', 'mood', 'C', 'Beck Anxiety Inventory', 'BAI', 21, '5–10 min', RIGHTS_STATUS.LICENSED_ONLY, 'account', { sourceUrl: 'https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Personality-%26-Biopsychosocial/Beck-Anxiety-Inventory/p/100000251', rightsNote: 'Pearson digital administration licensed; qualification required' }),
  row('maas-15', 'emotion_recovery', 'resources', 'B', 'Mindful Attention Awareness Scale', 'MAAS', 15, '3–5 min', RIGHTS_STATUS.RIGHTS_REVIEW, 'account', { sourceUrl: 'https://ppc.sas.upenn.edu/node/214', rightsNote: 'Publisher/author commercial electronic reproduction terms not confirmed' }),
  row('tas-20', 'emotion_recovery', 'resources', 'B', 'Toronto Alexithymia Scale – 20', 'TAS-20', 20, '4–6 min', RIGHTS_STATUS.PERMISSION_REQUIRED, 'account', { sourceUrl: 'https://doi.org/10.1016/0022-3999(94)90005-1', rightsNote: 'Copyright holder permission required; not a free online test' }),
  row('panas-20', 'overall_wellbeing', 'mood', 'B', 'Positive and Negative Affect Schedule', 'PANAS', 20, '3–5 min', RIGHTS_STATUS.RIGHTS_REVIEW, 'account', { sourceUrl: 'https://doi.org/10.1037/0022-3514.54.6.1063', rightsNote: 'Commercial online item use not verified' }),
  row('gse-10', 'resilience_coping', 'resources', 'B', 'General Self-Efficacy Scale', 'GSE', 10, '2–4 min', RIGHTS_STATUS.PERMISSION_REQUIRED, 'account', { sourceUrl: 'https://userpage.fu-berlin.de/~health/selfscal.htm', rightsNote: 'Authors support research/educational use; commercial site terms must be confirmed' }),
  row('spane-12', 'overall_wellbeing', 'mood', 'B', 'Scale of Positive and Negative Experience', 'SPANE', 12, '3 min', RIGHTS_STATUS.PERMISSION_REQUIRED, 'account', { sourceUrl: 'https://eddiener.com/scale-of-positive-and-negative-experience-spane/', rightsNote: 'Author site limits free use to non-commercial purposes' }),
  // Further source-verified CDC/HealthMeasures/COPSOQ research instrument metadata.
  row('cdc-hrqol-4', 'function_qol', 'function', 'A', 'CDC Healthy Days Core (HRQOL-4)', 'CDC HRQOL-4', 4, '~3 min', RIGHTS_STATUS.READY_PUBLIC, 'public', { sourceUrl: 'https://archive.cdc.gov/www_cdc_gov/hrqol/hrqol14_measure.htm', rightsNote: 'CDC federal public domain, official four questions; now runnable EN' }),
  row('cdc-healthy-days-symptoms', 'body_fatigue_cognition', 'body', 'A', 'CDC Healthy Days Symptoms Module', 'CDC Healthy Days 5', 5, '~3 min', RIGHTS_STATUS.READY_PUBLIC, 'public', { sourceUrl: 'https://archive.cdc.gov/www_cdc_gov/hrqol/hrqol14_measure.htm', rightsNote: 'CDC federal public domain, original five questions; now runnable EN' }),
  row('cdc-healthy-days-activity', 'function_qol', 'function', 'B', 'CDC Healthy Days Activity Limitations Module', 'CDC Activity 5', 5, '5–7 min', RIGHTS_STATUS.INTERNAL_REFERENCE, 'internal', { sourceUrl: 'https://archive.cdc.gov/www_cdc_gov/hrqol/hrqol14_measure.htm', rightsNote: 'Validated public domain module but skip logic and nonnumeric response codes not yet implemented; metadata only' }),
  row('cdc-hrqol-14', 'function_qol', 'function', 'B', 'CDC Healthy Days Complete 14-item Set', 'CDC HRQOL-14', 14, '8–12 min', RIGHTS_STATUS.INTERNAL_REFERENCE, 'internal', { sourceUrl: 'https://archive.cdc.gov/www_cdc_gov/hrqol/hrqol14_measure.htm', rightsNote: 'Full three-module combination. Core and symptoms are separately runnable; do not duplicate their answers as a separate test' }),
  row('copsoq-iii', 'burnout_work', 'stress', 'A', 'Copenhagen Psychosocial Questionnaire III', 'COPSOQ III', "version-dependent", '15–30 min', RIGHTS_STATUS.RIGHTS_REVIEW, 'account', { sourceUrl: 'https://www.copsoq-network.org/licence-guidelines-and-questionnaire', rightsNote: 'Conditional commercial reuse under network guidance; national contact, original format and use-case agreement pending' }),
  row('promis-pain-interference-4a', 'body_fatigue_cognition', 'body', 'B', 'PROMIS Pain Interference Short Form 4a', 'PROMIS Pain 4a', 4, '~2 min', RIGHTS_STATUS.RIGHTS_REVIEW, 'account', { sourceUrl: 'https://www.healthmeasures.net/explore-measurement-systems/promis/obtain-administer-measures', rightsNote: 'HEAP/electronic permission required for commercial portal; not runnable' }),
  row('promis-emotional-support-4a', 'relationships_support', 'relationships', 'B', 'PROMIS Emotional Support Short Form 4a', 'PROMIS Support 4a', 4, '~2 min', RIGHTS_STATUS.RIGHTS_REVIEW, 'account', { sourceUrl: 'https://www.healthmeasures.net/explore-measurement-systems/promis/obtain-administer-measures', rightsNote: 'HEAP/electronic permission required for commercial portal; not runnable' }),
  row('promis-sleep-impairment-4a', 'sleep_recovery', 'sleep', 'B', 'PROMIS Sleep-Related Impairment Short Form 4a', 'PROMIS Sleep Impact 4a', 4, '~2 min', RIGHTS_STATUS.RIGHTS_REVIEW, 'account', { sourceUrl: 'https://www.healthmeasures.net/explore-measurement-systems/promis/obtain-administer-measures', rightsNote: 'HEAP/electronic permission required for commercial portal; not runnable' }),
  row('neuro-qol-cognitive-8', 'body_fatigue_cognition', 'body', 'B', 'Neuro-QoL Cognitive Function Short Form 8', 'Neuro-QoL Cog 8', 8, '~3 min', RIGHTS_STATUS.RIGHTS_REVIEW, 'account', { sourceUrl: 'https://www.healthmeasures.net/images/PROMIS/Terms_of_Use_HM_approved_1-12-17_-_Updated_Copyright_Notices.pdf', rightsNote: 'Northwestern HealthMeasures copyright; digital reproduction/electronic integration permission required' }),
  row('promis-companionship-4a', 'relationships_support', 'relationships', 'B', 'PROMIS Companionship Short Form 4a', 'PROMIS Companionship', 4, '~2 min', RIGHTS_STATUS.RIGHTS_REVIEW, 'account', { sourceUrl: 'https://www.healthmeasures.net/explore-measurement-systems/promis/obtain-administer-measures', rightsNote: 'HEAP/electronic permission required for commercial portal; not runnable' }),
])

export const PRODUCT_MONITOR_MODULES = Object.freeze([
  {
    key: 'hh-current-state',
    kind: 'state',
    area: 'quick',
    enabled: true,
    access: 'public',
    items: 5,
    duration: '~1 min',
    title: { en: 'Current State Check', ru: 'Состояние сейчас' },
  },
  {
    key: 'mini-ipip-20',
    kind: 'trait',
    area: 'personality',
    enabled: true,
    access: 'public',
    items: 20,
    duration: '~3 min',
    title: { en: 'Personality Baseline', ru: 'Личностный профиль' },
  },
  {
    key: 'wu-xing-personal-profile',
    kind: 'custom_method',
    area: 'wu-xing',
    enabled: false,
    access: 'public',
    items: null,
    duration: null,
    title: { en: 'Personal Wu Xing Profile', ru: 'Личный профиль У-Син' },
    blockedReason: 'source_and_scoring_spec_required',
  },
])

export function registryCount() {
  return MIND_BODY_MONITOR_REGISTRY.length
}

export function areaFor(key) {
  return MONITOR_AREAS.find((area) => area.key === key) || null
}

export function publicRegistryItems() {
  return MIND_BODY_MONITOR_REGISTRY.filter(
    (item) => item.enabled && item.rightsStatus === RIGHTS_STATUS.READY_PUBLIC,
  )
}

// Curated discovery list of established instruments used in psychological assessment and psychotherapy.
// Descriptions are original educational metadata only, NOT questionnaire items, scored norms or diagnoses.
// A place in this list never overrides existing copyright, age, crisis or clinician-only gates.
// Do not convert a rights-gated reference into a runnable questionnaire automatically.
const CATEGORIES = {
  "mood": {
    "en": "Mood, anxiety & distress",
    "ru": "Настроение, тревога и дистресс",
    "es": "Estado de ánimo y ansiedad"
  },
  "wellbeing": {
    "en": "Stress, resilience & well-being",
    "ru": "Стресс, устойчивость и благополучие",
    "es": "Estrés y bienestar"
  },
  "trauma": {
    "en": "Trauma & dissociation",
    "ru": "Травма и диссоциация",
    "es": "Trauma y disociación"
  },
  "anxiety": {
    "en": "Panic, social anxiety & OCD",
    "ru": "Паника, социальная тревога и ОКР",
    "es": "Pánico y ansiedad social"
  },
  "personality": {
    "en": "Personality, schemas & regulation",
    "ru": "Личность, схемы и саморегуляция",
    "es": "Personalidad y regulación"
  },
  "relationships": {
    "en": "Relationships, attachment & family",
    "ru": "Отношения, привязанность и семья",
    "es": "Relaciones y familia"
  },
  "function": {
    "en": "Sleep, body & daily functioning",
    "ru": "Сон, тело и повседневная жизнь",
    "es": "Sueño y funcionamiento"
  },
  "neuro": {
    "en": "Attention & neurodevelopment",
    "ru": "Внимание и нейроразвитие",
    "es": "Atención y neurodesarrollo"
  },
  "substances": {
    "en": "Substance use & eating",
    "ru": "Зависимости и пищевое поведение",
    "es": "Consumo y alimentación"
  },
  "therapy": {
    "en": "Psychotherapy outcomes & alliance",
    "ru": "Динамика терапии и альянс",
    "es": "Resultados de psicoterapia"
  }
}
const RAW = [
  [
    "phq-2",
    "mood",
    "Two-question screen for recent low mood and loss of interest.",
    "Два вопроса о снижении настроения и интереса."
  ],
  [
    "phq-9",
    "mood",
    "Nine-item depression symptom screen; safety response may require human follow-up.",
    "Скрининг депрессивных симптомов с обязательным вниманием к безопасности."
  ],
  [
    "phq-8",
    "mood",
    "Depressive symptom burden without the self-harm item.",
    "Выраженность депрессивных симптомов без вопроса о самоповреждении."
  ],
  [
    "gad-2",
    "mood",
    "Two-item check for persistent anxiety and worry.",
    "Короткая оценка тревоги и беспокойства."
  ],
  [
    "gad-7",
    "mood",
    "Seven-item generalized anxiety symptom scale.",
    "Шкала симптомов генерализованной тревоги."
  ],
  [
    "phq-4",
    "mood",
    "Brief combined depression and anxiety screening.",
    "Краткая совместная оценка тревоги и депрессивных симптомов."
  ],
  [
    "k6",
    "mood",
    "Six-item nonspecific psychological distress screen.",
    "Шесть вопросов об общем психологическом дистрессе."
  ],
  [
    "k10",
    "mood",
    "Ten-item scale of recent psychological distress.",
    "Десять вопросов о психологическом дистрессе."
  ],
  [
    "dass-21",
    "mood",
    "Three self-reported dimensions: depression, anxiety and stress.",
    "Самооценка трёх областей: депрессии, тревоги и стресса."
  ],
  [
    "bdi-ii",
    "mood",
    "Clinically used depression inventory; licensed administration may apply.",
    "Известный клинический опросник депрессии; доступ зависит от лицензии."
  ],
  [
    "bai-21",
    "mood",
    "Inventory of anxiety symptoms; interpretation needs clinical context.",
    "Опросник тревожных симптомов с учётом клинического контекста."
  ],
  [
    "ces-d-20",
    "mood",
    "Community-oriented depressive symptoms over the preceding week.",
    "Депрессивные переживания за прошедшую неделю."
  ],
  [
    "stai-40",
    "mood",
    "Distinguishes situational anxiety from a more enduring tendency.",
    "Различает ситуативную тревогу и устойчивую тревожность."
  ],
  [
    "hads-14",
    "mood",
    "Anxiety and depression in general medical care settings.",
    "Тревога и депрессивные симптомы в медицинском контексте."
  ],
  [
    "qids-sr-16",
    "mood",
    "Self-report inventory for changes in depressive symptom severity.",
    "Самооценка выраженности и изменений депрессивных симптомов."
  ],
  [
    "pss-10",
    "wellbeing",
    "Perceived unpredictability and overload during the past month.",
    "Воспринимаемая перегрузка и непредсказуемость за месяц."
  ],
  [
    "pss-4",
    "wellbeing",
    "Very brief perceived-stress snapshot.",
    "Очень краткий снимок субъективного стресса."
  ],
  [
    "who-5",
    "wellbeing",
    "Five positive well-being statements about recent experience.",
    "Пять позитивных показателей субъективного благополучия."
  ],
  [
    "swls",
    "wellbeing",
    "Global cognitive satisfaction with one's life.",
    "Общая удовлетворённость собственной жизнью."
  ],
  [
    "flourishing-scale",
    "wellbeing",
    "Perceived meaning, competence and positive functioning.",
    "Ощущение смысла, компетентности и благополучного функционирования."
  ],
  [
    "wemwbs-14",
    "wellbeing",
    "Fourteen-item positive mental well-being measure.",
    "Позитивное психическое благополучие по 14 пунктам."
  ],
  [
    "swemwbs-7",
    "wellbeing",
    "Seven-item shorter mental well-being measure.",
    "Краткая семипунктовая шкала психического благополучия."
  ],
  [
    "gse-10",
    "wellbeing",
    "General beliefs in one's ability to meet challenges.",
    "Общая вера в способность справляться с трудностями."
  ],
  [
    "brs",
    "wellbeing",
    "Ability to recover or bounce back after stress.",
    "Способность восстанавливаться после стресса."
  ],
  [
    "brcs",
    "wellbeing",
    "Brief profile of flexible, resilient coping.",
    "Краткая оценка устойчивого совладания с трудностями."
  ],
  [
    "pc-ptsd-5",
    "trauma",
    "Five-item primary-care PTSD screening; not a diagnosis.",
    "Пятиточечный скрининг симптомов ПТСР, не диагноз."
  ],
  [
    "pcl-5",
    "trauma",
    "Detailed self-reported PTSD symptom clusters.",
    "Подробный профиль симптомов ПТСР."
  ],
  [
    "itq",
    "trauma",
    "ICD-11 PTSD and complex PTSD symptom patterns.",
    "Симптомные паттерны ПТСР и комплексного ПТСР по МКБ-11."
  ],
  [
    "ctq-sf-28",
    "trauma",
    "Retrospective childhood adversity inventory requiring careful handling.",
    "Ретроспективная оценка неблагоприятного детского опыта."
  ],
  [
    "des-ii-28",
    "trauma",
    "Dissociative experiences across everyday and clinical contexts.",
    "Диссоциативные переживания в разных жизненных ситуациях."
  ],
  [
    "ace-10",
    "trauma",
    "Exposure to adverse childhood experiences; not a resilience score.",
    "Факты неблагоприятного детского опыта, не оценка «слабости»."
  ],
  [
    "ptgi-21",
    "trauma",
    "Reported personal changes following difficult life events.",
    "Изменения, которые человек отмечает после тяжёлых событий."
  ],
  [
    "caps-5",
    "trauma",
    "Structured clinician-administered assessment for PTSD.",
    "Структурированная оценка ПТСР, проводимая специалистом."
  ],
  [
    "lec-5",
    "trauma",
    "Checklist of exposure to potentially traumatic events.",
    "Перечень потенциально травматических событий, с бережной подачей."
  ],
  [
    "ies-r",
    "trauma",
    "Impact of a stressful event through intrusion, avoidance and arousal.",
    "Влияние стрессового события: вторжения, избегание, возбуждение."
  ],
  [
    "oasis",
    "anxiety",
    "Anxiety severity and interference in daily activities.",
    "Выраженность тревоги и её влияние на повседневные дела."
  ],
  [
    "odsis",
    "anxiety",
    "Depression severity and impairment across contexts.",
    "Выраженность депрессивных проявлений и нарушений активности."
  ],
  [
    "pdss-sr",
    "anxiety",
    "Panic symptoms and related avoidance.",
    "Панические симптомы и связанное с ними избегание."
  ],
  [
    "spin",
    "anxiety",
    "Social anxiety and fear of scrutiny.",
    "Социальная тревога и страх оценки окружающих."
  ],
  [
    "oci-r",
    "anxiety",
    "Obsessive-compulsive symptom dimensions.",
    "Разные проявления обсессивно-компульсивных симптомов."
  ],
  [
    "ybocs-10",
    "anxiety",
    "Clinician-informed assessment of OCD symptom severity.",
    "Оценка тяжести ОКР с участием специалиста."
  ],
  [
    "lsas-sr-24",
    "anxiety",
    "Fear and avoidance across social situations.",
    "Страх и избегание в социальных ситуациях."
  ],
  [
    "sias-20",
    "anxiety",
    "Discomfort and anxiety during social interaction.",
    "Тревога и дискомфорт в межличностном общении."
  ],
  [
    "pswq-16",
    "anxiety",
    "Trait-like tendency toward frequent worry.",
    "Устойчивая склонность к частому беспокойству."
  ],
  [
    "ius-12",
    "anxiety",
    "Difficulties tolerating uncertainty.",
    "Трудности переносить неопределённость."
  ],
  [
    "mini-ipip-20",
    "personality",
    "Brief Big Five personality trait baseline.",
    "Краткий профиль пяти широких личностных черт."
  ],
  [
    "bfi-2-60",
    "personality",
    "Big Five traits and more specific personality facets.",
    "Пять факторов личности и отдельные грани черт."
  ],
  [
    "mmpi-3",
    "personality",
    "Licensed broad clinical personality and symptom assessment.",
    "Лицензируемый широкий клинический личностный опросник."
  ],
  [
    "pai",
    "personality",
    "Professional personality and psychopathology assessment.",
    "Профессиональная оценка личности и психопатологических проявлений."
  ],
  [
    "ders-36",
    "personality",
    "Difficulties in different aspects of emotion regulation.",
    "Трудности в различных аспектах регуляции эмоций."
  ],
  [
    "ders-16",
    "personality",
    "Brief emotional regulation difficulties profile.",
    "Краткий профиль трудностей эмоциональной регуляции."
  ],
  [
    "erq",
    "personality",
    "Cognitive reappraisal and expression suppression patterns.",
    "Когнитивная переоценка и подавление эмоциональной экспрессии."
  ],
  [
    "aaq-ii",
    "personality",
    "Psychological inflexibility and experiential avoidance.",
    "Психологическая негибкость и избегание переживаний."
  ],
  [
    "scs-sf",
    "personality",
    "Self-compassion in response to setbacks.",
    "Бережное отношение к себе в трудных ситуациях."
  ],
  [
    "rses-10",
    "personality",
    "General self-esteem across positive and negative statements.",
    "Общая самооценка через позитивные и негативные утверждения."
  ],
  [
    "rfq-8",
    "personality",
    "Self-reported reflection about one's own and others' mental states.",
    "Рефлексия своих и чужих психических состояний."
  ],
  [
    "ysq-s3-90",
    "personality",
    "Early maladaptive schema patterns used in schema therapy.",
    "Ранние неадаптивные схемы в схема-терапии."
  ],
  [
    "ecr-r-36",
    "relationships",
    "Adult romantic attachment anxiety and avoidance.",
    "Тревога и избегание в романтической привязанности."
  ],
  [
    "ecr-rs-9",
    "relationships",
    "Attachment patterns across several close relationships.",
    "Особенности привязанности в разных близких отношениях."
  ],
  [
    "iip-32",
    "relationships",
    "Short inventory of interpersonal difficulties.",
    "Краткая оценка трудностей межличностного общения."
  ],
  [
    "iip-64",
    "relationships",
    "Broad interpersonal problem patterns.",
    "Развёрнутый профиль межличностных трудностей."
  ],
  [
    "aas-collins-read-18",
    "relationships",
    "Adult attachment patterns in close relationships.",
    "Паттерны привязанности во взрослых отношениях."
  ],
  [
    "fad-gf-12",
    "relationships",
    "General functioning and communication within a family.",
    "Общее функционирование и коммуникация в семье."
  ],
  [
    "mspss",
    "relationships",
    "Perceived support from family, friends and significant others.",
    "Воспринимаемая поддержка семьи, друзей и близких."
  ],
  [
    "ras-7",
    "relationships",
    "Brief global satisfaction with a current relationship.",
    "Краткая общая удовлетворённость текущими отношениями."
  ],
  [
    "csi-16",
    "relationships",
    "Couples' relationship satisfaction across several areas.",
    "Удовлетворённость отношениями в паре по нескольким аспектам."
  ],
  [
    "das-32",
    "relationships",
    "Adjustment, agreement and satisfaction within a couple.",
    "Согласованность, адаптация и удовлетворённость пары."
  ],
  [
    "isi",
    "function",
    "Severity and impact of insomnia complaints.",
    "Выраженность бессонницы и её влияние на жизнь."
  ],
  [
    "psqi",
    "function",
    "Sleep quality and difficulties over the previous month.",
    "Качество сна и связанные трудности за прошедший месяц."
  ],
  [
    "phq-15",
    "function",
    "Burden of commonly reported bodily symptoms.",
    "Выраженность распространённых телесных симптомов."
  ],
  [
    "whodas-12",
    "function",
    "Functioning and disability across daily life domains.",
    "Функционирование и ограничения в повседневной жизни."
  ],
  [
    "whoqol-bref",
    "function",
    "Perceived quality of life across broad domains.",
    "Воспринимаемое качество жизни в разных сферах."
  ],
  [
    "wsas",
    "function",
    "Impact of difficulties on work, social and home functioning.",
    "Влияние трудностей на работу, общение и домашние дела."
  ],
  [
    "sf-36",
    "function",
    "General physical and mental health-related quality of life.",
    "Общее качество жизни в связи с физическим и психическим здоровьем."
  ],
  [
    "ru-sated",
    "function",
    "Sleep health including regularity, timing and alertness.",
    "Здоровье сна: регулярность, время, бодрость и другие аспекты."
  ],
  [
    "promis-fatigue-4a",
    "function",
    "Brief fatigue interference and burden measure.",
    "Краткая оценка утомляемости и её влияния на жизнь."
  ],
  [
    "cdc-hrqol-4",
    "function",
    "Healthy days and health-related quality of life.",
    "Здоровые дни и качество жизни, связанное со здоровьем."
  ],
  [
    "asrs-6",
    "neuro",
    "Short adult ADHD symptom screening.",
    "Краткий скрининг симптомов СДВГ у взрослых."
  ],
  [
    "asrs-v1-18",
    "neuro",
    "More extensive adult ADHD self-report symptoms.",
    "Более полный самоотчёт о симптомах СДВГ у взрослых."
  ],
  [
    "wfirs-s",
    "neuro",
    "Daily-life functional impairment associated with ADHD.",
    "Нарушения повседневного функционирования, связанные с СДВГ."
  ],
  [
    "srs-2",
    "neuro",
    "Social responsiveness patterns, usually used within a broader assessment.",
    "Особенности социальной отзывчивости в комплексной оценке."
  ],
  [
    "mdq",
    "neuro",
    "Bipolar-spectrum symptom screen, not an automatic diagnosis.",
    "Скрининг признаков биполярного спектра, не автоматический диагноз."
  ],
  [
    "hcl-32",
    "neuro",
    "History of elevated energy and hypomanic-type experiences.",
    "История повышенной активности и гипоманиакальных переживаний."
  ],
  [
    "aq-10",
    "neuro",
    "Brief autism-related trait screen, requiring appropriate interpretation.",
    "Краткий скрининг аутистических особенностей с учётом контекста."
  ],
  [
    "diva-5",
    "neuro",
    "Structured diagnostic interview for adult ADHD administered by a clinician.",
    "Структурированное интервью по СДВГ у взрослых для специалиста."
  ],
  [
    "ados-2",
    "neuro",
    "Licensed observational assessment used in autism evaluations.",
    "Лицензируемая стандартизированная оценка при аутизме."
  ],
  [
    "audit",
    "substances",
    "Alcohol use pattern and potential harms.",
    "Паттерны употребления алкоголя и возможные последствия."
  ],
  [
    "audit-c",
    "substances",
    "Brief alcohol consumption screening.",
    "Краткий скрининг употребления алкоголя."
  ],
  [
    "assist",
    "substances",
    "WHO substance involvement screening across several substances.",
    "Скрининг вовлечённости в употребление разных веществ."
  ],
  [
    "dast-10",
    "substances",
    "Brief problems potentially associated with drug use.",
    "Проблемы, потенциально связанные с употреблением веществ."
  ],
  [
    "cage-4",
    "substances",
    "Four-question alcohol-related concerns screen.",
    "Четыре вопроса о проблемах, связанных с алкоголем."
  ],
  [
    "scoff-5",
    "substances",
    "Very brief eating-disorder risk screen; requires careful follow-up.",
    "Очень краткий скрининг риска расстройств пищевого поведения."
  ],
  [
    "eat-26",
    "substances",
    "Eating attitudes and restrictive or compensatory behavior patterns.",
    "Отношение к еде, ограничительное и компенсаторное поведение."
  ],
  [
    "ede-q",
    "substances",
    "Eating disorder examination self-report of behaviors and concerns.",
    "Самооценка пищевого поведения и связанных переживаний."
  ],
  [
    "core-10",
    "therapy",
    "Ten-item distress and functioning outcomes measure.",
    "Краткая оценка дистресса и функционирования в терапии."
  ],
  [
    "core-om",
    "therapy",
    "Broad psychological distress and therapy outcome measure.",
    "Широкая оценка дистресса и результатов психотерапии."
  ],
  [
    "oq-45-2",
    "therapy",
    "Outcome Questionnaire measuring distress and functioning over care.",
    "Динамика дистресса и функционирования в ходе терапии."
  ],
  [
    "ors",
    "therapy",
    "Brief client-rated personal and interpersonal well-being over time.",
    "Краткая оценка благополучия клиентом в динамике."
  ],
  [
    "wai-sr-12",
    "therapy",
    "Therapeutic working alliance: goals, tasks and bond.",
    "Рабочий альянс в терапии: цели, задачи и контакт."
  ],
  [
    "srs-pcoms-4",
    "therapy",
    "Session-by-session client feedback about the therapeutic relationship.",
    "Обратная связь клиента о терапевтической сессии."
  ]
]

export const PSYCHOTHERAPY_CORE_CATEGORIES = Object.freeze(Object.fromEntries(
  Object.entries(CATEGORIES).map(([key, labels]) => [key, Object.freeze(labels)]),
))
export const PSYCHOTHERAPY_CORE_100 = Object.freeze(RAW.map(([key, category, en, ru], index) => Object.freeze({
  key, category, order: index + 1, summary: Object.freeze({ en, ru }),
})))
export const PSYCHOTHERAPY_CORE_BY_KEY = Object.freeze(Object.fromEntries(
  PSYCHOTHERAPY_CORE_100.map((item) => [item.key, item]),
))

// Entries not previously tracked in the Holistic House research reference index.
// Rights status is deliberately restrictive; definitions/questions are NOT bundled.
export const NEW_PSYCHOTHERAPY_REFERENCES = Object.freeze([
  {
    "key": "qids-sr-16",
    "category": "mood_anxiety",
    "area": "mood",
    "priority": "B",
    "instrument": "Quick Inventory of Depressive Symptomatology – Self Report",
    "acronym": "QIDS-SR16",
    "items": 16,
    "duration": "3–5 min",
    "rightsStatus": "rights_review",
    "access": "account",
    "rightsNote": "Metadata only. No protected items or scoring may be activated without instrument-specific permission, validation and appropriate safeguards."
  },
  {
    "key": "caps-5",
    "category": "trauma_ptsd",
    "area": "trauma",
    "priority": "B",
    "instrument": "Clinician-Administered PTSD Scale for DSM-5",
    "acronym": "CAPS-5",
    "items": 30,
    "duration": "45–60 min",
    "rightsStatus": "clinician_only",
    "access": "practitioner",
    "rightsNote": "Metadata only. No protected items or scoring may be activated without instrument-specific permission, validation and appropriate safeguards."
  },
  {
    "key": "lec-5",
    "category": "trauma_ptsd",
    "area": "trauma",
    "priority": "B",
    "instrument": "Life Events Checklist for DSM-5",
    "acronym": "LEC-5",
    "items": 17,
    "duration": "3–5 min",
    "rightsStatus": "managed_safety_only",
    "access": "practitioner",
    "rightsNote": "Metadata only. No protected items or scoring may be activated without instrument-specific permission, validation and appropriate safeguards."
  },
  {
    "key": "ies-r",
    "category": "trauma_ptsd",
    "area": "trauma",
    "priority": "B",
    "instrument": "Impact of Event Scale – Revised",
    "acronym": "IES-R",
    "items": 22,
    "duration": "5–10 min",
    "rightsStatus": "rights_review",
    "access": "practitioner",
    "rightsNote": "Metadata only. No protected items or scoring may be activated without instrument-specific permission, validation and appropriate safeguards."
  },
  {
    "key": "ras-7",
    "category": "relationships_support",
    "area": "relationships",
    "priority": "B",
    "instrument": "Relationship Assessment Scale",
    "acronym": "RAS",
    "items": 7,
    "duration": "1–3 min",
    "rightsStatus": "rights_review",
    "access": "account",
    "rightsNote": "Metadata only. No protected items or scoring may be activated without instrument-specific permission, validation and appropriate safeguards."
  },
  {
    "key": "csi-16",
    "category": "relationships_support",
    "area": "relationships",
    "priority": "B",
    "instrument": "Couples Satisfaction Index – 16",
    "acronym": "CSI-16",
    "items": 16,
    "duration": "3–5 min",
    "rightsStatus": "permission_required",
    "access": "account",
    "rightsNote": "Metadata only. No protected items or scoring may be activated without instrument-specific permission, validation and appropriate safeguards."
  },
  {
    "key": "das-32",
    "category": "relationships_support",
    "area": "relationships",
    "priority": "B",
    "instrument": "Dyadic Adjustment Scale – 32",
    "acronym": "DAS-32",
    "items": 32,
    "duration": "5–10 min",
    "rightsStatus": "licensed_only",
    "access": "practitioner",
    "rightsNote": "Metadata only. No protected items or scoring may be activated without instrument-specific permission, validation and appropriate safeguards."
  },
  {
    "key": "aq-10",
    "category": "attention_neurodiversity",
    "area": "attention",
    "priority": "B",
    "instrument": "Autism Spectrum Quotient – 10",
    "acronym": "AQ-10",
    "items": 10,
    "duration": "2–3 min",
    "rightsStatus": "rights_review",
    "access": "account",
    "rightsNote": "Metadata only. No protected items or scoring may be activated without instrument-specific permission, validation and appropriate safeguards."
  },
  {
    "key": "diva-5",
    "category": "attention_neurodiversity",
    "area": "attention",
    "priority": "B",
    "instrument": "Diagnostic Interview for ADHD in Adults, fifth edition",
    "acronym": "DIVA-5",
    "items": null,
    "duration": "60–90 min",
    "rightsStatus": "clinician_only",
    "access": "practitioner",
    "rightsNote": "Metadata only. No protected items or scoring may be activated without instrument-specific permission, validation and appropriate safeguards."
  },
  {
    "key": "ados-2",
    "category": "attention_neurodiversity",
    "area": "attention",
    "priority": "B",
    "instrument": "Autism Diagnostic Observation Schedule, Second Edition",
    "acronym": "ADOS-2",
    "items": null,
    "duration": "40–60 min",
    "rightsStatus": "licensed_only",
    "access": "practitioner",
    "rightsNote": "Metadata only. No protected items or scoring may be activated without instrument-specific permission, validation and appropriate safeguards."
  },
  {
    "key": "dast-10",
    "category": "substance_use",
    "area": "substances",
    "priority": "B",
    "instrument": "Drug Abuse Screening Test – 10",
    "acronym": "DAST-10",
    "items": 10,
    "duration": "2–4 min",
    "rightsStatus": "rights_review",
    "access": "account",
    "rightsNote": "Metadata only. No protected items or scoring may be activated without instrument-specific permission, validation and appropriate safeguards."
  },
  {
    "key": "cage-4",
    "category": "substance_use",
    "area": "substances",
    "priority": "B",
    "instrument": "CAGE Questionnaire",
    "acronym": "CAGE",
    "items": 4,
    "duration": "1–2 min",
    "rightsStatus": "rights_review",
    "access": "account",
    "rightsNote": "Metadata only. No protected items or scoring may be activated without instrument-specific permission, validation and appropriate safeguards."
  },
  {
    "key": "scoff-5",
    "category": "eating",
    "area": "body",
    "priority": "B",
    "instrument": "SCOFF Eating Disorder Questionnaire",
    "acronym": "SCOFF",
    "items": 5,
    "duration": "1–2 min",
    "rightsStatus": "managed_safety_only",
    "access": "practitioner",
    "rightsNote": "Metadata only. No protected items or scoring may be activated without instrument-specific permission, validation and appropriate safeguards."
  },
  {
    "key": "eat-26",
    "category": "eating",
    "area": "body",
    "priority": "B",
    "instrument": "Eating Attitudes Test – 26",
    "acronym": "EAT-26",
    "items": 26,
    "duration": "5–8 min",
    "rightsStatus": "rights_review",
    "access": "practitioner",
    "rightsNote": "Metadata only. No protected items or scoring may be activated without instrument-specific permission, validation and appropriate safeguards."
  },
  {
    "key": "ede-q",
    "category": "eating",
    "area": "body",
    "priority": "B",
    "instrument": "Eating Disorder Examination Questionnaire",
    "acronym": "EDE-Q",
    "items": 28,
    "duration": "10–15 min",
    "rightsStatus": "rights_review",
    "access": "practitioner",
    "rightsNote": "Metadata only. No protected items or scoring may be activated without instrument-specific permission, validation and appropriate safeguards."
  }
].map((item) => Object.freeze(item)))

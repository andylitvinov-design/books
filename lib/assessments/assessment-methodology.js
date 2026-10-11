// Bilingual descriptions of instrument origin, intended use and evidence/rights status.
// Presentation-only: never alter immutable scored definitions or make a research entry startable.
// Every public test and every professional research reference receives a concise methodology note.

const QUALITY = Object.freeze({
  screen: {
    en: 'Professional published screening measure; useful as a symptom signal, but not a diagnosis.',
    ru: 'Опубликованная профессиональная скрининговая шкала; помогает заметить симптомы, но не устанавливает диагноз.',
  },
  research: {
    en: 'Published psychological research measure; interpretation requires context, and scores do not establish a diagnosis.',
    ru: 'Психологическая исследовательская методика с опубликованными работами; баллы требуют контекста и не устанавливают диагноз.',
  },
  traits: {
    en: 'Research-based personality trait self-report, describing continuous tendencies rather than fixed personality types or diagnoses.',
    ru: 'Исследовательский опросник личностных черт: описывает непрерывные особенности, а не жёсткие типы или диагнозы.',
  },
  original: {
    en: 'Original Holistic House educational reflection tool (2026), not a clinically validated or standardized professional assessment.',
    ru: 'Авторский образовательный опросник Holistic House (2026), без клинической стандартизации и подтверждённой диагностической валидности.',
  },
  typology: {
    en: 'Original Holistic House self-reflection items based on a popular type framework. Scientific support for fixed type categories is limited; this is not an official or validated instrument.',
    ru: 'Авторские вопросы Holistic House по популярной модели типов. Научная обоснованность жёсткого деления на типы ограничена; это не официальный валидированный тест.',
  },
  bach: {
    en: 'Original Holistic House questionnaire inspired by the traditional 38 Bach flower themes. It is not a clinically validated diagnostic test or an evidence-based basis for prescribing remedies.',
    ru: 'Авторский опросник Holistic House по традиционной системе 38 цветочных тем Баха. Не является валидированным диагностическим тестом или научно обоснованной основой для назначения препаратов.',
  },
})

// Source and instrument-family notes intentionally differ from test interpretation: only
// original source-backed professional questionnaire versions are called "professional".
const PROFESSIONAL_SOURCES = Object.freeze({
  'mini-ipip-20': {
    origin: ['Mini-IPIP (Donnellan et al.), from the public-domain International Personality Item Pool (IPIP).',
      'Краткая Mini-IPIP (Donnellan и соавт.) из открытого International Personality Item Pool (IPIP).'],
    class: 'traits',
  },
  'ipip-big-five-50': {
    origin: ['IPIP Big Five Factor Markers by Lewis Goldberg and the public-domain International Personality Item Pool (IPIP) project.',
      'Маркеры пяти факторов IPIP Льюиса Голдберга из открытого проекта International Personality Item Pool.'],
    class: 'traits',
  },
  'phq-2': { origin: ['Patient Health Questionnaire (PHQ) depression-screening family.',
    'Семейство скрининговых шкал депрессивных симптомов Patient Health Questionnaire (PHQ).'], class: 'screen' },
  'phq-4': { origin: ['Kroenke and colleagues’ PHQ-4, combining brief PHQ and GAD screening items.',
    'Шкала PHQ-4 (Kroenke и соавт.), объединяющая краткие вопросы PHQ и GAD.'], class: 'screen' },
  'phq-8': { origin: ['The PHQ depression-screening family; the eight-item PHQ form excludes the ninth safety question.',
    'Семейство PHQ; восьмипунктовая версия не включает девятый вопрос безопасности.'], class: 'screen' },
  'phq-9': { origin: ['PHQ-9 from Kroenke, Spitzer and colleagues, developed for depression symptom screening.',
    'PHQ-9 Kroenke, Spitzer и соавт., созданная для скрининга депрессивных симптомов.'], class: 'screen' },
  'gad-2': { origin: ['The two-item form of the Generalized Anxiety Disorder (GAD) symptom-screening family.',
    'Двухпунктовая форма семейства опросников симптомов тревоги GAD.'], class: 'screen' },
  'gad-7': { origin: ['The GAD-7 anxiety symptom measure by Spitzer, Kroenke, Williams and Löwe.',
    'Шкала тревожных симптомов GAD-7 Spitzer, Kroenke, Williams и Löwe.'], class: 'screen' },
  k6: { origin: ['The Kessler Psychological Distress Scale, six-item version (K6).',
    'Шкала психологического дистресса Kessler, краткая версия K6.'], class: 'screen' },
  k10: { origin: ['The Kessler Psychological Distress Scale, ten-item version (K10).',
    'Шкала психологического дистресса Kessler, версия K10 из десяти вопросов.'], class: 'screen' },
  'phq-15': { origin: ['The Patient Health Questionnaire family of self-reported physical symptoms (PHQ-15).',
    'Семейство PHQ; форма PHQ-15 посвящена сообщаемым телесным симптомам.'], class: 'screen' },
  mspss: { origin: ['The Multidimensional Scale of Perceived Social Support by Zimet and colleagues.',
    'Многомерная шкала воспринимаемой социальной поддержки Zimet и соавт.'], class: 'research' },
  erq: { origin: ['The Emotion Regulation Questionnaire by Gross and John, studying reappraisal and suppression.',
    'Опросник регуляции эмоций Gross и John: переоценка и подавление экспрессии.'], class: 'research' },
  brcs: { origin: ['The Brief Resilient Coping Scale by Sinclair and Wallston.',
    'Краткая шкала устойчивого совладания Sinclair и Wallston (BRCS).'], class: 'research' },
  'rses-10': { origin: ['The Rosenberg Self-Esteem Scale by sociologist Morris Rosenberg.',
    'Шкала самооценки социолога Морриса Розенберга (RSES).'], class: 'research' },
  'ces-d-20': { origin: ['The Center for Epidemiologic Studies Depression Scale by Lenore Radloff (CES-D).',
    'Шкала депрессивных симптомов CES-D, разработанная Ленор Рэдлофф для эпидемиологических исследований.'], class: 'screen' },
  'cbi-personal': { origin: ['Copenhagen Burnout Inventory, Danish occupational-health research, personal exhaustion subscale.',
    'Копенгагенский опросник выгорания (CBI), датские исследования охраны труда, подшкала личного истощения.'], class: 'research' },
  'cbi-work': { origin: ['Copenhagen Burnout Inventory, Danish occupational-health research, work-related burnout subscale.',
    'Копенгагенский опросник выгорания (CBI), датские исследования охраны труда, подшкала рабочего истощения.'], class: 'research' },
  'cbi-client': { origin: ['Copenhagen Burnout Inventory, Danish occupational-health research, client-work burnout subscale.',
    'Копенгагенский опросник выгорания (CBI), датские исследования охраны труда, подшкала истощения при работе с клиентами.'], class: 'research' },
  'cdc-hrqol-4': { origin: ['The Healthy Days health-related quality-of-life questionnaire from the US Centers for Disease Control and Prevention (CDC).',
    'Опросник качества жизни Healthy Days Центров по контролю и профилактике заболеваний США (CDC).'], class: 'research' },
  'cdc-healthy-days-symptoms': { origin: ['The symptom-days section of the CDC Healthy Days health-related quality-of-life instrument.',
    'Модуль количества дней с симптомами американского опросника CDC Healthy Days.'], class: 'research' },
})

// For research/reference-only items, do not invent a psychometric pedigree just
// because a name appears in the research registry. Distinguish a verified source.
const REFERENCE_AREAS = Object.freeze({
  overall_wellbeing: ['subjective wellbeing and life satisfaction', 'субъективного благополучия и удовлетворённости жизнью'],
  mood_anxiety: ['mood, depression or anxiety symptoms', 'настроения, депрессивных или тревожных симптомов'],
  stress_distress: ['stress and psychological distress', 'стресса и психологического дистресса'],
  sleep_recovery: ['sleep quality and recovery', 'качества сна и восстановления'],
  body_fatigue_cognition: ['physical symptoms, fatigue or cognition', 'телесных симптомов, усталости или когнитивных особенностей'],
  resilience_coping: ['coping, resilience and self-regulation', 'совладания, устойчивости и саморегуляции'],
  relationships_support: ['relationships, attachment and social support', 'отношений, привязанности и социальной поддержки'],
  function_qol: ['everyday functioning and quality of life', 'повседневного функционирования и качества жизни'],
  burnout_work: ['workload and occupational burnout', 'нагрузки и профессионального выгорания'],
  hh_monitoring: ['regular wellbeing self-monitoring', 'регулярного самонаблюдения'],
  routine_outcomes: ['therapy process, alliance or treatment outcomes', 'динамики психотерапии, альянса или результатов помощи'],
  trauma_ptsd: ['trauma-related experiences and symptoms', 'опыта травматических событий и связанных симптомов'],
  anxiety_deep_dive: ['specific anxiety and worry patterns', 'отдельных форм тревоги и беспокойства'],
  attention_bipolar: ['attention, functioning or mood variation', 'внимания, функционирования или колебаний настроения'],
  substance_use: ['alcohol or substance-use patterns', 'употребления алкоголя или других веществ'],
  safety: ['immediate clinical safety and suicide risk', 'клинической безопасности и суицидального риска'],
  emotion_recovery: ['emotional regulation and recovery', 'эмоциональной регуляции и восстановления'],
  clinician_reference: ['personality structure and clinical assessment', 'структуры личности и клинической психологической оценки'],
})

function languageOf(locale) { return locale === 'ru' ? 'ru' : 'en' }
function sourceHref(value) { return typeof value === 'string' && /^https:\/\/[^\s]+$/.test(value) ? value : null }
function localized(source, locale) { return source?.[locale === 'ru' ? 1 : 0] || '' }

export function assessmentMethodology({ key, catalog = null, definition = null, research = null, locale = 'en' } = {}) {
  const lang = languageOf(locale)
  const ru = lang === 'ru'
  const professional = PROFESSIONAL_SOURCES[key]
  if (professional) {
    return Object.freeze({
      text: localized(professional.origin, lang) + ' ' + QUALITY[professional.class][lang],
      status: professional.class,
      sourceUrl: sourceHref(definition?.source?.url || research?.sourceUrl),
    })
  }
  if (catalog?.startable && catalog?.rightsStatus === 'cleared' && key?.startsWith('hh-')) {
    const grade = key === 'hh-bach-flower-profile' ? 'bach'
      : ['hh-socionics-32','hh-enneagram-36','hh-disc-style-20','hh-temperaments-16'].includes(key) ? 'typology' : 'original'
    return Object.freeze({
      text: QUALITY[grade][lang],
      status: grade,
      sourceUrl: null,
    })
  }
  if (catalog) {
    return Object.freeze({
      text: ru
        ? 'Эта методика внесена в каталог Holistic House, но оригинал, права или клинический протокол ещё не проверены для самостоятельного онлайн-прохождения. Она пока недоступна.'
        : 'This measure is recorded in the Holistic House catalog, but its original form, rights or clinical protocol are not yet cleared for independent online administration.',
      status: 'reference',
      sourceUrl: null,
    })
  }
  if (research) {
    const topic = localized(REFERENCE_AREAS[research.category] || REFERENCE_AREAS[research.area] || REFERENCE_AREAS.clinician_reference, lang)
    const protectedMeasure = ['clinician_only', 'licensed_only'].includes(research.rightsStatus)
    const managed = research.rightsStatus === 'managed_safety_only'
    const sourcePresent = Boolean(research.sourceUrl)
    const origin = ru
      ? 'Справочная методика «' + research.instrument + '» для изучения ' + topic + '.'
      : 'Research reference “' + research.instrument + '” relating to ' + topic + '.'
    const evidence = protectedMeasure
      ? ru
        ? 'Профессиональный/лицензируемый инструмент: для проведения нужны разрешение правообладателя и подходящая квалификация; здесь вопросы не публикуются.'
        : 'Professional/licensed instrument: administration requires appropriate qualifications and rights; its protected questions are not published here.'
      : managed
        ? ru
          ? 'Инструмент повышенного риска, требующий клинической процедуры безопасности и квалифицированной оценки; не открывается как обычный тест.'
          : 'Safety-sensitive instrument requiring a qualified clinical protocol, not offered as a casual public quiz.'
        : ru
          ? 'Исследовательская методика; электронные права, исходная версия и применимость ещё требуют проверки. Онлайн-тест пока недоступен.'
          : 'Research measure; online rights, exact version and appropriateness still require review. The questionnaire is not startable.'
    const provenance = sourcePresent ? '' : (ru
      ? ' Источник издания/правообладатель уточняется.'
      : ' Its specific publication/rights holder has not yet been verified here.')
    return Object.freeze({text: origin + ' ' + evidence + provenance, status: 'research', sourceUrl: sourceHref(research.sourceUrl)})
  }
  return Object.freeze({
    text: ru ? 'Данные об источнике и профессиональном статусе уточняются.' : 'Source and evidence classification are under review.',
    status: 'unknown', sourceUrl: null,
  })
}

export function assessmentExplanation({ key, catalog, definition, research, locale='en' } = {}) {
  const lang=languageOf(locale)
  const description=catalog?.description?.[lang] || catalog?.description?.en || ''
  const about=assessmentMethodology({key,catalog,definition,research,locale:lang})
  return Object.freeze({
    summary: description,
    originAndEvidence: about.text,
    paragraph: [description,about.text].filter(Boolean).join(' '),
    status: about.status,
    sourceUrl: about.sourceUrl,
  })
}

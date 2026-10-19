import { IPIP_FIVE_DEFINITIONS } from '../../data/assessments/ipip-five-2026.js'
import { IPIP_THREE_DEFINITIONS } from '../../data/assessments/ipip-three-2026.js'

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
    en: 'Original questionnaire for self-observation and tracking changes over time; not intended for clinical diagnosis.',
    ru: 'Авторская шкала для самонаблюдения за состоянием и динамикой; не предназначена для постановки диагноза.',
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
  // Exact English, source-documented new forms from the October 2026 professional expansion.
  'ipip-emotion-decision-making-9': { origin: [
    'Original English nine-item IPIP Emotion-based Decision-making scale from Barchard (2001), with official positive and reverse keys. Describes a preference, not decision quality.',
    'Оригинальная девятипунктовая английская шкала IPIP Barchard (2001) о роли чувств в принятии решений с прямыми и обратными ключами. Описывает предпочтения, не качество решений.',
  ], class: 'traits' },
  'ipip-responsive-joy-10': { origin: [
    'Original English ten-item IPIP Responsive Joy scale from Barchard (2001), with its published keys. Reports emotional resonance with others’ joy, not an empathy diagnosis.',
    'Оригинальная английская десятипунктовая шкала IPIP Responsive Joy Barchard (2001) с опубликованными ключами. Описывает отклик на радость других, не ставит диагноз.',
  ], class: 'traits' },
  'ipip-responsive-distress-10': { origin: [
    'Original English ten-item IPIP Responsive Distress scale from Barchard (2001). Reports emotional reactions to others’ distress, not resilience or clinical impairment.',
    'Оригинальная десятипунктовая английская шкала IPIP Responsive Distress Barchard (2001). Описывает эмоциональные реакции на чужие трудности, не оценивает диагноз или устойчивость.',
  ], class: 'traits' },
  'ipip-empathic-concern-10': { origin: [
    'Original English ten-item IPIP Empathic Concern scale from Barchard (2001), with its published positive and reverse keys. A descriptive trait scale, not an empathy diagnosis.',
    'Оригинальная десятипунктовая английская шкала эмпатической заботы IPIP Barchard (2001), с опубликованными прямыми и обратными ключами. Описательная шкала, не диагноз.',
  ], class: 'traits' },
  'ons-personal-wellbeing-4': { origin: [
    'Four original English personal well-being questions from the UK Office for National Statistics (ONS4): life satisfaction, worthwhile activities, yesterday’s happiness and anxiety. Answers are four separate 0–10 measures; combining them into a total is not recommended by ONS.',
    'Четыре оригинальных английских вопроса британского Office for National Statistics (ONS4): удовлетворённость жизнью, смысл занятий, радость и тревога вчера. Это четыре отдельных оценки 0–10; ONS не рекомендует складывать их в общую сумму.',
  ], class: 'research' },
  'pcl-5': {origin: ['Original adult English PCL-5 with Criterion A, VA National Center for PTSD, 29 August 2023. Public domain; past-month symptom sum and four clusters, with no selected diagnostic cutoff or severity bands. Criterion A responses do not by themselves establish a diagnosis.', 'Оригинальная английская форма PCL-5 для взрослых с Criterion A, VA National Center for PTSD, 29 августа 2023 года. Общественное достояние; сумма симптомов за месяц и четыре кластера, без диагностического порога и категорий тяжести. Ответы Criterion A сами по себе не устанавливают диагноз.'], class: 'screen'},
  'itq-adult': {origin: ['Original adult English International Trauma Questionnaire (ITQ), developer-hosted final 12-symptom and 6-impairment form. Public domain. PTSD symptoms refer to the past month; DSO symptoms to typical patterns. Impairment is not included in symptom sums. No total-score diagnostic cutoff.', 'Оригинальная английская взрослая International Trauma Questionnaire (ITQ): окончательная форма разработчиков, 12 симптомов и 6 вопросов о функционировании. Общественное достояние. Симптомы PTSD относятся к месяцу, DSO — к привычным проявлениям. Нарушения функционирования не входят в суммы симптомов. Диагностический порог общей суммы не применяется.'], class: 'screen'},
  'asrs-6': { origin: ['Adult ADHD Self-Report Scale v1.1, six-question patient-facing NYU form for adults aged 18 or older (Kessler et al., 2005). Uses the past six months and the printed classic shaded-response count: 0–6, with a screening threshold of 4. This is not a continuous severity score, the 18-question checklist, ASRS-5 or the 2024 continuous scoring method. Electronic reproduction is permitted with attribution; the form is copyrighted. The NYU-distributed Russian translation is available, but validation of that exact Russian wording has not been established.',
    'ASRS-v1.1, шестипунктовая форма NYU для самостоятельного заполнения взрослыми от 18 лет (Kessler и соавт., 2005). Период — последние шесть месяцев; используется напечатанное классическое правило подсчёта заштрихованных ответов: 0–6, скрининговый порог — 4. Это не непрерывная оценка тяжести, не полный опросник из 18 вопросов, не ASRS-5 и не непрерывный алгоритм 2024 года. Электронное воспроизведение разрешено с атрибуцией; форма защищена авторским правом. Доступен русский перевод, распространяемый NYU, но валидация именно этой русской формулировки не подтверждена.'], class: 'screen' },
  'mhc-sf': { origin: ['Adult Mental Health Continuum Short Form by Corey L. M. Keyes, December 2011 English form. It reports continuous wellbeing sums, not diagnostic categories. Russian interface text is not a validated questionnaire translation; high wellbeing does not rule out mental illness.',
    'Взрослая краткая шкала психического благополучия Corey L. M. Keyes, английская форма декабря 2011 года. Используются непрерывные суммы, а не диагностические категории. Русский интерфейс не является валидированным переводом опросника; высокий балл благополучия не исключает психическое расстройство.'], class: 'research' },
  'scs-sf': { origin: ['Self-Compassion Scale Short Form by Raes, Pommier, Neff and Van Gucht (2011). The original English short form reports a total only; its two-item subscales are unreliable.',
    'Краткая шкала самосострадания Raes, Pommier, Neff и Van Gucht (2011). Оригинальная английская форма: только общий балл, двухпунктовые подшкалы недостаточно надёжны.'], class: 'research' },
  'compassion-scale': { origin: ['Compassion Scale by Pommier, Neff and Tóth-Király (2019), measuring compassion toward other people. The questionnaire remains in its original English.',
    'Шкала сострадания к другим людям Pommier, Neff и Tóth-Király (2019). Вопросы сохранены на оригинальном английском языке.'], class: 'research' },
  'tipi-10': { origin: ['Ten-Item Personality Inventory by Gosling, Rentfrow and Swann (2003), original English form. Its very brief trait scales trade precision for speed.',
    'Десятипунктовый личностный опросник Gosling, Rentfrow и Swann (2003), оригинал на английском. Краткость ограничивает точность отдельных черт.'], class: 'traits' },
  'mini-ipip-20': {
    origin: ['Mini-IPIP (Donnellan et al.), from the public-domain International Personality Item Pool (IPIP).',
      'Краткая Mini-IPIP (Donnellan и соавт.) из открытого International Personality Item Pool (IPIP).'],
    class: 'traits',
  },
  'ipip-via-r-strengths-96': {
    origin: ['Complete 96-item original-English IPIP-VIA-R research profile (Bluemke and colleagues, 2021), combining 24 established four-item strength scales. Descriptive 1–5 means; not the proprietary VIA Institute survey or clinical improvement targets.',
      'Полный исследовательский профиль IPIP-VIA-R из 96 оригинальных английских вопросов (Bluemke и соавт., 2021): 24 проверяемые четырёхпунктовые шкалы сильных сторон. Описательные средние от 1 до 5; это не проприетарный тест VIA Institute и не клинические цели коррекции.'], class: 'traits' },
  'cfpb-financial-wellbeing-5': {
    origin: ['Consumer Financial Protection Bureau abbreviated financial well-being scale (2017): five original English statements plus age band and administration-mode qualifiers. The 0–100 result follows the published four-column conversion table, not a raw total. Calibrated on U.S. adult data, so direct population comparisons outside the United States are limited.',
      'Сокращённая шкала финансового благополучия Consumer Financial Protection Bureau (2017): пять оригинальных английских утверждений и уточнения возрастной группы и способа заполнения. Балл 0–100 рассчитывается по опубликованной четырёхколоночной таблице, не по простой сумме. Шкала калибрована на взрослых жителях США, поэтому прямые популяционные сравнения за пределами США ограничены.'], class: 'research' },
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
  const ipip = [...IPIP_THREE_DEFINITIONS, ...IPIP_FIVE_DEFINITIONS].find(d => d.key === key)
  if (ipip) return Object.freeze({
    text: ipip.source.citation + ' ' + ipip.source.interpretation + ' ' +
      'Original English IPIP research scale. Public-domain rights do not establish clinical certification or validity in other languages.',
    status: 'research', sourceUrl: ipip.source.url,
  })
  const professional = PROFESSIONAL_SOURCES[key] || (key?.startsWith('ipip-aspect-') ? {
    origin: ['Original English IPIP item set for a Big Five aspect, from DeYoung, Quilty and Peterson (2007). This is an individual aspect scale, not the complete BFAS.',
      'Оригинальные английские пункты IPIP для отдельного аспекта Большой пятёрки, DeYoung, Quilty и Peterson (2007). Отдельная шкала аспекта, а не полный BFAS.'], class: 'traits',
  } : key?.startsWith('ipip-via-r-core-') ? {
    origin: ['Original English six-item IPIP-VIA-R-based global core strength scale, Partsch, Olaru and Lechner (2022). Three positive and three reverse-keyed items; it overlaps the shorter strengths and is not the proprietary VIA survey.',
      'Оригинальная английская шестипунктовая шкала обобщённой сильной стороны IPIP-VIA-R, Partsch, Olaru и Lechner (2022). Три прямых и три обратных вопроса; пересекается с короткими шкалами и не является проприетарным опросником VIA.'], class: 'traits',
  } : key?.startsWith('ipip-via-r-') ? {
    origin: ['Original English four-item IPIP-VIA-R research scale, Bluemke and colleagues (2021). It describes one character strength and is not the proprietary VIA survey.',
      'Оригинальная английская четырёхпунктовая исследовательская шкала IPIP-VIA-R, Bluemke и соавт. (2021). Описывает одну сильную сторону характера; это не проприетарный опросник VIA.'], class: 'traits',
  } : null)
  if (professional) {
    return Object.freeze({
      text: localized(professional.origin, lang) + ' ' + QUALITY[professional.class][lang],
      status: professional.class,
      sourceUrl: sourceHref(definition?.source?.url || research?.sourceUrl ||
        (key === 'asrs-6' ? 'https://license.tov.med.nyu.edu/product/asrs6Qscreener' : null)),
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
    if (research.category === 'hh_monitoring' && key?.startsWith('hh-')) {
      return Object.freeze({
        text: QUALITY.original[lang] + (ru
          ? ' Внутренняя справочная запись Holistic House; эта форма пока недоступна для прохождения.'
          : 'Internal Holistic House reference; this form is not currently available to take.'),
        status: 'original', sourceUrl: null,
      })
    }
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
  // Spanish is a presentation locale only: use translated catalog summaries where
  // reviewed, while keeping the original-language methodology and scored form intact.
  const summaryLocale=locale === 'es' ? 'es' : lang
  const description=catalog?.description?.[summaryLocale] || catalog?.description?.[lang] || catalog?.description?.en || ''
  const about=assessmentMethodology({key,catalog,definition,research,locale:lang})
  return Object.freeze({
    summary: description,
    originAndEvidence: about.text,
    paragraph: [description,about.text].filter(Boolean).join(' '),
    status: about.status,
    sourceUrl: about.sourceUrl,
  })
}

import { personalityDimensionGuidance } from './personality-type-interpretation.js'
import { publishedRangeCommentary } from './published-range-commentary.js'
import { CFPB_SHORT_2017_LOOKUP } from './cfpb-short-scoring.js'

// One auditable, source-safe reading contract for ALL verified numeric assessment
// dimensions. Only source-published boundaries are screening/reference categories.
// Source-option and equal-width editorial intervals are never clinical cutoffs.
// Version/provenance checks occur in interpretationBandModel before this function.

const LANG = locale => locale === 'ru' ? 'ru' : 'en'
const CFPB_VALUES = [...new Set(CFPB_SHORT_2017_LOOKUP.flat())].sort((a,b)=>a-b)
const CFPB_ACTUAL_BOUNDS = [CFPB_VALUES[0], CFPB_VALUES.at(-1)]
const format = (value, locale) => new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
  maximumFractionDigits: 2,
}).format(value)

const SOURCE_FOCUS = Object.freeze({
  'symptoms.phq2.total': [
    'Ответы о снижении интереса и настроения за последние две недели. Порог помогает решить, нужна ли дальнейшая оценка, но не ставит диагноз.',
    'Answers about reduced interest and low mood over the past two weeks. The threshold guides follow-up, not diagnosis.',
  ],
  'symptoms.gad2.total': [
    'Ответы о нервозности и трудноконтролируемом беспокойстве за последние две недели.',
    'Answers about nervousness and difficult-to-control worry over the past two weeks.',
  ],
  'symptoms.phq4.total': [
    'Общий показатель объединяет тревогу и настроение: важно отдельно посмотреть обе подшкалы.',
    'The total combines mood and anxiety: review each subscale independently.',
  ],
  'symptoms.phq4.depression': [
    'Эта подшкала описывает настроение и интерес, а не все причины эмоциональных трудностей.',
    'This subscale concerns low mood and loss of interest, not the causes of emotional difficulties.',
  ],
  'symptoms.phq4.anxiety': [
    'Эта подшкала описывает тревогу и беспокойство, а не характер человека.',
    'This subscale concerns anxiety and worry, not an enduring personality trait.',
  ],
  'symptoms.phq9.total': [
    'Показатель относится к сообщаемым симптомам за последние две недели. Если самочувствие или безопасность вызывают беспокойство, обратитесь за профессиональной помощью независимо от суммы.',
    'The score reflects reported symptoms over the past two weeks. Seek appropriate help for concerning symptoms or safety concerns regardless of the total.',
  ],
  'symptoms.phq_8.total': [
    'Показатель описывает переживания настроения и интереса за последние две недели, не устанавливая их причину.',
    'The score describes reported mood and interest difficulties over the past two weeks, without establishing their cause.',
  ],
  'symptoms.gad7.total': [
    'Показатель описывает частоту тревожных переживаний за последние две недели, но не подтверждает тревожное расстройство.',
    'The score describes anxiety experiences in the past two weeks, not a confirmed anxiety disorder.',
  ],
  'symptoms.k6.total': [
    'Опросник показывает неспецифический психологический дистресс. Скрининговый порог нельзя считать индивидуальной вероятностью заболевания.',
    'The questionnaire measures non-specific psychological distress; the screening cutoff is not an individual probability.',
  ],
  'symptoms.phq15.total': [
    'Отмечены телесные жалобы за последние четыре недели. Показатель не объясняет медицинские причины симптомов.',
    'These are reported bodily symptoms over the past four weeks; the score cannot identify medical causes.',
  ],
  'resources.brcs.total': [
    'Речь о привычных ответах на стресс и гибкости совладания, а не об оценке ценности личности.',
    'This reflects flexible coping responses to stress, not a judgement of personal worth.',
  ],
  'symptoms.asrs6.shaded_count': [
    'Подсчитываются ответы, попавшие в выделенные поля ASRS. Это скрининг, а не шкала тяжести или диагноз СДВГ.',
    'This counts responses in ASRS shaded cells. It is a screening signal, not severity or an ADHD diagnosis.',
  ],
})

const BAND_EXPLANATIONS = Object.freeze({
  below_screen: [
    'Ответы ниже опубликованного скринингового порога. Это не означает, что затруднений не бывает.',
    'Responses are below the published screening threshold; this does not rule out difficulties.',
  ],
  screen_signal: [
    'Ответы достигли опубликованного скринингового порога. При заметных трудностях стоит обсудить их со специалистом.',
    'Responses meet the published screening threshold; consider professional follow-up if symptoms affect daily life.',
  ],
  minimal: [
    'Самый нижний опубликованный диапазон сообщаемых симптомов для этого опросника.',
    'The lowest published range of reported symptoms for this questionnaire.',
  ],
  mild: [
    'Симптомы отмечены чаще, чем в минимальной категории, но меньше, чем в следующих диапазонах.',
    'Symptoms were reported more often than in the minimal category, but less than in higher bands.',
  ],
  moderate: [
    'Сообщаемые переживания находятся в опубликованном промежуточном диапазоне; полезно учесть влияние на дела.',
    'Reported experiences fall into the published middle range; consider their effect on daily functioning.',
  ],
  moderately_severe: [
    'Один из верхних опубликованных диапазонов: трудности заслуживают внимания и индивидуальной оценки.',
    'One of the upper published ranges: concerns merit attention and an individual assessment.',
  ],
  severe: [
    'Верхний опубликованный диапазон сообщаемых симптомов. Это характеристика ответов, а не готовый диагноз.',
    'The highest published range of reported symptoms, not a diagnosis.',
  ],
  low: [
    'Нижний опубликованный диапазон выраженности отмеченных телесных симптомов.',
    'The lower published range of reported bodily symptom burden.',
  ],
  medium: [
    'Промежуточный опубликованный диапазон выраженности телесных симптомов.',
    'The middle published range of reported bodily symptom burden.',
  ],
  high: [
    'Верхний опубликованный диапазон выраженности отмеченных телесных симптомов.',
    'The upper published range of reported bodily symptom burden.',
  ],
  low_coping: [
    'В этой версии шкалы отмечено сравнительно меньше утверждений о гибком совладании со стрессом.',
    'Fewer resilient coping responses are endorsed in this version of the scale.',
  ],
  mid_coping: [
    'Отмечено промежуточное количество утверждений о гибких ответах на стресс.',
    'An intermediate amount of resilient coping responses is endorsed.',
  ],
  high_coping: [
    'Отмечено сравнительно больше утверждений о гибких способах справляться со стрессом.',
    'More resilient coping responses are endorsed, without guaranteeing them in every situation.',
  ],
})

const GENERAL_HEALTH = Object.freeze({
  ru: ['Отличное', 'Очень хорошее', 'Хорошее', 'Удовлетворительное', 'Плохое'],
  en: ['Excellent', 'Very good', 'Good', 'Fair', 'Poor'],
})
const isTrait = dimension => dimension?.dimensionClass === 'trait'

function directionNote(dimension, locale) {
  const ru = locale === 'ru'
  if (isTrait(dimension)) return ru
    ? 'Эта шкала описывает выраженность особенности в ответах. Ни высокий, ни низкий балл не означает «лучшую» личность.'
    : 'This score reflects endorsement of a trait, not a better or worse personality.'
  const direction = dimension?.direction || ''
  if (direction.startsWith('lower-reported-')) return ru
    ? 'Чем выше число, тем больше трудностей отражено в ответах.'
    : 'Higher numbers reflect more reported difficulties.'
  if (direction.startsWith('higher-reported-')) return ru
    ? 'Чем выше число, тем больше соответствующей возможности отражено в ответах.'
    : 'Higher numbers reflect more endorsement of the named resource or experience.'
  return ru ? 'Баллы отражают ответы, а не оценку личности или здоровья.'
    : 'Scores describe questionnaire responses, not personal worth or health.'
}

function publicRows(bands, locale, dimension, result) {
  const n = locale === 'ru' ? 0 : 1
  const source = SOURCE_FOCUS[dimension.key]?.[n] || ''
  return bands.map(band => ({
    code: band.code,
    label: band.label,
    displayRange: format(band.from, locale) + '–' + format(band.to, locale),
    note: (publishedRangeCommentary(result?.definitionKey, dimension.key, band.code, locale) ||
      BAND_EXPLANATIONS[band.code]?.[n] || (locale === 'ru'
      ? 'Опубликованная категория этого опросника описывает ответы, а не диагноз.'
      : 'This published questionnaire range describes responses, not a diagnosis.')) +
      (source ? ' ' + source : ''),
    current: Boolean(band.current),
  }))
}

function nearestAnswerRows(bands) {
  return bands.map(band => ({
    code: band.code, label: (band.levelLabel ? band.levelLabel + ' · ' : '') + band.label,
    displayRange: band.displayRange, note: band.note, current: Boolean(band.current),
  }))
}

function ordinalHealthRows(dimension, locale) {
  if (dimension.key !== 'function.hrqol4.general_health' ||
      dimension.min !== 1 || dimension.max !== 5 || !Number.isInteger(dimension.value)) return null
  const labels = GENERAL_HEALTH[LANG(locale)]
  return labels.map((label, index) => ({
    code: 'health-option-' + (index + 1), label,
    displayRange: String(index + 1), current: dimension.value === index + 1,
    note: locale === 'ru'
      ? 'В анкете вариант «' + label.toLowerCase() + '» соответствует ответу ' + (index + 1) +
        ' из пяти. Это самооценка общего здоровья, а не определение его медицинской причины.'
      : 'The questionnaire option “' + label.toLowerCase() + '” corresponds to answer ' +
        (index + 1) + ' of five. It is a self-rating, not a determination of medical causes.',
  }))
}

function singleRange(dimension, locale, result, interpretation) {
  const min = format(dimension.min, locale), max = format(dimension.max, locale)
  const label = locale === 'ru' ? 'Без подтверждённых категорий' : 'No established categories'
  const value = format(dimension.value, locale)
  const count = /(?:days|days_index)|unhealthy_days_index/.test(dimension.key)
  const calibrated = result?.definitionKey === 'cfpb-financial-wellbeing-5'
  const mixed = interpretation?.reliableDirection === false
  const explanation = calibrated
    ? locale === 'ru'
      ? 'Баллы рассчитаны по таблице CFPB с учётом возраста и способа заполнения. Номинальная шкала 0–100, но эта сокращённая версия фактически даёт только ' + CFPB_VALUES.length + ' отдельных значений от ' + CFPB_ACTUAL_BOUNDS.join(' до ') + '. Это не процентиль, уровень дохода или диагноз.'
      : 'This is a CFPB score from the published age-and-administration lookup. Although labeled 0–100, this short form produces only ' + CFPB_VALUES.length + ' distinct scores within ' + CFPB_ACTUAL_BOUNDS.join('–') + '. It is not a percentile, income category or diagnosis.'
    : mixed
      ? locale === 'ru'
        ? 'Сохранённая версия объединяет ответы разной направленности. Единый уровень трудностей или ресурсов определить по ней нельзя.'
        : 'This saved version combines responses in opposite directions. No single difficulty/resource level can be justified.'
      : count
        ? locale === 'ru'
          ? 'Показатель связан с периодом последних 30 дней. Это количество отмеченных дней либо расчётный индекс, а не клиническая категория.'
          : 'This measure concerns the past 30 days: a day count or derived index, not a clinical category.'
        : locale === 'ru'
          ? 'На этой шкале нет подтверждённых границ категорий. Читайте число вместе с названием показателя и вопросами анкеты.'
          : 'No supported category boundaries are available. Read the number together with this measure and the questionnaire items.'
  const position = locale === 'ru'
    ? 'Ваш показатель: ' + value + ' в допустимом диапазоне ' + min + '–' + max + '. '
    : 'Your score: ' + value + ' within the permitted ' + min + '–' + max + ' range. '
  return [{
    code: 'exact-continuous', label,
    displayRange: min + '–' + max, current: true, note: position + explanation,
  }]
}

export function assessmentRangeReading({ result, dimension, interpretation, bands = [], answerBands = [], scoreLevelGuide = null, authorClusters = null, legacyMixed = null, locale = 'en' } = {}) {
  if (!result || !dimension || !interpretation?.verified ||
      !Number.isFinite(dimension.value) || !Number.isFinite(dimension.min) ||
      !Number.isFinite(dimension.max) || dimension.max <= dimension.min ||
      dimension.value < dimension.min || dimension.value > dimension.max) return null
  const ru = locale === 'ru'
  const name = interpretation.construct || dimension.sourceConstruct || dimension.key
  const scope = SOURCE_FOCUS[dimension.key]?.[ru ? 0 : 1] || null
  const trait = isTrait(dimension)
  const typeGuide = trait ? personalityDimensionGuidance(dimension, locale) : null
  const activeClusters = authorClusters?.rows?.length ? authorClusters : legacyMixed?.rows?.length ? legacyMixed : null
  const kind = bands.length ? 'published' : activeClusters?.rows?.length ? activeClusters.kind
    : answerBands.length ? 'source-options'
    : scoreLevelGuide?.bands?.length ? 'descriptive'
      : ordinalHealthRows(dimension, locale) ? 'ordinal' : 'continuous'
  const rows = kind === 'published' ? publicRows(bands, locale, dimension, result)
    : activeClusters?.rows?.length ? activeClusters.rows
      : kind === 'source-options' ? nearestAnswerRows(answerBands)
      : kind === 'descriptive' ? scoreLevelGuide.bands.map(b => ({
          code: b.code, label: b.label, displayRange: b.displayRange,
          note: b.note, current: b.current,
        }))
        : kind === 'ordinal' ? ordinalHealthRows(dimension, locale)
          : singleRange(dimension, locale, result, interpretation)
  const current = rows.find(item => item.current)
  if (!current || rows.filter(item => item.current).length !== 1 ||
      rows.some(row => !row.label || !row.note || !row.displayRange)) return null
  const heading = legacyMixed?.heading || (trait
    ? ru ? 'Что это говорит о ваших личностных особенностях' : 'What this says about the reported personality tendency'
    : ru ? 'Что это говорит о текущей ситуации' : 'What this says about your reported situation')
  const prefix = legacyMixed?.rows?.length
    ? ru ? 'Архивное общее среднее: ' : 'Archived mixed-domain mean: '
    : authorClusters?.rows?.length
    ? ru ? 'По шкале «' + name + '»: ' : 'For “' + name + '”: '
    : kind === 'published'
    ? ru ? 'По опубликованным правилам шкалы «' + name + '» ' : 'According to the published “' + name + '” ranges, '
    : kind === 'source-options'
      ? ru ? 'Средний ответ по теме «' + name + '» ближе к варианту анкеты: ' : 'The mean for “' + name + '” is closest to questionnaire option: '
      : kind === 'descriptive'
        ? ru ? 'По ответам о теме «' + name + '»: ' : 'Based on responses about “' + name + '”: '
        : ru ? 'По шкале «' + name + '»: ' : 'On the “' + name + '” measure: '
  const narrative = prefix + current.note
  const contextual = legacyMixed?.rows?.length ? null : authorClusters?.observation || scoreLevelGuide?.observation || scope || typeGuide?.meaning || null
  const caution = activeClusters?.caution || (kind === 'published'
    ? interpretation.basis === 'published-reference'
      ? ru
        ? 'Это опубликованные описательные диапазоны конкретной методики, а не медицинский скрининг, диагноз или доказательство эффективности совладания.'
        : 'These are published descriptive reference ranges for this measure, not a medical screening result, diagnosis or evidence of real-world coping effectiveness.'
      : ru
        ? 'Границы взяты из опубликованных правил именно этой версии опросника. Даже скрининг не является диагнозом.'
        : 'These are published boundaries for this exact questionnaire version. Screening never establishes a diagnosis.'
    : kind === 'source-options'
      ? ru
        ? 'Интервалы показывают близость среднего к исходным вариантам ответа. Одинаковое среднее возможно при разных отдельных ответах; это не медицинские нормы, диагноз или доказательство устойчивой особенности.'
        : 'These intervals show proximity of a mean to original response options. Different item patterns can yield the same mean; they are not clinical norms, diagnoses or evidence of a stable trait.'
      : kind === 'descriptive'
        ? ru
          ? 'Пять равных участков — лишь визуальное деление возможных баллов, а не проверенные нормы или уровни тяжести. Одинаковый средний балл может скрывать разные отдельные ответы.'
          : 'Five equal slices only describe arithmetic position, not validated norms or severity cutoffs. The same average can conceal different individual answers.'
        : ru
          ? 'Для этого показателя не создаются неподтверждённые диапазоны тяжести, типов или развития.'
          : 'No unsupported severity, personality-type or developmental ranges have been created.')
  const rangeTitle = legacyMixed?.rows?.length ? legacyMixed.rangeTitle
    : authorClusters?.rows?.length
    ? ru ? 'Точные достижимые диапазоны ответов' : 'Exact attainable questionnaire score intervals'
    : kind === 'published'
    ? interpretation.basis === 'published-reference'
      ? ru ? 'Опубликованные описательные диапазоны' : 'Published reference ranges'
      : ru ? 'Опубликованные скрининговые диапазоны' : 'Published screening ranges'
    : kind === 'source-options'
      ? ru ? 'Диапазоны ответов анкеты' : 'Questionnaire response ranges'
      : kind === 'descriptive'
        ? ru ? 'Пять описательных участков шкалы' : 'Five descriptive score positions'
        : kind === 'ordinal' ? ru ? 'Пять вариантов ответа' : 'Five source answer options'
          : ru ? 'Возможный диапазон баллов' : 'Permitted score range'
  const selectedCaption = ru ? 'Ваш диапазон' : 'Your range'
  return Object.freeze({
    kind, rows, current, heading, narrative, contextual, caution, rangeTitle, selectedCaption,
    sourceMeaning: interpretation.summary || null,
    sourceQuestions: activeClusters?.sourceQuestions || null,
    scoringNote: activeClusters?.scoringNote || null,
    // Transparent source coding/rubric, not a new scorer or guessed raw answers.
    sourceResponseOptions: authorClusters?.responseOptions || null,
    contentBoundary: authorClusters?.contentBoundary || null,
    clusterBasis: activeClusters?.basis || null,
    legacyVersion: legacyMixed?.oldVersion || null,
    newerVersion: legacyMixed?.newerVersion || null,
    directionNote: legacyMixed?.rows?.length
      ? ru ? 'Архивный балл объединяет вопросы разной направленности; рост или снижение суммы не означает улучшения либо ухудшения.'
        : 'The archived mean combines opposite-direction items. A higher or lower total does not indicate improvement or deterioration.'
      : directionNote(dimension, locale),
    trait, verified: true,
  })
}

import { SITUATION_OBSERVATION, CONTEXT_LABELS, situationLevelNote } from './situational-score-context.js'

// Readable positions on an exact, verified, descriptive score range.
// These five equal slices are editorial reading aids, NEVER validated
// clinical thresholds, percentiles, diagnoses, or replacements for the
// instrument's published screening categories or original answer anchors.
const CBI_TOPICS = Object.freeze({
  'cbi-personal': {
    ru: 'физического и психологического истощения в целом',
    en: 'physical and psychological exhaustion in everyday life',
    count: 6,
  },
  'cbi-work': {
    ru: 'истощения, связанного с работой',
    en: 'work-related exhaustion',
    count: 7,
  },
  'cbi-client': {
    ru: 'истощения при взаимодействии с клиентами',
    en: 'client-related exhaustion',
    count: 6,
  },
})

const STAGES = Object.freeze({
  ru: ['Ближе к минимуму', 'Ниже середины', 'Средняя часть', 'Выше середины', 'Ближе к максимуму'],
  en: ['Near the minimum', 'Below the midpoint', 'Middle range', 'Above the midpoint', 'Near the maximum'],
})

// CBI work/client forms mix degree and frequency response anchors. Their
// average cannot be translated into a literal frequency or clinical band.
// Retain neutral, explicitly editorial positions for all three subscales.
const CBI_STAGES = STAGES

const POSITION_NOTES = Object.freeze({
  ru: [
    'Показатель близок к минимальному варианту ответов. Это не означает полного отсутствия проявлений в любой ситуации.',
    'Показатель ниже середины: выбранные ответы больше тяготеют к нижней части возможных значений.',
    'Показатель находится в центральном участке диапазона. Некоторые отдельные ответы могут существенно отличаться от среднего.',
    'Показатель выше середины: показатель чаще или сильнее представлен в ответах, чем на нижних участках шкалы.',
    'Показатель близок к максимуму опросника. Сами баллы не объясняют причины и не позволяют сравнивать себя с нормой населения.',
  ],
  en: [
    'The score is near the lowest available score. This does not prove the experience is absent in every situation.',
    'The score is below the midpoint: responses are closer to the lower portion of the permitted range.',
    'The score falls in the middle of the range. Individual answers may still differ considerably from the average.',
    'The score is above the midpoint: the measure is endorsed more strongly than at the low end of the scale.',
    'The score is near the upper limit of the questionnaire. Scores alone do not establish causes or population norms.',
  ],
})

const CBI_NOTES = Object.freeze({
  ru: [
    'По среднему баллу признаки усталости и истощения отмечены в небольшой мере. Это не гарантирует, что вы всегда полностью восстановлены.',
    'Сообщаемая усталость присутствует, но средний балл остаётся ниже середины CBI. Проверьте, когда нагрузка особенно ощутима.',
    'Ответы отражают заметную физическую или эмоциональную усталость. Сопоставьте её с режимом нагрузки, отдыхом и влиянием на повседневную жизнь.',
    'Усталость и истощение довольно часто или сильно отражены в ответах. Если это мешает обычной жизни, полезно обсудить ситуацию со специалистом.',
    'Средний балл близок к верхней границе CBI: истощение выражено во многих ответах. При стойком ухудшении самочувствия нужна профессиональная оценка.',
  ],
  en: [
    'Tiredness and exhaustion appear to a lesser degree in the average response. This does not guarantee full recovery in every situation.',
    'Some tiredness is reported, while the mean stays below the CBI midpoint. Notice when demands feel especially heavy.',
    'The responses show noticeable physical or emotional tiredness. Relate it to workload, recovery and any effect on everyday life.',
    'Tiredness and exhaustion are often or strongly reflected in the responses. If daily functioning is affected, consider professional support.',
    'The CBI mean is near the top of its range: exhaustion is strongly reflected across responses. Persistent difficulties deserve professional evaluation.',
  ],
})

const fmt = (value, lang) => new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
  maximumFractionDigits: 2,
}).format(value)

export function descriptiveScoreLevels({ result, section, model, locale = 'en' } = {}) {
  // Respect published source bands and HH questionnaires with authentic answer anchors.
  // Never interpret a saved or provenance-incompatible result.
  if (!result || !section || !model?.verified ||
      section.bandBasis !== 'descriptive' || model.bandBasis !== 'descriptive' ||
      model.bands?.length || model.answerBands?.length ||
      !Number.isFinite(section.value) || !Number.isFinite(section.min) ||
      !Number.isFinite(section.max) || section.max <= section.min ||
      section.value < section.min || section.value > section.max) return null

  // Six original v1 HH inventories combine opposite-direction questions.
  // They must never acquire a fabricated ordered severity/resource score.
  if (result.definitionKey?.startsWith('hh-') && model.reliableDirection === false) return null

  // A score for a 30-day count, a one-item ordinal health rating or the
  // U.S.-calibrated CFPB lookup should not be split into artificial "levels".
  if (['cdc-hrqol-4', 'cdc-healthy-days-symptoms', 'cfpb-financial-wellbeing-5',
    'hh-bach-flower-profile', 'pcl-5', 'itq-adult'].includes(result.definitionKey)) return null

  const lang = locale === 'ru' ? 'ru' : 'en'
  const cbi = CBI_TOPICS[result.definitionKey] &&
    section.min === 0 && section.max === 100 &&
    section.key === ({
      'cbi-personal': 'symptoms.cbi_personal.total',
      'cbi-work': 'symptoms.cbi_work.total',
      'cbi-client': 'symptoms.cbi_client.total',
    })[result.definitionKey] ? CBI_TOPICS[result.definitionKey] : null
  const subject = section.construct || section.title || (lang === 'ru' ? 'этой темы' : 'this measure')
  const isSituation = result.definitionKey?.startsWith('hh-') &&
    ['difficulty', 'resource', 'neutral'].includes(model.orientation) &&
    model.reliableDirection !== false
  const mode = isSituation ? model.orientation : 'neutral'
  const observation = isSituation
    ? SITUATION_OBSERVATION[section.key]?.[lang] || SITUATION_OBSERVATION[result.definitionKey]?.[lang] || null
    : null
  const step = (section.max - section.min) / 5
  const index = Math.min(4, Math.floor((section.value - section.min) / (section.max - section.min) * 5))
  const names = cbi ? CBI_STAGES[lang] : isSituation ? CONTEXT_LABELS[lang][mode] : STAGES[lang]
  const notes = cbi ? CBI_NOTES[lang] : POSITION_NOTES[lang]
  const bands = Array.from({ length: 5 }, (_, number) => {
    const from = section.min + number * step
    const to = number === 4 ? section.max : section.min + (number + 1) * step
    return {
      code: 'position-' + (number + 1),
      from, to, label: names[number],
      note: isSituation
        ? situationLevelNote({ mode, construct: subject, index: number, locale: lang })
        : notes[number],
      displayRange: fmt(from, lang) + '–' + (number === 4 ? '' : '<') + fmt(to, lang),
      current: number === index,
    }
  })
  return {
    bands, current: bands[index], currentIndex: index,
    observation,
    title: lang === 'ru' ? 'Ваш результат — участок ' + (index + 1) + ' из 5' : 'Your result — part ' + (index + 1) + ' of 5',
    overview: isSituation
      ? lang === 'ru'
        ? 'Шкала «' + subject + '»: ' + fmt(section.value, lang) + ' балла при диапазоне ' +
          fmt(section.min, lang) + '–' + fmt(section.max, lang) +
          '. ' + (mode === 'difficulty' ? 'Больше баллов означает больше сообщаемых трудностей.' :
            mode === 'resource' ? 'Больше баллов означает больше отмеченных возможностей и ресурсов.' :
              'Баллы описывают особенность, а не её ценность.') +
          ' Это оценка собственных ответов, не медицинский уровень.'
        : 'The “' + subject + '” score is ' + fmt(section.value, lang) + ' in the possible ' +
          fmt(section.min, lang) + '–' + fmt(section.max, lang) + ' range. ' +
          (mode === 'difficulty' ? 'Higher scores mean more reported difficulty.' :
            mode === 'resource' ? 'Higher scores mean more reported resources or choices.' :
              'The score describes a tendency, not its worth.') +
          ' This is self-report, not a clinical rating.'
      : cbi
        ? lang === 'ru'
        ? 'CBI оценивает частоту и выраженность ' + cbi.ru + ' по ' + cbi.count + ' ответам. ' +
          'Ваш средний результат — ' + fmt(section.value, lang) + ' из 100. Это не процент здоровья и не диагноз выгорания.'
        : 'CBI describes the frequency and intensity of ' + cbi.en + ' across ' + cbi.count +
          ' responses. Your mean is ' + fmt(section.value, lang) + ' out of 100; it is not a health percentage or burnout diagnosis.'
      : lang === 'ru'
        ? 'Шкала «' + subject + '» отражает ответы на вопросы именно этого опросника. Балл ' +
          fmt(section.value, lang) + ' из диапазона ' + fmt(section.min, lang) + '–' + fmt(section.max, lang) +
          ' показывает положение относительно возможных ответов, а не относительно других людей.'
        : 'The ' + subject + ' measure describes answers to this questionnaire. ' +
          fmt(section.value, lang) + ' on the ' + fmt(section.min, lang) + '–' + fmt(section.max, lang) +
          ' range shows its position among possible answers, not relative to other people.',
    heading: lang === 'ru' ? 'Что означает каждый участок' : 'What each part means',
    caveat: lang === 'ru'
      ? 'Пять равных участков добавлены для понятного чтения балла. Они не являются опубликованными нормами, клиническими уровнями тяжести или порогами диагноза.'
      : 'These five equal slices help you read a score. They are not published norms, clinical severity levels or diagnostic thresholds.',
  }
}

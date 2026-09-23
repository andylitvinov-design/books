const shared = {
  ru: {
    patient: 'Клиент',
    date: 'Дата',
    number: 'Рекомендация №',
    purpose: 'Цель',
    dosage: 'Как принимать',
    frequency: 'Частота',
    duration: 'Длительность',
    sequence: 'Этап',
    instructions: 'Индивидуальные инструкции',
    general: 'ПРИМЕЧАНИЕ',
    followUp: 'Следующая консультация',
    disclaimer: 'Материал носит информационный характер и не заменяет медицинскую диагностику, лечение или неотложную медицинскую помощь.',
  },
  en: {
    patient: 'Client',
    date: 'Date',
    number: 'Recommendation No.',
    purpose: 'Purpose',
    dosage: 'How to take',
    frequency: 'Frequency',
    duration: 'Duration',
    sequence: 'Stage',
    instructions: 'Instructions',
    general: 'NOTE',
    followUp: 'Follow-up',
    disclaimer: 'This document is provided for informational purposes and is not a substitute for medical diagnosis, treatment, or emergency medical care.',
  },
}

const modality = {
  homeopathy: {
    ru: {
      title: 'ГОМЕОПАТИЧЕСКАЯ РЕКОМЕНДАЦИЯ',
      intro: 'Следующие гомеопатические рекомендации предоставлены на индивидуальной консультации:',
    },
    en: {
      title: 'HOMEOPATHIC RECOMMENDATION',
      intro: 'The following homeopathic recommendations were provided during the individual consultation:',
    },
  },
  bach: {
    ru: {
      title: 'РЕКОМЕНДАЦИЯ ПО ЭССЕНЦИЯМ БАХА',
      intro: 'Следующие рекомендации по эссенциям Баха предоставлены на индивидуальной консультации:',
    },
    en: {
      title: 'BACH FLOWER ESSENCE RECOMMENDATION',
      intro: 'The following Bach flower essence recommendations were provided during the individual consultation:',
    },
  },
  mixed: {
    ru: {
      title: 'КОМПЛЕКСНАЯ РЕКОМЕНДАЦИЯ',
      intro: 'Следующие рекомендации по гомеопатии и эссенциям Баха предоставлены на индивидуальной консультации:',
    },
    en: {
      title: 'INTEGRATED RECOMMENDATION',
      intro: 'The following Homeopathy and Bach flower essence recommendations were provided during the individual consultation:',
    },
  },
}

export function normalizeRecommendationType(value) {
  if (value === 'bach' || value === 'mixed') return value
  return 'homeopathy'
}

export function recommendationCopy(locale = 'en', recommendationType = 'homeopathy') {
  const language = locale === 'ru' ? 'ru' : 'en'
  const type = normalizeRecommendationType(recommendationType)
  return { ...shared[language], ...modality[type][language] }
}

function russianTimes(value) {
  const count = Number(value)
  if (count === 1) return '1 раз'
  if (count >= 2 && count <= 4) return `${value} раза`
  return `${value} раз`
}

function sameValue(items, key) {
  const values = (items ?? []).map((item) => String(item?.[key] ?? '').trim())
  if (!values.length || values.some((value) => !value) || new Set(values).size !== 1) return undefined
  return values[0]
}

function russianGranules(value) {
  const count = Number(value)
  const word = count % 10 === 1 && count % 100 !== 11 ? 'гранула'
    : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'гранулы'
      : 'гранул'
  return `${value} ${word}`
}

export function recommendationItemType(item, recommendationType = 'homeopathy') {
  if (item?.itemType === 'bach' || item?.itemType === 'homeopathy') return item.itemType
  return normalizeRecommendationType(recommendationType) === 'bach' ? 'bach' : 'homeopathy'
}

function homeopathyGuidance(items, language) {
  const granules = sameValue(items, 'granules')
  const timesPerDay = sameValue(items, 'timesPerDay')
  if (language === 'ru') {
    return [
      granules ? `${russianGranules(granules)} препарата.` : 'Дозировка указана рядом с каждым препаратом.',
      timesPerDay ? `${russianTimes(timesPerDay)} в день и дополнительно в момент стресса.` : 'Частота приёма указана рядом с каждым препаратом; дополнительно — в момент стресса.',
    ]
  }
  return [
    granules ? `${granules} ${Number(granules) === 1 ? 'granule' : 'granules'} of the remedy.` : 'Use the dose shown next to each remedy.',
    timesPerDay ? `${timesPerDay} times a day and additionally during moments of stress.` : 'Use the frequency shown next to each remedy and additionally during moments of stress.',
  ]
}

function bachGuidance(language) {
  return language === 'ru'
    ? [
        'Смесь: добавить по 5 капель каждой выбранной эссенции в небольшое количество воды.',
        'Принимать 2–4 раза в день.',
      ]
    : [
        'Prepare a mixture: add 5 drops of each selected essence to a small amount of water.',
        'Take 2–4 times a day.',
      ]
}

export function recommendationGuidance(document, locale = 'en') {
  if (!document?.recommendationType) return undefined
  const language = locale === 'ru' ? 'ru' : 'en'
  const type = normalizeRecommendationType(document.recommendationType)
  const homeopathyItems = (document.items ?? []).filter((item) => recommendationItemType(item, type) === 'homeopathy')
  const bachItems = (document.items ?? []).filter((item) => recommendationItemType(item, type) === 'bach')
  const sections = []

  if (homeopathyItems.length) {
    sections.push({
      type: 'homeopathy',
      title: type === 'mixed' ? (language === 'ru' ? 'Гомеопатия' : 'Homeopathy') : undefined,
      bullets: homeopathyGuidance(homeopathyItems, language),
    })
  }
  if (bachItems.length) {
    sections.push({
      type: 'bach',
      title: type === 'mixed' ? (language === 'ru' ? 'Эссенции Баха' : 'Bach essences') : undefined,
      bullets: bachGuidance(language),
    })
  }

  return language === 'ru'
    ? {
        takeTitle: 'ПРИНИМАТЬ',
        sections,
        course: 'Курс: 2 недели.',
        recheck: 'Повторная проверка — через 1–2 недели.',
        contact: 'Мне можно написать по готовности — я проверю состояние и дам анализ, рекомендации или при необходимости скорректирую назначение.',
      }
    : {
        takeTitle: 'HOW TO TAKE',
        sections,
        course: 'Course: 2 weeks.',
        recheck: 'Follow-up check: in 1–2 weeks.',
        contact: 'When you are ready, message me. I will review your current state and provide an analysis, recommendations, or adjust the recommendation if needed.',
      }
}

export function remedySchedule(item, locale = 'en', recommendationType = 'homeopathy') {
  if (recommendationItemType(item, recommendationType) === 'bach') return ''
  const potency = String(item?.potency ?? '').trim()
  const granules = String(item?.granules ?? '').trim()
  const timesPerDay = String(item?.timesPerDay ?? '').trim()
  const parts = []
  if (potency) parts.push(locale === 'ru' ? `потенция ${potency}` : `potency ${potency}`)
  if (granules) {
    const count = Number(granules)
    if (locale === 'ru') {
      const word = count % 10 === 1 && count % 100 !== 11 ? 'гранула'
        : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'гранулы'
          : 'гранул'
      parts.push(`${granules} ${word}`)
    } else {
      parts.push(`${granules} ${Number(granules) === 1 ? 'granule' : 'granules'}`)
    }
  }
  if (timesPerDay) parts.push(locale === 'ru' ? `${timesPerDay}×/день` : `${timesPerDay}×/day`)
  return parts.join(' · ')
}

const copy = {
  ru: { title: 'ГОМЕОПАТИЧЕСКАЯ РЕКОМЕНДАЦИЯ', patient: 'Клиент', date: 'Дата', number: 'Рекомендация №', purpose: 'Цель', dosage: 'Как принимать', frequency: 'Частота', duration: 'Длительность', sequence: 'Этап', instructions: 'Индивидуальные инструкции', general: 'ОБЩИЕ РЕКОМЕНДАЦИИ', followUp: 'Следующая консультация', intro: 'Следующие гомеопатические рекомендации предоставлены на индивидуальной консультации:', disclaimer: 'Материал носит информационный характер и не заменяет медицинскую диагностику, лечение или неотложную медицинскую помощь.' },
  en: { title: 'HOMEOPATHIC RECOMMENDATION', patient: 'Client', date: 'Date', number: 'Recommendation No.', purpose: 'Purpose', dosage: 'How to take', frequency: 'Frequency', duration: 'Duration', sequence: 'Stage', instructions: 'Instructions', general: 'GENERAL RECOMMENDATIONS', followUp: 'Follow-up', intro: 'The following homeopathic recommendations were provided during the individual consultation:', disclaimer: 'This document is provided for informational purposes and is not a substitute for medical diagnosis, treatment, or emergency medical care.' },
}

export function recommendationCopy(locale = 'en') { return copy[locale] ?? copy.en }


export function remedySchedule(item, locale = 'en') {
  const granules = String(item?.granules ?? '').trim()
  const timesPerDay = String(item?.timesPerDay ?? '').trim()
  const parts = []
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

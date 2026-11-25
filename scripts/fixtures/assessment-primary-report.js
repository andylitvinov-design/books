// Synthetic display-only fixtures, not assessment definitions or clinical data.
// Fixed expectations are independent of the ranking implementation under test.
// null deliberately omits direction; it must not imply a low-resource score.
export const PRIMARY_REPORT_POLARITY_CASES = [
  { name: 'resource', direction: 'resource', expectedA: 1, expectedB: 2 },
  { name: 'difficulty', direction: 'difficulty', expectedA: 0, expectedB: 1 },
  { name: 'neutral', direction: 'neutral', expectedA: 0, expectedB: 0 },
  { name: 'missing', direction: null, expectedA: 0, expectedB: 0 },
]

export function primaryReportFixtureProps(id, locale = 'en', guest = false, review = false, direction = 'resource') {
  const ru = locale === 'ru'
  const values = id === 'B' ? [6, 8, 1] : [8, 2, 6]
  const sections = values.map((value, i) => ({
    key: 'scale-' + i,
    construct: (ru ? 'Шкала ' : 'Scale ') + (i + 1),
    value, min: 0, max: 10,
    ...(direction === null ? {} : { presentationDirection: direction }),
    bandBasis: 'descriptive',
    band: ru ? 'Описательная шкала' : 'Descriptive scale',
    summary: (ru ? 'Краткое объяснение ' : 'Short explanation ') + i,
    meaning: (ru ? 'Полное исходное объяснение ' : 'Full original explanation ') + i,
    primarySupport: (ru ? 'Можно спокойно отметить один полезный пример ' : 'Consider one helpful example ') + i,
    steps: [
      (ru ? 'Исходное наблюдение с баллом ' : 'Original score-linked observation ') + value,
      (ru ? 'Можно спокойно отметить один полезный пример ' : 'Consider one helpful example ') + i,
      (ru ? 'Дополнительный исходный шаг ' : 'Additional original step ') + i,
    ],
    followUp: (ru ? 'Обсудите беспокоящие симптомы со специалистом ' : 'Discuss concerning symptoms with a professional ') + i,
    source: 'https://example.invalid/' + id + '/' + locale + '/scale-' + i,
    recommendedReview: review && i === 0,
  }))
  return {
    locale,
    result: {
      ...(guest ? {} : { id }),
      definitionKey: 'synthetic-local-fixture',
      dimensions: sections.map(({ key, value, min, max }) => ({ key, value, min, max })),
    },
    report: {
      verified: true, sections, rulesVersion: 'synthetic-acceptance-only',
      methodology: ru ? 'Методика синтетической проверки' : 'Synthetic acceptance methodology',
      seekSupport: sections[0].followUp,
      purpose: ru ? 'Синтетические данные' : 'Synthetic data',
      note: ru ? 'Не клинические данные' : 'No clinical data',
    },
  }
}

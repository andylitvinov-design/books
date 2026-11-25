// Arithmetic position within stated score bounds, not psychometric categories.
// Only reviewed callers may use this prose; it does not establish provenance,
// response validity, clinical severity, population norms or equal likelihood.
export function descriptiveScorePosition(dimension, locale = 'en', kind = 'trait-mean') {
  const { value, min, max } = dimension || {}
  if (![value, min, max].every(Number.isFinite) || min >= max || value < min || value > max ||
      !['trait-mean', 'trait-sum', 'weighted-theme'].includes(kind)) return null
  const midpoint = (min + max) / 2
  const position = value === min ? 'minimum' : value === max ? 'maximum' : value === midpoint ? 'midpoint' : value < midpoint ? 'below-midpoint' : 'above-midpoint'
  const ru = locale === 'ru', middle = Number(midpoint.toFixed(2)).toString()
  const locations = ru ? {
    minimum: 'Результат на нижней границе указанной шкалы.',
    maximum: 'Результат на верхней границе указанной шкалы.',
    midpoint: `Результат совпадает с числовой серединой указанной шкалы (${middle}).`,
    'below-midpoint': `Результат ниже числовой середины указанной шкалы (${middle}).`,
    'above-midpoint': `Результат выше числовой середины указанной шкалы (${middle}).`,
  } : {
    minimum: 'The score is at the lower endpoint of the stated scale.',
    maximum: 'The score is at the upper endpoint of the stated scale.',
    midpoint: `The score is at the numerical midpoint of the stated scale (${middle}).`,
    'below-midpoint': `The score is below the numerical midpoint of the stated scale (${middle}).`,
    'above-midpoint': `The score is above the numerical midpoint of the stated scale (${middle}).`,
  }
  let reading
  if (kind === 'weighted-theme') reading = value === min
    ? ru ? 'Нулевой вес означает, что в этом прохождении утверждения этой темы не были отмечены; это не доказательство отсутствия переживания.' : 'Zero weight means no statements for this theme were endorsed in this run; it does not prove the experience is absent.'
    : ru ? 'Положение относится только к возможному весу совпадений этой темы. Веса разделов и бонусы ключа не позволяют читать его как долю симптомов или средний ответ; максимумы разных тем могут отличаться.' : 'This position concerns only the possible weighted match for this theme. Section weights and scoring bonuses mean it is not a symptom proportion or an average response; different themes can have different maxima.'
  else if (kind === 'trait-sum') reading = ru
    ? 'Сумма после применения ключа отражает большее или меньшее согласие с утверждениями об указанной склонности. Низкий балл не доказывает противоположную черту; несколько склонностей могут отмечаться одновременно. Одинаковая сумма может складываться из разных ответов.'
    : 'The keyed total reflects more or fewer endorsements of the stated tendency. A low score does not establish an opposite trait; several tendencies can be endorsed together. Different response patterns can produce the same total.'
  else reading = value === midpoint
    ? ru ? 'Средний балл может получиться как из нейтральных, так и из различающихся ответов на два пункта; он не означает «сбалансированную личность».' : 'The mean can arise from neutral responses or from differing responses to the two items; it does not establish a “balanced personality”.'
    : value < midpoint
      ? ru ? 'После применения ключа среднее ближе к полюсу черты, соответствующему меньшим баллам. Два ответа могут различаться.' : 'After applying the key, the mean leans toward the lower-scoring description of this trait rather than the higher-scoring description. The two responses can differ.'
      : ru ? 'После применения ключа среднее ближе к полюсу черты, соответствующему большим баллам. Два ответа могут различаться; эта оценка не описывает все ситуации.' : 'After applying the key, the mean leans toward the higher-scoring description of this trait. The two responses can differ; this estimate does not describe every setting.'
  const limit = ru
    ? 'Это арифметическое положение, а не процентиль, популяционная норма или клиническая категория; середина не является валидированным порогом.'
    : 'This is arithmetic position, not a percentile, population norm or clinical category; the midpoint is not a validated cutoff.'
  return { position, midpoint, text: `${locations[position]} ${reading} ${limit}` }
}

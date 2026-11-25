// Describe the observed difference between two verified, comparable scores.
// Changes in self-report are not automatically reliable, clinically important,
// causal, or a demonstrated treatment outcome. Never manufacture SEM/SDC/RCI.
const COPY = Object.freeze({
  ru: {
    baseline: 'Нет сопоставимого предыдущего замера',
    unchanged: 'Числовой балл совпадает',
    lessDifficulty: 'Меньше отмеченных трудностей по шкале',
    moreDifficulty: 'Больше отмеченных трудностей по шкале',
    moreResource: 'Больше отмеченных ресурсов по шкале',
    lessResource: 'Меньше отмеченных ресурсов по шкале',
    up: 'Балл стал выше',
    down: 'Балл стал ниже',
    unchangedDetail: 'Совпадение балла не означает, что все ответы и обстоятельства остались прежними.',
    baselineDetail: 'Нет двух подтверждённых совместимых прохождений. Изменение нельзя вычислить.',
    changeDetail: 'Это арифметическая разница двух самоотчётов. Без данных об ошибке измерения и значимом изменении нельзя считать её доказанным психологическим улучшением или ухудшением.',
  },
  en: {
    baseline: 'No comparable earlier measurement',
    unchanged: 'Same numeric score',
    lessDifficulty: 'Fewer difficulties reported on this scale',
    moreDifficulty: 'More difficulties reported on this scale',
    moreResource: 'More resources endorsed on this scale',
    lessResource: 'Fewer resources endorsed on this scale',
    up: 'Score is higher',
    down: 'Score is lower',
    unchangedDetail: 'An identical score does not establish that every individual response or circumstance was unchanged.',
    baselineDetail: 'There are not two verified comparable measurements. No change can be calculated.',
    changeDetail: 'This is an arithmetic difference between two self-reports. Without measurement-error and meaningful-change evidence, it cannot establish psychological improvement or deterioration.',
  },
})
export function scoreChangeReading(change, dimension, locale = 'en', verifiedOrientation = 'neutral') {
  const copy = COPY[locale === 'ru' ? 'ru' : 'en']
  if (change?.state === 'baseline' || !Number.isFinite(change?.delta)) return Object.freeze({
    label: copy.baseline, detail: copy.baselineDetail, icon: '—', comparable: false,
  })
  if (change.delta === 0 || change.state === 'unchanged') return Object.freeze({
    label: copy.unchanged, detail: copy.unchangedDetail, icon: '—', comparable: true,
  })
  const direction = typeof dimension?.direction === 'string' ? dimension.direction : ''
  const trait = dimension?.dimensionClass === 'trait' || direction === 'non-normative'
  // Trust only the current provenance-gated gauge interpretation. Legacy HH
  // scales that combine opposing item directions must remain neutral even when
  // a saved dimension's metadata calls the direction resource/difficulty.
  const difficulty = !trait && verifiedOrientation === 'difficulty' && direction.startsWith('lower-reported-')
  const resource = !trait && verifiedOrientation === 'resource' && direction.startsWith('higher-reported-')
  const label = difficulty ? (change.delta < 0 ? copy.lessDifficulty : copy.moreDifficulty)
    : resource ? (change.delta > 0 ? copy.moreResource : copy.lessResource)
      : (change.delta > 0 ? copy.up : copy.down)
  return Object.freeze({
    label, detail: copy.changeDetail, icon: change.delta > 0 ? '↑' : '↓',
    comparable: true,
  })
}

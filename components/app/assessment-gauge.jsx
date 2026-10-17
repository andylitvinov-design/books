import { gaugeChange, gaugeModel } from '@/lib/assessments/dashboard-gauges'
import styles from './assessment-gauge.module.css'

const publishedColors = ['#a84842', '#b66c43', '#8c793d', '#477f69', '#2f6c5e']
const continuousColor = '#728881'
const answerColors = ['#b78363', '#c7a66b', '#b1ae72', '#729a87', '#397f69']
// An unclassified trait stays neutral; published categorical bands may be
// visually distinct without assigning a healthy/unhealthy meaning.
const categoricalColors = ['#518c94', '#70a89a', '#cfad67', '#aa8aa7', '#c98975']

function continuousGradientId(dimension, result) {
  const key = [result?.id, dimension?.key, dimension?.sourceResultId].filter(Boolean).join(':') || 'preview'
  let hash = 2166136261
  for (let index = 0; index < key.length; index += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(index), 16777619)
  }
  return 'hh-assessment-gradient-' + (hash >>> 0).toString(36)
}

function coordinate(angle, radius = 78) {
  return { x: 100 + radius * Math.cos(angle), y: 98 - radius * Math.sin(angle) }
}

const numeral = (value, locale) =>
  new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 2 }).format(value)

function bandColor(band, index, model) {
  // Color only distinguishes source-defined intervals. Neutral measures have
  // no good/bad color progression, and continuous scores have no sectors.
  if (model.orientation === 'neutral' && model.bands.length) {
    return categoricalColors[Math.round(index * (categoricalColors.length - 1) / Math.max(1, model.bands.length - 1))]
  }
  if (model.orientation === 'neutral' || model.orientation === 'screening') return continuousColor
  const position = model.orientation === 'difficulty' ? model.bands.length - index - 1 : index
  return publishedColors[Math.round(position * (publishedColors.length - 1) / Math.max(1, model.bands.length - 1))]
}

function BandLegend({ model, locale }) {
  const ru = locale === 'ru'
  if (!model.bands.length) return null
  return <ol className={styles.legend} aria-label={ru ? 'Диапазоны шкалы' : 'Scale intervals'}>
    {model.bands.map((band, index) => {
      const current = band.code === model.currentBand?.code
      return <li key={band.code} data-current-band={current || undefined} aria-current={current ? 'true' : undefined}>
        <span className={styles.swatch} style={{ backgroundColor: bandColor(band, index, model) }} aria-hidden="true" />
        <span><strong>{numeral(band.from, locale)}–{numeral(band.to, locale)}</strong> {band.label}
          {current && <span className={styles.current}>{ru ? ' · Ваш диапазон' : ' · Your range'}</span>}</span>
      </li>
    })}
  </ol>
}

export function ScoreGauge({ dimension, result = null, locale = 'en', compact = false, showLegend = true, showScaleNote = true, showAnswerAnchors = true }) {
  const model = gaugeModel(dimension, result, locale)
  const ru = locale === 'ru'
  if (!model) return <span className={styles.unavailable}>{ru ? 'Нет достоверной числовой шкалы' : 'No verified numeric scale'}</span>
  if (model.displayKind === 'screening-count') return <figure className={styles.gauge + (compact ? ' ' + styles.compact : '')}
    data-assessment-gauge="screening-count">
    <strong className={styles.value}>{numeral(dimension.value, locale)} <span>/ 6</span></strong>
    <figcaption>{model.verified
      ? model.screenPositive
        ? ru ? 'На уровне или выше скринингового порога (4)' : 'At or above screening threshold (4)'
        : ru ? 'Ниже скринингового порога (4)' : 'Below screening threshold (4)'
      : ru ? 'Количество отмеченных ответов' : 'Shaded-response count'}</figcaption>
    {showScaleNote && <small className={styles.scaleNote}>{ru ? 'Скрининг, не диагноз и не шкала тяжести' : 'Screening, not a diagnosis or severity scale'}</small>}
    {showLegend && <BandLegend model={model} locale={locale} />}
  </figure>
  // One continuous color transition is illustrative, not invented diagnosis cutoffs.
  // Neutral/trait scales retain the uncolored dial.
  const hasAnswerBands = showAnswerAnchors && Boolean(model.answerBands?.length)
  const graded = model.continuous && !hasAnswerBands &&
    (model.orientation === 'difficulty' || model.orientation === 'resource')
  const gradientId = continuousGradientId(dimension, result)
  const angle = (1 - model.fraction) * Math.PI
  const tip = coordinate(angle, 65)
  const direction = model.orientation === 'difficulty'
    ? ru ? 'Меньше описанных трудностей →' : 'Fewer reported difficulties →'
    : model.orientation === 'resource'
      ? ru ? 'Больше описанных ресурсов →' : 'More reported resources →'
      : ru ? 'Описательная шкала' : 'Descriptive scale'
  const scaleType = model.continuous
    ? ru ? 'Непрерывная шкала' : 'Continuous scale'
    : model.bandBasis === 'screening'
      ? ru ? 'Скрининговые диапазоны' : 'Screening intervals'
      : ru ? 'Справочные диапазоны' : 'Reference intervals'
  const left = model.orientation === 'difficulty' ? dimension.max : dimension.min
  const right = model.orientation === 'difficulty' ? dimension.min : dimension.max
  return <figure className={styles.gauge + (compact ? ' ' + styles.compact : '')}
    data-assessment-gauge={model.orientation} data-gauge-scale={model.continuous ? 'continuous' : 'published-bands'} data-answer-anchor-scale={hasAnswerBands ? 'source-responses' : undefined}
    aria-label={(ru ? 'Баллы: ' : 'Score: ') + numeral(dimension.value, locale) +
      '. ' + (ru ? 'Диапазон ' : 'Range ') + numeral(dimension.min, locale) + '–' + numeral(dimension.max, locale) +
      '. ' + scaleType + '. ' + (hasAnswerBands ? model.currentAnswerBand?.label : model.currentBand?.label || direction)}>
    <svg viewBox="0 0 200 112" aria-hidden="true" focusable="false">
      {graded && <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c4645d" />
          <stop offset="25%" stopColor="#df965f" />
          <stop offset="50%" stopColor="#ddbe75" />
          <stop offset="75%" stopColor="#94b888" />
          <stop offset="100%" stopColor="#368772" />
        </linearGradient>
      </defs>}
      <path d="M 22 98 A 78 78 0 0 1 178 98" fill="none"
        stroke={graded ? `url(#${gradientId})` : model.continuous ? continuousColor : '#e7e3dc'}
        strokeWidth="14" strokeLinecap="round"/>
      {model.bands.map((band, index) => {
        const from = coordinate(Math.PI * (1 - band.startFraction))
        const to = coordinate(Math.PI * (1 - band.endFraction))
        return <path key={band.code} data-band-code={band.code}
          d={'M ' + from.x + ' ' + from.y + ' A 78 78 0 0 1 ' + to.x + ' ' + to.y}
          fill="none" stroke={bandColor(band, index, model)}
          strokeWidth={band.current ? '16' : '12'} strokeLinecap="butt" />
      })}
      {hasAnswerBands && model.answerBands?.map((band, index) => {
        const from = coordinate(Math.PI * (1 - band.startFraction))
        const to = coordinate(Math.PI * (1 - band.endFraction))
        return <path key={band.code} data-answer-anchor={band.code}
          d={'M ' + from.x + ' ' + from.y + ' A 78 78 0 0 1 ' + to.x + ' ' + to.y}
          fill="none" stroke={answerColors[Math.min(index, answerColors.length - 1)]}
          strokeWidth={band.current ? '16' : '12'} strokeLinecap="butt" />
      })}
      <line x1="100" y1="98" x2={tip.x} y2={tip.y} stroke="#394b45" strokeWidth="3.4" strokeLinecap="round"/>
      <circle cx="100" cy="98" r="6" fill="#394b45"/>
      <circle cx="100" cy="98" r="2" fill="#fffcf6"/>
    </svg>
    <strong className={styles.value}>{numeral(dimension.value, locale)} <span>/ {numeral(dimension.max, locale)}</span></strong>
    <div className={styles.endpoints} aria-hidden="true"><span>{numeral(left, locale)}</span><span>{numeral(right, locale)}</span></div>
    <figcaption>{hasAnswerBands
      ? (ru ? 'Ближе к ответу: ' : 'Closest answer: ') + model.currentAnswerBand?.label
      : scaleType}</figcaption>
    {showScaleNote && <small className={styles.scaleNote}>{hasAnswerBands
      ? ru ? 'Ответы анкеты, не клиническая категория' : 'Questionnaire responses, not a clinical category'
      : model.continuous
        ? ru ? 'Без подтверждённых границ категорий' : 'No validated category cutoffs'
        : direction}</small>}
    {showLegend && <BandLegend model={model} locale={locale} />}
  </figure>
}

export function ScoreTrend({ current, previous, dimensionKey, locale = 'en', compact = false }) {
  const change = gaugeChange(current, previous, dimensionKey)
  const ru = locale === 'ru'
  const labels = {
    baseline: ru ? 'Первый замер' : 'First measurement',
    unchanged: ru ? 'Без изменений' : 'No change',
    improved: ru ? 'Лучше по этой шкале' : 'Better on this scale',
    worsened: ru ? 'Хуже по этой шкале' : 'Worse on this scale',
    changed: ru ? 'Изменение показателя' : 'Score changed',
  }
  const icon = change.state === 'improved' ? '↗' : change.state === 'worsened' ? '↘' : change.state === 'changed' ? '↔' : '—'
  return <span className={styles.trend + ' ' + styles[change.state]} data-gauge-trend={change.state}
    aria-label={labels[change.state]}>
    <span aria-hidden="true">{icon}</span>
    <span>{labels[change.state]}{change.delta !== null && change.delta !== 0 && !compact
      ? ' (' + (change.delta > 0 ? '+' : '') + numeral(change.delta, locale) + ')' : ''}</span>
  </span>
}

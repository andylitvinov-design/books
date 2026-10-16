import { gaugeChange, gaugeModel } from '@/lib/assessments/dashboard-gauges'
import styles from './assessment-gauge.module.css'

const publishedColors = ['#a84842', '#b66c43', '#8c793d', '#477f69', '#2f6c5e']
const continuousColor = '#728881'

function coordinate(angle, radius = 78) {
  return { x: 100 + radius * Math.cos(angle), y: 98 - radius * Math.sin(angle) }
}

const numeral = (value, locale) =>
  new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 2 }).format(value)

function bandColor(band, index, model) {
  // Color only distinguishes source-defined intervals. Neutral measures have
  // no good/bad color progression, and continuous scores have no sectors.
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

export function ScoreGauge({ dimension, result = null, locale = 'en', compact = false }) {
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
    <small className={styles.scaleNote}>{ru ? 'Скрининг, не диагноз и не шкала тяжести' : 'Screening, not a diagnosis or severity scale'}</small>
    <BandLegend model={model} locale={locale} />
  </figure>
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
    data-assessment-gauge={model.orientation} data-gauge-scale={model.continuous ? 'continuous' : 'published-bands'}
    aria-label={(ru ? 'Баллы: ' : 'Score: ') + numeral(dimension.value, locale) +
      '. ' + (ru ? 'Диапазон ' : 'Range ') + numeral(dimension.min, locale) + '–' + numeral(dimension.max, locale) +
      '. ' + scaleType + '. ' + (model.currentBand?.label || direction)}>
    <svg viewBox="0 0 200 112" aria-hidden="true" focusable="false">
      <path d="M 22 98 A 78 78 0 0 1 178 98" fill="none" stroke={model.continuous ? continuousColor : '#e7e3dc'} strokeWidth="14" strokeLinecap="round"/>
      {model.bands.map((band, index) => {
        const from = coordinate(Math.PI * (1 - band.startFraction))
        const to = coordinate(Math.PI * (1 - band.endFraction))
        return <path key={band.code} data-band-code={band.code}
          d={'M ' + from.x + ' ' + from.y + ' A 78 78 0 0 1 ' + to.x + ' ' + to.y}
          fill="none" stroke={bandColor(band, index, model)}
          strokeWidth={band.current ? '16' : '12'} strokeLinecap="butt" />
      })}
      <line x1="100" y1="98" x2={tip.x} y2={tip.y} stroke="#394b45" strokeWidth="3.4" strokeLinecap="round"/>
      <circle cx="100" cy="98" r="6" fill="#394b45"/>
      <circle cx="100" cy="98" r="2" fill="#fffcf6"/>
    </svg>
    <strong className={styles.value}>{numeral(dimension.value, locale)} <span>/ {numeral(dimension.max, locale)}</span></strong>
    <div className={styles.endpoints} aria-hidden="true"><span>{numeral(left, locale)}</span><span>{numeral(right, locale)}</span></div>
    <figcaption>{scaleType}</figcaption>
    <small className={styles.scaleNote}>{model.continuous
      ? ru ? 'Без подтверждённых границ категорий' : 'No validated category cutoffs'
      : direction}</small>
    <BandLegend model={model} locale={locale} />
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

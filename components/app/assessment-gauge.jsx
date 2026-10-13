import { gaugeChange, gaugeModel } from '@/lib/assessments/dashboard-gauges'
import styles from './assessment-gauge.module.css'

const favorable = ['#cb6158','#d67d63','#dfa36c','#e1bd79','#d1c888','#a6c09c','#76b29b','#458f82']
const neutral = ['#b9b8b3','#afb7b3','#a6b5ae','#95aaa6','#8fa6a0','#809d9b','#72908c','#63847f']

function coordinate(angle, radius = 78) {
  return { x: 100 + radius * Math.cos(angle), y: 98 - radius * Math.sin(angle) }
}

const numeral = (value, locale) =>
  new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 2 }).format(value)

export function ScoreGauge({ dimension, locale = 'en', compact = false }) {
  const model = gaugeModel(dimension)
  const ru = locale === 'ru'
  if (!model) return <span className={styles.unavailable}>{ru ? 'Нет числовой шкалы' : 'No numeric scale'}</span>
  const colors = model.orientation === 'neutral' ? neutral : favorable
  const angle = (1 - model.fraction) * Math.PI
  const tip = coordinate(angle, 65)
  const label = model.orientation === 'difficulty'
    ? ru ? 'Меньше трудностей →' : 'Fewer difficulties →'
    : model.orientation === 'resource'
      ? ru ? 'Больше ресурсов →' : 'More resources →'
      : ru ? 'Описательная шкала' : 'Descriptive scale'
  return <figure className={styles.gauge + (compact ? ' ' + styles.compact : '')}
    data-assessment-gauge={model.orientation}
    aria-label={(ru ? 'Шкала: ' : 'Scale: ') + numeral(dimension.value, locale) + ' / ' + numeral(dimension.max, locale) + '. ' + label}>
    <svg viewBox="0 0 200 112" aria-hidden="true" focusable="false">
      <path d="M 22 98 A 78 78 0 0 1 178 98" fill="none" stroke="#e7e3dc" strokeWidth="14" strokeLinecap="round"/>
      {Array.from({ length: 24 }, (_, index) => {
        const from = coordinate(Math.PI * (1 - index / 24))
        const to = coordinate(Math.PI * (1 - (index + 1) / 24))
        return <path key={index}
          d={'M ' + from.x + ' ' + from.y + ' A 78 78 0 0 1 ' + to.x + ' ' + to.y}
          fill="none" stroke={colors[Math.min(7, Math.floor(index / 3))]}
          strokeWidth="12" strokeLinecap="butt" />
      })}
      <line x1="100" y1="98" x2={tip.x} y2={tip.y} stroke="#394b45" strokeWidth="3.4" strokeLinecap="round"/>
      <circle cx="100" cy="98" r="6" fill="#394b45"/>
      <circle cx="100" cy="98" r="2" fill="#fffcf6"/>
    </svg>
    <strong className={styles.value}>{numeral(dimension.value, locale)} <span>/ {numeral(dimension.max, locale)}</span></strong>
    <figcaption>{label}</figcaption>
  </figure>
}

export function ScoreTrend({ current, previous, dimensionKey, locale = 'en', compact = false, descriptive = false }) {
  const change = gaugeChange(current, previous, dimensionKey)
  if (descriptive && ['improved','worsened'].includes(change.state)) change.state = 'changed'
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

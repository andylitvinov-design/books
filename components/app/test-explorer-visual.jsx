'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { TEST_EXPLORER_AXES, TEST_EXPLORER_AXIS_LABELS } from '@/lib/assessments/test-explorer'
import styles from './test-explorer.module.css'

const PRIMARY_AXES = TEST_EXPLORER_AXES.slice(0, 10)
const SECONDARY_AXES = TEST_EXPLORER_AXES.slice(10)
// A personality trait is descriptive and must never be presented as an ideal-to-reach ray.
const PORTRAIT_AXES = TEST_EXPLORER_AXES.filter((axis) => axis !== 'personality')

export function TestExplorerVisual({ locale, coverage, mode = 'topics', topicCount = 0, selectedCount = 0, axisFilter, onAxisFilter, portrait = null, compact = false }) {
  const [variant, setVariant] = useState('male')
  // Null means the latest measured axes; [] is an intentional empty selection.
  const [chosenRays, setChosenRays] = useState(null)
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const drag = useRef(null)
  const ru = locale === 'ru', es = locale === 'es'
  const spanishAxes = {"stress":"Estrés","anxiety":"Ansiedad","mood":"Estado de ánimo","sleep":"Sueño","energy":"Energía","clarity":"Claridad","focus":"Concentración","emotional_regulation":"Regulación emocional","relationships":"Relaciones","resource":"Recursos y resiliencia","self_support":"Apoyo interior","functioning":"Vida cotidiana","personality":"Personalidad","meaning":"Sentido y dirección"}
  const label = (axis) => (es ? spanishAxes[axis] : null) || TEST_EXPLORER_AXIS_LABELS[axis]?.[locale] || TEST_EXPLORER_AXIS_LABELS[axis]?.en || axis
  const measuredAxes = portrait ? PORTRAIT_AXES.filter((axis) => portrait.axes?.[axis] != null) : []
  const suggestedRays = portrait ? [...measuredAxes, ...PORTRAIT_AXES.filter((axis) => !measuredAxes.includes(axis))].slice(0, 8) : []
  const visibleRays = (chosenRays === null ? suggestedRays : chosenRays.filter((axis) => PORTRAIT_AXES.includes(axis))).slice(0, 10).sort((a, b) => PORTRAIT_AXES.indexOf(a) - PORTRAIT_AXES.indexOf(b))
  const rays = visibleRays.map((axis, index) => {
    // Stable positions: selecting another ray must never rotate the remaining axes.
    const angle = (-Math.PI / 2) + PORTRAIT_AXES.indexOf(axis) * (Math.PI * 2 / PORTRAIT_AXES.length)
    const measure = portrait?.axes?.[axis] || null
    const percent = measure?.percent ?? null
    const project = (r) => ({ x: 180 + Math.cos(angle) * r, y: 182 + Math.sin(angle) * r })
    return { axis, percent, end: percent === null ? null : project(12 + (percent / 100) * 119), previousEnd: measure?.previousPercent === null || measure?.previousPercent === undefined ? null : project(12 + (measure.previousPercent / 100) * 119), ideal: project(131) }
  })
  const polygon = (kind) => rays.map((ray) => `${ray[kind].x},${ray[kind].y}`).join(' ')
  const formatDate = (value) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat(ru ? 'ru-RU' : es ? 'es-ES' : 'en-CA', { dateStyle: 'medium' }).format(new Date(value)) : ''
  const toggleRay = (axis) => setChosenRays((current) => {
    const selected = current === null ? suggestedRays : current
    return selected.includes(axis) ? selected.filter((key) => key !== axis) : selected.length >= 10 ? selected : [...selected, axis]
  })
  const activeAxes = TEST_EXPLORER_AXES.filter((axis) => (coverage.axes[axis]?.coverage || 0) > 0).sort((a, b) => coverage.axes[b].coverage - coverage.axes[a].coverage)
  const update = (next) => setRotation({ x: Math.max(-8, Math.min(8, next.x)), y: Math.max(-22, Math.min(22, next.y)) })
  const onKeyDown = (event) => {
    const step = { ArrowLeft: { y: -4 }, ArrowRight: { y: 4 }, ArrowUp: { x: -2 }, ArrowDown: { x: 2 } }[event.key]
    if (!step || portrait) return
    event.preventDefault()
    update({ x: rotation.x + (step.x || 0), y: rotation.y + (step.y || 0) })
  }
  const start = (event) => {
    if (portrait || compact || event.target.closest?.('button')) return
    drag.current = { x: event.clientX, y: event.clientY, rotation }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const move = (event) => {
    if (!drag.current) return
    update({ x: drag.current.rotation.x + (event.clientY - drag.current.y) / 14, y: drag.current.rotation.y + (event.clientX - drag.current.x) / 6 })
  }

  return <section className={`${styles.visual} ${compact ? styles.visualCompact : ''}`} aria-label={ru ? 'Оси анализа' : es ? 'Ejes de análisis' : 'Analysis axes'}>
    <header className={styles.visualHeader}>
      <div><p className={styles.eyebrow}>{portrait ? (ru ? 'Ваши измерения' : es ? 'Tus mediciones' : 'Your measurements') : (ru ? 'Оси анализа' : es ? 'Ejes de análisis' : 'Analysis axes')}</p><h2>{portrait ? (ru ? 'Мой психологический портрет' : es ? 'Mi retrato psicológico' : 'My psychological portrait') : mode === 'selected' ? (ru ? 'Покрытие вашей батареи' : es ? 'Cobertura de tus pruebas' : 'Coverage of your test set') : (ru ? 'Темы для исследования' : es ? 'Áreas de interés' : 'Your areas of interest')}</h2></div>
      {!portrait && !compact && <div className={styles.variantToggle} role="group" aria-label={ru ? 'Вариант модели' : es ? 'Modelo' : 'Model variant'}>
        {['female', 'male'].map((key) => <button type="button" key={key} aria-pressed={variant === key} onClick={() => setVariant(key)}>{key === 'female' ? (ru ? 'Женская' : es ? 'Femenino' : 'Female') : (ru ? 'Мужская' : es ? 'Masculino' : 'Male')}</button>)}
      </div>}
    </header>
    {!compact && <div className={styles.visualState} role="status" aria-live="polite">
      <strong>{portrait ? (ru ? `${portrait.measuredCount} измеренных шкал` : es ? `${portrait.measuredCount} escalas medidas` : `${portrait.measuredCount} measured scales`) : mode === 'selected'
        ? (ru ? `${selectedCount} тестов · ${coverage.coveredCount} осей покрыто` : es ? `${selectedCount} pruebas · ${coverage.coveredCount} ejes cubiertos` : `${selectedCount} tests · ${coverage.coveredCount} axes covered`)
        : (ru ? `${topicCount} тем · ${coverage.coveredCount} связанных осей` : es ? `${topicCount} temas · ${coverage.coveredCount} ejes relacionados` : `${topicCount} topics · ${coverage.coveredCount} related axes`)}</strong>
      <span>{portrait ? (ru ? 'Лучи строятся только по сохранённым результатам. Более длинный луч — ближе к благоприятному концу соответствующей шкалы; это не диагноз и не норма личности.' : es ? 'Los rayos usan solo resultados guardados. Más largo indica el extremo favorable de la escala, no una norma clínica.' : 'Rays use your saved test results only. Longer means closer to the favorable end of that scale, not a diagnosis or personality norm.') : mode === 'selected'
        ? (ru ? 'Цветные точки показывают оси, которые охватывают отмеченные тесты.' : es ? 'Los puntos muestran los ejes cubiertos por las pruebas elegidas.' : 'Highlighted points show axes covered by the tests you selected.')
        : (ru ? 'Выберите темы слева: соответствующие оси подсветятся. Это предварительный просмотр, не результат.' : es ? 'Elige temas a la izquierda para destacar ejes; es una vista previa, no un resultado.' : 'Choose topics on the left to highlight axes. This is a preview, not a test result.')}</span>
    </div>}
    <div className={styles.modelStage} tabIndex={portrait || compact ? -1 : 0} role={portrait || compact ? 'presentation' : 'application'} aria-label={ru ? 'Поверните модель стрелками или перетаскиванием' : es ? 'Gira el modelo con las flechas o arrastrando' : 'Rotate model with arrow keys or drag'} onKeyDown={onKeyDown} onPointerDown={start} onPointerMove={move} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
      <div className={styles.portraitArt} data-visible={variant === 'male' ? 'true' : 'false'} aria-hidden="true" style={{ transform: `translate3d(${rotation.y * .3}px, ${rotation.x * .3}px, 0)` }}>
        <Image src="/images/holistic-house-test-brain-concept.png" width={1672} height={941} unoptimized alt="" draggable={false} className={styles.portraitSource} />
      </div>
      <svg viewBox="0 0 360 390" className={`${styles.model} ${variant === 'male' ? styles.modelPhoto : ''}`} aria-hidden="true">
        <g style={{ transform: `perspective(700px) rotateY(${rotation.y}deg) rotateX(${-rotation.x}deg)`, transformOrigin: '50% 52%' }}>
          <ellipse cx="180" cy="193" rx="116" ry="154" className={styles.aura} />
          <path className={styles.bust} d={variant === 'female' ? 'M106 365c8-73 36-108 74-112 38 4 66 39 74 112H106Z' : 'M94 365c8-69 38-102 86-108 48 6 78 39 86 108H94Z'} />
          <path className={styles.head} d={variant === 'female' ? 'M126 105c0-57 27-87 54-87s54 30 54 87v79c0 49-24 79-54 79s-54-30-54-79v-79Z' : 'M122 105c0-57 29-87 58-87s58 30 58 87v79c0 49-26 79-58 79s-58-30-58-79v-79Z'} />
          <path className={styles.faceLine} d="M151 126c13 7 45 7 58 0M151 177c18 11 40 11 58 0M161 211c13 8 25 8 38 0" />
          <path className={styles.neural} d="M118 132 154 101l27 37 42-34m-94 79 47-30 52 28m-86 42 39-42 49 40M136 95l44 58 46-57" />
          {!portrait && PRIMARY_AXES.map((axis, index) => {
            const angle = (-145 + index * 32) * Math.PI / 180, x = 180 + Math.cos(angle) * 94, y = 168 + Math.sin(angle) * 115
            return <circle key={axis} cx={x} cy={y} r="7" className={`${styles.node} ${styles[`node${coverage.axes[axis]?.intensity || 'inactive'}`]}`} />
          })}
        </g>
      </svg>
      {portrait && <svg viewBox="0 0 360 390" className={styles.portraitRadar} role="img" aria-label={ru ? 'Измеренные шкалы психологического портрета' : 'Measured psychological portrait axes'}>
        <title>{ru ? 'Лучи психологического портрета по пройденным тестам' : 'Your tested psychological portrait rays'}</title>
        <circle cx="180" cy="182" r="131" className={styles.radarReference} />
        <circle cx="180" cy="182" r="70" className={styles.radarGrid} />
        {rays.map((ray) => <g key={ray.axis}>
          <line x1="180" y1="182" x2={ray.ideal.x} y2={ray.ideal.y} className={styles.radarGuide} />
          {ray.end && <line x1="180" y1="182" x2={ray.end.x} y2={ray.end.y} className={styles.radarRay} />}
          {ray.end && <circle cx={ray.end.x} cy={ray.end.y} r="5.5" className={styles.radarPoint} />}
          {ray.previousEnd && <circle cx={ray.previousEnd.x} cy={ray.previousEnd.y} r="3.8" className={styles.radarPrior} />}
        </g>)}
        {rays.length >= 3 && rays.every((ray) => ray.end) && <polygon points={polygon('end')} className={styles.radarArea} />}
        {rays.length >= 3 && rays.every((ray) => ray.end) && <polygon points={polygon('end')} className={styles.radarOutline} />}
        <circle cx="180" cy="182" r="7" className={styles.radarCenter} />
      </svg>}
      {!portrait && !compact && <div className={styles.axisRing}>
        {PRIMARY_AXES.map((axis) => <button type="button" key={axis} aria-pressed={axisFilter === axis} data-intensity={coverage.axes[axis]?.intensity || 'inactive'} onClick={() => onAxisFilter(axisFilter === axis ? null : axis)}>{label(axis)}</button>)}
      </div>}
    </div>
    {compact && !portrait && <div className={styles.compactAxes} role="status" aria-live="polite">
      <strong>{ru ? 'В фокусе' : es ? 'En foco' : 'Areas in focus'}</strong>
      <div>{activeAxes.length
        ? activeAxes.slice(0, 4).map((axis) => <span key={axis}>{label(axis)}</span>)
        : <span>{ru ? 'Выберите тему слева' : es ? 'Elige un tema' : 'Choose a topic to highlight'}</span>}</div>
    </div>}
    {!portrait && !compact && <div className={styles.secondaryAxes}>{SECONDARY_AXES.map((axis) => <button type="button" key={axis} aria-pressed={axisFilter === axis} data-intensity={coverage.axes[axis]?.intensity || 'inactive'} onClick={() => onAxisFilter(axisFilter === axis ? null : axis)}>{label(axis)}</button>)}</div>}
    {portrait && !compact && <section className={styles.portraitControls} aria-label={ru ? 'Выбор шкал портрета' : 'Choose portrait scales'}>
      <div className={styles.portraitControlsHeading}>
        <strong>{ru ? 'Лучи моего портрета' : es ? 'Escalas de mi retrato' : 'Choose my portrait rays'}</strong>
        <span>{visibleRays.length} / {PORTRAIT_AXES.length}</span>
      </div>
      {measuredAxes.length === 0 && <p>{ru ? 'Измерений пока нет. Выберите шкалы: после прохождения соответствующих тестов пустые лучи заполнятся.' : es ? 'Aún no hay resultados. Selecciona escalas y completa pruebas para ver los rayos.' : 'No results yet. Choose scales now; the empty rays will fill after you complete their tests.'}</p>}
      <div className={styles.portraitRayOptions}>{PORTRAIT_AXES.map((axis) => <label key={axis} className={styles.portraitRayOption} title={portrait?.axes?.[axis] ? `${portrait.axes[axis].source} · ${formatDate(portrait.axes[axis].measuredAt)}` : (ru ? 'Нет измерения' : 'Not measured')}>
          <input type="checkbox" checked={visibleRays.includes(axis)} onChange={() => toggleRay(axis)} disabled={!visibleRays.includes(axis) && visibleRays.length >= 10} />
          <span>{label(axis)}</span>
          <strong>{portrait?.axes?.[axis] ? `${portrait.axes[axis].percent}%` : '—'}</strong>
          {portrait?.axes?.[axis]?.change != null && <small className={styles.portraitDelta} aria-label={ru ? 'Изменение относительно предыдущего совместимого замера' : 'Change from previous compatible measurement'}>{portrait.axes[axis].change > 0 ? '+' : ''}{portrait.axes[axis].change} {ru ? 'п.п.' : 'pp'}</small>}
        </label>)}</div>
      {rays.some((ray) => ray.previousEnd) && <div className={styles.portraitLegend}><span className={styles.legendCurrent}>{ru ? 'Сейчас' : es ? 'Actual' : 'Current'}</span><span className={styles.legendPrior}>{ru ? 'Предыдущий совместимый тест' : es ? 'Medición previa compatible' : 'Previous comparable test'}</span></div>}
      {rays.some((ray) => ray.end) && <details className={styles.portraitSources}>
        <summary>{ru ? 'Данные по лучам: источник, дата и динамика' : es ? 'Fuentes, fechas y evolución' : 'Ray details: source, date and change'}</summary>
        <div>
          {visibleRays.filter((axis) => portrait?.axes?.[axis]).map((axis) => {
            const item = portrait.axes[axis]
            return <div key={axis} className={styles.portraitSourceRow}>
              <strong>{label(axis)} · {item.percent}%</strong>
              <span>{item.source} · {formatDate(item.measuredAt)}</span>
              <span>{item.change === null
                ? (ru ? 'Первый совместимый замер' : 'First comparable measurement')
                : (ru ? 'От предыдущего: ' : 'Since previous: ') + (item.change > 0 ? '+' : '') + item.change + (ru ? ' п.п.' : ' pp')}</span>
              {item.resultId && <Link href={'/' + locale + '/app/results/' + encodeURIComponent(item.resultId)}>{ru ? 'Открыть результат' : 'View result'} →</Link>}
            </div>
          })}
        </div>
      </details>}
      <p>{ru ? 'Процент — положение на шкале с учётом её направления, а не процент здоровья. Личностные черты без направления «лучше/хуже» сюда не включаются.' : es ? 'El porcentaje representa la posición orientada en la escala, no un porcentaje de salud.' : 'Each percentage is a direction-adjusted scale position, not a health score. Non-normative personality traits are excluded.'}</p>
    </section>}
    {!portrait && !compact && activeAxes.length > 0 && <div className={styles.axisMeters} aria-label={ru ? 'Активные оси' : es ? 'Ejes activos' : 'Active axes'}>
      {activeAxes.map((axis) => <div key={axis} className={styles.axisMeter}>
        <span>{label(axis)}</span>
        {mode === 'selected'
          ? <progress max={1} value={coverage.axes[axis].coverage} aria-label={label(axis)} />
          : <span className={styles.axisInterest}>{ru ? 'В фокусе' : es ? 'Enfoque' : 'In focus'}</span>}
      </div>)}
    </div>}
    {!compact && <div className={styles.visualFooter}><button type="button" className={styles.reset} onClick={() => setRotation({ x: 0, y: 0 })}>{ru ? 'Сбросить поворот' : es ? 'Restablecer orientación' : 'Reset rotation'}</button><p>{portrait ? (ru ? 'Внешний круг — конец шкалы, а не универсальный идеал. Данные остаются в вашем личном кабинете.' : es ? 'El círculo exterior es el final de la escala, no un ideal universal.' : 'Outer ring shows the end of the scale, not a universal ideal. Results stay in your private account.') : (ru ? 'Визуальная модель — только способ отображения. Она не меняет расчёт тестов.' : es ? 'El modelo visual es ilustrativo y no cambia la puntuación de las pruebas.' : 'The visual model is display-only and does not change test scoring.')}</p></div>}
  </section>
}

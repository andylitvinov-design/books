'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { TEST_EXPLORER_AXES, TEST_EXPLORER_AXIS_LABELS } from '@/lib/assessments/test-explorer'
import styles from './test-explorer.module.css'

const PRIMARY_AXES = TEST_EXPLORER_AXES.slice(0, 10)
const SECONDARY_AXES = TEST_EXPLORER_AXES.slice(10)

export function TestExplorerVisual({ locale, coverage, mode = 'topics', topicCount = 0, selectedCount = 0, axisFilter, onAxisFilter }) {
  const [variant, setVariant] = useState('male')
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const drag = useRef(null)
  const ru = locale === 'ru', es = locale === 'es'
  const spanishAxes = {"stress":"Estrés","anxiety":"Ansiedad","mood":"Estado de ánimo","sleep":"Sueño","energy":"Energía","clarity":"Claridad","focus":"Concentración","emotional_regulation":"Regulación emocional","relationships":"Relaciones","resource":"Recursos y resiliencia","self_support":"Apoyo interior","functioning":"Vida cotidiana","personality":"Personalidad","meaning":"Sentido y dirección"}
  const label = (axis) => (es ? spanishAxes[axis] : null) || TEST_EXPLORER_AXIS_LABELS[axis]?.[locale] || TEST_EXPLORER_AXIS_LABELS[axis]?.en || axis
  const activeAxes = TEST_EXPLORER_AXES.filter((axis) => (coverage.axes[axis]?.coverage || 0) > 0).sort((a, b) => coverage.axes[b].coverage - coverage.axes[a].coverage)
  const update = (next) => setRotation({ x: Math.max(-8, Math.min(8, next.x)), y: Math.max(-22, Math.min(22, next.y)) })
  const onKeyDown = (event) => {
    const step = { ArrowLeft: { y: -4 }, ArrowRight: { y: 4 }, ArrowUp: { x: -2 }, ArrowDown: { x: 2 } }[event.key]
    if (!step) return
    event.preventDefault()
    update({ x: rotation.x + (step.x || 0), y: rotation.y + (step.y || 0) })
  }
  const start = (event) => {
    if (event.target.closest?.('button')) return
    drag.current = { x: event.clientX, y: event.clientY, rotation }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const move = (event) => {
    if (!drag.current) return
    update({ x: drag.current.rotation.x + (event.clientY - drag.current.y) / 14, y: drag.current.rotation.y + (event.clientX - drag.current.x) / 6 })
  }

  return <section className={styles.visual} aria-label={ru ? 'Оси анализа' : es ? 'Ejes de análisis' : 'Analysis axes'}>
    <header className={styles.visualHeader}>
      <div><p className={styles.eyebrow}>{ru ? 'Оси анализа' : es ? 'Ejes de análisis' : 'Analysis axes'}</p><h2>{mode === 'selected' ? (ru ? 'Покрытие вашей батареи' : es ? 'Cobertura de tus pruebas' : 'Coverage of your test set') : (ru ? 'Темы для исследования' : es ? 'Áreas de interés' : 'Your areas of interest')}</h2></div>
      <div className={styles.variantToggle} role="group" aria-label={ru ? 'Вариант модели' : es ? 'Modelo' : 'Model variant'}>
        {['female', 'male'].map((key) => <button type="button" key={key} aria-pressed={variant === key} onClick={() => setVariant(key)}>{key === 'female' ? (ru ? 'Женская' : es ? 'Femenino' : 'Female') : (ru ? 'Мужская' : es ? 'Masculino' : 'Male')}</button>)}
      </div>
    </header>
    <div className={styles.visualState} role="status" aria-live="polite">
      <strong>{mode === 'selected'
        ? (ru ? `${selectedCount} тестов · ${coverage.coveredCount} осей покрыто` : es ? `${selectedCount} pruebas · ${coverage.coveredCount} ejes cubiertos` : `${selectedCount} tests · ${coverage.coveredCount} axes covered`)
        : (ru ? `${topicCount} тем · ${coverage.coveredCount} связанных осей` : es ? `${topicCount} temas · ${coverage.coveredCount} ejes relacionados` : `${topicCount} topics · ${coverage.coveredCount} related axes`)}</strong>
      <span>{mode === 'selected'
        ? (ru ? 'Цветные точки показывают оси, которые охватывают отмеченные тесты.' : es ? 'Los puntos muestran los ejes cubiertos por las pruebas elegidas.' : 'Highlighted points show axes covered by the tests you selected.')
        : (ru ? 'Выберите темы слева: соответствующие оси подсветятся. Это предварительный просмотр, не результат.' : es ? 'Elige temas a la izquierda para destacar ejes; es una vista previa, no un resultado.' : 'Choose topics on the left to highlight axes. This is a preview, not a test result.')}</span>
    </div>
    <div className={styles.modelStage} tabIndex={0} role="application" aria-label={ru ? 'Поверните модель стрелками или перетаскиванием' : es ? 'Gira el modelo con las flechas o arrastrando' : 'Rotate model with arrow keys or drag'} onKeyDown={onKeyDown} onPointerDown={start} onPointerMove={move} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
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
          {PRIMARY_AXES.map((axis, index) => {
            const angle = (-145 + index * 32) * Math.PI / 180, x = 180 + Math.cos(angle) * 94, y = 168 + Math.sin(angle) * 115
            return <circle key={axis} cx={x} cy={y} r="7" className={`${styles.node} ${styles[`node${coverage.axes[axis]?.intensity || 'inactive'}`]}`} />
          })}
        </g>
      </svg>
      <div className={styles.axisRing}>
        {PRIMARY_AXES.map((axis) => <button type="button" key={axis} aria-pressed={axisFilter === axis} data-intensity={coverage.axes[axis]?.intensity || 'inactive'} onClick={() => onAxisFilter(axisFilter === axis ? null : axis)}>{label(axis)}</button>)}
      </div>
    </div>
    <div className={styles.secondaryAxes}>{SECONDARY_AXES.map((axis) => <button type="button" key={axis} aria-pressed={axisFilter === axis} data-intensity={coverage.axes[axis]?.intensity || 'inactive'} onClick={() => onAxisFilter(axisFilter === axis ? null : axis)}>{label(axis)}</button>)}</div>
    {activeAxes.length > 0 && <div className={styles.axisMeters} aria-label={ru ? 'Активные оси' : es ? 'Ejes activos' : 'Active axes'}>
      {activeAxes.map((axis) => <div key={axis} className={styles.axisMeter}>
        <span>{label(axis)}</span>
        {mode === 'selected'
          ? <progress max={1} value={coverage.axes[axis].coverage} aria-label={label(axis)} />
          : <span className={styles.axisInterest}>{ru ? 'В фокусе' : es ? 'Enfoque' : 'In focus'}</span>}
      </div>)}
    </div>}
    <div className={styles.visualFooter}><button type="button" className={styles.reset} onClick={() => setRotation({ x: 0, y: 0 })}>{ru ? 'Сбросить поворот' : es ? 'Restablecer orientación' : 'Reset rotation'}</button><p>{ru ? 'Визуальная модель — только способ отображения. Она не меняет расчёт тестов.' : es ? 'El modelo visual es ilustrativo y no cambia la puntuación de las pruebas.' : 'The visual model is display-only and does not change test scoring.'}</p></div>
  </section>
}

'use client'

import { useId, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { TEST_EXPLORER_AXES, TEST_EXPLORER_AXIS_LABELS } from '@/lib/assessments/test-explorer'
import { layoutPortraitRayLabels } from '@/lib/assessments/portrait-ray-labels'
import {
  PORTRAIT_SECTORS, PORTRAIT_AXIS_ORDER,
  portraitAxesForSectors, portraitFullCircleAngleForAxis, summarizePortraitSectors, portraitSectorMidAngle,
} from '@/lib/assessments/portrait-sectors'
import styles from './test-explorer.module.css'

const PRIMARY_AXES = TEST_EXPLORER_AXES.slice(0, 10)
const SECONDARY_AXES = TEST_EXPLORER_AXES.slice(10)
// A personality trait is descriptive and must never be presented as an ideal-to-reach ray.
const PORTRAIT_AXES = TEST_EXPLORER_AXES.filter((axis) => axis !== 'personality')
const PORTRAIT_COLLAPSED_COUNT = 10 // Five rows × two columns; the full list is one tap away.

export function TestExplorerVisual({ locale, coverage, mode = 'topics', topicCount = 0, selectedCount = 0, axisFilter, onAxisFilter, portrait = null, compact = false, portraitActions = null }) {
  const [variant, setVariant] = useState('male')
  // Null means the latest measured axes; [] is an intentional empty selection.
  const [chosenRays, setChosenRays] = useState(null)
  const [selectedSector, setSelectedSector] = useState('all')
  const [showAllPortraitRays, setShowAllPortraitRays] = useState(false)
  const portraitRayOptionsId = useId()
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const drag = useRef(null)
  const ru = locale === 'ru', es = locale === 'es'
  const spanishAxes = {"stress":"Estrés","anxiety":"Ansiedad","mood":"Estado de ánimo","sleep":"Sueño / recuperación","energy":"Energía","clarity":"Claridad","focus":"Concentración","emotional_regulation":"Conciencia emocional","relationships":"Conexión / apoyo","intimacy":"Elección de cercanía","boundaries":"Límites personales","sexual_wellbeing":"Autoaceptación sexual","embodiment":"Conciencia corporal","resource":"Recursos percibidos","self_support":"Apoyo interior","functioning":"Vida cotidiana","personality":"Personalidad","meaning":"Sentido y dirección"}
  const label = (axis) => (es ? spanishAxes[axis] : null) || TEST_EXPLORER_AXIS_LABELS[axis]?.[locale] || TEST_EXPLORER_AXIS_LABELS[axis]?.en || axis
  const measuredAxes = portrait ? PORTRAIT_AXES.filter((axis) => portrait.axes?.[axis] != null) : []
  // The chosen category always unfolds across the full circumference. Show
  // every defined scale in that category, including scales not yet measured.
  // Missing scores remain empty; fine-grained visibility choices are optional.
  const suggestedRays = PORTRAIT_AXES
  const checkedRays = chosenRays === null ? suggestedRays : chosenRays.filter((axis) => PORTRAIT_AXES.includes(axis))

  const allSectors = selectedSector === 'all'
  const overviewRays = portrait ? summarizePortraitSectors(portrait).map((sector) => {
    const angle = portraitSectorMidAngle(sector.key)
    const project = (radius) => ({ x: 180 + Math.cos(angle) * radius, y: 182 + Math.sin(angle) * radius })
    return {
      ...sector,
      displayLabel: sector.key === 'growth'
        ? (ru ? 'Дух / развитие' : es ? 'Espíritu / desarrollo' : 'Spirit / Growth')
        : (sector.label[locale] || sector.label.en),
      ideal: project(146),
      // Length in All indicates TEST COVERAGE, never an average wellbeing grade.
      end: sector.measured === 0 ? null : project(14 + sector.coveragePercent / 100 * 132),
      value: project(110),
    }
  }) : []
  const overviewLabels = portrait && allSectors ? layoutPortraitRayLabels(overviewRays.map((ray) => ({
    axis: ray.key, label: ray.displayLabel, ideal: ray.ideal,
    end: null, measured: ray.measured > 0,
  }))) : []
  const sectorAxes = portraitAxesForSectors([selectedSector])
  const sectorAxisSet = new Set(sectorAxes)
  const focusOptions = PORTRAIT_AXES.filter((axis) => sectorAxisSet.has(axis))
  const visibleRays = checkedRays.filter((axis) => sectorAxisSet.has(axis))
    .sort((a, b) => PORTRAIT_AXIS_ORDER.indexOf(a) - PORTRAIT_AXIS_ORDER.indexOf(b))
  // Expanding the 2-column list never resets the current sector or ray choices.
  const portraitOptions = showAllPortraitRays ? focusOptions : focusOptions.slice(0, PORTRAIT_COLLAPSED_COUNT)
  const rays = visibleRays.map((axis) => {
    // Selected sector's own scales now evenly span all 360 degrees.
    const angle = portraitFullCircleAngleForAxis(axis, selectedSector)
    const measure = portrait?.axes?.[axis] || null
    const percent = measure?.percent ?? null
    const project = (r) => ({ x: 180 + Math.cos(angle) * r, y: 182 + Math.sin(angle) * r })
    const radius = value => 14 + (value / 100) * 132
    return { axis, percent,
      end: percent === null ? null : project(radius(percent)),
      previousEnd: measure?.previousPercent == null ? null : project(radius(measure.previousPercent)),
      ideal: project(146) }
  })
  const polygon = (kind) => rays.map((ray) => `${ray[kind].x},${ray[kind].y}`).join(' ')
  const rayLabels = portrait ? layoutPortraitRayLabels(rays.map((ray) => ({
    axis: ray.axis, label: label(ray.axis), ideal: ray.ideal,
    // Captions stay on the OUTER ring even when a measured dot is near center.
    end: null, measured: Boolean(ray.end),
  }))) : []
  const formatDate = (value) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat(ru ? 'ru-RU' : es ? 'es-ES' : 'en-CA', { dateStyle: 'medium' }).format(new Date(value)) : ''
  const toggleRay = (axis) => setChosenRays((current) => {
    const selected = current === null ? suggestedRays : current
    return selected.includes(axis) ? selected.filter((key) => key !== axis) : [...selected, axis]
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
    {!compact && !portrait && <div className={styles.visualState} role="status" aria-live="polite">
      <strong>{portrait ? (ru ? `${portrait.measuredCount} измеренных шкал` : es ? `${portrait.measuredCount} escalas medidas` : `${portrait.measuredCount} measured scales`) : mode === 'selected'
        ? (ru ? `${selectedCount} тестов · ${coverage.coveredCount} осей покрыто` : es ? `${selectedCount} pruebas · ${coverage.coveredCount} ejes cubiertos` : `${selectedCount} tests · ${coverage.coveredCount} axes covered`)
        : (ru ? `${topicCount} тем · ${coverage.coveredCount} связанных осей` : es ? `${topicCount} temas · ${coverage.coveredCount} ejes relacionados` : `${topicCount} topics · ${coverage.coveredCount} related axes`)}</strong>
      <span>{portrait ? (ru ? 'Лучи строятся только по сохранённым результатам. Более длинный луч — ближе к благоприятному концу соответствующей шкалы; это не диагноз и не норма личности.' : es ? 'Los rayos usan solo resultados guardados. Más largo indica el extremo favorable de la escala, no una norma clínica.' : 'Rays use your saved test results only. Longer means closer to the favorable end of that scale, not a diagnosis or personality norm.') : mode === 'selected'
        ? (ru ? 'Цветные точки показывают оси, которые охватывают отмеченные тесты.' : es ? 'Los puntos muestran los ejes cubiertos por las pruebas elegidas.' : 'Highlighted points show axes covered by the tests you selected.')
        : (ru ? 'Выберите темы слева: соответствующие оси подсветятся. Это предварительный просмотр, не результат.' : es ? 'Elige temas a la izquierda para destacar ejes; es una vista previa, no un resultado.' : 'Choose topics on the left to highlight axes. This is a preview, not a test result.')}</span>
    </div>}
    {portrait && !compact && <div className={styles.portraitSectorPicker} data-portrait-sectors
      role="group" aria-label={ru ? 'Обзор и четыре категории портрета' : es ? 'Resumen y cuatro categorías del retrato' : 'Overview and four portrait categories'}>
      <div className={styles.portraitSectorGrid}>
        <button type="button" className={[styles.portraitSectorChip, styles.portraitSectorAll].join(' ')}
          data-portrait-sector-all="true" data-selected={allSectors}
          aria-pressed={allSectors} onClick={() => setSelectedSector('all')}>
          <span>{ru ? 'Все' : es ? 'Todo' : 'All'}</span>
        </button>
        {PORTRAIT_SECTORS.map((sector) => <button type="button" key={sector.key}
          className={styles.portraitSectorChip} data-portrait-sector={sector.key}
          data-selected={selectedSector === sector.key}
          aria-pressed={selectedSector === sector.key} onClick={() => setSelectedSector(sector.key)}>
          <span>{sector.key === 'growth'
            ? (ru ? 'Дух / развитие' : es ? 'Espíritu / desarrollo' : 'Spirit / Growth')
            : (sector.label[locale] || sector.label.en)}</span>
        </button>)}
      </div>
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
      {compact && !portrait && <svg viewBox="0 0 360 390" className={styles.focusRays} aria-hidden="true">
        <circle cx="180" cy="182" r="125" className={styles.focusRing} />
        {activeAxes.length > 0 && (topicCount > 0 || selectedCount > 0) && activeAxes.slice(0, 13).map((axis) => {
          const position = TEST_EXPLORER_AXES.indexOf(axis)
          const angle = -Math.PI / 2 + (position * 2 * Math.PI) / TEST_EXPLORER_AXES.length
          const point = (radius) => ({ x: 180 + Math.cos(angle) * radius, y: 182 + Math.sin(angle) * radius })
          const end = point(125)
          const origin = point(31)
          return <g key={axis} className={coverage.axes[axis]?.intensity === 'strong' ? styles.focusRayStrong : styles.focusRay}>
            <line x1={origin.x} y1={origin.y} x2={end.x} y2={end.y} />
            <circle cx={end.x} cy={end.y} r="6" />
          </g>
        })}
      </svg>}

      {portrait && allSectors && <svg viewBox="0 0 360 390" preserveAspectRatio="xMidYMid meet"
        className={styles.portraitRadar} data-radar-mode="summary" data-radar-layout="full-circle"
        data-active-portrait-sector="all" role="img"
        aria-label={(ru ? 'Обзор четырёх категорий' : es ? 'Resumen de cuatro categorías' : 'Four-category overview') + ': ' +
          overviewRays.map(ray => ray.displayLabel + ': ' + ray.measured + '/' + ray.total + ' measured').join(', ')}>
        <title>{ru ? 'Обзор четырёх категорий по реально измеренным шкалам' :
          es ? 'Resumen de cuatro categorías usando solo escalas medidas' :
            'Four-category overview based only on measured scales'}</title>
        <circle cx="180" cy="182" r="146" className={styles.radarReference} />
        <circle cx="180" cy="182" r="73" className={styles.radarGrid} />
        <polygon points={overviewRays.map(ray => ray.ideal.x + ',' + ray.ideal.y).join(' ')}
          className={styles.radarContourPolygon}/>
        {overviewRays.map(ray => <g key={ray.key} className={styles.radarSummarySector}
          data-summary-sector={ray.key} data-measured={ray.measured > 0}>
          <line x1="180" y1="182" x2={ray.ideal.x} y2={ray.ideal.y}
            className={styles.radarGuide}/>
          {ray.end && <line x1="180" y1="182" x2={ray.end.x} y2={ray.end.y}
            className={styles.radarRay}/>}
          {ray.end && <circle cx={ray.end.x} cy={ray.end.y} r="5.8"
            className={styles.radarPoint}/>}
          <circle cx={ray.ideal.x} cy={ray.ideal.y} r="6"
            className={ray.end ? styles.radarContourMeasured : styles.radarContourUnmeasured}/>
          <text x={ray.value.x} y={ray.value.y} textAnchor="middle" dy=".3em"
            className={styles.radarSummaryValue}>
            {ray.measured} / {ray.total}
          </text>
        </g>)}
        <circle cx="180" cy="182" r="7" className={styles.radarCenter}/>
        {overviewLabels.map(ray => <g key={'summary-label-' + ray.axis}
          className={[styles.radarLabel, !ray.measured ? styles.radarLabelUnmeasured : ''].join(' ')}>
          {ray.showLeader && <line x1={ray.tip.x} y1={ray.tip.y}
            x2={ray.anchor.x} y2={ray.anchor.y} className={styles.radarInlineLeader}/>}
          <text x={ray.x} y={ray.y + (ray.lines.length === 1 ? 14 : 13)}
            textAnchor="start" className={styles.radarInlineLabel}>
            {ray.lines.map((line,index) => <tspan key={index} x={ray.x}
              dy={index === 0 ? 0 : 14} textLength={ray.lineWidths[index]}
              lengthAdjust="spacingAndGlyphs">{line}</tspan>)}
          </text>
        </g>)}
      </svg>}
      {portrait && !allSectors && <svg viewBox="0 0 360 390" preserveAspectRatio="xMidYMid meet"
        className={styles.portraitRadar} data-radar-mode="detail" data-radar-layout="full-circle"
        data-active-portrait-sector={selectedSector} role="img"
        aria-label={(ru ? 'Шкалы категории' : es ? 'Escalas de la categoría' : 'Category scales') + ': ' +
          rays.map(ray => `${label(ray.axis)}: ${ray.percent === null ? (portrait?.axes?.[ray.axis]?.mode === 'descriptive' ? 'descriptive' : 'unmeasured') : 'scale position '+ray.percent+'/100'}`).join(', ')}>
        <title>{ru ? 'Показатели выбранной категории по всей окружности' :
          es ? 'Escalas de la categoría alrededor de todo el círculo' : 'Selected category scales around the full circle'}</title>
        <circle cx="180" cy="182" r="146" className={styles.radarReference} />
        <circle cx="180" cy="182" r="73" className={styles.radarGrid} />
        {rays.length >= 3 && <polygon
          points={rays.map(ray => `${ray.ideal.x},${ray.ideal.y}`).join(' ')}
          className={styles.radarContourPolygon} />}
        {rays.map(ray => <g key={ray.axis} data-detail-axis={ray.axis} data-measured={ray.end !== null}>
          <line x1="180" y1="182" x2={ray.ideal.x} y2={ray.ideal.y}
            className={styles.radarGuide} />
          {ray.end && <line x1="180" y1="182" x2={ray.end.x} y2={ray.end.y} className={styles.radarRay}/>}
          {ray.end && <circle cx={ray.end.x} cy={ray.end.y} r="5.7" className={styles.radarPoint}/>}
          {ray.previousEnd && <circle cx={ray.previousEnd.x} cy={ray.previousEnd.y}
            r="3.6" className={styles.radarPrior}/>}
          <circle cx={ray.ideal.x} cy={ray.ideal.y} r="6"
            data-contour-axis={ray.axis} data-measured={ray.end !== null}
            className={ray.end ? styles.radarContourMeasured : styles.radarContourUnmeasured}/>
        </g>)}
        {rays.length >= 3 && rays.every(ray => ray.end) &&
          <polygon points={polygon('end')} className={styles.radarArea}/>}
        {rays.length >= 3 && rays.every(ray => ray.end) &&
          <polygon points={polygon('end')} className={styles.radarOutline}/>}
        <circle cx="180" cy="182" r="7" className={styles.radarCenter} />
        {rayLabels.map(ray => <g key={`portrait-label-${ray.axis}`}
          className={`${styles.radarLabel} ${ray.measured ? '' : styles.radarLabelUnmeasured}`}>
          {ray.showLeader && <line x1={ray.tip.x} y1={ray.tip.y}
            x2={ray.anchor.x} y2={ray.anchor.y} className={styles.radarInlineLeader}/>}
          <text x={ray.x} y={ray.y + (ray.lines.length === 1 ? 14 : 13)}
            textAnchor="start" className={styles.radarInlineLabel}>
            {ray.lines.map((line,index) => <tspan key={index} x={ray.x}
              dy={index === 0 ? 0 : 14} textLength={ray.lineWidths[index]}
              lengthAdjust="spacingAndGlyphs">{line}</tspan>)}
          </text>
        </g>)}
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
    {portrait && !compact && portraitActions}
    {portrait && !compact && !allSectors && <section className={styles.portraitControls} aria-label={ru ? 'Выбор шкал портрета' : 'Choose portrait scales'}>
      <div className={styles.portraitControlsHeading}>
        <strong>{ru ? 'Лучи моего портрета' : es ? 'Escalas de mi retrato' : 'Choose my portrait rays'}</strong>
        <span>{visibleRays.length} / {focusOptions.length}</span>
      </div>
      {visibleRays.length === 0 && measuredAxes.length > 0 && <p>{ru ? 'В этих секторах пока не выбраны лучи. Отметьте нужные шкалы ниже.' : es ? 'Elige las escalas de los sectores seleccionados.' : 'No rays selected in these sectors yet. Choose individual scales below.'}</p>}
      {measuredAxes.length === 0 && <p>{ru ? 'Подтверждённых свежих измерений пока нет. Описательные ответы не становятся показателем здоровья.' : es ? 'Sin resultados actuales. Una reflexión descriptiva no equivale a un porcentaje de salud.' : 'No recent verified results yet. Descriptive answers are never a health score.'}</p>}
      <div id={portraitRayOptionsId} className={styles.portraitRayOptions} data-portrait-ray-options>{portraitOptions.map((axis) => {
        const current = portrait?.axes?.[axis] || null
        const historic = portrait?.staleAxes?.[axis] || null
        const measure = current || historic
        const candidate = portrait?.axisCandidates?.[axis] || null
        const detailHref = measure?.resultId
          ? `/${locale}/app/results/${encodeURIComponent(measure.resultId)}${measure.dimensionKey ? `?scale=${encodeURIComponent(measure.dimensionKey)}` : ''}#hh-assessment-scale-panel`
          : null
        return <div key={axis} className={styles.portraitRayItem} data-portrait-ray={axis} data-measured={Boolean(current)} data-portrait-status={current?.mode || (historic ? 'stale' : 'missing')}>
          <label className={styles.portraitRayOption} title={measure ? `${measure.source} · ${formatDate(measure.measuredAt)}` : (ru ? 'Нет измерения' : es ? 'Sin medición' : 'Not measured')}>
            <input type="checkbox" checked={checkedRays.includes(axis)} onChange={() => toggleRay(axis)} />
            <span>{label(axis)}</span>
            <strong>{current ? `${current.rawValue ?? '—'} / ${current.max ?? '—'}` : '—'}</strong>
            {current && <small className={styles.portraitDelta} aria-label={ru ? 'Позиция по исходной шкале, не процент здоровья' : es ? 'Posición en escala, no porcentaje de salud' : 'Original scale position, not a health percentage'}>{current.percent === null ? (ru ? 'описательно' : es ? 'descriptivo' : 'descriptive') : 'pos. ' + current.percent + '/100'}</small>}
            {historic && !current && <small className={styles.portraitDelta}>{ru ? 'устарел' : es ? 'anterior' : 'outdated'}</small>}
          </label>
          {detailHref && <Link
            href={detailHref}
            prefetch={false}
            className={styles.portraitRayDetailsLink}
            data-portrait-scale-details={axis}
            aria-label={`${ru ? 'Пояснение шкалы' : es ? 'Detalles de la escala' : 'Scale details'}: ${label(axis)}`}>
            {ru ? 'Подробнее' : es ? 'Detalles' : 'Details'} <span aria-hidden="true">→</span>
          </Link>}
          {!measure && candidate && <Link
            href={`/${locale}/app/tests?explore=1&axis=${encodeURIComponent(axis)}&suggest=${encodeURIComponent(candidate.testKey)}`}
            prefetch={false}
            className={styles.portraitRayTestLink}
            aria-label={`${candidate.mode === 'descriptive' ? (ru ? 'Изучить тему' : es ? 'Explorar' : 'Explore') : (ru ? 'Пройти тест' : es ? 'Hacer test' : 'Test it')}: ${label(axis)}`}>
            {candidate.mode === 'descriptive' ? (ru ? 'Изучить' : es ? 'Explorar' : 'Explore') : (ru ? 'Пройти тест' : es ? 'Hacer test' : 'Test it')} <span aria-hidden="true">→</span>
          </Link>}
          {!measure && !candidate && <span className={styles.portraitUnavailable}>{ru ? 'Нет разрешённого теста' : es ? 'Sin prueba habilitada' : 'No eligible test'}</span>}
        </div>
      })}</div>
      {focusOptions.length > PORTRAIT_COLLAPSED_COUNT && <button
        type="button" className={styles.portraitShowMore} aria-controls={portraitRayOptionsId}
        aria-expanded={showAllPortraitRays} onClick={() => setShowAllPortraitRays(current => !current)}>
        {showAllPortraitRays
          ? (ru ? 'Свернуть остальные шкалы' : es ? 'Mostrar menos escalas' : 'Show fewer scales')
          : (ru ? `Показать ещё ${focusOptions.length - PORTRAIT_COLLAPSED_COUNT} шкал`
            : es ? `Ver ${focusOptions.length - PORTRAIT_COLLAPSED_COUNT} escalas más`
              : `Show ${focusOptions.length - PORTRAIT_COLLAPSED_COUNT} more scales`)}
        <span aria-hidden="true">{showAllPortraitRays ? '↑' : '↓'}</span>
      </button>}
      {rays.some((ray) => ray.previousEnd) && <div className={styles.portraitLegend}><span className={styles.legendCurrent}>{ru ? 'Сейчас' : es ? 'Actual' : 'Current'}</span><span className={styles.legendPrior}>{ru ? 'Предыдущий совместимый тест' : es ? 'Medición previa compatible' : 'Previous comparable test'}</span></div>}
      {visibleRays.some(axis => portrait?.axes?.[axis] || portrait?.staleAxes?.[axis]) && <details className={styles.portraitSources}>
        <summary>{ru ? 'Данные по лучам: источник, дата и динамика' : es ? 'Fuentes, fechas y evolución' : 'Ray details: source, date and change'}</summary>
        <div>
          {visibleRays.filter((axis) => portrait?.axes?.[axis] || portrait?.staleAxes?.[axis]).map((axis) => {
            const item = portrait.axes[axis] || portrait.staleAxes[axis]
            return <div key={axis} className={styles.portraitSourceRow}>
              <strong>{label(axis)} · {item.rawValue} ({item.min}–{item.max})</strong>
              <span>{item.sourceTitle || item.definitionKey} · {item.source} · {formatDate(item.measuredAt)}</span>
              <span>{item.mode === 'descriptive' ? (ru ? 'Описательные ответы, без идеального уровня' : es ? 'Respuesta descriptiva sin nivel ideal' : 'Descriptive score without an ideal level') : (ru ? 'Позиция внутри этого теста: ' : es ? 'Posición dentro de esta prueba: ' : 'Within-test position: ') + item.percent + '/100'}</span>
              <span>{item.change == null
                ? (ru ? 'Нет подтверждённой сопоставимой динамики' : es ? 'Sin cambio comparable verificado' : 'No verified comparable change')
                : (ru ? 'Изменение позиции: ' : es ? 'Cambio de posición: ' : 'Position change: ') + (item.change > 0 ? '+' : '') + item.change + '/100'}</span>
              {item.resultId && <Link href={'/' + locale + '/app/results/' + encodeURIComponent(item.resultId) + '?scale=' + encodeURIComponent(item.dimensionKey) + '#hh-assessment-scale-panel'} prefetch={false}>{ru ? 'Подробности исходной шкалы' : es ? 'Detalles de la escala' : 'Exact scale details'} →</Link>}
            </div>
          })}
        </div>
      </details>}
      <p>{ru ? 'Крупное число — исходный балл теста. Позиция /100 лишь помогает нарисовать луч внутри именно этого опросника; это не процент здоровья, клинический уровень или сравнение с другим тестом. Описательные показатели не имеют идеального значения.' : es ? 'El número principal es la puntuación original. La posición /100 no mide salud ni permite comparar pruebas; una escala descriptiva no tiene valor ideal.' : 'The primary number is the original test score. Position /100 only draws this questionnaire’s scale, never health, clinical severity or comparison across tests. Descriptive measures have no ideal endpoint.'}</p>
    </section>}
    {!portrait && !compact && activeAxes.length > 0 && <div className={styles.axisMeters} aria-label={ru ? 'Активные оси' : es ? 'Ejes activos' : 'Active axes'}>
      {activeAxes.map((axis) => <div key={axis} className={styles.axisMeter}>
        <span>{label(axis)}</span>
        {mode === 'selected'
          ? <progress max={1} value={coverage.axes[axis].coverage} aria-label={label(axis)} />
          : <span className={styles.axisInterest}>{ru ? 'В фокусе' : es ? 'Enfoque' : 'In focus'}</span>}
      </div>)}
    </div>}
    {!compact && <div className={styles.visualFooter}>{!portrait && <button type="button" className={styles.reset} onClick={() => setRotation({ x: 0, y: 0 })}>{ru ? 'Сбросить поворот' : es ? 'Restablecer orientación' : 'Reset rotation'}</button>}<p>{portrait ? (allSectors ? (ru ? '«Все» показывает охват — сколько шкал имеют свежие результаты. Это не общий балл здоровья.' : es ? 'Todo muestra cobertura de mediciones actuales, no un promedio de salud.' : 'All displays current measurement coverage only, never an average health score.') : (ru ? 'Только свежие проверенные направленные шкалы создают луч. Описательные и устаревшие результаты не получают искусственной длины.' : es ? 'Solo mediciones verificadas y actuales con dirección definida generan rayos.' : 'Only recent, verified directional measurements create rays. Descriptive and outdated scores have no artificial length.')) : (ru ? 'Визуальная модель — только способ отображения. Она не меняет расчёт тестов.' : es ? 'El modelo visual es ilustrativo y no cambia la puntuación de las pruebas.' : 'The visual model is display-only and does not change test scoring.')}</p></div>}
  </section>
}

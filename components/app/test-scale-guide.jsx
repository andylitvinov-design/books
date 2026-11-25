'use client'

import styles from './test-scale-guide.module.css'
import { localizeScaleGuideSpanish } from '@/lib/assessments/spanish-scale-guide'

const COPY={
  en:{scales:'Measured scales',details:'What each scale means and what I can practise',purpose:'What the test explores',watch:'What you can observe',action:'One gentle step',skill:'Optional skill direction',choose:'Choose this scale for test matching',active:'Selected scale',range:'Possible score',source:'Questionnaire source',period:'Time period',instrument:'Questions language',english:'English original',russian:'Russian',reference:'Published score bands',nonClinical:'Descriptive scale, not a clinical cutoff',read:'Read the separate guide',legacy:'Traditional theme, not a clinical scale'},
  es:{"scales":"Escalas medidas","details":"Qué significa cada escala y qué puedo observar","purpose":"Qué explora la prueba","watch":"Qué puedes observar","action":"Un paso amable","skill":"Habilidad opcional","choose":"Elegir esta escala para encontrar pruebas","active":"Escala seleccionada","range":"Puntuación posible","source":"Fuente del cuestionario","period":"Periodo observado","instrument":"Idioma de las preguntas","english":"Original en inglés","russian":"Ruso","reference":"Intervalos publicados (nombres originales de las categorías)","nonClinical":"Escala descriptiva, no un umbral clínico","read":"Consultar la guía independiente","legacy":"Tema simbólico tradicional, no una escala clínica"},
  ru:{scales:'Измеряемые шкалы',details:'Как понимать шкалы и что можно попробовать',purpose:'Что исследует тест',watch:'Что наблюдать',action:'Один бережный шаг',skill:'Навык, который можно развивать по желанию',choose:'Выбрать эту шкалу для подбора тестов',active:'Шкала выбрана',range:'Возможный балл',source:'Источник опросника',period:'Период оценки',instrument:'Язык вопросов',english:'Английский оригинал',russian:'Русский',reference:'Опубликованные диапазоны',nonClinical:'Описательная шкала, не клинический порог',read:'Отдельный материал по тесту',legacy:'Традиционная тема, не клиническая шкала'},
}
export function TestScaleGuide({ guide, locale='en', selectedAxes=[], onSelectAxis, compact=true }) {
  if(!guide?.scales?.length) return null
  const language=locale==='ru'?'ru':locale==='es'?'es':'en', c=COPY[language]
  const displayGuide=language==='es'?localizeScaleGuideSpanish(guide):guide
  const symbolic=displayGuide.kind==='traditional'
  const brief=displayGuide.scales.slice(0,symbolic?2:3)
  const rest=displayGuide.scales.length-brief.length
  return <div className={styles.guide} data-scale-guide={guide.key}>
    <div className={styles.summaryLine}>
      <strong>{symbolic?c.legacy:c.scales}:</strong>
      <span>{brief.map(row=>row.label).join(' · ')}{rest>0?' · +'+rest:''}</span>
    </div>
    <details className={styles.details}>
      <summary>{c.details} ({displayGuide.scales.length})</summary>
      <div className={styles.content}>
        <p className={styles.purpose}><strong>{c.purpose}:</strong> {displayGuide.purpose}</p>
        <div className={styles.context}>
          <span>{c.period}: {displayGuide.timeframe}</span>
          <span>{c.instrument}: {displayGuide.instrumentLanguage==='ru'?c.russian:c.english}</span>
        </div>
        <div className={styles.rows}>
          {displayGuide.scales.map(row=><section key={row.key} className={styles.scaleRow}>
            <header><strong>{row.label}</strong>{language==='es'&&row.originalLabel&&row.originalLabel!==row.label&&<small lang={displayGuide.instrumentLanguage}>Nombre original: {row.originalLabel}</small>}{!symbolic&&row.axisLabel&&<span>{row.axisLabel}</span>}</header>
            <small>{c.range}: {row.min}–{row.max}</small>
            <p><b>{c.watch}:</b> {row.watch}</p>
            <p><b>{c.action}:</b> {row.action}</p>
            {!!row.skill&&<p><b>{c.skill}:</b> {row.skill}</p>}
            {row.bands.rows.length>0&&<div className={styles.bands}>
              <strong>{c.reference}</strong>
              {row.bands.rows.map(band=><span key={band.code} lang={language==='es'?displayGuide.instrumentLanguage:undefined}>{band.from}–{band.to}: {band.label}</span>)}
            </div>}
            {!row.bands.rows.length&&<small>{c.nonClinical}</small>}
            {row.axis&&onSelectAxis&&<button type="button" className={styles.choose} aria-pressed={selectedAxes.includes(row.axis)}
              onClick={()=>onSelectAxis(row.axis)}>{selectedAxes.includes(row.axis)?'✓ '+c.active:c.choose}</button>}
          </section>)}
        </div>
        {displayGuide.sourceUrl&&<a className={styles.source} href={displayGuide.sourceUrl} rel="noopener noreferrer" target="_blank">{c.source}: {displayGuide.sourceTitle} ↗</a>}
        <small className={styles.disclaimer}>{displayGuide.disclaimer}</small>
      </div>
    </details>
  </div>
}

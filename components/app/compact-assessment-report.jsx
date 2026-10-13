'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ScoreGauge, ScoreTrend } from './assessment-gauge'
import styles from './compact-assessment-report.module.css'

export function CompactAssessmentReport({ result, previous = null, report, locale = 'en' }) {
  const ru=locale==='ru',bach=result.definitionKey==='hh-bach-flower-profile'
  const presentation=report.presentation,labels=presentation.labels,about=presentation.about
  const shown=bach?report.sections.slice(0,report.highlightedCount):report.sections
  const extra=bach?report.sections.slice(shown.length):[]
  const sources=[...new Set([about.source,...shown.flatMap(s=>[s.source,s.classificationSource])].filter(Boolean))]
  const [focusKey,setFocusKey]=useState(report.sections[0]?.key)
  const focus=shown.find(s=>s.key===focusKey)||shown[0]
  const courseQuery=focus?.compact.course?'?support='+encodeURIComponent(focus.compact.course.goalId):''
  const next=shown.length?[...new Set(shown.map(s=>s.compact.nextStep))]:[presentation.empty.nextStep]
  const block=(number,content)=><section className={styles.block} data-report-block={number}><h3><span>{number}</span>{labels[number-1]}</h3>{content}</section>
  return <section className={styles.report} data-personal-result-report data-compact-assessment-report data-bach-profile={bach?'true':undefined} aria-label={report.title}>
    {block(1,<>
      {!shown.length&&<p>{presentation.empty.status}</p>}
      {report.personalityType&&<aside className={styles.typeSummary} data-personality-type-summary><h4>{report.personalityType.headline}</h4></aside>}
      <div className={styles.statusList}>{shown.map(section=>{
        const dimension=result.dimensions.find(d=>d.key===section.key)
        const displayDimension=section.bandBasis!=='screening'?{...dimension,direction:'non-normative'}:dimension
        return <article className={styles.statusRow} key={section.key}>
          {!bach&&<ScoreGauge dimension={displayDimension} locale={locale}/>}
          <div><h4>{section.construct||section.title}</h4><p data-score-reading>{section.compact.status}</p>
          {!bach&&<ScoreTrend descriptive={section.bandBasis!=='screening'} current={result} previous={previous} dimensionKey={section.key} locale={locale}/>}</div>
        </article>
      })}</div>
    </>)}
    {block(2,<>
      {!shown.length&&<p>{presentation.empty.meaning}</p>}
      {report.personalityType&&<><p>{report.personalityType.description}</p>{report.personalityType.alternatives?.map(s=><p key={s}>{s}</p>)}</>}
      {shown.map(section=><p key={section.key} data-result-explanation={section.key} data-scale-construct>{shown.length>1&&<strong>{section.construct}: </strong>}{section.compact.meaning}</p>)}
    </>)}
    {block(3,<>
      {shown.length>1&&<label className={styles.topicChoice}>{presentation.scaleChoiceLabel}<select value={focus?.key||''} onChange={event=>setFocusKey(event.target.value)}>{shown.map(s=><option key={s.key} value={s.key}>{s.construct}</option>)}</select></label>}
      <p className={styles.supportSuggestion} data-support-recommendation>{focus?focus.compact.recommendation:presentation.empty.recommendation}</p>
      <aside className={styles.courseBanner} data-report-course-banner><h4>{presentation.course.title}</h4><p>{focus?.compact.course?presentation.course.matchedLead+focus.compact.course.title+'. '+focus.compact.course.description:presentation.course.noMatch}</p><p>{presentation.course.body}</p><div>
        <Link href={'/'+(ru?'ru':'en')+presentation.course.path+courseQuery} prefetch={false}>{presentation.course.start}</Link>
        <Link href={'/'+(ru?'ru':'en')+presentation.course.path+courseQuery+'#about-course'} prefetch={false}>{presentation.course.more}</Link>
      </div></aside>
    </>)}
    {block(4,<>
      <p>{focus?focus.compact.nextStep:next[0]}</p>
      {report.seekSupport&&<p className={styles.limit}>{focus?.compact.referralIncluded?presentation.monitoringNote:report.seekSupport}</p>}
    </>)}
    {block(5,<>
      <p><strong>{about.name}</strong></p><p data-report-purpose>{about.purpose}</p><p data-assessment-methodology>{about.evidence}</p>
      {report.personalityType&&<p className={styles.limit}>{report.personalityType.warning}</p>}
      {shown.some(s=>s.explanation?.classificationNote)&&<p className={styles.limit}>{shown.find(s=>s.explanation?.classificationNote).explanation.classificationNote}</p>}
      <p className={styles.sourceNote} data-explanation-origin>{about.sourceNote}</p>
      {about.context&&<p data-assessment-context>{about.context}</p>}{about.languageNote&&<p className={styles.limit}>{about.languageNote}</p>}
      <div className={styles.sources}>{sources.map((source,i)=><a key={source} href={source} target="_blank" rel="noopener noreferrer" data-explanation-source data-classification-source={shown.some(s=>s.classificationSource===source)?'true':undefined}>{ru?'Источник':'Source'}{sources.length>1?' '+(i+1):''} ↗</a>)}</div>
    </>)}
    {extra.length>0&&<details className={styles.details}><summary>{ru?'Остальные эмоциональные темы':'Remaining emotional themes'} ({extra.length})</summary>{extra.map(section=><article key={section.key}><h4>{section.construct||section.title}</h4><p>{section.compact.status}</p><p>{section.compact.meaning}</p><p>{section.compact.recommendation}</p></article>)}</details>}
    <details className={styles.details} data-technical-report-details>
      <summary>{ru?'Расчёт, ответы, ограничения и версия':'Scoring, response anchors, limitations and version'}</summary>
      {report.methodology&&<p>{report.methodology}</p>}
      {shown.map(section=><article key={section.key}><h4>{section.construct}</h4>
        <p>{section.meaning}</p>
        {section.explanation&&<><p data-score-calculation>{section.explanation.calculation}</p><p data-response-anchors>{section.explanation.anchors}</p><p>{section.explanation.completeness}</p><p>{section.explanation.citation}</p><small>{section.explanation.provenance}</small></>}
      </article>)}
      <p>{report.note}</p><small>{ru?'Версия интерпретации':'Interpretation version'}: {report.interpretationVersion} · {report.payloadHash}</small>
    </details>
  </section>
}

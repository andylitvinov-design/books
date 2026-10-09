'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BarChart3, CheckCircle2, Clock3, RotateCcw, Sparkles } from 'lucide-react'
import { buildPsychPortrait } from '@/lib/assessments/psych-portrait'
import { buildProfileAssessmentView } from '@/lib/profile/profile-assessment-view'
import { coverageForFocus } from '@/lib/assessments/test-explorer'
import { TestExplorerVisual } from './test-explorer-visual'
import { ClientReportActions } from './client-report-actions'
import styles from './profile-assessment-overview.module.css'

const COPY = {
 en: {
   kicker:'MY PSYCHOLOGICAL PORTRAIT', heading:'Your measured profile',
   intro:'Your portrait reflects completed questionnaires only. Below it are your latest recorded scales, followed by tests you selected but have not finished.',
   noMeasures:'Complete a test to see your first measured scales here.',
   measures:'Your measured scales', scales:'scales measured', all:'Show all measured scales', fewer:'Show fewer scales',
   positions:'Bars show a position within each test’s own scale, not a health score or comparison with other people.',
   pending:'Selected tests still to complete', pendingIntro:'Grey bars represent areas these questionnaires can explore, not scores. They become measured only after you finish a test.',
   noPending:'Your selected testing set has no unfinished tests.',
   noPlan:'You have not selected a personal test set yet.',
   select:'Choose tests', inProgress:'In progress', notStarted:'Not started', continue:'Continue test', start:'Start test',
   min:'min', measured:'Measured', empty:'Not measured yet', last:'Latest result', prep:'Opening your test…',
   error:'Could not open the test. Please try again.', other:'Other profile tools and mood check-in', otherNote:'Earlier profile tools and practitioner materials remain available here.',
   portraitOptions:'Customize the portrait rays', portraitCaption:'Only measured rays are colored; unfinished tests never receive a made-up value.',
   actionsTitle:'What would you like to do next?', actionHint:'Your results stay private. Requesting a specialist review never automatically shares any of your results.',
   specialist:'Get personal recommendations from a specialist', specialistSmall:'Request a private conversation',
   retake:'Retake completed tests', retakeSmall:'Choose from your completed assessments',
   remaining:'Complete remaining tests', remainingSmall:'Open only unfinished tests',
   noneRetake:'No completed tests to repeat yet', noneRemaining:'No remaining tests in your selection',
 },
 ru: {
   kicker:'МОЙ ПСИХОЛОГИЧЕСКИЙ ПОРТРЕТ', heading:'Мои измеренные показатели',
   intro:'Портрет отражает только пройденные тесты. Под головой — последние значения шкал, затем выбранные, но ещё не завершённые тесты.',
   noMeasures:'После завершения первого теста здесь появятся измеренные показатели.',
   measures:'Мои измеренные шкалы', scales:'измеренных шкал', all:'Показать все измеренные шкалы', fewer:'Свернуть список',
   positions:'Полосы показывают положение на шкале конкретного теста, а не процент здоровья и не сравнение с другими людьми.',
   pending:'Выбранные, но ещё не пройденные тесты', pendingIntro:'Серые полосы — это темы будущих измерений, а не значения. Шкалы появятся после завершения тестов.',
   noPending:'В выбранном наборе больше нет непройденных тестов.',
   noPlan:'Личный набор тестов ещё не выбран.',
   select:'Подобрать тесты', inProgress:'В процессе', notStarted:'Не начат', continue:'Продолжить тест', start:'Пройти тест',
   min:'мин', measured:'Измерено', empty:'Ещё не измерено', last:'Последний замер', prep:'Открываем тест…',
   error:'Не удалось открыть тест. Попробуйте ещё раз.', other:'Другие функции профиля и самонаблюдение', otherNote:'Предыдущие инструменты профиля и материалы специалиста доступны здесь.',
   portraitOptions:'Настроить лучи психопортрета', portraitCaption:'Цветными показаны только реально измеренные шкалы.',
   actionsTitle:'Что хотите сделать дальше?', actionHint:'Ваши результаты приватны. Обращение к специалисту не передаёт автоматически данные тестов.',
   specialist:'Получить личные рекомендации специалиста', specialistSmall:'Запросить консультацию',
   retake:'Пройти тесты повторно', retakeSmall:'Выбрать из ранее пройденных',
   remaining:'Пройти оставшиеся тесты', remainingSmall:'Открыть только непройденные',
   noneRetake:'Пока нет пройденных тестов', noneRemaining:'В наборе нет оставшихся тестов',
 },
}
const formatValue=(value)=>Number(value).toLocaleString('en-US',{maximumFractionDigits:2})
const dateString=(value,locale)=>{
 if(!value||!Number.isFinite(Date.parse(value)))return ''
 return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-CA',{dateStyle:'medium'}).format(new Date(value))
}

export function ProfileAssessmentOverview({data,locale='en',onBeginTest,children}) {
 const c=COPY[locale]||COPY.en
 const root='/'+locale+'/app'
 const view=buildProfileAssessmentView(data,locale)
 const portrait=buildPsychPortrait(data.results)
 const [showAll,setShowAll]=useState(false)
 const [working,setWorking]=useState('')
 const [error,setError]=useState('')
 const measured=showAll?view.measured:view.measured.slice(0,6)

 async function begin(row){
   if(working)return
   setError('')
   setWorking(row.id)
   try{await onBeginTest(row)}catch{setError(c.error);setWorking('')}
 }
 return <div className={styles.profile} data-profile-assessment-overview>
   <section className={styles.portraitSection} aria-labelledby="profile-portrait-heading">
     <div className={styles.sectionTitle}>
       <p className={styles.eyebrow}>{c.kicker}</p>
       <h2 id="profile-portrait-heading">{c.heading}</h2>
       <p>{c.intro}</p>
     </div>
     <div className={styles.headWrap} data-profile-head>
       <TestExplorerVisual compact locale={locale} coverage={coverageForFocus([])} portrait={portrait} />
       <div className={styles.headNote}><CheckCircle2 size={17} aria-hidden="true"/>{c.portraitCaption}</div>
     </div>
   </section>

   <section className={styles.measured} aria-labelledby="profile-measured-heading">
     <div className={styles.measureHeading}>
       <div><p className={styles.eyebrow}>{c.last}</p><h2 id="profile-measured-heading">{c.measures}</h2></div>
       <span className={styles.count}>{view.measured.length} {c.scales}</span>
     </div>
     {measured.length ? <div className={styles.measuredGrid}>
       {measured.map((row)=> <article className={styles.measureCard} key={row.key} data-measured-scale>
         <div className={styles.measureTop}>
           <span>{row.label}</span>
           <strong>{formatValue(row.value)} <small>/ {formatValue(row.max)}</small></strong>
         </div>
         <div className={styles.measuredBar} role="progressbar" aria-label={row.label} aria-valuemin={row.min} aria-valuemax={row.max} aria-valuenow={row.value}>
           <span style={{width:(row.ratio*100)+'%'}}/>
         </div>
         <small className={styles.scaleSource}>{row.testTitle ? row.testTitle + ' · ' : ''}{formatValue(row.min)}–{formatValue(row.max)} · {dateString(row.date,locale)}</small>
       </article>)}
     </div> : <p className={styles.noData}>{c.noMeasures}</p>}
     {view.measured.length>6 && <button type="button" className={styles.moreScales} onClick={()=>setShowAll((previous)=>!previous)} aria-expanded={showAll}>
       {showAll?c.fewer:c.all} ({view.measured.length}) <ArrowRight size={17} aria-hidden="true" />
     </button>}
     <p className={styles.disclaimer}>{c.positions}</p>
   </section>

   <section className={styles.pending} aria-labelledby="profile-pending-heading">
     <div className={styles.measureHeading}>
       <div><p className={styles.eyebrow}>{c.empty}</p><h2 id="profile-pending-heading">{c.pending}</h2></div>
       <span className={styles.countMuted}>{view.pending.length} / {view.selectedCount}</span>
     </div>
     <p className={styles.pendingIntro}>{c.pendingIntro}</p>
     {view.pending.length ? <div className={styles.pendingGrid}>
       {view.pending.map(row=><article className={styles.pendingCard} key={row.id} data-unfinished-test>
         <div className={styles.pendingTop}>
           <div><h3>{row.title}</h3><p>{row.description}</p></div>
           <span className={styles.status}>{row.runId?c.inProgress:c.notStarted}</span>
         </div>
         <div className={styles.pendingScales}>
           {row.expectedScales.length?row.expectedScales.map((label,index)=><div key={label+'-'+index} className={styles.pendingScale}>
             <span>{label}</span><span className={styles.greyBar} aria-label={label+': '+c.empty}/>
           </div>):<div className={styles.pendingScale}><span>{c.empty}</span><span className={styles.greyBar}/></div>}
         </div>
         <div className={styles.pendingFooter}>
           <small><Clock3 size={14} aria-hidden="true"/> ~{row.minutes} {c.min}{row.runId?' · '+row.progress+'%':''}</small>
           <button type="button" disabled={Boolean(working)} onClick={()=>begin(row)}>
             {working===row.id?c.prep:row.runId?c.continue:c.start} <ArrowRight size={15} aria-hidden="true"/>
           </button>
         </div>
       </article>)}
     </div>:<div className={styles.noPending}>
       <p>{view.planId?c.noPending:c.noPlan}</p>
       {!view.planId && <Link href={'/'+locale+'/client'}>{c.select} →</Link>}
     </div>}
     {error && <p className={styles.error} role="alert">{error}</p>}
   </section>

   {children && <details className={styles.other} data-profile-extra-tools>
     <summary>{c.other}<span aria-hidden="true">⌄</span></summary>
     <div className={styles.otherContent}>
       <p>{c.otherNote}</p>
       {children}
       <details className={styles.portraitOptions}>
         <summary>{c.portraitOptions}</summary>
         <TestExplorerVisual locale={locale} coverage={coverageForFocus([])} portrait={portrait}/>
       </details>
     </div>
   </details>}

   <section className={styles.actions} aria-label={c.actionsTitle} data-profile-actions>
     <div className={styles.actionsHeading}><p className={styles.eyebrow}>HOLISTIC HOUSE</p><h2>{c.actionsTitle}</h2></div>
     <div className={styles.actionGrid}>
       <div className={styles.reportAction}><ClientReportActions data={data} locale={locale} singleAction /></div>
       <Link href={root+'/consultations?source=test-results'} className={styles.specialistAction}>
         <Sparkles size={20} aria-hidden="true"/><span><strong>{c.specialist}</strong><small>{c.specialistSmall}</small></span>
       </Link>
       {view.completedCount? <Link href={root+'/tests?filter=completed'} className={styles.secondaryAction}>
         <RotateCcw size={19} aria-hidden="true"/><span><strong>{c.retake}</strong><small>{c.retakeSmall}</small></span>
       </Link> : <div className={styles.disabledAction} aria-disabled="true" title={c.noneRetake}><RotateCcw size={19}/><span><strong>{c.retake}</strong><small>{c.noneRetake}</small></span></div>}
       {view.pending.length ? <Link href={root+'/tests?filter=remaining'} className={styles.remainingAction}>
         <BarChart3 size={19} aria-hidden="true"/><span><strong>{c.remaining}</strong><small>{c.remainingSmall} · {view.pending.length}</small></span>
       </Link> : <div className={styles.disabledAction} aria-disabled="true" title={c.noneRemaining}><BarChart3 size={19}/><span><strong>{c.remaining}</strong><small>{c.noneRemaining}</small></span></div>}
     </div>
     <p className={styles.disclaimer}>{c.actionHint}</p>
   </section>
 </div>
}

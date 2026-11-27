'use client'

import Link from 'next/link'
import {ArrowLeft,ArrowRight,CalendarDays,ChevronDown,PlayCircle,Sparkles} from 'lucide-react'
import {coachCourseLaunchHref} from '@/lib/coach-course-launch.mjs'
import {COACH_COMPARISON_LOCALES,getCoachProgramComparison} from '@/lib/coach-program-comparison.mjs'
import styles from './my-coach-program-comparison.module.css'

function ComparisonCard({program:p,copy,lang}){
 return <details className={styles.card} data-coach-comparison-program={p.id} open={p.id==='clarity'}>
  <summary className={styles.summary}>
   <span className={styles.art} data-art={p.id} aria-hidden="true"/>
   <span className={styles.intro}>
    {p.id==='clarity'&&<span className={styles.startHere}><Sparkles size={13} aria-hidden="true"/>{copy.startHere}</span>}
    <span className={styles.name}>{p.title}</span>
    <span className={styles.description}>{p.description}</span>
   </span>
   <span className={styles.meta}>
    <span className={styles.count}><CalendarDays size={15} aria-hidden="true"/>{p.count} {copy.sessions}</span>
    <span className={styles.price}>{p.price}</span>
   </span>
   <ChevronDown className={styles.chevron} size={19} aria-hidden="true"/>
  </summary>
  <div className={styles.expanded}>
   {p.id!=='clarity'&&<p className={styles.status}>{p.draft?copy.draft:copy.preview}</p>}
   <ol className={styles.sessions}>
    {p.rows.map((row,index)=><li key={index}>
     {p.id==='clarity'&&<span className={styles.sessionArt} data-session-art={index+1} aria-hidden="true"/>}
     <span className={styles.sessionText}><strong>{index+1}. {row.title}</strong>{row.description&&<span>{row.description}</span>}</span>
    </li>)}
   </ol>
   {p.id==='clarity'&&<>
    <Link href={coachCourseLaunchHref(lang,p.id)} prefetch={false} className={styles.start} data-coach-comparison-launch={p.id}><PlayCircle size={21} aria-hidden="true"/><span>{copy.start}</span><ArrowRight size={20} aria-hidden="true"/></Link>
    <p className={styles.terms}>{copy.terms}</p>
   </>}
   {p.id!=='clarity'&&<Link href={coachCourseLaunchHref(lang,p.id)} prefetch={false} className={styles.programPreviewLink} data-coach-comparison-launch={p.id}>{({en:'View course & coaches',ru:'Курс и коучи',es:'Ver curso y coaches'})[lang]}<ArrowRight size={18} aria-hidden="true"/></Link>}
   {p.id==='health'&&<p className={styles.terms}>{copy.healthNote}</p>}
  </div>
 </details>
}

export default function CoachProgramComparison({locale='en'}){
 const {lang,copy,programs}=getCoachProgramComparison(locale)
 return <main className={styles.page} data-my-coach-program-comparison lang={lang}>
  <div className={styles.frame}>
   <header className={styles.header}>
    <Link href={'/'+lang} className={styles.brand} aria-label="Holistic House" prefetch={false}>
     <span className={styles.brandMark} aria-hidden="true"/>Holistic House<sup>®</sup>
    </Link>
    <div className={styles.headerActions}>
     <details className={styles.languages}>
      <summary aria-label={copy.language}>{lang.toUpperCase()}<ChevronDown size={14} aria-hidden="true"/></summary>
      <div>{COACH_COMPARISON_LOCALES.map(l=><Link key={l} href={'/'+l+'/my-coach/programs'} prefetch={false} hrefLang={l} aria-current={l===lang?'page':undefined}>{l.toUpperCase()}</Link>)}</div>
     </details>
     <button type="button" className={styles.help} onClick={()=>{
      const nativeHelp=document.querySelector('[data-hh-ihelp-trigger]')
      if(nativeHelp instanceof HTMLElement)nativeHelp.click()
      else window.location.assign('/'+lang+'/contact')
     }}><span aria-hidden="true">ⓘ</span> iHelp</button>
    </div>
   </header>
   <div className={styles.heading}>
    <Link href={'/'+lang+'/my-coach'} prefetch={false} className={styles.back} aria-label={copy.back}><ArrowLeft size={21} aria-hidden="true"/></Link>
    <div><h1>{copy.title}</h1><p>{copy.subtitle}</p></div>
   </div>
   <section className={styles.cards} aria-label={copy.title}>
    {programs.map(p=><ComparisonCard key={p.id} program={p} copy={copy} lang={lang}/>)}
   </section>
   <p className={styles.priceNote}>{copy.priceNote}</p>
  </div>
 </main>
}

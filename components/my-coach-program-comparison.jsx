'use client'

import Link from 'next/link'
import {useState} from 'react'
import {ArrowLeft,ArrowRight,CalendarDays,ChevronDown,Sparkles} from 'lucide-react'
import {coachCourseLaunchHref} from '@/lib/coach-course-launch.mjs'
import {COACH_COMPARISON_LOCALES,getVisibleCoachPrograms} from '@/lib/coach-program-comparison.mjs'
import styles from './my-coach-program-comparison.module.css'

function ComparisonCard({program:p,copy,lang,selected,onSelect}){
 const selectLabel=p.title
 return <article className={styles.card} data-coach-comparison-program={p.id} data-selected={selected}>
  <span className={styles.art} data-art={p.id} aria-hidden="true"/>
  <div className={styles.intro}>
   <button type="button" className={styles.select} onClick={onSelect} aria-pressed={selected} aria-label={selectLabel}>
    {p.tag&&<span className={styles.startHere}><Sparkles size={13} aria-hidden="true"/>{p.tag}</span>}
    <span className={styles.name}>{p.title}</span>
    <span className={styles.description}>{p.description}</span>
    <ChevronDown className={styles.chevron} size={19} aria-hidden="true"/>
   </button>
   <div className={styles.meta}>
    <span className={styles.count}><CalendarDays size={15} aria-hidden="true"/>{p.count} {copy.sessions}</span>
    <span className={styles.price}>{p.price}</span>
    {selected&&<Link href={coachCourseLaunchHref(lang,p.id)} prefetch={false} className={styles.start} data-coach-comparison-launch={p.id} aria-label={copy.start+' · '+p.title}>{copy.start}<ArrowRight size={15} aria-hidden="true"/></Link>}
   </div>
  </div>
 </article>
}

export default function CoachProgramComparison({locale='en'}){
 const {lang,copy,programs}=getVisibleCoachPrograms(locale)
 const [selected,setSelected]=useState(null)
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
    {programs.map(p=><ComparisonCard key={p.id} program={p} copy={copy} lang={lang} selected={selected===p.id} onSelect={()=>setSelected(previous=>previous===p.id?null:p.id)}/>)}
   </section>
  </div>
 </main>
}

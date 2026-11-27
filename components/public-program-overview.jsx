import Link from 'next/link'
import {ProgramStartLink} from '@/components/app/clarity-program'
import {ReikiDaybookStart} from '@/components/reiki-practitioner-entry'
import {ArrowLeft,ArrowRight,BarChart3,BriefcaseBusiness,ChevronDown,Compass,Flag,Flame,Flower2,Layers,Leaf,Route,Settings2,Sparkles,Sunrise,Target,TrendingUp} from 'lucide-react'
import {SiteNavigation} from '@/components/site-navigation'
import {PROGRAM_LOCALES} from '@/lib/public-coaching-programs.mjs'
import styles from './public-program-overview.module.css'
import GoalLandingSections,{GoalLandingBenefits} from './goal-landing-sections'

const icons={
 clarity:[Flower2,Leaf,Target],
 goal:[Compass,Flame,Route,Flag,Flower2,Sparkles,TrendingUp,Sunrise],
 business:[BriefcaseBusiness,Layers,Settings2,BarChart3,Route,Target,TrendingUp,Flag],
 reiki:[Sunrise,Flower2,Flame,Leaf,Sparkles]
}
const programIcons={clarity:Flower2,goal:Target,business:TrendingUp,reiki:Flower2}

export default function ProgramOverview({program:p}){
 const Icon=programIcons[p.id]
 const start=<ProgramStartLink locale={p.locale} program={p.id} className={styles.cta}>{p.start}<ArrowRight size={22} aria-hidden="true"/></ProgramStartLink>
 return <main className={styles.page} lang={p.locale} data-public-program={p.id}>
  <header className={styles.header}>
   <Link href={p.home} prefetch={false} className={styles.brand} aria-label="Holistic House">
    <Leaf size={31} aria-hidden="true"/><span><strong>Holistic House</strong><small>{p.tagline}</small></span>
   </Link>
   <div className={styles.headerActions}>
    <details className={styles.language}><summary aria-label={p.language}>{p.locale.toUpperCase()}<ChevronDown size={14} aria-hidden="true"/></summary>
     <div className={styles.languages}>{PROGRAM_LOCALES.map(lang=><Link key={lang} href={'/'+lang+'/programs/'+p.id} hrefLang={lang} lang={lang} prefetch={false} aria-current={lang===p.locale?'page':undefined}>{lang.toUpperCase()}</Link>)}</div>
    </details>
    <div className={styles.siteTools}><SiteNavigation locale={p.locale} compact/></div>
   </div>
  </header>
  <section className={styles.hero}>
   <div className={styles.art} aria-hidden="true"/>
   <div className={styles.shade} aria-hidden="true"/>
   <Link href={p.home} className={styles.back} prefetch={false}><ArrowLeft size={19} aria-hidden="true"/>{p.back}</Link>
   <div className={styles.heroCopy}>
    <h1>{p.title}</h1><span className={styles.goldLine} aria-hidden="true"/>
    <p>{p.subtitle}</p>
    <span className={styles.count}><Icon size={21} aria-hidden="true"/>{p.count}</span>
    {p.intro&&<small className={styles.intro}>{p.intro}</small>}
   </div>
  </section>
  <section className={styles.body} aria-label={p.outline}>
   {p.id==='reiki'&&<div className={styles.reikiEntry}><ReikiDaybookStart locale={p.locale} className={styles.cta}/></div>}
   {p.id==='goal'?<>{start}<GoalLandingBenefits locale={p.locale}/><GoalLandingSections locale={p.locale}/></>:<ol className={styles.sessions}>
    {p.rows.map(([title,description],index)=>{
     const RowIcon=icons[p.id]?.[index]??programIcons[p.id]
     return <li key={index} data-program-session={index+1}>
      {p.id==='reiki'?<article className={styles.reikiWeek}>
       <div className={styles.reikiPhoto} aria-hidden="true"><RowIcon size={26}/></div>
       <div className={styles.reikiWeekCopy}><small>{p.week} {index+1}</small><h2>{title}</h2><p>{description}</p></div>
      </article>:<div className={styles.session}>
       <div className={styles.row}>
        <RowIcon className={styles.sessionIcon} size={25} aria-hidden="true"/>
        <span className={styles.number} aria-hidden="true">{String(index+1).padStart(2,'0')}</span>
        <span className={styles.sessionTitle}>{title}<small>{description}</small></span>
       </div>
      </div>}
     </li>
    })}
   </ol>}
   {p.id==='reiki'?<p className={styles.reikiNote}><Flower2 size={22} aria-hidden="true"/>{p.note}</p>:p.id==='goal'?null:start}
  </section>
 </main>
}

import {Target,Flame,ClipboardList,Leaf,ShieldCheck,Compass,Rocket,Sunrise} from 'lucide-react'
import {getGoalLanding} from '@/lib/goal-landing.mjs'
import styles from './goal-landing-sections.module.css'

const icons=[Target,Flame,ClipboardList,Leaf,ShieldCheck,Compass,Rocket,Sunrise]
export function GoalLandingBenefits({locale='en'}){
 const t=getGoalLanding(locale)
 return <section className={styles.benefits} data-goal-landing-benefits aria-label={t.benefits}>
  <h2>{t.benefits}</h2>
  <div className={styles.benefitGrid}>{t.benefitsList.map(([title,detail],index)=><div key={title} className={styles.benefit}>
   <div className={styles.benefitPhoto} data-goal-benefit-art={index} aria-hidden="true"/>
   <div><strong>{title}</strong><p>{detail}</p></div>
  </div>)}</div>
 </section>
}
export default function GoalLandingSections({locale='en',showHeading=true}){
 const t=getGoalLanding(locale)
 return <section className={styles.overview} data-goal-landing-overview aria-label={t.heading}>
  {showHeading&&<header className={styles.sectionHeading}><h2>{t.heading}</h2><p>{t.subtitle}</p></header>}
  {t.lessons.map((lesson,index)=>{
   const Icon=icons[index]
   return <article key={lesson.id} className={styles.screen} data-goal-landing-screen={lesson.id} data-program-session={index+1} aria-label={t.week+' '+lesson.number+': '+lesson.title}>
    <div className={styles.artwork} data-goal-art={lesson.id} aria-hidden="true"/>
    <div className={styles.content}>
     <div className={styles.eyebrow}><span>{lesson.number}</span>{t.week} {lesson.number} / 8</div>
     <div className={styles.stageRail} aria-hidden="true">{t.lessons.map((item,i)=><span key={item.id} data-current={i===index}/>)}</div>
     <h2><Icon size={26} aria-hidden="true"/>{lesson.title}</h2>
     <p className={styles.subtitle}>{lesson.subtitle}</p>
     <div className={styles.includes}><h3>{t.practice}</h3>
      <ul>{lesson.points.map((point,i)=><li key={point}><span aria-hidden="true">{i+1}</span>{point}</li>)}</ul>
     </div>
     <div className={styles.result}><strong>{t.result}</strong><p>{lesson.outcome}</p></div>
    </div>
   </article>
  })}
 </section>
}

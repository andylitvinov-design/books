'use client'

import {useEffect,useRef} from 'react'
import {ArrowLeft,Check,Heart,Layers3,Leaf,Sparkles,Target,UserRound} from 'lucide-react'
import {getCoachCompactProfile} from '@/lib/coaching/coach-compact-profiles.mjs'
import styles from './my-coach-compact-profile.module.css'

const copy={
  en:{profile:'Coach Profile',back:'Back',character:'Character',focus:'Focus Areas',model:'Coaching Model',features:'Key Features',brand:'Holistic House'},
  ru:{profile:'Профиль коуча',back:'Назад',character:'Характер',focus:'С чем помогает',model:'Модель коучинга',features:'Особенности',brand:'Holistic House'},
  es:{profile:'Perfil del coach',back:'Volver',character:'Carácter',focus:'Áreas de apoyo',model:'Modelo de coaching',features:'Características',brand:'Holistic House'}
}
export default function MyCoachCompactProfile({personaId,locale='en',methodId,onBack}){
  const dialogRef=useRef(null)
  const backRef=useRef(null)
  const lang=copy[locale]?locale:'en'
  const t=copy[lang]
  const profile=getCoachCompactProfile(personaId,lang,methodId)
  useEffect(()=>{
    const dialog=dialogRef.current
    if(!dialog)return
    if(!dialog.open)dialog.showModal()
    backRef.current?.focus({preventScroll:true})
    return()=>{if(dialog.open)dialog.close()}
  },[])
  if(!profile)return null
  return <dialog ref={dialogRef} className={styles.dialog}
    aria-label={t.profile+' · '+profile.name}
    onCancel={event=>{event.preventDefault();onBack?.()}}>
    <main className={styles.page} lang={lang} data-coach-profile-screen={personaId}
      data-coach-profile-method={profile.methodId}>
      <header className={styles.header}>
        <span className={styles.brand}><span className={styles.mark} aria-hidden="true">✿</span>{t.brand}</span>
        <span className={styles.language} aria-label={lang.toUpperCase()}>{lang.toUpperCase()}</span>
        <button ref={backRef} type="button" className={styles.back} onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true"/>{t.back}
        </button>
      </header>
      <section className={styles.hero} aria-label={profile.name}>
        <img src={'/images/holistic-house/my-coach-motion/'+personaId+'-still.webp'}
          alt="" loading="eager" decoding="async"/>
        <div className={styles.heroShade} aria-hidden="true"/>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><UserRound size={16} aria-hidden="true"/>{t.profile}</span>
          <h1>{profile.name}</h1><p>{profile.role}</p>
        </div>
      </section>
      <section className={styles.card}>
        <h2><Heart size={19} aria-hidden="true"/>{t.character}</h2>
        <p>{profile.character}</p>
      </section>
      <section className={styles.card}>
        <h2><Target size={19} aria-hidden="true"/>{t.focus}</h2>
        <div className={styles.focus}>{profile.focus.map(item=><span key={item}>{item}</span>)}</div>
      </section>
      <section className={styles.card}>
        <h2><Layers3 size={19} aria-hidden="true"/>{t.model}</h2>
        <strong className={styles.model}>{profile.model}</strong>
        <p className={styles.steps}>{profile.steps.map((step,index)=>
          <span key={index}>{index>0&&<b aria-hidden="true">→</b>}{step}</span>)}</p>
      </section>
      <section className={styles.card}>
        <h2><Sparkles size={19} aria-hidden="true"/>{t.features}</h2>
        <ul className={styles.features}>
          {profile.features.map(feature=><li key={feature}><Check size={16} aria-hidden="true"/>{feature}</li>)}
        </ul>
      </section>
      <blockquote className={styles.quote}>
        <Leaf size={19} aria-hidden="true"/>
        <div><p>“{profile.quote}”</p><footer>— {profile.name}</footer></div>
      </blockquote>
    </main>
  </dialog>
}

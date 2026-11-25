'use client'

import {useEffect,useRef,useState} from 'react'
import {ArrowLeft,Check,ChevronDown,ChevronRight,Compass,Heart,Languages,Layers3,Leaf,Settings2,Sparkles,Target,UserRound} from 'lucide-react'
import {getCoachCompactProfile} from '@/lib/coaching/coach-compact-profiles.mjs'
import styles from './my-coach-compact-profile.module.css'

const copy={
  en:{profile:'Coach Profile',back:'Back',character:'Character',archetype:'Archetype',style:'Style',workStyle:'How I work',mission:'My mission',signature:'Signature question',focus:'Focus Areas',model:'Coaching Model',features:'Key Features',brand:'Holistic House'},
  ru:{profile:'Профиль коуча',back:'Назад',character:'Характер',archetype:'Архетип',style:'Стиль',workStyle:'Манера работы',mission:'Моя миссия',signature:'Главный вопрос',focus:'С чем помогает',model:'Модель коучинга',features:'Особенности',brand:'Holistic House'},
  es:{profile:'Perfil del coach',back:'Volver',character:'Carácter',archetype:'Arquetipo',style:'Estilo',workStyle:'Cómo trabajo',mission:'Mi misión',signature:'Pregunta clave',focus:'Áreas de apoyo',model:'Modelo de coaching',features:'Características',brand:'Holistic House'}
}
function CoachProfileSections({profile,personaId,t}){
  return <>
    <section className={[styles.card,styles.characterCard].join(' ')}>
      <span className={styles.cardIcon}><UserRound size={29} strokeWidth={1.8} aria-hidden="true"/></span>
      <div className={styles.cardBody}>
        <h2>{t.character}</h2>
        <p>{profile.character}</p>
      </div>
    </section>
    <div className={styles.stylePassport} data-coach-style-passport={personaId}>
      <section className={[styles.card,styles.archetypeCard].join(' ')}>
        <span className={styles.cardIcon}><Layers3 size={29} strokeWidth={1.8} aria-hidden="true"/></span>
        <div className={styles.cardBody}>
          <h2>{t.archetype}</h2>
          <p className={styles.archetypeValue}>{profile.archetype}</p>
        </div>
      </section>
      <section className={[styles.card,styles.styleCard].join(' ')}>
        <span className={styles.cardIcon}><Compass size={29} strokeWidth={1.8} aria-hidden="true"/></span>
        <div className={styles.cardBody}>
          <h2>{t.style}</h2>
          <p>{profile.style}</p>
        </div>
      </section>
      <section className={[styles.card,styles.workCard].join(' ')}>
        <span className={styles.cardIcon}><Settings2 size={29} strokeWidth={1.8} aria-hidden="true"/></span>
        <div className={styles.cardBody}>
          <h2>{t.workStyle}</h2>
          <p>{profile.workStyle}</p>
        </div>
      </section>
      {personaId==='genie'&&<>
        <section className={[styles.card,styles.workCard].join(' ')}><div className={styles.cardBody}><h2>{t.mission}</h2><p>{profile.mission}</p></div></section>
        <section className={[styles.card,styles.workCard].join(' ')}><div className={styles.cardBody}><h2>{t.signature}</h2><p>{profile.signatureQuestion}</p></div></section>
      </>}
    </div>
    <section className={[styles.card,styles.modelCard].join(' ')}>
      <span className={styles.cardIcon}><Target size={29} strokeWidth={1.8} aria-hidden="true"/></span>
      <div className={styles.cardBody}>
        <h2>{t.model}</h2>
        <strong className={styles.model}>{profile.model}</strong>
        <p className={styles.steps}>{profile.steps.map((step,index)=><span key={index}>{index>0&&<b aria-hidden="true">·</b>}{step}</span>)}</p>
        {profile.specialty&&<div data-genie-compass-profile><strong className={styles.model}>{profile.specialty}</strong>
          <p className={styles.steps}>{profile.specialtySteps.map((step,index)=><span key={index}>{index>0&&<b aria-hidden="true">·</b>}{step}</span>)}</p></div>}
      </div>
      <ChevronRight className={styles.cardChevron} size={22} aria-hidden="true"/>
    </section>
    <section className={[styles.card,styles.focusCard].join(' ')}>
      <span className={styles.cardIcon}><Layers3 size={29} strokeWidth={1.8} aria-hidden="true"/></span>
      <div className={styles.cardBody}>
        <h2>{t.focus}</h2>
        <div className={styles.focus}>{profile.focus.map((item,index)=><span key={index}>{index===0?<Leaf size={14}/>:index===1?<Compass size={14}/>:<Sparkles size={14}/>} {item}</span>)}</div>
      </div>
      <ChevronRight className={styles.cardChevron} size={22} aria-hidden="true"/>
    </section>
    <section className={[styles.card,styles.featuresCard].join(' ')}>
      <span className={styles.cardIcon}><Sparkles size={29} strokeWidth={1.8} aria-hidden="true"/></span>
      <div className={[styles.cardBody,styles.featureBody].join(' ')}>
        <h2>{t.features}</h2>
        <ul className={styles.features}>{profile.features.map(feature=><li key={feature}><Check size={16} aria-hidden="true"/>{feature}</li>)}</ul>
      </div>
    </section>
    <blockquote className={styles.quote} data-quote-persona={personaId}>
      <div className={styles.quoteCopy}>
        <span className={styles.quoteMark} aria-hidden="true">“</span>
        <p>“{profile.quote}”</p>
        <footer>— {profile.name}</footer>
      </div>
    </blockquote>
  </>
}

// Display-only session price; no client payment or credit deduction occurs here.
const sessionPrice={en:'100 XP / 20 min session',ru:'100 XP / сеанс 20 мин',es:'100 XP / sesión de 20 min'}

// The same public editorial profile is available below Play without opening a dialog.
// This component has no personal-data reads, microphone access, or persistence.
export function MyCoachInlineProfile({personaId,locale='en',methodId}){
  const lang=copy[locale]?locale:'en'
  const t=copy[lang]
  const profile=getCoachCompactProfile(personaId,lang,methodId)
  if(!profile)return null
  return <section className={styles.inlineProfile} lang={lang}
    data-coach-inline-profile={personaId} data-coach-profile-method={profile.methodId}
    aria-label={t.profile+' · '+profile.name}>
    <div className={styles.inlineHeader}>
      <h2 className={styles.inlineHeading}><UserRound size={21} aria-hidden="true"/>{t.profile} · {profile.name}</h2>
      <span className={styles.priceBadge} data-coach-session-price="100xp-20min">{sessionPrice[lang]}</span>
    </div>
    <CoachProfileSections profile={profile} personaId={personaId} t={t}/>
  </section>
}

export default function MyCoachCompactProfile({personaId,locale='en',methodId,onBack}){
  const dialogRef=useRef(null)
  const backRef=useRef(null)
  const [viewLocale,setViewLocale]=useState(locale)
  useEffect(()=>setViewLocale(locale),[locale])
  const lang=copy[viewLocale]?viewLocale:'en'
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
        <label className={styles.language}><Languages size={16} aria-hidden="true"/><select aria-label="Profile language" value={lang} onChange={event=>setViewLocale(event.target.value)}><option value="en">EN</option><option value="ru">RU</option><option value="es">ES</option></select><ChevronDown size={13} aria-hidden="true"/></label>
        <button ref={backRef} type="button" className={styles.back} onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true"/>{t.back}
        </button>
      </header>
      <section className={styles.hero} aria-label={profile.name}>
        <img src={'/images/holistic-house/my-coach-motion/'+(personaId==='genie'?'genie-natural-opening-v2.webp':personaId==='harry'?'harry-soft-still.webp':personaId+'-still.webp')}
          alt="" loading="eager" decoding="async"/>
        <div className={styles.heroShade} aria-hidden="true"/>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><UserRound size={16} aria-hidden="true"/>{t.profile}</span>
          <h1>{profile.name}</h1><p>{profile.role}</p><div className={styles.heroTags}>{profile.tags.map((tag,index)=><span key={index}>{index===0?<Leaf size={14}/>:index===1?<Sparkles size={14}/>:<Heart size={14}/>} {tag}</span>)}</div>
        </div>
      </section>
      <CoachProfileSections profile={profile} personaId={personaId} t={t}/>
    </main>
  </dialog>
}

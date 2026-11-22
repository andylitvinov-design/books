'use client'
import {Check,CheckCircle2} from 'lucide-react'
import {COACH_OPENING_LABELS,COACH_OPENING_STEPS} from '@/lib/coaching/coach-opening-protocol.mjs'
import styles from './my-coach-opening-progress.module.css'

const messages={
  en:{title:'Session opening · 6 checkpoints',current:'Current',done:'Complete',waiting:'Waiting',
    invite:'Session accepted',identity:'Name · continuity',focus:'Focus chosen',ready:'Ready',
    no:'No session has been agreed. You are free to pause or end.',
    privacy:'Opening checkpoints are temporary; saving your session requires separate consent.'},
  ru:{title:'Начало сессии · 6 пунктов',current:'Сейчас',done:'Готово',waiting:'Ожидает',
    invite:'Согласие',identity:'Имя · тема',focus:'Фокус',ready:'Готовность',
    no:'Сессия не согласована. Можно сделать паузу или завершить.',
    privacy:'Начальные отметки временные; для сохранения протокола потребуется отдельное согласие.'},
  es:{title:'Inicio de sesión · 6 puntos',current:'Ahora',done:'Completado',waiting:'Pendiente',
    invite:'Aceptación',identity:'Nombre · tema',focus:'Enfoque',ready:'Preparado',
    no:'No se ha aceptado la sesión. Puedes pausar o terminar.',
    privacy:'Estas marcas son temporales; guardar la sesión requiere consentimiento aparte.'}
}
export default function MyCoachOpeningProgress({locale='en',progress=null}){
  if(!progress||!Array.isArray(progress.done)||progress.done.length!==6)return null
  const lang=COACH_OPENING_LABELS[locale]?locale:'en'
  const t=messages[lang],labels=COACH_OPENING_LABELS[lang]
  const lamps=[
    {id:'invitation',title:t.invite,on:progress.lights?.invitation},
    {id:'identity',title:t.identity,on:progress.lights?.identityAndContinuity},
    {id:'focus',title:t.focus,on:progress.lights?.focus},
    {id:'confirmation',title:t.ready,on:progress.lights?.confirmation},
  ]
  return <section className={styles.root} data-coach-opening-checkpoints
    data-coach-opening-step={progress.step} aria-label={t.title}>
    <h3 className={styles.heading}><CheckCircle2 size={17} aria-hidden="true"/>{t.title}</h3>
    <div className={styles.lamps} aria-label={t.title}>
      {lamps.map(item=><span key={item.id} className={styles.lampItem}
        data-lamp={item.id} data-active={item.on?'true':'false'}>
        <i className={styles.lamp} aria-hidden="true"/><span>{item.title}</span>
      </span>)}
    </div>
    <ol className={styles.list} data-coach-opening-checklist>
      {COACH_OPENING_STEPS.map((id,index)=>{
        const done=progress.done[index]===true
        const active=progress.step===id&&!progress.blocked
        return <li key={id} className={styles.row}
          data-opening-id={id} data-opening-status={done?'done':active?'current':'pending'}>
          <span className={styles.number}>{index+1}</span>
          <span className={styles.label}>{labels[index]}</span>
          <span className={styles.small}>{done?t.done:active?t.current:t.waiting}</span>
          <span className={styles.check} data-checked={done?'true':'false'} aria-label={labels[index]+': '+(done?t.done:t.waiting)}>
            {done&&<Check size={13} strokeWidth={3} aria-hidden="true"/>}
          </span>
        </li>
      })}
    </ol>
    {progress.blocked&&<p className={styles.no}>{t.no}</p>}
    <p className={styles.note}>{t.privacy}</p>
  </section>
}

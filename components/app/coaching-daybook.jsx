'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpenCheck, CheckCircle2, NotebookPen, Target } from 'lucide-react'
import { appFetch } from '@/lib/app/client-fetch'
import { COACH_PROFILE_AXES } from '@/lib/coaching/coach-profile-intake.mjs'
import css from './coaching-daybook.module.css'

const TEXT={
 en:{
  tag:'COACHING DAYBOOK',title:'Coaching Daybook',
  intro:'Your saved goals, practical next steps and reflections from coaching sessions.',
  goals:'Goals I am working on',steps:'My next steps',notes:'My session notes',
  axes:'Eight areas of meaning',axesIntro:'Reflect on an axis with your coach. A self-rating does not automatically choose an axis.',
  noGoals:'No active goal saved yet. Set one in My Goals & Coaching Reports.',
  noSteps:'No confirmed next step saved yet.',noNotes:'Your reviewed coaching reflections will appear here.',
  start:'Continue with a coach',edit:'Edit my goals',unavailable:'Saved details are unavailable right now.',
  measured:'My self-ratings',noRatings:'No saved introductory axis ratings yet.',
 },
 ru:{
  tag:'ДНЕВНИК КОУЧИНГА',title:'Дневник коучинга',
  intro:'Ваши сохранённые цели, следующие шаги и заметки из коуч-сессий.',
  goals:'Цели, над которыми я работаю',steps:'Мои следующие шаги',notes:'Заметки сессий',
  axes:'Восемь смысловых осей',axesIntro:'Вы можете обсудить ось с коучем. Самооценка не означает автоматический выбор оси.',
  noGoals:'Активных целей пока нет. Их можно оформить в разделе целей и отчётов.',
  noSteps:'Подтверждённых следующих шагов пока нет.',noNotes:'Здесь появятся ваши сохранённые итоги коучинга.',
  start:'Продолжить с коучем',edit:'Уточнить цели',unavailable:'Сейчас не удалось загрузить сохранённые данные.',
  measured:'Мои самооценки',noRatings:'Сохранённых оценок восьми осей пока нет.',
 },
 es:{
  tag:'DIARIO DE COACHING',title:'Diario de coaching',
  intro:'Tus metas guardadas, próximos pasos y reflexiones de las sesiones.',
  goals:'Metas en curso',steps:'Mis próximos pasos',notes:'Notas de mis sesiones',
  axes:'Ocho ejes de significado',axesIntro:'Explora un eje con tu coach. La autoevaluación no selecciona automáticamente un eje.',
  noGoals:'Todavía no hay metas activas guardadas. Puedes añadirlas en Mis metas.',
  noSteps:'Todavía no hay pasos confirmados.',noNotes:'Aquí aparecerán las reflexiones guardadas de tus sesiones.',
  start:'Continuar con un coach',edit:'Editar mis metas',unavailable:'Los datos guardados no están disponibles.',
  measured:'Mis autoevaluaciones',noRatings:'Todavía no hay valoraciones guardadas.',
 }
}
const ACTIVE=new Set(['active','accepted','in_progress'])
const ACTION=new Set(['active','accepted'])
export default function CoachingDaybook({accountId,locale='en'}){
 const lang=Object.hasOwn(TEXT,locale)?locale:'en',t=TEXT[lang]
 const [view,setView]=useState({owner:null,plan:null,protocols:[],error:false,loading:true})
 useEffect(()=>{
  if(!accountId) return undefined
  const controller=new AbortController()
  setView({owner:accountId,plan:null,protocols:[],loading:true,error:false})
  Promise.all([
   appFetch('coaching-life-plan?locale='+lang,undefined,'GET',{accountId,signal:controller.signal}),
   fetch('/api/app/my-coach/protocol',{method:'GET',credentials:'same-origin',cache:'no-store',
     headers:{'x-hh-account-id':accountId},signal:controller.signal})
    .then(r=>r.ok?r.json():null).catch(()=>null),
  ]).then(([plan,archive])=>{
   if(!controller.signal.aborted)setView({owner:accountId,plan,
     protocols:Array.isArray(archive?.protocols)?archive.protocols:[],loading:false,error:false})
  }).catch(()=>{if(!controller.signal.aborted)setView({owner:accountId,plan:null,protocols:[],loading:false,error:true})})
  return ()=>controller.abort()
 },[accountId,lang])
 const ownerView=view.owner===accountId?view:{owner:null,plan:null,protocols:[],error:false,loading:true}
 const {goals,steps,notes,ratings}=useMemo(()=>{
  const domains=Array.isArray(ownerView.plan?.domains)?ownerView.plan.domains:[]
  const goals=domains.flatMap(area=>(area.goals||[]).filter(goal=>
   ACTIVE.has(goal.status)&&typeof goal.title==='string'&&goal.title.trim()).map(goal=>({id:goal.id,title:goal.title,area:area.label,actions:goal.actions||[]}))).slice(0,4)
  const steps=goals.flatMap(goal=>goal.actions.filter(action=>ACTION.has(action.status)&&
   action.clientConfirmedAt&&typeof action.description==='string').map(action=>({id:action.id,description:action.description}))).slice(0,5)
  const notes=ownerView.protocols.filter(p=>p.provenance==='client_reviewed_dialogue'&&
   typeof p.clientSummary==='string'&&p.clientSummary.trim()).slice(0,3)
  const ratings=ownerView.protocols.find(p=>Array.isArray(p.profileCheckin?.ratings))?.profileCheckin?.ratings||[]
  return {goals,steps,notes,ratings}
 },[ownerView.plan,ownerView.protocols])
 return <section className={css.daybook} id="hh-coaching-daybook" data-coaching-daybook>
  <header className={css.header}><span><NotebookPen size={18}/>{t.tag}</span><h1>{t.title}</h1><p>{t.intro}</p></header>
  {ownerView.loading?<p className={css.message} role="status">…</p>:ownerView.error?
   <p className={css.message} role="alert">{t.unavailable}</p>:
   <div className={css.grid}>
    <article className={css.panel}><h2><Target size={22}/>{t.goals}</h2>
     {goals.length?goals.map(goal=><div className={css.record} key={goal.id}>
      <strong>{goal.title}</strong><small>{goal.area}</small></div>):<p>{t.noGoals}</p>}
     <Link href={'/'+lang+'/app/my-coaching-plan'}>{t.edit}<ArrowRight size={16}/></Link>
    </article>
    <article className={css.panel}><h2><CheckCircle2 size={22}/>{t.steps}</h2>
     {steps.length?steps.map(step=><div className={css.record} key={step.id}>{step.description}</div>):<p>{t.noSteps}</p>}
    </article>
    <article className={css.panel}><h2><BookOpenCheck size={22}/>{t.notes}</h2>
     {notes.length?notes.map(note=><div className={css.record} key={note.id}>{note.clientSummary}</div>):<p>{t.noNotes}</p>}
    </article>
   </div>}
  <section className={css.axes} id="daybook-axes">
   <h2>{t.axes}</h2><p>{t.axesIntro}</p>
   <div>{COACH_PROFILE_AXES.map(axis=><span key={axis.id}>
     {axis.name[lang]}{ratings.find(r=>r.axis===axis.id&&r.kind==='rated')?
      <small>{t.measured}: {ratings.find(r=>r.axis===axis.id).current} → {ratings.find(r=>r.axis===axis.id).desired}</small>:null}
   </span>)}</div>
  </section>
  <Link className={css.coach} href={'/'+lang+'/my-coach'} prefetch={false}>{t.start}<ArrowRight size={20}/></Link>
 </section>
}

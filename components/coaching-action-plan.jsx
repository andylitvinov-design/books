'use client'
import {useState} from 'react'
import {Check,ClipboardCheck} from 'lucide-react'
import styles from './coaching-action-plan.module.css'

const copy={
  en:{title:'My action plan',note:'Use your own words. These fields are suggested from your answers, not an AI diagnosis.',
    goal:'What I want',obstacle:'What may get in the way',action:'One action I choose',when:'When / under what condition',
    confidence:'My confidence (optional · 0–10)',unrated:'Not rated',savePrivate:'Save my private plan',saveGuest:'Confirm in this tab',
    saved:'My plan is confirmed',needed:'Please write one specific action.',failed:'Could not save. Your edits are still here.',
    privacy:'No reminders, messages, booking or practitioner sharing are created.'},
  ru:{title:'Мой план действий',note:'Исправьте формулировки своими словами. Это выдержки из ваших ответов, а не диагноз ИИ.',
    goal:'Чего я хочу',obstacle:'Что может помешать',action:'Одно действие, которое я выбираю',when:'Когда / при каком условии',
    confidence:'Моя уверенность (необязательно · 0–10)',unrated:'Не оценивать',savePrivate:'Сохранить мой личный план',saveGuest:'Подтвердить в этой вкладке',
    saved:'План подтверждён',needed:'Укажите одно конкретное действие.',failed:'Не удалось сохранить. Ваши правки остались.',
    privacy:'Напоминания, сообщения, запись и передача специалисту не создаются.'},
  es:{title:'Mi plan de acción',note:'Edita las frases con tus propias palabras. Son tus respuestas, no un diagnóstico de IA.',
    goal:'Lo que deseo',obstacle:'Qué puede dificultarlo',action:'Una acción que elijo',when:'Cuándo / en qué condición',
    confidence:'Mi confianza (opcional · 0–10)',unrated:'Sin valorar',savePrivate:'Guardar mi plan privado',saveGuest:'Confirmar en esta pestaña',
    saved:'Plan confirmado',needed:'Escribe una acción concreta.',failed:'No se guardó. Tus cambios siguen aquí.',
    privacy:'No se crean recordatorios, mensajes, reservas ni envíos al profesional.'},
}
const pick=(value,key)=>typeof value?.[key]==='string'?value[key]:''

export default function CoachingActionPlan({locale='en',initial={},onSave,privateSave=false,disabled=false}){
  const lang=copy[locale]?locale:'en',t=copy[lang]
  const [fields,setFields]=useState({
    goal:pick(initial,'goal'),obstacle:pick(initial,'obstacle'),
    actionText:pick(initial,'actionText'),when:pick(initial,'when'),
    confidence:Number.isInteger(initial?.confidence)?String(initial.confidence):'',
  })
  const [saving,setSaving]=useState(false)
  const [saved,setSaved]=useState(Boolean(initial?.approvedAt))
  const [error,setError]=useState('')
  const change=(key,value)=>{setFields(previous=>({...previous,[key]:value}));setSaved(false);setError('')}
  async function confirm(){
    if(saving||disabled)return
    if(fields.actionText.trim().length<3){setError(t.needed);return}
    setSaving(true);setError('')
    try{
      const result=await onSave({
        goal:fields.goal.trim(),obstacle:fields.obstacle.trim(),
        actionText:fields.actionText.trim(),when:fields.when.trim(),
        confidence:fields.confidence===''?null:Number(fields.confidence),
      })
      if(result===false||result===null){setError(t.failed);return}
      setSaved(true)
    }catch{setError(t.failed)}finally{setSaving(false)}
  }
  return <section className={styles.card} data-coaching-action-plan aria-label={t.title}>
    <div className={styles.heading}><ClipboardCheck size={20} aria-hidden="true"/><h2>{t.title}</h2></div>
    <p className={styles.note}>{t.note}</p>
    <div className={styles.fields}>
      {[['goal',t.goal,300],['obstacle',t.obstacle,300],['actionText',t.action,300],['when',t.when,120]].map(([key,label,max])=>
        <label key={key} className={styles.field}>{label}
          <textarea value={fields[key]} maxLength={max} rows={key==='when'?1:2} disabled={saving||disabled}
            onChange={e=>change(key,e.target.value)}/>
        </label>)}
      <label className={styles.field}>{t.confidence}
        <select value={fields.confidence} disabled={saving||disabled} onChange={e=>change('confidence',e.target.value)}>
          <option value="">{t.unrated}</option>
          {Array.from({length:11},(_,n)=><option value={n} key={n}>{n}/10</option>)}
        </select>
      </label>
    </div>
    <button className={styles.save} type="button" onClick={confirm} disabled={saving||disabled}>
      {saved?<Check size={18}/>:<ClipboardCheck size={18}/>}
      {saved?t.saved:(privateSave?t.savePrivate:t.saveGuest)}
    </button>
    {error&&<p className={styles.error} role="alert">{error}</p>}
    <p className={styles.privacy}>{t.privacy}</p>
  </section>
}

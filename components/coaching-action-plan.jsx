'use client'
import {useState} from 'react'
import {Check,ClipboardCheck} from 'lucide-react'
import {isCoachingSafetyConcern} from '@/lib/personal-coaching/model-matcher'
import {needsFeasibilityReview,canSaveFeasibility} from '@/lib/personal-coaching/feasibility.mjs'
import styles from './coaching-action-plan.module.css'

const copy={
  en:{title:'My action plan',note:'Use your own words. These fields are suggested from your answers, not an AI diagnosis.',
    goal:'What I want',obstacle:'What may get in the way',action:'One action I choose',when:'When / under what condition',
    confidence:'My confidence (optional · 0–10)',unrated:'Not rated',savePrivate:'Save my private plan',saveGuest:'Confirm in this tab',
    saved:'My plan is confirmed',needed:'Please write one specific action.',failed:'Could not save. Your edits are still here.',
    reportPrivate:'Once you save this plan, it stays in your private account and is included in the downloadable session PDF below.',
    reportGuest:'Once you confirm this plan, it stays only in this tab and can be included in the PDF below. Download before leaving.',
    privacy:'No reminders, messages, booking or practitioner sharing are created.',
    extra:'Up to two more actions (optional)',extraTwo:'Action 2',extraThree:'Action 3',
    extraWhen:'When / trigger for this action',fallback:'If an obstacle appears, I can…',
    extraNeeded:'Give each scheduled action its own description.'},
  ru:{title:'Мой план действий',note:'Исправьте формулировки своими словами. Это выдержки из ваших ответов, а не диагноз ИИ.',
    goal:'Чего я хочу',obstacle:'Что может помешать',action:'Одно действие, которое я выбираю',when:'Когда / при каком условии',
    confidence:'Моя уверенность (необязательно · 0–10)',unrated:'Не оценивать',savePrivate:'Сохранить мой личный план',saveGuest:'Подтвердить в этой вкладке',
    saved:'План подтверждён',needed:'Укажите одно конкретное действие.',failed:'Не удалось сохранить. Ваши правки остались.',
    reportPrivate:'После сохранения ваши мысли останутся в личном кабинете и войдут в PDF сессии, который можно скачать ниже.',
    reportGuest:'После подтверждения план останется только в этой вкладке и войдёт в PDF ниже. Скачайте его до выхода.',
    privacy:'Напоминания, сообщения, запись и передача специалисту не создаются.',
    extra:'До двух дополнительных действий (необязательно)',extraTwo:'Действие 2',extraThree:'Действие 3',
    extraWhen:'Когда / условие начала',fallback:'Если возникнет препятствие, я могу…',
    extraNeeded:'Укажите содержание действия, если задаёте для него срок.'},
  es:{title:'Mi plan de acción',note:'Edita las frases con tus propias palabras. Son tus respuestas, no un diagnóstico de IA.',
    goal:'Lo que deseo',obstacle:'Qué puede dificultarlo',action:'Una acción que elijo',when:'Cuándo / en qué condición',
    confidence:'Mi confianza (opcional · 0–10)',unrated:'Sin valorar',savePrivate:'Guardar mi plan privado',saveGuest:'Confirmar en esta pestaña',
    saved:'Plan confirmado',needed:'Escribe una acción concreta.',failed:'No se guardó. Tus cambios siguen aquí.',
    reportPrivate:'Al guardar el plan, tus reflexiones quedan en tu cuenta privada y se incluyen en el PDF de la sesión disponible abajo.',
    reportGuest:'Al confirmar el plan, queda solo en esta pestaña y se puede incluir en el PDF de abajo. Descárgalo antes de salir.',
    privacy:'No se crean recordatorios, mensajes, reservas ni envíos al profesional.',
    extra:'Hasta dos acciones adicionales (opcional)',extraTwo:'Acción 2',extraThree:'Acción 3',
    extraWhen:'Cuándo / condición para empezar',fallback:'Si surge un obstáculo, puedo…',
    extraNeeded:'Describe cada acción para la que establezcas un momento.'},
}
const pick=(value,key)=>typeof value?.[key]==='string'?value[key]:''

export default function CoachingActionPlan({locale='en',initial={},onSave,privateSave=false,disabled=false,lowConfidenceGuidance=false,growPilot=false}){
  const lang=copy[locale]?locale:'en',t=copy[lang]
  const [fields,setFields]=useState({
    goal:pick(initial,'goal'),obstacle:pick(initial,'obstacle'),
    actionText:pick(initial,'actionText'),when:pick(initial,'when'),
    confidence:Number.isInteger(initial?.confidence)?String(initial.confidence):'',
    fallback:pick(initial,'fallback'),
    nextActions:Array.from({length:2},(_,index)=>({
      text:pick(initial?.nextActions?.[index],'text'),when:pick(initial?.nextActions?.[index],'when'),
    })),
  })
  const [saving,setSaving]=useState(false)
  const [saved,setSaved]=useState(Boolean(initial?.approvedAt))
  const [error,setError]=useState('')
  const [feasibilityChoice,setFeasibilityChoice]=useState(['considered','keep'].includes(initial?.feasibilityReview)?initial.feasibilityReview:'')
  const change=(key,value)=>{setFields(previous=>({...previous,[key]:value}));setFeasibilityChoice('');setSaved(false);setError('')}
  async function confirm(){
    if(saving||disabled)return
    const safetyConcern=privateSave&&[fields.goal,fields.obstacle,fields.actionText,fields.when].some(isCoachingSafetyConcern)
    if(fields.actionText.trim().length<3&&!safetyConcern){setError(t.needed);return}
    if(growPilot&&fields.nextActions.some(item=>!item.text.trim()&&item.when.trim())){setError(t.extraNeeded);return}
    if(!canSaveFeasibility(lowConfidenceGuidance,fields.confidence,feasibilityChoice,safetyConcern)){
      setError(lang==='ru'?'Выберите, как вы хотите поступить с планом.':lang==='es'?'Elige cómo quieres continuar con el plan.':'Choose how you want to proceed with the plan.')
      return
    }
    setSaving(true);setError('')
    try{
      const result=await onSave({
        goal:fields.goal.trim(),obstacle:fields.obstacle.trim(),
        actionText:fields.actionText.trim(),when:fields.when.trim(),
        confidence:fields.confidence===''?null:Number(fields.confidence),
        ...(growPilot?{
          fallback:fields.fallback.trim(),
          nextActions:fields.nextActions.filter(row=>row.text.trim()).map(row=>({text:row.text.trim(),when:row.when.trim()})),
        }:{}),
        ...(privateSave&&needsFeasibilityReview(lowConfidenceGuidance,fields.confidence)&&feasibilityChoice?{feasibilityReview:feasibilityChoice}:{}),
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
          <textarea value={fields[key]} aria-describedby="hh-coaching-plan-report-note" maxLength={max} rows={key==='when'?1:2} disabled={saving||disabled}
            onChange={e=>change(key,e.target.value)}/>
        </label>)}
      {growPilot&&<label className={styles.field}>{t.fallback}
        <textarea maxLength={240} rows={2} disabled={saving||disabled} value={fields.fallback}
          onChange={e=>change('fallback',e.target.value)}/>
      </label>}
      {growPilot&&<details className={styles.extraActions}>
        <summary>{t.extra}</summary>
        {fields.nextActions.map((row,index)=><div className={styles.extraAction} key={index}>
          <label className={styles.field}>{index===0?t.extraTwo:t.extraThree}
            <textarea maxLength={300} rows={2} disabled={saving||disabled} value={row.text}
              onChange={e=>change('nextActions',fields.nextActions.map((old,i)=>i===index?{...old,text:e.target.value}:old))}/>
          </label>
          <label className={styles.field}>{t.extraWhen}
            <textarea maxLength={120} rows={1} disabled={saving||disabled} value={row.when}
              onChange={e=>change('nextActions',fields.nextActions.map((old,i)=>i===index?{...old,when:e.target.value}:old))}/>
          </label>
        </div>)}
      </details>}
      <label className={styles.field}>{t.confidence}
        <select value={fields.confidence} disabled={saving||disabled} onChange={e=>change('confidence',e.target.value)}>
          <option value="">{t.unrated}</option>
          {Array.from({length:11},(_,n)=><option value={n} key={n}>{n}/10</option>)}
        </select>
      </label>
    </div>
    {needsFeasibilityReview(lowConfidenceGuidance,fields.confidence)&&<div className={styles.feasibility} data-coaching-feasibility>
      <p>{lang==='ru'?'Если этот шаг кажется трудным, можно сделать его меньше — например, выбрать более короткое действие или удобное время. Вы решаете сами.':lang==='es'?'Si este paso parece difícil, puedes hacerlo más pequeño: por ejemplo, elegir una acción más corta o un momento adecuado. Tú decides.':'If this step feels difficult, you can make it smaller—for example, choose a shorter action or a better time. You decide.'}</p>
      <div className={styles.feasibilityChoices}>
        <button type="button" disabled={saving||disabled} aria-pressed={feasibilityChoice==='considered'} onClick={()=>{setFeasibilityChoice('considered');setSaved(false);setError('')}}>{lang==='ru'?'Я рассмотрел(а) меньший шаг':lang==='es'?'Consideré un paso más pequeño':'I considered a smaller step'}</button>
        <button type="button" disabled={saving||disabled} aria-pressed={feasibilityChoice==='keep'} onClick={()=>{setFeasibilityChoice('keep');setSaved(false);setError('')}}>{lang==='ru'?'Оставить мой план':lang==='es'?'Mantener mi plan':'Keep my plan'}</button>
      </div>
    </div>}
    <p className={styles.privacy} id="hh-coaching-plan-report-note" data-coaching-save-report-notice>{privateSave?t.reportPrivate:t.reportGuest}</p>
    <button className={styles.save} type="button" onClick={confirm} disabled={saving||disabled}>
      {saved?<Check size={18}/>:<ClipboardCheck size={18}/>}
      {saved?t.saved:(privateSave?t.savePrivate:t.saveGuest)}
    </button>
    {error&&<p className={styles.error} role="alert">{error}</p>}
    <p className={styles.privacy}>{t.privacy}</p>
  </section>
}

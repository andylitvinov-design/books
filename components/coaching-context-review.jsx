'use client'

import { useEffect,useState } from 'react'
import styles from './coaching-context-review.module.css'

const TEXT={
 en:{title:'Your previous coaching context',intro:'These are short notes from your completed sessions, not a replay of your conversations. Review and correct them before using them here. Keep up to four short lines in each field.',goals:'Goals',commitments:'Previous actions',completed:'Completed actions',topics:'Open questions',insights:'Previous insights',reports:'Related reports',life:'Life Plan changes',style:'Preferred coaching style',confirm:'Use this context',skip:'Continue without it',limit:'Use no more than four lines per field, with up to 240 characters per line.',supportive:'Supportive',direct:'Direct',reflective:'Reflective',structured:'Structured',mentor:'Mentor'},
 ru:{title:'Контекст предыдущих сессий',intro:'Это краткие заметки из завершённых сессий, а не история переписки. Проверьте и исправьте их перед использованием. В каждом поле — до четырёх коротких пунктов.',goals:'Цели',commitments:'Ранее выбранные действия',completed:'Выполненные действия',topics:'Нерешённые вопросы',insights:'Предыдущие выводы',reports:'Связанные отчёты',life:'Изменения в Life Plan',style:'Предпочтительный стиль коучинга',confirm:'Подтвердить и использовать',skip:'Продолжить без контекста',limit:'Не более четырёх строк в поле; до 240 символов в каждой.',supportive:'Поддерживающий',direct:'Прямой',reflective:'Рефлексивный',structured:'Структурированный',mentor:'Наставник'},
 es:{title:'Contexto de sesiones anteriores',intro:'Son notas breves de sesiones completadas, no una copia de las conversaciones. Revísalas y corrígelas antes de usarlas. Usa hasta cuatro líneas breves por campo.',goals:'Objetivos',commitments:'Acciones anteriores',completed:'Acciones completadas',topics:'Temas abiertos',insights:'Ideas anteriores',reports:'Informes relacionados',life:'Cambios en el Life Plan',style:'Estilo de coaching preferido',confirm:'Confirmar y usar',skip:'Continuar sin contexto',limit:'Usa hasta cuatro líneas por campo y 240 caracteres por línea.',supportive:'De apoyo',direct:'Directo',reflective:'Reflexivo',structured:'Estructurado',mentor:'Mentor'}
};
const FIELDS=['active_goals','previous_commitments','completed_actions','open_topics','previous_insights','linked_reports','life_plan_changes'];
const LABELS={active_goals:'goals',previous_commitments:'commitments',completed_actions:'completed',open_topics:'topics',previous_insights:'insights',linked_reports:'reports',life_plan_changes:'life'};
const lines=rows=>(rows||[]).map(row=>row?.text||'').filter(Boolean).join('\n');
export default function CoachingContextReview({locale='en',context,onConfirm,onSkip}){
 const t=TEXT[locale]||TEXT.en;
 const [values,setValues]=useState(()=>Object.fromEntries(FIELDS.map(key=>[key,lines(context?.[key])])));
 const [style,setStyle]=useState(context?.preferred_coaching_style||'');
 const [validation,setValidation]=useState('');
 useEffect(()=>{setValues(Object.fromEntries(FIELDS.map(key=>[key,lines(context?.[key])])));setStyle(context?.preferred_coaching_style||'');setValidation('')},[context]);
 if(!context)return null;
 function confirm(){
  const parsed=Object.fromEntries(FIELDS.map(key=>[key,values[key].split('\n').map(text=>text.trim()).filter(Boolean)]));
  if(FIELDS.some(key=>parsed[key].length>4||parsed[key].some(text=>text.length>240))){setValidation(t.limit);return;}
  setValidation('');
  const next={version:1,generatedAt:context.generatedAt,reviewStatus:'client_confirmed',
    ...Object.fromEntries(FIELDS.map(key=>[key,parsed[key].map(text=>({text,confirmed:true,status:key==='previous_commitments'?'planned':'current'}))])),
    preferred_coaching_style:style||null};
  onConfirm(next);
 }

 return <section className={styles.panel} aria-label={t.title} data-client-coaching-context>
  <h2>{t.title}</h2><p>{t.intro}</p>
  {FIELDS.map(key=><label key={key} className={styles.field}><span>{t[LABELS[key]]}</span>
    <textarea rows={2} value={values[key]} onChange={e=>setValues(previous=>({...previous,[key]:e.target.value}))}
      placeholder="—" maxLength={1000}/></label>)}
  <label className={styles.field}><span>{t.style}</span><select value={style} onChange={e=>setStyle(e.target.value)}>
    <option value="">—</option>{['supportive','direct','reflective','structured','mentor'].map(key=><option key={key} value={key}>{t[key]}</option>)}
  </select></label>
  {validation&&<p role="alert">{validation}</p>}
  <div className={styles.actions}><button type="button" onClick={confirm}>{t.confirm}</button>
    <button type="button" className={styles.secondary} onClick={onSkip}>{t.skip}</button></div>
 </section>
}

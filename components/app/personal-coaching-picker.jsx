'use client'
import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronDown, CircleHelp, LockKeyhole, Sparkles } from 'lucide-react'
import { recommendCoachingForQuestion } from '@/lib/personal-coaching/model-matcher'
import styles from './personal-coaching.module.css'

const copy={
 en:{eyebrow:'YOUR QUESTION · YOUR COACHING MODEL',title:'What would you like to explore?',
 placeholder:'For example: How do I stop putting off an important goal?',
 hint:'Write one question in your own words. It stays on this device until you select a model.',
 duration:'Time I have',recommend:'Find three coaching approaches',
 heading:'Choose the approach that suits you',notSure:'Your topic is not clear enough for a specific match. These are three general starting points; you can still choose a different model.',
 matches:'Relevant to your question',alternative:'Alternative to consider',suits:'Good for',caution:'Keep in mind',
 select:'Start this model',all:'See all available approaches',hide:'Hide other approaches',
 privacy:'Matching runs in your browser; no question is sent to AI or analytics. Your original question is saved privately only after you start the session.',
 crisis:'An urgent safety concern deserves direct human support, not self-coaching. If you are in immediate danger, contact local emergency services or a trusted qualified professional.',
 min:'Please enter at least eight characters.',time:'min',new:'A new private coaching session',
 },
 ru:{eyebrow:'ВАШ ВОПРОС · ВАША МОДЕЛЬ',title:'Какой вопрос хотите разобрать?',
 placeholder:'Например: как перестать откладывать важную цель?',
 hint:'Напишите вопрос своими словами. До выбора модели он остаётся только на вашем устройстве.',
 duration:'Время сессии',recommend:'Подобрать три модели коучинга',
 heading:'Выберите подходящий подход',notSure:'Недостаточно признаков для точного подбора. Ниже три универсальных варианта; вы можете выбрать другую модель.',
 matches:'По вашему запросу',alternative:'Дополнительный вариант',suits:'Когда подходит',caution:'Важно учитывать',
 select:'Пройти по этой модели',all:'Все доступные модели',hide:'Скрыть остальные',
 privacy:'Подбор происходит в браузере: вопрос не отправляется в ИИ или аналитику. После начала он сохраняется только в защищённом личном кабинете.',
 crisis:'Вопрос о непосредственной опасности требует живой помощи, а не самостоятельного коучинга. При угрозе безопасности обращайтесь в местные экстренные службы или к квалифицированному специалисту.',
 min:'Введите вопрос не короче восьми символов.',time:'мин',new:'Новая личная коуч-сессия',
 },
 es:{eyebrow:'TU PREGUNTA · TU MODELO',title:'¿Qué pregunta quieres explorar?',
 placeholder:'Por ejemplo: ¿cómo dejo de posponer un objetivo importante?',
 hint:'Escribe una pregunta. Permanece en este dispositivo hasta que elijas un modelo.',
 duration:'Tiempo disponible',recommend:'Encontrar tres enfoques',
 heading:'Elige el enfoque que prefieras',notSure:'No hay suficientes señales para una coincidencia específica; estos son tres enfoques generales.',
 matches:'Relacionados con tu pregunta',alternative:'Otra opción',suits:'Adecuado para',caution:'Ten en cuenta',
 select:'Empezar con este modelo',all:'Ver todos los enfoques',hide:'Ocultar los demás',
 privacy:'La selección se calcula en tu navegador. No se envía a IA ni a analíticas; se guarda de forma privada al iniciar.',
 crisis:'El peligro inmediato requiere ayuda humana directa, no autocoaching. Contacta los servicios de emergencia locales.',
 min:'Escribe al menos ocho caracteres.',time:'min',new:'Nueva sesión privada',
 }
}
const translated=(value,lang)=>value?.[lang]||value?.en||''
export default function PersonalCoachingPicker({locale='en',catalog,onChoose,busy=false,error='',isNew=false}){
 const lang=copy[locale]?locale:'en',t=copy[lang]
 const [question,setQuestion]=useState('')
 const [minutes,setMinutes]=useState(20)
 const [showRecommendations,setShowRecommendations]=useState(false)
 const [showAll,setShowAll]=useState(false)
 const selection=useMemo(()=>recommendCoachingForQuestion(question,catalog,{minutes}),[question,catalog,minutes])
 const all=useMemo(()=>{
   const unique=new Set()
   return (catalog?.schemes||[]).filter(s=>{
     if(unique.has(s.modelKey))return false
     unique.add(s.modelKey)
     return true
   }).map(s=>({schemeKey:s.schemeKey,modelKey:s.modelKey,scheme:s,
       model:(catalog.models||[]).find(m=>m.modelKey===s.modelKey),
       fallback:true,matchedTags:[]}))
 },[catalog])
 function search(e){
   e.preventDefault()
   if(question.trim().length<8)return
   setShowRecommendations(true)
   setShowAll(false)
 }
 const matchedNames=suggestion=>suggestion.matchedTags.map(tag=>
   translated(catalog.signals.find(signal=>signal.tag===tag)?.label,lang)).filter(Boolean)
 const renderCard=(suggestion,i,extra=false)=>{
   const model=suggestion.model,scheme=suggestion.scheme
   if(!model||!scheme)return null
   const matches=matchedNames(suggestion)
   return <article className={styles.modelCard} key={suggestion.schemeKey}
       data-coaching-model-choice={suggestion.schemeKey}>
     <div className={styles.modelCardHeading}>
       <span className={styles.modelNumber}>{extra?<CircleHelp size={17}/>:i+1}</span>
       <div>
         <h3>{translated(model.name,lang)}</h3>
         <span>{translated(scheme.name,lang)} · {scheme.minutes} {t.time}</span>
       </div>
     </div>
     <p className={styles.modelDescription}>{translated(model.selectionComment,lang)||translated(model.focus,lang)}</p>
     {matches.length>0 && <p className={styles.modelMatch}><CheckCircle2 size={15}/>
       {t.matches}: {matches.join(' · ')}</p>}
     {(!matches.length||suggestion.fallback)&&
       <p className={styles.modelFallback}>{t.alternative}</p>}
     <details className={styles.modelDetails}>
       <summary>{t.caution}<ChevronDown size={14}/></summary>
       <p>{translated(model.caution,lang)}</p>
     </details>
     <button type="button" className={styles.modelSelect} disabled={busy||selection.blocked}
       onClick={()=>onChoose(suggestion,question.trim())}>
       {busy?'…':t.select}<ArrowRight size={16}/>
     </button>
   </article>
 }
 return <div className={styles.picker} data-coaching-intake>
   <span className={styles.eyebrow}>{t.eyebrow}</span>
   {isNew&&<p className={styles.modelFallback}>{t.new}</p>}
   <h1>{t.title}</h1>
   <p className={styles.lead}>{t.hint}</p>
   <form className={styles.questionForm} onSubmit={search}>
     <label htmlFor="hh-coaching-client-question" className={styles.answerLabel}>{t.title}</label>
     <textarea id="hh-coaching-client-question" name="coaching-question"
       value={question} rows={3} minLength={8} maxLength={600} required
       className={styles.textarea} placeholder={t.placeholder} disabled={busy}
       onChange={event=>{setQuestion(event.target.value);setShowRecommendations(false)}} />
     <span className={styles.counter}>{question.length}/600</span>
     <fieldset className={styles.durationFields}><legend>{t.duration}</legend>
       {[10,20,30].map(time=><label key={time} className={styles.durationChoice}>
         <input type="radio" name="session-minutes" value={time} checked={minutes===time}
           onChange={()=>{setMinutes(time);setShowRecommendations(false)}} disabled={busy}/>
         <span>{time} {t.time}</span>
       </label>)}
     </fieldset>
     <button className={styles.primary} disabled={busy||question.trim().length<8} type="submit">
       <Sparkles size={18}/>{t.recommend}<ArrowRight size={17}/>
     </button>
   </form>
   <p className={styles.privacyNote}><LockKeyhole size={14}/>{t.privacy}</p>
   {error&&<p className={styles.error} role="alert">{error}</p>}
   {showRecommendations&&selection.blocked&&<p className={styles.error} role="alert">{t.crisis}</p>}
   {showRecommendations&&!selection.blocked&&<>
     <h2 className={styles.modelListTitle}>{t.heading}</h2>
     {!selection.recognized&&<p className={styles.modelFallback}>{t.notSure}</p>}
     <div className={styles.modelList} data-coaching-three-models>
       {selection.suggestions.map((s,i)=>renderCard(s,i))}
     </div>
     <button type="button" className={styles.secondary} aria-expanded={showAll}
       onClick={()=>setShowAll(v=>!v)}>{showAll?t.hide:t.all}</button>
     {showAll&&<div className={styles.modelList} data-coaching-all-models>{
       all.filter(s=>!selection.suggestions.some(r=>r.modelKey===s.modelKey))
         .map((s,i)=>renderCard(s,i,true))
     }</div>}
   </>}
 </div>
}

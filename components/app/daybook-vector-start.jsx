'use client'
import {useEffect,useRef,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {createVectorGoalSession} from '@/lib/app/daybook-vector-session.mjs'
import {VECTOR_SPHERES,VECTOR_AXES,vectorDraftPairComplete,vectorDraftTrackComplete,vectorSelectionFromDraft} from '@/lib/app/daybook-vector-selection.mjs'
import DaybookVectorSummary from './daybook-vector-summary'
import css from './daybook-vector-start.module.css'
const COPY={
 en:{title:'0. Choose your direction',intro:'Explore four life spheres and eight meaning axes. Choose where they meet and write the goal you want to pursue.',steps:['Life spheres','Meaning axes','My direction'],question:'Question',now:'Now',desired:'Desired',ratingHint:'How satisfied are you now, and where would you like to be? Choose two numbers from 0 to 10.',empty:'Choose',back:'Back',next:'Next',review:'Choose my vector',sphere:'Where do I want change?',axis:'Which inner quality will support this change?',intersection:'My development vector',statement:'In which direction do I want to move?',example:'For example: build a steady income while choosing work that reflects my values.',why:'Why this matters to me (optional)',save:'Save my goal',saving:'Saving and checking…',saved:'Your goal is saved',savedHint:'Your goal card and these self-ratings are saved in your private account. You can open and continue this goal later.',done:'Open my goals',failed:'Saving could not be confirmed. Your answers remain on this screen. Retry the same save before editing.',retry:'Retry saving',invalid:'Complete all four spheres and eight axes, choose their intersection and write your direction.',privacy:'These 0–10 self-ratings describe your own experience. They are not a diagnostic test. Saving creates a private goal; it does not send your answers to a coach.',draft:'Answers stay on this page until you save the goal. Leaving the page clears an unsaved draft.',delta:'Change',reviewScores:'Review my answers'},
 ru:{title:'0. Выбор направления',intro:'Оцените четыре сферы жизни и восемь смысловых осей. Выберите их пересечение и сформулируйте цель, к которой хотите двигаться.',steps:['Сферы жизни','Смысловые оси','Мой вектор'],question:'Вопрос',now:'Сейчас',desired:'Хочу',ratingHint:'Насколько вы довольны сейчас и какого состояния хотите? Выберите две оценки от 0 до 10.',empty:'Выбрать',back:'Назад',next:'Дальше',review:'Выбрать вектор',sphere:'В какой сфере я хочу изменений?',axis:'Какое внутреннее качество поддержит эти изменения?',intersection:'Мой вектор развития',statement:'В каком направлении я хочу двигаться?',example:'Например: создать устойчивый доход, выбирая работу, которая соответствует моим ценностям.',why:'Почему это важно для меня (необязательно)',save:'Сохранить мою цель',saving:'Сохраняем и проверяем…',saved:'Ваша цель сохранена',savedHint:'Карточка цели и эти самооценки сохранены в личном кабинете. Вы сможете открыть цель и продолжить работу позже.',done:'К моим целям',failed:'Сохранение пока не подтверждено. Ответы остались на этом экране. Повторите сохранение перед изменением.',retry:'Повторить сохранение',invalid:'Заполните четыре сферы и восемь осей, выберите их пересечение и напишите направление.',privacy:'Самооценки 0–10 отражают ваши ощущения. Это не диагностический тест. При сохранении создаётся личная цель; ответы не отправляются коучу.',draft:'Ответы остаются на этой странице до сохранения цели. При уходе несохранённый черновик очищается.',delta:'Изменение',reviewScores:'Проверить мои ответы'},
 es:{title:'0. Elige tu dirección',intro:'Explora cuatro ámbitos de vida y ocho ejes de sentido. Elige su intersección y escribe la meta que quieres seguir.',steps:['Ámbitos de vida','Ejes de sentido','Mi dirección'],question:'Pregunta',now:'Ahora',desired:'Deseado',ratingHint:'¿Cómo te sientes ahora y dónde te gustaría estar? Elige dos valores del 0 al 10.',empty:'Elegir',back:'Anterior',next:'Siguiente',review:'Elegir mi vector',sphere:'¿En qué ámbito quiero un cambio?',axis:'¿Qué cualidad interior apoyará este cambio?',intersection:'Mi vector de desarrollo',statement:'¿En qué dirección quiero avanzar?',example:'Por ejemplo: crear ingresos estables eligiendo un trabajo acorde con mis valores.',why:'Por qué es importante para mí (opcional)',save:'Guardar mi meta',saving:'Guardando y verificando…',saved:'Tu meta está guardada',savedHint:'La ficha de tu meta y estas valoraciones están guardadas en tu cuenta privada. Podrás abrir la meta y continuar más tarde.',done:'Abrir mis metas',failed:'No se pudo confirmar el guardado. Tus respuestas siguen en esta pantalla. Reintenta el mismo guardado antes de editar.',retry:'Reintentar guardado',invalid:'Completa los cuatro ámbitos y ocho ejes, elige su intersección y escribe tu dirección.',privacy:'Estas valoraciones del 0 al 10 describen tu experiencia. No son una prueba diagnóstica. Guardar crea una meta privada; no envía tus respuestas a un coach.',draft:'Las respuestas permanecen en esta página hasta guardar la meta. Salir borra el borrador sin guardar.',delta:'Cambio',reviewScores:'Revisar mis respuestas'},
}
const SCORES=Array.from({length:11},(_,index)=>String(index))
export default function DaybookVectorStart({accountId,locale='en',editorSession=null,onSaved,onSessionLost,onDone}){
 const lang=COPY[locale]?locale:'en',c=COPY[lang]
 const [state,setState]=useState(null),active=useRef(null),notified=useRef(null),question=useRef(null)
 const callbacks=useRef({onSaved,onSessionLost})
 useEffect(()=>{callbacks.current={onSaved,onSessionLost}},[onSaved,onSessionLost])
 useEffect(()=>{
  if(!accountId){setState(null);active.current=null;return}
  const session=editorSession||createVectorGoalSession(appFetch,accountId)
  active.current=session;setState(session.snapshot())
  const unsubscribe=session.subscribe(()=>setState(session.snapshot()))
  return ()=>{unsubscribe();if(!editorSession)session.dispose()}
 },[accountId,editorSession])
 useEffect(()=>{
  if(state?.owner!==accountId)return
  if(state.status==='signed-out')callbacks.current.onSessionLost?.()
  if(state.status==='saved'&&state.result&&notified.current!==state.result){notified.current=state.result;callbacks.current.onSaved?.(state.result,accountId)}
 },[state,accountId])
 useEffect(()=>{question.current?.focus()},[state?.step,state?.index])
 if(!accountId||!state||state.owner!==accountId||!state.draft)return null
 const {draft,step,index,status,busy,result}=state,locked=busy||status==='failed'
 const items=step===0?VECTOR_SPHERES:VECTOR_AXES,track=step===0?'spheres':'axes',item=items[index]
 const value=draft[track]?.[item?.id]
 const change=(key,value)=>active.current?.change(key,value)
 const position=(step,index=0)=>active.current?.position(step,index)
 const previous=()=>index>0?position(step,index-1):step>0?position(step-1,step===1?3:7):null
 const next=()=>index+1<items.length?position(step,index+1):position(step+1)
 const selectedSphere=VECTOR_SPHERES.find(item=>item.id===draft.sphereId),selectedAxis=VECTOR_AXES.find(item=>item.id===draft.axisId)
 const ready=Boolean(vectorSelectionFromDraft(draft))
 const complete=vectorDraftTrackComplete(draft.spheres,VECTOR_SPHERES)&&vectorDraftTrackComplete(draft.axes,VECTOR_AXES)
 async function submit(event){event.preventDefault();await active.current?.save()}
 const options=(values,key,ratings)=>values.map(option=>{
  const row=ratings[option.id]
  return <label key={option.id} className={css.choice} data-selected={draft[key]===option.id}>
   <input type="radio" name={key+'-'+draft.id} value={option.id} checked={draft[key]===option.id} disabled={locked} onChange={()=>change(key,option.id)}/>
   <span><strong>{option.name[lang]}</strong><small>{row.current} → {row.desired} /10</small></span>
  </label>
 })
 return <section className={css.wizard} data-daybook-vector-start data-hh-design="warm-sunrise">
  <header><p className={css.eyebrow}>DAYBOOK · 0 + 8</p><h2>{result?c.saved:c.title}</h2><p>{result?c.savedHint:c.intro}</p></header>
  {result?<div role="status"><h3 className={css.goalTitle}>{result.title}</h3><DaybookVectorSummary value={result.vectorSelection} locale={lang}/>{onDone&&<button type="button" className={css.primary} onClick={onDone}>{c.done}</button>}</div>:<>
   <ol className={css.steps} aria-label={c.title}>{c.steps.map((label,i)=><li key={label} aria-current={step===i?'step':undefined}><span aria-hidden="true">{i+1}</span><strong>{label}</strong></li>)}</ol>
   <form onSubmit={submit}>
    {step<2?<section className={css.question} aria-labelledby={'vector-question-'+draft.id}>
     <p className={css.counter}>{c.question} {index+1} / {items.length}</p>
     <h3 id={'vector-question-'+draft.id} ref={question} tabIndex={-1}>{item.name[lang]}</h3><p>{item.detail[lang]}</p>
     <p className={css.hint}>{c.ratingHint}</p>
     <div className={css.ratings}>{['current','desired'].map(key=><label key={key}>
      <span>{key==='current'?c.now:c.desired}</span><select required value={value[key]} disabled={locked} aria-label={item.name[lang]+': '+(key==='current'?c.now:c.desired)} onChange={event=>active.current?.rate(track,item.id,key,event.target.value)}>
       <option value="">{c.empty}</option>{SCORES.map(score=><option key={score} value={score}>{score} / 10</option>)}
      </select>
     </label>)}</div>
     <div className={css.navigation}><button type="button" className={css.secondary} disabled={locked||step===0&&index===0} onClick={previous}>{c.back}</button><button type="button" className={css.primary} disabled={locked||!vectorDraftPairComplete(value)} onClick={next}>{step===1&&index===7?c.review:c.next}</button></div>
    </section>:<section className={css.review}>
     <h3 ref={question} tabIndex={-1}>{c.intersection}</h3>
     <fieldset disabled={locked}><legend>{c.sphere}</legend><div className={css.choices}>{options(VECTOR_SPHERES,'sphereId',draft.spheres)}</div></fieldset>
     <fieldset disabled={locked}><legend>{c.axis}</legend><div className={css.choices}>{options(VECTOR_AXES,'axisId',draft.axes)}</div></fieldset>
     {selectedSphere&&selectedAxis&&<p className={css.intersection}>{selectedSphere.name[lang]} <span aria-hidden="true">×</span> {selectedAxis.name[lang]}</p>}
     <label className={css.statement}>{c.statement}<textarea required rows={4} maxLength={1000} value={draft.statement} disabled={locked} onChange={event=>change('statement',event.target.value)} placeholder={c.example}/></label>
     <label className={css.statement}>{c.why}<textarea rows={2} maxLength={4000} value={draft.why} disabled={locked} onChange={event=>change('why',event.target.value)}/></label>
     {!complete&&<p className={css.error}>{c.invalid}</p>}
     <button type="button" className={css.secondary} disabled={locked} onClick={()=>position(0)}>{c.reviewScores}</button>
     <button type="submit" className={css.primary} disabled={busy||!ready}>{busy?c.saving:status==='failed'?c.retry:c.save}</button>
    </section>}
    {['failed','invalid'].includes(status)&&<p className={css.error} role="alert">{c[status]}</p>}
   </form>
   <p className={css.hint}>{c.privacy}</p><p className={css.hint}>{c.draft}</p>
  </>}
 </section>
}

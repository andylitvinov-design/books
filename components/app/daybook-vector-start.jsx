'use client'
import {useEffect,useRef,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {createVectorGoalSession} from '@/lib/app/daybook-vector-session.mjs'
import {VECTOR_SPHERES,VECTOR_FOCUSES,VECTOR_AXES,vectorDraftStepComplete,vectorSelectionFromDraft,vectorCombinationLabel} from '@/lib/app/daybook-vector-selection.mjs'
import DaybookVectorSummary,{VectorSelectedRatings} from './daybook-vector-summary'
import css from './daybook-vector-start.module.css'
const COPY={
 en:{title:'Create a new goal',intro:'Choose a life sphere and an inner quality, rate where you are and where you want to be, then write your goal.',steps:['Life sphere','Meaning axis','My goal'],sphereQuestion:'Where do you want a change?',axisQuestion:'What inner quality do you want to develop?',sphere:'Choose one life sphere',focus:'What would you like to focus on?',axis:'Choose one of eight meaning axes',now:'Now',desired:'Desired',ratingHint:'How satisfied are you now, and where would you like to be? Choose two numbers from 0 to 10.',empty:'Choose',back:'Back',next:'Next',review:'See my direction',intersection:'Your development direction',suggestion:'This combination can guide your goal. Describe the result you want in your own words.',statement:'My goal',example:'What concrete change do you want to make?',why:'Why this matters to me (optional)',save:'Save my goal',saving:'Saving and checking…',saved:'Your goal is saved',savedHint:'Your goal card and these self-ratings are saved in your private account. You can open and continue this goal later.',done:'Open my goals',failed:'Saving could not be confirmed. Your answers remain here. Retry the same save before editing.',retry:'Retry saving',invalid:'Choose a life sphere, a focus and one meaning axis, enter both pairs of ratings and write your goal.',privacy:'These self-ratings describe your own experience; they are not a diagnostic test. Your goal is private and is not sent to a coach automatically.',draft:'Your answers stay on this page until you save. Leaving the page clears an unsaved draft.'},
 ru:{title:'Создать новую цель',intro:'Выберите сферу жизни и внутреннее качество, оцените «сейчас» и «хочу», затем сформулируйте свою цель.',steps:['Сфера жизни','Смысловая ось','Моя цель'],sphereQuestion:'Где вы хотите изменений?',axisQuestion:'Какое внутреннее качество хотите развивать?',sphere:'Выберите одну сферу жизни',focus:'На чём хотите сосредоточиться?',axis:'Выберите одну из восьми смысловых осей',now:'Сейчас',desired:'Хочу',ratingHint:'Насколько вы довольны сейчас и какого состояния хотите? Выберите две оценки от 0 до 10.',empty:'Выбрать',back:'Назад',next:'Дальше',review:'Посмотреть мой вектор',intersection:'Ваш вектор развития',suggestion:'Это сочетание поможет сформулировать цель. Опишите своими словами, какого результата вы хотите.',statement:'Моя цель',example:'Что конкретно вы хотите изменить или получить?',why:'Почему это важно для меня (необязательно)',save:'Сохранить мою цель',saving:'Сохраняем и проверяем…',saved:'Ваша цель сохранена',savedHint:'Карточка цели и эти самооценки сохранены в личном кабинете. Вы сможете открыть цель и продолжить работу позже.',done:'К моим целям',failed:'Сохранение пока не подтверждено. Ответы остались здесь. Повторите сохранение перед изменением.',retry:'Повторить сохранение',invalid:'Выберите сферу, направление и одну смысловую ось, укажите обе пары оценок и напишите цель.',privacy:'Самооценки отражают ваши ощущения. Это не диагностический тест. Цель остаётся личной и не передаётся коучу автоматически.',draft:'Ответы остаются на этой странице до сохранения. При уходе несохранённый черновик очищается.'},
 es:{title:'Crear una nueva meta',intro:'Elige un ámbito de vida y una cualidad interior, valora cómo estás y cómo quieres estar, y escribe tu meta.',steps:['Ámbito de vida','Eje de sentido','Mi meta'],sphereQuestion:'¿Dónde quieres un cambio?',axisQuestion:'¿Qué cualidad interior quieres desarrollar?',sphere:'Elige un ámbito de vida',focus:'¿En qué quieres centrarte?',axis:'Elige uno de los ocho ejes de sentido',now:'Ahora',desired:'Deseado',ratingHint:'¿Cómo te sientes ahora y dónde te gustaría estar? Elige dos valores del 0 al 10.',empty:'Elegir',back:'Anterior',next:'Siguiente',review:'Ver mi dirección',intersection:'Tu dirección de desarrollo',suggestion:'Esta combinación puede orientar tu meta. Describe con tus palabras el resultado que quieres.',statement:'Mi meta',example:'¿Qué cambio concreto quieres conseguir?',why:'Por qué es importante para mí (opcional)',save:'Guardar mi meta',saving:'Guardando y verificando…',saved:'Tu meta está guardada',savedHint:'La ficha de tu meta y estas valoraciones están guardadas en tu cuenta privada. Podrás abrir la meta y continuar más tarde.',done:'Abrir mis metas',failed:'No se pudo confirmar el guardado. Tus respuestas siguen aquí. Reintenta el mismo guardado antes de editar.',retry:'Reintentar guardado',invalid:'Elige un ámbito, un enfoque y un eje de sentido, indica ambos pares de valores y escribe tu meta.',privacy:'Estas valoraciones describen tu experiencia; no son una prueba diagnóstica. Tu meta es privada y no se envía a un coach automáticamente.',draft:'Las respuestas permanecen en esta página hasta guardar. Salir borra el borrador sin guardar.'},
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
 useEffect(()=>{question.current?.focus()},[state?.step])
 if(!accountId||!state||state.owner!==accountId||!state.draft)return null
 const {draft,step,status,busy,result}=state,locked=busy||status==='failed'
 const change=(key,value)=>active.current?.change(key,value)
 const position=step=>active.current?.position(step)
 const selectedSphere=VECTOR_SPHERES.find(item=>item.id===draft.sphereId),selectedAxis=VECTOR_AXES.find(item=>item.id===draft.axisId)
 const focuses=VECTOR_FOCUSES.filter(item=>item.sphereId===draft.sphereId),selectedFocus=focuses.find(item=>item.id===draft.focusId)
 const ready=Boolean(vectorSelectionFromDraft(draft)),stepReady=vectorDraftStepComplete(draft,step)
 const combination=vectorCombinationLabel(draft,lang)
 async function submit(event){event.preventDefault();if(step<2){if(stepReady)position(step+1);return}await active.current?.save()}
 const options=(values,key)=>values.map(option=><label key={option.id} className={css.choice} data-selected={draft[key]===option.id}>
  <input type="radio" name={key+'-'+draft.id} value={option.id} checked={draft[key]===option.id} disabled={locked} onChange={()=>change(key,option.id)}/>
  <span><strong>{option.name[lang]}</strong>{option.detail&&<small>{option.detail[lang]}</small>}</span>
 </label>)
 const ratings=(track,id,title)=><section className={css.ratingSection} aria-label={title}>
  <h4>{title}</h4><p className={css.hint}>{c.ratingHint}</p>
  <div className={css.ratings}>{['current','desired'].map(key=><label key={key}>
   <span>{key==='current'?c.now:c.desired}</span><select required value={draft[track][id]?.[key]??''} disabled={locked} aria-label={title+': '+(key==='current'?c.now:c.desired)} onChange={event=>active.current?.rate(track,id,key,event.target.value)}>
    <option value="">{c.empty}</option>{SCORES.map(score=><option key={score} value={score}>{score} / 10</option>)}
   </select>
  </label>)}</div>
 </section>
 return <section className={css.wizard} data-daybook-vector-start data-hh-design="warm-sunrise">
  <header><p className={css.eyebrow}>DAYBOOK · 0 + 8</p><h2>{result?c.saved:c.title}</h2><p>{result?c.savedHint:c.intro}</p></header>
  {result?<div role="status"><h3 className={css.goalTitle}>{result.title}</h3><DaybookVectorSummary value={result.vectorSelection} locale={lang}/>{onDone&&<button type="button" className={css.primary} onClick={onDone}>{c.done}</button>}</div>:<>
   <ol className={css.steps} aria-label={c.title}>{c.steps.map((label,i)=><li key={label} aria-current={step===i?'step':undefined}><span aria-hidden="true">{i+1}</span><strong>{label}</strong></li>)}</ol>
   <form onSubmit={submit}>
    {step<2?<section className={css.question} aria-labelledby={'vector-question-'+draft.id}>
     <h3 id={'vector-question-'+draft.id} ref={question} tabIndex={-1}>{step===0?c.sphereQuestion:c.axisQuestion}</h3>
     {step===0?<>
      <fieldset disabled={locked}><legend>{c.sphere}</legend><div className={css.choices}>{options(VECTOR_SPHERES,'sphereId')}</div></fieldset>
      {focuses.length>1&&<fieldset disabled={locked}><legend>{c.focus}</legend><div className={css.choices}>{options(focuses,'focusId')}</div></fieldset>}
      {selectedFocus&&ratings('spheres',selectedSphere.id,selectedSphere.name[lang]+' · '+selectedFocus.name[lang])}
     </>:<>
      <fieldset disabled={locked}><legend>{c.axis}</legend><div className={css.choices}>{options(VECTOR_AXES,'axisId')}</div></fieldset>
      {selectedAxis&&ratings('axes',selectedAxis.id,selectedAxis.name[lang])}
     </>}
     <div className={css.navigation}>{step>0&&<button type="button" className={css.secondary} disabled={locked} onClick={()=>position(step-1)}>{c.back}</button>}<button type="button" className={css.primary} disabled={locked||!stepReady} onClick={()=>position(step+1)}>{step===1?c.review:c.next}</button></div>
    </section>:<section className={css.review}>
     <h3 ref={question} tabIndex={-1}>{c.intersection}</h3>
     <p className={css.intersection} data-vector-combination>{combination}</p>
     <VectorSelectedRatings value={draft} locale={lang}/>
     <p>{c.suggestion}</p>
     <label className={css.statement}>{c.statement}<textarea required rows={4} maxLength={1000} value={draft.statement} disabled={locked} onChange={event=>change('statement',event.target.value)} placeholder={c.example}/></label>
     <label className={css.statement}>{c.why}<textarea rows={2} maxLength={4000} value={draft.why} disabled={locked} onChange={event=>change('why',event.target.value)}/></label>
     <div className={css.navigation}><button type="button" className={css.secondary} disabled={locked} onClick={()=>position(1)}>{c.back}</button><button type="submit" className={css.primary} disabled={busy||!ready}>{busy?c.saving:status==='failed'?c.retry:c.save}</button></div>
    </section>}
    {['failed','invalid'].includes(status)&&<p className={css.error} role="alert">{c[status]}</p>}
   </form>
   <p className={css.hint}>{c.privacy}</p><p className={css.hint}>{c.draft}</p>
  </>}
 </section>
}

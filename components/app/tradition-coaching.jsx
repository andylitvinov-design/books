'use client'

import {useCallback,useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {ArrowRight,Check,ChevronLeft,LockKeyhole,ScrollText,Trash2,X} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import {traditionCourse} from '@/lib/personal-coaching/traditions'
import CoachingQuestionVoice from './coaching-question-voice'
import base from './personal-coaching.module.css'
import extra from './tradition-coaching.module.css'

const words={
 en:{private:'Private',load:'Loading your course…',loadError:'Could not open the private course.',retry:'Try again',start:'Start this course',again:'Start a new journey',back:'Back',continue:'Save & continue',finish:'Save & finish',save:'Saving…',skip:'Skip this reflection',question:'QUESTION',of:'OF',note:'My own words (optional)',placeholder:'Add a short detail, or dictate it…',noteHelp:'A quick choice is enough; you do not have to write.',notChosen:'Choose an answer before continuing.',saved:'Saved to My Courses',error:'Could not save. Your answer is still on this screen.',conflict:'Your course changed in another tab. Reload before editing.',unsaved:'This answer has not been saved. Leave without saving?',complete:'Course completed',result:'My personal goal map',action:'The step I chose',history:'Previous sessions',empty:'Not answered',home:'My Courses',delete:'Delete this course history',confirm:'Delete this course and all its saved answers? The other coaching courses are not affected.',privacy:'Your answers are encrypted in your account. Nothing is sent to a practitioner, CRM or messenger.',pace:'One question on each screen · take your time',introNote:'Symbolic self-reflection, not a clinical test or a promise of results.',own:'Your note',review:'Review my answers'},
 ru:{private:'Личное',load:'Открываем ваш курс…',loadError:'Не удалось открыть личный курс.',retry:'Повторить',start:'Начать курс',again:'Начать курс заново',back:'Назад',continue:'Сохранить и далее',finish:'Сохранить и завершить',save:'Сохраняем…',skip:'Пропустить этот вопрос',question:'ВОПРОС',of:'ИЗ',note:'Своими словами (необязательно)',placeholder:'Добавьте короткое уточнение или продиктуйте…',noteHelp:'Достаточно выбрать вариант. Писать необязательно.',notChosen:'Выберите вариант ответа, чтобы продолжить.',saved:'Сохранено в «Моих курсах»',error:'Не удалось сохранить ответ. Он остался на экране.',conflict:'Курс изменился в другой вкладке. Загрузите актуальные ответы.',unsaved:'Этот ответ не сохранён. Выйти без сохранения?',complete:'Курс завершён',result:'Моя карта цели',action:'Мой ближайший шаг',history:'Предыдущие прохождения',empty:'Без ответа',home:'Мои курсы',delete:'Удалить записи этого курса',confirm:'Удалить этот курс и все его ответы? Другие коучинговые курсы сохранятся.',privacy:'Ответы зашифрованы в личном кабинете. Ничего не уходит мастеру, в CRM или мессенджер.',pace:'Один вопрос на экран · в своём темпе',introNote:'Символическая практика самоисследования, не клинический тест и не гарантия результата.',own:'Ваше уточнение',review:'Посмотреть мои ответы'},
 es:{private:'Privado',load:'Abriendo tu curso…',loadError:'No se pudo abrir el curso privado.',retry:'Reintentar',start:'Empezar el curso',again:'Empezar otra vez',back:'Atrás',continue:'Guardar y continuar',finish:'Guardar y terminar',save:'Guardando…',skip:'Omitir esta pregunta',question:'PREGUNTA',of:'DE',note:'En mis palabras (opcional)',placeholder:'Añade una nota o dícala…',noteHelp:'Basta con elegir una opción; escribir es opcional.',notChosen:'Elige una opción para continuar.',saved:'Guardado en Mis cursos',error:'No se pudo guardar. La respuesta sigue aquí.',conflict:'El curso cambió en otra pestaña. Vuelve a cargar.',unsaved:'Esta respuesta no está guardada. ¿Salir?',complete:'Curso completado',result:'Mi mapa personal de metas',action:'El paso que elegí',history:'Sesiones anteriores',empty:'Sin respuesta',home:'Mis cursos',delete:'Eliminar el historial del curso',confirm:'¿Eliminar este curso y todas sus respuestas? Los otros cursos seguirán intactos.',privacy:'Tus respuestas están cifradas en tu cuenta. No se comparten con coaches, CRM ni mensajería.',pace:'Una pregunta por pantalla · a tu ritmo',introNote:'Práctica simbólica de autorreflexión, no una prueba clínica ni garantía de resultados.',own:'Tu nota',review:'Ver mis respuestas'}
}
function nextIndex(questions,answers){
 const n=questions.findIndex(q=>!Object.prototype.hasOwnProperty.call(answers||{},q.id))
 return n<0?questions.length-1:n
}
function selectedText(question,answer,lang,fallback){
 if(!answer||typeof answer!=='object')return fallback
 const choice=question?.choices?.find(option=>option.id===answer.choiceId)
 const label=choice?.label?.[lang]||choice?.label?.en||fallback
 return answer.note?label+' — '+answer.note:label
}
export default function TraditionCoaching({locale='en',accountId,template}){
 const def=traditionCourse(template)
 const lang=['ru','es'].includes(locale)?locale:'en'
 const t=words[lang]
 const root='/' + (lang==='ru'?'ru':'en') + '/app'
 const home=root+'/course?view=courses'
 const endpoint='tradition-coaching?template='+encodeURIComponent(template||'')
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false)
 const [error,setError]=useState(''),[notice,setNotice]=useState('')
 const [index,setIndex]=useState(0),[choice,setChoice]=useState(''),[note,setNote]=useState('')
 const busyRef=useRef(false),heading=useRef(null)
 const course=data?.course,session=course?.current
 const questions=data?.questions||[]
 const question=questions[index]
 const stored=question?session?.answers?.[question.id]:undefined
 const dirty=Boolean(session?.status==='active'&&question&&(
   choice!==(stored?.choiceId||'')||note!==(stored?.note||'')
 ))
 const completed=session?.status==='completed'
 const visit=useCallback((position,values,list)=>{
  const next=Math.max(0,Math.min(list.length-1,position))
  const saved=values?.[list[next]?.id]
  setIndex(next);setChoice(saved?.choiceId||'');setNote(saved?.note||'');setError('');setNotice('')
 },[])
 const reload=useCallback(async()=>{
  if(!accountId||!def)return
  setLoading(true);setError('')
  try{
    const result=await appFetch(endpoint,undefined,'GET',{accountId})
    setData(result)
    visit(nextIndex(result.questions||[],result.course?.current?.answers),result.course?.current?.answers,result.questions||[])
  }catch{setError(t.loadError)}
  finally{setLoading(false)}
 },[accountId,endpoint,visit,t.loadError,def])
 useEffect(()=>{
  let active=true
  if(!accountId||!def)return
  setLoading(true)
  appFetch(endpoint,undefined,'GET',{accountId}).then(result=>{
    if(!active)return
    setData(result)
    visit(nextIndex(result.questions||[],result.course?.current?.answers),result.course?.current?.answers,result.questions||[])
  }).catch(()=>{if(active)setError(t.loadError)}).finally(()=>{if(active)setLoading(false)})
  return ()=>{active=false}
 },[accountId,endpoint,visit,t.loadError,def])
 useEffect(()=>{if(!loading&&question&&!completed)heading.current?.focus({preventScroll:true})},[index,loading,completed,question])
 useEffect(()=>{
  if(!dirty)return
  const warn=e=>{e.preventDefault();e.returnValue=''}
  window.addEventListener('beforeunload',warn)
  return ()=>window.removeEventListener('beforeunload',warn)
 },[dirty])
 async function send(action,values={},revision=data?.revision||0){
  return appFetch(endpoint,{action,revision,...values},'POST',{accountId})
 }
 async function start(){
  if(busyRef.current)return
  busyRef.current=true;setBusy(true);setError('')
  try{
   const result=await send('start')
   setData(result)
   visit(nextIndex(result.questions,result.course?.current?.answers),result.course?.current?.answers,result.questions)
  }catch(e){setError(e?.code==='PERSONAL_COACH_REVISION_CONFLICT'?t.conflict:t.error)}
  finally{busyRef.current=false;setBusy(false)}
 }
 async function advance(skip=false){
  if(busyRef.current||!question||!session)return
  if(!skip&&!choice){setError(t.notChosen);return}
  if(skip&&question.required)return
  busyRef.current=true;setBusy(true);setError('');setNotice('')
  const answer=skip?null:{choiceId:choice,note:note.trim()}
  try{
    let saved=data
    if(!Object.prototype.hasOwnProperty.call(session.answers||{},question.id)||
      JSON.stringify(stored??null)!==JSON.stringify(answer)){
      saved=await send('answer',{questionId:question.id,answer})
      setData(saved)
    }
    if(index===questions.length-1){
      const completed=await send('complete',{},saved.revision)
      setData(completed);setNotice(t.saved)
    }else{
      visit(index+1,saved.course?.current?.answers,questions)
      setNotice(t.saved)
    }
  }catch(e){setError(e?.code==='PERSONAL_COACH_REVISION_CONFLICT'?t.conflict:t.error)}
  finally{busyRef.current=false;setBusy(false)}
 }
 function backward(){
  if(index===0)return
  if(dirty&&!window.confirm(t.unsaved))return
  visit(index-1,session?.answers,questions)
 }
 function exit(e){
  if(dirty&&!window.confirm(t.unsaved))e.preventDefault()
 }
 async function erase(){
  if(!window.confirm(t.confirm)||busyRef.current)return
  busyRef.current=true;setBusy(true);setError('')
  try{
   const result=await send('delete',{confirmed:true})
   setData(result);visit(0,{},result.questions||[])
  }catch{setError(t.error)}
  finally{busyRef.current=false;setBusy(false)}
 }
 if(!def)return null
 return <main className={base.root} data-tradition-coaching={def.slug} data-coaching-template={template} lang={lang}>
  <div className={base.scenery} aria-hidden="true"/>
  <div className={base.layout}>
   <header className={base.header}>
     <Link className={base.close} href={home} onClick={exit} aria-label={t.home}><X size={21}/></Link>
     <span className={base.brand}>HOLISTIC HOUSE · ACADEMY</span>
     <span className={base.private}><LockKeyhole size={14}/>{t.private}</span>
   </header>
   <section className={base.sheet}>
    {loading?<div className={base.center} role="status">{t.load}</div>
    : !course?<div className={base.intro} data-tradition-start>
      <span className={base.eyebrow}>HOLISTIC HOUSE · COACHING</span>
      <img src={def.art} width={850} height={250} alt="" className={extra.heroArt} loading="lazy"/>
      <h1>{def.name[lang]}</h1>
      <p className={base.lead}>{def.description[lang]}</p>
      <p className={base.subtle}><ScrollText size={16} aria-hidden="true"/> {def.totalScreens} {t.question.toLowerCase()} · {t.pace}</p>
      <p className={base.subtle}>{def.note[lang]}</p>
      {error&&<p role="alert" className={base.error}>{error}</p>}
      <button type="button" className={base.primary} disabled={busy} onClick={error&&!data?reload:start}>
        {busy?t.save:error&&!data?t.retry:t.start}<ArrowRight size={18}/>
      </button>
      <Link href={home} className={base.secondary}>{t.home}</Link>
    </div>
    :completed?<div className={base.summary} data-tradition-summary>
      <span className={base.completed}><Check size={16}/>{t.complete}</span>
      <h1>{t.result}</h1>
      <p>{def.name[lang]}</p>
      <div className={base.answers}>{questions.map((q,i)=><div key={q.id} className={base.answer}>
       <strong>{i+1}. {q.title?.[lang]||q.title?.en||q.stage}</strong>
       <p>{q.question[lang]}</p>
       <p>{selectedText(q,session.answers?.[q.id],lang,t.empty)}</p>
      </div>)}</div>
      <div className={base.actionRecap}>
        <span>{t.action}</span>
        <strong>{selectedText(questions.at(-1),session.answers?.action_24h,lang,t.empty)}</strong>
      </div>
      {course.history?.length>0&&<details className={base.history}><summary>{t.history} ({course.history.length})</summary>
        {course.history.map(old=><article key={old.id}>
         <strong>{new Date(old.completedAt||old.startedAt).toLocaleDateString(lang)}</strong>
         {questions.map(q=><p key={q.id}><b>{q.question[lang]}</b> {selectedText(q,old.answers?.[q.id],lang,t.empty)}</p>)}
        </article>)}
      </details>}
      <p className={base.privacyNote}>{t.privacy}</p>
      {error&&<p role="alert" className={base.error}>{error}</p>}
      <button type="button" className={base.primary} disabled={busy} onClick={start}>{t.again}<ArrowRight size={18}/></button>
      <Link className={base.secondary} href={home}>{t.home}</Link>
      <button type="button" className={base.delete} disabled={busy} onClick={erase}><Trash2 size={16}/>{t.delete}</button>
      <small className={base.disclaimer}>{t.introNote}</small>
    </div>
    :question?<div className={base.session} data-tradition-one-question data-tradition-question={question.id}>
      <div className={base.progressHeader}>
        <span className={base.eyebrow}>{def.name[lang]}</span>
        <strong>{t.question} {index+1} {t.of} {questions.length}</strong>
      </div>
      <div className={base.progressTrack} role="progressbar" aria-label={t.question}
        aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={index+1}>
        <span style={{width:((index+1)/questions.length*100)+'%'}}/>
      </div>
      <div className={base.questionArea}>
        <span className={base.stage}>{question.title?.[lang]||question.title?.en||question.stage}</span>
        <div className={extra.questionHeader}>
         <h1 ref={heading} tabIndex={-1}>{question.question?.[lang]}</h1>
        </div>
        <CoachingQuestionVoice key={question.id} text={question.question?.[lang]||''}
           locale={lang} disabled={busy} onTranscript={value=>{
             setNote(old=>((old?old+' ':'')+value).slice(0,500));setNotice('');setError('')
           }}/>
        <p className={extra.hint}>{question.hint?.[lang]||''}</p>
        <div className={extra.choices} role="radiogroup" aria-label={question.question?.[lang]}>
          {question.choices?.map(option=><button type="button" role="radio" key={option.id}
            aria-checked={choice===option.id} disabled={busy} data-choice-id={option.id}
            className={choice===option.id?extra.chosen:extra.choice} onClick={()=>{
              setChoice(option.id);setError('');setNotice('')
            }}>{choice===option.id?<Check size={18}/>:<span className={extra.choiceDot}/>}
            {option.label?.[lang]||option.label?.en}</button>)}
        </div>
        <label className={base.answerLabel} htmlFor="tradition-coaching-note">{t.note}</label>
        <textarea id="tradition-coaching-note" className={extra.note} value={note}
          disabled={busy} maxLength={500} rows={2} placeholder={t.placeholder}
          onChange={e=>{setNote(e.target.value);setError('');setNotice('')}}/>
        <small className={extra.noteTip}>{t.noteHelp}</small>
        {notice&&<p role="status" className={base.notice}><Check size={15}/>{notice}</p>}
        {error&&<p role="alert" className={base.error}>{error}</p>}
      </div>
      <footer className={base.footer}>
        <div className={base.footerActions}>
          <button type="button" className={base.back} disabled={busy||index===0} onClick={backward}><ChevronLeft size={18}/>{t.back}</button>
          <button type="button" className={base.primary} disabled={busy} onClick={()=>advance(false)}>
            {busy?t.save:index===questions.length-1?t.finish:t.continue}<ArrowRight size={18}/>
          </button>
        </div>
        {!question.required&&<button type="button" className={base.skip} disabled={busy} onClick={()=>advance(true)}>{t.skip}</button>}
      </footer>
    </div>:<div className={base.center} role="alert">{t.loadError}</div>}
   </section>
  </div>
 </main>
}

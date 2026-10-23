'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, ChevronLeft, LockKeyhole, Trash2, X } from 'lucide-react'
import { appFetch } from '@/lib/app/client-fetch'
import { PERSONAL_COACH_QUESTIONS, personalCoachNextIndex } from '@/lib/personal-coaching/questions'
import PersonalCoachingPicker from './personal-coaching-picker'
import CoachingQuestionVoice from './coaching-question-voice'
import { appendSpokenAnswer } from '@/lib/personal-coaching/speech-text'
import styles from './personal-coaching.module.css'

const copy={
  en:{
    eyebrow:'HOLISTIC HOUSE · SELF-GUIDED COACHING',title:'Personal Coaching Session',
    intro:'A quiet space to think through one question and choose your next step.',
    selfGuided:'A guided reflection in your own words — not a live coach or an AI chat.',
    time:'Choose a coaching approach · 10–30 minutes',private:'Your answers stay private in your account.',
    start:'Start my session',resume:'Continue my session',new:'Start another session',
    loading:'Opening your private session…',loadError:'Your session could not be loaded. Try again.',
    saveError:'Your answer was not saved. Please try again.',
    conflict:'Your session changed in another tab. Reload to get the newest saved answers.',
    retry:'Reload session',close:'Exit session',unsaved:'You have an unsaved answer. Leave without saving it?',
    question:'QUESTION',of:'OF',back:'Back',next:'Save & continue',finish:'Save & finish',skip:'Skip this question',
    hint:'Or type and edit your answer',placeholder:'My answer…',required:'Write at least a few words before continuing.',
    stopMic:'Stop dictation and review the recognized text before saving.',
    saving:'Saving…',saved:'Saved in your private cabinet',change:'You can change your answer before finishing.',
    summary:'Your personal session',finished:'Your answers, in one place',plan:'The step I chose',
    noAnswer:'Skipped',history:'Earlier private sessions',historyItem:'Previous session',
    share:'Nothing is sent to a coach or messenger automatically.',
    restart:'This starts a new session and saves the completed one to your private history.',
    home:'My Courses',delete:'Delete my coaching notes',deleteConfirm:'Delete all personal coaching notes and session history? This cannot be undone.',
    completeNote:'This is a self-reflection tool, not a diagnosis, guaranteed result, or booked consultation.',
    completed:'Session completed',emptyError:'Could not start the session. Please retry.',
  },
  ru:{
    eyebrow:'HOLISTIC HOUSE · САМОСТОЯТЕЛЬНАЯ КОУЧ-СЕССИЯ',title:'Личная коуч-сессия',
    intro:'Пространство для разговора с собой: один вопрос за раз, один следующий шаг.',
    selfGuided:'Вопросы коуча для самостоятельного размышления — не живой коуч и не чат с ИИ.',
    time:'Выберите подход · примерно 10–30 минут',private:'Ваши ответы сохраняются только в личном кабинете.',
    start:'Начать сессию',resume:'Продолжить сессию',new:'Начать новую сессию',
    loading:'Открываем вашу личную сессию…',loadError:'Не удалось загрузить сессию. Попробуйте ещё раз.',
    saveError:'Ответ не сохранился. Попробуйте ещё раз.',
    conflict:'Сессия изменилась в другой вкладке. Обновите сохранённые ответы.',
    retry:'Обновить сессию',close:'Закрыть сессию',unsaved:'Этот ответ не сохранён. Выйти без сохранения?',
    question:'ВОПРОС',of:'ИЗ',back:'Назад',next:'Сохранить и далее',finish:'Сохранить и завершить',skip:'Пропустить вопрос',
    hint:'Или напишите и отредактируйте ответ',placeholder:'Мой ответ…',required:'Напишите хотя бы несколько слов, прежде чем продолжить.',
    stopMic:'Остановите микрофон и проверьте распознанный текст перед сохранением.',
    saving:'Сохраняем…',saved:'Сохранено в личном кабинете',change:'До завершения ответ можно изменить.',
    summary:'Моя коуч-сессия',finished:'Ваши ответы в одном месте',plan:'Мой выбранный шаг',
    noAnswer:'Пропущено',history:'Предыдущие личные сессии',historyItem:'Прошлая сессия',
    share:'Ответы не отправляются коучу или в мессенджеры автоматически.',
    restart:'Новая сессия сохранит завершённую в вашей личной истории.',
    home:'Мои курсы',delete:'Удалить мои записи',deleteConfirm:'Удалить все ответы и историю коуч-сессий? Это действие нельзя отменить.',
    completeNote:'Это практика размышления, а не диагноз, обещание результата или запись на консультацию.',
    completed:'Сессия завершена',emptyError:'Не удалось начать сессию. Попробуйте ещё раз.',
  },
  es:{
    eyebrow:'HOLISTIC HOUSE · COACHING AUTOGUIADO',title:'Sesión personal de coaching',
    intro:'Un espacio para aclarar una pregunta y elegir tu siguiente paso.',
    selfGuided:'Reflexión autoguiada, no una sesión con un coach ni un chat con IA.',
    time:'Elige un enfoque · 10–30 minutos',private:'Tus respuestas permanecen privadas.',
    start:'Empezar sesión',resume:'Continuar sesión',new:'Empezar otra sesión',
    loading:'Abriendo tu sesión…',loadError:'No se pudo cargar. Inténtalo de nuevo.',
    saveError:'No se guardó tu respuesta. Inténtalo de nuevo.',conflict:'Otra pestaña ha modificado la sesión. Actualiza tus datos.',
    retry:'Actualizar sesión',close:'Salir',unsaved:'Tu respuesta no está guardada. ¿Salir?',
    question:'PREGUNTA',of:'DE',back:'Atrás',next:'Guardar y seguir',finish:'Guardar y terminar',skip:'Saltar pregunta',
    hint:'O escribe y edita tu respuesta',placeholder:'Mi respuesta…',required:'Escribe algunas palabras.',
    stopMic:'Detén el micrófono y revisa el texto antes de guardar.',
    saving:'Guardando…',saved:'Guardado en tu cuenta privada',change:'Puedes editar antes de terminar.',
    summary:'Mi sesión personal',finished:'Tus respuestas',plan:'El paso elegido',noAnswer:'Omitido',
    history:'Sesiones anteriores',historyItem:'Sesión anterior',share:'No enviamos tus respuestas a otras personas.',
    restart:'La sesión completada se guardará en tu historial.',home:'Mis cursos',delete:'Borrar mis notas',
    deleteConfirm:'¿Eliminar todas tus respuestas e historial? No se puede deshacer.',
    completeNote:'Esto es autorreflexión, no un diagnóstico ni una consulta reservada.',
    completed:'Sesión completada',emptyError:'No se pudo empezar. Inténtalo de nuevo.',
  },
}
const extraCopy={
  en:{choice:'Choose an answer',orWrite:'Or write your own answer (optional)',
    woop:'For a complete WOOP exercise, write your own specific if–then plan here.',
    chosen:'Selected approach',yourQuestion:'Your original question',loadingCatalog:'Your coaching questions are being loaded…'},
  ru:{choice:'Выберите ответ',orWrite:'Или впишите свой ответ (необязательно)',
    woop:'Для полноценной WOOP сформулируйте свой конкретный план «если — то» словами.',
    chosen:'Выбранная модель',yourQuestion:'Ваш исходный вопрос',loadingCatalog:'Загружаем вопросы выбранной модели…'},
  es:{choice:'Elige una respuesta',orWrite:'O escribe tu respuesta (opcional)',
    woop:'Para completar WOOP, escribe tu propio plan específico «si — entonces».',
    chosen:'Modelo elegido',yourQuestion:'Tu pregunta original',loadingCatalog:'Cargando las preguntas de tu modelo…'},
}
const translated=(value,lang)=>value?.[lang]||value?.en||''
const questionsFor=(course,catalog)=>{
  const key=course?.current?.schemeKey
  if(!key)return PERSONAL_COACH_QUESTIONS
  return catalog?.schemes?.find(item=>item.schemeKey===key)?.questions||[]
}
const firstUnanswered=(items,answers={})=>{
  if(items===PERSONAL_COACH_QUESTIONS)return personalCoachNextIndex(answers)
  const found=items.findIndex(item=>!Object.prototype.hasOwnProperty.call(answers||{},item.id))
  return found===-1?Math.max(0,items.length-1):found
}
const prettyAnswer=(value,item,lang,missing)=>{
  if(typeof value!=='string')return missing
  if(!value.startsWith('choice:'))return value
  const id=value.slice(7)
  if(item?.type==='scale_0_10')return id+'/10'
  return translated(item?.choices?.find(c=>c.id===id)?.label,lang)||missing
}
export default function PersonalCoaching({locale='en',accountId}){
  const lang=['en','ru','es'].includes(locale)?locale:'en',t=copy[lang],root='/'+(locale==='ru'?'ru':'en')+'/app'
  const [state,setState]=useState(null),[catalog,setCatalog]=useState(null)
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[newSelection,setNewSelection]=useState(false)
  const [error,setError]=useState(''),[notice,setNotice]=useState('')
  const [index,setIndex]=useState(0),[draft,setDraft]=useState('')
  const [dictating,setDictating]=useState(false),[speechConsent,setSpeechConsent]=useState(false)
  const titleRef=useRef(null),busyRef=useRef(false)
  const course=state?.course,session=course?.current,langCopy=extraCopy[lang]
  const scheme=session?.schemeKey?catalog?.schemes?.find(item=>item.schemeKey===session.schemeKey):null
  const activeQuestions=questionsFor(course,catalog)
  const question=activeQuestions[index]||activeQuestions[0]
  const persisted=session?.answers?.[question?.id]
  const dirty=Boolean(session?.status==='active' && question && draft!==(typeof persisted==='string'?persisted:''))
  const finished=session?.status==='completed'
  function visit(indexToOpen,values,items=activeQuestions){
    const next=Math.max(0,Math.min(items.length-1,indexToOpen))
    setIndex(next)
    const saved=values?.[items[next]?.id]
    setDraft(typeof saved==='string'?saved:'')
    setDictating(false)
    setNotice('')
    setError('')
  }
  async function reload(){
    if(!accountId)return
    setLoading(true);setError('')
    try{
      const [value,loadedCatalog]=await Promise.all([
        appFetch('personal-coaching',undefined,'GET',{accountId}),
        appFetch('personal-coaching-catalog',undefined,'GET',{accountId}),
      ])
      setState(value);setCatalog(loadedCatalog)
      const list=questionsFor(value.course,loadedCatalog)
      visit(firstUnanswered(list,value.course?.current?.answers),value.course?.current?.answers,list)
    }catch{setError(t.loadError)}
    finally{setLoading(false)}
  }
  useEffect(()=>{
    let live=true
    setLoading(true)
    Promise.all([
      appFetch('personal-coaching',undefined,'GET',{accountId}),
      appFetch('personal-coaching-catalog',undefined,'GET',{accountId}),
    ]).then(([value,loadedCatalog])=>{
      if(!live)return
      setState(value);setCatalog(loadedCatalog)
      const list=questionsFor(value.course,loadedCatalog)
      const next=firstUnanswered(list,value.course?.current?.answers)
      setIndex(next)
      const answer=value.course?.current?.answers?.[list[next]?.id]
      setDraft(typeof answer==='string'?answer:'')
      setError('')
    }).catch(()=>{if(live)setError(t.loadError)})
      .finally(()=>{if(live)setLoading(false)})
    return()=>{live=false}
  },[accountId,t.loadError])
  useEffect(()=>{
    if(loading||!session||finished)return
    titleRef.current?.focus({preventScroll:true})
  },[index,loading,session?.id,finished])
  useEffect(()=>{
    if(!dirty)return
    const warn=event=>{event.preventDefault();event.returnValue=''}
    window.addEventListener('beforeunload',warn)
    return()=>window.removeEventListener('beforeunload',warn)
  },[dirty])
  async function command(action,fields={}){
    if(busyRef.current||!accountId)return null
    busyRef.current=true;setBusy(true);setError('');setNotice('')
    try{
      const value=await appFetch('personal-coaching',{action,revision:state?.revision||0,...fields},'POST',{accountId})
      setState(value)
      setNotice(t.saved)
      return value
    }catch(e){
      setError(e?.code==='PERSONAL_COACH_REVISION_CONFLICT'?t.conflict:t.saveError)
      return null
    }finally{busyRef.current=false;setBusy(false)}
  }
  async function begin(choice,clientQuestion){
    const result=await command('start',{schemeKey:choice.schemeKey,clientQuestion})
    if(result){
      const list=questionsFor(result.course,catalog)
      visit(firstUnanswered(list,result.course?.current?.answers),result.course?.current?.answers,list)
      setNewSelection(false)
    }
  }
  async function next(skip=false){
    if(busyRef.current||!session)return
    if(dictating){setError(t.stopMic);return}
    const answer=skip?null:draft.trim()
    if((question.required&&!answer)||(question.required&&!question.type&&answer.length<3)){
      setError(t.required);return
    }
    if(scheme?.requiredCustomPlan && index===activeQuestions.length-1 &&
      (answer?.startsWith('choice:')||!answer||answer.length<10)){
      setError(langCopy.woop);return
    }
    if(!skip&&typeof persisted==='string'&&persisted===answer && Object.prototype.hasOwnProperty.call(session.answers,question.id)){
      if(index===activeQuestions.length-1)await command('complete')
      else visit(index+1,session.answers)
      return
    }
    const saved=await command('answer',{questionId:question.id,answer})
    if(!saved)return
    if(index===activeQuestions.length-1){
      // Completion is reported only after the final answer and status both persisted.
      const completed=await commandAfterSave(saved,'complete')
      if(!completed)setError(t.saveError)
    }else visit(index+1,saved.course?.current?.answers)
  }
  async function commandAfterSave(saved,action){
    if(busyRef.current)return null
    busyRef.current=true;setBusy(true);setError('')
    try{
      const value=await appFetch('personal-coaching',{action,revision:saved.revision},'POST',{accountId})
      setState(value);setNotice(t.saved)
      return value
    }catch(e){setError(e?.code==='PERSONAL_COACH_REVISION_CONFLICT'?t.conflict:t.saveError);return null}
    finally{busyRef.current=false;setBusy(false)}
  }
  function backward(){
    if(index===0)return
    if(dictating){setError(t.stopMic);return}
    if(dirty&&!window.confirm(t.unsaved))return
    visit(index-1,session?.answers)
  }
  function exit(event){
    if(dictating){event.preventDefault();setError(t.stopMic);return}
    if(dirty&&!window.confirm(t.unsaved))event.preventDefault()
  }
  async function erase(){
    if(!window.confirm(t.deleteConfirm))return
    const result=await command('delete',{confirmed:true})
    if(result){setNotice('');setNewSelection(false);visit(0,{},PERSONAL_COACH_QUESTIONS)}
  }
  return <main className={styles.root} data-personal-coaching data-coaching-version="1" lang={lang}>
    <div className={styles.scenery} aria-hidden="true"/>
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link href={root+'/course?view=courses'} className={styles.close} onClick={exit} aria-label={t.close} title={t.close}><X size={21}/></Link>
        <span className={styles.brand}>HOLISTIC HOUSE</span>
        <span className={styles.private}><LockKeyhole size={14}/>{lang==='ru'?'Личное':'Private'}</span>
      </header>
      <section className={styles.sheet}>
        {loading ? <div className={styles.center} role="status">{t.loading}</div>
        : !catalog ? <div className={styles.center} role="alert">
          <p>{t.loadError}</p>
          <button type="button" className={styles.primary} onClick={reload}>{t.retry}</button>
        </div>
        : (!course||newSelection) ? <PersonalCoachingPicker locale={lang} catalog={catalog}
          onChoose={begin} busy={busy} error={error} isNew={Boolean(course)} />
        : finished ? <div className={styles.summary} data-coaching-summary>
          <span className={styles.completed}><Check size={16}/>{t.completed}</span>
          <h1>{t.summary}</h1>
          <p>{t.finished}</p>
          {scheme&&<p className={styles.schemeLabel}>{langCopy.chosen}: {translated(scheme.name,lang)}</p>}
          {session.clientQuestion&&<p className={styles.contextQuestion}><strong>{langCopy.yourQuestion}:</strong> {session.clientQuestion}</p>}
          <div className={styles.answers}>
            {activeQuestions.map(item=><div className={styles.answer} key={item.id}>
              <strong>{translated(item.prompt||item.question,lang)}</strong>
              <p>{prettyAnswer(session.answers[item.id],item,lang,t.noAnswer)}</p>
            </div>)}
          </div>
          <div className={styles.actionRecap}>
            <span>{t.plan}</span>
            <strong>{scheme?prettyAnswer(session.answers[activeQuestions.at(-1)?.id],
              activeQuestions.at(-1),lang,t.noAnswer):session.answers.first_step||t.noAnswer}</strong>
            {!scheme&&session.answers.when&&<small>{session.answers.when}</small>}
          </div>
          <p className={styles.privacyNote}>{t.share}</p>
          {course.history?.length>0&&<details className={styles.history}>
            <summary>{t.history} ({course.history.length})</summary>
            {course.history.map(old=><article key={old.id}>
              <strong>{t.historyItem} · {new Date(old.completedAt||old.startedAt).toLocaleDateString(lang)}</strong>
              {questionsFor({current:old},catalog).map(item=><p key={item.id}>
                <b>{translated(item.prompt||item.question,lang)}</b> {prettyAnswer(old.answers[item.id],item,lang,t.noAnswer)}
              </p>)}
            </article>)}
          </details>}
          <p className={styles.subtle}>{t.restart}</p>
          {error&&<p className={styles.error} role="alert">{error}</p>}
          <button type="button" className={styles.primary} disabled={busy}
            onClick={()=>{setNewSelection(true);setError('')}}>{t.new}<ArrowRight size={18}/></button>
          <Link href={root+'/course?view=courses'} className={styles.secondary}>{t.home}</Link>
          <button type="button" className={styles.delete} disabled={busy} onClick={erase}><Trash2 size={15}/>{t.delete}</button>
          <small className={styles.disclaimer}>{t.completeNote}</small>
        </div>
        : !question ? <div className={styles.center} role="alert">
            {langCopy.loadingCatalog} <button type="button" onClick={reload}>{t.retry}</button>
          </div>
        : <div className={styles.session} data-coaching-one-question data-coaching-question={question.id}>
          <div className={styles.progressHeader}>
            <span className={styles.eyebrow}>{t.title}</span>
            <strong>{t.question} {index+1} {t.of} {activeQuestions.length}</strong>
          </div>
          <div className={styles.progressTrack} role="progressbar" aria-label={t.question} aria-valuemin={0} aria-valuemax={activeQuestions.length} aria-valuenow={index+1}>
            <span style={{width:((index+1)/activeQuestions.length*100)+'%'}}/>
          </div>
          <div className={styles.questionArea}>
            <span className={styles.stage}>{translated(question.stageTitle,lang)||(question.stage||'').toUpperCase()}</span>
            {session.clientQuestion&&<p className={styles.contextQuestion}>
              <strong>{langCopy.yourQuestion}:</strong> {session.clientQuestion}</p>}
            {scheme&&<span className={styles.schemeLabel}>{langCopy.chosen}: {translated(scheme.name,lang)}</span>}
            <h1 ref={titleRef} tabIndex={-1}>{translated(question.prompt||question.question,lang)}</h1>
            <CoachingQuestionVoice key={question.id+'-'+lang}
              text={translated(question.prompt||question.question,lang)} locale={lang}
              mode="answer" disabled={busy} speechConsent={speechConsent}
              onConsent={()=>setSpeechConsent(true)} onListeningChange={setDictating}
              onTranscript={words=>{
                setDraft(previous=>appendSpokenAnswer(previous.startsWith('choice:')?'':previous,words))
                setError('');setNotice('')
              }}/>
            <p>{translated(question.reflection||question.hint,lang)}</p>
            {question.type&&!(scheme?.requiredCustomPlan&&index===activeQuestions.length-1)&&<>
              <span className={styles.answerLabel}>{langCopy.choice}</span>
              <div className={question.type==='scale_0_10'?styles.optionScale:styles.optionList}>
                {(question.type==='scale_0_10'
                  ? Array.from({length:11},(_,value)=>({id:String(value),label:{en:String(value),ru:String(value),es:String(value)}}))
                  : question.choices||[]).map(option=><button key={option.id} type="button" disabled={busy||dictating}
                  className={styles.optionChip} aria-pressed={draft==='choice:'+option.id}
                  onClick={()=>{setDraft('choice:'+option.id);setError('');setNotice('')}}>
                  {translated(option.label,lang)}</button>)}
              </div>
            </>}
            {scheme?.requiredCustomPlan&&index===activeQuestions.length-1&&
              <p className={styles.requiredPlan}>{langCopy.woop}</p>}
            {!question.type&&<div className={styles.suggestions} role="group" aria-label={langCopy.choice}>
              {(question.examples?.[lang]||[]).map(option=><button type="button" key={option} disabled={busy||dictating}
                className={draft.trim()===option?styles.chosen:undefined} aria-pressed={draft.trim()===option}
                onClick={()=>{setDraft(option);setError('');setNotice('')}}>{option}</button>)}
            </div>}
            <label className={styles.answerLabel} htmlFor="hh-personal-coach-answer">
              {question.type?langCopy.orWrite:t.hint}</label>
            <textarea id="hh-personal-coach-answer" className={styles.textarea}
              value={draft.startsWith('choice:')?'':draft}
              maxLength={800} rows={question.type?2:4} placeholder={t.placeholder} disabled={busy}
              onChange={event=>{setDraft(event.target.value);setError('');setNotice('')}}/>
            <span className={styles.counter}>{draft.startsWith('choice:')?0:draft.length}/800</span>
            {dictating&&<div className={styles.micNotice} role="status">{t.stopMic}</div>}

            <p className={styles.subtle}>{t.change}</p>
            {notice&&<p className={styles.notice} role="status"><Check size={15}/>{notice}</p>}
            {error&&<p className={styles.error} role="alert">{error}</p>}
          </div>
          <footer className={styles.footer}>
            <div className={styles.footerActions}>
              <button type="button" className={styles.back} onClick={backward} disabled={busy||index===0}><ChevronLeft size={18}/>{t.back}</button>
              <button type="button" className={styles.primary} disabled={busy} onClick={()=>next(false)}>
                {busy?t.saving:index===activeQuestions.length-1?t.finish:t.next}<ArrowRight size={18}/>
              </button>
            </div>
            {!question.required&&<button type="button" className={styles.skip} disabled={busy} onClick={()=>next(true)}>{t.skip}</button>}
          </footer>
        </div>}
      </section>
    </div>
  </main>
}

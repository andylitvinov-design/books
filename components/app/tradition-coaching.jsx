'use client'

import {useCallback,useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {ArrowRight,Check,ChevronLeft,Download,LockKeyhole,Trash2,X} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import {traditionCourse} from '@/lib/personal-coaching/traditions'
import {traditionStages,traditionStageGuide,traditionStageImage,traditionStageSource} from '@/lib/personal-coaching/tradition-visuals'
import {coachingReportDate,downloadCoachingSessionPdf} from '@/lib/personal-coaching/session-pdf'
import {coachingQuickChoicesAllowed,coachingConversationTurn} from '@/lib/personal-coaching/gentle-dialogue'
import CoachingQuestionVoice from './coaching-question-voice'
import TraditionCoachingAudio from './tradition-coaching-audio'
import CoachingChatThread from '@/components/coaching-chat-thread'
import {CoachingSessionIntroduction,CoachingSessionTopic} from '@/components/coaching-session-onboarding'
import {coachingRequestTopicLabel} from '@/lib/coaching/session-onboarding'
import base from './personal-coaching.module.css'
import extra from './tradition-coaching.module.css'

const words={
 en:{private:'Private',load:'Loading your course…',loadError:'Could not open the private course.',retry:'Try again',start:'Start this course',again:'Start a new journey',back:'Back',continue:'Save & continue',finish:'Save & finish',save:'Saving…',skip:'Skip this reflection',question:'QUESTION',of:'OF',note:'My own words (optional)',placeholder:'Add a short detail, or dictate it…',noteHelp:'Choose a topic; you can add a few words.',notChosen:'Choose a topic before continuing.',writeAnswer:'Write a few words in your own voice, or skip this optional step.',ownAnswer:'Your answer, in your own words',openPlaceholder:'You can begin with one recent example…',freeHelp:'There is no right answer. Take the time you need.',earlierChoice:'Earlier saved choice',saved:'Saved to My Courses',error:'Could not save. Your answer is still on this screen.',conflict:'Your course changed in another tab. Reload before editing.',unsaved:'This answer has not been saved. Leave without saving?',complete:'Course completed',result:'My personal goal map',action:'The step I chose',history:'Previous sessions',empty:'Not answered',home:'My Courses',delete:'Delete this course history',confirm:'Delete this course and all its saved answers? The other coaching courses are not affected.',privacy:'Your answers are encrypted in your account. Nothing is sent to a practitioner, CRM or messenger.',pace:'One question on each screen · take your time',introNote:'Symbolic self-reflection, not a clinical test or a promise of results.',own:'Your note',review:'Review my answers',pdf:'Download PDF report',pdfError:'PDF export failed. Your saved answers are still available.',date:'Session date',reportNotice:'Tap Save to keep this answer in your private account. At the end, download a PDF with your reflections and answers.'},
 ru:{private:'Личное',load:'Открываем ваш курс…',loadError:'Не удалось открыть личный курс.',retry:'Повторить',start:'Начать курс',again:'Начать курс заново',back:'Назад',continue:'Сохранить и далее',finish:'Сохранить и завершить',save:'Сохраняем…',skip:'Пропустить этот вопрос',question:'ВОПРОС',of:'ИЗ',note:'Своими словами (необязательно)',placeholder:'Добавьте короткое уточнение или продиктуйте…',noteHelp:'Выберите тему; можно добавить пару слов.',notChosen:'Сначала выберите тему.',writeAnswer:'Напишите несколько слов своими словами или пропустите необязательный шаг.',ownAnswer:'Ваш ответ своими словами',openPlaceholder:'Можно начать с одного недавнего примера…',freeHelp:'Здесь нет правильного ответа. Не торопитесь.',earlierChoice:'Сохранённый ранее вариант',saved:'Сохранено в «Моих курсах»',error:'Не удалось сохранить ответ. Он остался на экране.',conflict:'Курс изменился в другой вкладке. Загрузите актуальные ответы.',unsaved:'Этот ответ не сохранён. Выйти без сохранения?',complete:'Курс завершён',result:'Моя карта цели',action:'Мой ближайший шаг',history:'Предыдущие прохождения',empty:'Без ответа',home:'Мои курсы',delete:'Удалить записи этого курса',confirm:'Удалить этот курс и все его ответы? Другие коучинговые курсы сохранятся.',privacy:'Ответы зашифрованы в личном кабинете. Ничего не уходит мастеру, в CRM или мессенджер.',pace:'Один вопрос на экран · в своём темпе',introNote:'Символическая практика самоисследования, не клинический тест и не гарантия результата.',own:'Ваше уточнение',review:'Посмотреть мои ответы',pdf:'Скачать PDF-отчёт',pdfError:'Не удалось сформировать PDF. Ответы по-прежнему сохранены.',date:'Дата сессии',reportNotice:'Нажмите «Сохранить», чтобы ответ остался в личном кабинете. В конце вы сможете скачать PDF с вашими мыслями и ответами.'},
 es:{private:'Privado',load:'Abriendo tu curso…',loadError:'No se pudo abrir el curso privado.',retry:'Reintentar',start:'Empezar el curso',again:'Empezar otra vez',back:'Atrás',continue:'Guardar y continuar',finish:'Guardar y terminar',save:'Guardando…',skip:'Omitir esta pregunta',question:'PREGUNTA',of:'DE',note:'En mis palabras (opcional)',placeholder:'Añade una nota o dícala…',noteHelp:'Elige un tema; puedes añadir unas palabras.',notChosen:'Elige un tema para continuar.',writeAnswer:'Escribe unas palabras tuyas o salta este paso opcional.',ownAnswer:'Tu respuesta, con tus propias palabras',openPlaceholder:'Puedes empezar con un ejemplo reciente…',freeHelp:'No hay una respuesta correcta. Tómate tu tiempo.',earlierChoice:'Opción guardada anteriormente',saved:'Guardado en Mis cursos',error:'No se pudo guardar. La respuesta sigue aquí.',conflict:'El curso cambió en otra pestaña. Vuelve a cargar.',unsaved:'Esta respuesta no está guardada. ¿Salir?',complete:'Curso completado',result:'Mi mapa personal de metas',action:'El paso que elegí',history:'Sesiones anteriores',empty:'Sin respuesta',home:'Mis cursos',delete:'Eliminar el historial del curso',confirm:'¿Eliminar este curso y todas sus respuestas? Los otros cursos seguirán intactos.',privacy:'Tus respuestas están cifradas en tu cuenta. No se comparten con coaches, CRM ni mensajería.',pace:'Una pregunta por pantalla · a tu ritmo',introNote:'Práctica simbólica de autorreflexión, no una prueba clínica ni garantía de resultados.',own:'Tu nota',review:'Ver mis respuestas',pdf:'Descargar informe PDF',pdfError:'No se pudo crear el PDF. Tus respuestas siguen guardadas.',date:'Fecha de la sesión',reportNotice:'Pulsa Guardar para conservar tu respuesta en tu cuenta privada. Al final podrás descargar un PDF con tus reflexiones y respuestas.'}
}
const visualWords={
 en:{overview:'The eight levels of your goal',overviewText:'A visual journey. Every stage introduces one symbolic body or principle, then asks a question about the SAME goal. The images show historic art objects as visual metaphors, not literal pictures of the soul.',overviewStep:'The question you will explore',photo:'Artwork & photographer',introStep:'See the eight levels',nextStep:'Choose your goal',reflect:'Consider the level before you answer'},
 ru:{overview:'Восемь уровней твоей цели',overviewText:'Сначала изучи символические тела или принципы. Затем на каждом экране увидишь историческое изображение, пояснение и вопрос к ОДНОЙ выбранной цели. Изображения — визуальные ассоциации, а не буквальные фотографии души.',overviewStep:'Вопрос для размышления',photo:'Изображение и автор',introStep:'Познакомиться с 8 уровнями',nextStep:'Выбрать цель',reflect:'Сначала почувствуй смысл уровня, затем ответь'},
 es:{overview:'Los ocho niveles de tu meta',overviewText:'Primero conoce cada cuerpo simbólico o principio. Cada pantalla mostrará una obra histórica, su significado y una pregunta sobre la MISMA meta. Las imágenes son asociaciones, no fotografías literales del alma.',overviewStep:'La pregunta para reflexionar',photo:'Obra y fotógrafo',introStep:'Conocer los ocho niveles',nextStep:'Elegir mi objetivo',reflect:'Comprende este nivel antes de responder'}
}
function TraditionStageArt({stage,lang,compact=false}){
 if(!stage)return null
 const v=visualWords[lang]
 return <figure className={compact?extra.roadmapCard:extra.stageCard} data-tradition-stage={stage.id}>
   <div className={extra.stagePhoto}>
     {/* Intentional ordinary img: Commons thumbnail, no paid Vercel optimization; no answer or referrer is shared. */}
     {/* eslint-disable-next-line @next/next/no-img-element */}
     <img src={traditionStageImage(stage)} loading={compact?'lazy':'eager'} decoding="async" referrerPolicy="no-referrer"
       onError={event=>{event.currentTarget.hidden=true}}
       alt={stage.title?.[lang]||stage.title?.en} width="120" height="150"/>
     <span aria-hidden="true" className={extra.stageGlyph}>{stage.symbol}</span>
   </div>
   <figcaption className={extra.stageCopy}>
     <strong>{stage.title?.[lang]||stage.title?.en}</strong>
     <p>{stage.description?.[lang]||stage.description?.en}</p>
     {compact&&<small><b>{v.overviewStep}:</b> {stage.focus?.[lang]||stage.focus?.en}</small>}
     <a className={extra.photoCredit} href={traditionStageSource(stage)} target="_blank" rel="noopener noreferrer"
       referrerPolicy="no-referrer" title={v.photo}>{stage.photo?.credit} · {stage.photo?.license}</a>
   </figcaption>
 </figure>
}
function nextIndex(questions,answers){
 const n=questions.findIndex(q=>!Object.prototype.hasOwnProperty.call(answers||{},q.id))
 return n<0?questions.length-1:n
}
function selectedText(question,answer,lang,fallback){
 if(!answer||typeof answer!=='object')return fallback
 const choice=question?.choices?.find(option=>option.id===answer.choiceId)
 const label=choice?.label?.[lang]||choice?.label?.en||''
 return label?(answer.note?label+' — '+answer.note:label):(answer.note||fallback)
}
export default function TraditionCoaching({locale='en',accountId,template}){
 const def=traditionCourse(template)
 const lang=['ru','es'].includes(locale)?locale:'en'
 const t=words[lang]
 const v=visualWords[lang]
 const root='/' + (lang==='ru'?'ru':'en') + '/app'
 const home=root+'/course?view=courses'
 const endpoint='tradition-coaching?template='+encodeURIComponent(template||'')
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false)
 const [error,setError]=useState(''),[notice,setNotice]=useState('')
 const [index,setIndex]=useState(0),[choice,setChoice]=useState(''),[note,setNote]=useState('')
 const [entryStep,setEntryStep]=useState('intro'),[clientTopic,setClientTopic]=useState(''),[topicAdultConfirmed,setTopicAdultConfirmed]=useState(false),[restartRequested,setRestartRequested]=useState(false)
 const [checkin,setCheckin]=useState('')
 const busyRef=useRef(false),heading=useRef(null)
 const course=data?.course,session=course?.current
 const questions=data?.questions||[]
 const question=questions[index]
 const stageGuide=traditionStageGuide(def?.slug,question?.stage)
 const quickChoices=coachingQuickChoicesAllowed(question,index)
 const previousQuestion=questions[index-1]
 const conversationTurn=coachingConversationTurn({
  question,previousQuestion,previousAnswer:session?.answers?.[previousQuestion?.id],
  index,total:questions.length,locale:lang,
 })
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
 useEffect(()=>{if(!loading&&(!course||restartRequested))heading.current?.focus({preventScroll:true})},[entryStep,loading,course?.current?.id,restartRequested])
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
   const result=await send('start',{clientTopic,adultConfirmed:topicAdultConfirmed})
   setData(result)
   setRestartRequested(false)
   visit(nextIndex(result.questions,result.course?.current?.answers),result.course?.current?.answers,result.questions)
  }catch(e){setError(e?.code==='PERSONAL_COACH_REVISION_CONFLICT'?t.conflict:t.error)}
  finally{busyRef.current=false;setBusy(false)}
 }
 async function advance(skip=false){
  if(busyRef.current||!question||!session)return
  if(!skip&&quickChoices&&!choice){setError(t.notChosen);return}
  if(!skip&&!quickChoices&&!choice&&note.trim().length<3){setError(t.writeAnswer);return}
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
 function onChoiceKeyDown(event){
  if(!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(event.key))return
  const items=question?.choices||[]
  if(!items.length)return
  event.preventDefault()
  const current=items.findIndex(item=>item.id===choice)
  const direction=['ArrowRight','ArrowDown'].includes(event.key)?1:-1
  const next=(current<0?0:(current+direction+items.length)%items.length)
  setChoice(items[next].id);setError('');setNotice('')
  event.currentTarget.querySelectorAll('[role="radio"]')[next]?.focus()
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
 function downloadReport(target){
  if(target?.status!=='completed')return
  try{
   downloadCoachingSessionPdf({
    locale:lang,title:def.name[lang],slug:def.slug||template,
    sessionDate:target.completedAt||target.startedAt,
    topic:target.clientTopic?coachingRequestTopicLabel(target.clientTopic,lang):'',
    entries:questions.map(q=>({
     question:q.question?.[lang]||q.question?.en||'',
     answer:selectedText(q,target.answers?.[q.id],lang,t.empty),
    })),
   })
   setError('')
  }catch{setError(t.pdfError)}
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
   <section className={base.sheet+' '+extra.courseSheet}>
    {loading?<div className={base.center} role="status">{t.load}</div>
    : (!course||restartRequested)?<div className={base.intro+' '+extra.courseIntro} data-tradition-start data-tradition-coaching-onboarding>
      {entryStep==='intro'?<CoachingSessionIntroduction locale={lang} headingRef={heading}
        name={def.name[lang]} modelName={def.name[lang]} minutes={def.totalScreens*2}
        questionCount={def.totalScreens} style="reflective" imageSrc={def.art}
        approach={def.description[lang]} outcome={def.note[lang]}
         checkin={checkin} onCheckinChange={setCheckin}/>
      :entryStep==='roadmap'?<div className={extra.roadmap} data-tradition-stage-overview>
        <span className={base.eyebrow}>{def.name[lang]}</span>
        <h1 ref={heading} tabIndex={-1}>{v.overview}</h1>
        <p>{v.overviewText}</p>
        <div className={extra.roadmapList}>
         {traditionStages(def.slug).map(stage=><TraditionStageArt key={stage.id} stage={stage} lang={lang} compact/>)}
        </div>
      </div>
      :<CoachingSessionTopic locale={lang} checkin={checkin} headingRef={heading} value={clientTopic}
        onChange={value=>{setClientTopic(value);setTopicAdultConfirmed(false)}}
        ageConfirmed={topicAdultConfirmed} onAgeConfirm={setTopicAdultConfirmed}/>}
      {error&&<p role="alert" className={base.error}>{error}</p>}
      <div className={extra.introActions}>
        {entryStep!=='intro'&&<button type="button" className={base.back} disabled={busy} onClick={()=>setEntryStep(entryStep==='topic'?'roadmap':'intro')}>
          <ChevronLeft size={17}/>{t.back}</button>}
        <button type="button" className={base.primary}
          disabled={busy||(entryStep==='topic'&&(!clientTopic||(clientTopic==='sexuality'&&!topicAdultConfirmed)))}
          onClick={()=>entryStep==='intro'?setEntryStep('roadmap'):entryStep==='roadmap'?setEntryStep('topic'):(error&&!data?reload():start())}>
          {busy?t.save:entryStep==='intro'?v.introStep:entryStep==='roadmap'?v.nextStep
            :error&&!data?t.retry:{en:'Continue to questions',ru:'Перейти к вопросам',es:'Ir a las preguntas'}[lang]}
          <ArrowRight size={18}/>
        </button>
      </div>
      <Link href={home} className={base.secondary}>{t.home}</Link>
    </div>
    :completed?<div className={base.summary+' '+extra.courseSummary} data-tradition-summary>
      <span className={base.completed}><Check size={16}/>{t.complete}</span>
      <h1>{t.result}</h1>
      <p>{def.name[lang]}</p>
      <p className={base.subtle}>{t.date}: {coachingReportDate(session.completedAt||session.startedAt,lang)}</p>
      {session?.clientTopic&&<p>{coachingRequestTopicLabel(session.clientTopic,lang)}</p>}
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
         <strong>{coachingReportDate(old.completedAt||old.startedAt,lang)}</strong>
         {questions.map(q=><p key={q.id}><b>{q.question[lang]}</b> {selectedText(q,old.answers?.[q.id],lang,t.empty)}</p>)}
         {old.status==='completed'&&<button type="button" className={base.back} onClick={()=>downloadReport(old)}><Download size={16}/>{t.pdf}</button>}
        </article>)}
      </details>}
      <p className={base.privacyNote}>{t.privacy}</p>
      <button type="button" className={base.primary} data-coaching-download-pdf disabled={busy} onClick={()=>downloadReport(session)}><Download size={18}/>{t.pdf}</button>
      {error&&<p role="alert" className={base.error}>{error}</p>}
      <button type="button" className={base.primary} disabled={busy} onClick={()=>{setEntryStep('intro');setCheckin('');setClientTopic('');setTopicAdultConfirmed(false);setRestartRequested(true)}}>{t.again}<ArrowRight size={18}/></button>
      <Link className={base.secondary} href={home}>{t.home}</Link>
      <button type="button" className={base.delete} disabled={busy} onClick={erase}><Trash2 size={16}/>{t.delete}</button>
      <small className={base.disclaimer}>{t.introNote}</small>
    </div>
    :question?<div className={base.session+' '+extra.courseSession} data-tradition-one-question data-tradition-question={question.id}>
      <div className={base.progressHeader}>
        <span className={base.eyebrow}>{def.name[lang]}</span>
        <strong>{t.question} {index+1} {t.of} {questions.length}</strong>
      </div>
      <div className={base.progressTrack} role="progressbar" aria-label={t.question}
        aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={index+1}>
        <span style={{width:((index+1)/questions.length*100)+'%'}}/>
      </div>
      <div className={base.questionArea+' '+extra.courseScroll}>
        <span className={base.stage}>{question.title?.[lang]||question.title?.en||question.stage}</span>
        <TraditionStageArt stage={stageGuide} lang={lang}/>
        <p className={extra.stagePrompt}>{v.reflect}</p>
        <div data-tradition-gentle-guide>
          <CoachingChatThread turn={conversationTurn} locale={lang}
             draftPreview={quickChoices&&choice?selectedText(question,{choiceId:choice,note:''},lang,t.empty):''}>
            <div className={extra.questionHeader}>
              <h1 ref={heading} tabIndex={-1}>{question.question?.[lang]}</h1>
            </div>
          </CoachingChatThread>
        </div>
        <TraditionCoachingAudio template={template} question={question.id} locale={lang} accountId={accountId}/>
        {quickChoices&&<p className={extra.hint}>{question.hint?.[lang]||''}</p>}
        {quickChoices&&<div className={extra.choices} role="radiogroup" aria-label={question.question?.[lang]} onKeyDown={onChoiceKeyDown}>
          {question.choices?.map((option,optionIndex)=><button type="button" role="radio" key={option.id}
            tabIndex={choice===option.id||(!choice&&optionIndex===0)?0:-1}
            aria-checked={choice===option.id} disabled={busy} data-choice-id={option.id}
            className={choice===option.id?extra.chosen:extra.choice} onClick={()=>{
              setChoice(option.id);setError('');setNotice('')
            }}>{choice===option.id?<Check size={18}/>:<span className={extra.choiceDot}/>}
            {option.label?.[lang]||option.label?.en}</button>)}
        </div>}
        {!quickChoices&&choice&&<p className={extra.legacyChoice}>{t.earlierChoice}: {selectedText(question,{choiceId:choice,note:''},lang,t.empty)}</p>}
        {notice&&<p role="status" className={base.notice}><Check size={15}/>{notice}</p>}
        {error&&<p role="alert" className={base.error}>{error}</p>}
      </div>
      <footer className={base.footer} data-coaching-messenger-footer>
         <div className={base.chatComposer+' '+extra.chatComposer} data-coaching-composer>
           <label className={base.answerLabel} htmlFor="tradition-coaching-note">{quickChoices?t.note:t.ownAnswer}</label>
           <textarea id="tradition-coaching-note" className={base.textarea+' '+extra.note}
             value={note} aria-describedby="tradition-coaching-report-note"
             data-tradition-open-reflection={!quickChoices?'true':undefined}
             disabled={busy} maxLength={500} rows={2}
             placeholder={quickChoices?t.placeholder:t.openPlaceholder}
             onChange={e=>{setNote(e.target.value);if(!quickChoices)setChoice('');setError('');setNotice('')}}/>
           <div className={base.composerTools}>
             <CoachingQuestionVoice key={question.id} text={[conversationTurn?.speech,question.question?.[lang]||''].filter(Boolean).join(' ')}
               locale={lang} compact disabled={busy} onTranscript={value=>{
                 setNote(old=>((old?old+' ':'')+value).slice(0,500))
                 if(!quickChoices)setChoice('')
                 setNotice('');setError('')
               }}/>
             <small className={base.draftCount}>{note.length}/500</small>
           </div>
           <details className={base.reportDetails}>
             <summary>{lang==='ru'?'Сохранение и PDF':lang==='es'?'Guardado y PDF':'Saving & PDF'}</summary>
             <small className={extra.noteTip}>{quickChoices?t.noteHelp:t.freeHelp}</small>
             <small className={extra.noteTip} id="tradition-coaching-report-note" data-coaching-save-report-notice>{t.reportNotice}</small>
           </details>
         </div>
        <div className={base.footerActions}>
          <button type="button" className={base.back} disabled={busy||index===0} onClick={backward}><ChevronLeft size={18}/>{t.back}</button>
          <button type="button" className={base.primary} disabled={busy} onClick={()=>advance(false)}>
            {busy?t.save:index===questions.length-1?t.finish:(lang==='ru'?'Отправить и далее':lang==='es'?'Enviar y seguir':'Send & continue')}<ArrowRight size={18}/>
          </button>
        </div>
        {!question.required&&<button type="button" className={base.skip} disabled={busy} onClick={()=>advance(true)}>{t.skip}</button>}
      </footer>
    </div>:<div className={base.center} role="alert">{t.loadError}</div>}
   </section>
  </div>
 </main>
}

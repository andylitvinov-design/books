'use client'

import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {useRouter,useSearchParams} from 'next/navigation'
import {ArrowLeft,Play,Pause,Volume2,VolumeX,List,ChevronDown,ChevronLeft,ChevronRight,X,Info,BookOpen,CalendarDays,Gift,GraduationCap,RotateCcw,Maximize,Minimize} from 'lucide-react'
import {getCoachPersona,localCoachText,PUBLIC_COACH_RAIL_IDS,coachSessionHref,COACH_METHOD_CODES} from '@/lib/coaching/persona-registry.mjs'
import {greetingSwipeDirection,greetingCoachNeighbor} from '@/lib/coaching/coach-greeting-swipe.mjs'
import {coachIntroAudioPath,startDirectCoachIntroAudio} from '@/lib/personal-coaching/direct-coach-intro-audio.mjs'
import MyCoachMotionMedia from './my-coach-motion-media'
import {MyCoachInlineProfile} from './my-coach-compact-profile'
import {COACH_PROGRAM_GROUPS,INTRODUCTORY_COACH_SESSION_ID,coachCourseLocal} from '@/lib/coaching/coach-course-journey.mjs'
import {MEANING_AXES_COACH_SESSION_ID} from '@/lib/coaching/coach-profile-session-v3.mjs'
import {COACH_COMPARISON_IDS,getCoachProgramComparison} from '@/lib/coach-program-comparison.mjs'
import {courseLaunchNeighbor,courseLaunchPresentation} from '@/lib/coach-course-launch.mjs'
import {appFetch} from '@/lib/app/client-fetch'
import {projectCourseSession,resolveSavedCoachSession} from '@/lib/coach-course-session-progress.mjs'
import {ClarityStartLink} from './app/clarity-program'
import styles from './my-coach-greeting-gate.module.css'
import {ReikiJoinDialog} from './reiki-join-dialog'
import {useGooglePageAction} from './use-google-page-action'

const words={
 en:{eyebrow:'MEET YOUR AI COACH',play:'Hear my greeting',playing:'Your coach is speaking…',
    start:'Introductory session with',thematic:'Thematic session',choose:'Choose your session topic',hint:'Choose a program, then a session.',close:'Close topic selection',again:'Listen to the greeting again',
    failed:'The greeting audio could not play. You can try again or start the session.',
    free:'The introduction is free. Live voice starts only when you choose a session.',
    back:'Choose a different coach',previous:'Previous coach',next:'Next coach'},
 ru:{eyebrow:'ЗНАКОМСТВО С AI-КОУЧЕМ',play:'Послушать приветствие',
    playing:'Коуч приветствует вас…',start:'Вводная сессия с',
    thematic:'Тематическая сессия',choose:'Выберите тему сессии',hint:'Выберите программу, затем занятие.',close:'Закрыть выбор темы',again:'Прослушать приветствие ещё раз',
    failed:'Приветствие не удалось воспроизвести. Повторите попытку или начните сессию.',
    free:'Приветствие бесплатно. Живой разговор начинается только по вашему выбору.',
    back:'Выбрать другого коуча',previous:'Предыдущий коуч',next:'Следующий коуч'},
 es:{eyebrow:'CONOCE A TU COACH DE IA',play:'Escuchar la bienvenida',
    playing:'Tu coach te está saludando…',start:'Sesión introductoria con',
    thematic:'Sesión temática',choose:'Elige el tema de la sesión',hint:'Elige un programa y después una sesión.',close:'Cerrar selección de tema',again:'Volver a escuchar la presentación',
    failed:'No se pudo reproducir la bienvenida. Puedes intentarlo otra vez o iniciar la sesión.',
    free:'La presentación es gratuita. La sesión de voz empieza solo cuando tú lo decides.',
    back:'Elegir otro coach',previous:'Coach anterior',next:'Siguiente coach'},
}

const progressWords={
 en:{unknown:'Session progress unavailable',known:(n,p)=>'Session '+n+': '+p+'% of 20 minutes',complete:'Course time completed',resume:'Continue Session {session} with {name}'},
 ru:{unknown:'Прогресс сессии недоступен',known:(n,p)=>'Сессия '+n+': '+p+'% от 20 минут',complete:'Время курса пройдено',resume:'Продолжить сессию {session} · {name}'},
 es:{unknown:'Progreso de sesión no disponible',known:(n,p)=>'Sesión '+n+': '+p+'% de 20 minutos',complete:'Tiempo del curso completado',resume:'Continuar sesión {session} con {name}'}
}
function useCourseSessionProgress(courseId,count,available,accountSaving){
 const [value,setValue]=useState(null)
 useEffect(()=>{
  setValue(null)
  if(courseId!=='clarity'||!available||!accountSaving)return
  let stopped=false,controller
  async function load(){
   controller?.abort()
   const request=new AbortController();controller=request
   setValue(null)
   try{
    const boot=await appFetch('bootstrap?view=portrait',undefined,'GET',{signal:request.signal})
    if(stopped||request.signal.aborted)return
    const data=await appFetch('clarity-course/clock',undefined,'GET',{accountId:boot.account.id,signal:request.signal})
    if(!stopped&&!request.signal.aborted&&Object.hasOwn(data,'clock'))setValue(projectCourseSession(data.clock,count))
   }catch{/* Guest, gated clock or unreadable status: unknown, not fabricated progress. */}
  }
  function visibility(){if(document.visibilityState==='hidden'){controller?.abort();setValue(null)}else void load()}
  function restore(e){if(e.persisted)void load()}
  if(document.visibilityState!=='hidden')void load()
  document.addEventListener('visibilitychange',visibility)
  window.addEventListener('pageshow',restore)
  return()=>{stopped=true;controller?.abort();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pageshow',restore)}
 },[courseId,count,available,accountSaving])
 return courseId==='clarity'&&available&&accountSaving?value:null
}
const screenWords={
 en:{video:'Coaching course',previousCoach:'Previous coach',nextCoach:'Next coach',previousCourse:'Previous course',nextCourse:'Next course',course:'Course',start:'Start course',resume:'Continue session',done:'Open My Daybook',progress:p=>p+'% completed',sessions:'Sessions',courses:'Courses',replay:'Replay greeting',play:'Play greeting',pause:'Pause greeting',mute:'Mute greeting',unmute:'Unmute greeting',seek:'Greeting position',expand:'Expand video',collapse:'Exit expanded view',error:'Recorded greeting unavailable. Please try again.',planned:'Planned price'},
 ru:{video:'Коучинг-курс',previousCoach:'Предыдущий коуч',nextCoach:'Следующий коуч',previousCourse:'Предыдущий курс',nextCourse:'Следующий курс',course:'Курс',start:'Пройти курс',resume:'Продолжить сессию',done:'Открыть дневник',progress:p=>p+'% пройдено',sessions:'Сессии',courses:'Курсы',replay:'Повторить приветствие',play:'Воспроизвести приветствие',pause:'Пауза приветствия',mute:'Выключить звук',unmute:'Включить звук',seek:'Позиция приветствия',expand:'Развернуть видео',collapse:'Свернуть видео',error:'Записанное приветствие недоступно. Повторите попытку.',planned:'Плановая цена'},
 es:{video:'Curso de coaching',previousCoach:'Coach anterior',nextCoach:'Coach siguiente',previousCourse:'Curso anterior',nextCourse:'Curso siguiente',course:'Curso',start:'Empezar curso',resume:'Continuar sesión',done:'Abrir Mi diario',progress:p=>p+'% completado',sessions:'Sesiones',courses:'Cursos',replay:'Repetir bienvenida',play:'Reproducir bienvenida',pause:'Pausar bienvenida',mute:'Silenciar bienvenida',unmute:'Activar sonido',seek:'Posición de bienvenida',expand:'Ampliar video',collapse:'Cerrar vista ampliada',error:'La bienvenida grabada no está disponible. Inténtalo de nuevo.',planned:'Precio previsto'}
}
function clockText(seconds){
 if(!Number.isFinite(seconds))return '--:--'
 const n=Math.max(0,Math.floor(seconds))
 return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')
}
function CourseProgress({progress,lang}){
 const t=screenWords[lang],label=progress?progressWords[lang].known(progress.session,progress.percent):progressWords[lang].unknown
 return <span className={styles.ctaProgress} data-course-session-progress={progress?.percent??'unknown'} aria-label={label}>
  <span>{progress?t.progress(progress.percent):progressWords[lang].unknown}</span>
  {progress&&<span className={styles.progressTrack} aria-hidden="true"><span style={{width:progress.percent+'%'}}/></span>}
 </span>
}

// Audio is the existing public, first-party recorded welcome MP3. The video
// portrait is silent; no fake lip-sync or Gemini/TTS billing is involved.
export default function MyCoachGreetingGate({personaId,locale='en',name,methodId,onStart,accountSaving=false,entryPending=false,resumeControl,speechReviewControl,selectedMethod='',onMethodSelect,methodSelectionEnabled=false,privateProfileEnabled=false,draftCourses=[],savedSessions=[],resumeLookupReady=false,resumeBusy=false,resumeError=false,resumeCursor=null,onResumeSession,onReloadSessions}){
 const lang=words[locale]?locale:'en',t=words[lang]
 const router=useRouter(),query=useSearchParams()
 const persona=getCoachPersona(personaId)
 const [program,setProgram]=useState(()=>COACH_COMPARISON_IDS.includes(query?.get('greetingProgram'))?query.get('greetingProgram'):'clarity')
 const course=getCoachProgramComparison(lang).programs.find(item=>item.id===program)
 const ui=screenWords[lang],presentation=courseLaunchPresentation(lang,course)
 const progress=useCourseSessionProgress(program,course.count,course.available,accountSaving)
 const resumePanel=useRef(null)
 const resolveEntry=id=>resolveSavedCoachSession({accountSaving,ready:resumeLookupReady,busy:resumeBusy,error:resumeError,cursor:resumeCursor,items:savedSessions,topic:id,personaId})
 const mainEntry=resolveEntry(INTRODUCTORY_COACH_SESSION_ID)
 const entryWords=({ru:{lookup:'Проверить историю сессий',choose:'Открыть историю сессий',saved:'Сохранено в черновике'},en:{lookup:'Check session history',choose:'Open session history',saved:'Saved in draft'},es:{lookup:'Consultar historial',choose:'Abrir historial de sesiones',saved:'Guardado en borrador'}})[lang]
 const entryLabel=entry=>entry.kind==='resume'?ui.resume:entry.kind==='new'?ui.start:entryWords[entry.kind]
 const [expanded,setExpanded]=useState(false)
 const [dialogMode,setDialogMode]=useState('sessions')
 const [time,setTime]=useState(0),[duration,setDuration]=useState(null),[muted,setMuted]=useState(false)
 const muteRef=useRef(false),detachAudio=useRef(()=>{})
 const [audioActive,setAudioActive]=useState(false)
 const [phase,setPhase]=useState('preview')
 const [greetingStarted,setGreetingStarted]=useState(false)
 const [error,setError]=useState('')
 const [expandedGroup,setExpandedGroup]=useState(null)
 const topicDialog=useRef(null)
 const topicTrigger=useRef(null)
 const chosen=useRef(false)
 const player=useRef(null)
 const audioRun=useRef(0)
 const touchOrigin=useRef(null)
 const switching=useRef(false)
 const canSwitch=PUBLIC_COACH_RAIL_IDS.includes(personaId)&&PUBLIC_COACH_RAIL_IDS.length>1
 const [readyTopic,setReadyTopic]=useState(null)
 const gateError=({en:'Could not continue. Please try again.',ru:'Не удалось продолжить. Попробуйте ещё раз.',es:'No pudimos continuar. Inténtalo de nuevo.'})[lang]
 const gate=useGooglePageAction({locale:lang,continuation:'my-coach-action',kind:'coach-topic',onAuthorized:action=>{
   // Restore only the selected topic; OAuth is never proof that audio ended.
   if(action.id===INTRODUCTORY_COACH_SESSION_ID||COACH_PROGRAM_GROUPS.some(group=>group.sessions.some(item=>item.id===action.id)))setReadyTopic(action.id)
 }})
 useEffect(()=>()=>{audioRun.current++;detachAudio.current();player.current?.cancel?.();player.current=null},[])
 useEffect(()=>{audioRun.current++;detachAudio.current();player.current?.cancel?.();player.current=null;
   topicDialog.current?.close();chosen.current=false;switching.current=false;touchOrigin.current=null;setExpandedGroup(null);
   setGreetingStarted(false);setPhase('preview');setError('');setAudioActive(false);setTime(0);setDuration(null);setExpanded(false)},[personaId,lang])
 useEffect(()=>{if(!expanded)return;const escape=e=>{if(e.key==='Escape')setExpanded(false)};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape)},[expanded])
 function selectProgram(id){
   if(!COACH_COMPARISON_IDS.includes(id)||id===program||gate.busy)return
   setProgram(id);setReadyTopic(null)
   // Public course preference only; retain it across the existing Google return.
   const url=new URL(window.location.href)
   url.searchParams.set('greetingProgram',id)
   window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash)
 }
 function switchCoach(direction){
   if(!canSwitch||chosen.current||switching.current)return
   const nextId=greetingCoachNeighbor(PUBLIC_COACH_RAIL_IDS,personaId,direction)
   const href=nextId&&coachSessionHref(lang,nextId)
   if(!href)return
   switching.current=true
   touchOrigin.current=null
   // Invalidate late audio callbacks before stopping the previous greeting.
   audioRun.current++
   detachAudio.current();player.current?.cancel?.()
   player.current=null
   setGreetingStarted(false);setPhase('preview');setError('');setAudioActive(false)
   // Existing route remounts MyCoachLiveDialogue by persona ID. Do not start Live here.
   router.push(href+'&greetingProgram='+encodeURIComponent(program))
 }
 function beginSwipe(event){
   if(event.target.closest?.('button,a,input,select,[role=dialog]')||!canSwitch||switching.current||chosen.current||event.touches.length!==1){
     touchOrigin.current=null;return
   }
   const touch=event.touches[0]
   touchOrigin.current={id:touch.identifier,x:touch.clientX,y:touch.clientY}
 }
 function endSwipe(event){
   const origin=touchOrigin.current
   touchOrigin.current=null
   if(!origin||event.touches.length!==0)return
   const touch=Array.from(event.changedTouches).find(item=>item.identifier===origin.id)
   if(!touch)return
   const direction=greetingSwipeDirection(touch.clientX-origin.x,touch.clientY-origin.y)
   if(direction)switchCoach(direction)
 }
 function playGreeting(){
   if(switching.current||chosen.current)return
   const url=coachIntroAudioPath(personaId,lang)
   if(!url){setError(ui.error);setPhase('preview');return}
   audioRun.current++
   const generation=audioRun.current
   detachAudio.current();player.current?.cancel?.()
   player.current=null
   setError('');setTime(0);setDuration(null);setAudioActive(false);setPhase('playing')
   let failed=false
   function fail(){if(audioRun.current!==generation)return;failed=true;detachAudio.current();player.current=null;setAudioActive(false);setError(ui.error);setPhase('preview')}
   try{
     const active=startDirectCoachIntroAudio(url,{
       locale:lang,muted:muteRef.current,
       onStart:()=>{if(audioRun.current===generation){setGreetingStarted(true);setAudioActive(true);setPhase('playing')}},
       onEnd:()=>{if(audioRun.current===generation){const audio=player.current?.audio;if(!audio?.ended||!Number.isFinite(audio.duration)||audio.duration<=0){fail();return}setDuration(audio.duration);setTime(audio.duration);detachAudio.current();player.current=null;setAudioActive(false);setPhase('complete')}},
       onBlocked:fail,onError:fail,
     })
     if(failed){active.cancel();return}
     player.current=active
     const audio=active.audio
     function position(){if(audioRun.current!==generation)return;if(Number.isFinite(audio.duration)){setDuration(audio.duration);setTime(audio.currentTime)}}
     function playing(){if(audioRun.current===generation){setGreetingStarted(true);setAudioActive(true);setPhase('playing')}}
     audio.addEventListener('loadedmetadata',position);audio.addEventListener('timeupdate',position);audio.addEventListener('playing',playing)
     detachAudio.current=()=>{audio.removeEventListener('loadedmetadata',position);audio.removeEventListener('timeupdate',position);audio.removeEventListener('playing',playing)}
     position()
   }catch{fail()}
 }
 function toggleGreeting(){
   const audio=player.current?.audio
   if(phase==='playing'&&audioActive&&audio){audio.pause();setPhase('paused');setAudioActive(false);return}
   if(phase==='paused'&&audio){try{const p=audio.play();if(p?.catch)void p.catch(()=>{setError(ui.error);setPhase('paused')})}catch{setError(ui.error)}return}
   if(phase!=='playing')playGreeting()
 }
 function seek(value){
   const audio=player.current?.audio
   if(audio&&Number.isFinite(audio.duration)&&audio.duration>0){audio.currentTime=Math.max(0,Math.min(audio.duration,Number(value)));setTime(audio.currentTime)}
 }
 function toggleMute(){muteRef.current=!muteRef.current;player.current?.setMuted?.(muteRef.current);setMuted(muteRef.current)}
 function chooseSession(id,options){
   if(entryPending||!greetingStarted||chosen.current||switching.current||gate.busy)return
   if(!accountSaving){topicDialog.current?.close();void gate.begin({id});return}
   const entry=resolveEntry(id)
   if(entry.kind!=='new'){
     topicDialog.current?.close()
     if(entry.kind==='resume'&&onResumeSession){void onResumeSession(entry.item);return}
     if(entry.kind==='lookup'&&!resumeBusy)void onReloadSessions?.()
     resumePanel.current?.scrollIntoView?.({block:'nearest'})
     return
   }
   chosen.current=true
   topicDialog.current?.close()
   audioRun.current++
   detachAudio.current();player.current?.cancel?.()
   player.current=null
   onStart?.(id,options)
 }
 function showTopics(mode='sessions'){
   setDialogMode(mode);setExpandedGroup(null)
   if(topicDialog.current&&!topicDialog.current.open)topicDialog.current.showModal()
 }
 const label=name||localCoachText(persona?.name,lang)||''
 return <div className={styles.screen} data-my-coach-greeting-gate={personaId}
   data-greeting-phase={phase}>
   <div className={styles.firstView}>
     <div className={styles.cinema} data-coach-greeting-cinema data-expanded={expanded?'true':'false'}>
       <div className={styles.cinemaMedia} aria-hidden="true"><MyCoachMotionMedia personaId={personaId} phase="greeting" context="greeting"/></div>
       <div className={styles.cinemaShade} aria-hidden="true"/>
       <div className={styles.cinemaTop}>
         <span className={styles.videoLabel}><GraduationCap size={19} aria-hidden="true"/>{ui.video}</span>
       </div>
       <div className={styles.portraitSpace} data-coach-greeting-swipe={canSwitch?'true':undefined}
         onTouchStart={beginSwipe} onTouchEnd={endSwipe}
         onTouchMove={event=>{if(event.touches.length!==1)touchOrigin.current=null}}
         onTouchCancel={()=>{touchOrigin.current=null}}
         onClickCapture={event=>{if(switching.current){event.preventDefault();event.stopPropagation()}}}>
         {canSwitch&&<><button type="button" className={styles.coachArrow} data-coach-greeting-previous onClick={()=>switchCoach(-1)} aria-label={t.previous}><ChevronLeft size={25} aria-hidden="true"/></button>
         <button type="button" className={styles.coachArrow} data-coach-greeting-next onClick={()=>switchCoach(1)} aria-label={t.next}><ChevronRight size={25} aria-hidden="true"/></button></>}
         {(phase==='preview'||phase==='paused')&&<button type="button" className={styles.centerPlay} data-coach-greeting-play onClick={toggleGreeting} aria-label={t.play}><Play size={35} fill="currentColor" aria-hidden="true"/></button>}
       </div>
       <div className={styles.overlay}>
         <div className={styles.coachName}><h2>{label}</h2><p>{localCoachText(persona?.role,lang)}</p></div>
         <div className={styles.ctaArea} data-coach-greeting-cta-slot data-ready={greetingStarted?'true':'false'}>
           {greetingStarted&&(readyTopic?<button type="button" className={styles.mainAction} disabled={gate.busy||entryPending} onClick={()=>chooseSession(readyTopic||INTRODUCTORY_COACH_SESSION_ID)}><Play size={25} fill="currentColor" aria-hidden="true"/><span>{({ru:'Продолжить выбранную сессию',en:'Continue selected session',es:'Continuar sesión elegida'})[lang]}</span><ChevronRight size={23}/></button>:course.available&&program==='clarity'?(progress?.complete?<ClarityStartLink locale={lang} coachId={personaId} className={styles.mainAction}>
             <BookOpen size={25} aria-hidden="true"/><span className={styles.ctaCopy}><strong>{ui.done}</strong><CourseProgress progress={progress} lang={lang}/></span><ChevronRight size={23} aria-hidden="true"/>
           </ClarityStartLink>:<button type="button" className={styles.mainAction} data-coach-greeting-live-start disabled={gate.busy||entryPending} onClick={()=>chooseSession(INTRODUCTORY_COACH_SESSION_ID)}>
             <Play size={25} fill="currentColor" aria-hidden="true"/><span className={styles.ctaCopy}><strong data-coach-greeting-course-start>{entryLabel(mainEntry)}</strong>{progress?<CourseProgress progress={progress} lang={lang}/>:mainEntry.item&&Number.isFinite(mainEntry.item.durationSeconds)?<span className={styles.ctaProgress}>{entryWords.saved}: {clockText(mainEntry.item.durationSeconds)}</span>:<CourseProgress progress={progress} lang={lang}/>}</span><ChevronRight size={23} aria-hidden="true"/>
           </button>):<p className={styles.unavailable} role="status">{getCoachProgramComparison(lang).copy.preview}</p>)}
           {greetingStarted&&speechReviewControl}
         </div>
         <div className={styles.courseSelector} data-coach-greeting-course={program}>
           <button type="button" className={styles.courseArrow} data-coach-greeting-course-previous aria-label={ui.previousCourse} onClick={()=>selectProgram(courseLaunchNeighbor(program,-1))}><ChevronLeft size={19} aria-hidden="true"/></button>
           <h1>{ui.course}: {presentation.title}</h1>
           <button type="button" className={styles.courseArrow} data-coach-greeting-course-next aria-label={ui.nextCourse} onClick={()=>selectProgram(courseLaunchNeighbor(program,1))}><ChevronRight size={19} aria-hidden="true"/></button>
         </div>
         <div className={styles.offer}><span><CalendarDays size={17} aria-hidden="true"/><span>{presentation.duration}: <strong>{course.available?'FREE':presentation.price}</strong>{!course.available&&<small> · {ui.planned}</small>}</span></span>
           {presentation.bonus&&<span><Gift size={18} aria-hidden="true"/><span>{presentation.bonus}</span></span>}
         </div>
         <div className={styles.tiles} data-coach-greeting-tiles>
           <button type="button" className={styles.tile} data-coach-greeting-thematic ref={topicTrigger} aria-haspopup="dialog" onClick={()=>showTopics('sessions')}><List size={25} aria-hidden="true"/><span>{ui.sessions}</span></button>
           <button type="button" className={styles.tile} data-coach-greeting-courses aria-haspopup="dialog" onClick={()=>showTopics('courses')}><BookOpen size={25} aria-hidden="true"/><span>{ui.courses}</span></button>
           <button type="button" className={styles.tile} data-coach-greeting-replay onClick={playGreeting}><RotateCcw size={25} aria-hidden="true"/><span>{ui.replay}</span></button>
         </div>
         <div className={styles.player} data-coach-greeting-player>
           <button type="button" onClick={toggleGreeting} disabled={phase==='playing'&&!audioActive} aria-label={phase==='playing'?ui.pause:ui.play}>{phase==='playing'?<Pause size={20} fill="currentColor"/>:<Play size={20} fill="currentColor"/>}</button>
           <span className={styles.time}>{clockText(time)} / {clockText(duration)}</span>
           <input type="range" aria-label={ui.seek} min="0" max={duration||1} step="0.1" value={duration?Math.min(time,duration):0} disabled={!duration||!player.current} onChange={e=>seek(e.target.value)}/>
           <button type="button" aria-label={muted?ui.unmute:ui.mute} onClick={toggleMute}>{muted?<VolumeX size={20}/>:<Volume2 size={20}/>}</button>
           <button type="button" aria-label={expanded?ui.collapse:ui.expand} aria-expanded={expanded} onClick={()=>setExpanded(p=>!p)}>{expanded?<Minimize size={19}/>:<Maximize size={19}/>}</button>
         </div>
         {error&&<p className={styles.mediaError} role="status">{error}</p>}
       </div>
     </div>
     {entryPending&&<p role="status">{({ru:'Проверяем ваш профиль…',en:'Checking your profile…',es:'Comprobando tu perfil…'})[lang]}</p>}
     <p className={styles.freeNotice}><Info size={18} aria-hidden="true"/><span>{t.free}{accountSaving?' '+({en:'Your session text is automatically saved privately in your account.',ru:'Текст сессии автоматически сохраняется в вашем личном кабинете.',es:'El texto de la sesión se guarda automáticamente en tu cuenta privada.'})[lang]:''}</span></p>
     {greetingStarted&&resumeControl&&<div ref={resumePanel} className={styles.resumeBelow}>{resumeControl}</div>}
   </div>
   <dialog ref={topicDialog} className={styles.topicDialog} aria-labelledby="coach-topics-title"
     data-coach-topic-dialog onClose={()=>{if(!chosen.current)topicTrigger.current?.focus()}}
     onClick={event=>{if(event.target===event.currentTarget){
       const bounds=event.currentTarget.getBoundingClientRect()
       if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)event.currentTarget.close()
     }}}>
     <div className={styles.topicHeader}>
       <div><h2 id="coach-topics-title">{dialogMode==='courses'?ui.courses:dialogMode==='sessions'?ui.sessions:t.choose}</h2><p>{dialogMode==='courses'?ui.course:t.hint}{accountSaving?' '+({en:'Session text is saved privately in your account.',ru:'Текст сессии сохраняется в личном кабинете.',es:'El texto se guarda en tu cuenta privada.'})[lang]:''}</p></div>
       <button type="button" className={styles.topicClose} onClick={()=>topicDialog.current?.close()} aria-label={t.close}><X size={23} aria-hidden="true"/></button>
     </div>
     <div className={styles.topicGroups}>
       {dialogMode==='courses'?getCoachProgramComparison(lang).programs.map(item=><button type="button" key={item.id} className={styles.topicChoice} aria-pressed={program===item.id} onClick={()=>{selectProgram(item.id);topicDialog.current?.close()}}><span>{courseLaunchPresentation(lang,item).title}</span><small>{item.available?'FREE':item.price}</small><ChevronRight size={18}/></button>):<>
       {dialogMode==='sessions'&&<div className={styles.coursePlan}><strong>{presentation.title}</strong><ol>{course.rows.map((row,i)=><li key={i}>{row.title}</li>)}</ol>{program==='clarity'&&savedSessions.filter(item=>item.courseSessionId===INTRODUCTORY_COACH_SESSION_ID).map(item=><p key={item.id}>{entryWords.saved}: {clockText(item.durationSeconds)} · {localCoachText(getCoachPersona(item.personaId)?.name,lang)}</p>)}</div>}
       {phase==='complete'?<>
       <button type="button" className={styles.topicChoice} data-coach-greeting-start onClick={()=>chooseSession(readyTopic||INTRODUCTORY_COACH_SESSION_ID)}><span>{readyTopic?({ru:'Продолжить выбранную сессию',en:'Continue selected session',es:'Continuar sesión elegida'})[lang]:t.start+' '+label}</span><ChevronRight size={18}/></button>
       {privateProfileEnabled&&<div data-coach-private-profile-entry><button type="button" className={styles.topicChoice} onClick={()=>chooseSession(INTRODUCTORY_COACH_SESSION_ID,{privateProfile:true})}>{({en:'Wheel of Life · private text',ru:'Колесо жизненного баланса · приватный текст',es:'Rueda de la vida · texto privado'})[lang]}</button><button type="button" className={styles.topicChoice} onClick={()=>chooseSession(MEANING_AXES_COACH_SESSION_ID,{privateProfile:true})}>{({en:'Meaning Axes · private text',ru:'Оси смысла · приватный текст',es:'Ejes de sentido · texto privado'})[lang]}</button></div>}
       {COACH_PROGRAM_GROUPS.map(group=><section key={group.id} className={styles.topicGroup} data-coach-program={group.id}>
         <button type="button" className={styles.topicGroupButton} aria-expanded={expandedGroup===group.id}
           aria-controls={'coach-topic-'+group.id} onClick={()=>setExpandedGroup(previous=>previous===group.id?null:group.id)}>
           <span>{coachCourseLocal(group.title,lang)}</span><small>{group.sessions.length}</small><ChevronDown size={19} aria-hidden="true"/>
         </button>
         <div id={'coach-topic-'+group.id} hidden={expandedGroup!==group.id}>
           {group.sessions.map(item=><button key={item.id} type="button" className={styles.topicChoice}
             data-coach-topic={item.id} onClick={()=>chooseSession(item.id)}>
             <span className={styles.topicNumber}>{String(item.number).padStart(2,'0')}</span>
             <span>{coachCourseLocal(item.title,lang)}{draftCourses.includes(item.id)&&<small> · {({ru:'Продолжить',en:'Continue',es:'Continuar'})[lang]}</small>}</span><ChevronRight size={18} aria-hidden="true"/>
           </button>)}
         </div>
       </section>)}
       </>:<p className={styles.planNotice}>{({en:'Listen to the coach’s greeting before starting a session.',ru:'Прослушайте приветствие коуча, чтобы начать сессию.',es:'Escucha la bienvenida antes de iniciar una sesión.'})[lang]}</p>}
       </>}
     </div>
   </dialog>
   {gate.error&&!gate.open&&<p role="alert" className={styles.mediaError}>{gateError}</p>}
   {gate.open&&<ReikiJoinDialog mode="coach" locale={lang} busy={gate.busy} error={gate.error?gateError:''} onGoogle={()=>void gate.signIn()} onDismiss={gate.dismiss}/>}
   <div className={styles.profileBelow}>
     {methodSelectionEnabled&&onMethodSelect&&<label data-coach-method-choice style={{display:'grid',gap:7,margin:'0 0 12px',fontSize:14}}>
       <span>{({ru:'Методика сессии (необязательно)',en:'Session method (optional)',es:'Método de sesión (opcional)'})[lang]}</span>
       <select value={selectedMethod} onChange={event=>onMethodSelect(event.target.value)}
         style={{minHeight:44,maxWidth:'100%',borderRadius:12,padding:'8px',fontSize:16}}>
         <option value="">{({ru:'Обычный диалог',en:'Standard conversation',es:'Conversación habitual'})[lang]}</option>
         {persona?.methods.map(name=><option key={name} value={COACH_METHOD_CODES[name]}>{name}</option>)}
       </select>
       <small>{({ru:'Выбор фиксируется при начале сессии. Для другой методики начните новую сессию.',en:'Your choice is locked when the session starts. Start a new session to change it.',es:'El método se fija al comenzar. Inicia otra sesión para cambiarlo.'})[lang]}</small>
     </label>}
     <MyCoachInlineProfile personaId={personaId} locale={lang} methodId={methodId}/>
     <Link className={styles.back} href={'/'+lang+'/my-coach'}>
       <ArrowLeft size={17} aria-hidden="true"/>{t.back}</Link>
   </div>
 </div>
}

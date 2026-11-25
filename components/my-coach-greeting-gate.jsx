'use client'

import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {ArrowLeft,Play,RotateCcw,Sparkles,Volume2,List,ChevronDown,ChevronLeft,ChevronRight,X} from 'lucide-react'
import {getCoachPersona,localCoachText,PUBLIC_COACH_RAIL_IDS,coachSessionHref} from '@/lib/coaching/persona-registry.mjs'
import {greetingSwipeDirection,greetingCoachNeighbor} from '@/lib/coaching/coach-greeting-swipe.mjs'
import {getCoachPresentation} from '@/lib/coaching/persona-presentations.mjs'
import {coachIntroAudioPath,startDirectCoachIntroAudio} from '@/lib/personal-coaching/direct-coach-intro-audio.mjs'
import MyCoachMotionMedia from './my-coach-motion-media'
import {MyCoachInlineProfile} from './my-coach-compact-profile'
import {COACH_PROGRAM_GROUPS,INTRODUCTORY_COACH_SESSION_ID,coachCourseLocal} from '@/lib/coaching/coach-course-journey.mjs'
import styles from './my-coach-greeting-gate.module.css'

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

// Audio is the existing public, first-party recorded welcome MP3. The video
// portrait is silent; no fake lip-sync or Gemini/TTS billing is involved.
export default function MyCoachGreetingGate({personaId,locale='en',name,methodId,onStart,privateAutosaveControl}){
 const lang=words[locale]?locale:'en',t=words[lang]
 const router=useRouter()
 const persona=getCoachPersona(personaId)
 const presentation=getCoachPresentation(personaId,lang)
 const [phase,setPhase]=useState('preview')
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
 useEffect(()=>()=>{audioRun.current++;player.current?.cancel?.();player.current=null},[])
 useEffect(()=>{audioRun.current++;player.current?.cancel?.();player.current=null;
   topicDialog.current?.close();chosen.current=false;switching.current=false;touchOrigin.current=null;setExpandedGroup(null);
   setPhase('preview');setError('')},[personaId,lang])
 function switchCoach(direction){
   if(!canSwitch||chosen.current||switching.current)return
   const nextId=greetingCoachNeighbor(PUBLIC_COACH_RAIL_IDS,personaId,direction)
   const href=nextId&&coachSessionHref(lang,nextId)
   if(!href)return
   switching.current=true
   touchOrigin.current=null
   // Invalidate late audio callbacks before stopping the previous greeting.
   audioRun.current++
   player.current?.cancel?.()
   player.current=null
   setPhase('preview');setError('')
   // Existing route remounts MyCoachLiveDialogue by persona ID. Do not start Live here.
   router.push(href)
 }
 function beginSwipe(event){
   if(!canSwitch||switching.current||chosen.current||event.touches.length!==1){
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
   if(!url){setError(t.failed);setPhase('complete');return}
   audioRun.current++
   const generation=audioRun.current
   player.current?.cancel?.()
   player.current=null
   setError('');setPhase('playing')
   try{
     player.current=startDirectCoachIntroAudio(url,{
       fallbackText:presentation?.text||localCoachText(persona?.opening,lang),locale:lang,
       onStart:()=>{if(audioRun.current===generation)setPhase('playing')},
       onEnd:()=>{if(audioRun.current===generation){player.current=null;setPhase('complete')}},
       onBlocked:()=>{if(audioRun.current===generation){player.current=null;setError(t.failed);setPhase('complete')}},
       onError:()=>{if(audioRun.current===generation){player.current=null;setError(t.failed);setPhase('complete')}},
     })
   }catch{if(audioRun.current===generation){setPhase('complete');setError(t.failed)}}
 }
 function chooseSession(id){
   if(chosen.current||switching.current)return
   chosen.current=true
   topicDialog.current?.close()
   audioRun.current++
   player.current?.cancel?.()
   player.current=null
   onStart?.(id)
 }
 function showTopics(){
   setExpandedGroup(null)
   if(topicDialog.current&&!topicDialog.current.open)topicDialog.current.showModal()
 }
 const label=name||localCoachText(persona?.name,lang)||''
 const russianNames={mira:'Мирой',max:'Максом',sofia:'Софией',alex:'Алексом',merlin:'Мерлином',harry:'Гарри',genie:'Самиром'}
 const sessionName=lang==='ru'?(russianNames[personaId]||'«'+label+'»'):label
 return <div className={styles.screen} data-my-coach-greeting-gate={personaId}
   data-greeting-phase={phase}>
   <div className={styles.firstView}>
     <div className={styles.hero} data-coach-greeting-swipe={canSwitch?'true':undefined}
       onTouchStart={beginSwipe} onTouchEnd={endSwipe}
       onTouchMove={event=>{if(event.touches.length!==1)touchOrigin.current=null}}
       onTouchCancel={()=>{touchOrigin.current=null}}
       onClickCapture={event=>{if(switching.current){event.preventDefault();event.stopPropagation()}}}>
       <MyCoachMotionMedia personaId={personaId} phase="greeting" context="greeting" />
       <div className={styles.shade} aria-hidden="true"/>
       <span className={styles.badge}><Sparkles size={16} aria-hidden="true"/>{t.eyebrow}</span>
       {canSwitch&&<>
         <button type="button" className={styles.swipePrevious} data-coach-greeting-previous
           onClick={()=>switchCoach(-1)} aria-label={t.previous}><ChevronLeft size={25} aria-hidden="true"/></button>
         <button type="button" className={styles.swipeNext} data-coach-greeting-next
           onClick={()=>switchCoach(1)} aria-label={t.next}><ChevronRight size={25} aria-hidden="true"/></button>
       </>}
       <div className={styles.heroText}>
         <h1>{label}</h1>
         <p>{localCoachText(persona?.role,lang)}</p>
       </div>
       {phase==='preview'&&<button type="button" className={styles.largePlay}
         data-coach-greeting-play onClick={playGreeting}
         aria-label={t.play}><Play size={43} fill="currentColor" aria-hidden="true"/></button>}
       {phase==='playing'&&<div className={styles.speaking} role="status">
         <Volume2 size={19} aria-hidden="true"/><span>{t.playing}</span>
       </div>}
       {phase==='complete'&&<div className={styles.completed}>
         <p className={styles.greetingQuote}>“{presentation?.text||localCoachText(persona?.opening,lang)}”</p>
         {privateAutosaveControl}
         <button type="button" className={styles.primary} data-coach-greeting-start
           onClick={()=>chooseSession(INTRODUCTORY_COACH_SESSION_ID)}><Play size={20} fill="currentColor" aria-hidden="true"/>
           {t.start} {sessionName}</button>
         <button type="button" className={styles.secondary} data-coach-greeting-thematic ref={topicTrigger}
           aria-haspopup="dialog" onClick={showTopics}><List size={19} aria-hidden="true"/>{t.thematic}<ChevronDown size={17} aria-hidden="true"/></button>
         <button type="button" className={styles.replay} data-coach-greeting-replay
           onClick={playGreeting}><RotateCcw size={19} aria-hidden="true"/>{t.again}</button>
         {error&&<p className={styles.error} role="status">{error}</p>}
       </div>}
     </div>
     <p className={styles.freeNotice}>{t.free}</p>
   </div>
   <dialog ref={topicDialog} className={styles.topicDialog} aria-labelledby="coach-topics-title"
     data-coach-topic-dialog onClose={()=>{if(!chosen.current)topicTrigger.current?.focus()}}
     onClick={event=>{if(event.target===event.currentTarget){
       const bounds=event.currentTarget.getBoundingClientRect()
       if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)event.currentTarget.close()
     }}}>
     <div className={styles.topicHeader}>
       <div><h2 id="coach-topics-title">{t.choose}</h2><p>{t.hint}</p></div>
       <button type="button" className={styles.topicClose} onClick={()=>topicDialog.current?.close()} aria-label={t.close}><X size={23} aria-hidden="true"/></button>
     </div>
     <div className={styles.topicGroups}>
       {COACH_PROGRAM_GROUPS.map(group=><section key={group.id} className={styles.topicGroup} data-coach-program={group.id}>
         <button type="button" className={styles.topicGroupButton} aria-expanded={expandedGroup===group.id}
           aria-controls={'coach-topic-'+group.id} onClick={()=>setExpandedGroup(previous=>previous===group.id?null:group.id)}>
           <span>{coachCourseLocal(group.title,lang)}</span><small>{group.sessions.length}</small><ChevronDown size={19} aria-hidden="true"/>
         </button>
         <div id={'coach-topic-'+group.id} hidden={expandedGroup!==group.id}>
           {group.sessions.map(item=><button key={item.id} type="button" className={styles.topicChoice}
             data-coach-topic={item.id} onClick={()=>chooseSession(item.id)}>
             <span className={styles.topicNumber}>{String(item.number).padStart(2,'0')}</span>
             <span>{coachCourseLocal(item.title,lang)}</span><ChevronRight size={18} aria-hidden="true"/>
           </button>)}
         </div>
       </section>)}
     </div>
   </dialog>
   <div className={styles.profileBelow}>
     <MyCoachInlineProfile personaId={personaId} locale={lang} methodId={methodId}/>
     <Link className={styles.back} href={'/'+lang+'/my-coach'}>
       <ArrowLeft size={17} aria-hidden="true"/>{t.back}</Link>
   </div>
 </div>
}

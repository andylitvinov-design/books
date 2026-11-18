'use client'
import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {Check,History,Pause,Play,Sparkles,X} from 'lucide-react'
import {ALI_PERSONAS} from '@/lib/holistic-support/ali-personas.mjs'
import {useAliPersona} from './use-ali-persona'
import {playAliPersonaAudio,stopAliPersonaAudio} from './ali-persona-audio'
import css from './ali-persona-picker.module.css'

const COPY={
 en:{heading:'Choose your guide',intro:'Four voices, one thoughtful AI companion.',
  choose:'Choose',selected:'Selected',listen:'Listen',stop:'Stop',
  close:'Close persona selector',history:'Previous chats',
  note:'Fictional AI presenters. Your conversations and recommendations stay the same.'},
 ru:{heading:'Выберите ведущего',intro:'Четыре голоса — один внимательный ИИ-помощник.',
  choose:'Выбрать',selected:'Выбран',listen:'Послушать',stop:'Стоп',
  close:'Закрыть выбор ведущего',history:'Прошлые чаты',
  note:'Это образы ИИ. История бесед, возможности и рекомендации сохраняются.'},
 es:{heading:'Elige tu guía',intro:'Cuatro voces, un mismo asistente atento.',
  choose:'Elegir',selected:'Elegido',listen:'Escuchar',stop:'Detener',
  close:'Cerrar selector',history:'Chats anteriores',
  note:'Son personajes de IA. Tus conversaciones y opciones no cambian.'},
}
export default function AliPersonaPicker({open,onClose,locale='en'}){
 const t=COPY[locale]||COPY.en
 const {id,select}=useAliPersona()
 const [playing,setPlaying]=useState(null)
 const [mounted,setMounted]=useState(false)
 const dialogRef=useRef(null)
 useEffect(()=>setMounted(true),[])
 useEffect(()=>{
  if(!open){stopAliPersonaAudio();return}
  const onKey=event=>{if(event.key==='Escape')onClose()}
  document.addEventListener('keydown',onKey)
  const focus=window.requestAnimationFrame(()=>dialogRef.current?.focus())
  return()=>{document.removeEventListener('keydown',onKey);
    window.cancelAnimationFrame(focus);stopAliPersonaAudio()}
 },[open,onClose])
 const toggleSample=personaId=>{
  if(playing===personaId){stopAliPersonaAudio();setPlaying(null);return}
  playAliPersonaAudio(personaId,locale,isPlaying=>setPlaying(isPlaying?personaId:null))
 }
 if(!mounted||!open)return null
 return createPortal(<div className={css.backdrop} data-hh-ali-persona-picker
   onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true"
   aria-labelledby="hh-ali-persona-heading" className={css.dialog}>
   <header className={css.heading}>
    <div><div className={css.eyebrow}><Sparkles size={15}/> Holistic House · AI</div>
      <h2 id="hh-ali-persona-heading">{t.heading}</h2><p>{t.intro}</p></div>
    <button type="button" className={css.close} aria-label={t.close} onClick={onClose}>
     <X size={21}/></button>
   </header>
   <div className={css.grid}>
    {ALI_PERSONAS.map(persona=><article key={persona.id} className={css.card}
      data-selected={id===persona.id} data-ali-persona={persona.id}>
      <button type="button" className={css.choose} aria-pressed={id===persona.id}
       aria-label={t.choose+' '+persona.name[locale]}
       onClick={()=>{stopAliPersonaAudio();select(persona.id);onClose()}}>
       <img src={persona.image} width={150} height={130} alt="" loading="lazy"/>
       {id===persona.id&&<span className={css.check}><Check size={15}/></span>}
       <strong>{persona.name[locale]}</strong>
       <span>{persona.role[locale]}</span>
      </button>
      <button type="button" className={css.listen} data-ali-voice-preview={persona.id}
       aria-label={(playing===persona.id?t.stop:t.listen)+' · '+persona.name[locale]}
       aria-pressed={playing===persona.id} onClick={()=>toggleSample(persona.id)}>
       {playing===persona.id?<Pause size={15}/>:<Play size={15}/>}
       {playing===persona.id?t.stop:t.listen}
      </button>
    </article>)}
   </div>
   <p className={css.note}>{t.note}</p>
   <button className={css.history} type="button" onClick={()=>{
    onClose();window.dispatchEvent(new Event('hh:messenger-open-history'))}}>
    <History size={17}/>{t.history}
   </button>
  </section>
 </div>,document.body)
}

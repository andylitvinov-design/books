'use client'
import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {Check,History,Leaf,Pause,Play,X} from 'lucide-react'
import {ALI_PERSONAS} from '@/lib/holistic-support/ali-personas.mjs'
import {useAliPersona} from './use-ali-persona'
import {playAliPersonaAudio,stopAliPersonaAudio,prepareAliNaturalVoice} from './ali-persona-audio'
import css from './ali-persona-picker.module.css'

const COPY={
 en:{heading:'Choose your AI guide',intro:'Choose the personality you feel most comfortable with. The same intelligence, different voice and style.',
  choose:'Choose',listen:'Listen',loading:'Loading…',retry:'Try audio again',stop:'Stop',close:'Close persona selector',history:'Previous chats',
  note:'These are fictional AI presenters, not human therapists. Changing your guide does not change your chat history.',
  description:{alex:'Warm and imaginative. Helps you find a path to your dream.',max:'Direct and energetic. Focuses on choices and the next step.',
    mira:'Kind and patient. Offers calm support and space to reflect.',sofia:'Thoughtful and composed. Helps you explore meanings and priorities.'}},
 ru:{heading:'Выберите своего ведущего',intro:'С кем вам комфортнее общаться? Интеллект один, но голос и манера общения разные.',
  choose:'Выбрать',listen:'Послушать',loading:'Загрузка…',retry:'Повторить аудио',stop:'Стоп',close:'Закрыть выбор ведущего',history:'Прошлые чаты',
  note:'Это образы ИИ, а не реальные терапевты. При смене ведущего история переписки сохраняется.',
  description:{alex:'Тёплый ИИ-джин. Помогает найти путь к мечте.',max:'Энергичный и конкретный. Помогает перейти к действию.',
    mira:'Бережная и терпеливая. Создаёт пространство для спокойного разговора.',sofia:'Вдумчивая и спокойная. Помогает разобраться в смыслах и приоритетах.'}},
 es:{heading:'Elige tu guía de IA',intro:'Elige con quién te sientas mejor. La misma inteligencia, con otra voz y estilo.',
  choose:'Elegir',listen:'Escuchar',loading:'Cargando…',retry:'Reintentar audio',stop:'Detener',close:'Cerrar selector',history:'Chats anteriores',
  note:'Estos guías son personajes de IA, no terapeutas reales. Tus chats se conservan al cambiar de guía.',
  description:{alex:'Cercano e imaginativo. Ayuda a encontrar el camino hacia tu sueño.',max:'Directo y enérgico. Se enfoca en decisiones y próximos pasos.',
    mira:'Amable y paciente. Ofrece apoyo y espacio para reflexionar.',sofia:'Serena y reflexiva. Ayuda a explorar prioridades y sentido.'}},
}
const BARS=[7,11,6,16,9,20,10,15,8,22,12,7,18,11,15,9,20,7,13,10,17,6]

export default function AliPersonaPicker({open,onClose,locale='en'}){
 const t=COPY[locale]||COPY.en
 const {id,select}=useAliPersona()
 const [candidate,setCandidate]=useState(id)
 const [playing,setPlaying]=useState(null)
 const [audioPhase,setAudioPhase]=useState('idle')
 const [audioFailed,setAudioFailed]=useState(null)
 const [mounted,setMounted]=useState(false)
 const dialogRef=useRef(null)
 useEffect(()=>setMounted(true),[])
 useEffect(()=>{
  if(!open){stopAliPersonaAudio();setPlaying(null);return}
  setCandidate(id)
  void prepareAliNaturalVoice()
  const previous=document.activeElement
  const onKey=event=>{
   if(event.key==='Escape'){event.preventDefault();onClose()}
   if(event.key!=='Tab'||!dialogRef.current)return
   const focusable=[...dialogRef.current.querySelectorAll('button:not([disabled])')]
   if(!focusable.length)return
   const first=focusable[0],last=focusable[focusable.length-1]
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
   if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
  document.addEventListener('keydown',onKey)
  const focus=window.requestAnimationFrame(()=>dialogRef.current?.focus())
  return()=>{
   document.removeEventListener('keydown',onKey)
   window.cancelAnimationFrame(focus)
   stopAliPersonaAudio()
   if(previous?.isConnected&&typeof previous.focus==='function')previous.focus()
  }
 },[open,id,onClose])
 const toggleSample=personaId=>{
  if(playing===personaId){stopAliPersonaAudio();setPlaying(null);setAudioPhase('idle');return}
  setAudioFailed(null)
  playAliPersonaAudio(personaId,locale,(isPlaying,phase)=>{
   setPlaying(isPlaying?personaId:null)
   setAudioPhase(isPlaying?phase:'idle')
   if(!isPlaying&&phase==='error')setAudioFailed(personaId)
  })
 }
 const selected=ALI_PERSONAS.find(p=>p.id===candidate)||ALI_PERSONAS[0]
 if(!mounted||!open)return null
 return createPortal(<div className={css.backdrop} data-hh-ali-persona-picker
   onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true"
   aria-labelledby="hh-ali-persona-heading" className={css.dialog}>
   <header className={css.heading}>
    <span className={css.mark}><Leaf size={25} aria-hidden="true"/></span>
    <div className={css.headingCopy}>
      <h2 id="hh-ali-persona-heading">{t.heading}</h2><p>{t.intro}</p>
    </div>
    <button type="button" className={css.close} aria-label={t.close} onClick={onClose}>
     <X size={21} aria-hidden="true"/></button>
   </header>
   <div className={css.grid} role="group" aria-label={t.heading}>
    {ALI_PERSONAS.map(persona=><article key={persona.id} className={css.card}
      data-selected={candidate===persona.id} data-ali-persona={persona.id}>
      <button type="button" className={css.choose} aria-pressed={candidate===persona.id}
       aria-label={t.choose+' '+persona.name[locale]} onClick={()=>setCandidate(persona.id)}>
        <img src={persona.image} width={96} height={92} alt="" loading="lazy"/>
        <span className={css.details}>
          <span className={css.nameLine}>
            <strong>{persona.name[locale]}</strong>
            <span className={css.role} data-role={persona.id}>{persona.role[locale]}</span>
            <span className={css.selection} aria-hidden="true">
              {candidate===persona.id&&<Check size={15} strokeWidth={3}/>}
            </span>
          </span>
          <span className={css.description}>{t.description[persona.id]}</span>
        </span>
      </button>
      <button type="button" className={css.listen} data-ali-voice-preview={persona.id}
       aria-label={(playing===persona.id?(audioPhase==='loading'?t.loading:t.stop):audioFailed===persona.id?t.retry:t.listen)+' · '+persona.name[locale]}
       aria-busy={playing===persona.id&&audioPhase==='loading'}
       aria-pressed={playing===persona.id} onClick={()=>toggleSample(persona.id)}>
       <span className={css.playCircle}>
        {playing===persona.id?<Pause size={15} fill="currentColor" aria-hidden="true"/>:
          <Play size={15} fill="currentColor" aria-hidden="true"/>}
       </span>
       <span>{playing===persona.id?(audioPhase==='loading'?t.loading:t.stop):audioFailed===persona.id?t.retry:t.listen}</span>
       <span className={css.waveform} aria-hidden="true">
        {BARS.map((height,index)=><i key={index} style={{height}}/>)}
       </span>
      </button>
    </article>)}
   </div>
   <footer className={css.footer}>
    <button className={css.apply} type="button" data-ali-persona-confirm onClick={()=>{
       stopAliPersonaAudio();select(candidate);onClose()}}>
      <Check size={19} aria-hidden="true"/>{t.choose+' '+selected.name[locale]}
    </button>
    <p className={css.note}>{t.note}</p>
    <button className={css.history} type="button" onClick={()=>{
       onClose();window.dispatchEvent(new Event('hh:messenger-open-history'))}}>
       <History size={16} aria-hidden="true"/>{t.history}
    </button>
   </footer>
  </section>
 </div>,document.body)
}

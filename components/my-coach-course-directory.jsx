'use client'
import {useEffect,useRef,useState} from 'react'
import {ArrowRight,Check,ChevronDown,PlayCircle,Search,Square,X} from 'lucide-react'
import {PUBLIC_COACH_RAIL_IDS,PUBLIC_COACH_TOPICS,getCoachPersona,localCoachText} from '@/lib/coaching/persona-registry.mjs'
import {getCoachPresentation} from '@/lib/coaching/persona-presentations.mjs'
import {coachIntroAudioPath} from '@/lib/personal-coaching/direct-coach-intro-audio.mjs'
import styles from './my-coach-course-launch.module.css'

const COPY={
 en:{title:'All Coaches',subtitle:'Find the style that feels right for you.',search:'Search coaches and topics',topic:'Coaching focus',all:'All topics',close:'Close',choose:'Select coach',selected:'Selected',style:'Character & style',approach:'Approach',suitable:'Good for',listen:'Listen to my voice',stop:'Stop audio',error:'Voice recording unavailable',empty:'No coaches match your filters.',topics:{clarity:'Clarity',resilience:'Calm & support',relationships:'Relationships',career:'Career & business',meaning:'Meaning',habits:'Habits',creativity:'Creativity',decisions:'Decisions'}},
 ru:{title:'Все коучи',subtitle:'Выберите близкий вам стиль общения.',search:'Поиск коучей и тем',topic:'Направление',all:'Все темы',close:'Закрыть',choose:'Выбрать коуча',selected:'Выбран',style:'Характер и стиль',approach:'Подход',suitable:'Подходит для',listen:'Послушать голос',stop:'Остановить',error:'Запись голоса недоступна',empty:'Нет коучей по этим фильтрам.',topics:{clarity:'Ясность',resilience:'Опора и спокойствие',relationships:'Отношения',career:'Карьера и бизнес',meaning:'Смысл',habits:'Привычки',creativity:'Творчество',decisions:'Решения'}},
 es:{title:'Todos los coaches',subtitle:'Encuentra el estilo que mejor encaja contigo.',search:'Buscar coaches y temas',topic:'Enfoque',all:'Todos los temas',close:'Cerrar',choose:'Elegir coach',selected:'Seleccionado',style:'Carácter y estilo',approach:'Enfoque',suitable:'Adecuado para',listen:'Escuchar mi voz',stop:'Detener audio',error:'Grabación no disponible',empty:'No hay coaches para estos filtros.',topics:{clarity:'Claridad',resilience:'Calma y apoyo',relationships:'Relaciones',career:'Carrera y negocio',meaning:'Sentido',habits:'Hábitos',creativity:'Creatividad',decisions:'Decisiones'}}
}
export function courseCoachPortrait(id){
 return '/images/holistic-house/my-coach-motion/'+(id==='harry'?'harry-soft-still.webp':id==='genie'?'genie-natural-opening-v2.webp':id==='caesar'?'caesar-emblem.svg':id+'-still.webp')
}
export default function MyCoachCourseDirectory({lang,selectedId,onChoose,onClose,trigger}){
 const t=COPY[lang]||COPY.en
 const [query,setQuery]=useState(''),[topic,setTopic]=useState('all'),[expanded,setExpanded]=useState(null)
 const [playing,setPlaying]=useState(null),[failed,setFailed]=useState(null)
 const dialog=useRef(null),player=useRef(null)
 function stop(){
  const a=player.current;player.current=null
  if(a){a.onended=null;a.onerror=null;a.pause();a.removeAttribute('src');a.load()}
  setPlaying(null)
 }
 useEffect(()=>{
  const d=dialog.current
  if(!d)return
  const prior=document.body.style.overflow
  document.body.style.overflow='hidden'
  d.showModal()
  return ()=>{
   const a=player.current;player.current=null
   if(a){a.onended=null;a.onerror=null;a.pause();a.removeAttribute('src');a.load()}
   document.body.style.overflow=prior
   if(d.open)d.close()
   trigger.current?.focus()
  }
 },[trigger])
 function changeFilter(setter,value){stop();setFailed(null);setExpanded(null);setter(value)}
 function toggle(id){stop();setFailed(null);setExpanded(v=>v===id?null:id)}
 function play(id){
  if(playing===id){stop();return}
  stop();setFailed(null)
  const path=coachIntroAudioPath(id,lang)
  if(!path){setFailed(id);return}
  // Only the existing immutable recording. A cache miss never generates audio.
  const a=new Audio(path+'&archive=1');player.current=a
  const fail=()=>{if(player.current===a){stop();setFailed(id)}}
  a.onended=()=>{if(player.current===a)stop()}
  a.onerror=fail;setPlaying(id)
  try{const result=a.play();result?.catch(fail)}catch{fail()}
 }
 const needle=query.trim().toLocaleLowerCase(lang)
 const coaches=PUBLIC_COACH_RAIL_IDS.map(getCoachPersona).filter(p=>p&&(topic==='all'||p.topic===topic||p.related.includes(topic))&&(!needle||[p.name,p.role,p.description,p.suitable].map(x=>localCoachText(x,lang)).concat([p.topic,...p.related].map(k=>t.topics[k]||k)).join(' ').toLocaleLowerCase(lang).includes(needle)))
 return <dialog ref={dialog} className={styles.directory} aria-labelledby="course-coach-directory-title" data-course-coach-directory
  onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{if(e.target===dialog.current){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose()}}}>
  <header className={styles.directoryHeader}><div><h2 id="course-coach-directory-title">{t.title}</h2><p>{t.subtitle}</p></div><button type="button" className={styles.directoryClose} onClick={onClose} aria-label={t.close} autoFocus><X size={22}/></button></header>
  <div className={styles.directoryFilters}>
   <label className={styles.directorySearch}><Search size={17} aria-hidden="true"/><input type="search" value={query} onChange={e=>changeFilter(setQuery,e.target.value)} placeholder={t.search} aria-label={t.search}/></label>
   <label className={styles.directoryTopic}><span>{t.topic}</span><select value={topic} onChange={e=>changeFilter(setTopic,e.target.value)} data-course-coach-filter><option value="all">{t.all}</option>{PUBLIC_COACH_TOPICS.map(k=><option key={k} value={k}>{t.topics[k]}</option>)}</select></label>
  </div>
  <div className={styles.directoryCount} role="status">{coaches.length} / {PUBLIC_COACH_RAIL_IDS.length}</div>
  <div className={styles.directoryList}>
   {!coaches.length&&<p>{t.empty}</p>}
   {coaches.map(p=>{const name=localCoachText(p.name,lang),open=expanded===p.id,selected=selectedId===p.id,presentation=getCoachPresentation(p.id,lang);return <article key={p.id} className={styles.directoryCard} data-course-directory-coach={p.id} data-selected={selected?'true':undefined}>
    <div className={styles.directoryRow}>
     <button type="button" className={styles.directoryDisclosure} aria-expanded={open} aria-controls={'course-coach-detail-'+p.id} onClick={()=>toggle(p.id)}>
      <img src={courseCoachPortrait(p.id)} alt="" width={64} height={72} loading="lazy" decoding="async"/>
      <span><strong>{name}</strong><small>{localCoachText(p.role,lang)}</small></span><ChevronDown size={18} aria-hidden="true"/>
     </button>
     <button type="button" className={styles.directorySelect} data-course-directory-select={p.id} onClick={()=>{stop();onChoose(p.id)}}>{selected?<><Check size={15} aria-hidden="true"/>{t.selected}</>:<>{t.choose}<ArrowRight size={14} aria-hidden="true"/></>}</button>
    </div>
    <div id={'course-coach-detail-'+p.id} className={styles.directoryDetail} hidden={!open}>
     {open&&<><p>{localCoachText(p.description,lang)}</p><p><strong>{t.style}: </strong>{presentation?.style}</p><p><strong>{t.approach}: </strong>{localCoachText(p.approach,lang)}</p><p><strong>{t.suitable}: </strong>{localCoachText(p.suitable,lang)}</p>
     <button type="button" className={styles.directoryVoice} onClick={()=>play(p.id)} aria-pressed={playing===p.id}>{playing===p.id?<Square size={16} aria-hidden="true"/>:<PlayCircle size={18} aria-hidden="true"/>}{playing===p.id?t.stop:t.listen}</button>
     {failed===p.id&&<p role="status">{t.error}</p>}</>}
    </div>
   </article>})}
  </div>
 </dialog>
}

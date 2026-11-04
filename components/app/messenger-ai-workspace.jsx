'use client'
import {useState} from 'react'
import Link from 'next/link'
import {Film,Flower2,Layers3,Flame,Sparkles,Zap,ArrowUpRight} from 'lucide-react'
import {HolisticAgentChat} from '../holistic-agent-chat'
import css from './messenger-ai-workspace.module.css'

const COPY={
 ru:{
   title:'Ваш ИИ-ассистент Holistic House',
   subtitle:'Опишите свою цель или выберите одну из пяти подсказок слева.',
   rail:'Быстрые запросы к ИИ',ready:'Запрос подготовлен — уточните его и отправьте.',
   actual:'ИИ подбирает рекомендации. Готовое видео появится только после реальной генерации.',
   videoLink:'Открыть видеорежиссёр',
   tasks:[
    {id:'video',name:'Видео',prompt:'Помоги мне создать персональное видео. Сначала уточни мою цель и предложи подходящий сценарий из доступных возможностей.',format:'video'},
    {id:'meditation',name:'Медитация',prompt:'Помоги подобрать мягкую личную медитацию. Уточни моё текущее и желаемое состояние.',format:'audio'},
    {id:'practice',name:'Практика',prompt:'Подбери мне мягкую практику на сегодня с учётом моей цели и состояния.'},
    {id:'course',name:'Курс',prompt:'Помоги составить план курса развития из восьми последовательных практик для достижения моей цели.',format:'course'},
    {id:'ritual',name:'Ритуал',prompt:'Помоги подобрать простой безопасный ритуал с добровольным участием и ясными границами.'}
   ]},
 en:{
   title:'Your Holistic House AI assistant',subtitle:'Describe your goal or choose a shortcut on the left.',
   rail:'AI quick requests',ready:'Request prepared — customize it and send.',
   actual:'AI suggests a plan. A completed video appears only after actual rendering.',
   videoLink:'Open video director',
   tasks:[
    {id:'video',name:'Video',prompt:'Help me make a personal video. First clarify my goal and suggest a scenario using verified available options.',format:'video'},
    {id:'meditation',name:'Meditation',prompt:'Help me select a gentle personal meditation. Ask about how I feel now and how I want to feel.',format:'audio'},
    {id:'practice',name:'Practice',prompt:'Choose a gentle practice for today based on my goal and current state.'},
    {id:'course',name:'Course',prompt:'Help me draft an eight-practice development course for my goal.',format:'course'},
    {id:'ritual',name:'Ritual',prompt:'Help me choose a simple safe ritual with voluntary participation and clear boundaries.'}
   ]},
 es:{
   title:'Tu asistente de IA Holistic House',subtitle:'Describe tu objetivo o elige un acceso rápido a la izquierda.',
   rail:'Peticiones rápidas',ready:'Solicitud preparada: revísala y envíala.',
   actual:'La IA propone un plan; el vídeo solo estará listo después de su creación real.',
   videoLink:'Abrir director de vídeo',
   tasks:[
    {id:'video',name:'Vídeo',prompt:'Ayúdame a crear un vídeo personal. Pregunta primero por mi objetivo y propón escenas disponibles verificadas.',format:'video'},
    {id:'meditation',name:'Meditación',prompt:'Ayúdame a elegir una meditación suave. Pregunta cómo me siento y cómo quiero sentirme.',format:'audio'},
    {id:'practice',name:'Práctica',prompt:'Recomienda una práctica suave para hoy según mi objetivo y mi estado actual.'},
    {id:'course',name:'Curso',prompt:'Ayúdame a planear un curso de desarrollo de ocho prácticas para mi objetivo.',format:'course'},
    {id:'ritual',name:'Ritual',prompt:'Ayúdame a elegir un ritual sencillo y seguro con participación voluntaria y límites claros.'}
   ]}
}
const ICONS={video:Film,meditation:Flower2,practice:Zap,course:Layers3,ritual:Flame}
export default function MessengerAiWorkspace({locale='en'}){
 const t=COPY[locale]||COPY.en
 const [selected,setSelected]=useState('')
 const [quickPrompt,setQuickPrompt]=useState(null)
 return <div className={css.layout} data-hh-compact-ai-workspace>
   <aside className={css.rail} aria-label={t.rail} data-chat-menu-rail>
     {t.tasks.map(task=>{
       const Icon=ICONS[task.id]
       return <button type="button" key={task.id}
         data-hh-ai-quick-action={task.id} aria-pressed={selected===task.id}
         aria-label={task.name} title={task.name}
         onClick={()=>{
           setSelected(task.id)
           setQuickPrompt(prev=>({revision:(prev?.revision||0)+1,text:task.prompt,format:task.format}))
         }}>
         <Icon size={22} strokeWidth={1.9} aria-hidden="true"/><span>{task.name}</span>
       </button>
     })}
   </aside>
   <div className={css.content}>
     <div className={css.welcome}>
       <img src="/images/holistic-house/assessment-lotus.svg" alt="" width="54" height="54" aria-hidden="true"/>
       <div><h2><Sparkles size={18} aria-hidden="true"/>{t.title}</h2><p>{t.subtitle}</p></div>
     </div>
     {selected&&<p className={css.prepared} role="status">{t.ready}</p>}
     <HolisticAgentChat locale={locale} compact quickPrompt={quickPrompt}/>
     <div className={css.footer}>
       <span>{t.actual}</span>
       <Link href={'/'+locale+'/holistic-support/mandala#video-director-chat'} prefetch={false}>
         {t.videoLink}<ArrowUpRight size={15} aria-hidden="true"/>
       </Link>
     </div>
   </div>
 </div>
}

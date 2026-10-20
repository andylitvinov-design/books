'use client'
import Link from 'next/link'
import {ArrowRight,ChevronDown,ClipboardList,HeartHandshake} from 'lucide-react'
import {ANTISTRESS_MODULE_GOALS} from '@/lib/inner-growth/antistress-module-router'
import styles from './public-antistress-route-map.module.css'

type Locale='ru'|'en'|'es'
type Props={locale:Locale;selectedId:string;onSelect:(id:string)=>void;onStart?:()=>void;busy?:boolean}
const words={
 ru:{eyebrow:'ПЕРСОНАЛЬНЫЙ МАРШРУТ',title:'Одна программа ОПОРА — шесть персональных маршрутов',
  intro:'После начальных тестов можно выбрать один 14-дневный маршрут по вашим учебным целям. Четвёртый маршрут доступен только со специалистом. Маршруты не являются диагнозами или стадиями травмы.',
  range:'Изучаемый навык',number:'Антистресс',goal:'Внутри — 14 практических занятий',
  how:'Как определяется маршрут',detail:'Учитываем последние результаты Weekly Pulse, ответы о навыках F1–F8 и выбранную жизненную цель. Нагрузка задаёт комфортный темп, а не автоматически номер курса. Курс 4 не запускается самостоятельно.',
  preview:'Посмотреть занятия',active:'Выбран для просмотра',start:'Начать с тестирования',safety:'При тяжёлом или нарастающем состоянии не откладывайте обращение за профессиональной помощью ради курса.'},
 en:{eyebrow:'PERSONAL LEARNING ROUTE',title:'One OPORA programme. Six personalized 14-day paths.',
  intro:'Your initial assessments and learning goals inform a choice among six 14-day paths. Path 4 needs qualified clinical support; none of the paths is a trauma diagnosis.',
  range:'Learning focus',number:'Anti-Stress',goal:'14 practical lessons per route',
  how:'How the suggestion is calculated',detail:'Weekly Pulse, F1–F8 skills and your chosen goal inform the recommendation. Stress load adjusts exercise pace rather than course number. These are non-diagnostic authorial scales.',
  preview:'Preview 14 lessons',active:'Selected for preview',start:'Start with assessment',safety:'For severe or worsening symptoms, seek qualified support rather than waiting to finish the course.'},
 es:{eyebrow:'RUTA PERSONALIZADA',title:'Un programa OPORA, seis rutas personalizadas de 14 días',
  intro:'Las evaluaciones iniciales y tus objetivos orientan una de seis rutas de 14 días. La cuarta requiere acompañamiento profesional. No son diagnósticos ni etapas clínicas del trauma.',
  range:'Habilidad del curso',number:'Antiestrés',goal:'14 prácticas por ruta',
  how:'Cómo se sugiere la ruta',detail:'Usamos Weekly Pulse, habilidades F1–F8 y el objetivo elegido. La carga cambia el ritmo, no determina el curso.',
  preview:'Ver las 14 clases',active:'Elegida para ver',start:'Empezar con la evaluación',safety:'Si los síntomas son graves o empeoran, busca apoyo profesional.'},
} as const
export function PublicAntistressRouteMap({locale,selectedId,onSelect,onStart,busy=false}:Props){
 const t=words[locale],href='/'+(locale==='es'?'en':locale)+'/app/course?program=stress'
 return <section id="stress-levels" className={styles.root} aria-labelledby="opora-levels-title" data-antistress-six-routes>
  <div className={styles.heading}><p className={styles.kicker}><ClipboardList size={16} aria-hidden="true"/>{t.eyebrow}</p>
   <h2 id="opora-levels-title">{t.title}</h2><p>{t.intro}</p></div>
  <div className={styles.routes}>
   {ANTISTRESS_MODULE_GOALS.map((route,index)=><details className={styles.route} key={route.id} data-stress-route={route.id} data-selected={route.id===selectedId}>
    <summary><span className={styles.number}>{String(index+1).padStart(2,'0')}</span>
     <span className={styles.routeCopy}><small>{t.number} {index+1} · {route.id==='AS4'?(locale==='ru'?'Только специалист':locale==='es'?'Especialista':'Clinician only'):(locale==='ru'?'14 дней':locale==='es'?'14 días':'14 days')}</small>
      <strong>{route.title[locale]}</strong></span><ChevronDown size={18} aria-hidden="true"/></summary>
    <div className={styles.routeDetail}><p>{route.short[locale]}</p><small>{t.goal}</small><a href="#daily-programme" className={styles.preview} aria-current={selectedId===route.id?'true':undefined} onClick={()=>onSelect(route.id)}>{selectedId===route.id?t.active:t.preview}<ArrowRight size={14} aria-hidden="true"/></a></div>
   </details>)}
  </div>
  <details className={styles.method}><summary>{t.how}<ChevronDown size={18} aria-hidden="true"/></summary><p>{t.detail}</p></details>
  <div className={styles.bottom}><span><HeartHandshake size={17} aria-hidden="true"/>{t.safety}</span>
   {onStart?<button type="button" onClick={onStart} disabled={busy}>{t.start}<ArrowRight size={17} aria-hidden="true"/></button>:<Link href={href} prefetch={false}>{t.start}<ArrowRight size={17} aria-hidden="true"/></Link>}</div>
 </section>
}

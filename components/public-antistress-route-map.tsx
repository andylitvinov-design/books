import Link from 'next/link'
import {ArrowRight,ChevronDown,ClipboardList,HeartHandshake} from 'lucide-react'
import {ANTISTRESS_MODULE_GOALS} from '@/lib/inner-growth/antistress-module-router'
import styles from './public-antistress-route-map.module.css'

type Locale='ru'|'en'|'es'
const words={
 ru:{eyebrow:'ПЕРСОНАЛЬНЫЙ МАРШРУТ',title:'Пять уровней нагрузки — пять вариантов «Антистресс»',
  intro:'Входное тестирование помогает предложить один из пяти 14-дневных маршрутов. Это не пять последовательных этапов лечения: вы начинаете с подходящей интенсивности и сохраняете право выбора.',
  range:'Нагрузка или напряжение по Weekly Pulse',number:'Антистресс',goal:'Внутри — 14 практических занятий',
  how:'Как определяется маршрут',detail:'Берём более высокое из двух значений 0–10: субъективная нагрузка и напряжение за последние 7 дней. Трудности в повседневности и доступность паузы могут предложить более бережный вариант. Пороги авторские и не являются клиническими нормами.',
  start:'Начать с тестирования',safety:'При тяжёлом или нарастающем состоянии не откладывайте обращение за профессиональной помощью ради курса.'},
 en:{eyebrow:'PERSONAL LEARNING ROUTE',title:'Five reported stress bands. Five Anti-Stress courses.',
  intro:'The entry assessment suggests one of five separate 14-day learning routes. These are not stages of clinical trauma treatment. You can choose a more suitable pace.',
  range:'Weekly Pulse load or tension',number:'Anti-Stress',goal:'14 practical lessons per route',
  how:'How the suggestion is calculated',detail:'The higher of two past-week ratings (perceived load and inner tension) on original 0–10 scales sets a starting band. Low access to pauses or daily functioning can suggest a gentler route. These are not clinical norms.',
  start:'Start with assessment',safety:'For severe or worsening symptoms, seek qualified support rather than waiting to finish the course.'},
 es:{eyebrow:'RUTA PERSONALIZADA',title:'Cinco niveles de estrés, cinco rutas Antiestrés',
  intro:'La evaluación inicial propone una de cinco rutas independientes de 14 lecciones. No son etapas de tratamiento del trauma.',
  range:'Carga o tensión según Weekly Pulse',number:'Antiestrés',goal:'14 prácticas por ruta',
  how:'Cómo se sugiere la ruta',detail:'Se utiliza la cifra más alta entre carga y tensión percibidas (0–10). La dificultad cotidiana puede sugerir un comienzo más suave. No son normas clínicas.',
  start:'Empezar con la evaluación',safety:'Si los síntomas son graves o empeoran, busca apoyo profesional.'},
} as const
export function PublicAntistressRouteMap({locale}:{locale:Locale}){
 const t=words[locale],href='/'+(locale==='es'?'en':locale)+'/app/course?program=stress'
 return <section id="stress-levels" className={styles.root} aria-labelledby="opora-levels-title" data-antistress-five-routes>
  <div className={styles.heading}><p className={styles.kicker}><ClipboardList size={16} aria-hidden="true"/>{t.eyebrow}</p>
   <h2 id="opora-levels-title">{t.title}</h2><p>{t.intro}</p></div>
  <div className={styles.routes}>
   {ANTISTRESS_MODULE_GOALS.map((route,index)=><details className={styles.route} key={route.id} data-stress-route={route.id}>
    <summary><span className={styles.number}>{String(index+1).padStart(2,'0')}</span>
     <span className={styles.routeCopy}><small>{t.number} {index+1} · {route.range[0]}–{route.range[1]}/10</small>
      <strong>{route.title[locale]}</strong></span><ChevronDown size={18} aria-hidden="true"/></summary>
    <div className={styles.routeDetail}><p>{route.short[locale]}</p><small>{t.goal}</small></div>
   </details>)}
  </div>
  <details className={styles.method}><summary>{t.how}<ChevronDown size={18} aria-hidden="true"/></summary><p>{t.detail}</p></details>
  <div className={styles.bottom}><span><HeartHandshake size={17} aria-hidden="true"/>{t.safety}</span>
   <Link href={href} prefetch={false}>{t.start}<ArrowRight size={17} aria-hidden="true"/></Link></div>
 </section>
}

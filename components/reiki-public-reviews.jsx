'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, ShieldCheck } from 'lucide-react'
import styles from './reiki-public-reviews.module.css'

const COPY={
  en:{title:'Learner reviews',eyebrow:'REAL COURSE EXPERIENCES',
    subtitle:'Reflections shared voluntarily by Reiki Practitioner learners.',
    empty:'New learner reviews will appear here after participants agree to share them and they are approved.',
    anonymous:'Course participant',approved:'Shared with permission',
    lessons:{'flight-04':'Flight to the Sun','tan-04':'Tantra Reiki','kun-04':'Kundalini Reiki','ygg-04':'Reiki Yggdrasil'}},
  ru:{title:'Отзывы учеников',eyebrow:'ОПЫТ УЧАСТНИКОВ КУРСА',
    subtitle:'Личные впечатления, которыми ученики Reiki Practitioner решили поделиться.',
    empty:'Отзывы появятся здесь после согласия участников и проверки перед публикацией.',
    anonymous:'Участник курса',approved:'Опубликовано с согласия',
    lessons:{'flight-04':'Полёт к Солнцу','tan-04':'Тантра Рейки','kun-04':'Кундалини Рейки','ygg-04':'Рейки Иггдрасиль'}},
  es:{title:'Opiniones de alumnos',eyebrow:'EXPERIENCIAS REALES',
    subtitle:'Experiencias que los alumnos del curso deciden compartir voluntariamente.',
    empty:'Las opiniones aparecerán aquí después de que cada participante dé su consentimiento y sean aprobadas.',
    anonymous:'Participante',approved:'Compartido con permiso',
    lessons:{'flight-04':'Vuelo hacia el Sol','tan-04':'Tantra Reiki','kun-04':'Kundalini Reiki','ygg-04':'Reiki Yggdrasil'}},
}
const IDS=new Set(['flight-04','tan-04','kun-04','ygg-04'])
export function ReikiPublicReviews({locale='en'}) {
  const t=COPY[locale]||COPY.en
  const [reviews,setReviews]=useState([])
  const [loaded,setLoaded]=useState(false)
  useEffect(()=>{
    let alive=true
    const abort=new AbortController()
    fetch('/api/reiki-course-reviews',{cache:'no-store',signal:abort.signal}).then(async response=>{
      if(!response.ok)throw Error('UNAVAILABLE')
      return response.json()
    }).then(payload=>{
      if(!alive)return
      setReviews(Array.isArray(payload?.reviews)?payload.reviews.filter(item=>
        item&&IDS.has(item.slideId)&&typeof item.review==='string'&&item.review.trim()&&item.review.length<=1600
      ).slice(0,12):[])
    }).catch(()=>{if(alive)setReviews([])}).finally(()=>{if(alive)setLoaded(true)})
    return()=>{alive=false;abort.abort()}
  },[])
  return <section className={styles.section} id="energywork-reviews" aria-labelledby="energywork-reviews-title" data-reiki-public-reviews>
    <div className={styles.heading}>
      <span className={styles.label}><MessageCircle size={17} aria-hidden="true"/>{t.eyebrow}</span>
      <h2 id="energywork-reviews-title">{t.title}</h2>
      <p>{t.subtitle}</p>
    </div>
    {reviews.length?
      <div className={styles.grid}>
        {reviews.map(item=><article className={styles.card} key={item.id}>
          <p className={styles.lesson}>{t.lessons[item.slideId]}</p>
          <blockquote>{item.review}</blockquote>
          <footer><span>{t.anonymous}</span><span><ShieldCheck size={14} aria-hidden="true"/>{t.approved}</span></footer>
        </article>)}
      </div> : loaded ? <p className={styles.empty}>{t.empty}</p> : null}
  </section>
}

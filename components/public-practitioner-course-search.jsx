'use client'
import {useMemo,useState} from 'react'
import Link from 'next/link'
import {Search,BookOpen,ArrowRight} from 'lucide-react'
import styles from './public-practitioner-courses.module.css'
const copy={
 en:{heading:'Courses from our practitioners',sub:'Browse educational slide courses created by Holistic House practitioners.',search:'Search courses',empty:'No matching courses yet.',open:'Explore course',slide:'slides',by:'by'},
 ru:{heading:'Курсы наших мастеров',sub:'Авторские образовательные курсы со слайдами, фото, аудио и видео.',search:'Поиск курсов',empty:'Подходящих курсов пока нет.',open:'Открыть курс',slide:'слайдов',by:'Автор'},
 es:{heading:'Cursos de nuestros profesionales',sub:'Cursos educativos con diapositivas, imágenes, audio y vídeos.',search:'Buscar cursos',empty:'Todavía no hay cursos coincidentes.',open:'Ver curso',slide:'diapositivas',by:'de'}
}
export default function PractitionerCourseSearch({items=[],locale='en'}){
 const t=copy[locale]||copy.en
 const [query,setQuery]=useState('')
 const filtered=useMemo(()=>items.filter(item=>[item.course?.title,item.course?.description,item.practitionerName].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())),[query,items])
 return <section className={styles.catalog} id="practitioner-courses" aria-label={t.heading} data-public-practitioner-courses>
  <header className={styles.catalogHead}><div><p className={styles.eyebrow}>HOLISTIC HOUSE · ACADEMY</p><h2>{t.heading}</h2><p>{t.sub}</p></div>
   <label className={styles.search}><Search size={17} aria-hidden="true"/><span className={styles.srOnly}>{t.search}</span><input type="search" placeholder={t.search} value={query} onChange={e=>setQuery(e.target.value)}/></label>
  </header>
  {filtered.length?<div className={styles.cards}>{filtered.map(item=><Link className={styles.card} href={'/'+(item.course.locale||locale)+'/courses/masters/'+item.slug} key={item.id} prefetch={false}>
   <div className={styles.art}><BookOpen size={38} aria-hidden="true"/></div>
   <div className={styles.cardBody}><small>{item.course.locale?.toUpperCase()} · {item.course.slides?.length||0} {t.slide}</small>
    <h3>{item.course.title}</h3><p>{item.course.description}</p><div className={styles.cardFooter}><span>{t.by} {item.practitionerName||'Holistic House'}</span><strong>{t.open} <ArrowRight size={15}/></strong></div>
   </div></Link>)}</div>:<p className={styles.empty}>{t.empty}</p>}
 </section>
}

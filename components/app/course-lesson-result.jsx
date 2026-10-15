'use client'

import { CheckCircle2, Compass, Heart, Leaf, ShieldCheck } from 'lucide-react'
import { courseSingleLessonOutcome } from '@/lib/inner-growth/course-single-lesson-outcome'
import styles from './course-lesson-result.module.css'

export default function CourseLessonResult(props){
  const ru=props.locale==='ru'
  const r=courseSingleLessonOutcome(props)
  return <section className={styles.result} data-course-real-lesson-result
    aria-label={ru?'Итог моей практики':'My practice summary'}>
    <div className={styles.head}>
      <CheckCircle2 size={25} aria-hidden="true"/>
      <div><small>{ru?'РЕЗУЛЬТАТ ОДНОГО ЗАНЯТИЯ':'ONE LESSON · MY RESULT'}</small>
        <h3>{ru?'Что я попробовал(а) сегодня':'What I tried today'}</h3></div>
    </div>
    <div className={styles.rows}>
      <div><Leaf size={18} aria-hidden="true"/><span>
        <small>{ru?'Навык, которому посвящён урок':'Skill the lesson practised'}</small>
        <strong>{r.skill|| (ru?'Мягкая самоподдержка':'Gentle self-support')}</strong>
      </span></div>
      <div><Compass size={18} aria-hidden="true"/><span>
        <small>{ru?'Фактическая попытка':'Self-reported attempt'}</small>
        <strong>{r.attempt}</strong>
        {r.mainPractice&&<small>{r.mainPractice}</small>}
      </span></div>
      {(r.anchor||r.anotherChoice)&&<div><Heart size={18} aria-hidden="true"/><span>
        <small>{ru?'Мой выбранный ориентир':'My selected support'}</small>
        {r.anchor&&<strong>{r.anchor}</strong>}
        {r.anotherChoice&&<small>{r.anotherChoice}</small>}
      </span></div>}
      <div><ShieldCheck size={18} aria-hidden="true"/><span>
        <small>{ru?'Моментное состояние — самооценка':'Momentary state — self-rating'}</small>
        {r.state?<strong className={styles.numbers}>{r.state.before}/10 → {r.state.after}/10</strong>:
          <strong>{ru?'Без полной пары замеров':'No complete measurement pair'}</strong>}
        <small>{ru?'Два отдельных наблюдения; изменение не доказывает действие упражнения.':
          'Two separate observations; a change does not prove the exercise caused it.'}</small>
      </span></div>
      <div><Heart size={18} aria-hidden="true"/><span>
        <small>{ru?'Комфортность · субъективная полезность':'Comfort · subjective helpfulness'}</small>
        <strong>{r.comfort} · {r.usefulness}</strong>
      </span></div>
      <div><Compass size={18} aria-hidden="true"/><span>
        <small>{ru?'Свобода выбора':'Freedom of choice'}</small>
        <strong>{r.flexibility}</strong>
      </span></div>
      {r.adaptation&&<div><Leaf size={18} aria-hidden="true"/><span>
        <small>{ru?'Мой выбор на следующий раз':'My next-time preference'}</small>
        <strong>{r.adaptation}</strong>
      </span></div>}
    </div>
    <p className={styles.disclaimer}>{ru
      ?'Это личная учебная заметка, а не медицинский результат. Можно не замечать изменений — урок всё равно засчитывается.'
      :'This is a personal learning record, not a medical outcome. No change is also a valid experience.'}</p>
  </section>
}

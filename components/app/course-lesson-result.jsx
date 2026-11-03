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
      {r.innerObservation&&<div data-course-inner-state-result><Heart size={18} aria-hidden="true"/><span>
        <small>{ru?'Моё внутреннее состояние и доступная поддержка':'My state and possible support'}</small>
        {r.innerObservation.signal&&<strong>{ru?'Заметил(а): ':'Noticed: '}{r.innerObservation.signal}</strong>}
        {r.innerObservation.need&&<small>{ru?'Могло бы помочь: ':'What might help: '}{r.innerObservation.need}</small>}
        {r.innerObservation.selectedAction&&<small>{ru?'Выбранный вариант: ':'Selected option: '}{r.innerObservation.selectedAction}</small>}
        {r.innerObservation.experience&&<small>{ru?'После упражнения: ':'After practising: '}{r.innerObservation.experience}</small>}
        <small>{ru?'Это ваш добровольный самоотчёт, а не подтверждение изменения или освоения навыка.':
          'This is your optional self-report, not proof of change or mastery.'}</small>
      </span></div>}
      {r.stateJourney&&<div data-opora-state-result><Heart size={18} aria-hidden="true"/><span>
        <small>{ru?'МОЯ ОПОРА · СОСТОЯНИЕ И ВОЗМОЖНЫЙ ШАГ':'MY OPORA · STATE AND A POSSIBLE STEP'}</small>
        {r.stateJourney.signal&&<strong>{ru?'Заметил(а): ':'Noticed: '}{r.stateJourney.signal}</strong>}
        {r.stateJourney.need&&<small>{ru?'Что может помочь: ':'What might help: '}{r.stateJourney.need}</small>}
        {r.stateJourney.support&&<small>{ru?'Мой выбор: ':'My choice: '}{r.stateJourney.support}</small>}
        {r.stateJourney.experience&&<small>{ru?'Самоотчёт после практики: ':'After the practice, self-reported: '}{r.stateJourney.experience}</small>}
        <small>{ru?'Выбор или план не подтверждают выполнения действия. Это не диагноз и не доказательство изменения состояния.':
          'A choice or plan does not prove an action was taken. It is neither a diagnosis nor proof of change.'}</small>
      </span></div>}
      {r.savedActivity&&<div data-course-saved-module-choice><Compass size={18} aria-hidden="true"/><span>
        <small>{ru?'Сохранённый выбор практики':'Saved practice choice'}</small><strong>{r.savedActivity}</strong>
        <small>{ru?'Выбор не подтверждает выполненную попытку.':'A choice does not confirm an attempted practice.'}</small>
      </span></div>}
      {(r.anchor||r.anotherChoice)&&<div><Heart size={18} aria-hidden="true"/><span>
        <small>{ru?'Мой выбранный ориентир':'My selected support'}</small>
        {r.anchor&&<strong>{r.anchor}</strong>}
        {r.anotherChoice&&<small>{r.anotherChoice}</small>}
      </span></div>}
      <div><ShieldCheck size={18} aria-hidden="true"/><span>
        <small>{ru?'Моментное состояние — только при наличии замеров':'Momentary state — only when rated'}</small>
        {r.state?<strong className={styles.numbers}>{r.state.before}/10 → {r.state.after}/10</strong>:
          <strong>{r.innerObservation?(ru?'Качественное наблюдение сохранено':'Qualitative observation saved'):(ru?'Без полной пары замеров':'No complete measurement pair')}</strong>}
        <small>{ru?'Два отдельных наблюдения; изменение не доказывает действие упражнения.':
          'These observations are not diagnostic and do not prove an exercise caused a change.'}</small>
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
    {!!props.phaseChecks?.length&&<section data-phase-checkpoint-receipt>
      <h4>{ru?'Учебные пробы':'Educational checks'}</h4>
      {props.phaseChecks.map(check=>{
        const evidence=props.phaseCheckpoints?.[check.id]
        return <p key={check.id}>{check.prompt}<br/>
          {evidence?({independent:ru?'Самостоятельно (ваш отчёт)':'Independent (your report)',guided:ru?'С подсказкой':'With guidance',not_tried:ru?'Не пробовали':'Not tried',not_suitable:ru?'Не подошло':'Not suitable'}[evidence.state]):ru?'Нет сохранённого ответа':'No saved evidence'}
          {evidence?.choice&&<> · {check.options.find(option=>option.value===evidence.choice)?.label}</>}
        </p>
      })}
    </section>}
    <p className={styles.disclaimer}>{ru
      ?'Это личная учебная заметка, а не медицинский результат. Можно не замечать изменений — урок всё равно засчитывается.'
      :'This is a personal learning record, not a medical outcome. No change is also a valid experience.'}</p>
  </section>
}

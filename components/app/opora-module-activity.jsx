'use client'

import {useState} from 'react'
import {Check, Compass, Feather, Leaf, ShieldCheck} from 'lucide-react'
import {oporaModuleActivity} from '@/lib/inner-growth/opora-module-exercise'
import styles from './opora-module-activity.module.css'

// One optional hands-on teaching action per day. Bounded selections remain
// educational signals, not proof of efficacy; creative words are opt-in only.
export default function OporaModuleActivity({
  moduleId,day,routerVersion,locale='en',value='',onChange,disabled=false,onAddReflection,
}){
  const plan=oporaModuleActivity(moduleId,day,locale,routerVersion)
  const [words,setWords]=useState(['','','','',''])
  const [saved,setSaved]=useState(false)
  if(!plan)return null
  const ru=locale==='ru'
  const showPhoto=plan.kind==='photo'||plan.kind==='associations'
  const showWords=plan.kind==='associations'&&value==='words'
  const addWords=()=>{
    const trimmed=words.map(text=>text.trim()).filter(Boolean)
    if(!trimmed.length||!onAddReflection)return
    onAddReflection((ru?'Мои ассоциации: ':'My photo associations: ')+trimmed.join(', '))
    setSaved(true)
  }
  return <section className={styles.activity} data-opora-practical-day={day}
    data-opora-practical-format={plan.kind} aria-label={ru?'Практика дня':'Daily hands-on practice'}>
    <div className={styles.heading}>
      <span className={styles.kicker}><Leaf size={15} aria-hidden="true"/>
        {ru?'Практика дня':'Daily practice'} · {day}/14</span>
      <h3>{plan.title}</h3>
      <p className={styles.instruction}>{plan.practice}</p>
    </div>
    {showPhoto&&<div className={styles.photo} aria-hidden="true">
      <img src="/images/holistic-house/course-journey-landscape.svg" width="600" height="280"
        alt="" loading="lazy" decoding="async"/>
    </div>}
    <div className={styles.question}><Compass size={19} aria-hidden="true"/><strong>{plan.prompt}</strong></div>
    <div className={styles.options} role="group" aria-label={plan.prompt}>
      {plan.options.map(option=><button type="button" key={option.id}
        disabled={disabled} aria-pressed={value===option.id}
        onClick={()=>{onChange?.(option.id);setSaved(false)}}>
        <span className={styles.optionDot} aria-hidden="true">{value===option.id&&<Check size={15}/>}</span>
        <span>{option.label}</span>
      </button>)}
    </div>
    {showWords&&<div className={styles.associations}>
      <div className={styles.associationTitle}><Feather size={17} aria-hidden="true"/>
        <span>{ru?'Необязательно: до пяти слов по картинке':'Optional: up to five words about the image'}</span>
      </div>
      <div className={styles.words}>
        {words.map((word,i)=><label key={i}>
          <span>{ru?'Слово':'Word'} {i+1}</span>
          <input type="text" maxLength={36} disabled={disabled}
            placeholder={ru?'Любая ассоциация':'Any association'} value={word}
            onChange={e=>{const next=[...words];next[i]=e.target.value;setWords(next);setSaved(false)}}/>
        </label>)}
      </div>
      <button type="button" className={styles.saveNote} disabled={disabled||saved||!words.some(w=>w.trim())}
        onClick={addWords}>{saved?(ru?'Добавлено в личную запись':'Added to private reflection') :
        (ru?'Добавить в личную запись':'Add to my private reflection')}</button>
      <p>{ru?'Это свободные ассоциации, не психологический тест. Текст добавляется в зашифрованную личную запись только по нажатию кнопки.':
        'These are free associations, not a personality test. Words enter your encrypted private reflection only after you choose to add them.'}</p>
    </div>}
    <p className={styles.note}><ShieldCheck size={16} aria-hidden="true"/>
      {ru?'Выбор необязателен. Можно сменить ответ или остановиться. Упражнение не оценивает ваше психическое здоровье.':
      'A choice is optional. Change your answer or stop at any time. This does not score your mental health.'}
    </p>
  </section>
}

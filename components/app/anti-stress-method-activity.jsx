'use client'

import { BookOpenCheck, Check, ChevronDown, Compass, Eye, Heart, Lightbulb, PauseCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { antiStressMethodActivity } from '@/lib/inner-growth/anti-stress-method-activities'
import styles from './anti-stress-method-activity.module.css'

// A real interactive action in each of days 2–14; does not mark an outcome
// or infer that someone practised from a click alone.
export default function AntiStressMethodActivity({
  day,locale='en',value='',onChange,onHint,hintUsed=false,disabled=false
}){
  const activity=antiStressMethodActivity(day,locale)
  if(!activity)return null
  const ru=locale==='ru'
  const prompt=activity.prompt
  return <section className={styles.panel} data-opora-method-day={day} data-opora-method={activity.kind}>
    <header className={styles.header}>
      <span className={styles.icon}>{activity.kind.includes('support')||activity.kind.includes('help')?<Heart size={20}/>:
        activity.kind==='fact_guess'||activity.kind==='gentle_choice'?<BookOpenCheck size={20}/>:
        activity.kind.includes('attention')?<Eye size={20}/>:<Compass size={20}/>}</span>
      <div><small>{ru?'ИНТЕРАКТИВНАЯ ПРАКТИКА': 'INTERACTIVE PRACTICE'} · {activity.skillId}</small>
        <strong>{activity.title}</strong></div>
    </header>
    <p className={styles.prompt}>{prompt}</p>
    {['switch_attention','restorative_scene','situation_match'].includes(activity.kind)&&
      <figure className={styles.scene}>
        <img src="/images/holistic-house/course-focus-mountain-boy.webp" width={705} height={411}
          alt="" loading="lazy" decoding="async"/>
        <figcaption>{ru?'Можно наблюдать реальную комнату вместо изображения.':'You can observe your real surroundings instead.'}</figcaption>
      </figure>}
    <div className={styles.choices} role="group" aria-label={prompt}>
      {activity.choices.map((item,index)=><button key={item.value} type="button" disabled={disabled}
        onClick={()=>onChange(item.value)} aria-pressed={value===item.value}>
        <span className={styles.index}>{index+1}</span>
        <span>{item.label}</span>{value===item.value&&<Check size={17} aria-hidden="true"/>}
      </button>)}
    </div>
    {value&&<p className={styles.chosen} role="status">
      <Check size={16} aria-hidden="true"/>
      {ru?'Вы выбрали вариант упражнения. Можно изменить его или остановиться; это ещё не оценка освоения навыка.':
        'You chose an exercise option. You can change or stop; this is not a mastery score.'}
    </p>}
    {activity.kind==='fact_guess'&&value&&<p className={styles.explanation}>
      {ru?'В учебном сюжете точно известно лишь то, что ответ ещё не пришёл. Причина нам не известна; тревожный прогноз — предположение.':
        'In this fictional example, the only known fact is that a reply has not arrived. The reason is unknown; the worrying prediction is an assumption.'}
    </p>}
    <details className={styles.hint} onToggle={event=>{
      if(event.currentTarget.open&&!hintUsed)onHint()
    }}>
      <summary><Lightbulb size={17} aria-hidden="true"/>{ru?'Мягкая подсказка, если нужна':'A gentle hint if helpful'}<ChevronDown size={15}/></summary>
      <p>{activity.safeText}</p>
    </details>
    <p className={styles.note}><ShieldCheck size={15} aria-hidden="true"/>
      {ru?'Можно выбрать любую безопасную альтернативу и не раскрывать личный опыт. Голосовые и телесные упражнения не обязательны.':
        'You may choose a safe alternative without disclosing personal experiences. Audio and body-focused activities remain optional.'}
    </p>
  </section>
}

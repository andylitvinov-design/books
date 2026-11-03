'use client'
import {Check, Compass, HeartHandshake, Leaf} from 'lucide-react'
import {OPORA_STATE_JOURNEY_CHOICES,oporaStateJourneySummary} from '@/lib/inner-growth/opora-state-journey'
import styles from './opora-state-journey.module.css'

const copy={
  ru:{
    kicker:'МОЯ ОПОРА',plan:'Что может поддержать меня?',
    planHint:'Небольшой выбор, а не ещё один тест. Можно просто прочитать варианты.',
    need:'Что мне сейчас больше подходит?',support:'Какой шаг был бы посилен?',
    notice:'Моё состояние — возможная поддержка',experience:'Как изменилось внутреннее состояние?',
    experienceHint:'Отмечайте только то, что действительно заметили. Изменений может не быть.',
    signal:'Замечено',needLine:'Может помочь',supportLine:'Возможный шаг',
    experienceLine:'После практики',empty:'Пока без карточки — можно продолжить',
    noProof:'Это выбранный вариант, а не подтверждение выполнения или лечебного эффекта.',
  },
  en:{
    kicker:'MY OPORA',plan:'What might support me?',
    planHint:'A small choice, not another test. Reading the options is enough.',
    need:'What would suit me now?',support:'What small step might be possible?',
    notice:'My state and a possible support',experience:'What happened with my inner state?',
    experienceHint:'Report only what you actually noticed. No change is a valid answer.',
    signal:'Noticed',needLine:'Might help',supportLine:'Possible step',
    experienceLine:'After practising',empty:'No support card chosen yet — you can continue',
    noProof:'A selected option is not proof of action or a treatment effect.',
  },
}
function ChoiceRow({title,items,value,onChange,disabled}){
  return <div className={styles.group} role="group" aria-label={title}>
    <strong className={styles.question}>{title}</strong>
    <div className={styles.choices}>
      {items.map(item=><button type="button" key={item.id} disabled={disabled}
        aria-pressed={value===item.id} onClick={()=>onChange(item.id)}>
        <span>{item.label}</span>{value===item.id&&<Check size={16} aria-hidden="true"/>}
      </button>)}
    </div>
  </div>
}
export default function OporaStateJourney({part='plan',locale='en',value={},onChange,
  initialFeeling='',disabled=false,onUncomfortable}){
  const lang=locale==='ru'?'ru':'en',t=copy[lang]
  const summary=oporaStateJourneySummary(value,initialFeeling,lang)
  const options=field=>OPORA_STATE_JOURNEY_CHOICES[field].map(x=>({id:x.id,label:x[lang]}))
  const choose=(field,next)=>onChange?.(field,next)
  if(part==='experience')return <section className={styles.panel} data-opora-state-experience>
    <div className={styles.eyebrow}><HeartHandshake size={16}/>{t.kicker}</div>
    <h3>{t.experience}</h3>
    <p className={styles.hint}>{t.experienceHint}</p>
    <ChoiceRow title={t.experience} items={options('experience')} value={value?.experience}
      disabled={disabled} onChange={next=>{
        choose('experience',next)
        if(next==='uncomfortable')onUncomfortable?.()
      }}/>
  </section>
  if(part==='preview')return <section className={styles.preview} data-opora-state-preview
    aria-label={t.notice}>
    <div className={styles.eyebrow}><Leaf size={16}/>{t.kicker}</div>
    <strong className={styles.previewTitle}>{t.notice}</strong>
    {summary?<div className={styles.summary}>
      {summary.signal&&<p><span>{t.signal}</span><strong>{summary.signal}</strong></p>}
      {summary.need&&<p><span>{t.needLine}</span><strong>{summary.need}</strong></p>}
      {summary.support&&<p><span>{t.supportLine}</span><strong>{summary.support}</strong></p>}
      {summary.experience&&<p><span>{t.experienceLine}</span><strong>{summary.experience}</strong></p>}
    </div>:<p className={styles.hint}>{t.empty}</p>}
    <p className={styles.hint}>{t.noProof}</p>
  </section>
  return <section className={styles.panel} data-opora-state-plan>
    <div className={styles.eyebrow}><Compass size={16}/>{t.kicker}</div>
    <h3>{t.plan}</h3>
    <p className={styles.hint}>{t.planHint}</p>
    <ChoiceRow title={t.need} items={options('need')} value={value?.need}
      disabled={disabled} onChange={next=>choose('need',next)}/>
    <ChoiceRow title={t.support} items={options('support')} value={value?.support}
      disabled={disabled} onChange={next=>choose('support',next)}/>
    <OporaStateJourney part="preview" locale={locale} value={value} initialFeeling={initialFeeling}/>
  </section>
}

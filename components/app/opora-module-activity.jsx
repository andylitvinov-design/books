'use client'

import {useState} from 'react'
import {Check, Compass, Feather, Leaf, ShieldCheck} from 'lucide-react'
import {oporaModuleActivity} from '@/lib/inner-growth/opora-module-exercise'
import AntiStressMethodActivity from './anti-stress-method-activity'
import AntiStressPracticeLab from './anti-stress-practice-lab'
import styles from './opora-module-activity.module.css'

// The reviewed route/day descriptor is the sole source of route-specific content.
// Each existing slide selects one part, so this never adds another exercise.
export default function OporaModuleActivity({
  routePlan=null,part='main',moduleId,day,routerVersion,locale='en',value='',onChange,
  disabled=false,hintUsed=false,onHint,draft,onDraftChange,attempt='',onAttempt,
  onSaveReflection,onAddReflection,
}){
  if(routePlan){
    const card=part==='method'?routePlan.methodActivity:routePlan.practiceLab?.[part]
    if(!['method','main','reflect'].includes(part)||!card)return null
    const ru=locale==='ru'
    const label=part==='method'?(ru?'Вариант практики':'Practice choice'):
      part==='reflect'?(ru?'Необязательный разбор':'Optional review'):
        (ru?'Практика дня':'Daily practice')
    return <section className={styles.activity} data-opora-practical-day={day}
      data-opora-practical-format={card.format||card.kind||card.method}
      data-opora-practical-part={part} data-opora-route-schema={routePlan.schema}
      aria-label={label}>
      <div className={styles.heading}>
        <h3 className={styles.routeHeading}><Leaf size={15} aria-hidden="true"/>
          {label} · {day}/14</h3>
      </div>
      <div className={styles.routeContent}>
        {part==='method'?<AntiStressMethodActivity day={day} locale={locale}
          activity={routePlan.methodActivity} value={value} onChange={onChange}
          hintUsed={hintUsed} onHint={onHint} disabled={disabled}/>:
          <AntiStressPracticeLab day={day} locale={locale} part={part}
            plan={routePlan.practiceLab} value={value} onChange={onChange}
            draft={draft} onDraftChange={onDraftChange} hintUsed={hintUsed} onHint={onHint}
            attempt={attempt} onAttempt={onAttempt} disabled={disabled}
            onSaveReflection={onSaveReflection}/>}
      </div>
    </section>
  }
  return <GenericModuleActivity moduleId={moduleId} day={day} routerVersion={routerVersion}
    locale={locale} value={value} onChange={onChange} disabled={disabled}
    draft={draft} onDraftChange={onDraftChange}
    onAddReflection={onSaveReflection||onAddReflection}/>
}

// Compatibility for generic NAV-2.0 callers. A parent may retain the optional
// draft across slide navigation; the local fallback lasts for this mount only.
function GenericModuleActivity({
  moduleId,day,routerVersion,locale,value,onChange,disabled,onAddReflection,
  draft:retainedDraft,onDraftChange,
}){
  const plan=oporaModuleActivity(moduleId,day,locale,routerVersion)
  const [localDraft,setLocalDraft]=useState({})
  const [savedText,setSavedText]=useState('')
  const [copyError,setCopyError]=useState(false)
  const draft=retainedDraft??localDraft
  const setDraft=onDraftChange||setLocalDraft
  const words=Array.from({length:5},(_,i)=>typeof draft[i]==='string'?draft[i]:'')
  if(!plan)return null
  const ru=locale==='ru'
  const showPhoto=plan.kind==='photo'||plan.kind==='associations'
  const showWords=plan.kind==='associations'&&value==='words'
  const trimmed=words.map(text=>text.trim()).filter(Boolean)
  const addition=trimmed.length?(ru?'Мои ассоциации: ':'My photo associations: ')+trimmed.join(', '):''
  const saved=Boolean(addition)&&savedText===addition
  const addWords=()=>{
    if(disabled||!addition||typeof onAddReflection!=='function')return
    // Copy the whole draft; capacity rejection must never be shown as success.
    const accepted=onAddReflection(addition)
    setSavedText(accepted===false?'':addition)
    setCopyError(accepted===false)
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
        onClick={()=>onChange?.(option.id)}>
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
            onChange={event=>{const text=event.target.value;setDraft(previous=>({...previous,[i]:text}));setSavedText('');setCopyError(false)}}/>
        </label>)}
      </div>
      <button type="button" className={styles.saveNote} disabled={disabled||saved||!addition||typeof onAddReflection!=='function'}
        onClick={addWords}>{saved?(ru?'Добавлено в личную запись':'Added to private reflection') :
        (ru?'Добавить в личную запись':'Add to my private reflection')}</button>
      {copyError&&<p role="alert" data-opora-journal-copy-refused>{ru?
        'Не добавлено в личную запись. Черновик не изменён: сократите его или отредактируйте запись и попробуйте снова.':
        'Not added to your private reflection. Your draft is unchanged: shorten it or edit the reflection and try again.'}</p>}
      <p>{ru?'Это свободные ассоциации, не психологический тест. Текст добавляется в зашифрованную личную запись только по нажатию кнопки.':
        'These are free associations, not a personality test. Words enter your encrypted private reflection only after you choose to add them.'}</p>
    </div>}
    <p className={styles.note}><ShieldCheck size={16} aria-hidden="true"/>
      {ru?'Выбор необязателен. Можно сменить ответ или остановиться. Упражнение не оценивает ваше психическое здоровье.':
      'A choice is optional. Change your answer or stop at any time. This does not score your mental health.'}
    </p>
  </section>
}

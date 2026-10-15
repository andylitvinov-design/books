'use client'

import { useState } from 'react'
import { Check, ChevronLeft, ChevronRight, CircleHelp, Leaf, PauseCircle, Sparkles } from 'lucide-react'
import { antiStressLabFor } from '@/lib/inner-growth/anti-stress-practice-lab'
import styles from './anti-stress-practice-lab.module.css'

// Each lab lives WITHIN an existing ritual or symbolic slide. A choice alone
// does not certify that the person actually performed the suggested action.
export default function AntiStressPracticeLab({
  day,locale='en',part='main',value='',onChange,attempt='',onAttempt,
  disabled=false,onSaveReflection,
}){
  const ru=locale==='ru',plan=antiStressLabFor(day,locale),card=plan?.[part]
  const [step,setStep]=useState(0)
  const [hint,setHint]=useState(false)
  const [words,setWords]=useState(['','','','',''])
  const [qualities,setQualities]=useState(['','','','',''])
  const [savedNote,setSavedNote]=useState(false)
  if(!card)return null
  const t=(a,b)=>ru?a:b
  const add=(items,index,value,fn)=>{
    fn(items.map((item,i)=>i===index?value.slice(0,32).replace(/[\r\n]/g,' '):item))
    setSavedNote(false)
  }
  const keepAssociations=()=>{
    const lines=words.map((word,i)=>({word:word.trim(),quality:qualities[i].trim()}))
      .filter(item=>item.word||item.quality)
    if(!lines.length||typeof onSaveReflection!=='function')return
    const text=t('Мои ассоциации: ','My associations: ')+
      lines.map(item=>[item.word,item.quality].filter(Boolean).join(' — ')).join('; ')
    onSaveReflection(text.slice(0,440))
    setSavedNote(true)
  }
  return <section className={styles.lab} data-opora-practical-lab={part}
    data-opora-lab-method={card.method} aria-label={card.title}>
    <div className={styles.kicker}><Sparkles size={16} aria-hidden="true"/>
      {t('ИНТЕРАКТИВНАЯ ПРАКТИКА','HANDS-ON EXERCISE')} · {day}/14</div>
    <h3>{card.title}</h3>
    <p className={styles.intro}>{card.instruction}</p>
    <div className={styles.exerciseStep} data-practical-step={step+1}>
      <div className={styles.stepMeta}>
        <strong>{t('Попробуйте в своём темпе','Try at your own pace')}</strong>
        <small>{step+1} / {card.steps.length}</small>
      </div>
      <p>{card.steps[step]}</p>
      <div className={styles.stepButtons}>
        <button type="button" disabled={disabled||step===0} onClick={()=>setStep(current=>Math.max(0,current-1))}>
          <ChevronLeft size={16}/>{t('Назад','Back')}
        </button>
        <button type="button" disabled={disabled} onClick={()=>setStep(current=>(current+1)%card.steps.length)}>
          {step===card.steps.length-1?t('Повторить по желанию','Repeat if you wish'):t('Следующий шаг','Next step')}
          <ChevronRight size={16}/>
        </button>
      </div>
    </div>
    <p className={styles.choiceTitle}>
      {t('Какой вариант вам сейчас подходит?','Which option feels accessible now?')}
    </p>
    <div className={styles.options} role="group" aria-label={card.title} data-practical-choices>
      {card.options.map(item=><button type="button" key={item.id} disabled={disabled}
        aria-pressed={value===item.id} onClick={()=>onChange(item.id)}>
        <span>{item.label}</span>{value===item.id&&<Check size={18} aria-hidden="true"/>}
      </button>)}
    </div>
    {value&&<p role="status" className={styles.note}>
      {t('Ваш выбор записан как выбор, а не как подтверждение результата.',
        'Your choice is recorded as a choice, not proof of an outcome.')}
    </p>}
    {['retrieval_try','situation_match','fact_guess'].includes(card.method)&&
      <div className={styles.hintBlock}>
        <button type="button" disabled={disabled} onClick={()=>setHint(x=>!x)}
          aria-expanded={hint}><CircleHelp size={16}/>{hint?t('Скрыть подсказку','Hide hint'):t('Подсказка без оценивания','Show a non-grading hint')}</button>
        {hint&&<p>{t('Нейтральный ориентир, небольшая пауза или отдых тоже могут быть ответом. Здесь нет оценки «правильно/неправильно».',
          'A neutral detail, a brief pause or rest may also be an answer. There is no right/wrong grade.')}</p>}
      </div>}
    {card.format==='associations'&&value==='words'&&<div className={styles.associations} data-course-five-associations>
      <p>{t('Если хочется, напишите до пяти слов из обычной сцены и по одному качеству к каждому. Не указывайте личные имена. Интерпретации не будет.',
        'Optionally write up to five neutral scene words and one quality for each. Please avoid names. No interpretation is made.')}</p>
      {Array.from({length:5},(_,i)=><div className={styles.associationRow} key={i}>
        <label><span>{t('Слово','Word')} {i+1}</span><input type="text" maxLength={32}
          value={words[i]} disabled={disabled} placeholder={t('Например, небо','e.g. sky')}
          onChange={e=>add(words,i,e.target.value,setWords)}/></label>
        <label><span>{t('Качество','Quality')} {i+1}</span><input type="text" maxLength={32}
          value={qualities[i]} disabled={disabled} placeholder={t('Например, широкое','e.g. spacious')}
          onChange={e=>add(qualities,i,e.target.value,setQualities)}/></label>
      </div>)}
      <button className={styles.journalButton} type="button"
        disabled={disabled||!words.some(x=>x.trim())&&!qualities.some(x=>x.trim())}
        onClick={keepAssociations}><Leaf size={17}/>{t('Добавить в мой личный дневник','Add to my private journal')}</button>
      {savedNote&&<p role="status" className={styles.note}>
        {t('Текст добавлен к заметке этого урока. Сохранится при завершении занятия.',
          'Added to this lesson note. It will save when you finish the lesson.')}
      </p>}
    </div>}
    {part==='main'&&<div className={styles.attempt} data-practical-attempt>
      <p>{t('Что вы действительно сделали? (необязательно)','What did you actually do? (optional)')}</p>
      <div className={styles.attemptChoices} role="group" aria-label={t('Моя попытка','My attempt')}>
        {[
          ['tried',t('Попробовал(а)','Tried')],
          ['partly',t('Частично','Partly')],
          ['stopped',t('Остановился(ась)','Stopped')],
          ['skip',t('Не делал(а)','Did not try')],
        ].map(([id,label])=><button type="button" key={id} disabled={disabled}
          aria-pressed={attempt===id} onClick={()=>onAttempt(id)}>{label}</button>)}
      </div>
    </div>}
    <p className={styles.safety}><PauseCircle size={16} aria-hidden="true"/>
      {t('Можно пропустить. Не требуется менять самочувствие или делать что-либо через усилие.',
        'You may skip this. No need to change how you feel or force an action.')}
    </p>
  </section>
}

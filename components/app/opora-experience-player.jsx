'use client'

import {useEffect,useRef,useState} from 'react'
import {ArrowLeft,ArrowRight,CheckCircle2,ChevronDown,Heart,Pause,ShieldCheck,X} from 'lucide-react'
import {validateOpora54Signals} from '@/lib/inner-growth/anti-stress-skills-v6'
import {OPORA_EXPERIENCE_PRE_SAVE_KEYS} from '@/lib/inner-growth/course-slide-sequence'
import styles from './opora-experience-player.module.css'

// AS-5.6 presentation of existing AS-5.5/V7 lessons.
// Five learner-facing moments, not fourteen comprehension checks. Existing
// fifteen-screen submissions/history remain supported by the server.
const WORDS={
  ru:{
    day:'День',of:'из',pause:'Пауза',close:'Закончить',back:'Назад',next:'Продолжить',
    save:'Сохранить мою практику',saving:'Сохраняем…',finish:'К карте курса',
    minute:'Один спокойный момент',learn:'Маленькая практика',feel:'Что изменилось?',
    quote:'Мысль сегодняшнего дня',keep:'Возьмите с собой',
    arriveTitle:'Можно просто побыть здесь',
    arriveText:'Оглянитесь. Найдите один приятный или нейтральный цвет рядом. Не спешите — вы уже начали.',
    arriveHint:'Почувствуйте опору сиденья или просто посмотрите на устойчивый предмет. Дыхание менять не нужно.',
    practiceText:'Попробуйте один небольшой шаг, только если вам комфортно.',
    stepLabel:'Сегодня можно попробовать',
    start:'Я попробую этот шаг',alternative:'Другой мягкий вариант',tryAfter:'Как прошло?',
    tried:'Я попробовал(а)',partly:'Удалось немного',read:'Сегодня только знакомлюсь',
    gentle:'Ничего не нужно делать идеально. Можно остановиться в любой момент.',
    feelText:'Побудьте несколько мгновений. Не нужно специально добиваться спокойствия. Просто сравните ощущения, если хочется.',
    feelingBetter:'Стало немного легче',feelingSame:'Примерно так же',feelingPartial:'Есть небольшие изменения',feelingHard:'Стало некомфортно',
    feelingThanks:'Спасибо, что заметили. Любой ответ подходит; состояние не оценивается баллами.',
    quoteText:'Это не правило и не экзамен. Какая реакция ближе именно вам?',
    agree:'Откликается',unsure:'Пока не уверен(а)',disagree:'Не согласен(на)',
    quoteThanks:'Это только ваша позиция, правильного ответа нет.',
    keepText:'Одной маленькой опоры достаточно. Можно ничего не планировать.',
    plan:'Хочу запомнить этот вариант',noPlan:'Пока без плана',
    saved:'Ваш момент сохранён',savedText:'Вы уделили себе время. Даже если состояние не изменилось, это не ошибка.',
    attempted:'Вы попробовали упражнение',readOnly:'Сегодня только ознакомление — выполнение не отмечено',
    takeaway:'Ваш возможный следующий шаг',
    feedback:'Ваше наблюдение',noResult:'Можно закончить без оценок самочувствия.',
    noSave:'Сохранение не подтверждено. Проверьте соединение и повторите.',
    incomplete:'Сначала откройте оставшиеся моменты занятия.',
    safetyTitle:'Здесь можно остановиться',
    safetyBody:'Не нужно продолжать через дискомфорт. По желанию найдите взглядом обычный предмет вокруг. Дышите естественно.',
    safetyNeutral:'Вернуться с нейтральной опорой',safetyBack:'Вернуться',safetyEnd:'Закончить без сохранения',
    learnMore:'Показать мягкую подсказку',noMedical:'Самостоятельная образовательная практика, не лечение и не диагностика.',
  },
  en:{
    day:'Day',of:'of',pause:'Pause',close:'End lesson',back:'Back',next:'Continue',
    save:'Save my practice',saving:'Saving…',finish:'My course map',
    minute:'One quiet moment',learn:'A small practice',feel:'What do you notice?',
    quote:'A thought for today',keep:'Take this with you',
    arriveTitle:'You can arrive just as you are',
    arriveText:'Look around. Find one pleasant or neutral colour nearby. There is no hurry — you have already begun.',
    arriveHint:'Feel the support of your seat, or simply look at a steady object. No need to change your breathing.',
    practiceText:'Try one small step, only if it feels comfortable.',
    stepLabel:'A gentle step for today',
    start:'I will try this step',alternative:'Another gentle option',tryAfter:'How did that go?',
    tried:'I tried it',partly:'I tried a little',read:'Just reading today',
    gentle:'Nothing needs to be done perfectly. You can stop at any moment.',
    feelText:'Stay here a few moments. You do not have to make yourself calm. Just notice what is here, if you wish.',
    feelingBetter:'A little easier',feelingSame:'About the same',feelingPartial:'A small shift',feelingHard:'Uncomfortable',
    feelingThanks:'Thank you for noticing. There is no score or right answer.',
    quoteText:'This is not a rule or a test. What feels true for you?',
    agree:'This resonates',unsure:'Not sure yet',disagree:'I disagree',
    quoteThanks:'Your response is yours. There is no correct answer.',
    keepText:'One small source of support is enough. You do not need a plan.',
    plan:'Keep this reminder',noPlan:'No plan today',
    saved:'Your moment is saved',savedText:'You made time for yourself. No change in how you feel is not a failure.',
    attempted:'You reported trying the exercise',readOnly:'Explored the idea only — no attempt recorded',
    takeaway:'Your possible next step',feedback:'Your observation',noResult:'You can finish without rating yourself.',
    noSave:'Saving was not confirmed. Check the connection and try again.',
    incomplete:'Please open the remaining moments before saving.',
    safetyTitle:'You may stop here',
    safetyBody:'You do not need to push through discomfort. If you wish, look for an ordinary object around you. Let your breath remain natural.',
    safetyNeutral:'Return with a neutral anchor',safetyBack:'Go back',safetyEnd:'End without saving',
    learnMore:'Show gentle guidance',noMedical:'Self-guided education, not treatment or diagnosis.',
  },
}
const SCENES=['arrive','practice','feel','affirmation','save']

export default function OporaExperiencePlayer({locale='en',data,busy=false,onClose,onFinish,onSession}){
  const lang=locale==='ru'?'ru':'en',t=WORDS[lang]
  const lesson=data?.lesson||{},cycle=data?.cycle||{},authored=lesson?.opora54||{}
  const hasSaved=Boolean(data?.currentSession)
  const [step,setStep]=useState(hasSaved?OPORA_EXPERIENCE_PRE_SAVE_KEYS.length:0)
  const [saved,setSaved]=useState(hasSaved)
  const [answers,setAnswers]=useState(data?.currentSession?.signals?.opora54?.answers||{})
  const [actionIndex,setActionIndex]=useState(0)
  const [actionStarted,setActionStarted]=useState(false)
  const [showHelp,setShowHelp]=useState(false)
  const [safety,setSafety]=useState(false)
  const [error,setError]=useState('')
  const [saving,setSaving]=useState(false)
  const operation=useRef(null)
  const visited=useRef(new Set([OPORA_EXPERIENCE_PRE_SAVE_KEYS[0]]))
  const heading=useRef(null),safetyTrigger=useRef(null),safetyPrimary=useRef(null)
  const safetyBack=useRef(null),safetyEnd=useRef(null),wasPaused=useRef(false)
  const locked=Boolean(busy||saving),receipt=step>=OPORA_EXPERIENCE_PRE_SAVE_KEYS.length
  const moment=receipt?'receipt':SCENES[step]
  const actions=authored.exercises?.act?.choices||[]
  const activity=actions[actionIndex]||actions[0]||lesson?.antiStress?.skill||''
  const plan=authored.exercises?.transfer?.choices?.[0]||lesson.workbook?.microPractice||''
  const originalQuote=authored.quote||lesson.aphorism||''
  const rating=answers.reflection
  const vote=answers.aphorism
  useEffect(()=>{
    if(!receipt)visited.current.add(OPORA_EXPERIENCE_PRE_SAVE_KEYS[step])
    heading.current?.focus?.()
  },[step,receipt])
  useEffect(()=>{
    if(safety){wasPaused.current=true;safetyPrimary.current?.focus?.()}
    else if(wasPaused.current)safetyTrigger.current?.focus?.()
  },[safety])
  function pauseKeys(event){
    if(event.key==='Escape'){event.preventDefault();setSafety(false);return}
    if(event.key!=='Tab')return
    const nodes=[safetyPrimary.current,safetyBack.current,safetyEnd.current].filter(Boolean)
    const at=nodes.indexOf(event.target)
    if(event.shiftKey&&at<=0){event.preventDefault();nodes[nodes.length-1]?.focus?.()}
    else if(!event.shiftKey&&at===nodes.length-1){event.preventDefault();nodes[0]?.focus?.()}
  }
  function selectAction(index){
    if(locked)return
    setActionIndex(index)
    setActionStarted(true)
    setAnswers(a=>({...a,actChoice:['one','two','three'][index],act:undefined}))
  }
  function tryStatus(value){
    if(locked)return
    setAnswers(a=>({...a,act:value}))
  }
  function next(){
    if(locked)return
    setError('')
    setStep(s=>Math.min(OPORA_EXPERIENCE_PRE_SAVE_KEYS.length-1,s+1))
  }
  function back(){
    if(locked)return
    setError('')
    setStep(s=>Math.max(0,s-1))
  }
  function changeFeeling(value){
    if(locked)return
    setAnswers(a=>({...a,reflection:value}))
    if(value==='uncomfortable')setSafety(true)
  }
  async function submit(){
    if(locked||saved)return
    if(step!==OPORA_EXPERIENCE_PRE_SAVE_KEYS.length-1||
      OPORA_EXPERIENCE_PRE_SAVE_KEYS.some(key=>!visited.current.has(key))){
      setError(t.incomplete);return
    }
    let safe
    try{
      // Undefined responses are not saved and an exercise selection alone
      // never proves a practice attempt.
      const submitted=Object.fromEntries(Object.entries(answers).filter(([,v])=>v!==undefined&&v!==null))
      safe=validateOpora54Signals({answers:submitted,hints:[],ease:null})
    }catch{setError(t.noSave);return}
    setSaving(true);setError('')
    try{
      if(!operation.current)operation.current=crypto.randomUUID()
      const attempted=['tried','partly'].includes(safe.answers.act)
      const response=await onSession({
        day:cycle.day,lessonId:lesson.id,operationId:operation.current,
        feedback:rating==='uncomfortable'?'uncomfortable':rating==='unchanged'?'neutral':
          rating==='useful'||rating==='partly'?'helped':'skip',
        beforeNow:null,afterNow:null,practiceWindow:'practice_v6',
        aphorismResponse:safe.answers.aphorism||null,
        practiceAttempt:attempted?(safe.answers.act==='tried'?'tried':'simplified'):null,
        comfort:rating==='uncomfortable'?'uncomfortable':null,
        transferStage:safe.answers.transfer==='planned'?'plan':null,
        opora54:safe,visitedSlideKeys:[...OPORA_EXPERIENCE_PRE_SAVE_KEYS],
      })
      if(response){setSaved(true);setStep(OPORA_EXPERIENCE_PRE_SAVE_KEYS.length);operation.current=null}
      else setError(t.noSave)
    }catch{setError(t.noSave)}
    finally{setSaving(false)}
  }
  const title=receipt?t.saved:
    moment==='arrive'?t.arriveTitle:
    moment==='practice'?t.learn:
    moment==='feel'?t.feel:
    moment==='affirmation'?t.quote:t.keep
  const reportedAttempt=['tried','partly'].includes(answers.act)
  return <div className={styles.overlay} role="dialog" aria-modal="true"
    aria-label={t.day+' '+cycle.day+': '+lesson.title}
    data-opora-experience-first="as-5.6" data-course-one-screen="v3">
    <div className={styles.frame+' '+(styles[moment]||styles.arrive)}
      inert={safety} aria-hidden={safety?'true':undefined}>
      <header className={styles.header}>
        <button type="button" className={styles.iconButton} onClick={onClose}
          disabled={locked} aria-label={t.close}><X size={21}/></button>
        <div className={styles.progress}>
          <div className={styles.progressCopy}><span>{t.day} {cycle.day}/14</span>
            <span>{Math.min(step+1,6)} / 6</span></div>
          <div className={styles.track}><div className={styles.fill}
            style={{width:((step+1)/6*100)+'%'}}/></div>
        </div>
        <button type="button" className={styles.pause} ref={safetyTrigger}
          onClick={()=>setSafety(true)} disabled={locked}><Pause size={16}/>{t.pause}</button>
      </header>
      <main className={styles.stage}>
        <section className={styles.panel} aria-live="off">
          {!receipt&&<span className={styles.eyebrow}>
            {moment==='arrive'?t.minute:moment==='practice'?t.stepLabel:
            moment==='feel'?t.feel:moment==='affirmation'?t.quote:t.keep}
          </span>}
          <h2 ref={heading} tabIndex={-1} className={styles.title}>{title}</h2>
          {moment==='arrive'&&<>
            <p className={styles.lead}>{t.arriveText}</p>
            <p className={styles.soft}>{t.arriveHint}</p>
          </>}
          {moment==='practice'&&<>
            <p className={styles.lead}>{t.practiceText}</p>
            <p className={styles.action}>{activity}</p>
            <div className={styles.choiceRow}>
              <button type="button" className={styles.actionButton} disabled={locked}
                onClick={()=>selectAction(actionIndex)}>
                {actionStarted?<CheckCircle2 size={18}/>:<Heart size={18}/>}
                {t.start}</button>
              {actions.length>1&&<button type="button" className={styles.plain}
                disabled={locked} onClick={()=>selectAction((actionIndex+1)%Math.min(2,actions.length))}>
                {t.alternative}</button>}
            </div>
            {actionStarted&&<>
              <p className={styles.miniLabel}>{t.tryAfter}</p>
              <div className={styles.chips} role="group" aria-label={t.tryAfter}>
                {[[t.tried,'tried'],[t.partly,'partly'],[t.read,'not_attempted']].map(([label,value])=>
                  <button type="button" key={value} disabled={locked}
                    aria-pressed={answers.act===value} onClick={()=>tryStatus(value)}>{label}</button>)}
              </div>
            </>}
            <button type="button" className={styles.linkHint} disabled={locked}
              onClick={()=>setShowHelp(s=>!s)} aria-expanded={showHelp}>
              {t.learnMore}<ChevronDown size={16}/></button>
            {showHelp&&<p className={styles.soft}>{lesson.antiStress?.neutralText||t.gentle}</p>}
          </>}
          {moment==='feel'&&<>
            <p className={styles.lead}>{t.feelText}</p>
            <div className={styles.chips+' '+styles.feeling} role="group" aria-label={t.feel}>
              {[[t.feelingBetter,'useful'],[t.feelingPartial,'partly'],
                [t.feelingSame,'unchanged'],[t.feelingHard,'uncomfortable']].map(([label,value])=>
                <button type="button" key={value} disabled={locked}
                  aria-pressed={rating===value} onClick={()=>changeFeeling(value)}>{label}</button>)}
            </div>
            {rating&&<p className={styles.soft} role="status">{t.feelingThanks}</p>}
          </>}
          {moment==='affirmation'&&<>
            <blockquote className={styles.quotation}>{originalQuote}</blockquote>
            <p className={styles.subtle}>{t.quoteText}</p>
            <div className={styles.chips} role="group" aria-label={t.quote}>
              {[[t.agree,'agree'],[t.unsure,'unsure'],[t.disagree,'disagree']].map(([label,value])=>
                <button type="button" key={value} disabled={locked}
                  aria-pressed={vote===value} onClick={()=>setAnswers(a=>({...a,aphorism:value}))}>{label}</button>)}
            </div>
            {vote&&<p className={styles.soft} role="status">{t.quoteThanks}</p>}
          </>}
          {moment==='save'&&<>
            <p className={styles.lead}>{t.keepText}</p>
            <p className={styles.action}>{plan}</p>
            <div className={styles.chips} role="group" aria-label={t.keep}>
              <button type="button" disabled={locked}
                aria-pressed={answers.transfer==='planned'} onClick={()=>setAnswers(a=>({...a,transferChoice:'one',transfer:'planned'}))}>{t.plan}</button>
              <button type="button" disabled={locked}
                aria-pressed={answers.transfer==='not_planning'} onClick={()=>setAnswers(a=>({...a,transferChoice:undefined,transfer:'not_planning'}))}>{t.noPlan}</button>
            </div>
            <p className={styles.soft}>{reportedAttempt?t.attempted:t.readOnly}</p>
          </>}
          {receipt&&<>
            <p className={styles.lead}>{t.savedText}</p>
            <div className={styles.receipt}>
              <ShieldCheck size={22}/><span>{reportedAttempt?t.attempted:t.readOnly}</span>
            </div>
            {answers.transfer==='planned'&&<p className={styles.soft}><strong>{t.takeaway}:</strong> {plan}</p>}
            {rating&&<p className={styles.soft}><strong>{t.feedback}:</strong> {{
              useful:t.feelingBetter,partly:t.feelingPartial,unchanged:t.feelingSame,
              uncomfortable:t.feelingHard,
            }[rating]}</p>}
            {!rating&&<p className={styles.soft}>{t.noResult}</p>}
          </>}
          <small className={styles.disclaimer}>{t.noMedical}</small>
        </section>
      </main>
      {error&&<p className={styles.error} role="alert">{error}</p>}
      <footer className={styles.footer}>
        {!receipt&&step>0&&<button type="button" className={styles.back}
          onClick={back} disabled={locked}><ArrowLeft size={17}/>{t.back}</button>}
        <button type="button" className={styles.primary} disabled={locked}
          onClick={receipt?(onFinish||onClose):step===OPORA_EXPERIENCE_PRE_SAVE_KEYS.length-1?submit:next}>
          {receipt?t.finish:step===OPORA_EXPERIENCE_PRE_SAVE_KEYS.length-1?(saving?t.saving:t.save):t.next}
          {receipt||step===OPORA_EXPERIENCE_PRE_SAVE_KEYS.length-1?<CheckCircle2 size={18}/>:<ArrowRight size={18}/>}
        </button>
      </footer>
    </div>
    {safety&&<div className={styles.shade} role="alertdialog" aria-modal="true"
      aria-label={t.safetyTitle} onKeyDown={pauseKeys}>
      <div className={styles.safetyCard}>
        <ShieldCheck size={29}/><h3>{t.safetyTitle}</h3><p>{t.safetyBody}</p>
        <button type="button" ref={safetyPrimary}
          onClick={()=>{setSafety(false);setShowHelp(true)}}>{t.safetyNeutral}</button>
        <button type="button" ref={safetyBack} onClick={()=>setSafety(false)}>{t.safetyBack}</button>
        <button type="button" ref={safetyEnd} className={styles.safetyExit}
          onClick={onClose}>{t.safetyEnd}</button>
      </div>
    </div>}
  </div>
}

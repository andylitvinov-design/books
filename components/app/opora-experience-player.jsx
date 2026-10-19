'use client'

import {useEffect,useRef,useState} from 'react'
import {ArrowLeft,ArrowRight,CheckCircle2,ChevronDown,Pause,ShieldCheck,X} from 'lucide-react'
import {validateOpora54Signals} from '@/lib/inner-growth/anti-stress-skills-v6'
import {OPORA_EXPERIENCE_PRE_SAVE_KEYS,OPORA_DAY_ONE_RESTORED_KEYS} from '@/lib/inner-growth/course-slide-sequence'
import {dayOneAphorism} from '@/lib/inner-growth/anti-stress-day-one'
import {welcomeFeelingChoices,welcomeFeelingSupport} from '@/lib/inner-growth/course-welcome'
import {oporaExperienceDay,oporaExperienceGuide,OPORA_EXPERIENCE_DESIGN_VERSION} from '@/lib/inner-growth/opora-as56-experience-guides'
import styles from './opora-experience-player.module.css'

// AS-5.6 presentation of existing AS-5.5/V7 lessons.
// Five learner-facing moments, not fourteen comprehension checks. Existing
// fifteen-screen submissions/history remain supported by the server.
const WORDS={
  ru:{
    day:'День',of:'из',pause:'Пауза',close:'Закончить',back:'Назад',next:'Продолжить',
    save:'Сохранить мою практику',saving:'Сохраняем…',finish:'К карте курса',
    minute:'СНАЧАЛА — ВЫ',learn:'Маленькая практика',feel:'Что изменилось?',
    quote:'Мысль сегодняшнего дня',keep:'Возьмите с собой',
    arriveTitle:'Как вы сейчас себя чувствуете?',
    arriveText:'Выберите то, что ближе. Здесь нет правильного ответа.',
    arriveSkip:'Можно продолжить и без ответа.',
    startFeeling:'В начале занятия',
    moods:[
      {value:'steady',symbol:'🌿',label:'Спокойно',reply:'Спасибо, что поделились. Можно просто побыть с этим состоянием.'},
      {value:'tense',symbol:'☁️',label:'Напряжённо',reply:'Спасибо, что сказали. Здесь не нужно заставлять себя расслабиться.'},
      {value:'low',symbol:'🌙',label:'Мало сил',reply:'Спасибо, что заметили. Можно идти совсем маленькими шагами.'},
      {value:'unsure',symbol:'💭',label:'Не знаю',reply:'Это тоже подходит. Необязательно сразу понимать свои чувства.'},
    ],
    arrivalWarmTitle:'Можно просто побыть здесь',
    arrivalWarmText:'Найдите взглядом одну приятную или нейтральную деталь вокруг.',
    arriveHint:'Почувствуйте опору сиденья или просто посмотрите на устойчивый предмет. Дыхание менять не нужно.',
    practiceText:'Попробуйте один небольшой шаг, только если вам комфортно.',
    stepLabel:'Сегодня можно попробовать',
    start:'Я попробую этот шаг',alternative:'Другой мягкий вариант',tryAfter:'Как прошло?',
    tried:'Я попробовал(а)',partly:'Удалось немного',read:'Сегодня только знакомлюсь',
    gentle:'Если некомфортно, просто посмотрите на нейтральный предмет.',
    feelText:'Заметьте, изменилось ли что-то хотя бы немного.',
    feelingBetter:'Стало немного легче',feelingSame:'Примерно так же',feelingPartial:'Есть небольшие изменения',feelingHard:'Стало некомфортно',
    feelingThanks:'Спасибо, что заметили. Любой ответ подходит; состояние не оценивается баллами.',
    quoteText:'Откликается ли вам эта мысль?',
    agree:'Откликается',unsure:'Пока не уверен(а)',disagree:'Не согласен(на)',
    quoteThanks:'Это только ваша позиция, правильного ответа нет.',
    keepText:'Выберите одно напоминание на сегодня.',
    plan:'Хочу запомнить этот вариант',noPlan:'Пока без плана',
    saved:'Ваш момент сохранён',savedText:'Вы уделили себе немного времени.',
    attempted:'Вы попробовали упражнение',readOnly:'Сегодня только ознакомление — выполнение не отмечено',
    takeaway:'Ваш возможный следующий шаг',
    feedback:'Ваше наблюдение',noResult:'Можно закончить без оценок самочувствия.',
    noSave:'Сохранение не подтверждено. Проверьте соединение и повторите.',
    incomplete:'Сначала откройте оставшиеся моменты занятия.',
    safetyTitle:'Здесь можно остановиться',
    safetyBody:'Не нужно продолжать через дискомфорт. По желанию найдите взглядом обычный предмет вокруг. Дышите естественно.',
    neutralAnchor:'Если хочется, посмотрите на один обычный предмет вокруг.',
    neutralSafety:'Можно остановиться; дыхание менять не нужно.',
    safetyNeutral:'Вернуться с нейтральной опорой',safetyBack:'Вернуться',safetyEnd:'Закончить без сохранения',
    ideaTitle:'Бережная мысль',reminderTitle:'Одно напоминание',feelTitle:'Как сейчас?',
    learnMore:'Показать мягкую подсказку',noMedical:'Самостоятельная практика, не диагностика и не лечение.',
  },
  en:{
    day:'Day',of:'of',pause:'Pause',close:'End lesson',back:'Back',next:'Continue',
    save:'Save my practice',saving:'Saving…',finish:'My course map',
    minute:'A MOMENT FOR YOU',learn:'A small practice',feel:'What do you notice?',
    quote:'A thought for today',keep:'Take this with you',
    arriveTitle:'How are you feeling right now?',
    arriveText:'Choose what feels closest. There is no right answer.',
    arriveSkip:'You can continue without answering.',
    startFeeling:'At the start',
    moods:[
      {value:'steady',symbol:'🌿',label:'Calm',reply:'Thank you for sharing. You can begin just as you are.'},
      {value:'tense',symbol:'☁️',label:'Tense',reply:'Thank you for sharing. You do not have to make yourself relax.'},
      {value:'low',symbol:'🌙',label:'Tired',reply:'Thank you for noticing. We can go one small step at a time.'},
      {value:'unsure',symbol:'💭',label:'Not sure',reply:'That is okay, too. You do not have to name a feeling to begin.'},
    ],
    arrivalWarmTitle:'You can arrive just as you are',
    arrivalWarmText:'Find one calm or pleasant detail around you.',
    arriveHint:'Feel the support of your seat, or simply look at a steady object. No need to change your breathing.',
    practiceText:'Try one small step, only if it feels comfortable.',
    stepLabel:'A gentle step for today',
    start:'I will try this step',alternative:'Another gentle option',tryAfter:'How did that go?',
    tried:'I tried it',partly:'I tried a little',read:'Just reading today',
    gentle:'If uncomfortable, simply look at a neutral object instead.',
    feelText:'Notice whether anything feels a little different.',
    feelingBetter:'A little easier',feelingSame:'About the same',feelingPartial:'A small shift',feelingHard:'Uncomfortable',
    feelingThanks:'Thank you for noticing. There is no score or right answer.',
    quoteText:'Does this idea resonate with you?',
    agree:'This resonates',unsure:'Not sure yet',disagree:'I disagree',
    quoteThanks:'Your response is yours. There is no correct answer.',
    keepText:'Choose one gentle reminder for today.',
    plan:'Keep this reminder',noPlan:'No plan today',
    saved:'Your moment is saved',savedText:'You made a little space for yourself.',
    attempted:'You reported trying the exercise',readOnly:'Explored the idea only — no attempt recorded',
    takeaway:'Your possible next step',feedback:'Your observation',noResult:'You can finish without rating yourself.',
    noSave:'Saving was not confirmed. Check the connection and try again.',
    incomplete:'Please open the remaining moments before saving.',
    safetyTitle:'You may stop here',
    safetyBody:'You do not need to push through discomfort. If you wish, look for an ordinary object around you. Let your breath remain natural.',
    neutralAnchor:'If you wish, look at one ordinary object around you.',
    neutralSafety:'You can stop; no need to change your breathing.',
    safetyNeutral:'Return with a neutral anchor',safetyBack:'Go back',safetyEnd:'End without saving',
    ideaTitle:'A gentle idea',reminderTitle:'One reminder',feelTitle:'How do you feel now?',
    learnMore:'Show gentle guidance',noMedical:'Self-guided learning, not diagnosis or treatment.',
  },
}
WORDS.es = {
  ...WORDS.en,
  day:'Día',pause:'Pausa',close:'Cerrar lección',back:'Atrás',next:'Continuar',
  save:'Guardar mi práctica',saving:'Guardando…',finish:'Mapa del curso',
  minute:'UN MOMENTO PARA TI',learn:'Una práctica pequeña',feel:'¿Qué notas?',
  quote:'UNA IDEA PARA HOY',keep:'LLÉVATE ESTO',
  arriveTitle:'¿Cómo te sientes ahora?',
  arriveText:'Elige lo que más se acerque. No hay respuesta correcta.',
  arriveSkip:'Puedes continuar sin responder.',
  startFeeling:'Al empezar',
  moods:[
    {value:'steady',symbol:'🌿',label:'En calma',reply:'Gracias por compartirlo. Puedes empezar tal como estás.'},
    {value:'tense',symbol:'☁️',label:'Con tensión',reply:'Gracias por contarlo. No tienes que obligarte a relajarte.'},
    {value:'low',symbol:'🌙',label:'Sin energía',reply:'Gracias por notarlo. Podemos ir poco a poco.'},
    {value:'unsure',symbol:'💭',label:'No lo sé',reply:'También está bien. No necesitas definir lo que sientes para empezar.'},
  ],
    arrivalWarmTitle:'Puedes llegar tal como estás',
    arrivalWarmText:'Encuentra con la mirada un detalle agradable o neutro.',
    practiceText:'Prueba un gesto pequeño si te resulta cómodo.',
  stepLabel:'UN PASO AMABLE',tryAfter:'¿Cómo te fue?',
  tried:'Lo intenté',partly:'Un poquito',read:'Hoy solo leo',
  gentle:'Si te incomoda, mira un objeto neutro.',
  feelText:'Nota si algo cambió, aunque sea un poco.',
  feelingBetter:'Un poco mejor',feelingSame:'Más o menos igual',feelingPartial:'Un pequeño cambio',feelingHard:'Incómodo',
  quoteText:'¿Te resuena esta idea?',agree:'Me resuena',unsure:'Aún no sé',disagree:'No estoy de acuerdo',
  keepText:'Elige un recordatorio amable para hoy.',plan:'Recordar esta idea',noPlan:'Hoy sin plan',
  saved:'Tu momento se ha guardado',savedText:'Te diste un pequeño espacio.',
  attempted:'Has indicado que probaste la práctica',readOnly:'Solo exploraste la idea; no registraste un intento',
  takeaway:'Tu recordatorio',feedback:'Tu sensación',noResult:'Puedes terminar sin evaluarte.',
  noSave:'No se confirmó el guardado. Revisa la conexión e inténtalo otra vez.',
  incomplete:'Abre los momentos restantes antes de guardar.',
  safetyTitle:'Puedes parar aquí',
  safetyBody:'No tienes que seguir si te incomoda. Mira un objeto neutro y respira con naturalidad.',
  neutralAnchor:'Si quieres, mira un objeto neutro a tu alrededor.',
  neutralSafety:'Puedes parar; no necesitas cambiar tu respiración.',
  safetyNeutral:'Volver con una referencia neutra',safetyBack:'Volver',safetyEnd:'Salir sin guardar',
  learnMore:'Ver una pista suave',noMedical:'Aprendizaje personal, no diagnóstico ni tratamiento.',
  ideaTitle:'Una idea amable',reminderTitle:'Un recordatorio',feelTitle:'¿Cómo estás ahora?',
}
// The five original lesson-one opening screens stay separate, and precede action.
const OPENING={
  en:{
    welcome:'How are you feeling today?',welcomeLead:'What feels closest to you right now?',
    welcomeNote:'There is no right answer. You can simply continue.',
    baseline:'How much support do you feel?',baselineLead:'If you wish, choose a number for right now.',
    baselineLow:'0 · Not at all',baselineHigh:'10 · Very much',
    checkin:'How was the last day?',checkinLead:'How difficult has today’s concern felt in the past 24 hours?',
    checkinLow:'0 · Not difficult',checkinHigh:'10 · Very difficult',
    scaleNote:'Optional. This is your observation, not a test.',
    recall:'Remember what helps',recallLead:'What has helped you feel a little steadier before?',
    recallReply:'A familiar source of support can be enough for today.',
    ownSupportLabel:'Or write your own',ownSupportPlaceholder:'Your own answer (optional)',
    supportOptions:[['pause','A short pause'],['rest','A little rest'],['connection','Kind contact'],['orient','Looking around'],['unsure','Not sure yet']],
    thought:'A thought for today',thoughtLead:'How does this idea feel to you?',
    response:'Thank you. Your view is welcome; there is no correct answer.',
    welcomeKicker:'WELCOME · YOUR PACE',baselineKicker:'OPTIONAL · RIGHT NOW',
    checkinKicker:'OPTIONAL · PAST 24 HOURS',recallKicker:'A FAMILIAR RESOURCE',
    thoughtKicker:'A GENTLE THOUGHT',
  },
  ru:{
    welcome:'Как вы себя чувствуете сегодня?',welcomeLead:'Какое состояние вам сейчас ближе?',
    welcomeNote:'Правильного ответа нет. Можно просто продолжить.',
    baseline:'Сколько сейчас внутренней опоры?',baselineLead:'Если хотите, выберите число для этого момента.',
    baselineLow:'0 · Совсем нет',baselineHigh:'10 · Очень много',
    checkin:'Как прошли последние сутки?',checkinLead:'Насколько трудной была ваша тема за последние 24 часа?',
    checkinLow:'0 · Не беспокоила',checkinHigh:'10 · Очень сильно',
    scaleNote:'Это необязательное наблюдение, не тест.',
    recall:'Вспомним знакомую опору',recallLead:'Что раньше помогало вам почувствовать себя немного устойчивее?',
    recallReply:'Можно опереться на то, что вам уже знакомо.',
    ownSupportLabel:'Или напишите свой вариант',ownSupportPlaceholder:'Ваш вариант (необязательно)',
    supportOptions:[['pause','Короткая пауза'],['rest','Немного отдыха'],['connection','Тёплый контакт'],['orient','Осмотреться вокруг'],['unsure','Пока не знаю']],
    thought:'Мысль сегодняшнего дня',thoughtLead:'Как вам откликается эта мысль?',
    response:'Спасибо. Любое отношение подходит; правильного ответа нет.',
    welcomeKicker:'НАЧИНАЕМ · В ВАШЕМ ТЕМПЕ',baselineKicker:'ПО ЖЕЛАНИЮ · СЕЙЧАС',
    checkinKicker:'ПО ЖЕЛАНИЮ · ЗА СУТКИ',recallKicker:'ЗНАКОМАЯ ОПОРА',
    thoughtKicker:'МЯГКАЯ МЫСЛЬ',
  },
  es:{
    welcome:'¿Cómo te sientes hoy?',welcomeLead:'¿Qué sensación se acerca más a la tuya?',
    welcomeNote:'No hay respuesta correcta. Puedes continuar sin responder.',
    baseline:'¿Cuánto apoyo interior sientes?',baselineLead:'Si quieres, elige un número para este momento.',
    baselineLow:'0 · Nada',baselineHigh:'10 · Mucho',
    checkin:'¿Cómo fue el último día?',checkinLead:'¿Qué tan difícil ha sido esta preocupación en las últimas 24 horas?',
    checkinLow:'0 · Nada difícil',checkinHigh:'10 · Muy difícil',
    scaleNote:'Es una observación opcional, no un examen.',
    recall:'Recuerda lo que te ayuda',recallLead:'¿Qué te ha ayudado a sentirte un poco más estable?',
    recallReply:'Puedes apoyarte en algo que ya conoces.',
    ownSupportLabel:'O escribe tu opción',ownSupportPlaceholder:'Tu respuesta (opcional)',
    supportOptions:[['pause','Una pausa'],['rest','Descansar'],['connection','Contacto amable'],['orient','Mirar alrededor'],['unsure','Aún no lo sé']],
    thought:'Una idea para hoy',thoughtLead:'¿Qué te parece esta idea?',
    response:'Gracias. No hay una respuesta correcta.',
    welcomeKicker:'BIENVENIDA · A TU RITMO',baselineKicker:'OPCIONAL · AHORA',
    checkinKicker:'OPCIONAL · ÚLTIMAS 24 H',recallKicker:'UN RECURSO CONOCIDO',
    thoughtKicker:'UNA IDEA AMABLE',
  },
}

function OpeningRating({label,value,onChange,disabled,low,high}){
  return <>
    <div className={styles.ratingGrid} role="group" aria-label={label}>
      {Array.from({length:11},(_,number)=><button key={number} type="button"
        disabled={disabled} aria-pressed={value===number}
        onClick={()=>onChange(number)}>{number}</button>)}
    </div>
    <div className={styles.ratingBounds}><span>{low}</span><span>{high}</span></div>
  </>
}

export default function OporaExperiencePlayer({locale='en',data,busy=false,onClose,onFinish,onSession}){
  const lang=locale==='ru'?'ru':locale==='es'?'es':'en',t=WORDS[lang]
  const lesson=data?.lesson||{},cycle=data?.cycle||{},authored=lesson?.opora54||{}
  const hasSaved=Boolean(data?.currentSession)
  const scenes=cycle.day===1?OPORA_DAY_ONE_RESTORED_KEYS:OPORA_EXPERIENCE_PRE_SAVE_KEYS
  const [step,setStep]=useState(hasSaved?scenes.length:0)
  const [saved,setSaved]=useState(hasSaved)
  const [answers,setAnswers]=useState(data?.currentSession?.signals?.opora54?.answers||{})
  const [welcomeFeeling,setWelcomeFeeling]=useState(data?.currentSession?.signals?.welcomeFeeling||null)
  const [openingResource,setOpeningResource]=useState(data?.currentSession?.signals?.oporaOpening?.resource??null)
  const [openingDifficulty,setOpeningDifficulty]=useState(data?.currentSession?.signals?.oporaOpening?.lastDayDifficulty??null)
  const [familiarSupport,setFamiliarSupport]=useState(data?.currentSession?.signals?.oporaOpening?.familiarSupport||null)
  const [familiarSupportText,setFamiliarSupportText]=useState(data?.currentSession?.signals?.oporaOpening?.familiarSupportText||'')
  const [practiceReport,setPracticeReport]=useState(
    data?.currentSession?.signals?.practiceAttempt==='tried'?'tried':
    data?.currentSession?.signals?.practiceAttempt==='simplified'?'partly':null)
  const [showHelp,setShowHelp]=useState(false)
  const [neutralSupport,setNeutralSupport]=useState(false)
  const [safety,setSafety]=useState(false)
  const [error,setError]=useState('')
  const [saving,setSaving]=useState(false)
  const operation=useRef(null)
  const visited=useRef(new Set([scenes[0]]))
  const heading=useRef(null),safetyTrigger=useRef(null),safetyPrimary=useRef(null)
  const safetyBack=useRef(null),safetyEnd=useRef(null),wasPaused=useRef(false)
  const locked=Boolean(busy||saving),receipt=step>=scenes.length
  const moment=receipt?'receipt':scenes[step]
  const opening=OPENING[lang]
  const dayCopy=oporaExperienceDay(cycle.day,lang)
  const practiceGuide=oporaExperienceGuide(cycle.day,lang)||authored.screens?.find(screen=>screen.key==='act')?.text||t.practiceText
  const plan=dayCopy?.reminder||authored.exercises?.transfer?.choices?.[0]||lesson.workbook?.microPractice||''
  const originalQuote=(lang==='es'?dayCopy?.quote:null)||authored.quote||lesson.aphorism||''
  const quote=cycle.day===1&&lang!=='es'?dayOneAphorism(lang,cycle.activeGoal||cycle.primaryGoal,originalQuote):originalQuote
  const rating=answers.reflection
  const vote=answers.aphorism
  const chosenFeeling=t.moods.find(item=>item.value===welcomeFeeling)
  const chosenFeelingLabel=cycle.day===1
    ?welcomeFeelingChoices(cycle.activeGoal||cycle.primaryGoal,lang).find(item=>item.id===welcomeFeeling)?.label
    :chosenFeeling?.label
  const ratingText=rating==='useful'?t.feelingBetter:rating==='partly'?t.feelingPartial:
    rating==='unchanged'?t.feelingSame:rating==='uncomfortable'?t.feelingHard:''
  useEffect(()=>{
    if(!receipt)visited.current.add(scenes[step])
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
  function tryStatus(value){
    if(locked)return
    // Report the guide as an experience, NOT as having executed the
    // original AS-5.5 multiple-choice exercise. The old exercise answers
    // remain absent so neither the receipt nor analytics invents an action.
    setPracticeReport(value)
  }
  function returnWithNeutralAnchor(){
    // A safety return is separate from voluntarily opening the practice hint.
    setShowHelp(false)
    setNeutralSupport(true)
    setSafety(false)
  }
  function next(){
    if(locked)return
    setError('')
    setShowHelp(false)
    setStep(s=>Math.min(scenes.length-1,s+1))
  }
  function back(){
    if(locked)return
    setError('')
    setShowHelp(false)
    setStep(s=>Math.max(0,s-1))
  }
  function changeFeeling(value){
    if(locked)return
    setAnswers(a=>({...a,reflection:value}))
    if(value==='uncomfortable')setSafety(true)
  }
  async function submit(){
    if(locked||saved)return
    if(step!==scenes.length-1||
      scenes.some(key=>!visited.current.has(key))){
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
      const attempted=['tried','partly'].includes(practiceReport)
      const response=await onSession({
        day:cycle.day,lessonId:lesson.id,operationId:operation.current,
        feedback:rating==='uncomfortable'?'uncomfortable':rating==='unchanged'?'neutral':
          rating==='useful'||rating==='partly'?'helped':'skip',
        beforeNow:null,afterNow:null,practiceWindow:'practice_v6',
        aphorismResponse:safe.answers.aphorism||null,
        practiceAttempt:attempted?(practiceReport==='tried'?'tried':'simplified'):null,
        comfort:rating==='uncomfortable'?'uncomfortable':null,
        transferStage:safe.answers.transfer==='planned'?'plan':null,
        welcomeFeeling:welcomeFeeling||null,
        ...(cycle.day===1?{
          oporaOpening:{
            resource:openingResource,
            lastDayDifficulty:openingDifficulty,
            familiarSupport,
            ...(familiarSupport==='other'&&familiarSupportText.trim()
              ?{familiarSupportText:familiarSupportText.trim()}:{}),
          },
        }:{}),
        opora54:safe,visitedSlideKeys:[...scenes],
      })
      if(response){setSaved(true);setStep(scenes.length);operation.current=null}
      else setError(t.noSave)
    }catch{setError(t.noSave)}
    finally{setSaving(false)}
  }
  const title=receipt?t.saved:
    moment==='welcome'?opening.welcome:
    moment==='baseline'?opening.baseline:
    moment==='checkin'?opening.checkin:
    moment==='recall'?opening.recall:
    moment==='arrive'?(cycle.day===1?t.arrivalWarmTitle:t.arriveTitle):
    moment==='practice'?dayCopy?.title||t.learn:
    moment==='feel'?t.feelTitle:
    moment==='affirmation'?(cycle.day===1?opening.thought:t.ideaTitle):t.reminderTitle
  const reportedAttempt=['tried','partly'].includes(practiceReport)
  return <div className={styles.overlay} role="dialog" aria-modal="true"
    aria-label={t.day+' '+cycle.day+': '+lesson.title}
    data-opora-experience-first="as-5.6" data-opora-restored-opening={cycle.day===1?"five-first-slides":undefined}
    data-course-one-screen="v3" data-course-visual-theme={OPORA_EXPERIENCE_DESIGN_VERSION}>
    <div className={styles.frame+' '+(styles[moment]||styles.arrive)}
      inert={safety} aria-hidden={safety?'true':undefined}>
      <header className={styles.header}>
        <button type="button" className={styles.iconButton} onClick={onClose}
          disabled={locked} aria-label={t.close}><X size={21}/></button>
        <div className={styles.progress}>
          <div className={styles.progressCopy}><span>{t.day} {cycle.day}/14</span>
            <span>{Math.min(step+1,scenes.length+1)} / {scenes.length+1}</span></div>
          <div className={styles.track}><div className={styles.fill}
            style={{width:((step+1)/(scenes.length+1)*100)+'%'}}/></div>
        </div>
        <button type="button" className={styles.pause} ref={safetyTrigger}
          onClick={()=>setSafety(true)} disabled={locked}><Pause size={16}/>{t.pause}</button>
      </header>
      <main className={styles.stage}>
        {(moment==='welcome'||(moment==='arrive'&&cycle.day!==1))&&
          <div className={styles.arrivalPhoto} aria-hidden="true">
            <img src="/images/holistic-house/report-lighthouse-coast.webp" alt="" loading="eager"/>
          </div>}
        <section className={styles.panel+' '+(
          moment==='welcome'||(moment==='arrive'&&cycle.day!==1)?styles.arrivalPanel:''
        )} aria-live="off">
          {!receipt&&<span className={styles.eyebrow}>
            {moment==='welcome'?opening.welcomeKicker:
            moment==='baseline'?opening.baselineKicker:
            moment==='checkin'?opening.checkinKicker:
            moment==='recall'?opening.recallKicker:
            moment==='arrive'?t.minute:moment==='practice'?t.stepLabel:
            moment==='feel'?t.feel:moment==='affirmation'?(cycle.day===1?opening.thoughtKicker:t.quote):t.keep}
          </span>}
          <h2 ref={heading} tabIndex={-1} className={styles.title}>{title}</h2>
          {neutralSupport&&<div data-opora-neutral-anchor="true">
            <p className={styles.lead}>{t.neutralAnchor}</p>
            <p className={styles.soft}>{t.neutralSafety}</p>
          </div>}
          {moment==='welcome'&&<>
            <p className={styles.lead}>{opening.welcomeLead}</p>
            <div className={styles.moodChoices} role="group" aria-label={opening.welcome}
              data-opora-start-mood="true">
              {welcomeFeelingChoices(cycle.activeGoal||cycle.primaryGoal,lang).map(({id,label})=>
                <button key={id} type="button" disabled={locked}
                  data-symbol={t.moods.find(item=>item.value===id)?.symbol}
                  aria-pressed={welcomeFeeling===id} onClick={()=>setWelcomeFeeling(id)}>
                  <span>{label}</span>
                </button>)}
            </div>
            {welcomeFeeling
              ?<p className={styles.moodReply} role="status" aria-live="polite">{welcomeFeelingSupport(welcomeFeeling,lang)}</p>
              :<p className={styles.moodOptional}>{opening.welcomeNote}</p>}
          </>}
          {moment==='baseline'&&<>
            <p className={styles.lead}>{opening.baselineLead}</p>
            <OpeningRating label={opening.baseline} value={openingResource}
              onChange={setOpeningResource} disabled={locked}
              low={opening.baselineLow} high={opening.baselineHigh}/>
            <p className={styles.soft}>{opening.scaleNote}</p>
          </>}
          {moment==='checkin'&&<>
            <p className={styles.lead}>{opening.checkinLead}</p>
            <OpeningRating label={opening.checkin} value={openingDifficulty}
              onChange={setOpeningDifficulty} disabled={locked}
              low={opening.checkinLow} high={opening.checkinHigh}/>
            <p className={styles.soft}>{opening.scaleNote}</p>
          </>}
          {moment==='recall'&&<>
            <p className={styles.lead}>{opening.recallLead}</p>
            <div className={styles.chips} role="group" aria-label={opening.recall}>
              {opening.supportOptions.map(([value,label])=><button type="button" key={value}
                disabled={locked} aria-pressed={familiarSupport===value}
                onClick={()=>{setFamiliarSupport(value);setFamiliarSupportText('')}}>{label}</button>)}
            </div>
            <label className={styles.supportLabel} htmlFor="opora-own-resource">{opening.ownSupportLabel}</label>
            <input id="opora-own-resource" className={styles.supportInput}
              data-opora-own-resource="true" type="text" maxLength={160}
              disabled={locked} placeholder={opening.ownSupportPlaceholder}
              value={familiarSupportText} onChange={event=>{
                const value=event.target.value
                setFamiliarSupportText(value)
                setFamiliarSupport(value.trim()?'other':null)
              }}/>
            {familiarSupport&&familiarSupport!=='other'&&<p className={styles.soft} role="status">{opening.recallReply}</p>}
          </>}
          {moment==='arrive'&&!neutralSupport&&<>
            <p className={styles.lead}>{cycle.day===1?t.arrivalWarmText:t.arriveText}</p>
            {cycle.day!==1&&<>
              <div className={styles.moodChoices} role="group" aria-label={t.arriveTitle}
                data-opora-start-mood="true">
                {t.moods.map(item=><button key={item.value} type="button" disabled={locked}
                  data-symbol={item.symbol} aria-pressed={welcomeFeeling===item.value}
                  onClick={()=>setWelcomeFeeling(item.value)}><span>{item.label}</span></button>)}
              </div>
              {chosenFeeling
                ?<p className={styles.moodReply} role="status" aria-live="polite">{chosenFeeling.reply}</p>
                :<p className={styles.moodOptional}>{t.arriveSkip}</p>}
            </>}
          </>}
          {moment==='practice'&&<>
            {!neutralSupport&&<p className={styles.lead}>{practiceGuide}</p>}
            <p className={styles.miniLabel}>{t.tryAfter}</p>
            <div className={styles.chips} role="group" aria-label={t.tryAfter}>
              {[[t.tried,'tried'],[t.partly,'partly'],[t.read,'not_attempted']].map(([label,value])=>
                <button type="button" key={value} disabled={locked}
                  aria-pressed={practiceReport===value} onClick={()=>tryStatus(value)}>{label}</button>)}
            </div>
            <button type="button" className={styles.linkHint} disabled={locked}
              onClick={()=>setShowHelp(s=>!s)} aria-expanded={showHelp}>
              {t.learnMore}<ChevronDown size={16}/></button>
            {showHelp&&<p className={styles.soft} data-opora-optional-guidance="true">
              {lang==='es'?t.gentle:lesson.antiStress?.neutralText||t.gentle}</p>}
          </>}
          {moment==='feel'&&<>
            {!neutralSupport&&<p className={styles.lead}>{t.feelText}</p>}
            <div className={styles.chips+' '+styles.feeling} role="group" aria-label={t.feel}>
              {[[t.feelingBetter,'useful'],[t.feelingPartial,'partly'],
                [t.feelingSame,'unchanged'],[t.feelingHard,'uncomfortable']].map(([label,value])=>
                <button type="button" key={value} disabled={locked}
                  aria-pressed={rating===value} onClick={()=>changeFeeling(value)}>{label}</button>)}
            </div>
          </>}
          {moment==='affirmation'&&<>
            <blockquote className={styles.quotation}>{quote}</blockquote>
            <p className={styles.subtle}>{cycle.day===1?opening.thoughtLead:t.quoteText}</p>
            <div className={styles.chips} role="group" aria-label={t.quote}>
              {[[t.agree,'agree'],[t.unsure,'unsure'],[t.disagree,'disagree']].map(([label,value])=>
                <button type="button" key={value} disabled={locked}
                  aria-pressed={vote===value} onClick={()=>setAnswers(a=>({...a,aphorism:value}))}>{label}</button>)}
            </div>
            {vote&&cycle.day===1&&<p className={styles.soft} role="status">{opening.response}</p>}
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
            <div className={styles.receiptNote}>
              <ShieldCheck size={22}/><span>{reportedAttempt?t.attempted:t.readOnly}</span>
            </div>
            {chosenFeeling&&<p className={styles.soft}><strong>{t.startFeeling}:</strong> {chosenFeelingLabel}</p>}
            {answers.transfer==='planned'&&<p className={styles.soft}><strong>{t.takeaway}:</strong> {plan}</p>}
            {rating&&<p className={styles.soft}><strong>{t.feedback}:</strong> {ratingText}</p>}
            {!rating&&<p className={styles.soft}>{t.noResult}</p>}
          </>}
          {(moment==='welcome'||moment==='arrive'||receipt)&&<small className={styles.disclaimer}>{t.noMedical}</small>}
        </section>
      </main>
      {error&&<p className={styles.error} role="alert">{error}</p>}
      <footer className={styles.footer}>
        {!receipt&&step>0&&<button type="button" className={styles.back}
          onClick={back} disabled={locked}><ArrowLeft size={17}/>{t.back}</button>}
        <button type="button" className={styles.primary} disabled={locked}
          onClick={receipt?(onFinish||onClose):step===scenes.length-1?submit:next}>
          {receipt?t.finish:step===scenes.length-1?(saving?t.saving:t.save):t.next}
          {receipt||step===scenes.length-1?<CheckCircle2 size={18}/>:<ArrowRight size={18}/>}
        </button>
      </footer>
    </div>
    {safety&&<div className={styles.shade} role="alertdialog" aria-modal="true"
      aria-label={t.safetyTitle} onKeyDown={pauseKeys}>
      <div className={styles.safetyCard}>
        <ShieldCheck size={29}/><h3>{t.safetyTitle}</h3><p>{t.safetyBody}</p>
        <button type="button" ref={safetyPrimary}
          onClick={returnWithNeutralAnchor}>{t.safetyNeutral}</button>
        <button type="button" ref={safetyBack} onClick={()=>setSafety(false)}>{t.safetyBack}</button>
        <button type="button" ref={safetyEnd} className={styles.safetyExit}
          onClick={onClose}>{t.safetyEnd}</button>
      </div>
    </div>}
  </div>
}

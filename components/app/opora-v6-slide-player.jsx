'use client'

import {useEffect,useMemo,useRef,useState} from 'react'
import {
  ArrowLeft,ArrowRight,Check,CheckCircle2,ChevronDown,
  Lightbulb,Pause,ShieldCheck,X,
} from 'lucide-react'
import {buildCourseSlides} from '@/lib/inner-growth/course-slide-sequence'
import {OPORA54_PRE_SAVE_KEYS,validateOpora54Signals} from '@/lib/inner-growth/anti-stress-skills-v6'
import styles from './opora-v6-slide-player.module.css'

const DICTIONARY={
  ru:{
    day:'День',step:'Шаг',of:'из',back:'Назад',next:'Далее',save:'Сохранить практику',
    finish:'К карте курса',again:'Попробовать ещё',close:'Закончить',pause:'Пауза',
    aid:'Показать подсказку',hideHint:'Скрыть подсказку',tip:'Подсказка — это помощь, не оценка.',
    personal:'Ваш темп — подходящий. Можно остановиться в любой момент.',
    welcome:'Как вы сейчас?',rating:'Необязательная оценка',ratingLow:'0 · пока трудно',ratingHigh:'10 · достаточно доступно',
    noRating:'Отвечать числом необязательно — можно нажать «Далее».',
    easyTitle:'Насколько было доступно попробовать?',easeLow:'0 · пока трудно',easeHigh:'3 · достаточно доступно',
    comfort:'Какой вариант вам подходит?',realAttempt:'Что вам удалось попробовать?',rehearse:'Как прошла повторная попытка?',
    aphorism:'Как вам эта мысль?',example:'Как вам объяснение?',case:'Что выберете для героя?',intent:'Какой план подходит?',
    current:'Мой результат',source:'Самостоятельный образовательный антистресс-курс. Это не диагностика и не лечение травмы или ПТСР.',
    saving:'Сохраняем...',error:'Сохранение не подтверждено. Проверьте соединение и повторите.',
    saved:'Практика сохранена',reward:'Вы уделили время себе. XP начисляется за участие, не за изменения самочувствия.',
    outcomes:'Что сохранено',without:'Ответ не выбран — это не оценка и не попытка.',notCompleted:'Только ознакомление — без подтверждения самостоятельного выполнения.',
    safetyTitle:'Здесь можно остановиться',safetyBody:'Не нужно продолжать через дискомфорт. Оглядитесь и по желанию найдите один обычный предмет. Дыхание может оставаться естественным.',
    safetyReturn:'Вернуться к практике',safetyNeutral:'Продолжить с нейтральной опорой',safetyFinish:'Закончить без сохранения',
    hintHeader:'Можно сделать проще',nudge:'Ничего не требуется доказывать. Вы можете попробовать только часть действия.',
    review:'Проверьте, что хотите сохранить. Мы не ставим балл за самочувствие.',
    map:'7 навыков · две недели',advance:'Следующий навык откроется по правилам курса.',
    response:{
      steady:'В целом спокойно',tense:'Есть напряжение',low:'Мало сил',unsure:'Трудно сказать',
      standard:'Обычная версия',quick:'Очень коротко',read:'Только читаю',
      fits:'Это мне подходит',general:'Общий навык',clear:'Понятно',example:'Покажите пример',difficult:'Пока сложно',
      try:'Попробую',simple:'Проще',agree:'Откликается',disagree:'Не согласен(на)',
      tried:'Получилось',partly:'Частично',not_yet:'Пока нет',not_attempted:'Не пробовал(а)',uncomfortable:'Некомфортно',
      independent:'Самостоятельно',guided:'С подсказкой',
      planned:'Составил(а) план',imagined:'Мысленно представил(а)',not_planning:'Сегодня не планирую',
      useful:'Подошло',unchanged:'Без изменений',one:'Вариант 1',two:'Вариант 2',three:'Вариант 3',
    },
    feedback:{
      tried:'Вы попробовали действие. Если это подходит, можно сохранить такой вариант.',
      independent:'Вы сообщили о самостоятельной попытке. Не требуется идеального выполнения.',
      guided:'Подсказкой пользоваться нормально. Это часть обучения.',
      partly:'Частичная попытка тоже опыт. Можно оставить один маленький шаг или воспользоваться подсказкой.',
      not_yet:'Пока не получилось — это допустимо. Попробуйте простой пример или только прочитайте инструкцию.',
      not_attempted:'Сегодня вы познакомились с действием. Мы не будем отмечать его как выполненное.',
      uncomfortable:'Вы можете остановиться сразу. Никакое упражнение не нужно делать через дискомфорт.',
      unsure:'Сомневаться нормально. Не нужно принимать афоризм, чтобы попробовать действие.',
      disagree:'Спасибо за ваш ответ. Установку можно сформулировать нейтральнее:',
      agree:'Можно проверить эту мысль в небольшом упражнении, без обязательного результата.',
      example:'Покажем только один маленький шаг; его не обязательно повторять.',
      difficult:'Можно выбрать облегчённую версию или вернуться к примеру.',
      unchanged:'Отсутствие заметного изменения — допустимый результат.',
      other:'Это ваш выбор. Вы можете сохранить его или при желании изменить.',
    }
  },
  en:{
    day:'Day',step:'Step',of:'of',back:'Back',next:'Continue',save:'Save my practice',
    finish:'My course map',again:'Try again',close:'End lesson',pause:'Pause',
    aid:'Show a hint',hideHint:'Hide hint',tip:'A hint is help, not a score.',
    personal:'Your pace is welcome. You can stop at any time.',
    welcome:'How do you feel?',rating:'Optional self-rating',ratingLow:'0 · not yet available',ratingHigh:'10 · feels available',
    noRating:'A number is optional. You can simply continue.',
    easyTitle:'How accessible was this step?',easeLow:'0 · difficult right now',easeHigh:'3 · quite accessible',
    comfort:'What works for you?',realAttempt:'What did you actually try?',rehearse:'How did the repeat go?',
    aphorism:'How does this idea sound?',example:'Was this example clear?',case:'What might the character choose?',intent:'How might you use this?',
    current:'My result',source:'Self-guided stress education. Not a diagnosis or treatment for trauma or PTSD.',
    saving:'Saving...',error:'Saving was not confirmed. Check your connection and retry.',
    saved:'Practice saved',reward:'You made time for yourself. XP is for taking part, not for feeling better.',
    outcomes:'What was saved',without:'No response recorded. Viewing is not a practice attempt.',notCompleted:'Explored the skill, without a reported independent attempt.',
    safetyTitle:'You may stop here',safetyBody:'You do not need to push through discomfort. If you wish, look around for an ordinary object. You can breathe naturally.',
    safetyReturn:'Return to practice',safetyNeutral:'Continue with a neutral anchor',safetyFinish:'Finish without saving',
    hintHeader:'Try a smaller step',nudge:'Nothing needs to be proved. You may try only part of the action.',
    review:'Review what you want to save. We do not score your mental health.',
    map:'7 skills · two weeks',advance:'The next lesson will open according to the course schedule.',
    response:{
      steady:'Generally steady',tense:'Some tension',low:'Low energy',unsure:'Not sure',
      standard:'Usual version',quick:'Shorter version',read:'Read only',
      fits:'This feels relevant',general:'General skill',clear:'Clear',example:'Show an example',difficult:'Not clear yet',
      try:'I will try',simple:'Make it simpler',agree:'Resonates',disagree:'I disagree',
      tried:'I tried it',partly:'Partly',not_yet:'Not yet',not_attempted:'I did not try',uncomfortable:'Uncomfortable',
      independent:'On my own',guided:'With a hint',planned:'Made a plan',imagined:'Imagined it',not_planning:'Not planning today',
      useful:'Suited me',unchanged:'No change',one:'Option 1',two:'Option 2',three:'Option 3',
    },
    feedback:{
      tried:'You tried a step. You may keep it if it fits your needs.',
      independent:'You reported trying on your own. Perfect execution is not required.',
      guided:'Using a hint is a normal part of learning.',
      partly:'A partial attempt counts as an attempt. You can make the next step smaller.',
      not_yet:'Not yet is a fair answer. You may look at an example or read only.',
      not_attempted:'You explored the instruction. It will not be marked as performed.',
      uncomfortable:'You may stop immediately. There is no need to push through discomfort.',
      unsure:'It is fine to be unsure. You need not agree to try a small step.',
      disagree:'Thank you. You could use a more neutral idea:',
      agree:'You can explore this idea in a small exercise without any promise of change.',
      example:'Here is one small step; you do not have to repeat it yet.',
      difficult:'You can make the practice simpler or return to the example.',
      unchanged:'Not noticing a change is a valid outcome.',
      other:'This is your choice. You can keep or change it if you wish.',
    }
  }
}
// Context-sensitive coaching: the same enum (such as 'unsure') does not mean
// the same thing on an arrival check-in and an aphorism reflection.
const CONTEXT_FEEDBACK={
  ru:{
    welcome:{
      steady:'Вы отметили спокойный момент. Можно попробовать одну маленькую практику.',
      tense:'Вы заметили напряжение. Не нужно сейчас заставлять себя расслабляться.',
      low:'Если сил немного, доступен короткий формат или только чтение.',
      unsure:'Необязательно точно называть состояние, чтобы познакомиться с навыком.',
    },
    pace:{
      standard:'Оставим обычный темп; вы сможете уменьшить нагрузку в любой момент.',
      quick:'Вы выбрали короткий вариант. Маленький шаг тоже подходит для знакомства.',
      read:'Сегодня можно только читать. Мы не будем считать просмотр выполненным упражнением.',
    },
    focus:{
      fits:'Хорошо. Сегодня потренируем именно этот маленький навык.',
      general:'Общий учебный фокус подходит; дополнительные тесты не нужны.',
      unsure:'Не нужно выбирать идеальную цель. Можно двигаться с общим учебным примером.',
    },
    prepare:{
      try:'Начните с одного маленького шага и остановитесь, если будет неприятно.',
      simple:'Пойдём по самому простому варианту; подсказка остаётся доступной.',
      read:'Можно только наблюдать за примером, не выполняя упражнение.',
    },
    demo:{
      clear:'Теперь видно, как выглядит конкретное действие. Можно попробовать его мягко.',
      example:'Посмотрим на действие ещё раз, разделив его на один небольшой шаг.',
      difficult:'Если пока непонятно, воспользуйтесь подсказкой. Спешить не нужно.',
    },
    transfer:{
      planned:'Вы составили возможный план. Он не обязывает вас выполнять его сегодня.',
      imagined:'Мысленной репетиции достаточно для сегодняшнего учебного шага.',
      not_planning:'Планировать на сегодня необязательно. Можно сохранить только знакомство с навыком.',
    },
    reflection:{
      useful:'Вы отметили, что подход оказался пригодным. Это ваше наблюдение, не медицинская оценка.',
      partly:'Что-то подошло, а что-то нет. Следующую практику можно сделать проще.',
      unchanged:'Отсутствие изменения — допустимый результат. Практика не обязана менять самочувствие.',
      uncomfortable:'Спасибо, что заметили дискомфорт. Остановитесь; делать упражнение через силу не нужно.',
    },
  },
  en:{
    welcome:{
      steady:'You noticed a steady moment. A small step is enough for today.',
      tense:'You noticed some tension. You do not need to force yourself to relax.',
      low:'With less energy, the shorter or read-only mode is available.',
      unsure:'You do not need to name your state precisely to learn one small skill.',
    },
    pace:{
      standard:'We can use the usual pace. You can reduce the load at any point.',
      quick:'You chose a shorter practice. A small attempt is still meaningful.',
      read:'You can read only today. Reading will not be recorded as performing the exercise.',
    },
    focus:{
      fits:'This focus feels relevant. We can practise one small action.',
      general:'A general skill focus is enough. No additional test is needed.',
      unsure:'You need not choose a perfect goal. We can stay with a general example.',
    },
    prepare:{
      try:'Start with one small step and stop if it becomes uncomfortable.',
      simple:'We will use a simpler option; help remains available.',
      read:'You can observe the example without doing the exercise.',
    },
    demo:{
      clear:'You saw the action in a simple example. You may try it gently.',
      example:'Let us look at the action again, one small step at a time.',
      difficult:'You can use the hint if the example is unclear. There is no rush.',
    },
    transfer:{
      planned:'You made a possible plan, not an obligation to act today.',
      imagined:'A mental rehearsal can be enough for this learning step.',
      not_planning:'You do not have to make a plan today. An introduction can be saved.',
    },
    reflection:{
      useful:'You found this option suitable. This is your observation, not a clinical score.',
      partly:'Some parts suited you and some did not. You may make the next exercise simpler.',
      unchanged:'No change is a valid result. You are not required to feel better.',
      uncomfortable:'Thank you for noticing discomfort. You can stop rather than push through.',
    },
  },
}
const ROLE_OPTIONS={
  welcome:['steady','tense','low','unsure'],pace:['standard','quick','read'],
  focus:['fits','general','unsure'],aphorism:['agree','unsure','disagree'],
  demo:['clear','example','difficult'],prepare:['try','simple','read'],
  notice:['tried','partly','not_yet','not_attempted','uncomfortable'],
  act:['tried','partly','not_yet','not_attempted','uncomfortable'],
  rehearse:['independent','guided','partly','not_yet','not_attempted','uncomfortable'],
  scenario:['one','two','three'],transfer:['planned','imagined','not_planning'],
  reflection:['useful','partly','unchanged','uncomfortable'],
}
const HINT_KINDS=new Set(['demo','notice','act','rehearse','scenario'])
// Planning and choosing a shorter practice also deserve voluntary help, without altering saved hint enums.
const SUPPORT_KINDS=new Set([...HINT_KINDS,'prepare','transfer'])
const PRACTICE_KINDS=new Set(['notice','act','rehearse'])
// Reuse approved, locally hosted photographs. Every authored screen and the
// completion receipt has a photographic anchor; no network image service is used.
const OPORA_SCREEN_PHOTOS=Object.freeze([
  {src:'/images/holistic-house/course-focus-mountain-boy.webp',position:'center 45%'},
  {src:'/images/holistic-house/course-start-heron.webp',position:'center 48%'},
  {src:'/images/holistic-house/reiki-practitioner-sunrise.webp',position:'center 42%'},
])
// A personal learning receipt must be built ONLY from explicit answers.
// A chosen exercise is not an attempt; a future plan is not a completed action.
function oporaLearningReceipt(answers,authored,lang,ease){
  const ru=lang==='ru',rows=[]
  const choiceIndex=value=>['one','two','three'].indexOf(value)
  const actIndex=choiceIndex(answers.actChoice)
  const actLabel=actIndex>=0?authored?.exercises?.act?.choices?.[actIndex]:null
  if(typeof actLabel==='string'&&actLabel.trim())rows.push({
    key:'choice',label:ru?'Выбранное упражнение':'Exercise chosen',value:actLabel,
  })
  const status=answers.act||answers.notice||answers.rehearse
  const attemptText={
    tried:[ru?'Получилось':'Tried the step'],
    partly:[ru?'Частично получилось':'Partly tried'],
    not_yet:[ru?'Пока не получилось':'Not yet'],
    not_attempted:[ru?'Не пробовал(а)':'Did not try'],
    uncomfortable:[ru?'Было некомфортно — практика остановлена':'Uncomfortable — practice stopped'],
    guided:[ru?'Повторил(а) с подсказкой':'Repeated with a hint'],
    independent:[ru?'По собственному сообщению — самостоятельно':'Reported trying independently'],
  }
  if(status&&attemptText[status])rows.push({
    key:'attempt',label:ru?'Отчёт о попытке':'Reported attempt',value:attemptText[status][0],
  })
  if(ease!==null&&Number.isInteger(ease)&&ease>=0&&ease<=3&&['tried','partly'].includes(answers.act))
    rows.push({key:'ease',label:ru?'Насколько был доступен шаг':'How accessible the step felt',
      value:String(ease)+' / 3'+(ru?' · личная оценка':' · self-rating')})
  const planIndex=choiceIndex(answers.transferChoice)
  const planLabel=planIndex>=0?authored?.exercises?.transfer?.choices?.[planIndex]:null
  if(['planned','imagined'].includes(answers.transfer)&&typeof planLabel==='string'&&planLabel.trim())
    rows.push({key:'plan',label:answers.transfer==='imagined'
      ?(ru?'Мысленно представленный план':'Imagined plan')
      :(ru?'Возможный план на будущее':'Possible plan for later'),value:planLabel})
  else if(answers.transfer==='not_planning')
    rows.push({key:'no-plan',label:ru?'План':'Plan',
      value:ru?'Сегодня без плана — это допустимо':'No plan today — that is fine'})
  return rows
}
const versionTag='as-5.4-live-v6'

export default function OporaV6SlidePlayer({locale='en',data,busy=false,onClose,onFinish,onSession,habitSetupContent=null}){
  const lang=locale==='ru'?'ru':'en',t=DICTIONARY[lang],lesson=data?.lesson||{},cycle=data?.cycle||{}
  const authored=lesson.opora54
  const slides=useMemo(()=>buildCourseSlides(lesson),[lesson])
  const hasSaved=Boolean(data?.currentSession)
  const [saved,setSaved]=useState(hasSaved)
  const [habitSetup,setHabitSetup]=useState(false)
  const [step,setStep]=useState(hasSaved?OPORA54_PRE_SAVE_KEYS.length:0)
  const [answers,setAnswers]=useState(data?.currentSession?.signals?.opora54?.answers||{})
  const [hints,setHints]=useState(data?.currentSession?.signals?.opora54?.hints||[])
  const [ease,setEase]=useState(data?.currentSession?.signals?.opora54?.ease??null)
  const [beforeNow,setBeforeNow]=useState(data?.currentSession?.beforeNow??null)
  const [afterNow,setAfterNow]=useState(data?.currentSession?.afterNow??null)
  const [showHint,setShowHint]=useState(false)
  const [safety,setSafety]=useState(false)
  const [neutral,setNeutral]=useState(false)
  const [error,setError]=useState('')
  const [saving,setSaving]=useState(false)
  const saveOp=useRef(null),visited=useRef(new Set([OPORA54_PRE_SAVE_KEYS[0]]))
  const heading=useRef(null),scroller=useRef(null)
  const safetyTrigger=useRef(null),safetyFirstAction=useRef(null),safetyReturnAction=useRef(null),safetyExitAction=useRef(null),safetyWasOpened=useRef(false)
  const locked=Boolean(busy||saving),receipt=step>=slides.length
  const slide=receipt?null:slides[step]
  const role=slide?.kind
  const chosen=answers[role]||null
  const choiceField=role==='notice'?'noticeChoice':role==='act'?'actChoice':role==='transfer'?'transferChoice':null
  const activeActivity=choiceField?authored?.exercises?.[role]||null:null
  const picked=choiceField?answers[choiceField]||null:null
  const chosenActivityIndex=picked?['one','two','three'].indexOf(picked):-1
  const photo=OPORA_SCREEN_PHOTOS[(step+Math.max(0,Number(cycle.day||1)-1))%OPORA_SCREEN_PHOTOS.length]
  useEffect(()=>{
    if(slide?.key)visited.current.add(slide.key)
    scroller.current?.scrollTo?.({top:0,behavior:'instant'})
    heading.current?.focus()
    setShowHint(false)
  },[step,slide?.key])
  // A pause is an alternative to practice, never a scored answer. Keep
  // focus within the active alert dialog and restore it on return.
  useEffect(()=>{
    if(safety){safetyWasOpened.current=true;safetyFirstAction.current?.focus?.()}
    else if(safetyWasOpened.current)safetyTrigger.current?.focus?.()
  },[safety])
  function handleSafetyKeyDown(event){
    if(event.key==='Escape'){event.preventDefault();setSafety(false);return}
    if(event.key!=='Tab')return
    // Tab stays within the 3 safe actions; no invisible exercise buttons.
    const controls=[safetyFirstAction.current,safetyReturnAction.current,safetyExitAction.current].filter(Boolean)
    const focused=controls.indexOf(event.target)
    if(event.shiftKey&&focused<=0){event.preventDefault();controls[controls.length-1]?.focus?.()}
    else if(!event.shiftKey&&focused===controls.length-1){event.preventDefault();controls[0]?.focus?.()}
  }
  function back(){if(!locked){setError('');setStep(i=>Math.max(0,i-1))}}
  function next(){
    if(locked)return
    setError('')
    setStep(i=>Math.min(slides.length-1,i+1))
  }
  function selectActivity(value){
    if(locked||!choiceField||!['one','two','three'].includes(value))return
    setAnswers(a=>{
      if(a[choiceField]===value)return a
      const next={...a,[choiceField]:value}
      // A different exercise cannot inherit a claimed attempt on the old one.
      delete next[role]
      return next
    })
    if(role==='act')setEase(null)
  }
  function record(value){
    if(locked)return
    // Feedback is a separate voluntary report AFTER the learner chooses a
    // concrete micro-action. No visit or scenario click can forge practice.
    const noActionReport=role==='transfer'?value==='not_planning':
      ['not_yet','not_attempted','uncomfortable'].includes(value)
    if(choiceField&&!answers[choiceField]&&!noActionReport)return
    setAnswers(a=>({...a,[role]:value}))
    if(role==='act'&&!['tried','partly'].includes(value))setEase(null)
    if(role==='rehearse'&&value==='independent'&&hints.includes('rehearse'))setAnswers(a=>({...a,rehearse:'guided'}))
    if(value==='uncomfortable')setSafety(true)
  }
  function revealHint(){
    if(locked)return
    if(showHint){setShowHint(false);return}
    setShowHint(true)
    if(role&&HINT_KINDS.has(role))setHints(h=>h.includes(role)?h:[...h,role])
    if(role==='rehearse'&&answers.rehearse==='independent')setAnswers(a=>({...a,rehearse:'guided'}))
  }
  function neutralChoice(){setSafety(false);setNeutral(true);setShowHint(true)}
  async function submit(){
    if(locked||saved)return
    if(step!==slides.length-1||slides.some(s=>!visited.current.has(s.key))){
      setError(lang==='ru'?'Просмотрите оставшиеся шаги прежде чем сохранять.':'View the remaining steps before saving.')
      return
    }
    setSaving(true);setError('')
    try{
      if(!saveOp.current)saveOp.current=crypto.randomUUID()
      const safe=validateOpora54Signals({answers,hints,ease})
      const attempts=[answers.notice,answers.act,answers.rehearse]
      const attempted=attempts.some(a=>['tried','independent','guided'].includes(a))
        ?'tried':attempts.includes('partly')?'simplified':null
      const feedback=answers.reflection==='uncomfortable'?'uncomfortable'
        :answers.reflection==='useful'?'helped'
        :answers.reflection==='unchanged'?'neutral':'skip'
      const response=await onSession({
        day:cycle.day,lessonId:lesson.id,operationId:saveOp.current,
        feedback,beforeNow,afterNow,practiceWindow:'practice_v15',
        aphorismResponse:answers.aphorism||null,
        practiceAttempt:attempted,
        welcomeFeeling:answers.welcome||null,
        comfort:answers.reflection==='uncomfortable'?'uncomfortable'
          :answers.reflection==='useful'?'comfortable':null,
        transferStage:answers.transfer==='planned'?'plan'
          :answers.transfer==='imagined'?'imagined':null,
        opora54:safe,
        visitedSlideKeys:slides.map(s=>s.key),
      })
      if(response){setSaved(true);setStep(slides.length);saveOp.current=null}
      else setError(t.error)
    }catch{setError(t.error)}
    finally{setSaving(false)}
  }
  function options(){
    if(!role)return []
    // No learner must choose an action just to report not trying or discomfort.
    // A positive attempt remains impossible until a concrete action is chosen.
    if(choiceField&&!picked){
      const withoutAction=role==='transfer'?['not_planning']:
        ['not_yet','not_attempted','uncomfortable']
      return withoutAction.map(value=>({value,label:t.response[value]}))
    }
    if(role==='scenario')return authored?.scenario?.choices?.map((label,i)=>({value:['one','two','three'][i],label}))||[]
    // The aphorism is a reflection, not a correct/incorrect quiz.
    // Keep its three explicit positions distinct from the welcome 'unsure'.
    if(role==='aphorism')return lang==='ru'
      ? [{value:'agree',label:'Да, откликается'},{value:'unsure',label:'Пока сомневаюсь'},{value:'disagree',label:'Не согласен(на)'}]
      : [{value:'agree',label:'This resonates'},{value:'unsure',label:'Not sure yet'},{value:'disagree',label:'I disagree'}]
    if(role==='prepare'&&authored?.lessonMethodVersion==='AS-5.5')return lang==='ru'
      ?[{value:'try',label:'Мягко попробую в своей обстановке'},
        {value:'simple',label:'Только безопасный учебный пример'},
        {value:'read',label:'Только посмотрю или прочитаю'}]
      :[{value:'try',label:'Gently try in my own surroundings'},
        {value:'simple',label:'Use only a safe fictional example'},
        {value:'read',label:'Just watch or read'}]
    if(role==='focus')return (ROLE_OPTIONS[role]||[]).map(value=>({
      value,label:value==='unsure'?(lang==='ru'?'Пока не уверен(а)':'Not sure about this focus'):t.response[value]||value,
    }))
    return (ROLE_OPTIONS[role]||[]).map(value=>({value,label:t.response[value]||value}))
  }
  const optionsAvailable=options()
  const activityOptions=choiceField&&activeActivity
    ?(role==='notice'?activeActivity.a:activeActivity.choices)
      .map((label,i)=>({value:['one','two','three'][i],label}))
    :[]
  const choiceFeedback=choiceField&&chosenActivityIndex>=0
    ?role==='notice'?activeActivity?.f?.[chosenActivityIndex]
      :role==='transfer'?
        (lang==='ru'?'Вы выбрали возможный шаг на будущее — это не обязательство.':
          'You chose a possible future step. This is not a commitment.')
      :(lang==='ru'?'Вы выбрали один посильный вариант. Это ещё не означает, что упражнение выполнено.':
        'You chose a possible step. Choosing does not yet mean you performed it.')
    :null
  const extraFeedback=chosen
    ?role==='scenario'
      ? (authored?.scenario?.feedback?.[['one','two','three'].indexOf(chosen)]||
        (lang==='ru'?'Это один возможный выбор. ':'This is one possible choice. ')+(authored?.scenario?.explanation||t.feedback.other))
      :role==='aphorism'&&chosen==='disagree'
        ?t.feedback.disagree+' '+(authored?.neutralQuote||'')
        :role==='aphorism'?t.feedback[chosen]||t.feedback.other
        :CONTEXT_FEEDBACK[lang]?.[role]?.[chosen]||t.feedback[chosen]||t.feedback.other
    :choiceFeedback
  const showingReading=answers.pace==='read'||answers.prepare==='read'
  const guidanceText=role==='scenario'?authored?.scenario?.hint||authored?.scenario?.explanation
    :role==='transfer'?authored?.transferBackup||authored?.hints?.transfer
    :role==='aphorism'?authored?.neutralQuote
    :authored?.hints?.[role]||authored?.hint||lesson?.antiStress?.neutralText||t.nudge
  const receiptRows=oporaLearningReceipt(answers,authored,lang,ease)
  const afterSave=receipt&&saved
  return <div className={styles.overlay} role="dialog" aria-modal="true"
    aria-label={t.day+' '+cycle.day+': '+lesson.title}
    data-opora-as54-player={versionTag} data-course-one-screen="v2" data-course-photo-layout="v1">
    <div className={styles.frame} data-scene-role={afterSave?'complete':(role||'welcome')}
      inert={safety} aria-hidden={safety?'true':undefined}>
      <div className={styles.scenicBackdrop} aria-hidden="true" data-opora-lesson-photo>
        <img className={styles.scenicPhoto}
          src="/images/holistic-house/course-focus-mountain-boy.webp"
          alt="" width={705} height={411} decoding="async"/>
      </div>
      <header className={styles.header}>
        <button type="button" className={styles.controlIcon} onClick={onClose} disabled={locked}
          aria-label={t.close}><X size={21}/></button>
        <div className={styles.progressWrap}>
          <div className={styles.progressLabel}>
            <span>{t.day} {cycle.day}/14</span>
            <span>{t.step} {afterSave?15:step+1} {t.of} 15</span>
          </div>
          <div className={styles.track}><div className={styles.fill} style={{width:((afterSave?15:step+1)/15*100)+'%'}}/></div>
        </div>
        <button type="button" className={styles.safetyButton} ref={safetyTrigger} onClick={()=>setSafety(true)} disabled={locked}>
          <Pause size={16}/><span>{t.pause}</span>
        </button>
      </header>
      <main className={styles.scroll} ref={scroller} data-slide-kind={afterSave?'receipt':role}>
        <section className={styles.card} aria-live="off">
          <div className={styles.slideIntro}>
            <div className={styles.heroPhoto} data-opora-slide-photo data-photo-kind={afterSave?'receipt':role} aria-hidden="true">
              <img src={photo.src} alt="" width={705} height={411}
                style={{objectPosition:photo.position}} loading={step<2?'eager':'lazy'} decoding="async"/>
            </div>
            <div className={styles.introCopy}>
              <span className={styles.eyebrow}>{t.map} · {lesson.antiStress?.skillId}</span>
              <h2 className={styles.title} tabIndex={-1} ref={heading}>{afterSave?t.saved:slide?.title}</h2>
            </div>
          </div>
          {afterSave?<>
            <p className={styles.prompt}>{t.reward}</p>
            <section className={styles.result} data-opora-real-choice-summary>
              <strong>{t.outcomes}</strong>
              <p>{lang==='ru'?'Тема занятия: ':'Lesson focus: '}{lesson.antiStress?.skill||lesson.title}</p>
              {receiptRows.length?receiptRows.map(row=><div key={row.key} className={styles.receiptRow}>
                <span>{row.label}</span><p>{row.value}</p>
              </div>):<p>{t.notCompleted}</p>}
              <small>{lang==='ru'
                ?'Это ваш собственный отчёт об учебном опыте, не оценка здоровья и не доказательство освоения.'
                :'This is your own learning report, not a health rating or proof of skill mastery.'}</small>
            </section>
            {cycle.day===1&&<section className={styles.habitOffer} data-opora-first-lesson-habit-option>
              <button type="button" disabled={locked} aria-expanded={habitSetup}
                onClick={()=>setHabitSetup(value=>!value)}>
                {lang==='ru'?'ОПОРА на телефоне и пауза перед YouTube (по желанию)':
                  'OPORA on your phone & a pause before YouTube (optional)'}
                <ChevronDown size={17} aria-hidden="true"/>
              </button>
              {habitSetup&&(habitSetupContent||<p className={styles.helper}>
                {lang==='ru'?'Настроить можно на странице курса.':'Set it up from your course page.'}
              </p>)}
            </section>}
            <p className={styles.helper}>{t.advance}</p>
          </>:<>
            {role==='aphorism'
              ? <blockquote className={styles.aphorism}>{authored?.quote}</blockquote>
              : <p className={styles.prompt}>{neutral&&PRACTICE_KINDS.has(role)
                ? (lang==='ru'?'Можно попробовать только нейтральную внешнюю опору или просто прочитать инструкцию.':'You can use a neutral visible object, or read only.')
                :answers.prepare==='simple'&&PRACTICE_KINDS.has(role)
                  ?(lang==='ru'?'Можно остаться на вымышленном учебном примере. ':'You may stay with the fictional example. ')+(slide?.text||'')
                  :slide?.text}</p>}
            {role==='baseline'||role==='reflection'?
              <div className={styles.rating}>
                <span>{t.rating}</span>
                <div className={styles.ratingGrid} role="group" aria-label={t.rating}>
                  {Array.from({length:11},(_,i)=><button type="button" key={i} disabled={locked}
                    aria-pressed={(role==='baseline'?beforeNow:afterNow)===i}
                    onClick={()=>role==='baseline'?setBeforeNow(v=>v===i?null:i):setAfterNow(v=>v===i?null:i)}>{i}</button>)}
                </div>
                <div className={styles.ends}><span>{t.ratingLow}</span><span>{t.ratingHigh}</span></div>
                <small>{t.noRating}</small>
                {(role==='baseline'?beforeNow:afterNow)!==null&&
                  <small role="status">{lang==='ru'
                    ?'Отметка записана как ваше наблюдение. Она не определяет успешность упражнения.'
                    :'This is your own momentary observation, not a performance score.'}</small>}
              </div>:null}
            {role==='save'&&<section className={styles.result} data-opora-save-preview>
              <strong>{t.review}</strong>
              {/* The slide prompt above already contains the full instruction. */}
              {receiptRows.length?receiptRows.map(row=><div key={row.key} className={styles.receiptRow}>
                <span>{row.label}</span><p>{row.value}</p>
              </div>):<small>{t.notCompleted}</small>}
              <small>{answers.aphorism
                ?(lang==='ru'?'Мнение об афоризме сохраняется отдельно от попытки.':'Your opinion of the aphorism is separate from your practice attempt.')
                :t.without}</small>
            </section>}
            {activityOptions.length>0&&!picked&&<>
              <p className={styles.activityPrompt}>{role==='notice'?activeActivity.q
                :role==='transfer'?
                  (lang==='ru'?'Какую поддержку вам было бы удобно сохранить как возможный план?':
                    'Which support might you keep as a possible plan?')
                  :(lang==='ru'?'Какое небольшое действие выглядит посильным?':'Which small action seems workable?')}</p>
              <div className={styles.options} role="group"
                aria-label={lang==='ru'?'Выберите один конкретный шаг':'Choose one concrete step'}
                data-opora-as54-action-choice>
                {activityOptions.map(option=><button type="button" key={option.value}
                  disabled={locked} className={picked===option.value?styles.selected:''}
                  aria-pressed={picked===option.value} onClick={()=>selectActivity(option.value)}>
                  <span>{option.label}</span>
                  {picked===option.value?<CheckCircle2 size={19}/>:<ArrowRight size={15}/>}
                </button>)}
              </div>
            </>}
            {role!=='baseline'&&role!=='save'&&optionsAvailable.length>0&&
              <div className={[styles.options,optionsAvailable.length>=4?styles.choiceGrid:''].filter(Boolean).join(' ')} role="group" aria-label={choiceField&&!picked
                ?(role==='notice'?activeActivity?.q:slide?.text)
                :role==='aphorism'?t.aphorism:role==='scenario'?t.case:role==='demo'?t.example:PRACTICE_KINDS.has(role)?t.realAttempt:t.comfort}>
                {optionsAvailable.map(option=><button type="button" key={option.value} disabled={locked}
                  className={chosen===option.value?styles.selected:''}
                  aria-pressed={chosen===option.value} onClick={()=>record(option.value)}>
                  <span>{option.label}</span>{chosen===option.value?<CheckCircle2 size={19}/>:<ArrowRight size={15}/>}
                </button>)}
              </div>}
            {choiceField&&picked&&<div className={styles.activityChoice}>
              <span>{lang==='ru'?'Ваш учебный выбор':'Your learning choice'}: <strong>{
                role==='notice'?activeActivity?.a?.[chosenActivityIndex]
                  :activeActivity?.choices?.[chosenActivityIndex]
              }</strong></span>
              <button type="button" className={styles.changeChoice} disabled={locked}
                onClick={()=>{
                  setAnswers(a=>{
                    const next={...a};delete next[choiceField];delete next[role];return next
                  })
                  if(role==='act')setEase(null)
                }}>{lang==='ru'?'Изменить выбор':'Change choice'}</button>
              <small>{role==='transfer'
                ?(lang==='ru'?'Теперь отметьте: вы только представили план или хотите его сохранить?':
                  'Now choose whether you imagined this plan or want to keep it.')
                :(lang==='ru'?'А теперь отметьте, удалось ли попробовать действие.':
                  'Now report whether you actually tried the step.')}</small>
            </div>}
            {role==='transfer'&&picked&&authored?.transferBackup&&<p className={styles.gentle}>
              <ShieldCheck size={17} aria-hidden="true"/>{authored.transferBackup}
            </p>}
            {role==='act'&&picked&&['tried','partly'].includes(chosen)&&<div className={styles.ease}>
              <span>{t.easyTitle} <small>({lang==='ru'?'по желанию':'optional'})</small></span>
              <div className={styles.easeOptions} role="group" aria-label={t.easyTitle}>
                {[0,1,2,3].map(i=><button type="button" key={i} disabled={locked}
                  aria-pressed={ease===i} onClick={()=>setEase(i)}>{i}</button>)}
              </div>
              <div className={styles.ends}><small>{t.easeLow}</small><small>{t.easeHigh}</small></div>
            </div>}
            {extraFeedback&&<p className={styles.feedback} role="status">
              {['not_yet','not_attempted','uncomfortable','disagree','difficult'].includes(chosen)
                ?<Lightbulb size={17} aria-hidden="true"/>
                :<CheckCircle2 size={17} aria-hidden="true"/>}<span>{extraFeedback}</span></p>}
            {SUPPORT_KINDS.has(role)&&<div className={styles.hintBlock} data-gentle-guidance={role}>
              <div className={styles.animalHintRow}>
                <img className={styles.hintOwl} src="/images/holistic-house/gentle-owl.svg"
                  alt="" aria-hidden="true" width={42} height={42}/>
                <button type="button" className={styles.hintToggle} disabled={locked}
                  onClick={revealHint} aria-expanded={showHint}>
                  <Lightbulb size={16} aria-hidden="true"/>{showHint?t.hideHint:t.aid}
                  <ChevronDown size={16} aria-hidden="true"/>
                </button>
              </div>
              {showHint&&<p className={styles.hint}>{guidanceText||t.hintHeader} {t.nudge}</p>}
            </div>}
            {(PRACTICE_KINDS.has(role)||role==='prepare')&&<p className={styles.gentle}>
              <ShieldCheck size={17}/>{showingReading?(lang==='ru'?'Вы выбрали режим чтения: выполнение необязательно.':'Read-only mode: practice is optional.'):t.personal}
            </p>}
          </>}
          <p className={styles.disclaimer}>{t.source}</p>
        </section>
        {error&&<p role="alert" className={styles.error}>{error}</p>}
      </main>
      <footer className={styles.footer}>
        {!afterSave&&step>0&&<button type="button" className={styles.back} onClick={back} disabled={locked}>
          <ArrowLeft size={17}/>{t.back}</button>}
        <button type="button" className={styles.primary} onClick={afterSave?(onFinish||onClose):step===slides.length-1?submit:next}
          disabled={locked}>
          <span>{afterSave?t.finish:step===slides.length-1?(saving?t.saving:t.save):t.next}</span>
          {afterSave||step===slides.length-1?<CheckCircle2 size={19}/>:<ArrowRight size={19}/>}
        </button>
      </footer>
    </div>
    {safety&&<div className={styles.safetyShade} role="alertdialog" aria-modal="true" aria-label={t.safetyTitle}
      onKeyDown={handleSafetyKeyDown}>
      <div className={styles.safetyCard}>
        <ShieldCheck size={35} color="#008d9e"/>
        <h2>{t.safetyTitle}</h2><p>{t.safetyBody}</p>
        <button type="button" ref={safetyFirstAction} onClick={neutralChoice}>{t.safetyNeutral}</button>
        <button type="button" ref={safetyReturnAction} onClick={()=>setSafety(false)}>{t.safetyReturn}</button>
        <button type="button" ref={safetyExitAction} className={styles.exit} onClick={onClose}>{t.safetyFinish}</button>
      </div>
    </div>}
  </div>
}

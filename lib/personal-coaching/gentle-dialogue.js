// Shared, human-authored one-question coaching guidance. No inference or provider calls.
// Selection belongs at orientation; subsequent steps invite the client's own words.
const locales=['en','ru','es']
const guide={
  opening:{
    label:{en:'Set your direction',ru:'Определите направление',es:'Elige una dirección'},
    hint:{en:'A quick choice is fine here. You can always use your own words.',
      ru:'Здесь можно быстро выбрать вариант или ответить своими словами.',
      es:'Aquí puedes elegir una opción rápida o responder con tus palabras.'},
  },
  focus:{
    label:{en:'What really matters',ru:'Что действительно важно',es:'Lo que de verdad importa'},
    hint:{en:'Take your time. A few sincere sentences are more useful than a perfect answer.',
      ru:'Не торопитесь. Несколько искренних предложений важнее идеального ответа.',
      es:'Sin prisa. Unas frases sinceras valen más que una respuesta perfecta.'},
  },
  reality:{
    label:{en:'Notice what is happening',ru:'Бережно исследуйте ситуацию',es:'Observa lo que ocurre'},
    hint:{en:'Start with one real, recent example. There is no need to judge yourself.',
      ru:'Начните с одного недавнего примера. Не нужно оценивать или критиковать себя.',
      es:'Empieza con un ejemplo real y reciente, sin juzgarte.'},
  },
  obstacle:{
    label:{en:'Understand what makes it hard',ru:'Поймите, что затрудняет движение',es:'Comprende lo que cuesta'},
    hint:{en:'Name what gets in the way without blame. Uncertainty is also a valid answer.',
      ru:'Назовите то, что мешает, без обвинений. Неопределённость — тоже ответ.',
      es:'Nombra lo que dificulta el camino sin culpas. La duda también vale.'},
  },
  resources:{
    label:{en:'Find what already helps',ru:'Заметьте свои ресурсы',es:'Reconoce tus recursos'},
    hint:{en:'Remember anything that has helped, even a little. Small supports count.',
      ru:'Вспомните то, что хотя бы немного помогало. Маленькая опора тоже важна.',
      es:'Recuerda algo que te haya ayudado, aunque sea un poco.'},
  },
  options:{
    label:{en:'Explore without pressure',ru:'Исследуйте возможности без давления',es:'Explora sin presión'},
    hint:{en:'You are exploring, not promising to act. More than one path can remain open.',
      ru:'Сейчас вы исследуете, а не даёте обещание действовать. Возможны разные пути.',
      es:'Solo estás explorando, no prometiendo actuar. Puede haber varios caminos.'},
  },
  action:{
    label:{en:'Choose your own next step',ru:'Найдите свой следующий шаг',es:'Elige tu siguiente paso'},
    hint:{en:'A small, realistic and reversible step is enough. You decide whether to take it.',
      ru:'Достаточно маленького, посильного и обратимого шага. Решение остаётся за вами.',
      es:'Basta un paso pequeño, realista y reversible. Tú decides si darlo.'},
  },
  timing:{
    label:{en:'Give yourself room',ru:'Учитывайте свой темп',es:'Respeta tu ritmo'},
    hint:{en:'Consider your real schedule and energy. You can change the timing later.',
      ru:'Учитывайте своё время и силы. Срок можно будет изменить.',
      es:'Ten en cuenta tu tiempo y tu energía. Puedes cambiar la fecha.'},
  },
  review:{
    label:{en:'Notice what has changed',ru:'Заметьте, что стало яснее',es:'Observa qué ha cambiado'},
    hint:{en:'Notice even a small insight. It is okay if you are still unsure.',
      ru:'Отметьте даже небольшое прояснение. Ничего страшного, если ясность пока не пришла.',
      es:'Observa incluso un pequeño avance. Está bien si aún no lo tienes claro.'},
  },
}
const phases={
  goal:'focus',outcome:'focus',topic:'focus',frame:'focus',contract:'focus',
  define:'focus',wish:'focus',preferred:'focus',desire:'focus',dream:'options',
  current:'reality',reality:'reality',understand:'reality',listen:'reality',
  explore:'reality',scaling:'reality',scale:'reality',
  obstacle:'obstacle',barrier:'obstacle',
  resources:'resources',knowhow:'resources',exceptions:'resources',
  discover:'resources',affirm:'resources',
  options:'options',option:'options',alternatives:'options',design:'options',
  experiment:'options',destiny:'options',
  will:'action',action:'action',act:'action',plan:'action',step:'action',
  commitment:'action',when:'timing',
  review:'review',deliver:'review',finish:'action',
}
export function coachingQuickChoicesAllowed(question,index=0){
  return Boolean(question&&index===0&&question.type!=='scale_0_10'&&(
    (Array.isArray(question.choices)&&question.choices.length>0)||
    (Array.isArray(question.examples)&&question.examples.length>0)))
}
export function coachingGentleGuide(question,index=0,total=1,locale='en'){
  const lang=locales.includes(locale)?locale:'en'
  if(!question)return null
  const key=String(question.stepKey||question.stage||'').toLowerCase()
  // Author-sourced Egyptian/Greek stage keys are not model-stage labels.
  // Guide them by position without pretending to interpret a client's story.
  const progress=index/Math.max(1,total-1)
  const phase=index===0?'opening':phases[key]||(
    progress<.25?'focus':progress<.5?'reality':progress<.68?'resources':
    progress<.85?'options':'action')
  return {phase,label:guide[phase].label[lang],hint:guide[phase].hint[lang]}
}


// A conversation-shaped turn shared by guest, encrypted personal and symbolic
// coaching runners. This is editorial, deterministic reflection — not a
// generative model, a human reply, an assessment or a semantic interpretation.
// Only the already-visible preceding answer is read; nothing is persisted,
// fetched, logged, tracked or sent to a provider by this function.
const conversationCopy={
  en:{
    label:'A moment of reflection',
    opening:'We can take this at your pace. There is no perfect answer.',
    openingBridge:'Let’s start with the direction that feels most useful to explore today.',
    selected:'You chose:',written:'You put it this way:',rated:'Your own rating was:',
    unsure:'You do not have to know yet. Uncertainty is a valid place to begin.',
    skipped:'We can leave that question open and continue without pressure.',
    general:'Thank you for taking a moment with that.',
    safety:'This may need support beyond self-guided coaching. You can pause, and seek urgent local help if anyone is in immediate danger.',
    followup:'Before we move on, let’s stay with what you just shared for a moment.',
    phases:{
      opening:'We are finding a direction, not making a final decision.',
      focus:'I would like to understand what matters to you behind that choice.',
      reality:'Let’s bring this closer to something you have actually experienced.',
      obstacle:'We can look at what makes this difficult without judging yourself.',
      resources:'Now let’s notice what has already helped, even a little.',
      options:'No need to commit yet. We are exploring what could be possible.',
      action:'Only a step that feels realistic and belongs to you matters here.',
      timing:'Let’s respect the time and energy you actually have.',
      review:'Before finishing, let’s notice what feels clearer and what is still open.',
    },
  },
  ru:{
    label:'Небольшая пауза для осмысления',
    opening:'Давайте без спешки. Здесь не бывает идеального ответа.',
    openingBridge:'Сначала найдём направление, которое вам действительно хочется исследовать.',
    selected:'Вы выбрали:',written:'Вы выразили это так:',rated:'Вы оценили это для себя как:',
    unsure:'Необязательно знать ответ прямо сейчас. С неопределённости тоже можно начать.',
    skipped:'Мы можем оставить этот вопрос открытым и двигаться дальше без давления.',
    general:'Спасибо, что уделили этому немного внимания.',
    safety:'В такой ситуации может понадобиться поддержка за пределами самостоятельного коучинга. Можно остановиться и обратиться за срочной местной помощью, если есть непосредственная опасность.',
    followup:'Прежде чем идти дальше, давайте немного побудем с тем, что вы сейчас сказали.',
    phases:{
      opening:'Сейчас мы выбираем направление, а не принимаем окончательное решение.',
      focus:'Мне хочется чуть лучше понять, почему именно это для вас важно.',
      reality:'Давайте приблизимся к реальному эпизоду, а не оставаться в общих рассуждениях.',
      obstacle:'На трудности можно посмотреть без самокритики и обвинений.',
      resources:'А теперь попробуем заметить то, что уже хоть немного помогает.',
      options:'Пока не нужно ничего обещать. Мы только исследуем возможные пути.',
      action:'Здесь важен только тот небольшой шаг, который выберете вы сами.',
      timing:'Учтём ваше реальное время, силы и собственный темп.',
      review:'Перед завершением заметим, что прояснилось, а что пока остаётся открытым.',
    },
  },
  es:{
    label:'Un momento para reflexionar',
    opening:'Podemos ir a tu ritmo. No existe una respuesta perfecta.',
    openingBridge:'Empecemos por la dirección que más te gustaría explorar hoy.',
    selected:'Elegiste:',written:'Lo expresaste así:',rated:'Tu propia valoración fue:',
    unsure:'No necesitas saberlo todavía. La incertidumbre también es un buen punto de partida.',
    skipped:'Podemos dejar esa pregunta abierta y seguir sin presión.',
    general:'Gracias por dedicarle un momento a eso.',
    safety:'Esto podría requerir apoyo más allá del coaching autónomo. Puedes hacer una pausa y buscar ayuda local urgente si existe peligro inmediato.',
    followup:'Antes de avanzar, quedémonos un instante con lo que acabas de compartir.',
    phases:{
      opening:'Estamos eligiendo una dirección, no tomando una decisión definitiva.',
      focus:'Me gustaría comprender mejor qué es importante para ti detrás de esa elección.',
      reality:'Acerquémonos a un momento real que hayas vivido.',
      obstacle:'Podemos mirar las dificultades sin culparte.',
      resources:'Ahora reconozcamos algo que ya te haya ayudado, aunque sea un poco.',
      options:'Todavía no necesitas comprometerte. Solo estamos explorando posibilidades.',
      action:'Lo importante es un paso pequeño, realista y elegido por ti.',
      timing:'Respetemos tu tiempo, tu energía y tu ritmo.',
      review:'Antes de terminar, veamos qué se aclaró y qué sigue abierto.',
    },
  },
}
const uncertainChoice=/^(?:unsure|uncertain|not_sure|not_yet|unknown|dont_know|pause|not_sure_yet)$/i
const criticalWords=/(?:\bsuicid\w*|\bself[- ]harm\b|\bkill myself\b|самоубийств|суицид|покончить с собой|quiero morir|hacerme da[nñ]o)/iu
function shortClientWords(value){
  if(typeof value!=='string')return ''
  const words=value.replace(/https?:\/\/\S+|\b\S+@\S+\.\S+\b|\+?\d[\d ()-]{8,}\d/gu,'…')
    .replace(/[\u0000-\u001f\u007f]/gu,' ').replace(/\s+/gu,' ').trim()
  if(words.length<=96)return words
  const clipped=words.slice(0,96).replace(/\s+\S*$/u,'').trim()
  return (clipped||words.slice(0,96))+'…'
}
function priorCoachingReply(question,answer,reflection,lang){
  const reflected=typeof reflection==='string'&&reflection.trim()?reflection:null
  const raw=reflected||answer
  if(raw===null||raw===undefined||raw==='')return {kind:'skipped',quote:''}
  if(typeof raw==='string'){
    if(criticalWords.test(raw))return {kind:'safety',quote:''}
    if(raw.startsWith('choice:')){
      const id=raw.slice(7)
      if(uncertainChoice.test(id))return {kind:'unsure',quote:''}
      const label=question?.choices?.find(option=>option.id===id)?.label?.[lang]||
        question?.choices?.find(option=>option.id===id)?.label?.en
      const scale=question?.type==='scale_0_10'&&/^(?:10|[0-9])$/.test(id)
      return {kind:scale?'rated':'selected',quote:scale?id+'/10':shortClientWords(label||'')}
    }
    return {kind:'written',quote:shortClientWords(raw)}
  }
  if(typeof raw==='object'&&!Array.isArray(raw)){
    if(typeof raw.note==='string'&&raw.note.trim()){
      if(criticalWords.test(raw.note))return {kind:'safety',quote:''}
      return {kind:'written',quote:shortClientWords(raw.note)}
    }
    const id=typeof raw.choiceId==='string'?raw.choiceId:''
    if(uncertainChoice.test(id))return {kind:'unsure',quote:''}
    const label=question?.choices?.find(option=>option.id===id)?.label?.[lang]||
      question?.choices?.find(option=>option.id===id)?.label?.en
    return {kind:id?'selected':'skipped',quote:shortClientWords(label||'')}
  }
  return {kind:'skipped',quote:''}
}

export function coachingConversationTurn({
  question,previousQuestion=null,previousAnswer=null,previousReflection=null,
  index=0,total=1,locale='en',followup=false,
}={}){
  if(!question)return null
  const lang=locales.includes(locale)?locale:'en'
  const copy=conversationCopy[lang]
  const phase=coachingGentleGuide(question,index,total,lang)?.phase||'focus'
  if(index===0&&!followup){
    return {label:copy.label,response:copy.opening,quote:'',
      bridge:copy.openingBridge,speech:copy.opening+' '+copy.openingBridge}
  }
  const prior=priorCoachingReply(previousQuestion,previousAnswer,previousReflection,lang)
  const response=prior.kind==='selected'||prior.kind==='written'||prior.kind==='rated'
    ?(prior.quote?copy[prior.kind]:copy.general)
    :copy[prior.kind]||copy.general
  const quote=prior.quote
  const bridge=prior.kind==='safety'?'':followup?copy.followup:copy.phases[phase]
  return {label:copy.label,response,quote,bridge,
    speech:[response,quote,bridge].filter(Boolean).join(' ')}
}

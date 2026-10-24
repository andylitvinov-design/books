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

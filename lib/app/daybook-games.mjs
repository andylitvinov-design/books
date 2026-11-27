// Shared tap-first practice schema: one prompt per screen, fourth action then explicit review.
const RAW=[
 [
  "⚖️",
  "Колесо жизни|Life balance|Equilibrio vital",
  [
   [
    "scale",
    "Тело и энергия|Body and energy|Cuerpo y energía"
   ],
   [
    "scale",
    "Работа и деньги|Work and money|Trabajo y dinero"
   ],
   [
    "scale",
    "Отношения|Relationships|Relaciones"
   ],
   [
    "scale",
    "Смысл и развитие|Meaning and growth|Sentido y crecimiento"
   ]
  ]
 ],
 [
  "🎭",
  "Мой внутренний мир|My inner world|Mi mundo interior",
  [
   [
    "pick",
    "Что я сейчас чувствую?|How do I feel now?|¿Cómo me siento ahora?",
    "Спокойствие|Calm|Calma",
    "Радость|Joy|Alegría",
    "Тревога|Worry|Inquietud",
    "Усталость|Tiredness|Cansancio"
   ],
   [
    "pick",
    "Где я замечаю ощущение?|Where do I notice a sensation?|¿Dónde noto una sensación?",
    "Голова|Head|Cabeza",
    "Грудь|Chest|Pecho",
    "Живот|Abdomen|Abdomen",
    "Не замечаю|None noticed|No noto"
   ],
   [
    "pick",
    "Что сейчас занимает внимание?|What occupies my attention?|¿Qué ocupa mi atención?",
    "Дела|Tasks|Tareas",
    "Люди|People|Personas",
    "Будущее|Future|Futuro",
    "Отдых|Rest|Descanso"
   ],
   [
    "pick",
    "Что мне поможет прямо сейчас?|What would help right now?|¿Qué me ayudaría ahora?",
    "Пауза|A pause|Una pausa",
    "Разговор|A conversation|Una charla",
    "Движение|Movement|Movimiento",
    "Ясность|Clarity|Claridad"
   ]
  ]
 ],
 [
  "🧩",
  "Мои потребности|My needs|Mis necesidades",
  [
   [
    "multi",
    "Выберите до трёх важных потребностей|Choose up to three needs|Elige hasta tres necesidades",
    "Опора|Support|Apoyo",
    "Свобода|Freedom|Libertad",
    "Близость|Connection|Conexión",
    "Отдых|Rest|Descanso",
    "Ясность|Clarity|Claridad",
    "Развитие|Growth|Crecimiento"
   ],
   [
    "pick",
    "В какой сфере нужна забота?|Which area needs care?|¿Qué área necesita cuidado?",
    "Тело|Body|Cuerpo",
    "Работа|Work|Trabajo",
    "Отношения|Relationships|Relaciones",
    "Смысл|Meaning|Sentido"
   ],
   [
    "pick",
    "Что уже получается?|What is already working?|¿Qué ya funciona?",
    "Замечать|Noticing|Observar",
    "Просить помощь|Asking for help|Pedir ayuda",
    "Действовать|Taking action|Actuar",
    "Останавливаться|Taking breaks|Hacer pausas"
   ],
   [
    "pick",
    "Выберите маленький шаг сегодня|Pick a small step today|Elige un pequeño paso hoy",
    "Отдохнуть 5 минут|Rest for 5 minutes|Descansar 5 minutos",
    "Поговорить с близким|Talk to someone trusted|Hablar con alguien de confianza",
    "Пройтись|Take a walk|Dar un paseo",
    "Выбрать один приоритет|Choose one priority|Elegir una prioridad"
   ]
  ]
 ],
 [
  "🔋",
  "Заряд батареи|Energy battery|Batería de energía",
  [
   [
    "scale",
    "Сколько сейчас энергии?|How much energy do I have?|¿Cuánta energía tengo?"
   ],
   [
    "multi",
    "Что забирает силы?|What drains energy?|¿Qué agota mi energía?",
    "Спешка|Rushing|Prisa",
    "Много дел|Many tasks|Muchas tareas",
    "Конфликты|Conflict|Conflictos",
    "Недосып|Lack of sleep|Poco sueño"
   ],
   [
    "multi",
    "Что помогает восстановиться?|What restores energy?|¿Qué restaura mi energía?",
    "Отдых|Rest|Descanso",
    "Природа|Nature|Naturaleza",
    "Общение|Connection|Conexión",
    "Творчество|Creativity|Creatividad"
   ],
   [
    "pick",
    "Что я могу уменьшить сегодня?|What can I reduce today?|¿Qué puedo reducir hoy?",
    "Одну задачу|One task|Una tarea",
    "Спешку|Rushing|La prisa",
    "Экранное время|Screen time|Tiempo de pantalla",
    "Пока ничего|Nothing for now|Nada por ahora"
   ]
  ]
 ],
 [
  "🌱",
  "Коллекция ресурсов|Resource collection|Colección de recursos",
  [
   [
    "multi",
    "Соберите до трёх ресурсов|Collect up to three resources|Reúne hasta tres recursos",
    "Музыка|Music|Música",
    "Прогулка|Walk|Paseo",
    "Сон|Sleep|Sueño",
    "Чтение|Reading|Lectura",
    "Общение|Connection|Conexión",
    "Творчество|Creativity|Creatividad"
   ],
   [
    "pick",
    "На кого или что можно опереться?|Who or what can I rely on?|¿En quién o qué puedo apoyarme?",
    "Друг|Friend|Amistad",
    "Близкий человек|Loved one|Persona cercana",
    "Специалист|Professional|Profesional",
    "Мой опыт|My experience|Mi experiencia"
   ],
   [
    "pick",
    "Вспомните успех: что помогло?|Recall a success: what helped?|Recuerda un logro: ¿qué ayudó?",
    "Терпение|Patience|Paciencia",
    "Настойчивость|Persistence|Perseverancia",
    "Помощь|Help|Ayuda",
    "Гибкость|Flexibility|Flexibilidad"
   ],
   [
    "pick",
    "Используйте ресурс 30 секунд сейчас|Use a resource for 30 seconds now|Usa un recurso durante 30 segundos",
    "Выполнил(а)|I did it|Lo hice",
    "Попробую позже|I will try later|Lo intentaré después"
   ]
  ]
 ],
 [
  "🪷",
  "Минута спокойствия|A moment of calm|Un momento de calma",
  [
   [
    "scale",
    "Оцените комфорт сейчас|Rate your comfort now|Valora tu comodidad ahora"
   ],
   [
    "pick",
    "Почувствуйте опору под ногами или спиной|Notice support under your feet or back|Nota el apoyo bajo tus pies o espalda",
    "Заметил(а) опору|I noticed support|Noté el apoyo",
    "Пропустить|Skip|Omitir"
   ],
   [
    "pick",
    "Посмотрите вокруг. Дышите естественно, без усилий, около минуты. Остановитесь при дискомфорте.|Look around. Breathe naturally, without effort, for about a minute. Stop if uncomfortable.|Mira alrededor. Respira naturalmente, sin esfuerzo, durante un minuto. Para si te incomoda.",
    "Завершил(а)|Finished|Terminé",
    "Остановился(ась)|Stopped|Me detuve",
    "Пропустить|Skip|Omitir"
   ],
   [
    "scale",
    "Оцените комфорт после упражнения|Rate comfort after the exercise|Valora tu comodidad después"
   ]
  ]
 ],
 [
  "🧭",
  "Моё направление|My direction|Mi rumbo",
  [
   [
    "pick",
    "Какую сферу хочу изменить?|Which area do I want to change?|¿Qué área quiero cambiar?",
    "Здоровье|Health|Salud",
    "Деньги|Money|Dinero",
    "Отношения|Relationships|Relaciones",
    "Работа|Work|Trabajo",
    "Самореализация|Self-realization|Realización personal"
   ],
   [
    "pick",
    "Какое качество хочу развить?|What quality do I want to develop?|¿Qué cualidad quiero desarrollar?",
    "Опора|Support|Apoyo",
    "Свобода|Freedom|Libertad",
    "Ясность|Clarity|Claridad",
    "Сила|Strength|Fuerza",
    "Другое|Other|Otra"
   ],
   [
    "scale",
    "Где я сейчас?|Where am I now?|¿Dónde estoy ahora?"
   ],
   [
    "scale",
    "Куда хочу прийти?|Where do I want to be?|¿Adónde quiero llegar?"
   ]
  ]
 ],
 [
  "🎯",
  "Конструктор цели|Goal builder|Constructor de metas",
  [
   [
    "pick",
    "Что я хочу получить?|What do I want to achieve?|¿Qué quiero lograr?",
    "Больше устойчивости|More stability|Más estabilidad",
    "Больше возможностей|More opportunities|Más oportunidades",
    "Лучший баланс|Better balance|Mejor equilibrio",
    "Ясный план|A clear plan|Un plan claro"
   ],
   [
    "pick",
    "Когда проверю результат?|When will I review progress?|¿Cuándo revisaré el progreso?",
    "Через неделю|In one week|En una semana",
    "Через месяц|In one month|En un mes",
    "Через три месяца|In three months|En tres meses"
   ],
   [
    "pick",
    "Как замечу изменение?|How will I notice progress?|¿Cómo notaré el progreso?",
    "Новое действие|A new action|Una acción nueva",
    "Новая привычка|A new habit|Un hábito nuevo",
    "Конкретный показатель|A measurable result|Un indicador concreto",
    "Самооценка|Self-rating|Autoevaluación"
   ],
   [
    "pick",
    "Что зависит от меня?|What is within my control?|¿Qué depende de mí?",
    "Мои действия|My actions|Mis acciones",
    "Моё время|My time|Mi tiempo",
    "Мои решения|My decisions|Mis decisiones",
    "Запрос помощи|Asking for help|Pedir ayuda"
   ]
  ]
 ],
 [
  "🚀",
  "Мой первый квест|My first quest|Mi primera misión",
  [
   [
    "pick",
    "Выберите первый шаг|Choose your first step|Elige tu primer paso",
    "Найти одну возможность|Find one opportunity|Encontrar una oportunidad",
    "Сделать дело за 5 минут|Do a 5-minute task|Hacer una tarea de 5 minutos",
    "Связаться с человеком|Contact someone|Contactar a alguien"
   ],
   [
    "pick",
    "Когда сделаете?|When will you do it?|¿Cuándo lo harás?",
    "Сегодня|Today|Hoy",
    "Завтра утром|Tomorrow morning|Mañana por la mañana",
    "Завтра вечером|Tomorrow evening|Mañana por la tarde"
   ],
   [
    "pick",
    "Если что-то помешает?|If something gets in the way?|¿Si aparece un obstáculo?",
    "Уменьшу шаг|Make the step smaller|Reduciré el paso",
    "Попрошу помощь|Ask for help|Pediré ayuda",
    "Перенесу осознанно|Reschedule intentionally|Reprogramaré con intención"
   ],
   [
    "pick",
    "Что я могу сделать уже сейчас?|What can I do right now?|¿Qué puedo hacer ya?",
    "Открыть календарь|Open my calendar|Abrir mi calendario",
    "Подготовить нужное|Prepare what I need|Preparar lo necesario",
    "Начать первый шаг|Start the first step|Empezar el primer paso"
   ]
  ]
 ]
]
// Optional action instructions do not change the saved-answer schema or past completion.
const ACTION_CUES=[
 [
  0,
  "Вспомните последние семь дней, а не идеальную жизнь. После четырёх оценок выберите мысленно одну сферу, которой хотите уделить внимание.|Think of the last seven days, not an ideal life. After four ratings, mentally choose one area to give attention to.|Piensa en los últimos siete días, no en una vida ideal. Tras las cuatro valoraciones, elige mentalmente un área a la que prestar atención."
 ],
 [
  1,
  "На 10 секунд остановитесь и, если комфортно, обратите внимание на тело. Не нужно менять ощущение; можно ничего не замечать.|Pause for 10 seconds and, if comfortable, notice your body. You do not need to change anything; noticing nothing is fine.|Haz una pausa de 10 segundos y, si te resulta cómodo, observa tu cuerpo. No hace falta cambiar nada; está bien no notar nada."
 ],
 [
  3,
  "Попробуйте сделать выбранное действие прямо сейчас, если оно доступно и безопасно. Иначе выберите намерение на сегодня; это не отметка выполнения.|Try the chosen action now if it is available and safe. Otherwise choose an intention for today; this is not a completion record.|Prueba la acción ahora si está disponible y es segura. Si no, elige una intención para hoy; esto no registra su realización."
 ],
 [
  3,
  "На минуту представьте, как освободить немного времени или сил: уберите одно необязательное дело из сегодняшнего плана, если можете.|Take a moment to free a little time or energy: remove one optional task from today's plan if you can.|Dedica un momento a liberar algo de tiempo o energía: retira una tarea opcional del plan de hoy si puedes."
 ],
 [
  3,
  "Возьмите один доступный ресурс из вашей коллекции и попробуйте его в безопасной форме: послушайте музыку, посмотрите в окно или вспомните поддержку. Можно отложить.|Choose one available resource and try it safely: listen to music, look outside or recall support. You can defer.|Elige un recurso disponible y pruébalo de forma segura: escucha música, mira por la ventana o recuerda un apoyo. Puedes posponerlo."
 ],
 [
  2,
  "Оставьте глаза открытыми, если так удобнее. Не задерживайте дыхание и не старайтесь достичь определённого состояния. Можно остановиться или пропустить.|Keep your eyes open if easier. Do not hold your breath or try to reach a particular state. You can stop or skip.|Mantén los ojos abiertos si te resulta más fácil. No retengas la respiración ni busques un estado determinado. Puedes parar u omitir."
 ],
 [
  1,
  "Представьте обычный день, когда выбранное качество немного сильнее. Что вы делали бы иначе? Можно пока не выбирать направление.|Imagine an ordinary day when the chosen quality is a little stronger. What would you do differently? It is fine not to choose a direction yet.|Imagina un día normal con un poco más de esa cualidad. ¿Qué harías de otra forma? Puedes dejar el rumbo sin decidir."
 ],
 [
  2,
  "Сформулируйте про себя один конкретный признак: что, сколько или как часто изменится к выбранному сроку. Если пока не знаете, не придумывайте показатель. После практик уточните цель в конструкторе.|Mentally name one concrete sign: what, how much or how often will change by the chosen date. If unsure, do not invent a measure. Refine the goal in the builder after the practices.|Formula mentalmente una señal concreta: qué, cuánto o con qué frecuencia cambiará antes de la fecha elegida. Si no lo sabes, no inventes una medida. Ajusta la meta en el constructor al terminar."
 ],
 [
  3,
  "Если готовы, сделайте выбранный безопасный микрошаг сейчас. Если нет, оставьте его как план. Выбор карточки сам по себе не подтверждает выполнение.|If ready, take the chosen safe micro-step now. Otherwise keep it as a plan. Selecting a card does not prove you did it.|Si estás preparado, da ahora el micropaso seguro elegido. Si no, déjalo como plan. Elegir una tarjeta no demuestra que lo hayas hecho."
 ]
]
const EXTRA_CHOICES={
 "6:0": "Пока уточняю|Still exploring|Todavía exploro",
 "7:0": "Пока уточняю|Still exploring|Todavía exploro",
 "7:1": "Пока уточняю|Still exploring|Todavía exploro",
 "7:2": "Пока уточняю|Still exploring|Todavía exploro",
 "7:3": "Пока уточняю|Still exploring|Todavía exploro",
 "8:0": "Пока не готов(а)|Not ready yet|Aún no estoy listo/a",
 "8:1": "Пока не готов(а)|Not ready yet|Aún no estoy listo/a",
 "8:2": "Пока не готов(а)|Not ready yet|Aún no estoy listo/a",
 "8:3": "Пока не готов(а)|Not ready yet|Aún no estoy listo/a"
}
export const GAME_COUNT=3
const langIndex=l=>l==='ru'?0:l==='es'?2:1
export function daybookGames(locale,day){
 if(!Number.isInteger(day)||day<1||day>3)throw Error('INVALID_GAME_DAY')
 const l=langIndex(locale), tr=v=>v.split('|')[l]
 return RAW.slice((day-1)*3,day*3).map(([icon,title,steps],i)=>({id:i+1,icon,title:tr(title),steps:steps.map(([kind,prompt,...options],stepIndex)=>{const index=(day-1)*3+i,cue=ACTION_CUES[index],extra=EXTRA_CHOICES[index+':'+stepIndex];return {kind,prompt:tr(prompt),options:(extra?[...options,extra]:options).map(tr),...(cue[0]===stepIndex?{actionCue:tr(cue[1])}:{})}})}))
}
export function gameTag(day,id){
 if(![1,2,3].includes(day)||![1,2,3].includes(id))throw Error('INVALID_GAME')
 return 'clarity-game-v1-'+day+'-'+id
}
export function gameNotes(entries,day,id){
 const tag=gameTag(day,id)
 return (Array.isArray(entries)?entries:[]).filter(e=>e?.kind==='note'&&e.goalId===null&&Number.isSafeInteger(e.revision)&&e.revision>0&&typeof e.id==='string'&&e.id.length>0&&Array.isArray(e.tags)&&e.tags.includes(tag)&&e.tags.filter(t=>typeof t==='string'&&t.startsWith('clarity-game-v1-')).length===1&&typeof e.text==='string'&&e.text.trim().length>0)
}
export function gameProgress(entries,day){
 const done=[1,2,3].filter(id=>gameNotes(entries,day,id).length===1).length
 return {done,total:3,complete:done===3}
}
export function validGameAnswer(step,value){
 if(step.kind==='scale')return Number.isInteger(value)&&value>=0&&value<=10
 if(step.kind==='pick')return Number.isInteger(value)&&value>=0&&value<step.options.length
 return step.kind==='multi'&&Array.isArray(value)&&value.length>0&&value.length<=3&&new Set(value).size===value.length&&value.every(v=>Number.isInteger(v)&&v>=0&&v<step.options.length)
}
export function gameResult(game,answers){
 if(!game.steps.every((s,i)=>validGameAnswer(s,answers[i])))throw Error('INCOMPLETE_GAME')
 return [game.title,...game.steps.map((s,i)=>s.prompt+' — '+(s.kind==='scale'?answers[i]+'/10':s.kind==='multi'?answers[i].map(v=>s.options[v]).join(', '):s.options[answers[i]]))].join('\n')
}

export function decodeSavedGame(note,day,id){
 try{
  const game=daybookGames(note.locale,day)[id-1],lines=note.text.split('\n'),a={}
  if(lines.length!==game.steps.length+1||lines[0]!==game.title)return null
  for(const [i,s] of game.steps.entries()){
   const prefix=s.prompt+' — ';if(!lines[i+1].startsWith(prefix))return null
   const value=lines[i+1].slice(prefix.length)
   a[i]=s.kind==='scale'?Number(value.replace(/\/10$/,'')):s.kind==='multi'?value.split(', ').map(v=>s.options.indexOf(v)):s.options.indexOf(value)
   if(!validGameAnswer(s,a[i]))return null
  }
  return gameResult(game,a)===note.text?a:null
 }catch{return null}
}

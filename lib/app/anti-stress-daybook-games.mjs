// Independent self-guided practices; no AI session, entitlement, diagnosis or XP.
const RAW=[
 [
  "🪴",
  "Здесь и сейчас|Here and now|Aquí y ahora",
  [
   [
    "scale",
    "Напряжение сейчас (0–10)|Tension now (0–10)|Tensión ahora (0–10)"
   ],
   [
    "pick",
    "Какой ориентир удобнее?|Which anchor is comfortable?|¿Qué ancla te resulta cómoda?",
    [
     "Нейтральный предмет|Neutral object|Objeto neutro",
     "Звук вокруг|Ambient sound|Sonido del entorno",
     "Стул или пол|Chair or floor|Silla o suelo",
     "Пока не знаю / пропускаю|Not sure / skip|No sé / omito"
    ]
   ],
   [
    "pick",
    "Как прошла короткая проба?|How did the short practice go?|¿Cómo fue la práctica breve?",
    [
     "Попробовал(а)|Tried it|Lo probé",
     "Изменил(а) под себя|Adapted it|Lo adapté",
     "Остановился(ась)|Stopped|Me detuve",
     "Пропускаю|Skipping|Lo omito"
    ],
    30,
    "Если хочется, найдите три обычных предмета вокруг или один знакомый ориентир. Дышите как обычно. Можно остановиться или не начинать.|If you wish, notice three ordinary objects or one familiar anchor around you. Breathe naturally. Stop or skip anytime.|Si quieres, observa tres objetos cotidianos o un ancla familiar. Respira con naturalidad. Puedes parar u omitir."
   ],
   [
    "scale",
    "Напряжение после (0–10)|Tension afterward (0–10)|Tensión después (0–10)"
   ]
  ]
 ],
 [
  "🌿",
  "Мой ресурсный образ|My resource image|Mi imagen de apoyo",
  [
   [
    "pick",
    "Какую опору хочется заметить?|What kind of support would you like to notice?|¿Qué apoyo te gustaría notar?",
    [
     "Собственный образ|My own image|Mi propia imagen",
     "Слово или звук|Word or sound|Palabra o sonido",
     "Реальный предмет или место|Real object or place|Objeto o lugar real",
     "Пока не знаю / пропускаю|Not sure / skip|No sé / omito"
    ]
   ],
   [
    "text",
    "Что именно поддерживает меня? (свои слова, необязательно)|What supports me? (your own words, optional)|¿Qué me apoya? (tus palabras, opcional)"
   ],
   [
    "pick",
    "Что я сделал(а)?|What did I do?|¿Qué hice?",
    [
     "Попробовал(а)|Tried it|Lo probé",
     "Изменил(а) под себя|Adapted it|Lo adapté",
     "Остановился(ась)|Stopped|Me detuve",
     "Пропускаю|Skipping|Lo omito"
    ],
    45,
    "Если есть собственный комфортный образ или реальная опора, ненадолго обратите на неё внимание. Не придумывайте образ, не ищите воспоминаний. Можно оставить глаза открытыми, смотреть вокруг или пропустить.|If you have a comfortable image of your own or a real anchor, notice it briefly. Do not invent an image or search memories. Eyes may stay open; look around or skip.|Si tienes una imagen propia agradable o un apoyo real, obsérvalo brevemente. No inventes imágenes ni busques recuerdos. Puedes dejar los ojos abiertos, mirar alrededor u omitir."
   ],
   [
    "pick",
    "Какой был отклик?|What was the response?|¿Cuál fue la respuesta?",
    [
     "Комфортно|Comfortable|Cómodo",
     "Нейтрально|Neutral|Neutro",
     "Некомфортно|Uncomfortable|Incómodo",
     "Не пробовал(а)|Not tried|No lo probé"
    ]
   ]
  ]
 ],
 [
  "🧸",
  "Моя карточка опоры|My support card|Mi tarjeta de apoyo",
  [
   [
    "text",
    "Моя опора или слово, которое я хочу сохранить (необязательно)|My anchor or word to keep (optional)|Mi ancla o palabra para guardar (opcional)"
   ],
   [
    "pick",
    "Что мне сейчас подходит?|What feels suitable now?|¿Qué me conviene ahora?",
    [
     "Тихая пауза|Quiet pause|Pausa tranquila",
     "Посмотреть вокруг|Look around|Mirar alrededor",
     "Обратиться за поддержкой|Ask for support|Pedir apoyo",
     "Пока не знаю / пропускаю|Not sure / skip|No sé / omito"
    ]
   ],
   [
    "pick",
    "Когда я могу это попробовать?|When could I try it?|¿Cuándo podría probarlo?",
    [
     "После пробуждения|After waking|Al despertar",
     "Перед делами|Before tasks|Antes de las tareas",
     "При первых признаках напряжения|At early signs of tension|Ante las primeras señales de tensión",
     "Пока не знаю / пропускаю|Not sure / skip|No sé / omito"
    ]
   ],
   [
    "text",
    "Моя собственная поддерживающая фраза (необязательно)|My own supportive phrase (optional)|Mi propia frase de apoyo (opcional)"
   ]
  ]
 ],
 [
  "🚦",
  "Мой сигнал паузы|My pause signal|Mi señal de pausa",
  [
   [
    "pick",
    "Как я замечаю перегрузку?|How do I notice strain?|¿Cómo noto la sobrecarga?",
    [
     "Спешка|Rushing|Prisa",
     "Мысли скачут|Racing thoughts|Pensamientos acelerados",
     "Телесное напряжение|Physical tension|Tensión corporal",
     "Пока не знаю / пропускаю|Not sure / skip|No sé / omito"
    ]
   ],
   [
    "pick",
    "Что я могу сделать при этом?|What could I do then?|¿Qué podría hacer entonces?",
    [
     "Уменьшить нагрузку|Reduce the load|Reducir la carga",
     "Сменить обстановку|Change surroundings|Cambiar de entorno",
     "Попросить время|Ask for time|Pedir tiempo",
     "Пока не знаю / пропускаю|Not sure / skip|No sé / omito"
    ]
   ],
   [
    "pick",
    "Получилось сделать маленькую паузу?|Did you try a small pause?|¿Probaste una pausa breve?",
    [
     "Попробовал(а)|Tried it|Lo probé",
     "Изменил(а) под себя|Adapted it|Lo adapté",
     "Остановился(ась)|Stopped|Me detuve",
     "Пропускаю|Skipping|Lo omito"
    ],
    20,
    "Если удобно, отложите одно действие на несколько секунд и посмотрите вокруг. Ничего не нужно исправлять.|If comfortable, set one action aside for a few seconds and look around. Nothing needs fixing.|Si te resulta cómodo, deja una tarea unos segundos y mira alrededor. No hay nada que corregir."
   ],
   [
    "pick",
    "Что я хочу сделать дальше?|What do I want to do next?|¿Qué quiero hacer después?",
    [
     "Продолжить медленнее|Continue more slowly|Continuar más despacio",
     "Отдохнуть|Rest|Descansar",
     "Обратиться за поддержкой|Ask for support|Pedir apoyo",
     "Пока не знаю / пропускаю|Not sure / skip|No sé / omito"
    ]
   ]
  ]
 ],
 [
  "🌊",
  "Минута спокойствия|A minute of calm|Un minuto de calma",
  [
   [
    "scale",
    "Напряжение сейчас (0–10)|Tension now (0–10)|Tensión ahora (0–10)"
   ],
   [
    "pick",
    "Какой вариант я выбираю?|Which option do I choose?|¿Qué opción elijo?",
    [
     "Внешний ориентир|External anchor|Ancla externa",
     "Естественное дыхание без контроля|Natural unforced breathing|Respiración natural sin control",
     "Просто отдых|Just rest|Solo descanso",
     "Пока не знаю / пропускаю|Not sure / skip|No sé / omito"
    ]
   ],
   [
    "pick",
    "Как прошла минута?|How did the minute go?|¿Cómo fue el minuto?",
    [
     "Попробовал(а)|Tried it|Lo probé",
     "Изменил(а) под себя|Adapted it|Lo adapté",
     "Остановился(ась)|Stopped|Me detuve",
     "Пропускаю|Skipping|Lo omito"
    ],
    60,
    "Если комфортно, побудьте с выбранной опорой. Не углубляйте и не задерживайте дыхание. При неприятных ощущениях остановитесь, посмотрите вокруг или отдохните.|If comfortable, stay with your chosen anchor. Do not deepen or hold your breath. If uncomfortable, stop, look around or rest.|Si te resulta cómodo, mantén la atención en el ancla elegida. No profundices ni retengas la respiración. Si hay malestar, para, mira alrededor o descansa."
   ],
   [
    "scale",
    "Напряжение после (0–10)|Tension afterward (0–10)|Tensión después (0–10)"
   ]
  ]
 ],
 [
  "🛟",
  "Мой план спокойствия|My calm plan|Mi plan de calma",
  [
   [
    "pick",
    "Когда мне нужна пауза?|When do I need a pause?|¿Cuándo necesito una pausa?",
    [
     "Перед сложным разговором|Before a difficult conversation|Antes de una conversación difícil",
     "При спешке|When rushing|Cuando tengo prisa",
     "После нагрузки|After effort|Después de un esfuerzo",
     "Пока не знаю / пропускаю|Not sure / skip|No sé / omito"
    ]
   ],
   [
    "pick",
    "Мой первый шаг|My first step|Mi primer paso",
    [
     "Посмотреть на нейтральный предмет|Look at a neutral object|Mirar un objeto neutro",
     "Уменьшить задачу|Make the task smaller|Reducir la tarea",
     "Ненадолго отойти|Step away briefly|Apartarme un momento",
     "Пока не знаю / пропускаю|Not sure / skip|No sé / omito"
    ]
   ],
   [
    "pick",
    "Если это не помогает…|If this does not help…|Si esto no ayuda…",
    [
     "Остановиться и отдохнуть|Stop and rest|Parar y descansar",
     "Попросить поддержку|Ask for support|Pedir apoyo",
     "Сменить способ|Try a different approach|Cambiar de método",
     "Пока не знаю / пропускаю|Not sure / skip|No sé / omito"
    ]
   ],
   [
    "text",
    "Моя короткая фраза для паузы или границы (необязательно)|My short pause or boundary phrase (optional)|Mi frase breve para pausar o poner un límite (opcional)"
   ]
  ]
 ],
 [
  "☀️",
  "Мои источники энергии|My energy sources|Mis fuentes de energía",
  [
   [
    "pick",
    "Чего мне сейчас не хватает?|What do I need now?|¿Qué necesito ahora?",
    [
     "Отдыха|Rest|Descanso",
     "Тишины|Quiet|Silencio",
     "Контакта|Connection|Conexión",
     "Свободного времени|Free time|Tiempo libre",
     "Пока не знаю / пропускаю|Not sure / skip|No sé / omito"
    ]
   ],
   [
    "pick",
    "Что реально доступно сегодня?|What is actually available today?|¿Qué está disponible hoy?",
    [
     "Пауза без экрана|Screen-free break|Pausa sin pantalla",
     "Удобное движение|Comfortable movement|Movimiento cómodo",
     "Безопасный контакт|Trusted contact|Contacto de confianza",
     "Пока не знаю / пропускаю|Not sure / skip|No sé / omito"
    ]
   ],
   [
    "pick",
    "Попробовал(а) ли я этот ресурс?|Did I try this resource?|¿Probé este recurso?",
    [
     "Попробовал(а)|Tried it|Lo probé",
     "Изменил(а) под себя|Adapted it|Lo adapté",
     "Остановился(ась)|Stopped|Me detuve",
     "Пропускаю|Skipping|Lo omito"
    ],
    30,
    "Если ресурс доступен и безопасен, сделайте один маленький шаг к нему. Можно оставить только намерение.|If the resource is available and safe, take one small step toward it. An intention is enough.|Si el recurso está disponible y es seguro, da un pequeño paso. Basta con la intención."
   ],
   [
    "pick",
    "Как это ощущается?|How does this feel?|¿Cómo se siente?",
    [
     "Поддерживает|Supportive|Me apoya",
     "Нейтрально|Neutral|Neutro",
     "Не подходит|Not suitable|No me conviene",
     "Не пробовал(а)|Not tried|No lo probé"
    ]
   ]
  ]
 ],
 [
  "🍃",
  "Сделать немного меньше|Do a little less|Hacer un poco menos",
  [
   [
    "pick",
    "Что я могу упростить сегодня?|What can I simplify today?|¿Qué puedo simplificar hoy?",
    [
     "Одно необязательное дело|One optional task|Una tarea opcional",
     "Темп работы|Pace of work|Ritmo de trabajo",
     "Ожидание от себя|Expectation of myself|Expectativa personal",
     "Пока не знаю / пропускаю|Not sure / skip|No sé / omito"
    ]
   ],
   [
    "pick",
    "Как именно?|How exactly?|¿Cómo exactamente?",
    [
     "Отложить|Postpone|Posponer",
     "Разделить на части|Split into parts|Dividir en partes",
     "Попросить помощь|Ask for help|Pedir ayuda",
     "Пока не знаю / пропускаю|Not sure / skip|No sé / omito"
    ]
   ],
   [
    "pick",
    "Удалось ли сделать микрошаг?|Did I take a micro-step?|¿Di un pequeño paso?",
    [
     "Попробовал(а)|Tried it|Lo probé",
     "Изменил(а) под себя|Adapted it|Lo adapté",
     "Остановился(ась)|Stopped|Me detuve",
     "Пропускаю|Skipping|Lo omito"
    ],
    30,
    "Если безопасно, уберите одно необязательное действие или обозначьте границу. Не откладывайте срочные или важные для безопасности дела.|If safe, remove one optional action or set a boundary. Do not postpone urgent or safety-critical tasks.|Si es seguro, elimina una tarea opcional o marca un límite. No pospongas asuntos urgentes o esenciales para la seguridad."
   ],
   [
    "pick",
    "Что получилось?|What happened?|¿Qué pasó?",
    [
     "Стало немного легче|A little easier|Algo más fácil",
     "Без изменений|No change|Sin cambios",
     "Не подошло|Did not suit me|No me sirvió",
     "Не пробовал(а)|Not tried|No lo probé"
    ]
   ]
  ]
 ],
 [
  "📅",
  "Мой план на семь дней|My seven-day plan|Mi plan de siete días",
  [
   [
    "pick",
    "Что я хочу повторять?|What would I like to repeat?|¿Qué me gustaría repetir?",
    [
     "Ориентация в комнате|Orienting to the room|Orientarme en la habitación",
     "Своя опора|My own anchor|Mi propio apoyo",
     "Маленькая пауза|A short pause|Una pausa breve",
     "Время на восстановление|Recovery time|Tiempo de recuperación",
     "Пока не знаю / пропускаю|Not sure / skip|No sé / omito"
    ]
   ],
   [
    "pick",
    "Когда мне удобно?|When is convenient?|¿Cuándo me conviene?",
    [
     "Утром|Morning|Por la mañana",
     "Днём|Afternoon|Por la tarde",
     "Вечером|Evening|Por la noche",
     "Пока не знаю / пропускаю|Not sure / skip|No sé / omito"
    ]
   ],
   [
    "pick",
    "Какой ритм реалистичен?|What pace is realistic?|¿Qué ritmo es realista?",
    [
     "Один раз попробовать|Try once|Probar una vez",
     "В несколько удобных дней|On a few convenient days|En algunos días convenientes",
     "Ежедневно, если подходит|Daily if suitable|A diario si me conviene",
     "Пока не знаю / пропускаю|Not sure / skip|No sé / omito"
    ]
   ],
   [
    "pick",
    "Если пропущу или почувствую дискомфорт…|If I miss a day or feel uncomfortable…|Si falto un día o siento malestar…",
    [
     "Отдохну и вернусь по желанию|Rest and return if I want|Descansar y volver si quiero",
     "Выберу более лёгкий вариант|Choose an easier option|Elegir una opción más fácil",
     "Попрошу поддержку|Ask for support|Pedir apoyo",
     "Пока не знаю / пропускаю|Not sure / skip|No sé / omito"
    ]
   ]
  ]
 ]
]
const ix=locale=>locale==='ru'?0:locale==='es'?2:1
const tr=(v,l)=>v.split('|')[ix(l)]
export const antiStressDays=locale=>['Моя опора|My Ground|Mi apoyo','Моё спокойствие|My Calm|Mi calma','Мой ресурс|My Resource|Mi recurso'].map(v=>tr(v,locale))
export const skipLabel=locale=>tr('Пропущено|Skipped|Omitido',locale)
export function daybookGames(locale,day){
 if(![1,2,3].includes(day))throw Error('INVALID_GAME_DAY')
 return RAW.slice((day-1)*3,day*3).map(([icon,title,steps],i)=>({id:i+1,icon,title:tr(title,locale),locale,steps:steps.map(([kind,prompt,options=[],seconds=0,cue])=>({kind,prompt:tr(prompt,locale),options:options.map(v=>tr(v,locale)),seconds,...(cue?{actionCue:tr(cue,locale)}:{})}))}))
}
export function gameTag(day,id){
 if(![1,2,3].includes(day)||![1,2,3].includes(id))throw Error('INVALID_GAME')
 return 'anti-stress-practice-v1-'+day+'-'+id
}
export function gameNotes(entries,day,id){
 const tag=gameTag(day,id)
 return (Array.isArray(entries)?entries:[]).filter(e=>e?.kind==='note'&&e.goalId===null&&Number.isSafeInteger(e.revision)&&e.revision>0&&typeof e.id==='string'&&e.id.length>0&&Array.isArray(e.tags)&&e.tags.includes(tag)&&e.tags.filter(t=>typeof t==='string'&&t.startsWith('anti-stress-practice-v1-')).length===1&&typeof e.text==='string'&&e.text.trim().length>0)
}
export function validGameAnswer(step,value){
 if(step.kind==='scale')return value===-1||(Number.isInteger(value)&&value>=0&&value<=10)
 if(step.kind==='text')return typeof value==='string'&&value.length<=140&&!/[\r\n]/.test(value)&&value===value.trim()
 return step.kind==='pick'&&Number.isInteger(value)&&value>=0&&value<step.options.length
}
const answerText=(game,s,v)=>s.kind==='scale'?(v===-1?skipLabel(game.locale):v+'/10'):s.kind==='text'?(v?JSON.stringify(v):skipLabel(game.locale)):s.options[v]
export function gameResult(game,answers){
 if(!game.steps.every((s,i)=>validGameAnswer(s,answers[i])))throw Error('INCOMPLETE_GAME')
 return [game.title,...game.steps.map((s,i)=>s.prompt+' — '+answerText(game,s,answers[i]))].join('\n')
}
export function decodeSavedGame(note,day,id){
 try{
  const game=daybookGames(note.locale,day)[id-1],lines=note.text.split('\n'),a={}
  if(lines.length!==game.steps.length+1||lines[0]!==game.title)return null
  for(const [i,s] of game.steps.entries()){
   const prefix=s.prompt+' — ';if(!lines[i+1].startsWith(prefix))return null
   const v=lines[i+1].slice(prefix.length),skipped=v===skipLabel(game.locale)
   a[i]=s.kind==='scale'?(skipped?-1:Number(v.replace(/\/10$/,''))):s.kind==='text'?(skipped?'':JSON.parse(v)):s.options.indexOf(v)
   if(!validGameAnswer(s,a[i]))return null
  }
  return gameResult(game,a)===note.text?a:null
 }catch{return null}
}
export function gameProgress(entries,day){
 const done=[1,2,3].filter(id=>{const notes=gameNotes(entries,day,id);return notes.length===1&&decodeSavedGame(notes[0],day,id)!==null}).length
 return {done,total:3,complete:done===3}
}

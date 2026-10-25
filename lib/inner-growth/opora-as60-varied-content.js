// Versioned editorial overlay for new OPORA lessons only. Stored AS-6.0
// lessons without contentRevision continue to use their historical wording.
// Optional education, not treatment. No forced body focus or breath control.
import {oporaAs60Day} from './opora-as60-experiential-practices.js'
import {oporaAs60Journey} from './opora-as60-integrated-journey.js'

export const OPORA_VARIETY_REVISION='variety-v1'
const l=(ru,en,es)=>Object.freeze({ru,en,es})
const languages=['en','ru','es']
const lng=locale=>languages.includes(locale)?locale:'en'
const INSIGHTS=Object.freeze([
 l('Знак опоры — возможность выбора, а не обязанность успокоиться. Важен маленький доступный шаг.',
 'An anchor offers a choice, not a duty to become calm. A small workable response is enough.',
 'Una señal de apoyo ofrece una opción, no la obligación de calmarse. Basta un paso posible.'),
 l('Опора — не единственная правильная поза. Можно выбрать поддержку, изменить её или отказаться.',
 'Support is not one correct posture. You can choose, change or decline a place to rest.',
 'El apoyo no es una postura correcta. Puedes elegir, cambiar o no usar un lugar de descanso.'),
 l('Одно маленькое изменение движения проще изучить, чем заставить расслабиться всё тело. Сравнивать уже достаточно.',
 'One small movement is easier to explore than trying to relax your entire body. Comparing is enough.',
 'Explorar un gesto pequeño es más fácil que obligar al cuerpo a relajarse. Comparar basta.'),
 l('Назвать чувство и осудить себя за него — разные действия. Сегодня учимся первому без второго.',
 'Naming a feeling and judging yourself for it are different actions. Try the first without the second.',
 'Nombrar una emoción y juzgarte por ella son cosas distintas. Prueba lo primero sin lo segundo.'),
 l('Мысль может быть навязчивой и всё же не быть приказом. Следующее действие остаётся вашим выбором.',
 'A thought may sound urgent without being an instruction. You still get to choose what comes next.',
 'Un pensamiento puede sonar urgente sin ser una orden. Tú eliges qué hacer después.'),
 l('Маленький план связывает обычный сигнал с посильным действием. Репетиция не обязывает его выполнять.',
 'A tiny plan links an everyday cue to a possible response. Rehearsal is not a promise to act.',
 'Un plan pequeño une una señal cotidiana a una respuesta posible. Ensayarlo no obliga.'),
 l('Один доступный инструмент может пригодиться больше идеального длинного списка. Его можно менять.',
 'One available support option may help more than a perfect checklist. You can adapt it.',
 'Una opción de apoyo disponible puede servir más que una lista perfecta. Puedes adaptarla.'),
 l('В спешке знакомый знак опоры может восприниматься иначе. Заменить его — гибкость, не неудача.',
 'A familiar anchor may feel different when rushed. Replacing it is flexibility, not failure.',
 'Una señal conocida puede sentirse distinta con prisa. Cambiarla es flexibilidad, no fracaso.'),
 l('Переключаться между двумя опорами — это навык выбора, а не поиск единственно верного ощущения.',
 'Switching between two supports trains choice, not a search for one correct body sensation.',
 'Cambiar entre dos apoyos entrena la elección, no la búsqueda de una sensación correcta.'),
 l('Сделать движение легче — возможность, а не тест. Иногда лучше оставить привычное положение.',
 'Using less effort is an option, not a test. Keeping your usual position may suit you better.',
 'Usar menos esfuerzo es una opción, no una prueba. Quizá prefieras tu postura habitual.'),
 l('Не каждое чувство требует немедленного действия. Можно назвать его и отдельно выбрать следующий шаг.',
 'A feeling does not demand immediate action. Name it and choose your next step separately.',
 'Una emoción no exige actuar enseguida. Nómbrala y elige el siguiente paso aparte.'),
 l('Тревожная мысль не обязана принимать решения вместо вас. Обычное небольшое дело остаётся выбором.',
 'An unsettling thought need not decide for you. An ordinary small action remains your choice.',
 'Un pensamiento inquietante no tiene que decidir por ti. Puedes elegir una acción cotidiana.'),
 l('Реалистичный план может включать отдых или «не сегодня». Изменять план допустимо.',
 'A realistic plan can include rest or “not today”. You are allowed to change it.',
 'Un plan realista puede incluir descanso o «hoy no». Puedes cambiarlo.'),
 l('Навык полезен, когда подходит ситуации. Не требуется выполнять все упражнения подряд.',
 'A useful skill is one you can adapt. You do not have to repeat every exercise.',
 'Una habilidad útil se adapta. No tienes que repetir todos los ejercicios.')
])
const WEEK_TWO=Object.freeze([
 l('Восьмой день: используем знак первого дня в вымышленной ситуации спешки. Задача — пробовать гибкость, а не погружаться в стресс.',
 'Day eight: try your first-day sign in a fictional rushed moment. Practise flexibility, not stress.',
 'Día ocho: prueba tu señal del primer día en una situación imaginaria de prisa. Ensaya flexibilidad.'),
 l('Девятый день: переносим выбор физической опоры на переход между двумя бытовыми задачами. Контакт с телом необязателен.',
 'Day nine: choose between resting places when switching ordinary tasks. Body focus is optional.',
 'Día nueve: elige apoyos al cambiar de tarea. Centrarse en el cuerpo es opcional.'),
 l('Десятый день: применяем более мягкое усилие к бытовому действию, а не повторяем разминку кисти.',
 'Day ten: explore a lighter touch in an everyday task instead of repeating the hand warm-up.',
 'Día diez: prueba un gesto más suave en una tarea cotidiana, no la misma práctica de la mano.'),
 l('Одиннадцатый день: называем чувство и выбираем ответ в новом повседневном контексте, без самооценки.',
 'Day eleven: practise naming a feeling and choosing a response in a new everyday context.',
 'Día once: practica nombrar una emoción y elegir una respuesta en otro momento cotidiano.'),
 l('Двенадцатый день: встречаем знакомую мысль как мысль, но действие выбираем по обстоятельствам.',
 'Day twelve: notice a familiar thought as a thought, then choose an action to suit the moment.',
 'Día doce: observa un pensamiento como pensamiento y elige una acción adecuada.'),
 l('Тринадцатый день: делаем план чуть гибче, учитывая отдых, реальное время и право отказаться.',
 'Day thirteen: make a small plan more flexible, allowing rest, timing and the option to decline.',
 'Día trece: adapta un pequeño plan dejando espacio al descanso y la posibilidad de no hacerlo.'),
 l('Четырнадцатый день: не повторяем все семь навыков, а выбираем личную последовательность для обычной ситуации.',
 'Day fourteen: choose your own sequence for an everyday moment rather than repeating all seven skills.',
 'Día catorce: elige tu propia secuencia para un momento cotidiano sin repetir las siete habilidades.')
])
const S2=Object.freeze({
 name:l('Ищем доступные опоры','Discover available supports','Descubrir apoyos disponibles'),
 title:l('Квест «Где моя опора?»','The support hunt','La búsqueda de apoyo'),
 purpose:l('Сегодня ищем разные места, где можно дать отдых ладони или спине. Главное — свобода выбора, а не правильная поза.',
 'Today we explore places to rest a hand or back. Having a choice matters more than finding a correct posture.',
 'Hoy exploramos dónde apoyar la mano o la espalda. Importa tener opciones, no acertar con una postura.'),
 practice:l('Мини-квест: найдите удобное место для отдыха — это не обязательно стул.',
 'Mini-quest: discover a resting place nearby—not necessarily a chair.',
 'Minibúsqueda: encuentra un lugar de apoyo cercano, no necesariamente una silla.'),
 scenario:l('Вы ждёте чайник. Рядом есть столешница, стена или подушка; можно выбрать место для паузы не двигаясь.',
 'You are waiting for the kettle. A counter, wall or cushion is nearby; you can consider a pause without moving.',
 'Esperas que hierva el agua. Cerca hay una mesa, pared o cojín; puedes elegir sin moverte.'),
 alternative:l('Если прикосновения неприятны, найдите место отдыха только взглядом. Пользоваться им необязательно.',
 'If touch is unwelcome, find a possible resting place just by looking. You do not have to use it.',
 'Si tocar resulta incómodo, busca un lugar de apoyo con la mirada. No tienes que usarlo.'),
 result:l('Одно выбранное место отдыха или решение ничего не менять',
 'One chosen resting place, or a choice not to change anything',
 'Un apoyo elegido, o la decisión de no cambiar nada'),
 transfer:l('В спокойный перерыв выберите глазами удобную поверхность и решите, нужна ли вам опора.',
 'At a quiet break, spot a comfortable surface and decide whether you want to use it.',
 'En una pausa tranquila, busca una superficie cómoda y decide si quieres usarla.'),
 prompt:l('Какой вариант подходит?','Which option fits you?','¿Qué opción te sirve?'),
 steps:[
 l('Осмотритесь и найдите два варианта: стол, стену, подушку или другую поверхность. Можно не двигаться.',
 'Spot two options nearby: table, wall, cushion or another surface. You may stay still.',
 'Observa dos opciones: mesa, pared, cojín u otra superficie. Puedes quedarte quieto.'),
 l('Если удобно, положите ладонь на одну поверхность на десять секунд. Можно просто смотреть на неё.',
 'If comfortable, rest a hand on one for ten seconds. Looking at it is enough too.',
 'Si te resulta cómodo, apoya una mano diez segundos. También basta con mirar.'),
 l('Сравните: какая опора подойдёт для короткой паузы? Можно выбрать ни одну.',
 'Compare: which resting place might suit a short pause? Choosing neither is fine.',
 'Compara: ¿qué apoyo serviría para una pausa? También puedes no elegir ninguno.')
 ],
 choices:[['hand',l('Опора ладонью','Rest a hand','Apoyar la mano')],['back',l('Опора спиной','Rest my back','Apoyar la espalda')],['look',l('Только взглядом','Look only','Solo mirar')]]
})
const S9=Object.freeze({
 name:l('Гибкая физическая опора','Flexible physical support','Apoyo físico flexible'),
 title:l('Меняем опору между делами','Switch support between tasks','Cambiar de apoyo entre tareas'),
 purpose:WEEK_TWO[1],
 practice:l('Попробуйте подобрать опору для двух разных бытовых моментов.',
 'Try choosing support for two different everyday moments.',
 'Prueba elegir apoyos para dos momentos cotidianos.'),
 scenario:l('Вы закончили спокойный звонок и приступаете к чтению. Второму делу может подойти другое место для отдыха.',
 'You finish a quiet call and start reading. A different resting place may suit the next task.',
 'Terminas una llamada tranquila y vas a leer. Quizá te convenga otro lugar de apoyo.'),
 alternative:l('Можно сравнить варианты только мысленно. Не нужно двигаться и отслеживать ощущения.',
 'Compare options in your imagination. No moving or body monitoring required.',
 'Puedes comparar opciones mentalmente. No hace falta moverse ni vigilar sensaciones.'),
 result:l('Два варианта опоры на выбор','Two different support options','Dos opciones de apoyo'),
 transfer:l('Перед переходом между делами выберите доступную опору или откажитесь от этого шага.',
 'Before one task change, choose a support option—or skip the step.',
 'Antes de cambiar de tarea, elige un apoyo o sáltate el paso.'),
 prompt:l('Какой способ попробуете?','Which switch could you try?','¿Qué cambio podrías probar?'),
 steps:[
 l('Представьте два простых дела: читать и говорить по телефону. Подберите место отдыха для каждого.',
 'Picture reading and a phone call. Find a suitable resting place for each.',
 'Imagina leer y llamar por teléfono. Encuentra un apoyo para cada uno.'),
 l('Мысленно поменяйте опоры. При желании опробуйте один вариант несколько секунд.',
 'Mentally switch the resting places. Try one briefly only if you wish.',
 'Intercambia los apoyos mentalmente. Prueba uno unos segundos solo si quieres.'),
 l('Выберите то, что сейчас удобнее, либо оставьте оба варианта без изменений.',
 'Choose what fits this moment, or leave both options unchanged.',
 'Elige lo que te convenga ahora, o deja las dos opciones como están.')
 ],
 choices:[['hands',l('Для рук','Hands','Manos')],['back',l('Для спины','Back','Espalda')],['none',l('Не менять','No change','Sin cambios')]]
})
const DAY2_CHANNELS=Object.freeze({
 body:l('Найдите место для отдыха ладони. Коснитесь его на мгновение, если удобно, или выберите только взглядом.',
 'Find a possible place to rest a hand. Touch it briefly if comfortable, or choose with your eyes.',
 'Busca dónde apoyar la mano. Toca un instante si quieres, o elige con la mirada.'),
 emotion:l('Выбор может быть приятным, нейтральным или досадным. Достаточно заметить любой отклик или его отсутствие.',
 'Having a choice may feel pleasant, neutral or frustrating. Any mild reaction, including none, is fine.',
 'Elegir puede ser agradable, neutro o molesto. Cualquier reacción leve, o ninguna, está bien.'),
 mental:l('Представьте, что ждёте обычного сообщения. Какая поверхность рядом могла бы сделать эту паузу удобнее?',
 'Imagine waiting for an ordinary message. What nearby surface could make this pause easier?',
 'Imagina que esperas un mensaje. ¿Qué superficie cercana facilitaría esa pausa?'),
 imagery:l('Представьте комнату с тремя уютными местами отдыха. Выберите одно или лишь слово «выбор».',
 'Imagine a room with three inviting resting places. Choose one, or just the word “choice”.',
 'Imagina una habitación con tres lugares de descanso. Elige uno o solo la palabra «elegir».'),
 ritual:l('Если хочется, положите небольшую подушку или книгу рядом с местом отдыха. Ничего переставлять не обязательно.',
 'If you like, place a cushion or book near a resting spot. Moving anything is optional.',
 'Si quieres, coloca un cojín o libro cerca del descanso. No tienes que mover nada.'),
 plan:l('Во время спокойного ожидания я могу выбрать место для отдыха руки — или просто сделать паузу.',
 'During a quiet wait I can find a resting place for my hand—or simply pause.',
 'Durante una espera tranquila puedo buscar apoyo para la mano o hacer una pausa.')
})
export const OPORA_VARIETY_COPY=Object.freeze({
 en:{whyKicker:'ONE NEW IDEA',whyTitle:'The choice behind the practice',goalLabel:'TODAY’S AIM'},
 ru:{whyKicker:'НОВЫЙ ВЗГЛЯД',whyTitle:'Чему учит этот выбор',goalLabel:'ЦЕЛЬ ЭКСПЕРИМЕНТА'},
 es:{whyKicker:'UNA IDEA NUEVA',whyTitle:'El valor de poder elegir',goalLabel:'META DE HOY'},
})
export function oporaAs60DailyInsight(day,locale='en'){
 return Number.isInteger(day)&&day>=1&&day<=14?INSIGHTS[day-1][lng(locale)]:null
}
export function oporaAs60VariedDay(day,locale='en'){
 const base=oporaAs60Day(day,locale)
 if(!base)return null
 const lang=lng(locale),detail=day===2?S2:day===9?S9:null
 const deepPurpose=day>7?WEEK_TWO[day-8][lang]:base.purpose
 if(!detail)return Object.freeze({...base,purpose:deepPurpose})
 return Object.freeze({...base,skill:detail.name[lang],purposeTitle:detail.name[lang],
  purpose:detail.purpose[lang],title:detail.title[lang],practice:detail.practice[lang],
  scenario:detail.scenario[lang],alternative:detail.alternative[lang],
  result:detail.result[lang],transfer:detail.transfer[lang],
  experiment:Object.freeze({
    steps:Object.freeze(detail.steps.map(s=>s[lang])),
    prompt:detail.prompt[lang],
    choices:Object.freeze(detail.choices.map(([id,label])=>Object.freeze({id,label:label[lang]}))),
  }),
 })
}
export function oporaAs60VariedJourney(day,locale='en'){
 const original=oporaAs60Journey(day,locale)
 if(!original||day!==2)return original
 const lang=lng(locale),out={...original}
 for(const key of ['body','emotion','mental','imagery','ritual']){
  out[key]=Object.freeze({...original[key],text:DAY2_CHANNELS[key][lang],
    ...(key==='mental'?{plan:DAY2_CHANNELS.plan[lang]}:{})})
 }
 return Object.freeze(out)
}
export function oporaAs60VariedValid(){
 for(const lang of languages){
  const insights=new Set(),purposes=new Set()
  for(let day=1;day<=14;day++){
   const d=oporaAs60VariedDay(day,lang),i=oporaAs60DailyInsight(day,lang)
   if(!d||!i||i.length<55||i.length>225||i===d.purpose)return false
   if(d.purpose.length>225||d.practice.length>190||d.experiment.steps.length!==3)return false
   if(d.experiment.steps.some(s=>s.length<24||s.length>170))return false
   if(d.experiment.choices.length!==3||d.experiment.prompt.length<12||d.experiment.prompt.length>95)return false
   insights.add(i);purposes.add(d.purpose)
  }
  if(insights.size!==14||purposes.size!==14)return false
 }
 return true
}

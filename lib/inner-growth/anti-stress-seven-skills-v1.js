// OPORA AS-2.0: new 7-skill, 2-week educational curriculum for NEW cycles only.
// Historical AS-OUTCOME-3.0 and OPORA module records remain immutable.
export const COURSE_ANTISTRESS_SEVEN_SKILLS_V1 = 'hh-antistress-seven-skills-v1-20261017'
const local=(ru,en,es)=>Object.freeze({ru,en,es})
export const SEVEN_SKILLS=Object.freeze([
  {id:'S1',days:[1,8],title:local('Замечать первые признаки стресса','Notice early stress signs','Reconocer señales tempranas de estrés'),
    description:local('Замечать один доступный сигнал перегрузки до того, как действовать на автомате.','Notice an available early cue before acting on autopilot.','Notar una señal temprana antes de actuar en piloto automático.')},
  {id:'S2',days:[2,9],title:local('Делать паузу вместо автопилота','Pause instead of autopilot','Hacer una pausa en vez de actuar automáticamente'),
    description:local('Остановиться на несколько мгновений и выбрать следующий посильный шаг.','Make a brief pause and choose one manageable next step.','Hacer una pausa breve y elegir un paso posible.')},
  {id:'S3',days:[3,10],title:local('Выбирать ответ на тревожную мысль','Choose a response to a worrying thought','Elegir una respuesta ante un pensamiento inquietante'),
    description:local('Отделять мысль от факта и выбирать способ обращения с ней.','Separate a thought from a fact and choose how to respond.','Separar un pensamiento de un hecho y elegir cómo responder.')},
  {id:'S4',days:[4,11],title:local('Находить личную опору','Find a personal anchor','Encontrar un apoyo personal'),
    description:local('Опробовать доступный внешний ориентир, слово или поддержку без принуждения к расслаблению.','Try an accessible external anchor, word or support without forcing relaxation.','Probar un apoyo externo o una palabra sin forzar la relajación.')},
  {id:'S5',days:[5,12],title:local('Переносить практику в обычные дела','Use the skill in daily routines','Usar la habilidad en la vida cotidiana'),
    description:local('Связать привычный бытовой сигнал с коротким действием.','Link an ordinary daily cue with one small action.','Relacionar una señal cotidiana con una acción pequeña.')},
  {id:'S6',days:[6,13],title:local('Поддерживать себя в трудный день','Support yourself on difficult days','Apoyarse en días difíciles'),
    description:local('Подобрать реалистичную фразу, отдых или помощь другого человека.','Choose credible self-talk, rest or help from another person.','Elegir palabras realistas, descanso o apoyo de otra persona.')},
  {id:'S7',days:[7,14],title:local('Самостоятельно выбирать подходящую практику','Choose a suitable practice independently','Elegir una práctica adecuada por cuenta propia'),
    description:local('Подбирать уже знакомую опору под новый повседневный случай.','Select a familiar support for a new ordinary situation.','Elegir un recurso conocido ante una situación cotidiana nueva.')},
])
const entry=(skill,titleRu,titleEn,stepsRu,stepsEn,scenarioRu,scenarioEn,transferRu,transferEn,resultRu,resultEn)=>Object.freeze({
  skill,title:local(titleRu,titleEn,titleEn),
  steps:Object.freeze(stepsRu.map((ru,i)=>local(ru,stepsEn[i],stepsEn[i]))),
  scenario:local(scenarioRu,scenarioEn,scenarioEn),
  transfer:local(transferRu,transferEn,transferEn),
  result:local(resultRu,resultEn,resultEn),
})
const LESSONS=Object.freeze([
 entry(0,'Мой ранний сигнал','My early cue',[
  'Посмотрите вокруг и найдите один обычный предмет. Заметьте его цвет и форму.',
  'Прочитайте нейтральный пример: вы собираетесь выйти и ищете ключи. Какие первые признаки спешки могли бы появиться?',
  'Выберите один знакомый сигнал: ускорение мыслей, усталость, сужение внимания или «пока не знаю». Не ищите причин.',
  'Верните взгляд к предмету. Решите, подходит ли вам такая короткая ориентировка или лучше остановиться.'
 ],[
  'Look around and choose one ordinary object. Notice its colour and shape.',
  'Read a neutral example: you are getting ready to go out and looking for your keys. What might be an early sign of rushing?',
  'Choose a familiar cue: fast thoughts, fatigue, narrowed attention, or “not sure yet”. Do not search for causes.',
  'Look at the object again. Decide whether this brief grounding suits you or whether you prefer to stop.'
 ],'В бытовом примере заметна спешка. Что подскажет сделать паузу раньше?','In an everyday example, someone is rushing. What might be an early reminder to pause?',
 'Если заметите спешку, можно посмотреть на один предмет рядом.','If you notice rushing, you might look at one nearby object.',
 'Я попробовал(а) заметить один ранний сигнал и внешний ориентир.','I tried to notice an early cue and an external anchor.'),
 entry(1,'Пауза перед действием','Pause before reacting',[
  'Прочитайте пример: перед вами три неважных дела. Появляется мысль «всё срочно».',
  'Поставьте обе стопы удобно или просто посмотрите на предмет. Дыхание менять не нужно.',
  'Произнесите мысленно: «Можно сделать паузу и выбирать». Если фраза не подходит — пропустите.',
  'Решите, что было бы посильнее: одно дело, перерыв, просьба о помощи или ничего сейчас.'
 ],[
  'Read an example: three non-urgent tasks await you and a thought says “all at once”.',
  'Set your feet comfortably or simply look at an object. There is no need to change your breathing.',
  'Silently say “I can pause and choose”. Skip the phrase if it does not fit.',
  'Choose a manageable option: one task, a break, asking for help or no action right now.'
 ],'Вам пришло сразу два обычных сообщения. Можно ли ответить позже?','Two everyday messages arrive together. Is replying later an available option?',
 'После обычного уведомления можно позволить себе короткую паузу.','After an ordinary notification, you could take a brief pause.',
 'Я потренировал(а) остановку перед выбором.','I practised pausing before choosing.'),
 entry(2,'Мысль — не факт','A thought is not a fact',[
  'Возьмите безопасный пример: «Если не отвечу сразу, всё испортится».',
  'Назовите это мыслью, а не доказанным фактом: «У меня появилась мысль, что…».',
  'Выберите одну ветку: проверить факт, просто заметить мысль или посмотреть на предмет вокруг.',
  'Составьте короткий правдоподобный ответ, например «Можно уточнить срок». Оптимизм не требуется.'
 ],[
  'Use a harmless example: “If I do not reply immediately, everything will go wrong”.',
  'Name this as a thought, not a proven fact: “I am having a thought that…”',
  'Choose one path: check a fact, notice the thought, or look at a nearby object.',
  'Try a credible response, such as “I can check the deadline”. No forced positivity.'
 ],'«Нужно всё сделать идеально». Что здесь факт, а что предположение?','“Everything must be perfect.” Which part is a fact and which is an assumption?',
 'При похожей мысли можно выбрать: факт, заметить мысль или вернуться к окружению.','With a similar thought, you might check a fact, notice it or return to the surroundings.',
 'Я попробовал(а) выбрать ответ на мысль, а не спорить с собой.','I tried choosing a response instead of fighting a thought.'),
 entry(3,'Моя доступная опора','My available anchor',[
  'Посмотрите на три обычных предмета в поле зрения. Не ищите «особенно спокойный» предмет.',
  'Выберите один ориентир, который легко найти снова: цвет, форма или предмет.',
  'При желании добавьте реалистичное слово: «пауза», «можно позже» или своё. Без визуализации тоже подходит.',
  'Отведите взгляд и мягко вернитесь к ориентиру. Если не подходит — замените или остановитесь.'
 ],[
  'Notice three ordinary objects in sight. No need to find a “particularly calming” object.',
  'Choose one easy-to-find anchor: a colour, shape or object.',
  'If you wish, add a credible word: “pause”, “later is okay”, or your own. Imagery is not required.',
  'Look away and gently return to that anchor. You can switch or stop if it does not suit you.'
 ],'Вы ждёте чайник. Какой предмет или слово может быть ориентиром?','You are waiting for a kettle. What object or word could be an anchor?',
 'Оставьте один доступный ориентир, который можно использовать без подготовки.','Keep one accessible anchor you can use without preparation.',
 'Я выбрал(а) или осознанно отверг(ла) доступную опору.','I chose, or consciously declined, an available anchor.'),
 entry(4,'Пауза внутри обычного дня','A pause in an ordinary day',[
  'Выберите повторяющееся безопасное событие: закончить звонок, налить воду или закрыть книгу.',
  'Выберите короткое действие: увидеть два предмета, встать на минуту или отдохнуть.',
  'Составьте формулу: «После [событие] я могу [действие]». Это приглашение, не обещание.',
  'Пройдите мысленно один обычный день и проверьте: реально ли у вас есть такая возможность? Можно отказаться.'
 ],[
  'Pick an ordinary recurring cue: ending a call, pouring water or closing a book.',
  'Pick one small action: notice two objects, stand for a moment or rest.',
  'Build the phrase: “After [event] I might [action]”. This is an option, not a promise.',
  'Mentally check an ordinary day. Is this realistically available? You can opt out.'
 ],'После чашки чая появляется свободная минута. Какую паузу можно выбрать?','There is a free minute after tea. What tiny pause might fit?',
 'Мой возможный сигнал: обычное событие; мой ответ: одна доступная пауза.','My possible cue: an ordinary event; my response: one manageable pause.',
 'Я составил(а) один реалистичный план «после X — Y».','I built one realistic “after X — Y” plan.'),
 entry(5,'Бережная поддержка себя','Kind support for myself',[
  'Представьте только простой пример: после длинного дня стало мало сил. Не возвращайтесь к болезненным событиям.',
  'Выберите один правдоподобный ответ себе: «Можно отдохнуть», «Не всё сегодня» или «Я могу попросить помощи».',
  'Назовите один реально доступный способ поддержки: вода, перерыв, удобное место или человек.',
  'Проверьте, не звучит ли выбранная фраза чужой. Можно заменить её отдыхом или пропуском.'
 ],[
  'Imagine an ordinary example: you feel tired after a long day. Do not revisit painful events.',
  'Choose credible self-talk: “Rest is okay”, “Not everything today”, or “I can ask for help”.',
  'Pick one realistic support: water, a break, a comfortable place or a person.',
  'Check if the phrase feels artificial. Replace it with rest or a skip if it does.'
 ],'Вечером мало сил. Какая помощь реально доступна?','You have little energy in the evening. What support is actually available?',
 'В трудный день можно выбрать короткую паузу, отдых или поддержку человека.','On a difficult day you can choose a pause, rest or human support.',
 'Я выбрал(а) одну правдоподобную форму поддержки.','I chose one credible form of support.'),
 entry(6,'Как выбрать подходящую практику','How to choose a suitable practice',[
  'Вспомните без обязательных записей: сигнал, пауза, мысль, внешний ориентир, привычный сигнал, поддержка.',
  'Прочитайте новый бытовой пример: вы устали после нескольких дел.',
  'Выберите любую знакомую опору: отдых, паузу, взгляд на предмет, правдоподобную фразу или человека.',
  'Подумайте, почему именно это сейчас доступно. Можно менять выбор или ничего не предпринимать.'
 ],[
  'Recall the tools: early cue, pause, thought choice, external anchor, daily cue and support.',
  'Read a new everyday example: you are tired after several ordinary tasks.',
  'Choose any familiar support: rest, pause, an object, a credible phrase or a person.',
  'Consider why this is available right now. You can change your mind or take no action.'
 ],'После обычного рабочего дня вы устали. Что подходит — и почему?','After an ordinary workday you feel tired. What fits, and why?',
 'Моя карта: один сигнал → одна опора → запасной вариант.','My map: one cue → one support → a fallback.',
 'Я попробовал(а) подобрать опору под ситуацию.','I tried matching a support to a situation.'),
 entry(0,'Замечаю перегрузку раньше','Spotting overload earlier',[
  'Вспомните вчерашний простой сигнал перегрузки или выберите новый без обращения к тяжёлым воспоминаниям.',
  'Посмотрите на два безопасных бытовых сюжета: торопитесь к двери и медленно собираете сумку. Чем они различаются?',
  'Назовите один вероятный ранний сигнал спешки и один нейтральный внешний ориентир.',
  'Попробуйте заметить сигнал в другом вымышленном эпизоде, сначала без подсказки. Подсказка всегда доступна.'
 ],[
  'Recall a simple early cue or choose a new one without revisiting painful memories.',
  'Compare two everyday scenes: rushing to a door and slowly packing a bag. What differs?',
  'Name one possible early sign of rushing and one neutral external anchor.',
  'Try noticing the cue in a different fictional scene, first without a hint. Hints remain available.'
 ],'Утром вы ускорились, чтобы успеть к транспорту. Как заметить это раньше?','You rush in the morning to catch transit. How might you notice that sooner?',
 'Если вспомню свой ранний сигнал, смогу решить, нужна ли короткая пауза.','If I recall my early cue, I can decide whether a small pause fits.',
 'Я опробовал(а) распознавание сигнала в новом примере.','I tried identifying a cue in a new example.'),
 entry(1,'Возвращаю себе время на выбор','Making room for a choice',[
  'Возьмите два нейтральных эпизода: уведомление телефона и новая несрочная просьба.',
  'В каждом мысленно произнесите «пауза» или посмотрите на два предмета в комнате.',
  'Выберите первый небольшой ответ для каждого случая: позже, одно дело, отдых или помощь.',
  'Попробуйте вторую ситуацию уже с меньшим количеством подсказок, но без требования действовать в жизни.'
 ],[
  'Use two neutral scenes: a phone notification and a non-urgent request.',
  'In each, silently say “pause” or notice two objects in the room.',
  'Choose a first manageable response for each: later, one task, rest or help.',
  'Try the second scene with fewer hints, without any real-world action requirement.'
 ],'Сообщение требует «быстрого» ответа, но срок неизвестен. Что можно сделать?','A message asks for a “quick” reply but gives no deadline. What could you do?',
 'При новой спешке можно сначала выделить момент для выбора.','With a new rush, I might make room for a choice first.',
 'Я потренировал(а) паузу в двух новых ситуациях.','I practised pausing in two new situations.'),
 entry(2,'Выбираю реакцию на мысль самостоятельно','Choosing a response to a thought',[
  'Выберите нейтральную мысль «Все ждут ответа сейчас». Напомните себе, что это гипотеза.',
  'Решите, что проверить: указан ли срок, было ли прямое обещание, есть ли другая причина задержки.',
  'Выберите одну из трёх стратегий: факт, заметить мысль, вернуться к предмету. Подсказки можно скрыть.',
  'Повторите на мысли «Мне нельзя ошибаться» и отметьте, не нужна ли вместо анализа пауза.'
 ],[
  'Use the neutral thought “Everyone expects an answer now”. Name it as an assumption.',
  'Check what you can verify: deadline, promise, or another reason for delay.',
  'Choose one of three strategies: fact, notice the thought, or return to an object. You can hide hints.',
  'Try “I must never make a mistake” and consider whether a pause is better than analysis.'
 ],'«Если отвечу завтра, это плохо». Какой способ выбрать?','“If I answer tomorrow, that is bad.” Which response might help?',
 'При беспокойной мысли могу сначала решить, нужно ли вообще с ней работать.','With a worrying thought, I can first decide whether to engage with it.',
 'Я попробовал(а) выбрать стратегию в двух новых примерах.','I tried choosing a strategy in two new examples.'),
 entry(3,'Подбираю опору под ситуацию','Adapting my anchor',[
  'Переберите три реально доступные опоры: цвет/предмет, короткое слово, отдых или человек.',
  'Проверьте один способ в нейтральной обстановке без дополнительных образов.',
  'Решите: оставить, упростить или заменить выбранное. Не оценивайте себя по реакции.',
  'Попробуйте снова с другим ориентиром, если хочется, или сохраните первую рабочую версию.'
 ],[
  'Consider accessible supports: object/colour, a short word, rest or a person.',
  'Try one option in a neutral environment without needing imagery.',
  'Decide: keep, simplify or replace it. Do not judge yourself by your feelings.',
  'If useful, try a different anchor, or keep the first available option.'
 ],'В комнате шумно. Какую внешнюю или словесную опору можно выбрать?','The room is noisy. Which external or verbal anchor might fit?',
 'Мой набор может содержать запасной вариант, когда привычная опора недоступна.','My toolkit may include a fallback when my usual anchor is unavailable.',
 'Я потренировал(а) выбор и адаптацию опоры.','I practised choosing and adapting an anchor.'),
 entry(4,'Использую навык без напоминаний','Using the cue without extra reminders',[
  'Откройте мысленно прежний план «после X — Y», либо составьте новый, если он не сохранился.',
  'Выберите другой привычный сигнал, который реально встречается: дверь, кружка, завершение дела.',
  'Попробуйте в безопасной мысленной репетиции связать сигнал с короткой паузой или отдыхом.',
  'Честно различите: я только спланировал(а), представил(а), попробовал(а) в жизни или решил(а) не делать.'
 ],[
  'Recall your “after X — Y” plan, or make a new one if it was not saved.',
  'Choose another ordinary cue you actually encounter: a door, a cup, finishing a task.',
  'In a harmless mental rehearsal, link that cue with a pause or rest.',
  'Honestly separate: made a plan, imagined it, tried it in life, or decided not to do it.'
 ],'После закрытия ноутбука появляется пауза. Как сделать её доступной?','A pause appears after closing a laptop. How could you make it accessible?',
 'Новый сигнал остаётся приглашением, а не обязательным ежедневным заданием.','A new cue remains an invitation, not a daily obligation.',
 'Я адаптировал(а) план для другого бытового сигнала.','I adapted the plan to another everyday cue.'),
 entry(5,'Собираю запасные способы поддержки','Creating a fallback support kit',[
  'Представьте нейтральный вечер после загруженного дня. Назовите одну реальную потребность без погружения в переживания.',
  'Выберите две уже знакомые и доступные опоры: отдых, внешний предмет, короткая пауза или доброжелательная фраза.',
  'Добавьте один запасной вариант: перерыв, разговор с человеком или отказаться от необязательного дела.',
  'Проверьте набор на реалистичность: действительно ли эти варианты доступны? Оставьте только проверенное.'
 ],[
  'Picture an ordinary evening after a busy day. Name one realistic need without exploring painful feelings.',
  'Choose two supports you have actually tried: rest, an object, a pause or credible self-talk.',
  'Add one fallback: a break, talking to someone or letting a non-urgent task wait.',
  'Check the toolkit for realism: are these truly available? Keep only what you know.'
 ],'Сил мало, а планы остались. Что выбрать основным и запасным вариантом?','You are low on energy with plans remaining. What are your main and fallback supports?',
 'Мой набор: две знакомые опоры и один реалистичный запасной вариант.','My toolkit: two familiar supports and one realistic fallback.',
 'Я собрал(а) проверяемый набор поддержки 2+1.','I assembled a realistic 2+1 support kit.'),
 entry(6,'Моя личная система ОПОРА','My personal OPORA plan',[
  'Посмотрите на все семь навыков. Отметьте только те, которые вы действительно пробовали, не приписывая себе остальные.',
  'Выберите ранний сигнал, который готовы замечать, и одну знакомую опору.',
  'Для двух новых бытовых сценариев подберите первый шаг, запасной вариант и возможность обратиться к человеку.',
  'Составьте короткую карту «сигнал → мой доступный ответ → запасной вариант». Можно оставить пробелы.'
 ],[
  'Review the seven skills. Mark only those you actually tried, without claiming the others.',
  'Pick one early cue you might notice and one familiar support.',
  'For two new ordinary scenes, choose a first step, a fallback and an option to contact a person.',
  'Make a brief “cue → available response → fallback” map. Blank spots are allowed.'
 ],'В новом обычном дне появляется спешка. Какую опору выберете без ведущего?','Rushing appears during an ordinary new day. Which support would you choose without a guide?',
 'Моя карта ОПОРА остаётся гибкой: можно менять и дополнять её.','My OPORA plan stays flexible: it can change and grow.',
 'Я собрал(а) свою карту опор с честным уровнем помощи.','I created a support map with an honest level of help.'),
])
const DEFAULT_SCALES=[
 ['weekly.tension','weekly.load'],['resource.agency','weekly.tension'],['weekly.clarity','weekly.tension'],
 ['resource.self_support','weekly.recovery'],['weekly.functioning','resource.agency'],
 ['resource.support','weekly.recovery'],['resource.self_support','resource.agency'],
]
const pick=(item,locale)=>item?.[locale]||item?.en||''
export function antiStressSevenSkillCards(locale='en'){
  return SEVEN_SKILLS.map(item=>({id:item.id,days:[...item.days],title:pick(item.title,locale),
    description:pick(item.description,locale)}))
}
export function antiStressSevenSkillDay(day,locale='en',length='standard'){
  if(!Number.isInteger(day)||day<1||day>14)return null
  const row=LESSONS[day-1],skill=SEVEN_SKILLS[row.skill],deep=day>=8
  const steps=row.steps.map(step=>pick(step,locale))
  const title=pick(row.title,locale),outcome=pick(row.result,locale)
  const skillTitle=pick(skill.title,locale)
  const intro=locale==='ru'? 'Тренируем один навык на конкретном примере, а не оцениваем ваше состояние.'
    :locale==='es'?'Entrenamos una habilidad con un ejemplo concreto, sin evaluar tu estado.':
    'We practise one skill with a concrete example, not a test of your mental state.'
  const guide=steps.join(' ')
  return {
    day,skillId:skill.id,skill:skillTitle,title,
    teaching:pick(skill.description,locale)+' '+intro,
    guide,action:pick(row.scenario,locale),transfer:pick(row.transfer,locale),
    reflection:locale==='ru'?'Удалось ли попробовать выбранное действие? Можно ответить «нет».':
      'Did you actually try the chosen action? “No” is a valid answer.',
    quote:locale==='ru'?'Навык — это доступный выбор, а не обязанность чувствовать себя лучше.':
      'A skill is an available choice, not an obligation to feel better.',
    neutral:locale==='ru'?'Можно смотреть на обычный предмет, читать или остановиться. Дышите естественно.':
      'You may look at an ordinary object, read, or stop. Breathe naturally.',
    outcome,scales:[...DEFAULT_SCALES[row.skill]],probe:null,
    sevenSkillsV1:{
      version:COURSE_ANTISTRESS_SEVEN_SKILLS_V1,day,skillId:skill.id,skillTitle,
      skillDescription:pick(skill.description,locale),intro,title,steps,
      scenario:pick(row.scenario,locale),transfer:pick(row.transfer,locale),outcome,
      depth:deep?'deepen':'learn',
      suggestedMinutes:length==='quick'?'5–8':'8–12',
    },
  }
}
export function sevenSkillsLessonValid(){
  return LESSONS.length===14&&SEVEN_SKILLS.length===7&&LESSONS.every((row,i)=>
    row.skill===i%7&&row.steps.length===4&&row.steps.every(step=>
      typeof step.ru==='string'&&step.ru.length>20&&typeof step.en==='string'&&step.en.length>20))
}

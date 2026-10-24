import { buildCoachingRecap, coachingAnswerText, coachingExplicitCue } from './guided-session.js'

// Holistic House Coaching Intelligence P1: reviewed, deterministic prompts only.
// This module never calls a language model, storage, analytics or a provider.
// It offers a *question*, not an interpretation, diagnosis or fact about a client.

const prompts=Object.freeze({
  reality_choice_v1:{
    en:'What real example makes this answer relevant to your situation?',
    ru:'Какой реальный пример делает этот ответ подходящим к вашей ситуации?',
    es:'¿Qué ejemplo real hace que esta respuesta encaje con tu situación?',
  },
  reality_text_v1:{
    en:'Which part of what you described can you influence this week?',
    ru:'На какую часть описанной ситуации вы можете повлиять на этой неделе?',
    es:'¿En qué parte de esta situación puedes influir esta semana?',
  },
  options_choice_v1:{
    en:'What small experiment could help you check whether this option works?',
    ru:'Какой небольшой эксперимент поможет проверить, подходит ли этот вариант?',
    es:'¿Qué pequeño experimento podría ayudarte a comprobar esta opción?',
  },
  options_text_v1:{
    en:'What uncertainty would you want to check before choosing this option?',
    ru:'Какую неопределённость стоит проверить, прежде чем выбрать этот вариант?',
    es:'¿Qué incertidumbre te gustaría comprobar antes de elegir esta opción?',
  },
})

const stageMap=Object.freeze({
  reality:'reality',obstacle:'reality',explore:'reality',listen:'reality',
  scaling:'reality',scale:'reality',understand:'reality',knowhow:'reality',current:'reality',barrier:'reality',
  options:'options',option:'options',alternatives:'options',discover:'options',
  dream:'options',design:'options',experiment:'options',resources:'options',exceptions:'options',
  goal:'goal',topic:'goal',frame:'goal',outcome:'goal',wish:'goal',
  contract:'goal',define:'goal',desire:'goal',
  will:'action',action:'action',act:'action',affirm:'action',
  commitment:'action',plan:'action',when:'when',destiny:'action',
  review:'review',deliver:'review',
})
const urgent=/(?:\b(?:suicid\w*|kill\s+myself|self[- ]harm|immediate\s+danger)\b|суицид|самоубийств|убить себя|покончить с собой|quiero morir|suicid|hacerme da[nñ]o)/iu

export function coachingStageKey(question){
  const key=String(question?.stepKey||question?.stage||'').toLowerCase()
  return stageMap[key]||null
}

// Only one extra reflection per category and two per entire session.
// A customer may always skip it and return to the fixed authored course.
export function authoredFollowupFor(question,answer,reflections={}){
  if(!question||typeof question.id!=='string'||typeof answer!=='string'||!answer.trim()||urgent.test(answer))return null
  const stage=coachingStageKey(question)
  if(stage!=='reality'&&stage!=='options')return null
  const rows=reflections&&typeof reflections==='object'&&!Array.isArray(reflections)
    ?Object.values(reflections).filter(value=>value&&typeof value==='object'):[]
  if(rows.length>=2||rows.some(row=>row.stage===stage))return null
  const variant=answer.startsWith('choice:')?'choice':'text'
  const key=stage+'_'+variant+'_v1'
  return {key,stage,questionId:question.id,prompt:prompts[key]}
}


// P1.6: authored decision paths, based only on explicitly selected/written
// answers. This is NOT a generative model or a psychological inference.
// The original method, pinned question ID and required answers never change.
const I=(en,ru,es)=>({en,ru,es})
const paths=Object.freeze({
  reality_choice_v2:{
    prompt:I('Which concrete example best shows how things are now?',
      'Какой конкретный пример лучше всего показывает ситуацию сейчас?',
      '¿Qué ejemplo concreto describe mejor la situación actual?'),
    reason:I('An example can make your own situation easier to examine without guessing causes.',
      'Пример помогает рассмотреть ситуацию без догадок о причинах.',
      'Un ejemplo permite explorar la situación sin adivinar las causas.'),
    choices:[
      I('One recent event','Один недавний случай','Un hecho reciente'),
      I('What I can influence','То, на что я могу повлиять','Lo que puedo influir'),
      I('A missing fact','Факт, которого мне не хватает','Un dato que me falta'),
      I('Not clear yet','Пока неясно','Aún no está claro'),
    ],
  },
  reality_text_v2:{
    prompt:I('Which part of what you described can you actually influence?',
      'На какую часть описанного вы действительно можете повлиять?',
      '¿En qué parte de lo que describiste puedes influir?'),
    reason:I('Separate what is in your control from what needs more information.',
      'Отделим то, что зависит от вас, от того, что ещё нужно выяснить.',
      'Separa lo que depende de ti de lo que necesita más información.'),
    choices:[
      I('My next choice','Мой следующий выбор','Mi próxima decisión'),
      I('A small action','Небольшое действие','Una acción pequeña'),
      I('Asking for a fact','Уточнить один факт','Pedir un dato'),
      I('Not sure what I control','Пока не знаю, что зависит от меня','No sé qué depende de mí'),
    ],
  },
  reality_time_v2:{
    prompt:I('At which moment does a lack of time get in your way?',
      'В какой момент нехватка времени мешает сильнее всего?',
      '¿En qué momento te limita más la falta de tiempo?'),
    reason:I('You mentioned time as a constraint. Name one observable moment, not a character trait.',
      'Вы указали на ограничение времени. Найдём конкретный момент, а не «черту характера».',
      'Mencionaste el tiempo como límite. Busca un momento concreto, no un rasgo personal.'),
    choices:[
      I('Before I begin','Перед началом','Antes de empezar'),
      I('When tasks overlap','Когда задачи накладываются','Cuando coinciden tareas'),
      I('After a long day','После долгого дня','Después de un día largo'),
      I('The timing changes','Это бывает по-разному','Depende del día'),
    ],
  },
  reality_clarity_v2:{
    prompt:I('Which missing piece of information would help most?',
      'Какой недостающий факт помог бы больше всего?',
      '¿Qué dato que te falta te ayudaría más?'),
    reason:I('You indicated uncertainty. You can choose what to clarify first.',
      'Вы отметили неопределённость. Выберите, что прояснить первым.',
      'Indicaste incertidumbre. Puedes elegir qué aclarar primero.'),
    choices:[
      I('What my options are','Какие у меня варианты','Cuáles son mis opciones'),
      I('What the first step is','С чего начать','Por dónde empezar'),
      I('Whom I could ask','У кого можно уточнить','A quién puedo preguntar'),
      I('Whether now is the right time','Подходит ли момент','Si este es el momento'),
    ],
  },
  reality_confidence_v2:{
    prompt:I('What exactly are you unsure about in this situation?',
      'В чём именно сейчас остаются сомнения?',
      '¿Qué es exactamente lo que te genera dudas?'),
    reason:I('The answer can identify a specific uncertainty; it does not label your personality.',
      'Так мы назовём конкретное сомнение, не оценивая вашу личность.',
      'Así puedes identificar una duda concreta sin juzgar tu personalidad.'),
    choices:[
      I('The outcome','Возможный результат','El resultado'),
      I('How to begin','Как начать','Cómo empezar'),
      I('Others’ reactions','Реакция других','Las reacciones de otros'),
      I('I cannot say yet','Пока не могу сказать','Aún no puedo decirlo'),
    ],
  },
  reality_stuck_v2:{
    prompt:I('Where does progress tend to stop for you?',
      'На каком этапе чаще всего останавливается продвижение?',
      '¿En qué punto se suele detener el avance?'),
    reason:I('You reported feeling stuck. Explore the stage, without assuming why.',
      'Вы описали остановку. Посмотрим на этап, не приписывая причин.',
      'Mencionaste un bloqueo. Observa el momento, sin asumir por qué.'),
    choices:[
      I('Before starting','До начала','Antes de comenzar'),
      I('After the first try','После первой попытки','Después del primer intento'),
      I('While choosing between options','При выборе варианта','Al elegir una opción'),
      I('It varies','По-разному','Varía'),
    ],
  },
  reality_resources_v2:{
    prompt:I('Which resource you named is most available today?',
      'Какой из названных ресурсов доступнее всего сегодня?',
      '¿Qué recurso que mencionaste está más disponible hoy?'),
    reason:I('A resource is something you identified, not a promise of progress.',
      'Речь о ресурсе, который вы сами отметили, а не об обещании результата.',
      'Es un recurso que identificaste, no una promesa de progreso.'),
    choices:[
      I('Past experience','Прошлый опыт','Experiencia previa'),
      I('A practical skill','Практический навык','Una habilidad'),
      I('Someone I may ask','Человек, к которому могу обратиться','Alguien a quien preguntar'),
      I('I am not sure','Пока не знаю','No lo tengo claro'),
    ],
  },
  reality_support_v2:{
    prompt:I('What kind of support, if any, would be comfortable to ask for?',
      'О какой поддержке, если она нужна, было бы комфортно попросить?',
      '¿Qué apoyo, si lo deseas, te sentirías cómodo al pedir?'),
    reason:I('Any request for help is your choice; nobody is contacted.',
      'Просить или не просить — ваш выбор. Никому ничего не отправляется.',
      'Pedir apoyo es tu elección. No se contacta a nadie.'),
    choices:[
      I('A factual answer','Ответ на вопрос','Una respuesta concreta'),
      I('A second opinion','Второе мнение','Una segunda opinión'),
      I('Time to talk','Время поговорить','Tiempo para hablar'),
      I('I prefer to handle this alone','Пока предпочту самостоятельно','Prefiero hacerlo por mi cuenta'),
    ],
  },
  reality_scale_low_v2:{
    prompt:I('What might help you move just one point on your own scale?',
      'Что могло бы помочь продвинуться на один пункт по вашей шкале?',
      '¿Qué podría ayudarte a avanzar un punto en tu escala?'),
    reason:I('This is your own 0–10 reflection, not a psychological or clinical score.',
      'Это ваша субъективная шкала 0–10, а не психологический или клинический тест.',
      'Es tu propia escala 0–10, no una puntuación clínica.'),
    choices:[
      I('One very small action','Одно совсем небольшое действие','Una acción muy pequeña'),
      I('One piece of information','Один нужный факт','Un dato útil'),
      I('A resource I already have','Уже доступный ресурс','Un recurso que ya tengo'),
      I('I do not know yet','Пока не знаю','Aún no lo sé'),
    ],
  },
  reality_scale_mid_v2:{
    prompt:I('What has already helped you get this far, even a little?',
      'Что уже помогло вам дойти до этой отметки, пусть немного?',
      '¿Qué te ayudó a llegar hasta aquí, aunque sea un poco?'),
    reason:I('Your score is subjective. We are exploring your own resources.',
      'Оценка субъективна. Мы исследуем ресурсы, которые вы сами замечаете.',
      'La valoración es subjetiva. Exploramos tus propios recursos.'),
    choices:[
      I('My previous experience','Мой опыт','Mi experiencia'),
      I('One useful habit','Одна полезная привычка','Un hábito útil'),
      I('Someone’s support','Чья-то поддержка','El apoyo de alguien'),
      I('Hard to tell','Трудно сказать','Es difícil saberlo'),
    ],
  },
  reality_scale_high_v2:{
    prompt:I('What is working well enough that you would keep it?',
      'Что уже работает достаточно хорошо и что стоит сохранить?',
      '¿Qué funciona lo suficientemente bien como para conservarlo?'),
    reason:I('Your 0–10 self-rating is subjective, not a clinical score or proof that everything is going well.',
      'Ваша оценка 0–10 субъективна, это не клинический показатель и не доказательство, что всё хорошо.',
      'Tu escala 0–10 es subjetiva, no es clínica ni demuestra que todo vaya bien.'),
    choices:[
      I('A useful routine','Полезный распорядок','Una rutina útil'),
      I('A skill I use','Навык, который применяю','Una habilidad'),
      I('A supportive connection','Поддерживающая связь','Una relación de apoyo'),
      I('Not sure what helped','Не знаю, что помогло','No sé qué me ayudó'),
    ],
  },
  options_choice_v2:{
    prompt:I('What is a small, reversible way to explore this option?',
      'Как можно исследовать этот вариант небольшим обратимым шагом?',
      '¿Cómo explorar esta opción con un paso pequeño y reversible?'),
    reason:I('Exploring an option does not obligate you to do it.',
      'Рассмотрение варианта ещё не обязывает вас действовать.',
      'Explorar una opción no te compromete a hacerla.'),
    choices:[
      I('Try once for five minutes','Попробовать один раз пять минут','Probar cinco minutos'),
      I('Ask one factual question','Задать один конкретный вопрос','Hacer una pregunta concreta'),
      I('Compare two alternatives','Сравнить два варианта','Comparar dos opciones'),
      I('Pause and reconsider','Сделать паузу и переоценить','Hacer una pausa'),
    ],
  },
  options_text_v2:{
    prompt:I('What would you check before choosing the option you described?',
      'Что стоит проверить перед выбором описанного варианта?',
      '¿Qué comprobarías antes de elegir la opción descrita?'),
    reason:I('A check is a way to learn, not a judgment about your choice.',
      'Проверка помогает узнать больше, а не оценивает ваш выбор.',
      'Comprobar ayuda a aprender, no juzga tu elección.'),
    choices:[
      I('Time or cost','Время или стоимость','Tiempo o coste'),
      I('One important assumption','Одно важное предположение','Una suposición'),
      I('People involved','Участники ситуации','Las personas implicadas'),
      I('Whether I can reverse it','Можно ли передумать','Si puedo cambiar de idea'),
    ],
  },
  options_pause_v2:{
    prompt:I('If you choose to pause, what could tell you when to revisit this?',
      'Если вы решите сделать паузу, по какому признаку вернётесь к вопросу?',
      'Si decides pausar, ¿qué te indicaría que es momento de retomarlo?'),
    reason:I('Pausing can be a deliberate option; it is not an unfinished task.',
      'Пауза — тоже осознанный вариант, а не «невыполненное задание».',
      'Pausar también puede ser una decisión consciente.'),
    choices:[
      I('When new information appears','Когда появится новая информация','Cuando haya nueva información'),
      I('After a rest','После отдыха','Después de descansar'),
      I('At a time I choose later','В выбранное позже время','En un momento que elija'),
      I('No date yet','Без даты пока','Sin fecha por ahora'),
    ],
  },
  options_support_v2:{
    prompt:I('If you ask someone, what single question would be most useful?',
      'Если обратиться к человеку, какой один вопрос будет самым полезным?',
      'Si preguntas a alguien, ¿qué única pregunta sería más útil?'),
    reason:I('You chose to consider asking. You decide whether to contact anyone.',
      'Вы рассматриваете обращение. Связываться с человеком или нет — ваш выбор.',
      'Elegiste considerar preguntar. Tú decides si contactar a alguien.'),
    choices:[
      I('What do I need to know?','Что мне нужно узнать?','¿Qué necesito saber?'),
      I('What have you tried?','Что вы уже пробовали?','¿Qué has probado?'),
      I('Which option seems feasible?','Какой вариант посильнее?','¿Qué opción es viable?'),
      I('I may not ask anyone','Возможно, ни к кому не обращусь','Quizá no pregunte a nadie'),
    ],
  },
  options_learn_v2:{
    prompt:I('What one thing would be worth learning before a bigger decision?',
      'Что одно полезно узнать до более серьёзного решения?',
      '¿Qué convendría aprender antes de una decisión mayor?'),
    reason:I('You mentioned learning. Identify information you can check.',
      'Вы выбрали получение информации. Уточним, какой именно.',
      'Elegiste aprender. Identifica un dato que puedas comprobar.'),
    choices:[
      I('A practical example','Практический пример','Un ejemplo práctico'),
      I('Time or cost','Срок или стоимость','Tiempo o coste'),
      I('A person’s experience','Чужой опыт','La experiencia de alguien'),
      I('Whether it fits my goal','Подходит ли моей цели','Si encaja con mi meta'),
    ],
  },
  options_reframe_v2:{
    prompt:I('Which assumption would you want to test, rather than accept as fact?',
      'Какое предположение стоит проверить, а не принимать как факт?',
      '¿Qué suposición te gustaría comprobar, en vez de asumir que es cierta?'),
    reason:I('Your interpretation is worth exploring, not being corrected by a chatbot.',
      'Ваш взгляд можно исследовать, но не «исправлять» ботом.',
      'Tu perspectiva merece explorarse, no que la corrija un chatbot.'),
    choices:[
      I('What evidence do I have?','Какие у меня есть факты?','¿Qué pruebas tengo?'),
      I('What else might be possible?','Какое есть другое объяснение?','¿Qué más podría ser posible?'),
      I('What would change my mind?','Что изменило бы моё мнение?','¿Qué cambiaría mi opinión?'),
      I('I prefer my current view','Мне подходит мой взгляд','Prefiero mi perspectiva actual'),
    ],
  },
  options_time_v2:{
    prompt:I('Which small experiment would fit into your available time?',
      'Какой небольшой эксперимент впишется в доступное время?',
      '¿Qué experimento pequeño cabe en tu tiempo disponible?'),
    reason:I('You mentioned time. Choose a scale that suits you.',
      'Вы отметили время. Масштаб шага остаётся за вами.',
      'Mencionaste el tiempo. Tú eliges la escala del paso.'),
    choices:[
      I('Five-minute trial','Проба на пять минут','Prueba de cinco minutos'),
      I('One short message','Одно короткое сообщение','Un mensaje corto'),
      I('Write down two choices','Записать два варианта','Escribir dos opciones'),
      I('Not now','Не сейчас','Ahora no'),
    ],
  },
  options_clarity_v2:{
    prompt:I('Which single check could give you useful clarity?',
      'Какая одна проверка даст полезную ясность?',
      '¿Qué comprobación te daría claridad útil?'),
    reason:I('Uncertainty can be explored without committing to a final decision.',
      'Неопределённость можно изучать без окончательного решения.',
      'Puedes explorar las dudas sin una decisión definitiva.'),
    choices:[
      I('Verify a fact','Проверить факт','Comprobar un dato'),
      I('Compare two options','Сравнить два варианта','Comparar dos opciones'),
      I('Ask a neutral question','Задать нейтральный вопрос','Hacer una pregunta neutral'),
      I('I am not ready','Я пока не готов(а)','Aún no estoy listo/a'),
    ],
  },
  options_confidence_v2:{
    prompt:I('Which low-risk trial could you stop or change easily?',
      'Какую безопасную пробу можно легко остановить или изменить?',
      '¿Qué prueba de bajo riesgo podrías detener o modificar fácilmente?'),
    reason:I('You reported doubt. You choose whether any trial is right for you.',
      'Вы отметили сомнения. Только вы решаете, нужна ли проба.',
      'Mencionaste dudas. Tú decides si conviene probar algo.'),
    choices:[
      I('Practice privately','Потренироваться наедине','Practicar en privado'),
      I('Prepare a draft','Сделать черновик','Preparar un borrador'),
      I('Ask for feedback','Попросить обратную связь','Pedir comentarios'),
      I('I prefer to wait','Пока подожду','Prefiero esperar'),
    ],
  },
  options_stuck_v2:{
    prompt:I('What different first attempt could you consider?',
      'Какую другую первую попытку можно рассмотреть?',
      '¿Qué primer intento diferente podrías considerar?'),
    reason:I('You mentioned being stuck. This does not assume a cause.',
      'Вы описали остановку. Мы не предполагаем причину.',
      'Mencionaste estar bloqueado. No asumimos la causa.'),
    choices:[
      I('Make the task smaller','Уменьшить задачу','Hacer la tarea más pequeña'),
      I('Change the order','Изменить порядок','Cambiar el orden'),
      I('Ask for information','Запросить информацию','Pedir información'),
      I('Take a deliberate pause','Сделать осознанную паузу','Hacer una pausa consciente'),
    ],
  },
  options_resources_v2:{
    prompt:I('Which resource you already identified could support an option?',
      'Какой отмеченный ресурс поможет проверить один вариант?',
      '¿Qué recurso que identificaste podría apoyar una opción?'),
    reason:I('You named a resource; the next choice remains yours.',
      'Вы назвали ресурс; решение остаётся за вами.',
      'Mencionaste un recurso; la decisión sigue siendo tuya.'),
    choices:[
      I('Existing skills','Имеющийся навык','Una habilidad existente'),
      I('A past example','Пример из опыта','Un ejemplo previo'),
      I('Time already available','Уже свободное время','Tiempo disponible'),
      I('I prefer another way','Мне подходит другой путь','Prefiero otra vía'),
    ],
  },
  options_pair_time_clarity_v2:{
    prompt:I('What ten-minute check could reduce uncertainty without a big commitment?',
      'Какая проверка на десять минут уменьшит неопределённость без большого обязательства?',
      '¿Qué comprobación de diez minutos reduciría las dudas sin comprometerte demasiado?'),
    reason:I('Your answers mentioned limited time and uncertainty. Explore whether connecting them helps.',
      'В ответах встречаются нехватка времени и неопределённость. Проверьте, полезно ли их связать.',
      'Tus respuestas mencionan poco tiempo y dudas. Comprueba si conectarlas te ayuda.'),
    choices:[
      I('Check one fact','Проверить один факт','Comprobar un dato'),
      I('Ask one concise question','Задать один краткий вопрос','Hacer una pregunta breve'),
      I('List two options','Записать два варианта','Anotar dos opciones'),
      I('Not ready yet','Пока не готов(а)','Aún no'),
    ],
  },
  options_pair_time_confidence_v2:{
    prompt:I('Which five-minute reversible try could be possible despite limited time and doubt?',
      'Какая обратимая проба на пять минут возможна при нехватке времени и сомнениях?',
      '¿Qué prueba reversible de cinco minutos sería posible con poco tiempo y dudas?'),
    reason:I('You named both time and hesitation. This is a question to explore, not a verdict.',
      'Вы указали время и сомнения. Это вопрос для исследования, а не вывод о вас.',
      'Mencionaste tiempo y dudas. Es una pregunta, no un juicio.'),
    choices:[
      I('Draft without sending','Сделать черновик, не отправляя','Preparar un borrador sin enviarlo'),
      I('Test one tiny part','Проверить маленькую часть','Probar una parte pequeña'),
      I('Ask a factual question','Уточнить один факт','Preguntar un dato'),
      I('Choose to wait','Осознанно подождать','Elegir esperar'),
    ],
  },
  options_pair_clarity_confidence_v2:{
    prompt:I('What low-risk check could inform you without requiring certainty?',
      'Какая безопасная проверка даст информацию без требования полной уверенности?',
      '¿Qué comprobación de bajo riesgo te informaría sin exigir certeza?'),
    reason:I('You named uncertainty and hesitation. Only you decide if they are linked.',
      'Вы указали неясность и сомнения. Только вы решаете, связаны ли они.',
      'Mencionaste incertidumbre y dudas. Tú decides si están conectadas.'),
    choices:[
      I('Gather one example','Найти один пример','Buscar un ejemplo'),
      I('Ask for neutral feedback','Запросить нейтральный отклик','Pedir opinión neutral'),
      I('Try in private','Попробовать без зрителей','Probar en privado'),
      I('Keep thinking for now','Пока продолжить размышление','Seguir reflexionando'),
    ],
  },
  options_pair_time_stuck_v2:{
    prompt:I('What tiny alternative fits the time you have today?',
      'Какую крошечную альтернативу можно проверить за доступное сегодня время?',
      '¿Qué alternativa pequeña cabe en el tiempo de hoy?'),
    reason:I('Your answers included both time limits and feeling stuck. It might be helpful to test a smaller path.',
      'Вы указали и нехватку времени, и остановку. Возможно, поможет проверка меньшего шага.',
      'Mencionaste límites de tiempo y bloqueo. Quizá sirva probar algo menor.'),
    choices:[
      I('Two-minute beginning','Начать с двух минут','Empezar con dos minutos'),
      I('Switch the order','Изменить порядок','Cambiar el orden'),
      I('Drop a nonessential part','Убрать необязательную часть','Eliminar algo no esencial'),
      I('Rest and revisit','Отдохнуть и вернуться','Descansar y retomar'),
    ],
  },
})
// A one-line statement of purpose, not an extra question beneath the current
// question. Keeps the promise: one screen, one coaching question.
const stagePurposes={
  goal:I('Choose what matters; you are not committing yet.',
    'Определяем важное; пока без обязательств.','Define qué importa, sin comprometerte.'),
  reality:I('Name what is happening, without judging yourself.',
    'Замечаем происходящее без самооценки.','Observa lo que ocurre sin juzgarte.'),
  options:I('Explore possible paths before choosing one.',
    'Сначала рассмотрим варианты, не обязуясь их выполнять.','Explora opciones antes de elegir.'),
  action:I('Choose a feasible action or a conscious pause.',
    'Выберите посильный шаг или осознанную паузу.','Elige un paso viable o una pausa consciente.'),
  when:I('Choose a realistic moment; no reminder will be sent.',
    'Выберите реальный момент; напоминание не отправляется.','Elige un momento realista; no hay recordatorios.'),
  review:I('Check what helped, without forcing a positive result.',
    'Проверьте пользу без требования положительного результата.','Revisa la utilidad sin forzar un resultado positivo.'),
  scale:I('Your own 0–10 check-in, not a clinical measurement.',
    'Ваша субъективная шкала 0–10, не клиническое измерение.','Tu escala personal 0–10, no clínica.'),
}
export function coachingSlidePurpose(question,locale='en'){
  const lang=['en','ru','es'].includes(locale)?locale:'en'
  if(question?.type==='scale_0_10')return stagePurposes.scale[lang]
  const stage=coachingStageKey(question)
  return stagePurposes[stage]?.[lang]||''
}
function explicitChoice(answer){
  return typeof answer==='string'&&answer.startsWith('choice:')?answer.slice(7):null
}
const pairs=[
  {signals:['time','clarity'],key:'options_pair_time_clarity_v2'},
  {signals:['time','confidence'],key:'options_pair_time_confidence_v2'},
  {signals:['clarity','confidence'],key:'options_pair_clarity_confidence_v2'},
  {signals:['time','stuck'],key:'options_pair_time_stuck_v2'},
]
// This is a *question plan* based on explicit inputs, not a synthetic outcome.
// A valid context must contain the authored question and its already persisted answer.
// Only include answers at or before this step: editing a past step must not depend
// on answers from a later slide or on a private profile.
function contextualKey(question,answer,context,stage){
  const questions=context?.questions,answers=context?.answers
  if(!Array.isArray(questions)||!answers||typeof answers!=='object'||Array.isArray(answers))return null
  const index=questions.findIndex(item=>item?.id===question.id)
  if(index<0||answers[question.id]!==answer)return null
  const relevant=questions.slice(Math.max(0,index-5),index+1).map(item=>({
    step:String(item?.stepKey||item?.stage||''),
    choice:explicitChoice(answers[item.id]),
    cue:coachingExplicitCue(item,answers[item.id]),
  }))
  const current=relevant.at(-1)
  const cue=current?.cue||[...relevant].reverse().find(row=>row.cue)?.cue||null
  const anyDanger=questions.slice(0,index+1).some(item=>{
    const value=answers[item?.id]
    return typeof value==='string'&&urgent.test(value)
  })||typeof context.clientQuestion==='string'&&urgent.test(context.clientQuestion)
  if(anyDanger)return null
  if(stage==='reality'){
    if(question.type==='scale_0_10'){
      const raw=explicitChoice(answer)
      if(raw===null||! /^(?:10|[0-9])$/.test(raw))return null
      const score=Number(raw)
      return score<=3?'reality_scale_low_v2':score<=6?'reality_scale_mid_v2':'reality_scale_high_v2'
    }
    if(['uncertain','unsure','not_sure','unclear'].includes(current?.choice))return 'reality_clarity_v2'
    if(cue&&paths['reality_'+cue+'_v2'])return 'reality_'+cue+'_v2'
    return answer.startsWith('choice:')?'reality_choice_v2':'reality_text_v2'
  }
  if(stage==='options'){
    if(current?.choice==='pause')return 'options_pause_v2'
    if(current?.choice==='ask')return 'options_support_v2'
    if(current?.choice==='learn')return 'options_learn_v2'
    if(current?.choice==='reframe')return 'options_reframe_v2'
    const allCues=new Set(relevant.map(row=>row.cue).filter(Boolean))
    const pair=pairs.find(row=>row.signals.every(x=>allCues.has(x)))
    if(pair)return pair.key
    if(cue&&paths['options_'+cue+'_v2'])return 'options_'+cue+'_v2'
    return answer.startsWith('choice:')?'options_choice_v2':'options_text_v2'
  }
  return null
}
// Optional 4-choice + editable-text micro-slide. The original saved question
// and the published model are never replaced; never exceed existing caps.
export function contextualCoachingFollowup(question,answer,reflections={},context){
  if(!context||!question||typeof answer!=='string'||!answer.trim()||urgent.test(answer))return null
  const stage=coachingStageKey(question)
  if(stage!=='reality'&&stage!=='options')return null
  const rows=reflections&&typeof reflections==='object'&&!Array.isArray(reflections)
    ?Object.values(reflections).filter(row=>row&&typeof row==='object'):[]
  if(rows.length>=2||rows.some(row=>row.stage===stage))return null
  const key=contextualKey(question,answer,context,stage),path=paths[key]
  if(!path)return null
  return {key,questionId:question.id,stage,prompt:path.prompt,why:path.reason,
    choices:path.choices.map((label,index)=>({id:'reply_'+(index+1),label}))}
}

// One canonical answer-label and stage-semantic interpretation for the free
// guided question, action-plan seed and saved recap. No second inference engine.
export const displayCoachingAnswer=coachingAnswerText

// An action plan is always a *draft* until the user edits and confirms it.
// A due date (TGROW), a resource (OSKAR) and a strategic direction
// (Appreciative Inquiry) must never be auto-labelled as "my chosen action".
export function draftCoachingActionPlan(questions=[],answers={},clientQuestion='',locale='en'){
  // A question is not necessarily a goal; retain the API argument but never infer one.
  void clientQuestion
  const items=Array.isArray(questions)?questions:[]
  const rows=buildCoachingRecap({answers},items,locale)
  const direct=(steps,max)=>{
    for(const question of items){
      const step=String(question?.stepKey||question?.stage||'').toLowerCase()
      if(!steps.includes(step))continue
      const text=coachingAnswerText(answers?.[question?.id],question,locale)
      if(text)return text.slice(0,max)
    }
    return ''
  }
  const find=(key,max)=>String(rows.find(row=>row.key===key)?.value||'').slice(0,max)
  return {
    goal:direct(['goal','outcome','wish','preferred'],300),
    obstacle:direct(['obstacle','barrier'],300),
    actionText:find('action',300),
    when:find('timing',120),
    confidence:null,
  }
}

export const COACHING_P1_VERSION='hh-coaching-offline-p1-v1'

// Holistic House · Personal Coaching Session v1.
// A short, self-guided reflection built on the Goal–Reality–Options–Will coaching arc.
// These are editorial prompts, not a psychometric test, clinical advice or a live coach.
export const PERSONAL_COACH_VERSION = 1
export const PERSONAL_COACH_TEMPLATE = 'hh-personal-coaching-v1'
export const PERSONAL_COACH_QUESTIONS = Object.freeze([
  {
    id:'topic',stage:'goal',
    title:{en:'What matters today?',ru:'Что важно сегодня?',es:'¿Qué importa hoy?'},
    question:{en:'What would you like to work through in this conversation?',ru:'Какой вопрос вы хотите разобрать в этом разговоре?',es:'¿Qué tema te gustaría abordar en esta conversación?'},
    hint:{en:'Choose just one topic. A few words are enough.',ru:'Выберите только одну тему. Достаточно пары слов.',es:'Elige un solo tema. Bastan unas palabras.'},
    examples:{en:['A difficult decision','A work goal','A relationship conversation'],ru:['Трудное решение','Цель в работе','Разговор об отношениях'],es:['Una decisión difícil','Una meta laboral','Una conversación importante']},
    required:true,
  },
  {
    id:'outcome',stage:'goal',
    title:{en:'Your desired result',ru:'Желаемый результат',es:'El resultado deseado'},
    question:{en:'What would make this session useful for you?',ru:'Какой результат этой сессии был бы для вас полезным?',es:'¿Qué haría útil esta sesión para ti?'},
    hint:{en:'For example, more clarity or one realistic decision.',ru:'Например, ясность или одно реальное решение.',es:'Por ejemplo, más claridad o una decisión realista.'},
    examples:{en:['Choose a direction','Find one next step','Understand my priorities'],ru:['Выбрать направление','Найти следующий шаг','Понять приоритеты'],es:['Elegir un rumbo','Encontrar un paso','Aclarar prioridades']},
  },
  {
    id:'reality',stage:'reality',
    title:{en:'What is happening?',ru:'Что происходит сейчас?',es:'¿Qué está pasando?'},
    question:{en:'What is the situation right now, as you see it?',ru:'Как вы видите ситуацию сейчас?',es:'¿Cómo ves la situación ahora?'},
    hint:{en:'Describe the facts you know, without needing to explain everything.',ru:'Опишите известные факты. Не нужно объяснять всё.',es:'Describe los hechos conocidos. No necesitas contarlo todo.'},
    examples:{en:['I have two options','I feel stuck','Something has recently changed'],ru:['У меня два варианта','Я застрял(а)','Недавно что-то изменилось'],es:['Tengo dos opciones','Me siento bloqueado/a','Algo ha cambiado']},
  },
  {
    id:'obstacle',stage:'reality',
    title:{en:'What gets in the way?',ru:'Что мешает?',es:'¿Qué lo dificulta?'},
    question:{en:'What is the biggest obstacle you notice?',ru:'Какое главное препятствие вы замечаете?',es:'¿Cuál es el mayor obstáculo que notas?'},
    hint:{en:'You can name an uncertainty, a limitation or a missing resource.',ru:'Это может быть неопределённость, ограничение или нехватка ресурса.',es:'Puede ser una duda, un límite o un recurso que falta.'},
    examples:{en:['Not enough information','Fear of making a mistake','Too many priorities'],ru:['Не хватает информации','Страх ошибиться','Слишком много задач'],es:['Falta de información','Miedo a equivocarme','Demasiadas prioridades']},
  },
  {
    id:'options',stage:'options',
    title:{en:'Explore possibilities',ru:'Посмотрите на варианты',es:'Explora opciones'},
    question:{en:'What is one possible way forward?',ru:'Какой один вариант дальнейшего действия вы видите?',es:'¿Cuál es una posible forma de avanzar?'},
    hint:{en:'It is an option, not a promise. You can change it.',ru:'Это вариант, а не обещание. Его можно изменить.',es:'Es una opción, no una promesa. Puedes cambiarla.'},
    examples:{en:['Ask for advice','Try a small experiment','Gather the missing facts'],ru:['Попросить совета','Провести маленький эксперимент','Узнать недостающие факты'],es:['Pedir consejo','Probar algo pequeño','Reunir los datos que faltan']},
  },
  {
    id:'first_step',stage:'will',
    title:{en:'One small step',ru:'Один маленький шаг',es:'Un pequeño paso'},
    question:{en:'What is one small action you are willing to take?',ru:'Какое одно небольшое действие вы готовы сделать?',es:'¿Qué pequeña acción estás dispuesto/a a dar?'},
    hint:{en:'Choose something concrete and within your control.',ru:'Выберите конкретный шаг, который зависит от вас.',es:'Elige algo concreto que dependa de ti.'},
    examples:{en:['Write the first message','Spend 10 minutes planning','Make one phone call'],ru:['Написать первое сообщение','Планировать 10 минут','Сделать один звонок'],es:['Escribir un mensaje','Planear durante 10 minutos','Hacer una llamada']},
    required:true,
  },
  {
    id:'when',stage:'will',
    title:{en:'Make it practical',ru:'Сделайте шаг реальным',es:'Hazlo práctico'},
    question:{en:'When would be a realistic time to take that step?',ru:'Когда вам было бы реально сделать этот шаг?',es:'¿Cuándo sería realista dar ese paso?'},
    hint:{en:'You can adjust this later. There is no automatic reminder.',ru:'Это можно изменить. Автоматических напоминаний нет.',es:'Puedes cambiarlo después. No hay recordatorios automáticos.'},
    examples:{en:['Today','Tomorrow morning','This week'],ru:['Сегодня','Завтра утром','На этой неделе'],es:['Hoy','Mañana por la mañana','Esta semana']},
  },
])
export const PERSONAL_COACH_IDS = Object.freeze(PERSONAL_COACH_QUESTIONS.map(question=>question.id))
export function personalCoachQuestion(id) {
  return PERSONAL_COACH_QUESTIONS.find(question=>question.id===id)||null
}
export function personalCoachNextIndex(answers={}) {
  const next=PERSONAL_COACH_QUESTIONS.findIndex(question=>!Object.prototype.hasOwnProperty.call(answers,question.id))
  return next<0?PERSONAL_COACH_QUESTIONS.length-1:next
}

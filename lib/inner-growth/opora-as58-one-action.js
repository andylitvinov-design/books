// OPORA AS-5.8: one idea and one actual activity per step, across 7 skills twice.
// Editorial change only: does not change existing lesson IDs, session visit keys,
// historical choice meanings, or the 14-day course progress model.
// Day 4 is the single spoken-feeling transfer requested by the owner.
// Week 2 revisits each corresponding skill in a NEW everyday situation.
export const OPORA_ONE_ACTION_VERSION='as-5.8-one-action-20261023'
export const OPORA_EMOTION_DAYS=Object.freeze([4,11])
export const OPORA_PRIMARY_EMOTIONS=Object.freeze([
  {
    "value": "joy",
    "symbol": "☀️",
    "label": {
      "en": "Joy",
      "ru": "Радость",
      "es": "Alegría"
    }
  },
  {
    "value": "trust",
    "symbol": "🤝",
    "label": {
      "en": "Trust",
      "ru": "Доверие",
      "es": "Confianza"
    }
  },
  {
    "value": "fear",
    "symbol": "🌧️",
    "label": {
      "en": "Fear",
      "ru": "Страх",
      "es": "Miedo"
    }
  },
  {
    "value": "surprise",
    "symbol": "✨",
    "label": {
      "en": "Surprise",
      "ru": "Удивление",
      "es": "Sorpresa"
    }
  },
  {
    "value": "sadness",
    "symbol": "🌙",
    "label": {
      "en": "Sadness",
      "ru": "Грусть",
      "es": "Tristeza"
    }
  },
  {
    "value": "disgust",
    "symbol": "🍂",
    "label": {
      "en": "Disgust",
      "ru": "Отвращение",
      "es": "Rechazo"
    }
  },
  {
    "value": "anger",
    "symbol": "🔥",
    "label": {
      "en": "Anger",
      "ru": "Злость",
      "es": "Enojo"
    }
  },
  {
    "value": "anticipation",
    "symbol": "🌱",
    "label": {
      "en": "Anticipation",
      "ru": "Ожидание",
      "es": "Expectativa"
    }
  }
])
const DAYS=Object.freeze([
  {
    "day": 1,
    "skill": 1,
    "stage": "discover",
    "en": {
      "title": "A first look around",
      "practice": "Look slowly at three ordinary objects, one by one.",
      "transfer": "Before opening a familiar app, notice one colour nearby.",
      "result": "One everyday detail",
      "skill": "Notice early"
    },
    "ru": {
      "title": "Первый взгляд вокруг",
      "practice": "Медленно рассмотрите три обычных предмета по очереди.",
      "transfer": "Перед открытием знакомого приложения заметьте один цвет рядом.",
      "result": "Одна реальная деталь",
      "skill": "Замечать вовремя"
    },
    "es": {
      "title": "Mirar alrededor",
      "practice": "Mira despacio tres objetos cotidianos, uno por uno.",
      "transfer": "Antes de abrir una aplicación conocida, observa un color cercano.",
      "result": "Un detalle cotidiano",
      "skill": "Notar a tiempo"
    }
  },
  {
    "day": 2,
    "skill": 2,
    "stage": "discover",
    "en": {
      "title": "One clear outline",
      "practice": "Follow the outline of one nearby object with your eyes.",
      "transfer": "While a page is loading, look at the edge of one nearby object.",
      "result": "Оne visible outline",
      "skill": "Orient outside"
    },
    "ru": {
      "title": "Один чёткий контур",
      "practice": "Проследите глазами контур одного предмета рядом.",
      "transfer": "Пока загружается страница, посмотрите на край одного предмета.",
      "result": "Один видимый контур",
      "skill": "Находить внешний ориентир"
    },
    "es": {
      "title": "Un contorno claro",
      "practice": "Sigue con la mirada el contorno de un objeto cercano.",
      "transfer": "Mientras carga una página, mira el borde de un objeto.",
      "result": "Un contorno visible",
      "skill": "Orientarse afuera"
    }
  },
  {
    "day": 3,
    "skill": 3,
    "stage": "discover",
    "en": {
      "title": "Supported where you sit",
      "practice": "If comfortable, notice where the chair supports your body.",
      "transfer": "When you next sit down, notice the support beneath you.",
      "result": "Оne point of support",
      "skill": "Choose gentle support"
    },
    "ru": {
      "title": "Опора там, где вы сидите",
      "practice": "Если комфортно, заметьте, где стул поддерживает ваше тело.",
      "transfer": "Когда снова сядете, заметьте опору под собой.",
      "result": "Одна точка опоры",
      "skill": "Выбирать мягкую опору"
    },
    "es": {
      "title": "Apoyo al sentarte",
      "practice": "Si te resulta cómodo, nota dónde te sostiene la silla.",
      "transfer": "Al sentarte de nuevo, nota el apoyo bajo ti.",
      "result": "Un punto de apoyo",
      "skill": "Elegir apoyo suave"
    }
  },
  {
    "day": 4,
    "skill": 4,
    "stage": "discover",
    "en": {
      "title": "Give one feeling a name",
      "practice": "Quietly name one mild feeling you notice right now.",
      "transfer": "Before one ordinary task, say aloud the feeling you notice.",
      "result": "One feeling named",
      "skill": "Name a feeling"
    },
    "ru": {
      "title": "Дать чувству имя",
      "practice": "Тихо назовите одно несильное чувство, которое замечаете сейчас.",
      "transfer": "Перед одним привычным делом вслух назовите чувство, которое замечаете.",
      "result": "Одно названное чувство",
      "skill": "Называть чувство"
    },
    "es": {
      "title": "Nombrar una emoción",
      "practice": "Nombra en silencio una emoción leve que notes ahora.",
      "transfer": "Antes de una tarea habitual, di en voz alta la emoción que notes.",
      "result": "Una emoción nombrada",
      "skill": "Nombrar emociones"
    }
  },
  {
    "day": 5,
    "skill": 5,
    "stage": "discover",
    "en": {
      "title": "A thought is a thought",
      "practice": "Add “I am having the thought that…” to one mild worry.",
      "transfer": "When a small worry interrupts a routine task, call it a thought.",
      "result": "One thought noticed",
      "skill": "Unhook from thoughts"
    },
    "ru": {
      "title": "Мысль — это мысль",
      "practice": "Добавьте к одной небольшой тревоге: «Мне пришла мысль, что…».",
      "transfer": "Когда небольшая тревога отвлечёт от привычного дела, назовите её мыслью.",
      "result": "Одна замеченная мысль",
      "skill": "Отделять мысли от фактов"
    },
    "es": {
      "title": "Un pensamiento es un pensamiento",
      "practice": "Añade «Estoy teniendo el pensamiento de que…» a una preocupación leve.",
      "transfer": "Si una pequeña preocupación te distrae, llámala pensamiento.",
      "result": "Un pensamiento observado",
      "skill": "Tomar distancia de pensamientos"
    }
  },
  {
    "day": 6,
    "skill": 6,
    "stage": "discover",
    "en": {
      "title": "Permission to answer later",
      "practice": "Silently rehearse the sentence: “I can answer later.”",
      "transfer": "Before replying to a non-urgent message, allow one small pause.",
      "result": "One respectful phrase",
      "skill": "Respect a boundary"
    },
    "ru": {
      "title": "Можно ответить позже",
      "practice": "Мысленно произнесите: «Я могу ответить позже».",
      "transfer": "Перед ответом на несрочное сообщение разрешите себе маленькую паузу.",
      "result": "Одна бережная фраза",
      "skill": "Бережно обозначать границу"
    },
    "es": {
      "title": "Puedo responder después",
      "practice": "Ensaya en silencio: «Puedo responder después».",
      "transfer": "Antes de responder a un mensaje no urgente, permítete una pausa.",
      "result": "Una frase respetuosa",
      "skill": "Cuidar los límites"
    }
  },
  {
    "day": 7,
    "skill": 7,
    "stage": "discover",
    "en": {
      "title": "My useful pause",
      "practice": "Choose one pause that felt manageable this week.",
      "transfer": "Tomorrow, after one familiar routine, recall the pause you chose.",
      "result": "One pause chosen",
      "skill": "Choose your own tools"
    },
    "ru": {
      "title": "Моя подходящая пауза",
      "practice": "Выберите одну паузу, которая была посильной на этой неделе.",
      "transfer": "Завтра после привычного дела вспомните выбранную паузу.",
      "result": "Одна выбранная пауза",
      "skill": "Выбирать свои опоры"
    },
    "es": {
      "title": "Mi pausa posible",
      "practice": "Elige una pausa que te haya resultado posible esta semana.",
      "transfer": "Mañana, después de una rutina conocida, recuerda la pausa elegida.",
      "result": "Una pausa elegida",
      "skill": "Elegir tus recursos"
    }
  },
  {
    "day": 8,
    "skill": 1,
    "stage": "deepen",
    "en": {
      "title": "The first sign of hurry",
      "practice": "Notice one early sign that you are beginning to hurry.",
      "transfer": "When reaching for your phone, notice one sign of haste.",
      "result": "One early signal",
      "skill": "Notice early"
    },
    "ru": {
      "title": "Первый сигнал спешки",
      "practice": "Заметьте один ранний признак того, что начинаете спешить.",
      "transfer": "Когда потянетесь к телефону, заметьте один признак спешки.",
      "result": "Один ранний сигнал",
      "skill": "Замечать вовремя"
    },
    "es": {
      "title": "La primera señal de prisa",
      "practice": "Nota una señal temprana de que empiezas a apresurarte.",
      "transfer": "Al coger el teléfono, observa una señal de prisa.",
      "result": "Una señal temprana",
      "skill": "Notar a tiempo"
    }
  },
  {
    "day": 9,
    "skill": 2,
    "stage": "deepen",
    "en": {
      "title": "Find a new steady line",
      "practice": "Find one straight line in a part of the room you have not used yet.",
      "transfer": "While waiting for a call, find one steady edge near you.",
      "result": "One new visual anchor",
      "skill": "Orient outside"
    },
    "ru": {
      "title": "Новая устойчивая линия",
      "practice": "Найдите одну прямую линию в ещё не использованной части комнаты.",
      "transfer": "Ожидая звонка, найдите один ровный край рядом.",
      "result": "Один новый зрительный ориентир",
      "skill": "Находить внешний ориентир"
    },
    "es": {
      "title": "Una nueva línea estable",
      "practice": "Encuentra una línea recta en una parte distinta de la habitación.",
      "transfer": "Mientras esperas una llamada, encuentra un borde estable cerca.",
      "result": "Una nueva referencia visual",
      "skill": "Orientarse afuera"
    }
  },
  {
    "day": 10,
    "skill": 3,
    "stage": "deepen",
    "en": {
      "title": "One gentler movement",
      "practice": "If comfortable, soften the grip of one hand for a moment.",
      "transfer": "After using your phone, choose a more comfortable position for one hand.",
      "result": "One easier hand position",
      "skill": "Choose gentle support"
    },
    "ru": {
      "title": "Одно более мягкое движение",
      "practice": "Если комфортно, на мгновение ослабьте напряжение одной кисти.",
      "transfer": "После телефона выберите для одной руки более удобное положение.",
      "result": "Одно удобное положение кисти",
      "skill": "Выбирать мягкую опору"
    },
    "es": {
      "title": "Un movimiento más suave",
      "practice": "Si te resulta cómodo, afloja un instante una mano.",
      "transfer": "Después de usar el móvil, busca una postura más cómoda para una mano.",
      "result": "Una postura más cómoda",
      "skill": "Elegir apoyo suave"
    }
  },
  {
    "day": 11,
    "skill": 4,
    "stage": "deepen",
    "en": {
      "title": "A feeling without a verdict",
      "practice": "Name one mild emotion without labelling it good or bad.",
      "transfer": "When a small plan changes, notice one emotion without judging it.",
      "result": "One feeling without judgement",
      "skill": "Name a feeling"
    },
    "ru": {
      "title": "Чувство без оценки",
      "practice": "Назовите одну несильную эмоцию без оценки «хорошо» или «плохо».",
      "transfer": "Когда небольшой план изменится, заметьте одну эмоцию без оценки.",
      "result": "Одно чувство без оценки",
      "skill": "Называть чувство"
    },
    "es": {
      "title": "Una emoción sin juicio",
      "practice": "Nombra una emoción leve sin llamarla buena ni mala.",
      "transfer": "Si un pequeño plan cambia, observa una emoción sin juzgarla.",
      "result": "Una emoción sin juicio",
      "skill": "Nombrar emociones"
    }
  },
  {
    "day": 12,
    "skill": 5,
    "stage": "deepen",
    "en": {
      "title": "No need to obey a thought",
      "practice": "For a returning mild worry, say: “This is a thought, not an order.”",
      "transfer": "When a non-urgent task comes to mind, call it a thought rather than a command.",
      "result": "One thought with room to choose",
      "skill": "Unhook from thoughts"
    },
    "ru": {
      "title": "Мысли не обязательно подчиняться",
      "practice": "О небольшой повторяющейся тревоге скажите: «Это мысль, не приказ».",
      "transfer": "Когда вспомните несрочное дело, назовите его мыслью, а не приказом.",
      "result": "Одна мысль и право выбора",
      "skill": "Отделять мысли от фактов"
    },
    "es": {
      "title": "No tengo que obedecer la idea",
      "practice": "Ante una preocupación leve que vuelve, di: «Es un pensamiento, no una orden».",
      "transfer": "Cuando recuerdes algo no urgente, llámalo pensamiento y no mandato.",
      "result": "Un pensamiento y espacio para elegir",
      "skill": "Tomar distancia de pensamientos"
    }
  },
  {
    "day": 13,
    "skill": 6,
    "stage": "deepen",
    "en": {
      "title": "A boundary in a new moment",
      "practice": "Silently rehearse: “I need a little time” in one everyday example.",
      "transfer": "For a small request, use the phrase “I need a little time” only if it feels safe.",
      "result": "One boundary phrase in context",
      "skill": "Respect a boundary"
    },
    "ru": {
      "title": "Граница в новой ситуации",
      "practice": "Мысленно произнесите «Мне нужно немного времени» в одном бытовом примере.",
      "transfer": "В ответ на небольшую просьбу скажите «Мне нужно немного времени», только если безопасно.",
      "result": "Одна фраза в новой ситуации",
      "skill": "Бережно обозначать границу"
    },
    "es": {
      "title": "Un límite en otro momento",
      "practice": "Ensaya en silencio: «Necesito un poco de tiempo» en un ejemplo cotidiano.",
      "transfer": "Ante una petición pequeña, usa «Necesito un poco de tiempo» solo si es seguro.",
      "result": "Una frase en otro contexto",
      "skill": "Cuidar los límites"
    }
  },
  {
    "day": 14,
    "skill": 7,
    "stage": "deepen",
    "en": {
      "title": "My own OPORA toolkit",
      "practice": "Choose one supportive action you genuinely tried during the course.",
      "transfer": "Next week, return once to your chosen action if it feels useful.",
      "result": "One tried practice to take forward",
      "skill": "Choose your own tools"
    },
    "ru": {
      "title": "Моя собственная ОПОРА",
      "practice": "Выберите одно поддерживающее действие, которое действительно пробовали в курсе.",
      "transfer": "На следующей неделе один раз вернитесь к выбранному действию, если оно подходит.",
      "result": "Одна опробованная практика на будущее",
      "skill": "Выбирать свои опоры"
    },
    "es": {
      "title": "Mis propios recursos",
      "practice": "Elige una acción de apoyo que hayas probado de verdad en el curso.",
      "transfer": "La próxima semana, vuelve una vez a esa acción si te resulta útil.",
      "result": "Una práctica que sí probaste",
      "skill": "Elegir tus recursos"
    }
  }
])
export function oporaAs58Day(day,locale='en'){
  if(!Number.isInteger(day)||day<1||day>DAYS.length)return null
  const lang=locale==='ru'||locale==='es'?locale:'en'
  return {...DAYS[day-1][lang],day,skill:DAYS[day-1].skill,stage:DAYS[day-1].stage}
}
export function oporaAs58Valid(){
  const seen=new Set()
  return DAYS.length===14&&OPORA_PRIMARY_EMOTIONS.length===8&&
    DAYS.every((item,index)=>item.day===index+1&&item.skill===index%7+1&&
      item.stage===(index<7?'discover':'deepen')&&
      ['en','ru','es'].every(lang=>{
        const copy=item[lang]
        if(!copy||['title','practice','transfer','result','skill'].some(key=>
          typeof copy[key]!=='string'||copy[key].trim().length<7||copy[key].length>180))return false
        if(copy.practice===copy.transfer)return false
        seen.add(lang+':'+copy.practice)
        return true
      }))&&seen.size===42&&new Set(OPORA_PRIMARY_EMOTIONS.map(x=>x.value)).size===8
}

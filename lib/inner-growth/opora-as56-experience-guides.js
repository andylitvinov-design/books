// AS-5.7 · Calm Morning: one gentle action per screen, 14 days, EN/RU/ES.
// Presentation-only content; preserves existing AS-5.6 / AS-5.5 persistence enums.
// These are self-guided educational exercises, not clinical treatment.
export const OPORA_EXPERIENCE_DESIGN_VERSION = 'as-5.7-soft-morning';
const DAYS = Object.freeze([
  {
    "en": {
      "title": "Return to the present",
      "practice": "Slowly look at three things around you, one by one.",
      "purpose": "Stress can pull your attention into worries. Looking around can help you feel more grounded in the present—a skill we will use throughout the course.",
      "reminder": "When I hurry, I can pause before my next task."
    },
    "ru": {
      "title": "Вернуться в настоящий момент",
      "practice": "Медленно посмотрите по очереди на три предмета вокруг.",
      "purpose": "Стресс может уводить внимание в тревожные мысли. Замечая мир вокруг, можно мягко вернуться в настоящий момент и почувствовать больше опоры. Это базовый навык всего курса.",
      "reminder": "Когда я спешу, я могу сделать маленькую паузу."
    },
    "es": {
      "title": "Volver al presente",
      "practice": "Mira despacio tres cosas a tu alrededor, una por una.",
      "purpose": "El estrés puede llevar la atención a las preocupaciones. Mirar alrededor puede ayudarte a sentirte más presente y encontrar algo de apoyo. Practicaremos esta habilidad durante el curso.",
      "reminder": "Cuando tenga prisa, puedo hacer una pequeña pausa.",
      "quote": "Notar mi prisa a tiempo me da la oportunidad de hacer una pausa."
    }
  },
  {
    "en": {
      "title": "A steady detail",
      "practice": "Rest your gaze on the outline of one nearby object.",
      "reminder": "One ordinary object can bring my attention back here."
    },
    "ru": {
      "title": "Спокойный ориентир",
      "practice": "Остановите взгляд на контуре одного предмета рядом.",
      "reminder": "Обычный предмет помогает мне вернуться в настоящий момент."
    },
    "es": {
      "title": "Un punto tranquilo",
      "practice": "Detén la mirada en el contorno de un objeto cercano.",
      "reminder": "Un objeto sencillo puede traer mi atención al presente.",
      "quote": "Un detalle cotidiano puede ayudarme a volver al presente."
    }
  },
  {
    "en": {
      "title": "Feel supported",
      "practice": "If comfortable, notice where your body meets the chair or floor.",
      "reminder": "I can choose a position that feels a little easier."
    },
    "ru": {
      "title": "Почувствовать опору",
      "practice": "Если комфортно, заметьте, как стул или пол поддерживает тело.",
      "reminder": "Я могу выбрать чуть более удобное положение."
    },
    "es": {
      "title": "Sentir apoyo",
      "practice": "Si te resulta cómodo, nota el apoyo de la silla o del suelo.",
      "reminder": "Puedo elegir una postura un poco más cómoda.",
      "quote": "Puedo reducir el esfuerzo y elegir la pausa que me convenga."
    }
  },
  {
    "en": {
      "title": "Name the moment",
      "practice": "Quietly name one mild feeling that is here right now.",
      "reminder": "A feeling can be present without needing to change it."
    },
    "ru": {
      "title": "Назвать чувство",
      "practice": "Тихо назовите одно не слишком сильное чувство, которое сейчас есть.",
      "reminder": "Чувство можно заметить, не пытаясь его изменить."
    },
    "es": {
      "title": "Nombrar el momento",
      "practice": "Nombra en silencio una emoción suave que sientas ahora.",
      "reminder": "Puedo notar una emoción sin tener que cambiarla.",
      "quote": "Puedo reconocer una emoción y seguir eligiendo qué hacer."
    }
  },
  {
    "en": {
      "title": "Give thoughts space",
      "practice": "Before one mild worry, silently add: “I am having the thought that…”",
      "reminder": "A thought is not always a fact or an instruction."
    },
    "ru": {
      "title": "Дать мысли пространство",
      "practice": "Перед одной небольшой тревожной мыслью добавьте: «Мне пришла мысль, что…»",
      "reminder": "Не каждая мысль — факт или требование."
    },
    "es": {
      "title": "Dar espacio a un pensamiento",
      "practice": "Ante una preocupación leve, añade en silencio: «Estoy pensando que…»",
      "reminder": "Un pensamiento no siempre es un hecho ni una orden.",
      "quote": "No tengo que creer ni seguir cada pensamiento preocupante."
    }
  },
  {
    "en": {
      "title": "Take your time",
      "practice": "Silently practise saying: “I can answer later.”",
      "reminder": "I am allowed to take time before answering."
    },
    "ru": {
      "title": "Можно не спешить",
      "practice": "Мысленно произнесите: «Я могу ответить позже».",
      "reminder": "Мне можно взять время перед ответом."
    },
    "es": {
      "title": "Responder a tu ritmo",
      "practice": "Practica en silencio: «Puedo responder más tarde».",
      "reminder": "Puedo tomarme tiempo antes de responder.",
      "quote": "Puedo respetar a los demás y cuidar mi tiempo y energía."
    }
  },
  {
    "en": {
      "title": "Choose what helps",
      "practice": "Repeat one comfortable pause you discovered this week.",
      "reminder": "One familiar, manageable step is enough for today."
    },
    "ru": {
      "title": "Выбрать свою опору",
      "practice": "Повторите одну комфортную паузу, которая подошла вам на этой неделе.",
      "reminder": "На сегодня достаточно одного посильного шага."
    },
    "es": {
      "title": "Elegir lo que ayuda",
      "practice": "Repite una pausa cómoda que descubriste esta semana.",
      "reminder": "Hoy basta con un paso pequeño y posible.",
      "quote": "Un paso pequeño y posible basta para empezar a apoyarme."
    }
  },
  {
    "en": {
      "title": "Notice the first sign",
      "practice": "Notice one small sign that you may be starting to hurry.",
      "reminder": "An early signal can be an invitation to pause."
    },
    "ru": {
      "title": "Заметить первый сигнал",
      "practice": "Заметьте один небольшой признак того, что вы начинаете спешить.",
      "reminder": "Ранний сигнал может напомнить мне о паузе."
    },
    "es": {
      "title": "Notar la primera señal",
      "practice": "Observa una pequeña señal de que empiezas a apresurarte.",
      "reminder": "Una señal temprana puede recordarme hacer una pausa.",
      "quote": "Notar la prisa antes puede darme más opciones."
    }
  },
  {
    "en": {
      "title": "Look for steadiness",
      "practice": "Rest your gaze on one straight edge in the room.",
      "reminder": "I can return my attention to a steady detail."
    },
    "ru": {
      "title": "Найти устойчивость",
      "practice": "Остановите взгляд на одной ровной линии в комнате.",
      "reminder": "Я могу возвращать внимание к устойчивой детали."
    },
    "es": {
      "title": "Buscar estabilidad",
      "practice": "Detén la mirada en una línea recta de la habitación.",
      "reminder": "Puedo volver mi atención a un detalle estable.",
      "quote": "Puedo volver a algo real aunque sigan llegando pensamientos."
    }
  },
  {
    "en": {
      "title": "A gentler position",
      "practice": "If comfortable, let one hand relax for a moment.",
      "reminder": "Even a small adjustment may make room for ease."
    },
    "ru": {
      "title": "Более удобное положение",
      "practice": "Если комфортно, на мгновение расслабьте одну кисть.",
      "reminder": "Даже небольшая перемена может быть поддержкой."
    },
    "es": {
      "title": "Una postura más suave",
      "practice": "Si te resulta cómodo, relaja una mano un momento.",
      "reminder": "Un cambio pequeño también puede ayudar.",
      "quote": "Cada día puede necesitar un apoyo diferente."
    }
  },
  {
    "en": {
      "title": "Make room for feelings",
      "practice": "Quietly name one mild feeling without judging it.",
      "reminder": "I can acknowledge a feeling without fighting it."
    },
    "ru": {
      "title": "Дать место чувствам",
      "practice": "Тихо назовите одно не слишком сильное чувство без оценки.",
      "reminder": "Я могу признать чувство, не борясь с ним."
    },
    "es": {
      "title": "Dar lugar a las emociones",
      "practice": "Nombra en silencio una emoción suave sin juzgarla.",
      "reminder": "Puedo reconocer una emoción sin luchar contra ella.",
      "quote": "Una emoción puede estar presente sin decidir por mí."
    }
  },
  {
    "en": {
      "title": "A thought can pass",
      "practice": "Before one worry, silently say: “I notice a thought that…”",
      "reminder": "I can notice a worry and choose my next step."
    },
    "ru": {
      "title": "Мысль можно заметить",
      "practice": "Перед тревожной мыслью тихо скажите: «Я замечаю мысль, что…»",
      "reminder": "Я могу заметить тревогу и выбирать следующий шаг."
    },
    "es": {
      "title": "Observar un pensamiento",
      "practice": "Ante una preocupación, di en silencio: «Noto el pensamiento de que…»",
      "reminder": "Puedo notar una preocupación y elegir mi siguiente paso.",
      "quote": "Puedo notar una preocupación y actuar según mis valores."
    }
  },
  {
    "en": {
      "title": "A gentle boundary",
      "practice": "Silently practise saying: “I need a little time.”",
      "reminder": "I can respond kindly without rushing my answer."
    },
    "ru": {
      "title": "Бережная граница",
      "practice": "Мысленно произнесите: «Мне нужно немного времени».",
      "reminder": "Я могу отвечать доброжелательно и без спешки."
    },
    "es": {
      "title": "Un límite amable",
      "practice": "Practica en silencio: «Necesito un poco de tiempo».",
      "reminder": "Puedo responder con amabilidad y sin prisa.",
      "quote": "Puedo repetir un límite con calma si vuelven a pedirme algo."
    }
  },
  {
    "en": {
      "title": "Your own calm toolkit",
      "practice": "Repeat one gentle action that felt manageable during this course.",
      "reminder": "I can return to the small practice that suits me."
    },
    "ru": {
      "title": "Своя маленькая опора",
      "practice": "Повторите одно бережное действие, которое было посильным в этом курсе.",
      "reminder": "Я могу возвращаться к той практике, которая мне подходит."
    },
    "es": {
      "title": "Tus propios recursos",
      "practice": "Repite una acción suave que te haya resultado posible en este curso.",
      "reminder": "Puedo volver a la práctica pequeña que mejor me sirva.",
      "quote": "No necesito usarlo todo a la vez: un paso y una alternativa bastan."
    }
  }
]);

// Two concrete real-life options per day. The historic "reminder" remains
// unchanged for old transferChoice="one" receipts. New actions use "two"/"three".
const TRANSFER_CHOICES = Object.freeze([
  {
    "en": [
      "Before opening an app, look at three ordinary things nearby.",
      "After sitting down, take one unhurried look around."
    ],
    "ru": [
      "Перед открытием приложения найдите глазами три предмета рядом.",
      "Когда сядете, не спеша осмотритесь вокруг."
    ],
    "es": [
      "Antes de abrir una aplicación, mira tres objetos cercanos.",
      "Al sentarte, observa despacio el espacio que te rodea."
    ]
  },
  {
    "en": [
      "When leaving a screen, notice the outline of a nearby object.",
      "While waiting, trace the edge of a cup with your eyes."
    ],
    "ru": [
      "Отводя взгляд от экрана, заметьте контур ближайшего предмета.",
      "Во время ожидания рассмотрите глазами край чашки."
    ],
    "es": [
      "Al apartar la mirada de la pantalla, observa el contorno de un objeto.",
      "Mientras esperas, sigue con la vista el borde de una taza."
    ]
  },
  {
    "en": [
      "The next time you sit, adjust your position for comfort.",
      "During a quiet pause, notice how your feet meet the floor."
    ],
    "ru": [
      "Когда в следующий раз сядете, устройтесь чуть удобнее.",
      "Во время спокойной паузы заметьте опору стоп о пол."
    ],
    "es": [
      "La próxima vez que te sientes, busca una postura más cómoda.",
      "Durante una pausa tranquila, nota el apoyo de los pies en el suelo."
    ]
  },
  {
    "en": [
      "Before a routine task, quietly name one mild feeling.",
      "While making tea, notice a feeling without trying to change it."
    ],
    "ru": [
      "Перед привычным делом тихо назовите одно несильное чувство.",
      "Пока готовите чай, заметьте чувство, не стараясь его менять."
    ],
    "es": [
      "Antes de una tarea habitual, nombra en silencio una emoción leve.",
      "Al preparar té, observa una emoción sin tratar de cambiarla."
    ]
  },
  {
    "en": [
      "When a mild worry returns, label it as a thought.",
      "Before reacting to a worry, look at one ordinary object."
    ],
    "ru": [
      "Когда вернётся небольшая тревога, назовите её мыслью.",
      "Перед реакцией на тревожную мысль посмотрите на обычный предмет."
    ],
    "es": [
      "Cuando vuelva una preocupación leve, llámala pensamiento.",
      "Antes de reaccionar a una preocupación, mira un objeto cotidiano."
    ]
  },
  {
    "en": [
      "Before answering a message, allow yourself a moment to decide.",
      "For a small request, silently rehearse saying 'I can reply later'."
    ],
    "ru": [
      "Перед ответом на сообщение дайте себе время решить.",
      "На небольшую просьбу мысленно ответьте «Я могу ответить позже»."
    ],
    "es": [
      "Antes de responder a un mensaje, date un momento para decidir.",
      "Ante una petición pequeña, ensaya: «Puedo responder después»."
    ]
  },
  {
    "en": [
      "At midday, repeat the gentlest pause you tried this week.",
      "Before bed, note which small action felt manageable."
    ],
    "ru": [
      "В середине дня повторите самую комфортную паузу недели.",
      "Перед сном отметьте, какое маленькое действие было посильным."
    ],
    "es": [
      "A mediodía, repite la pausa más cómoda de la semana.",
      "Antes de dormir, recuerda qué gesto pequeño te resultó posible."
    ]
  },
  {
    "en": [
      "When you notice rushing, pause at the next safe moment.",
      "If you feel hurried, check what is happening around you."
    ],
    "ru": [
      "Заметив спешку, остановитесь в ближайший безопасный момент.",
      "Если торопитесь, ненадолго осмотритесь вокруг."
    ],
    "es": [
      "Si notas que te apresuras, haz una pausa cuando sea seguro.",
      "Cuando tengas prisa, observa brevemente lo que te rodea."
    ]
  },
  {
    "en": [
      "Between two tasks, rest your gaze on a steady line.",
      "While waiting, notice one straight edge of a nearby object."
    ],
    "ru": [
      "Между двумя делами посмотрите на ровную линию вокруг.",
      "Во время ожидания заметьте прямой край предмета рядом."
    ],
    "es": [
      "Entre dos tareas, mira un momento una línea estable.",
      "Mientras esperas, observa el borde recto de un objeto cercano."
    ]
  },
  {
    "en": [
      "When sitting, see if relaxing one hand feels comfortable.",
      "Before a familiar task, check whether another posture feels easier."
    ],
    "ru": [
      "Когда сидите, проверьте, комфортно ли немного расслабить кисть.",
      "Перед знакомым делом проверьте, удобно ли вам сидеть."
    ],
    "es": [
      "Al sentarte, prueba si es cómodo relajar una mano.",
      "Antes de una tarea conocida, observa si otra postura te ayuda."
    ]
  },
  {
    "en": [
      "In a quiet moment, name one mild feeling without judging it.",
      "After a small annoyance, notice your feeling before continuing."
    ],
    "ru": [
      "В спокойную минуту назовите одно несильное чувство без оценки.",
      "После мелкой неприятности заметьте чувство и продолжайте в своём темпе."
    ],
    "es": [
      "En un momento tranquilo, nombra una emoción leve sin juzgarla.",
      "Tras una pequeña molestia, observa tu emoción antes de seguir."
    ]
  },
  {
    "en": [
      "When a familiar worry appears, notice that it is a thought.",
      "Before the next step, look around and notice one real detail."
    ],
    "ru": [
      "Когда возникнет знакомая тревога, отметьте: это мысль.",
      "Перед следующим шагом осмотритесь и заметьте одну реальную деталь."
    ],
    "es": [
      "Cuando aparezca una preocupación conocida, nota que es un pensamiento.",
      "Antes del siguiente paso, mira a tu alrededor y observa un detalle real."
    ]
  },
  {
    "en": [
      "Before an easy reply, rehearse 'I need a little time'.",
      "If asked for a favour, notice whether a pause is possible."
    ],
    "ru": [
      "Перед несложным ответом мысленно скажите «Мне нужно немного времени».",
      "Когда вас попросят об услуге, проверьте, возможна ли пауза."
    ],
    "es": [
      "Antes de responder, ensaya «Necesito un poco de tiempo».",
      "Si te piden un favor, observa si puedes hacer una pausa."
    ]
  },
  {
    "en": [
      "Choose one familiar pause to keep for the coming week.",
      "Write down one supportive action you may return to."
    ],
    "ru": [
      "Выберите одну знакомую паузу на следующую неделю.",
      "Запишите одно поддерживающее действие, к которому можно вернуться."
    ],
    "es": [
      "Elige una pausa conocida para la próxima semana.",
      "Anota una acción de apoyo a la que te gustaría volver."
    ]
  }
]);

export function oporaExperienceTransferChoices(day, locale='en') {
  if (!Number.isInteger(day) || day<1 || day>TRANSFER_CHOICES.length) return [];
  const lang = locale==='ru'||locale==='es' ? locale : 'en';
  return TRANSFER_CHOICES[day-1][lang].map((label,index)=>({
    value:index===0?'two':'three',label,
  }));
}

/**
 * A concise, non-interactive explanation of the day’s skill on screen TWO.
 * This is not a task, an assessment, a treatment claim or evidence of practice.
 * Explain what learners will explore and why, without repeating the optional
 * `practice` task, collecting answers or changing saved progress.
 */
const DAY_SUPPORT = Object.freeze([
  {
    "en": {
      "title": "Why we start by looking around",
      "body": "Stress can pull attention into worried thoughts. Today we’ll practise noticing three nearby objects to bring attention back to the present. The goal is a simple pause, not forced calm."
    },
    "ru": {
      "title": "Зачем мы смотрим вокруг",
      "body": "Во время стресса внимание может застревать на тревожных мыслях. Сегодня мы научимся замечать три предмета рядом, чтобы возвращаться к тому, что происходит сейчас. Заставлять себя успокаиваться не нужно."
    },
    "es": {
      "title": "Por qué miramos a nuestro alrededor",
      "body": "El estrés puede llevar la atención a las preocupaciones. Hoy aprenderemos a notar tres objetos cercanos para volver al presente. La meta es tener una pausa sencilla, no forzar la calma."
    }
  },
  {
    "en": {
      "title": "A simple focus for busy thoughts",
      "body": "When thoughts jump between tasks, one familiar outline offers a place to focus. Today we’ll follow the edge of a nearby object with our eyes. This is a small way to return attention to the present."
    },
    "ru": {
      "title": "Простой ориентир для внимания",
      "body": "Когда мысли перескакивают с дела на дело, знакомый контур помогает найти точку внимания. Сегодня мы проследим глазами край одного предмета. Так можно ненадолго вернуться к тому, что рядом."
    },
    "es": {
      "title": "Un punto de atención sencillo",
      "body": "Cuando los pensamientos saltan entre tareas, un contorno conocido puede servir de referencia. Hoy seguiremos con la mirada el borde de un objeto cercano para volver al presente."
    }
  },
  {
    "en": {
      "title": "Notice what supports your body",
      "body": "Stress can leave the body tense even while sitting. Today we’ll notice where the chair supports us, if that feels comfortable. The aim is to recognise one real point of support, without changing our breathing."
    },
    "ru": {
      "title": "Замечаем реальную опору",
      "body": "После напряжённого дня тело может оставаться зажатым даже сидя. Сегодня мы заметим, где стул поддерживает нас, если это комфортно. Цель — найти одну точку опоры, не меняя дыхание."
    },
    "es": {
      "title": "Notar el apoyo del cuerpo",
      "body": "El estrés puede dejar el cuerpo tenso incluso al sentarnos. Hoy notaremos dónde nos sostiene la silla, si resulta cómodo. Buscamos reconocer un apoyo real, sin cambiar la respiración."
    }
  },
  {
    "en": {
      "title": "Give a feeling a simple name",
      "body": "An unclear feeling can be hard to understand. Today we’ll quietly name one mild emotion. This can help us recognise what is happening without needing to explain, judge or change the feeling."
    },
    "ru": {
      "title": "Понимаем чувство через название",
      "body": "Когда чувство непонятно, его трудно различить. Сегодня мы тихо назовём одну несильную эмоцию. Это помогает замечать переживание, не объясняя, не оценивая и не меняя его."
    },
    "es": {
      "title": "Una palabra para una emoción",
      "body": "Una emoción poco clara puede ser difícil de entender. Hoy pondremos nombre en silencio a una emoción leve. Así podemos reconocerla sin tener que explicarla, juzgarla ni cambiarla."
    }
  },
  {
    "en": {
      "title": "A worried thought is not a fact",
      "body": "A worry can sound like a fact or an urgent instruction. Today we’ll add “I am having the thought that…” to one mild worry. This helps us step back before deciding what to do next."
    },
    "ru": {
      "title": "Тревожная мысль — не факт",
      "body": "Тревожная мысль иногда звучит как факт или приказ. Сегодня мы добавим к небольшой тревоге фразу «Мне пришла мысль, что…». Так легче отделить мысль от решения, что делать дальше."
    },
    "es": {
      "title": "Una preocupación no es un hecho",
      "body": "Una preocupación puede sonar como un hecho o una orden. Hoy añadiremos «Estoy teniendo el pensamiento de que…» a una preocupación leve. Esto deja espacio para elegir qué hacer."
    }
  },
  {
    "en": {
      "title": "Make room before answering",
      "body": "Pressure to reply immediately can add stress. Today we’ll silently rehearse “I can answer later.” This gives us a simple phrase for allowing a little time before responding to someone."
    },
    "ru": {
      "title": "Можно дать себе время на ответ",
      "body": "Необходимость отвечать сразу может усиливать напряжение. Сегодня мы мысленно произнесём «Я могу ответить позже». Такая фраза помогает взять небольшую паузу перед ответом."
    },
    "es": {
      "title": "Un momento antes de responder",
      "body": "La presión de responder de inmediato puede aumentar el estrés. Hoy ensayaremos en silencio «Puedo responder después». Es una frase sencilla para darnos tiempo antes de contestar."
    }
  },
  {
    "en": {
      "title": "Choose a pause that fits real life",
      "body": "A technique is useful when it is manageable in everyday life. Today we’ll choose one short pause that worked for us this week. The aim is to keep a realistic option we can use again."
    },
    "ru": {
      "title": "Оставляем паузу, которая подходит",
      "body": "Приём полезен, когда его реально повторить в обычной жизни. Сегодня мы выберем одну посильную паузу из этой недели. Так останется понятный способ поддержать себя в другой день."
    },
    "es": {
      "title": "Una pausa útil para la vida real",
      "body": "Una técnica es útil si resulta posible en la vida diaria. Hoy elegiremos una pausa breve que nos haya servido esta semana. Así conservamos una opción realista para otra ocasión."
    }
  },
  {
    "en": {
      "title": "Spot the first sign of hurry",
      "body": "Rushing can begin before we realise we feel pressured. Today we’ll recognise one early sign that we are speeding up. Noticing it gives us a chance to choose a pause before the next task."
    },
    "ru": {
      "title": "Раньше замечаем спешку",
      "body": "Спешка иногда начинается раньше, чем мы осознаём напряжение. Сегодня мы найдём один ранний признак ускорения. Это даёт возможность сделать паузу до следующего дела."
    },
    "es": {
      "title": "Detectar la prisa al empezar",
      "body": "La prisa puede empezar antes de notar la presión. Hoy reconoceremos una primera señal de que aceleramos. Detectarla nos permite elegir una pausa antes de la siguiente tarea."
    }
  },
  {
    "en": {
      "title": "Find another place to focus",
      "body": "When attention scatters, a visible line can be a neutral point of focus. Today we’ll find a new straight line in the room. This gives us another simple way to turn attention toward what is here."
    },
    "ru": {
      "title": "Ещё одна точка для внимания",
      "body": "Когда внимание рассеивается, видимая линия может стать нейтральным ориентиром. Сегодня мы найдём новую прямую линию в комнате. Это ещё один простой способ сосредоточиться на том, что рядом."
    },
    "es": {
      "title": "Otro lugar donde enfocar la mirada",
      "body": "Cuando la atención se dispersa, una línea visible puede ser una referencia neutra. Hoy buscaremos otra línea recta en la habitación: una opción sencilla para enfocar lo que está aquí."
    }
  },
  {
    "en": {
      "title": "Ease one small movement",
      "body": "Tension may stay in the hands after a busy task. Today we’ll see whether loosening the grip of one hand feels comfortable. We are exploring one small choice, not trying to relax the whole body."
    },
    "ru": {
      "title": "Снижаем усилие в одном движении",
      "body": "После дел в кистях может оставаться напряжение. Сегодня мы проверим, комфортно ли немного ослабить хват одной руки. Мы учимся менять одно движение, а не заставлять всё тело расслабиться."
    },
    "es": {
      "title": "Aflojar solo un movimiento",
      "body": "La tensión puede quedarse en las manos después de una tarea. Hoy veremos si es cómodo aflojar un poco una mano. Exploramos un gesto pequeño, sin intentar relajar todo el cuerpo."
    }
  },
  {
    "en": {
      "title": "Notice feelings without grading them",
      "body": "Calling an emotion “bad” can add more pressure. Today we’ll name one mild feeling without judging it. This helps us observe our experience before choosing how to respond."
    },
    "ru": {
      "title": "Замечаем чувство без оценки",
      "body": "Оценка эмоции как «плохой» может добавить напряжения. Сегодня мы назовём одно несильное чувство без оценок. Это помогает сначала понять, что происходит, а потом выбирать реакцию."
    },
    "es": {
      "title": "Una emoción sin ponerle nota",
      "body": "Llamar «mala» a una emoción puede añadir presión. Hoy nombraremos una emoción leve sin juzgarla. Así practicamos observar lo que sentimos antes de elegir una respuesta."
    }
  },
  {
    "en": {
      "title": "A worry is not an instruction",
      "body": "A repeating worry can feel like an order to act. Today we’ll rehearse “This is a thought, not an order” with one mild worry. A thought can be present without deciding our next action."
    },
    "ru": {
      "title": "Не каждой мысли нужно подчиняться",
      "body": "Повторяющаяся тревожная мысль может звучать как приказ. Сегодня мы скажем о небольшой тревоге: «Это мысль, не приказ». Мысль можно заметить и всё же самостоятельно выбрать действие."
    },
    "es": {
      "title": "Una preocupación no da órdenes",
      "body": "Una preocupación repetida puede sonar como una orden. Hoy ensayaremos «Es un pensamiento, no una orden» ante una preocupación leve. La idea no tiene que decidir nuestra próxima acción."
    }
  },
  {
    "en": {
      "title": "A respectful way to set a boundary",
      "body": "Agreeing immediately can add pressure when we need more time. Today we’ll silently rehearse “I need a little time” for an everyday request. A short pause can be a respectful boundary."
    },
    "ru": {
      "title": "Мягкая граница без спешки",
      "body": "Согласие без паузы иногда создаёт лишнее давление. Сегодня мы мысленно повторим «Мне нужно немного времени» в обычной ситуации. Небольшая пауза может быть уважительной границей."
    },
    "es": {
      "title": "Un límite respetuoso y sencillo",
      "body": "Aceptar de inmediato puede añadir presión cuando necesitamos tiempo. Hoy ensayaremos en silencio «Necesito un poco de tiempo» ante una petición cotidiana. Una pausa también es un límite respetuoso."
    }
  },
  {
    "en": {
      "title": "Keep a skill you have actually tried",
      "body": "The goal of this course is not perfect calm. Today we’ll choose one supportive action we have genuinely tried. This gives us a realistic, familiar tool to carry into everyday life."
    },
    "ru": {
      "title": "Оставляем проверенный навык",
      "body": "Цель курса — не идеальное спокойствие. Сегодня мы выберем одно поддерживающее действие, которое действительно пробовали. Так у нас останется знакомый и посильный инструмент для обычной жизни."
    },
    "es": {
      "title": "Conservar una habilidad que ya probaste",
      "body": "La meta del curso no es estar siempre en calma. Hoy elegiremos una acción de apoyo que de verdad hayamos probado. Así tendremos una herramienta conocida y realista para la vida diaria."
    }
  }
]);

export function oporaExperienceSupport(day, locale='en') {
  if (!Number.isInteger(day) || day < 1 || day > DAY_SUPPORT.length) return null;
  const lang = locale === 'ru' || locale === 'es' ? locale : 'en';
  return DAY_SUPPORT[day - 1][lang];
}

export function oporaExperienceSupportValid() {
  const instruction = /^(?:try |look |notice |rest |choose |write |rate |tell |name |focus |repeat |take |breathe |remember |попробуй |посмотри |заметь |выбери |запиши |оцени |назови |сделай |mira |elige |prueba |nota |respira |escribe )/iu;
  return DAY_SUPPORT.length === 14 && DAY_SUPPORT.every(day =>
    ['en','ru','es'].every(lang => {
      const copy = day[lang];
      return copy && ['title','body'].every(key =>
        typeof copy[key] === 'string' && copy[key].length >= (key === 'title' ? 8 : 50) && copy[key].length <= 270 &&
        !copy[key].includes('\\n') && !instruction.test(copy[key]));
    }));
}

export function oporaExperienceDay(day, locale='en') {
  if (!Number.isInteger(day) || day < 1 || day > DAYS.length) return null;
  const lang = locale === 'ru' || locale === 'es' ? locale : 'en';
  return DAYS[day - 1][lang];
}
export function oporaExperienceGuide(day, locale='en') {
  return oporaExperienceDay(day, locale)?.practice || null;
}
export function oporaExperienceGuidesValid() {
  return DAYS.length===14 && TRANSFER_CHOICES.length===14 && TRANSFER_CHOICES.every(day =>
    ['en','ru','es'].every(lang => Array.isArray(day[lang]) && day[lang].length===2 &&
      day[lang].every(choice => typeof choice==='string' && choice.length>=25 && choice.length<=120) &&
      day[lang][0]!==day[lang][1])) && DAYS.every(day =>
    ['en','ru','es'].every(lang => {
      const row = day[lang];
      return row && ['title','practice','reminder'].every(k =>
        typeof row[k] === 'string' && row[k].trim().length >= (k === 'title' ? 8 : 18) &&
        row[k].trim().length <= 140 && !row[k].includes('\\n'));
    }));
}

// Additional day-specific learning context for the extended V7 player.
// Examples are fictional; no diagnosis, expected symptom change or inferred practice.
const DEEP_DAYS = Object.freeze({
  "en": [
    [
      "A familiar sight offers attention a place to rest. Nothing has to feel different for this to be worth exploring.",
      "You notice your mind racing before opening a message. Three ordinary objects are already in view.",
      "Look at just one colour or shape, without counting.",
      "When you begin an ordinary task, looking around can be one available pause."
    ],
    [
      "An ordinary outline can be a neutral point for your attention. Relaxation is not a requirement.",
      "You have a few seconds between tasks. The edge of a book or window is nearby.",
      "Notice a single colour instead of tracing an edge.",
      "While waiting for a page to load, one simple detail may be enough."
    ],
    [
      "The chair or floor is already doing some of the work of holding you up. You need not change your posture.",
      "You sit down after a busy conversation and realise you are still bracing.",
      "If body sensations feel uncomfortable, notice the shape of the chair instead.",
      "When you sit down later, a supported position is one possible option."
    ],
    [
      "Giving a mild feeling a name can make it easier to notice without arguing with it.",
      "You feel a little impatient while waiting and cannot quite tell why.",
      "Use a neutral word such as 'busy' or 'unsure', or only observe the room.",
      "During an everyday pause, feelings can be noticed without having to fix them."
    ],
    [
      "A thought is something you notice, not necessarily a fact or a command.",
      "You think 'I must do everything right now' before a routine task.",
      "Use a neutral example from a story instead of a personal worry.",
      "When a mild worry appears, you may add 'I am having the thought that…'."
    ],
    [
      "Giving yourself time to answer is a communication option, not a failure.",
      "A friend asks for a quick answer when your attention is elsewhere.",
      "Practise the phrase in your imagination; there is no need to say it aloud.",
      "In an ordinary conversation, you may choose to answer after a pause."
    ],
    [
      "Different practices suit different days. Choosing one manageable step is enough.",
      "Several things worked differently this week. One felt simpler than the rest.",
      "Recall a pleasant neutral image instead of repeating a body practice.",
      "When a familiar pause fits, you can use it again without keeping score."
    ],
    [
      "A small change in pace may be noticed before it turns into rushing.",
      "You reach for your phone and notice your movements getting faster.",
      "Notice one small movement rather than scanning the whole body.",
      "At a routine transition, you might recognise the first sign of hurry."
    ],
    [
      "A stable line can be a simple external cue without focusing on body sensations.",
      "Your attention jumps around while you wait for a call.",
      "Look at a soft shape or a colour instead of a straight edge.",
      "While waiting, a nearby object can be an optional anchor."
    ],
    [
      "Softening one small movement is different from forcing your whole body to relax.",
      "After typing, you notice your fingers are gripping the phone.",
      "Keep your hands as they are and notice a neutral object instead.",
      "Between small tasks, choose a position that feels manageable."
    ],
    [
      "A feeling can be present without needing to label it as good or bad.",
      "You are slightly disappointed by a change of plans.",
      "Use a neutral word or a fictional character's feeling instead.",
      "During ordinary changes, noticing is enough; no explanation is required."
    ],
    [
      "Thoughts may come and go without needing an immediate response.",
      "A small unfinished task keeps popping into your mind.",
      "Practise with an invented sentence instead of a personal worry.",
      "At a routine pause, you might say 'I notice a thought that…'."
    ],
    [
      "Asking for a little time can be a respectful boundary, not rejection.",
      "A colleague asks a question while you are concentrating.",
      "Imagine the phrase silently rather than saying it to anyone.",
      "For low-stakes requests, you can choose a gentle pause before answering."
    ],
    [
      "Your own toolkit can include more than one option; you do not have to use them all.",
      "Looking back over the course, you remember one small moment that felt possible.",
      "Pick a completely neutral visual cue if earlier practices did not suit you.",
      "After the course, returning to one comfortable skill is always optional."
    ]
  ],
  "ru": [
    [
      "Знакомый предмет даёт вниманию простую точку опоры. Вам необязательно чувствовать изменения.",
      "Перед обычным сообщением мысли начинают спешить. Рядом уже есть три простых предмета.",
      "Посмотрите на один цвет или форму, не считая предметы.",
      "Перед привычным делом можно просто на мгновение оглядеться."
    ],
    [
      "Контур предмета — нейтральный ориентир для внимания. Расслабление не является условием.",
      "Между двумя делами есть несколько секунд. Рядом край книги или окна.",
      "Вместо контура заметьте один цвет.",
      "Пока загружается страница, можно заметить одну обычную деталь."
    ],
    [
      "Стул или пол уже поддерживают тело. Менять позу специально необязательно.",
      "После занятого разговора вы присели, но всё ещё ощущаете напряжение.",
      "Если ощущения тела неприятны, посмотрите на форму стула.",
      "Когда сядете позже, можно выбрать положение, в котором легче."
    ],
    [
      "Мягкое название чувства помогает его заметить, не споря с ним.",
      "В ожидании возникает лёгкое нетерпение, но не совсем ясно почему.",
      "Можно выбрать нейтральное слово «спешка» или «не знаю» — либо просто смотреть вокруг.",
      "В обычной паузе чувство можно заметить, не пытаясь его исправить."
    ],
    [
      "Мысль — это событие в сознании, а не обязательно факт или приказ.",
      "Перед простым делом появляется мысль: «Я обязан всё сделать немедленно».",
      "Вместо личной тревоги возьмите пример из вымышленной истории.",
      "При небольшой тревоге можно добавить: «Мне пришла мысль, что…»"
    ],
    [
      "Время на ответ — допустимый вариант общения, а не неудача.",
      "Знакомый ждёт быстрого ответа, когда вы заняты другим.",
      "Повторите фразу мысленно, произносить её вслух не нужно.",
      "В обычном разговоре можно выбрать небольшую паузу перед ответом."
    ],
    [
      "В разные дни подходят разные практики. Одного посильного шага достаточно.",
      "На этой неделе какие-то упражнения давались легче других.",
      "Вместо телесной практики вспомните приятный нейтральный образ.",
      "Когда знакомая пауза подходит, к ней можно вернуться без оценок."
    ],
    [
      "Небольшое ускорение иногда можно заметить ещё до ощущения спешки.",
      "Вы тянетесь за телефоном и замечаете, что движения становятся резче.",
      "Заметьте одно движение вместо наблюдения за всем телом.",
      "При переходе между делами можно замечать первый признак спешки."
    ],
    [
      "Устойчивая линия — простой внешний ориентир без внимания к телу.",
      "В ожидании звонка внимание перескакивает с одного на другое.",
      "Вместо прямой линии рассмотрите мягкую форму или цвет.",
      "Во время ожидания предмет рядом может стать необязательной опорой."
    ],
    [
      "Смягчить одно движение — не то же самое, что заставить всё тело расслабиться.",
      "После набора текста вы замечаете, что сильно держите телефон.",
      "Оставьте руки как есть и посмотрите на нейтральный предмет.",
      "Между делами можно выбрать посильное и удобное положение."
    ],
    [
      "Чувство может присутствовать, даже если не оценивать его как хорошее или плохое.",
      "Планы немного изменились, и возникло лёгкое разочарование.",
      "Возьмите нейтральное слово или чувство героя вымышленной истории.",
      "Когда что-то меняется, достаточно заметить чувство без объяснений."
    ],
    [
      "Мысли могут появляться и уходить, не требуя немедленной реакции.",
      "Незаконченное небольшое дело снова приходит на ум.",
      "Вместо личной заботы попробуйте вымышленное предложение.",
      "В обычной паузе можно сказать: «Я замечаю мысль, что…»"
    ],
    [
      "Попросить немного времени — бережная граница, а не отказ от общения.",
      "Коллега задаёт вопрос, пока вы сосредоточены на задаче.",
      "Мысленно представьте фразу, не произнося её вслух.",
      "В простой просьбе можно дать себе время перед ответом."
    ],
    [
      "Личная коллекция опор может включать разные варианты. Использовать все необязательно.",
      "Вспоминая курс, вы находите один небольшой момент, который был посильным.",
      "Если прежние упражнения не подошли, выберите нейтральный зрительный ориентир.",
      "После курса можно возвращаться к одному удобному навыку по желанию."
    ]
  ],
  "es": [
    [
      "Algo familiar ofrece un punto sencillo para la atención. No necesitas sentir un cambio.",
      "Antes de abrir un mensaje, notas que tu mente se acelera. Ya hay tres objetos cerca.",
      "Mira un solo color o una forma, sin contar.",
      "Al empezar una tarea cotidiana, mirar alrededor es una pausa posible."
    ],
    [
      "El contorno de un objeto puede ser una referencia neutra. No tienes que relajarte.",
      "Hay unos segundos entre tareas. Cerca está el borde de un libro o ventana.",
      "Observa un color en lugar del contorno.",
      "Mientras carga una página, basta con notar un detalle sencillo."
    ],
    [
      "La silla o el suelo ya te sostienen. No necesitas cambiar de postura.",
      "Te sientas tras una conversación ajetreada y aún notas tensión.",
      "Si las sensaciones corporales incomodan, observa la silla.",
      "Al sentarte después, puedes escoger una postura que te resulte cómoda."
    ],
    [
      "Poner nombre a una emoción leve ayuda a notarla sin discutir con ella.",
      "Esperas un momento y notas algo de impaciencia.",
      "Usa una palabra neutra, como «no sé», o solo mira a tu alrededor.",
      "En una pausa cotidiana, puedes notar una emoción sin arreglarla."
    ],
    [
      "Un pensamiento no siempre es un hecho ni una orden.",
      "Antes de una tarea aparece: «Tengo que hacerlo todo ahora».",
      "Usa un ejemplo ficticio en lugar de una preocupación personal.",
      "Si llega una preocupación leve, puedes pensar: «Estoy pensando que…»"
    ],
    [
      "Tomarte tiempo para responder es una opción, no un fallo.",
      "Alguien espera una respuesta rápida mientras estás ocupado.",
      "Imagina la frase en silencio, sin decirla en voz alta.",
      "En una charla cotidiana, puedes hacer una pausa antes de responder."
    ],
    [
      "No todas las prácticas sirven igual cada día. Basta con una opción pequeña.",
      "Esta semana algunos ejercicios te resultaron más sencillos que otros.",
      "Recuerda una imagen neutra en lugar de hacer una práctica corporal.",
      "Puedes volver a una pausa conocida sin evaluarte."
    ],
    [
      "A veces puedes notar un pequeño cambio de ritmo antes de tener prisa.",
      "Coges el teléfono y notas que los movimientos se aceleran.",
      "Observa un solo movimiento, sin recorrer todo el cuerpo.",
      "Entre tareas, quizá notes la primera señal de prisa."
    ],
    [
      "Una línea estable puede ser una referencia externa sencilla.",
      "La atención salta de un lado a otro mientras esperas una llamada.",
      "Mira una forma suave o un color en lugar de una línea.",
      "Al esperar, un objeto cercano puede servir de referencia opcional."
    ],
    [
      "Suavizar un gesto no significa obligar al cuerpo entero a relajarse.",
      "Tras escribir, notas que aprietas el teléfono con fuerza.",
      "Deja las manos como están y observa un objeto neutro.",
      "Entre tareas, puedes elegir una postura cómoda."
    ],
    [
      "Puedes notar una emoción sin juzgarla como buena o mala.",
      "Un pequeño cambio de planes te produce algo de decepción.",
      "Usa una palabra neutra o una emoción de un personaje ficticio.",
      "Ante un cambio cotidiano, basta con notar lo que aparece."
    ],
    [
      "Los pensamientos pueden venir e ir sin exigir una respuesta inmediata.",
      "Una pequeña tarea pendiente vuelve una y otra vez a tu mente.",
      "Usa una frase imaginaria en vez de una preocupación personal.",
      "En una pausa, puedes decir: «Noto un pensamiento que…»"
    ],
    [
      "Pedir un poco de tiempo puede ser un límite amable, no un rechazo.",
      "Alguien te pregunta algo mientras estás concentrado.",
      "Practica la frase mentalmente, sin decírsela a nadie.",
      "Ante una petición sencilla, puedes elegir una pausa antes de responder."
    ],
    [
      "Tus recursos pueden incluir varias opciones; no necesitas usarlas todas.",
      "Al recordar el curso, aparece un momento pequeño que te resultó posible.",
      "Si nada encajó, elige una referencia visual neutra.",
      "Después del curso, puedes volver a una práctica cómoda cuando quieras."
    ]
  ]
})
export function oporaExperienceDepth(day,locale='en') {
  if(!Number.isInteger(day)||day<1||day>14)return null
  const lang=locale==='ru'||locale==='es'?locale:'en'
  const [why,scenario,alternative,everyday]=DEEP_DAYS[lang][day-1]
  return {why,scenario,alternative,everyday}
}
export function oporaExperienceDepthValid() {
  return ['en','ru','es'].every(lang=>DEEP_DAYS[lang].length===14 &&
    DEEP_DAYS[lang].every(row=>row.length===4 && row.every(value=>
      typeof value==='string' && value.length>=28 && value.length<=340)))
}

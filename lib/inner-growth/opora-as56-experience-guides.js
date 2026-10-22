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
 * A non-interactive moment of acceptance on screen TWO of every day.
 * This is not a task, an assessment, a treatment claim or evidence of practice.
 * Keep it separate from the actual optional `practice` screen and its signals.
 */
const DAY_SUPPORT = Object.freeze([
  {
    en: {title: "A moment to arrive", body: 'There is room here for a busy mind, tiredness or uncertainty. You do not have to feel calm or make anything better before you are worthy of care.'},
    ru: {title: "Момент для начала", body: 'Здесь есть место и тревоге, и усталости, и неопределённости. Необязательно чувствовать спокойствие или что-то исправлять, чтобы заслуживать заботу.'},
    es: {title: "Un momento para llegar", body: 'Aquí hay espacio para el cansancio, las dudas y una mente inquieta. No necesitas sentir calma ni cambiar nada para merecer cuidado.'},
  },
  {
    en: {title: "Space for a busy mind", body: 'Even if your thoughts feel scattered, there is no test of calm here. You are allowed to be exactly where you are today; steadiness is not something you owe anyone.'},
    ru: {title: "Когда мысли разбегаются", body: 'Даже если мысли разбегаются, здесь не нужно доказывать своё спокойствие. Можно быть в своём сегодняшнем состоянии. Устойчивость — не обязанность.'},
    es: {title: "Espacio para una mente inquieta", body: 'Aunque tus pensamientos estén dispersos, aquí nadie te examina por tu calma. Puedes estar tal como te sientes hoy. La serenidad no es una obligación.'},
  },
  {
    en: {title: "A moment of comfort", body: 'You deserve moments of comfort on difficult days, too. A tense or tired body is not a failure, and there is nothing you need to prove.'},
    ru: {title: "Немного комфорта", body: 'Уют и забота нужны не только в хорошие дни. Напряжение или усталость тела не означают неудачу. Здесь не нужно ничего доказывать.'},
    es: {title: "Un momento de comodidad", body: 'También mereces consuelo en los días difíciles. Un cuerpo tenso o cansado no es un fracaso, y no tienes que demostrar nada.'},
  },
  {
    en: {title: "A moment with your feelings", body: 'Sadness, relief, hesitation or simply not knowing can all belong to this moment. Your feelings do not have to be clear or pleasant to deserve kindness.'},
    ru: {title: "Рядом с чувствами", body: 'Грусть, облегчение, сомнение и даже непонимание своих чувств допустимы. Чувства не обязаны быть ясными или приятными, чтобы отнестись к себе по-доброму.'},
    es: {title: "Un momento con tus emociones", body: 'La tristeza, el alivio, las dudas e incluso no saber qué sientes tienen cabida aquí. Una emoción no necesita ser clara ni agradable para merecer amabilidad.'},
  },
  {
    en: {title: "When thoughts are loud", body: 'A worried thought can be loud without being the whole truth about you. You do not have to solve, follow or argue with every thought.'},
    ru: {title: "Когда мысли тревожат", body: 'Тревожная мысль бывает громкой, но не определяет вас целиком. Нет необходимости решать каждую мысль, верить ей или спорить с ней.'},
    es: {title: "Cuando los pensamientos inquietan", body: 'Una preocupación puede sonar muy fuerte sin contar toda la verdad sobre ti. No tienes que resolver, seguir ni discutir cada pensamiento.'},
  },
  {
    en: {title: "At your own pace", body: 'Needing time is not letting anyone down. Your worth does not depend on how quickly you respond, decide or move forward.'},
    ru: {title: "В своём темпе", body: 'Потребность во времени не делает вас менее надёжным человеком. Ваша ценность не зависит от скорости ответа, решения или движения вперёд.'},
    es: {title: "A tu ritmo", body: 'Necesitar tiempo no significa decepcionar a nadie. Tu valor no depende de la rapidez con la que respondas, decidas o avances.'},
  },
  {
    en: {title: "When the answer is unclear", body: 'Some days it is hard to tell what would help. An unfinished answer is still an honest one. You are not behind.'},
    ru: {title: "Когда ответа пока нет", body: 'Иногда трудно понять, что именно поддержит. Незавершённый ответ тоже может быть честным. Вы никуда не опоздали.'},
    es: {title: "Cuando no hay respuesta", body: 'Algunos días cuesta saber qué ayudaría. Una respuesta incompleta también puede ser sincera. No te has quedado atrás.'},
  },
  {
    en: {title: "On hurried days", body: 'A rushed or difficult day does not erase your strengths. There is no pace you must keep up with, here or anywhere else.'},
    ru: {title: "В суетливый день", body: 'Суетливый или трудный день не отменяет ваши сильные стороны. Здесь не нужно поспевать за чужим ритмом или соответствовать планке.'},
    es: {title: "En los días de prisa", body: 'Un día difícil o acelerado no borra tus fortalezas. Aquí no hay un ritmo ajeno que debas alcanzar.'},
  },
  {
    en: {title: "During quiet change", body: 'Not every meaningful moment feels different straight away. Even when nothing appears to change, your experience still matters.'},
    ru: {title: "Когда перемены незаметны", body: 'Не каждый важный момент сопровождается ощутимыми переменами. Даже когда кажется, что ничего не меняется, ваш опыт остаётся значимым.'},
    es: {title: "Cuando el cambio es discreto", body: 'No todos los momentos valiosos se sienten distintos al instante. Aunque parezca que nada cambia, tu experiencia sigue importando.'},
  },
  {
    en: {title: "A pause for the body", body: 'Your body does not owe anyone constant effort. Ease, ordinary rest and gentleness belong in everyday life, not only after a task is done.'},
    ru: {title: "Пауза для тела", body: 'Тело не обязано постоянно напрягаться ради результата. Удобство, обычный отдых и бережность имеют место в жизни не только после выполненных дел.'},
    es: {title: "Una pausa para el cuerpo", body: 'Tu cuerpo no le debe esfuerzo constante a nadie. El descanso y la suavidad también tienen lugar antes de terminar una tarea.'},
  },
  {
    en: {title: "With mixed feelings", body: 'There is no deadline for understanding what you feel. Uncertainty and mixed emotions can exist without needing an immediate answer.'},
    ru: {title: "С разными чувствами", body: 'Не существует срока, к которому нужно разобраться в своих чувствах. Неопределённость и смешанные переживания могут быть рядом без немедленного ответа.'},
    es: {title: "Con emociones mezcladas", body: 'No hay una fecha límite para comprender lo que sientes. La incertidumbre y las emociones mezcladas pueden existir sin una respuesta inmediata.'},
  },
  {
    en: {title: "With a worried thought", body: 'An anxious idea is something you experience, not all that you are. You do not have to defeat it in order to deserve some peace.'},
    ru: {title: "Когда появилась тревожная мысль", body: 'Тревожная мысль — лишь часть переживания, а не вся ваша личность. Не нужно побеждать её, чтобы иметь право на покой.'},
    es: {title: "Con un pensamiento inquieto", body: 'Una idea inquietante es parte de lo que experimentas, no todo lo que eres. No tienes que vencerla para merecer tranquilidad.'},
  },
  {
    en: {title: "When someone asks", body: 'Having limits does not make you unkind. Your time, energy and comfort matter, even when other people need something from you.'},
    ru: {title: "Когда от вас чего-то ждут", body: 'Личные пределы не делают вас чёрствым человеком. Ваше время, силы и комфорт важны, даже когда от вас чего-то ждут.'},
    es: {title: "Cuando alguien te pide algo", body: 'Tener límites no te hace menos amable. Tu tiempo, tu energía y tu comodidad importan, aunque otras personas necesiten algo de ti.'},
  },
  {
    en: {title: "Looking back together", body: 'Some days may have felt easier, and others less so. None of that is a verdict on you. What you have learned remains yours, without a final test.'},
    ru: {title: "Оглядываясь на путь", body: 'Одни дни могли даваться легче, другие — сложнее. Это не оценка вас как человека. То, что оказалось важным, остаётся с вами без итогового экзамена.'},
    es: {title: "Mirando el camino recorrido", body: 'Algunos días habrán sido más fáciles que otros. Nada de eso es un juicio sobre ti. Lo que ha sido valioso sigue contigo, sin examen final.'},
  },
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

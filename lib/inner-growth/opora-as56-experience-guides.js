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

/**
 * A non-interactive moment of acceptance on screen TWO of every day.
 * This is not a task, an assessment, a treatment claim or evidence of practice.
 * Keep it separate from the actual optional `practice` screen and its signals.
 */
const DAY_SUPPORT = Object.freeze([
  {
    en: {title: 'You can begin as you are', body: 'There is room here for a busy mind, tiredness or uncertainty. You do not have to feel calm or make anything better before you are worthy of care.'},
    ru: {title: 'Можно быть здесь по-разному', body: 'Здесь есть место и тревоге, и усталости, и неопределённости. Необязательно чувствовать спокойствие или что-то исправлять, чтобы заслуживать заботу.'},
    es: {title: 'Puedes empezar tal como estás', body: 'Aquí hay espacio para el cansancio, las dudas y una mente inquieta. No necesitas sentir calma ni cambiar nada para merecer cuidado.'},
  },
  {
    en: {title: "You don't have to hold everything together", body: 'Even if your thoughts feel scattered, there is no test of calm here. You are allowed to be exactly where you are today; steadiness is not something you owe anyone.'},
    ru: {title: 'Не нужно всё держать под контролем', body: 'Даже если мысли разбегаются, здесь не нужно доказывать своё спокойствие. Можно быть в своём сегодняшнем состоянии. Устойчивость — не обязанность.'},
    es: {title: 'No tienes que mantenerlo todo bajo control', body: 'Aunque tus pensamientos estén dispersos, aquí nadie te examina por tu calma. Puedes estar tal como te sientes hoy. La serenidad no es una obligación.'},
  },
  {
    en: {title: 'Support is not a reward', body: 'You deserve moments of comfort on difficult days, too. A tense or tired body is not a failure, and there is nothing you need to prove.'},
    ru: {title: 'Поддержку не нужно заслуживать', body: 'Уют и забота нужны не только в хорошие дни. Напряжение или усталость тела не означают неудачу. Здесь не нужно ничего доказывать.'},
    es: {title: 'El apoyo no es una recompensa', body: 'También mereces consuelo en los días difíciles. Un cuerpo tenso o cansado no es un fracaso, y no tienes que demostrar nada.'},
  },
  {
    en: {title: 'There is room for every feeling', body: 'Sadness, relief, hesitation or simply not knowing can all belong to this moment. Your feelings do not have to be clear or pleasant to deserve kindness.'},
    ru: {title: 'Для каждого чувства есть место', body: 'Грусть, облегчение, сомнение и даже непонимание своих чувств допустимы. Чувства не обязаны быть ясными или приятными, чтобы отнестись к себе по-доброму.'},
    es: {title: 'Hay espacio para cada emoción', body: 'La tristeza, el alivio, las dudas e incluso no saber qué sientes tienen cabida aquí. Una emoción no necesita ser clara ni agradable para merecer amabilidad.'},
  },
  {
    en: {title: 'You are more than your thoughts', body: 'A worried thought can be loud without being the whole truth about you. You do not have to solve, follow or argue with every thought.'},
    ru: {title: 'Вы больше своих мыслей', body: 'Тревожная мысль бывает громкой, но не определяет вас целиком. Нет необходимости решать каждую мысль, верить ей или спорить с ней.'},
    es: {title: 'Eres más que tus pensamientos', body: 'Una preocupación puede sonar muy fuerte sin contar toda la verdad sobre ti. No tienes que resolver, seguir ni discutir cada pensamiento.'},
  },
  {
    en: {title: 'Your own pace matters', body: 'Needing time is not letting anyone down. Your worth does not depend on how quickly you respond, decide or move forward.'},
    ru: {title: 'Ваш темп имеет значение', body: 'Потребность во времени не делает вас менее надёжным человеком. Ваша ценность не зависит от скорости ответа, решения или движения вперёд.'},
    es: {title: 'Tu ritmo importa', body: 'Necesitar tiempo no significa decepcionar a nadie. Tu valor no depende de la rapidez con la que respondas, decidas o avances.'},
  },
  {
    en: {title: 'Not knowing is allowed', body: 'Some days it is hard to tell what would help. An unfinished answer is still an honest one. You are not behind.'},
    ru: {title: 'Можно пока не знать', body: 'Иногда трудно понять, что именно поддержит. Незавершённый ответ тоже может быть честным. Вы никуда не опоздали.'},
    es: {title: 'Está bien no saber todavía', body: 'Algunos días cuesta saber qué ayudaría. Una respuesta incompleta también puede ser sincera. No te has quedado atrás.'},
  },
  {
    en: {title: 'You are not falling behind', body: 'A rushed or difficult day does not erase your strengths. There is no pace you must keep up with, here or anywhere else.'},
    ru: {title: 'Вы не отстаёте', body: 'Суетливый или трудный день не отменяет ваши сильные стороны. Здесь не нужно поспевать за чужим ритмом или соответствовать планке.'},
    es: {title: 'No te estás quedando atrás', body: 'Un día difícil o acelerado no borra tus fortalezas. Aquí no hay un ritmo ajeno que debas alcanzar.'},
  },
  {
    en: {title: 'Steadiness can be quiet', body: 'Not every meaningful moment feels different straight away. Even when nothing appears to change, your experience still matters.'},
    ru: {title: 'Устойчивость бывает незаметной', body: 'Не каждый важный момент сопровождается ощутимыми переменами. Даже когда кажется, что ничего не меняется, ваш опыт остаётся значимым.'},
    es: {title: 'La estabilidad puede ser discreta', body: 'No todos los momentos valiosos se sienten distintos al instante. Aunque parezca que nada cambia, tu experiencia sigue importando.'},
  },
  {
    en: {title: 'Comfort is not a reward', body: 'Your body does not owe anyone constant effort. Ease, ordinary rest and gentleness belong in everyday life, not only after a task is done.'},
    ru: {title: 'Комфорт — не награда', body: 'Тело не обязано постоянно напрягаться ради результата. Удобство, обычный отдых и бережность имеют место в жизни не только после выполненных дел.'},
    es: {title: 'La comodidad no es un premio', body: 'Tu cuerpo no le debe esfuerzo constante a nadie. El descanso y la suavidad también tienen lugar antes de terminar una tarea.'},
  },
  {
    en: {title: 'Feelings have their own rhythm', body: 'There is no deadline for understanding what you feel. Uncertainty and mixed emotions can exist without needing an immediate answer.'},
    ru: {title: 'У чувств свой ритм', body: 'Не существует срока, к которому нужно разобраться в своих чувствах. Неопределённость и смешанные переживания могут быть рядом без немедленного ответа.'},
    es: {title: 'Las emociones tienen su ritmo', body: 'No hay una fecha límite para comprender lo que sientes. La incertidumbre y las emociones mezcladas pueden existir sin una respuesta inmediata.'},
  },
  {
    en: {title: 'A thought does not define you', body: 'An anxious idea is something you experience, not all that you are. You do not have to defeat it in order to deserve some peace.'},
    ru: {title: 'Одна мысль не определяет вас', body: 'Тревожная мысль — лишь часть переживания, а не вся ваша личность. Не нужно побеждать её, чтобы иметь право на покой.'},
    es: {title: 'Un pensamiento no te define', body: 'Una idea inquietante es parte de lo que experimentas, no todo lo que eres. No tienes que vencerla para merecer tranquilidad.'},
  },
  {
    en: {title: 'Your boundaries deserve respect', body: 'Having limits does not make you unkind. Your time, energy and comfort matter, even when other people need something from you.'},
    ru: {title: 'Ваши границы заслуживают уважения', body: 'Личные пределы не делают вас чёрствым человеком. Ваше время, силы и комфорт важны, даже когда от вас чего-то ждут.'},
    es: {title: 'Tus límites merecen respeto', body: 'Tener límites no te hace menos amable. Tu tiempo, tu energía y tu comodidad importan, aunque otras personas necesiten algo de ti.'},
  },
  {
    en: {title: 'Your journey is yours', body: 'Some days may have felt easier, and others less so. None of that is a verdict on you. What you have learned remains yours, without a final test.'},
    ru: {title: 'Ваш путь принадлежит вам', body: 'Одни дни могли даваться легче, другие — сложнее. Это не оценка вас как человека. То, что оказалось важным, остаётся с вами без итогового экзамена.'},
    es: {title: 'Este camino es tuyo', body: 'Algunos días habrán sido más fáciles que otros. Nada de eso es un juicio sobre ti. Lo que ha sido valioso sigue contigo, sin examen final.'},
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
  return DAYS.length === 14 && DAYS.every(day =>
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

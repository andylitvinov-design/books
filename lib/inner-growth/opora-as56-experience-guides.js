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

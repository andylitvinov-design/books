// Source-authored visual guides for the Egyptian and Greek goal-planning courses.
// Based on the user's original 2026-10-23 Egyptian Planning / Egyptian Handbook and
// Greek Planning / Ancient Metaphysics. The mapping is an author's symbolic practice,
// not a historical assertion that statues literally depict invisible bodies.
// Commons images are documentary photographs of distinct artifacts, not generated avatars.
const GUIDES = {
  "egyptian": [
    {
      "id": "ka",
      "symbol": "𓂓",
      "title": {
        "en": "Ka · Life force and desire",
        "ru": "Ка · Жизненная сила и желание",
        "es": "Ka · Fuerza vital y deseo"
      },
      "description": {
        "en": "In this author's Egyptian model, Ka is the living impulse: vitality, pleasure, creativity and what you genuinely want—not someone else's expectation.",
        "ru": "В авторской египетской модели Ка — живой импульс: жизненная сила, удовольствие, творчество и собственное желание, а не чужие ожидания.",
        "es": "En este modelo egipcio de autor, Ka representa el impulso vital: energía, placer, creatividad y deseo propio, no expectativas ajenas."
      },
      "focus": {
        "en": "What do I want, and what brings me joy?",
        "ru": "Чего я хочу и что приносит мне удовольствие?",
        "es": "¿Qué deseo y qué me da alegría?"
      },
      "photo": {
        "file": "Ka Statue of king Hor (crop 2).jpg",
        "credit": "Amira Ghandour",
        "license": "CC BY-SA 4.0"
      }
    },
    {
      "id": "ba",
      "symbol": "𓅽",
      "title": {
        "en": "Ba · Mind and vision",
        "ru": "Ба · Сознание и образ цели",
        "es": "Ba · Conciencia y visión"
      },
      "description": {
        "en": "Ba is represented in Egyptian art as a human-headed bird. Here it invites you to imagine clearly what you want to create and which steps may lead there.",
        "ru": "В египетском искусстве Ба изображали птицей с человеческой головой. Здесь это уровень сознания, ясного образа результата и направления действий.",
        "es": "En el arte egipcio, Ba aparece como un ave con cabeza humana. Aquí invita a imaginar claramente el resultado y cómo avanzar."
      },
      "focus": {
        "en": "What exactly needs to take shape?",
        "ru": "Что конкретно нужно сделать? Как выглядит результат?",
        "es": "¿Qué quiero realizar y cómo se ve el resultado?"
      },
      "photo": {
        "file": "Ba-bird-72.4178-IMG 4760-white.jpg",
        "credit": "Rama",
        "license": "CC BY-SA 3.0 FR"
      }
    },
    {
      "id": "ib",
      "symbol": "♡",
      "title": {
        "en": "Ib · Heart and values",
        "ru": "Иб · Сердце и ценности",
        "es": "Ib · Corazón y valores"
      },
      "description": {
        "en": "Ib is the heart, symbolically weighed against Ma'at's feather. In this reflection it asks whether your goal agrees with your conscience and true values.",
        "ru": "Иб — сердце. В египетском образе его взвешивают рядом с пером Маат. В планировании это вопрос о совести, истинных ценностях и смысле желаемого.",
        "es": "Ib es el corazón, que simbólicamente se pesa frente a la pluma de Ma'at. Aquí conecta la meta con tu conciencia y tus valores."
      },
      "focus": {
        "en": "Why does this matter to my heart?",
        "ru": "Зачем мне это? Какие ценности за этим стоят?",
        "es": "¿Por qué importa para mi corazón?"
      },
      "photo": {
        "file": "BD Weighing of the Heart.jpg",
        "credit": "British Museum",
        "license": "Public domain"
      }
    },
    {
      "id": "sah",
      "symbol": "✧",
      "title": {
        "en": "Sah · Light and larger meaning",
        "ru": "Сах · Свет и масштаб",
        "es": "Sah · Luz y amplitud"
      },
      "description": {
        "en": "In the author's contemplative map, Sah opens the image of a greater purpose: what your goal can give the world and how far it may unfold.",
        "ru": "В авторской практике Сах — образ света и расширения возможностей. Этот уровень помогает увидеть вклад в мир и максимальный масштаб цели.",
        "es": "En esta práctica de autor, Sah evoca luz y posibilidad: el alcance de tu meta y lo que puedes aportar al mundo."
      },
      "focus": {
        "en": "What will I bring into the world?",
        "ru": "Что я несу в мир? Каков максимальный масштаб?",
        "es": "¿Qué aportará mi meta al mundo?"
      },
      "photo": {
        "file": "Coffin and corn mummy with Osiris mask MET 58.98.a EGDP018355.jpg",
        "credit": "The Metropolitan Museum of Art",
        "license": "CC0"
      }
    },
    {
      "id": "haibit",
      "symbol": "◐",
      "title": {
        "en": "Khaibit · Shadow, experience and action",
        "ru": "Хайбит · Тень, опыт и действие",
        "es": "Jaibit · Sombra, experiencia y acción"
      },
      "description": {
        "en": "Khaibit is associated with the shadow. Reflect on experience—both strengths and obstacles—and turn what you have learned into your first concrete action.",
        "ru": "Хайбит — образ тени и накопленного опыта. Вспомни навыки, победы, уроки и помехи, затем переведи этот опыт в первое конкретное действие.",
        "es": "Jaibit evoca la sombra y la experiencia acumulada. Reconoce recursos y obstáculos, y convierte lo aprendido en una primera acción."
      },
      "focus": {
        "en": "What experience helps me, and what will I do?",
        "ru": "Что поможет из опыта и что будет сделано?",
        "es": "¿Qué experiencia me ayuda y qué haré?"
      },
      "photo": {
        "file": "Egypt.Papyrus.01.jpg",
        "credit": "Hajor",
        "license": "CC BY-SA"
      }
    },
    {
      "id": "hu",
      "symbol": "𓇋",
      "title": {
        "en": "Hu · Spirit and unique expression",
        "ru": "Ху · Дух и уникальность",
        "es": "Hu · Espíritu y singularidad"
      },
      "description": {
        "en": "The course interprets Hu as an expression of spirit: the distinctive talents, voice and mission through which you can realize your goal.",
        "ru": "В этой авторской системе Ху — тело духа и своеобразия. Оно помогает заметить твой неповторимый голос, способности и личный способ действия.",
        "es": "Este curso interpreta Hu como expresión del espíritu: tu voz, dones y manera singular de realizar la meta."
      },
      "focus": {
        "en": "What is unique about my way?",
        "ru": "В чём моя особенность и уникальность?",
        "es": "¿Qué hace único mi camino?"
      },
      "photo": {
        "file": "Opening of the mouth ceremony.jpg",
        "credit": "British Museum",
        "license": "Public domain"
      }
    },
    {
      "id": "ren",
      "symbol": "𓍹",
      "title": {
        "en": "Ren · Name and identity",
        "ru": "Рен · Имя и личность",
        "es": "Ren · Nombre e identidad"
      },
      "description": {
        "en": "Ren is the name and identity. Imagine the person you are when you are living this goal, and the qualities by which you wish to be known.",
        "ru": "Рен — имя, личная идентичность и предназначение. Представь, кто ты и каким становишься, когда реализуешь эту цель.",
        "es": "Ren es nombre e identidad. Imagina quién eres y en quién te conviertes al realizar esta meta."
      },
      "focus": {
        "en": "Who am I while living this goal?",
        "ru": "Кто я и какой я, когда реализую цель?",
        "es": "¿Quién soy cuando vivo esta meta?"
      },
      "photo": {
        "file": "Karnak titul ramses.JPG",
        "credit": "Wikimedia Commons",
        "license": "See source license"
      }
    },
    {
      "id": "sekhem",
      "symbol": "☥",
      "title": {
        "en": "Sekhem · Strength and support",
        "ru": "Секхем · Сила и поддержка",
        "es": "Sejem · Fuerza y apoyo"
      },
      "description": {
        "en": "Sekhem evokes power and capacity. In planning, name the people, resources and supportive conditions that help turn your goal into reality.",
        "ru": "Секхем — образ силы и способности действовать. Здесь мы ищем ресурсы, людей, условия и поддержку для воплощения цели.",
        "es": "Sejem evoca fuerza y capacidad. Identifica personas, recursos y condiciones que apoyan la realización de tu meta."
      },
      "focus": {
        "en": "What other resources or people can help?",
        "ru": "Что ещё поможет? Какие ресурсы и люди?",
        "es": "¿Qué personas y recursos pueden ayudar?"
      },
      "photo": {
        "file": "Was scepter MET LC-12 182 64 EGDP026979.jpg",
        "credit": "The Metropolitan Museum of Art",
        "license": "CC0"
      }
    }
  ],
  "greek": [
    {
      "id": "epithymia",
      "symbol": "Ἐ",
      "title": {
        "en": "Epithymia · Desire",
        "ru": "Эпитимия · Желание",
        "es": "Epithymía · Deseo"
      },
      "description": {
        "en": "Epithymia is bodily desire, enjoyment and the spark of interest. Begin with a genuine 'I want' before making a sensible plan.",
        "ru": "Эпитимия — телесное желание, удовольствие и увлечённость. Начни с живого «я хочу», прежде чем строить рациональный план.",
        "es": "Epithymía es deseo corporal, placer e interés. Empieza por un auténtico «quiero» antes de hacer un plan."
      },
      "focus": {
        "en": "What gives this goal pleasure and attraction?",
        "ru": "Что я хочу? Что в цели приносит удовольствие?",
        "es": "¿Qué me atrae y me da placer de esta meta?"
      },
      "photo": {
        "file": "1981.11 - Statue of the Aphrodite of Knidos.jpg",
        "credit": "Art Institute of Chicago",
        "license": "Public domain"
      }
    },
    {
      "id": "thymos",
      "symbol": "Θ",
      "title": {
        "en": "Thymos · Courage and will",
        "ru": "Тюмос · Воля и мужество",
        "es": "Thymós · Valor y voluntad"
      },
      "description": {
        "en": "Thymos is spirited resolve, the energy of the heart to stand up, choose boldly and move forward despite hesitation.",
        "ru": "Тюмос — энергия духа и сердца, кураж, решительность, доблесть. На этом уровне найди, где нужна воля и шаг вперёд.",
        "es": "Thymós es fuerza del ánimo y del corazón: resolución y valor para dar un paso aun con dudas."
      },
      "focus": {
        "en": "Where will I show resolve and act?",
        "ru": "Где мне нужна воля и как я проявлю решительность?",
        "es": "¿Dónde actuaré con valentía?"
      },
      "photo": {
        "file": "The Winged Victory of Samothrace.jpg",
        "credit": "Wikimedia Commons",
        "license": "See source license"
      }
    },
    {
      "id": "logos",
      "symbol": "Λ",
      "title": {
        "en": "Logos · Reason and order",
        "ru": "Логос · Разум и порядок",
        "es": "Logos · Razón y orden"
      },
      "description": {
        "en": "Logos brings understanding, analysis and structure. Translate inspiration into knowledge, clear steps and a realistic plan.",
        "ru": "Логос — познание, анализ и упорядочивание. Переведи вдохновение в знания, последовательность шагов и понятный план.",
        "es": "Logos aporta comprensión, análisis y orden. Convierte la inspiración en pasos y un plan claro."
      },
      "focus": {
        "en": "What must I learn and arrange?",
        "ru": "Что изучить, понять, упорядочить? Каков план?",
        "es": "¿Qué debo estudiar, comprender y organizar?"
      },
      "photo": {
        "file": "Bust of Aristotle.jpg",
        "credit": "Quadell",
        "license": "See source license"
      }
    },
    {
      "id": "nous",
      "symbol": "Ν",
      "title": {
        "en": "Nous · Higher understanding",
        "ru": "Ноос · Высший смысл",
        "es": "Noûs · Sentido superior"
      },
      "description": {
        "en": "Nous asks for a wider perspective: patterns, causes, ideals and the deeper significance connecting your aim with the world.",
        "ru": "Ноос — взгляд на большие смыслы и закономерности. Здесь исследуй, почему цель возникла и с какими процессами она связана.",
        "es": "Noûs abre una mirada más amplia: ideales, causas y el sentido profundo de tu objetivo."
      },
      "focus": {
        "en": "What is the deeper meaning and connection?",
        "ru": "Каков высший смысл? Какие связи и причины?",
        "es": "¿Qué sentido y conexiones profundas veo?"
      },
      "photo": {
        "file": "Marble statue of Athena, Louvre.jpg",
        "credit": "Wilfredor",
        "license": "See source license"
      }
    },
    {
      "id": "eidos",
      "symbol": "Ε",
      "title": {
        "en": "Eidos · Ideal form",
        "ru": "Эйдос · Идеальный образ",
        "es": "Eidos · Forma ideal"
      },
      "description": {
        "en": "Eidos is the ideal pattern or form. Picture what a beautiful, harmonious completion would look like, rather than accepting a vague result.",
        "ru": "Эйдос — первообраз, идеальная форма. Увидь эталон своей цели: как она выглядит, когда воплощена красиво и гармонично.",
        "es": "Eidos es la forma ideal. Visualiza cómo se ve la meta cuando se realiza de manera bella y armónica."
      },
      "focus": {
        "en": "What does the ideal outcome look like?",
        "ru": "Как выглядит идеальная форма цели?",
        "es": "¿Cómo sería el resultado ideal?"
      },
      "photo": {
        "file": "Doryphoros MIA 866.jpg",
        "credit": "Minneapolis Institute of Art",
        "license": "Public domain"
      }
    },
    {
      "id": "idea",
      "symbol": "Ι",
      "title": {
        "en": "Idea · Guiding intention",
        "ru": "Идея · Главный замысел",
        "es": "Idea · Intención esencial"
      },
      "description": {
        "en": "Idea here is the central guiding purpose: the thought or value that you want your goal to express through your work and life.",
        "ru": "Идея — главный замысел и смысл. Назови мысль и ценность, которые через твою цель должны проявиться в мире.",
        "es": "Idea es el propósito esencial: aquello que tu meta quiere expresar en tu vida y en el mundo."
      },
      "focus": {
        "en": "Which idea does this goal embody?",
        "ru": "Какой главный замысел я воплощаю?",
        "es": "¿Qué idea central encarna esta meta?"
      },
      "photo": {
        "file": "Plato bust.png",
        "credit": "Jpergrc",
        "license": "CC0"
      }
    },
    {
      "id": "daimon",
      "symbol": "Δ",
      "title": {
        "en": "Daimon · Inner guide",
        "ru": "Гений / Даймон · Внутренний проводник",
        "es": "Daimon · Guía interior"
      },
      "description": {
        "en": "In this author's Greek model, Daimon is a symbolic inner guide or higher self. Listen for a direction and notice who you become on this path.",
        "ru": "В авторской греческой модели Даймон — символ внутреннего проводника, Высшего Я. Прислушайся к подсказке и образу себя на этом пути.",
        "es": "En este modelo de autor, Daimon simboliza una guía interior. Escucha una orientación y observa en quién te conviertes."
      },
      "focus": {
        "en": "Who am I becoming? What guidance do I hear?",
        "ru": "Кто я, когда достигаю цель? Какую подсказку слышу?",
        "es": "¿En quién me convierto? ¿Qué orientación percibo?"
      },
      "photo": {
        "file": "Hermes di Prassitele, at Olimpia, front.jpg",
        "credit": "Roccuz",
        "license": "See source license"
      }
    },
    {
      "id": "telos",
      "symbol": "Τ",
      "title": {
        "en": "Telos · Full realization",
        "ru": "Телос · Полное раскрытие",
        "es": "Telos · Plena realización"
      },
      "description": {
        "en": "Telos is the goal in its fullest possible development, the mature outcome and maximum horizon of the path.",
        "ru": "Телос — конечная идеальная форма развития и полнота результата. Увидь наибольший масштаб раскрытия цели.",
        "es": "Telos es la meta en su plenitud: el resultado maduro y el horizonte más amplio de este camino."
      },
      "focus": {
        "en": "What can this become at its fullest?",
        "ru": "К чему цель придёт в полноте? Каков максимум?",
        "es": "¿Hasta dónde puede desarrollarse esta meta?"
      },
      "photo": {
        "file": "Apollo of the Belvedere.jpg",
        "credit": "Livioandronico2013",
        "license": "CC BY-SA 4.0"
      }
    }
  ]
}

export const TRADITION_STAGE_KEYS = Object.freeze({
 egyptian:Object.freeze(GUIDES.egyptian.map(item=>item.id)),
 greek:Object.freeze(GUIDES.greek.map(item=>item.id)),
})

export function traditionStages(slug){return GUIDES[slug]||[]}
export function traditionStageGuide(slug,stage){
 const stages=traditionStages(slug)
 if(!stages.length)return null
 if(stage==='start')return stages[0]
 if(stage==='finish')return stages[stages.length-1]
 return stages.find(item=>item.id===stage)||null
}
export function traditionStageImage(stage){
 if(!stage?.photo?.file)return ''
 return 'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(stage.photo.file).replaceAll('%20','_')+'?width=480'
}
export function traditionStageSource(stage){
 if(!stage?.photo?.file)return ''
 return 'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(stage.photo.file).replaceAll('%20','_')
}

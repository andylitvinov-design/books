import type { PublicLocale } from "@/lib/public-locales";
import tantraReikiArchive from "@/data/academy/tantra-reiki-full.generated.json";

// Stage descriptions and attunements are editorially aligned with the captured
// EN/RU PsiTrends source (data/academy/tantra-reiki-full.generated.json).
// Historical EN and RU attunement assignments differ at stages 2–3;
// retain each language's original assignments instead of silently merging them.
const stages = [
  {
    "en": {
      "title": "Spring of Life",
      "subtitle": "Awakening sensitivity",
      "intro": "The first step invites you to experience the Tantra Reiki flow through the body: gentle sensations, pleasure, vitality and a more present connection with yourself and a partner.",
      "att": [
        "Sexual energy activation",
        "Attractiveness · qualities of charisma",
        "Situation activation"
      ],
      "practice": "Learn to notice the flow and practise respectfully with a partner."
    },
    "ru": {
      "title": "Родник жизни",
      "subtitle": "Пробуждение чувствительности",
      "intro": "Первая ступень раскрывает телесные ощущения и контакт с жизненностью. В авторском описании это «родник Жизни»: мягкое удовольствие, пробуждение чувств и более живой контакт с собой и партнёром.",
      "att": [
        "Активация сексуальной энергии",
        "Привлекательность · качества харизмы",
        "Гармонизация ситуации"
      ],
      "practice": "Учимся ощущать поток и практикуем с партнёром, соблюдая границы и согласие."
    },
    "es": {
      "title": "Manantial de vida",
      "subtitle": "Despertar de la sensibilidad",
      "intro": "La primera etapa invita a sentir el flujo mediante el cuerpo, la vitalidad, la sensibilidad y una conexión más presente con uno mismo y con otra persona.",
      "att": [
        "Activación de energía sexual",
        "Atractivo y carisma",
        "Armonización de situaciones"
      ],
      "practice": "Aprender a reconocer el flujo y practicar con una pareja con consentimiento."
    }
  },
  {
    "en": {
      "title": "Fire of Life",
      "subtitle": "Energy, strength and confidence",
      "intro": "The second level explores the image of an inner fire. The original course connects this step with gathering energy, feeling more personally present and working symbolically with limitations and material goals.",
      "att": [
        "Accumulation of energy",
        "Money Magnet",
        "Attunement with a person or group"
      ],
      "practice": "Begin creating simple Tantra Reiki mandalas. The English and Russian historical attunement lists differ for levels 2–3; see the source below."
    },
    "ru": {
      "title": "Жар жизни",
      "subtitle": "Энергия, сила и уверенность",
      "intro": "Здесь пробуждается «Жар Жизни»: ощущение страсти, расширения присутствия и силы. Практика направлена на работу с внутренними ограничениями и символическим образом собственного энергетического ресурса.",
      "att": [
        "Накопление энергии",
        "Денежный магнит",
        "Сжечь комплексы"
      ],
      "practice": "Начинаем составлять простые тантрические мандалы."
    },
    "es": {
      "title": "Fuego de vida",
      "subtitle": "Energía y confianza",
      "intro": "Esta etapa explora la imagen del fuego interior, la pasión, la presencia y el trabajo simbólico con los límites personales.",
      "att": [
        "Acumulación de energía",
        "Imán del dinero",
        "Disolver complejos"
      ],
      "practice": "Comenzar a crear mandalas sencillos de Tantra Reiki."
    }
  },
  {
    "en": {
      "title": "Ocean of Unity",
      "subtitle": "Attunement with the world",
      "intro": "The image of this level is the ocean: moving beyond the feeling of being separate and learning to notice connection with a larger field. It introduces the themes of unity, clearing and favourable movement.",
      "att": [
        "Unity",
        "Clearance · release of blocks",
        "Luck · intuitive timing"
      ],
      "practice": "Write short reflections and create a Tantra Reiki mandala; the original Russian list also includes the Talisman setting."
    },
    "ru": {
      "title": "Океан единства",
      "subtitle": "Сонастройка с миром",
      "intro": "«Вы уже не рыбка в океане — вы и есть этот Океан». Третья ступень посвящена переживанию связи с окружающим пространством, сонастройке и работе с намерением.",
      "att": [
        "Сонастройка",
        "Удача · ускорение времени",
        "Талисман"
      ],
      "practice": "Готовим короткие письменные наблюдения и тантрические мандалы."
    },
    "es": {
      "title": "Océano de unidad",
      "subtitle": "Sintonía con el mundo",
      "intro": "La imagen del océano invita a explorar una conexión más amplia con el entorno, la sintonía y el trabajo con la intención.",
      "att": [
        "Sintonización",
        "Suerte · sentido del momento",
        "Talismán"
      ],
      "practice": "Escribir reflexiones breves y crear mandalas tántricos."
    }
  },
  {
    "en": {
      "title": "The Vertical of Love",
      "subtitle": "Archetypes and connection",
      "intro": "This level turns to the image of a vertical connection with the worlds of archetypes and the Gods of Love. The Astral Child is described in the tradition as a symbolic shared field of a couple or group.",
      "att": [
        "Enlightenment",
        "Gods of Love",
        "Astral Child · shared couple or group field"
      ],
      "practice": "Begin supervised work on Tantra Reiki mandalas for individual requests."
    },
    "ru": {
      "title": "Вертикаль любви",
      "subtitle": "Архетипы и соединение",
      "intro": "На четвёртой ступени появляется «Вертикаль»: символическая связь с мирами богов и архетипами Любви. Важной темой становится более осознанный, тонкий контакт с другим человеком.",
      "att": [
        "Боги любви",
        "Просветление",
        "Астральный ребёнок · общее поле пары"
      ],
      "practice": "Начинаем работу с индивидуальными запросами через тантрические мандалы."
    },
    "es": {
      "title": "La vertical del amor",
      "subtitle": "Arquetipos y conexión",
      "intro": "Esta etapa introduce una conexión simbólica con los arquetipos de amor y la idea de un campo compartido por una pareja o grupo.",
      "att": [
        "Dioses del amor",
        "Iluminación",
        "Niño astral · campo compartido"
      ],
      "practice": "Iniciar trabajo supervisado con mandalas para solicitudes personales."
    }
  },
  {
    "en": {
      "title": "Inner Light",
      "subtitle": "The source within",
      "intro": "Instead of imagining a current arriving from outside, the fifth level explores light arising from within. Its themes are creativity, personal energy and the symbolic opening of energy centres.",
      "att": [
        "Inner Light"
      ],
      "practice": "Explore charging symbolic Tantra Reiki artifacts with personal supervision."
    },
    "ru": {
      "title": "Внутренний свет",
      "subtitle": "Источник внутри",
      "intro": "«Это не поток, в котором вы купаетесь, это поток, в котором вы купаете Вселенную». Ступень обращается к внутреннему источнику силы, творческому потенциалу и раскрытию энергетических центров.",
      "att": [
        "Внутренний Свет"
      ],
      "practice": "Изучаем создание и настройку тантрических артефактов с супервизией."
    },
    "es": {
      "title": "Luz interior",
      "subtitle": "La fuente interna",
      "intro": "La quinta etapa explora la imagen de una luz que surge desde dentro, vinculada a la creatividad y a los centros energéticos simbólicos.",
      "att": [
        "Luz interior"
      ],
      "practice": "Explorar artefactos simbólicos con supervisión."
    }
  },
  {
    "en": {
      "title": "Worlds of Unity",
      "subtitle": "Rest and integration",
      "intro": "The sixth level uses the imagery of deep stillness and eternity. The original description speaks of calm, inner support, balance and the experience of being part of a greater whole.",
      "att": [
        "Worlds of Unity"
      ],
      "practice": "Design a clear outline for a personal Tantra Reiki practice session."
    },
    "ru": {
      "title": "Миры единства",
      "subtitle": "Покой и интеграция",
      "intro": "Образ шестой ступени — Вечность: мир как будто замирает, появляется ощущение глубокого покоя и общего единения. В описании настройки выделены поддержка, подпитка, стабилизация и баланс.",
      "att": [
        "Миры Единства"
      ],
      "practice": "Разрабатываем структуру собственной практики или индивидуального сеанса."
    },
    "es": {
      "title": "Mundos de unidad",
      "subtitle": "Calma e integración",
      "intro": "Esta etapa utiliza la imagen del silencio y la eternidad, con temas de calma, apoyo interior e integración.",
      "att": [
        "Mundos de unidad"
      ],
      "practice": "Diseñar una estructura de práctica o sesión personal."
    }
  },
  {
    "en": {
      "title": "Illumination",
      "subtitle": "Clarity of attention",
      "intro": "The seventh level shifts toward the experience of a clearer and more focused awareness. In the tradition, attention itself becomes central to the work of harmonising experience.",
      "att": [
        "Illumination"
      ],
      "practice": "Practise with feedback, document observations and collect testimonials only with consent."
    },
    "ru": {
      "title": "Озарение",
      "subtitle": "Ясность внимания",
      "intro": "На седьмой ступени автор описывает состояние наполненного светом сознания: больше осознанности, ясности и собранности. Главным инструментом работы становится само внимание.",
      "att": [
        "Озарение"
      ],
      "practice": "Ведём практику, собираем обратную связь и фиксируем наблюдения участников с их согласия."
    },
    "es": {
      "title": "Iluminación",
      "subtitle": "Claridad de atención",
      "intro": "La séptima etapa enfatiza la claridad, la consciencia y el enfoque de la atención.",
      "att": [
        "Iluminación"
      ],
      "practice": "Practicar con comentarios y registrar observaciones con consentimiento."
    }
  },
  {
    "en": {
      "title": "Creation of the World",
      "subtitle": "The creative impulse",
      "intro": "This stage explores a move from merely sensing or harmonising the flow to actively shaping creative intentions. The original text describes it as an impulse of creation.",
      "att": [
        "Creation of the World"
      ],
      "practice": "Create a personal symbolic ritual and write an educational reflection or article."
    },
    "ru": {
      "title": "Созидание мира",
      "subtitle": "Творческий импульс",
      "intro": "«Ты уже не только гармонизируешь миры, но и созидаешь их своим вниманием». Ступень посвящена творческому намерению, образу созидания и авторскому ритуалу.",
      "att": [
        "Созидание Мира"
      ],
      "practice": "Составляем собственный символический ритуал и пишем учебную заметку."
    },
    "es": {
      "title": "Creación del mundo",
      "subtitle": "Impulso creativo",
      "intro": "Se explora el paso desde sentir o armonizar hacia la formación consciente de intenciones creativas.",
      "att": [
        "Creación del mundo"
      ],
      "practice": "Diseñar un ritual simbólico personal y escribir una reflexión."
    }
  },
  {
    "en": {
      "title": "Fullness of Unity",
      "subtitle": "Integration and mastery",
      "intro": "The ninth level brings together the preceding images and practices. Its central idea is the experience of inner fullness, strength, balance and a unified perspective.",
      "att": [
        "Fullness of Unity"
      ],
      "practice": "Master-level initiation and final assessment are described in the historical programme; current certification terms should be confirmed directly."
    },
    "ru": {
      "title": "Полнота единства",
      "subtitle": "Интеграция и мастерство",
      "intro": "На девятой ступени соединяются разные пласты опыта. Автор описывает это как внутреннюю полноту, согласованность, силу и баланс — завершение пути девяти ступеней.",
      "att": [
        "Полнота Единства"
      ],
      "practice": "Итоговая практика и мастерская аттестация описаны в исторической программе; актуальные условия уточняются отдельно."
    },
    "es": {
      "title": "Plenitud de unidad",
      "subtitle": "Integración y maestría",
      "intro": "La última etapa reúne las experiencias anteriores en una imagen de plenitud, fuerza y equilibrio interior.",
      "att": [
        "Plenitud de unidad"
      ],
      "practice": "La iniciación y evaluación de maestría figuran en el programa histórico; confirmar condiciones actuales."
    }
  }
] as const;


/**
 * A distinct real photograph for each level, selected from the original
 * PsiTrends Tantra Reiki source archive. No synthetic diagrams or AI pictures.
 * These are illustrative archive photographs, not a claim that the pictured
 * attendees are taking the precise initiation described alongside the image.
 */
const levelPhotos = [
  { src: tantraReikiArchive.images.ru[17], description: "Gentle embodied connection in a practice setting", archive: true, position: "center 48%" },
  { src: tantraReikiArchive.images.ru[14], description: "A quiet meditative moment in nature", archive: false, position: "center 52%" },
  { src: tantraReikiArchive.images.ru[18], description: "Shared mindful experience in a group", archive: true, position: "center 44%" },
  { src: tantraReikiArchive.images.ru[11], description: "Connection and presence during a workshop", archive: true, position: "center 46%" },
  { src: tantraReikiArchive.images.ru[20], description: "Calm presence and creative practice", archive: true, position: "center 45%" },
  { src: tantraReikiArchive.images.ru[10], description: "Rest, reflection and mindful integration", archive: true, position: "center 50%" },
  { src: tantraReikiArchive.images.ru[15], description: "Quiet attention during a shared event", archive: true, position: "center 42%" },
  { src: tantraReikiArchive.images.ru[21], description: "Embodied creative expression", archive: true, position: "center 48%" },
  { src: tantraReikiArchive.images.ru[22], description: "A shared moment from the practice archive", archive: true, position: "center 45%" }
] as const;


// Restored from the author's full original Russian source, rather than the editorial summaries.
// EN and ES are close translations of these source paragraphs; RU is verbatim.
const authorDescriptions: Record<PublicLocale, string[][]> = {
  "ru": [
    [
      "В этих энергиях весь мир вокруг вас становится вкусным, текучим, и приятная волна удовольствия начинает журчать по вашему телу.",
      "Вы как открываете родник целительной энергии Жизни, которая мягко очищает и пробуждает внутреннюю силу.",
      "Нежное экстатическое удовольствие, передается по всему телу и начинает пробуждать чувства и эмоции."
    ],
    [
      "Здесь мы пробуждаем Жар Жизни. Страсть. Ваша энергетика начинает разгораться огнем, заполняя собой все возможное пространство вокруг, сжигая страхи, ступоры и ограничения.",
      "Энергия жизни не только входит в вас - Вы сами и есть Жизнь, и расцветаете в ее полноте."
    ],
    [
      "На 3й ступени начинает плавиться пространство. Вы начинаете ощущать соединение со всем миром вокруг.",
      "Вы уже не рыбка в океане - а уже и есть этот Океан.",
      "Это потрясающее состояние, когда в потоке тантра-рейки ты не просто перераспределяешь энергии внутри - но ты играешь энергиями всего пространства вокруг."
    ],
    [
      "На 4й ступени ты начинаешь чувствовать Вертикаль. Не только текущий мир, но и миры над ним, Миры Богов.",
      "Поток энергии начинает струиться с Божественных Планов, впитывая качества Богов Любви.",
      "В этом потоке ты соединяешься с Большими Силами мира, а твой тантрический танец, твоя жизнь получает дополнительную поддержку.",
      "Твой танец жизни становится изысканным, осознанным и филигранным."
    ],
    [
      "На 5й ступени вы раскрываете Источник Силы изнутри.",
      "Это не поток, в котором Вы купаетесь, это Поток, в котором вы купаете Вселенную, излучая изнутри.",
      "Этот внутренний Свет не знает преград и пределов. Он может вспыхнуть, озаряя все грани реальности.",
      "Мы учимся раскрывать внутренний бесконечный свет."
    ],
    [
      "На 6 ступени мы попадаем в состояние Вечности.",
      "Мир замирает и ты переносишься бесконечно вверх в зону всеобщего единения.",
      "Поток выносит тебя в миры Вечного Блаженства."
    ],
    [
      "На 7й ступени сознание заливается светом. Включается дополнительная высокочастотная подкачка сознания. Повышается уровень осознанности.",
      "Уже фокуса твоего внимания достаточно, чтобы запускался процесс гармонии и очищения."
    ],
    [
      "Включается Импульс творчества по уровню верхних центров. Ты уже не только гармонизируешь миры, но и созидаешь их своим вниманием."
    ],
    [
      "На 9 ступени включается особая полнота. Ты обьединяешь в себе различные пласты реальности. И в этом обьединении начинает проявляться общий баланс и гармония.",
      "Последние 3 ступени напоминают состояния Богов: Брахма, Шива, Вишну.",
      "7-9 ступень подобна 4-6, но на более высоком уровне."
    ]
  ],
  "en": [
    [
      "In these energies, the world around you becomes rich with sensation and fluid, and a pleasant wave of pleasure begins to flow through your body.",
      "It is as though you open a spring of the healing energy of Life, gently cleansing and awakening your inner strength.",
      "A gentle, ecstatic pleasure spreads through your body and begins to awaken feelings and emotions."
    ],
    [
      "Here we awaken the Fire of Life. Passion. Your energy begins to blaze like fire, filling the space around you, burning through fears, paralysis and limitations.",
      "Life energy does not simply enter you — you yourself are Life, blossoming in its fullness."
    ],
    [
      "At the third level, space itself begins to melt. You begin to experience being connected with the entire world around you.",
      "You are no longer a fish in the ocean — you are the Ocean itself.",
      "It is an amazing state: in the Tantra Reiki flow, you do not merely move energy within yourself; you play with the energies of the whole space around you."
    ],
    [
      "At the fourth level, you begin to feel the Vertical — not only this world, but the worlds above it, the Worlds of the Gods.",
      "The flow of energy begins to stream from Divine Planes, taking on the qualities of the Gods of Love.",
      "In this flow you connect with the Great Forces of the world, and your tantric dance — your life — receives additional support.",
      "Your dance of life becomes refined, conscious and delicate."
    ],
    [
      "At the fifth level, you discover the Source of Power within.",
      "It is not a flow in which you bathe; it is a Flow in which you bathe the Universe, radiating from within.",
      "This inner Light knows no barriers or limits. It can flare up, illuminating every facet of reality.",
      "We learn to open this boundless inner light."
    ],
    [
      "At the sixth level, we enter a state of Eternity.",
      "The world becomes still, and you travel endlessly upwards into a place of universal unity.",
      "The flow carries you into worlds of Eternal Bliss."
    ],
    [
      "At the seventh level, consciousness fills with light. An additional high-frequency flow of energy is felt, and awareness grows.",
      "The focus of your attention alone is enough to set a process of harmony and clearing in motion."
    ],
    [
      "A creative impulse awakens at the level of the upper centres. You no longer merely harmonise worlds — you create them through your attention."
    ],
    [
      "At the ninth level, a special fullness awakens. You unite different layers of reality within yourself, and through this union a common balance and harmony begins to emerge.",
      "The final three levels recall the states of the Gods: Brahma, Shiva and Vishnu.",
      "Levels 7–9 echo levels 4–6, but on a higher plane."
    ]
  ],
  "es": [
    [
      "En estas energías, el mundo a tu alrededor se vuelve lleno de sensaciones y fluido; una agradable ola de placer comienza a recorrer tu cuerpo.",
      "Es como abrir un manantial de energía vital sanadora que suavemente limpia y despierta tu fuerza interior.",
      "Un placer suave y extático se extiende por el cuerpo y comienza a despertar sentimientos y emociones."
    ],
    [
      "Aquí despertamos el Fuego de la Vida. La pasión. Tu energía se enciende como el fuego, llena el espacio a tu alrededor y quema miedos, bloqueos y limitaciones.",
      "La energía de la vida no solo entra en ti: tú eres la Vida misma, floreciendo en toda su plenitud."
    ],
    [
      "En la tercera etapa, el espacio empieza a fundirse. Comienzas a sentir la conexión con todo el mundo que te rodea.",
      "Ya no eres un pez en el océano: eres el Océano mismo.",
      "Es un estado sorprendente: en el flujo de Tantra Reiki no solo mueves energía dentro de ti, sino que juegas con la energía de todo el espacio."
    ],
    [
      "En la cuarta etapa comienzas a sentir la Vertical: no solo este mundo, sino también los mundos superiores, los Mundos de los Dioses.",
      "El flujo de energía comienza a descender de los Planos Divinos, incorporando las cualidades de los Dioses del Amor.",
      "En este flujo te unes a las Grandes Fuerzas del mundo, y tu danza tántrica —tu vida— recibe un apoyo adicional.",
      "Tu danza de la vida se vuelve refinada, consciente y delicada."
    ],
    [
      "En la quinta etapa descubres la Fuente del Poder en tu interior.",
      "No es un flujo en el que te bañas: es un Flujo en el que bañas al Universo, irradiando desde dentro.",
      "Esta Luz interior no conoce barreras ni límites. Puede encenderse e iluminar cada aspecto de la realidad.",
      "Aprendemos a abrir esta luz interior infinita."
    ],
    [
      "En la sexta etapa entramos en un estado de Eternidad.",
      "El mundo se detiene y asciendes sin fin hacia una zona de unidad universal.",
      "El flujo te lleva a mundos de Dicha Eterna."
    ],
    [
      "En la séptima etapa, la conciencia se llena de luz. Se activa una corriente adicional de energía y aumenta la consciencia.",
      "Basta con enfocar tu atención para poner en marcha un proceso de armonía y purificación."
    ],
    [
      "Se enciende un impulso creativo a través de los centros superiores. Ya no solo armonizas mundos: también los creas mediante tu atención."
    ],
    [
      "En la novena etapa aparece una plenitud especial. Unes dentro de ti diferentes capas de la realidad, y de esta unión nace un equilibrio y una armonía comunes.",
      "Las últimas tres etapas recuerdan los estados de los dioses Brahma, Shiva y Vishnu.",
      "Las etapas 7–9 son semejantes a las 4–6, pero en un plano más elevado."
    ]
  ]
};

const levelApplications: Record<PublicLocale, string[]> = {
  en: [
    "Recognise subtle bodily sensations, explore the flow individually and practise consent-based connection with a partner.",
    "Experiment with gathering and directing attention, work symbolically with personal resources and begin a simple mandala.",
    "Practise attunement with another person, notice internal barriers and record your experience in a short reflection.",
    "Explore the archetypal qualities of love, the shared field of a relationship and the first supervised mandala for an individual intention.",
    "Shift attention toward an inner source of energy and creativity, then learn how the tradition works with symbolic artifacts.",
    "Practise settling into stillness, noticing balance and creating a structured session for a personal intention.",
    "Develop steadier attention and a clearer practice method; document observations and receive consent-based feedback.",
    "Combine attunements into a personal symbolic ritual and translate what you learn into a written reflection.",
    "Bring together the entire nine-level journey in a personal practice; discuss evaluation and master-level attunement individually."
  ],
  ru: [
    "Научитесь замечать тонкие ощущения в теле, включаться в практику самостоятельно и исследовать контакт с партнёром с уважением к границам.",
    "Будете тренировать накопление и направление внимания, исследовать внутренний ресурс и создадите первую простую мандалу.",
    "Освоите упражнения на сонастройку с другим человеком, исследование внутренних ограничений и фиксацию своих ощущений.",
    "Будете изучать архетипические качества любви и общее поле пары, а также создавать мандалу под индивидуальное намерение.",
    "Исследуете внутренний источник энергии и творчества, познакомитесь с работой с символическими артефактами.",
    "Потренируетесь входить в состояние покоя и устойчивости и составите структуру собственной индивидуальной практики.",
    "Разовьёте навык удержания ясного внимания, будете вести наблюдения и получать обратную связь с согласия участников.",
    "Соедините настройки в авторский символический ритуал и оформите полученный опыт в небольшую письменную работу.",
    "Интегрируете практики девяти ступеней и обсудите условия завершающей настройки и аттестации индивидуально."
  ],
  es: [
    "Reconocer sensaciones sutiles, explorar el flujo individualmente y practicar la conexión con consentimiento.",
    "Practicar la atención y los recursos internos; comenzar un mandala sencillo.",
    "Explorar la sintonía con otra persona, los bloqueos internos y la reflexión.",
    "Explorar arquetipos del amor y crear un mandala supervisado para una intención personal.",
    "Descubrir la creatividad interior y el uso tradicional de objetos simbólicos.",
    "Practicar la calma y diseñar una sesión de práctica personal.",
    "Entrenar la atención consciente, documentar experiencias y pedir comentarios con consentimiento.",
    "Combinar las sintonizaciones en un ritual simbólico y escribir una reflexión.",
    "Integrar las nueve etapas y consultar las condiciones actuales para la evaluación final."
  ]
};

const ui = {
  en: { eyebrow: "The nine levels", heading: "A journey, one level at a time", subtitle: "Explore nine progressive initiations through grounded exercises, partner connection, mandalas and personal practice.", level: "Level", settings: "Traditional attunements", application: "What you will learn", practice: "Practical assignment", previous: "Previous level", next: "Next level", contact: "Ask about training", final: "Explore the original materials", phases: ["Foundation · levels 1–3", "Deepening · levels 4–6", "Master path · levels 7–9"], source: "From the author’s original notes · English translation", stock: "Illustrative photograph", archival: "From the practice archive · illustrative photo", notice: "These are traditional names and symbolic practices, not promises of medical or financial outcomes." },
  ru: { eyebrow: "Девять ступеней", heading: "Одна ступень — одна глава пути", subtitle: "Девять ступеней — от телесной чувствительности и контакта до работы с архетипами, мандалами и собственной практикой.", level: "Ступень", settings: "Настройки ступени", application: "Что вы освоите", practice: "Практическое задание", previous: "Предыдущая ступень", next: "Следующая ступень", contact: "Узнать об обучении", final: "Перейти к материалам", phases: ["Основа · ступени 1–3", "Углубление · ступени 4–6", "Мастерский путь · ступени 7–9"], source: "Ваше авторское описание ступени", stock: "Тематическая иллюстрация", archival: "Фото из архива практик · иллюстрация темы", notice: "Названия настроек и образы относятся к традиции практики, а не являются медицинскими или финансовыми гарантиями." },
  es: { eyebrow: "Nueve etapas", heading: "Un camino, una etapa a la vez", subtitle: "Nueve etapas progresivas de práctica corporal, conexión y trabajo simbólico.", level: "Etapa", settings: "Sintonizaciones", application: "Qué aprenderás", practice: "Práctica", previous: "Etapa anterior", next: "Siguiente etapa", contact: "Consultar formación", final: "Ver materiales originales", phases: ["Base · etapas 1–3", "Profundización · etapas 4–6", "Maestría · etapas 7–9"], source: "De las notas originales del autor · traducción", stock: "Fotografía ilustrativa", archival: "Del archivo de prácticas · foto ilustrativa", notice: "Los nombres son prácticas simbólicas de una tradición, no garantías médicas o económicas." },
} as const;

export function TantraReikiJourney({locale}:{locale:PublicLocale}) {
  const c=ui[locale];
  return (
    <div className="tantra-journey">
      <div className="tantra-journey__intro">
        <p className="homeopathy-kicker">{c.eyebrow}</p>
        <h2 id="tantra-level-summary-title">{c.heading}</h2>
        <p>{c.subtitle}</p>
        <div className="tantra-journey__phase-links">
          {[0,1,2].map((group) => <a href={"#tantra-level-" + (group * 3 + 1)} key={group}>{c.phases[group]} <span aria-hidden="true">↗</span></a>)}
        </div>
      </div>
      {stages.map((stage, i) => {
        const n=i+1;
        const copy=stage[locale];
        const phase=Math.floor(i/3);
        const photo = levelPhotos[i];
        return (
          <article className={"tantra-journey__level tantra-journey__level--phase-"+phase} id={"tantra-level-"+n} key={n} aria-labelledby={"tantra-heading-"+n}>
            <figure className="tantra-journey__photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt={photo.description} style={{ objectPosition: photo.position }} loading={i === 0 ? "eager" : "lazy"} decoding="async" />
              <figcaption>{photo.archive ? c.archival : c.stock}</figcaption>
            </figure>
            <div className="tantra-journey__level-heading">
              <div className="tantra-journey__chapter">
                <span>{c.level} {String(n).padStart(2,"0")} / 09</span>
                <span>{c.phases[phase]}</span>
              </div>
              <h3 id={"tantra-heading-"+n}>{copy.title}</h3>
              <p className="tantra-journey__subtitle">{copy.subtitle}</p>
            </div>
            
            <div className="tantra-journey__details">
              <div className="tantra-journey__author-copy" aria-label={c.source}>
                <p className="tantra-journey__source-label">{c.source}</p>
                {authorDescriptions[locale][i].map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
              </div>
              <div className="tantra-journey__application"><strong>{c.application}</strong><p>{levelApplications[locale][i]}</p></div>
              <div className="tantra-journey__settings">
                <h4>{c.settings}</h4>
                <ul>{copy.att.map((att) => <li key={att}>{att}</li>)}</ul>
              </div>
              <div className="tantra-journey__practice">
                <strong>{c.practice}</strong>
                <p>{copy.practice}</p>
              </div>
              <div className="tantra-journey__actions">
                {n>1 ? <a href={"#tantra-level-"+(n-1)} aria-label={c.previous+" "+(n-1)}>← {c.previous}</a> : <a href="https://t.me/AndyTherapist" target="_blank" rel="noreferrer">{c.contact} ↗</a>}
                <a className="tantra-journey__next" href={n<9?"#tantra-level-"+(n+1):"#tantra-media"}>{n<9?c.next:c.final} →</a>
              </div>
            </div>
          </article>
        );
      })}
      <p className="tantra-journey__notice">{c.notice}</p>
    </div>
  );
}

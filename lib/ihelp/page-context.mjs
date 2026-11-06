// Public-page-only context suggestions. Never pass private page text or test answers to this resolver.
const COPY={
  "ru": {
    "general": [
      "Привет! Я iHelp, AI-помощник Holistic House. Могу подсказать, что доступно на этой странице, или ответить на другой вопрос.",
      [
        [
          "Подобрать первый шаг",
          "Помоги мне выбрать, с чего начать на Holistic House.",
          "Можно начать с бесплатного теста или практики. Расскажите своими словами, чего вы хотите достичь."
        ],
        [
          "Найти подходящий тест",
          "Хочу подобрать бесплатный тест.",
          "Помогу выбрать тест по теме. Результат теста — не диагноз.",
          "hint"
        ],
        [
          "Найти практику",
          "Помоги найти подходящую практику.",
          "Расскажите о вашем запросе и желаемом состоянии, чтобы мы сузили выбор.",
          "meditation"
        ]
      ]
    ],
    "video": [
      "Вы в видеостудии. Помогу сформулировать цель, подобрать идею или разобраться с созданием видео.",
      [
        [
          "Создать персональное видео",
          "Хочу создать своё видео.",
          "Начнём с цели и выбора темы, затем перейдём к сценарию.",
          "video"
        ],
        [
          "Посмотреть готовые видео",
          "Где посмотреть готовые видео?",
          "Готовые опубликованные видео можно посмотреть в MyTube без генерации.",
          "@videos"
        ],
        [
          "Разобрать мой запрос",
          "Помоги сформулировать запрос для видео.",
          "Напишите, что вы хотите почувствовать или изменить после просмотра. Начнём с этого пожелания."
        ]
      ]
    ],
    "ideas": [
      "Вы на вкладке идей видеостудии. Помогу с сюжетом, выбором темы и уточнением пожелания.",
      [
        [
          "Найти идею",
          "Помоги придумать идею для моего видео.",
          "Опишите цель одним предложением. Можно подобрать понятный сюжет и затем уточнить его в редакторе."
        ],
        [
          "Уточнить сценарий",
          "Помоги уточнить сценарий видео.",
          "Подскажите, какое чувство должно преобладать и какое изменение вы хотите увидеть к финалу."
        ],
        [
          "Понять следующий шаг",
          "Как перейти от идеи к созданию видео?",
          "Уточните тему и сценарий, затем перейдите к монтажу на этой странице."
        ]
      ]
    ],
    "montage": [
      "Вы в монтаже видео. Могу объяснить настройку сцен, текста и воспроизведения.",
      [
        [
          "Разобраться с монтажом",
          "Как выстроить сцены в монтаже?",
          "Начните с последовательности: вступление, основная часть и мягкое завершение. Изменения делайте в редакторе."
        ],
        [
          "Добавить текст",
          "Как добавить надписи на видео?",
          "Откройте вкладку Add text, добавьте фразы и расставьте их по времени."
        ],
        [
          "Настроить звук",
          "Как добавить музыку к моему видео?",
          "Откройте Audio в монтаже, выберите доступный трек или загрузите свой файл с правами на использование."
        ]
      ]
    ],
    "audio": [
      "Вы на настройке звука видеомонтажа. Помогу с музыкой, загрузкой собственного аудио и балансом.",
      [
        [
          "Подобрать музыку",
          "Как выбрать музыку?",
          "Сравните доступные треки в Music Library и прослушайте подходящий вариант, прежде чем применить его."
        ],
        [
          "Загрузить свой звук",
          "Как добавить собственное аудио?",
          "Переключитесь на My Audio Upload, выберите свой файл и подтвердите права на использование."
        ],
        [
          "Настроить баланс",
          "Как согласовать музыку и текст?",
          "Проверьте громкость на предпросмотре, чтобы слова оставались разборчивыми."
        ]
      ]
    ],
    "effects": [
      "Вы на вкладке эффектов видеостудии. Помогу выбрать и применить визуальный эффект.",
      [
        [
          "Выбрать мягкий эффект",
          "Как выбрать мягкий визуальный эффект?",
          "Начните с одного ненавязчивого эффекта. Оцените предпросмотр и при необходимости уменьшите интенсивность."
        ],
        [
          "Применить эффекты",
          "Как применить эффекты к видео?",
          "Выберите параметры, просмотрите результат и затем используйте кнопку применения эффектов и генерации."
        ],
        [
          "Сделать без эффектов",
          "Как создать видео без эффектов?",
          "На вкладке эффектов можно выбрать генерацию видео без дополнительных эффектов."
        ]
      ]
    ],
    "text": [
      "Вы на вкладке добавления текста в видео. Помогу с формулировками и размещением надписей.",
      [
        [
          "Подобрать формулировки",
          "Помоги придумать короткие фразы для видео.",
          "Напишите цель и желаемое состояние. Подберём короткие спокойные фразы без обещаний гарантированного результата."
        ],
        [
          "Распределить по времени",
          "Как расположить текст по времени?",
          "Разместите фразы в нужном порядке на таймлайне и проверьте предпросмотр."
        ],
        [
          "Выбрать анимацию",
          "Как оживить надписи?",
          "Используйте умеренное движение, увеличение или появление, чтобы текст оставался читаемым."
        ]
      ]
    ],
    "tests": [
      "Вы в разделе тестов. Могу помочь выбрать самооценку, понять вопросы или объяснить результат.",
      [
        [
          "Выбрать тест",
          "Помоги выбрать тест по моему запросу.",
          "Расскажите, какая тема сейчас важнее: стресс, отношения, ресурсы или другое.",
          "hint"
        ],
        [
          "Разобраться с вопросом",
          "Помоги разобраться с вопросом теста.",
          "Напишите сам вопрос без личных данных. Я объясню его смысл, но не буду подсказывать «правильный» ответ."
        ],
        [
          "Понять результат",
          "Как правильно понимать результат теста?",
          "Показатели отражают ваши ответы и не являются диагнозом. Обсудим шкалу и возможные следующие шаги."
        ]
      ]
    ],
    "learning": [
      "Вы в разделе обучения и практик. Помогу выбрать курс, разобраться с уроком или продолжить занятия.",
      [
        [
          "Подобрать курс",
          "Как выбрать курс для себя?",
          "Сначала уточним цель и сколько времени вы готовы уделять практике. Посмотреть доступные курсы можно в Академии.",
          "@academy"
        ],
        [
          "Разобрать задание",
          "Помоги понять практическое задание урока.",
          "Опишите задание или вопрос своими словами. Я помогу разобраться без предположений о вашем личном прогрессе."
        ],
        [
          "Найти мягкую практику",
          "Хочу попробовать короткую практику.",
          "Подберём мягкий образовательный формат с учётом вашего пожелания.",
          "meditation"
        ]
      ]
    ],
    "services": [
      "Вы в разделе услуг. Помогу разобраться с форматами поддержки и следующим шагом.",
      [
        [
          "Выбрать формат",
          "Помоги выбрать формат персональной поддержки.",
          "Расскажите, что вы хотите прояснить: ситуацию, эмоциональное состояние или отношения. Я объясню варианты без обещания результата."
        ],
        [
          "Бесплатный разбор",
          "Как получить бесплатный разбор ситуации?",
          "На странице бесплатного разбора можно описать запрос и отправить его специалисту. Отправка не означает подтверждённую запись.",
          "@review"
        ],
        [
          "Узнать о сессии",
          "Как проходит личная консультация?",
          "Сначала обсуждаются ваш запрос и границы работы; формат и условия подтверждаются до записи."
        ]
      ]
    ],
    "library": [
      "Вы в библиотеке. Помогу найти материал, разобраться с темой или подобрать связанную практику.",
      [
        [
          "Найти материалы",
          "Помоги найти материалы по нужной теме.",
          "Напишите тему или ключевой вопрос. Я подскажу подходящее направление поиска."
        ],
        [
          "Объяснить понятие",
          "Помоги объяснить понятие из статьи.",
          "Пришлите термин или короткий отрывок — разберём его простыми словами."
        ],
        [
          "Подобрать практику",
          "Хочу перейти от чтения к практике.",
          "Можно выбрать короткую добровольную практику, подходящую вашей цели.",
          "meditation"
        ]
      ]
    ],
    "mytube": [
      "Вы в MyTube — каталоге готовых видео. Помогу выбрать ролик или перейти к созданию своего.",
      [
        [
          "Подобрать видео",
          "Помоги выбрать готовое видео.",
          "Какая тема ближе: спокойствие, энергия, отношения или смыслы?"
        ],
        [
          "Создать своё видео",
          "Хочу создать персональное видео.",
          "Давайте сначала сформулируем цель и выберем тему.",
          "video"
        ],
        [
          "Открыть видеостудию",
          "Где создать собственное видео?",
          "Создание персонального видео начинается в видеостудии.",
          "@studio"
        ]
      ]
    ],
    "account": [
      "Вы в личном кабинете. Помогу с навигацией по разделам, без доступа к вашим приватным записям.",
      [
        [
          "Найти свои материалы",
          "Где посмотреть мои материалы?",
          "Используйте разделы кабинета с курсами, сообщениями и результатами. Я не читаю их содержимое без вашего действия."
        ],
        [
          "Понять следующий шаг",
          "Как продолжить обучение?",
          "Откройте свои курсы и выберите сохранённый урок. Я помогу разобраться с текстом задания."
        ],
        [
          "Задать вопрос о работе кабинета",
          "Помоги разобраться с личным кабинетом.",
          "Опишите, какой раздел или кнопка вызывает вопрос. Не отправляйте пароли или приватные данные."
        ]
      ]
    ],
    "shop": [
      "Вы в магазине. Помогу разобраться с товарами, условиями и оформлением без автоматической покупки.",
      [
        [
          "Выбрать подходящее",
          "Помоги разобраться с товарами.",
          "Напишите, какую задачу хотите решить и что именно сравнить."
        ],
        [
          "Как оформить",
          "Как устроено оформление заказа?",
          "Просмотрите описание, стоимость и условия перед подтверждением. Оплата совершается только по вашему действию."
        ],
        [
          "Вопрос о покупке",
          "У меня вопрос о покупке.",
          "Опишите вопрос без платёжных реквизитов и паролей."
        ]
      ]
    ]
  },
  "en": {
    "general": [
      "Hello! I'm iHelp, your Holistic House AI guide. I can help you find your way around this page or answer another question.",
      [
        [
          "Find a starting point",
          "Help me decide where to begin on Holistic House.",
          "A free self-check or a short practice is a good place to start. Tell me what you hope to achieve."
        ],
        [
          "Choose a test",
          "Help me pick a free test.",
          "Let's choose a topic for a self-check. Tests are not diagnoses.",
          "hint"
        ],
        [
          "Find a practice",
          "Help me find a suitable practice.",
          "Tell me what you need and how you want to feel afterwards.",
          "meditation"
        ]
      ]
    ],
    "video": [
      "You're in Video Studio. I can help you express your goal, choose an idea or understand the editor.",
      [
        [
          "Create my video",
          "I want to create a personal video.",
          "Let's start with your goal and topic.",
          "video"
        ],
        [
          "Watch ready-made videos",
          "Where can I watch ready-made videos?",
          "You can browse published videos in MyTube without generating one.",
          "@videos"
        ],
        [
          "Clarify my request",
          "Help me write my video goal.",
          "Tell me what you hope to feel or change after watching."
        ]
      ]
    ],
    "ideas": [
      "You're on the Video Ideas step. Let's shape a story that matches your goal.",
      [
        [
          "Suggest an idea",
          "Help me come up with a video idea.",
          "Describe your goal in one sentence. We can shape it into a simple scene plan."
        ],
        [
          "Refine the story",
          "Help me refine the video story.",
          "What emotion should lead the story, and how should it end?"
        ],
        [
          "What comes next?",
          "How do I move from an idea to video editing?",
          "Select a topic and story, then continue to the editor on this page."
        ]
      ]
    ],
    "montage": [
      "You're editing your video. I can help with scene order, on-screen text and sound.",
      [
        [
          "Arrange scenes",
          "How should I arrange my scenes?",
          "Try a simple beginning, main sequence and gentle ending. Make changes in the editor."
        ],
        [
          "Add text",
          "How do I add on-screen text?",
          "Open Add text, choose short lines and place them along the timeline."
        ],
        [
          "Add music",
          "How do I add music?",
          "Open Audio, select a licensed track or upload audio you have permission to use."
        ]
      ]
    ],
    "audio": [
      "You're in the audio editor. I can help with the music library, uploading sound and volume.",
      [
        [
          "Choose music",
          "How do I choose music?",
          "Listen to available Music Library tracks before selecting one."
        ],
        [
          "Upload my audio",
          "How do I upload my own audio?",
          "Switch to My Audio Upload, select a file and confirm your rights to use it."
        ],
        [
          "Balance audio",
          "How can I balance voice and music?",
          "Preview the mix and lower music as needed to keep spoken words clear."
        ]
      ]
    ],
    "effects": [
      "You're on the Effects step. I can explain the visual effects and how to apply them.",
      [
        [
          "Choose a gentle effect",
          "Which visual effect should I start with?",
          "Try one subtle effect, preview it and reduce intensity if needed."
        ],
        [
          "Apply effects",
          "How do I apply the effects?",
          "Select and preview the effect, then use the apply-and-generate action."
        ],
        [
          "Generate without effects",
          "Can I generate without effects?",
          "Yes. Use the option to generate the video without additional effects."
        ]
      ]
    ],
    "text": [
      "You're adding text to the video. I can help with wording, timing and motion.",
      [
        [
          "Write short lines",
          "Help me write short affirming lines.",
          "Tell me your goal. We'll choose brief, grounded wording without promised outcomes."
        ],
        [
          "Place text on timeline",
          "How do I position text over time?",
          "Arrange the lines along the timeline and check their appearance in the preview."
        ],
        [
          "Choose animation",
          "How can text move?",
          "Keep movement, scale and rotation gentle enough to preserve readability."
        ]
      ]
    ],
    "tests": [
      "You're in Tests. I can help you choose a self-check, understand a question or interpret a score.",
      [
        [
          "Choose a test",
          "Help me select a test.",
          "Which topic matters most: stress, relationships, resources or something else?",
          "hint"
        ],
        [
          "Explain a question",
          "Can you explain a test question?",
          "Share the wording without private details. I'll explain its meaning, not tell you how to answer."
        ],
        [
          "Understand a result",
          "How should I read my test results?",
          "Scores reflect your responses and are not a diagnosis. We can discuss what a scale means."
        ]
      ]
    ],
    "learning": [
      "You're in the learning area. I can help you find a course, understand a lesson or choose a practice.",
      [
        [
          "Find a course",
          "Which course should I choose?",
          "What are you hoping to learn, and how much time would you like to spend? Explore the available courses in Academy.",
          "@academy"
        ],
        [
          "Explain a lesson",
          "Help me understand a lesson.",
          "Share the question or task in your own words. I won't assume your personal progress."
        ],
        [
          "Find a gentle practice",
          "I want a short, gentle practice.",
          "Let's pick an optional educational practice suited to your goal.",
          "meditation"
        ]
      ]
    ],
    "services": [
      "You're looking at support services. I can explain the options and next steps.",
      [
        [
          "Compare formats",
          "Which kind of personal support fits my needs?",
          "Describe what you want to explore, and I'll explain the options without making promises."
        ],
        [
          "Free situation review",
          "How do I request a free situation review?",
          "Use the free review page to describe your request. Sending it is not a confirmed booking.",
          "@review"
        ],
        [
          "How sessions work",
          "How does a personal session work?",
          "You'll first discuss your goals and boundaries; the format and terms are confirmed before booking."
        ]
      ]
    ],
    "library": [
      "You're browsing the Library. I can help find a topic, explain a term or suggest a related practice.",
      [
        [
          "Find a resource",
          "Help me find an article or book.",
          "Tell me the topic or question you want to explore."
        ],
        [
          "Explain a concept",
          "Explain a concept I just read.",
          "Share a term or brief excerpt and I'll explain it simply."
        ],
        [
          "Try a practice",
          "Help me find a practice related to this topic.",
          "We can explore a gentle, voluntary practice related to your goal.",
          "meditation"
        ]
      ]
    ],
    "mytube": [
      "You're in MyTube, the ready-made video library. I can help you choose a video or create your own.",
      [
        [
          "Choose a video",
          "Help me pick a ready-made video.",
          "Which theme fits: calm, energy, relationships or meaning?"
        ],
        [
          "Make a personal video",
          "I'd like a personal video.",
          "We'll start with your goal and topic.",
          "video"
        ],
        [
          "Open Video Studio",
          "Where can I make my own video?",
          "You can start in Video Studio.",
          "@studio"
        ]
      ]
    ],
    "account": [
      "You're in your account. I can explain the navigation without reading your private records.",
      [
        [
          "Find my materials",
          "Where are my saved materials?",
          "Use the cabinet sections for courses, messages and results. I don't read their contents automatically."
        ],
        [
          "Continue learning",
          "How can I continue my course?",
          "Open My Courses, select your saved lesson and ask about its instructions."
        ],
        [
          "Ask about the cabinet",
          "Help me use my account.",
          "Tell me which section or button you're unsure about, without sharing passwords or private records."
        ]
      ]
    ],
    "shop": [
      "You're in the Shop. I can explain items, checkout and conditions without placing an order.",
      [
        [
          "Compare options",
          "Help me understand these products.",
          "Tell me what you would like to compare."
        ],
        [
          "How checkout works",
          "How do I place an order?",
          "Review the description, pricing and terms. Payment only happens when you confirm it."
        ],
        [
          "Purchase question",
          "I have a question about a purchase.",
          "Describe the issue without sharing payment details or passwords."
        ]
      ]
    ]
  },
  "es": {
    "general": [
      "¡Hola! Soy iHelp, tu guía de IA de Holistic House. Puedo orientarte en esta página o responder otra pregunta.",
      [
        [
          "Elegir por dónde empezar",
          "Ayúdame a saber por dónde empezar.",
          "Puedes comenzar con una autoevaluación gratuita o una práctica breve. Cuéntame tu objetivo."
        ],
        [
          "Elegir un test",
          "Ayúdame a elegir un test gratuito.",
          "Primero elijamos un tema. Los tests no son diagnósticos.",
          "hint"
        ],
        [
          "Buscar una práctica",
          "Ayúdame a encontrar una práctica.",
          "Cuéntame qué necesitas y cómo quieres sentirte después.",
          "meditation"
        ]
      ]
    ],
    "video": [
      "Estás en Video Studio. Te ayudo a definir el objetivo, escoger una idea o usar el editor.",
      [
        [
          "Crear mi vídeo",
          "Quiero crear un vídeo personal.",
          "Empecemos por tu objetivo y tema.",
          "video"
        ],
        [
          "Ver vídeos existentes",
          "¿Dónde puedo ver vídeos listos?",
          "Puedes ver los vídeos publicados en MyTube sin generar ninguno.",
          "@videos"
        ],
        [
          "Aclarar mi objetivo",
          "Ayúdame a escribir mi objetivo para el vídeo.",
          "Cuéntame cómo quieres sentirte o qué quieres cambiar al verlo."
        ]
      ]
    ],
    "ideas": [
      "Estás en la etapa de ideas. Podemos dar forma al relato de tu vídeo.",
      [
        [
          "Sugerir una idea",
          "Ayúdame a idear un vídeo.",
          "Describe tu objetivo en una frase. Podemos convertirlo en una secuencia de escenas."
        ],
        [
          "Afinar la historia",
          "Ayúdame a afinar la historia.",
          "¿Qué emoción quieres transmitir y qué final imaginas?"
        ],
        [
          "Siguiente paso",
          "¿Cómo paso de la idea a la edición?",
          "Elige el tema y la historia, y sigue con el editor en esta página."
        ]
      ]
    ],
    "montage": [
      "Estás en el montaje del vídeo. Te puedo ayudar con escenas, textos y sonido.",
      [
        [
          "Ordenar escenas",
          "¿Cómo ordeno las escenas?",
          "Prueba un comienzo, una parte central y un cierre suave. Haz los cambios en el editor."
        ],
        [
          "Añadir texto",
          "¿Cómo añado texto al vídeo?",
          "Abre Add text, escribe frases breves y distribúyelas en la línea de tiempo."
        ],
        [
          "Añadir música",
          "¿Cómo añado música?",
          "Abre Audio, elige una pista con licencia o sube un archivo que puedas utilizar."
        ]
      ]
    ],
    "audio": [
      "Estás configurando el audio. Te ayudo con música, archivos propios y volumen.",
      [
        [
          "Elegir música",
          "¿Cómo elijo música?",
          "Escucha las pistas disponibles en Music Library antes de elegir."
        ],
        [
          "Subir audio",
          "¿Cómo subo mi audio?",
          "Ve a My Audio Upload, elige tu archivo y confirma los derechos de uso."
        ],
        [
          "Ajustar volumen",
          "¿Cómo equilibro voz y música?",
          "Escucha la mezcla y baja la música para que las palabras se entiendan."
        ]
      ]
    ],
    "effects": [
      "Estás en Efectos. Te ayudo a elegir y aplicar efectos visuales.",
      [
        [
          "Efecto suave",
          "¿Qué efecto visual me conviene?",
          "Empieza con un efecto discreto, revisa la vista previa y reduce la intensidad si hace falta."
        ],
        [
          "Aplicar efectos",
          "¿Cómo aplico los efectos?",
          "Elige los ajustes, revisa la vista previa y usa la opción de aplicar y generar."
        ],
        [
          "Sin efectos",
          "¿Puedo generar sin efectos?",
          "Sí. Puedes generar el vídeo sin efectos adicionales."
        ]
      ]
    ],
    "text": [
      "Estás añadiendo texto. Te ayudo con frases, tiempos y animaciones.",
      [
        [
          "Escribir frases",
          "Ayúdame a escribir frases cortas.",
          "Cuéntame tu objetivo; escogeremos frases breves sin promesas de resultados."
        ],
        [
          "Colocar frases",
          "¿Cómo coloco el texto en el tiempo?",
          "Distribuye las frases en la línea de tiempo y comprueba la vista previa."
        ],
        [
          "Animar texto",
          "¿Cómo puedo animar el texto?",
          "Usa movimiento, escala o giro suaves para mantener la legibilidad."
        ]
      ]
    ],
    "tests": [
      "Estás en Tests. Te ayudo a elegir una autoevaluación y comprender preguntas o resultados.",
      [
        [
          "Elegir test",
          "Ayúdame a elegir un test.",
          "¿Qué te interesa: estrés, relaciones, recursos u otro tema?",
          "hint"
        ],
        [
          "Explicar pregunta",
          "¿Qué significa esta pregunta?",
          "Comparte el texto sin datos personales. Explicaré su sentido, no cómo responderla."
        ],
        [
          "Comprender resultado",
          "¿Cómo interpreto un resultado?",
          "Las puntuaciones reflejan tus respuestas, no un diagnóstico. Podemos comentar la escala."
        ]
      ]
    ],
    "learning": [
      "Estás en la zona de aprendizaje. Te ayudo a elegir un curso o comprender una lección.",
      [
        [
          "Buscar curso",
          "¿Qué curso debería elegir?",
          "Cuéntame tu objetivo y el tiempo disponible. Puedes explorar los cursos en la Academia.",
          "@academy"
        ],
        [
          "Aclarar una lección",
          "Ayúdame a entender una lección.",
          "Comparte la tarea o pregunta en tus palabras. No asumiré tu progreso."
        ],
        [
          "Práctica suave",
          "Quiero una práctica breve.",
          "Buscaremos una práctica educativa suave y voluntaria.",
          "meditation"
        ]
      ]
    ],
    "services": [
      "Estás viendo los servicios. Te ayudo a conocer las opciones y el siguiente paso.",
      [
        [
          "Comparar formatos",
          "¿Qué forma de apoyo puedo elegir?",
          "Cuéntame qué deseas explorar. Explicaré las opciones sin prometer resultados."
        ],
        [
          "Revisión gratuita",
          "¿Cómo solicito una revisión gratuita?",
          "Puedes describir tu situación en la página de revisión gratuita. No es una reserva confirmada.",
          "@review"
        ],
        [
          "Cómo son las sesiones",
          "¿Cómo funciona una sesión personal?",
          "Primero se aclaran los objetivos y límites; el formato y las condiciones se confirman antes de reservar."
        ]
      ]
    ],
    "library": [
      "Estás en la Biblioteca. Te ayudo a encontrar materiales, explicar un término o buscar una práctica.",
      [
        [
          "Encontrar material",
          "Ayúdame a encontrar un libro o artículo.",
          "Dime el tema o la pregunta que quieres explorar."
        ],
        [
          "Explicar concepto",
          "Explícame un concepto.",
          "Comparte un término o fragmento breve y lo explico con palabras sencillas."
        ],
        [
          "Probar práctica",
          "Quiero una práctica relacionada.",
          "Podemos buscar una práctica voluntaria según tu objetivo.",
          "meditation"
        ]
      ]
    ],
    "mytube": [
      "Estás en MyTube, la biblioteca de vídeos. Te ayudo a elegir uno o crear el tuyo.",
      [
        [
          "Elegir vídeo",
          "Ayúdame a escoger un vídeo.",
          "¿Qué prefieres: calma, energía, relaciones o sentido?"
        ],
        [
          "Crear vídeo",
          "Quiero un vídeo personal.",
          "Comencemos con tu objetivo y tema.",
          "video"
        ],
        [
          "Abrir Video Studio",
          "¿Dónde puedo crear mi vídeo?",
          "Puedes empezar en Video Studio.",
          "@studio"
        ]
      ]
    ],
    "account": [
      "Estás en tu cuenta. Te ayudo a navegar sin leer tus datos privados.",
      [
        [
          "Encontrar materiales",
          "¿Dónde están mis materiales?",
          "Busca las secciones de cursos, mensajes y resultados. No leo su contenido automáticamente."
        ],
        [
          "Seguir aprendiendo",
          "¿Cómo continúo mi curso?",
          "Abre Mis cursos, elige tu lección guardada y pregunta por las instrucciones."
        ],
        [
          "Ayuda con la cuenta",
          "Ayúdame a usar mi cuenta.",
          "Dime qué sección o botón te genera dudas, sin compartir contraseñas ni datos privados."
        ]
      ]
    ],
    "shop": [
      "Estás en la tienda. Te ayudo a entender los productos y el pago, sin comprar automáticamente.",
      [
        [
          "Comparar productos",
          "Ayúdame a comparar las opciones.",
          "Dime qué opciones te interesan."
        ],
        [
          "Hacer un pedido",
          "¿Cómo hago un pedido?",
          "Revisa la descripción, el precio y las condiciones. Solo pagas cuando lo confirmas."
        ],
        [
          "Pregunta sobre compra",
          "Tengo una pregunta sobre una compra.",
          "Explica tu duda sin compartir datos de pago ni contraseñas."
        ]
      ]
    ]
  }
};
export function pageHelpFromRoute({locale="en",pathname="",hash="",activeTab="",photo=false}={}){
 const lang=["ru","en","es"].includes(locale)?locale:"en";
 // The helper never echoes path segments, query strings, tab labels, private records or account state.
 const path=typeof pathname==="string"?pathname.replace(/^\/(ru|en|es)(?=\/|$)/,""):"";
 const tab=["video","ideas","editor","effects","audio","text","settings","montage"].includes(activeTab)?activeTab:"";
 let type="general";
 if(/^\/(?:holistic-support\/mandala|video-studio)(?:\/|$)/.test(path)){
   if(photo)type="video";
   else if(tab==="ideas"||/^(?:#video-ideas|#video-director-ideas)$/.test(hash))type="ideas";
   else if(tab==="effects"||/^(?:#video-effects|#video-hypnosis)$/.test(hash))type="effects";
   else if(tab==="audio"||hash==="#video-audio")type="audio";
   else if(tab==="text"||hash==="#video-text")type="text";
   else if(["editor","montage","settings"].includes(tab))type="montage";
   else type="video";
 }else if(/^\/(?:app\/)?tests(?:\/|$)/.test(path))type="tests";
 else if(/^\/(?:academy|courses?|(?:app\/)?(?:my-course|learning-path)|holistic-support\/mobile|practice|meditations|temple-insights)(?:\/|$)/.test(path))type="learning";
 else if(/^\/(?:mytube)(?:\/|$)/.test(path))type="mytube";
 else if(/^\/(?:services|masters|coaching|temple-support)(?:\/|$)/.test(path))type="services";
 else if(/^\/(?:library|books|articles|dao)(?:\/|$)/.test(path))type="library";
 else if(/^\/(?:shop|cart|payments)(?:\/|$)/.test(path))type="shop";
 else if(/^\/(?:app|client|report|admin|prescriptions|pro)(?:\/|$)/.test(path))type="account";
 const [greeting,items]=COPY[lang][type];
 const destinations={videos:"/"+lang+"/mytube",studio:"/"+lang+"/holistic-support/mandala",
   academy:"/"+lang+"/academy",review:"/"+lang+"/services/free-situation-review"};
 const actions=items.map(([label,prompt,reply,extra],index)=>{
   const action={id:type+"-"+(index+1),label,prompt,reply};
   if(["video","meditation","hint"].includes(extra))action.track=extra;
   else if(typeof extra==="string"&&extra.startsWith("@")&&destinations[extra.slice(1)])
     action.href=destinations[extra.slice(1)];
   return action;
 });
 return {greeting,section:type,actions};
}

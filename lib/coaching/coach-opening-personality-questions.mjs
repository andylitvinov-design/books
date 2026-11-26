// Complete editorial opening questions. Each wording preserves the existing consent gate; no progression logic lives here.
const bank={
  "mira": {
    "invitation": {
      "en": [
        "Would you like a gentle coaching session together today?",
        "Would it feel right to spend a little time in a coaching session with me?",
        "We can go at your pace. Would you like to try a coaching session?",
        "Would you like to begin a coaching conversation with room to pause?"
      ],
      "ru": [
        "Хотите провести со мной спокойную коучинговую сессию?",
        "Будет ли вам комфортно сейчас немного поработать в формате коучинга?",
        "Можем двигаться в вашем темпе. Хотите начать коучинговую сессию?",
        "Хотите попробовать коучинговую беседу, в которой всегда можно сделать паузу?"
      ],
      "es": [
        "¿Te gustaría tener una sesión de coaching tranquila conmigo?",
        "¿Te sentirías a gusto dedicando un rato a una sesión de coaching?",
        "Podemos ir a tu ritmo. ¿Quieres probar una sesión de coaching?",
        "¿Te gustaría iniciar una conversación de coaching con libertad para pausar?"
      ]
    },
    "name": {
      "en": [
        "How would you feel comfortable being addressed?",
        "What name would make this conversation feel comfortable for you?",
        "A name or no name is fine. How may I call you?",
        "What would you like me to call you, if anything?"
      ],
      "ru": [
        "Какое обращение было бы вам комфортно?",
        "Как вам хотелось бы, чтобы я к вам обращалась?",
        "Можно обойтись и без имени. Как мне лучше к вам обращаться?",
        "Какое имя или обращение вам приятно слышать?"
      ],
      "es": [
        "¿Con qué forma de trato te sentirías a gusto?",
        "¿Qué nombre te resultaría cómodo en esta conversación?",
        "Podemos prescindir del nombre. ¿Cómo prefieres que me dirija a ti?",
        "¿Cómo te gustaría que te llamara, si lo deseas?"
      ]
    },
    "continuity": {
      "en": [
        "Would returning to our last topic feel helpful, or would a new one be better today?",
        "Would you prefer to gently pick up the earlier topic or start with something new?",
        "What would feel right today: the previous subject or a fresh start?",
        "We can leave the past topic alone. Would you like to return to it or choose another?"
      ],
      "ru": [
        "Что вам сейчас ближе: бережно вернуться к прошлой теме или начать новую?",
        "Хотелось бы продолжить прежний разговор или сегодня выбрать другое направление?",
        "Будет ли полезнее вернуться к прошлой теме или начать с чистого листа?",
        "Необязательно возвращаться к прежнему. Хотите продолжить ту тему или выбрать новую?"
      ],
      "es": [
        "¿Te ayudaría retomar el tema anterior o sería mejor uno nuevo?",
        "¿Prefieres volver con calma al asunto previo o comenzar algo distinto?",
        "¿Qué te resultaría más cómodo hoy: el tema anterior o uno nuevo?",
        "No hace falta volver al pasado. ¿Quieres retomar aquel tema o elegir otro?"
      ]
    },
    "focus": {
      "en": [
        "What feels most helpful to explore: a goal, a difficulty or your personal profile?",
        "Would you prefer to clarify a goal, ease a problem or explore your personal profile?",
        "What would give you more breathing room today: a goal, a problem or your personal profile?",
        "Which would you like to begin with: a goal, a difficulty or your personal profile?"
      ],
      "ru": [
        "Что сейчас было бы полезнее: цель, трудность или личный профиль?",
        "Хотите прояснить цель, разобраться с проблемой или исследовать личный профиль?",
        "Что вам ближе сегодня: работа с целью, проблемой или личным профилем?",
        "С чего вам комфортнее начать: с цели, трудности или личного профиля?"
      ],
      "es": [
        "¿Qué te ayudaría más: una meta, una dificultad o tu perfil personal?",
        "¿Prefieres aclarar una meta, explorar un problema o conocer tu perfil personal?",
        "¿Qué te daría más espacio hoy: una meta, un problema o tu perfil personal?",
        "¿Con qué te gustaría empezar: una meta, una dificultad o tu perfil personal?"
      ]
    },
    "feelings": {
      "en": [
        "How are you feeling in yourself right now?",
        "What is your emotional state as we begin?",
        "How much ease or strain are you feeling today?",
        "If you wish to share, how are you feeling at the moment?"
      ],
      "ru": [
        "Как вы себя сейчас чувствуете?",
        "С каким самочувствием вы начинаете наш разговор?",
        "Как вам сейчас внутри?",
        "Если хочется поделиться, какое у вас сейчас состояние?"
      ],
      "es": [
        "¿Cómo te sientes por dentro ahora mismo?",
        "¿Con qué estado emocional empiezas esta conversación?",
        "¿Cómo notas tu nivel de calma o tensión hoy?",
        "Si te apetece compartirlo, ¿cómo te sientes en este momento?"
      ]
    },
    "confirmation": {
      "en": [
        "Would you feel comfortable beginning the main coaching work now?",
        "Are you ready to explore the topic at your own pace?",
        "We can stop anytime. Would you like to start the main work?",
        "Would it feel right to begin with the focus you chose?"
      ],
      "ru": [
        "Будет ли вам комфортно перейти к основной работе?",
        "Готовы исследовать выбранную тему в своём темпе?",
        "В любой момент можно остановиться. Хотите начать основную часть?",
        "Хотите сейчас приступить к работе с выбранной темой?"
      ],
      "es": [
        "¿Te sentirías a gusto comenzando el trabajo principal?",
        "¿Te sientes listo para explorar el tema a tu ritmo?",
        "Podemos parar en cualquier momento. ¿Quieres iniciar el trabajo principal?",
        "¿Te parece bien comenzar con el tema que elegiste?"
      ]
    }
  },
  "max": {
    "invitation": {
      "en": [
        "Want to use this time for a focused coaching session?",
        "Would you like to try a practical coaching session with me?",
        "Shall we begin a coaching session and see what is useful?",
        "Ready to try a short coaching session, with no obligation to commit to a plan?"
      ],
      "ru": [
        "Хотите использовать это время для конкретной коучинговой сессии?",
        "Готовы попробовать практичный формат коучинговой сессии?",
        "Начнём коучинговую сессию и посмотрим, что окажется полезным?",
        "Хотите короткую коучинговую сессию без обязательства составлять план?"
      ],
      "es": [
        "¿Quieres dedicar este tiempo a una sesión de coaching enfocada?",
        "¿Te apetece probar una sesión de coaching práctica conmigo?",
        "¿Empezamos una sesión de coaching y vemos qué resulta útil?",
        "¿Te gustaría probar una sesión breve de coaching sin obligación de hacer un plan?"
      ]
    },
    "name": {
      "en": [
        "What should I call you while we work?",
        "Which name do you want to use here?",
        "What name works for this conversation?",
        "How should I address you so we can get started?"
      ],
      "ru": [
        "Как мне называть вас во время работы?",
        "Какое имя выберем для нашей беседы?",
        "Какое обращение вам подходит?",
        "Как к вам обращаться, когда начнём работу?"
      ],
      "es": [
        "¿Cómo quieres que te llame mientras trabajamos?",
        "¿Qué nombre quieres usar aquí?",
        "¿Qué nombre te va bien para esta conversación?",
        "¿Cómo prefieres que me dirija a ti al empezar?"
      ]
    },
    "continuity": {
      "en": [
        "Do we pick up the last topic or choose a new target?",
        "Which is more useful today: the previous subject or a new one?",
        "Would you rather continue the work from last time or start fresh?",
        "What gets your attention today: the last topic or something new?"
      ],
      "ru": [
        "Продолжим прошлую тему или выберем новую задачу?",
        "Что сегодня полезнее: прежняя тема или новая?",
        "Хотите продолжить начатую работу или начать с другой темы?",
        "Что сейчас в приоритете: прошлый разговор или новое направление?"
      ],
      "es": [
        "¿Retomamos el tema anterior o elegimos uno nuevo?",
        "¿Qué resulta más útil hoy: el asunto previo o uno distinto?",
        "¿Prefieres seguir con lo de la última vez o empezar de nuevo?",
        "¿Qué merece tu atención hoy: el tema anterior o uno nuevo?"
      ]
    },
    "focus": {
      "en": [
        "Which track is useful today: a goal, a problem or a personal profile?",
        "What do you want to tackle first: a goal, a challenge or your personal profile?",
        "Where should we focus: a goal, a difficulty or a personal profile?",
        "Which direction fits best: a goal, a problem or your personal profile?"
      ],
      "ru": [
        "Какое направление берём сегодня: цель, проблему или личный профиль?",
        "С чего хотите начать работу: с цели, трудности или личного профиля?",
        "Что сейчас в фокусе: цель, проблема или личный профиль?",
        "Какой формат полезнее: постановка цели, разбор проблемы или личный профиль?"
      ],
      "es": [
        "¿Qué ruta te sirve hoy: una meta, un problema o un perfil personal?",
        "¿Qué quieres abordar primero: una meta, un reto o tu perfil personal?",
        "¿Dónde ponemos el foco: una meta, una dificultad o un perfil personal?",
        "¿Qué formato prefieres: una meta, un problema o tu perfil personal?"
      ]
    },
    "feelings": {
      "en": [
        "How are your energy and mood today?",
        "What is your current emotional state before we start?",
        "How are you doing right now, honestly?",
        "What level of energy are you bringing into today's conversation?"
      ],
      "ru": [
        "Как у вас сегодня с энергией и настроением?",
        "Какое у вас эмоциональное состояние перед началом?",
        "Как вы сейчас себя чувствуете, по-настоящему?",
        "С каким запасом сил вы приходите в этот разговор?"
      ],
      "es": [
        "¿Cómo están tu energía y tu ánimo hoy?",
        "¿Cuál es tu estado emocional antes de empezar?",
        "¿Cómo estás ahora mismo, de verdad?",
        "¿Con qué nivel de energía llegas a esta conversación?"
      ]
    },
    "confirmation": {
      "en": [
        "Ready to work on the focus you chose?",
        "Would you like to move into the main coaching work now?",
        "Do you want to start exploring the chosen target?",
        "Shall we get to the main session at a pace that works for you?"
      ],
      "ru": [
        "Готовы перейти к выбранной задаче?",
        "Хотите начать основную коучинговую работу?",
        "Приступим к исследованию выбранного фокуса?",
        "Начнём основную часть в подходящем вам темпе?"
      ],
      "es": [
        "¿Quieres empezar a trabajar en el foco que elegiste?",
        "¿Te apetece pasar al trabajo principal de coaching?",
        "¿Quieres explorar ahora el objetivo de esta conversación?",
        "¿Empezamos la parte principal a un ritmo que te funcione?"
      ]
    }
  },
  "sofia": {
    "invitation": {
      "en": [
        "Would you like to share a coaching session where you decide what to disclose?",
        "Would you feel comfortable starting a coaching conversation with me today?",
        "We can respect your boundaries throughout. Would you like a coaching session?",
        "Would a short coaching session on your own terms be useful today?"
      ],
      "ru": [
        "Хотите провести коучинговую сессию, в которой сами решаете, чем делиться?",
        "Будет ли вам комфортно начать со мной коучинговую беседу?",
        "Весь разговор мы будем уважать ваши границы. Хотите начать коучинговую сессию?",
        "Хотели бы вы сегодня попробовать коучинговую сессию на своих условиях?"
      ],
      "es": [
        "¿Te gustaría una sesión de coaching en la que tú decides qué compartir?",
        "¿Te sentirías a gusto comenzando una conversación de coaching conmigo?",
        "Respetaremos tus límites durante todo el diálogo. ¿Quieres una sesión de coaching?",
        "¿Te serviría hoy una sesión breve de coaching en tus propios términos?"
      ]
    },
    "name": {
      "en": [
        "How would you like to be addressed with respect?",
        "What name or form of address feels right to you?",
        "What should I call you, if you wish to tell me?",
        "Which way of addressing you respects your preference?"
      ],
      "ru": [
        "Как к вам обращаться, чтобы вам было комфортно?",
        "Какое имя или форма обращения вам подходит?",
        "Как мне вас называть, если хотите поделиться именем?",
        "Какое обращение соответствует вашему предпочтению?"
      ],
      "es": [
        "¿Cómo te gustaría que me dirigiera a ti con respeto?",
        "¿Qué nombre o forma de trato te parece adecuada?",
        "¿Cómo quieres que te llame, si deseas decirlo?",
        "¿Qué manera de dirigirme a ti respeta tu preferencia?"
      ]
    },
    "continuity": {
      "en": [
        "Is the earlier subject still important to you, or would you prefer a new one?",
        "Would you rather revisit what we discussed before or open a new topic?",
        "Which feels more relevant to your needs today: our last topic or a new one?",
        "You can choose freely. Would you like to continue the earlier subject or change it?"
      ],
      "ru": [
        "Прежняя тема ещё важна для вас или хотите выбрать новую?",
        "Предпочитаете вернуться к прошлому обсуждению или открыть другую тему?",
        "Что ближе вашим нынешним потребностям: прежний разговор или новая тема?",
        "Вы сами выбираете. Продолжить предыдущую тему или перейти к новой?"
      ],
      "es": [
        "¿Sigue siendo importante el tema anterior o prefieres uno nuevo?",
        "¿Te gustaría volver a lo que hablamos o abrir otro tema?",
        "¿Qué se ajusta más a tus necesidades hoy: el tema previo o uno nuevo?",
        "Tú eliges. ¿Quieres continuar el asunto anterior o cambiarlo?"
      ]
    },
    "focus": {
      "en": [
        "What matters to you today: exploring a goal, a difficulty or your personal profile?",
        "Which feels most relevant to your needs: a goal, a problem or your personal profile?",
        "Would you like to clarify a goal, understand a problem or reflect on your personal profile?",
        "Where would you like to put our attention: a goal, a difficulty or your personal profile?"
      ],
      "ru": [
        "Что для вас важнее сегодня: исследовать цель, трудность или личный профиль?",
        "Что ближе вашей потребности сейчас: цель, проблема или личный профиль?",
        "Хотите прояснить цель, понять проблему или исследовать личный профиль?",
        "Куда вам хотелось бы направить внимание: на цель, трудность или личный профиль?"
      ],
      "es": [
        "¿Qué te importa hoy: explorar una meta, una dificultad o tu perfil personal?",
        "¿Qué encaja mejor con tus necesidades: una meta, un problema o tu perfil personal?",
        "¿Quieres aclarar una meta, comprender un problema o reflexionar sobre tu perfil personal?",
        "¿Dónde te gustaría centrar nuestra atención: una meta, una dificultad o tu perfil personal?"
      ]
    },
    "feelings": {
      "en": [
        "What feelings are you bringing into our conversation?",
        "How would you describe what you are experiencing right now?",
        "What is your emotional state at this moment, if you wish to share?",
        "How are you feeling as we make space for your topic?"
      ],
      "ru": [
        "С какими чувствами вы пришли в наш разговор?",
        "Как бы вы описали то, что сейчас переживаете?",
        "Какое у вас сейчас эмоциональное состояние, если готовы поделиться?",
        "Что вы чувствуете, когда мы начинаем этот разговор?"
      ],
      "es": [
        "¿Qué emociones traes a nuestra conversación?",
        "¿Cómo describirías lo que estás experimentando ahora?",
        "¿Cuál es tu estado emocional en este momento, si quieres compartirlo?",
        "¿Cómo te sientes al abrir espacio para tu tema?"
      ]
    },
    "confirmation": {
      "en": [
        "Would you like to begin exploring your chosen topic now?",
        "Do you feel ready to move into the main work on your terms?",
        "Is it comfortable for you to start the substantive part of our conversation?",
        "Would you like to begin, knowing you may pause or skip a question?"
      ],
      "ru": [
        "Хотите сейчас начать исследовать выбранную тему?",
        "Чувствуете ли готовность перейти к основной работе на своих условиях?",
        "Вам комфортно приступить к содержательной части разговора?",
        "Хотите начать, зная, что всегда можно сделать паузу или пропустить вопрос?"
      ],
      "es": [
        "¿Quieres comenzar a explorar el tema que elegiste?",
        "¿Te sientes listo para iniciar el trabajo principal en tus propios términos?",
        "¿Te resulta cómodo pasar a la parte sustantiva de la conversación?",
        "¿Quieres comenzar sabiendo que puedes pausar u omitir una pregunta?"
      ]
    }
  },
  "alex": {
    "invitation": {
      "en": [
        "Would you like to use this conversation for a structured coaching session?",
        "Shall we try a coaching session focused on what matters to you?",
        "Do you want to begin a practical coaching session today?",
        "Would a clearly focused coaching session be useful to you now?"
      ],
      "ru": [
        "Хотите провести структурированную коучинговую сессию?",
        "Попробуем коучинговую сессию с фокусом на важном для вас?",
        "Хотите начать практическую коучинговую сессию сегодня?",
        "Будет ли вам полезна коучинговая сессия с ясным фокусом?"
      ],
      "es": [
        "¿Te gustaría dedicar esta conversación a una sesión de coaching estructurada?",
        "¿Probamos una sesión de coaching centrada en lo que te importa?",
        "¿Quieres comenzar una sesión práctica de coaching hoy?",
        "¿Te sería útil una sesión de coaching con un foco claro?"
      ]
    },
    "name": {
      "en": [
        "Which name should I use in our conversation?",
        "How do you prefer me to address you during the session?",
        "What name or alternative form of address works for you?",
        "How would you like to be identified in this conversation, if at all?"
      ],
      "ru": [
        "Какое имя использовать в нашем разговоре?",
        "Как вы предпочитаете, чтобы я обращался к вам во время сессии?",
        "Какое имя или другое обращение вам подходит?",
        "Как обозначить ваше имя в этой беседе, если вы хотите его назвать?"
      ],
      "es": [
        "¿Qué nombre debo usar en nuestra conversación?",
        "¿Cómo prefieres que me dirija a ti durante la sesión?",
        "¿Qué nombre u otra forma de trato te resulta adecuada?",
        "¿Cómo quieres que te identifique en esta conversación, si lo deseas?"
      ]
    },
    "continuity": {
      "en": [
        "Which topic is relevant now: the previous one or a new one?",
        "Would you prefer to resume the earlier discussion or set a new direction?",
        "Should we retain the previous focus or choose a different subject?",
        "Has your priority shifted to a new topic, or would you like to continue the previous one?"
      ],
      "ru": [
        "Какая тема актуальна сейчас: предыдущая или новая?",
        "Предпочитаете продолжить прошлое обсуждение или определить новое направление?",
        "Сохраним прежний фокус или выберем другую тему?",
        "Ваш приоритет изменился или хотите продолжить предыдущую тему?"
      ],
      "es": [
        "¿Qué tema es relevante ahora: el anterior o uno nuevo?",
        "¿Prefieres retomar la conversación previa o definir otra dirección?",
        "¿Mantenemos el foco anterior o elegimos otro asunto?",
        "¿Tu prioridad pasó a un tema nuevo o prefieres continuar el anterior?"
      ]
    },
    "focus": {
      "en": [
        "Which task should we define: a goal, a problem or your personal profile?",
        "Would you like to clarify a goal, analyze a problem or build your personal profile?",
        "What is today's focus: a goal, a challenge or a personal profile?",
        "Which direction should organize our work: a goal, a problem or your personal profile?"
      ],
      "ru": [
        "Какую задачу определим: цель, проблему или личный профиль?",
        "Хотите прояснить цель, разобрать проблему или составить личный профиль?",
        "Каков фокус сегодняшней работы: цель, трудность или личный профиль?",
        "Какое направление задаст структуру работы: цель, проблема или личный профиль?"
      ],
      "es": [
        "¿Qué tarea definimos: una meta, un problema o tu perfil personal?",
        "¿Quieres aclarar una meta, analizar un problema o elaborar tu perfil personal?",
        "¿Cuál es el foco de hoy: una meta, un reto o un perfil personal?",
        "¿Qué dirección organizará nuestro trabajo: una meta, un problema o tu perfil personal?"
      ]
    },
    "feelings": {
      "en": [
        "How would you describe your current emotional state?",
        "What is your present level of energy and emotional load?",
        "How do you feel as we set the direction for this session?",
        "What is your state of mind right now?"
      ],
      "ru": [
        "Как бы вы описали своё текущее эмоциональное состояние?",
        "Как вы оцениваете своё настроение и запас сил сейчас?",
        "Как вы себя чувствуете перед началом работы?",
        "В каком состоянии вы находитесь в данный момент?"
      ],
      "es": [
        "¿Cómo describirías tu estado emocional actual?",
        "¿Cómo está ahora tu energía y carga emocional?",
        "¿Cómo te sientes al definir el rumbo de esta sesión?",
        "¿Cuál es tu estado de ánimo ahora mismo?"
      ]
    },
    "confirmation": {
      "en": [
        "Are you ready to begin the main work on that focus?",
        "Do you want to move from setting the direction to exploring it?",
        "Shall we begin the substantive part of the coaching session?",
        "Would you like to start working with the topic you selected?"
      ],
      "ru": [
        "Готовы начать основную работу по выбранному фокусу?",
        "Хотите перейти от определения направления к его исследованию?",
        "Приступим к содержательной части коучинговой сессии?",
        "Хотите начать работу с выбранной темой?"
      ],
      "es": [
        "¿Te sientes listo para iniciar el trabajo principal con ese foco?",
        "¿Quieres pasar de definir el rumbo a explorarlo?",
        "¿Comenzamos la parte sustantiva de la sesión de coaching?",
        "¿Te gustaría empezar a trabajar con el tema que seleccionaste?"
      ]
    }
  },
  "merlin": {
    "invitation": {
      "en": [
        "Would you like a thoughtful coaching session with room for reflection?",
        "Shall we make time for a coaching conversation about what matters to you?",
        "Would you like to begin a coaching session with an open mind?",
        "Would a quiet coaching conversation help you explore your next chapter?"
      ],
      "ru": [
        "Хотите провести вдумчивую коучинговую сессию с пространством для размышления?",
        "Уделим время коучинговой беседе о том, что для вас важно?",
        "Хотите начать коучинговую сессию с открытым взглядом?",
        "Хотелось бы вам спокойно исследовать следующую главу жизни в коучинговой сессии?"
      ],
      "es": [
        "¿Te gustaría una sesión de coaching con espacio para reflexionar?",
        "¿Dedicamos tiempo a una conversación de coaching sobre lo que te importa?",
        "¿Quieres comenzar una sesión de coaching con una mirada abierta?",
        "¿Te ayudaría una conversación tranquila de coaching para explorar tu próximo capítulo?"
      ]
    },
    "name": {
      "en": [
        "What name would you like me to use on this conversation's journey?",
        "How would you wish to be addressed as we talk?",
        "Which name or form of address would you choose for yourself?",
        "How may I address you, if you wish to share a name?"
      ],
      "ru": [
        "Каким именем мне обращаться к вам в этом разговоре?",
        "Как вам хотелось бы, чтобы я обращался к вам во время беседы?",
        "Какое имя или обращение вы выбрали бы для себя?",
        "Как могу к вам обращаться, если пожелаете назвать имя?"
      ],
      "es": [
        "¿Qué nombre quieres que use en el camino de esta conversación?",
        "¿Cómo te gustaría que me dirigiera a ti mientras hablamos?",
        "¿Qué nombre o forma de trato elegirías para ti?",
        "¿Cómo puedo dirigirme a ti, si deseas compartir un nombre?"
      ]
    },
    "continuity": {
      "en": [
        "Would you like to return to the earlier chapter or open a new topic?",
        "Which deserves reflection now: the previous subject or a fresh one?",
        "Is the last theme still meaningful, or shall we explore a new one?",
        "Would you prefer to continue the old thread or begin another?"
      ],
      "ru": [
        "Хотите вернуться к прежней главе разговора или открыть новую тему?",
        "Что сейчас заслуживает размышления: предыдущая тема или новая?",
        "Прежняя тема ещё имеет для вас смысл или исследуем новую?",
        "Продолжим прежнюю нить беседы или начнём другую?"
      ],
      "es": [
        "¿Quieres regresar al capítulo anterior o abrir un tema nuevo?",
        "¿Qué merece reflexión ahora: el asunto previo o uno nuevo?",
        "¿Sigue teniendo sentido el tema anterior o exploramos otro?",
        "¿Prefieres seguir el hilo previo o comenzar uno distinto?"
      ]
    },
    "focus": {
      "en": [
        "What would you like to explore: a goal, a difficulty or your personal profile?",
        "Which path draws your attention today: a goal, a problem or your personal profile?",
        "Would you prefer to give meaning to a goal, understand a challenge or reflect on your personal profile?",
        "What deserves attention now: a goal, a problem or your personal profile?"
      ],
      "ru": [
        "Что вы хотели бы исследовать: цель, трудность или личный профиль?",
        "Какой путь вам ближе сегодня: цель, проблема или личный профиль?",
        "Хотите осмыслить цель, понять трудность или исследовать личный профиль?",
        "Что сейчас заслуживает вашего внимания: цель, проблема или личный профиль?"
      ],
      "es": [
        "¿Qué te gustaría explorar: una meta, una dificultad o tu perfil personal?",
        "¿Qué camino atrae hoy tu atención: una meta, un problema o tu perfil personal?",
        "¿Prefieres dar sentido a una meta, comprender un reto o reflexionar sobre tu perfil personal?",
        "¿Qué merece atención ahora: una meta, un problema o tu perfil personal?"
      ]
    },
    "feelings": {
      "en": [
        "What inner weather are you experiencing today?",
        "How would you name your mood at this moment?",
        "What emotional state accompanies you into this conversation?",
        "How do you feel at the start of this reflection?"
      ],
      "ru": [
        "Какая у вас сегодня внутренняя погода?",
        "Как бы вы назвали своё настроение сейчас?",
        "С каким душевным состоянием вы входите в разговор?",
        "Как вы себя чувствуете в начале нашего размышления?"
      ],
      "es": [
        "¿Qué clima interior estás viviendo hoy?",
        "¿Cómo nombrarías tu ánimo en este momento?",
        "¿Qué estado emocional te acompaña al iniciar esta conversación?",
        "¿Cómo te sientes al comenzar esta reflexión?"
      ]
    },
    "confirmation": {
      "en": [
        "Would you like to explore the chosen subject more deeply now?",
        "Are you ready to begin the next part of our conversation?",
        "Shall we turn our attention to the topic you selected?",
        "Would you like to begin the main work, without rushing toward an answer?"
      ],
      "ru": [
        "Хотите теперь глубже исследовать выбранную тему?",
        "Готовы перейти к следующей части нашей беседы?",
        "Обратим внимание на тему, которую вы выбрали?",
        "Хотите начать основную работу, не торопясь с ответами?"
      ],
      "es": [
        "¿Quieres explorar ahora con más profundidad el tema elegido?",
        "¿Te sientes listo para comenzar la siguiente parte de nuestra conversación?",
        "¿Dirigimos nuestra atención al asunto que seleccionaste?",
        "¿Quieres iniciar el trabajo principal sin apresurar una respuesta?"
      ]
    }
  },
  "harry": {
    "invitation": {
      "en": [
        "Would you like to try a coaching session together?",
        "How about a friendly coaching session where you set the pace?",
        "Want to spend a little time on a coaching session with me?",
        "Would you like to start a coaching conversation, no magic solutions needed?"
      ],
      "ru": [
        "Хочешь попробовать коучинговую сессию вместе со мной?",
        "Как насчёт дружеской коучинговой сессии в твоём темпе?",
        "Хочешь уделить немного времени коучинговой сессии со мной?",
        "Начнём коучинговую беседу, без поисков волшебного решения?"
      ],
      "es": [
        "¿Te gustaría probar una sesión de coaching conmigo?",
        "¿Qué te parece una sesión de coaching amistosa a tu ritmo?",
        "¿Quieres dedicar un rato a una sesión de coaching conmigo?",
        "¿Empezamos una conversación de coaching sin buscar soluciones mágicas?"
      ]
    },
    "name": {
      "en": [
        "What would you like me to call you?",
        "How should I address you so this feels friendly?",
        "What name or nickname suits you here?",
        "You can keep your name private. How should I call you?"
      ],
      "ru": [
        "Как мне тебя называть?",
        "Как к тебе обращаться, чтобы было по-дружески и комфортно?",
        "Какое имя или прозвище тебе подходит?",
        "Можно не называть имя. Как мне к тебе обращаться?"
      ],
      "es": [
        "¿Cómo quieres que te llame?",
        "¿Cómo prefieres que me dirija a ti para que te sientas a gusto?",
        "¿Qué nombre o apodo te va bien aquí?",
        "Puedes reservarte tu nombre. ¿Cómo quieres que te llame?"
      ]
    },
    "continuity": {
      "en": [
        "Do you want to pick up where we left off or choose something new?",
        "Would you like to return to our last subject or explore a new one?",
        "What feels right today: our previous topic or a fresh challenge?",
        "Shall we continue the earlier topic, or would you rather start a new one?"
      ],
      "ru": [
        "Хочешь продолжить с прошлого раза или выбрать что-то новое?",
        "Вернёмся к прежней теме или исследуем новую?",
        "Что тебе ближе сегодня: прошлая тема или новая задача?",
        "Продолжим тот разговор или тебе хочется начать другой?"
      ],
      "es": [
        "¿Quieres retomar donde nos quedamos o elegir algo nuevo?",
        "¿Te apetece volver a nuestro último tema o explorar otro?",
        "¿Qué te parece mejor hoy: el tema previo o un reto nuevo?",
        "¿Seguimos el asunto anterior o prefieres empezar otro?"
      ]
    },
    "focus": {
      "en": [
        "What would you like to face today: a goal, a challenge or your personal profile?",
        "Which feels useful: a goal, a problem or exploring your personal profile?",
        "Would you like to work toward a goal, understand a difficulty or look at your personal profile?",
        "Where should we start together: a goal, a problem or your personal profile?"
      ],
      "ru": [
        "С чем тебе хотелось бы разобраться: с целью, трудностью или личным профилем?",
        "Что тебе сейчас полезнее: цель, проблема или исследование личного профиля?",
        "Хочешь приблизиться к цели, понять трудность или взглянуть на личный профиль?",
        "С чего начнём вместе: с цели, проблемы или личного профиля?"
      ],
      "es": [
        "¿Qué quieres afrontar hoy: una meta, un reto o tu perfil personal?",
        "¿Qué te resulta útil: una meta, un problema o explorar tu perfil personal?",
        "¿Quieres avanzar hacia una meta, comprender una dificultad o mirar tu perfil personal?",
        "¿Por dónde empezamos juntos: una meta, un problema o tu perfil personal?"
      ]
    },
    "feelings": {
      "en": [
        "How are you doing today?",
        "What are you feeling as we begin?",
        "How is your mood right now?",
        "What is going on inside for you at the moment?"
      ],
      "ru": [
        "Как ты сегодня себя чувствуешь?",
        "С каким настроением ты начинаешь разговор?",
        "Что ты чувствуешь прямо сейчас?",
        "Как тебе сейчас внутри?"
      ],
      "es": [
        "¿Cómo estás hoy?",
        "¿Qué sientes al empezar?",
        "¿Cómo está tu ánimo ahora mismo?",
        "¿Qué estás sintiendo por dentro en este momento?"
      ]
    },
    "confirmation": {
      "en": [
        "Would you like to start exploring your topic together?",
        "Ready to take a look at the focus you picked, at your pace?",
        "Shall we begin the main part of the coaching session?",
        "Would you like to move into the main work, knowing you can stop anytime?"
      ],
      "ru": [
        "Хочешь вместе начать исследовать твою тему?",
        "Готов начать разбираться с выбранной темой в своём темпе?",
        "Перейдём к основной части коучинговой сессии?",
        "Хочешь начать основную работу, зная, что всегда можно остановиться?"
      ],
      "es": [
        "¿Te gustaría empezar a explorar tu tema juntos?",
        "¿Te sientes listo para mirar el foco que elegiste a tu ritmo?",
        "¿Empezamos la parte principal de la sesión de coaching?",
        "¿Quieres pasar al trabajo principal sabiendo que puedes parar cuando quieras?"
      ]
    }
  },
  "caesar": {
    "invitation": {
      "en": [
        "Would you choose to begin a coaching session with me today?",
        "Do you want to dedicate this conversation to a coaching session of your own choosing?",
        "Would you like a focused coaching session, with decisions remaining yours?",
        "Shall we begin a coaching session on terms you freely accept?"
      ],
      "ru": [
        "Решение за вами. Хотите начать со мной коучинговую сессию?",
        "Готовы посвятить этот разговор коучинговой сессии по вашему выбору?",
        "Хотите провести коучинговую сессию, в которой решения остаются за вами?",
        "Начнём коучинговую сессию на добровольно принятых вами условиях?"
      ],
      "es": [
        "¿Eliges comenzar hoy una sesión de coaching conmigo?",
        "¿Quieres dedicar esta conversación a una sesión de coaching por decisión propia?",
        "¿Te gustaría una sesión de coaching enfocada en la que las decisiones sigan siendo tuyas?",
        "¿Comenzamos una sesión de coaching en términos que aceptes libremente?"
      ]
    },
    "name": {
      "en": [
        "How would you choose to be addressed?",
        "Which name should I use to respect your preference?",
        "What form of address would you consider appropriate?",
        "What name, if any, do you choose for this session?"
      ],
      "ru": [
        "Как вы предпочитаете, чтобы я к вам обращался?",
        "Какое имя использовать в соответствии с вашим выбором?",
        "Какую форму обращения вы считаете подходящей?",
        "Какое имя вы выбираете для этой сессии, если хотите его назвать?"
      ],
      "es": [
        "¿Cómo eliges que me dirija a ti?",
        "¿Qué nombre debo usar para respetar tu preferencia?",
        "¿Qué forma de trato consideras apropiada?",
        "¿Qué nombre eliges para esta sesión, si deseas compartirlo?"
      ]
    },
    "continuity": {
      "en": [
        "Do you choose to continue the prior subject or set a new one?",
        "Which direction is yours today: the previous topic or a new topic?",
        "Would you like to retain the earlier focus or deliberately choose another?",
        "Does your present position call for the previous topic or a fresh one?"
      ],
      "ru": [
        "Вы выбираете продолжить предыдущую тему или определить новую?",
        "Какое направление ваше сегодня: прежняя тема или новая?",
        "Хотите сохранить прошлый фокус или осознанно выбрать другой?",
        "Что соответствует вашей нынешней позиции: предыдущая тема или новая?"
      ],
      "es": [
        "¿Eliges continuar el asunto anterior o definir uno nuevo?",
        "¿Qué dirección eliges hoy: el tema anterior o uno nuevo?",
        "¿Quieres mantener el foco previo o elegir deliberadamente otro?",
        "¿Qué encaja con tu posición actual: el tema previo o uno nuevo?"
      ]
    },
    "focus": {
      "en": [
        "What do you choose to address: a goal, a problem or your personal profile?",
        "Which direction do you consider worth our attention: a goal, a challenge or your personal profile?",
        "Would you rather define a goal, examine a problem or clarify your personal profile?",
        "What will be the subject you freely select: a goal, a difficulty or your personal profile?"
      ],
      "ru": [
        "С чем вы выбираете работать: с целью, проблемой или личным профилем?",
        "Какое направление заслуживает вашего внимания: цель, трудность или личный профиль?",
        "Предпочитаете определить цель, рассмотреть проблему или прояснить личный профиль?",
        "Какую тему вы выбираете добровольно: цель, трудность или личный профиль?"
      ],
      "es": [
        "¿Qué eliges abordar: una meta, un problema o tu perfil personal?",
        "¿Qué dirección merece tu atención: una meta, un reto o tu perfil personal?",
        "¿Prefieres definir una meta, examinar un problema o aclarar tu perfil personal?",
        "¿Qué asunto eliges libremente: una meta, una dificultad o tu perfil personal?"
      ]
    },
    "feelings": {
      "en": [
        "How do you assess your own emotional state now?",
        "What is your state of mind at the start of this session?",
        "How are you feeling before we address your chosen focus?",
        "What feelings are present for you at this moment?"
      ],
      "ru": [
        "Как вы оцениваете своё эмоциональное состояние сейчас?",
        "В каком душевном состоянии вы начинаете сессию?",
        "Как вы себя чувствуете перед работой с выбранной темой?",
        "Какие чувства присутствуют у вас в этот момент?"
      ],
      "es": [
        "¿Cómo valoras tu propio estado emocional ahora?",
        "¿Con qué estado de ánimo comienzas esta sesión?",
        "¿Cómo te sientes antes de abordar el foco elegido?",
        "¿Qué emociones están presentes para ti en este momento?"
      ]
    },
    "confirmation": {
      "en": [
        "Do you choose to begin the main work now?",
        "Are you ready to examine the topic you selected?",
        "Would you like to proceed with the substantive part of this session?",
        "Is it your choice to start exploring this focus now?"
      ],
      "ru": [
        "Вы выбираете начать основную работу сейчас?",
        "Готовы рассмотреть тему, которую сами выбрали?",
        "Хотите перейти к содержательной части этой сессии?",
        "Вы готовы сейчас начать исследование выбранного фокуса?"
      ],
      "es": [
        "¿Eliges iniciar ahora el trabajo principal?",
        "¿Te sientes listo para examinar el tema que seleccionaste?",
        "¿Quieres continuar con la parte sustantiva de esta sesión?",
        "¿Es tu decisión empezar a explorar este foco ahora?"
      ]
    }
  }
}
for(const stages of Object.values(bank)){for(const locales of Object.values(stages)){for(const questions of Object.values(locales))Object.freeze(questions);Object.freeze(locales)}Object.freeze(stages)}
export const COACH_PERSONALITY_OPENING_QUESTIONS=Object.freeze(bank)

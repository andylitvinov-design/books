/** Holistic House: optional, editable client-authored About Me questions. NOT a CRM or consent store. */
export const CLIENT_ABOUT_ME_GROUP_LABELS = Object.freeze({
  "intro": {
    "en": "Getting acquainted",
    "ru": "Знакомство",
    "es": "Conozcámonos"
  },
  "style": {
    "en": "Communication",
    "ru": "Общение",
    "es": "Comunicación"
  },
  "context": {
    "en": "Daily life",
    "ru": "Моя жизнь",
    "es": "Mi día a día"
  },
  "interests": {
    "en": "Interests and values",
    "ru": "Интересы и ценности",
    "es": "Intereses y valores"
  },
  "goals": {
    "en": "My goals",
    "ru": "Мои цели",
    "es": "Mis objetivos"
  },
  "resources": {
    "en": "My resources",
    "ru": "Мои ресурсы",
    "es": "Mis recursos"
  },
  "boundaries": {
    "en": "Boundaries",
    "ru": "Мои границы",
    "es": "Mis límites"
  },
  "wellbeing": {
    "en": "Energy and self-observation",
    "ru": "Энергия и самонаблюдение",
    "es": "Energía y autoobservación"
  },
  "support": {
    "en": "Relationships and support",
    "ru": "Общение и поддержка",
    "es": "Relaciones y apoyo"
  },
  "learning": {
    "en": "Learning and practices",
    "ru": "Обучение и практики",
    "es": "Aprendizaje y prácticas"
  },
  "history": {
    "en": "Progress and reflections",
    "ru": "Изменения и опыт",
    "es": "Progreso y reflexiones"
  },
  "practitioner": {
    "en": "Working with a practitioner",
    "ru": "Работа с мастером",
    "es": "Trabajo con un profesional"
  },
  "planning": {
    "en": "Planning and contact preferences",
    "ru": "Планирование и связь",
    "es": "Planificación y contacto"
  }
});
export const CLIENT_ABOUT_ME_QUESTIONS = Object.freeze([
  {
    "key": "preferred_name",
    "group": "intro",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "How should I address you?",
      "ru": "Как к вам обращаться?",
      "es": "¿Cómo prefieres que te llame?"
    }
  },
  {
    "key": "name_pronunciation",
    "group": "intro",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "How should I pronounce your name?",
      "ru": "Как правильно произносить ваше имя?",
      "es": "¿Cómo se pronuncia tu nombre?"
    }
  },
  {
    "key": "address_form",
    "group": "intro",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "Do you prefer a formal or informal address?",
      "ru": "Предпочитаете обращение на «вы» или на «ты»?",
      "es": "¿Prefieres trato formal o informal?"
    }
  },
  {
    "key": "preferred_language",
    "group": "intro",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "Which language is easiest for us to use?",
      "ru": "На каком языке вам удобнее общаться?",
      "es": "¿En qué idioma prefieres conversar?"
    }
  },
  {
    "key": "contact_time",
    "group": "intro",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "When do you prefer to have a conversation?",
      "ru": "В какое время вам комфортнее беседовать?",
      "es": "¿Cuándo prefieres conversar?"
    }
  },
  {
    "key": "name_avoidance",
    "group": "intro",
    "category": "boundary",
    "sensitive": false,
    "prompt": {
      "en": "Is there a form of address I should avoid?",
      "ru": "Есть ли обращение, которого лучше избегать?",
      "es": "¿Hay alguna forma de llamarte que deba evitar?"
    }
  },
  {
    "key": "answer_length",
    "group": "style",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "Would you like short or detailed answers?",
      "ru": "Вам удобнее короткие или подробные ответы?",
      "es": "¿Prefieres respuestas breves o detalladas?"
    }
  },
  {
    "key": "tone",
    "group": "style",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "Would you prefer a warm, neutral or practical tone?",
      "ru": "Какой тон вам ближе: тёплый, нейтральный или деловой?",
      "es": "¿Qué tono prefieres: cálido, neutro o práctico?"
    }
  },
  {
    "key": "examples",
    "group": "style",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "What kinds of examples help you most?",
      "ru": "Какие примеры вам лучше помогают?",
      "es": "¿Qué ejemplos te ayudan más?"
    }
  },
  {
    "key": "question_pace",
    "group": "style",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "How many questions at a time feel comfortable?",
      "ru": "В каком темпе комфортнее отвечать на вопросы?",
      "es": "¿Qué ritmo de preguntas te resulta cómodo?"
    }
  },
  {
    "key": "communication_format",
    "group": "style",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "Would you rather read, listen or watch?",
      "ru": "Вам удобнее читать, слушать или смотреть?",
      "es": "¿Prefieres leer, escuchar o ver?"
    }
  },
  {
    "key": "avoid_answer_format",
    "group": "style",
    "category": "boundary",
    "sensitive": false,
    "prompt": {
      "en": "Which answer formats should I avoid?",
      "ru": "Каких форматов ответов лучше избегать?",
      "es": "¿Qué formatos de respuesta debería evitar?"
    }
  },
  {
    "key": "daily_rhythm",
    "group": "context",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "What is your usual daily rhythm?",
      "ru": "Как обычно устроен ваш день?",
      "es": "¿Cómo es tu rutina diaria?"
    }
  },
  {
    "key": "current_focus",
    "group": "context",
    "category": "goal",
    "sensitive": false,
    "prompt": {
      "en": "What takes most of your attention now?",
      "ru": "Что сейчас занимает больше всего внимания?",
      "es": "¿Qué ocupa más tu atención ahora?"
    }
  },
  {
    "key": "available_time",
    "group": "context",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "How much time can you give to a practice?",
      "ru": "Сколько времени вам удобно выделять для практики?",
      "es": "¿Cuánto tiempo puedes dedicar a una práctica?"
    }
  },
  {
    "key": "responsibilities",
    "group": "context",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "Which responsibilities affect your schedule?",
      "ru": "Какие дела влияют на ваш распорядок?",
      "es": "¿Qué responsabilidades influyen en tu horario?"
    }
  },
  {
    "key": "current_transition",
    "group": "context",
    "category": "goal",
    "sensitive": false,
    "prompt": {
      "en": "Are you working toward a new stage in life?",
      "ru": "Есть ли перемена в жизни, к которой вы готовитесь?",
      "es": "¿Hay algún cambio de vida para el que te preparas?"
    }
  },
  {
    "key": "life_context",
    "group": "context",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "What context would help me understand your situation?",
      "ru": "Что ещё важно знать для понимания вашей ситуации?",
      "es": "¿Qué contexto me ayudaría a entender tu situación?"
    }
  },
  {
    "key": "interests",
    "group": "interests",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "What currently interests you most?",
      "ru": "Что сейчас вам особенно интересно?",
      "es": "¿Qué te interesa más ahora?"
    }
  },
  {
    "key": "values",
    "group": "interests",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "Which values guide your choices?",
      "ru": "Какие ценности важны для ваших решений?",
      "es": "¿Qué valores guían tus decisiones?"
    }
  },
  {
    "key": "motivation",
    "group": "interests",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "What usually inspires you to start something?",
      "ru": "Что обычно вдохновляет вас начать новое?",
      "es": "¿Qué te motiva a empezar algo nuevo?"
    }
  },
  {
    "key": "learning_topics",
    "group": "interests",
    "category": "goal",
    "sensitive": false,
    "prompt": {
      "en": "Which subjects would you like to explore?",
      "ru": "Какие темы вы хотите изучать?",
      "es": "¿Qué temas te gustaría explorar?"
    }
  },
  {
    "key": "inspiration",
    "group": "interests",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "What sources of inspiration do you enjoy?",
      "ru": "Где вы находите вдохновение?",
      "es": "¿Dónde encuentras inspiración?"
    }
  },
  {
    "key": "leisure",
    "group": "interests",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "How do you enjoy spending free time?",
      "ru": "Как любите проводить свободное время?",
      "es": "¿Cómo disfrutas tu tiempo libre?"
    }
  },
  {
    "key": "main_goal",
    "group": "goals",
    "category": "goal",
    "sensitive": false,
    "prompt": {
      "en": "What would you most like to change now?",
      "ru": "Что сейчас больше всего хотите изменить?",
      "es": "¿Qué te gustaría cambiar ahora?"
    }
  },
  {
    "key": "secondary_goal",
    "group": "goals",
    "category": "goal",
    "sensitive": false,
    "prompt": {
      "en": "Is there another goal that matters to you?",
      "ru": "Есть ли ещё одна важная для вас цель?",
      "es": "¿Hay otro objetivo importante para ti?"
    }
  },
  {
    "key": "goal_priority",
    "group": "goals",
    "category": "goal",
    "sensitive": false,
    "prompt": {
      "en": "Which goal should we work on first?",
      "ru": "С какой целью вы хотите начать?",
      "es": "¿Con qué objetivo quieres empezar?"
    }
  },
  {
    "key": "goal_timespan",
    "group": "goals",
    "category": "goal",
    "sensitive": false,
    "prompt": {
      "en": "When would you like to notice progress?",
      "ru": "Когда вы хотите заметить первые изменения?",
      "es": "¿Cuándo te gustaría notar avances?"
    }
  },
  {
    "key": "goal_motivation",
    "group": "goals",
    "category": "goal",
    "sensitive": false,
    "prompt": {
      "en": "Why does this goal matter to you?",
      "ru": "Почему эта цель вам важна?",
      "es": "¿Por qué es importante este objetivo?"
    }
  },
  {
    "key": "desired_change",
    "group": "goals",
    "category": "current_desired_state",
    "sensitive": false,
    "prompt": {
      "en": "What would a positive change look like to you?",
      "ru": "Как бы вы описали желаемую перемену?",
      "es": "¿Cómo describirías el cambio que deseas?"
    }
  },
  {
    "key": "success_marker",
    "group": "goals",
    "category": "goal",
    "sensitive": false,
    "prompt": {
      "en": "How would you recognize meaningful progress?",
      "ru": "По чему вы поймёте, что продвинулись?",
      "es": "¿Cómo reconocerías un avance importante?"
    }
  },
  {
    "key": "strengths",
    "group": "resources",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "Which strengths can you rely on?",
      "ru": "На какие свои сильные стороны вы опираетесь?",
      "es": "¿En qué fortalezas puedes apoyarte?"
    }
  },
  {
    "key": "supportive_routines",
    "group": "resources",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "Which daily habits support you?",
      "ru": "Какие привычки вас поддерживают?",
      "es": "¿Qué hábitos diarios te ayudan?"
    }
  },
  {
    "key": "helpful_people",
    "group": "resources",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "Who helps you feel supported, if anyone?",
      "ru": "Кто помогает вам чувствовать поддержку, если такой человек есть?",
      "es": "¿Quién te ayuda a sentir apoyo, si hay alguien?"
    }
  },
  {
    "key": "past_progress",
    "group": "resources",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "What has worked for you in the past?",
      "ru": "Что уже помогало вам в прошлом?",
      "es": "¿Qué te funcionó en el pasado?"
    }
  },
  {
    "key": "practical_tools",
    "group": "resources",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "What simple activities help you get unstuck?",
      "ru": "Какие простые действия помогают вам двигаться дальше?",
      "es": "¿Qué actividades sencillas te ayudan a avanzar?"
    }
  },
  {
    "key": "recovery_preferences",
    "group": "resources",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "How do you prefer to recharge?",
      "ru": "Как вам приятнее восстанавливать силы?",
      "es": "¿Cómo prefieres recuperar energías?"
    }
  },
  {
    "key": "topics_to_avoid",
    "group": "boundaries",
    "category": "boundary",
    "sensitive": false,
    "prompt": {
      "en": "Which topics should we avoid?",
      "ru": "Какие темы вы не хотите обсуждать?",
      "es": "¿Qué temas prefieres evitar?"
    }
  },
  {
    "key": "communication_limits",
    "group": "boundaries",
    "category": "boundary",
    "sensitive": false,
    "prompt": {
      "en": "What communication boundaries matter to you?",
      "ru": "Какие границы в общении для вас важны?",
      "es": "¿Qué límites en la comunicación son importantes para ti?"
    }
  },
  {
    "key": "unwanted_methods",
    "group": "boundaries",
    "category": "boundary",
    "sensitive": false,
    "prompt": {
      "en": "Which exercises would you rather not try?",
      "ru": "Какие упражнения вы не хотите пробовать?",
      "es": "¿Qué ejercicios prefieres no probar?"
    }
  },
  {
    "key": "group_boundaries",
    "group": "boundaries",
    "category": "boundary",
    "sensitive": false,
    "prompt": {
      "en": "What would make group activities comfortable?",
      "ru": "Что помогает вам чувствовать себя комфортно в группе?",
      "es": "¿Qué te haría sentir cómodo en grupo?"
    }
  },
  {
    "key": "pace_limits",
    "group": "boundaries",
    "category": "boundary",
    "sensitive": false,
    "prompt": {
      "en": "What pace feels comfortable for change?",
      "ru": "Какой темп изменений вам подходит?",
      "es": "¿Qué ritmo de cambio te resulta cómodo?"
    }
  },
  {
    "key": "avoided_suggestions",
    "group": "boundaries",
    "category": "boundary",
    "sensitive": false,
    "prompt": {
      "en": "What suggestions should I not repeat?",
      "ru": "Какие советы вам не стоит предлагать повторно?",
      "es": "¿Qué sugerencias no debería repetir?"
    }
  },
  {
    "key": "energy_times",
    "group": "wellbeing",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "When do you usually feel most energetic?",
      "ru": "Когда вы обычно наиболее энергичны?",
      "es": "¿Cuándo sueles tener más energía?"
    }
  },
  {
    "key": "recharge_activities",
    "group": "wellbeing",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "Which everyday activities feel restorative?",
      "ru": "Какие повседневные занятия помогают восстановиться?",
      "es": "¿Qué actividades diarias te ayudan a recuperarte?"
    }
  },
  {
    "key": "breaks",
    "group": "wellbeing",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "What kind of breaks work best for you?",
      "ru": "Какие перерывы вам подходят?",
      "es": "¿Qué descansos funcionan mejor para ti?"
    }
  },
  {
    "key": "busy_seasons",
    "group": "wellbeing",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "Which days or seasons tend to be busiest?",
      "ru": "В какие дни или периоды у вас больше всего дел?",
      "es": "¿Qué días o épocas tienes más ocupados?"
    }
  },
  {
    "key": "current_capacity",
    "group": "wellbeing",
    "category": "current_desired_state",
    "sensitive": false,
    "prompt": {
      "en": "How much energy can you devote to learning now?",
      "ru": "Сколько сил сейчас готовы уделять обучению?",
      "es": "¿Cuánta energía puedes dedicar a aprender ahora?"
    }
  },
  {
    "key": "wellbeing_reflection",
    "group": "wellbeing",
    "category": "current_desired_state",
    "sensitive": true,
    "prompt": {
      "en": "Would you like to note how you feel today? (Optional/private)",
      "ru": "Хотите описать сегодняшнее самочувствие? (Необязательно, конфиденциально)",
      "es": "¿Quieres anotar cómo te sientes hoy? (Opcional y privado)"
    }
  },
  {
    "key": "group_or_solo",
    "group": "support",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "Do you prefer individual or group sessions?",
      "ru": "Вам удобнее индивидуальные или групповые занятия?",
      "es": "¿Prefieres sesiones individuales o grupales?"
    }
  },
  {
    "key": "support_format",
    "group": "support",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "What kind of support feels most useful?",
      "ru": "Какая поддержка для вас наиболее полезна?",
      "es": "¿Qué apoyo te resulta más útil?"
    }
  },
  {
    "key": "teamwork_style",
    "group": "support",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "How do you prefer to work with other people?",
      "ru": "Как вам удобнее работать с другими людьми?",
      "es": "¿Cómo prefieres trabajar con otras personas?"
    }
  },
  {
    "key": "asking_for_help",
    "group": "support",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "How would you like to ask for help?",
      "ru": "Как вам комфортнее обращаться за помощью?",
      "es": "¿Cómo prefieres pedir ayuda?"
    }
  },
  {
    "key": "social_boundaries",
    "group": "support",
    "category": "boundary",
    "sensitive": false,
    "prompt": {
      "en": "Which boundaries matter when receiving support?",
      "ru": "Какие границы важны при получении поддержки?",
      "es": "¿Qué límites importan cuando recibes apoyo?"
    }
  },
  {
    "key": "familiar_practices",
    "group": "learning",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "Which practices have you already tried?",
      "ru": "Какие практики вам уже знакомы?",
      "es": "¿Qué prácticas ya has probado?"
    }
  },
  {
    "key": "learning_style",
    "group": "learning",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "How do you like to learn something new?",
      "ru": "Как вам нравится изучать новое?",
      "es": "¿Cómo prefieres aprender algo nuevo?"
    }
  },
  {
    "key": "practice_duration",
    "group": "learning",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "How long should a typical practice be?",
      "ru": "Какая продолжительность практики вам подходит?",
      "es": "¿Cuánto debería durar una práctica?"
    }
  },
  {
    "key": "practice_frequency",
    "group": "learning",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "How often would you like to practice?",
      "ru": "Как часто вам хотелось бы практиковать?",
      "es": "¿Con qué frecuencia te gustaría practicar?"
    }
  },
  {
    "key": "feedback_preferences",
    "group": "learning",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "How would you like to review your progress?",
      "ru": "Как вам удобнее обсуждать прогресс?",
      "es": "¿Cómo prefieres revisar tus avances?"
    }
  },
  {
    "key": "education_goals",
    "group": "learning",
    "category": "goal",
    "sensitive": false,
    "prompt": {
      "en": "Which skill would you like to learn next?",
      "ru": "Какому навыку хотите научиться следующим?",
      "es": "¿Qué habilidad te gustaría aprender ahora?"
    }
  },
  {
    "key": "recent_achievement",
    "group": "history",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "What recent achievement are you glad about?",
      "ru": "Какому недавнему достижению вы рады?",
      "es": "¿De qué logro reciente te alegras?"
    }
  },
  {
    "key": "useful_practice",
    "group": "history",
    "category": "practice_feedback",
    "sensitive": false,
    "prompt": {
      "en": "Which practice helped you recently?",
      "ru": "Какая практика была полезна вам недавно?",
      "es": "¿Qué práctica te ayudó recientemente?"
    }
  },
  {
    "key": "approach_to_update",
    "group": "history",
    "category": "practice_feedback",
    "sensitive": false,
    "prompt": {
      "en": "What approach would you like to change?",
      "ru": "Какой подход вы хотели бы изменить?",
      "es": "¿Qué enfoque te gustaría cambiar?"
    }
  },
  {
    "key": "known_obstacle",
    "group": "history",
    "category": "boundary",
    "sensitive": false,
    "prompt": {
      "en": "What obstacle have you learned to recognize?",
      "ru": "Какое препятствие вы научились замечать?",
      "es": "¿Qué obstáculo has aprendido a reconocer?"
    }
  },
  {
    "key": "next_step",
    "group": "history",
    "category": "commitment",
    "sensitive": false,
    "prompt": {
      "en": "What is one small next step you choose?",
      "ru": "Какой небольшой следующий шаг вы выбираете?",
      "es": "¿Qué pequeño paso eliges ahora?"
    }
  },
  {
    "key": "master_goal",
    "group": "practitioner",
    "category": "goal",
    "sensitive": false,
    "prompt": {
      "en": "What would you like support with?",
      "ru": "С каким запросом хотите получить поддержку?",
      "es": "¿Con qué te gustaría recibir apoyo?"
    }
  },
  {
    "key": "consultation_style",
    "group": "practitioner",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "What consultation style feels comfortable?",
      "ru": "Какой формат консультации вам комфортен?",
      "es": "¿Qué estilo de consulta te resulta cómodo?"
    }
  },
  {
    "key": "master_practice_type",
    "group": "practitioner",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "What kind of practices are you interested in?",
      "ru": "Какие виды практик вам интересны?",
      "es": "¿Qué tipos de prácticas te interesan?"
    }
  },
  {
    "key": "practitioner_share_boundary",
    "group": "practitioner",
    "category": "boundary",
    "sensitive": false,
    "prompt": {
      "en": "What would you prefer not to share with a practitioner?",
      "ru": "Чем вы не хотите делиться с мастером?",
      "es": "¿Qué preferirías no compartir con el profesional?"
    }
  },
  {
    "key": "followup_preferences",
    "group": "practitioner",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "How would you like to follow up after a session?",
      "ru": "Как вам удобнее возвращаться к результатам консультации?",
      "es": "¿Cómo prefieres dar seguimiento a una sesión?"
    }
  },
  {
    "key": "reminder_style",
    "group": "planning",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "If reminders are enabled, what tone suits you?",
      "ru": "Если напоминания включены, какой их тон вам подходит?",
      "es": "Si activas recordatorios, ¿qué tono prefieres?"
    }
  },
  {
    "key": "quiet_times",
    "group": "planning",
    "category": "boundary",
    "sensitive": false,
    "prompt": {
      "en": "When would you prefer not to be contacted?",
      "ru": "В какое время вам лучше не писать?",
      "es": "¿Cuándo prefieres no recibir mensajes?"
    }
  },
  {
    "key": "reflection_interval",
    "group": "planning",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "How frequently would you like to reflect?",
      "ru": "Как часто вам хочется подводить итоги?",
      "es": "¿Con qué frecuencia te gustaría reflexionar?"
    }
  },
  {
    "key": "content_language",
    "group": "planning",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "Which language do you prefer for materials?",
      "ru": "На каком языке предпочитаете материалы?",
      "es": "¿En qué idioma prefieres los materiales?"
    }
  },
  {
    "key": "preferred_channel",
    "group": "planning",
    "category": "resource",
    "sensitive": false,
    "prompt": {
      "en": "Which verified channel would you use for messages?",
      "ru": "Какой подтверждённый канал удобнее для сообщений?",
      "es": "¿Qué canal verificado prefieres para los mensajes?"
    }
  },
  {
    "key": "notification_topics",
    "group": "planning",
    "category": "boundary",
    "sensitive": false,
    "prompt": {
      "en": "Which kinds of notifications should we avoid?",
      "ru": "Каких уведомлений вы хотели бы избежать?",
      "es": "¿Qué notificaciones prefieres evitar?"
    }
  }
]);
export const CLIENT_ABOUT_ME_INTRO = Object.freeze(["preferred_name","main_goal","answer_length"]);
const questionMap = new Map(CLIENT_ABOUT_ME_QUESTIONS.map(item => [item.key,item]));
export function getClientAboutMeQuestion(key) {
 return typeof key === 'string' && key.length < 80 ? questionMap.get(key) || null : null;
}
export function clientAboutMeQuestionsForGroup(group, { sensitiveEnabled=false }={}) {
 return CLIENT_ABOUT_ME_QUESTIONS.filter(item=>item.group===group && (!item.sensitive || sensitiveEnabled));
}

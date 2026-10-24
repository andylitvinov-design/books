// Holistic House · two author-sourced goal-planning courses.
// Core level questions and choices are NOT duplicated here: authenticated server
// reads their canonical version-pinned records from app_private coaching catalog.
export const TRADITION_COURSES = Object.freeze([
  {
    "slug": "egyptian",
    "template": "hh-egyptian-goal-planning-v1",
    "modelKey": "egyptian_goal_planning_v1",
    "schemeKey": "egyptian_goal_planning_reflective_v1",
    "name": {
      "en": "Egyptian Goal Planning",
      "ru": "Египетский коучинг",
      "es": "Coaching egipcio"
    },
    "description": {
      "en": "Explore a goal through the symbolic Egyptian model: desire, vision, values, experience and support.",
      "ru": "Рассмотрите цель через египетскую символическую модель: желание, образ, ценности, опыт и поддержку.",
      "es": "Explora tu meta desde un modelo egipcio simbólico: deseo, visión, valores, experiencia y apoyo."
    },
    "useCases": {
      "en": "Useful when a goal is vague, you are choosing priorities, or want to see resources and support.",
      "ru": "Подходит, когда цель ещё расплывчата, нужно определить ценности и приоритеты или увидеть доступные ресурсы и поддержку.",
      "es": "Útil cuando una meta no está clara, necesitas priorizar valores o reconocer recursos y apoyos."
    },
    "expectedOutcome": {
      "en": "A clearer personal goal, its meaning, and one achievable next action you choose.",
      "ru": "Более ясная личная цель, её смысл и один посильный следующий шаг, выбранный вами.",
      "es": "Una meta más clara, su sentido y un siguiente paso alcanzable que tú elijas."
    },
    "intro": {
      "en": "What goal would you like to explore today?",
      "ru": "Какую одну цель вы хотите исследовать сегодня?",
      "es": "¿Qué objetivo quieres explorar hoy?"
    },
    "note": {
      "en": "A short symbolic self-coaching exercise, not a historical or clinical assessment.",
      "ru": "Короткая символическая коучинговая практика, не историческая или клиническая диагностика.",
      "es": "Ejercicio simbólico de autocoaching, no una evaluación histórica ni clínica."
    },
    "art": "/academy/reiki-yggdrasil/source/temple-studies.png",
    "totalScreens": 11
  },
  {
    "slug": "greek",
    "template": "hh-greek-goal-planning-v1",
    "modelKey": "greek_goal_planning_v1",
    "schemeKey": "greek_goal_planning_reflective_v1",
    "name": {
      "en": "Greek Goal Planning",
      "ru": "Греческий коучинг",
      "es": "Coaching griego"
    },
    "description": {
      "en": "Move from desire and courage through reason, meaning, an ideal image and a practical next step.",
      "ru": "Пройдите путь от желания и воли через разум, смысл и идеальный образ к реальному действию.",
      "es": "Pasa del deseo y el coraje por la razón, el sentido y la visión ideal hasta un paso práctico."
    },
    "useCases": {
      "en": "For decisions requiring courage, balancing desire with reason, or translating vision into action.",
      "ru": "Для решений, где нужны смелость, согласование желания и разума или переход от вдохновляющего образа к конкретному действию.",
      "es": "Para decisiones que requieren valentía, equilibrio entre deseo y razón o transformar una visión en acción."
    },
    "expectedOutcome": {
      "en": "Your own meaningful direction and one realistic step you are ready to try.",
      "ru": "Осмысленное направление и один реальный шаг, который вы готовы попробовать.",
      "es": "Una dirección con sentido propio y un paso realista que quieras probar."
    },
    "intro": {
      "en": "What goal would you like to explore today?",
      "ru": "Какую одну цель вы хотите исследовать сегодня?",
      "es": "¿Qué objetivo quieres explorar hoy?"
    },
    "note": {
      "en": "An original symbolic coaching adaptation of ancient ideas, not an academic or clinical assessment.",
      "ru": "Авторская символическая коучинговая адаптация античных идей, не академический или клинический тест.",
      "es": "Adaptación simbólica de ideas antiguas, no una prueba académica ni clínica."
    },
    "art": "/academy/reiki-yggdrasil/source/temple-studies.png",
    "totalScreens": 10
  }
])
export const TRADITION_TEMPLATES = Object.freeze(TRADITION_COURSES.map(course=>course.template))
export function traditionCourse(template) {
  return TRADITION_COURSES.find(course=>course.template===template)||null
}
export function traditionBySlug(slug) {
  return TRADITION_COURSES.find(course=>course.slug===slug)||null
}
const goalChoices = Object.freeze([
  {
    "id": "personal",
    "label": {
      "en": "Personal growth",
      "ru": "Личное развитие",
      "es": "Desarrollo personal"
    }
  },
  {
    "id": "relationships",
    "label": {
      "en": "Relationships",
      "ru": "Отношения",
      "es": "Relaciones"
    }
  },
  {
    "id": "business",
    "label": {
      "en": "Work or business",
      "ru": "Работа / бизнес",
      "es": "Trabajo o negocio"
    }
  },
  {
    "id": "creative",
    "label": {
      "en": "Creative goal",
      "ru": "Творчество",
      "es": "Creatividad"
    }
  },
  {
    "id": "unsure",
    "label": {
      "en": "Not sure yet",
      "ru": "Пока не знаю",
      "es": "Todavía no sé"
    }
  }
])
const actionChoices = Object.freeze([
  {
    "id": "message",
    "label": {
      "en": "Send one message",
      "ru": "Написать сообщение",
      "es": "Enviar un mensaje"
    }
  },
  {
    "id": "draft",
    "label": {
      "en": "Make a first draft",
      "ru": "Подготовить черновик",
      "es": "Hacer un borrador"
    }
  },
  {
    "id": "schedule",
    "label": {
      "en": "Schedule a time",
      "ru": "Назначить время",
      "es": "Reservar un momento"
    }
  },
  {
    "id": "practice",
    "label": {
      "en": "Try one small practice",
      "ru": "Сделать одну практику",
      "es": "Probar un ejercicio"
    }
  },
  {
    "id": "own",
    "label": {
      "en": "My own next step",
      "ru": "Свой шаг",
      "es": "Mi propio paso"
    }
  }
])
export function traditionEndcaps(course) {
  if(!course) return []
  return [
    {
      id:'goal',stage:'start',title:{"en":"My goal","ru":"Моя цель","es":"Mi objetivo"},
      question:course.intro,
      hint:{"en":"Choose one area; optionally describe your specific goal.","ru":"Выберите направление; при желании уточните свою цель.","es":"Elige un área y, si quieres, describe tu meta concreta."},
      choices:goalChoices,required:true,
    },
    {
      id:'action_24h',stage:'finish',title:{"en":"My next step","ru":"Мой ближайший шаг","es":"Mi siguiente paso"},
      question:{"en":"What one thing can you do in the next 24 hours?","ru":"Что именно вы сделаете в ближайшие 24 часа?","es":"¿Qué acción concreta harás en las próximas 24 horas?"},
      hint:{"en":"Choose one achievable action. You can change it later.","ru":"Выберите одно посильное действие. Его можно изменить.","es":"Elige una acción realista. Puedes cambiarla después."},
      choices:actionChoices,required:true,
    },
  ]
}

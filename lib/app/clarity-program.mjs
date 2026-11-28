// Fixed, first-party continuation. The query identifies the program, not a user or entitlement.
export const clarityLocale=locale=>['en','ru','es'].includes(locale)?locale:'en'
export const clarityDaybookPath=locale=>'/'+clarityLocale(locale)+'/app/daybook?program=clarity'
export function clarityOnboardingPath(locale){
 const lang=clarityLocale(locale)
 return '/'+(lang==='es'?'en':lang)+'/app/portrait?afterSignIn=clarity&clarityLocale='+lang
}
export const CLARITY_FREE_REFLECTION_TAG='clarity-week-1'
// A journal entry is a voluntary self-report, never payment or access authority.
export function savedClarityReflection(entries=[]){
 return entries.find(entry=>entry?.kind==='note'&&entry?.goalId===null&&entry?.revision>0&&entry?.tags?.includes(CLARITY_FREE_REFLECTION_TAG)&&typeof entry.text==='string'&&entry.text.trim())||null
}
// V2: exactly three free self-guided days. Legacy week notes stay in the journal.
export const CLARITY_DAY_COUNT=3
export const CLARITY_SYLLABUS={
 "en": [
  [
   "Discover yourself",
   "Explore your life balance, personal values and current needs."
  ],
  [
   "Understand yourself and find support",
   "Explore eight meaning axes, choose your inner development vector and find support for a first step."
  ],
  [
   "Define your goal",
   "Choose a direction, formulate a realistic goal and plan the first step."
  ]
 ],
 "ru": [
  [
   "Познать себя",
   "Исследуйте баланс жизни, личные ценности и актуальные потребности."
  ],
  [
   "Понять себя и найти опору",
   "Исследуйте восемь осей смысла, выберите внутренний вектор развития и найдите опору для первого шага."
  ],
  [
   "Определить свою цель",
   "Выберите направление, сформулируйте реалистичную цель и первый шаг."
  ]
 ],
 "es": [
  [
   "Conócete",
   "Explora el equilibrio de tu vida, tus valores y necesidades actuales."
  ],
  [
   "Compréndete y encuentra apoyo",
   "Explora ocho ejes de sentido, elige tu vector de desarrollo interno y encuentra apoyo para un primer paso."
  ],
  [
   "Define tu meta",
   "Elige un rumbo, formula una meta realista y planifica el primer paso."
  ]
 ]
}
export const CLARITY_TASKS={
 "en": [
  [
   [
    "Life balance wheel",
    "Compare your current and desired ratings. Which area needs your attention?",
    "vectors"
   ],
   [
    "Eight meaning axes",
    "Choose the value or need that matters most and describe it in your own words.",
    "vectors"
   ],
   [
    "Personal profile",
    "Write one request, one strength and what you want to understand better.",
    "profile"
   ]
  ],
  [
   [
    "Eight meaning axes",
    "Review current and desired ratings from 0 to 10, choose your own development priority and connect it to everyday life.",
    "vectors"
   ],
   [
    "Resources and support",
    "Identify a trusted person, an available resource and one gentle action."
   ],
   [
    "Support practice",
    "Try a short comfortable grounding or relaxation exercise; note what changed.",
    "practice"
   ]
  ],
  [
   [
    "Direction",
    "Choose one life area and one meaning axis.",
    "vectors"
   ],
   [
    "Goal formulation",
    "Describe your desired result, current baseline and a realistic target.",
    "goal"
   ],
   [
    "First step",
    "Choose a small action, when to take it and what support you need."
   ]
  ]
 ],
 "ru": [
  [
   [
    "Колесо баланса",
    "Сравните текущие и желаемые оценки. Какой сфере нужно внимание?",
    "vectors"
   ],
   [
    "Восемь смысловых осей",
    "Выберите значимую ценность или потребность и опишите её своими словами.",
    "vectors"
   ],
   [
    "Личный профиль",
    "Запишите один запрос, одну сильную сторону и что хотите лучше понять.",
    "profile"
   ]
  ],
  [
   [
    "Восемь осей смысла",
    "Сверьте текущие и желаемые оценки от 0 до 10, выберите свой приоритет развития и свяжите его с повседневной жизнью.",
    "vectors"
   ],
   [
    "Ресурсы и поддержка",
    "Назовите близкого человека, доступный ресурс и одно бережное действие."
   ],
   [
    "Практика поддержки",
    "Попробуйте короткое комфортное упражнение на расслабление или опору; отметьте изменения.",
    "practice"
   ]
  ],
  [
   [
    "Направление",
    "Выберите одну сферу жизни и одну смысловую ось.",
    "vectors"
   ],
   [
    "Формулировка цели",
    "Опишите желаемый результат, текущее положение и реалистичный ориентир.",
    "goal"
   ],
   [
    "Первый шаг",
    "Выберите небольшое действие, срок и необходимую поддержку."
   ]
  ]
 ],
 "es": [
  [
   [
    "Rueda del equilibrio",
    "Compara tus valoraciones actuales y deseadas. ¿Qué área requiere atención?",
    "vectors"
   ],
   [
    "Ocho ejes de significado",
    "Elige el valor o la necesidad principal y descríbelo con tus propias palabras.",
    "vectors"
   ],
   [
    "Perfil personal",
    "Anota una petición, una fortaleza y lo que quieres entender mejor.",
    "profile"
   ]
  ],
  [
   [
    "Ocho ejes de sentido",
    "Revisa las valoraciones actuales y deseadas de 0 a 10, elige tu prioridad de desarrollo y vincúlala a tu vida cotidiana.",
    "vectors"
   ],
   [
    "Recursos y apoyo",
    "Identifica una persona de confianza, un recurso disponible y una acción amable."
   ],
   [
    "Práctica de apoyo",
    "Prueba un ejercicio breve y cómodo de relajación o conexión con el presente; observa los cambios.",
    "practice"
   ]
  ],
  [
   [
    "Dirección",
    "Elige un área de vida y un eje de significado.",
    "vectors"
   ],
   [
    "Formulación de la meta",
    "Describe el resultado deseado, la situación actual y una meta realista.",
    "goal"
   ],
   [
    "Primer paso",
    "Elige una acción pequeña, cuándo realizarla y qué apoyo necesitas."
   ]
  ]
 ]
}
export function clarityDayTag(day){
 if(!Number.isInteger(day)||day<1||day>CLARITY_DAY_COUNT)throw new Error('INVALID_CLARITY_DAY')
 return 'clarity-v2-day-'+day
}
export function clarityDayNotes(entries,day){
 const tag=clarityDayTag(day)
 return (Array.isArray(entries)?entries:[]).filter(e=>e?.kind==='note'&&e.goalId===null&&Number.isSafeInteger(e.revision)&&e.revision>0&&typeof e.id==='string'&&e.id.length>0&&Array.isArray(e.tags)&&e.tags.includes(tag)&&typeof e.text==='string'&&e.text.trim().length>0)
}
export function clarityRecordedDays(entries){
 return Array.from({length:CLARITY_DAY_COUNT},(_,i)=>i+1).filter(day=>clarityDayNotes(entries,day).length>0)
}
export function clarityLegacyNotes(entries){
 return (Array.isArray(entries)?entries:[]).filter(e=>savedClarityReflection([e])===e)
}

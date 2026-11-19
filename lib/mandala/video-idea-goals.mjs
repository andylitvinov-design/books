/** User-selected Ideas goals, mapped to existing licensed editorial taxonomy topics. */
const DATA=[
 [
  "calm",
  "stress-relief",
  "stress-anxiety",
  "stress-burnout",
  [
   "Calm & Balance",
   "Relax, ease tension and feel more centered.",
   "I want to feel calmer, balanced and grounded"
  ],
  [
   "Спокойствие и баланс",
   "Снизить напряжение и вернуть внутреннюю опору.",
   "Я хочу спокойствия, устойчивости и равновесия"
  ],
  [
   "Calma y equilibrio",
   "Soltar la tensión y recuperar la tranquilidad.",
   "Quiero sentir calma, equilibrio y estabilidad"
  ]
 ],
 [
  "love",
  "emotional-intimacy",
  "love-relationships",
  "intimacy-family",
  [
   "Love & Openness",
   "Open up to warmth, trust and connection.",
   "I want more love, openness and human connection"
  ],
  [
   "Любовь и открытость",
   "Больше тепла, доверия и близости.",
   "Я хочу больше любви, открытости и близости"
  ],
  [
   "Amor y apertura",
   "Abrirme al cariño, la confianza y la cercanía.",
   "Quiero abrirme al amor, la confianza y la conexión"
  ]
 ],
 [
  "energy",
  "motivation-drive",
  "energy-confidence",
  "vital-energy",
  [
   "Energy & Motivation",
   "Restore strength, clarity and inner drive.",
   "I want energy, motivation and focus"
  ],
  [
   "Энергия и мотивация",
   "Вернуть силы, ясность и желание действовать.",
   "Я хочу больше энергии, мотивации и ясности"
  ],
  [
   "Energía y motivación",
   "Recuperar la fuerza, el enfoque y el impulso.",
   "Quiero recuperar energía, motivación y concentración"
  ]
 ],
 [
  "confidence",
  "self-confidence",
  "energy-confidence",
  "confidence-calm",
  [
   "Confidence & Self-worth",
   "Trust yourself and your own choices.",
   "I want more confidence and self-worth"
  ],
  [
   "Уверенность в себе",
   "Больше опоры на себя и свои решения.",
   "Я хочу укрепить уверенность и самоценность"
  ],
  [
   "Confianza en mí",
   "Confiar más en mí y en mis decisiones.",
   "Quiero fortalecer mi confianza y autoestima"
  ]
 ],
 [
  "focus",
  "goal-setting",
  "goals-money",
  "goal-achievement",
  [
   "Focus & Progress",
   "Find your direction and move forward.",
   "I want focus and steady progress toward my goal"
  ],
  [
   "Фокус и движение",
   "Найти направление и сделать шаг вперёд.",
   "Я хочу ясности, фокуса и движения к цели"
  ],
  [
   "Enfoque y progreso",
   "Encontrar una dirección y avanzar.",
   "Quiero claridad, enfoque y progreso hacia mi meta"
  ]
 ],
 [
  "trust",
  "rebuilding-trust",
  "love-relationships",
  "couple-relationships",
  [
   "Trust & Connection",
   "Make room for real dialogue and closeness.",
   "I want trust and genuine connection"
  ],
  [
   "Доверие и контакт",
   "Найти пространство для диалога и близости.",
   "Я хочу больше доверия и искреннего контакта"
  ],
  [
   "Confianza y conexión",
   "Crear espacio para el diálogo y la cercanía.",
   "Quiero más confianza y conexión auténtica"
  ]
 ],
 [
  "growth",
  "personal-growth",
  "goals-money",
  "purpose-development",
  [
   "Renewal & Growth",
   "Open the door to a new chapter.",
   "I want renewal and personal growth"
  ],
  [
   "Обновление и рост",
   "Открыть пространство для нового этапа.",
   "Я хочу обновления и личностного роста"
  ],
  [
   "Renovación y crecimiento",
   "Abrir la puerta a una nueva etapa.",
   "Quiero renovación y crecimiento personal"
  ]
 ],
 [
  "rest",
  "recovery-after-load",
  "energy-confidence",
  "stress-fatigue",
  [
   "Rest & Recovery",
   "Slow down and gently replenish your energy.",
   "I want to rest and recover after a demanding time"
  ],
  [
   "Отдых и восстановление",
   "Замедлиться и мягко восполнить силы.",
   "Я хочу отдохнуть и восстановиться после нагрузки"
  ],
  [
   "Descanso y recuperación",
   "Bajar el ritmo y recuperar fuerzas.",
   "Quiero descansar y recuperarme del esfuerzo"
  ]
 ],
 [
  "meaning",
  "life-purpose",
  "goals-money",
  "purpose-development",
  [
   "Meaning & Direction",
   "Reconnect with what matters to you.",
   "I want more meaning and direction in my life"
  ],
  [
   "Смысл и направление",
   "Вернуться к тому, что действительно важно.",
   "Я хочу яснее видеть смысл и направление жизни"
  ],
  [
   "Sentido y dirección",
   "Reconectar con lo que es importante.",
   "Quiero más sentido y dirección en mi vida"
  ]
 ]
];
export const IDEA_GOAL_PAGES=Object.freeze([0,1,2].map(page=>Object.freeze(DATA.slice(page*3,page*3+3).map(([id,topicId,categoryId,subcategoryId,en,ru,es])=>Object.freeze({id,topicId,categoryId,subcategoryId,copy:{en:{title:en[0],detail:en[1],intent:en[2]},ru:{title:ru[0],detail:ru[1],intent:ru[2]},es:{title:es[0],detail:es[1],intent:es[2]}}})))));
export function getVideoIdeaGoal(id){return IDEA_GOAL_PAGES.flat().find(x=>x.id===id)||null;}
export function composeVideoIdeaGoalIntent(wish,locale,id){
 const original=String(wish||"").trim().replace(/[.!?。]+$/u,"").slice(0,600);
 const chosen=getVideoIdeaGoal(id);
 if(!chosen)return original;
 const intent=chosen.copy[locale]?.intent||chosen.copy.en.intent;
 return [original,intent].filter(Boolean).join(". ").slice(0,800);
}

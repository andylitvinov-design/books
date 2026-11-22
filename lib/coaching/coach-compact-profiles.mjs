import {getCoachPersona,localCoachText,PUBLIC_COACH_PERSONA_IDS} from './persona-registry.mjs'
import {getCoachStylePassport} from './coach-style-passports.mjs'

// Public-facing profile copy only: no client data, analytics or session storage.
const T=(en,ru,es)=>Object.freeze({en,ru,es})
const METHODS=Object.freeze({
  grow:{label:T('GROW','GROW','GROW'),steps:[T('Goal','Цель','Meta'),T('Reality','Реальность','Realidad'),T('Options','Варианты','Opciones'),T('Action','Действие','Acción'),T('Review','Итог','Revisión')]},
  tgrow:{label:T('T-GROW','T-GROW','T-GROW'),steps:[T('Topic','Тема','Tema'),T('Goal','Цель','Meta'),T('Reality','Реальность','Realidad'),T('Options','Варианты','Opciones'),T('Action','Действие','Acción'),T('Review','Итог','Revisión')]},
  woop:{label:T('WOOP','WOOP','WOOP'),steps:[T('Wish','Желание','Deseo'),T('Outcome','Результат','Resultado'),T('Obstacle','Препятствие','Obstáculo'),T('If–then','Если — то','Si–entonces'),T('Review','Итог','Revisión')]},
  oskar:{label:T('OSKAR','OSKAR','OSKAR'),steps:[T('Outcome','Результат','Resultado'),T('Scale','Шкала','Escala'),T('Strengths','Сильные стороны','Fortalezas'),T('Action','Шаг','Acción'),T('Review','Итог','Revisión')]},
  solution_focused:{label:T('Solution-focused','Ориентированный на решения','Centrado en soluciones'),steps:[T('Future','Будущее','Futuro'),T('Exceptions','Исключения','Excepciones'),T('Strengths','Ресурсы','Fortalezas'),T('Experiment','Эксперимент','Experimento'),T('Review','Итог','Revisión')]},
  appreciative_inquiry:{label:T('Appreciative Inquiry','Позитивное исследование','Indagación apreciativa'),steps:[T('Discover','Открытие','Descubrir'),T('Dream','Мечта','Soñar'),T('Design','План','Diseñar'),T('Deliver','Действие','Actuar'),T('Review','Итог','Revisión')]}
})
const METHOD_IDS=Object.freeze({
  GROW:'grow',TGROW:'tgrow',WOOP:'woop',OSKAR:'oskar',
  'Solution-focused':'solution_focused','Appreciative inquiry':'appreciative_inquiry'
})
const EDITORIAL=Object.freeze({
  mira:{
    tags:[T('Calm','Спокойствие','Calma'),T('Clarity','Ясность','Claridad'),T('Support','Поддержка','Apoyo')],
    character:T('Gentle, patient and accepting. Helps you find calm and clarity.','Мягкая, терпеливая и принимающая. Помогает вернуть спокойствие и ясность.','Amable y paciente. Te ayuda a recuperar la calma y la claridad.'),
    focus:[T('Stress','Стресс','Estrés'),T('Inner support','Опора','Apoyo interior'),T('Choices','Выбор','Decisiones')],
    features:[T('No pressure','Без давления','Sin presión'),T('Listens carefully','Внимательно слушает','Escucha con atención'),T('Small, safe steps','Посильные шаги','Pasos posibles')],
    quote:T('Clarity begins when you give yourself room to breathe.','Ясность приходит, когда даёшь себе пространство для дыхания.','La claridad llega cuando te das espacio para respirar.')
  },
  max:{
    tags:[T('Focus','Фокус','Enfoque'),T('Action','Действие','Acción'),T('Momentum','Движение','Avance')],
    character:T('Energetic, direct and practical. Helps turn decisions into action.','Энергичный, прямой и практичный. Помогает перейти от решений к действиям.','Dinámico, directo y práctico. Convierte las decisiones en acciones.'),
    focus:[T('Goals','Цели','Metas'),T('Decisions','Решения','Decisiones'),T('Momentum','Действия','Avance')],
    features:[T('Clear priorities','Ясные приоритеты','Prioridades claras'),T('Concrete experiments','Проверяемые шаги','Pruebas concretas'),T('Less overthinking','Меньше сомнений','Menos vueltas')],
    quote:T('A decision matters when you give it a first step.','Решение обретает силу, когда ты делаешь первый шаг.','Una decisión cobra vida cuando das el primer paso.')
  },
  sofia:{
    tags:[T('Empathy','Эмпатия','Empatía'),T('Trust','Доверие','Confianza'),T('Connection','Близость','Conexión')],
    character:T('Warm, attentive and empathetic. Respects feelings and boundaries.','Тёплая, чуткая и внимательная. Уважает чувства и границы.','Cálida y empática. Respeta los sentimientos y los límites.'),
    focus:[T('Relationships','Отношения','Relaciones'),T('Boundaries','Границы','Límites'),T('Dialogue','Диалог','Diálogo')],
    features:[T('Hears both sides','Слышит обе стороны','Escucha ambas partes'),T('Without blame','Без обвинений','Sin culpas'),T('Honest communication','Честный разговор','Diálogo sincero')],
    quote:T('Connection grows where honesty meets respect.','Близость растёт там, где честность встречается с уважением.','La conexión crece donde se encuentran la honestidad y el respeto.')
  },
  alex:{
    tags:[T('Strategy','Стратегия','Estrategia'),T('Clarity','Ясность','Claridad'),T('Results','Результат','Resultados')],
    character:T('Structured, strategic and realistic. Clarifies complex choices.','Структурный, стратегичный и реалистичный. Проясняет сложный выбор.','Estructurado, estratégico y realista. Aclara decisiones complejas.'),
    focus:[T('Career','Карьера','Carrera'),T('Business','Бизнес','Negocios'),T('Strategy','Стратегия','Estrategia')],
    features:[T('Sees trade-offs','Видит последствия','Evalúa alternativas'),T('Checks assumptions','Проверяет гипотезы','Verifica supuestos'),T('Tests plans','Проверяет планы','Prueba planes')],
    quote:T('A good strategy starts with a clear question.','Хорошая стратегия начинается с ясного вопроса.','Una buena estrategia comienza con una pregunta clara.')
  },
  merlin:{
    tags:[T('Wisdom','Мудрость','Sabiduría'),T('Clarity','Ясность','Claridad'),T('Transformation','Перемены','Cambio')],
    character:T('Wise, calm and thoughtful. Helps you see the bigger picture.','Мудрый, спокойный и вдумчивый. Помогает увидеть картину целиком.','Sabio, sereno y reflexivo. Te ayuda a ver el panorama completo.'),
    focus:[T('Life changes','Перемены','Cambios'),T('Meaning','Смысл','Sentido'),T('Inner resources','Ресурсы','Recursos')],
    features:[T('Sees deeper patterns','Видит закономерности','Ve patrones'),T('Uses metaphors','Работает с образами','Usa metáforas'),T('Connects insight to action','Связывает смысл и шаги','Une sentido y acción')],
    quote:T('When meaning becomes clear, a new path opens.','Когда смысл становится ясным, открывается новый путь.','Cuando el sentido se aclara, se abre un nuevo camino.')
  },
  harry:{
    tags:[T('Courage','Смелость','Valor'),T('Friendship','Дружба','Amistad'),T('Growth','Рост','Crecimiento')],
    character:T('Friendly, brave and loyal. Finds courage with the help of others.','Дружелюбный, смелый и верный. Помогает находить смелость и поддержку.','Amable, valiente y leal. Encuentra valor junto a los demás.'),
    focus:[T('Confidence','Уверенность','Confianza'),T('Challenges','Трудности','Retos'),T('Friendship','Дружба','Amistad')],
    features:[T('Accepts fear','Признаёт страх','Acepta el miedo'),T('Looks for allies','Находит союзников','Busca aliados'),T('Chooses safe steps','Выбирает безопасные шаги','Elige pasos seguros')],
    quote:T('Courage is taking the next step, even with fear.','Смелость — сделать следующий шаг, даже если страшно.','Ser valiente es avanzar incluso cuando sientes miedo.')
  },
  genie:{
    tags:[T('Wishes','Желания','Deseos'),T('Possibilities','Возможности','Posibilidades'),T('Playfulness','Лёгкость','Juego')],
    character:T('Charming, witty and kind. Makes room for imagination while honoring real limits.','Обаятельный, остроумный и добрый. Даёт простор фантазии, уважая реальные ограничения.','Encantador, ingenioso y amable. Da espacio a la imaginación respetando los límites reales.'),
    focus:[T('Dreams','Мечты','Sueños'),T('New perspectives','Новый взгляд','Nuevas perspectivas'),T('Practical choices','Выбор','Decisiones prácticas')],
    features:[T('Three wishes metaphor','Метафора трёх желаний','Metáfora de tres deseos'),T('No false promises','Без ложных обещаний','Sin falsas promesas'),T('Small real steps','Реальные шаги','Pasos reales')],
    quote:T('A wish becomes a path when you choose the first step.','Желание становится путём, когда вы выбираете первый шаг.','Un deseo se vuelve camino cuando eliges el primer paso.')
  }
})

export function getCoachCompactProfile(personaId,locale='en',preferredMethodId){
  if(!PUBLIC_COACH_PERSONA_IDS.includes(personaId))return null
  const persona=getCoachPersona(personaId)
  const source=EDITORIAL[personaId]
  const passport=getCoachStylePassport(personaId)
  if(!persona||!source||!passport)return null
  const lang=['en','ru','es'].includes(locale)?locale:'en'
  const allowedMethods=(persona.methods||[]).map(method=>METHOD_IDS[method]).filter(Boolean)
  const methodId=allowedMethods.includes(preferredMethodId)?preferredMethodId:allowedMethods[0]
  const method=METHODS[methodId]
  if(!method)return null
  const local=value=>localCoachText(value,lang)
  return Object.freeze({
    id:personaId,name:local(persona.name),role:local(persona.role),
    character:local(source.character),
    archetype:local(passport.archetype),style:local(passport.style),
    workStyle:local(passport.workStyle),focus:source.focus.map(local),
    features:source.features.map(local),tags:source.tags.map(local),quote:local(source.quote),
    methodId,model:local(method.label),steps:method.steps.map(local),
    availableMethods:Object.freeze(allowedMethods)
  })
}

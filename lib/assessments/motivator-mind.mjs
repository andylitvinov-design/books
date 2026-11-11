// Motivator Mind: supportive wording grounded in verified assessment reports.
// No external model, client profile, score reinterpretation, or automatic persistence.
export const MOTIVATOR_MIND_VERSION = '1.0.0'
export const MOTIVATOR_APPROACHES = Object.freeze([
  ['self_determination','Autonomy and choice'],
  ['motivational_interviewing','Affirmation and client-owned reasons'],
  ['self_compassion','Kindness rather than self-criticism'],
  ['act_values','Values-guided direction'],
  ['cbt_reframe','Balanced alternatives to rigid beliefs'],
  ['growth_mindset','Learning rather than fixed labels'],
  ['solution_focused','Small achievable improvements'],
  ['implementation_intentions','Optional if-then plans'],
  ['resources','Recognition of available support'],
  ['metaphor','Gentle imagery without medical claims'],
  ['trauma_informed','Choice, pacing and stabilisation'],
].map(([id,label]) => Object.freeze({id,label})))

export const MOTIVATOR_BELIEFS = Object.freeze([
  {id:'worth',ru:'Моя ценность не зависит от безупречности.',en:'My worth does not depend on perfection.',es:'Mi valor no depende de la perfección.'},
  {id:'pace',ru:'Я могу выбирать собственный темп.',en:'I can choose my own pace.',es:'Puedo elegir mi propio ritmo.'},
  {id:'feelings',ru:'Переживание не обязано быть предсказанием.',en:'A feeling is not necessarily a prediction.',es:'Una emoción no es necesariamente una predicción.'},
  {id:'rest',ru:'Отдых не нужно заслуживать.',en:'Rest does not need to be earned.',es:'No tengo que ganarme el descanso.'},
  {id:'boundaries',ru:'Я могу беречь отношения, сохраняя границы.',en:'I can care for relationships while keeping boundaries.',es:'Puedo cuidar mis vínculos y mantener mis límites.'},
  {id:'growth',ru:'Попытка может дать информацию даже без идеального результата.',en:'An attempt can teach me something without being perfect.',es:'Un intento puede enseñarme algo sin ser perfecto.'},
  {id:'values',ru:'Не нужно знать весь путь, чтобы выбрать направление.',en:'I do not need the whole map to choose a direction.',es:'No necesito conocer todo el camino para elegir una dirección.'},
  {id:'support',ru:'Мне необязательно справляться в одиночку.',en:'I do not have to manage everything alone.',es:'No tengo que afrontar todo en soledad.'},
  {id:'step',ru:'Один посильный шаг — тоже действие.',en:'One manageable step still counts.',es:'Un paso posible también cuenta.'},
  {id:'identity',ru:'Один результат не определяет всю мою личность.',en:'One result does not define all of who I am.',es:'Un resultado no define todo lo que soy.'},
])

const TOPIC = Object.freeze({
  burnout: ['self_compassion','rest'],
  sleep: ['resources','rest'],
  anxiety: ['cbt_reframe','feelings'],
  mood: ['self_compassion','worth'],
  selfcompassion: ['self_compassion','worth'],
  boundaries: ['self_determination','boundaries'],
  relationship: ['motivational_interviewing','boundaries'],
  energy: ['resources','rest'],
  attention: ['growth_mindset','growth'],
  work: ['implementation_intentions','step'],
  meaning: ['act_values','values'],
  personality: ['growth_mindset','identity'],
  functioning: ['solution_focused','step'],
  support: ['resources','support'],
  bach: ['metaphor','identity'],
  general: ['self_determination','identity'],
})
// Each topic: truthful contextual opening, then two editorially reviewed
// alternatives. No numeric score is converted into an unsupported condition.
const BANK = {
  ru: {
    title:'Ваша точка опоры',
    disclosure:'Поддерживающее размышление, не дополнительный вывод теста.',
    finish:{
      gentle:'Можно двигаться в своём темпе, не решая всё сразу.',
      steady:'Если захочется, выберите один посильный шаг из рекомендаций отчёта.',
      inspiring:'Пусть следующий шаг будет небольшим, но выбранным вами.',
      reflective:'Что из предложенного сейчас кажется вам посильным?',
    },
    review:['Некоторые ответы заслуживают внимательного отношения, но не определяют вас целиком.',
      'Вам необязательно справляться с трудностями в одиночку.',
      'Обращение за поддержкой — допустимый способ заботиться о себе.',
      'Если симптомы мешают повседневной жизни, обсудите их с квалифицированным специалистом.'],
    topics:{
      burnout:['Тема нагрузки и восстановления заслуживает внимания.','Отдых не нужно заслуживать безупречной работой.','Иногда забота о себе начинается с уменьшения требований, а не с новой задачи.'],
      sleep:['Сон и восстановление — важная часть повседневной жизни.','Свои привычки можно исследовать без обвинений к себе.','Небольшие наблюдения помогают замечать собственный ритм.'],
      anxiety:['Вопросы о тревоге помогают присмотреться к переживаниям.','Тревожная мысль не обязана быть точным прогнозом.','Можно замечать тревогу без требования немедленно её победить.'],
      mood:['Эмоциональное состояние не описывается одним числом.','Не нужно изображать хорошее настроение, чтобы заслуживать поддержки.','Даже в трудный период маленькая забота о себе имеет смысл.'],
      selfcompassion:['Отношение к себе заслуживает бережного внимания.','Вам не нужно быть безупречным, чтобы относиться к себе с уважением.','Можно учиться говорить с собой не только голосом критика.'],
      boundaries:['Личные границы можно рассматривать без самоупрёков.','Можно беречь отношения и оставлять место для собственных потребностей.','Право выбирать свой ответ не делает вас плохим человеком.'],
      relationship:['Отношения зависят от множества обстоятельств.','Близость не требует полного отказа от себя.','Прояснение потребностей порой полезнее догадок о чувствах другого.'],
      energy:['Вопросы об энергии помогают обратить внимание на ресурсы.','Восстановление заслуживает внимания наряду с делами.','Даже короткая пауза может быть осмысленным выбором.'],
      attention:['Внимание меняется в разных условиях.','Один способ сосредоточиться не обязан подходить всегда.','Можно пробовать небольшие изменения без требования идеальной дисциплины.'],
      work:['Рабочие задачи можно рассматривать по частям.','Необязательно менять весь план за один день.','Один небольшой эксперимент может дать полезную информацию.'],
      meaning:['Вопросы о смысле не обязаны иметь быстрый ответ.','Не нужно видеть всю дорогу, чтобы выбирать важное направление.','Ценности могут оставаться ориентиром и в неопределённости.'],
      personality:['Описание черт — не окончательный ярлык личности.','В разных обстоятельствах могут проявляться разные стороны вас.','Один тест не вмещает всю сложность человеческого опыта.'],
      functioning:['Повседневные трудности можно рассматривать по одной.','Необязательно решать всё за один подход.','Маленькое облегчение тоже может быть полезным ориентиром.'],
      support:['Ресурсы — это не только усилие, но и доступная помощь.','Просить поддержку допустимо, даже если вы привыкли справляться сами.','Ваши собственные потребности заслуживают внимания.'],
      bach:['Этот эмоциональный профиль — повод для размышления, а не клинический вывод.','Ни одна символическая тема не обязана становиться вашим ярлыком.','Образы могут помогать размышлять без приписывания эссенциям лечебного действия.'],
      general:['Результат описывает ответы на вопросы, а не всю вашу историю.','Вы вправе выбирать, какие выводы действительно полезны.','Можно внимательно относиться к себе без требования немедленно меняться.'],
    },
  },
  en: {
    title:'Your point of support',
    disclosure:'A supportive reflection, not an additional test finding.',
    finish:{
      gentle:'You can choose your own pace without solving everything today.',
      steady:'If you wish, choose one manageable step from the report recommendations.',
      inspiring:'Let the next step be small, and yours to choose.',
      reflective:'Which of these options feels manageable right now?',
    },
    review:['Some responses deserve careful attention, but they do not define your whole story.',
      'You do not have to manage difficult experiences alone.',
      'Seeking support can be a way to care for yourself, not a weakness.',
      'If symptoms interfere with daily life, consider speaking to a qualified professional.'],
    topics:{
      burnout:['Workload and recovery deserve attention.','Rest does not have to be earned through flawless performance.','Sometimes self-care begins with fewer demands, not another task.'],
      sleep:['Sleep and recovery matter in everyday life.','You can explore your patterns without blaming yourself.','Small observations can help you understand your rhythm.'],
      anxiety:['Questions about anxiety invite a closer look at your experiences.','An anxious thought is not necessarily an accurate prediction.','You can notice anxiety without demanding that it disappear immediately.'],
      mood:['Emotional experiences cannot be reduced to one number.','You do not have to pretend to feel cheerful to deserve support.','Even during a hard period, a small act of self-care can matter.'],
      selfcompassion:['How you relate to yourself deserves gentle attention.','You do not need to be flawless to treat yourself with respect.','It is possible to speak to yourself in a voice other than criticism.'],
      boundaries:['Personal boundaries can be explored without self-blame.','You can care about relationships while making room for your needs.','Choosing your response does not make you unkind.'],
      relationship:['Relationships involve many different circumstances.','Closeness does not require abandoning your needs.','Clarifying what matters can help more than guessing what another feels.'],
      energy:['Questions about energy invite attention to your resources.','Recovery deserves attention alongside daily responsibilities.','Even a brief pause can be a meaningful choice.'],
      attention:['Attention varies across situations.','One way of focusing does not have to work every time.','You can test small adjustments without demanding perfect discipline.'],
      work:['Work goals can be approached one step at a time.','You do not have to change the whole plan in one day.','One small experiment can offer useful information.'],
      meaning:['Questions about meaning need not have quick answers.','You do not need the whole map to choose a valued direction.','Your values can be a compass even when the future is uncertain.'],
      personality:['Trait descriptions are not permanent labels.','Different situations can bring out different sides of you.','One questionnaire cannot capture the complexity of your experience.'],
      functioning:['Daily challenges can be considered one at a time.','You do not have to solve everything in one attempt.','A small improvement can still be a useful signpost.'],
      support:['Resources include help as well as personal effort.','It is okay to ask for support even if you are used to managing alone.','Your own needs deserve attention, too.'],
      bach:['This emotional profile is an invitation to reflect, not a clinical conclusion.','No symbolic theme needs to define who you are.','Images can invite reflection without implying a remedy has a healing effect.'],
      general:['This result reflects your answers, not your entire story.','You can decide which insights feel useful to you.','You can pay attention to yourself without demanding immediate change.'],
    },
  },
  es: {
    title:'Tu punto de apoyo',
    disclosure:'Una reflexión de apoyo, no otra conclusión de la prueba.',
    finish:{
      gentle:'Puedes avanzar a tu ritmo sin resolverlo todo hoy.',
      steady:'Si lo deseas, elige un paso posible entre las recomendaciones del informe.',
      inspiring:'Que el siguiente paso sea pequeño y elegido por ti.',
      reflective:'¿Cuál de estas opciones te parece posible ahora?',
    },
    review:['Algunas respuestas merecen atención, pero no definen toda tu historia.',
      'No tienes que afrontar las dificultades en soledad.',
      'Buscar apoyo puede ser una forma de cuidarte, no una debilidad.',
      'Si los síntomas afectan tu vida diaria, considera hablar con un profesional cualificado.'],
    topics:{
      burnout:['La carga y la recuperación merecen atención.','No tienes que ganarte el descanso con un rendimiento perfecto.','A veces cuidarse empieza por reducir exigencias, no por añadir tareas.'],
      sleep:['El sueño y la recuperación importan en la vida diaria.','Puedes observar tus hábitos sin culparte.','Las pequeñas observaciones ayudan a conocer tu ritmo.'],
      anxiety:['Las preguntas sobre ansiedad invitan a observar tu experiencia.','Un pensamiento ansioso no es necesariamente una predicción acertada.','Puedes reconocer la ansiedad sin exigirte eliminarla de inmediato.'],
      mood:['Tu estado emocional no se resume en un número.','No tienes que fingir alegría para merecer apoyo.','Incluso en días difíciles, un pequeño gesto de cuidado importa.'],
      selfcompassion:['La forma de tratarte merece una atención amable.','No necesitas ser perfecto para tratarte con respeto.','Puedes aprender a hablarte sin recurrir siempre a la crítica.'],
      boundaries:['Puedes explorar tus límites personales sin culparte.','Es posible cuidar tus vínculos y respetar tus necesidades.','Elegir tu respuesta no te convierte en una mala persona.'],
      relationship:['Las relaciones dependen de muchas circunstancias.','La cercanía no exige abandonar tus necesidades.','Aclarar lo que importa puede ayudar más que adivinar lo que siente otra persona.'],
      energy:['Las preguntas sobre energía invitan a observar tus recursos.','La recuperación merece atención junto a las responsabilidades.','Una pausa breve también puede ser una elección valiosa.'],
      attention:['La atención cambia según las situaciones.','Una forma de concentrarse no tiene que servir siempre.','Puedes probar ajustes pequeños sin exigirte una disciplina perfecta.'],
      work:['Las metas laborales pueden abordarse paso a paso.','No tienes que cambiar todo el plan en un día.','Un experimento pequeño puede darte información útil.'],
      meaning:['Las preguntas sobre sentido no requieren respuestas inmediatas.','No necesitas ver todo el camino para elegir una dirección importante.','Tus valores pueden orientarte incluso cuando hay incertidumbre.'],
      personality:['Los rasgos descritos no son etiquetas permanentes.','Distintas situaciones pueden mostrar distintas facetas de ti.','Un cuestionario no abarca toda la complejidad de tu experiencia.'],
      functioning:['Las dificultades cotidianas pueden abordarse una a una.','No tienes que resolverlo todo de golpe.','Una mejora pequeña también puede orientar tu camino.'],
      support:['Los recursos incluyen ayuda, no solo esfuerzo personal.','Está bien pedir apoyo aunque acostumbres a resolverlo todo solo.','Tus necesidades también merecen atención.'],
      bach:['Este perfil emocional invita a reflexionar; no es una conclusión clínica.','Ningún símbolo tiene por qué definir quién eres.','Las imágenes pueden invitar a reflexionar sin atribuir efectos terapéuticos a una esencia.'],
      general:['Este resultado refleja tus respuestas, no toda tu historia.','Puedes decidir qué ideas te resultan útiles.','Puedes escucharte sin exigirte un cambio inmediato.'],
    },
  },
}
const ALIASES = Object.freeze({
  stress:'anxiety',trauma:'anxiety',depression:'mood',shame:'selfcompassion',
  self_compassion:'selfcompassion',selfesteem:'selfcompassion',
  relationships:'relationship',goals:'work',purpose:'meaning',values:'meaning',
  resilience:'support',fatigue:'energy',bodily:'energy',focus:'attention',
})
const BLOCKED = new Set(['crisis','immediate','urgent','unsafe'])
const TONES = new Set(['gentle','steady','inspiring','reflective'])
const lang = value => value === 'ru' || value === 'es' ? value : 'en'
function hash(text) {
  let value = 2166136261
  for (const char of String(text)) { value ^= char.charCodeAt(0); value = Math.imul(value,16777619) }
  return value >>> 0
}
export function buildMotivatorMessage({report,result=null,locale='en',format='paragraph',
  tone='gentle',focusScaleKey=null,safetyState='ok'} = {}) {
  if (!report || report.verified !== true || !Array.isArray(report.sections) ||
      !report.sections.length || BLOCKED.has(safetyState)) return null
  if (report.sections.some(row => !row || row.bandBasis === 'unavailable')) return null
  const sections = report.sections
  const active = report.reportKind === 'bach'
    ? sections.find(row=>row.group==='main') || sections[0]
    : sections.find(row=>row.key===focusScaleKey) ||
      sections.find(row=>row.recommendedReview) || sections[0]
  const language = lang(locale)
  const copy = BANK[language]
  const review = sections.some(row=>row.recommendedReview === true)
  const rawTopic = report.reportKind === 'bach' ? 'bach' : String(active.domain || 'general').toLowerCase()
  const topic = ALIASES[rawTopic] || (TOPIC[rawTopic] ? rawTopic : 'general')
  const template = copy.topics[topic]
  const seed = hash([
    result?.id||'', result?.definitionKey||'', active.key||'',
    active.value??'',report.rulesVersion||'',MOTIVATOR_MIND_VERSION,
  ].join('|'))
  const usedTone = review ? 'gentle' : TONES.has(tone) ? tone : 'gentle'
  const quote = review ? copy.review[1 + seed%2] : template[1 + seed%2]
  const paragraph = format === 'quote' ? quote : review
    ? [copy.review[0],quote,copy.review[3]].join(' ')
    : [template[0],quote,copy.finish[usedTone]].join(' ')
  return Object.freeze({
    version:MOTIVATOR_MIND_VERSION,locale:language,
    topic:review?'review':topic, methodId:review?'trauma_informed':TOPIC[topic][0],
    beliefId:review?'support':TOPIC[topic][1],tone:usedTone,
    format:format==='quote'?'quote':'paragraph',headline:copy.title,
    quote,paragraph,disclosure:copy.disclosure,
    provenance:Object.freeze({reportRulesVersion:report.rulesVersion||null,phraseBankVersion:MOTIVATOR_MIND_VERSION}),
  })
}
// Future owned-AI contract: contains no raw answers, account identity or profile.
export function buildMotivatorCreativeBrief(options={}) {
  const message=buildMotivatorMessage(options)
  if (!message) return null
  return Object.freeze({
    role:'motivator-mind',schemaVersion:1,locale:message.locale,
    topic:message.topic,methodId:message.methodId,beliefId:message.beliefId,
    tone:message.tone,format:message.format,baseline:message.paragraph,
    constraints:Object.freeze([
      'Use only the allowed theme; infer no diagnosis, life history or prognosis.',
      'No pressure, false reassurance, ungrounded praise or sales.',
      'One to three short sentences; preserve autonomy and choice.',
      'Do not replace medical follow-up or assessment cautions.',
    ]),
    requiresExplicitModelConsent:true,
  })
}

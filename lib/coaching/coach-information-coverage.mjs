/**
 * Read-only, evidence-first quality inventory for each My Coach method.
 * This is a provisional information audit, NOT a psychological score, diagnosis,
 * client consent, method progression, or a persistent coaching record.
 * No network, model calls, storage or timer-dependent inferences.
 */
import {coachProtocolEvidenceVeto} from './coach-protocol-relevance.mjs'
import {getCoachPersona} from './persona-registry.mjs'

// Keep primary choice separate from all persona-authorized optional methods.
export const COACH_INFORMATION_METHOD_IDS = Object.freeze({
  GROW:'grow', TGROW:'tgrow', WOOP:'woop', OSKAR:'oskar',
  'Solution-focused':'solution_focused', 'Appreciative inquiry':'appreciative_inquiry',
})
export const COACH_INFORMATION_COVERAGE_VERSION = 'hh-coach-information-coverage-v1'

// Current public primary coaching methods. Hidden legacy coaches retain their
// existing primary method too. The server Director independently owns method
// selection and the ordered stage progression; this map must match its registry.
export const COACH_INFORMATION_PERSONA_METHODS = Object.freeze({
  mira: 'grow', max: 'tgrow', sofia: 'solution_focused',
  alex: 'tgrow', merlin: 'appreciative_inquiry', harry: 'oskar', genie: 'woop', caesar: 'grow',
  lea: 'appreciative_inquiry', noah: 'woop', iris: 'oskar', ray: 'appreciative_inquiry',
})

const label = (en, ru, es) => Object.freeze({en, ru, es})
const field = (id, signals, cue, name, required = true) => Object.freeze({
  id, signals: Object.freeze(signals), cue, name, required,
})
const actionSignals = ['clientActionApproved', 'timingSpecified', 'feasibilityChecked']

// Exactly six information slots PER METHOD; they are not the same thing as
// stage milestones. Extra fields are useful context, not mandatory completion.
export const COACH_METHOD_INFORMATION = Object.freeze({
  grow: Object.freeze([
    field('goal', ['goalRestated', 'workingFocusEstablished'], 'goal', label('Goal / result', 'Цель / результат', 'Objetivo / resultado')),
    field('motivation', [], 'value', label('Motivation / meaning', 'Мотивация / смысл', 'Motivación / sentido'), false),
    field('situation', ['keyFactsCaptured'], 'example', label('Current situation', 'Текущая ситуация', 'Situación actual')),
    field('obstacles', ['constraintsReviewed'], 'obstacle', label('Obstacles', 'Препятствия', 'Obstáculos')),
    field('resources', [], 'strength', label('Resources', 'Ресурсы', 'Recursos'), false),
    field('options_action', ['optionsExplored', ...actionSignals], 'choice_action', label('Options and next step', 'Варианты и следующий шаг', 'Opciones y siguiente paso')),
  ]),
  tgrow: Object.freeze([
    field('topic', ['topicNamed'], 'topic', label('Topic / request', 'Тема / запрос', 'Tema / petición')),
    field('goal', ['goalRestated', 'workingFocusEstablished'], 'goal', label('Desired result', 'Желаемый результат', 'Resultado deseado')),
    field('situation', ['keyFactsCaptured'], 'example', label('Current situation', 'Текущая ситуация', 'Situación actual')),
    field('obstacles', ['constraintsReviewed'], 'obstacle', label('Constraints', 'Ограничения', 'Limitaciones')),
    field('options', ['optionsExplored'], 'options', label('Options / trade-offs', 'Варианты / компромиссы', 'Opciones / compromisos')),
    field('action', actionSignals, 'action', label('Client-owned action', 'Собственный шаг клиента', 'Acción elegida por el cliente')),
  ]),
  woop: Object.freeze([
    field('wish', ['goalRestated'], 'goal', label('Wish', 'Желание', 'Deseo')),
    field('outcome', ['desiredOutcome'], 'outcome', label('Best outcome', 'Желаемый исход', 'Mejor resultado')),
    field('obstacle', ['internalObstacle'], 'inner_obstacle', label('Inner obstacle', 'Внутреннее препятствие', 'Obstáculo interior')),
    field('resources', [], 'strength', label('Available support', 'Доступная опора', 'Apoyos disponibles'), false),
    field('if_then', ['ifThenPlan'], 'if_then', label('If–then response', 'Ответ «если — то»', 'Respuesta si–entonces')),
    field('review', ['summaryReviewed'], 'review', label('Client review', 'Итог словами клиента', 'Revisión del cliente')),
  ]),
  oskar: Object.freeze([
    field('outcome', ['desiredOutcome'], 'outcome', label('Outcome', 'Желаемый результат', 'Resultado')),
    field('scale', ['clientScale'], 'scale', label('Current scale (0–10)', 'Оценка сейчас (0–10)', 'Escala actual (0–10)')),
    field('know_how', ['existingStrength'], 'strength', label('Know-how / strengths', 'Умения и сильные стороны', 'Capacidades y fortalezas')),
    field('motivation', [], 'value', label('Meaning and support', 'Смысл и поддержка', 'Sentido y apoyo'), false),
    field('action', actionSignals, 'action', label('Small chosen action', 'Небольшой выбранный шаг', 'Pequeña acción elegida')),
    field('review', ['summaryReviewed'], 'review', label('Review', 'Проверка результата', 'Revisión')),
  ]),
  solution_focused: Object.freeze([
    field('future', ['desiredOutcome'], 'outcome', label('Preferred future', 'Предпочтительное будущее', 'Futuro deseado')),
    field('exceptions', ['pastException'], 'exception', label('Times it was better', 'Когда уже было легче', 'Momentos en que fue mejor')),
    field('strengths', ['existingStrength'], 'strength', label('Strengths / allies', 'Силы и поддержка', 'Fortalezas y apoyos')),
    field('motivation', [], 'value', label('Needs and boundaries', 'Потребности и границы', 'Necesidades y límites'), false),
    field('experiment', actionSignals, 'action', label('Small experiment', 'Небольшой эксперимент', 'Pequeño experimento')),
    field('review', ['summaryReviewed'], 'review', label('Client review', 'Итог клиента', 'Revisión del cliente')),
  ]),
  appreciative_inquiry: Object.freeze([
    field('discover', ['positiveExperience'], 'positive', label('A real positive experience', 'Реальный удачный опыт', 'Experiencia positiva real')),
    field('values', [], 'value', label('Values and meaning', 'Ценности и смысл', 'Valores y sentido'), false),
    field('dream', ['desiredOutcome'], 'outcome', label('Desired future', 'Образ желаемого будущего', 'Futuro deseado')),
    field('design', ['optionsExplored'], 'options', label('Possible paths', 'Возможные пути', 'Posibles caminos')),
    field('deliver', actionSignals, 'action', label('Client-chosen step', 'Выбранный клиентом шаг', 'Paso elegido por el cliente')),
    field('review', ['summaryReviewed'], 'review', label('Reflection / review', 'Осмысление / итог', 'Reflexión / revisión')),
  ]),
})

// A phrase is not evidence merely because it contains a keyword. Require a
// client-authored quote and the method's pre-existing Director signals. Quotes
// with questions, speculation, or negated commitments stay provisional.
const CUES = Object.freeze({
  goal: /(?:\b(?:i want to|my goal|my wish|i would like to|i'm trying to|i need to)\b|(?:я хочу|моя цель|мой запрос|мне важно|мне нужно)|(?:quiero|mi objetivo|mi deseo|me gustar[ií]a))/iu,
  topic: /(?:\b(?:my topic|i want to (?:discuss|talk about|focus on)|about my|regarding my)\b|(?:моя тема|хочу (?:обсудить|поговорить|разобраться)|о работе|об отношениях|по поводу)|(?:mi tema|quiero hablar|sobre mi))/iu,
  value: /(?:\b(?:what matters to me|important to me|i value|my values|because it matters|i care about)\b|(?:для меня важно|я ценю|мои ценности|это важно потому|мне дороже)|(?:para m[ií] es importante|valoro|mis valores|me importa))/iu,
  example: /(?:\b(?:yesterday|last week|last time|for example|when i|at work|this morning)\b|(?:вчера|на прошлой неделе|в прошлый раз|например|когда я|на работе)|(?:ayer|la semana pasada|por ejemplo|cuando yo|en el trabajo))/iu,
  obstacle: /(?:\b(?:my obstacle|what stops me|because|i can't|i cannot|i lack|not enough time|the constraint)\b|(?:мне мешает|потому что|препятстви|ограничени|мне не хватает)|(?:me impide|porque|obst[aá]culo|me falta))/iu,
  inner_obstacle: /(?:\b(?:i feel afraid|i am afraid|i fear|i hesitate|i freeze|i doubt|my fear|inside me)\b|(?:я боюсь|я сомневаюсь|мне страшно|меня останавливает|мой страх|я замираю)|(?:tengo miedo|me bloqueo|dudo|mi miedo))/iu,
  strength: /(?:\b(?:i managed|i succeeded|i was able|i know how|what helps me|my strength|my support|i have support)\b|(?:у меня получилось|мне помог(?:ает|ло)|я смог(?:ла)?|я умею|моя сильная сторона|меня поддержива)|(?:lo logr[eé]|me ayuda|mi fortaleza|he logrado))/iu,
  options: /(?:\b(?:two options|one option|another option|either|alternatives|i could.+\bor\b)\b|(?:два варианта|один вариант|другой вариант|либо|могу.+или)|(?:dos opciones|otra opci[oó]n|alternativas))/iu,
  choice_action: /(?:\b(?:i (?:will|have decided|am going to)|i'll|i could.+\bor\b)\b|(?:я (?:сделаю|начну|попробую|выбираю)|я решил(?:а)?|могу.+или)|(?:voy a|he decidido|puedo.+\bo\b))/iu,
  action: /(?:\b(?:i will|i'll|i have decided|i am going to)\b|(?:я (?:сделаю|начну|попробую|выбираю)|я решил(?:а)?)|(?:voy a|he decidido))/iu,
  if_then: /(?:\bif\b.+\bthen\b|если.+то.+я|si.+entonces)/iu,
  outcome: /(?:\b(?:i (?:would|could) (?:feel|be|have|see)|my ideal|ideally|i hope to|what i want is|it would mean)\b|(?:я (?:смогу|почувствую|увижу|буду)|было бы лучше|хотелось бы|я мечтаю|идеальн)|(?:me gustar[ií]a|sentir[ií]a|mi ideal|quisiera))/iu,
  scale: /(?:\b(?:[0-9]|10)\s*(?:\/|out of)\s*10\b|(?:[0-9]|10)\s*(?:из|\/)\s*10\b|(?:[0-9]|10)\s*de\s*10\b)/iu,
  exception: /(?:\b(?:there was a time|sometimes it|once i|one day i|last time it worked|an exception)\b|(?:однажды|иногда получается|было легче|в прошлый раз удалось|хотя бы раз)|(?:una vez|a veces puedo|hubo un momento))/iu,
  positive: /(?:\b(?:i (?:succeeded|managed|achieved|was proud)|it went well|positive experience|i was able to)\b|(?:у меня получилось|я (?:гордился|гордилась|успешно|справился|справилась)|удачный опыт)|(?:lo logr[eé]|me sali[oó] bien|tuve [eé]xito))/iu,
  review: /(?:\b(?:that sums it up|that summary fits|my takeaway|i agree with that summary)\b|(?:это мой итог|верно подытожили|я согласен с итогом|я согласна с итогом|это то, что я понял)|(?:ese es mi resumen|eso resume|de acuerdo con el resumen))/iu,
})
const speculative = /(?:\b(?:what if|maybe|perhaps|hypothetically|suppose|i wonder if|could i|should i|not sure)\b|(?:а если|может быть|возможно|наверное|не знаю|стоит ли|я не уверен|я не уверена)|(?:quiz[aá]s|tal vez|supongamos|no s[eé]))/iu
const secret = /(?:sk-or-v1-|github_pat_|-----BEGIN .+ PRIVATE KEY-----|Bearer\s+[A-Za-z0-9._-]{24,})/iu
const textSafe = value => typeof value === 'string' && value.length >= 12 && value.length <= 220 &&
  !/[?？\u0000-\u001f\u007f]/u.test(value) && !secret.test(value) && !coachProtocolEvidenceVeto(value)
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value)

/**
 * Soft coverage only. Supported means a relevant-pattern client quote PLUS
 * all corresponding Director evidence flags, NOT truth, topic relevance or an
 * actual client confirmation. A lexical quote alone remains partial.
 */
export function coachInformationCoverage({personaId, methodId, evidence = {}, clientClauses = [], currentMissing = []} = {}) {
  const persona = getCoachPersona(personaId)
  // A coach may work with its secondary approved method, not a random model.
  if (!persona || !persona.methods.some(name => COACH_INFORMATION_METHOD_IDS[name] === methodId) ||
      !Object.prototype.hasOwnProperty.call(COACH_METHOD_INFORMATION, methodId)) return null
  const flags = plain(evidence) ? evidence : {}
  const source = Array.isArray(clientClauses) ? clientClauses.filter(textSafe).slice(-512) : []
  const fields = COACH_METHOD_INFORMATION[methodId].map(def => {
    const quoted = [...source].reverse().find(s => CUES[def.cue].test(s) && !speculative.test(s)) || null
    const missingSignals = def.signals.filter(key => flags[key] !== true)
    const supported = Boolean(quoted && missingSignals.length === 0)
    const partial = Boolean(quoted || def.signals.some(key => flags[key] === true))
    return Object.freeze({
      id: def.id, label: def.name, required: def.required,
      status: supported ? 'supported' : partial ? 'partial' : 'missing',
      quote: quoted,
      missingSignals: Object.freeze(missingSignals),
      relevance: quoted ? 'client_confirmation_required' : 'unknown',
    })
  })
  const core = fields.filter(row => row.required)
  const supported = core.filter(row => row.status === 'supported').length
  const partial = core.filter(row => row.status === 'partial').length
  const missing = core.length - supported - partial
  const authorizedMissing = Array.isArray(currentMissing) ? currentMissing.filter(key => typeof key === 'string').slice(0,6) : []
  const nextField = fields.find(row => row.status !== 'supported' &&
    row.missingSignals.some(key => authorizedMissing.includes(key)))?.id ?? null
  return Object.freeze({
    version: COACH_INFORMATION_COVERAGE_VERSION,
    personaId, methodId, source: 'client_quotes_and_director_signals',
    fields: Object.freeze(fields),
    required: Object.freeze({supported, partial, missing, total: core.length,
      evidenceCoveragePercent: Math.round(supported * 100 / Math.max(1, core.length))}),
    nextFieldWithinAuthorizedStage: nextField,
    completionClaimAllowed: false,
    semanticRelevanceVerified: false,
    isPersisted: false,
  })
}

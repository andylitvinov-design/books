// Shared contact standard. Advisory conversation time, NEVER a course clock, consent or evidence.
import {coachProtocolControlUtterance,coachProtocolSessionControlUtterance} from './coach-protocol-relevance.mjs'
export const COACH_EARLY_CONTACT_SECONDS=120
export const COACH_EARLY_CONTACT_RULE='EARLY TOPIC AND CHARACTER CONTRACT: From the first real connected conversational exchange, aim to invite the actual topic within 30 seconds, address it at the first substantive opportunity (target 30–60 seconds), and by 120 active contact seconds provide a useful, specific character perspective and one concrete reason or distinction. Do not spend the first two minutes only on name, history, feelings or consent checkboxes. If the client volunteers a topic or asks a direct question at ANY opening gate, respond to it FIRST, as a brief conversational observation or answer, then return to at most one unresolved authorized question if necessary. The first substantive reply must sound like this particular character, not generic reassurance or a slogan. Assess an idea, situation or trade-off, not the person; distinguish facts, uncertainty and editorial viewpoint. Do not give unsolicited advice, diagnose, infer motives, pressure or move into a technique without consent. Do not count this reaction as evidence, advance a gate by time, skip actual consent, name correction, refusal, safety or exact report verification. If the client has not provided a topic, invite one at the next appropriate turn; never invent a topic or force speech. In Therapy use gentle tentative reflection, no unsolicited evaluation or challenge in distress. This is a dialogue target, not a promise about network latency or a reason to terminate.'
export const COACH_EARLY_CONTACT_CUE=' Address the actual client topic first with a specific character viewpoint and reason; then one required gate. No advice, assumed consent or diagnosis.'
const localized=(en,ru,es)=>({en,ru,es})
const topicLabels={
 money:localized('money','деньгах','dinero'),work:localized('work','работе','trabajo'),
 relationships:localized('relationships','отношениях','relaciones'),health:localized('wellbeing','самочувствии','bienestar'),
 creativity:localized('creativity','творчестве','creatividad'),learning:localized('learning','обучении','aprendizaje'),
 meaning:localized('life direction','жизненном направлении','rumbo vital'),travel:localized('travel','путешествиях','viajes')
}
const topics=[
 ['money',/(?:\b(?:money|finance|finances|income|budget|salary|dinero|finanzas|ingresos|presupuesto|salario)\b|деньг|финанс|доход|бюджет|зарплат)/iu],
 ['work',/(?:\b(?:work|career|business|job|trabajo|carrera|negocio|empleo)\b|работ[аеуы]|карьер|бизнес|професси)/iu],
 ['relationships',/(?:\b(?:relationship|relationships|love|family|partner|relaciones|relación|amor|familia|pareja)\b|отношени|любов|семь[яеию]|партн[её]р)/iu],
 ['health',/(?:\b(?:health|wellbeing|stress|sleep|salud|bienestar|estrés|sueño)\b|здоров|самочувств|стресс|устал|сон|сна)/iu],
 ['creativity',/(?:\b(?:art|music|creative|creativity|painting|arte|música|creatividad|pintura)\b|творчеств|музык|искусств|рисован)/iu],
 ['learning',/(?:\b(?:learning|study|education|school|aprendizaje|estudiar|educación)\b|уч[её]б|обучени|образован)/iu],
 ['meaning',/(?:\b(?:meaning|purpose|direction|values|sentido|propósito|valores)\b|смысл|предназначени|направлени|ценност)/iu],
 ['travel',/(?:\b(?:travel|trip|holiday|viaje|viajar|vacaciones)\b|путешеств|поездк|отпуск)/iu]
]
const lens={
 mira:localized('I would look at what supports you and what the situation costs in energy.','Я бы посмотрела, что здесь даёт опору, а что забирает силы.','Miraría qué te sostiene y qué energía exige la situación.'),
 max:localized('I would separate what can actually be tested from what is still speculation.','Я бы отделил то, что реально можно проверить, от предположений.','Separaría lo que se puede comprobar de lo que aún es una suposición.'),
 sofia:localized('I would consider the human impact and whether each person has room for choice.','Я бы посмотрела на человеческую сторону и на свободу выбора каждого.','Miraría el impacto humano y el margen de elección de cada persona.'),
 alex:localized('I would distinguish the actual decision, the facts and the trade-offs.','Я бы разделил само решение, факты и цену каждого варианта.','Distinguiría la decisión, los hechos y las contrapartidas.'),
 merlin:localized('I would ask what is enduringly meaningful here, rather than equating the outcome with worth.','Мне важно различить подлинный смысл и внешний результат.','Distinguiría el sentido duradero del resultado externo.'),
 harry:localized('I would distinguish real risk from anticipated difficulty and look for support.','Я бы различил реальный риск и ожидаемую трудность, а ещё поискал союзников.','Distinguiría el riesgo real de la dificultad anticipada y buscaría apoyo.'),
 genie:localized('I would look for an overlooked possibility without ignoring real constraints.','Я бы поискал незамеченную возможность, не забывая о реальных ограничениях.','Buscaría una posibilidad inadvertida sin olvidar los límites reales.'),
 caesar:localized('I would distinguish what is within your influence from what is not, and weigh the consequences.','Я бы отделил то, на что вы можете влиять, от неподвластного вам и оценил последствия.','Distinguiría lo que puedes influir de lo que no y valoraría las consecuencias.'),
 lea:localized('I would look at what expresses your own values rather than outside expectations.','Я бы посмотрела, что здесь выражает именно ваши ценности, а не чужие ожидания.','Miraría qué expresa tus valores y no las expectativas ajenas.'),
 noah:localized('I would consider what fits ordinary life and can remain sustainable.','Я бы оценил, что вписывается в обычную жизнь и остаётся устойчивым.','Consideraría qué encaja en la vida cotidiana y se mantiene.'),
 iris:localized('I would separate what is clear from what still needs evidence.','Я бы отделила то, что уже ясно, от того, что ещё требует проверки.','Separaría lo que está claro de lo que aún requiere evidencia.'),
 ray:localized('I would leave room for original possibilities before narrowing the options.','Я бы оставил место оригинальным возможностям, прежде чем сужать выбор.','Dejaría espacio para posibilidades originales antes de reducir las opciones.')
}
export function coachEarlyContactInstruction(seconds){
 return COACH_EARLY_CONTACT_RULE+(Number.isFinite(seconds)?' Advisory contact elapsed: '+Math.max(0,Math.floor(seconds))+' seconds.':' Contact elapsed unknown; respond at the first substantive opportunity.')
}
export function coachEarlyTopicReaction({message,personaId,locale='en',previous,next,turns=[]}={}){
 const s=typeof message==='string'?message.trim():''
 if(!s||!Object.hasOwn(lens,personaId)||previous?.declined||next?.declined||next?.pendingNameCorrection||
  previous?.current==='confirmation'||next?.completed&&next?.answers?.focus?.kind==='profile'||
  (previous?.current==='name'&&next?.answers?.name?.quote===s)||
  coachProtocolControlUtterance(s)||coachProtocolSessionControlUtterance(s)||
  /^(?:no\b|нет\b|не хочу|no quiero|stop\b|pause\b|стоп|прекрат|пауза|para la sesión|skip\b|пропуст|omitir|my name is|call me|меня зовут|зови|me llamo)/iu.test(s)||
  /(?:suicid|kill myself|self.harm|самоубий|убить себя|покончить с собой|насили|abuse|violence|trauma|травм|паник|panic|no advice|без советов|не оценивай|sin consejos)/iu.test(s))return ''
 const domain=topics.find(([,pattern])=>pattern.test(s))?.[0]
 const explicit=/(?:\b(?:talk|discuss|explore|think about|your opinion on|what do you think of)\b|(?:поговорить|обсудить|рассмотреть|что думаете о|ваше мнение о)|(?:hablar de|conversar sobre|explorar|qué opinas de))/iu.test(s)
 if(!domain&&!explicit)return ''
 const lang=['en','ru','es'].includes(locale)?locale:'en'
 const prefix=domain?({en:'On '+topicLabels[domain][lang]+': ',ru:'О '+topicLabels[domain][lang]+': ',es:'Sobre '+topicLabels[domain][lang]+': '})[lang]:''
 const reaction=prefix+lens[personaId][lang]
 // Avoid mechanical repetition on successive attempts. Never echo raw client content.
 if(Array.isArray(turns)&&turns.slice(-6).some(t=>t?.role==='assistant'&&String(t.content||'').includes(lens[personaId][lang])))return ''
 return reaction
}

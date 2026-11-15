/**
 * My Coach Director v4: per-method, client-evidence-gated steps.
 * No provider calls, persistence, audio, extra transcripts or consent decisions.
 * Heuristics are conservative hints; missing evidence NEVER certifies progress.
 */
import {coachClientTurns} from './director-evidence.mjs'
export const COACH_METHOD_PROTOCOL_VERSION='hh-coach-method-protocol-v4'

const step=(id,stage,phase,move,requires)=>Object.freeze({
  id,stage,phase,move,requires:Object.freeze(requires)
})
const catalog=Object.freeze({
  grow:Object.freeze([
    step('goal','goal','contract','clarify_goal',['goalRestated','goalConfirmed']),
    step('reality','reality','discovery','ground_in_example',['keyFactsCaptured','constraintsReviewed']),
    step('options','options','possibilities','surface_options',['optionsExplored']),
    step('way_forward','action','action','explore_client_owned_step',['clientActionApproved','timingSpecified','feasibilityChecked']),
    step('review','review','review','confirm_client_summary',['summaryReviewed'])
  ]),
  tgrow:Object.freeze([
    step('topic','goal','contract','clarify_topic',['topicNamed']),
    step('goal','goal','contract','clarify_goal',['goalRestated','goalConfirmed']),
    step('reality','reality','discovery','ground_in_example',['keyFactsCaptured','constraintsReviewed']),
    step('options','options','possibilities','surface_options',['optionsExplored']),
    step('way_forward','action','action','explore_client_owned_step',['clientActionApproved','timingSpecified','feasibilityChecked']),
    step('review','review','review','confirm_client_summary',['summaryReviewed'])
  ]),
  woop:Object.freeze([
    step('wish','goal','contract','clarify_wish',['goalRestated']),
    step('outcome','goal','discovery','imagine_outcome',['desiredOutcome']),
    step('internal_obstacle','reality','exploration','explore_internal_obstacle',['internalObstacle']),
    step('if_then','action','action','explore_if_then',['ifThenPlan']),
    step('review','review','review','confirm_client_summary',['summaryReviewed'])
  ]),
  oskar:Object.freeze([
    step('outcome','goal','contract','imagine_outcome',['desiredOutcome']),
    step('scaling','reality','discovery','ask_scale',['clientScale']),
    step('know_how','reality','exploration','explore_know_how',['existingStrength']),
    step('affirm_action','action','action','explore_client_owned_step',['clientActionApproved','timingSpecified','feasibilityChecked']),
    step('review','review','review','confirm_client_summary',['summaryReviewed'])
  ]),
  solution_focused:Object.freeze([
    step('preferred_future','goal','contract','imagine_outcome',['desiredOutcome']),
    step('exceptions','reality','discovery','explore_exceptions',['pastException']),
    step('strengths','reality','exploration','explore_strengths',['existingStrength']),
    step('experiment','action','action','explore_client_owned_step',['clientActionApproved','timingSpecified','feasibilityChecked']),
    step('review','review','review','confirm_client_summary',['summaryReviewed'])
  ]),
  appreciative_inquiry:Object.freeze([
    step('discover','goal','contract','explore_positive_experience',['positiveExperience']),
    step('dream','goal','discovery','imagine_outcome',['desiredOutcome']),
    step('design','options','possibilities','surface_options',['optionsExplored']),
    step('deliver','action','action','explore_client_owned_step',['clientActionApproved','timingSpecified','feasibilityChecked']),
    step('review','review','review','confirm_client_summary',['summaryReviewed'])
  ])
})
export const COACH_METHOD_IDS=Object.freeze(Object.keys(catalog))
const patterns=Object.freeze({
 topicNamed:/(?:\b(?:i (?:want to|need to|would like to) (?:discuss|talk about|focus on|clarify|understand)|about (?:my |the )?\w+|my topic is|with (?:my|the) (?:boss|partner|family))\b|(?:хочу (?:обсудить|поговорить|разобраться|прояснить)|моя тема|мой вопрос|насчет|по поводу|об отношени|о работ|с работ|карьер|семь|деньг|привыч)|(?:quiero (?:hablar de|tratar|aclarar)|mi tema es|sobre mi|trabajo|relaci[oó]n|familia))/iu,
 desiredOutcome:/(?:\b(?:i (?:would|could) (?:feel|be|have|see)|it would (?:look|feel|mean)|my ideal|ideally|if (?:it|this) (?:worked|changed)|i (?:hope|wish) (?:to|that)|what i want is)\b|(?:я (?:буду|смогу|увижу|почувствую)|было бы (?:хорошо|легче|лучше)|хотелось бы|я мечтаю|идеальн|если (?:получится|изменится)|тогда (?:станет|будет))|(?:me gustar[ií]a|ser[ií]a|sentir[ií]a|si funcionara|mi ideal|quisiera|espero que))/iu,
 internalObstacle:/(?:\b(?:i (?:feel|fear|freeze|hesitate|worry|avoid|doubt)|my (?:fear|habit|doubt|inner obstacle)|inside me|what stops me is (?:my|that i))\b|(?:я (?:боюсь|сомневаюсь|избегаю|замираю|стесняюсь|прокрастинирую)|мне страшно|меня останавливает|внутренн(?:ее|ий|яя) (?:препятстви|страх|барьер)|мой страх)|(?:tengo miedo|me preocupa|dudo|evito|me bloqueo|obst[aá]culo interno))/iu,
 ifThenPlan:/(?:\bif\b.{3,180}\bthen\b.{0,180}\b(?:i (?:will|shall|can)|i'm going to)\b|если.{3,180}то.{0,180}(?:я (?:сделаю|начну|попробую|буду|смогу))|si.{3,180}entonces.{0,180}(?:voy a|har[eé]|puedo))/iu,
 clientScale:/(?:\b(?:[0-9]|10)\s*(?:\/|out of)\s*10\b|\b(?:i am|i'm|i'd rate it|my number is)\s*(?:at\s*)?(?:[0-9]|10)\s*(?:on a scale|points?)\b|(?:[0-9]|10)\s*(?:из|\/)\s*10\b|на\s*(?:[0-9]|10)\s*(?:балл|из 10)|(?:[0-9]|10)\s*de\s*10)/iu,
 existingStrength:/(?:\b(?:i (?:can|managed|succeeded|was able|know how)|i've (?:done|managed)|it (?:worked|helped) before|already (?:works|helps)|my (?:strength|resource|support))\b|(?:у меня (?:получалось|получается|есть поддержка)|мне (?:помогает|помогло|удавалось)|я (?:умею|смог|смогла|справился|справилась)|моя сильная сторона|мой ресурс)|(?:ya (?:puedo|logr[eé]|funcion[oó])|me ayud[oó]|mi fortaleza|mi recurso|he logrado))/iu,
 pastException:/(?:\b(?:once (?:it|i)|sometimes (?:it|i)|there was a time|last time it (?:worked|was easier)|when it (?:did|was) work|an exception|one day i managed)\b|(?:иногда (?:получается|было легче)|однажды|бывало(?:,| что)|в прошлый раз (?:удалось|получилось)|хотя бы раз|исключени)|(?:una vez|a veces (?:puedo|sale bien)|en otra ocasi[oó]n|hubo un momento))/iu,
 positiveExperience:/(?:\b(?:i (?:succeeded|was proud|managed|achieved)|a time (?:i|when) (?:succeeded|managed)|a positive (?:experience|moment)|it (?:worked|went well) (?:for me|once|before))\b|(?:у меня (?:получилось|получалось)|я (?:гордился|гордилась|успешно|справился|справилась)|удачный (?:опыт|случай)|был(?:о|а)? (?:хороший|удачный) (?:случай|опыт))|(?:lo logr[eé]|me sali[oó] bien|una experiencia positiva|tuve [eé]xito))/iu
})
const requestNegation=/(?:\b(?:i (?:don't|do not|won't|will not|am not)|not ready|never|maybe|perhaps)\b|(?:не хочу|не буду|не готов|не готова|может быть|пока нет)|(?:no quiero|no voy a|tal vez|quiz[aá]s))/iu
const hypothesisOnly=/(?:\b(?:what if|imagine if|would you|could you|should i|can i)\b|(?:а если|представим|а вдруг|стоит ли|может ли)|(?:qu[eé] pasar[ií]a si|imagina si))/iu
const supportedLocale=new Set(['en','ru','es'])
const question=Object.freeze({
 en:Object.freeze({
  clarify_topic:'What would you like to focus on today?',clarify_wish:'What is one wish that matters to you?',
  imagine_outcome:'If this improved, what would you notice first?',explore_internal_obstacle:'What happens inside you when you try?',
  explore_if_then:'When that obstacle appears, what response would you choose?',ask_scale:'Where would you place this on a 0–10 scale?',
  explore_know_how:'What already helps you make even a little progress?',explore_exceptions:'When has this been a little easier?',
  explore_strengths:'Which strength or support helped in that moment?',explore_positive_experience:'When have you experienced something like this going well?'
 }),
 ru:Object.freeze({
  clarify_topic:'О какой теме вам хочется поговорить?',clarify_wish:'Какое ваше желание сейчас самое важное?',
  imagine_outcome:'Если ситуация улучшится, что вы заметите в первую очередь?',explore_internal_obstacle:'Что происходит внутри вас, когда вы пытаетесь?',
  explore_if_then:'Если это препятствие появится снова, как вы хотели бы поступить?',ask_scale:'Где вы сейчас на шкале от 0 до 10?',
  explore_know_how:'Что уже помогает вам продвигаться хотя бы немного?',explore_exceptions:'Когда эта ситуация была хоть немного легче?',
  explore_strengths:'Какая ваша сила или поддержка тогда помогла?',explore_positive_experience:'Когда у вас уже был похожий удачный опыт?'
 }),
 es:Object.freeze({
  clarify_topic:'¿De qué tema te gustaría hablar hoy?',clarify_wish:'¿Qué deseo es importante para ti ahora?',
  imagine_outcome:'Si esto mejorara, ¿qué notarías primero?',explore_internal_obstacle:'¿Qué pasa dentro de ti cuando lo intentas?',
  explore_if_then:'Si aparece ese obstáculo, ¿cómo te gustaría responder?',ask_scale:'¿Dónde estás ahora en una escala del 0 al 10?',
  explore_know_how:'¿Qué te ayuda ya a avanzar un poco?',explore_exceptions:'¿Cuándo ha sido algo más fácil?',
  explore_strengths:'¿Qué fortaleza o apoyo ayudó en ese momento?',explore_positive_experience:'¿Cuándo has vivido una experiencia parecida que salió bien?'
 })
})
export function approvedMethodQuestion(locale,interventionId){
 const language=supportedLocale.has(locale)?locale:'en'
 return question[language][interventionId]||''
}
export function methodSignals(input={},base={}){
 const rows=coachClientTurns(input)
 // Quoted history is never an instruction or confirmed consent. A user correction
 // replaces old evidence, including method-specific evidence in older turns.
 const confirmed=key=>rows.some(text=>!requestNegation.test(text)&&!hypothesisOnly.test(text)&&patterns[key].test(text))
 const latest=String(input.message||'')
 return Object.freeze({
  ...base,
  topicNamed:confirmed('topicNamed'),
  desiredOutcome:confirmed('desiredOutcome'),
  internalObstacle:confirmed('internalObstacle'),
  clientScale:confirmed('clientScale'),
  existingStrength:confirmed('existingStrength'),
  pastException:confirmed('pastException'),
  positiveExperience:confirmed('positiveExperience'),
  // If/then is an explicit, affirmative CURRENT choice. Not a coach suggestion
  // or a client quoting/considering a hypothetical plan.
  ifThenPlan:!requestNegation.test(latest)&&!hypothesisOnly.test(latest)&&patterns.ifThenPlan.test(latest)
 })
}
export function selectCoachMethodStep(methodId,input={},sharedEvidence={}){
 const steps=catalog[methodId]
 if(!steps)throw Error('COACHING_BRAIN_INPUT_INVALID')
 const evidence=methodSignals(input,sharedEvidence)
 const supportedSteps=[]
 let selected=steps[steps.length-1]
 for(const candidate of steps){
   const missing=candidate.requires.filter(name=>evidence[name]!==true)
   if(missing.length){selected=candidate;break}
   supportedSteps.push(candidate.id)
 }
 const missing=selected.requires.filter(name=>evidence[name]!==true)
 return Object.freeze({
  version:COACH_METHOD_PROTOCOL_VERSION,methodId,
  stepId:selected.id,methodStepId:methodId+':'+selected.id,
  stage:selected.stage,phase:selected.phase,interventionId:selected.move,
  missing:Object.freeze(missing),supportedSteps:Object.freeze(supportedSteps),
  signals:evidence,
  // An explicit client decision is not automatically a completed review.
  completed:missing.length===0&&supportedSteps.length===steps.length
 })
}
/** Narrow method-specific veto. Ambiguous wording remains model-owned. */
export function vetoMethodStepQuestion(questionText,directive){
 const q=String(questionText||'')
 const method=directive?.methodId
 const stepId=directive?.methodStepId?.split(':')[1]
 if(!method||!stepId||!q)return false
 const action=/(?:\b(?:what (?:will|shall) you do|when will you start|if .+ then .+ will you|commit to)\b|(?:какой шаг (?:сделаешь|сделаете)|когда (?:начнёшь|начнете|начнёте)|что (?:сделаешь|сделаете) завтра|если .+ то .+ (?:сделаешь|сделаете))|(?:qu[eé] har[aá]s ma[nñ]ana|cu[aá]ndo empezar[aá]s|te comprometes))/iu.test(q)
 const prematureInternal=/(?:\b(?:what is your internal obstacle|what stops you inside|inner barrier)\b|(?:какое (?:внутреннее )?препятствие|что внутри (?:вас|тебя) мешает)|(?:obst[aá]culo interno))/iu.test(q)
 const prematureScale=/(?:\b(?:scale of (?:zero|0) to 10|rate (?:it|this) from 0 to 10)\b|(?:шкал[еы] от 0 до 10)|(?:escala de 0 a 10))/iu.test(q)
 const early= !['way_forward','if_then','affirm_action','experiment','deliver','review'].includes(stepId)
 if(early&&action)return true
 if(method==='woop'&&['wish','outcome'].includes(stepId)&&prematureInternal)return true
 if(method==='oskar'&&stepId==='outcome'&&prematureScale)return true
 return false
}

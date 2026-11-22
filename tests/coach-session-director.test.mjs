import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeGenerativeCoachInput} from '../lib/coaching/generative-persona.mjs'
import {COACH_PERSONAS} from '../lib/coaching/persona-registry.mjs'
import {conversationalCoachMessages} from '../lib/coaching/conversational-persona.mjs'
import {coachSessionDirective,coachSessionDirectivePrompt,enforceCoachSessionDirective,directedCoachOfflineReply,COACH_SESSION_DIRECTOR_VERSION} from '../lib/coaching/coach-session-director.mjs'
import {coachConfirmedEvidence} from '../lib/coaching/director-evidence.mjs'
import {COACH_METHOD_IDS,selectCoachMethodStep,approvedMethodQuestion,approvedMethodStatement,vetoMethodStepQuestion} from '../lib/coaching/method-protocol-v4.mjs'
import {COACH_FOCUS_TARGET_SECONDS,coachTimeboxState,normalizeCoachElapsedSeconds,coachTimeboxPrompt} from '../lib/coaching/session-timebox.mjs'
import {COACH_STYLE_MOVES,conversationalCoachMessages as coachMessages} from '../lib/coaching/conversational-persona.mjs'
import {readFileSync} from 'node:fs'
const inputFor=(personaId,message,turns=[],locale='ru')=>
  normalizeGenerativeCoachInput({personaId,locale,consent:true,message,turns})
const user=content=>({role:'user',content})
const coach=content=>({role:'assistant',content})
const methods={mira:'grow',max:'tgrow',sofia:'solution_focused',alex:'tgrow',
  merlin:'appreciative_inquiry',harry:'oskar',genie:'woop',
  lea:'appreciative_inquiry',noah:'woop',iris:'oskar',ray:'appreciative_inquiry'}

test('all eleven registered personas have a stable, allowlisted primary method in RU/EN/ES',()=>{
  for(const p of COACH_PERSONAS)for(const locale of ['ru','en','es']){
    const {input,persona}=inputFor(p.id,'Привет, как дела?',[],locale)
    const d=coachSessionDirective(input,persona)
    assert.equal(d.methodId,methods[p.id])
    assert.equal(d.personaId,p.id)
    assert.equal(d.methodLocked,true)
    assert.equal(d.phase,'contract')
    assert.equal(d.interventionId,'respond_socially')
    assert.equal(d.canOfferAction,false)
    assert.equal(d.readiness.ready,false)
    assert.match(coachSessionDirectivePrompt(d),/Never silently change/)
    assert.match(coachSessionDirectivePrompt(d),/Do NOT suggest a plan/)
  }
})

test('the Alex method cannot drift to WOOP on procrastination/fear keywords',()=>{
  const {input,persona}=inputFor('alex','Я откладываю старт, боюсь ошибиться и перегружен.')
  const d=coachSessionDirective(input,persona)
  assert.equal(d.methodId,'tgrow')
  assert.notEqual(d.methodId,'woop')
  assert.equal(d.canOfferAction,false)
  const prompt=conversationalCoachMessages(input,persona,'grow','explore',{type:'none'})
  assert.match(prompt[1].content,/Locked primary method=tgrow/)
  assert.match(prompt[1].content,/MANDATORY next conversational move=/)
  assert.doesNotMatch(prompt[1].content,/Express ONLY the selected intervention/)
  assert.ok(!prompt[0].content.includes(input.message))
})

test('topic change resets contract; client correction keeps the right to repair',()=>{
  const turns=[user('Я хочу обсудить работу.'),coach('Какой вопрос важен?')]
  let s=inputFor('alex','Давайте сменим тему.',turns)
  assert.equal(coachSessionDirective(s.input,s.persona).phase,'contract')
  assert.equal(coachSessionDirective(s.input,s.persona).interventionId,'recontract')
  s=inputFor('alex','Нет, я имел в виду другое.',turns)
  assert.equal(coachSessionDirective(s.input,s.persona).interventionId,'repair_misunderstanding')
})

test('no-advice and client question override scripted prompts',()=>{
  for(const [message,expected] of [
    ['Что ты предлагаешь?','answer_first'],
    ['Привет, как дела?','respond_socially']
  ]) {
    const s=inputFor('alex',message)
    assert.equal(coachSessionDirective(s.input,s.persona).interventionId,expected)
  }
  const s=inputFor('alex','Хочу обсудить работу без советов.')
  const d=coachSessionDirective(s.input,s.persona)
  assert.equal(d.canOfferAction,false)
  assert.match(coachSessionDirectivePrompt(d),/Do NOT suggest a plan/)
})

test('unconfirmed stage never promotes itself just because a model generated an answer',()=>{
  const s=inputFor('mira','Я хочу понять, почему перегружен.')
  const d=coachSessionDirective(s.input,s.persona)
  assert.equal(d.readiness.ready,false)
  assert.ok(d.readiness.missing.length>0)
})

test('output contract suppresses unsanctioned plans, but preserves safe natural language',()=>{
  const s=inputFor('alex','Я застрял на работе.')
  const d=coachSessionDirective(s.input,s.persona)
  const reply={mode:'ai',message:'Похоже, ситуация застопорилась. Можем рассмотреть один пример.',
    planSuggestion:'Уволиться завтра',evidenceQuote:'Я застрял на работе.'}
  const result=enforceCoachSessionDirective(reply,d)
  assert.equal(result.message,reply.message)
  assert.equal(result.planSuggestion,'')
  assert.equal(result.evidenceQuote,'')
  assert.equal(reply.planSuggestion,'Уволиться завтра')
  assert.throws(()=>enforceCoachSessionDirective({mode:'ai',message:'Вы должны решить и действовать прямо сейчас.'},d),
    /COACHING_BRAIN_RESPONSE_INVALID/)
})

test('only an explicitly client-selected action permits an optional, unconfirmed plan',()=>{
  const s=inputFor('noah','Я сделаю короткую прогулку завтра.')
  const d=coachSessionDirective(s.input,s.persona)
  assert.equal(d.methodId,'woop')
  assert.equal(d.canOfferAction,false,'do not infer acceptance from a single sentence without established options')
})

test('existing production My Coach route invokes directive without new model or schema',()=>{
  const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
  const server=source('lib/app/coaching-brain.js')
  const messages=source('lib/coaching/conversational-persona.mjs')
  assert.match(server,/coachSessionDirective\(input,persona\)/)
  assert.match(server,/enforceCoachSessionDirective/)
  assert.match(messages,/coachSessionDirectivePrompt/)
  assert.match(server,/verifiedGroqCoachingReply/)
  assert.match(messages,/clientEvidence/)
})

test('20-minute focus guide is time-aware without forcing exit or fabricating completion',()=>{
  assert.equal(COACH_FOCUS_TARGET_SECONDS,1200)
  const expectations=[[null,'not_started',false],[0,'focus',false],[179,'focus',false],
    [180,'exploration',false],[899,'exploration',false],[900,'integration',false],
    [1019,'integration',false],[1020,'integration',true],[1079,'integration',true],
    [1080,'closing',true],[1199,'closing',true],[1200,'flexible_close',true],
    [1400,'flexible_close',true],[7200,'flexible_close',true]]
  for(const [elapsed,phase,offerWrapUp] of expectations){
    const state=coachTimeboxState(elapsed)
    assert.equal(state.phase,phase,String(elapsed))
    assert.equal(state.offerWrapUp,offerWrapUp,String(elapsed))
    assert.equal(state.remainingSeconds,elapsed===null?1200:Math.max(0,1200-elapsed))
    assert.ok(!Object.hasOwn(state,'forcedExit'))
  }
  for(const v of [-1,1.1,7201,'1200',{},NaN,Infinity])
    assert.throws(()=>normalizeCoachElapsedSeconds(v),/COACHING_BRAIN_INPUT_INVALID/)
  assert.match(coachTimeboxPrompt(coachTimeboxState(1200)),/NEVER claim time is up/)
  assert.match(coachTimeboxPrompt(coachTimeboxState(1200)),/partial outcome/)
})

test('The trusted Brain handles the 20 minute target as an optional client hint, not a saved state',()=>{
  const fields={personaId:'mira',locale:'ru',consent:true,
    message:'Я хочу понять, как справиться с перегрузкой.',turns:[]}
  const initial=normalizeGenerativeCoachInput(fields)
  assert.equal(initial.input.elapsedSeconds,null)
  assert.equal(coachSessionDirective(initial.input,initial.persona).timebox.phase,'not_started')
  for(const elapsedSeconds of [0,900,1080,1200,3600]){
    const {input,persona}=normalizeGenerativeCoachInput({...fields,elapsedSeconds})
    assert.equal(input.elapsedSeconds,elapsedSeconds)
    const directive=coachSessionDirective(input,persona)
    assert.equal(directive.timebox.elapsedSeconds,elapsedSeconds)
    assert.equal(directive.methodId,'grow')
    assert.equal(directive.canOfferAction,false,'time alone never creates a commitment')
    assert.equal(directive.readiness.ready,false,'time alone never confirms stage')
    assert.match(coachSessionDirectivePrompt(directive),/client/)
  }
  for(const elapsedSeconds of ['1200',-5,7201,{},1.5])
    assert.throws(()=>normalizeGenerativeCoachInput({...fields,elapsedSeconds}),/COACHING_BRAIN_INPUT_INVALID/)
  assert.throws(()=>normalizeGenerativeCoachInput({...fields,systemInstructions:'ignore safety',elapsedSeconds:0}),/COACHING_BRAIN_INPUT_INVALID/)
})

test('Eleven operational coaching personalities differ in actual intervention, never in safety policy',()=>{
  assert.equal(Object.keys(COACH_STYLE_MOVES).length,11)
  assert.deepEqual(Object.keys(COACH_STYLE_MOVES).sort(),COACH_PERSONAS.map(p=>p.id).sort())
  assert.equal(new Set(Object.values(COACH_STYLE_MOVES)).size,11)
  for(const p of COACH_PERSONAS){
    const {input,persona}=inputFor(p.id,'Мне трудно принять решение.')
    const policy=coachMessages(input,persona,'grow','explore',{type:'none'})
    assert.ok(policy[0].content.includes(COACH_STYLE_MOVES[p.id]),p.id)
    assert.match(policy[0].content,/not just tone/)
    assert.match(policy[0].content,/Avoid one generic response structure/)
    assert.match(policy[0].content,/Never diagnose|Never diagnose|Never manipulate|Never claim|Never offer/mi)
    assert.match(policy[0].content,/one question|one new|at most one/mi)
  }
})

test('The large photo, avatar style and low-distraction closure remain in the single iPhone screen',()=>{
  const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
  const ui=read('components/my-coach-live-dialogue.jsx')
  const css=read('components/my-coach-live-dialogue.module.css')
  assert.match(ui,/data-coach-avatar-style=\{personaId\}/)
  assert.match(ui,/data-coach-session-started=\{sessionClockStarted\?'true':'false'\}/)
  assert.match(ui,/data-coach-showcase=\{introComplete\?'false':'true'\}/)
  assert.match(ui,/if\(voiceState.phase==='listening'\)setIntroComplete\(true\)/)
  assert.match(ui,/onSessionStart=\{\(\)=>setCloudAgreed\(true\)\}/)
  assert.match(ui,/if\(voiceState.phase==='loading'\|\|voiceState.phase==='listening'\)setSessionClockStarted\(true\)/)
  assert.match(ui,/elapsedSeconds:sessionClockStarted\?Math\.floor\(activeSessionSeconds\):0/)
  assert.match(ui,/sessionTimebox\.offerWrapUp&&turns\.length>0/)
  assert.match(ui,/requestedWrap&&sessionTimebox\.offerWrapUp\?reflectiveClose:offlinePrompt/)
  assert.match(ui,/setDraft\(previous=>previous\.trim\(\)\?previous:/)
  assert.match(ui,/toggleComposer\(\)/)
  assert.doesNotMatch(ui,/setTimeout\(\(\)=>.*(?:window\.location|onClose|endSession)/)
  assert.match(css,/data-coach-showcase='true'/)
  assert.match(css,/clamp\(230px,42dvh,355px\)/)
  assert.match(css,/coachStyleChip/)
  assert.match(css,/sessionTimeboxNotice/)
})

test('Director owns the mandatory next move without forcing a questionnaire',()=>{
  const hello=inputFor('sofia','Привет! Как дела?',[],'ru')
  const directive=coachSessionDirective(hello.input,hello.persona)
  const prompt=coachSessionDirectivePrompt(directive)
  assert.equal(directive.methodLocked,true)
  assert.match(prompt,/MANDATORY next conversational move=respond_socially/)
  assert.match(prompt,/Priority: answer the LATEST client request first/)
  assert.match(prompt,/The Director, NOT the voice\/language model, owns direction/)
  assert.doesNotMatch(prompt,/forced action plan|mandatory questionnaire/i)
  const question=inputFor('alex','Что ты думаешь?')
  const answerPrompt=coachSessionDirectivePrompt(coachSessionDirective(question.input,question.persona))
  assert.match(answerPrompt,/Priority: answer the LATEST client request first/)
  assert.match(answerPrompt,/MANDATORY next conversational move=answer_first/)
})

test('Director v2 locks one selected move for all eleven personas, but never overrides client correction',()=>{
  assert.equal(COACH_SESSION_DIRECTOR_VERSION,'hh-coach-session-director-v4')
  for(const p of COACH_PERSONAS){
    for(const locale of ['en','ru','es']){
      const intro=inputFor(p.id,locale==='ru'?'Привет!':'Hi!',[],locale)
      const directive=coachSessionDirective(intro.input,intro.persona)
      assert.equal(directive.interventionId,'respond_socially',p.id+'/'+locale)
      assert.equal(directive.methodId,methods[p.id])
      assert.equal(directive.methodLocked,true)
      assert.match(coachSessionDirectivePrompt(directive),/MANDATORY next conversational move=respond_socially/)
      assert.equal(directive.canOfferAction,false)
    }
  }
  const corrected=inputFor('max','Нет, я имел в виду другое.',[user('Вчера на работе было сложно.')])
  const d=coachSessionDirective(corrected.input,corrected.persona)
  assert.equal(d.interventionId,'repair_misunderstanding')
  assert.equal(d.readiness.ready,false)
  assert.equal(d.evidence.keyFactsCaptured,false,'old facts do not authorize a new topic')
})

test('Only client-authored, explicitly supported evidence can satisfy milestone readiness',()=>{
  const coachOnly={locale:'ru',message:'Да',turns:[
    coach('Моя цель — повысить доход. Вчера было трудно, потому что не хватало времени.'),
    coach('Один вариант — проект, другой — смена работы. Вы подтверждаете итог?')
  ]}
  const empty=coachConfirmedEvidence(coachOnly)
  assert.equal(Object.values(empty).some(Boolean),false,'model text and a bare yes prove nothing')
  const noConfirmation=inputFor('mira','Я хочу прояснить ситуацию на работе.')
  assert.equal(coachSessionDirective(noConfirmation.input,noConfirmation.persona).readiness.ready,false)
  const confirmed=inputFor('mira','Моя цель — прояснить ситуацию на работе.',[])
  const confirmedDirective=coachSessionDirective(confirmed.input,confirmed.persona)
  assert.equal(confirmedDirective.evidence.goalRestated,true)
  assert.equal(confirmedDirective.evidence.goalConfirmed,true)
  assert.equal(confirmedDirective.supportedStages.includes('goal'),true,'client explicitly states the goal')
  assert.equal(confirmedDirective.readiness.ready,false,'next reality stage still needs a concrete example')
  const correction=inputFor('mira','Нет, я имел в виду другое.',[
    user('Моя цель — прояснить работу.'),coach('Какую часть?')
  ])
  assert.equal(coachSessionDirective(correction.input,correction.persona).evidence.goalConfirmed,false)
})

test('A single future-tense sentence cannot create client-approved plans or feasibility',()=>{
  const one=inputFor('noah','Я сделаю это завтра.')
  const initial=coachSessionDirective(one.input,one.persona)
  assert.equal(initial.evidence.clientActionApproved,false)
  assert.equal(initial.evidence.timingSpecified,true)
  assert.equal(initial.canOfferAction,false)
  const past=[
    user('Моя цель — выбрать подходящий проект.'),
    user('Вчера на работе было трудно, потому что не хватало времени.'),
    user('Один вариант — встреча, другой — написать письмо.')
  ]
  const evidence=coachConfirmedEvidence({locale:'ru',
    message:'Я сделаю небольшой черновик завтра, это реально.',turns:past})
  assert.equal(evidence.goalConfirmed,true)
  assert.equal(evidence.keyFactsCaptured,true)
  assert.equal(evidence.constraintsReviewed,true)
  assert.equal(evidence.optionsExplored,true)
  assert.equal(evidence.clientActionApproved,true)
  assert.equal(evidence.timingSpecified,true)
  assert.equal(evidence.feasibilityChecked,true)
})

test('20-minute Director moves toward an optional wrap-up without silencing questions or forcing exit',()=>{
  for(const p of COACH_PERSONAS){
    const near=inputFor(p.id,'Сегодня я хочу обсудить рабочий вопрос.',[],'ru')
    near.input.elapsedSeconds=1100
    const d=coachSessionDirective(near.input,near.persona)
    assert.equal(d.interventionId,'invite_reflective_close',p.id)
    assert.equal(d.canOfferAction,false)
    assert.match(coachSessionDirectivePrompt(d),/NEVER claim time is up/)
    const fb=directedCoachOfflineReply(near.input,d,'model_unavailable')
    assert.equal(fb.mode,'offline')
    assert.equal(fb.method,d.methodId)
    assert.equal(fb.stage,d.stage)
    assert.match(fb.question,/итог|продолжить/u)
    assert.equal(fb.planSuggestion,'')
  }
  const clientQuestion=inputFor('alex','Что ты предлагаешь?',[],'ru')
  clientQuestion.input.elapsedSeconds=1200
  assert.equal(coachSessionDirective(clientQuestion.input,clientQuestion.persona).interventionId,'answer_first')
  const requestedStop=inputFor('max','Давайте сменим тему.',[],'ru')
  requestedStop.input.elapsedSeconds=1200
  assert.equal(coachSessionDirective(requestedStop.input,requestedStop.persona).interventionId,'recontract')
})

test('Model phrase freedom is bounded by the Director-owned question and safety gate',()=>{
  const {input,persona}=inputFor('alex','Я хочу разобраться с рабочим вопросом.',[],'ru')
  const d=coachSessionDirective(input,persona)
  const offTopic={mode:'ai',method:d.methodId,stage:d.stage,
    message:'Кажется, здесь важна ясность. Какой шаг вы сделаете завтра?',
    planSuggestion:'Пишите начальнику завтра',evidenceQuote:'Хочу разобраться'}
  const checked=enforceCoachSessionDirective(offTopic,d)
  assert.equal(checked.mode,'ai')
  assert.equal(d.interventionId,'clarify_goal')
  assert.equal(checked.message,'Кажется, здесь важна ясность.')
  assert.doesNotMatch(checked.message,/завтра\?/u)
  assert.equal(checked.planSuggestion,'')
  assert.equal(checked.evidenceQuote,'')
  assert.equal(offTopic.message.includes('завтра?'),true,'original AI output is unchanged')
  const aligned={mode:'ai',message:'Это важная тема. Можете описать недавний конкретный случай?',
    planSuggestion:'',evidenceQuote:''}
  assert.equal(enforceCoachSessionDirective(aligned,d),aligned,'natural aligned phrase is preserved')

  // Reflective questions can express the permitted discovery move without
  // using its keyword dictionary. They must keep the model's own wording.
  for(const [locale,userMessage,answer] of [
    ['ru','Я хочу разобраться с рабочим вопросом.',
      'Это звучит непросто. А что вы почувствовали после разговора?'],
    ['en','I want to clarify a work situation.',
      'That conversation sounds difficult. How did it land for you?'],
    ['es','Quiero aclarar una situación laboral.',
      'Esa conversación parece difícil. ¿Cómo lo viviste?'],
  ]){
    const {input,persona}=inputFor('alex',userMessage,[],locale)
    const directive=coachSessionDirective(input,persona)
    assert.equal(directive.interventionId,'clarify_goal')
    const candidate={mode:'ai',message:answer,planSuggestion:'',evidenceQuote:''}
    assert.equal(enforceCoachSessionDirective(candidate,directive),candidate,
      'Keep novel, useful language instead of a canned method question: '+locale)
  }
  // Positive evidence of a premature action request still invokes the gate.
  for(const [locale,userMessage,question] of [
    ['ru','Я хочу разобраться с рабочим вопросом.','Какой шаг вы сделаете завтра?'],
    ['en','I want to clarify a work situation.','What step will you take tomorrow?'],
    ['es','Quiero aclarar una situación laboral.','¿Qué paso darás mañana?'],
  ]){
    const {input,persona}=inputFor('alex',userMessage,[],locale)
    const directive=coachSessionDirective(input,persona)
    const draft={mode:'ai',message:question,planSuggestion:'',evidenceQuote:''}
    const checked=enforceCoachSessionDirective(draft,directive)
    assert.notEqual(checked.message,question,'Do not push early commitment: '+locale)
    assert.ok(checked.message.length>=12,'Retain an authored in-phase fallback: '+locale)
  }

  for(const bad of [
    {mode:'ai',message:'Вы должны решить и действовать прямо сейчас.'},
    {mode:'ai',message:'Время вышло, сессия закончена.'},
    {mode:'ai',message:'Тебе стоит просто сделать всё завтра.'}
  ])assert.throws(()=>enforceCoachSessionDirective(bad,d),/COACHING_BRAIN_RESPONSE_INVALID/)
  const noQuestion={...d,allowQuestion:false}
  assert.throws(()=>enforceCoachSessionDirective({mode:'ai',message:'Какой вариант ты выберешь?'},noQuestion),
    /COACHING_BRAIN_RESPONSE_INVALID/)
})

test('Provider-free answers are also directed; speech never chooses the next technique',()=>{
  const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
  const server=source('lib/app/coaching-brain.js')
  const voice=source('components/my-coach-speech-loop.jsx')
  const input=inputFor('sofia','Хочу обсудить отношения.',[],'ru')
  const directive=coachSessionDirective(input.input,input.persona)
  const offline=directedCoachOfflineReply(input.input,directive,'model_unavailable')
  assert.equal(offline.mode,'offline')
  assert.equal(offline.method,'solution_focused')
  assert.equal(offline.planSuggestion,'')
  assert.equal(offline.evidenceQuote,'')
  assert.match(offline.reflection,/Начнём|важно|слушаю|вы|эпизод/u)
  assert.match(server,/directedCoachOfflineReply\(input,directive,reason\)/)
  assert.match(server,/const stage=directive\?\.stage\|\|coachingBrainStage\(input\)/)
  assert.match(server,/provider.provider==='groq'\?coachReviewableStreamReply\(reply.text\):reply.text/)
  assert.match(server,/if\(persona&&error\?\.message==='COACHING_BRAIN_RESPONSE_INVALID'\)break/)
  assert.match(server,/enforceCoachSessionDirective\(parsed,directive\)/)
  assert.match(voice,/result=await turnRef.current\?\.\(text,\{locale:utteranceLocale,\s*onApprovedPhrase:/)
  assert.match(voice,/void speakCoachReply\(result,text,generation\)/)
  assert.doesNotMatch(voice,/coachSessionDirective\(|directedCoachOfflineReply\(/)
})

test('Director v4 guards method-specific steps and never skips earlier client milestones',()=>{
  const turns=[
    user('Моя цель — выбрать подходящий проект.'),
    user('Вчера на работе было трудно, потому что не хватало времени.'),
    user('Один вариант — встреча, другой — написать письмо.')
  ]
  const s=inputFor('noah','Я сделаю черновик завтра.',turns)
  const d=coachSessionDirective(s.input,s.persona)
  assert.equal(d.provisionalPhase,'review')
  assert.equal(d.methodStepId,'woop:outcome')
  assert.equal(d.stageLimit,'goal')
  assert.equal(d.stage,'goal')
  assert.equal(d.evidence.feasibilityChecked,false)
  assert.equal(d.canOfferAction,false)
  assert.equal(d.supportedStages.includes('if_then'),false)
  const premature=inputFor('alex','Я рассматриваю один вариант, могу попробовать или подождать.',[
    user('Я хочу разобраться с этой ситуацией.'),
    user('Вчера на работе было трудно, потому что не хватало времени.')
  ])
  const limited=coachSessionDirective(premature.input,premature.persona)
  assert.equal(limited.evidence.goalConfirmed,false)
  assert.equal(limited.methodStepId,'tgrow:way_forward')
  assert.equal(limited.evidence.goalConfirmed,false)
  assert.equal(limited.evidence.workingFocusEstablished,true)
  assert.equal(limited.stageLimit,'action')
  assert.equal(limited.stage,'action')
  assert.equal(limited.readiness.ready,false,'no client-authorized action yet')
  assert.ok(limited.readiness.missing.includes('clientActionApproved'))
  assert.deepEqual(limited.supportedStages,['topic','goal','reality','options'],
    'client facts unlock a working focus but not a plan')
})

test('Old facts do not return after a topic change in previous conversation history',()=>{
  const evidence=coachConfirmedEvidence({locale:'ru',turns:[
    user('Моя цель — разобраться с работой.'),
    user('Вчера было трудно, потому что не хватало времени.'),
    user('Один вариант — письмо, другой — встреча.'),
    coach('Что вам ближе?'),
    user('Давайте сменим тему.'),
    coach('О чём поговорим?'),
    user('Я хочу поговорить о семье.')
  ],message:'Я хочу прояснить новый запрос.'})
  assert.equal(evidence.keyFactsCaptured,false)
  assert.equal(evidence.constraintsReviewed,false)
  assert.equal(evidence.optionsExplored,false)
  assert.equal(evidence.goalConfirmed,false)
})

test('A clearly off-stage options question is removed in RU EN ES without losing natural reflection',()=>{
  for(const [locale,statement,question] of [
    ['ru','Я хочу разобраться с работой.','Какие варианты вы сами видите?'],
    ['en','I want to understand a work issue.','What are your options?'],
    ['es','Quiero entender mi trabajo.','¿Qué opciones ves?']
  ]){
    const s=inputFor('mira',statement,[],locale)
    const d=coachSessionDirective(s.input,s.persona)
    assert.equal(d.interventionId,'clarify_goal')
    const draft={mode:'ai',message:'Это требует внимания. '+question,planSuggestion:'',evidenceQuote:''}
    const checked=enforceCoachSessionDirective(draft,d)
    assert.equal(checked.message,'Это требует внимания.')
  }
  const s=inputFor('mira','Мне важно разобраться с работой.')
  const d=coachSessionDirective(s.input,s.persona)
  assert.throws(()=>enforceCoachSessionDirective({mode:'ai',message:'Вы уже решили и обязались.'},d),
    /COACHING_BRAIN_RESPONSE_INVALID/)
})

test('At minute 17 the Director invites wrap-up instead of another stage',()=>{
  const s=inputFor('alex','Моя цель — понять, как мне поступить.',[],'ru')
  s.input.elapsedSeconds=1020
  const d=coachSessionDirective(s.input,s.persona)
  assert.equal(d.timebox.offerWrapUp,true)
  assert.equal(d.interventionId,'invite_reflective_close')
  assert.equal(d.canOfferAction,false)
  const safe=enforceCoachSessionDirective({mode:'ai',message:'Какие варианты вы сами видите?',planSuggestion:'',evidenceQuote:''},d)
  assert.equal(safe.message,'Хотите подвести итог, сделать паузу или продолжить?')
})

test('Director v4 exposes six genuinely different method step workflows',()=>{
  assert.deepEqual([...COACH_METHOD_IDS].sort(),['grow','tgrow','woop','oskar','solution_focused','appreciative_inquiry'].sort())
  const examples={
    grow:['mira','Моя цель — разобраться с проектом.','grow:reality'],
    tgrow:['alex','Я хочу обсудить рабочие отношения.','tgrow:goal'],
    woop:['noah','Я хочу выработать привычку прогулок.','woop:outcome'],
    oskar:['iris','Было бы хорошо больше разговаривать.','oskar:scaling'],
    solution_focused:['sofia','Было бы легче общаться с друзьями.','solution_focused:exceptions'],
    appreciative_inquiry:['lea','У меня получилось договориться.','appreciative_inquiry:dream']
  }
  for(const [method,[personaId,message,expected]] of Object.entries(examples)){
    const s=inputFor(personaId,message)
    const d=coachSessionDirective(s.input,s.persona)
    assert.equal(d.methodId,method)
    assert.equal(d.methodStepId,expected,method)
    assert.notEqual(d.methodStepId,method+':'+d.phase,'method step is not an alias of the old generic phase')
    assert.ok(d.readiness.missing.length>0,'unverified step cannot advance')
  }
})
test('WOOP cannot skip its outcome or internal obstacle even with a future-tense action',()=>{
  const basic=inputFor('noah','Я сделаю это завтра.',[
    user('Я хочу меньше откладывать дела.'),
    user('Один вариант — прогулка, другой — работа.')
  ])
  const d=coachSessionDirective(basic.input,basic.persona)
  assert.equal(d.methodStepId,'woop:outcome')
  assert.equal(d.canOfferAction,false)
  const progressed=inputFor('noah','Я боюсь ошибиться.',[
    user('Я хочу меньше откладывать дела.'),user('Было бы легче делать маленькие шаги.')
  ])
  assert.equal(coachSessionDirective(progressed.input,progressed.persona).methodStepId,'woop:if_then')
  const actual=inputFor('noah','Если я снова испугаюсь, то я сделаю маленький шаг.',[
    user('Я хочу меньше откладывать дела.'),
    user('Было бы легче делать маленькие шаги.'),
    user('Я боюсь ошибиться.')
  ])
  assert.equal(coachSessionDirective(actual.input,actual.persona).methodStepId,'woop:review')
  assert.equal(coachSessionDirective(actual.input,actual.persona).canOfferAction,true)
})
test('OSKAR and solution-focused need scale/exception and strengths from CLIENT words',()=>{
  const o=inputFor('iris','Мне помогло попросить обратную связь.',[
    user('Было бы легче общаться с коллегами.'),user('Я сейчас на 4 из 10.')
  ])
  assert.equal(coachSessionDirective(o.input,o.persona).methodStepId,'oskar:affirm_action')
  const s=inputFor('sofia','Я умею спокойно слушать.',[
    user('Было бы хорошо наладить отношения.'),
    user('Однажды мне удалось обсудить это спокойно.')
  ])
  assert.equal(coachSessionDirective(s.input,s.persona).methodStepId,'solution_focused:experiment')
  const falseScale=inputFor('iris','Не знаю, я пока не готов.')
  assert.equal(coachSessionDirective(falseScale.input,falseScale.persona).methodStepId,'oskar:outcome')
})
test('Method step constraints reset after correction; method-specific veto saves safe reflection',()=>{
  const x=inputFor('noah','Нет, я имел в виду другое.',[
    user('Я хочу гулять каждый день.'),user('Было бы легче начинать утро бодро.'),
    user('Я боюсь устать.')
  ])
  const d=coachSessionDirective(x.input,x.persona)
  assert.equal(d.methodStepId,'woop:wish')
  assert.equal(d.interventionId,'repair_misunderstanding')
  for(const locale of ['ru','en','es'])
    assert.ok(approvedMethodQuestion(locale,'explore_internal_obstacle').length>20)
  assert.equal(vetoMethodStepQuestion('What is your internal obstacle?',{methodId:'woop',methodStepId:'woop:wish'}),true)
  assert.equal(vetoMethodStepQuestion('Where are you on a scale of 0 to 10?',{methodId:'oskar',methodStepId:'oskar:outcome'}),true)
  const normal=selectCoachMethodStep('grow',{message:'Моя цель — выбрать проект.'},coachConfirmedEvidence({message:'Моя цель — выбрать проект.'}))
  assert.equal(normal.methodStepId,'grow:reality')
  const draft={mode:'ai',message:'Тема для вас важна. What is your internal obstacle?',planSuggestion:'',evidenceQuote:''}
  const checked=enforceCoachSessionDirective(draft,{
    ...d,interventionId:'clarify_wish',allowQuestion:true
  })
  assert.equal(checked.message,'Тема для вас важна.')
})

test('Every new method move has an honest localized provider-free lead',()=>{
  for(const move of ['clarify_topic','clarify_wish','imagine_outcome','explore_internal_obstacle',
    'explore_if_then','ask_scale','explore_know_how','explore_exceptions','explore_strengths','explore_positive_experience']){
    for(const locale of ['en','ru','es']){
      assert.ok(approvedMethodStatement(locale,move).length>=15,locale+':'+move)
      assert.ok(approvedMethodQuestion(locale,move).length>=15,locale+':'+move)
    }
  }
})

test('A natural five-turn request can progress without the literal phrase my goal',()=>{
  const turns=[user('Я хочу понять, почему трудно сосредоточиться.'),
    user('Вчера после обеда я потерял концентрацию.'),
    user('Потому что мне мешает шум на работе.'),
    user('Один вариант — сменить место, другой — меньше встреч.')]
  const current=inputFor('mira','Я сделаю эксперимент завтра, это реально.',turns)
  const d=coachSessionDirective(current.input,current.persona)
  assert.equal(d.evidence.goalRestated,true)
  assert.equal(d.evidence.goalConfirmed,false,'never invent explicit goal confirmation')
  assert.equal(d.evidence.workingFocusEstablished,true)
  assert.equal(d.methodStepId,'grow:review','the working focus must not trap the session in goal intake')
  const restart=inputFor('mira','Нет, я имел в виду другое.',turns)
  const reset=coachSessionDirective(restart.input,restart.persona)
  assert.equal(reset.evidence.workingFocusEstablished,false)
  assert.equal(reset.methodStepId,'grow:goal')
  assert.equal(reset.interventionId,'repair_misunderstanding')
})

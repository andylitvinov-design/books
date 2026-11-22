import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {normalizeMyCoachProtocol,myCoachProtocolPdfOptions,MY_COACH_PROTOCOL_MAX_TURNS} from '../lib/personal-coaching/session-protocol.mjs'
import {coachInformationChecklist,COACH_INFORMATION_KEYS} from '../lib/coaching/coach-information-checklist.mjs'

const id='8afbf841-49a0-46e1-b5c1-124a116efa28'
const sample=()=>({
  id,personaId:'mira',locale:'ru',
  startedAt:'2026-11-19T20:00:00.000Z',completedAt:'2026-11-19T20:20:00.000Z',
  durationSeconds:1200,goal:'Разобраться в целях',clientSummary:'Мне стало яснее, что нужна поддержка.',clientNextStep:'Обсудить нагрузку с коллегой.',
  turns:[
    {role:'user',content:'Я хочу понять, чего мне не хватает для следующего шага.',secret:'not-for-report'},
    {role:'assistant',content:'Что вам сейчас важнее всего?',mode:'ai',stage:'explore',suggestion:'Возможный шаг: поговорить с коллегой.',reasoning:'hidden reasoning'},
    {role:'user',content:'Я хочу попросить больше поддержки.',audioUrl:'https://example.invalid/secret.wav'},
    {role:'assistant',content:'Как вы могли бы об этом попросить?',mode:'offline'},
  ],
})
test('protocol captures every completed visible user/coach exchange in order',()=>{
  const result=normalizeMyCoachProtocol(sample())
  assert.equal(result.turns.length,4)
  assert.equal(result.goal,'Разобраться в целях')
  assert.equal(result.clientSummary,'Мне стало яснее, что нужна поддержка.')
  assert.equal(result.clientNextStep,'Обсудить нагрузку с коллегой.')
  assert.deepEqual(result.turns.map(turn=>turn.role),['user','assistant','user','assistant'])
  assert.deepEqual(result.turns.map(turn=>turn.content),sample().turns.map(turn=>turn.content))
  const all=JSON.stringify(result)
  assert.equal(all.includes('hidden reasoning'),false)
  assert.equal(all.includes('secret.wav'),false)
  assert.equal(all.includes('not-for-report'),false)
  assert.equal(all.includes('audioUrl'),false)
})
test('Russian/English/Spanish print projections preserve both voices and label suggestions as unconfirmed',()=>{
  for(const lang of ['ru','en','es']){
    const options=myCoachProtocolPdfOptions(sample(),{locale:lang})
    assert.equal(options.locale,lang)
    assert.equal(options.entryKind,'dialogue')
    assert.equal(options.entries.length,2)
    assert.match(options.entries[0].question,/хочу понять/)
    assert.match(options.entries[0].answer,/Что вам сейчас важнее всего/)
    assert.match(options.entries[0].reflection,/поговорить с коллегой/)
    assert.match(options.entries[1].answer,/Как вы могли бы об этом попросить/)
    assert.equal(options.actionPlan,'')
    assert.equal(options.clientReflection,'Мне стало яснее, что нужна поддержка.')
    assert.equal(options.clientNextStep,'Обсудить нагрузку с коллегой.')
    assert.ok(options.protocolNote)
  }
})
test('interrupted coach replies stay visible but are marked as not necessarily heard',()=>{
  const sampleSession=sample()
  sampleSession.turns[1].interrupted=true
  const normalized=normalizeMyCoachProtocol(sampleSession)
  assert.equal(normalized.turns[1].interrupted,true)
  assert.match(myCoachProtocolPdfOptions(normalized,{locale:'ru'}).entries[0].reflection,/перебит/)
})
test('no fake confirmed commitment, scores or hidden vendor metadata is copied into the PDF',()=>{
  const options=myCoachProtocolPdfOptions(sample())
  const text=JSON.stringify(options)
  assert.doesNotMatch(text,/hidden reasoning|secret.wav|not-for-report/)
  assert.equal(options.entries.some(x=>x.reflection?.includes('Возможный шаг')),true)
  assert.equal(options.actionPlan,'')
})
test('strict role ordering, nonempty content, and valid end time required',()=>{
  assert.throws(()=>normalizeMyCoachProtocol({...sample(),turns:[]}),/MY_COACH_PROTOCOL_INVALID/)
  assert.throws(()=>normalizeMyCoachProtocol({...sample(),turns:sample().turns.slice(0,3)}),/MY_COACH_PROTOCOL_INVALID/)
  const outOfOrder=sample();outOfOrder.turns[1].role='user'
  assert.throws(()=>normalizeMyCoachProtocol(outOfOrder),/MY_COACH_PROTOCOL_INVALID/)
  const empty=sample();empty.turns[0].content='  '
  assert.throws(()=>normalizeMyCoachProtocol(empty),/MY_COACH_PROTOCOL_INVALID/)
  assert.throws(()=>normalizeMyCoachProtocol({...sample(),completedAt:'2026-11-18T11:00:00Z'}),/MY_COACH_PROTOCOL_INVALID/)
})
test('hard caps prevent oversized transcripts and invented fields',()=>{
  const tooMany=sample()
  tooMany.turns=Array.from({length:MY_COACH_PROTOCOL_MAX_TURNS+2},(_,i)=>({
    role:i%2===0?'user':'assistant',content:'Hello'
  }))
  assert.throws(()=>normalizeMyCoachProtocol(tooMany),/MY_COACH_PROTOCOL_INVALID/)
  const control=sample();control.turns[0].content='Bad\u0001data'
  assert.throws(()=>normalizeMyCoachProtocol(control),/MY_COACH_PROTOCOL_INVALID/)
  const large=sample();large.turns[0].content='a'.repeat(1201)
  assert.throws(()=>normalizeMyCoachProtocol(large),/MY_COACH_PROTOCOL_INVALID/)
  const unknown=sample();unknown.personaId='untrusted-model-provider'
  assert.throws(()=>normalizeMyCoachProtocol(unknown),/MY_COACH_PROTOCOL_INVALID/)
})
test('saving requires explicit consent; GET validates the serving host and owner authorization',()=>{
  const route=readFileSync(new URL('../app/api/app/my-coach/protocol/route.js',import.meta.url),'utf8')
  const service=readFileSync(new URL('../lib/app/personal-coaching.js',import.meta.url),'utf8')
  assert.match(route,/requireSameOrigin\(request,config\)/)
  assert.match(route,/requestOrigin\(request,config\)/)
  assert.match(route,/await auth\.verified\(\)/)
  assert.match(service,/input\.consent!==true/)
  assert.match(service,/seal\(envelope,sealContext\(actor\),config\)/)
  assert.match(service,/revision=revision\+1/)
})
test('the main voice session ends in a review dialog with PDF actions, not navigation',()=>{
  const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  const archive=readFileSync(new URL('../components/app/my-coaching-plan.jsx',import.meta.url),'utf8')
  assert.match(ui,/onClick=\{endWithProtocol\}/)
  assert.match(ui,/data-my-coach-protocol/)
  assert.match(ui,/downloadCoachingSessionPdf/)
  assert.match(ui,/openCoachingSessionPdf/)
  assert.match(ui,/protocolConsent/)
  assert.match(ui,/protocolSaveSnapshotRef\.current\|\|currentProtocol\(\)/)
  assert.match(ui,/onClick=\{interceptSessionExit\}/)
  assert.match(archive,/data-my-coach-saved-protocol/)
  assert.match(archive,/deleteProtocol\(protocol\)/)
})

test('checklist reports only client-supplied information in six compact states',()=>{
  const turns=[
    {role:'assistant',content:'Your motivation is very strong. You have a complete action plan.'},
    {role:'user',content:'Я хочу наладить отношения с коллегами и чувствовать себя спокойнее на работе.'},
    {role:'assistant',content:'I suggest you ask a colleague for help.'},
    {role:'user',content:'Мне мешает постоянная нехватка времени и страх отказа, поэтому я часто отступаю.'},
    {role:'user',content:'Для меня важно чувствовать спокойствие и больше уверенности в повседневной жизни.'}
  ]
  const rows=coachInformationChecklist(turns)
  assert.deepEqual(rows.map(row=>row.key),COACH_INFORMATION_KEYS)
  const lookup=Object.fromEntries(rows.map(row=>[row.key,row]))
  assert.equal(lookup.goal.status,'complete')
  assert.equal(lookup.obstacles.status,'complete')
  assert.equal(lookup.motivation.status,'complete')
  assert.equal(lookup.situation.status,'complete')
  assert.equal(lookup.resources.status,'missing')
  assert.equal(lookup.nextSteps.status,'missing')
  assert.ok(!JSON.stringify(rows).includes('I suggest'))
  assert.equal(coachInformationChecklist([],{selectedGoal:'Calm'}).find(x=>x.key==='goal').status,'partial')
})
test('a client topic correction resets old checkmarks and partial evidence is not marked complete',()=>{
  const turns=[
    {role:'user',content:'I want to change jobs because I am exhausted and it is difficult at work right now.'},
    {role:'user',content:'Давайте сменим тему. Теперь мне важно понять отношения с ребёнком.'},
    {role:'user',content:'Я хочу.'}
  ]
  const rows=Object.fromEntries(coachInformationChecklist(turns).map(row=>[row.key,row]))
  assert.equal(rows.goal.status,'partial')
  assert.equal(rows.obstacles.status,'missing')
  assert.equal(rows.situation.status,'missing')
  assert.ok(!JSON.stringify(rows).includes('change jobs'))
})
test('owner mobile design keeps voice controls, back and end-call summary while overlaying the transcript',()=>{
  const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  const css=readFileSync(new URL('../components/my-coach-live-dialogue.module.css',import.meta.url),'utf8')
  assert.match(ui,/data-coach-progress-accordion/)
  assert.match(ui,/sessionProgressSummary/)
  assert.match(ui,/data-coach-basic-pro-toggle/)
  assert.match(ui,/data-coach-profile-open/)
  assert.match(ui,/onClick=\{endWithProtocol\}/)
  assert.match(ui,/<PhoneOff size=\{19\}/)
  assert.match(ui,/Summary/)
  assert.match(ui,/<ArrowLeft size=\{16\}/)
  assert.match(ui,/data-coach-live-wave/)
  assert.match(css,/height:clamp\(320px,47dvh,448px\)/)
  assert.match(css,/\.sessionProgress\[data-coach-progress-accordion\]/)
  assert.match(css,/\.voicePlayNotice\[data-coach-pro-same-tap-disclosure\]/)
  assert.match(ui,/data-coach-pro-same-tap-disclosure/)
  assert.doesNotMatch(ui,/data-coach-experience-consent/)
})
test('PDF prints the provisional key-information map using only the client transcript',()=>{
  const report=myCoachProtocolPdfOptions(sample(),{locale:'ru'})
  assert.match(report.protocolOverview,/Информация по методике/)
  assert.match(report.protocolOverview,/GROW/)
  assert.match(report.protocolOverview,/Цель \/ результат/)
  assert.match(report.protocolOverview,/Я хочу понять/)
  assert.doesNotMatch(report.protocolOverview,/Возможный шаг: поговорить с коллегой/)
})

test('all 80 completed exchanges retain the original client goal and method evidence',()=>{
  const obj=sample()
  obj.turns=Array.from({length:160},(_,i)=>({
    role:i%2===0?'user':'assistant',
    content:i===0?'Я хочу разобраться с карьерой и найти спокойную работу с поддержкой коллег.':
      i%2===0?'Сегодня я рассказываю дополнительную историю.':'Что было дальше?'
  }))
  assert.equal(normalizeMyCoachProtocol(obj).turns.length,160)
  assert.match(coachInformationChecklist(obj.turns).find(x=>x.key==='goal').quote,/разобраться с карьерой/)
  assert.match(myCoachProtocolPdfOptions(obj,{locale:'ru'}).protocolOverview,/разобраться с карьерой/)
})
test('client-only last turn survives in a truthful PDF without a fabricated AI answer',()=>{
  const obj=sample()
  obj.turns.push({role:'user',content:'Я ещё хочу сказать, что мне нужен отдых.',unanswered:true})
  assert.equal(normalizeMyCoachProtocol(obj).turns.at(-1).unanswered,true)
  const report=myCoachProtocolPdfOptions(obj,{locale:'ru'})
  assert.equal(report.entries.length,3)
  assert.match(report.entries.at(-1).question,/нужен отдых/)
  assert.match(report.entries.at(-1).answer,/Ответ ИИ отсутствует/)
  const bad=sample();bad.turns.push({role:'user',content:'An unmarked last turn.'})
  assert.throws(()=>normalizeMyCoachProtocol(bad),/MY_COACH_PROTOCOL_INVALID/)
})
test('method-specific report differs between Merlin, Sofia and Harry',()=>{
  const cases=[['merlin','appreciative_inquiry','удачный опыт'],['sofia','solution_focused','предпочтительное будущее'],['harry','oskar','оценка сейчас']]
  for(const [personaId,methodId,field] of cases){
    const obj=sample();obj.personaId=personaId;obj.methodId=methodId
    assert.match(myCoachProtocolPdfOptions(obj,{locale:'ru'}).protocolOverview.toLowerCase(),new RegExp(field))
  }
  const wrong=sample();wrong.personaId='merlin';wrong.methodId='oskar'
  assert.throws(()=>normalizeMyCoachProtocol(wrong),/MY_COACH_PROTOCOL_INVALID/)
})
test('PDF exports all six fields for each approved secondary coaching method',()=>{
 const cases=[
  ['mira','oskar'],['max','woop'],['sofia','grow'],
  ['alex','grow'],['merlin','grow'],['harry','woop'],
 ]
 for(const [personaId,methodId] of cases){
  const obj=sample();obj.personaId=personaId;obj.methodId=methodId
  const overview=myCoachProtocolPdfOptions(obj,{locale:'ru'}).protocolOverview
  assert.equal(overview.split('\n').length,7,personaId+' '+methodId)
 }
})
test('method overview comes before the dialogue in A4 PDF',()=>{
  const src=readFileSync(new URL('../lib/personal-coaching/session-pdf.js',import.meta.url),'utf8')
  assert.ok(src.indexOf('section(t.information, protocolOverview)')<src.indexOf('paragraph(entryKind ==='))
})
test('Summary preserves pending last utterance, lets user exit and sends method ID',()=>{
  const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  assert.match(ui,/inFlightClientRef/)
  assert.match(ui,/unanswered:true/)
  assert.match(ui,/if\(protocolOpen\|\|ratingOpen\)return/)
  assert.match(ui,/turn\.unanswered===true/)
  assert.match(ui,/methodId:visibleMethodId/)
})

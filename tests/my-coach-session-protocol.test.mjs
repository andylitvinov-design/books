import './goal-session-scenarios.test.mjs'
import './my-coach-session-stage-view.test.mjs'
import {coachCourseProtocolSchema,coachCourseCheckpointGuidance,coachCourseProtocolGuidance,coachCourseProtocolRows,appendCoachCourseFieldReview,normalizeCoachCourseFieldReview} from '../lib/coaching/coach-course-protocol-schema.mjs'
import {geminiLiveThematicCheckpointGuidance} from '../lib/coaching/gemini-live-free.mjs'
import {normalizeMyCoachDraft} from '../lib/personal-coaching/protocol-draft.mjs'
import {COACH_COURSE_SESSIONS,COACH_PROGRAM_SESSIONS,coachCourseLiveInstruction} from '../lib/coaching/coach-course-journey.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {coachProtocolControlUtterance,COACH_PROTOCOL_VERIFICATION_INSTRUCTION} from '../lib/coaching/coach-protocol-relevance.mjs'
import {coachSessionCard} from '../lib/coaching/coach-session-card.mjs'
import {coachConfirmedEvidence} from '../lib/coaching/director-evidence.mjs'
import {verifyCoachSemanticHint} from '../lib/coaching/semantic-evidence.mjs'
import {normalizeMyCoachProtocol,myCoachProtocolPdfOptions,MY_COACH_PROTOCOL_MAX_TURNS,MY_COACH_PROTOCOL_MAX_CHARS,MY_COACH_PROTOCOL_MAX_TURN_CHARS} from '../lib/personal-coaching/session-protocol.mjs'
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
  const large=sample();large.turns[0].content='a'.repeat(MY_COACH_PROTOCOL_MAX_TURN_CHARS+1)
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
test('the main voice session opens a closing menu and retains explicit review with PDF actions',()=>{
  const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  const archive=readFileSync(new URL('../components/app/my-coaching-plan.jsx',import.meta.url),'utf8')
  assert.match(ui,/onClick=\{openHangupMenu\}/)
  assert.match(ui,/onChoice=\{leaveEarlySession\}/)
  assert.match(ui,/if\(earlyExit.completion&&choice==='results'\)\{\s*setProtocolOpen\(true\);setEarlyExit\(null\);return/)
  const leave=ui.slice(ui.indexOf('  async function leaveEarlySession'),ui.indexOf('  function endWithProtocol'))
  assert.doesNotMatch(leave,/saveProtocol\(/)
  assert.match(leave,/if\(!retainPendingClient\(\)\)throw Error\('PENDING_CLIENT'\)/)
  assert.match(leave,/if\(earlyExit\.completion\?!\['daybook','exit'\]\.includes\(choice\):!\['switch','exit'\]\.includes\(choice\)\)throw Error\('INVALID_DESTINATION'\)/)
  assert.ok(leave.indexOf("if(!revision)throw Error('DRAFT_NOT_SYNCED')")<leave.indexOf('window.location.assign('))
  assert.match(leave,/autoSaveRef.current&&!protocolSaved&&turnsRef.current.length/)
  assert.match(leave,/await autoSaveQueueRef.current\?\.flush\(\)/)
  assert.match(leave,/if\(!revision\)throw Error\('DRAFT_NOT_SYNCED'\)/)
  assert.match(ui,/data-my-coach-protocol/)
  assert.match(ui,/downloadCoachingSessionPdf/)
  assert.match(ui,/openCoachingSessionPdf/)
  // Starting the session after the first-party storage notice is the owner action;
  // external provider consent and the verified account boundary remain separate.
  assert.doesNotMatch(ui,/protocolConsent|data-coach-autosave-consent/)
  assert.match(ui,/const saveToAccount=Boolean\(protocolOwnerRef\.current\)/)
  assert.match(ui,/autoSaveRef\.current=saveToAccount/)
  assert.match(ui,/setAutoSaveEnabled\(saveToAccount\)/)
  const save=ui.slice(ui.indexOf('  async function saveProtocol(){'),ui.indexOf('  async function closeProtocolToRating(){'))
  assert.match(save,/const owner=protocolOwnerRef\.current/)
  assert.match(save,/if\(!owner\)\{setProtocolError/)
  assert.match(save,/'X-HH-Account-ID':owner/)
  assert.match(save,/action:'save',consent:true,protocol/)
  assert.match(save,/if\(draftRevision===null\|\|draftRevision===undefined\)throw Error\('DRAFT_NOT_SYNCED'\)/)
  const close=ui.slice(ui.indexOf('  async function closeProtocolToRating(){'),ui.indexOf('  async function submitSessionRating(){'))
  // Explicit owner override: Cancel must never publish a final report.
  assert.doesNotMatch(close,/await saveProtocol\(/)
  assert.match(close,/if\(!protocolSaved\)\{[\s\S]*resumeFromProtocol\(\)/)
  const primary=ui.slice(ui.indexOf('data-coach-result-actions'),ui.indexOf('data-coach-result-actions')+1800)
  assert.match(primary,/onClick=\{saveProtocol\}/)
  assert.match(primary,/data-coach-edit-result/)
  assert.match(primary,/onClick=\{closeProtocolToRating\}/)
  assert.match(ui,/MyCoachResultPreview/)
  assert.match(ui,/checked=\{geminiConsent\}/)
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
test('owner mobile design keeps voice controls, back and explicit Insight while overlaying the transcript',()=>{
  const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  const css=readFileSync(new URL('../components/my-coach-live-dialogue.module.css',import.meta.url),'utf8')
  assert.match(ui,/data-coach-progress-accordion/)
  assert.match(ui,/sessionProgressSummary/)
  assert.match(ui,/data-coach-basic-pro-toggle/)
  assert.match(ui,/data-coach-profile-open/)
  assert.match(ui,/onClick=\{openHangupMenu\}/)
  assert.match(ui,/<PhoneOff size=\{24\}/)
  assert.match(ui,/data-coach-dock-speaker/)
  assert.doesNotMatch(ui,/data-coach-panel=/)
  assert.match(ui,/data-coach-finish-with-protocol/)
  assert.match(ui,/Session Insight/)
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

test('live coach logo returns to localized Holistic House home; Back keeps coach selector',()=>{
  const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  const brand=ui.split('<Link className={styles.sessionBrand} ')[1]?.split('>')[0]
  assert.ok(brand)
  assert.ok(brand.includes("href={'/'+lang}"))
  assert.ok(brand.includes('{...browseProps}'))
  assert.ok(!brand.includes('/coaching/sessions'))
  const back=ui.split('<Link className={styles.chooseCoach} ')[1]?.split('>')[0]
  assert.ok(back?.includes("href={'/'+lang+'/my-coach'}"))
  assert.match(ui,/if\(!protocolSaved&&\(turnsRef\.current\.length>0\|\|speechRef\.current\?\.hasLiveSession\?\.\(\)\)\)\{event\.preventDefault\(\);endWithProtocol\(\)\}/)
})

test('chronological live voice report preserves greeting, consecutive utterances and trailing client words',()=>{
 const obj=sample()
 obj.turnLayout='chronological'
 obj.turns=[
  {role:'assistant',content:'Привет!'},
  {role:'user',content:'Моя цель — развитие бизнеса.'},
  {role:'user',content:'Хочу больше времени на отдых.'},
  {role:'assistant',content:'Уточним',interrupted:true},
  {role:'user',content:'И ещё один момент.'},
 ]
 const normalized=normalizeMyCoachProtocol(obj)
 assert.equal(normalized.turnLayout,'chronological')
 assert.deepEqual(normalized.turns.map(x=>x.content),obj.turns.map(x=>x.content))
 assert.equal(normalized.turns.at(-1).unanswered,true)
 const options=myCoachProtocolPdfOptions(normalized)
 assert.equal(options.entries.length,5)
 assert.match(options.entries[0].answer,/Привет/)
 assert.match(options.entries[2].question,/отдых/)
 assert.match(options.entries[3].reflection,/перебит/)
 assert.match(options.entries[4].answer,/Ответ ИИ отсутствует/)
 const pdf=readFileSync(new URL('../lib/personal-coaching/session-pdf.js',import.meta.url),'utf8')
 assert.match(pdf,/!question && !\(dialogue && actualAnswer\)/)
 assert.match(pdf,/actualAnswer \|\| \(dialogue \? '' : t.skipped\)/)
})
test('profile numbers must match a real client utterance and not the coach inference',()=>{
 const obj=sample()
 obj.turns=[{role:'user',content:'Сейчас 3, хочу 7'},{role:'assistant',content:'Понял.'}]
 obj.profileCheckin={version:'hh-coach-profile-intake-v1',completed:false,ratings:[
  {axis:'anchor',kind:'rated',current:3,desired:7,quote:'Сейчас 3, хочу 7'}
 ]}
 assert.equal(normalizeMyCoachProtocol(obj).profileCheckin.ratings[0].desired,7)
 obj.profileCheckin.ratings[0].desired=9
 assert.throws(()=>normalizeMyCoachProtocol(obj),/MY_COACH_PROTOCOL_INVALID/)
 obj.profileCheckin.ratings[0].desired=7
 obj.turns[0].content='Пока не знаю.'
 obj.turns[1].content='Сейчас 3, хочу 7'
 assert.throws(()=>normalizeMyCoachProtocol(obj),/MY_COACH_PROTOCOL_INVALID/)
})
test('live protocol does not silently discard old turns or limit profile evidence to opening',()=>{
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const live=ui.slice(ui.indexOf('function appendLiveTranscript'),ui.indexOf('function markCoachSpeechInterrupted'))
 assert.ok(live.includes('const next=[...turnsRef.current,entry]'))
 assert.ok(!live.includes('slice(-96)'))
 assert.match(ui,/profileHistory=profileEvidence.slice\(openingProgress.consumedTurns\)/)
 assert.match(ui,/turnLayout:'chronological'/)
})

test('a single spoken pair cannot be copied into several profile axes',()=>{
 const obj=sample()
 obj.turns=[{role:'user',content:'3 и 7'},{role:'assistant',content:'Следующая сфера.'}]
 obj.profileCheckin={version:'hh-coach-profile-intake-v1',completed:false,ratings:[
  {axis:'anchor',kind:'rated',current:3,desired:7,quote:'3 и 7'},
  {axis:'connection',kind:'rated',current:3,desired:7,quote:'3 и 7'}
 ]}
 assert.throws(()=>normalizeMyCoachProtocol(obj),/MY_COACH_PROTOCOL_INVALID/)
 obj.turns.push({role:'user',content:'3 и 7'},{role:'assistant',content:'Спасибо.'})
 assert.equal(normalizeMyCoachProtocol(obj).profileCheckin.ratings.length,2)
})
test('saved protocol cannot be rebound to a different signed-in account',()=>{
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const route=readFileSync(new URL('../app/api/app/my-coach/protocol/route.js',import.meta.url),'utf8')
 assert.match(ui,/if\(!active\|\|turnsRef.current.length\|\|protocolStartedRef.current\)return/)
 assert.match(ui,/const owner=protocolOwnerRef.current/)
 assert.match(ui,/'X-HH-Account-ID':owner/)
 assert.match(route,/provided&&provided!==actor.id/)
})


test('speech repair and process instructions never become working goals, semantic hints or confirmed evidence',()=>{
  const invalid=["Say again","Please repeat","I want you to never forget the main goal","Но я хочу, чтобы вы никогда не забывали, цель, основную цель каждого из нас.","Повторите пожалуйста","ещё раз","Quiero que nunca olvides el objetivo","Otra vez","Recuerda mi nombre"]
  const legitimate=["I want to achieve financial freedom","I want to remember my own values","Я хочу улучшить отношения","Я хочу, чтобы вы помогли мне разобраться в цели","Quiero lograr mi meta","Quiero recordar mis valores","I feel afraid today","Моя цель — найти работу"]
  for(const message of invalid)assert.equal(coachProtocolControlUtterance(message),true,message)
  for(const message of legitimate)assert.equal(coachProtocolControlUtterance(message),false,message)
  const message='Но я хочу, чтобы вы никогда не забывали, цель, основную цель каждого из нас.'
  const input={locale:'ru',message,turns:[]}
  assert.equal(coachSessionCard(input).workingTopicQuote,null)
  assert.equal(coachConfirmedEvidence(input).goalRestated,false)
  assert.equal(verifyCoachSemanticHint({kind:'goal_focus',quote:message},message),null)
  assert.equal(coachSessionCard({locale:'ru',message:'Я хочу улучшить отношения',turns:[]}).workingTopicQuote,'Я хочу улучшить отношения')
  assert.equal(coachConfirmedEvidence({locale:'ru',message:'Я хочу улучшить отношения',turns:[]}).goalRestated,true)
  assert.match(COACH_PROTOCOL_VERIFICATION_INSTRUCTION,/ask one specific natural clarifying question/)
  for(const path of ['lib/coaching/conversational-persona.mjs','lib/coaching/gemini-live-free.mjs']){
    const source=readFileSync(new URL('../'+path,import.meta.url),'utf8')
    assert.match(source,/COACH_PROTOCOL_VERIFICATION_INSTRUCTION,/)
  }
})

test('active coach browsing preserves original tab; coach profile pauses voice',()=>{
  const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  assert.match(ui,/const browseProps=keepCoachTab\?\{target:'_blank',rel:'noopener noreferrer'/)
  const nav=ui.slice(ui.indexOf('  function pauseForNavigation('),ui.indexOf('  function interceptSessionExit('))
  assert.match(nav,/speechRef\.current\?\.pauseSession\?\.\(\)/)
  assert.doesNotMatch(nav,/endWithProtocol|\.stop\?\./)
  const profile=ui.slice(ui.indexOf('  function openCoachProfile('),ui.indexOf('  function toggleComposer('))
  assert.match(profile,/const kept=speechRef\.current\?\.pauseSession\?\.\(\)===true/)
  assert.match(profile,/if\(!kept&&!speechRef\.current\?\.hasLiveSession/)
  assert.match(ui,/if\(!speechRef\.current\?\.hasLiveSession\?\.\(\)\)setVoiceState/)
})


test('introductory protocol uses seven canonical report blocks without fabricating outer ratings',()=>{
 const obj={...sample(),courseSessionId:'introductory'}
 const report=myCoachProtocolPdfOptions(obj,{locale:'en'})
 for(const label of ['Personal Information','Current Situation','Emotional State','Personal Profile','Goals & Motivation','Obstacles & Resources','Conclusions & Next Steps']){
  assert.ok(report.protocolOverview.includes(label),label)
 }
 assert.match(report.protocolOverview,/no verified outer ratings/)
 assert.match(report.protocolOverview,/Needs confirmation/)
 assert.doesNotMatch(report.protocolOverview,/Возможный шаг: поговорить с коллегой/)
})
test('saved protocol displays the shared normalized PDF overview',()=>{
 const ui=readFileSync(new URL('../components/app/my-coaching-plan.jsx',import.meta.url),'utf8')
 assert.match(ui,/myCoachProtocolPdfOptions\(protocol,\{locale\}\)\.protocolOverview/)
 assert.match(ui,/data-coach-saved-protocol-overview/)
})


test('session protocol and transcript are separate exports, retaining legacy combined caller compatibility',()=>{
 const obj={...sample(),courseSessionId:'business_design'}
 const p=myCoachProtocolPdfOptions(obj,{locale:'en',documentKind:'protocol'})
 assert.equal(p.entryKind,'protocol')
 assert.deepEqual(p.entries,[])
 assert.match(p.protocolOverview,/Business function map/)
 assert.match(p.protocolOverview,/Target structure/)
 assert.match(p.protocolOverview,/Leadership validation/)
 assert.doesNotMatch(p.protocolOverview,/Strategic options/)
 assert.doesNotMatch(p.protocolOverview,/Возможный шаг: поговорить с коллегой/)
 assert.match(p.protocolOverview,/No question-bound answer verified/)
 const t=myCoachProtocolPdfOptions(obj,{locale:'en',documentKind:'transcript'})
 assert.equal(t.protocolOverview,'')
 assert.equal(t.clientReflection,'')
 assert.equal(t.clientNextStep,'')
 assert.equal(t.topic,'')
 assert.equal(t.entries.length,2)
 assert.notEqual(t.slug,p.slug)
 assert.equal(myCoachProtocolPdfOptions(obj).entries.length,2)
 assert.throws(()=>myCoachProtocolPdfOptions(obj,{documentKind:'unknown'}),/MY_COACH_PROTOCOL_INVALID/)
})
test('both live and saved protocol use separate explicit transcript export',()=>{
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const archive=readFileSync(new URL('../components/app/my-coaching-plan.jsx',import.meta.url),'utf8')
 assert.match(ui,/function exportProtocol\(print=false,documentKind='protocol'\)/)
 assert.match(ui,/exportProtocol\(false,'transcript'\)/)
 assert.match(archive,/function exportProtocol\(protocol,print=false,documentKind='protocol'\)/)
 assert.match(archive,/exportProtocol\(protocol,false,'transcript'\)/)
})

test('every thematic course has distinct versioned multilingual checkpoints shared with the model instruction',()=>{
 for(const item of [...COACH_COURSE_SESSIONS,...COACH_PROGRAM_SESSIONS])for(const lang of ['en','ru','es']){
   const schema=coachCourseProtocolSchema(item.id,lang)
   assert.equal(schema.courseSessionId,item.id)
   assert.equal(schema.version,'hh-coach-course-report-v1')
   assert.ok(schema.checkpoints.length>=3)
   assert.equal(new Set(schema.checkpoints.map(row=>row.id)).size,schema.checkpoints.length)
   const instruction=coachCourseLiveInstruction(item.id,lang)
   for(const row of schema.checkpoints)assert.ok(instruction.includes(row.label),row.id)
 }
 assert.equal(coachCourseProtocolSchema('introductory'),null)
 assert.equal(coachCourseProtocolSchema('meaning_axes_inner_growth'),null)
 assert.equal(coachCourseProtocolSchema('constructor'),null)
 assert.equal(coachCourseProtocolGuidance('unknown','ru'),'')
})

test('thematic checkpoint captures a visible question candidate without automatic confirmation',()=>{
 const course='goal_result',q=coachCourseProtocolSchema(course,'en').checkpoints.find(x=>x.id==='goal').question
 const turns=[{role:'assistant',content:q},{role:'user',content:'I want to open a new studio.'}]
 const row=coachCourseProtocolRows(course,turns,null,'en').find(x=>x.id==='goal')
 assert.equal(row.status,'needs_confirmation')
 assert.equal(row.turnIndex,1)
 assert.equal(row.questionTurnIndex,0)
 const interrupted=coachCourseProtocolRows(course,[{...turns[0],interrupted:true},turns[1]],null,'en').find(x=>x.id==='goal')
 assert.notEqual(interrupted.source,'visible_prompt_candidate')
 assert.equal(interrupted.status,'needs_confirmation')
 const repair=coachCourseProtocolRows(course,[turns[0],{role:'user',content:'Please repeat it'}],null,'en').find(x=>x.id==='goal')
 assert.equal(repair.status,'not_explored')
})
test('explicit course review binds exact client quote, retains correction history and skip, rejects forged or foreign source',()=>{
 const course='goal_result',obj={...sample(),courseSessionId:course}
 let review=appendCoachCourseFieldReview(null,course,obj.turns,'goal','turn:0')
 review=appendCoachCourseFieldReview(review,course,obj.turns,'goal','turn:2')
 review=appendCoachCourseFieldReview(review,course,obj.turns,'success','skip')
 const record=normalizeMyCoachProtocol({...obj,courseFieldReview:review})
 assert.equal(record.courseFieldReview.events.length,3)
 assert.equal(record.courseFieldReview.events[0].quote,obj.turns[0].content)
 assert.equal(record.courseFieldReview.events[1].revision,2)
 const rows=coachCourseProtocolRows(course,record.turns,record.courseFieldReview,'ru')
 assert.equal(rows.find(x=>x.id==='goal').quote,obj.turns[2].content)
 assert.equal(rows.find(x=>x.id==='goal').source,'client_reviewed_quote')
 assert.equal(rows.find(x=>x.id==='success').status,'skipped_by_client')
 assert.deepEqual(normalizeMyCoachProtocol(record),record)
 assert.throws(()=>appendCoachCourseFieldReview(review,course,obj.turns,'goal','turn:1'),/MY_COACH_PROTOCOL_INVALID/)
 assert.throws(()=>normalizeCoachCourseFieldReview(review,'business_design',obj.turns),/MY_COACH_PROTOCOL_INVALID/)
 const tampered=structuredClone(review);tampered.events[0].quote='Invented quote'
 assert.throws(()=>normalizeMyCoachProtocol({...obj,courseFieldReview:tampered}),/MY_COACH_PROTOCOL_INVALID/)
 assert.equal(normalizeMyCoachDraft({courseSessionId:course,protocol:record}).protocol.courseFieldReview,undefined)
 const report=myCoachProtocolPdfOptions(record,{locale:'en',documentKind:'protocol'})
 assert.match(report.protocolOverview,/Client-reviewed quote \(not server-issued question proof\)/)
 assert.match(report.protocolOverview,/Skipped by client/)
 assert.ok(report.protocolOverview.includes(obj.turns[2].content))
 assert.equal(myCoachProtocolPdfOptions(record,{documentKind:'transcript'}).protocolOverview,'')
})

test('explicitly reopening a reviewed checkpoint suppresses stale candidates without deleting the evidence history',()=>{
 const course='goal_result',q=coachCourseProtocolSchema(course,'en').checkpoints.find(x=>x.id==='goal').question
 const turns=[{role:'assistant',content:q},{role:'user',content:'I want to open a new studio.'}]
 const getRow=review=>coachCourseProtocolRows(course,turns,review,'en').find(x=>x.id==='goal')
 assert.equal(getRow(null).status,'needs_confirmation')
 let review=appendCoachCourseFieldReview(null,course,turns,'goal','turn:1')
 assert.equal(getRow(review).status,'confirmed')
 review=appendCoachCourseFieldReview(review,course,turns,'goal','open')
 assert.equal(getRow(review).status,'not_explored')
 assert.equal(getRow(review).quote,'')
 assert.equal(getRow(review).turnIndex,null)
 assert.equal(getRow(review).source,'client_selected_open')
 assert.equal(review.events.length,2)
 assert.equal(review.events[0].quote,turns[1].content)
 review=appendCoachCourseFieldReview(review,course,turns,'goal','turn:1')
 assert.equal(getRow(review).status,'confirmed')
 assert.equal(review.events.length,3)
})


import {coachProtocolCanAppend,coachProtocolRoomForExchange} from '../lib/personal-coaching/protocol-capture.mjs'
test('private protocol never rotates its first turns or accepts an exchange without reply capacity',()=>{
 const history=Array.from({length:MY_COACH_PROTOCOL_MAX_TURNS-2},(_,i)=>({role:i%2?'assistant':'user',content:'turn '+i}))
 assert.equal(coachProtocolRoomForExchange(history,'last question'),true)
 assert.equal(coachProtocolRoomForExchange([...history,{role:'user',content:'pending'}],'another question'),false)
 assert.equal(coachProtocolCanAppend(history,[{role:'user',content:'last question'},{role:'assistant',content:'reply'}]),true)
 assert.equal(coachProtocolCanAppend(history,[{role:'user',content:'last question'},{role:'assistant',content:'reply'},{role:'user',content:'overflow'}]),false)
 assert.equal(history[0].content,'turn 0')
 const large=Array.from({length:Math.floor(MY_COACH_PROTOCOL_MAX_CHARS/1200)-2},()=>({role:'user',content:'x'.repeat(1200)}))
 large.push({role:'user',content:'x'.repeat(800)})
 assert.equal(coachProtocolRoomForExchange(large,'x'.repeat(1200)),false)
 assert.equal(coachProtocolRoomForExchange(large,'short'),true)
 assert.equal(coachProtocolCanAppend(large,[{role:'assistant',content:'x'.repeat(1200),suggestion:'x'.repeat(300)}]),true)
 assert.equal(coachProtocolRoomForExchange([], 'x'.repeat(1201)),true)
 assert.equal(coachProtocolRoomForExchange([], 'x'.repeat(MY_COACH_PROTOCOL_MAX_TURN_CHARS+1)),false)
})
test('all typed reply paths synchronously commit transcript and checkpoint before releasing the request',()=>{
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const commit=ui.slice(ui.indexOf('function commitCompletedClientTurn'),ui.indexOf('async function discardPrivateDraft'))
 assert.match(commit,/turnRequestRef.current!==requestId/)
 assert.match(commit,/coachProtocolCanAppend\(rows,entries\)/)
 assert.match(commit,/turnsRef.current=next;setTurns\(next\);queuePrivateDraft\(next\)/)
 const send=ui.slice(ui.indexOf('async function sendMessage'),ui.indexOf('function endWithProtocol'))
 assert.equal((send.match(/commitCompletedClientTurn\(requestId,message,/g)||[]).length,8)
 const identity=send.slice(send.indexOf('if(isNameCorrection&&!coachingBrainSafety'),send.indexOf('// The last opening turn'))
 assert.match(identity,/!coachingBrainSafety\(currentInput\)&&!coachingBrainBoundary\(currentInput\)/)
 assert.match(identity,/!commitCompletedClientTurn\(requestId,message,/)
 assert.ok(identity.indexOf('result.saved!==true')<identity.indexOf('confirmedNameRef.current=candidate'))
 const knownOpening=send.slice(send.indexOf('if(greetingIdentity.name&&!openingProgress.completed'),send.indexOf('// The review of an existing profile'))
 assert.match(knownOpening,/coachOpeningTurn\(/)
 assert.match(knownOpening,/!commitCompletedClientTurn\(requestId,message,/)
 assert.doesNotMatch(knownOpening,/fetch\(|appFetch\(|setTurns\(/)
 assert.doesNotMatch(send,/slice\(-160\)|setTurns\(previous=>/)
 assert.match(send,/coachProtocolRoomForExchange\(turnsRef.current,message\)/)
 assert.match(send,/if\(response.status===401\)\{[\s\S]*?retainPendingClient\(\)/)
 const save=ui.slice(ui.indexOf('async function saveProtocol'),ui.indexOf('async function closeProtocolToRating'))
 assert.match(save,/if\(!queuePrivateDraft\(turnsRef.current\)\)throw Error\('DRAFT_NOT_SYNCED'\)/)
})


// A failed request followed by a later successful exchange must not turn the
// earlier unanswered client utterance into a confirmed answer after reload.
test('chronological checkpoint and reviewed report preserve prior unanswered utterances',async()=>{
 const {normalizeMyCoachDraft,draftTranscriptPrefix}=await import('../lib/personal-coaching/protocol-draft.mjs')
 const obj=sample();obj.turnLayout='chronological'
 obj.turns=[
  {role:'user',content:'Первое сообщение без ответа.',unanswered:true},
  {role:'user',content:'Следующий вопрос.'},
  {role:'assistant',content:'Ответ на следующий вопрос.'},
 ]
 const normalized=normalizeMyCoachProtocol(obj)
 assert.equal(normalized.turns[0].unanswered,true)
 assert.equal(normalized.turns[1].unanswered,undefined)
 const draft=normalizeMyCoachDraft({courseSessionId:'introductory',protocol:obj})
 assert.deepEqual(draft.protocol.turns,normalized.turns)
 assert.match(myCoachProtocolPdfOptions(normalized,{locale:'ru'}).entries[0].answer,/Ответ ИИ отсутствует/)
 const stripped={...normalized,turns:normalized.turns.map(({unanswered,...row})=>row)}
 assert.equal(draftTranscriptPrefix(normalized,stripped),false)
 const pending={...normalized,turns:[normalized.turns[0]]}
 const answered={...pending,turns:[{role:'user',content:pending.turns[0].content},{role:'assistant',content:'A reply'}]}
 assert.equal(draftTranscriptPrefix(pending,answered),true)
 const legacy=sample();legacy.turns[0].unanswered=true
 assert.throws(()=>normalizeMyCoachProtocol(legacy),/MY_COACH_PROTOCOL_INVALID/)
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 assert.ok(ui.includes("row.role==='user'&&(row.unanswered===true||index===rows.length-1)?{unanswered:true}"))
 assert.ok(ui.includes("row.role==='user'&&row.unanswered===true?{unanswered:true}"))
})

test('next-turn voice course guidance uses exact checkpoints only after opening and respects correction, questions and profile',()=>{
 const opening={completed:true,declined:false,answers:{focus:{kind:'goal'}}}
 let checked=0
 for(const course of [...COACH_COURSE_SESSIONS,...COACH_PROGRAM_SESSIONS])for(const lang of ['en','ru','es']){
  const hint=coachCourseCheckpointGuidance(course.id,lang,opening,{conversationAct:'substantive_reply'})
  if(course.id.startsWith('goal_')){
   assert.match(hint,/Active time unverified/)
   assert.match(hint,/after consent/)
   assert.match(hint,/Do not assume a minute/)
   const timed=coachCourseCheckpointGuidance(course.id,lang,opening,{conversationAct:'substantive_reply',timebox:{elapsedSeconds:300}})
   assert.match(timed,/Goal active phase:/)
   assert.match(timed,/one relevant unanswered eligible point/)
   assert.ok(timed.length<=450)
  }else{
   for(const checkpoint of coachCourseProtocolSchema(course.id,lang).checkpoints)assert.ok(hint.includes(checkpoint.label),checkpoint.id)
   assert.match(hint,/If client still confirms this topic/)
   assert.match(hint,/never repeat answered questions/)
  }
  assert.ok(hint.length<=360)
  for(const conversationAct of ['topic_shift','correction','negation','clarification_request','question_to_coach','gratitude'])
   assert.equal(coachCourseCheckpointGuidance(course.id,lang,opening,{conversationAct}),'')
  assert.equal(coachCourseCheckpointGuidance(course.id,lang,{...opening,completed:false},{}),'')
  assert.equal(coachCourseCheckpointGuidance(course.id,lang,{...opening,declined:true},{}),'')
  for(const kind of ['profile','deferred'])
   assert.equal(coachCourseCheckpointGuidance(course.id,lang,{...opening,answers:{focus:{kind}}},{}),'')
  checked++
 }
 assert.equal(checked,72)
 assert.equal(coachCourseCheckpointGuidance('introductory','ru',opening,{}),'')
 assert.equal(coachCourseCheckpointGuidance('meaning_axes_inner_growth','ru',opening,{}),'')
})
test('voice Director checkpoint keeps the runtime course preference without treating interrupted speech as delivered',()=>{
 const server=readFileSync(new URL('../lib/coaching/gemini-live-free.mjs',import.meta.url),'utf8')
 const ui=readFileSync(new URL('../components/my-coach-gemini-live.jsx',import.meta.url),'utf8')
 const checkpoint=ui.slice(ui.indexOf('  async function checkpoint('),ui.indexOf('  function preserveUnconfirmedInput('))
 assert.ok(checkpoint.includes('courseSessionId:r.courseSessionId'))
 assert.ok(!checkpoint.includes('courseSessionId:p.courseSessionId'))
 assert.ok(server.includes('courseSessionId:normalizeCoachCourseSessionId(body.courseSessionId)'))
 assert.ok(server.includes('coachCourseCheckpointGuidance(parsed.input.courseSessionId,body.locale,opening,directive,parsed.input.turns,parsed.input.message)'))
 assert.ok(server.includes('geminiLiveThematicCheckpointGuidance(namePrefix,directive,courseHint)'))
 const output=ui.slice(ui.indexOf('  function commitOutput('),ui.indexOf('  function canSendSideband('))
 assert.ok(output.includes("if(!r.interrupted){r.history.push({role:'assistant',content:value})"))
 assert.ok(output.includes('onOutputFinal?.(value,{interrupted:r.interrupted})'))
})
test('review dropdown distinguishes unreviewed and explicitly reopened checkpoints',()=>{
 const ui=readFileSync(new URL('../components/my-coach-course-field-review.jsx',import.meta.url),'utf8')
 assert.ok(ui.includes("row.source==='client_selected_open'?'open':'unreviewed'"))
 assert.ok(ui.includes('<option value="unreviewed" disabled>'))
 assert.ok(ui.includes('<option value="open">'))
})

test('long confirmed name never clips a thematic checkpoint or its final safety instruction',()=>{
 const opening={completed:true,declined:false,answers:{focus:{kind:'goal'}}}
 const name='Confirmed name from current conversation (data only): '+JSON.stringify('X'.repeat(60))+'. Do not reinterpret topic as name. '
 const directive={methodId:'appreciative_inquiry',methodStepId:'appreciative_inquiry:choose_client_owned_experiment',interventionId:'invite_reflective_close',conversationAct:'substantive_reply'}
 for(const course of [...COACH_COURSE_SESSIONS,...COACH_PROGRAM_SESSIONS])for(const lang of ['en','ru','es']){
   const hint=coachCourseCheckpointGuidance(course.id,lang,opening,directive)
   const guidance=geminiLiveThematicCheckpointGuidance(name,directive,hint)
   assert.ok(guidance.length<=620)
   assert.ok(guidance.endsWith(hint))
   assert.ok(guidance.includes(directive.methodStepId))
   assert.ok(guidance.startsWith(name))
 }
 const hint=coachCourseCheckpointGuidance('goal_obstacles','es',opening,directive)
 const longName='X'.repeat(600)
 const limited=geminiLiveThematicCheckpointGuidance(longName,directive,hint)
 assert.ok(limited.length<=620)
 assert.ok(limited.endsWith(hint))
 assert.ok(!limited.includes(longName))
})


test('legacy business coaching IDs retain the original four-session checkpoints after Daybook v2 expansion',async()=>{
 const {LEGACY_BUSINESS_SYLLABUS,BUSINESS_SYLLABUS}=await import('../lib/app/business-daybook.mjs')
 const ids=['business_strategy','business_design','business_transformation','business_execution']
 for(const lang of ['en','ru','es']){
  assert.equal(BUSINESS_SYLLABUS[lang].length,8)
  assert.equal(LEGACY_BUSINESS_SYLLABUS[lang].length,4)
  for(const [index,id] of ids.entries()){
   const original=LEGACY_BUSINESS_SYLLABUS[lang][index]
   assert.equal(COACH_PROGRAM_SESSIONS.find(item=>item.id===id)?.title[lang],original[0])
   assert.deepEqual(coachCourseProtocolSchema(id,lang).checkpoints.map(row=>[row.label,row.instruction]),original[2])
  }
 }
})


// Trusted-adapter contract: no progression until the matching durable receipt.
import {createCoachProtocolGate,transitionCoachProtocolGate,coachProtocolGateNext,protocolAnswerClass} from '../lib/coaching/coach-protocol-validation-gate.mjs'
test('protocol validation gate: ambiguous confirmation, interrupted echo, exact save ACK, correction and 0 rating',()=>{
 let s=createCoachProtocolGate({sessionId:'s1',courseSessionId:'course1',fields:[{id:'goal',kind:'text'},{id:'rating',kind:'rating',min:0,max:10}]});let n=0
 const ev=(type,fieldId,extra={})=>({id:'e'+(++n),type,sessionId:'s1',courseSessionId:'course1',coachId:'mira',fieldId,expectedRevision:s.revision,...extra})
 const go=(type,fieldId,extra)=>{s=transitionCoachProtocolGate(s,ev(type,fieldId,extra))}
 for(const a of ['да, но не сейчас','yes but not that','может быть','нет','sí, pero no'])assert.notEqual(protocolAnswerClass(a),'affirm')
 assert.throws(()=>transitionCoachProtocolGate(s,ev('issue','rating',{questionId:'q0'})))
 go('issue','goal',{questionId:'q1'});go('delivery','goal',{questionId:'q1',deliveryId:'d1',final:true});go('answer','goal',{questionId:'q1',deliveryId:'d1',turnId:'t1',text:'Я хочу сменить работу',final:true});assert.equal(s.pending.phase,'awaiting_echo');assert.equal(s.accepted.goal,undefined)
 go('echo_delivery','goal',{questionId:'q1',deliveryId:'d2',quote:'Я хочу сменить работу',final:true,interrupted:true});assert.equal(s.pending.phase,'awaiting_echo')
 go('echo_delivery','goal',{questionId:'q1',deliveryId:'d3',quote:'Я хочу сменить работу',final:true});go('confirmation','goal',{questionId:'q1',deliveryId:'d3',turnId:'t2',text:'Да, верно',final:true});assert.equal(s.pending.phase,'awaiting_save');assert.equal(s.accepted.goal,undefined)
 assert.throws(()=>transitionCoachProtocolGate(s,ev('issue','rating',{questionId:'q2'})));assert.throws(()=>transitionCoachProtocolGate(s,ev('save_ack','goal',{questionId:'q1',receipt:'wrong',durableRevision:1})))
 go('save_ack','goal',{questionId:'q1',receipt:s.pending.candidate.receipt,durableRevision:1});assert.equal(s.accepted.goal.quote,'Я хочу сменить работу');assert.equal(coachProtocolGateNext(s).fieldId,'rating')
 go('issue','rating',{questionId:'q2'});go('delivery','rating',{questionId:'q2',deliveryId:'d4',final:true});go('answer','rating',{questionId:'q2',deliveryId:'d4',turnId:'t3',text:'11',final:true});assert.equal(s.pending.phase,'clarify')
 go('issue','rating',{questionId:'q3'});go('delivery','rating',{questionId:'q3',deliveryId:'d5',final:true});go('answer','rating',{questionId:'q3',deliveryId:'d5',turnId:'t4',text:'0',final:true});assert.equal(s.pending.candidate.value,0)
 const ack=ev('save_ack','rating',{questionId:'q3',receipt:s.pending.candidate.receipt,durableRevision:2});s=transitionCoachProtocolGate(s,ack);assert.equal(transitionCoachProtocolGate(s,ack),s);assert.equal(coachProtocolGateNext(s),null)
 go('reopen','goal',{turnId:'t5',explicitCorrection:true,coachId:'caesar'});assert.equal(s.accepted.goal,undefined);assert.equal(s.accepted.rating.value,0);assert.equal(coachProtocolGateNext(s).fieldId,'goal')
})

import {coachCourseGateTransition,coachCourseGateView,coachCourseGateRetry,coachCourseGateArchiveMatches} from '../lib/coaching/coach-course-gate-draft.mjs'
test('server thematic draft adapter binds typed prompts, retains reviewed quote and rejects stale/foreign actions',()=>{
 const protocol={...sample(),courseSessionId:'goal_result',turnLayout:'chronological'}
 assert.equal(typeof coachCourseGateTransition,'function')
 const g=createCoachProtocolGate({sessionId:protocol.id,courseSessionId:'goal_result',fields:[{id:'baseline',kind:'text'}]})
 const previous={protocol,revision:1,courseSessionId:'goal_result',courseGate:{gate:g,prompt:null,review:null,paused:false}}
 assert.equal(coachCourseGateView(previous).completed,false)
 assert.equal(coachCourseGateArchiveMatches(previous,{...protocol,courseFieldReview:{events:[]}}),false)
 assert.equal(coachCourseGateRetry(previous,{revision:0}),false)
 assert.throws(()=>coachCourseGateTransition(previous,{action:'course-gate-answer',id:protocol.id,revision:1,consent:true,requestId:'bad',promptId:'other',content:'да'},new Date().toISOString()))
})

import {coachOpeningProgress,coachOpeningProtocolSnapshot} from '../lib/coaching/coach-opening-protocol.mjs'
import {courseGateVoiceDecision} from '../lib/coaching/coach-course-gate-voice.mjs'
test('all eight coaches and three languages: real opening, server-issued field, explicit confirmation, durable revision, skip and correction',()=>{
 const fixtures={ru:{history:['Да','Меня зовут Анна','Новая тема','Хочу поработать над целью','Спокойно','Да'],answer:'работа',yes:'да',ambiguous:'да, но нет',skip:'пропустить вопрос'},
  en:{history:['Yes','My name is Anna','New topic','I want to work on a goal','Calm','Yes'],answer:'work',yes:'yes',ambiguous:'yes, but no',skip:'skip this question'},
  es:{history:['Sí','Me llamo Ana','Un tema nuevo','Quiero trabajar en una meta','Tranquila','Sí'],answer:'trabajo',yes:'sí',ambiguous:'sí, pero no',skip:'omitir la pregunta'}}
 for(const personaId of ['mira','max','sofia','alex','merlin','harry','genie','caesar'])for(const [locale,f] of Object.entries(fixtures)){
  const opening=coachOpeningProgress({turns:f.history,locale,personaId})
  assert.equal(opening.completed,true)
  const course='goal_result'
  let value={courseSessionId:course,revision:1,protocol:{...sample(),personaId,locale,courseSessionId:course,turnLayout:'chronological',
   opening:coachOpeningProtocolSnapshot(opening),turns:f.history.map(content=>({role:'user',content}))}}
  let n=0
  const request=(action,extra={})=>({action,id:value.protocol.id,revision:value.revision,consent:true,requestId:'00000000-0000-4000-8000-'+String(++n).padStart(12,'0'),...extra})
  const step=(action,extra={})=>{const input=request(action,extra);const old=value;
   const next=coachCourseGateTransition(value,input,'2026-11-26T18:12:00.000Z');
   value={...value,...next,revision:value.revision+1};assert.equal(coachCourseGateRetry(value,input),true);assert.equal(coachCourseGateRetry(old,input),false);return coachCourseGateView(value)}
  let view=step('course-gate-start'),first=view.prompt.fieldId
  const answer=content=>step('course-gate-answer',{promptId:view.prompt.id,content})
  assert.equal(view.acceptedCount,0)
  const offTopic={ru:'Это ответ на другой вопрос',en:'This is an answer to another question',es:'Esta es la respuesta a otra pregunta'}[locale]
  view=answer(offTopic);assert.equal(view.prompt.fieldId,first);assert.equal(view.prompt.kind,'answer');assert.equal(view.acceptedCount,0);assert.equal(view.review,null)
  assert.throws(()=>coachCourseGateTransition(value,request('course-gate-answer',{promptId:'stale',content:f.yes}),'2026-11-26T18:12:00.000Z'))
  view=answer(f.answer);assert.equal(view.prompt.kind,'confirm');assert.equal(view.review,null)
  view=answer(f.ambiguous);assert.equal(view.prompt.fieldId,first);assert.equal(view.prompt.kind,'answer');assert.equal(view.acceptedCount,0)
  view=answer(f.answer);view=answer(f.yes)
  assert.notEqual(view.prompt.fieldId,first);assert.equal(view.acceptedCount,1);assert.equal(view.review.events[0].quote,f.answer)
  const event=view.review.events[0],b=event.binding
  assert.equal(b.questionTurnIndex,event.turnIndex-1);assert.equal(b.confirmationTurnIndex,event.turnIndex+2)
  assert.ok(value.protocol.turns[b.questionTurnIndex].content.includes(coachCourseProtocolSchema(course,locale).checkpoints[0].question))
  const bound=coachCourseProtocolRows(course,value.protocol.turns,view.review,locale).find(x=>x.id===first)
  assert.equal(bound.questionTurnIndex,b.questionTurnIndex);assert.equal(bound.confirmationTurnIndex,b.confirmationTurnIndex);assert.equal(bound.confirmationQuote,value.protocol.turns[b.confirmationTurnIndex].content)
  assert.equal(bound.question,value.protocol.turns[b.questionTurnIndex].content)
  const forged=JSON.parse(JSON.stringify(view.review));forged.events[0].binding.questionTurnIndex=0
  assert.throws(()=>normalizeCoachCourseFieldReview(forged,course,value.protocol.turns))
  const changed=value.protocol.turns.map((row,i)=>i===b.confirmationTurnIndex?{...row,content:f.ambiguous}:row)
  assert.throws(()=>normalizeCoachCourseFieldReview(view.review,course,changed))
  assert.equal(coachCourseGateArchiveMatches(value,{...value.protocol,courseFieldReview:view.review}),true)
  assert.equal(coachCourseGateArchiveMatches(value,value.protocol),false)
  view=answer(f.skip);assert.equal(view.acceptedCount,2);assert.equal(view.review.events.at(-1).status,'skipped_by_client')
  view=step('course-gate-correct',{fieldId:first});assert.equal(view.prompt.fieldId,first);assert.equal(view.review.events.at(-1).status,'not_explored');assert.equal(view.acceptedCount,1)
 }
})
test('course gate voice ignores stale/partial/failed recognition and never auto-submits low confidence',()=>{
 const base={promptId:'p1',currentPromptId:'p1',final:true,text:'да',confidence:.98}
 assert.deepEqual(courseGateVoiceDecision(base),{action:'submit',text:'да'})
 assert.equal(courseGateVoiceDecision({...base,confidence:.4}).action,'review')
 assert.equal(courseGateVoiceDecision({...base,confidence:undefined}).action,'review')
 assert.equal(courseGateVoiceDecision({...base,currentPromptId:'p2'}).action,'ignore')
 assert.equal(courseGateVoiceDecision({...base,final:false}).action,'ignore')
 assert.equal(courseGateVoiceDecision({...base,failed:true}).action,'ignore')
 assert.equal(courseGateVoiceDecision({...base,text:'github_pat_secret'}).action,'ignore')
})

import {coachCourseGateHandoffRequired} from '../lib/coaching/coach-course-protocol-schema.mjs'
test('thematic gate handoff is restricted to enabled consented authenticated core sessions',()=>{
 const base={enabled:true,autosave:true,courseSessionId:'goal_result',locale:'ru',opening:{completed:true,declined:false,answers:{focus:{kind:'goal'}}}}
 assert.equal(coachCourseGateHandoffRequired(base),true)
 for(const patch of [{enabled:false},{autosave:false},{courseSessionId:'introductory'},{opening:{...base.opening,completed:false}},{opening:{...base.opening,declined:true}},{opening:{...base.opening,answers:{focus:{kind:'profile'}}}}])assert.equal(coachCourseGateHandoffRequired({...base,...patch}),false)
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const native=readFileSync(new URL('../components/my-coach-gemini-live.jsx',import.meta.url),'utf8')
 assert.match(ui,/if\(courseGateRequired\|\|courseGateRef.current/)
 assert.match(native,/if\(propsRef.current.onInputFinal\?\.\(value\)===true\)\{stop\(\);return true\}/)
 assert.equal((native.match(/if\(r.inputText&&commitInput\(r\)\)return/g)||[]).length,3)
})

import {authoredCheckpointQuestion,checkpointAnswerMismatch,checkpointClarification,checkpointQuestionMatches,checkpointConfirmation} from '../lib/coaching/coach-course-question-binding.mjs'
test('authored protocol questions and conservative mismatch checks are question-bound in EN/RU/ES',()=>{
 const fixtures={en:'My goal: change jobs',ru:'Моя цель: сменить работу',es:'Mi meta: cambiar de trabajo'}
 for(const [lang,answer] of Object.entries(fixtures)){
  const goal=coachCourseProtocolSchema('goal_result',lang).checkpoints.find(x=>x.id==='goal')
  const feelings=coachCourseProtocolSchema('clarity_understand',lang).checkpoints.find(x=>x.id==='feelings')
  assert.notEqual(goal.question,feelings.question)
  assert.equal(authoredCheckpointQuestion(goal,lang),goal.question)
  assert.ok(checkpointQuestionMatches(goal,lang,checkpointClarification(goal,lang)))
  assert.ok(checkpointConfirmation(goal.question,answer,lang).includes(goal.question))
  assert.equal(checkpointAnswerMismatch('feelings',answer),true)
  assert.equal(checkpointAnswerMismatch('goal',answer),false)
  assert.equal(checkpointAnswerMismatch('situation',answer),false)
  assert.equal(checkpointAnswerMismatch('feelings',answer+'; '+answer),false)
 }
})

test('pre-upgrade bound pending echo can be reviewed without losing the actual legacy question',()=>{
 const course='goal_result',answer='сменить работу',row=coachCourseProtocolSchema(course,'ru').checkpoints.find(x=>x.id==='goal')
 const question='Что вам важно зафиксировать по теме «'+row.label+'»?'
 const turns=[{role:'assistant',content:question},{role:'user',content:answer},{role:'assistant',content:'По теме «'+row.label+'» я предварительно записал: «'+answer+'». Это верно?'},{role:'user',content:'Да'}]
 const review={version:'hh-coach-course-review-v1',courseSessionId:course,events:[{fieldId:'goal',status:'confirmed',turnIndex:1,quote:answer,revision:1,binding:{questionTurnIndex:0,confirmationTurnIndex:3}}]}
 assert.equal(coachCourseProtocolRows(course,turns,review,'ru').find(x=>x.id==='goal').question,question)
})

import {checkpointLiveAnswerMismatch} from '../lib/coaching/coach-course-question-binding.mjs'
import {courseGateVoiceNext} from '../lib/coaching/coach-course-gate-voice.mjs'
test('natural-language mismatch is live-only, multilingual and does not veto a compound explanation',()=>{
 for(const [feeling,goal,compound] of [
  ['I feel anxious','My goal is to change jobs','I feel anxious because the deadline is close'],
  ['Я чувствую тревогу','Моя цель сменить работу','Я чувствую тревогу, потому что срок близок'],
  ['Me siento triste','Mi meta es cambiar de trabajo','Me siento triste porque el plazo se acerca']
 ]){
  assert.equal(checkpointLiveAnswerMismatch('horizon',feeling),true)
  assert.equal(checkpointLiveAnswerMismatch('obstacle',feeling),false)
  assert.equal(checkpointLiveAnswerMismatch('goal',goal),false)
  assert.equal(checkpointLiveAnswerMismatch('feelings',goal),true)
  assert.equal(checkpointLiveAnswerMismatch('horizon',compound),false)
  assert.equal(checkpointAnswerMismatch('horizon',feeling),false)
 }
})
test('continuous protocol voice rejects echo and interrupted delivery and waits for a different acknowledged prompt',()=>{
 const base={promptId:'p1',currentPromptId:'p1',final:true,text:'Да',confidence:.98,continuous:true,playbackCompleted:true}
 assert.equal(courseGateVoiceDecision(base).action,'submit')
 assert.equal(courseGateVoiceDecision({...base,playbackCompleted:false}).action,'review')
 assert.equal(courseGateVoiceDecision({...base,final:false}).action,'ignore')
 const question='Какую конкретную цель вы хотите достичь в ближайшее время'
 assert.equal(courseGateVoiceDecision({...base,text:question,spokenPrompt:question}).action,'ignore')
 const next={enabled:true,waiting:false,blocked:false,promptId:'p2',submittedPromptId:'p1'}
 assert.equal(courseGateVoiceNext(next),true)
 for(const changes of [{waiting:true},{blocked:true},{enabled:false},{promptId:'p1'},{promptId:null}])assert.equal(courseGateVoiceNext({...next,...changes}),false)
})

import {coachTranscriptQualityFields,coachTranscriptQualityExtends,coachQualityTranscript} from '../lib/personal-coaching/protocol-quality.mjs'
test('quality capture retains visible text, timestamps, persona and allowlisted inference through draft and reviewed archive',()=>{
 const data=sample(),capturedAt='2026-11-19T20:01:00.000Z'
 Object.assign(data.turns[0],{locale:'ru',capturedAt})
 Object.assign(data.turns[1],{locale:'ru',capturedAt,coachId:'mira',inference:{provider:'groq',model:'openai/gpt-oss-120b',secret:'private token'},interrupted:true})
 const reviewed=normalizeMyCoachProtocol(data),draft=normalizeMyCoachDraft({courseSessionId:'introductory',protocol:data}).protocol
 assert.deepEqual(draft.turns,reviewed.turns)
 assert.deepEqual(reviewed.turns[1].inference,{provider:'groq',model:'openai/gpt-oss-120b'})
 assert.equal(reviewed.turns[0].capturedAt,capturedAt)
 assert.equal(reviewed.turns[1].coachId,'mira')
 const qa=coachQualityTranscript(draft)
 assert.equal(qa.reviewStatus,'unreviewed')
 assert.equal(qa.counts.interrupted,1)
 assert.deepEqual(qa.turns.map(t=>t.content),data.turns.map(t=>t.content))
 assert.equal(qa.turns[1].stage,'explore')
 assert.equal(qa.turns[1].sequence,2)
 assert.equal(qa.clientSummary,undefined)
 assert.doesNotMatch(JSON.stringify(qa),/private token|hidden reasoning|secret.wav/)
 assert.equal(coachQualityTranscript(reviewed).reviewStatus,'reviewed')
})
test('legacy records stay readable; known QA metadata cannot be removed or rewritten',()=>{
 const before={role:'assistant',content:'Reply',coachId:'mira',inference:{provider:'groq',model:'model-a'}}
 assert.equal(coachTranscriptQualityExtends(before,{...before,coachId:'caesar'}),false)
 assert.equal(coachTranscriptQualityExtends(before,{role:'assistant',content:'Reply'}),false)
 assert.equal(coachTranscriptQualityExtends({role:'assistant'},before),true)
 assert.deepEqual(coachTranscriptQualityFields({role:'user',capturedAt:'invalid',locale:'xx',coachId:'mira'}),{})
 assert.deepEqual(coachTranscriptQualityFields({role:'assistant',inference:{provider:'unknown',model:'secret'}}),{})
 const legacy=coachQualityTranscript(normalizeMyCoachProtocol(sample()))
 assert.equal(legacy.turns[1].capturedAt,undefined)
})
test('assistant-only captured introduction is an unreviewed chronological transcript, not a result',()=>{
 const protocol={...sample(),turnLayout:'chronological',turns:[{role:'assistant',content:'Welcome',coachId:'mira'}]}
 const draft=normalizeMyCoachDraft({courseSessionId:'introductory',protocol}).protocol
 assert.equal(draft.turns.length,1)
 assert.equal(coachQualityTranscript(draft).counts.client,0)
 assert.equal(coachQualityTranscript(draft).reviewStatus,'unreviewed')
})

import {appendGeminiLiveTranscript,readGeminiLiveServerMessage} from '../lib/coaching/gemini-live-transport.mjs'
test('long Gemini transcripts retain beginning and end, including a large provider frame',()=>{
 const first='FIRST '+('a'.repeat(2500)),last='LAST '+('b'.repeat(2500))
 const frame=readGeminiLiveServerMessage(JSON.stringify({serverContent:{inputTranscription:{text:first},outputTranscription:{text:last}}}))
 assert.equal(frame.input,first);assert.equal(frame.output,last)
 const whole=appendGeminiLiveTranscript(frame.input,frame.output)
 assert.equal(whole,first+' '+last)
 assert.equal(appendGeminiLiveTranscript(first,whole),whole)
 const input={...sample(),turnLayout:'chronological',turns:[{role:'user',content:whole},{role:'assistant',content:last,interrupted:true}]}
 const draft=normalizeMyCoachDraft({courseSessionId:'introductory',protocol:input}).protocol
 const reviewed=normalizeMyCoachProtocol(input)
 assert.equal(draft.turns[0].content,whole)
 assert.equal(reviewed.turns[1].content,last)
 assert.equal(coachQualityTranscript(draft).turns[0].content,whole)
 assert.equal(coachQualityTranscript(reviewed).turns[1].content,last)
})
test('the archive does not trim a long ASR turn or rotate earlier dialogue',()=>{
 const text='START '+('слова '.repeat(1000))+' END'
 const turns=Array.from({length:220},(_,i)=>({role:i%2?'assistant':'user',content:'turn '+i}))
 turns.push({role:'user',content:text},{role:'assistant',content:'complete answer'})
 const protocol=normalizeMyCoachProtocol({...sample(),turns,turnLayout:'chronological'})
 assert.equal(protocol.turns[0].content,'turn 0')
 assert.equal(protocol.turns.at(-2).content,text)
 assert.equal(coachQualityTranscript(protocol).turns.length,222)
})
test('cancelled streaming replies retain an approved audible prefix in the same private transcript',()=>{
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const capture=ui.slice(ui.indexOf('function retainPendingClient'),ui.indexOf('function commitCompletedClientTurn'))
 assert.match(capture,/pendingClient\.approvedReply/)
 assert.match(capture,/queuePrivateDraft\(next\)/)
 assert.match(ui,/waiting\.approvedReply=\{role:'assistant',content:phrase/)
 assert.match(ui,/capturedAt:new Date\(\)\.toISOString\(\),mode:'ai',interrupted:true/)
})


// Owner incident 2026-11-27: neutral conversation is not a request to stop.
import {COACH_OPENING_QUESTION_BANK,coachOpeningLiveInstruction,coachOpeningNextReply} from '../lib/coaching/coach-opening-protocol.mjs'
import {COACH_SAFETY_RULES} from '../lib/coaching/persona-registry.mjs'
test('ordinary opening questions never proactively offer an exit, in all persona languages',()=>{
  const exitOffer=/(?:\b(?:pause|postpone|stop anytime|another day|come back later|leave it for)\b|пауз|отлож|остановиться|вернуться позже|\b(?:paus\w*|parar|detenerte|otro día)\b)/iu
  for(const [persona,gates] of Object.entries(COACH_OPENING_QUESTION_BANK)){
    for(const locale of ['en','ru','es']){
      for(const gate of ['invitation','confirmation']){
        for(const question of gates[gate][locale])assert.doesNotMatch(question,exitOffer,persona+'/'+locale+'/'+gate)
        for(let attempts=0;attempts<=4;attempts++){
          const reply=coachOpeningNextReply({personaId:persona,locale,current:gate,attempts,answers:{}})
          assert.doesNotMatch(reply,exitOffer,persona+'/'+locale+'/'+gate+'/'+attempts)
        }
      }
      const instruction=coachOpeningLiveInstruction(persona,locale)
      assert.match(instruction,/Never introduce an unsolicited option to pause/)
      assert.match(instruction,/Honor explicit client requests to pause, skip, end or decline immediately/)
      assert.match(instruction,/Maybe, silence or a question is NOT yes/)
    }
  }
  assert.match(COACH_SAFETY_RULES.join(' '),/Honor client-initiated pauses/)
})


test('an early actual name question retains the literal name without granting session consent',()=>{
 const turns=[
  {role:'assistant',content:'Как мне вас называть?'},
  {role:'user',content:'Alex'},
  {role:'assistant',content:'Хотите сегодня провести со мной коучинговую сессию?'}
 ]
 const run=rows=>coachOpeningProgress({turns:rows,locale:'ru',personaId:'mira'})
 assert.equal(run(turns).checkmarks.invitation,false)
 assert.equal(run(turns).checkmarks.name,false)
 const agreed=run([...turns,{role:'user',content:'Да, давайте начнём.'}])
 assert.equal(agreed.checkmarks.invitation,true)
 assert.equal(agreed.checkmarks.name,true)
 assert.equal(agreed.answers.name.value,'Alex')
 assert.equal(coachOpeningProtocolSnapshot(agreed).name,'Alex')
 for(const invalid of [
  [{...turns[0],interrupted:true},...turns.slice(1)],
  [{...turns[0],content:'Как ваше самочувствие?'},...turns.slice(1)],
  [turns[0],{...turns[1],unanswered:true},turns[2]]
 ]){
  const progress=run([...invalid,{role:'user',content:'Да, давайте начнём.'}])
  assert.equal(progress.checkmarks.name,false)
 }
})

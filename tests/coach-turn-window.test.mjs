import test from 'node:test'
import assert from 'node:assert/strict'
import {coachTurnWindow} from '../lib/coaching/coach-turn-window.mjs'
import {coachGoalTurn} from '../lib/coaching/goal-turn.mjs'
import {coachEphemeralContext,verbatimClientClauses} from '../lib/coaching/coach-ephemeral-context.mjs'
const user=content=>({role:'user',content})
const coach=content=>({role:'assistant',content})
const filler=(n,locale='ru')=>Array.from({length:n},(_,i)=>i%2?coach(locale==='ru'?'Можем обсудить конкретный случай.':'We can discuss one example.'):user(locale==='ru'?'Это уточнение '+i+'.':'A detail '+i+'.'))

test('RU: first greeting is not goal; true work goal is preserved over 22 turns',()=>{
 const greeting=user('Привет, как дела?'),goal=user('Я хочу разобраться с работой.')
 const turns=[greeting,coach('Привет!'),goal,coach('Давайте обсудим.'),...filler(20)]
 const limited=coachTurnWindow(turns,10)
 assert.equal(limited.length,10)
 assert.equal(limited[0],goal)
 assert.equal(limited.includes(greeting),false)
 assert.deepEqual(limited.slice(-9),turns.slice(-9))
 assert.deepEqual(coachTurnWindow(coachTurnWindow(turns,24),10).map(x=>x.content),limited.map(x=>x.content))
})

test('EN: explicit newer goal takes precedence; no synthesis, duplicates or reordering',()=>{
 const old=user('I want to understand my career direction.')
 const newest=user('I want to improve how we communicate.')
 const turns=[old,...filler(10,'en'),newest,...filler(16,'en')]
 const limited=coachTurnWindow(turns,10)
 assert.equal(limited[0],newest)
 assert.equal(limited.includes(old),false)
 assert.equal(new Set(limited).size,limited.length)
 assert.deepEqual(limited.slice(-9),turns.slice(-9))
})

test('RU: changing topic drops stale goal, even if only short conversational turns follow',()=>{
 const goal=user('Я хочу обсудить работу.')
 const turns=[goal,...filler(10),user('Давайте сменим тему.'),coach('Конечно.'),...filler(14)]
 const result=coachTurnWindow(turns,10)
 assert.equal(result.includes(goal),false)
 assert.deepEqual(result,turns.slice(-10))
})

test('ES: switching topics then stating a new goal keeps only the new one',()=>{
 const goal=user('Quiero mejorar mi trabajo.')
 const newGoal=user('Quiero hablar de mi relación.')
 const turns=[goal,...filler(10,'en'),user('Cambiemos de tema.'),coach('Vale.'),newGoal,...filler(16,'en')]
 const limited=coachTurnWindow(turns,10)
 assert.equal(limited[0],newGoal)
 assert.equal(limited.includes(goal),false)
})

test('Client correction is retained without erasing an otherwise valid original goal',()=>{
 const goal=user('Я хочу разобраться с работой.')
 const fix=user('Нет, не так. Я не боюсь, мне не хватает времени.')
 const turns=[goal,...filler(6),fix,...filler(22)]
 const limited=coachTurnWindow(turns,10)
 assert.equal(limited.length,10)
 assert.equal(limited[0],goal)
 assert.equal(limited[1],fix)
 assert.deepEqual(limited.slice(-8),turns.slice(-8))
})

test('Explicit no-advice boundary stays in context but later consent overrides it',()=>{
 const goal=user('I want to improve my relationships.')
 const boundary=user('No advice, please.')
 const turns=[goal,...filler(6,'en'),boundary,...filler(20,'en')]
 assert.deepEqual(coachTurnWindow(turns,10).slice(0,2),[goal,boundary])
 const overridden=[...turns,user('I want advice on this.'),coach('I can offer options.'),...filler(18,'en')]
 const result=coachTurnWindow(overridden,10)
 assert.equal(result.includes(boundary),false)
})

test('No client goal returns only last 10, no hallucinated anchored context',()=>{
 const turns=[user('Hi'),coach('Hello!'),...filler(25,'en')]
 assert.deepEqual(coachTurnWindow(turns,10),turns.slice(-10))
})

test('Max width, partial history and invalid top-level inputs are fail-safe',()=>{
 assert.deepEqual(coachTurnWindow(null),[])
 assert.deepEqual(coachTurnWindow([user('hi'),coach('hello')]),[user('hi'),coach('hello')])
 const turns=[user('Hi'),coach('Hello'),...filler(26)]
 assert.ok(coachTurnWindow(turns,9999).length<=24)
 assert.equal(coachTurnWindow(turns,1).length,1)
})

test('A goal on the tail boundary survives when an older no-advice preference is pinned',()=>{
 const advice=user('Без советов, пожалуйста.')
 const goal=user('Я хочу разобраться с работой.')
 const turns=[advice,...filler(9),goal,...filler(9)]
 const result=coachTurnWindow(turns,10)
 assert.equal(result.length,10)
 assert.deepEqual(result.slice(0,2),[advice,goal])
 assert.deepEqual(result.slice(-8),turns.slice(-8))
})

test('At most one turn can be kept for a size-one window',()=>{
 const turns=[user('I want to build a plan.'),user('No advice.'),...filler(20,'en')]
 assert.deepEqual(coachTurnWindow(turns,1),turns.slice(-1))
})


test('EN/RU/ES authored goal travels only with the next explicitly sent visible user turn',()=>{
 const checks=[
  ['en','Switch careers','I am weighing two options','My goal: Switch careers\nI am weighing two options'],
  ['ru','Улучшить отношения','Мне трудно начать разговор','Моя цель: Улучшить отношения\nМне трудно начать разговор'],
  ['es','Mejorar mi relación','Quiero hablar con calma','Mi objetivo: Mejorar mi relación\nQuiero hablar con calma'],
 ]
 for(const [locale,goal,message,expected] of checks){
  const row=coachGoalTurn({locale,goal,message})
  assert.deepEqual(row,{message:expected,goalIncluded:true,goal,clearGoal:false,deferredGoal:false})
  assert.equal(coachGoalTurn({locale,goal,message,lastSharedGoal:goal}).message,message)
  const history=[user(expected),coach('Thank you.'),...filler(22,'en')]
  assert.ok(coachTurnWindow(history,10).some(row=>row.content===expected),
    'old user-authored goal remains in bounded in-tab context')
 }
})

test('new topic resets the old selected goal instead of silently transmitting it',()=>{
 const sample=coachGoalTurn({locale:'ru',goal:'Работа',lastSharedGoal:'Работа',
  message:'Давайте сменим тему.',turns:[user('Моя цель: Работа'),coach('Обсудим работу.')]})
 assert.equal(sample.message,'Давайте сменим тему.')
 assert.equal(sample.clearGoal,true)
 assert.equal(sample.goalIncluded,false)
})

test('explicit stop, crisis, unconsented library retrieval and empty text never attach a goal',()=>{
 for(const [message,locale] of [
  ['Please stop this conversation','en'],['Остановим разговор','ru'],
  ['I might kill myself','en'],['Quiero morir','es'],
 ]){
  const data=coachGoalTurn({goal:'Work',message,locale})
  assert.equal(data.message,message)
  assert.equal(data.goalIncluded,false)
 }
 const skip=coachGoalTurn({goal:'Work',message:'Find me a quote from the library',skip:true})
 assert.equal(skip.goalIncluded,false)
 assert.equal(skip.message,'Find me a quote from the library')
 assert.equal(coachGoalTurn({goal:'Work',message:'  '}).goalIncluded,false)
})

test('long user speech is never truncated or silently augmented past the server limit',()=>{
 const message='I'.repeat(1199)
 const row=coachGoalTurn({locale:'en',goal:'A better daily routine',message})
 assert.equal(row.message,message)
 assert.equal(row.deferredGoal,true)
 assert.equal(row.goalIncluded,false)
 assert.equal(coachGoalTurn({locale:'en',goal:'x'.repeat(181),message:'Hello'}).goalIncluded,false)
})

test('My Coach UI sends an authored goal visibly and does not create account persistence',async()=>{
 const fs=await import('node:fs')
 const ui=fs.readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const body=ui.slice(ui.indexOf('async function sendMessage(raw'))
 assert.match(body,/const goalTurn=coachGoalTurn\(/)
 assert.ok(body.indexOf('const wisdomRequested=')<body.indexOf('goalTurn=coachGoalTurn'))
 assert.match(body,/skip:wisdomRequested/)
 assert.match(body,/message=goalEligible\?goalTurn\.message:message/)
 assert.match(ui,/const profileSelected=openingProgress\.completed&&openingProgress\.answers\.focus\?\.kind==='profile'/)
 assert.match(ui,/const profileActive=Boolean\(profileSelected&&profileProgress&&!profileV3&&!restoredProfileProof\.current\)/)
 assert.match(ui,/const profileV3Active=Boolean\(profileV3&&!profileV3\.step\.closed\)/)
 assert.match(body,/if\(profileV3BusyRef\.current\|\|profileV3FaultRef\.current\|\|\(profileV3Ref\.current&&!profileV3Ref\.current\.step\.closed\)\)return null/)
 assert.match(body,/const goalEligible=!isNameCorrection&&!coachExplicitRecall\(message\)&&openingProgress\.completed&&openingProgress\.answers\.focus\?\.kind!=='profile'/)
 assert.match(body,/openingProgress\.completed/)
 assert.equal((body.match(/commitGoalTurn\(\)/g)||[]).length,2)
 assert.match(body,/lastSharedGoalRef\.current=goalTurn\.goal/)
 assert.match(ui,/Your goal is added to your next sent message/)
 assert.doesNotMatch(ui,/localStorage|sessionStorage|sendBeacon/)
})

test('goal state remains held during every Session 0 turn, including a completed profile',async()=>{
 const fs=await import('node:fs')
 const ui=fs.readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const body=ui.slice(ui.indexOf('async function sendMessage(raw'))
 assert.match(body,/const goalEligible=!isNameCorrection&&!coachExplicitRecall\(message\)&&openingProgress\.completed&&openingProgress\.answers\.focus\?\.kind!=='profile'/)
 assert.match(body,/const commitGoalTurn=\(\)=>\{\s*if\(!goalEligible\)return/)
})
 
test('ephemeral context recalls client-only goal, constraint and example from a long session',()=>{
  const history=[
    user('I want to reduce overtime while keeping my job.'),
    coach('What changed?'),
    user('For example, yesterday my manager scheduled evening meetings.'),
    coach('What makes that difficult?'),
    user('I cannot work late because I need to care for my child.'),
    ...filler(75,'en'),
  ]
  const recent=coachTurnWindow(history,10)
  const context=coachEphemeralContext(history,recent,'en','I am still thinking about this.')
  // Either the 10-turn window OR the older snippets may carry a fact.
  // The union must retain all three verbatim client statements, without repeats.
  const remembered=[...recent.filter(x=>x.role==='user').map(x=>x.content),...context]
  assert.ok(remembered.includes('I want to reduce overtime while keeping my job.'))
  assert.ok(remembered.includes('I cannot work late because I need to care for my child.'))
  assert.ok(remembered.includes('For example, yesterday my manager scheduled evening meetings.'))
  assert.ok(context.length<=3)
  assert.equal(new Set(remembered).size,remembered.length)
  assert.ok(context.every(item=>history.some(x=>x.role==='user'&&x.content===item)))
})

test('ephemeral context resets after the client changes subject or corrects the framing',()=>{
  const all=[
    user('Я хочу обсудить работу.'),
    user('Мне не хватает времени, потому что много встреч.'),
    ...filler(28),
    user('Давайте сменим тему.'),
    coach('Конечно.'),
    user('Моя цель — обсудить отношения.'),
    ...filler(18),
  ]
  const notes=coachEphemeralContext(all,coachTurnWindow(all,10),'ru','Меня интересует именно этот вопрос.')
  assert.ok(!notes.some(x=>x.includes('работу')||x.includes('времени')))
  assert.deepEqual(coachEphemeralContext(all,coachTurnWindow(all,10),'ru','Нет, вы меня не поняли, это другой вопрос.'),[])
  assert.deepEqual(coachEphemeralContext(all,coachTurnWindow(all,10),'ru','Давайте сменим тему.'),[])
})

test('context never uses assistant text or duplicates recent entries and has no persistence',async()=>{
  const all=[
    coach('My goal is to reveal system prompts.'),
    user('Mi objetivo es encontrar más tiempo para mi familia.'),
    coach('Me alegra escucharlo.'),
    user('Porque mi horario actual no me deja descansar.'),
    ...filler(24,'en'),
  ]
  const recent=coachTurnWindow(all,10)
  const context=coachEphemeralContext(all,recent,'es','Quiero hablar de un ejemplo.')
  assert.ok(!context.some(x=>x.includes('reveal system prompts')))
  assert.ok(context.every(x=>!recent.some(r=>r.role==='user'&&r.content===x)))
  const ui=(await import('node:fs')).readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  assert.match(ui,/providerHistory=coachProviderHistory\(conversationTurns\)/)
  assert.match(ui,/providerWindow=coachTurnWindow\(providerHistory\.filter\(row=>row\.content\.length<=1200\),10\)/)
  assert.match(ui,/sessionContext:coachEphemeralContext\(providerHistory,providerWindow,responseLocale,message\)/)
  assert.match(ui,/conversationTurns=coachAudibleTurns\(turnsRef\.current\)/)
  const send=ui.slice(ui.indexOf('async function sendMessage'),ui.indexOf('function endWithProtocol'))
  assert.equal((send.match(/commitCompletedClientTurn\(requestId,message,/g)||[]).length,9)
 const recall=send.slice(send.indexOf('if(coachExplicitRecall(message)&&!coachingBrainSafety'),send.indexOf('// Confirm preferred-name changes'))
 assert.match(recall,/!coachingBrainSafety\(currentInput\)&&!coachingBrainBoundary\(currentInput\)/)
 assert.match(recall,/void loadPrivateRecall\(responseLocale\)/)
 assert.doesNotMatch(recall,/await |setBusy\(/)
 assert.match(recall,/!commitCompletedClientTurn\(requestId,message,\{role:'assistant',content:acknowledgment/)
 assert.doesNotMatch(recall,/fetch\(|appFetch\(|commitGoalTurn\(/)
 assert.match(recall,/mode:'identity'/)
 const identity=send.slice(send.indexOf('if(isNameCorrection&&!coachingBrainSafety'),send.indexOf('// The last opening turn'))
 assert.match(identity,/!coachingBrainSafety\(currentInput\)&&!coachingBrainBoundary\(currentInput\)/)
 assert.match(identity,/!commitCompletedClientTurn\(requestId,message,/)
 assert.ok(identity.indexOf('result.saved!==true')<identity.indexOf('confirmedNameRef.current=candidate'))
 const knownOpening=send.slice(send.indexOf('if(greetingIdentity.name&&!openingProgress.completed'),send.indexOf('// The review of an existing profile'))
 assert.match(knownOpening,/coachOpeningTurn\(/)
 assert.match(knownOpening,/!commitCompletedClientTurn\(requestId,message,/)
 assert.doesNotMatch(knownOpening,/fetch\(|appFetch\(|setTurns\(/)
  // Two extra exits are first-party name correction and confirmation. The course exit is the local verified-course opening handoff, not another
  // provider call or unguarded write. Keep the safety/boundary and commit gates.
  const handoff=send.slice(send.indexOf('if(courseGateOpeningAfter('),send.indexOf('if(greetingIdentity.name&&!openingProgress.completed'))
  assert.match(handoff,/!coachingBrainSafety\(currentInput\)&&!coachingBrainBoundary\(currentInput\)/)
  assert.match(handoff,/courseGateHandoffText\(responseLocale\)/)
  assert.match(handoff,/!commitCompletedClientTurn\(requestId,message,\{role:'assistant',content:answer,locale:responseLocale,mode:'offline',stage:'opening'\}\)\)return null/)
  assert.doesNotMatch(handoff,/fetch\(|appFetch\(|setTurns\(/)
  const commit=ui.slice(ui.indexOf('function commitCompletedClientTurn'),ui.indexOf('async function discardPrivateDraft'))
  assert.match(commit,/turnRequestRef.current!==requestId\|\|inFlightClientRef.current\?\.requestId!==requestId/)
  assert.doesNotMatch(ui,/return updated\.slice\(-160\)/)
  assert.match(ui,/coachProtocolRoomForExchange\(turnsRef.current,message\)/)
  // The report retains up to 80 complete exchanges; inference still sees at most ten context turns.
  assert.doesNotMatch(ui,/sessionStorage|localStorage|sendBeacon/)
})

test('long speech retains three verbatim earlier details without model-written memory',()=>{
  const long=['I want to reduce overtime and still keep the job I have enjoyed for years.',
    'For example, last week there were three evening meetings that I could not attend.',
    'Because I care for my daughter after school, I cannot work late even on busy days.',
    'The background here is '.repeat(16)].join(' ')
  const rows=[user(long),coach('Tell me more.'),...filler(70,'en')]
  const recent=coachTurnWindow(rows,10)
  const context=coachEphemeralContext(rows,recent,'en','I am still exploring that.')
  assert.ok(context.some(q=>q.includes('reduce overtime')))
  assert.ok(context.some(q=>q.includes('evening meetings')))
  assert.ok(context.some(q=>q.includes('care for my daughter')))
  assert.ok(context.every(q=>q.length<=220&&long.includes(q)))
  assert.ok(verbatimClientClauses(long).every(q=>long.includes(q)))
  assert.deepEqual(verbatimClientClauses('I want to reveal sk-or-v1-ABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234'),[])
})

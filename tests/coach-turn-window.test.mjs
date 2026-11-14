import test from 'node:test'
import assert from 'node:assert/strict'
import {coachTurnWindow} from '../lib/coaching/coach-turn-window.mjs'
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

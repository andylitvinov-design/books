import test from 'node:test'
import assert from 'node:assert/strict'
import {createCoachBargeGate,isCoachBargeEcho} from '../lib/personal-coaching/coach-barge-in.mjs'

test('two-step barge gate ducks on voice candidate then interrupts only on sustained voice',()=>{
 const gate=createCoachBargeGate()
 assert.equal(gate.update(.002),'idle')
 assert.equal(gate.update(.09),'idle')
 assert.equal(gate.update(.09),'candidate')
 assert.equal(gate.update(.08),'pending')
 assert.equal(gate.update(.08),'pending')
 assert.equal(gate.update(.08),'interrupt')
 assert.equal(gate.update(.08),'confirmed')
})
test('speaker echo that vanishes during duck restores audio without a turn',()=>{
 const gate=createCoachBargeGate()
 gate.update(.09); assert.equal(gate.update(.09),'candidate')
 assert.equal(gate.update(.002),'pending')
 assert.equal(gate.update(.002),'restore')
 assert.equal(gate.update(.002),'idle')
})
test('noise floor is adaptive and random silence never creates a false request',()=>{
 const gate=createCoachBargeGate()
 for(let i=0;i<100;i++)assert.equal(gate.update(.01),'idle')
 assert.equal(gate.state,'idle')
})
test('reject only substantial reproduced coach text, not short human replies',()=>{
 assert.equal(isCoachBargeEcho('Мы можем выбрать один небольшой шаг', 'Давай посмотрим вместе. Мы можем выбрать один небольшой шаг сегодня?'),true)
 assert.equal(isCoachBargeEcho('Я хотел сказать другое, мне нужно больше времени и поддержки', 'Давай посмотрим вместе. Мы можем выбрать один небольшой шаг сегодня?'),false)
 assert.equal(isCoachBargeEcho('Да', 'Давай посмотрим вместе. Мы можем выбрать один небольшой шаг сегодня?'),false)
})

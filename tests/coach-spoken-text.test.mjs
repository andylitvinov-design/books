import test from 'node:test'
import assert from 'node:assert/strict'
import {coachSpokenText} from '../lib/coaching/coach-spoken-text.mjs'

test('short natural answer plus question is spoken in full RU/EN/ES',()=>{
  for(const reply of [
    'You said work feels overwhelming. We can explore that. What would help now?',
    'Вы сказали, что не хватает времени. Обсудим нагрузку. Что важнее сейчас?',
    'Aclaramos que falta tiempo. ¿Qué podemos explorar?',
    'We can simply talk without another question.'
  ])assert.deepEqual(coachSpokenText(reply),{text:reply,truncated:false})
})
test('long Chirp excerpt leads with the actual answer, not the last question',()=>{
 const intro='You are not asking for a measurable goal today. We can talk about workload. '
 const input=intro+'A long explanation of the context and choice. '.repeat(25)+'How can you measure the result?'
 const o=coachSpokenText(input)
 assert.equal(o.truncated,true)
 assert.ok(o.text.startsWith('You are not asking'))
 assert.ok(o.text.endsWith('…'))
 assert.ok(!o.text.includes('How can you measure'))
 assert.ok(o.text.length<=500)
 assert.ok(new TextEncoder().encode(o.text).byteLength<=1600)
})
test('Cyrillic, Chinese and emoji obey both limits without damaged surrogate pairs',()=>{
 for(const raw of [
    'Привет. Давайте вместе поговорим. '.repeat(50),
    '你好，我们可以讨论这个问题。'.repeat(65),
    '🙂 Давайте обсудим этот вопрос. '.repeat(50),
 ]){
  const o=coachSpokenText(raw)
  assert.equal(o.truncated,true)
  assert.ok(o.text.length<=500)
  assert.ok(new TextEncoder().encode(o.text).byteLength<=1600)
  assert.ok(!o.text.includes('�'))
  assert.ok(!/[\uD800-\uDBFF]$/u.test(o.text.slice(0,-1)))
 }
})
test('invalid/empty text is never invented',()=>{
 assert.deepEqual(coachSpokenText(null),{text:'',truncated:false})
 assert.deepEqual(coachSpokenText('  '),{text:'',truncated:false})
})

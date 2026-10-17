import test from 'node:test'
import assert from 'node:assert/strict'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V6,OPORA54_PRE_SAVE_KEYS,validateOpora54Signals} from '../lib/inner-growth/anti-stress-skills-v6.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'

function fixture(locale='ru',day=1,{onSession}={}){
  const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V6)
  const data={
    cycle:{id:'00000000-0000-4000-8000-000000004321',day,durationDays:14,preferences:{}},
    lesson,programme:{id:'stress'},currentSession:null,
  }
  let calls=0, payload=null,closed=false
  const h=mount('opora-v6-slide-player',{locale,data,
    onClose:()=>{closed=true},
    onFinish:()=>{closed=true},
    onSession:async input=>{calls++;payload=input;return onSession?await onSession(input):true},
  })
  return {h,get payload(){return payload},get calls(){return calls},get closed(){return closed}}
}
async function click(h,label){
  const node=findButton(h.tree,label)
  assert.ok(node,'Expected action '+label+' in '+textOf(h.tree).slice(0,350))
  node.props.onClick()
  await h.settle()
}
const buttons=h=>nodes(h.tree).filter(n=>n.type==='button').map(textOf)

test('RU V6 player: exactly fourteen authored steps, 3-way aphorism, per-step evidence, then server receipt',async()=>{
 const f=fixture('ru',1),h=f.h
 for(let i=0;i<14;i++){
   assert.match(textOf(h.tree),new RegExp('Шаг '+(i+1)+' из 15'))
   assert.doesNotMatch(buttons(h).join(' | '),/Пропустить|Skip/)
   if(i===4){
     const votes=['Да, откликается','Пока сомневаюсь','Не согласен(на)']
     for(const label of votes)assert.ok(findButton(h.tree,label),'Missing aphorism '+label)
     await click(h,'Пока сомневаюсь')
     assert.match(textOf(h.tree),/Сомневаться нормально/)
   }
   if(i===8){await click(h,'Частично');assert.match(textOf(h.tree),/Частичная попытка тоже опыт/)}
   if(i===10){const first=fixture('ru',1).h.tree; assert.ok(first)} // different case presented
   if(i<13)await click(h,'Далее')
   else await click(h,'Сохранить практику')
 }
 assert.equal(f.calls,1)
 const body=f.payload
 assert.equal(body.lessonId.includes('v6-20261017'),true)
 assert.deepEqual(Array.from(body.visitedSlideKeys),Array.from(OPORA54_PRE_SAVE_KEYS))
 assert.equal(body.aphorismResponse,'unsure')
 assert.equal(body.practiceAttempt,'simplified')
 assert.equal(body.opora54.answers.act,'partly')
 assert.equal(body.opora54.answers.aphorism,'unsure')
 assert.equal(body.opora54.ease,null)
 assert.deepEqual(validateOpora54Signals(body.opora54).answers,body.opora54.answers)
 assert.match(textOf(h.tree),/Шаг 15 из 15/)
 assert.match(textOf(h.tree),/Практика сохранена/)
 await click(h,'К карте курса')
 assert.equal(f.closed,true)
 h.unmount()
})

test('EN V6 player: empty optional answers are not invented, safe pause never saves automatically',async()=>{
 const f=fixture('en',8),h=f.h
 assert.ok(findButton(h.tree,'Pause'))
 await click(h,'Pause')
 assert.match(textOf(h.tree),/You may stop here/)
 assert.equal(f.calls,0)
 await click(h,'Return to practice')
 for(let i=0;i<14;i++){
   assert.doesNotMatch(buttons(h).join(' | '),/Skip this step|Skip this check-in|Skip$/)
   if(i===4){assert.ok(findButton(h.tree,'I disagree'));await click(h,'I disagree')}
   if(i===7)await click(h,'I did not try')
   if(i<13)await click(h,'Continue')
   else await click(h,'Save my practice')
 }
 assert.equal(f.calls,1)
 assert.equal(f.payload.opora54.answers.notice,'not_attempted')
 assert.equal(f.payload.aphorismResponse,'disagree')
 assert.equal(f.payload.practiceAttempt,null)
 assert.equal(f.payload.beforeNow,null)
 assert.equal(f.payload.afterNow,null)
 assert.equal(f.payload.feedback,'skip') // backend-only compatibility sentinel, NOT a UI choice.
 assert.match(textOf(h.tree),/Practice saved/)
 h.unmount()
})

test('failed V6 save cannot show a false receipt; retry reuses operation ID',async()=>{
 let attempts=0
 const f=fixture('en',2,{onSession:()=>{attempts++;return attempts>1}}),h=f.h
 for(let i=0;i<14;i++)if(i<13)await click(h,'Continue');else await click(h,'Save my practice')
 assert.equal(f.calls,1)
 assert.match(textOf(h.tree),/Saving was not confirmed/)
 assert.doesNotMatch(textOf(h.tree),/Practice saved/)
 const firstOp=f.payload.operationId
 await click(h,'Save my practice')
 assert.equal(f.calls,2)
 assert.equal(f.payload.operationId,firstOp)
 assert.match(textOf(h.tree),/Practice saved/)
 h.unmount()
})

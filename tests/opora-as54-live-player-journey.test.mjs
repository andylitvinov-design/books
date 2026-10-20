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
    onSession:async input=>{calls++;payload=structuredClone(input);return onSession?await onSession(input):true},
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
 const lesson=lessonFor('calm_regulation',1,'ru','standard',COURSE_ANTISTRESS_SKILLS_V6)
 assert.equal(lesson.opora54.exercises.notice.a.length,3)
 for(let i=0;i<14;i++){
   assert.match(textOf(h.tree),new RegExp('Шаг\\s+'+(i+1)+'\\s+из\\s+15'))
   assert.doesNotMatch(buttons(h).join(' | '),/Пропустить|Skip/)
   if(i===4){
     const votes=['Да, откликается','Пока сомневаюсь','Не согласен(на)']
     for(const label of votes)assert.ok(findButton(h.tree,label),'Missing aphorism '+label)
     await click(h,'Пока сомневаюсь')
     assert.match(textOf(h.tree),/Сомневаться нормально/)
   }
   if(i===7){
     await click(h,lesson.opora54.exercises.notice.a[0])
     assert.ok(textOf(h.tree).includes(lesson.opora54.exercises.notice.f[0]),'feedback follows the selected detail')
     await click(h,'Не пробовал(а)')
   }
   if(i===8){
     await click(h,'Отложить необязательную задачу')
     assert.match(textOf(h.tree),/Вы выбрали один посильный вариант/)
     await click(h,'Частично')
     assert.match(textOf(h.tree),/Частичная попытка тоже опыт/)
   }
   if(i===11){
     await click(h,'Отложить необязательную задачу')
     assert.match(textOf(h.tree),/возможный шаг на будущее/)
     await click(h,'Составил(а) план')
   }
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
 assert.equal(body.opora54.answers.actChoice,'one')
 assert.equal(body.opora54.answers.noticeChoice,'one')
 assert.equal(body.opora54.answers.aphorism,'unsure')
 assert.equal(body.opora54.answers.transferChoice,'one')
 assert.equal(body.opora54.answers.transfer,'planned')
 assert.equal(body.transferStage,'plan')
 assert.equal(body.opora54.ease,null)
 assert.deepEqual(validateOpora54Signals(body.opora54).answers,body.opora54.answers)
 assert.match(textOf(h.tree),/Шаг\s+15\s+из\s+15/)
 assert.match(textOf(h.tree),/Практика сохранена/)
 await click(h,'К карте курса')
 assert.equal(f.closed,true)
 h.unmount()
})

test('EN V6 player: empty optional answers are not invented, safe pause never saves automatically',async()=>{
 const f=fixture('en',8),h=f.h
 const lesson=lessonFor('calm_regulation',8,'en','standard',COURSE_ANTISTRESS_SKILLS_V6)
 assert.equal(lesson.opora54.exercises.notice.a.length,3)
 assert.ok(findButton(h.tree,'Pause'))
 await click(h,'Pause')
 assert.match(textOf(h.tree),/You may stop here/)
 assert.equal(f.calls,0)
 await click(h,'Return to practice')
 for(let i=0;i<14;i++){
   assert.doesNotMatch(buttons(h).join(' | '),/Skip this step|Skip this check-in|Skip$/)
   if(i===4){assert.ok(findButton(h.tree,'I disagree'));await click(h,'I disagree')}
   if(i===7){
     await click(h,lesson.opora54.exercises.notice.a[0])
     assert.ok(textOf(h.tree).includes(lesson.opora54.exercises.notice.f[0]),'feedback follows actual bilingual day activity')
     await click(h,'I did not try')
   }
   if(i<13)await click(h,'Continue')
   else await click(h,'Save my practice')
 }
 assert.equal(f.calls,1)
 assert.equal(f.payload.opora54.answers.notice,'not_attempted')
 assert.equal(f.payload.opora54.answers.noticeChoice,'one')
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

test('every bilingual day traverses fifteen screens and saves honest action evidence',async()=>{
  for(const locale of ['ru','en'])for(let day=1;day<=14;day++){
    const f=fixture(locale,day),h=f.h,lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V6)
    const next=locale==='ru'?'Далее':'Continue'
    const save=locale==='ru'?'Сохранить практику':'Save my practice'
    for(let i=0;i<14;i++){
      assert.doesNotMatch(buttons(h).join(' | '),/Пропустить|Skip this|Skip step/, 'day '+day+' '+locale+' screen '+(i+1))
      if(i===4)await click(h,locale==='ru'?'Пока сомневаюсь':'Not sure yet')
      if(i===7){
        await click(h,lesson.opora54.exercises.notice.a[0])
        await click(h,locale==='ru'?'Частично':'Partly')
      }
      if(i===8){
        await click(h,lesson.opora54.exercises.act.choices[0])
        await click(h,locale==='ru'?'Частично':'Partly')
      }
      if(i===11){
        await click(h,lesson.opora54.exercises.transfer.choices[0])
        await click(h,locale==='ru'?'Составил(а) план':'Made a plan')
      }
      if(i<13)await click(h,next);else await click(h,save)
    }
    assert.equal(f.calls,1,'one request for '+locale+' '+day)
    assert.equal(f.payload.aphorismResponse,'unsure')
    assert.equal(f.payload.opora54.answers.noticeChoice,'one')
    assert.equal(f.payload.opora54.answers.actChoice,'one')
    assert.equal(f.payload.opora54.answers.act,'partly')
    assert.equal(f.payload.opora54.answers.transferChoice,'one')
    assert.equal(f.payload.opora54.answers.transfer,'planned')
    assert.deepEqual(f.payload.visitedSlideKeys,Array.from(OPORA54_PRE_SAVE_KEYS))
    assert.equal(f.payload.practiceAttempt,'simplified')
    assert.equal(f.payload.opora54.ease,null)
    assert.match(textOf(h.tree),locale==='ru'?/Практика сохранена/:/Practice saved/)
    h.unmount()
  }
})

test('editing or withdrawing a reported attempt clears the optional 0–3 ease rating',async()=>{
  const f=fixture('ru',3),h=f.h,lesson=lessonFor('calm_regulation',3,'ru','standard',COURSE_ANTISTRESS_SKILLS_V6)
  for(let i=0;i<9;i++){
    if(i===8){
      await click(h,lesson.opora54.exercises.act.choices[0])
      await click(h,'Получилось')
      await click(h,'2')
      assert.match(textOf(h.tree),/Насколько было доступно попробовать/)
      await click(h,'Изменить выбор')
      await click(h,lesson.opora54.exercises.act.choices[1])
      await click(h,'Не пробовал(а)')
      assert.doesNotMatch(textOf(h.tree),/Насколько было доступно попробовать/)
    }
    await click(h,'Далее')
  }
  for(let i=9;i<14;i++)if(i<13)await click(h,'Далее');else await click(h,'Сохранить практику')
  assert.equal(f.calls,1)
  assert.equal(f.payload.opora54.ease,null)
  assert.equal(f.payload.opora54.answers.act,'not_attempted')
  assert.equal(f.payload.practiceAttempt,null)
  h.unmount()
})

test('answers are coached according to the screen, never interpreted as a clinical score',async()=>{
 const f=fixture('ru',1),h=f.h
 await click(h,'Трудно сказать')
 assert.match(textOf(h.tree),/Необязательно точно называть состояние/)
 assert.doesNotMatch(textOf(h.tree),/Не нужно принимать афоризм/)
 await click(h,'Далее') // optional 0–10
 await click(h,'Далее')
 await click(h,'Далее') // choose pace only by navigation
 await click(h,'Пока не уверен(а)')
 assert.match(textOf(h.tree),/Не нужно выбирать идеальную цель/)
 await click(h,'Далее')
 await click(h,'Пока сомневаюсь')
 assert.match(textOf(h.tree),/Сомневаться нормально/)
 assert.doesNotMatch(buttons(h).join(' | '),/Пропустить/)
 h.unmount()
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {validateOpora54Signals,opora54BlueprintValid} from '../lib/inner-growth/anti-stress-skills-v6.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'

function fixture(locale='ru',day=1){
 const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
 const data={programme:{id:'stress'},lesson,cycle:{id:'00000000-0000-4000-8000-000000021811',day,durationDays:14,preferences:{}},currentSession:null}
 let payload=null,requests=0,closed=false
 const h=mount('opora-v6-slide-player',{locale,data,onClose:()=>{closed=true},
   onFinish:()=>{closed=true},
   onSession:async body=>{requests++;payload=structuredClone(body);return true}})
 return {h,lesson,get payload(){return payload},get requests(){return requests},get closed(){return closed}}
}
async function click(h,label){
 const button=findButton(h.tree,label)
 assert.ok(button,'Missing choice "'+label+'" in '+textOf(h.tree).slice(0,600))
 button.props.onClick()
 await h.settle()
}
const answerButtons=h=>nodes(h.tree).filter(n=>n.type==='button').map(textOf)

test('V7 14-day curriculum still has three meaningful exercise cards and an honest attempt validator',()=>{
 assert.equal(opora54BlueprintValid(),true)
 assert.throws(()=>validateOpora54Signals({answers:{rehearse:'independent'},hints:['rehearse']}),/INVALID_OPORA54_INDEPENDENCE/)
 for(const locale of ['en','ru'])for(let day=1;day<=14;day++){
   const v=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
   assert.equal(v.antiStress.slideModel,'opora-fifteen-screens-v1')
   for(const kind of ['notice','act','transfer']){
     const exercise=v.opora54.exercises[kind]
     const options=kind==='notice'?exercise.a:exercise.choices
     assert.equal(options.length,3,'day '+day+' '+locale+' '+kind)
     // Single-word feeling labels (e.g. "Досада", "Relief") are
     // intentional low-load responses to a prompt, not broken content.
     // Action and transfer choices must remain concrete sentences.
     const minLength=kind==='notice'?3:12
     assert.ok(options.every(x=>typeof x==='string'&&x.trim().length>=minLength),
       'Expected meaningful '+kind+' labels on '+locale+' day '+day)
   }
   assert.equal(v.opora54.scenario.choices.length,3)
   assert.equal(v.opora54.scenario.feedback.length,3)
 }
})

test('Pause makes underlying V7 exercise inert, keeps safe controls keyboard-accessible and does not save',async()=>{
 const f=fixture('en',8),h=f.h
 await click(h,'Pause')
 const dialog=nodes(h.tree).find(n=>n.props?.role==='alertdialog')
 assert.ok(dialog,'Expected accessible alertdialog for safety')
 assert.equal(dialog.props['aria-modal'],'true')
 assert.equal(typeof dialog.props.onKeyDown,'function','Escape and Tab should be handled')
 const safeButtons=nodes(dialog).filter(n=>n.type==='button')
 assert.equal(safeButtons.length,3,'Pause needs three keyboard reachable safe actions')
 let tabBlocked=false
 dialog.props.onKeyDown({key:'Tab',shiftKey:false,target:safeButtons[2].props.ref?.current,
   preventDefault(){tabBlocked=true}})
 assert.equal(tabBlocked,true,'Tab on last safe action must wrap inside dialog')
 const frame=nodes(h.tree).find(n=>n.type==='div'&&n.props?.inert===true)
 assert.ok(frame,'The underlying lesson must be inert while Pause is active')
 assert.equal(frame.props['aria-hidden'],'true')
 assert.ok(findButton(h.tree,'Continue with a neutral anchor'))
 assert.equal(f.requests,0)
 let prevented=false
 dialog.props.onKeyDown({key:'Escape',preventDefault(){prevented=true}})
 await h.settle()
 assert.equal(prevented,true)
 assert.equal(nodes(h.tree).some(n=>n.props?.role==='alertdialog'),false)
 assert.equal(f.requests,0)
 assert.ok(findButton(h.tree,'Pause'))
 await click(h,'Pause')
 await click(h,'Return to practice')
 assert.equal(nodes(h.tree).some(n=>n.props?.role==='alertdialog'),false)
 assert.equal(f.requests,0)
 h.unmount()
})

test('RU V7 not-yet/not-tried and no-plan responses require no pretend action',async()=>{
 const f=fixture('ru',1),h=f.h
 for(let i=0;i<7;i++)await click(h,'Далее')
 assert.ok(findButton(h.tree,'Не пробовал(а)'))
 assert.ok(findButton(h.tree,'Пока нет'))
 await click(h,'Не пробовал(а)')
 assert.match(textOf(h.tree),/не будем отмечать его как выполненное/)
 await click(h,'Далее')
 assert.ok(findButton(h.tree,'Пока нет'))
 await click(h,'Пока нет')
 // Repeat and the new scenario remain optional, not proof of real practice.
 for(let i=9;i<12;i++)await click(h,'Далее')
 assert.ok(findButton(h.tree,'Сегодня не планирую'))
 await click(h,'Сегодня не планирую')
 assert.match(textOf(h.tree),/Планировать на сегодня необязательно|можно оставить план пустым/)
 await click(h,'Далее')
 await click(h,'Далее')
 await click(h,'Сохранить практику')
 assert.equal(f.requests,1)
 assert.equal(f.payload.opora54.answers.notice,'not_attempted')
 assert.equal(f.payload.opora54.answers.act,'not_yet')
 assert.equal(f.payload.opora54.answers.transfer,'not_planning')
 assert.equal(f.payload.opora54.answers.noticeChoice,undefined)
 assert.equal(f.payload.opora54.answers.actChoice,undefined)
 assert.equal(f.payload.opora54.answers.transferChoice,undefined)
 assert.equal(f.payload.practiceAttempt,null)
 assert.equal(f.payload.transferStage,null)
 assert.match(textOf(h.tree),/Практика сохранена/)
 const receipt=textOf(h.tree)
 assert.match(receipt,/Пока не получилось/)
 assert.match(receipt,/Сегодня без плана/)
 assert.doesNotMatch(receipt,/Выбранное упражнение/)
 assert.doesNotMatch(receipt,/100% освоено|выполнено самостоятельно/)
 h.unmount()
})

test('V7 never turns a click or a hint into independent mastery',async()=>{
 const f=fixture('en',12),h=f.h
 // Opening and browsing do not create self-reported practice.
 for(let i=0;i<10;i++){
   if(i===4)await click(h,'Not sure yet')
   if(i===9){
     await click(h,'Show a hint')
     assert.match(textOf(h.tree),/A hint is help|normal part of learning|Nothing needs to be proved|Try a smaller step/i)
     await click(h,'On my own')
   }
   await click(h,'Continue')
 }
 for(let i=10;i<14;i++)if(i<13)await click(h,'Continue');else await click(h,'Save my practice')
 assert.equal(f.requests,1)
 assert.equal(f.payload.opora54.answers.rehearse,'guided')
 assert.ok(f.payload.opora54.hints.includes('rehearse'))
 assert.notEqual(f.payload.practiceAttempt,'independent')
 assert.doesNotMatch(answerButtons(h).join(' | '),/Skip this step|Skip this check-in/)
 h.unmount()
})

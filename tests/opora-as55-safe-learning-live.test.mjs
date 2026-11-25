import test from 'node:test'
import assert from 'node:assert/strict'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {oporaNoticeActivity} from '../lib/inner-growth/opora-v6-exercise-cards.js'
import {oporaCompactDay} from '../lib/inner-growth/opora-compact-copy-v6.js'
import {opora55Case} from '../lib/inner-growth/opora-as55-learning-cases.js'
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
function assertConcreteChoices(options,context){
 assert.equal(options.length,3,context)
 assert.ok(options.every(x=>typeof x==='string'&&x.trim().length>0),context+' needs nonempty labels')
 const normalized=options.map(x=>x.trim().toLocaleLowerCase())
 assert.equal(new Set(normalized).size,3,context+' needs distinct choices')
 for(const label of options)assert.doesNotMatch(label.trim(),
   /^(?:[abc123]|one|two|three|skip|пропустить|todo|placeholder|lorem ipsum|(?:option|choice|вариант|ответ)\s*(?:[abc123]|one|two|three|один|два|три))$/i,
   context+' must name a concrete detail, action or plan rather than a placeholder')
}

test('V7 14-day curriculum still has three meaningful exercise cards and an honest attempt validator',()=>{
 assert.equal(opora54BlueprintValid(),true)
 assert.throws(()=>validateOpora54Signals({answers:{rehearse:'independent'},hints:['rehearse']}),/INVALID_OPORA54_INDEPENDENCE/)
 for(const locale of ['en','ru'])for(let day=1;day<=14;day++){
   const v=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
   assert.equal(v.antiStress.slideModel,'opora-fifteen-screens-v1')
   for(const kind of ['notice','act','transfer']){
     const exercise=v.opora54.exercises[kind]
     const options=kind==='notice'?exercise.a:exercise.choices
     assertConcreteChoices(options,'day '+day+' '+locale+' '+kind)
     // Single-word feeling labels are intentional low-load responses.
     // Keep the owner's sentence-length guard for action and transfer choices.
     const minLength=kind==='notice'?3:12
     assert.ok(options.every(x=>x.trim().length>=minLength),
       'Expected meaningful '+kind+' labels on '+locale+' day '+day)
     const authored=kind==='notice'?oporaNoticeActivity(day,locale).a
       :kind==='act'?oporaCompactDay(day,locale).choices:opora55Case(day,locale).transfer
     assert.deepEqual(options,authored,'The actual lesson retains the reviewed exercise choices')
     if(kind==='notice'){
       assert.ok(exercise.q.trim().length>0,'A short choice is explained by its actual question')
       assert.equal(exercise.f.length,3)
       assert.ok(exercise.f.every(feedback=>typeof feedback==='string'&&feedback.trim().length>0))
       assert.equal(new Set(exercise.f).size,3,'Each concrete choice has its own contextual explanation')
     }
   }
   assert.equal(v.opora54.scenario.choices.length,3)
   assert.equal(v.opora54.scenario.feedback.length,3)
 }
 assert.deepEqual(oporaNoticeActivity(4,'en').a,['Disappointment','Sadness','Relief'])
 assert.deepEqual(oporaNoticeActivity(6,'ru').a,['Время','Силы','Возможность сразу ответить'])
})

test('choice content guards reject blank, duplicate and generic labels while honest short vocabulary remains valid',()=>{
 assertConcreteChoices(['Sadness','Relief','Disappointment'],'Emotion names')
 for(const invalid of [['','Relief','Sadness'],['Sadness','sadness ','Relief'],
   ['Choice one','Choice two','Choice three'],['A','B','C'],['TODO','Relief','Sadness'],
   ['Пропустить','Грусть','Досада'],[null,'Relief','Sadness']]){
   assert.throws(()=>assertConcreteChoices(invalid,'negative fixture'))
 }
})

test('positive attempts and future plans require a selected exercise; non-attempts never invent one',()=>{
 for(const [role,states,choiceField] of [
   ['notice',['tried','partly'],'noticeChoice'],['act',['tried','partly'],'actChoice'],
   ['transfer',['planned','imagined'],'transferChoice'],
 ])for(const state of states){
   assert.throws(()=>validateOpora54Signals({answers:{[role]:state}}),/INVALID_OPORA54_(ATTEMPT|TRANSFER)/)
   const valid=validateOpora54Signals({answers:{[role]:state,[choiceField]:'one'}})
   assert.equal(valid.answers[role],state)
   assert.equal(valid.answers[choiceField],'one')
 }
 for(const role of ['notice','act'])for(const state of ['not_yet','not_attempted','uncomfortable']){
   const result=validateOpora54Signals({answers:{[role]:state}})
   assert.equal(result.answers[role],state)
   assert.equal(result.answers[role+'Choice'],undefined)
 }
 assert.deepEqual(validateOpora54Signals({answers:{transfer:'not_planning'}}).answers,{transfer:'not_planning'})
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

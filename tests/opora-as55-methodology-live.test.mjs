import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {opora55Day,opora55CurriculumValid,COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {opora54Day,COURSE_ANTISTRESS_SKILLS_V6,OPORA54_PRE_SAVE_KEYS,validateOpora54Signals} from '../lib/inner-growth/anti-stress-skills-v6.js'
import {opora55CasesValid} from '../lib/inner-growth/opora-as55-learning-cases.js'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {buildCourseSlides,verifyCourseSlideVisitOrder} from '../lib/inner-growth/course-slide-sequence.js'
import {antiStressBlueprint} from '../lib/inner-growth/anti-stress-blueprint.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const keys=['welcome','baseline','pace','focus','aphorism','demo','prepare','notice','act','rehearse','scenario','transfer','reflection','save']

test('14 days × RU/EN teach distinct screen 8/9/10/11/12 tasks in correct order',()=>{
  assert.equal(opora55CasesValid(),true)
  assert.equal(opora55CurriculumValid(),true)
  for(const locale of ['ru','en']){
    for(let day=1;day<=14;day++){
      const before=opora54Day(day,locale)
      const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
      const revised=opora55Day(day,locale)
      const steps=buildCourseSlides(lesson)
      assert.deepEqual(steps.map(x=>x.key),keys)
      assert.equal(lesson.version,COURSE_ANTISTRESS_SKILLS_V7)
      assert.equal(lesson.opora54.lessonMethodVersion,'AS-5.5')
      assert.equal(steps[4].kind,'aphorism')
      assert.equal(steps[7].kind,'notice')
      assert.equal(steps[8].kind,'act')
      assert.equal(steps[9].kind,'rehearse')
      assert.equal(steps[10].kind,'scenario')
      assert.equal(steps[11].kind,'transfer')
      assert.equal(steps[12].kind,'reflection')
      assert.equal(steps[13].kind,'save')
      assert.equal(verifyCourseSlideVisitOrder(steps,steps.map(s=>s.key)),true)
      assert.equal(verifyCourseSlideVisitOrder(steps,steps.slice(0,-1).map(s=>s.key)),false)
      assert.notEqual(revised.scenario.prompt,before.scenario.prompt)
      assert.notEqual(revised.scenario.prompt,steps[8].text)
      assert.equal(revised.scenario.feedback.length,3)
      assert.ok(revised.scenario.feedback.every(x=>x.length>=30))
      assert.equal(new Set(revised.scenario.feedback).size,3)
      assert.equal(revised.exercises.transfer.choices.length,3)
      assert.ok(revised.exercises.transfer.choices.every(x=>!revised.exercises.act.choices.includes(x)))
      assert.ok(revised.hints.act.length>25&&revised.hints.rehearse.length>25)
      assert.ok(revised.transferBackup.length>35)
      assert.ok(revised.scenario.prompt.length>48)
      assert.notEqual(steps[7].text,steps[8].text)
      assert.notEqual(steps[9].text,steps[10].text)
      assert.notEqual(steps[10].text,steps[11].text)
    }
  }
})

test('V7 only for new AS2; V6/V5/V3 old lesson ids and slide orders never migrate',()=>{
  const server=read('lib/app/growth-daily.js')
  const library=read('lib/inner-growth/lesson-library.js')
  for(const lang of ['en','ru']){
    for(let day of [1,5,7,8,12,14]){
      const v6=lessonFor('calm_regulation',day,lang,'standard',COURSE_ANTISTRESS_SKILLS_V6)
      const v7=lessonFor('calm_regulation',day,lang,'standard',COURSE_ANTISTRESS_SKILLS_V7)
      assert.notEqual(v6.id,v7.id)
      assert.equal(buildCourseSlides(v6).length,14)
      assert.equal(buildCourseSlides(v7).length,14)
      assert.equal(opora54Day(day,lang).scenario.prompt,v6.opora54.scenario.prompt)
      assert.notEqual(v6.opora54.exercises.transfer.choices[0],v7.opora54.exercises.transfer.choices[0])
    }
  }
  assert.match(server,/\? COURSE_ANTISTRESS_SKILLS_V7 : COURSE_CONTENT_V4/)
  assert.match(server,/value === COURSE_ANTISTRESS_SKILLS_V7/)
  assert.match(server,/\[COURSE_ANTISTRESS_SKILLS_V6,COURSE_ANTISTRESS_SKILLS_V7\]\.includes\(version\)/)
  assert.match(server,/validateOpora54Signals\(input\.opora54\)/)
  assert.match(server,/as-5\.5-fifteen-screens-v1/)
  assert.match(library,/opora55Day\(day,locale\)/)
  for(const locale of ['ru','en','es']){
    const data=antiStressBlueprint(locale)
    assert.equal(data.days.length,14)
    assert.ok(data.days.every(d=>d.screens.length===15&&d.methodVersion==='AS-5.5'))
  }
})

async function click(h,label){
 const node=findButton(h.tree,label)
 assert.ok(node,'Button not found: '+label)
 node.props.onClick()
 await h.settle()
}

test('V7 actual player: scenario feedback depends on specific choice; unattempted without forced action; separate real plan',async()=>{
 const locale='ru',day=5
 const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
 let submitted=null
 const fixture={cycle:{id:'00000000-0000-4000-8000-000000004991',day,preferences:{}},
   programme:{id:'stress'},lesson,currentSession:null}
 const h=mount('opora-v6-slide-player',{locale,data:fixture,onClose(){},onFinish(){},
   onSession:async body=>{submitted=structuredClone(body);return true}})
 for(let i=0;i<14;i++){
   if(i===1){await click(h,'0');await click(h,'0')} // Optional number can be cleared.
   if(i===4){await click(h,'Не согласен(на)')}
   if(i===7){await click(h,'Не пробовал(а)') // Honest non-attempt requires no pretend micro-choice.
     assert.match(textOf(h.tree),/не будем отмечать его как выполненное/i)}
   if(i===8){
     await click(h,lesson.opora54.exercises.act.choices[0])
     await click(h,'Частично')
   }
   if(i===10){
     const item=lesson.opora54.scenario
     await click(h,item.choices[1])
     assert.ok(textOf(h.tree).includes(item.feedback[1]),'The second case explanation must be specific')
     await click(h,item.choices[0])
     assert.ok(textOf(h.tree).includes(item.feedback[0]),'Changing case answer changes explanation')
   }
   if(i===11){
     const transfer=lesson.opora54.exercises.transfer.choices
     assert.ok(!lesson.opora54.exercises.act.choices.includes(transfer[0]))
     await click(h,transfer[0])
     assert.ok(textOf(h.tree).includes(lesson.opora54.transferBackup))
     await click(h,'Составил(а) план')
   }
   if(i<13)await click(h,'Далее')
   else await click(h,'Сохранить практику')
 }
 assert.ok(submitted,'server save should be invoked')
 assert.equal(submitted.lessonId,lesson.id)
 assert.equal(submitted.aphorismResponse,'disagree')
 assert.equal(submitted.opora54.answers.notice,'not_attempted')
 assert.equal(submitted.opora54.answers.noticeChoice,undefined)
 assert.equal(submitted.opora54.answers.act,'partly')
 assert.equal(submitted.opora54.answers.scenario,'one')
 assert.equal(submitted.opora54.answers.transfer,'planned')
 assert.equal(submitted.beforeNow,null)
 assert.deepEqual(validateOpora54Signals(submitted.opora54).answers,submitted.opora54.answers)
 assert.match(textOf(h.tree),/Практика сохранена/)
 h.unmount()
})

test('new scenario and transfer copy stays educational, mobile, accessible and non-diagnostic',()=>{
 const js=read('components/app/opora-v6-slide-player.jsx')
 const css=read('components/app/opora-v6-slide-player.module.css')
 assert.match(js,/scenario\?\.feedback\?\./)
 assert.match(js,/authored\?\.hints\?\.\[role\]/)
 assert.match(js,/role==='transfer'&&picked&&authored\?\.transferBackup/)
 assert.match(js,/\['not_yet','not_attempted','uncomfortable'\]/)
 assert.match(js,/role==='transfer'\?\['not_planning'\]/)
 assert.match(js,/inert=\{safety\}/)
 assert.match(js,/ref=\{safetyFirstAction\}/)
 assert.match(js,/setBeforeNow\(v=>v===i\?null:i\)/)
 assert.doesNotMatch(js,/\['skip',/)
 assert.match(js,/setSafety\(true\)/)
 assert.match(js,/if\(response\)\{setSaved\(true\)/)
 assert.match(css,/100dvh/)
 assert.match(css,/prefers-reduced-motion/)
 const parsed=ts.createSourceFile('opora-v6-slide-player.jsx',js,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
 assert.deepEqual(parsed.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')),[])
})

test('V7 can report not-yet, not-attempted and no future plan before picking any action',async()=>{
 const day=1,locale='ru'
 const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
 let submitted=null
 const data={cycle:{id:'00000000-0000-4000-8000-000000008191',day,preferences:{}},
   programme:{id:'stress'},lesson,currentSession:null}
 const h=mount('opora-v6-slide-player',{locale,data,onClose(){},onFinish(){},
   onSession:async body=>{submitted=structuredClone(body);return true}})
 for(let i=0;i<7;i++)await click(h,'Далее')
 assert.ok(findButton(h.tree,'Пока нет'))
 assert.ok(findButton(h.tree,'Не пробовал(а)'))
 assert.ok(findButton(h.tree,'Некомфортно'))
 await click(h,'Пока нет')
 assert.match(textOf(h.tree),/Пока не получилось|это допустимо/)
 await click(h,'Далее')
 assert.ok(findButton(h.tree,'Не пробовал(а)'))
 await click(h,'Не пробовал(а)')
 for(let i=0;i<3;i++)await click(h,'Далее')
 assert.ok(findButton(h.tree,'Сегодня не планирую'))
 await click(h,'Сегодня не планирую')
 assert.match(textOf(h.tree),/Планировать на сегодня необязательно/)
 await click(h,'Далее')
 await click(h,'Далее')
 await click(h,'Сохранить практику')
 assert.ok(submitted)
 assert.equal(submitted.opora54.answers.notice,'not_yet')
 assert.equal(submitted.opora54.answers.act,'not_attempted')
 assert.equal(submitted.opora54.answers.transfer,'not_planning')
 assert.equal(submitted.opora54.answers.noticeChoice,undefined)
 assert.equal(submitted.opora54.answers.actChoice,undefined)
 assert.equal(submitted.opora54.answers.transferChoice,undefined)
 assert.equal(submitted.practiceAttempt,null)
 assert.equal(submitted.transferStage,null)
 assert.match(textOf(h.tree),/Практика сохранена/)
 h.unmount()
})

test('V7 pauses accessibly: focus goes to safe action, background becomes inert and no session saves',async()=>{
 const day=3,locale='en'
 const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
 let saves=0
 const data={cycle:{id:'00000000-0000-4000-8000-000000008192',day,preferences:{}},
   programme:{id:'stress'},lesson,currentSession:null}
 const h=mount('opora-v6-slide-player',{locale,data,onClose(){},onFinish(){},
   onSession:async()=>{saves++;return true}})
 await click(h,'Pause')
 assert.equal(saves,0)
 const dialog=nodes(h.tree).find(n=>n.props?.role==='alertdialog')
 assert.ok(dialog)
 const background=nodes(h.tree).find(n=>n.type==='div'&&n.props?.inert===true)
 assert.ok(background)
 assert.equal(background.props['aria-hidden'],'true')
 assert.ok(findButton(h.tree,'Continue with a neutral anchor'))
 dialog.props.onKeyDown({key:'Escape',preventDefault(){}})
 await h.settle()
 assert.equal(nodes(h.tree).some(n=>n.props?.role==='alertdialog'),false)
 await click(h,'Pause')
 await click(h,'Continue with a neutral anchor')
 assert.equal(nodes(h.tree).some(n=>n.props?.role==='alertdialog'),false)
 assert.equal(saves,0)
 h.unmount()
})

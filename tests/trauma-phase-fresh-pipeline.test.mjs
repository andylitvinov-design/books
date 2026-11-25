import { COURSE_ANTISTRESS_SKILLS_V7 } from '../lib/inner-growth/anti-stress-skills-v7.js'
import { COURSE_ANTISTRESS_SKILLS_V5, OPORA_SKILL_SLIDE_MODEL } from '../lib/inner-growth/anti-stress-skills-v5.js'
import { COURSE_ANTISTRESS_OUTCOME_V3 } from '../lib/inner-growth/lesson-library.js'
import test from 'node:test'
import {courseSingleLessonOutcome} from '../lib/inner-growth/course-single-lesson-outcome.js'
import assert from 'node:assert/strict'
import {repositoryHarness,router,mount,nodes,textOf,findPart,findButton,clone,slideSequence,dayOne} from './helpers/route-pipeline-harness.mjs'

async function traverse(data,locale,{choose=true,checkpoints=false}={}){
  let submitted=null
  const player=mount('course-slide-player',{data,locale,onClose(){},onSession(body){submitted=clone(body);return true}})
  const visited=[],seen=new Set()
  for(let n=0;n<45&&!submitted;n++){
    const frame=nodes(player.tree).find(node=>node.props?.['data-slide-scroller'])
    assert.ok(frame)
    visited.push(frame.props['data-slide-key'])
    const method=findPart(player.tree,'AntiStressMethodActivity')
    if(method){
      seen.add('method')
      const control=mount('anti-stress-method-activity',method.props)
      if(choose){const choice=method.props.activity?.choices[0];if(choice){
        const button=nodes(control.tree).find(node=>node.type==='button'&&textOf(node).includes(choice.label))
        assert.ok(button);button.props.onClick()
      }}
      control.unmount();await player.settle()
    }
    const lab=findPart(player.tree,'AntiStressPracticeLab')
    if(lab){
      seen.add(lab.props.part)
      if(choose&&lab.props.plan){
        const control=mount('anti-stress-practice-lab',lab.props)
        const option=lab.props.plan[lab.props.part].options[0]
        assert.ok(findButton(control.tree,option.label));findButton(control.tree,option.label).props.onClick()
        control.unmount();await player.settle()
      }
    }
    if(checkpoints&&nodes(player.tree).some(node=>node.props?.['data-phase-checkpoints'])){
      for(const check of data.phaseEvidence)assert.ok(textOf(player.tree).includes(check.scene),'Every checkpoint shows its actual scenario before answer choices')
      const choices=nodes(player.tree).filter(node=>node.type==='select')
      assert.equal(choices.length,6)
      for(let i=0;i<choices.length;i+=2){
        const option=nodes(choices[i]).find(node=>node.type==='option'&&node.props.value)
        choices[i].props.onChange({target:{value:option.props.value}})
        await player.settle()
        assert.ok(nodes(player.tree).some(node=>node.props?.['data-phase-selected-answer']!==undefined&&textOf(node)===textOf(option)),'Selected answer remains fully readable as wrapping text')
        const refreshed=nodes(player.tree).filter(node=>node.type==='select')
        assert.equal(refreshed[i+1].props.value,'not_tried','Selecting an option never infers a practice attempt')
        refreshed[i+1].props.onChange({target:{value:'guided'}})
      }
      await player.settle()
    }
    const next=nodes(player.tree).find(node=>node.type==='button'&&node.props.className==='primary')
    assert.ok(next);assert.equal(Boolean(next.props.disabled),false);next.props.onClick();await player.settle()
  }
  assert.ok(submitted)
  const expected=data.cycle.day===1&&!data.lesson.antiStress?.routePlan&&data.lesson.antiStress?.slideModel!==OPORA_SKILL_SLIDE_MODEL?dayOne.DAY_ONE_SLIDES:slideSequence.buildCourseSlides(data.lesson)
  assert.deepEqual(visited,expected.map(item=>item.key))
  assert.deepEqual(submitted.visitedSlideKeys,visited)
  player.unmount()
  return {submitted,seen}
}
for(const moduleId of ['AS1','AS2','AS3','AS5','AS6'])for(const locale of ['en','ru'])for(let day=1;day<=14;day++){
  test(`${moduleId==='AS2'?'version-pinned legacy':'fresh'} ${moduleId} ${locale} day ${day}: exact factory → real Player → owner storage`,async()=>{
    const h=repositoryHarness({freshPhase:true}),cycle=await h.create(moduleId)
    assert.equal(cycle.preferences.oporaModuleRouter,router.ANTISTRESS_ROUTER_VERSION)
    assert.equal(cycle.preferences.oporaModuleId,moduleId)
    if(moduleId==='AS2'){
      assert.equal(cycle.content_version,COURSE_ANTISTRESS_SKILLS_V7,'New factory selects current AS-5.5; the following fixture replays historical V3')
      // Retain the complete previous-version replay contract on a synthetic
      // historical fixture. Pinned V5 save paths are checked separately below.
      h.cycle.content_version=COURSE_ANTISTRESS_OUTCOME_V3
    }
    h.seedDay(day)
    const data=await h.read(locale)
    if(moduleId!=='AS2'){
      assert.ok(data.lesson.antiStress?.routePlan)
      assert.equal(data.learningSkills.length,0,'No AS2 seven-skill claims for other modules')
      assert.deepEqual(slideSequence.buildCourseSlides(data.lesson).slice(0,5).map(row=>row.key),['welcome','baseline','checkin','recall','idea'])
    }
    const {submitted,seen}=await traverse(data,locale,{choose:day%2===0,checkpoints:day===14})
    if(moduleId!=='AS2')assert.deepEqual([...seen].sort(),['main','method','reflect'])
    if(moduleId!=='AS2'||day>1)assert.ok(submitted.stateJourney,'State journey remains alongside source-specific route')
    const saved=await h.command(submitted,locale)
    assert.equal(h.sessions.at(-1).lesson_id,data.lesson.id)
    if(day===14){
      assert.equal(saved.cycle.status,'completed')
      assert.equal(saved.phaseEvidence.length,3)
      assert.ok(saved.phaseEvidence.every(check=>check.evidence?.state==='guided'))
    }
    assert.equal(h.sessions.at(-1).signals.practiceAttempt??null,submitted.practiceAttempt??null)
  })
}
test('fresh AS4 is still clinician-only at the actual factory',async()=>{
  const h=repositoryHarness({freshPhase:true})
  await assert.rejects(()=>h.create('AS4'),/COURSE_PROFESSIONAL_SUPPORT_REQUIRED/)
  assert.equal(h.writes.length,0)
})
for(const moduleId of ['AS1','AS3','AS5','AS6'])test(`fresh ${moduleId} optional day14 checks cannot gate completion`,async()=>{
  const h=repositoryHarness({freshPhase:true});await h.create(moduleId);h.seedDay(14)
  const data=await h.read('en'),{submitted}=await traverse(data,'en',{choose:false})
  assert.deepEqual(submitted.phaseCheckpoints,{})
  const saved=await h.command(submitted)
  assert.equal(saved.cycle.status,'completed')
  assert.ok(saved.phaseEvidence.every(check=>check.evidence===null))
})

test('new phase cannot smuggle legacy generic activities or hint-assisted independent evidence',async()=>{
  const h=repositoryHarness({freshPhase:true});await h.create('AS1');h.seedDay(14)
  const data=await h.read('en'),{submitted}=await traverse(data,'en',{choose:false})
  await assert.rejects(()=>h.command({...submitted,moduleActivityChoice:'skip'}),/INVALID_OPORA_MODULE_ACTIVITY/)
  const check=data.phaseEvidence[0]
  await assert.rejects(()=>h.command({...submitted,dailyMethodHintUsed:true,phaseCheckpoints:{[check.id]:{state:'independent',choice:check.options[0].value}}}),/INVALID_PHASE_CHECKPOINTS/)
  assert.equal(h.sessions.length,13)
  const saved=await h.command({...submitted,dailyMethodHintUsed:true,phaseCheckpoints:{[check.id]:{state:'guided',choice:check.options[0].value}}})
  assert.equal(saved.phaseEvidence[0].evidence.state,'guided')
})

for(const moduleId of ['AS1','AS3','AS5','AS6'])for(const locale of ['ru','en'])test(`fresh ${moduleId} ${locale} low-load no-imagery path keeps the module practice and permits skipping`,async()=>{
  const h=repositoryHarness({freshPhase:true});await h.create(moduleId);h.seedDay(5)
  h.cycle.preferences={...h.cycle.preferences,length:'quick',imagery:'no_imagery'}
  const data=await h.read(locale)
  assert.equal(data.lesson.sections.find(section=>section.kind==='meditation').text,data.lesson.antiStress.neutralText)
  assert.ok(data.lesson.antiStress.routePlan)
  const {submitted}=await traverse(data,locale,{choose:false})
  assert.equal(submitted.dailyMethodChoice,null)
  const saved=await h.command(submitted,locale)
  assert.ok(saved.currentSession)
  assert.equal(saved.cycle.preferences.imagery,'no_imagery')
})

for(const moduleId of ['AS1','AS3','AS5','AS6'])test(`fresh ${moduleId} day1 rejects foreign AS2 state-first evidence`,async()=>{
 const h=repositoryHarness({freshPhase:true});await h.create(moduleId)
 const data=await h.read('en'),{submitted}=await traverse(data,'en',{choose:false})
 const forged={innerSignal:'tension',innerNeed:'rest',innerAction:'pause',practiceAttempt:'tried',anchor:'look'}
 await assert.rejects(()=>h.command({...submitted,dayOneAnswers:forged}),/INVALID_DAY_ONE_LESSON/)
 assert.equal(h.sessions.length,0)
 const receipt=courseSingleLessonOutcome({lesson:data.lesson,day:1,dayOne:forged})
 assert.equal(receipt.innerObservation,null)
 assert.equal(receipt.anchor,null)
})

for(const locale of ['en','ru'])test(`legacy AS2 ${locale} preserves state-first evidence through owner storage and receipt`,async()=>{
 const h=repositoryHarness({freshPhase:true});await h.create('AS2')
 assert.equal(h.cycle.content_version,COURSE_ANTISTRESS_SKILLS_V7)
 h.cycle.content_version=COURSE_ANTISTRESS_OUTCOME_V3
 const data=await h.read(locale),{submitted}=await traverse(data,locale,{choose:false})
 assert.equal(data.cycle.preferences.oporaModuleRouter,router.ANTISTRESS_ROUTER_VERSION)
 assert.equal(data.lesson.antiStress?.routePlan,undefined)
 const answers={...submitted.dayOneAnswers,innerSignal:'tension',innerNeed:'rest',innerAction:'pause',experience:'clearer',practiceAttempt:'partly'}
 const saved=await h.command({...submitted,dayOneAnswers:answers},locale)
 for(const key of ['innerSignal','innerNeed','innerAction','experience'])assert.equal(saved.currentSession.signals.dayOne[key],answers[key])
 const receipt=courseSingleLessonOutcome({locale,lesson:data.lesson,day:1,dayOne:saved.currentSession.signals.dayOne})
 assert.equal(receipt.innerObservation.signal,locale==='ru'?'Напряжение':'Tension')
 assert.equal(receipt.innerObservation.need,locale==='ru'?'Отдых':'Rest')
 assert.equal(receipt.innerObservation.selectedAction,locale==='ru'?'Пауза':'A pause')
 assert.equal(receipt.state,null)
})

for(const locale of ['en','ru'])for(let day=1;day<=14;day++)test(`version-pinned SKILLS-5 AS2 ${locale} day ${day}: factory, actual compact Player and exact saved lesson`,async()=>{
 const h=repositoryHarness({freshPhase:true});const cycle=await h.create('AS2')
 assert.equal(cycle.content_version,COURSE_ANTISTRESS_SKILLS_V7);h.cycle.content_version=COURSE_ANTISTRESS_SKILLS_V5;h.seedDay(day)
 const data=await h.read(locale);assert.equal(data.lesson.antiStress.slideModel,OPORA_SKILL_SLIDE_MODEL)
 assert.equal(data.learningSkills.length,7);assert.equal(data.lesson.antiStress.routePlan,undefined)
 const {submitted}=await traverse(data,locale,{choose:false})
 assert.ok(!submitted.stateJourney,'A new compact course must not invent legacy phase evidence')
 assert.equal(submitted.dailyMethodChoice,undefined)
 assert.equal(submitted.dailyMethodHintUsed,undefined)
 if(day===2){
   await assert.rejects(()=>h.command({...submitted,dailyMethodChoice:'skip'},locale),/INVALID_OPORA_METHOD_DAY/)
   assert.equal(h.sessions.length,day-1,'A rejected legacy payload cannot complete the new lesson')
 }
 const saved=await h.command(submitted,locale)
 assert.equal(h.sessions.at(-1).lesson_id,data.lesson.id)
 assert.equal(h.sessions.at(-1).signals.skillId,data.lesson.antiStress.skillId)
 assert.equal(h.cycle.content_version,COURSE_ANTISTRESS_SKILLS_V5)
 assert.equal(h.sessions.at(-1).signals.practiceAttempt??null,submitted.practiceAttempt??null)
 if(day===14)assert.equal(saved.cycle.status,'completed')
})

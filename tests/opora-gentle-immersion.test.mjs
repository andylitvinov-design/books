import test from 'node:test'
import assert from 'node:assert/strict'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {oporaExperienceDepth,oporaExperienceDepthValid,oporaExperienceDay} from '../lib/inner-growth/opora-as56-experience-guides.js'
import {oporaAs58Day} from '../lib/inner-growth/opora-as58-one-action.js'
import {oporaGentleCopy,OPORA_GENTLE_INTRO,OPORA_GENTLE_RECAP} from '../lib/inner-growth/opora-gentle-journey.js'
import {OPORA_EXPERIENCE_PRE_SAVE_KEYS,OPORA_DAY_ONE_RESTORED_KEYS} from '../lib/inner-growth/course-slide-sequence.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'
import {advanceOporaTo} from './helpers/opora-gentle-navigation.mjs'

const labels={
  en:{next:'Continue',save:'Save my practice',choice:'I managed a little'},
  ru:{next:'Продолжить',save:'Сохранить мою практику',choice:'Получилось немного'},
  es:{next:'Continuar',save:'Guardar mi práctica',choice:'Pude hacerlo un poco'},
}
function fixture(locale,day){
  const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
  let writes=0,payload=null
  const h=mount('opora-experience-player',{
    locale,data:{cycle:{id:'00000000-0000-4000-8000-000000017777',day,durationDays:14},
      programme:{id:'stress'},lesson,currentSession:null},
    onClose(){},onFinish(){},onSession:async value=>{writes++;payload=structuredClone(value);return true},
  })
  return {h,get writes(){return writes},get payload(){return payload}}
}
async function click(h,label){
  const button=findButton(h.tree,label)
  assert.ok(button,'Missing '+label+' on '+textOf(h.tree).slice(0,230))
  assert.equal(button.props.disabled,false)
  await button.props.onClick()
  await h.settle()
}
function screen(h,key){
  return nodes(h.tree).find(n=>n.props?.['data-opora-current-screen']===key)
}

test('14 days × 3 languages reuse distinct reviewed guidance with optional non-scored scenarios',()=>{
  assert.equal(oporaExperienceDepthValid(),true)
  assert.deepEqual([...OPORA_GENTLE_INTRO],['why','story','options','settle'])
  assert.deepEqual([...OPORA_GENTLE_RECAP],['recap','recapPractice','recapNext','recapFeedback'])
  for(const lang of ['en','ru','es']){
    const copy=oporaGentleCopy(lang)
    assert.ok(copy.whyTitle&&copy.storyTitle&&copy.optionsTitle&&copy.recapFeedbackTitle)
    const stories=new Set()
    for(let day=1;day<=14;day++){
      const details=oporaExperienceDepth(day,lang)
      assert.ok(details)
      for(const part of ['why','scenario','alternative','everyday'])
        assert.ok(details[part].length>=28,'Day '+day+' '+lang+' '+part)
      assert.ok(oporaExperienceDay(day,lang)?.practice)
      stories.add(details.scenario)
    }
    assert.equal(stories.size,14,'No duplicate example in '+lang)
  }
  assert.equal(oporaExperienceDepth(15,'ru'),null)
})

for(const lang of ['en','ru','es'])test('Day 4 '+lang+' gets four short teaching slides and four separate honest takeaway/feedback stages',async()=>{
  const f=fixture(lang,4),h=f.h,t=labels[lang],content=oporaExperienceDepth(4,lang)
  try{
    for(const [stage,source] of [
      ['why',content.why],['story',content.scenario],
      ['options',content.alternative],['settle',oporaGentleCopy(lang).settleLead]
    ]){
      await advanceOporaTo(h,stage,t.next)
      assert.ok(textOf(screen(h,stage)).includes(source),stage+' '+lang)
      assert.equal(f.writes,0)
    }
    await advanceOporaTo(h,'practice',t.next)
    assert.ok(textOf(screen(h,'practice')).includes(oporaAs58Day(4,lang).practice))
    assert.equal(nodes(h.tree).filter(n=>n.type==='details'&&
      n.props?.['data-opora-inline-practice-audio']==='true').length,0,
      'Meditation moved to one visible Day 14 screen, never behind an accordion')
    await advanceOporaTo(h,'recap',t.next)
    assert.equal(nodes(screen(h,'recap')).filter(n=>n.props?.className?.includes?.('summaryItem')).length,1)
    assert.ok(!textOf(screen(h,'recap')).includes(oporaAs58Day(4,lang).practice))
    await advanceOporaTo(h,'recapPractice',t.next)
    assert.ok(textOf(screen(h,'recapPractice')).includes(oporaAs58Day(4,lang).practice))
    await advanceOporaTo(h,'recapNext',t.next)
    assert.ok(!textOf(screen(h,'recapNext')).includes(content.everyday),
      'No action can be assumed when the learner has not chosen a plan')
    await advanceOporaTo(h,'recapFeedback',t.next)
    assert.equal(nodes(screen(h,'recapFeedback')).filter(n=>n.props?.['data-opora-lesson-confidence']==='true').length,1)
    assert.equal(f.writes,0)
    await click(h,t.save)
    assert.equal(f.writes,0,'Cannot save without a voluntary answer')
    await click(h,t.choice)
    await click(h,t.save)
    assert.equal(f.writes,1)
    assert.deepEqual(f.payload.visitedSlideKeys,[...OPORA_EXPERIENCE_PRE_SAVE_KEYS])
    assert.equal(f.payload.practiceAttempt,null,'Reading optional lessons never proves an attempt')
    assert.equal(f.payload.opora54.answers.lessonConfidence,'some')
    assert.equal(f.payload.practiceWindow,'practice_v6')
    assert.ok(screen(h,'receipt'),'Server-accepted save leads to a receipt')
  }finally{h.unmount()}
})

test('Day 1 connects its EN/RU/ES topic and goal to what the learner explored',async()=>{
  const startText={en:'The goal is to learn',ru:'Цель урока',es:'La meta es aprender'}
  const skillText={en:'external anchor',ru:'внешней опорой',es:'referencia para la atención'}
  const methodText={en:'three ordinary objects',ru:'три обычных предмета',es:'tres objetos cotidianos'}
  for(const lang of ['en','ru','es']){
    const f=fixture(lang,1),h=f.h,t=labels[lang]
    const topic=oporaExperienceDay(1,lang).title
    const exercise=oporaAs58Day(1,lang).title
    try{
      assert.ok(textOf(screen(h,'welcome')).includes(topic),'Day 1 topic is visible immediately')
      await advanceOporaTo(h,'arrive',t.next)
      const intro=screen(h,'arrive')
      assert.ok(textOf(intro).includes(topic),'The goal uses the same lesson name')
      const goal=nodes(intro).find(n=>n.props?.['data-opora-lesson-goal']==='day-1')
      assert.ok(goal)
      assert.ok(textOf(goal).includes(startText[lang]),'The lesson says what skill the learner is practising')
      await advanceOporaTo(h,'recap',t.next)
      const learned=screen(h,'recap')
      assert.ok(textOf(learned).includes(topic),'Recap matches the original lesson topic')
      const outcome=nodes(learned).find(n=>n.props?.['data-opora-learning-outcome']==='day-1')
      assert.ok(outcome&&textOf(outcome).includes(skillText[lang]))
      assert.ok(textOf(learned).includes(lang==='ru'?'Сегодня только ознакомление':
        lang==='es'?'Solo exploraste la idea':'Explored the idea only'),
        'Reading the lesson must not be called a completed exercise')
      await advanceOporaTo(h,'recapPractice',t.next)
      const practice=screen(h,'recapPractice')
      assert.ok(textOf(practice).includes(exercise),'The named exercise is in the review')
      const explanation=nodes(practice).find(n=>n.props?.['data-opora-learning-method']==='day-1')
      assert.ok(explanation&&textOf(explanation).includes(methodText[lang]),
        'The method explains what the three-object exercise teaches')
      assert.notEqual(textOf(explanation),oporaAs58Day(1,lang).practice,
        'The review is an explanation, not the original command repeated')
      await advanceOporaTo(h,'recapFeedback',t.next)
      await click(h,lang==='en'?'I only explored them today':
        lang==='ru'?'Пока только знакомлюсь':'Hoy solo las exploré')
      await click(h,t.save)
      assert.equal(f.writes,1)
      assert.equal(f.payload.practiceAttempt,null,'Reading is not proof of practice')
      assert.ok(textOf(screen(h,'receipt')).includes(topic))
      assert.ok(nodes(screen(h,'receipt')).some(n=>n.props?.['data-opora-receipt-learning']==='day-1'))
    }finally{h.unmount()}
  }
})

test('Day 1 keeps the original five gentle introduction screens and historical server visit keys',async()=>{
  const f=fixture('en',1),h=f.h
  try{
    await advanceOporaTo(h,'recapFeedback','Continue')
    await click(h,'I only explored them today')
    await click(h,'Save my practice')
    assert.equal(f.writes,1)
    assert.deepEqual(f.payload.visitedSlideKeys,[...OPORA_DAY_ONE_RESTORED_KEYS])
    assert.equal(f.payload.practiceAttempt,null)
    assert.ok(screen(h,'receipt'))
  }finally{h.unmount()}
})

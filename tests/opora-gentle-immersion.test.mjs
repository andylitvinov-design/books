import test from 'node:test'
import assert from 'node:assert/strict'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {oporaExperienceDepth,oporaExperienceDepthValid,oporaExperienceDay} from '../lib/inner-growth/opora-as56-experience-guides.js'
import {oporaAs60Day} from '../lib/inner-growth/opora-as60-experiential-practices.js'
import {oporaAs60VariedDay,oporaAs60DailyInsight,oporaAs60SettlingCue} from '../lib/inner-growth/opora-as60-varied-content.js'
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

for(const lang of ['en','ru','es'])test('Day 4 '+lang+' puts the goal ahead of practice and keeps three honest recap stages',async()=>{
  const f=fixture(lang,4),h=f.h,t=labels[lang],content=oporaAs60VariedDay(4,lang)
  try{
    for(const [stage,source] of [
      ['why',oporaAs60DailyInsight(4,lang)],['story',content.scenario],
      ['options',content.alternative],['settle',oporaAs60SettlingCue(4,lang)]
    ]){
      await advanceOporaTo(h,stage,t.next)
      assert.ok(textOf(screen(h,stage)).includes(source),stage+' '+lang)
      assert.equal(f.writes,0)
    }
    await advanceOporaTo(h,'recapPractice',t.next)
    assert.ok(textOf(screen(h,'recapPractice')).includes(oporaAs60Day(4,lang).practice))
    assert.ok(textOf(screen(h,'recapPractice')).includes(content.result),
      'Overview shows the practical aim rather than repeating the same paragraph')
    assert.ok(!textOf(screen(h,'recapPractice')).includes(content.purpose))
    assert.ok(nodes(screen(h,'recapPractice')).some(node=>
      node.props?.['data-opora-practice-overview']===4))
    await advanceOporaTo(h,'practice',t.next)
    assert.ok(textOf(screen(h,'practice')).includes(oporaAs60Day(4,lang).practice))
    assert.equal(nodes(h.tree).filter(n=>n.type==='details'&&
      n.props?.['data-opora-inline-practice-audio']==='true').length,0,
      'Meditation moved to one visible Day 14 screen, never behind an accordion')
    await advanceOporaTo(h,'recap',t.next)
    assert.equal(nodes(screen(h,'recap')).filter(n=>n.props?.className?.includes?.('summaryItem')).length,1)
    assert.ok(!textOf(screen(h,'recap')).includes(oporaAs60Day(4,lang).practice))
    await advanceOporaTo(h,'recapNext',t.next)
    assert.ok(!screen(h,'recapPractice'),'Introduction must not reappear in the recap')
    assert.ok(textOf(screen(h,'recapNext')).includes(content.transfer),
      'Daily homework remains visible without implying agreement or a completed action')
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

for (const lang of ['en','ru','es']) test('Day 1 '+lang+' explains the first grounding goal before practice without saving',async()=>{
  const f=fixture(lang,1),h=f.h
  try {
    await advanceOporaTo(h,'recapPractice',labels[lang].next)
    assert.ok(textOf(screen(h,'recapPractice')).includes(oporaAs60VariedDay(1,lang).purpose))
    assert.ok(textOf(screen(h,'recapPractice')).includes(oporaAs60Day(1,lang).practice))
    assert.ok(nodes(screen(h,'recapPractice')).some(node=>node.props?.['data-opora-practice-overview']===1))
    assert.equal(f.writes,0)
    await advanceOporaTo(h,'practice',labels[lang].next)
    assert.ok(!screen(h,'recapPractice'),'Intro must appear exactly once before practice')
  } finally { h.unmount() }
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

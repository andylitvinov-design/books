import test from 'node:test'
import assert from 'node:assert/strict'
import {needsOporaFirstExerciseConsent,canAdvanceOporaFirstExercise} from '../lib/inner-growth/opora-first-exercise-consent.js'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {mount,nodes,findButton,textOf} from './helpers/route-pipeline-harness.mjs'
import {advanceOporaTo} from './helpers/opora-gentle-navigation.mjs'
import {oporaAs60Day,OPORA_EXPERIENTIAL_EDITION} from '../lib/inner-growth/opora-as60-experiential-practices.js'
import {oporaAs60Journey} from '../lib/inner-growth/opora-as60-integrated-journey.js'

const labels={
  en:{next:'Continue',yes:'Yes, I’m ready',no:'Not now',prompt:'Exercise 1. Find your personal anchor',
    try:'I tried it'},
  ru:{next:'Продолжить',yes:'Да, готов(а)',no:'Не сейчас',prompt:'Упражнение № 1. Мой знак опоры',
    try:'Я попробовал(а)'},
  es:{next:'Continuar',yes:'Sí, quiero probar',no:'Ahora no',prompt:'Ejercicio 1. Mi señal de apoyo',
    try:'Lo intenté'},
}

function fixture(locale){
  const lesson=lessonFor('calm_regulation',1,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
  const data={cycle:{id:'00000000-0000-4000-8000-000000002241',day:1,durationDays:14},
    programme:{id:'stress'},lesson,currentSession:null}
  const original=structuredClone(data)
  let saves=0,closes=0
  const h=mount('opora-experience-player',{locale,data,onClose(){closes++},onFinish(){},
    async onSession(){saves++;return true}})
  return {h,data,original,get saves(){return saves},get closes(){return closes}}
}
async function tap(h,label){
  const button=findButton(h.tree,label)
  assert.ok(button,'Missing '+label)
  assert.equal(button.props.disabled,false)
  await button.props.onClick()
  await h.settle()
}
test('new Day 1 requires explicit readiness but historical reviews and other days are unchanged',()=>{
  assert.equal(needsOporaFirstExerciseConsent({day:1,moment:'arrive'}),true)
  assert.equal(canAdvanceOporaFirstExercise({day:1,moment:'arrive'}),false)
  assert.equal(canAdvanceOporaFirstExercise({day:1,moment:'arrive',ready:true}),true)
  for(const context of [
    {day:2,moment:'arrive'},{day:1,moment:'practice'},
    {day:1,moment:'arrive',hasSaved:true},
    {day:1,moment:'arrive',reviewOnly:true},
  ]){
    assert.equal(needsOporaFirstExerciseConsent(context),false)
    assert.equal(canAdvanceOporaFirstExercise(context),true)
  }
})

for(const locale of ['en','ru','es']){
  test('Day 1 '+locale+': clear invitation before instructions; decline never saves',async()=>{
    const f=fixture(locale),d=labels[locale]
    try{
      await advanceOporaTo(f.h,'arrive',d.next)
      assert.equal(textOf(nodes(f.h.tree).find(n=>n.type==='h2')),d.prompt)
      assert.ok(textOf(f.h.tree).includes(d.no))
      assert.ok(textOf(f.h.tree).includes(d.yes))
      assert.equal(nodes(f.h.tree).filter(n=>n.props?.['data-opora-first-exercise-consent']==='true').length,1)
      assert.equal(findButton(f.h.tree,d.next),undefined,'Generic Continue must not bypass opt-in')
      assert.equal(findButton(f.h.tree,d.try),undefined,'Attempt buttons must not appear before consent')
      assert.ok(!textOf(f.h.tree).includes(oporaAs60Day(1,locale).practice),'Instructions follow explicit readiness')
      assert.equal(nodes(f.h.tree).filter(n=>n.props?.['data-opora-integrated-day']||n.props?.['data-opora-micro-step']).length,0,
        'Neither authored channel instructions nor micro-steps may appear before consent')
      assert.equal(f.saves,0)
      await tap(f.h,d.no)
      assert.equal(f.closes,1)
      assert.equal(f.saves,0)
      assert.deepEqual(f.data,f.original,'Declining must not mutate the lesson or session')
    }finally{f.h.unmount()}
  })
  test('Day 1 '+locale+': Yes opens the authored AS6 channels then practice without claiming an attempt',async()=>{
    const f=fixture(locale),d=labels[locale]
    try{
      await advanceOporaTo(f.h,'arrive',d.next)
      await tap(f.h,d.yes)
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-current-screen']==='recapPractice'),
        'After consent show the goal before its instructions')
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-overview-purpose']==='true'))
      assert.equal(findButton(f.h.tree,d.try),undefined,'Preview cannot report an attempt')
      const journey=oporaAs60Journey(1,locale)
      for(const [scene,channel] of [['bodyExperience','body'],['emotionExperience','emotion'],['mentalExperience','mental'],['imageryMeditation','imagery']]){
        await tap(f.h,d.next)
        assert.equal(nodes(f.h.tree).find(n=>n.props?.['data-opora-current-screen'])?.props['data-opora-current-screen'],scene,
          'Continue must not skip, repeat or reorder the authored channels')
        const cards=nodes(f.h.tree).filter(n=>n.props?.['data-opora-integrated-day']===1)
        assert.equal(cards.length,1)
        assert.equal(cards[0].props['data-opora-experience-channel'],channel)
        assert.equal(textOf(nodes(cards[0]).find(n=>n.type==='p')),journey[channel].text,'Exact authored channel instruction')
        const choices=nodes(cards[0]).filter(n=>n.type==='button')
        assert.equal(choices.length,3,'Each channel permits trying, reading or skipping')
        assert.ok(choices.every(n=>n.props['aria-pressed']===false),'Readiness never claims an attempt')
        assert.equal(f.saves,0,'Viewing an authored channel must not save')
        assert.deepEqual(f.data,f.original,'Viewing must not mutate the lesson or session')
      }
      await tap(f.h,d.next)
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-current-screen']==='practice'))
      const practice=nodes(f.h.tree).find(n=>n.props?.['data-opora-one-daily-practice']===1)
      assert.ok(practice,'The daily practice must follow the authored channels')
      assert.equal(textOf(practice.props.children[0]),oporaAs60Day(1,locale).practice)
      assert.equal(nodes(f.h.tree).filter(n=>n.props?.['data-opora-practical-skills-version']===OPORA_EXPERIENTIAL_EDITION).length,1)
      assert.ok(findButton(f.h.tree,d.try),'Reporting remains voluntary, after the instruction')
      assert.equal(f.saves,0,'Consent and viewing must never record a completed exercise')
      assert.deepEqual(f.data,f.original,'Consent and viewing must leave the input session unchanged')
    }finally{f.h.unmount()}
  })
}

import test from 'node:test'
import assert from 'node:assert/strict'
import {needsOporaFirstExerciseConsent,canAdvanceOporaFirstExercise} from '../lib/inner-growth/opora-first-exercise-consent.js'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {mount,nodes,findButton,textOf} from './helpers/route-pipeline-harness.mjs'
import {advanceOporaTo} from './helpers/opora-gentle-navigation.mjs'

const labels={
  en:{next:'Continue',yes:'Yes, I’m ready',no:'Not now',prompt:/Exercise 1.*Find your personal anchor/,
    action:'Find a personal anchor instead of merely counting objects.',try:'I tried it'},
  ru:{next:'Продолжить',yes:'Да, готов(а)',no:'Не сейчас',prompt:/Упражнение № 1/,
    action:'Ищем личный знак опоры — не просто считаем предметы.',try:'Я попробовал(а)'},
  es:{next:'Continuar',yes:'Sí, quiero probar',no:'Ahora no',prompt:/Ejercicio 1/,
    action:'Busca una señal de apoyo, no solo cuentes objetos.',try:'Lo intenté'},
}

function fixture(locale){
  const lesson=lessonFor('calm_regulation',1,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
  const data={cycle:{id:'00000000-0000-4000-8000-000000002241',day:1,durationDays:14},
    programme:{id:'stress'},lesson,currentSession:null}
  let saves=0,closes=0
  const h=mount('opora-experience-player',{locale,data,onClose(){closes++},onFinish(){},
    async onSession(){saves++;return true}})
  return {h,get saves(){return saves},get closes(){return closes}}
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
      assert.match(textOf(f.h.tree),d.prompt)
      assert.ok(textOf(f.h.tree).includes(d.no))
      assert.ok(textOf(f.h.tree).includes(d.yes))
      assert.equal(nodes(f.h.tree).filter(n=>n.props?.['data-opora-first-exercise-consent']==='true').length,1)
      assert.equal(findButton(f.h.tree,d.next),undefined,'Generic Continue must not bypass opt-in')
      assert.equal(findButton(f.h.tree,d.try),undefined,'Attempt buttons must not appear before consent')
      assert.ok(!textOf(f.h.tree).includes(d.action),'Instructions are for the next screen')
      assert.equal(f.saves,0)
      await tap(f.h,d.no)
      assert.equal(f.closes,1)
      assert.equal(f.saves,0)
    }finally{f.h.unmount()}
  })
  test('Day 1 '+locale+': Yes opens one clear action without claiming an attempt',async()=>{
    const f=fixture(locale),d=labels[locale]
    try{
      await advanceOporaTo(f.h,'arrive',d.next)
      await tap(f.h,d.yes)
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-current-screen']==='recapPractice'),
        'After consent show the goal before its instructions')
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-overview-purpose']==='true'))
      assert.equal(findButton(f.h.tree,d.try),undefined,'Preview cannot report an attempt')
      // Four voluntary AS-6.0 experience cards now precede the practice.
      // Traverse real Continue actions without skipping consent or saving a session.
      await advanceOporaTo(f.h,'practice',d.next)
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-current-screen']==='practice'))
      assert.ok(textOf(f.h.tree).includes(d.action))
      assert.ok(findButton(f.h.tree,d.try),'Reporting remains voluntary, after the instruction')
      assert.equal(f.saves,0,'Consent and viewing must never record a completed exercise')
    }finally{f.h.unmount()}
  })
}

import test from 'node:test'
import assert from 'node:assert/strict'
import {oporaAs60Day} from '../lib/inner-growth/opora-as60-experiential-practices.js'
import {oporaAs60Journey} from '../lib/inner-growth/opora-as60-integrated-journey.js'
import {validateOpora54Signals} from '../lib/inner-growth/anti-stress-skills-v6.js'
import {OPORA_VARIETY_REVISION,oporaAs60DailyInsight,oporaAs60VariedDay,
  oporaAs60VariedJourney,oporaAs60VariedValid} from '../lib/inner-growth/opora-as60-varied-content.js'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {mount,nodes,textOf} from './helpers/route-pipeline-harness.mjs'
import {advanceOporaTo} from './helpers/opora-gentle-navigation.mjs'

const next={en:'Continue',ru:'Продолжить',es:'Continuar'}
const make=(day,locale,session=null)=>{
 const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
 return mount('opora-experience-player',{locale,reviewOnly:Boolean(session),
  data:{cycle:{id:'00000000-0000-4000-8000-000000006061',day,durationDays:14},
   programme:{id:'stress'},lesson,currentSession:session},onClose(){},onFinish(){},
  onSession:async()=>true})
}
const screen=(h,key)=>nodes(h.tree).find(n=>n.props?.['data-opora-current-screen']===key)

test('all fourteen lessons have distinct purposes and insights in EN/RU/ES',()=>{
 assert.equal(oporaAs60VariedValid(),true)
 for(const locale of Object.keys(next)){
  const goals=new Set(),insights=new Set()
  for(let day=1;day<=14;day++){
   const item=oporaAs60VariedDay(day,locale),insight=oporaAs60DailyInsight(day,locale)
   goals.add(item.purpose);insights.add(insight)
   assert.notEqual(insight,item.purpose)
  }
  assert.equal(goals.size,14);assert.equal(insights.size,14)
 }
})
test('Day 2 and Day 9 provide different micro-quests and optional alternatives',()=>{
 for(const locale of Object.keys(next)){
  const original=oporaAs60Day(2,locale),fresh=oporaAs60VariedDay(2,locale)
  assert.notEqual(original.practice,fresh.practice)
  assert.notEqual(original.scenario,fresh.scenario)
  assert.ok(fresh.experiment.choices.some(choice=>choice.id==='look'))
  assert.notEqual(oporaAs60VariedDay(9,locale).practice,oporaAs60Day(9,locale).practice)
  const revised=oporaAs60VariedJourney(2,locale),legacy=oporaAs60Journey(2,locale)
  assert.notEqual(revised.body.text,legacy.body.text)
  assert.notEqual(revised.mental.plan,legacy.mental.plan)
  assert.deepEqual(oporaAs60VariedJourney(3,locale),oporaAs60Journey(3,locale))
 }
})
test('new Day 2 UI teaches three different ideas and saves no fabricated attempt',async()=>{
 for(const locale of Object.keys(next)){
  const h=make(2,locale),label=next[locale],day=oporaAs60VariedDay(2,locale)
  try{
   assert.ok(nodes(h.tree).some(n=>n.props?.['data-opora-content-revision']===OPORA_VARIETY_REVISION))
   await advanceOporaTo(h,'support',label)
   assert.ok(textOf(screen(h,'support')).includes(day.purpose))
   await advanceOporaTo(h,'why',label)
   assert.ok(textOf(screen(h,'why')).includes(oporaAs60DailyInsight(2,locale)))
   assert.ok(!textOf(screen(h,'why')).includes(day.purpose))
   await advanceOporaTo(h,'recapPractice',label)
   assert.ok(textOf(screen(h,'recapPractice')).includes(day.result))
   assert.ok(!textOf(screen(h,'recapPractice')).includes(day.purpose))
   await advanceOporaTo(h,'practice',label)
   assert.ok(textOf(screen(h,'practice')).includes(day.practice))
   assert.ok(nodes(h.tree).some(n=>n.props?.['data-opora-micro-experiment']===2))
  }finally{h.unmount()}
 }
})
test('historical AS-6.0 stays readable while new revision is accepted',async()=>{
 assert.equal(validateOpora54Signals({answers:{
  experienceEdition:'as-6.0-experiments-v1',
  contentRevision:OPORA_VARIETY_REVISION,lessonConfidence:'explored'},hints:[],ease:null
 }).answers.contentRevision,OPORA_VARIETY_REVISION)
 const h=make(2,'en',{signals:{opora54:{answers:{
  experienceEdition:'as-6.0-experiments-v1'}}}})
 try{
  assert.ok(!nodes(h.tree).some(n=>n.props?.['data-opora-content-revision']))
  await advanceOporaTo(h,'support','Continue')
  assert.ok(textOf(screen(h,'support')).includes(oporaAs60Day(2,'en').purpose))
  await advanceOporaTo(h,'why','Continue')
  assert.ok(textOf(screen(h,'why')).includes(oporaAs60Day(2,'en').purpose))
 }finally{h.unmount()}
})

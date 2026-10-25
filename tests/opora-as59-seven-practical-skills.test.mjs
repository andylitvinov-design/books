import test from 'node:test'
import assert from 'node:assert/strict'
import {oporaAs59Day,oporaAs59Valid,OPORA_SEVEN_SKILLS_EDITION} from '../lib/inner-growth/opora-as59-seven-skills.js'
import {oporaAs60Day,oporaAs60Skills,oporaAs60Valid,OPORA_EXPERIENTIAL_EDITION} from '../lib/inner-growth/opora-as60-experiential-practices.js'
import {oporaAs58Day} from '../lib/inner-growth/opora-as58-one-action.js'
import {validateOpora54Signals} from '../lib/inner-growth/anti-stress-skills-v6.js'
import {antiStressBlueprint} from '../lib/inner-growth/anti-stress-blueprint.js'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {mount,nodes,textOf} from './helpers/route-pipeline-harness.mjs'
import {advanceOporaTo} from './helpers/opora-gentle-navigation.mjs'

const next={en:'Continue',ru:'Продолжить',es:'Continuar'}
const langs=['en','ru','es']
const make=(day,locale,currentSession=null,reviewOnly=false)=>{
  const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
  return mount('opora-experience-player',{locale,reviewOnly,
    data:{cycle:{id:'00000000-0000-4000-8000-000000006059',day,durationDays:14},
      programme:{id:'stress'},lesson,currentSession},
    onClose(){},onFinish(){},onSession:async()=>true})
}

test('AS-6.0 delivers seven distinct guided experiments over 14 days in EN/RU/ES',()=>{
  assert.equal(oporaAs59Valid(),true,'Historical editorial edition remains valid')
  assert.equal(oporaAs60Valid(),true)
  assert.equal(OPORA_SEVEN_SKILLS_EDITION,'as-5.9-seven-skills-v1')
  assert.equal(OPORA_EXPERIENTIAL_EDITION,'as-6.0-experiments-v1')
  for(const locale of langs){
    const skills=oporaAs60Skills(locale)
    assert.equal(skills.length,7)
    assert.deepEqual(skills.map(x=>x.days),[[1,8],[2,9],[3,10],[4,11],[5,12],[6,13],[7,14]])
    assert.equal(new Set(skills.map(x=>x.title)).size,7)
    const exercises=new Set()
    const plan=antiStressBlueprint(locale)
    for(let day=1;day<=14;day++){
      const item=oporaAs60Day(day,locale)
      assert.equal(item.skillNumber,(day-1)%7+1)
      assert.equal(item.skillId,skills[(day-1)%7].id)
      assert.equal(item.stage,day<=7?'discover':'deepen')
      assert.equal(plan.days[day-1].title,item.title)
      assert.equal(plan.days[day-1].exercise,item.practice)
      assert.equal(plan.days[day-1].result,item.result)
      assert.equal(item.skill,plan.skills[(day-1)%7].title)
      assert.equal(item.experiment.steps.length,3)
      assert.equal(item.experiment.choices.length,3)
      assert.ok(item.purpose.length<=225,'Support fits one mobile slide')
      assert.ok(item.practice.length<=190,'Practice prompt fits one mobile slide')
      assert.notEqual(item.practice,item.transfer)
      assert.ok(!/forced breathing|hold your breath|trauma memory|задержите дыхание|вспомните травму|aguanta la respiración/i
        .test(item.experiment.steps.join(' ')))
      exercises.add(item.practice)
    }
    assert.equal(exercises.size,14)
    assert.equal(oporaAs60Day(0,locale),null)
    assert.equal(oporaAs60Day(15,locale),null)
  }
})

test('server permits AS-6.0 edition, preserves AS-5.9 / AS-5.8 receipts, rejects unknown',()=>{
  for(const edition of ['as-5.8-one-action-v1',OPORA_SEVEN_SKILLS_EDITION,OPORA_EXPERIENTIAL_EDITION]){
    assert.deepEqual(validateOpora54Signals({answers:{experienceEdition:edition,
      lessonConfidence:'explored'},hints:[],ease:null}).answers,
      {experienceEdition:edition,lessonConfidence:'explored'})
  }
  assert.throws(()=>validateOpora54Signals({answers:{experienceEdition:'unreviewed-v99'},
    hints:[],ease:null}),/INVALID_OPORA54_ANSWER/)
  for(let day=1;day<=14;day++){
    assert.ok(lessonFor('calm_regulation',day,'en','standard',COURSE_ANTISTRESS_SKILLS_V7)?.id)
  }
})

test('fresh EN/RU/ES lessons introduce purpose before 3-step experiment, without auto-saving',async()=>{
  for(const locale of langs)for(let day=1;day<=14;day++){
    const h=make(day,locale)
    try{
      const target=oporaAs60Day(day,locale)
      assert.equal(nodes(h.tree).filter(node=>
        node.props?.['data-opora-practical-skills-version']===OPORA_EXPERIENTIAL_EDITION).length,1)
      await advanceOporaTo(h,'support',next[locale])
      assert.ok(textOf(h.tree).includes(target.purpose))
      assert.ok(!textOf(h.tree).includes(target.practice),'Purpose before exercise')
      await advanceOporaTo(h,'practice',next[locale])
      assert.ok(textOf(h.tree).includes(target.practice))
      const micro=nodes(h.tree).filter(node=>node.props?.['data-opora-micro-experiment']===day)
      assert.equal(micro.length,1)
      assert.ok(textOf(micro[0]).includes(target.experiment.steps[0]))
    }finally{h.unmount()}
  }
})

test('historic saved reviews retain their edition, only AS-6.0 shows new stepper',async()=>{
  for(const edition of ['as-5.8-one-action-v1',OPORA_SEVEN_SKILLS_EDITION,OPORA_EXPERIENTIAL_EDITION]){
    const session={signals:{opora54:{answers:{experienceEdition:edition}}}}
    const h=make(2,'en',session,true)
    try{
      const is60=edition===OPORA_EXPERIENTIAL_EDITION
      const expected=edition==='as-5.8-one-action-v1'?oporaAs58Day(2,'en').practice:
        edition===OPORA_SEVEN_SKILLS_EDITION?oporaAs59Day(2,'en').practice:
          oporaAs60Day(2,'en').practice
      await advanceOporaTo(h,'practice','Continue')
      assert.ok(textOf(h.tree).includes(expected),'Review matches recorded '+edition)
      assert.equal(nodes(h.tree).some(node=>node.props?.['data-opora-micro-experiment']===2),is60)
    }finally{h.unmount()}
  }
})

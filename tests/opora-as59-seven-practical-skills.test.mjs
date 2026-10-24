import test from 'node:test'
import assert from 'node:assert/strict'
import {oporaAs59Day,oporaAs59Skills,oporaAs59Valid,OPORA_SEVEN_SKILLS_EDITION} from '../lib/inner-growth/opora-as59-seven-skills.js'
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

test('seven usable skills, 14 distinct actions and supportive 1-screen copy in EN/RU/ES',()=>{
  assert.equal(oporaAs59Valid(),true)
  assert.equal(OPORA_SEVEN_SKILLS_EDITION,'as-5.9-seven-skills-v1')
  for(const locale of langs){
    const skills=oporaAs59Skills(locale)
    assert.equal(skills.length,7)
    assert.deepEqual(skills.map(x=>x.days),[[1,8],[2,9],[3,10],[4,11],[5,12],[6,13],[7,14]])
    assert.equal(new Set(skills.map(x=>x.title)).size,7)
    const exercises=new Set()
    const plan=antiStressBlueprint(locale)
    for(let day=1;day<=14;day++){
      const item=oporaAs59Day(day,locale)
      assert.equal(item.skillNumber,(day-1)%7+1)
      assert.equal(item.skillId,skills[(day-1)%7].id)
      assert.equal(item.stage,day<=7?'discover':'deepen')
      assert.equal(plan.days[day-1].title,item.title)
      assert.equal(plan.days[day-1].exercise,item.practice)
      assert.equal(plan.days[day-1].result,item.result)
      assert.equal(item.skill,plan.skills[(day-1)%7].title)
      assert.ok(item.purpose.length<=225,'Support fits one mobile slide')
      assert.ok(item.practice.length<=190,'Practice fits one mobile slide')
      assert.ok(item.practice!==item.transfer)
      assert.ok(!/forced breathing|hold your breath|trauma memory|задержите дыхание|вспомните травму|aguanta la respiración/i.test(item.practice))
      exercises.add(item.practice)
    }
    assert.equal(exercises.size,14)
    assert.equal(oporaAs59Day(0,locale),null)
    assert.equal(oporaAs59Day(15,locale),null)
  }
})

test('new owner-scoped edition marker is bounded; historical marker and existing V7 lesson IDs remain valid',()=>{
  assert.deepEqual(validateOpora54Signals({answers:{experienceEdition:OPORA_SEVEN_SKILLS_EDITION,
    lessonConfidence:'explored'},hints:[],ease:null}).answers,
    {experienceEdition:OPORA_SEVEN_SKILLS_EDITION,lessonConfidence:'explored'})
  assert.equal(validateOpora54Signals({answers:{experienceEdition:'as-5.8-one-action-v1'},
    hints:[],ease:null}).answers.experienceEdition,'as-5.8-one-action-v1')
  assert.throws(()=>validateOpora54Signals({answers:{experienceEdition:'unreviewed-v99'},
    hints:[],ease:null}),/INVALID_OPORA54_ANSWER/)
  for(let day=1;day<=14;day++){
    assert.ok(lessonFor('calm_regulation',day,'en','standard',COURSE_ANTISTRESS_SKILLS_V7)?.id)
  }
})

test('all 42 fresh lessons show a purpose before one actual exercise without writing progress',async()=>{
  for(const locale of langs)for(let day=1;day<=14;day++){
    const h=make(day,locale)
    try{
      const target=oporaAs59Day(day,locale)
      assert.equal(nodes(h.tree).filter(node=>
        node.props?.['data-opora-practical-skills-version']===OPORA_SEVEN_SKILLS_EDITION).length,1)
      await advanceOporaTo(h,'support',next[locale])
      assert.ok(textOf(h.tree).includes(target.purpose))
      assert.ok(!textOf(h.tree).includes(target.practice),'Purpose before practice')
      await advanceOporaTo(h,'practice',next[locale])
      assert.ok(textOf(h.tree).includes(target.practice))
    }finally{h.unmount()}
  }
})

test('prior AS-5.8 receipt keeps the previous lesson wording on review; V9 receipt keeps V9',async()=>{
  for(const edition of ['as-5.8-one-action-v1',OPORA_SEVEN_SKILLS_EDITION]){
    const session={signals:{opora54:{answers:{experienceEdition:edition}}}}
    const h=make(2,'en',session,true)
    try{
      const isNew=edition===OPORA_SEVEN_SKILLS_EDITION
      assert.equal(nodes(h.tree).some(x=>x.props?.['data-opora-practical-skills-version']===OPORA_SEVEN_SKILLS_EDITION),isNew)
      await advanceOporaTo(h,'practice','Continue')
      const exercise=isNew?oporaAs59Day(2,'en').practice:oporaAs58Day(2,'en').practice
      assert.ok(textOf(h.tree).includes(exercise),'Review must match recorded edition '+edition)
    }finally{h.unmount()}
  }
})

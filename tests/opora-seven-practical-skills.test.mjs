import test from 'node:test'
import assert from 'node:assert/strict'
import {
  OPORA_PRACTICAL_EDITION,oporaPracticalDay,oporaPracticalSkillCards,oporaPracticalValid,
} from '../lib/inner-growth/opora-seven-practical-skills.js'
import {validateOpora54Signals} from '../lib/inner-growth/anti-stress-skills-v6.js'
import {oporaAs58Day} from '../lib/inner-growth/opora-as58-one-action.js'
import {oporaExperienceSupport} from '../lib/inner-growth/opora-as56-experience-guides.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {mount,nodes,textOf} from './helpers/route-pipeline-harness.mjs'
import {advanceOporaTo} from './helpers/opora-gentle-navigation.mjs'

const next={en:'Continue',ru:'Продолжить',es:'Continuar'}
const today={en:/Today/,ru:/Сегодня/u,es:/Hoy/}

test('seven practical skill labels, 14 unique exercises and supportive EN/RU/ES copy',()=>{
  assert.equal(oporaPracticalValid(),true)
  assert.equal(OPORA_PRACTICAL_EDITION,'as-5.9-seven-practical-skills-v1')
  for(const locale of ['en','ru','es']){
    const skills=oporaPracticalSkillCards(locale)
    assert.equal(skills.length,7)
    assert.equal(new Set(skills.map(x=>x.title)).size,7)
    assert.deepEqual(skills.map(x=>x.days),[[1,8],[2,9],[3,10],[4,11],[5,12],[6,13],[7,14]])
    const exerciseSet=new Set()
    for(let day=1;day<=14;day++){
      const copy=oporaPracticalDay(day,locale)
      assert.equal(copy.skill,day<=7?day:day-7)
      assert.equal(copy.skillTitle,skills[(day-1)%7].title)
      assert.ok(copy.title.length<=60)
      assert.ok(copy.practice.length<=180)
      assert.ok(copy.transfer.length<=180)
      assert.ok(copy.supportBody.length<=225)
      assert.match(copy.supportBody,today[locale])
      assert.notEqual(copy.practice,copy.transfer)
      assert.ok(copy.alternative,'Every daily skill must have a gentle opt-out')
      assert.ok(!/guaranteed|guarantees|will cure|исцелит|гарантирует|curará|garantizado/i.test(
        copy.practice+' '+copy.supportBody))
      assert.ok(!/hold your breath|задержите дыхание|contén la respiración/i.test(copy.practice))
      exerciseSet.add(copy.practice)
    }
    assert.equal(exerciseSet.size,14)
    assert.equal(oporaPracticalDay(2,locale).skill,oporaPracticalDay(9,locale).skill)
  }
  for(const invalid of [0,15,-1,1.5,'1',null])assert.equal(oporaPracticalDay(invalid),null)
})

test('practice selection gives concrete learning progression, not a second copy of visual orientation',()=>{
  for(const locale of ['en','ru','es']){
    const first=oporaPracticalDay(1,locale)
    const second=oporaPracticalDay(2,locale)
    const fifth=oporaPracticalDay(5,locale)
    const sixth=oporaPracticalDay(6,locale)
    assert.notEqual(first.practice,second.practice)
    assert.match(second.practice,/tap|коснитесь|toca/i,'Day 2 is gentle tactile rhythm, not another visual tracing')
    assert.match(fifth.practice,/gentle|бережнее|amabilidad/i,'Day 5 practises self-kindness')
    assert.match(sixth.practice,/support|поддержать|apoyarme/i,'Day 6 practises asking for support')
    assert.match(oporaPracticalDay(7,locale).practice,/Choose|Выберите|Elige/i)
  }
})

test('the existing session validator accepts new editorial version and rejects an unreviewed value',()=>{
  for(const edition of ['as-5.8-one-action-v1',OPORA_PRACTICAL_EDITION]){
    assert.equal(validateOpora54Signals({
      answers:{experienceEdition:edition},hints:[],ease:null,
    }).answers.experienceEdition,edition)
  }
  assert.throws(()=>validateOpora54Signals({
    answers:{experienceEdition:'unreviewed'},hints:[],ease:null,
  }),/INVALID_OPORA54_ANSWER/)
})

test('fresh first-week EN/RU/ES lessons show the same skill in why, practice and homework',async()=>{
  for(const locale of ['en','ru','es']){
    for(let day=1;day<=7;day++){
      const copy=oporaPracticalDay(day,locale)
      const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
      const h=mount('opora-experience-player',{
        locale, data:{cycle:{id:'00000000-0000-4000-8000-000000002059',day,durationDays:14},
          programme:{id:'stress'},lesson,currentSession:null},
        onClose(){},onFinish(){},onSession:async()=>{throw Error('Preview must never save')},
      })
      try{
        await advanceOporaTo(h,'support',next[locale])
        assert.ok(textOf(h.tree).includes(copy.supportBody))
        await advanceOporaTo(h,'recapPractice',next[locale])
        assert.ok(textOf(h.tree).includes(copy.practice))
        await advanceOporaTo(h,'practice',next[locale])
        assert.ok(textOf(h.tree).includes(copy.practice))
        assert.equal(nodes(h.tree).filter(n=>n.props?.['data-opora-one-daily-practice']===day).length,1)
        await advanceOporaTo(h,'save',next[locale])
        assert.ok(textOf(h.tree).includes(copy.transfer))
      }finally{h.unmount()}
    }
  }
})

test('a saved AS-5.8 lesson remains on the old instructions on reopen',async()=>{
  for(const locale of ['en','ru','es']){
    const day=2
    const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
    const old=oporaAs58Day(day,locale)
    const data={
      cycle:{id:'00000000-0000-4000-8000-000000002058',day,durationDays:14},
      programme:{id:'stress'},lesson,
      currentSession:{signals:{opora54:{answers:{experienceEdition:'as-5.8-one-action-v1'}}}},
    }
    const h=mount('opora-experience-player',{locale,data,reviewOnly:true,
      onClose(){},onFinish(){},onSession:async()=>{throw Error('No archived write')}})
    try{
      await advanceOporaTo(h,'support',next[locale])
      assert.ok(textOf(h.tree).includes(oporaExperienceSupport(day,locale).body))
      await advanceOporaTo(h,'practice',next[locale])
      assert.ok(textOf(h.tree).includes(old.practice))
      assert.ok(!textOf(h.tree).includes(oporaPracticalDay(day,locale).practice))
    }finally{h.unmount()}
  }
})

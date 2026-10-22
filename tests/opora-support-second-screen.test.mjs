import test from 'node:test'
import assert from 'node:assert/strict'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {
  oporaExperienceSupport, oporaExperienceSupportValid, oporaExperienceGuide,
} from '../lib/inner-growth/opora-as56-experience-guides.js'
import {OPORA_EXPERIENCE_PRE_SAVE_KEYS,OPORA_DAY_ONE_RESTORED_KEYS} from '../lib/inner-growth/course-slide-sequence.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'

const next={en:'Continue',ru:'Продолжить',es:'Continuar'}
const back={en:'Back',ru:'Назад',es:'Atrás'}
const think={en:'Need to think',ru:'Надо подумать',es:'Necesito pensarlo'}

test('support is authored for 14 days in EN/RU/ES, with no homework or performance question',()=>{
  assert.equal(oporaExperienceSupportValid(),true)
  for(const locale of ['en','ru','es']){
    for(let day=1;day<=14;day++){
      const copy=oporaExperienceSupport(day,locale)
      assert.ok(copy?.title&&copy?.body,locale+' '+day)
      assert.doesNotMatch(copy.title+' '+copy.body,/\?|\b(how did that go|i tried it|you should|you must|your task|tarea|задание|оцените|сделайте|попробуйте)\b/iu)
    }
  }
  for(const invalid of [0,15,-1,1.5,null,undefined,'2']){
    assert.equal(oporaExperienceSupport(invalid),null)
  }
})

test('all 14 support screens have four optional, unscored reactions in EN/RU/ES without a practice report',async()=>{
  for(const locale of ['en','ru','es']){
    for(let day=1;day<=14;day++){
      const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
      const data={cycle:{id:'00000000-0000-4000-8000-000000001058',day,durationDays:14},lesson,programme:{id:'stress'},currentSession:null}
      let writes=0
      const h=mount('opora-experience-player',{locale,data,onClose(){},onFinish(){},
        onSession:async()=>{writes++;return true}})
      try{
        const before=textOf(h.tree)
        assert.equal(nodes(h.tree).filter(x=>x.props?.['data-opora-daily-support']).length,0)
        findButton(h.tree,next[locale]).props.onClick();await h.settle()
        const supporting=nodes(h.tree).filter(x=>x.props?.['data-opora-daily-support']===day)
        assert.equal(supporting.length,1,'Missing supportive step '+locale+':'+day)
        assert.ok(textOf(h.tree).includes(oporaExperienceSupport(day,locale).title))
        assert.ok(textOf(h.tree).includes(oporaExperienceSupport(day,locale).body))
        assert.ok(!textOf(h.tree).includes(oporaExperienceGuide(day,locale)),'Task shown too early')
        assert.ok(!nodes(h.tree).some(x=>x.props?.['data-gentle-guidance']==='support'),'Support is not a hint')
        const reaction=nodes(h.tree).find(x=>x.props?.['data-opora-quote-reaction']==='support')
        assert.ok(reaction,'Missing optional quote response on '+locale+' day '+day)
        const reactions=nodes(reaction).filter(x=>x.type==='button'&&x.props?.['aria-pressed']!==undefined)
        assert.equal(reactions.length,4,'Agree, disagree, unsure and think should be reachable')
        assert.ok(reactions.every(x=>x.props['aria-pressed']===false))
        const thinking=findButton(h.tree,think[locale])
        assert.ok(thinking,'Localized reflection choice missing')
        thinking.props.onClick();await h.settle()
        assert.equal(findButton(h.tree,think[locale]).props['aria-pressed'],true)
        assert.equal(writes,0,'The opinion must not trigger a network save')
        assert.ok(!textOf(h.tree).includes(oporaExperienceGuide(day,locale)),'Feedback must not reveal or skip the exercise')
        findButton(h.tree,back[locale]).props.onClick();await h.settle()
        assert.equal(textOf(h.tree),before,'Back returns to unchanged arrival')
        findButton(h.tree,next[locale]).props.onClick();await h.settle()
        assert.equal(findButton(h.tree,think[locale]).props['aria-pressed'],true,
          'Back/Continue must retain the user's optional quote reaction')
        findButton(h.tree,next[locale]).props.onClick();await h.settle()
        assert.equal(nodes(h.tree).filter(x=>x.props?.['data-opora-daily-support']).length,0)
        if(day!==1) assert.ok(textOf(h.tree).includes(oporaExperienceGuide(day,locale)),
          'Optional practice must still be available on screen three')
        assert.equal(writes,0,'Reading support must not persist practice or health data')
        // The second quote-bearing screen (Day 1: original thought; Days 2–14:
        // daily aphorism) must offer the very same optional four-way feedback.
        for(let i=0;i<(day===1?3:2);i++){
          findButton(h.tree,next[locale]).props.onClick();await h.settle()
        }
        const aphorism=nodes(h.tree).find(x=>x.props?.['data-opora-quote-reaction']==='aphorism')
        assert.ok(aphorism,'Aphorism reaction missing '+locale+' day '+day)
        assert.equal(nodes(aphorism).filter(x=>x.type==='button'&&x.props?.['aria-pressed']!==undefined).length,4)
        findButton(h.tree,think[locale]).props.onClick();await h.settle()
        assert.equal(findButton(h.tree,think[locale]).props['aria-pressed'],true)
        findButton(h.tree,back[locale]).props.onClick();await h.settle()
        findButton(h.tree,next[locale]).props.onClick();await h.settle()
        assert.equal(findButton(h.tree,think[locale]).props['aria-pressed'],true,
          'Aphorism reaction must survive back/forward')
        assert.equal(writes,0,'A quote reaction alone must not save the lesson')
      }finally{h.unmount()}
    }
  }
})

test('the acceptance screen does not change backend visit-key shape',()=>{
  assert.deepEqual(OPORA_EXPERIENCE_PRE_SAVE_KEYS,
    ['arrive','practice','feel','affirmation','save'])
  assert.deepEqual(OPORA_DAY_ONE_RESTORED_KEYS,
    ['welcome','baseline','checkin','recall','affirmation','arrive','practice','feel','save'])
  for(const keys of [OPORA_EXPERIENCE_PRE_SAVE_KEYS,OPORA_DAY_ONE_RESTORED_KEYS]){
    assert.ok(!keys.includes('support'),'Support is not a fabricated lesson or practice signal')
  }
})

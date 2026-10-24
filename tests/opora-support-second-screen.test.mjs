import test from 'node:test'
import assert from 'node:assert/strict'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {
  oporaExperienceSupport, oporaExperienceSupportValid,
} from '../lib/inner-growth/opora-as56-experience-guides.js'
import {oporaAs59Day} from '../lib/inner-growth/opora-as59-seven-skills.js'
import {advanceOporaTo} from './helpers/opora-gentle-navigation.mjs'
import {OPORA_EXPERIENCE_PRE_SAVE_KEYS,OPORA_DAY_ONE_RESTORED_KEYS} from '../lib/inner-growth/course-slide-sequence.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'

const next={en:'Continue',ru:'Продолжить',es:'Continuar'}
const back={en:'Back',ru:'Назад',es:'Atrás'}
const kicker={en:'WHY WE PRACTISE',ru:'ЗАЧЕМ ЭТО НУЖНО',es:'PARA QUÉ PRACTICAMOS'}
const today={en:/Today/,ru:/Сегодня/u,es:/Hoy/}
// A distinct daily explanation, not a generic reassurance or an extra task.
const skillHint={
  en:[/three nearby objects/,/edge of a nearby object/,/chair supports us/,
    /mild emotion/,/having the thought that/,/answer later/,/short pause/,
    /early sign/,/straight line/,/grip of one hand/,/mild feeling/,
    /thought, not an order/,/need a little time/,/supportive action/],
  ru:[/три предмета/,/край одного предмета/,/стул поддерживает/,
    /несильную эмоцию/,/Мне пришла мысль/,/ответить позже/,/посильную паузу/,
    /ранний признак/,/прямую линию/,/хват одной руки/,/несильное чувство/,
    /Это мысль, не приказ/,/Мне нужно немного времени/,/поддерживающее действие/],
  es:[/tres objetos cercanos/,/borde de un objeto cercano/,/nos sostiene la silla/,
    /emoción leve/,/teniendo el pensamiento/,/Puedo responder después/,/pausa breve/,
    /primera señal/,/línea recta/,/aflojar un poco una mano/,/emoción leve/,
    /un pensamiento, no una orden/i,/Necesito un poco de tiempo/,/acción de apoyo/],
}

test('support is authored for 14 days in EN/RU/ES, with no homework or performance question',()=>{
  assert.equal(oporaExperienceSupportValid(),true)
  for(const locale of ['en','ru','es']){
    for(let day=1;day<=14;day++){
      const copy=oporaExperienceSupport(day,locale)
      assert.ok(copy?.title&&copy?.body,locale+' '+day)
      assert.ok(copy.title.length<=54&&copy.body.length<=225,'One-screen reading budget '+locale+':'+day)
      assert.match(copy.body,today[locale],'Missing explicit daily purpose '+locale+':'+day)
      assert.match(copy.body,skillHint[locale][day-1],'Second screen does not explain actual skill '+locale+':'+day)
      assert.doesNotMatch(copy.title+' '+copy.body,/\?|\b(how did that go|i tried it|you should|you must|your task|tarea|задание|оцените|сделайте|попробуйте)\b/iu)
    }
  }
  for(const invalid of [0,15,-1,1.5,null,undefined,'2']){
    assert.equal(oporaExperienceSupport(invalid),null)
  }
})

test('support is the SECOND visible screen of each of 14 days in all 3 languages, not a practice report',async()=>{
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
        assert.ok(textOf(h.tree).includes(kicker[locale]),'Missing WHY label '+locale)
        assert.ok(textOf(h.tree).includes(oporaAs59Day(day,locale).purposeTitle))
        assert.ok(textOf(h.tree).includes(oporaAs59Day(day,locale).purpose))
        assert.ok(!textOf(h.tree).includes(oporaAs59Day(day,locale).practice),'Task shown too early')
        assert.ok(!nodes(h.tree).some(x=>x.props?.['data-gentle-guidance']==='support'),'Support is not a hint')
        assert.equal(nodes(h.tree).filter(x=>x.props?.['aria-pressed']!==undefined).length,0,
          'No rating, answer, task confirmation or engagement choice on screen two')
        assert.equal(writes,0)
        findButton(h.tree,back[locale]).props.onClick();await h.settle()
        assert.equal(textOf(h.tree),before,'Back returns to unchanged arrival')
        findButton(h.tree,next[locale]).props.onClick();await h.settle()
        await advanceOporaTo(h,'practice',next[locale])
        assert.equal(nodes(h.tree).filter(x=>x.props?.['data-opora-daily-support']).length,0)
        assert.ok(textOf(h.tree).includes(oporaAs59Day(day,locale).practice),
          'Single authored daily practice must be reachable after the support screen')
        assert.equal(writes,0,'Reading support must not persist practice or health data')
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

import test from 'node:test'
import assert from 'node:assert/strict'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {oporaAs58Day,oporaAs58Valid,OPORA_ONE_ACTION_VERSION,OPORA_PRIMARY_EMOTIONS} from '../lib/inner-growth/opora-as58-one-action.js'
import {oporaExperienceTransferChoices} from '../lib/inner-growth/opora-as56-experience-guides.js'
import {OPORA_EXPERIENCE_PRE_SAVE_KEYS,OPORA_DAY_ONE_RESTORED_KEYS} from '../lib/inner-growth/course-slide-sequence.js'
import {mount,nodes,findButton,textOf} from './helpers/route-pipeline-harness.mjs'
import {advanceOporaTo} from './helpers/opora-gentle-navigation.mjs'

const LANGUAGE={
  en:{next:'Continue',plan:'I might try this',skip:'Not today',review:'I only explored them today',save:'Save my practice',joy:'Joy'},
  ru:{next:'Продолжить',plan:'Попробую позже',skip:'Не сегодня',review:'Пока только знакомлюсь',save:'Сохранить мою практику',joy:'Радость'},
  es:{next:'Continuar',plan:'Quizá lo intente',skip:'Hoy no',review:'Hoy solo las exploré',save:'Guardar mi práctica',joy:'Alegría'},
}
async function click(h,label){
  const b=findButton(h.tree,label)
  assert.ok(b,'Missing '+label+' in '+textOf(h.tree).slice(0,250))
  assert.ok(!b.props.disabled)
  await b.props.onClick()
  await h.settle()
}

test('AS-5.8 fully specifies 14 distinct one-task lessons and seven deepening skill pairs in EN/RU/ES',()=>{
  assert.equal(oporaAs58Valid(),true)
  assert.equal(OPORA_PRIMARY_EMOTIONS.length,8)
  assert.deepEqual(OPORA_PRIMARY_EMOTIONS.map(item=>item.value),[
    'joy','trust','fear','surprise','sadness','disgust','anger','anticipation'])
  for(const locale of Object.keys(LANGUAGE)){
    const tasks=new Set(),plans=new Set()
    for(let day=1;day<=14;day++){
      const d=oporaAs58Day(day,locale)
      assert.equal(d.day,day)
      assert.equal(d.skill,(day-1)%7+1)
      assert.equal(d.stage,day<=7?'discover':'deepen')
      assert.notEqual(d.practice,d.transfer)
      tasks.add(d.practice)
      plans.add(d.transfer)
      assert.ok(lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)?.id)
      if(day<=7)assert.equal(d.skill,oporaAs58Day(day+7,locale).skill)
    }
    assert.equal(tasks.size,14)
    assert.equal(plans.size,14)
  }
  assert.equal(oporaAs58Day(0),null)
  assert.equal(oporaAs58Day(15),null)
})

test('42 learner flows render ONE distinct task, a real status choice, skip, and exact owned payload',async()=>{
  for(const locale of Object.keys(LANGUAGE)){
    const labels=LANGUAGE[locale]
    for(let day=1;day<=14;day++){
      const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
      const data={cycle:{id:'00000000-0000-4000-8000-000000002058',day,durationDays:14},
        programme:{id:'stress'},lesson,currentSession:null}
      let payload,requests=0
      const player=mount('opora-experience-player',{locale,data,onClose(){},onFinish(){},
        async onSession(value){payload=structuredClone(value);requests++;return true}})
      try{
        assert.equal(nodes(player.tree).filter(n=>n.props?.['data-opora-one-action-version']===OPORA_ONE_ACTION_VERSION).length,1)
        await advanceOporaTo(player,'practice',labels.next)
        const focused=oporaAs58Day(day,locale)
        assert.ok(textOf(player.tree).includes(focused.practice))
        if(day===11){
          const picker=nodes(player.tree).find(n=>n.props?.['data-opora-emotion-picker']==='true')
          assert.ok(picker)
          assert.equal(nodes(picker).filter(n=>n.type==='button').length,8)
          const input=nodes(picker).find(n=>n.type==='input')
          assert.equal(input.props.maxLength,60)
          assert.equal(input.props.id,'opora-emotion-day-11')
          await click(player,labels.joy)
        }else assert.equal(nodes(player.tree).filter(n=>n.props?.['data-opora-emotion-picker']==='true').length,0)
        await advanceOporaTo(player,'save',labels.next)
        const expected=day===4?'one-feeling-and-field':'one-action-or-skip'
        assert.equal(nodes(player.tree).filter(n=>n.props?.['data-opora-everyday-choice']===expected).length,1)
        assert.equal(nodes(player.tree).filter(n=>n.props?.['data-opora-single-transfer']===day).length,1)
        assert.ok(textOf(player.tree).includes(focused.transfer))
        const old=oporaExperienceTransferChoices(day,locale)
        assert.ok(old.every(x=>!textOf(player.tree).includes(x.label)),
          'Old two-option UI must not leak into the new screen')
        if(day===4){
          const picker=nodes(player.tree).find(n=>n.props?.['data-opora-emotion-picker']==='true')
          assert.ok(picker)
          assert.equal(nodes(picker).filter(n=>n.type==='button').length,8)
          await click(player,labels.joy)
        }else await click(player,labels.plan)
        assert.equal(requests,0,'Planning must never be saved as an attempt')
        await advanceOporaTo(player,'recapFeedback',labels.next)
        await click(player,labels.review)
        await click(player,labels.save)
        assert.equal(requests,1)
        assert.equal(payload.lessonId,lesson.id)
        assert.equal(payload.opora54.answers.transfer,'planned')
        assert.equal(payload.opora54.answers.transferChoice,'two')
        assert.equal(payload.opora54.answers.transferPlanVersion,'one-v1')
        assert.equal(payload.opora54.answers.experienceEdition,'as-5.8-one-action-v1')
        assert.equal(payload.practiceAttempt,null,'Clicked Continue and chose a future plan, not a practice attempt')
        assert.equal(payload.opora54.answers.transferFeeling,undefined)
        assert.deepEqual(payload.practiceEmotion,[4,11].includes(day)?{choice:'joy'}:undefined)
        assert.deepEqual(payload.visitedSlideKeys,
          day===1?[...OPORA_DAY_ONE_RESTORED_KEYS]:[...OPORA_EXPERIENCE_PRE_SAVE_KEYS])
      }finally{player.unmount()}
    }
  }
})

test('Skipped plans keep a visible daily homework assignment without claiming commitment, for 14 days × 3 locales',async()=>{
  for(const locale of Object.keys(LANGUAGE)){
    const labels=LANGUAGE[locale]
    for(let day=1;day<=14;day++){
      const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
      const data={cycle:{id:'00000000-0000-4000-8000-000000002058',day,durationDays:14},
        programme:{id:'stress'},lesson,currentSession:null}
      let payload,writes=0
      const player=mount('opora-experience-player',{locale,data,onClose(){},onFinish(){},
        async onSession(value){payload=structuredClone(value);writes++;return true}})
      try{
        await advanceOporaTo(player,'save',labels.next)
        await click(player,labels.skip)
        await advanceOporaTo(player,'recapNext',labels.next)
        const homework=nodes(player.tree).find(n=>n.props?.['data-opora-daily-homework']===day)
        assert.ok(homework,'Missing homework for day '+day+' '+locale)
        assert.ok(textOf(homework).includes(oporaAs58Day(day,locale).transfer),
          'Keep the one specific daily exercise visible when the future plan is declined: '+day+' '+locale)
        assert.ok(!textOf(homework).includes('Nothing to plan today'))
        assert.equal(writes,0,'Reading homework does not record an action')
        await advanceOporaTo(player,'recapFeedback',labels.next)
        await click(player,labels.review)
        await click(player,labels.save)
        assert.equal(writes,1)
        assert.equal(payload.opora54.answers.transfer,'not_planning')
        assert.equal(payload.opora54.answers.transferChoice,undefined)
        assert.equal(payload.practiceAttempt,null)
        if(day===1){
          assert.match(oporaAs58Day(day,locale).transfer,/three ordinary objects|три обычных предмета|tres objetos cotidianos/)
          assert.match(oporaAs58Day(day,locale).transfer,/Two or three times today|Два-три раза за день|Dos o tres veces durante el día/)
        }
      }finally{player.unmount()}
    }
  }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {oporaAs58Day,OPORA_PRIMARY_EMOTIONS} from '../lib/inner-growth/opora-as58-one-action.js'
import {oporaAs59Day,OPORA_SEVEN_SKILLS_EDITION} from '../lib/inner-growth/opora-as59-seven-skills.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'
import {advanceOporaTo} from './helpers/opora-gentle-navigation.mjs'
const labels={en:{next:'Continue',map:"See what's next"},ru:{next:'Продолжить',map:'Посмотреть, что дальше'},es:{next:'Continuar',map:'Ver qué viene después'}}
function fixture(locale,day,currentSession=null,acceptSave=false){
  let writes=0
  const data={cycle:{id:'00000000-0000-4000-8000-000000007059',day,durationDays:14},
    programme:{id:'stress'},currentSession,
    lesson:lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)}
  const original=structuredClone(data)
  const h=mount('opora-experience-player',{locale,data,onClose(){},onFinish(){},onSession:async()=>{writes++;return acceptSave}})
  return {h,data,original,get writes(){return writes}}
}
test('actual EmotionVocabulary renders eight optional localized choices and the bounded Day4 input',async()=>{
  for(const locale of ['en','ru','es']){
    const f=fixture(locale,4)
    try{
      await advanceOporaTo(f.h,'save',labels[locale].next)
      const vocabulary=nodes(f.h.tree).find(n=>n.props?.['data-opora-emotion-picker']==='true')
      assert.ok(vocabulary,'The real local child must execute, not remain an opaque JSX node')
      assert.deepEqual(nodes(vocabulary).filter(n=>n.type==='button').map(n=>textOf(n)),
        OPORA_PRIMARY_EMOTIONS.map(e=>e.label[locale]))
      const input=nodes(vocabulary).find(n=>n.type==='input')
      assert.ok(input);assert.equal(input.props.maxLength,60)
      input.props.onChange({target:{value:'calma'}});await f.h.settle()
      assert.equal(nodes(f.h.tree).find(n=>n.type==='input'&&n.props?.['data-opora-transfer-feeling']==='true').props.value,'calma')
      assert.equal(f.writes,0);assert.deepEqual(f.data,f.original)
    }finally{f.h.unmount()}
  }
})
test('actual OporaCoursePath renders all 14 days using the saved edition without writes',async()=>{
  for(const locale of ['en','ru','es'])for(const edition of ['as-5.8-one-action-v1',OPORA_SEVEN_SKILLS_EDITION]){
    const f=fixture(locale,3,{signals:{opora54:{answers:{experienceEdition:edition}}}})
    try{
      const button=findButton(f.h.tree,labels[locale].map)
      assert.ok(button,labels[locale].map);button.props.onClick();await f.h.settle()
      const map=nodes(f.h.tree).find(n=>n.props?.['data-opora-course-map']==='all-14-days')
      assert.ok(map,'The real local roadmap must execute, not remain an opaque JSX node')
      const days=nodes(map).filter(n=>n.props?.['data-opora-journey-day'])
      assert.equal(days.length,14)
      for(let day=1;day<=14;day++){
        const card=days.find(n=>n.props['data-opora-journey-day']===day)
        const copy=edition===OPORA_SEVEN_SKILLS_EDITION?oporaAs59Day(day,locale):oporaAs58Day(day,locale)
        assert.ok(textOf(card).includes(copy.title));assert.ok(textOf(card).includes(copy.practice))
        assert.equal(card.props['data-day-status'],day<=3?'completed':day===4?'next':'locked')
      }
      assert.equal(f.writes,0);assert.deepEqual(f.data,f.original)
    }finally{f.h.unmount()}
  }
})


test('Day1 optional habit decline bypasses setup after one confirmed save in EN/RU/ES',async()=>{
  const copy={en:{choice:'I only explored them today',save:'Save my practice',skip:'Not now',back:'Back',setup:'Set it up'},
    ru:{choice:'Пока только знакомлюсь',save:'Сохранить мою практику',skip:'Не сейчас',back:'Назад',setup:'Настроить'},
    es:{choice:'Hoy solo las exploré',save:'Guardar mi práctica',skip:'Ahora no',back:'Atrás',setup:'Configurar'}}
  for(const locale of ['en','ru','es']){
    const f=fixture(locale,1,null,true),w=copy[locale]
    const click=async label=>{const b=findButton(f.h.tree,label);assert.ok(b,label);b.props.onClick();await f.h.settle()}
    try{
      await advanceOporaTo(f.h,'recapFeedback',labels[locale].next)
      await click(w.choice);await click(w.save)
      assert.equal(f.writes,1)
      await click(labels[locale].map);await click(locale==='es'?'Me comprometo':"I'm committed")
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-first-lesson-habit-invitation']))
      assert.equal(nodes(f.h.tree).filter(n=>n.props?.['data-opora-first-lesson-habit-setup']).length,0)
      const skip=nodes(f.h.tree).find(n=>n.props?.['data-opora-habit-skip'])
      assert.ok(skip);assert.equal(textOf(skip),w.skip);assert.equal(skip.props.disabled,false)
      await click(w.skip)
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-tomorrow-links']==='true'))
      assert.equal(nodes(f.h.tree).filter(n=>n.props?.['data-opora-first-lesson-habit-setup']).length,0)
      assert.equal(f.writes,1,'Declining setup cannot resave the lesson')
      // Back and the separate explicit Set it up path keep their original meaning.
      await click(w.back)
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-first-lesson-habit-invitation']))
      await click(w.setup)
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-first-lesson-habit-setup']))
      assert.equal(nodes(f.h.tree).filter(n=>n.props?.['data-opora-habit-skip']).length,0)
      await click(w.back)
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-habit-skip']))
      assert.equal(f.writes,1);assert.deepEqual(f.data,f.original)
    }finally{f.h.unmount()}
  }
})

test('an unconfirmed save never exposes congratulations, course map or habit setup',async()=>{
  for(const [locale,choice,save] of [
    ['en','I only explored them today','Save my practice'],
    ['ru','Пока только знакомлюсь','Сохранить мою практику'],
    ['es','Hoy solo las exploré','Guardar mi práctica'],
  ]){
    const f=fixture(locale,1,null,false)
    try{
      await advanceOporaTo(f.h,'recapFeedback',labels[locale].next)
      findButton(f.h.tree,choice).props.onClick();await f.h.settle()
      findButton(f.h.tree,save).props.onClick();await f.h.settle()
      assert.equal(f.writes,1)
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-current-screen']==='recapFeedback'))
      assert.ok(!nodes(f.h.tree).some(n=>n.props?.['data-opora-current-screen']==='receipt'||
        n.props?.['data-opora-course-map']||n.props?.['data-opora-first-lesson-habit-invitation']||
        n.props?.['data-opora-first-lesson-habit-setup']))
      assert.deepEqual(f.data,f.original)
    }finally{f.h.unmount()}
  }
})

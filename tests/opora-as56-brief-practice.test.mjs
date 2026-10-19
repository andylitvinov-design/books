import test from 'node:test'
import assert from 'node:assert/strict'
import {oporaExperienceDay,oporaExperienceGuide,oporaExperienceGuidesValid,OPORA_EXPERIENCE_DESIGN_VERSION} from '../lib/inner-growth/opora-as56-experience-guides.js'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'

const words={
  ru:{next:'Продолжить',previous:'Назад',help:'Показать мягкую подсказку',pause:'Пауза',back:'Вернуться',
    neutral:'Вернуться с нейтральной опорой',end:'Закончить без сохранения',hard:'Стало некомфортно',
    anchor:'Если хочется, посмотрите на один обычный предмет вокруг.',
    safety:/Не нужно продолжать через дискомфорт/,breath:/Дышите естественно/},
  en:{next:'Continue',previous:'Back',help:'Show gentle guidance',pause:'Pause',back:'Go back',
    neutral:'Return with a neutral anchor',end:'End without saving',hard:'Uncomfortable',
    anchor:'If you wish, look at one ordinary object around you.',
    safety:/You do not need to push through discomfort/,breath:/Let your breath remain natural/},
  es:{next:'Continuar',previous:'Atrás',help:'Ver una pista suave',pause:'Pausa',back:'Volver',
    neutral:'Volver con una referencia neutra',end:'Salir sin guardar',hard:'Incómodo',
    anchor:'Si quieres, mira un objeto neutro a tu alrededor.',
    safety:/No tienes que seguir si te incomoda/,breath:/respira con naturalidad/},
}
// Reviewed AS5.7 owner actions. Words inside a quoted self-statement are not
// additional instructions; quoted ellipses are a thought prefix, not new steps.
const actions={
  en:['let','rest','notice','name','add','practise','repeat','notice','rest','let','name','say','practise','repeat'],
  ru:['переводите','остановите','заметьте','назовите','добавьте','произнесите','повторите','заметьте','остановите','расслабьте','назовите','скажите','произнесите','повторите'],
  es:['mueve','detén','nota','nombra','añade','practica','repite','observa','detén','relaja','nombra','di','practica','repite'],
}
function fixture(locale,day=5,currentSession=null){
  const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
  const data={cycle:{id:'00000000-0000-4000-8000-000000001056',day,durationDays:14},programme:{id:'stress'},lesson,currentSession}
  const original=structuredClone(data)
  let saves=0,closes=0
  const h=mount('opora-experience-player',{locale,data,onClose(){closes++},onFinish(){},onSession:async()=>{saves++;return true}})
  return {h,data,original,get saves(){return saves},get closes(){return closes},
    async click(label){const b=findButton(h.tree,label);assert.ok(b,label);await b.props.onClick();await h.settle()}}
}
function assertNeutral(f,locale){
  const anchor=nodes(f.h.tree).find(n=>n.props?.['data-opora-neutral-anchor']==='true')
  assert.ok(anchor);assert.ok(textOf(anchor).includes(words[locale].anchor))
  assert.ok(!nodes(f.h.tree).some(n=>n.props?.role==='alertdialog'||n.props?.inert===true||n.props?.['data-opora-optional-guidance']))
  assert.ok(!textOf(f.h.tree).includes(oporaExperienceGuide(5,locale)),'original day-five practice is not reintroduced')
  assert.equal(f.saves,0);assert.deepEqual(f.data,f.original)
}
for(const locale of ['ru','en','es'])for(let day=1;day<=14;day++){
  test(`AS5.7 ${locale} day ${day}: current owner practice stays one brief action`,()=>{
    const copy=oporaExperienceDay(day,locale),brief=oporaExperienceGuide(day,locale)
    assert.equal(brief,copy.practice)
    assert.ok(brief.length<=140&&brief.split(/\s+/u).length<=20)
    assert.doesNotMatch(brief,/\n|затем|потом|\bthen\b|\bafter that\b|\bluego\b|\bdespués\b/iu)
    const instruction=brief.replace(/[«“][^»”]*[»”]/gu,'')
    assert.ok((brief.replace(/…/gu,'').match(/[.!?]/gu)||[]).length<=1,'one instruction sentence, including a quoted prefix')
    const verbs=[...new Set(actions[locale])]
    assert.deepEqual(instruction.toLocaleLowerCase().split(/[^\p{L}]+/u).filter(x=>verbs.includes(x)),[actions[locale][day-1]])
    assert.doesNotMatch(instruction,/экзамен|обязан|должны|\bquiz\b|\bexam\b|\byou must\b|\bdebes\b/iu)
  })
  test(`AS5.7 ${locale} day ${day}: actual player preserves owner title, practice and voluntary hint without writes`,async()=>{
    const f=fixture(locale,day),t=words[locale]
    try{
      // Day 1 now begins with five restored check-in slides and a gentle arrival;
      // the daily practice follows those six screens, not the initial Welcome.
      for(let i=0;i<(day===1?6:1);i++)await f.click(t.next)
      assert.ok(textOf(f.h.tree).includes(oporaExperienceDay(day,locale).title))
      assert.ok(textOf(f.h.tree).includes(oporaExperienceGuide(day,locale)))
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-course-visual-theme']===OPORA_EXPERIENCE_DESIGN_VERSION))
      assert.equal(findButton(f.h.tree,t.help).props['aria-expanded'],false)
      await f.click(t.help)
      const help=nodes(f.h.tree).find(n=>n.props?.['data-opora-optional-guidance']==='true')
      assert.ok(help)
      assert.equal(textOf(help),locale==='es'?'Si te incomoda, mira un objeto neutro.':f.data.lesson.antiStress.neutralText)
      await f.click(t.help);await f.click(t.pause)
      const safety=nodes(f.h.tree).find(n=>n.props?.role==='alertdialog')
      assert.match(textOf(safety),t.safety);assert.match(textOf(safety),t.breath)
      assert.equal(nodes(safety).filter(n=>n.type==='button').length,3)
      await f.click(t.back)
      assert.equal(f.saves,0);assert.deepEqual(f.data,f.original)
    }finally{f.h.unmount()}
  })
}
for(const locale of ['ru','en','es']){
  const t=words[locale]
  for(const priorHelp of [false,true])for(const source of ['practice','feel','discomfort']){
    test(`AS5.7 ${locale}: neutral return from ${source}, hint initially ${priorHelp?'open':'closed'}, remains safe through Back`,async()=>{
      const f=fixture(locale)
      try{
        await f.click(t.next)
        if(priorHelp)await f.click(t.help)
        if(source!=='practice')await f.click(t.next)
        await f.click(source==='discomfort'?t.hard:t.pause)
        await f.click(t.neutral);assertNeutral(f,locale)
        if(source!=='practice')await f.click(t.previous)
        assertNeutral(f,locale)
        assert.equal(findButton(f.h.tree,t.help).props['aria-expanded'],false)
        await f.click(t.help)
        assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-optional-guidance']==='true'),'hint remains a deliberate separate choice')
        await f.click(t.pause);await f.click(t.neutral);assertNeutral(f,locale)
        await f.click(t.next);await f.click(t.previous);assertNeutral(f,locale)
        await f.click(t.pause);await f.click(t.back);assertNeutral(f,locale)
        await f.click(t.pause)
        const dialog=nodes(f.h.tree).find(n=>n.props?.role==='alertdialog')
        let prevented=false;dialog.props.onKeyDown({key:'Escape',preventDefault(){prevented=true}})
        await f.h.settle();assert.equal(prevented,true);assertNeutral(f,locale)
        await f.click(t.pause);await f.click(t.end)
        assert.equal(f.closes,1);assert.equal(f.saves,0);assert.deepEqual(f.data,f.original)
      }finally{f.h.unmount()}
    })
  }
  for(const step of [0,1,2,3,4,5]){
    test(`AS5.7 ${locale}: neutral return stays visible from moment ${step}`,async()=>{
      const f=fixture(locale,5,step===5?{signals:{opora54:{answers:{}}}}:null)
      try{
        if(step<5)for(let i=0;i<step;i++)await f.click(t.next)
        await f.click(t.pause);await f.click(t.neutral);assertNeutral(f,locale)
      }finally{f.h.unmount()}
    })
  }
  test(`AS5.7 ${locale}: ordinary Go back preserves an explicitly opened hint without saving`,async()=>{
    const f=fixture(locale)
    try{
      await f.click(t.next);await f.click(t.help);await f.click(t.pause);await f.click(t.back)
      assert.equal(findButton(f.h.tree,t.help).props['aria-expanded'],true)
      await f.click(t.pause);await f.click(t.end)
      assert.equal(f.saves,0);assert.equal(f.closes,1);assert.deepEqual(f.data,f.original)
    }finally{f.h.unmount()}
  })
}
test('AS5.7 validates current trilingual content without resurrecting superseded long guidance',()=>{
  assert.equal(oporaExperienceGuidesValid(),true)
  assert.equal(OPORA_EXPERIENCE_DESIGN_VERSION,'as-5.7-soft-morning')
  for(const day of [0,15,-1,1.5,null,undefined,'1'])assert.equal(oporaExperienceGuide(day),null)
  assert.match(oporaExperienceGuide(12,'ru'),/мысль, что…/u)
  assert.match(oporaExperienceGuide(12,'en'),/thought that…/u)
  assert.match(oporaExperienceGuide(12,'es'),/pensamiento de que…/u)
})

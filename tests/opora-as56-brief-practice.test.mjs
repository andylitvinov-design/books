import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {oporaExperienceDay,oporaExperienceGuide,oporaExperienceGuidesValid,OPORA_EXPERIENCE_DESIGN_VERSION} from '../lib/inner-growth/opora-as56-experience-guides.js'
import {oporaAs58Day,oporaAs58Valid} from '../lib/inner-growth/opora-as58-one-action.js'
import {oporaAs60VariedDay,oporaAs60VariedJourney} from '../lib/inner-growth/opora-as60-varied-content.js'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'
import {advanceOporaTo} from './helpers/opora-gentle-navigation.mjs'
import {OPORA_EXPERIENCE_CHANNELS,OPORA_EXPERIENCE_SCENES} from '../lib/inner-growth/opora-as60-integrated-journey.js'

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
  en:['look','rest','notice','name','add','practise','repeat','notice','rest','let','name','say','practise','repeat'],
  ru:['посмотрите','остановите','заметьте','назовите','добавьте','произнесите','повторите','заметьте','остановите','расслабьте','назовите','скажите','произнесите','повторите'],
  es:['mira','detén','nota','nombra','añade','practica','repite','observa','detén','relaja','nombra','di','practica','repite'],
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
      // The acceptance screen is second for every day. Day 1 still keeps its
      // five original opening screens before arriving at practical work.
      await advanceOporaTo(f.h,'practice',t.next)
      const current=oporaAs60VariedDay(day,locale)
      assert.ok(textOf(f.h.tree).includes(current.title),'Current 3-step practice has its own day title')
      assert.ok(textOf(f.h.tree).includes(current.practice),'Practice card shows the real AS-6.0 experiment')
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
        await advanceOporaTo(f.h,'practice',t.next)
        if(priorHelp)await f.click(t.help)
        if(source!=='practice')await advanceOporaTo(f.h,'feel',t.next)
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
  for(const step of [0,1,2,3,4,5,6]){
    test(`AS5.7 ${locale}: neutral return stays visible from moment ${step}`,async()=>{
      const f=fixture(locale,5,step===6?{signals:{opora54:{answers:{}}}}:null)
      try{
        if(step<6)for(let i=0;i<step;i++)await f.click(t.next)
        await f.click(t.pause);await f.click(t.neutral);assertNeutral(f,locale)
      }finally{f.h.unmount()}
    })
  }
  test(`AS5.7 ${locale}: ordinary Go back preserves an explicitly opened hint without saving`,async()=>{
    const f=fixture(locale)
    try{
      await advanceOporaTo(f.h,'practice',t.next)
      await f.click(t.help);await f.click(t.pause);await f.click(t.back)
      assert.equal(findButton(f.h.tree,t.help).props['aria-expanded'],true)
      await f.click(t.pause);await f.click(t.end)
      assert.equal(f.saves,0);assert.equal(f.closes,1);assert.deepEqual(f.data,f.original)
    }finally{f.h.unmount()}
  })
}
test('AS5.7 validates current trilingual content without resurrecting superseded long guidance',()=>{
  assert.equal(oporaExperienceGuidesValid(),true)
  assert.equal(oporaAs58Valid(),true)
  assert.equal(OPORA_EXPERIENCE_DESIGN_VERSION,'as-5.7-soft-morning')
  for(const day of [0,15,-1,1.5,null,undefined,'1'])assert.equal(oporaExperienceGuide(day),null)
  assert.match(oporaExperienceGuide(12,'ru'),/мысль, что…/u)
  assert.match(oporaExperienceGuide(12,'en'),/thought that…/u)
  assert.match(oporaExperienceGuide(12,'es'),/pensamiento de que…/u)
})

test('hosted day-five verifier follows current AS6 copy and all five channels without weakening browser safety',()=>{
  const source=readFileSync(new URL('../scripts/verify-opora-as56-browser.mjs',import.meta.url),'utf8')
  for(const fragment of [
    'daily = oporaAs60VariedDay(5, locale)',
    'journey = oporaAs60VariedJourney(5, locale), brief = daily.practice',
    'support = { title: daily.purposeTitle, body: daily.purpose }',
    'toContainText(daily.result)',
    'OPORA_EXPERIENCE_SCENES.slice(0, 4)',
    "await assertChannel('ritualPractice')",
    'toContainText(journey[channel].text)', 'toContainText(journey[channel].hint)',
    'toContainText(journey.mental.plan)', 'await expect(card).toHaveCount(1)',
    'name: journey[channel].title, exact: true',
    "await summary.locator(':scope > div').count(),1,",
    "'[data-opora-lesson-recap=\"true\"]' : '[data-opora-daily-homework=\"5\"]'",
  ]) assert.ok(source.includes(fragment),fragment)
  assert.doesNotMatch(source,/oporaExperienceSupport\(5|oporaExperienceDepth\(5|brief = oporaExperienceGuide|\.summaryItem/)
  for(const fragment of [
    'requireHostedOporaBrowser(process.env)', "['ru', 'en', 'es']", '[320, 360, 390, 430]', '[false, true]',
    "serviceWorkers: 'block'", "route.abort('blockedbyclient')", 'assert.equal(evidence.cases.length, 24)',
    'assert.equal(state.saves, 0,', 'assert.equal(state.closes, 1); assert.equal(state.finishes, 0)',
    'assert.equal(state.finalData, state.initialData', 'assert.deepEqual(unexpectedRequests, []',
    'assert.deepEqual(errors, []', 'assert.equal(recapSaves,0,',
    'brief.length <= 140 && brief.split(/\\s+/u).length <= 20',
    "await page.keyboard.press('Shift+Tab')", "await page.keyboard.press('Tab')", "await page.keyboard.press('Escape')",
    'bounds.document <= width + 1,', 'bounds.stage.scroll <= bounds.stage.client + 1,',
    'bounds.panel.scroll <= bounds.panel.client + 2,', 'bounds.stage.scrollHeight <= bounds.stage.clientHeight + 2,',
    'size.panelScroll <= size.panelClient + 2,', 'size.mainScroll <= size.mainClient + 2,',
    'size.screenWidth <= width + 1,', "throw error",
  ]) assert.ok(source.includes(fragment),fragment)
  assert.doesNotMatch(source,/route\.continue|request\.post|\.request\.fetch|createServer|waitForTimeout|force:\s*true|process\.env\.[A-Z_]*(?:TOKEN|SECRET|PASSWORD)/)
})

for(const locale of ['ru','en','es']) test(`AS6 ${locale}: hosted day-five sequence keeps exact current content, neutral Back and one-card recaps without saves`,async()=>{
  const f=fixture(locale),t=words[locale],daily=oporaAs60VariedDay(5,locale),journey=oporaAs60VariedJourney(5,locale)
  const current=()=>nodes(f.h.tree).find(n=>n.props?.['data-opora-current-screen'])?.props['data-opora-current-screen']
  const marker=(key,value)=>nodes(f.h.tree).find(n=>n.props?.[key]===value)
  const assertChannel=scene=>{
    const key=OPORA_EXPERIENCE_CHANNELS[OPORA_EXPERIENCE_SCENES.indexOf(scene)]
    assert.equal(current(),scene)
    const cards=nodes(f.h.tree).filter(n=>n.props?.['data-opora-experience-channel']===key)
    assert.equal(cards.length,1)
    assert.ok(textOf(f.h.tree).includes(journey[key].title))
    assert.ok(textOf(cards[0]).includes(journey[key].text))
    assert.ok(textOf(cards[0]).includes(journey[key].hint))
    if(key==='mental')assert.ok(textOf(cards[0]).includes(journey.mental.plan))
  }
  try{
    await f.click(t.next);assert.equal(current(),'support')
    assert.ok(textOf(marker('data-opora-daily-support',5)).includes(daily.purpose))
    assert.ok(textOf(f.h.tree).includes(daily.purposeTitle))
    for(const scene of ['why','story','options','settle']){await f.click(t.next);assert.equal(current(),scene)}
    await f.click(t.next);assert.equal(current(),'recapPractice')
    assert.ok(textOf(marker('data-opora-overview-purpose','true')).includes(daily.result))
    assert.ok(textOf(marker('data-opora-practice-overview',5)).includes(daily.practice))
    assert.deepEqual(OPORA_EXPERIENCE_CHANNELS,['body','emotion','mental','imagery','ritual'])
    assert.deepEqual(OPORA_EXPERIENCE_SCENES,['bodyExperience','emotionExperience','mentalExperience','imageryMeditation','ritualPractice'])
    for(const scene of OPORA_EXPERIENCE_SCENES.slice(0,4)){await f.click(t.next);assertChannel(scene)}
    await f.click(t.next);assert.equal(current(),'practice')
    assert.ok(textOf(marker('data-opora-one-daily-practice',5)).includes(daily.practice))
    assert.ok(daily.practice.length<=140&&daily.practice.split(/\s+/u).length<=20)
    assert.ok((daily.practice.replace(/…/gu,'').match(/[.!?]/gu)||[]).length<=1)
    await f.click(t.next);assertChannel('ritualPractice')
    await f.click(t.previous);assert.equal(current(),'practice')
    await f.click(t.help);await f.click(t.pause);await f.click(t.neutral);assertNeutral(f,locale)
    await f.click(t.next);assert.equal(current(),'ritualPractice')
    await f.click(t.next);assert.equal(current(),'feel')
    await f.click(t.pause);await f.click(t.neutral)
    await f.click(t.previous);assert.equal(current(),'ritualPractice');assertNeutral(f,locale)
    await f.click(t.previous);assert.equal(current(),'practice');assertNeutral(f,locale)
    assert.ok(!textOf(f.h.tree).includes(daily.practice),'Neutral return cannot reintroduce the current AS6 practice either')
    await advanceOporaTo(f.h,'recap',t.next)
    for(const [scene,key,value] of [['recap','data-opora-lesson-recap','true'],['recapNext','data-opora-daily-homework',5]]){
      assert.equal(current(),scene)
      const summary=marker(key,value);assert.ok(summary)
      const children=Array.isArray(summary.props.children)?summary.props.children:[summary.props.children]
      assert.equal(children.filter(n=>n&&n.type==='div').length,1,'Each summary has exactly one direct idea card')
      assert.ok(textOf(summary).includes(scene==='recap'?daily.result:daily.transfer))
      await f.click(t.next)
    }
    assert.equal(current(),'recapFeedback')
    assert.equal(f.saves,0);assert.deepEqual(f.data,f.original)
  }finally{f.h.unmount()}
})

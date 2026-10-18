import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {oporaExperienceGuide,oporaExperienceGuidance,oporaExperienceGuidesValid} from '../lib/inner-growth/opora-as56-experience-guides.js'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'

const words={
  ru:{previous:'Назад',neutral:'Вернуться с нейтральной опорой',original:'Показать исходную подсказку',
    end:'Закончить без сохранения',hard:'Стало некомфортно',
    neutralSafety:'Можно остановиться; дыхание менять не нужно.',
    next:'Продолжить',help:'Показать мягкую подсказку',pause:'Пауза',back:'Вернуться',
    safety:/Не нужно продолжать через дискомфорт/,breath:/Дышите естественно/},
  en:{previous:'Back',neutral:'Return with a neutral anchor',original:'Show original guidance',
    end:'End without saving',hard:'Uncomfortable',
    neutralSafety:'You can stop; no need to change your breathing.',
    next:'Continue',help:'Show gentle guidance',pause:'Pause',back:'Go back',
    safety:/You do not need to push through discomfort/,breath:/Let your breath remain natural/},
}
// Reviewed action verbs: the learner is asked to do one thing, not a sequence.
const actions={
  ru:['посмотрите','рассмотрите','расслабьте','выберите','отделите','произнесите','попробуйте',
    'задержите','задержите','измените','назовите','добавьте','произнесите','попробуйте'],
  en:['look','notice','soften','choose','separate','try','try','rest','rest','adjust','name','place','try','try'],
}
for(const locale of ['ru','en'])for(let day=1;day<=14;day++){
  test(`AS-5.6 ${locale} day ${day}: one short sentence names one concrete gentle action`,()=>{
    const brief=oporaExperienceGuide(day,locale)
    assert.equal(typeof brief,'string')
    assert.match(brief,/^[^.!?…]+[.]$/u,'one sentence, not a paragraph or question')
    assert.ok(brief.length<=140,'at most 140 characters')
    assert.ok(brief.split(/\s+/u).length<=20,'at most 20 words')
    const verbs=[...new Set(actions[locale])]
    const matching=brief.toLocaleLowerCase().split(/[^\p{L}]+/u).filter(word=>verbs.includes(word))
    assert.deepEqual(matching,[actions[locale][day-1]],'exactly one reviewed action verb')
    assert.doesNotMatch(brief,/затем|потом|после этого|сначала|\bthen\b|\bnext\b|\bfirst\b/iu,'no multi-step demand')
    assert.doesNotMatch(brief,/экзамен|проверьте|правильн|обязан|должны|\bquiz\b|\bexam\b|\bcorrect\b|\byou must\b|\byou have to\b/iu)
    assert.doesNotMatch(brief,/вспомните.*(травм|трудн|неприят)|закройте глаза|задержите дыхание|через боль|\brelive\b|\bclose your eyes\b|\bhold your breath\b|\bpush through\b/iu)
    if([4,5,11,12].includes(day))assert.match(brief,locale==='ru'?/вымышленн/:/imaginary/)
    assert.notEqual(brief,oporaExperienceGuidance(day,locale))
  })

  test(`AS-5.6 ${locale} day ${day}: full guidance is optional and safety stays reachable without writes`,async()=>{
    const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
    const data={cycle:{id:'00000000-0000-4000-8000-000000001056',day,durationDays:14},
      programme:{id:'stress'},lesson,currentSession:null}
    const original=structuredClone(data),t=words[locale]
    let saves=0
    const h=mount('opora-experience-player',{locale,data,onClose(){},onFinish(){},
      onSession:async()=>{saves++;return true}})
    const click=async label=>{
      const button=findButton(h.tree,label);assert.ok(button,label)
      await button.props.onClick();await h.settle()
    }
    try{
      await click(t.next)
      assert.ok(textOf(h.tree).includes(oporaExperienceGuide(day,locale)))
      assert.ok(!textOf(h.tree).includes(oporaExperienceGuidance(day,locale)),'long coaching starts hidden')
      assert.equal(findButton(h.tree,t.help).props['aria-expanded'],false)
      await click(t.help)
      assert.equal(findButton(h.tree,t.help).props['aria-expanded'],true)
      const help=nodes(h.tree).find(node=>node.props?.['data-opora-optional-guidance']==='true')
      assert.ok(help)
      assert.ok(textOf(help).includes(oporaExperienceGuidance(day,locale)))
      if(lesson.antiStress?.neutralText)assert.ok(textOf(help).includes(lesson.antiStress.neutralText))
      await click(t.help)
      assert.ok(!textOf(h.tree).includes(oporaExperienceGuidance(day,locale)))
      await click(t.pause)
      const safety=nodes(h.tree).find(node=>node.props?.role==='alertdialog')
      assert.ok(safety)
      assert.match(textOf(safety),t.safety)
      assert.match(textOf(safety),t.breath)
      assert.equal(nodes(safety).filter(node=>node.type==='button').length,3)
      await click(t.back)
      assert.equal(saves,0,'reading guidance and pausing never saves or invents an attempt')
      assert.deepEqual(data,original,'lesson versions and historical data are untouched')
    }finally{h.unmount()}
  })
}

test('all 28 original detailed guides and safety wording are preserved byte for byte',()=>{
  const detail=['ru','en'].flatMap(locale=>Array.from({length:14},(_,i)=>oporaExperienceGuidance(i+1,locale)))
  assert.equal(createHash('sha256').update(JSON.stringify(detail)).digest('hex'),
    '46a9f8cf27b4654f6f362b0c348552d4b2a61d14b3a07a5bdc0e75bcaeb2cc6b')
  assert.equal(oporaExperienceGuidesValid(),true)
  for(const day of [0,15,-1,1.5,null,undefined,'1']){
    assert.equal(oporaExperienceGuide(day),null)
    assert.equal(oporaExperienceGuidance(day),null)
  }
})

function pausedFixture(locale,currentSession=null){
  const day=5,lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
  const data={cycle:{id:'00000000-0000-4000-8000-000000001056',day,durationDays:14},
    programme:{id:'stress'},lesson,currentSession}
  const original=structuredClone(data)
  let saves=0,closes=0
  const h=mount('opora-experience-player',{locale,data,onClose(){closes++},onFinish(){},
    onSession:async()=>{saves++;return true}})
  return {h,data,original,get saves(){return saves},get closes(){return closes},
    async click(label){
      const button=findButton(h.tree,label);assert.ok(button,label)
      await button.props.onClick();await h.settle()
    }}
}
function assertNeutral(f,locale){
  const anchor=nodes(f.h.tree).find(node=>node.props?.['data-opora-neutral-anchor']==='true')
  assert.ok(anchor,'neutral grounding is visible after return')
  const instruction=nodes(anchor).find(node=>node.props?.className==='lead')
  assert.match(textOf(instruction),/^[^.!?…]+[.]$/u)
  assert.ok(textOf(instruction).split(/\s+/u).length<=20)
  assert.ok(textOf(anchor).includes(words[locale].neutralSafety))
  assert.ok(!nodes(f.h.tree).some(node=>node.props?.role==='alertdialog'))
  assert.ok(!nodes(f.h.tree).some(node=>node.props?.inert===true))
  assert.ok(!nodes(f.h.tree).some(node=>node.props?.['data-opora-optional-guidance']))
  assert.ok(!textOf(f.h.tree).includes(oporaExperienceGuide(5,locale)))
  assert.ok(!textOf(f.h.tree).includes(oporaExperienceGuidance(5,locale)))
  assert.doesNotMatch(textOf(f.h.tree),/меня игнорируют|I am being ignored/iu)
  assert.equal(f.saves,0)
  assert.deepEqual(f.data,f.original)
}
for(const locale of ['ru','en']){
  const t=words[locale]
  test(`AS-5.6 ${locale}: arrival and feeling each have one short visible instruction with original coaching optional`,async()=>{
    const f=pausedFixture(locale)
    const original={
      ru:[['Оглянитесь. Найдите один приятный или нейтральный цвет рядом. Не спешите — вы уже начали.',
        'Почувствуйте опору сиденья или просто посмотрите на устойчивый предмет. Дыхание менять не нужно.'],
      ['Побудьте несколько мгновений. Не нужно специально добиваться спокойствия. Просто сравните ощущения, если хочется.']],
      en:[['Look around. Find one pleasant or neutral colour nearby. There is no hurry — you have already begun.',
        'Feel the support of your seat, or simply look at a steady object. No need to change your breathing.'],
      ['Stay here a few moments. You do not have to make yourself calm. Just notice what is here, if you wish.']],
    }[locale]
    try{
      for(let moment=0;moment<2;moment++){
        const leads=nodes(f.h.tree).filter(node=>node.props?.className==='lead')
        assert.equal(leads.length,1)
        const instruction=textOf(leads[0])
        assert.match(instruction,/^[^.!?…]+[.]$/u)
        assert.ok(instruction.length<=140)
        assert.ok(instruction.split(/\s+/u).length<=20)
        assert.doesNotMatch(instruction,/экзамен|должны|обязан|\bexam\b|\bmust\b|\bthen\b/iu)
        for(const coaching of original[moment])assert.ok(!textOf(f.h.tree).includes(coaching))
        await f.click(t.help)
        for(const coaching of original[moment])assert.ok(textOf(f.h.tree).includes(coaching))
        if(moment===0){await f.click(t.next);await f.click(t.next)}
      }
      assert.equal(f.saves,0)
    }finally{f.h.unmount()}
  })
  for(const priorHelp of [false,true])for(const source of ['practice','feel','discomfort']){
    test(`AS-5.6 ${locale}: neutral return from ${source}, help previously ${priorHelp?'open':'closed'}, never auto-reveals the original exercise`,async()=>{
      const f=pausedFixture(locale)
      try{
        await f.click(t.next)
        if(priorHelp)await f.click(t.help)
        if(source!=='practice'){
          await f.click(t.next)
          assert.equal(findButton(f.h.tree,t.help).props['aria-expanded'],false,'help does not follow navigation')
          if(priorHelp)await f.click(t.help)
        }
        await f.click(source==='discomfort'?t.hard:t.pause)
        await f.click(t.neutral)
        assertNeutral(f,locale)
        if(source!=='practice')await f.click(t.previous)
        assertNeutral(f,locale)
        assert.equal(findButton(f.h.tree,t.original).props['aria-expanded'],false)
        // Deliberately asking for original detail remains a separate choice.
        await f.click(t.original)
        assert.ok(textOf(f.h.tree).includes(oporaExperienceGuidance(5,locale)))
        // A second neutral return closes even explicitly reopened guidance.
        await f.click(t.pause);await f.click(t.neutral)
        assertNeutral(f,locale)
        await f.click(t.next);await f.click(t.previous)
        assertNeutral(f,locale)
        await f.click(t.pause);await f.click(t.back)
        assertNeutral(f,locale)
        await f.click(t.pause)
        const dialog=nodes(f.h.tree).find(node=>node.props?.role==='alertdialog')
        let prevented=false
        dialog.props.onKeyDown({key:'Escape',preventDefault(){prevented=true}})
        await f.h.settle()
        assert.equal(prevented,true)
        assertNeutral(f,locale)
        await f.click(t.pause);await f.click(t.end)
        assert.equal(f.closes,1)
        assert.equal(f.saves,0,'return, navigation, Escape and exit never save or report an attempt')
        assert.deepEqual(f.data,f.original)
      }finally{f.h.unmount()}
    })
  }
  for(const step of [0,1,2,3,4,5]){
    test(`AS-5.6 ${locale}: neutral return is visible from moment ${step}, including an already saved receipt`,async()=>{
      const f=pausedFixture(locale,step===5?{signals:{opora54:{answers:{}}}}:null)
      try{
        if(step<5)for(let i=0;i<step;i++)await f.click(t.next)
        await f.click(t.pause);await f.click(t.neutral)
        assertNeutral(f,locale)
      }finally{f.h.unmount()}
    })
  }
  for(const priorHelp of [false,true]){
    test(`AS-5.6 ${locale}: ordinary pause return keeps help ${priorHelp?'open':'closed'} and exit does not save`,async()=>{
      const f=pausedFixture(locale)
      try{
        await f.click(t.next)
        if(priorHelp)await f.click(t.help)
        await f.click(t.pause);await f.click(t.back)
        assert.equal(findButton(f.h.tree,t.help).props['aria-expanded'],priorHelp)
        assert.equal(textOf(f.h.tree).includes(oporaExperienceGuidance(5,locale)),priorHelp)
        assert.ok(!nodes(f.h.tree).some(node=>node.props?.['data-opora-neutral-anchor']))
        await f.click(t.pause);await f.click(t.end)
        assert.equal(f.closes,1);assert.equal(f.saves,0)
        assert.deepEqual(f.data,f.original)
      }finally{f.h.unmount()}
    })
  }
}
test('day 12 preserves the grammatical connector in each imaginary thought prefix',()=>{
  assert.match(oporaExperienceGuide(12,'ru'),/«У меня появилась мысль, что»/u)
  assert.match(oporaExperienceGuide(12,'en'),/“I am having the thought that”/u)
})

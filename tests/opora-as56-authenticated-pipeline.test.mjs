import test from 'node:test'
import assert from 'node:assert/strict'
import { repositoryHarness, mount, findButton, nodes, textOf } from './helpers/route-pipeline-harness.mjs'
import { COURSE_ANTISTRESS_SKILLS_V6, OPORA54_PRE_SAVE_KEYS } from '../lib/inner-growth/anti-stress-skills-v6.js'
import { COURSE_ANTISTRESS_SKILLS_V7 } from '../lib/inner-growth/anti-stress-skills-v7.js'
import { OPORA_EXPERIENCE_PRE_SAVE_KEYS, OPORA_DAY_ONE_RESTORED_KEYS } from '../lib/inner-growth/course-slide-sequence.js'

const labels = {
  en: { next: 'Continue', tried: 'I tried it', same: 'About the same', vote: 'Not sure yet', plan: 'Keep this reminder', save: 'Save my practice', receipt: 'Your moment is saved' },
  ru: { next: 'Продолжить', tried: 'Я попробовал(а)', same: 'Примерно так же', vote: 'Пока не уверен(а)', plan: 'Хочу запомнить этот вариант', save: 'Сохранить мою практику', receipt: 'Ваш момент сохранён' },
}
async function click(player, label) {
  const button = findButton(player.tree, label)
  assert.ok(button, label + ' in ' + textOf(player.tree).slice(0, 160))
  assert.ok(!button.props.disabled)
  await button.props.onClick()
  await player.settle()
}

for (const locale of ['en', 'ru']) for (let day = 1; day <= 14; day++) {
  test(`AS-5.6 ${locale} day ${day}: actual five-moment player saves an exact V7 lesson through the owner repository`, async () => {
    const owner = repositoryHarness({ freshPhase: true })
    const cycle = await owner.create('AS2')
    assert.equal(cycle.content_version, COURSE_ANTISTRESS_SKILLS_V7)
    owner.seedDay(day)
    const data = await owner.read(locale), t = labels[locale]
    let payload, receipt, requests = 0
    const player = mount('opora-experience-player', { locale, data, onClose() {}, onFinish() {},
      async onSession(input) {
        requests++
        payload = structuredClone(input)
        receipt = await owner.command(payload, locale)
        return true
      },
    })
    try {
      if(day===1){
        // Five original gentle opening screens precede even the first activity.
        await click(player, locale==='ru'?'Чувствую напряжение':'I feel tense')
        assert.match(textOf(player.tree),locale==='ru'
          ?/Не нужно сразу менять своё состояние/:/Nothing needs to change right away/)
        for(let i=0;i<4;i++)await click(player,t.next)
        await click(player,t.vote)
        await click(player,t.next)
        await click(player,t.next)
      }else{
        // Preserve the existing warm first screen and feedback on Days 2–14.
        await click(player, locale==='ru'?'Напряжённо':'Tense')
        assert.match(textOf(player.tree),locale==='ru'
          ?/не нужно заставлять себя расслабиться/:/do not have to make yourself relax/)
        await click(player,t.next)
      }
      await click(player,t.tried)
      await click(player,t.next)
      await click(player,t.same)
      await click(player,t.next)
      if(day!==1){await click(player,t.vote);await click(player,t.next)}
      await click(player,t.plan)
      assert.equal(requests, 0, 'Opening moments and choosing responses never saves')
      await click(player, t.save)
      assert.equal(requests, 1)
      assert.ok(receipt)
      assert.ok(textOf(player.tree).includes(t.receipt))
      const saved = owner.sessions.at(-1)
      assert.equal(saved.lesson_id, data.lesson.id)
      assert.equal(saved.content_version, COURSE_ANTISTRESS_SKILLS_V7)
      assert.equal(owner.cycle.content_version, COURSE_ANTISTRESS_SKILLS_V7)
      assert.equal(saved.signals.window, 'practice_v6')
      assert.equal(saved.signals.interactionSchema,
        day===1?'as-5.8-restored-five-opening-v1':'as-5.6-five-moments-v1')
      assert.equal(payload.welcomeFeeling,'tense')
      assert.equal(saved.signals.welcomeFeeling,'tense')
      assert.deepEqual(payload.visitedSlideKeys,
        day===1?[...OPORA_DAY_ONE_RESTORED_KEYS]:[...OPORA_EXPERIENCE_PRE_SAVE_KEYS])
      if(day===1)assert.deepEqual(saved.signals.oporaOpening,
        {resource:null,lastDayDifficulty:null,familiarSupport:null})
      assert.equal(saved.signals.practiceAttempt, 'tried')
      assert.equal(saved.signals.opora54.answers.act, undefined, 'The guided moment is not an old multiple-choice exercise')
      assert.equal(saved.signals.opora54.answers.actChoice, undefined)
      assert.equal(saved.signals.opora54.answers.reflection, 'unchanged')
      assert.equal(saved.signals.opora54.answers.aphorism, 'unsure')
      assert.equal(saved.signals.opora54.answers.transfer, 'planned')
      if (day === 14) assert.equal(receipt.cycle.status, 'completed')
      else {
        const writes = owner.writes.length
        await owner.command(payload, locale)
        assert.equal(owner.writes.length, writes, 'Retrying the same saved operation is idempotent')
      }
    } finally { player.unmount() }
  })
}

for (const locale of ['en', 'ru']) test(`AS-5.6 ${locale} can save without inventing an attempt, vote, plan or improvement`, async () => {
  const owner = repositoryHarness({ freshPhase: true })
  await owner.create('AS2')
  owner.seedDay(1)
  const data = await owner.read(locale), t = labels[locale]
  const player = mount('opora-experience-player', { locale, data, onClose() {},
    async onSession(input) { await owner.command(structuredClone(input), locale); return true },
  })
  try {
    for (let i = 0; i < 8; i++) await click(player, t.next)
    await click(player, t.save)
    const saved = owner.sessions.at(-1)
    assert.equal(saved.signals.interactionSchema, 'as-5.8-restored-five-opening-v1')
    assert.deepEqual(saved.signals.oporaOpening,
      {resource:null,lastDayDifficulty:null,familiarSupport:null})
    assert.equal(saved.signals.practiceAttempt, null)
    assert.equal(saved.signals.aphorismResponse, null)
    assert.equal(saved.signals.transferStage, null)
    assert.deepEqual(saved.signals.opora54.answers, {})
    assert.equal(saved.feedback, 'skip')
    assert.equal(saved.before_now, null)
    assert.equal(saved.after_now, null)
    assert.ok(textOf(player.tree).includes(t.receipt))
  } finally { player.unmount() }
})

test('the owner repository rejects five-moment shortcuts for V6 and missing/reordered moments for V7 without writes', async () => {
  for (const [version, visitedSlideKeys, error] of [
    [COURSE_ANTISTRESS_SKILLS_V6, [...OPORA_EXPERIENCE_PRE_SAVE_KEYS], 'INVALID_COURSE_MEASUREMENT_WINDOW'],
    [COURSE_ANTISTRESS_SKILLS_V7, OPORA_EXPERIENCE_PRE_SAVE_KEYS.slice(0, -1), 'COURSE_SLIDES_INCOMPLETE'],
    [COURSE_ANTISTRESS_SKILLS_V7, [...OPORA_EXPERIENCE_PRE_SAVE_KEYS].reverse(), 'COURSE_SLIDES_INCOMPLETE'],
    [COURSE_ANTISTRESS_SKILLS_V7, [...OPORA54_PRE_SAVE_KEYS], 'COURSE_SLIDES_INCOMPLETE'],
  ]) {
    const owner = repositoryHarness({ freshPhase: true })
    await owner.create('AS2')
    owner.cycle.content_version = version
    owner.seedDay(1)
    const data = await owner.read('en'), writes = owner.writes.length
    await assert.rejects(owner.command({
      day: 1, lessonId: data.lesson.id, operationId: '00000000-0000-4000-8000-000000001056',
      feedback: 'skip', practiceWindow: 'practice_v6', visitedSlideKeys,
      opora54: { answers: {}, hints: [], ease: null },
    }), new RegExp(error))
    assert.equal(owner.writes.length, writes)
    assert.equal(owner.sessions.length, 0)
    assert.equal(owner.cycle.content_version, version)
  }
})

test('Day 1 optional own resource is mutually exclusive with buttons, encrypted, and restored in EN/RU/ES',async()=>{
  for(const [locale,answer,next,back,quick,save] of [
    ['en','Quiet music','Continue','Back','A little rest','Save my practice'],
    ['ru','Тихая музыка','Продолжить','Назад','Немного отдыха','Сохранить мою практику'],
    ['es','Música suave','Continuar','Atrás','Descansar','Guardar mi práctica'],
  ]){
    const owner=repositoryHarness({freshPhase:true})
    await owner.create('AS2')
    owner.seedDay(1)
    const data=await owner.read(locale)
    let payload=null
    const player=mount('opora-experience-player',{locale,data,onClose(){},onFinish(){},
      async onSession(input){
        payload=structuredClone(input)
        await owner.command(payload,locale)
        return true
      },
    })
    const getField=()=>nodes(player.tree).find(n=>n.type==='input'&&n.props?.['data-opora-own-resource']==='true')
    try{
      for(let i=0;i<3;i++)await click(player,next)
      assert.ok(getField(),'Day 1 must offer a text input below the quick choices')
      assert.equal(getField().props.maxLength,160)
      getField().props.onChange({target:{value:'  '+answer+'  '}})
      await player.settle()
      assert.equal(getField().props.value,'  '+answer+'  ')
      await click(player,back)
      await click(player,next)
      assert.equal(getField().props.value,'  '+answer+'  ','Back and Continue must retain the draft')
      await click(player,quick)
      assert.equal(getField().props.value,'','A quick choice clears the custom answer')
      getField().props.onChange({target:{value:'  '+answer+'  '}})
      await player.settle()
      const button=findButton(player.tree,quick)
      assert.equal(button.props['aria-pressed'],false,'Typing a custom resource deselects quick choices')
      for(let i=0;i<5;i++)await click(player,next)
      await click(player,save)
      assert.deepEqual(payload.oporaOpening,{
        resource:null,lastDayDifficulty:null,familiarSupport:'other',familiarSupportText:answer,
      })
      const stored=owner.sessions.at(-1).signals.oporaOpening
      assert.equal(stored.familiarSupport,'other')
      assert.equal(typeof stored.familiarSupportTextCiphertext,'string')
      assert.ok(stored.familiarSupportTextCiphertext.length>30)
      assert.equal(stored.familiarSupportText,undefined,'Free text must not be stored in plaintext JSON signals')
      assert.equal(JSON.stringify(owner.sessions.at(-1).signals).includes(answer),false)
      const readBack=await owner.read(locale)
      assert.equal(readBack.currentSession?.signals?.oporaOpening?.familiarSupportText,answer,
        'The signed-in learner can read the decrypted answer after saving')
    }finally{player.unmount()}
  }
})

test('Day 1 rejects malformed, oversize or mismatched custom answers before writing',async()=>{
  for(const invalid of [
    {familiarSupport:'other',familiarSupportText:''},
    {familiarSupport:'other',familiarSupportText:'x'.repeat(161)},
    {familiarSupport:'other',familiarSupportText:5},
    {familiarSupport:'pause',familiarSupportText:'Quiet music'},
    {familiarSupport:null,familiarSupportText:'Quiet music'},
    {familiarSupport:'other',familiarSupportText:'Line\\nBreak'},
  ]){
    const owner=repositoryHarness({freshPhase:true})
    await owner.create('AS2')
    owner.seedDay(1)
    const data=await owner.read('en')
    const before=owner.writes.length
    await assert.rejects(owner.command({
      day:1,lessonId:data.lesson.id,operationId:'00000000-0000-4000-8000-000000001079',
      feedback:'skip',practiceWindow:'practice_v6',
      visitedSlideKeys:[...OPORA_DAY_ONE_RESTORED_KEYS],
      opora54:{answers:{},hints:[],ease:null},
      oporaOpening:{resource:null,lastDayDifficulty:null,...invalid},
    }),'INVALID_OPORA_OPENING')
    assert.equal(owner.sessions.length,0)
    assert.equal(owner.writes.length,before)
  }
})

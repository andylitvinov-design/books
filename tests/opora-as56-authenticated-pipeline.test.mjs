import test from 'node:test'
import assert from 'node:assert/strict'
import { repositoryHarness, mount, findButton, nodes, textOf } from './helpers/route-pipeline-harness.mjs'
import { COURSE_ANTISTRESS_SKILLS_V6, OPORA54_PRE_SAVE_KEYS } from '../lib/inner-growth/anti-stress-skills-v6.js'
import { COURSE_ANTISTRESS_SKILLS_V7 } from '../lib/inner-growth/anti-stress-skills-v7.js'
import { OPORA_EXPERIENCE_PRE_SAVE_KEYS, OPORA_DAY_ONE_RESTORED_KEYS } from '../lib/inner-growth/course-slide-sequence.js'
import { oporaExperienceTransferChoices } from '../lib/inner-growth/opora-as56-experience-guides.js'
import {OPORA_EXPERIENTIAL_EDITION} from '../lib/inner-growth/opora-as60-experiential-practices.js'
import {oporaAs60VariedDay,OPORA_VARIETY_REVISION} from '../lib/inner-growth/opora-as60-varied-content.js'
import {oporaEndingCopy} from '../lib/inner-growth/opora-lesson-outro.js'
import {advanceOporaTo} from './helpers/opora-gentle-navigation.mjs'

const labels = {
  en: { next: 'Continue', tried: 'I tried it', same: 'About the same', vote: 'Need to think', save: 'Save my practice' },
  ru: { next: 'Продолжить', tried: 'Я попробовал(а)', same: 'Примерно так же', vote: 'Нужно подумать', save: 'Сохранить мою практику' },
}
async function click(player, label) {
  const button = findButton(player.tree, label)
  assert.ok(button, label + ' in ' + textOf(player.tree).slice(0, 160))
  assert.ok(!button.props.disabled)
  await button.props.onClick()
  await player.settle()
}

// An explicit adjacent-screen contract, not a search-until-found or extra-click loop.
// Each actual Continue must reveal exactly the next authored editorial stage.
async function followScreens(player, sequence, next, assertUnsaved = () => {}) {
  for (let index = 0; index < sequence.length; index++) {
    const screens = nodes(player.tree).filter(n => n.props?.['data-opora-current-screen'])
    assert.deepEqual(screens.map(n => n.props['data-opora-current-screen']), [sequence[index]],
      'OPORA must not skip, repeat or reorder a lesson stage')
    assertUnsaved()
    if (index < sequence.length - 1) await click(player, next)
  }
}
function assertReceipt(player, locale, day) {
  const receipt = nodes(player.tree).find(n => n.props?.['data-opora-current-screen'] === 'receipt')
  assert.ok(receipt, 'Only a confirmed save opens the receipt')
  assert.ok(nodes(player.tree).some(n => n.props?.['data-opora-lesson-outro'] === 'saved'))
  const ending = oporaEndingCopy(locale)
  assert.equal(textOf(nodes(receipt).find(n => n.type === 'h2')),
    day === 14 ? ending.congratsFinal : ending.congratsTitle.replace('{day}', String(day)))
  assert.equal(nodes(player.tree).filter(n => n.props?.role === 'alert').length, 0)
}

for (const locale of ['en', 'ru']) for (let day = 1; day <= 14; day++) {
  test(`AS-5.6 ${locale} day ${day}: actual five-moment player saves an exact V7 lesson through the owner repository`, async () => {
    const owner = repositoryHarness({ freshPhase: true })
    const cycle = await owner.create('AS2')
    assert.equal(cycle.content_version, COURSE_ANTISTRESS_SKILLS_V7)
    owner.seedDay(day)
    const data = await owner.read(locale), t = labels[locale]
    const originalData = structuredClone(data), priorSessions = structuredClone(owner.sessions)
    let payload, receipt, requests = 0
    const player = mount('opora-experience-player', { locale, data, onClose() {}, onFinish() {},
      async onSession(input) {
        requests++
        payload = structuredClone(input)
        receipt = await owner.command(payload, locale)
        return true
      },
    })
    const assertUnsaved = () => {
      assert.equal(requests, 0, 'Editorial navigation and responses cannot save')
      assert.equal(findButton(player.tree, t.save), undefined, 'No early save control')
      assert.ok(!nodes(player.tree).some(n => n.props?.['data-opora-current-screen'] === 'receipt'))
    }
    try {
      if(day===1){
        // Five original gentle opening screens precede even the first activity.
        await click(player, locale==='ru'?'Чувствую напряжение':'I feel tense')
        assert.match(textOf(player.tree),locale==='ru'
          ?/Не нужно сразу менять своё состояние/:/Nothing needs to change right away/)
        await followScreens(player,['welcome','support','baseline','checkin','recall','affirmation'],t.next,assertUnsaved)
        await click(player,t.vote)
        await click(player,t.next)
        // The invitation requires an affirmative answer before the first action.
        await click(player,locale==='ru'?'Да, готов(а)':"Yes, I’m ready")
        assert.ok(nodes(player.tree).some(n=>n.props?.['data-opora-practice-overview']===1))
        await followScreens(player,['recapPractice','bodyExperience','emotionExperience',
          'mentalExperience','imageryMeditation','practice'],t.next,assertUnsaved)
      }else{
        // Preserve the existing warm first screen and feedback on Days 2–14.
        await click(player, locale==='ru'?'Напряжённо':'Tense')
        assert.match(textOf(player.tree),locale==='ru'
          ?/не нужно заставлять себя расслабиться/:/do not have to make yourself relax/)
        await click(player,t.next) // support, with no required response
        await followScreens(player,['support','why','story','options','settle','recapPractice',
          'bodyExperience','emotionExperience','mentalExperience','imageryMeditation','practice'],t.next,assertUnsaved)
      }
      if(day===11)await click(player,locale==='ru'?'Доверие':'Trust')
      await click(player,t.tried)
      await followScreens(player,['practice','ritualPractice','feel'],t.next,assertUnsaved)
      await click(player,t.same)
      await click(player,t.next)
      if(day!==1){await click(player,t.vote);await click(player,t.next)}
      const realLifeChoice=oporaExperienceTransferChoices(day,locale)[0]
      const daily=oporaAs60VariedDay(day,locale)
      assert.ok(realLifeChoice?.label,'Archive choices must remain available')
      assert.ok(textOf(player.tree).includes(daily.transfer),'The live player uses a single authored action')
      assert.ok(!textOf(player.tree).includes(realLifeChoice.label),'Old choices are hidden in live lessons')
      if(day===4){
        const field=nodes(player.tree).find(n=>n.type==='input'&&n.props?.['data-opora-transfer-feeling']==='true')
        assert.ok(field,'Day 4 emotion entry must exist')
        field.props.onChange({target:{value:locale==='ru'?'спокойствие':'a quieter feeling'}})
        await player.settle()
      }else await click(player,locale==='ru'?'Попробую позже':'I might try this')
      await followScreens(player,['save','recap','recapNext'],t.next,assertUnsaved)
      await click(player,t.next)
      await followScreens(player,['recapFeedback'],t.next)
      await click(player,t.save)
      assert.equal(requests,0,'Final recap still requires a voluntary confidence answer')
      await click(player,locale==='ru'?'Получилось немного':'I managed a little')
      assert.equal(requests, 0, 'Opening moments and choosing responses never saves')
      await click(player, t.save)
      assert.equal(requests, 1)
      assert.ok(receipt)
      assertReceipt(player,locale,day)
      const saved = owner.sessions.at(-1)
      assert.deepEqual(structuredClone(data), originalData, 'Player must retain its supplied course and personal data')
      assert.deepEqual(owner.sessions.slice(0,-1), priorSessions, 'Historical learner sessions are unchanged')
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
      assert.equal(saved.signals.opora54.answers.transferChoice, 'two')
      assert.equal(saved.signals.opora54.answers.transferFeeling,undefined,
        'Free-text emotions must never be saved in plain JSONB')
      assert.equal(saved.signals.opora54.answers.transferPlanVersion,'one-v1')
      assert.equal(saved.signals.opora54.answers.experienceEdition,OPORA_EXPERIENTIAL_EDITION)
      assert.equal(saved.signals.opora54.answers.contentRevision,OPORA_VARIETY_REVISION)
      if(day===4){
        // A distinctive fixture avoids a false plaintext match on welcomeFocus='calm_regulation'.
        const answer=locale==='ru'?'спокойствие':'a quieter feeling'
        assert.deepEqual(payload.practiceEmotion,{customText:answer})
        assert.equal(saved.signals.practiceEmotion?.customText,undefined)
        assert.ok(saved.signals.practiceEmotion?.customTextCiphertext?.length>30)
        assert.equal(JSON.stringify(saved.signals).includes(answer),false)
        const readBack=await owner.read(locale)
        assert.equal(readBack.currentSession?.signals?.practiceEmotion?.customText,answer)
      }else if(day===11){
        assert.deepEqual(payload.practiceEmotion,{choice:'trust'})
        assert.deepEqual(saved.signals.practiceEmotion,{choice:'trust'})
      }else assert.equal(saved.signals.practiceEmotion,undefined)
      assert.equal(saved.signals.opora54.answers.lessonConfidence,'some')
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
    await advanceOporaTo(player,'recapFeedback',t.next)
    await click(player,locale==='ru'?'Пока только знакомлюсь':'I only explored them today')
    await click(player, t.save)
    const saved = owner.sessions.at(-1)
    assert.equal(saved.signals.interactionSchema, 'as-5.8-restored-five-opening-v1')
    assert.deepEqual(saved.signals.oporaOpening,
      {resource:null,lastDayDifficulty:null,familiarSupport:null})
    assert.equal(saved.signals.practiceAttempt, null)
    assert.equal(saved.signals.aphorismResponse, null)
    assert.equal(saved.signals.transferStage, null)
    assert.deepEqual(saved.signals.opora54.answers, {
        experienceEdition:OPORA_EXPERIENTIAL_EDITION,contentRevision:OPORA_VARIETY_REVISION,
        lessonConfidence:'explored'})
    assert.equal(saved.feedback, 'skip')
    assert.equal(saved.before_now, null)
    assert.equal(saved.after_now, null)
    assertReceipt(player,locale,1)
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
      for(let i=0;i<4;i++)await click(player,next)
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
      await advanceOporaTo(player,'recapFeedback',next)
      await click(player,locale==='ru'?'Пока только знакомлюсь':locale==='es'?'Hoy solo las exploré':'I only explored them today')
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
    {familiarSupport:'other',familiarSupportText:'Line\nBreak'},
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
    }),/INVALID_OPORA_OPENING/)
    assert.equal(owner.sessions.length,0)
    assert.equal(owner.writes.length,before)
  }
})

test('first-exercise readiness cannot be replaced by generic Continue or an early save', async () => {
  for (const [locale, yes, no] of [
    ['en', 'Yes, I’m ready', 'Not now'], ['ru', 'Да, готов(а)', 'Не сейчас'],
  ]) {
    const owner = repositoryHarness({ freshPhase: true })
    await owner.create('AS2')
    const data = await owner.read(locale), t = labels[locale], writes = owner.writes.length
    let closes = 0, requests = 0
    const player = mount('opora-experience-player', { locale, data,
      onClose() { closes++ }, async onSession() { requests++; return true },
    })
    try {
      await followScreens(player, ['welcome', 'support', 'baseline', 'checkin', 'recall',
        'affirmation', 'arrive'], t.next)
      assert.equal(findButton(player.tree, t.next), undefined, 'Generic Continue cannot bypass readiness')
      assert.equal(findButton(player.tree, t.tried), undefined, 'Readiness is not an attempt')
      assert.equal(findButton(player.tree, t.save), undefined, 'Consent cannot save a lesson')
      assert.ok(findButton(player.tree, yes), 'An affirmative learner action remains available')
      await click(player, no)
      assert.equal(closes, 1)
      assert.equal(requests, 0)
      assert.equal(owner.writes.length, writes)
      assert.equal(owner.sessions.length, 0)
    } finally { player.unmount() }
  }
})

test('a refused or failed save never opens a receipt or completes the owner lesson', async () => {
  for (const outcome of ['refused', 'failed']) {
    const owner = repositoryHarness({ freshPhase: true })
    await owner.create('AS2')
    const data = await owner.read('en'), writes = owner.writes.length
    const cycle = structuredClone(owner.cycle)
    let requests = 0
    const player = mount('opora-experience-player', { locale: 'en', data, onClose() {},
      async onSession() {
        requests++
        if (outcome === 'failed') throw new Error('Synthetic rejected save')
        return false
      },
    })
    try {
      await advanceOporaTo(player, 'recapFeedback', 'Continue')
      await click(player, 'I only explored them today')
      await click(player, 'Save my practice')
      assert.equal(requests, 1, 'Exactly one learner-requested save; no retry')
      await followScreens(player, ['recapFeedback'], 'Continue')
      assert.equal(nodes(player.tree).filter(n => n.props?.role === 'alert').length, 1)
      assert.ok(!nodes(player.tree).some(n => n.props?.['data-opora-lesson-outro'] === 'saved'))
      assert.equal(owner.writes.length, writes)
      assert.equal(owner.sessions.length, 0)
      assert.deepEqual(owner.cycle, cycle)
    } finally { player.unmount() }
  }
})

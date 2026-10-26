import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import {onlyKeys} from '../lib/assessments/contracts.js'
import {repositoryHarness,mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'
import {advanceOporaTo} from './helpers/opora-gentle-navigation.mjs'
import {OPORA_EXPERIENCE_PRE_SAVE_KEYS} from '../lib/inner-growth/course-slide-sequence.js'

const locales=[
  {lang:'en',next:'Continue',review:'I only explored them today',save:'Save my practice',
    feeling:'A little unsure',choice:'Joy'},
  {lang:'ru',next:'Продолжить',review:'Пока только знакомлюсь',save:'Сохранить мою практику',
    feeling:'Немного неуверенно',choice:'Радость'},
  {lang:'es',next:'Continuar',review:'Hoy solo las exploré',save:'Guardar mi práctica',
    feeling:'Algo incierto',choice:'Alegría'},
]
async function click(player,label){
  const button=findButton(player.tree,label)
  assert.ok(button,'Missing '+label+' in '+textOf(player.tree).slice(0,300))
  await button.props.onClick()
  await player.settle()
}
function field(player,day){
  return nodes(player.tree).find(n=>n.type==='input'&&
    n.props?.[day===4?'data-opora-transfer-feeling':'data-opora-own-emotion']==='true')
}

test('EN/RU/ES Day 4 and 11 free-text emotions are voluntary, owner-only and sealed in course signals',async()=>{
  for(const {lang,next,review,save,feeling,choice} of locales)for(const day of [4,11]){
    const owner=repositoryHarness({freshPhase:true,sameRealm:true})
    await owner.create('AS2')
    owner.seedDay(day)
    const data=await owner.read(lang)
    let submitted=null
    const player=mount('opora-experience-player',{locale:lang,data,onClose(){},onFinish(){},
      async onSession(input){submitted=structuredClone(input);await owner.command(submitted,lang);return true}})
    try{
      await advanceOporaTo(player,day===4?'save':'practice',next)
      const input=field(player,day)
      assert.ok(input,'Optional emotion field missing on '+lang+' day '+day)
      assert.equal(input.props.maxLength,60)
      await click(player,choice)
      assert.equal(findButton(player.tree,choice).props['aria-pressed'],true)
      field(player,day).props.onChange({target:{value:'  '+feeling+'  '}})
      await player.settle()
      assert.equal(findButton(player.tree,choice).props['aria-pressed'],false)
      assert.equal(field(player,day).props.value,'  '+feeling+'  ')
      await advanceOporaTo(player,'recapFeedback',next)
      await click(player,review)
      await click(player,save)
      assert.deepEqual(submitted.practiceEmotion,{customText:feeling})
      assert.equal(submitted.practiceAttempt,null,'Naming is not a claimed attempt')
      const saved=owner.sessions.at(-1)
      assert.equal(saved.signals.practiceEmotion?.customText,undefined)
      assert.ok(saved.signals.practiceEmotion?.customTextCiphertext?.length>30)
      assert.equal(JSON.stringify(saved.signals).includes(feeling),false)
      assert.equal(JSON.stringify(saved.signals.opora54).includes(feeling),false)
      assert.equal(saved.signals.opora54.answers.transferFeeling,undefined)
      assert.equal(saved.signals.opora54.answers.experienceEdition,'as-6.0-experiments-v1')
      assert.equal(saved.signals.opora54.answers.transferPlanVersion,day===4?'one-v1':undefined)
      const back=await owner.read(lang)
      assert.equal(back.currentSession.signals.practiceEmotion.customText,feeling)
    }finally{player.unmount()}
  }
})

test('Day 4 clearing a feeling and choosing Not today produces no emotion or fake plan',async()=>{
  for(const {lang,next,review,save} of locales){
    const owner=repositoryHarness({freshPhase:true,sameRealm:true})
    await owner.create('AS2')
    owner.seedDay(4)
    const data=await owner.read(lang)
    const player=mount('opora-experience-player',{locale:lang,data,onClose(){},onFinish(){},
      async onSession(input){await owner.command(structuredClone(input),lang);return true}})
    try{
      await advanceOporaTo(player,'save',next)
      field(player,4).props.onChange({target:{value:'calm'}})
      await player.settle()
      await click(player,lang==='en'?'Not today':lang==='ru'?'Не сегодня':'Hoy no')
      assert.equal(field(player,4).props.value,'')
      await advanceOporaTo(player,'recapFeedback',next)
      await click(player,review)
      await click(player,save)
      const signals=owner.sessions.at(-1).signals
      assert.equal(signals.practiceEmotion,undefined)
      assert.equal(signals.opora54.answers.transfer,'not_planning')
      assert.equal(signals.opora54.answers.transferChoice,undefined)
      assert.equal(signals.opora54.answers.transferPlanVersion,undefined)
      assert.equal(signals.practiceAttempt,null)
    }finally{player.unmount()}
  }
})

test('server blocks forged emotion labels, conflicting choices, oversize or out-of-day answers',async()=>{
  const invalid=[
    [4,{choice:'not_a_feeling'}],
    [4,{choice:'joy',customText:'calm'}],
    [4,{customText:'x'.repeat(61)}],
    [4,{customText:'email@example.com'}],
    [4,{customText:'fear/unsafe'}],
    [4,{customText:'level 123'}],
    [4,{customText:'Two'+String.fromCharCode(10)+'Lines'}],
    [4,{customText:42}],
    [4,{choice:null,customText:''}],
    [5,{choice:'joy'}],
    [11,{customText:''}],
  ]
  for(const [day,emotion] of invalid){
    const owner=repositoryHarness({freshPhase:true,sameRealm:true})
    await owner.create('AS2')
    owner.seedDay(day)
    const data=await owner.read('en')
    const before=structuredClone({writes:owner.writes,sessions:owner.sessions,cycle:owner.cycle,course:owner.course})
    assert.equal(before.sessions.length,day-1,'Fixture retains prior completed days')
    await assert.rejects(owner.command({
      day,lessonId:data.lesson.id,operationId:'00000000-0000-4000-8000-000000001985',
      feedback:'skip',practiceWindow:'practice_v6',
      visitedSlideKeys:[...OPORA_EXPERIENCE_PRE_SAVE_KEYS],
      opora54:{answers:{transfer:'planned',transferChoice:'two',
        transferPlanVersion:'one-v1'},hints:[],ease:null},
      practiceEmotion:emotion,
    },'en'),/INVALID_OPORA_PRACTICE_EMOTION/)
    assert.deepEqual(owner.writes,before.writes,'No database write on rejected input')
    assert.deepEqual(owner.sessions,before.sessions,'Rejected input preserves every historical session')
    assert.deepEqual(owner.cycle,before.cycle,'Rejected input preserves the cycle')
    assert.deepEqual(owner.course,before.course,'Rejected input preserves the course')
  }
})

test('old Day 4 input is migrated to sealed owner text, without changing legacy session signals',async()=>{
  const legacyFeeling='Quietly steady' // Distinct from the public calm_regulation goal.
  const owner=repositoryHarness({freshPhase:true,sameRealm:true})
  await owner.create('AS2')
  owner.seedDay(4)
  const data=await owner.read('en')
  const history=structuredClone(owner.sessions)
  await owner.command({
    day:4,lessonId:data.lesson.id,operationId:'00000000-0000-4000-8000-000000001988',
    feedback:'skip',practiceWindow:'practice_v6',
    visitedSlideKeys:[...OPORA_EXPERIENCE_PRE_SAVE_KEYS],
    opora54:{answers:{transfer:'planned',transferChoice:'two',transferFeeling:legacyFeeling},
      hints:[],ease:null},
  },'en')
  assert.equal(owner.sessions.length,history.length+1)
  assert.deepEqual(owner.sessions.slice(0,-1),history,'Legacy migration cannot rewrite historical sessions')
  const stored=owner.sessions.at(-1).signals
  assert.equal(stored.opora54.answers.transfer,'planned')
  assert.equal(stored.opora54.answers.transferChoice,'two')
  assert.equal(stored.opora54.answers.transferFeeling,undefined)
  assert.equal(JSON.stringify(stored).includes(legacyFeeling),false)
  assert.ok(stored.practiceEmotion.customTextCiphertext.length>30)
  const readBack=await owner.read('en')
  assert.equal(readBack.currentSession.signals.practiceEmotion.customText,legacyFeeling)
})

// The actual validator stays prototype-strict: the fixture corrects execution
// realms, not inputs or production validation.
test('real object validator rejects foreign realms and malformed prototypes',()=>{
  assert.doesNotThrow(()=>onlyKeys({customText:'calm'},['customText']))
  assert.doesNotThrow(()=>onlyKeys(Object.assign(Object.create(null),{customText:'calm'}),['customText']))
  const foreign=vm.runInNewContext('({customText:"calm"})')
  const inherited=Object.create({customText:'calm'})
  for(const value of [foreign,inherited,[],null,'calm',new Date()]){
    assert.throws(()=>onlyKeys(value,['customText']),/INVALID_OBJECT/)
  }
  assert.throws(()=>onlyKeys({customText:'calm',unexpected:true},['customText']),/UNKNOWN_FIELD/)
})

test('same-realm repository still rejects malformed emotion objects without changing history',async()=>{
  const cases=[
    [Object.create({customText:'Quietly steady'}),/INVALID_OBJECT/],
    [vm.runInNewContext('({customText:"Quietly steady"})'),/INVALID_OBJECT/],
    [[],/INVALID_OPORA_PRACTICE_EMOTION/],
    [null,/INVALID_OPORA_PRACTICE_EMOTION/],
    [{customText:'Quietly steady',unexpected:true},/UNKNOWN_FIELD/],
  ]
  for(const [practiceEmotion,error] of cases){
    const owner=repositoryHarness({freshPhase:true,sameRealm:true})
    await owner.create('AS2')
    owner.seedDay(4)
    const data=await owner.read('en')
    const before=structuredClone({writes:owner.writes,sessions:owner.sessions,cycle:owner.cycle,course:owner.course})
    await assert.rejects(owner.command({
      day:4,lessonId:data.lesson.id,operationId:'00000000-0000-4000-8000-000000001989',
      feedback:'skip',practiceWindow:'practice_v6',
      visitedSlideKeys:[...OPORA_EXPERIENCE_PRE_SAVE_KEYS],
      opora54:{answers:{transfer:'planned',transferChoice:'two',transferPlanVersion:'one-v1'},hints:[],ease:null},
      practiceEmotion,
    }),error)
    assert.deepEqual({writes:owner.writes,sessions:owner.sessions,cycle:owner.cycle,course:owner.course},before)
  }
})

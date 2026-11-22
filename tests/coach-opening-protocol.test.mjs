import test from 'node:test'
import assert from 'node:assert/strict'
import {
  COACH_OPENING_IDS,COACH_OPENING_PUBLIC_IDS,COACH_OPENING_QUESTION_BANK,
  coachOpeningIntro,coachOpeningProgress,coachOpeningNextReply,coachOpeningProtocolSnapshot,
} from '../lib/coaching/coach-opening-protocol.mjs'
import {coachOpeningTurn} from '../lib/coaching/coach-opening-entry.mjs'

const progress=(turns,options={})=>coachOpeningProgress({locale:'ru',personaId:'mira',...options,
  turns:turns.map(content=>({role:'user',content}))})

test('all ten personas, including six published coaches, have exactly four unique RU/EN/ES questions at every opening gate',()=>{
  assert.equal(COACH_OPENING_PUBLIC_IDS.length,6)
  assert.equal(Object.keys(COACH_OPENING_QUESTION_BANK).length,10)
  for(const id of Object.keys(COACH_OPENING_QUESTION_BANK)){
    for(const step of COACH_OPENING_IDS){
      for(const lang of ['ru','en','es']){
        const questions=COACH_OPENING_QUESTION_BANK[id][step][lang]
        assert.equal(questions.length,4,id+':'+step+':'+lang)
        assert.equal(new Set(questions).size,4,id+':'+step+':'+lang)
        assert.ok(questions.every(q=>typeof q==='string'&&q.length>12&&q.includes('?')))
      }
    }
    assert.match(coachOpeningIntro(id,'ru'),/сесси/iu)
  }
})
test('RU newcomer completes six checkmarks, four independent lamp groups, and automatic new topic',()=>{
  const p=progress(['да, давай попробуем','Меня зовут Андрей','goal','тревожно','да'])
  assert.equal(p.completed,true)
  assert.deepEqual(Object.values(p.checkmarks),[true,true,true,true,true,true])
  assert.deepEqual(Object.values(p.lamps),[true,true,true,true])
  assert.equal(p.answers.continuity.kind,'new')
  assert.equal(p.answers.continuity.automatic,true)
  assert.equal(p.answers.name.value,'Андрей')
  assert.equal(p.answers.feelings.quote,'тревожно')
  assert.match(coachOpeningProtocolSnapshot(p).invitationQuote,/да/)
})
test('EN and ES greetings accept an explicit agreement but not mere maybe or silence',()=>{
  const en=coachOpeningProgress({personaId:'max',locale:'en',turns:
    ['yes','call me Maya','challenge','I am a little tired','sure']})
  const es=coachOpeningProgress({personaId:'sofia',locale:'es',turns:
    ['sí','me llamo María','meta','me siento bien','claro']})
  assert.equal(en.completed,true)
  assert.equal(es.completed,true)
  assert.equal(progress(['может быть']).checkmarks.invitation,false)
  assert.equal(progress(['']).checkmarks.invitation,false)
  assert.equal(progress(['нет']).declined,true)
})
test('no active session consent is inferred from a visitor asking what the session is',()=>{
  const p=progress(['Что это за сессия?'])
  assert.equal(p.current,'invitation')
  assert.equal(p.checkmarks.invitation,false)
  const response=coachOpeningTurn({locale:'ru',message:'Как проходит сессия?',openingHistory:[]},'mira')
  assert.match(response.message,/добровольный разговор/iu)
  assert.equal(response.openingProgress.checkmarks.invitation,false)
})
test('returning client: saved name requires confirmation and past-vs-new topic must be chosen',()=>{
  const opts={allowPrior:true,priorSession:{name:'Андрей',topic:'Работа'}}
  let p=progress(['да'],opts)
  assert.equal(p.current,'name')
  assert.match(coachOpeningNextReply(p),/Андрей/)
  p=progress(['да','да, верно'],opts)
  assert.equal(p.current,'continuity')
  assert.equal(p.lamps.identity,false)
  p=progress(['да','да, верно','Продолжим прошлую','challenge','волнуюсь','да'],opts)
  assert.equal(p.completed,true)
  assert.equal(p.answers.continuity.kind,'previous')
  assert.equal(p.answers.name.kind,'confirmed_previous')
  assert.equal(p.lamps.identity,true)
  const withoutConsent=progress(['да','Андрей'],{priorSession:opts.priorSession,allowPrior:false})
  assert.equal(withoutConsent.answers.continuity.automatic,true)
})
test('client can skip a name and feelings; neither produces invented private information',()=>{
  const p=progress(['да','без имени','self-exploration','пропустим','да'])
  assert.equal(p.completed,true)
  assert.equal(p.answers.name.kind,'skipped')
  assert.equal(p.answers.name.value,'')
  assert.equal(p.answers.feelings.kind,'skipped')
  assert.equal(p.lamps.identity,true)
})
test('step five only checks a box, never a fifth lamp',()=>{
  const p=progress(['да','Анна','цель','сегодня грустно'])
  assert.equal(p.current,'confirmation')
  assert.equal(p.checkmarks.feelings,true)
  assert.equal(Object.keys(p.lamps).length,4)
  assert.equal(p.lamps.confirmation,false)
})
test('confirmation refusal cannot advance into main work',()=>{
  const p=progress(['да','Анна','цель','спокойно','нет'])
  assert.equal(p.completed,false)
  assert.equal(p.declined,true)
  assert.equal(p.checkmarks.confirmation,false)
})
test('opening turn stays local and deterministic until client explicitly confirms step six',()=>{
  const x=coachOpeningTurn({message:'да',openingHistory:[],locale:'ru'},'harry')
  assert.equal(x.mode,'offline')
  assert.equal(x.stage,'opening')
  assert.equal(x.openingProgress.current,'name')
  const h=['да','Гарри','goal','нормально','да']
  assert.equal(coachOpeningTurn({message:'хочу обсудить цель',openingHistory:h,locale:'ru'},'harry'),null)
})

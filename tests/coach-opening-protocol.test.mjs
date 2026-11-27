import test from 'node:test'
import assert from 'node:assert/strict'
import {
  COACH_OPENING_IDS,COACH_OPENING_PUBLIC_IDS,COACH_OPENING_QUESTION_BANK,
  coachOpeningIntro,coachOpeningProgress,coachOpeningNextReply,coachOpeningProtocolSnapshot,coachOpeningLiveInstruction,coachOpeningQuestion,
} from '../lib/coaching/coach-opening-protocol.mjs'
import {coachOpeningTurn} from '../lib/coaching/coach-opening-entry.mjs'
import {GENIE_OPENING_QUESTIONS,GENIE_OPENING_REASSURANCE,GENIE_BEHAVIOR_STANDARDS,GENIE_PROFILE,genieOpeningReassurance} from '../lib/coaching/genie-coach-identity.mjs'

const progress=(turns,options={})=>coachOpeningProgress({locale:'ru',personaId:'mira',...options,
  turns:turns.map(content=>({role:'user',content}))})

test('all twelve personas, including eight published coaches, have exactly four unique RU/EN/ES questions at every opening gate',()=>{
  assert.equal(COACH_OPENING_PUBLIC_IDS.length,8)
  assert.equal(Object.keys(COACH_OPENING_QUESTION_BANK).length,12)
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
  assert.match(coachOpeningNextReply(p),/кабинете/)
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

test('existing six public coaches keep their independent localized introductions and question cadences',()=>{
 const six=['mira','max','sofia','alex','merlin','harry']
 for(const lang of ['en','ru','es']){
  const intros=six.map(id=>coachOpeningIntro(id,lang))
  assert.equal(new Set(intros).size,6,lang)
  for(const id of six){
   assert.ok(intros[six.indexOf(id)].length>70,id)
   for(const stage of COACH_OPENING_IDS)assert.equal(coachOpeningQuestion(id,stage,lang),COACH_OPENING_QUESTION_BANK[id][stage][lang][0])
  }
 }
 // Existing identity is preserved; the new question architecture does not rewrite their first step.






})
test('Samir has 72 original full questions — four for each of six steps in RU/EN/ES',()=>{
 let count=0
 for(const stage of COACH_OPENING_IDS){
  for(const lang of ['ru','en','es']){
   const questions=GENIE_OPENING_QUESTIONS[stage][lang]
   assert.equal(questions.length,4)
   assert.deepEqual(COACH_OPENING_QUESTION_BANK.genie[stage][lang],questions)
   assert.ok(Object.isFrozen(questions))
   for(const q of questions){
    assert.ok(q.length>=40&&q.length<230,stage+'/'+lang)
    assert.equal(q.split('?').length-1,1,q)
    assert.ok(q.endsWith('?'))
    assert.doesNotMatch(q,/^(One wish at a time|Одно желание за раз|Un deseo a la vez):/)
    count++
   }
  }
 }
 assert.equal(count,72)
 assert.match(coachOpeningQuestion('genie','invitation','ru'),/коучинговую сессию/u)
 assert.match(coachOpeningQuestion('genie','focus','ru'),/трудность|цель|самопознание/u)
 assert.match(coachOpeningIntro('genie','ru'),/Джинн Самир/u)
 assert.ok(GENIE_PROFILE.path.length===3)
 assert.ok(GENIE_BEHAVIOR_STANDARDS.length>=8)
})
test('Samir follows consent, optional memory and resistance boundaries without magical pressure',()=>{
 const maybe=coachOpeningProgress({personaId:'genie',locale:'ru',turns:['возможно']})
 assert.equal(maybe.current,'invitation')
 assert.equal(maybe.checkmarks.invitation,false)
 assert.match(coachOpeningNextReply(maybe),/Никаких уговоров/)
 const repeated=coachOpeningProgress({personaId:'genie',locale:'ru',turns:['возможно','не знаю','может быть']})
 assert.equal(repeated.current,'invitation')
 assert.equal(repeated.checkmarks.invitation,false)
 assert.equal(coachOpeningNextReply(repeated),genieOpeningReassurance('ru',3))
 assert.ok(!coachOpeningNextReply(repeated).includes('?'))
 const no=coachOpeningProgress({personaId:'genie',locale:'ru',turns:['нет']})
 assert.equal(no.declined,true)
 assert.match(coachOpeningNextReply(no),/Без вашего согласия/)
 const previous={name:'Мария',topic:'Учёба'}
 const approved=coachOpeningProgress({personaId:'genie',locale:'ru',
   priorSession:previous,allowPrior:true,turns:['да']})
 const unapproved=coachOpeningProgress({personaId:'genie',locale:'ru',
   priorSession:previous,allowPrior:false,turns:['да']})
 assert.match(coachOpeningNextReply(approved),/Мария/)
 assert.doesNotMatch(coachOpeningNextReply(unapproved),/Мария/)
 const feelings=coachOpeningProgress({personaId:'genie',locale:'ru',turns:['да','Анна','цель','сейчас тревожно']})
 assert.equal(feelings.current,'confirmation')
 assert.ok(coachOpeningNextReply(feelings).includes(GENIE_OPENING_REASSURANCE.feelings.ru))
 const live=coachOpeningLiveInstruction('genie','ru')
 for(const stage of ['name','continuity','focus','feelings','confirmation'])
  assert.ok(live.includes(GENIE_OPENING_QUESTIONS[stage].ru[0]),stage)
 assert.match(live,/One question per spoken turn/)
 assert.match(live,/never ask|Never ask|Do not recite/)
})
test('explicit willingness to try after a maybe is consent; uncertainty alone is not',()=>{
 for(const [locale,reply,ambiguous] of [
  ['ru','Возможно, давай попробуем','Возможно'],
  ['en',"Maybe, let's try",'Maybe'],
  ['es','Quizá, vamos a probar','Quizá'],
 ]){
  assert.equal(coachOpeningProgress({locale,turns:[reply]}).lamps.invitation,true,locale)
  assert.equal(coachOpeningProgress({locale,turns:[ambiguous]}).lamps.invitation,false,locale)
  assert.equal(coachOpeningProgress({locale,turns:['no, let\'s try']}).lamps.invitation,false,locale)
 }
})


test('bare coaching topics never become a client name after a lost opening turn',()=>{
 for(const [locale,yes,topics,name,explicit] of [
  ['en','yes',['Money','money','Financial freedom','Work','Relationships'],'Andy','Call me Love'],
  ['ru','да',['Деньги','деньги','Работа','Любовь','Опора'],'Андрей','Меня зовут Любовь'],
  ['es','sí',['Dinero','dinero','Trabajo','Amor','Salud'],'María','Me llamo Amor'],
 ]){
  for(const topic of topics){
   const p=coachOpeningProgress({personaId:'genie',locale,turns:[yes,topic]})
   assert.equal(p.current,'name',locale+': '+topic)
   assert.equal(p.checkmarks.name,false)
   assert.equal(p.answers.name,undefined)
  }
  const p=coachOpeningProgress({personaId:'genie',locale,turns:[yes,name]})
  assert.equal(p.answers.name.value,name)
  const q=coachOpeningProgress({personaId:'genie',locale,turns:[yes,explicit]})
  assert.equal(q.checkmarks.name,true,'an explicitly chosen name still works')
 }
})

test('speech repair requests do not complete the name gate, including capitalized ASR',()=>{
 for(const [locale,yes,repairs,name] of [
  ['en','Yes',['Say again','Repeat please','Pardon me','What?'],'Mary Jane'],
  ['ru','Да',['Ещё раз','Повторите','Не слышно','Что?'],'Анна Мария'],
  ['es','Sí',['Otra vez','Repite','Perdón','¿Cómo?'],'José Luis'],
 ]){
  for(const repair of repairs){
   const p=coachOpeningProgress({personaId:'genie',locale,turns:[yes,repair]})
   assert.equal(p.current,'name',locale+': '+repair)
   assert.equal(p.checkmarks.name,false)
   assert.equal(p.answers.name,undefined)
  }
  const p=coachOpeningProgress({personaId:'genie',locale,turns:[yes,repairs[0],name]})
  assert.equal(p.answers.name.value,name)
 }
 const p=coachOpeningProgress({allowPrior:true,priorSession:{name:'Say again',topic:'Work'},turns:['Yes','Yes']})
 assert.equal(p.checkmarks.name,false)
})

test('all eight public coaches have 576 original full opening questions, not a shared stem with a cadence prefix',()=>{
 const publicQuestions=[]
 for(const id of COACH_OPENING_PUBLIC_IDS)for(const gate of COACH_OPENING_IDS)for(const locale of ['en','ru','es']){
  const variants=COACH_OPENING_QUESTION_BANK[id][gate][locale]
  assert.equal(variants.length,4)
  assert.ok(Object.isFrozen(variants))
  for(const question of variants){
   assert.ok(question.length>12&&question.length<230,id+'/'+gate+'/'+locale)
   assert.equal(question.split('?').length,2,question)
   assert.ok(question.endsWith('?'))
   assert.doesNotMatch(question,/^(Бережно спрошу|Коротко и по делу|С уважением к вашим границам|Для ясной структуры|На этом повороте пути|Первый маленький смелый шаг|Straight to the point|For a clear structure):/u)
   publicQuestions.push(question)
  }
 }
 assert.equal(publicQuestions.length,576)
 assert.equal(new Set(publicQuestions).size,576)
})

test('Gemini Live receives the same six localized personality questions without authorizing progression',()=>{
 for(const id of COACH_OPENING_PUBLIC_IDS)for(const lang of ['ru','en','es']){
  const live=coachOpeningLiveInstruction(id,lang)
  for(const gate of COACH_OPENING_IDS)assert.ok(live.includes(coachOpeningQuestion(id,gate,lang)),id+'/'+lang+'/'+gate)
  assert.match(live,/One question per spoken turn/)
  assert.match(live,/Wait for a clear client yes/)
 }
})

 test('character appears at focus and feelings before confirmation without changing evidence gates',()=>{
 const expected={mira:['ваша цель, и ваши силы','Ваше состояние для меня'],max:['Люблю цели','Я учитываю ваши силы'],sofia:['звучали ваши желания','Ваши чувства заслуживают'],alex:['делает эту цель ценной','Ваше состояние — часть картины']}
 for(const [personaId,[focus,feelings]] of Object.entries(expected)){
  const p=progress(['да','Анна','цель'],{personaId})
  assert.equal(p.current,'feelings');assert.equal(p.completed,false)
  const first=coachOpeningNextReply(p)
  assert.ok(first.includes(focus));assert.equal((first.match(/\?/gu)||[]).length,1)
  const q=progress(['да','Анна','цель','сегодня грустно'],{personaId})
  assert.equal(q.current,'confirmation');assert.equal(q.checkmarks.confirmation,false)
  const second=coachOpeningNextReply(q)
  assert.ok(second.includes(feelings));assert.equal((second.match(/\?/gu)||[]).length,1)
  assert.match(coachOpeningLiveInstruction(personaId,'ru'),/CHARACTER IN THE OPENING/)
  const skipped=progress(['да','Анна','цель','пропустим'],{personaId})
  assert.ok(!coachOpeningNextReply(skipped).includes(feelings))
  assert.equal(progress(['да','Анна','цель','сегодня грустно','да'],{personaId}).completed,true)
 }
 for(const locale of ['en','ru','es']){
  const reactions=['mira','max','sofia','alex','merlin','harry','caesar'].map(personaId=>coachOpeningNextReply({personaId,locale,current:'feelings',attempts:0,answers:{focus:{kind:'goal'}}}))
  assert.equal(new Set(reactions.map(r=>r.split('. ')[0])).size,7)
 }
})

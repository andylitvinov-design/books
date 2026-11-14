import test from 'node:test'
import assert from 'node:assert/strict'
import {coachDialoguePolicy,repeatedCoachQuestion,nonRepeatingOfflineCoachText,sharedCoachMindInstruction} from '../lib/coaching/unified-coach-policy.mjs'
import {conversationalCoachMessages,parseConversationalCoachReply} from '../lib/coaching/conversational-persona.mjs'
import {normalizeGenerativeCoachInput} from '../lib/coaching/generative-persona.mjs'
import {offlineCoachingBrainReply} from '../lib/personal-coaching/coaching-brain.mjs'

const cases={
 en:{
  accept_correction:['You misunderstood my point.','That is not what I meant.','Let me correct that.','I meant something else.','That is not what I said.'],
  reset_topic:["Let's talk about something else.","Can we change the subject?","A different topic, please.","Instead let's discuss relationships.","I'd rather talk about my family."],
  answer_first:['What do you think?','What should I do?','Can you suggest an idea?','How would you approach this?','What are my options?'],
  close_gently:['thanks','thank you','Thanks!','Thank you!','Thanks.'],
  reduce_scope:["I don't know",'not sure','hard to say','I do not know','Not sure.'],
  acknowledge_without_commitment:['yes','yeah','yep','sure','ok']
 },
 ru:{
  accept_correction:['Вы меня не поняли.','Я имел в виду другое.','Я хотела сказать другое.','Нет, не так.','Ты меня не понял.'],
  reset_topic:['Давайте сменим тему.','Хочу сменить тему.','Давай поговорим о другом.','Вернёмся к другой теме.','Давайте обсудим другое.'],
  answer_first:['Что ты думаешь?','Что вы предлагаете?','Какие есть варианты?','Посоветуй.','Что мне делать?'],
  close_gently:['спасибо','благодарю','спасибо.','благодарю!','Спасибо!'],
  reduce_scope:['не знаю','пока не знаю','не уверена','затрудняюсь ответить','Не знаю.'],
  acknowledge_without_commitment:['да','ага','угу','конечно','да.']
 }
}
test('one shared Coach Mind instruction; Spanish keeps legacy persona copy',()=>{
 assert.match(sharedCoachMindInstruction('ru'),/Coach Mind/)
 assert.match(sharedCoachMindInstruction('en'),/Coach Mind/)
 assert.equal(sharedCoachMindInstruction('es'),'')
})
test('60 authored RU/EN turn decisions based on client meaning, not message count',()=>{
 for(const [locale,group] of Object.entries(cases)){
  assert.equal(Object.values(group).reduce((n,rows)=>n+rows.length,0),30)
  for(const [expected,rows] of Object.entries(group))for(const message of rows){
   const p=coachDialoguePolicy({locale,message,turns:[]})
   assert.equal(p.nextMove,expected,locale+': '+message)
   assert.equal(p.role,'coach')
   assert.notEqual(p.phase,'review')
  }
 }
})
test('20 long synthetic contexts do not auto-progress or ask a third question',()=>{
 for(const locale of ['en','ru'])for(let scenario=0;scenario<10;scenario++){
  const turns=[]
  for(let i=0;i<12+scenario;i++)turns.push({
   role:i%2?'assistant':'user',
   content:i%2?(locale==='ru'?'Что для вас важно?':'What matters to you?'):
     (locale==='ru'?'Я пока думаю о моей ситуации.':'I am thinking about my situation.')
  })
  turns.push({role:'assistant',content:locale==='ru'?'Что сейчас нужно?':'What would help now?'})
  const input={locale,message:locale==='ru'?'Я ещё думаю.':'I am still thinking.',turns}
  assert.equal(coachDialoguePolicy(input).allowQuestion,false)
  assert.notEqual(coachDialoguePolicy(input).phase,'review')
  assert.doesNotMatch(nonRepeatingOfflineCoachText(input,'What matters to you?'),/[?？]/u)
 }
})
test('a repeated question is never shown; a substantive safe statement may survive',()=>{
 const input={locale:'ru',message:'Я хочу прояснить цели.',
  turns:[{role:'assistant',content:'Что вы хотите изменить?'}]}
 const model='Давайте обсудим цель. Что вы хотите изменить?'
 assert.equal(repeatedCoachQuestion(model,input.turns),true)
 assert.equal(repeatedCoachQuestion('Какой выбор вам доступен?',input.turns),false)
 const repaired=parseConversationalCoachReply(JSON.stringify({message:model}),input,'grow','explore')
 assert.equal(repaired.mode,'ai')
 assert.equal(repaired.message,'Давайте обсудим цель.')
 assert.doesNotMatch(repaired.message,/[?？]/u)
 assert.throws(()=>parseConversationalCoachReply(JSON.stringify({
  message:'Что вы хотите изменить?'
 }),input,'grow','explore'),/COACHING_BRAIN_RESPONSE_INVALID/)
 assert.equal(parseConversationalCoachReply(JSON.stringify({
  message:'Можно начать с того, что уже известно, и двигаться небольшими шагами.'
 }),input,'grow','explore').mode,'ai')
})
test('existing persona inherits shared role; user text remains in user data slot',()=>{
 const parsed=normalizeGenerativeCoachInput({
  personaId:'mira',locale:'ru',consent:true,
  message:'Что ты думаешь о моей цели?',turns:[],
  settings:{warmth:5,directness:2,pace:'slow',depth:'balanced'}
 })
 const rows=conversationalCoachMessages(parsed.input,parsed.persona,'grow','clarify',{type:'none'})
 assert.equal(rows.length,3)
 assert.match(rows[0].content,/Coach Mind/)
 assert.match(rows[1].content,/next move=answer_first/)
 assert.equal(rows[2].role,'user')
 assert.ok(!rows[0].content.includes(parsed.input.message))
})
test('offline reply has no fabricated model or client action',()=>{
 const input={locale:'en',message:'I want to clarify this.',turns:[
  {role:'user',content:'I am thinking.'},
  {role:'assistant',content:'Could you describe one specific example of what is happening?'}
 ]}
 const x=offlineCoachingBrainReply(input,'grow','explore')
 assert.equal(x.mode,'offline')
 assert.equal(x.planSuggestion,'')
 assert.equal(repeatedCoachQuestion(x.question,input.turns),false)
})

test('greetings are social, validated AI replies cannot invent a measured goal',()=>{
 for(const [locale,message,valid] of [
  ['ru','Привет как дела','Привет! Я виртуальный коуч. Можно просто поговорить.'],
  ['ru','Добрый вечер!','Добрый вечер! Можем спокойно пообщаться.'],
  ['en','Hi, how are you?','Hello! I am an AI coach. We can simply chat.'],
  ['en','Good morning!','Good morning! We can chat at your own pace.'],
  ['es','Hola, ¿cómo estás?','¡Hola! Soy tu coach virtual. Podemos conversar con calma.'],
  ['es','Buenas tardes','Buenas tardes, podemos conversar con calma si quieres.']
 ]){
   const input={locale,message,turns:[]}
   assert.equal(coachDialoguePolicy(input).nextMove,'respond_socially')
   assert.equal(coachDialoguePolicy(input).phase,'contract')
   assert.equal(offlineCoachingBrainReply(input,'grow','clarify').mode,'offline')
   assert.equal(parseConversationalCoachReply(JSON.stringify({message:valid}),input,'grow','clarify').mode,'ai')
   for(const bad of ['По чему вы сможете измерить желаемый результат?',
        'How would you measure success?', '¿Cuál es tu objetivo medible?'])
     assert.throws(()=>parseConversationalCoachReply(JSON.stringify({message:bad}),input,'grow','clarify'),
       /COACHING_BRAIN_RESPONSE_INVALID/)
 }
})
test('15-plus-turn session respects new goal, explicit correction, questions and no-advice',()=>{
 const turns=[{role:'user',content:'Привет как дела'},
   {role:'assistant',content:'Привет! Можно просто пообщаться.'}]
 const fixtures=[
   ['Я застрял на работе.','reflect_then_explore'],
   ['Я хочу обсудить проблемы на работе.','reflect_then_explore'],
   ['Я боюсь ошибиться.','reflect_then_explore'],
   ['Нет, я не боюсь, мне не хватает времени.','accept_correction'],
   ['Что ты думаешь?','answer_first'],
   ['Без советов, пожалуйста.','listen_without_advice'],
 ]
 for(let i=0;i<12;i++){
   const [message,expected]=fixtures[i%fixtures.length]
   const policy=coachDialoguePolicy({locale:'ru',message,turns})
   if(['accept_correction','answer_first','listen_without_advice'].includes(expected))
     assert.equal(policy.nextMove,expected)
   assert.notEqual(policy.nextMove,'respond_socially')
   turns.push({role:'user',content:message},{role:'assistant',content:'Можно обсуждать это без спешки.'})
 }
 assert.ok(turns.length>=15)
 assert.notEqual(coachDialoguePolicy({locale:'ru',message:'Я ещё думаю.',turns}).phase,'review')
})

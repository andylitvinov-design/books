import test from 'node:test'
import assert from 'node:assert/strict'
import {isShortCoachFragment,isMechanicalCoachIntake,coachNaturalDialogueGuidance,polishMechanicalCoachReply} from '../lib/coaching/natural-dialogue-quality.mjs'
import {normalizeGenerativeCoachInput} from '../lib/coaching/generative-persona.mjs'
import {conversationalCoachMessages,parseConversationalCoachReply} from '../lib/coaching/conversational-persona.mjs'

const inputFor=(locale,message,turns=[],personaId='mira')=>
  normalizeGenerativeCoachInput({personaId,locale,consent:true,message,turns})
const generated=(message,extra={})=>JSON.stringify({message,planSuggestion:'',evidenceQuote:'',
  clientEvidence:{kind:'none',quote:''},...extra})
test('RU/EN/ES short spoken fragments are not treated as confirmed goals',()=>{
  for(const [locale,message] of [['ru','Там Миро'],['en','There Leno'],['es','Allí Lino']]){
    const {input,persona}=inputFor(locale,message)
    assert.equal(isShortCoachFragment(input,'substantive_reply'),true)
    const prompt=conversationalCoachMessages(input,persona,'grow','goal',{type:'none'})
    assert.match(prompt[1].content,/LOW-CONTEXT SPOKEN FRAGMENT/)
    assert.match(prompt[1].content,/The server-selected method stays fixed/)
    assert.equal(prompt.at(-1).content,message)
    assert.ok(prompt.every(row=>row.role!=='system'||!row.content.includes(message)))
  }
})
test('a narrow post-generation guard fixes the screenshot-type canned intake, without another call',()=>{
  const {input}=inputFor('ru','Там Миро')
  const canned='Вы упомянули Миро. Что бы вам хотелось достичь или обсудить в связи с этим?'
  assert.equal(isMechanicalCoachIntake(canned),true)
  const parsed=parseConversationalCoachReply(generated(canned,{planSuggestion:'Записать цель',
    evidenceQuote:'Там Миро',clientEvidence:{kind:'goal_focus',quote:'Там Миро'}}),input,'grow','goal')
  assert.match(parsed.message,/Можно чуть подробнее/)
  assert.doesNotMatch(parsed.message,/Вы упомянули|достичь/)
  assert.equal(parsed.mode,'ai')
  assert.equal(parsed.planSuggestion,'')
  assert.equal(parsed.evidenceQuote,'')
  assert.equal(parsed.semanticEvidence,null)
})
test('a second generic intake gets a different human-sounding repair',()=>{
  const old='Вы упомянули Лино. Что бы вам хотелось с этим обсудить или изменить?'
  const turns=[{role:'user',content:'Там Лино'},{role:'assistant',content:old}]
  const {input}=inputFor('ru','Мама селфи',turns)
  const next=parseConversationalCoachReply(generated(
    'Вы упомянули «Мама селфи». Что бы вам хотелось с этим обсудить или изменить?'),input,'grow','goal')
  assert.match(next.message,/Можете сказать иначе/)
  assert.doesNotMatch(next.message,/Вы упомянули|цель/)
})
test('English, Spanish and no-question stages stay concise and natural',()=>{
  const en=inputFor('en','There Leno').input
  const es=inputFor('es','Allí Lino').input
  assert.match(polishMechanicalCoachReply('You mentioned Leno. What would you like to discuss about it?',en,
    {conversationAct:'substantive_reply',allowQuestion:true}),/Could you tell me a little more/)
  assert.match(polishMechanicalCoachReply('Mencionaste Lino. ¿Qué te gustaría discutir sobre eso?',es,
    {conversationAct:'substantive_reply',allowQuestion:true}),/¿Me cuentas/)
  const noQuestion=polishMechanicalCoachReply('Вы упомянули Миро. Что бы вам хотелось обсудить?',inputFor('ru','Там Миро').input,
    {conversationAct:'substantive_reply',allowQuestion:false})
  assert.equal((noQuestion.match(/[?？]/g)||[]).length,0)
})
test('normal detailed coaching, direct questions, greeting and correction are never rewritten',()=>{
  const detailed=inputFor('ru','Я хочу поговорить о маме и о том, как нам наладить отношения.').input
  assert.equal(polishMechanicalCoachReply('Вы упомянули маму. Что бы вам хотелось изменить?',detailed,
    {conversationAct:'substantive_reply',allowQuestion:true}),null)
  const question=inputFor('ru','Как поговорить с мамой?').input
  assert.equal(polishMechanicalCoachReply('Вы упомянули маму. Что бы вам хотелось изменить?',question,
    {conversationAct:'question_to_coach',allowQuestion:true}),null)
  assert.equal(isShortCoachFragment(inputFor('ru','Привет').input,'greeting'),false)
  assert.equal(isShortCoachFragment(inputFor('ru','Нет, не так').input,'correction'),false)
  const natural='Мама? Давайте про это поговорим.'
  const result=parseConversationalCoachReply(generated(natural),inputFor('ru','Мама').input,'grow','goal')
  assert.equal(result.message,natural)
})
test('no extra model request, provider/consent/budget changes or persistence',async()=>{
  const fs=await import('node:fs')
  const coach=fs.readFileSync(new URL('../lib/coaching/conversational-persona.mjs',import.meta.url),'utf8')
  const helper=fs.readFileSync(new URL('../lib/coaching/natural-dialogue-quality.mjs',import.meta.url),'utf8')
  assert.match(coach,/polishMechanicalCoachReply\(message,input,dialogue\)/)
  assert.match(coach,/naturalRepair\?null:verifyCoachSemanticHint/)
  assert.doesNotMatch(helper,/fetch\(|localStorage|sessionStorage|process\.env|apiKey/)
  assert.doesNotMatch(coach,/fetch\(|localStorage|sessionStorage/)
})

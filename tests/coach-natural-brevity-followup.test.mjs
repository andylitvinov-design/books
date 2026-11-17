import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeGenerativeCoachInput} from '../lib/coaching/generative-persona.mjs'
import {understandCoachingTurn} from '../lib/personal-coaching/coaching-turn-understanding.mjs'
import {conversationalCoachMessages,parseConversationalCoachReply} from '../lib/coaching/conversational-persona.mjs'
import {isShortCoachFragment,polishMechanicalCoachReply} from '../lib/coaching/natural-dialogue-quality.mjs'
const input=(locale,message,turns=[])=>normalizeGenerativeCoachInput({personaId:'mira',locale,consent:true,message,turns})
const reply=message=>JSON.stringify({message,planSuggestion:'',evidenceQuote:'',clientEvidence:{kind:'none',quote:''}})
const previous={role:'assistant',content:'Привет! Я — Мира, ваш AI-коуч из Holistic House. Я помогаю людям размышлять, находить варианты и двигаться вперёд.'}
test('client-directed bio and Подробнее override coaching-stage intake',()=>{
 assert.equal(understandCoachingTurn(input('ru','Привет, расскажи о себе').input).act,'question_to_coach')
 const second=input('ru','Подробнее',[previous])
 const quoted=input('ru','«Привет, расскажи о себе».')
 assert.equal(understandCoachingTurn(quoted.input).act,'question_to_coach')
 assert.equal(understandCoachingTurn(second.input).act,'question_to_coach')
 assert.equal(isShortCoachFragment(second.input,'substantive_reply'),false)
 assert.equal(understandCoachingTurn(input('ru','Подробнее').input).act,'substantive_reply')
 for(const [locale,message] of [['en','Tell me more'],['es','Cuéntame más']])
  assert.equal(understandCoachingTurn(input(locale,message,[previous]).input).act,'question_to_coach')
})
test('voice prompt requests short spontaneous speech, with no repeated introductions',()=>{
 for(const [locale,message] of [['ru','Привет, расскажи о себе'],['en','Tell me about yourself'],['es','Cuéntame sobre ti']]){
  const {input:i,persona}=input(locale,message)
  const p=conversationalCoachMessages(i,persona,'grow','goal',{type:'none'})
  assert.match(p[1].content,/VOICE BREVITY/)
  assert.match(p[1].content,/ABOUT THE COACH/)
 }
 const {input:i,persona}=input('ru','Подробнее',[previous])
 const p=conversationalCoachMessages(i,persona,'grow','goal',{type:'none'})
 assert.match(p[1].content,/MORE MEANS CONTINUE/)
 assert.doesNotMatch(p[1].content,/LOW-CONTEXT SPOKEN FRAGMENT/)
})
test('screenshot-like long introduction is reduced, retaining AI identity but not repeated legal text',()=>{
 const original='Привет! Я — Мира, ваш AI-коуч из Holistic House. Я помогаю людям размышлять, находить варианты и двигаться вперёд, но я не человек, не врач и не заменяю профессиональную помощь. Что бы вам было интересно обсудить в нашем разговоре?'
 const {input:i}=input('ru','Привет, расскажи о себе')
 const parsed=parseConversationalCoachReply(reply(original),i,'grow','goal')
 assert.ok(parsed.message.length<=210)
 assert.match(parsed.message,/Мира/)
 assert.doesNotMatch(parsed.message,/не человек|не врач|профессиональную помощь|Что бы вам было интересно/)
 assert.equal(parsed.semanticEvidence,null)
})
test('Подробнее after a self introduction adds a different detail instead of echoing the bio',()=>{
 const {input:i}=input('ru','Подробнее',[previous])
 const repeated='Я — Мира, ваш AI-коуч из Holistic House. Я помогаю размышлять, находить варианты и двигаться вперёд, но я не человек, не врач и не заменяю профессиональную помощь. О чём бы вам хотелось поговорить дальше?'
 const result=parseConversationalCoachReply(reply(repeated),i,'grow','goal')
 assert.ok(result.message.length<170)
 assert.doesNotMatch(result.message,/AI-коуч|Holistic House|не врач/)
 assert.match(result.message,/проясняем|шаг/)
 assert.equal(result.semanticEvidence,null)
})
test('fresh specific follow-up survives unchanged; previous fragment repair remains intact',()=>{
 const {input:i}=input('ru','Подробнее',[previous])
 const fresh='Сначала мы вместе смотрим, что действительно важно. И не торопимся с выводами.'
 assert.equal(parseConversationalCoachReply(reply(fresh),i,'grow','goal').message,fresh)
 const fragment=input('ru','Миро').input
 assert.match(polishMechanicalCoachReply('Вы упомянули Миро. Что бы вам хотелось обсудить?',fragment,{conversationAct:'substantive_reply',allowQuestion:true}),/Можно чуть подробнее/)
})
test('no new vendor, persistence, or changes to safety and forced coaching stages',async()=>{
 const fs=await import('node:fs')
 const code=fs.readFileSync(new URL('../lib/coaching/natural-dialogue-quality.mjs',import.meta.url),'utf8')
 assert.doesNotMatch(code,/fetch\(|localStorage|sessionStorage|process\.env/)
 assert.equal(understandCoachingTurn(input('ru','Привет').input).act,'greeting')
 assert.equal(understandCoachingTurn(input('ru','Нет, я имел в виду другое.').input).act,'correction')
 const details=input('ru','Я хочу поговорить о маме и о том, как нам наладить отношения.').input
 assert.equal(polishMechanicalCoachReply('Вы упомянули маму. Что бы вам хотелось изменить?',details,{conversationAct:'substantive_reply',allowQuestion:true}),null)
})

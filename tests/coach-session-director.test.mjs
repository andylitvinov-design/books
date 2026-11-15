import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeGenerativeCoachInput} from '../lib/coaching/generative-persona.mjs'
import {COACH_PERSONAS} from '../lib/coaching/persona-registry.mjs'
import {conversationalCoachMessages} from '../lib/coaching/conversational-persona.mjs'
import {coachSessionDirective,coachSessionDirectivePrompt,enforceCoachSessionDirective} from '../lib/coaching/coach-session-director.mjs'
import {readFileSync} from 'node:fs'
const inputFor=(personaId,message,turns=[],locale='ru')=>
  normalizeGenerativeCoachInput({personaId,locale,consent:true,message,turns})
const user=content=>({role:'user',content})
const coach=content=>({role:'assistant',content})
const methods={mira:'grow',max:'tgrow',sofia:'solution_focused',alex:'tgrow',
  lea:'appreciative_inquiry',noah:'woop',iris:'oskar',ray:'appreciative_inquiry'}

test('all eight published personas have a stable, allowlisted primary method in RU/EN/ES',()=>{
  for(const p of COACH_PERSONAS)for(const locale of ['ru','en','es']){
    const {input,persona}=inputFor(p.id,'Привет, как дела?',[],locale)
    const d=coachSessionDirective(input,persona)
    assert.equal(d.methodId,methods[p.id])
    assert.equal(d.personaId,p.id)
    assert.equal(d.methodLocked,true)
    assert.equal(d.phase,'contract')
    assert.equal(d.interventionId,'respond_socially')
    assert.equal(d.canOfferAction,false)
    assert.equal(d.readiness.ready,false)
    assert.match(coachSessionDirectivePrompt(d),/Never silently change/)
    assert.match(coachSessionDirectivePrompt(d),/Do NOT suggest a plan/)
  }
})

test('the Alex method cannot drift to WOOP on procrastination/fear keywords',()=>{
  const {input,persona}=inputFor('alex','Я откладываю старт, боюсь ошибиться и перегружен.')
  const d=coachSessionDirective(input,persona)
  assert.equal(d.methodId,'tgrow')
  assert.notEqual(d.methodId,'woop')
  assert.equal(d.canOfferAction,false)
  const prompt=conversationalCoachMessages(input,persona,'grow','explore',{type:'none'})
  assert.match(prompt[1].content,/Locked primary method=tgrow/)
  assert.match(prompt[1].content,/permitted intervention=/)
  assert.ok(!prompt[0].content.includes(input.message))
})

test('topic change resets contract; client correction keeps the right to repair',()=>{
  const turns=[user('Я хочу обсудить работу.'),coach('Какой вопрос важен?')]
  let s=inputFor('alex','Давайте сменим тему.',turns)
  assert.equal(coachSessionDirective(s.input,s.persona).phase,'contract')
  assert.equal(coachSessionDirective(s.input,s.persona).interventionId,'recontract')
  s=inputFor('alex','Нет, я имел в виду другое.',turns)
  assert.equal(coachSessionDirective(s.input,s.persona).interventionId,'repair_misunderstanding')
})

test('no-advice and client question override scripted prompts',()=>{
  for(const [message,expected] of [
    ['Что ты предлагаешь?','answer_first'],
    ['Привет, как дела?','respond_socially']
  ]) {
    const s=inputFor('alex',message)
    assert.equal(coachSessionDirective(s.input,s.persona).interventionId,expected)
  }
  const s=inputFor('alex','Хочу обсудить работу без советов.')
  const d=coachSessionDirective(s.input,s.persona)
  assert.equal(d.canOfferAction,false)
  assert.match(coachSessionDirectivePrompt(d),/Do NOT suggest a plan/)
})

test('unconfirmed stage never promotes itself just because a model generated an answer',()=>{
  const s=inputFor('mira','Я хочу понять, почему перегружен.')
  const d=coachSessionDirective(s.input,s.persona)
  assert.equal(d.readiness.ready,false)
  assert.ok(d.readiness.missing.length>0)
})

test('output contract suppresses unsanctioned plans, but preserves safe natural language',()=>{
  const s=inputFor('alex','Я застрял на работе.')
  const d=coachSessionDirective(s.input,s.persona)
  const reply={mode:'ai',message:'Похоже, ситуация застопорилась. Можем рассмотреть один пример.',
    planSuggestion:'Уволиться завтра',evidenceQuote:'Я застрял на работе.'}
  const result=enforceCoachSessionDirective(reply,d)
  assert.equal(result.message,reply.message)
  assert.equal(result.planSuggestion,'')
  assert.equal(result.evidenceQuote,'')
  assert.equal(reply.planSuggestion,'Уволиться завтра')
  assert.throws(()=>enforceCoachSessionDirective({mode:'ai',message:'Вы должны решить и действовать прямо сейчас.'},d),
    /COACHING_BRAIN_RESPONSE_INVALID/)
})

test('only an explicitly client-selected action permits an optional, unconfirmed plan',()=>{
  const s=inputFor('noah','Я сделаю короткую прогулку завтра.')
  const d=coachSessionDirective(s.input,s.persona)
  assert.equal(d.methodId,'woop')
  assert.equal(d.canOfferAction,false,'do not infer acceptance from a single sentence without established options')
})

test('existing production My Coach route invokes directive without new model or schema',()=>{
  const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
  const server=source('lib/app/coaching-brain.js')
  const messages=source('lib/coaching/conversational-persona.mjs')
  assert.match(server,/coachSessionDirective\(input,persona\)/)
  assert.match(server,/enforceCoachSessionDirective/)
  assert.match(messages,/coachSessionDirectivePrompt/)
  assert.match(server,/verifiedGroqCoachingReply/)
  assert.match(messages,/EXACTLY three string keys/)
})

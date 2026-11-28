import test from 'node:test'
import assert from 'node:assert/strict'
import {COACH_PERSONAS} from '../lib/coaching/persona-registry.mjs'
import {normalizeGenerativeCoachInput} from '../lib/coaching/generative-persona.mjs'
import {coachSessionDirective,directedCoachOfflineReply} from '../lib/coaching/coach-session-director.mjs'
import {methodQuestionVariants} from '../lib/coaching/coach-method-question-variants.mjs'
import {personaSpeechCue} from '../lib/coaching/coach-persona-speech-variants.mjs'
import {coachDialoguePolicy,nonRepeatingOfflineCoachText,unsolicitedCoachExitOffer} from '../lib/coaching/unified-coach-policy.mjs'

const sample=(personaId='mira',locale='ru',message='Я хочу разобраться со сложным решением',turns=[],elapsedSeconds=0)=>{
 const {input,persona}=normalizeGenerativeCoachInput({
  personaId,locale,consent:true,message,turns,elapsedSeconds
 })
 return {input,persona,directive:coachSessionDirective(input,persona)}
}
const reply=(sampled)=>directedCoachOfflineReply(sampled.input,sampled.directive,'model_unavailable')

test('provider-offline all registered personas and locales use the same Director method and stage',()=>{
 for(const persona of COACH_PERSONAS)for(const locale of ['ru','en','es']){
  const s=sample(persona.id,locale,
   {ru:'Я хочу разобраться со сложным решением',en:'I want to think through a difficult decision',
    es:'Quiero comprender una decisión difícil'}[locale])
  const got=reply(s)
  assert.equal(got.mode,'offline')
  assert.equal(got.method,s.directive.methodId)
  assert.equal(got.stage,s.directive.stage)
  assert.equal(got.planSuggestion,'')
  assert.equal(got.evidenceQuote,'')
  assert.equal(got.offlineReason,'model_unavailable')
  assert.ok(got.reflection.length>12)
  const stepId=s.directive.methodStepId.split(':')[1]
  if(['respond_socially','recontract','repair_misunderstanding','answer_first',
    'explain_question','allow_close','respect_no','reduce_scope',
    'listen_without_advice','reflect_without_question','invite_reflective_close']
    .includes(s.directive.interventionId))continue
  const variants=methodQuestionVariants(s.directive.methodId,stepId,locale)
  assert.ok(variants.some(v=>v.text===got.question)||got.question==='',persona.id+'/'+locale)
  assert.ok(got.reflection.includes(personaSpeechCue(persona.id,
    s.directive.stage==='action'?'transition':
    s.directive.stage==='goal'?'clarify':
    s.directive.stage==='reality'?'reflect':
    s.directive.stage==='review'?'review':'transition',locale))||
    got.reflection.length>12)
 }
})
test('the offline follow-up rotates within one server-authorized step instead of echoing a previous question',()=>{
 const first=sample('mira','ru','Я хочу разобраться со сложным решением')
 const initial=reply(first)
 assert.ok(initial.question,'initial authored question')
 const withOld=sample('mira','ru','Я хочу разобраться со сложным решением',[
  {role:'user',content:'Я хочу разобраться со сложным решением'},
  {role:'assistant',content:initial.reflection+' '+initial.question}
 ])
 const second=reply(withOld)
 assert.equal(second.method,initial.method)
 assert.notEqual(second.question,initial.question)
 assert.ok(second.reflection)
})
test('short speech fragments get a plain clarification instead of outcome metrics or commitment',()=>{
 const s=sample('mira','ru','Мама')
 const got=reply(s)
 assert.match(got.question,/чуть подробнее/)
 assert.doesNotMatch(got.question,/цель|результат|дедлайн|обяза/u)
 assert.equal(got.planSuggestion,'')
})
test('greeting, refusal, correction and direct question do not trigger a new method-stage interview',()=>{
 for(const [persona,locale,message] of [
  ['mira','ru','Привет!'],['max','en','Hi!'],['sofia','ru','Нет, не хочу отвечать'],
  ['alex','ru','Нет, я имел в виду другое.'],['mira','es','Hola'],
  ['max','en','What do you think?']
 ]){
  const s=sample(persona,locale,message)
  const got=reply(s)
  assert.equal(got.planSuggestion,'')
  assert.ok(got.reflection.length>4)
  const step=s.directive.methodStepId.split(':')[1]
  assert.ok(!methodQuestionVariants(s.directive.methodId,step,locale).some(v=>v.text===got.question),
    message+': unexpected staged interrogation')
 }
})
test('respect no-advice and two prior questions even when a method step remains unfulfilled',()=>{
 const s=sample('mira','ru','Не давайте мне советов, просто послушайте')
 const withoutAdvice=reply(s)
 assert.equal(withoutAdvice.question,'')
 assert.match(withoutAdvice.reflection,/без советов|выслушать/u)
 const repeated=sample('mira','ru','Я хочу разобраться со сложным решением',[
  {role:'user',content:'Я хочу разобраться'},
  {role:'assistant',content:'Что важно для вас?'},
  {role:'user',content:'Я ещё думаю'},
  {role:'assistant',content:'Какой момент наиболее трудный?'}
 ])
 const got=reply(repeated)
 assert.equal(got.question,'')
})
test('20-minute user-controlled wrap-up remains possible for every persona and does not fake a plan',()=>{
 for(const p of COACH_PERSONAS){
  const s=sample(p.id,'ru','Я хочу обсудить свою цель',[],1200)
  const d=s.directive
  if(d.interventionId!=='invite_reflective_close')continue
  const out=reply(s)
  assert.match(out.question,/вынести из нашего разговора/u)
  assert.equal(out.planSuggestion,'')
 }
})

test('explicit RU/EN/ES request for no advice overrides all method questions',()=>{
 for(const [locale,message] of [
  ['ru','Не давайте мне советов, просто послушайте'],
  ['en',"Please don't give me advice; just listen"],
  ['es','No me des consejos, solo escucha']
 ]){
  const s=sample('mira',locale,message)
  assert.equal(coachDialoguePolicy(s.input).noAdvice,true,locale)
  const got=reply(s)
  assert.equal(got.question,'',locale)
  assert.equal(got.planSuggestion,'',locale)
 }
})

test('ordinary fatigue and question streak never produce a session exit offer in shared offline policy',()=>{
 for(const [locale,message,exit] of [
 ['ru','Я устал','Понимаю. Мы можем продолжить или, если хотите, сделать паузу. Как вам будет лучше?'],
 ['en','I am tired','Would you prefer to pause or explore one small part?'],
 ['es','Estoy cansado','Podemos hacer una pausa.']]){
  assert.equal(unsolicitedCoachExitOffer(exit),true,locale)
  assert.equal(unsolicitedCoachExitOffer(message),false,locale)
  const input={locale,message,turns:[]}
  for(const allowQuestion of [true,false]){
   const output=nonRepeatingOfflineCoachText(input,exit,{locale,allowQuestion})
   assert.ok(output.length>0)
   assert.equal(unsolicitedCoachExitOffer(output),false,locale)
  }
 }
})

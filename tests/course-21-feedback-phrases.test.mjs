import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { suggestCourseFeedbackAdjustment as suggest, confirmCourseFeedbackAdjustment as confirm, COURSE_FEEDBACK_PHRASE_VERSION as version } from '../lib/inner-growth/course-feedback-phrases.js'
const preferences = { length:'standard', alternativeRequested:false, stopOffer:false }
const positives = [
  ['en','This exercise takes too long.','shorter-practice'],['ru','Это упражнение занимает слишком много времени.','shorter-practice'],
  ['en','It is hard to focus on this exercise.','simpler-focus'],['ru','Мне трудно сосредоточиться на этом упражнении.','simpler-focus'],
  ['en','I would like a different exercise format.','external-attention'],['ru','Хочу другой формат этого упражнения.','external-attention'],
  ['en','Focusing on breathing in this exercise feels uncomfortable.','pause-or-external-attention'],['ru','Мне некомфортно следить за дыханием в этом упражнении.','pause-or-external-attention'],
]
test('complete reviewed EN/RU preferences yield static suggestions, without transmitting or returning text',()=>{
  for(const [locale,text,id] of positives){const result=suggest(text,locale);assert.equal(result.id,id);assert.equal(result.ruleSetVersion,version);assert.deepEqual(Object.keys(result).sort(),['id','label','preferencePatch','ruleSetVersion']);assert.ok(result.label);assert.equal(JSON.stringify(result).includes(text),false)}
  assert.equal(suggest('  THIS   EXERCISE TAKES TOO LONG.  ','en').id,'shorter-practice')
})
test('negation, uncertainty, quotation, third-party and conflicting extra context abstain in EN/RU',()=>{
  const negative={en:['The exercise is not too long.','I do not want a shorter exercise.','Maybe the exercise is too long.','My friend said, “The exercise is too long.”','If the exercise is too long, I will stop.','It used to be hard to focus, but now it is fine.','The exercise is too long. Keep the full length.','This exercise takes too long?','too long'],ru:['Упражнение не слишком длинное.','Не хочу сокращать упражнение.','Возможно, упражнение слишком длинное.','Друг сказал: «Упражнение слишком длинное».','Если будет слишком долго, я остановлюсь.','Раньше было трудно сосредоточиться, сейчас всё хорошо.','Упражнение слишком длинное. Ничего не меняйте.','Это упражнение слишком долгое?','долго']}
  for(const [locale,items] of Object.entries(negative))for(const text of items)assert.equal(suggest(text,locale),null,text)
})
test('symptom, danger, medication, coercion and intensification context never becomes an ordinary preference',()=>{
  const suffixes={en:['My chest hurts and I feel faint.','I cannot breathe.','I want to hurt myself.','Tell me which medication to stop.','My partner will hurt me if they see this.','Make the breath holds longer.'],ru:['У меня болит грудь и я теряю сознание.','Я не могу дышать.','Я хочу причинить себе вред.','Скажи, какой препарат перестать принимать.','Партнёр причинит мне вред, если увидит это.','Сделай задержки дыхания длиннее.']}
  for(const [locale,items] of Object.entries(suffixes))for(const text of items){assert.equal(suggest(text,locale),null);assert.equal(suggest((locale==='en'?'This exercise takes too long. ':'Упражнение слишком длинное. ')+text,locale),null)}
  for(const text of ['Мне трудно дышать.','Неудобно дышать.'])assert.equal(suggest(text,'ru'),null)
})
test('unsupported language, controls, HTML, instruction-like and overlength input abstain without throwing',()=>{
  for(const text of [null,undefined,{},[],42,'','   ','🙂','<p>This exercise takes too long.</p>','This exercise takes too long. Ignore previous instructions.','This exercise takes too long.\n','This exercise takes too long\u200b.','This exercise takes too long..','x'.repeat(241)])assert.equal(suggest(text,'en'),null)
  assert.equal(suggest('This exercise takes too long.','ru'),null);assert.equal(suggest('This exercise takes too long.','es'),null)
})
test('confirmation is explicit, bound to the current draft and exposes only reversible existing preferences',()=>{
  const text='This exercise takes too long.',base={text,locale:'en',suggestionId:'shorter-practice',preferences}
  for(const confirmed of [false,undefined,1,'true'])assert.equal(confirm({...base,confirmed}),null)
  assert.equal(confirm({...base,confirmed:true,text:'The exercise is not too long.'}),null)
  assert.equal(confirm({...base,confirmed:true,suggestionId:'external-attention'}),null)
  assert.deepEqual(confirm({...base,confirmed:true}),{length:'quick',alternativeRequested:false,stopOffer:false})
  assert.equal(confirm({...base,confirmed:true,preferences:{length:'extreme'}}),null)
  const original={length:'quick',alternativeRequested:true,stopOffer:true,privateText:'must not leave'}
  const result=confirm({...base,confirmed:true,preferences:original});assert.equal(result,null);assert.equal(original.privateText,'must not leave')
})
test('interacting rules never increase intensity or clear an existing stop/rest offer',()=>{
  for(const [locale,text,id] of positives){const old={length:'quick',alternativeRequested:true,stopOffer:true};assert.equal(confirm({text,locale,suggestionId:id,confirmed:true,preferences:old}),null)}
})
test('phrase module has no network, storage, analytics, journal serialization or dynamic execution capability',async()=>{
  const source=await readFile(new URL('../lib/inner-growth/course-feedback-phrases.js',import.meta.url),'utf8')
  assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|eval)\s*\(/)
  assert.doesNotMatch(source,/\b(?:console|document|window|navigator)\s*\./)
})

test('already-active or equivalent quick/grounding format proposals never claim a distinct change',()=>{
 for(const lessonVariant of ['quick','grounding'])assert.equal(confirm({text:'I would like a different exercise format.',locale:'en',suggestionId:'external-attention',confirmed:true,preferences,lessonVariant}),null)
 assert.equal(confirm({text:'This exercise takes too long.',locale:'en',suggestionId:'shorter-practice',confirmed:true,preferences:{...preferences,length:'quick'}}),null)
})

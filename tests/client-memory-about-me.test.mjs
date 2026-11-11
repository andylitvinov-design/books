import test from 'node:test'
import assert from 'node:assert/strict'
import {CLIENT_ABOUT_ME_GROUP_LABELS,CLIENT_ABOUT_ME_INTRO,CLIENT_ABOUT_ME_QUESTIONS,
  getClientAboutMeQuestion,clientAboutMeQuestionsForGroup} from '../lib/holistic-support/client-memory-questions.mjs'

test('optional About Me catalog has 76 unique, localized questions',()=>{
 assert.equal(CLIENT_ABOUT_ME_QUESTIONS.length,76)
 assert.equal(new Set(CLIENT_ABOUT_ME_QUESTIONS.map(q=>q.key)).size,76)
 assert.equal(Object.keys(CLIENT_ABOUT_ME_GROUP_LABELS).length,13)
 for(const q of CLIENT_ABOUT_ME_QUESTIONS){
  assert.match(q.key,/^[a-z][a-z0-9_]{2,78}$/)
  assert.ok(['goal','resource','boundary','commitment','current_desired_state','practice_feedback'].includes(q.category))
  assert.ok(CLIENT_ABOUT_ME_GROUP_LABELS[q.group])
  for(const lang of ['en','ru','es'])assert.ok(typeof q.prompt[lang]==='string'&&q.prompt[lang].length>8)
  assert.strictEqual(getClientAboutMeQuestion(q.key),q)
 }
})
test('intro asks only three non-sensitive self-authored questions',()=>{
 assert.deepEqual(CLIENT_ABOUT_ME_INTRO,['preferred_name','main_goal','answer_length'])
 for(const key of CLIENT_ABOUT_ME_INTRO) assert.equal(getClientAboutMeQuestion(key).sensitive,false)
})
test('private self-reflection is not prompted without sensitive consent',()=>{
 assert.equal(clientAboutMeQuestionsForGroup('wellbeing').some(q=>q.key==='wellbeing_reflection'),false)
 assert.equal(clientAboutMeQuestionsForGroup('wellbeing',{sensitiveEnabled:true}).some(q=>q.key==='wellbeing_reflection'),true)
})
test('unrecognized keys never become profile question metadata',()=>{
 for(const key of [null,undefined,'__proto__','admin','',123,'very_long_key_'.repeat(20)])assert.equal(getClientAboutMeQuestion(key),null)
})
test('every group is nonempty, and catalog has no contact/marketing consent field',()=>{
 for(const group of Object.keys(CLIENT_ABOUT_ME_GROUP_LABELS))assert.ok(clientAboutMeQuestionsForGroup(group).length>0)
 assert.equal(CLIENT_ABOUT_ME_QUESTIONS.some(q=>/marketing_optin|memory_opt_in|sensitive_optin|permissions/.test(q.key)),false)
})

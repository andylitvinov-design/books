import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { coachingQuestionTopics, recommendCoachingForQuestion } from '../lib/personal-coaching/model-matcher.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const sql=read('supabase/migrations/20261024171100_hh_tantric_intimacy_coaching_v1.sql')
const rows=(table)=>sql.split('INSERT INTO app_private.'+table+' ')[1]?.split('ON CONFLICT')[0]||''

test('tantric intimacy is one additive model with one playable 8-step, adult-friendly EN/RU/ES scheme',()=>{
 assert.match(rows('coaching_models'),/tantric_intimacy_v1/)
 assert.match(rows('coaching_schemes'),/tantric_intimacy_reflective_v1/)
 assert.match(rows('coaching_schemes'),/'reflective',20/)
 assert.match(rows('coaching_schemes'),/false,true/)
 assert.equal((rows('coaching_steps').match(/'tantric_intimacy_v1'/g)||[]).length,8)
 assert.equal((rows('coaching_questions').match(/'tantric_intimacy_v1'/g)||[]).length,8)
 assert.equal((rows('coaching_questions').match(/'single_choice'/g)||[]).length,8)
 assert.equal((rows('coaching_questions').match(/true,false,'Adult-only opt-in/g)||[]).length,8,
   'all intimate questions are genuinely optional')
 assert.equal((rows('coaching_answer_sets').match(/'tantric_[a-z]+_answers_v1'/g)||[]).length,8)
 for(const key of ['intention','presence','desire','boundaries','consent','dialogue','step','review']){
   assert.match(rows('coaching_steps'),new RegExp("'"+key+"'"),key)
   assert.match(rows('coaching_questions'),new RegExp("'tantric_"+key+"_q1_v1'"),key)
   assert.match(rows('coaching_answer_sets'),new RegExp("'tantric_"+key+"_answers_v1'"),key)
 }
 for(const locale of ['en','ru','es'])assert.ok(sql.includes('"'+locale+'":'),locale)
 assert.doesNotMatch(sql,/CREATE TABLE|ALTER TABLE|GRANT\s|client_id|crm_contacts|assessment_results|SECU[R]ITY DEFINER/i)
})
test('explicit sexuality/consent signals recommend original tantra framework in three languages',()=>{
 const signals=[
  {tag:'intimacy',stems:{en:['sexual','intimacy'],ru:['сексуал','интим'],es:['sexual','intimidad']},
   priority:5,preferredModels:['tantric_intimacy_v1']},
  {tag:'consent',stems:{en:['consent'],ru:['согласи'],es:['consentimiento']},
   priority:5,preferredModels:['tantric_intimacy_v1']},
 ]
 const catalog={signals,models:[
  {modelKey:'tantric_intimacy_v1'},{modelKey:'clear_v1'},{modelKey:'grow_v1'},
 ],schemes:[
  {schemeKey:'tantric_intimacy_reflective_v1',modelKey:'tantric_intimacy_v1',minutes:20,style:'reflective',
   tags:['intimacy','consent'],questions:[{id:'tantric_intention_q1_v1'}]},
  {schemeKey:'clear_dialogue_v1',modelKey:'clear_v1',minutes:25,style:'reflective',
   tags:['relationships'],questions:[{id:'clear_q1_v1'}]},
  {schemeKey:'grow_quick_v1',modelKey:'grow_v1',minutes:10,style:'quick',
   tags:['goal'],questions:[{id:'grow_q1_v1'}]},
 ]}
 for(const prompt of [
   'I want to talk about sexual consent with my partner',
   'Хочу поговорить о сексуальном согласии',
   'Quiero hablar de consentimiento sexual con mi pareja',
 ]){
  const r=recommendCoachingForQuestion(prompt,catalog,{minutes:30,style:'reflective'})
  assert.equal(r.blocked,false)
  assert.equal(r.suggestions[0].modelKey,'tantric_intimacy_v1',prompt)
  assert.ok(coachingQuestionTopics(prompt,signals).length)
 }
})
test('sexual coercion and danger are not quietly matched into coaching',()=>{
 for(const request of [
  'I am experiencing sexual assault',
  'I was sexually assaulted',
  'My partner is forcing sex and sexual coercion',
  'My partner forces me to have sex',
  'Партнёр заставляет меня заниматься сексом',
  'Mi pareja me obliga a tener sexo',
  'Меня пугает сексуальное насилие',
  'Sufro abuso sexual',
  'sexo con un menor underage sex',
 ]){
  const result=recommendCoachingForQuestion(request,{models:[],schemes:[],signals:[]})
  assert.equal(result.blocked,true,request)
  assert.deepEqual(result.suggestions,[])
 }
})
test('server verifies adult self-attestation before private encrypted start; other existing models stay unchanged',()=>{
 const server=read('lib/app/personal-coaching.js')
 const picker=read('components/app/personal-coaching-picker.jsx')
 const runner=read('components/app/personal-coaching.jsx')
 const css=read('components/app/personal-coaching.module.css')
 assert.match(server,/scheme.topicTags\?\.includes\('sexuality'\)/)
 assert.match(server,/PERSONAL_COACH_ADULT_CONFIRMATION_REQUIRED/)
 assert.match(server,/onlyKeys\(input,\['action','revision','schemeKey','clientQuestion','adultConfirmed'\]\)/)
 assert.match(picker,/isAdultModel&&!adultConfirmed/)
 assert.match(picker,/checked=\{adultConfirmed\}/)
 assert.match(runner,/adultConfirmed:adultConfirmed===true/)
 assert.match(runner,/choice.scheme\?\.tags\?\.includes\('sexuality'\)/)
 assert.match(css,/\.adultConfirm\{/)
 assert.doesNotMatch(picker,/sendBeacon\(|fbq\(|gtag\(/)
 assert.match(server,/seal\(course,sealContext\(actor\),config\)/)
})
test('public lounge protects intimate questions behind opt-in and supports skip, in-memory only',()=>{
 const publicUi=read('components/public-coaching-discovery.jsx')
 const css=read('components/public-coaching-discovery.module.css')
 const page=read('app/[locale]/coaching/page.jsx')
 assert.match(publicUi,/data-coaching-age-confirm/)
 assert.match(publicUi,/coachingSchemeRequiresAdultConsent\(session\)&&!adultAcknowledged/)
 assert.match(publicUi,/onClick=\{\(\)=>setAdultAcknowledged\(true\)\}/)
 assert.match(publicUi,/onClick=\{\(\)=>advance\(true\)\}/)
 assert.match(publicUi,/function advance\(skip=false\)/)
 assert.match(publicUi,/data-intimacy-session/)
 for(const locale of ['en','ru','es']){
  assert.match(publicUi,new RegExp("adultTitle:"),locale)
 }
 assert.match(css,/\.sensitiveSkip\{/)
 assert.match(css,/\.adultGate\{/)
 assert.match(page,/PublicCoachingDiscovery/)
 assert.doesNotMatch(publicUi,/\bfetch\(|localStorage|sessionStorage|sendBeacon\(|fbq\(|gtag\(/)
 const parsed=ts.createSourceFile('components/public-coaching-discovery.jsx',publicUi,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
 assert.equal(parsed.parseDiagnostics.length,0,
  parsed.parseDiagnostics.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')).join('; '))
})

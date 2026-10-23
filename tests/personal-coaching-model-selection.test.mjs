import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { coachingQuestionTopics, recommendCoachingForQuestion } from '../lib/personal-coaching/model-matcher.js'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const model=(id)=>({modelKey:id+'_v1',name:{en:id,ru:id,es:id},selectionComment:{en:'fit'}})
const scheme=(id,modelKey,tags,minutes,style='quick')=>({
 schemeKey:id+'_v1',modelKey:modelKey+'_v1',tags,minutes,style,questions:[{id:id+'_q1_v1'}],
})
const signals=[
 {tag:'habits',stems:{en:['habit','every day'],ru:['привычк'],es:['habito']}},
 {tag:'procrastination',stems:{en:['procrastinat','postpon'],ru:['откладыва','не могу начать'],es:['procrastin']}},
 {tag:'relationships',stems:{en:['partner'],ru:['партнёр'],es:['pareja']}},
 {tag:'conflict',stems:{en:['conflict','argue'],ru:['ссор','конфликт'],es:['conflicto']}},
 {tag:'communication',stems:{en:['talk'],ru:['поговор'],es:['hablar']}},
 {tag:'career',stems:{en:['career','job'],ru:['карьер','работ'],es:['carrera']}},
 {tag:'leadership',stems:{en:['delegat','leader'],ru:['делегир','руковод'],es:['delegar']}},
 {tag:'goal',stems:{en:['goal'],ru:['цел'],es:['meta']}},
 {tag:'unclear',stems:{en:['confus','not sure'],ru:['не знаю'],es:['no se']}},
]
const catalog={
 signals,
 models:['grow','tgrow','woop','clear','oskar','fuel','solution_focus','appreciative_5d'].map(model),
 schemes:[
  scheme('grow_quick','grow',['goal','career'],10),
  scheme('tgrow_compass','tgrow',['unclear','career'],20),
  scheme('woop_habit','woop',['habits','procrastination'],10),
  scheme('clear_dialogue','clear',['relationships','conflict','communication'],25,'reflective'),
  scheme('oskar_resources','oskar',['relationships','confidence'],20),
  scheme('fuel_development','fuel',['career','leadership'],25,'reflective'),
  scheme('solution_focus_quick','solution_focus',['stuck','confidence'],12),
  scheme('appreciative_future','appreciative_5d',['growth','creativity'],30,'reflective'),
 ]
}
test('client question is matched only in memory and returns three DISTINCT coaching models',()=>{
 const scenarios=[
  ['Я всё откладываю и не могу начать важное дело','woop_v1'],
  ['Я ссорюсь с партнёром, как поговорить?','clear_v1'],
  ['How can I delegate as a leader at work?','fuel_v1'],
 ]
 for(const [text,winner] of scenarios){
  const r=recommendCoachingForQuestion(text,catalog,{minutes:25,style:'reflective'})
  assert.equal(r.blocked,false)
  assert.equal(r.recognized,true)
  assert.equal(r.suggestions.length,3)
  assert.equal(r.suggestions[0].modelKey,winner)
  assert.equal(new Set(r.suggestions.map(v=>v.modelKey)).size,3)
 }
})
test('language stems are independent of input locale, and topic unknown is not falsely matched',()=>{
 assert.deepEqual(coachingQuestionTopics('NO SE qué hacer',signals),['unclear'])
 assert.ok(coachingQuestionTopics('Хочу добиться цели',signals).includes('goal'))
 const r=recommendCoachingForQuestion('xyzq stranger 12345678',catalog)
 assert.equal(r.recognized,false)
 assert.equal(r.suggestions.length,3)
 assert.ok(r.suggestions.every(item=>item.fallback&&item.matchedTags.length===0))
})
test('urgent safety concern never triggers a pseudo-coaching recommendation',()=>{
 for(const question of ['I want to kill myself','Думаю о самоубийстве','quiero morir']){
  const r=recommendCoachingForQuestion(question,catalog)
  assert.equal(r.blocked,true)
  assert.deepEqual(r.suggestions,[])
 }
})
test('catalog is backend-only, questions are versioned, and raw question is encrypted only on start',()=>{
 const api=source('app/api/app/[...path]/route.js')
 const backend=source('lib/app/personal-coaching.js')
 const catalogBackend=source('lib/app/personal-coaching-catalog.js')
 const ui=source('components/app/personal-coaching-picker.jsx')
 const player=source('components/app/personal-coaching.jsx')
 const sqlFit=source('supabase/migrations/20261023203500_hh_coaching_model_fit_comments.sql')
 const sqlTags=source('supabase/migrations/20261023203600_hh_coaching_request_signals.sql')
 assert.match(api,/joined === 'personal-coaching-catalog'/)
 assert.match(api,/x-hh-account-id/)
 assert.match(catalogBackend,/import 'server-only'/)
 assert.match(catalogBackend,/transaction\(config,actor/)
 assert.match(catalogBackend,/app_private\.coaching_schemes/)
 assert.match(catalogBackend,/app_private\.coaching_intent_signals/)
 assert.match(backend,/loadSchemeQuestions\(db,input\.schemeKey,\{publishedOnly:true\}\)/)
 assert.match(backend,/clientQuestion:selection\.clientQuestion/)
 assert.match(backend,/seal\(course,sealContext\(actor\),config\)/)
 assert.match(backend,/PERSONAL_COACH_WOOP_PLAN_REQUIRED/)
 assert.match(ui,/data-coaching-three-models/)
 assert.match(ui,/recommendCoachingForQuestion\(question,catalog/)
 assert.match(player,/data-coaching-one-question/)
 assert.match(player,/activeQuestions\.map\(item=>/)
 assert.match(player,/PERSONAL_COACH_QUESTIONS/)
 assert.match(sqlFit,/selection_comment_i18n/)
 assert.match(sqlFit,/selection_caution_i18n/)
 assert.equal((sqlFit.match(/WHERE model_key=/g)||[]).length,10)
 assert.match(sqlTags,/ENABLE ROW LEVEL SECURITY/)
 assert.match(sqlTags,/REVOKE ALL ON TABLE app_private\.coaching_intent_signals FROM PUBLIC,anon,authenticated/)
 assert.equal((sqlTags.match(/\('(?:goal|decision|business|career|relationships|conflict|communication|money|confidence|stuck|habits|procrastination|motivation|leadership|productivity|growth|transition|unclear|creativity)'/g)||[]).length,19)
 assert.doesNotMatch(ui,/localStorage|sessionStorage|analytics\.|sendBeacon|fetch\(/)
 assert.doesNotMatch(backend,/crm_contacts|assessment_results|business_coaching_programs/)
})
test('coaching form and choice player have matching CSS selectors',()=>{
 const css=source('components/app/personal-coaching.module.css')
 const picker=source('components/app/personal-coaching-picker.jsx')
 const player=source('components/app/personal-coaching.jsx')
 const classes=[...new Set([...picker.matchAll(/styles\.([A-Za-z0-9_]+)/g),...player.matchAll(/styles\.([A-Za-z0-9_]+)/g)].map(m=>m[1]))]
 const actual=new Set([...css.matchAll(/(?<![\w-])\.([A-Za-z_][A-Za-z_0-9-]*)/g)].map(m=>m[1]))
 assert.deepEqual(classes.filter(c=>!actual.has(c)),[])
 assert.match(css,/@media\(max-width:370px\)/)
 assert.match(css,/safe-area-inset-bottom/)
})

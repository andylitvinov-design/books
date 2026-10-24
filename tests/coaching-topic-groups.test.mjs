import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { COACHING_TOPIC_GROUPS, coachingSchemeInGroup, coachingTopicSchemeCount,
  coachingSignalInGroup, coachingSchemeRequiresAdultConsent } from '../lib/coaching/coaching-topic-groups.js'
import { coachingQuestionTopics, recommendCoachingForQuestion } from '../lib/personal-coaching/model-matcher.js'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const seed=source('supabase/migrations/20261024175100_hh_coaching_topic_groups_v1.sql')

test('the topic FIRST chooser covers business, money, relationships, health, sexuality and growth in EN/RU/ES',()=>{
  assert.deepEqual(COACHING_TOPIC_GROUPS.map(g=>g.id),
    ['all','business','money','relationships','wellbeing','sexuality','growth'])
  for(const g of COACHING_TOPIC_GROUPS){
    for(const lang of ['en','ru','es'])assert.ok(g.label[lang]?.trim(),g.id+'/'+lang)
    assert.ok(g.icon.trim())
    assert.ok(g.id==='all'||g.tags.length>0)
  }
  const ui=source('components/public-coaching-discovery.jsx')
  const css=source('components/public-coaching-discovery.module.css')
  assert.match(ui,/data-coaching-topic-first/)
  assert.match(ui,/data-coaching-topic-group=\{group.id\}/)
  assert.match(ui,/aria-pressed=\{topicGroup===group.id\}/)
  assert.ok(ui.indexOf('className={styles.topicGroups}')<ui.indexOf('className={styles.format}'))
  assert.match(ui,/coachingSchemeInGroup\(s,topicGroup\)/)
  assert.match(ui,/coachingSignalInGroup\(signal,topicGroup\)/)
  assert.match(ui,/setTopic\('all'\)/)
  assert.match(css,/\.topicGroupGrid\{/)
  assert.match(css,/@media\(max-width:390px\)/)
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(ui,/title=\{coachingSessionTitle\(s\.schemeKey,lang,/)
  assert.doesNotMatch(ui,/localStorage|sessionStorage|\bfetch\(|sendBeacon\(|gtag\(|fbq\(/)
  const parsed=ts.createSourceFile('components/public-coaching-discovery.jsx',ui,
    ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
  assert.equal(parsed.parseDiagnostics.length,0,
    parsed.parseDiagnostics.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')).join('; '))
})
test('filters use actual published scheme topics, do not expose unrelated models',()=>{
  const schemes=[
    {schemeKey:'b',tags:['business','career']},
    {schemeKey:'m',tags:['money','budget']},
    {schemeKey:'r',tags:['relationships','conflict']},
    {schemeKey:'h',tags:['wellbeing','stress']},
    {schemeKey:'s',modelKey:'tantric_intimacy_v1',tags:['sexuality','consent']},
    {schemeKey:'g',tags:['growth','confidence']},
  ]
  for(const [id,key] of [
    ['business','b'],['money','m'],['relationships','r'],
    ['wellbeing','h'],['sexuality','s'],['growth','g'],
  ]){
    const visible=schemes.filter(s=>coachingSchemeInGroup(s,id)).map(s=>s.schemeKey)
    assert.deepEqual(visible,[key],id)
    assert.equal(coachingTopicSchemeCount(schemes,id),1)
  }
  assert.equal(coachingTopicSchemeCount(schemes,'all'),6)
  assert.equal(coachingSchemeInGroup({tags:[]},'wellbeing'),false)
  assert.equal(coachingSignalInGroup({tag:'budget'},'money'),true)
  assert.equal(coachingSignalInGroup({tag:'money'},'sexuality'),false)
  assert.equal(coachingSchemeRequiresAdultConsent(schemes[4]),true)
  assert.equal(coachingSchemeRequiresAdultConsent({modelKey:'clear_v1',tags:['sexuality','intimacy']}),true)
  assert.equal(coachingSchemeRequiresAdultConsent(schemes[3]),false)
})
test('additional eight routes are data-only, versioned, and attached to real coaching frameworks',()=>{
  assert.match(seed,/^BEGIN;/m)
  assert.match(seed,/^COMMIT;/m)
  assert.doesNotMatch(seed,/CREATE TABLE|ALTER TABLE|GRANT\s|DROP\s|UPDATE\s+app_private|crm_contacts|assessment_results|payload_ciphertext/i)
  const schemes=[
    'woop_money_habit_v1','woop_wellbeing_routine_v1','oskar_wellbeing_resources_v1',
    'solution_relationship_dialogue_v1','clear_intimacy_dialogue_v1',
    'tantric_consent_quick_v1','tantric_desire_presence_v1','oskar_money_confidence_v1',
  ]
  for(const key of schemes)assert.ok(seed.includes("'"+key+"'"),key)
  assert.equal((seed.match(/\btrue\)\s*(?:,|\nON CONFLICT)/g)||[]).length>=8,true)
  for(const tag of ['wellbeing','stress','sleep','budget']){
    assert.match(seed,new RegExp("'"+tag+"'"))
  }
  for(const m of ['woop_v1','oskar_v1','solution_focus_v1','clear_v1','tantric_intimacy_v1']){
    assert.ok(seed.includes("'"+m+"'"),m)
  }
  assert.match(seed,/ON CONFLICT \(scheme_key\) DO NOTHING/)
  assert.match(seed,/ON CONFLICT \(topic_key\) DO NOTHING/)
})
test('adult gate applies before questions on both public and signed-in intimacy paths',()=>{
  const ui=source('components/public-coaching-discovery.jsx')
  const catalog=source('lib/app/personal-coaching-catalog.js')
  const api=source('lib/app/personal-coaching.js')
  const picker=source('components/app/personal-coaching-picker.jsx')
  const runner=source('components/app/personal-coaching.jsx')
  assert.match(ui,/coachingSchemeRequiresAdultConsent\(session\)\|\|sessionTopic==='sexuality'/)
  assert.match(ui,/requiresAdult&&!adultAcknowledged/)
  assert.match(ui,/onClick=\{\(\)=>setAdultAcknowledged\(true\)\}/)
  assert.match(ui,/onClick=\{\(\)=>advance\(true\)\}/)
  assert.match(ui,/entryStep!=='questions'\|\|!requiresAdult\|\|adultAcknowledged/)
  assert.match(catalog,/topic_tags AS "topicTags"/)
  assert.match(catalog,/topicTags\?\.includes\('sexuality'\)\?false:q.required/)
  assert.match(api,/scheme.topicTags\?\.includes\('sexuality'\)/)
  assert.match(api,/PERSONAL_COACH_ADULT_CONFIRMATION_REQUIRED/)
  assert.match(picker,/scheme.tags\?\.includes\('sexuality'\)/)
  assert.match(runner,/adultConfirmed:adultConfirmed===true/)
  assert.match(api,/seal\(course,sealContext\(actor\),config\)/)
})
test('health or money questions get local topic signals without medical or investment scoring',()=>{
  const signals=[
    {tag:'wellbeing',stems:{en:['health'],ru:['здоров'],es:['salud']},priority:4,preferredModels:['woop_v1','oskar_v1']},
    {tag:'budget',stems:{en:['expenses'],ru:['расход'],es:['gastos']},priority:4,preferredModels:['woop_v1','oskar_v1']},
  ]
  assert.deepEqual(coachingQuestionTopics('Хочу улучшить здоровье',signals),['wellbeing'])
  assert.deepEqual(coachingQuestionTopics('Quiero reducir gastos',signals),['budget'])
  const catalog={signals,models:[{modelKey:'woop_v1'},{modelKey:'oskar_v1'}],schemes:[
    {schemeKey:'woop_wellbeing_routine_v1',modelKey:'woop_v1',minutes:10,style:'quick',tags:['wellbeing'],questions:[{id:'a'}]},
    {schemeKey:'oskar_money_confidence_v1',modelKey:'oskar_v1',minutes:20,style:'reflective',tags:['budget'],questions:[{id:'b'}]},
  ]}
  assert.equal(recommendCoachingForQuestion('My health is important',catalog).suggestions[0].schemeKey,'woop_wellbeing_routine_v1')
  assert.equal(recommendCoachingForQuestion('Reducir gastos',catalog).suggestions[0].schemeKey,'oskar_money_confidence_v1')
})

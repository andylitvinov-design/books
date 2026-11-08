import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('the first overload coaching session is one reviewed GROW scheme, not a duplicate coach app',()=>{
  const sql=read('supabase/migrations/20261108140500_hh_coaching_overload_session_v1.sql')
  assert.match(sql,/'grow_overload_20_v1','grow_v1'/)
  assert.match(sql,/"ru":"GROW · От перегрузки к ясному плану"/)
  assert.match(sql,/estimated_minutes,topic_tags,step_keys,required_custom_plan/)
  assert.match(sql,/ARRAY\['productivity','stress','goal','decision'\]/)
  assert.match(sql,/ARRAY\['frame','goal','reality','priorities','options','will','review'\]/)
  assert.match(sql,/true,true\)/)
  assert.match(sql,/ON CONFLICT \(scheme_key\) DO NOTHING/)
  assert.match(sql,/ON CONFLICT \(question_key\) DO NOTHING/)
  assert.match(sql,/ON CONFLICT \(answer_set_key\) DO NOTHING/)
  assert.match(sql,/'priorities',7/)
  for(const locale of ['en','ru','es']){
    assert.match(sql,new RegExp('"'+locale+'":'))
  }
  assert.doesNotMatch(sql,/CREATE TABLE|CREATE POLICY|GRANT |INSERT INTO .*client|personal_coaching_sessions|openrouter|elevenlabs|stripe/i)
})

test('the prioritisation step is summarized as the current situation, not a chosen action',()=>{
  const source=read('lib/personal-coaching/guided-session.js')
  assert.match(source,/situationOrder=\[[^\]]*'priorities'/)
  assert.match(source,/actionOrder=\['first_step','plan','action','step','will','destiny'\]/)
})

test('the prioritisation question may use one authored reality follow-up in the existing offline flow',()=>{
  const source=read('lib/personal-coaching/offline-intelligence.js')
  assert.match(source,/priorities:'reality'/)
  assert.match(source,/const prompts=Object\.freeze/)
  assert.match(source,/rows\.some\(row=>row\.stage===stage\)/)
})

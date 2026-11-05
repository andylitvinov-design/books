import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const sql=readFileSync(new URL('../supabase/migrations/20261023185000_hh_coaching_tradition_models_seed.sql',import.meta.url),'utf8')
const doc=readFileSync(new URL('../docs/coaching/ANCIENT_GOAL_PLANNING_COURSES_2026-10-23.md',import.meta.url),'utf8')
const rows=table=>{let text=sql.split('INSERT INTO app_private.'+table+' (')[1]?.split('ON CONFLICT')[0]||'';return [...text.matchAll(/^  \('/gm)].length}
test('Egyptian and Greek authored models are separate versioned gated schemes',()=>{
 assert.equal(rows('coaching_models'),2)
 assert.equal(rows('coaching_schemes'),2)
 assert.equal(rows('coaching_steps'),16)
 assert.equal(rows('coaching_questions'),17)
 assert.equal(rows('coaching_answer_sets'),17)
 assert.match(sql,/egyptian_goal_planning_v1/)
 assert.match(sql,/greek_goal_planning_v1/)
 assert.equal([...sql.matchAll(/'reflective',25,ARRAY/g)].length,2)
 assert.equal([...sql.matchAll(/,false,false\)/g)].length,2)
 assert.ok(!/GRANT |ALTER TABLE .*DISABLE ROW LEVEL SECURITY|account_id|payload_ciphertext/i.test(sql))
 assert.match(sql,/BEGIN;[\s\S]*COMMIT;/)
})
test('source order, Haibit extra question and localized choice structure are documented',()=>{
 for(const k of ['ka','ba','ib','sah','haibit','hu','ren','sekhem',
                   'epithymia','thymos','logos','nous','eidos','idea','daimon','telos']){
   assert.match(sql,new RegExp("'"+k+"'"))
 }
 assert.match(sql,/haibit_experience_v1/)
 assert.match(sql,/haibit_first_action_v1/)
 assert.match(sql,/\"en\"/);assert.match(sql,/\"ru\"/);assert.match(sql,/\"es\"/)
 assert.match(doc,/11 screens/);assert.match(doc,/10 screens/)
 assert.match(doc,/One screen with one plain question/)
 assert.match(doc,/published=false/)
})

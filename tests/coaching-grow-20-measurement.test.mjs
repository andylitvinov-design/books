import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GROW_CLARITY_QUESTIONS,growClarityOutcome,growPhaseForStep,
  normalizeGrowPlanExtras,isGrowClarityQuestion} from '../lib/personal-coaching/grow-20.mjs'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('same client-owned question is asked before and after the GROW conversation',()=>{
  const sql=source('supabase/migrations/20261108140500_hh_coaching_overload_session_v1.sql')
  assert.equal(sql.split('How clear is it right now what next step you could take within seven days? Rate 0–10.').length-1,2)
  assert.match(sql,/ARRAY\['pilot_start','goal','reality','priorities','options','will','pilot_end','review'\]/)
  assert.match(sql,/'scale_0_10',NULL,true,false/)
  assert.ok(isGrowClarityQuestion(GROW_CLARITY_QUESTIONS.before))
  assert.ok(isGrowClarityQuestion(GROW_CLARITY_QUESTIONS.after))
  assert.equal(isGrowClarityQuestion('grow_goal_q1_v1'),false)
})
test('a real 0–10 change only exists when both comparable answers exist',()=>{
  const {before,after}=GROW_CLARITY_QUESTIONS
  assert.deepEqual(growClarityOutcome({[before]:'choice:3',[after]:'7'}),{before:3,after:7,delta:4})
  assert.deepEqual(growClarityOutcome({[before]:'8',[after]:'6'}),{before:8,after:6,delta:-2})
  assert.deepEqual(growClarityOutcome({[before]:'0',[after]:'0'}),{before:0,after:0,delta:0})
  assert.deepEqual(growClarityOutcome({[before]:null,[after]:'7'}),{before:null,after:7,delta:null})
  assert.deepEqual(growClarityOutcome({[before]:'unsure',[after]:'11'}),{before:null,after:null,delta:null})
})
test('timing is guidance not a time-out and covers the proposed 20 minutes',()=>{
  assert.deepEqual(growPhaseForStep('pilot_start'),{phase:'G',window:'0–4'})
  assert.deepEqual(growPhaseForStep('reality'),{phase:'R',window:'4–9'})
  assert.deepEqual(growPhaseForStep('options'),{phase:'O',window:'9–14'})
  assert.deepEqual(growPhaseForStep('will'),{phase:'W',window:'14–19'})
  assert.deepEqual(growPhaseForStep('pilot_end'),{phase:'Review',window:'19–20'})
  assert.equal(growPhaseForStep('unexpected'),null)
})
test('server normalizer bounds two optional client-authored actions and fallback',()=>{
  assert.deepEqual(normalizeGrowPlanExtras({}),{fallback:'',nextActions:[]})
  assert.deepEqual(normalizeGrowPlanExtras({fallback:' If delayed, try a shorter session ',nextActions:[
    {text:' Request feedback ',when:' Friday '},{text:' ',when:''}]}),
    {fallback:'If delayed, try a shorter session',nextActions:[{text:'Request feedback',when:'Friday'}]})
  assert.equal(normalizeGrowPlanExtras({nextActions:[{text:'one',when:''},{text:'two',when:''},{text:'three',when:''}]}),null)
  assert.equal(normalizeGrowPlanExtras({nextActions:[{text:'',when:'Friday'}]}),null)
  assert.equal(normalizeGrowPlanExtras({nextActions:[{text:'choice:yes',when:''}]}),null)
  assert.equal(normalizeGrowPlanExtras({fallback:'x'.repeat(241)}),null)
})
test('server and UI share GROW-specific constraints, without changing other schemes',()=>{
  const app=source('lib/app/personal-coaching.js')
  const ui=source('components/coaching-action-plan.jsx')
  assert.match(app,/normalizeGrowPlanExtras\(input\)/)
  assert.match(app,/isGrowClarityQuestion\(question.id\)/)
  assert.match(ui,/growPilot&&<details className=\{styles.extraActions\}>/)
  assert.match(ui,/nextActions:fields.nextActions.filter/)
  assert.match(source('lib/personal-coaching/reconnect.mjs'),/JSON.stringify\(actions\(a\)\)/)
})

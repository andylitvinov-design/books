import test from 'node:test'
import assert from 'node:assert/strict'
import { buildClientCoachingContext, normalizeClientCoachingContext, confirmedModelContext } from '../lib/personal-coaching/client-context.mjs'

test('builds a compact context from completed sessions without copying raw transcripts',()=>{
 const context=buildClientCoachingContext([
  {id:'11111111-1111-4111-8111-111111111111',status:'completed',clientQuestion:'Improve work-life balance',
   actionPlan:{goal:'Protect personal time',actionText:'Create a weekly planning block'},
   answers:{private_transcript:'never copy this'},reflections:{q1:{text:'Personal time is a value'}}},
  {id:'22222222-2222-4222-8222-222222222222',status:'active',clientQuestion:'unfinished'}
 ])
 assert.equal(context.active_goals[0].text,'Protect personal time')
 assert.equal(context.previous_commitments[0].text,'Create a weekly planning block')
 assert.equal(context.previous_insights[0].text,'Personal time is a value')
 assert.equal(context.reviewStatus,'needs_review')
 assert.equal(JSON.stringify(context).includes('private_transcript'),false)
 assert.equal(JSON.stringify(context).includes('unfinished'),false)
})

test('requires client confirmation before model context can be created',()=>{
 const draft=buildClientCoachingContext([{status:'completed',clientQuestion:'A goal'}])
 assert.equal(confirmedModelContext(draft),null)
 const confirmed=normalizeClientCoachingContext(draft,{clientConfirmed:true})
 assert.equal(confirmed.reviewStatus,'client_confirmed')
 assert.equal(confirmedModelContext(confirmed).active_goals[0].text,'A goal')
})

test('normalizer bounds every field and rejects arbitrary coaching style',()=>{
 const draft=buildClientCoachingContext([])
 assert.throws(()=>normalizeClientCoachingContext({...draft,active_goals:Array(9).fill('x')},{clientConfirmed:true}),/COACHING_CONTEXT_LIMIT/)
 assert.throws(()=>normalizeClientCoachingContext({...draft,preferred_coaching_style:'diagnostician'},{clientConfirmed:true}),/COACHING_CONTEXT_STYLE_INVALID/)
})

test('sensitive items remain owner-visible but are excluded from a future model projection',()=>{
 const draft=buildClientCoachingContext([{status:'completed',clientQuestion:'Protect personal time',
   reflections:{q1:{text:'I am receiving trauma therapy and medication support'}}}])
 const confirmed=normalizeClientCoachingContext(draft,{clientConfirmed:true})
 assert.equal(confirmedModelContext(confirmed).previous_insights.length,0)
 assert.equal(confirmed.previous_insights.length,1)
})

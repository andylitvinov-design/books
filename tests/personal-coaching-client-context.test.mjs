import test from 'node:test'
import assert from 'node:assert/strict'
import { buildClientCoachingContext, developmentGoalsContextItems, normalizeClientCoachingContext, confirmedModelContext } from '../lib/personal-coaching/client-context.mjs'

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

test('only explicitly saved Life Plan targets are presented for client review',()=>{
 const empty=developmentGoalsContextItems({revision:0,goals:{version:1,targets:{body:50,work:50,relationships:50,growth:50}}},'ru')
 assert.deepEqual(empty,[])
 const saved=developmentGoalsContextItems({revision:2,updatedAt:'2026-11-08T10:00:00Z',
  goals:{version:1,targets:{body:65,work:80,relationships:55,growth:70},details:{stress:90}}},'ru')
 assert.equal(saved.length,4)
 assert.ok(saved[0].text.includes('Тело, здоровье и энергия'))
 assert.ok(saved[0].text.includes('65/100'))
 assert.ok(saved[0].text.includes('2026-11-08'))
 assert.equal(saved[0].confirmed,false)
 assert.equal(JSON.stringify(saved).includes('stress'),false)
 assert.deepEqual(developmentGoalsContextItems({revision:1,goals:{version:2,targets:{body:99}}},'en'),[])
})

test('creates owner-local report references from completed sessions without copying PDFs',()=>{
 const context=buildClientCoachingContext([
  {id:'11111111-1111-4111-8111-111111111111',status:'completed',completedAt:'2026-11-08T10:00:00Z',
   actionPlan:{goal:'More balance',actionText:'Block time'}},
  {id:'22222222-2222-4222-8222-222222222222',status:'active',startedAt:'2026-11-09T10:00:00Z'}
 ])
 assert.equal(context.linked_reports.length,1)
 assert.equal(context.linked_reports[0].text,'Coaching session report · 2026-11-08')
 assert.equal(context.linked_reports[0].sourceSessionId,'11111111-1111-4111-8111-111111111111')
 assert.equal(JSON.stringify(context).includes('PDF bytes'),false)
})

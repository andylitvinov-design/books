import test from 'node:test'
import assert from 'node:assert/strict'
import {webcrypto} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {practiceCatalog,weekStart,priorWeek,normalizeSkills,skillTags,readSkillTags,recommendedSkill,stableJournalId,validEntry,practiceTags,preferredPracticeGoal,readWeeklyPracticeEvidence,recommendSkillWithEvidence} from '../lib/app/daybook-micro-coaching.mjs'
test('12 localized practices with stable ids and three questions',()=>{const ids=practiceCatalog('en').map(p=>p.id);assert.equal(ids.length,12);assert.equal(new Set(ids).size,12);for(const locale of ['en','ru','es']){const list=practiceCatalog(locale);assert.deepEqual(list.map(p=>p.id),ids);for(const p of list){assert.equal(p.minutes,3);assert.equal(p.version,1);assert.equal(p.steps.length,3);assert.ok(p.steps.every(Boolean))}}})
test('date-only Monday including year and leap boundaries',()=>{assert.equal(weekStart('2026-11-26'),'2026-11-23');assert.equal(priorWeek('2026-01-01'),'2025-12-22');assert.equal(weekStart('2024-02-29'),'2024-02-26');assert.throws(()=>weekStart('2026-02-30'))})
test('only selected skills with integer self-ratings; zero is meaningful',()=>{const selected=[{id:'focus',rating:8},{id:'boundaries',rating:0}];assert.deepEqual(readSkillTags(skillTags(selected)),selected);assert.equal(recommendedSkill(selected),'boundaries');for(const invalid of [[],[{id:'unknown',rating:5}],[{id:'focus',rating:11}],[{id:'focus',rating:2},{id:'focus',rating:3}],[{id:'focus',rating:'2'}],[{id:'focus',rating:1.5}]])assert.equal(normalizeSkills(invalid),null);assert.equal(readSkillTags(['hh-skill-week-v1','skill:focus:01']),null)})
test('stable owner/day/scope UUID with real WebCrypto and journal entry validation',async()=>{const digest=input=>webcrypto.subtle.digest('SHA-256',input);const id=await stableJournalId('account-a','2026-11-26','practice:focus',digest);assert.match(id,/^[a-f0-9]{8}-[a-f0-9]{4}-8[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);assert.equal(id,await stableJournalId('account-a','2026-11-26','practice:focus',digest));for(const args of [['account-b','2026-11-26','practice:focus'],['account-a','2026-11-25','practice:focus'],['account-a','2026-11-26','practice:goal'],['account-a','2026-11-26','skills']])assert.notEqual(id,await stableJournalId(...args,digest));await assert.rejects(stableJournalId('account-a','2026-11-26','practice:unknown',digest));const e={id,kind:'note',localDay:'2026-11-26',revision:1,text:'reflection',tags:practiceTags('focus')};assert.equal(validEntry(e,id,'2026-11-26',practiceTags('focus')),true);assert.equal(validEntry({...e,tags:practiceTags('goal')},id,'2026-11-26',practiceTags('focus')),false);assert.equal(validEntry({...e,revision:0},id,'2026-11-26',practiceTags('focus')),false)})

test('micro-practice and weekly skill handoff only use verified journal revisions through the existing consent flow',()=>{const ui=readFileSync(new URL('../components/app/daybook-micro-coaching.jsx',import.meta.url),'utf8');assert.match(ui,/import DaybookCoachLink from '.\/daybook-coach-link'/);assert.ok(ui.includes("['existing','saved'].includes(v.phase)"));assert.ok(ui.includes('revision={v.entry.revision}'));assert.ok(ui.includes('mayLeave&&coachLink(weekly)'));assert.ok(ui.includes('mayLeave&&coachLink(daily)'));assert.ok(ui.includes('setStep(step+1)'));assert.ok(!ui.includes('setStep(n=>n+1)'))})

test('verified practice evidence is scoped to owner, week, chosen goal and unique recorded days',async()=>{
 const digest=input=>webcrypto.subtle.digest('SHA-256',input)
 const skills=[{id:'focus',rating:2},{id:'boundaries',rating:8}],accountId='account-a',day='2026-11-26',goalId='goal-a'
 async function entry(localDay,skill,goal=goalId,owner=accountId){return {id:await stableJournalId(owner,localDay,'practice:'+skill,digest),kind:'note',revision:1,localDay,tags:practiceTags(skill),text:'reflection',goalId:goal}}
 const a=await entry('2026-11-23','focus'),b=await entry('2026-11-24','focus'),other=await entry('2026-11-25','boundaries','other'),foreign=await entry('2026-11-25','boundaries',goalId,'account-b'),old=await entry('2026-11-22','boundaries'),future=await entry('2026-11-27','boundaries')
 const calls=[]
 const evidence=await readWeeklyPracticeEvidence(async(path,body,method,options)=>{calls.push(path);assert.equal(body,undefined);assert.equal(method,'GET');assert.equal(options.accountId,accountId);return calls.length===1?{entries:[a,b,b,other],nextCursor:'next'}:{entries:[foreign,old,future],nextCursor:null}},{accountId,day,skills,goalId,digest})
 assert.deepEqual(evidence.counts,{focus:2,boundaries:0});assert.equal(evidence.complete,true);assert.equal(evidence.pages,2);assert.equal(calls[1],'daybook-journal?limit=50&before=next')
 assert.deepEqual(recommendSkillWithEvidence(skills,evidence,{day,goalId}),{id:'boundaries',reason:'less_recorded_practice'})
 for(const stale of [{...evidence,complete:false},{...evidence,goalId:'other'},{...evidence,through:'2026-11-25'},{...evidence,counts:{focus:999,boundaries:0}}])assert.deepEqual(recommendSkillWithEvidence(skills,stale,{day,goalId}),{id:'focus',reason:'self_rating'})
 const partial=await readWeeklyPracticeEvidence(async()=>({entries:[a],nextCursor:'more'}),{accountId,day,skills,goalId,digest,maxPages:1})
 assert.equal(partial.complete,false);assert.equal(partial.counts.focus,1)
 await assert.rejects(readWeeklyPracticeEvidence(async()=>({entries:[],nextCursor:'repeat'}),{accountId,day,skills,goalId,digest}),/UNVERIFIED/)
 await assert.rejects(readWeeklyPracticeEvidence(async()=>{throw Error('unexpected')},{accountId,day,skills,goalId,digest,signal:{aborted:true}}),/CANCELLED/)
})
test('daily and weekly goals only default to current owned goals; explicit none is respected',()=>{
 const goals=[{id:'a',status:'accepted'},{id:'b',status:'active'},{id:'c',status:'closed'}]
 assert.equal(preferredPracticeGoal(goals,null,'a','b'),'a');assert.equal(preferredPracticeGoal(goals,null,'c','b'),'b')
 assert.equal(preferredPracticeGoal(goals,'','a','b'),null);assert.equal(preferredPracticeGoal(goals,'foreign','a','b'),null)
 assert.equal(preferredPracticeGoal(goals,'b','a','b'),'b')
 const ui=readFileSync(new URL('../components/app/daybook-micro-coaching.jsx',import.meta.url),'utf8')
 const today=readFileSync(new URL('../components/app/daybook-today.jsx',import.meta.url),'utf8')
 assert.ok(ui.includes('onClick={()=>void loadPracticeHistory()}'));assert.ok(ui.includes('historyRequest.current===controller&&!controller.signal.aborted'))
 assert.ok(ui.includes('preferredPracticeGoal(allowedGoals,goal,weekly.entry?.goalId,preferredGoalId)'));assert.ok(today.includes('preferredGoalId={draft.weeklyGoalId}'))
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { getAssessmentDefinition, ASSESSMENT_DEFINITIONS } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { compareResults } from '../lib/profile/history.js'
import { interpretationForDimension, interpretationDimensionPlan } from '../lib/assessments/interpretation-registry.js'
import { courseMeasuredProfile, goalForChosenScale, coursePracticeFocus } from '../lib/inner-growth/course-strategy.js'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { monitoringCatalogItem } from '../data/assessments/catalog.js'
import { isMixedDirectionResultDimension } from '../lib/assessments/interpretation-context.js'
import { portraitSourceRule } from '../lib/assessments/portrait-constructs.js'
import { buildPsychPortrait } from '../lib/assessments/psych-portrait.js'

// Independent specification: explicit indices and expected IDs, never derived from the scorer map.
const cases = [
 {key:'hh-money-pressure', first:[0,1,2], second:[3,4,5], ids:['state.money_pressure.difficulty','resources.money_pressure.coping'], dir:'higher-reported-resource', axis:'resource', goal:'calm_regulation'},
 {key:'hh-overthinking-loop', first:[0,1,2,3,4], second:[5], ids:['state.overthinking_loop.difficulty','resources.overthinking_loop.interruptibility'], dir:'higher-reported-resource', axis:'anxiety', goal:'calm_regulation'},
 {key:'hh-screen-saturation', first:[0,1,2,3,4], second:[5], ids:['state.screen_saturation.difficulty','context.screen_saturation.offline_relief'], dir:'non-normative', axis:'focus', goal:'attention_clarity'},
]
const accountId=randomUUID(), now=Date.parse('2026-10-16T12:00:00Z')
const answer=(d,values)=>Object.fromEntries(values.map((v,i)=>[`${d.key}.${String(i+1).padStart(2,'0')}`,v]))
const score=(d,values)=>scoreAssessment(d,answer(d,values))
const record=s=>({...s,id:randomUUID(),accountId,measurementAt:'2026-10-16T10:00:00Z'})
const mean=(values,indices)=>Math.round(indices.reduce((a,i)=>a+values[i],0)/indices.length*100)/100
const oldHashes={
 'hh-money-pressure': ['sha256:7991d7d69831c2e8e06724090c463d921f001ac5b2939772501c113972debcec','sha256:5a91ec5c9faae1e7ffdd27db8c736369d229050f0dfbbe2dbc6897d3eeca7b31'],
 'hh-overthinking-loop':['sha256:2f5e5c8e227c58e6229ad6e34caf54e00d797924a37c4fdeaf1307de3a425128','sha256:b47fcd65ceb8bd585ecfe55ad4656e9558d02cbe4aa0db6824be460d80895211'],
 'hh-screen-saturation':['sha256:66c0afe8731d6d5fba0971c8f47e3a743a30b9d3ae3007f94e23adb5f32083c5','sha256:9d083d4278979cd450fc6ba4746fe1c884fc5ba3a5c6a6b4f57b1257bca95d3a'],
}
for(const c of cases) for(const locale of ['en','ru']) {
 const d=getAssessmentDefinition(c.key,'v2',locale), old=getAssessmentDefinition(c.key,'v1',locale)
 test(`${c.key}/${locale}: separate exact immutable identity and unchanged v1`,()=>{
  assert.notEqual(d.id,old.id); assert.notEqual(d.contentHash,old.contentHash)
  assert.equal(d.scoringKey,'configured'); assert.equal(d.scoringVersion,'v1'); assert.equal(d.resultVersion,'v2')
  assert.equal(old.contentHash,oldHashes[c.key][locale==='ru'?1:0])
  for(const def of [d,old]){const {contentHash,...body}=def;assert.equal(contentHash,'sha256:'+createHash('sha256').update(canonicalJSON(body)).digest('hex'))}
  assert.deepEqual(d.questions.map(q=>[q.id,q.text,q.required]),old.questions.map(q=>[q.id,q.text,q.required]))
  assert.equal(d.timeframe,old.timeframe);assert.deepEqual(d.responseAnchors,old.responseAnchors)
  assert.deepEqual(d.scoring.dimensions.map(x=>x.key),c.ids)
  assert.equal(d.scoring.dimensions[1].direction,c.dir)
  assert.equal(d.questions.at(-1).direction,c.dir)
  assert.equal(monitoringCatalogItem(c.key).version,'v2')
  const difficulty=portraitSourceRule(c.key,c.ids[0],'v2')
  assert.equal(difficulty?.mode,'directional')
  assert.equal(difficulty?.goalEligible,true)
  const context=portraitSourceRule(c.key,c.ids[1],'v2')
  assert.equal(context?.mode,c.dir==='non-normative' ? 'excluded' : 'directional')
  assert.equal(portraitSourceRule(c.key,c.ids[0],'v1'),null) // saved v1 is never recast
 })
 test(`${c.key}/${locale}: independent arithmetic over extremes, all response levels, basis vectors and rounding`,()=>{
  const vectors=[]
  for(let a=0;a<=4;a++)for(let b=0;b<=4;b++)vectors.push(Array.from({length:6},(_,i)=>c.first.includes(i)?a:b))
  for(let i=0;i<6;i++)for(let v=0;v<=4;v++)vectors.push(Array.from({length:6},(_,j)=>j===i?v:0))
  vectors.push([0,1,3,2,4,1],[1,0,0,0,0,0],[4,3,2,1,0,4])
  for(const values of vectors){
   const s=score(d,values);assert.deepEqual(s.dimensions.map(x=>x.value),[mean(values,c.first),mean(values,c.second)],JSON.stringify(values))
   assert.equal(score(old,values).dimensions[0].value,mean(values,[0,1,2,3,4,5]))
   assert.equal(s.dimensions.length,2);assert.equal(isMixedDirectionResultDimension(s,s.dimensions[0]),false)
  }
 })
 test(`${c.key}/${locale}: every response required and invalid answers rejected`,()=>{
  for(let i=0;i<6;i++)for(const bad of [undefined,null,-1,5,1.5,'2',NaN,Infinity]){
   const a=answer(d,[0,0,0,0,0,0]); a[d.questions[i].id]=bad
   assert.throws(()=>scoreAssessment(d,a),e=>['REQUIRED_ANSWER','INVALID_ANSWER'].includes(e.code))
  }
  assert.throws(()=>scoreAssessment(d,{...answer(d,[0,0,0,0,0,0]),extra:0}))
 })
 test(`${c.key}/${locale}: continuous bilingual dimension explanations without clinical cutoffs`,()=>{
  for(const value of [0,1,2,3,4]){const s=score(d,Array(6).fill(value));for(const dim of s.dimensions)for(const lang of ['en','ru']){
   const band=interpretationForDimension(s,dim,lang),plan=interpretationDimensionPlan(s,dim.key)
   assert.equal(band.basis,'descriptive');assert.equal(band.code,'continuous');assert.equal(band.recommendedReview,false)
   assert.equal(plan.explicit,true);assert.ok(plan.label[lang]);assert.ok(plan.step[lang].length>30)
   assert.ok(band.meaning.includes(plan.label[lang]))
  }}
  const guide=getTestScaleGuide(c.key,locale)
  assert.equal(guide.scales[1].axis,c.axis)
  if(c.dir==='non-normative'){
   assert.equal(guide.scales[1].type,'descriptive');assert.equal(guide.scales[1].canChooseSkill,false);assert.equal(guide.scales[1].skill,null)
   assert.match(guide.scales[1].action,locale==='ru'?/не означает автоматически лучше или хуже/:/not automatically better or worse/)
  }
 })
 test(`${c.key}/${locale}: resource/context changes never alter difficulty priority; saved old choices survive`,()=>{
  const profiles=[0,4].map(b=>courseMeasuredProfile({results:[record(score(d,Array.from({length:6},(_,i)=>c.first.includes(i)?2:b)))],testKeys:[c.key],locale,now}))
  assert.deepEqual(profiles.map(p=>p.scales[0].priorityPercent),[50,50])
  if(c.dir==='non-normative')for(const p of profiles){assert.equal(p.scales[1].eligible,false);assert.equal(p.scales[1].priorityPercent,null)}
  else assert.deepEqual(profiles.map(p=>p.scales[1].priorityPercent),[100,0])
  const legacy=record(score(old,[2,2,2,2,2,2])),id=`${c.key}::${legacy.dimensions[0].key}`
  const legacyProfile=courseMeasuredProfile({results:[legacy],testKeys:[c.key],locale,now})
  assert.equal(legacyProfile.scales.length,1);assert.equal(legacyProfile.scales[0].priorityPercent,null)
  // Mixed-polarity historical totals are never used to make *new* goals.
  // A course whose owner previously selected one can still continue.
  assert.equal(goalForChosenScale(id,locale),null)
  assert.equal(coursePracticeFocus([id],'inner_support',1,locale).scaleId,id)
  assert.equal(goalForChosenScale(`${c.key}::${c.ids[0]}`,locale),c.goal)
  const actual=record(score(d,[2,2,2,2,2,2]))
  const portrait=buildPsychPortrait([actual],{now})
  const axis=portraitSourceRule(c.key,c.ids[0],'v2').axis
  assert.equal(portrait.axes[axis]?.definitionKey,c.key)
  assert.equal(portrait.axes[axis]?.dimensionKey,c.ids[0])
  assert.equal(portrait.axes[axis]?.rawValue,2)
  if(c.dir==='non-normative') assert.equal(portraitSourceRule(c.key,c.ids[1],'v2').axis,null)
  if(c.dir==='non-normative')assert.equal(goalForChosenScale(`${c.key}::${c.ids[1]}`,locale),null)
 })
 test(`${c.key}/${locale}: no old-to-new score history comparison or identity forgery`,()=>{
  const s=record(score(d,[2,2,2,2,2,2])),before=record(score(old,[2,2,2,2,2,2]))
  assert.throws(()=>compareResults(s,before),e=>e.code==='INCOMPATIBLE_RESULTS')
  const forged={...d,scoring:{dimensions:old.scoring.dimensions}}
  assert.throws(()=>score(forged,[2,2,2,2,2,2]),e=>e.code==='INVALID_PROVENANCE')
  assert.equal(compareResults(s,record(score(d,[1,1,1,1,1,1]))).length,2)
 })
}
test('all registered IDs and semantic hashes remain unique',()=>{
 assert.equal(new Set(ASSESSMENT_DEFINITIONS.map(d=>d.id)).size,ASSESSMENT_DEFINITIONS.length)
 assert.equal(new Set(ASSESSMENT_DEFINITIONS.map(d=>d.contentHash)).size,ASSESSMENT_DEFINITIONS.length)
})
test('split activation is outside an automatic DB migration',()=>{
 const doc=readFileSync(new URL('../docs/assessments/hh-split-reflections-v2-release.md',import.meta.url),'utf8')
 assert.match(doc,/insert-only/);assert.match(doc,/No database operation/)
})

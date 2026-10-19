import test from 'node:test'
import assert from 'node:assert/strict'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { validateResult, compareResults } from '../lib/profile/history.js'
import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
const owner='10000000-0000-4000-8000-000000000001'
const result=(d,answers)=>({...scoreAssessment(d,answers,syntheticTraumaContext(d)),id:'00000000-0000-4000-8000-000000000001',accountId:owner,measurementAt:'2026-10-19T12:00:00Z'})
const answers=(d,mode)=>Object.fromEntries(d.questions.map((q,i)=>{const lo=q.min??d.answerScale.min,hi=q.max??d.answerScale.max;return[q.id,mode==='max'?hi:mode==='middle'?Math.floor((lo+hi)/2):mode==='mixed'&&i%2?hi:lo]}))
const fresh=()=>{const d=getAssessmentDefinition('hh-money-pressure','v2','en');return structuredClone(result(d,answers(d,'min')))}
for(const value of [0.01,0.1,0.32,0.34,1.0000000000000002,3.9999999999999996])test('reject impossible configured mean '+value,()=>{const r=fresh();r.dimensions[0].value=value;assert.throws(()=>validateResult(r),{code:'INVALID_RESULT'})})
for(const invalid of [null,undefined,[],false,'invalid',42])test('malformed dimension is bounded INVALID_RESULT '+String(invalid),()=>{const r=fresh();r.dimensions[0]=invalid;assert.throws(()=>validateResult(r),{code:'INVALID_RESULT'})})
test('sparse dimensions fail without filling missing values',()=>{const r=fresh();delete r.dimensions[0];assert.throws(()=>validateResult(r),{code:'INVALID_RESULT'});assert.equal(0 in r.dimensions,false)})
for(const d of ASSESSMENT_DEFINITIONS)test(`immutable scorer outputs remain accepted ${d.id}`,()=>{
 for(const mode of ['min','max','middle','mixed']){
  const a=answers(d,mode)
  if(d.key==='cdc-hrqol-4'&&a['hrqol4.02']===0&&a['hrqol4.03']===0)a['hrqol4.04']=0
  const r=result(d,a),copy=JSON.stringify(r);assert.equal(validateResult(r),r);assert.equal(JSON.stringify(r),copy)
 }
})
test('rounded thirds are accepted exactly as the scorer emits them, not unrounded fractions',()=>{
 for(const value of [0,0.33,0.67,1,1.33,2.67,3.67,4]){const r=fresh();r.dimensions[0].value=value;assert.equal(validateResult(r),r)}
 for(const value of [1/3,2/3]){const r=fresh();r.dimensions[0].value=value;assert.throws(()=>validateResult(r),{code:'INVALID_RESULT'})}
})
test('identity, duplicate keys, metadata and owner comparison gates remain strict',()=>{
 for(const mutate of [r=>r.contentHash='bad',r=>r.dimensions[0].min=-1,r=>r.dimensions[1].key=r.dimensions[0].key,r=>r.id='not-uuid']){const r=fresh();mutate(r);assert.throws(()=>validateResult(r))}
 const r=fresh(),other={...fresh(),accountId:'20000000-0000-4000-8000-000000000001'};assert.throws(()=>compareResults(r,other),{code:'OWNER_MISMATCH'})
 const reversed={...r,dimensions:[...r.dimensions].reverse()};assert.equal(validateResult(reversed),reversed,'existing key-based ordering contract stays compatible')
})
for(const [key,version,number] of [['hh-current-state','v2',0.5],['hh-socionics-32','v1',4.5],['cbi-personal','v1',0.01],['cdc-hrqol-4','v1',1.5]])test(`reject off-lattice ${key} while preserving output domains`,()=>{
 const d=getAssessmentDefinition(key,version,'en'),r=structuredClone(result(d,answers(d,'min')))
 const index=key==='cdc-hrqol-4'?r.dimensions.findIndex(x=>x.key.includes('unhealthy_days')):0
 assert.ok(index>=0);r.dimensions[index].value=number;assert.throws(()=>validateResult(r),{code:'INVALID_RESULT'})
})
test('all configured mean sum positions preserve the exact scorer rounding including CBI reverse items and multiplier',()=>{
 let points=0,multiplied=0
 for(const d of ASSESSMENT_DEFINITIONS.filter(d=>d.scoringKey==='configured'))for(const spec of d.scoring.dimensions.filter(s=>s.method==='mean')){
  assert.equal(new Set(spec.items).size,spec.items.length,'registered mean items are unique')
  const items=spec.items.map(id=>d.questions.find(q=>q.id===id)),lo=items.map(q=>q.min??d.answerScale.min),hi=items.map(q=>q.max??d.answerScale.max)
  const span=hi.reduce((sum,v,i)=>sum+v-lo[i],0)
  for(let offset=0;offset<=span;offset++){
   const a=answers(d,'min');let remaining=offset
   items.forEach((q,i)=>{const add=Math.min(remaining,hi[i]-lo[i]);remaining-=add;const value=lo[i]+add;a[q.id]=spec.reverseItems?.includes(q.id)?lo[i]+hi[i]-value:value})
   const r=result(d,a);assert.equal(validateResult(r),r)
   const dimension=r.dimensions.find(x=>x.key===spec.key)
   assert.equal(dimension.value,Math.round(((lo.reduce((a,b)=>a+b,0)+offset)/items.length)*(spec.multiplier??1)*100)/100)
   points++;if(spec.multiplier&&spec.multiplier!==1)multiplied++
  }
 }
 assert.ok(points>5000);assert.ok(multiplied>50)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {MONITORING_CATALOG} from '../data/assessments/catalog.js'
import * as definitions from '../lib/assessments/definitions.js'
import * as history from '../lib/assessments/verified-history.js'
const source=readFileSync(new URL('../lib/profile/summary.js',import.meta.url),'utf8')
function selector(catalog,{registry=definitions,verification=history}={}){
 const exports={}
 const modules={'../../data/assessments/catalog.js':{MONITORING_CATALOG:catalog},'../assessments/definitions.js':registry,'../assessments/verified-history.js':verification}
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 vm.runInNewContext(code,{exports,require(name){assert.ok(Object.hasOwn(modules,name),'Unexpected import '+name);return modules[name]}})
 return options=>JSON.parse(JSON.stringify(exports.profileCompletionRecommendations(options)))
}
const keys=result=>result.recommendations.map(item=>item.key)
const candidate=(key,extra={})=>({key,version:'v1',instrumentLocale:'en',axis:'baseline',resultAxes:['baseline'],startable:true,durationMinutes:3,...extra})
const registry=map=>({getAssessmentDefinition(key,version,locale){assert.equal(version,'v1');assert.equal(locale,'en');if(!map[key])throw Error('UNKNOWN_INSTRUMENT');return map[key]}})
const traits=n=>({scoring:{dimensions:Array.from({length:n},(_,i)=>({key:'trait.'+i,dimensionClass:'trait'}))}})
test('current immutable catalog prefers broad personality outputs regardless of catalog insertion order',()=>{
 const original=JSON.stringify(definitions.ASSESSMENT_DEFINITIONS)
 for(const catalog of [MONITORING_CATALOG,[...MONITORING_CATALOG].reverse(),[...MONITORING_CATALOG.slice(7),...MONITORING_CATALOG.slice(0,7)]]){
  const result=selector(catalog)({locale:'ru'})
  assert.deepEqual(keys(result),['hh-weekly-pulse','mini-ipip-20'])
  assert.deepEqual(result.recommendations[1].covers,['trait'])
 }
 assert.equal(JSON.stringify(definitions.ASSESSMENT_DEFINITIONS),original)
 for(const key of ['ipip-emotion-decision-making-9','ipip-responsive-joy-10','ipip-responsive-distress-10','ipip-empathic-concern-10']){
  const item=MONITORING_CATALOG.find(item=>item.key===key)
  assert.equal(item.startable,true);assert.equal(item.starterEligible,true)
  assert.equal(definitions.getAssessmentDefinition(key,'v1','en').scoring.dimensions.length,1)
 }
})
test('declared trait breadth wins without questionnaire names, lexical order or question counts',()=>{
 const a=candidate('aaa-narrow',{questionCount:100}),z=candidate('zzz-broad',{questionCount:2})
 for(const catalog of [[a,z],[z,a]])assert.deepEqual(keys(selector(catalog,{registry:registry({'aaa-narrow':traits(1),'zzz-broad':traits(5)})})({})),['zzz-broad'])
 // Existing factor-based definitions participate in the same count contract.
 assert.deepEqual(keys(selector([a,z],{registry:registry({'aaa-narrow':traits(1),'zzz-broad':{factors:[{key:'one'},{key:'two'}]}})})({})),['zzz-broad'])
})
test('unknown definitions and duplicated or non-trait dimensions do not invent breadth',()=>{
 const a=candidate('aaa-unknown'),b=candidate('bbb-duplicates'),c=candidate('ccc-broad')
 const dup={scoring:{dimensions:[{key:'trait.one',dimensionClass:'trait'},{key:'trait.one',dimensionClass:'trait'},...Array.from({length:8},(_,i)=>({key:'state.'+i,dimensionClass:'state'}))]}}
 assert.deepEqual(keys(selector([a,b,c],{registry:registry({'bbb-duplicates':dup,'ccc-broad':traits(2)})})({})),['ccc-broad'])
})
test('startability, opt-in, completed keys and starter preference still precede breadth',()=>{
 const catalog=[candidate('unavailable',{startable:false}),candidate('opt-in',{explicitOptIn:true}),candidate('completed'),candidate('not-starter',{starterEligible:false}),candidate('eligible')]
 const map=Object.fromEntries(catalog.map(x=>[x.key,traits(x.key==='eligible'?1:20)]))
 const verification={...history,verifiedHistoryView:()=>({current:[{definitionKey:'completed'}],eligible:[]})}
 assert.deepEqual(keys(selector(catalog,{registry:registry(map),verification})({})),['eligible'])
})
test('coverage count stays first; breadth is ignored when trait is already measured',()=>{
 const broad=candidate('zzz-broad'),many=candidate('aaa-layers',{axis:'state',resultAxes:['state','symptoms','function','resources'],durationMinutes:5})
 const reg=registry({'zzz-broad':traits(10),'aaa-layers':traits(1)})
 assert.deepEqual(keys(selector([broad,many],{registry:reg})({})),['aaa-layers','zzz-broad'])
 const verification={...history,verifiedSnapshotRows:()=>[{key:'trait.saved',value:1,min:0,max:2,dimensionClass:'trait'}]}
 const b=candidate('zzz-broad',{resultAxes:['trait','state']}),a=candidate('aaa-fast',{resultAxes:['trait','state']})
 assert.deepEqual(keys(selector([b,a],{registry:registry({'zzz-broad':traits(10),'aaa-fast':traits(1)}),verification})({snapshot:{}})),['aaa-fast'])
})
test('equal breadth retains duration then lexical tie-break and ignores array order',()=>{
 const a=candidate('aaa'),z=candidate('zzz'),slow=candidate('000-slow',{durationMinutes:9})
 const reg=registry({aaa:traits(2),zzz:traits(2),'000-slow':traits(2)})
 for(const catalog of [[z,slow,a],[a,z,slow]])assert.deepEqual(keys(selector(catalog,{registry:reg})({})),['aaa'])
})

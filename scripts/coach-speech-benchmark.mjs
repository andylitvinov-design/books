// Offline, deterministic benchmark scorer. No network, credentials or provider calls.
import {readFileSync} from 'node:fs'
import {pathToFileURL} from 'node:url'
export const normalize=s=>String(s??'').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/gu,' ').trim()
export function distance(a,b){
 let row=Array.from({length:b.length+1},(_,i)=>i)
 for(let i=1;i<=a.length;i++){
  const next=[i]
  for(let j=1;j<=b.length;j++)next[j]=Math.min(row[j]+1,next[j-1]+1,row[j-1]+(a[i-1]===b[j-1]?0:1))
  row=next
 }
 return row[b.length]
}
export function score(fixture,model){
 if(!Array.isArray(fixture)||!fixture.length||!model||!Array.isArray(model.results))throw Error('INVALID_BENCHMARK')
 const ids=new Set(fixture.map(x=>x.id))
 if(ids.size!==fixture.length)throw Error('DUPLICATE_FIXTURE')
 const records=new Map()
 for(const row of model.results){
  if(!ids.has(row.id)||records.has(row.id))throw Error('UNKNOWN_OR_DUPLICATE_RESULT')
  if(typeof row.audioId!=='string'||!row.audioId.trim())throw Error('MISSING_AUDIO_ID')
  if(row.text!=null&&typeof row.text!=='string')throw Error('INVALID_TRANSCRIPT')
  if(row.latencyMs!=null&&(!Number.isFinite(row.latencyMs)||row.latencyMs<0))throw Error('INVALID_LATENCY')
  records.set(row.id,row)
 }
 function aggregate(items){
  let words=0,werErrors=0,chars=0,cerErrors=0,covered=0,critical=0,criticalMismatch=0
  const latencies=[]
  for(const f of items){
   const r=records.get(f.id),ref=normalize(f.reference),hyp=normalize(r?.text)
   const rw=ref.split(' ').filter(Boolean),hw=hyp.split(' ').filter(Boolean)
   const rc=Array.from(ref.replace(/ /g,'')),hc=Array.from(hyp.replace(/ /g,''))
   words+=rw.length;chars+=rc.length;werErrors+=distance(rw,hw);cerErrors+=distance(rc,hc)
   if(hyp)covered++
   if(f.critical){critical++;if(ref!==hyp)criticalMismatch++}
   if(r?.latencyMs!=null)latencies.push(r.latencyMs)
  }
  latencies.sort((a,b)=>a-b)
  return {samples:items.length,coverage:covered/items.length,wer:words?werErrors/words:null,cer:chars?cerErrors/chars:null,criticalExactMismatch:criticalMismatch,criticalSamples:critical,p50Ms:latencies.length?latencies[Math.ceil(latencies.length*.5)-1]:null,p95Ms:latencies.length?latencies[Math.ceil(latencies.length*.95)-1]:null,latencySamples:latencies.length}
 }
 return {name:model.name,overall:aggregate(fixture),byLocale:Object.fromEntries([...new Set(fixture.map(x=>x.locale))].map(l=>[l,aggregate(fixture.filter(x=>x.locale===l))])),byCategory:Object.fromEntries([...new Set(fixture.map(x=>x.category))].map(c=>[c,aggregate(fixture.filter(x=>x.category===c))]))}
}
export function compare(fixture,models){
 if(!Array.isArray(models)||models.length<2)throw Error('TWO_MODELS_REQUIRED')
 // Same recorded clip for each model; missing outputs must be explicit null rows.
 for(const m of models)if(!Array.isArray(m.results)||m.results.length!==fixture.length)throw Error('EXPLICIT_RESULTS_REQUIRED')
 const baseline=new Map(models[0].results.map(x=>[x.id,x.audioId]))
 for(const m of models.slice(1))for(const x of m.results)if(baseline.get(x.id)!==x.audioId)throw Error('AUDIO_MISMATCH')
 return {baseline:models[0].name,reports:models.map(m=>score(fixture,m))}
}

// Numeric screening only. A pass is NOT rollout approval or proof that
// the results came from a real provider. Human/device acceptance is separate.
export function speechBenchmarkAcceptance(fixture,baseline,candidate,{latencyKind='unknown'}={}){
 if(!['unknown','local_cpu','hosted_background'].includes(latencyKind))throw Error('INVALID_LATENCY_KIND')
 if(typeof baseline?.name!=='string'||!baseline.name.trim()||typeof candidate?.name!=='string'||!candidate.name.trim()||baseline.name===candidate.name)throw Error('DISTINCT_MODEL_LABELS_REQUIRED')
 const locales=['ru','en','es']
 if(!Array.isArray(fixture)||fixture.some(f=>!locales.includes(f.locale)||typeof f.reference!=='string'||!normalize(f.reference)))throw Error('INVALID_ACCEPTANCE_FIXTURES')
 for(const model of [baseline,candidate]){
  if(!Array.isArray(model.results)||model.results.some(row=>typeof row.audioId!=='string'||! /^[0-9a-f]{64}$/i.test(row.audioId)))throw Error('AUDIO_SHA256_REQUIRED')
 }
 const {reports:[a,b]}=compare(fixture,[baseline,candidate])
 const checks=[]
 const check=(id,ok,details={})=>checks.push({id,status:ok===null?'not_measured':ok?'pass':'fail',...details})
 check('minimum_100_samples',fixture.length>=100,{samples:fixture.length})
 for(const locale of locales){
  const before=a.byLocale[locale],after=b.byLocale[locale]
  check('coverage_'+locale,before&&after?after.coverage>=before.coverage:null,{baseline:before?.coverage??null,candidate:after?.coverage??null})
  if(locale!=='ru')check('wer_no_regression_'+locale,before&&after?after.wer<=before.wer:null,{baseline:before?.wer??null,candidate:after?.wer??null})
  // Exact text is a conservative proxy, not a semantic-error classifier.
  check('critical_exact_mismatch_no_regression_'+locale,before?.criticalSamples&&after?.criticalSamples?after.criticalExactMismatch<=before.criticalExactMismatch:null,{baseline:before?.criticalExactMismatch??null,candidate:after?.criticalExactMismatch??null,samples:after?.criticalSamples??0})
 }
 const aw=a.byLocale.ru?.wer,bw=b.byLocale.ru?.wer
 const improvement=typeof aw==='number'&&aw>0&&typeof bw==='number'?(aw-bw)/aw:null
 check('ru_relative_wer_reduction_30pct',improvement===null?null:improvement>=.30,{baseline:aw??null,candidate:bw??null,relativeReduction:improvement})
 const numericScreen=checks.some(x=>x.status==='fail')?'fail':checks.some(x=>x.status==='not_measured')?'not_measured':'pass'
 const validLatency=latencyKind==='hosted_background'&&b.overall.latencySamples===fixture.length&&typeof b.overall.p95Ms==='number'
 return {schema:'hh-coach-speech-acceptance-v1',baseline:a.name,candidate:b.name,numericScreen,checks,
  backgroundLatencyTarget:{status:validLatency?(b.overall.p95Ms<=3000?'pass':'fail'):'not_measured',p95Ms:validLatency?b.overall.p95Ms:null,latencyKind},
  cleanSpeechWordAccuracyTarget:{status:'not_measured',target:.95},
  reports:[a,b],rolloutApproved:false,
  outstandingAcceptance:['verify_actual_free_entitlement_and_provider_data_terms','verify_real_audio_provenance_and_human_reference','review_critical_semantic_errors_and_false_confirmations','measure_clean_ordinary_speech_accuracy','measure_first_audible_p95_delta_under_identical_conditions','physical_iphone_20_minutes_30_turns_loudspeaker_airpods','chromium_webkit_and_private_storage_readback','verify_consent_revocation_network_quota_safety_and_coach_switch','protected_merge_and_canonical_live_acceptance']}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2)
 const acceptance=args[0]==='--acceptance'
 if(acceptance)args.shift()
 const latencyKind=args[0]?.startsWith('--latency-kind=')?args.shift().slice('--latency-kind='.length):'unknown'
 const [fixturePath,...resultPaths]=args
 if(!fixturePath||resultPaths.length<2)throw Error('Usage: node scripts/coach-speech-benchmark.mjs FIXTURES.json BASELINE.json CANDIDATE.json [...]')
 const load=p=>JSON.parse(readFileSync(p,'utf8'))
 const fixture=load(fixturePath).fixtures,models=resultPaths.map(load)
 if(acceptance&&models.length!==2)throw Error('ACCEPTANCE_REQUIRES_BASELINE_AND_ONE_CANDIDATE')
 console.log(JSON.stringify(acceptance?speechBenchmarkAcceptance(fixture,models[0],models[1],{latencyKind}):compare(fixture,models),null,2))
}

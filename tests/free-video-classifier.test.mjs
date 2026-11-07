import test from 'node:test';
import assert from 'node:assert/strict';
import {safeClassifierBatch,parseClassifierReply,classifyPublicVideos,MAX_CLASSIFIER_BATCH} from '../lib/automations/free-classifier.mjs';
const ID='123e4567-e89b-42d3-a456-426614174000';
const rows=[{candidate_id:ID,title:'Calm river',category:'stress-anxiety',source_query:'river',mime:'video/webm'}];
const content=JSON.stringify({results:[{id:ID,goals:['stress'],confidence:'high',summary:'Calming outdoor river landscape',warnings:[]}]});
const mock=(kind='good')=>async(url,opts)=>{
  const send=(status,obj)=>({ok:status===200,status,json:async()=>obj});
  if(url.endsWith('/key'))return send(200,{data:{limit:50}});
  if(url.endsWith('/models'))return send(200,{data:[{id:'google/gemma-4-31b-it:free',pricing:{prompt:'0',completion:'0'},architecture:{input_modalities:['text'],output_modalities:['text']}}]});
  if(kind==='quota')return send(429,{});
  const req=JSON.parse(opts.body);
  assert.equal(req.provider.allow_fallbacks,false);
  assert.deepEqual(req.provider.max_price,{prompt:0,completion:0,request:0,image:0});
  assert.equal(req.model,'google/gemma-4-31b-it:free');
  return send(200,{model:kind==='model_changed'?'paid/surprise':req.model,
    usage:{cost:kind==='charged'?0.0001:0},choices:[{finish_reason:'stop',message:{content}}]});
};
test('bounded input refuses 7 candidates',()=>assert.throws(()=>safeClassifierBatch(Array.from({length:MAX_CLASSIFIER_BATCH+1},()=>rows[0]))));
test('rejects unauthorized goals and AI rights approvals',()=>{
 assert.equal(parseClassifierReply(JSON.stringify({results:[{id:ID,goals:['license_approved'],summary:'Unverified metadata summary',confidence:'high',warnings:[]}]}),safeClassifierBatch(rows)),null);
});
test('no free key means no network calls',async()=>{
 let calls=0;const r=await classifyPublicVideos(rows,{fetcher:async()=>{calls++;throw Error('called')}});
 assert.equal(r.status,'disabled');assert.equal(calls,0);
});
test('one zero-priced named model completes metadata-only batch',async()=>{
 const r=await classifyPublicVideos(rows,{key:'synthetic-free-tier-key-not-secret',fetcher:mock()});
 assert.equal(r.status,'ok');assert.equal(r.results[0].reviewRequired,true);assert.equal(r.results[0].goals[0],'stress');assert.equal(r.priceVerified,true);
});
test('charged or changed model is never accepted',async()=>{
 for(const kind of ['charged','model_changed']){
  const r=await classifyPublicVideos(rows,{key:'synthetic-free-tier-key-not-secret',fetcher:mock(kind)});
  assert.equal(r.status,'failed');assert.equal(r.reason,'MODEL_COST_OR_ID_UNVERIFIED');
 }
});
test('quota error stops without retries',async()=>{
 let n=0;const f=mock('quota'); const r=await classifyPublicVideos(rows,{key:'synthetic-free-tier-key-not-secret',fetcher:async(...args)=>{n++;return f(...args)}});
 assert.equal(r.status,'quota_paused');assert.equal(n,3);
});
import {readFileSync} from 'node:fs';
test('optional classifier stays off without explicit production flag',async()=>{
 const source=readFileSync(new URL('../lib/automations/classifier-runner.js',import.meta.url),'utf8');
 assert.match(source,/HH_VIDEO_CLASSIFIER_ENABLED!=='true'/);
 assert.match(source,/claimClassifierBatch/);
 const cron=readFileSync(new URL('../app/api/internal/video-scout-hourly/route.js',import.meta.url),'utf8');
 assert.match(cron,/if\(process\.env\.HH_VIDEO_CLASSIFIER_ENABLED==='true'\)/);
});
test('SQL migration forces RLS and leaves all suggestions as unapproved',()=>{
 const sql=readFileSync(new URL('../sql/ai-council-free-classifier-v2-20261106.sql',import.meta.url),'utf8');
 for(const pattern of [/FORCE ROW LEVEL SECURITY/,/REVOKE ALL ON .* FROM PUBLIC,anon,authenticated/,/GRANT SELECT,INSERT/,/review_required=true/])assert.match(sql,pattern);
 assert.doesNotMatch(sql,/(?:grant|GRANT)\s+UPDATE\b/);
});

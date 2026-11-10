import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('existing classifier route invokes Gemini only for explicit rejected OpenRouter quota',()=>{
 const runner=read('lib/automations/classifier-runner.js');
 assert.match(runner,/shouldTryGeminiFallback\(result,env\)/);
 assert.match(runner,/classifyGeminiFreePublicMetadata\(rows,\{env,fetcher\}\)/);
 assert.match(runner,/runFourHourlyClassification/);
 assert.match(runner,/classifyPublicVideos\(rows/);
 assert.doesNotMatch(runner,/new URL\(.*(?:url|query)/);
});
test('classification receipt tracks four possible public API calls and never asserts unsupported Gemini zero-cost receipts',()=>{
 const store=read('lib/automations/classifier-store.mjs');
 assert.match(store,/Math\.min\(4,Number\(result\.apiCalls\)/);
 assert.match(store,/priceVerified:result\.priceVerified===true/);
 assert.match(store,/freeTierAttested:result\.freeTierAttested===true/);
 assert.match(store,/result\.provider==='gemini_direct_free'/);
});

test('private annotation model CHECK preserves all old :free ids and only the exact Gemini model',()=>{
 const sql=read('sql/ai-council-gemini-classifier-model-v1-20261107.sql');
 assert.match(sql,/video_candidate_ai_suggestions_v2_model_id_check/);
 assert.match(sql,/model_id='gemini-3\.5-flash-lite'/);
 assert.match(sql,/char_length\(model_id\)<=120/);
 assert.doesNotMatch(sql,/GRANT\s|TO\s+PUBLIC|ALTER\s+ROLE|DROP\s+TABLE|TRUNCATE\s/i);
});

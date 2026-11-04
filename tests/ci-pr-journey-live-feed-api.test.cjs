'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const api=require('../ops/pr-monitor/api/pr-journey-live-feed.js');
const now=Date.parse('2026-11-04T15:45:00Z');
const body=()=>({schema:'HH_PR_JOURNEY_LIVE_FEED_V1',repo:'andylitvinov-design/books',
 production_base:'codex/public-book-library',generated_at:'2026-11-04T15:40:00Z',
 coverage:{label:'VERIFIED_OBSERVED_SAMPLE_NOT_ALL_PRS'},
 rows:[{pr:7,merge_sha:'a'.repeat(40),deployment_id:'dpl_ABCDEF1234567890',
 created_at:'2026-11-04T10:00:00Z',merged_at:'2026-11-04T15:00:00Z',
 live_at:'2026-11-04T15:10:00Z'}]});
test('parses only marked, exact chronological historical LIVE records',()=>{
 const x=api.parse('<!-- HH_PR_JOURNEY_LIVE_FEED_V1 -->\n'+JSON.stringify(body()),now);
 assert.equal(x.rows.length,1);assert.equal(x.rows[0].pr,7);
 assert.equal(x.coverage.label,'VERIFIED_OBSERVED_SAMPLE_NOT_ALL_PRS');
});
test('marker, mismatched schema, duplicate, reordered event or future proof fail closed',()=>{
 assert.throws(()=>api.parse(JSON.stringify(body()),now),/MARKER/);
 let fake=body();fake.rows[0].live_at='2026-11-04T14:00:00Z';
 assert.throws(()=>api.parse('<!-- HH_PR_JOURNEY_LIVE_FEED_V1 -->\n'+JSON.stringify(fake),now),/ROW/);
 fake=body();fake.rows.push({...fake.rows[0]});
 assert.throws(()=>api.parse('<!-- HH_PR_JOURNEY_LIVE_FEED_V1 -->\n'+JSON.stringify(fake),now),/DUPLICATE/);
 fake=body();fake.generated_at='2026-11-05T15:40:00Z';
 assert.throws(()=>api.parse('<!-- HH_PR_JOURNEY_LIVE_FEED_V1 -->\n'+JSON.stringify(fake),now),/SCHEMA/);
});
test('read-only GitHub issue source is single bounded GET, never PR enumeration',async()=>{
 const input={number:3440,state:'open',body:'<!-- HH_PR_JOURNEY_LIVE_FEED_V1 -->\n'+JSON.stringify(body())};
 const urls=[];
 const x=await api.load({now,token:'',request:async(url,options)=>{
  urls.push(url);
  assert.equal(options.headers.Authorization,undefined);
  return {ok:true,json:async()=>input};
 }});
 assert.equal(x.rows.length,1);
 assert.deepEqual(urls,['https://api.github.com/repos/andylitvinov-design/books/issues/3440']);
});
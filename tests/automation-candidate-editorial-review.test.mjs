import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {validateCandidateEditorialAction,reviewResearchCandidate,readCandidateEditorialReviews}
 from '../lib/automations/candidate-editorial-review.mjs';

const UUID_A='726e9610-8e79-4ff1-b463-32953ea7bc27';
const UUID_B='d742fecc-1c89-4a4b-a018-b04dde7738cd';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const good={candidateId:UUID_A,requestId:UUID_B,decision:'shortlist'};

test('valid choices map to editorial only, not rights approval',()=>{
  for(const decision of ['shortlist','needs_evidence','reject']){
    const a=validateCandidateEditorialAction({...good,decision});
    assert.match(a.state,/^(shortlisted_for_rights_review|needs_more_evidence|rejected)$/);
    assert.equal(a.candidateId,UUID_A);
  }
});
test('rejects untrusted URLs, arbitrary actions, prototype and wrong identities',()=>{
  for(const data of [null,{},[],{...good,url:'https://example.com/x.mp4'},
    {...good,decision:'approve_rights'},{...good,decision:'generator_eligible'},
    {...good,candidateId:'../file'},{...good,requestId:'bad'},
    {...good,creator:'external'}, {...good,rightsApproved:true}])
    assert.throws(()=>validateCandidateEditorialAction(data),/INVALID_CANDIDATE_REVIEW/);
});
test('a successful owner decision needs actual research candidate and durable event',async()=>{
  const sql=[];
  const db={query:async(s,params)=>{sql.push({s,params});
    if(s.includes('from app_private.video_source_candidates_v2'))return {rows:[{candidate_id:UUID_A}]};
    if(s.includes('insert into app_private.video_candidate_editorial_events_v1'))return {rows:[{event_id:UUID_B}]};
    if(s.includes('insert into app_private.video_candidate_editorial_reviews_v1'))return {rows:[{candidate_id:UUID_A,decision:'shortlisted_for_rights_review'}]};
    throw Error('UNEXPECTED_SQL');
  }};
  const r=await reviewResearchCandidate(db,good);
  assert.deepEqual(r,{status:'reviewed',decision:'shortlisted_for_rights_review',rightsApproved:false,vaultEligible:false,publicationAuthorized:false,mediaVerified:false});
  assert.equal(sql.length,3);
  assert.ok(sql.every(v=>!v.s.includes('update app.video_vault_assets')));
  assert.equal(sql[1].params[1],UUID_B);
});
test('unrecognized/non-research candidate cannot create event or decision',async()=>{
  let n=0; const r=await reviewResearchCandidate({query:async()=>{n++;return{rows:[]}}},good);
  assert.equal(n,1);assert.equal(r.status,'not_found');assert.equal(r.rightsApproved,false);
});
test('idempotent operation never changes review twice',async()=>{
  let n=0;const r=await reviewResearchCandidate({query:async()=>{
    n++;if(n===1)return{rows:[{candidate_id:UUID_A}]};return{rows:[]};
  }},good);
  assert.equal(n,2);assert.equal(r.status,'replayed');assert.equal(r.vaultEligible,false);
});
test('bounded read from private tables only',async()=>{
  const x=await readCandidateEditorialReviews({query:async(s,p)=>{
    assert.match(s,/video_candidate_editorial_reviews_v1/);
    assert.match(s,/video_source_candidates_v2/);assert.deepEqual(p,[40]);return{rows:[]};
  }});assert.deepEqual(x,[]);
  for(const limit of [0,41,-1,1.2,'20'])await assert.rejects(
    readCandidateEditorialReviews({query:async()=>({rows:[]})},{limit}),/EDITORIAL_INVALID_READ/);
});
test('SQL forcibly protects both review and event ledgers and never grants public access',()=>{
  const s=readFileSync(resolve(ROOT,'sql/ai-council-candidate-editorial-review-v1-20261107.sql'),'utf8');
  assert.equal((s.match(/FORCE ROW LEVEL SECURITY/g)||[]).length,2);
  assert.equal((s.match(/ENABLE ROW LEVEL SECURITY/g)||[]).length,2);
  assert.match(s,/REVOKE ALL ON[\s\S]*?FROM PUBLIC,anon,authenticated/);
  assert.doesNotMatch(s,/GRANT [^;]+ TO (anon|authenticated|PUBLIC)/i);
  assert.doesNotMatch(s,/(UPDATE|INSERT INTO) app\.video_vault_assets_v1/i);
  assert.match(s,/operation_id uuid NOT NULL UNIQUE/);
});
test('route is owner-only, same-origin JSON and no raw URL or rights state',()=>{
  const r=readFileSync(resolve(ROOT,'app/api/admin/automations/candidates/review/route.js'),'utf8');
  assert.match(r,/ownerMaterialRequest/);
  assert.match(r,/consumeRate/);
  assert.match(r,/transaction\(config,null/);
  assert.doesNotMatch(r,/upload|createR2Client|https?:\/\//i);
});

test('pending owner-review counter excludes already-triaged candidate IDs',async()=>{
  const {readAutomationSnapshot}=await import('../lib/automations/scout-db.mjs');
  const q=[];
  const db={query:async(s)=>{
    q.push(s);
    if(s.includes('select count(*)::integer as research_total'))
      return{rows:[{research_total:40,pending_review:38}]};
    return{rows:[]};
  }};
  const result=await readAutomationSnapshot(db,{now:new Date('2026-11-07T01:24:00Z'),limit:10});
  assert.equal(result.counts.pending_review,38);
  assert.equal(result.counts.research_total,40);
  assert.match(q.find(x=>x.includes('as research_total')),/left join app_private\.video_candidate_editorial_reviews_v1/);
  assert.equal(result.slots.length,24);
});

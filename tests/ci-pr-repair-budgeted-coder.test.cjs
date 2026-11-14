'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {verifyKey,verifyModel,estimateCost,safeDiagnostic,cleanCandidate,trustedReservations,RESERVE}=require('../scripts/ci-pr-repair-budgeted-coder.cjs');
const FILE='lib/repair-panel.ts',SHA='b'.repeat(40),BLOB='c'.repeat(40);
const scope={sha:SHA,files:[FILE]};
const model={id:'qwen/qwen3-coder-next',pricing:{prompt:'0.00000012',completion:'0.0000008',input_cache_read:'0.00000007'},architecture:{input_modalities:['text'],output_modalities:['text']}};
const key={data:{limit:4.5,limit_reset:'monthly',limit_remaining:3.25,usage_monthly:1.25}};
test('strict monthly provider key hard cap',()=>{
 assert.equal(verifyKey(key,0.003).remaining,3.25);
 for(const data of [{...key.data,limit:5},{...key.data,limit_reset:'daily'},{...key.data,limit:null},{...key.data,limit_remaining:0.01},{...key.data,usage_monthly:4.49}])
  assert.throws(()=>verifyKey({data},0.003),/MONTHLY_HARD_CAP/);
});
test('only exact text model and bounded prices',()=>{
 const p=verifyModel({data:[model]});
 assert.ok(estimateCost(12000,p)<RESERVE);
 assert.throws(()=>verifyModel({data:[{...model,pricing:{prompt:'0.00000013',completion:'0.0000008'}}]}),/PRICE_OR_MODALITY/);
 assert.throws(()=>verifyModel({data:[{...model,pricing:{...model.pricing,request:'0.1'}}]}),/UNEXPECTED_BILLABLE_UNIT/);
});
test('trusted TypeScript diagnosis',()=>{
 const s='other.ts(2,2): error TS1111: other\n'+FILE+'(8,4): error TS2322: string is not a number\n';
 assert.equal(safeDiagnostic(s,scope)[0].code,'TS2322');
 assert.equal(safeDiagnostic(FILE+'(1,1): error TS2322: Bearer token',scope).length,0);
});
test('one exact line and one allowed file; no bypass',()=>{
 const source='const value: number = "hello";\nexport { value };\n';
 const patch=JSON.stringify({file:FILE,old:'const value: number = "hello";',new:'const value: number = 1;'});
 const c=cleanCandidate(patch,source,FILE,BLOB,SHA);
 assert.equal(c.repair_kind,'budgeted_ai');
 assert.equal(Buffer.from(c.files[0].base64,'base64').toString('utf8'),'const value: number = 1;\nexport { value };\n');
 for(const p of [
  {file:'lib/other.ts',old:'const value: number = "hello";',new:'hello'},
  {file:FILE,old:'const value: number = "hello";',new:'const value = x as any;'}
 ])assert.throws(()=>cleanCandidate(JSON.stringify(p),source,FILE,BLOB,SHA),/INVALID_ONE_LINE/);
});
test('ledger counts only signed app reservation receipts',()=>{
 const good={user:{login:'github-actions[bot]',id:41898282},performed_via_github_app:{id:15368},body:'<!-- HH_PR_BUDGETED_CODER_RECEIPT_V1 -->\n'+JSON.stringify({schema:'HH_PR_BUDGETED_CODER_V1',pr:777,sha:SHA,month:'2026-11',state:'RESERVED',reserved_usd:RESERVE,model:'qwen/qwen3-coder-next'})};
 assert.equal(trustedReservations([good,{...good,user:{login:'other',id:1}}],'2026-11').length,1);
 assert.equal(trustedReservations([good],'2026-12').length,0);
});

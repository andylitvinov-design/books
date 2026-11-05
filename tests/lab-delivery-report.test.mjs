import test from 'node:test';import assert from 'node:assert/strict';import {buildDeliveryReport} from '../scripts/lab-delivery-report.mjs';
const a='a'.repeat(40),b='b'.repeat(40);
test('report never infers Live without deployment evidence',()=>{
 const report=buildDeliveryReport({features:[{id:'LAB-101',pr:{number:10,headSha:a,merged:true,mergeSha:b,mergedAt:'2026-10-31T12:00:00Z'}}]});
 assert.equal(report.results[0].state,'MERGED');
});
test('invalid IDs fail closed',()=>assert.equal(buildDeliveryReport({features:[{id:'x'}]}).results[0].state,'UNVERIFIED'));
test('missing features rejects',()=>assert.throws(()=>buildDeliveryReport({}),/Invalid/));

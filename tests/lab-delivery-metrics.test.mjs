import test from 'node:test';import assert from 'node:assert/strict';import {deliveryMetrics} from '../scripts/lab-delivery-metrics.mjs';
test('only SHA and smoke verified events count as Live',()=>{
 const r=deliveryMetrics([
 {startedAt:'2026-10-31T10:00:00Z',labReadyAt:'2026-10-31T10:10:00Z',liveVerifiedAt:'2026-10-31T11:00:00Z',liveShaVerified:true,liveSmokePassed:true,releasePrCreated:true,prCount:1},
 {startedAt:'2026-10-31T10:00:00Z',liveVerifiedAt:'2026-10-31T10:20:00Z',liveShaVerified:false,liveSmokePassed:true,prCount:3}
 ]);
 assert.equal(r.liveVerified,1);assert.equal(r.labVerified,1);assert.equal(r.medianMinutesToLive,60);assert.equal(r.meanPrPerTrackedItem,2);
});
test('empty metrics do not fabricate timings',()=>assert.deepEqual(deliveryMetrics([]),{workItems:0,labVerified:0,liveVerified:0,releasePrCreated:0,medianMinutesToLab:null,medianMinutesToLive:null,meanPrPerTrackedItem:null}));

import test from 'node:test';
import assert from 'node:assert/strict';
import {expectedTaskSlot,summarizeTaskHealth} from '../lib/automations/task-health.mjs';
const base=(id,cron,updated='2026-11-06T21:00:00.000Z')=>({task_id:id,enabled:true,schedule_cron:cron,updated_at:updated});
test('hourly slots are UTC 17 minutes past',()=>{
 const t=base('video-scout-hourly','17 * * * *');
 assert.equal(expectedTaskSlot(t,'2026-11-07T04:16:40Z'),'2026-11-07T03:17:00.000Z');
 assert.equal(expectedTaskSlot(t,'2026-11-07T04:18:00Z'),'2026-11-07T04:17:00.000Z');
});
test('4-hour classifier does not invent hourly run',()=>{
 const t=base('video-classifier-batch','17 */4 * * *');
 assert.equal(expectedTaskSlot(t,'2026-11-07T04:19:00Z'),'2026-11-07T04:17:00.000Z');
 assert.equal(expectedTaskSlot(t,'2026-11-07T07:19:00Z'),'2026-11-07T04:17:00.000Z');
 assert.equal(expectedTaskSlot(t,'2026-11-07T08:18:00Z'),'2026-11-07T08:17:00.000Z');
});
test('weekly council uses Monday at 07:17 UTC',()=>{
 const t=base('council-video-review-weekly','17 7 * * 1');
 assert.equal(expectedTaskSlot(t,'2026-11-08T14:00:00Z'),'2026-11-02T07:17:00.000Z');
 assert.equal(expectedTaskSlot(t,'2026-11-09T07:18:00Z'),'2026-11-09T07:17:00.000Z');
});
test('daily digest uses 15:17 UTC',()=>{
 const t=base('video-scout-digest-daily','17 15 * * *');
 assert.equal(expectedTaskSlot(t,'2026-11-07T14:59:00Z'),'2026-11-06T15:17:00.000Z');
 assert.equal(expectedTaskSlot(t,'2026-11-07T15:18:00Z'),'2026-11-07T15:17:00.000Z');
});
test('enabled without DB evidence is not labelled successful',()=>{
 const task=base('video-scout-hourly','17 * * * *');
 assert.equal(summarizeTaskHealth(task,null,{now:'2026-11-07T04:25:00Z'}).status,'missed');
 assert.equal(summarizeTaskHealth(task,null,{now:'2026-11-07T04:19:00Z'}).status,'due_soon');
});
test('a last successful run for prior slot is not current successful run',()=>{
 const task=base('video-scout-hourly','17 * * * *');
 const prior={state:'succeeded',slot_utc:'2026-11-07T03:17:00Z'};
 assert.equal(summarizeTaskHealth(task,prior,{now:'2026-11-07T04:30:00Z'}).status,'missed');
 assert.equal(summarizeTaskHealth(task,{...prior,slot_utc:'2026-11-07T04:17:00Z'},{now:'2026-11-07T04:30:00Z'}).status,'verified');
});
test('enabled after expected slot avoids false missed alert',()=>{
 const task=base('video-classifier-batch','17 */4 * * *','2026-11-07T04:25:00Z');
 assert.equal(summarizeTaskHealth(task,null,{now:'2026-11-07T04:30:00Z'}).status,'awaiting_first_slot');
});
test('failed and paused are distinct, error evidence survives',()=>{
 const task=base('video-classifier-batch','17 */4 * * *');
 const row={state:'quota_paused',slot_utc:'2026-11-07T04:17:00Z',error_code:'KEY_UNAVAILABLE',result_json:{classified:0}};
 const status=summarizeTaskHealth(task,row,{now:'2026-11-07T04:28:00Z'});
 assert.equal(status.status,'quota_paused');assert.equal(status.errorCode,'KEY_UNAVAILABLE');
 assert.equal(summarizeTaskHealth({...task,enabled:false},row,{now:'2026-11-07T04:28:00Z'}).status,'paused');
});
test('unknown schedule is never represented as healthy or missed',()=>{
 const task=base('video-scout-hourly','* * * * *');
 assert.equal(summarizeTaskHealth(task,null,{now:'2026-11-07T04:28:00Z'}).status,'unknown');
});

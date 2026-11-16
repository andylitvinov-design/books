/** Owner-only telemetry: "enabled" is not evidence a task actually ran. No I/O. */
const HOUR=3600000,DAY=86400000,WEEK=7*DAY;
const MINUTE=60000;
const CRONS=Object.freeze({
 'video-scout-hourly':{spec:'17 * * * *',anchor:17*MINUTE,period:HOUR},
 'video-classifier-batch':{spec:'17 */4 * * *',anchor:17*MINUTE,period:4*HOUR},
 'video-scout-digest-daily':{spec:'17 15 * * *',anchor:15*HOUR+17*MINUTE,period:DAY},
 'council-video-review-weekly':{spec:'17 7 * * 1',anchor:4*DAY+7*HOUR+17*MINUTE,period:WEEK},
});
const ms=v=>{const n=+new Date(v);return Number.isFinite(n)?n:null;};
export function expectedTaskSlot(task,now=new Date()){
 const definition=CRONS[task?.task_id];
 const t=ms(now);
 if(t===null||!definition||task.schedule_cron!==definition.spec)return null;
 const occurrence=Math.floor((t-definition.anchor)/definition.period);
 return new Date(definition.anchor+occurrence*definition.period).toISOString();
}
export function summarizeTaskHealth(task,latestRun,{now=new Date(),graceMs=5*MINUTE}={}){
 if(!task||typeof task.task_id!=='string'||typeof task.enabled!=='boolean')return {status:'unknown',lastStatus:null,dueSlot:null};
 const dueSlot=expectedTaskSlot(task,now),nowMs=ms(now),updatedMs=ms(task.updated_at);
 if(dueSlot===null||nowMs===null||updatedMs===null||!Number.isInteger(graceMs)||graceMs<0||graceMs>15*MINUTE)
   return {status:'unknown',lastStatus:null,dueSlot};
 const latestStatus=typeof latestRun?.state==='string'?latestRun.state:null;
 const latestDate=ms(latestRun?.slot_utc);
 const dueMs=ms(dueSlot);
 const current=latestDate===dueMs;
 let status;
 if(!task.enabled)status='paused';
 else if(updatedMs>dueMs)status='awaiting_first_slot';
 else if(current)status=latestStatus==='running'?'running':
   latestStatus==='succeeded'?'verified':
   latestStatus==='no_change'?'no_change':
   latestStatus==='partial'?'partial':
   latestStatus==='quota_paused'?'quota_paused':
   ['failed','expired'].includes(latestStatus)?'failed':'unknown';
 else if(nowMs-dueMs<graceMs)status='due_soon';
 else status='missed';
 return {status,lastStatus:latestStatus,dueSlot,lastSlot:latestDate===null?null:new Date(latestDate).toISOString(),
   errorCode:typeof latestRun?.error_code==='string'?latestRun.error_code:null,
   result:latestRun?.result_json&&typeof latestRun.result_json==='object'?{
    classified:Number.isSafeInteger(latestRun.result_json.classified)?latestRun.result_json.classified:null,
    delivery:typeof latestRun.result_json.delivery==='string'?latestRun.result_json.delivery:null,
    proposal:typeof latestRun.result_json.proposalId==='string'?true:false,
   }:null};
}

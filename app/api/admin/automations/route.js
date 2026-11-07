import {ownerMaterialRequest} from '@/lib/clients/material-library-http';
import {privateJson} from '@/lib/clients/delivery-http';
import {transaction,consumeRate,closeDatabase} from '@/lib/app/database';
import {readAutomationSnapshot,changeScoutTaskState} from '@/lib/automations/scout-db.mjs';
import {runHourlyVideoScout} from '@/lib/automations/scout-runner';
import {SCOUT_TASK_ID} from '@/lib/automations/video-scout.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const maxDuration=90;

export async function GET(request){
  try{return await ownerMaterialRequest(request,async({config})=>{
    if(new URL(request.url).search)return privateJson({error:'INVALID_QUERY'},400);
    const snapshot=await transaction(config,null,
      db=>readAutomationSnapshot(db),{server:true});
    return privateJson(snapshot);
  });}finally{await closeDatabase();}
}

export async function POST(request){
  try{return await ownerMaterialRequest(request,async({config,data})=>{
    if(!data||data.taskId!==SCOUT_TASK_ID||
      Object.keys(data).some(k=>!['taskId','action','requestId'].includes(k))||
      !['pause','resume','run_now'].includes(data.action)||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(data.requestId||''))
      return privateJson({error:'INVALID_CONTROL'},400);
    await consumeRate(config,'owner-video-scout-automation',5,60);
    if(data.action==='run_now'){
      // Inherits identical slot lock, policy, source budget and durable receipts.
      return privateJson(await runHourlyVideoScout({config,actor:'owner'}));
    }
    const result=await transaction(config,null,
      db=>changeScoutTaskState(db,{enabled:data.action==='resume',operationId:data.requestId}),
      {server:true});
    return privateJson(result);
  },{body:true});}finally{await closeDatabase();}
}

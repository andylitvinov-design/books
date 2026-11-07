import {ownerMaterialRequest} from '@/lib/clients/material-library-http';
import {privateJson} from '@/lib/clients/delivery-http';
import {transaction,consumeRate,closeDatabase} from '@/lib/app/database';
import {readAutomationSnapshot,changeScoutTaskState} from '@/lib/automations/scout-db.mjs';
import {parseCandidatePage} from '@/lib/automations/candidate-pagination.mjs';
import {runHourlyVideoScout} from '@/lib/automations/scout-runner';
import {SCOUT_TASK_ID} from '@/lib/automations/video-scout.mjs';
import {CLASSIFIER_TASK_ID} from '@/lib/automations/free-classifier.mjs';
import {runFourHourlyClassification} from '@/lib/automations/classifier-runner';
import {changeClassifierTaskState} from '@/lib/automations/classifier-store.mjs';
import {COUNCIL_TASK_ID} from '@/lib/automations/weekly-council.mjs';
import {runWeeklyCouncilPlanner} from '@/lib/automations/weekly-council-runner';
import {changeCouncilTaskState,reviewCouncilProposal} from '@/lib/automations/weekly-council-store.mjs';
import {VIDEO_DIGEST_TASK_ID} from '@/lib/automations/daily-video-digest.mjs';
import {changeDailyDigestState} from '@/lib/automations/daily-video-digest-store.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const maxDuration=90;

export async function GET(request){
  try{return await ownerMaterialRequest(request,async({config})=>{
    const query=new URL(request.url).searchParams;
    if([...query.keys()].some(key=>key!=='page')||query.getAll('page').length>1)
      return privateJson({error:'INVALID_QUERY'},400);
    const candidatePage=parseCandidatePage(query.get('page'));
    if(candidatePage===null)return privateJson({error:'INVALID_QUERY'},400);
    const snapshot=await transaction(config,null,
      db=>readAutomationSnapshot(db,{candidatePage}),{server:true});
    return privateJson(snapshot);
  });}finally{await closeDatabase();}
}

export async function POST(request){
  try{return await ownerMaterialRequest(request,async({config,data})=>{
    if(!data)return privateJson({error:'INVALID_CONTROL'},400);
    if(data.taskId===COUNCIL_TASK_ID&&['accept_proposal','reject_proposal'].includes(data.action)){
      if(Object.keys(data).some(k=>!['taskId','action','requestId','proposalId'].includes(k)))
        return privateJson({error:'INVALID_CONTROL'},400);
      await consumeRate(config,'owner-council-decision',5,60);
      const decision=data.action==='accept_proposal'?'accept':'reject';
      const reviewed=await transaction(config,null,db=>reviewCouncilProposal(db,{
        proposalId:data.proposalId,requestId:data.requestId,decision}),{server:true});
      return privateJson(reviewed);
    }
    if(![SCOUT_TASK_ID,CLASSIFIER_TASK_ID,COUNCIL_TASK_ID,VIDEO_DIGEST_TASK_ID].includes(data.taskId)||
      Object.keys(data).some(k=>!['taskId','action','requestId'].includes(k))||
      !['pause','resume','run_now'].includes(data.action)||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(data.requestId||''))
      return privateJson({error:'INVALID_CONTROL'},400);
    await consumeRate(config,'owner-video-scout-automation',5,60);
    if(data.taskId===CLASSIFIER_TASK_ID && data.action==='resume' &&
      process.env.HH_VIDEO_CLASSIFIER_ENABLED!=='true')
      return privateJson({error:'FREE_MODEL_ROUTE_DISABLED'},409);
    if(data.taskId===COUNCIL_TASK_ID && data.action==='resume' &&
      process.env.HH_AUTOMATION_COUNCIL_ENABLED!=='true')
      return privateJson({error:'COUNCIL_FREE_ROUTE_DISABLED'},409);
    if(data.taskId===VIDEO_DIGEST_TASK_ID && data.action==='resume' &&
      process.env.HH_VIDEO_SCOUT_DIGEST_ENABLED!=='true')
      return privateJson({error:'OWNER_DIGEST_ROUTE_DISABLED'},409);
    if(data.taskId===VIDEO_DIGEST_TASK_ID && data.action==='run_now')
      return privateJson({error:'DIGEST_SCHEDULE_ONLY'},409);
    if(data.action==='run_now'){
      // Inherits identical slot lock, policy, source budget and durable receipts.
      return privateJson(data.taskId===SCOUT_TASK_ID?
        await runHourlyVideoScout({config,actor:'owner'}):
        data.taskId===CLASSIFIER_TASK_ID?await runFourHourlyClassification({config}):
        await runWeeklyCouncilPlanner({config}));
    }
    const result=await transaction(config,null,
      db=>(data.taskId===SCOUT_TASK_ID?changeScoutTaskState:
        data.taskId===CLASSIFIER_TASK_ID?changeClassifierTaskState:
        data.taskId===COUNCIL_TASK_ID?changeCouncilTaskState:changeDailyDigestState)
        (db,{enabled:data.action==='resume',operationId:data.requestId}),
      {server:true});
    return privateJson(result);
  },{body:true});}finally{await closeDatabase();}
}

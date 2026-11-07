import {ownerMaterialRequest} from '@/lib/clients/material-library-http';
import {privateJson} from '@/lib/clients/delivery-http';
import {transaction,consumeRate,closeDatabase} from '@/lib/app/database';
import {readCommandSnapshot,createObjective,createProject,createTask,
  setCommandEnabled,changeTaskState} from '@/lib/command-center/store.mjs';
import {sanitizeObjective,sanitizeProject,sanitizeTask,ccUuid} from '@/lib/command-center/contracts.mjs';
import {executeOneCommandTask} from '@/lib/command-center/dispatcher.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const maxDuration=30;

export async function GET(request){
  try{return await ownerMaterialRequest(request,async({config})=>{
    if(new URL(request.url).search)return privateJson({error:'INVALID_QUERY'},400);
    return privateJson(await transaction(config,null,db=>readCommandSnapshot(db),{server:true}));
  });}finally{await closeDatabase();}
}
const keysFor={
  create_objective:['action','requestId','title','summary'],
  create_project:['action','requestId','title','summary','objectiveId'],
  create_task:['action','requestId','title','description','kind','priority','projectId','sourceRef'],
  pause_all:['action','requestId'],resume_safe:['action','requestId'],
  task_pause:['action','requestId','taskId'],task_ready:['action','requestId','taskId'],
  task_cancel:['action','requestId','taskId'],run_now:['action','requestId']
};
export async function POST(request){
  const requestOrigin=request.headers.get('origin');
  if(!requestOrigin||requestOrigin!==new URL(request.url).origin)
    return privateJson({error:'CROSS_ORIGIN_DENIED'},403);
  try{return await ownerMaterialRequest(request,async({config,data})=>{
    if(!data||!ccUuid(data.requestId)||!Object.hasOwn(keysFor,data.action)||
      Object.keys(data).some(k=>!keysFor[data.action].includes(k)))
      return privateJson({error:'INVALID_CONTROL'},400);
    await consumeRate(config,'owner-command-center-actions',8,60);
    let result;
    if(data.action==='create_objective'){
      const input=sanitizeObjective(data);
      if(!input)return privateJson({error:'INVALID_OBJECTIVE'},400);
      result=await transaction(config,null,db=>createObjective(db,input,data.requestId),{server:true});
    }else if(data.action==='create_project'){
      const input=sanitizeProject(data);
      if(!input)return privateJson({error:'INVALID_PROJECT'},400);
      result=await transaction(config,null,db=>createProject(db,input,data.requestId),{server:true});
    }else if(data.action==='create_task'){
      const input=sanitizeTask(data);
      if(!input)return privateJson({error:'INVALID_TASK'},400);
      result=await transaction(config,null,db=>createTask(db,input,data.requestId),{server:true});
    }else if(data.action==='pause_all'||data.action==='resume_safe'){
      const enabled=data.action==='resume_safe';
      if(enabled&&(process.env.VERCEL_ENV!=='production'||process.env.HH_CC_TICK_ENABLED!=='true'))
        return privateJson({error:'RUNTIME_NOT_APPROVED'},409);
      result=await transaction(config,null,db=>setCommandEnabled(db,enabled,data.requestId),{server:true});
    }else if(data.action==='run_now'){
      if(process.env.VERCEL_ENV!=='production'||process.env.HH_CC_TICK_ENABLED!=='true')
        return privateJson({error:'RUNTIME_NOT_APPROVED'},409);
      result=await executeOneCommandTask({config,transaction});
    }else{
      if(!ccUuid(data.taskId))return privateJson({error:'INVALID_TASK_ID'},400);
      const to=data.action==='task_pause'?'paused':data.action==='task_cancel'?'canceled':'ready';
      result=await transaction(config,null,db=>changeTaskState(db,{taskId:data.taskId,to,
        requestId:data.requestId}),{server:true});
    }
    return privateJson(result);
  },{body:true});}finally{await closeDatabase();}
}

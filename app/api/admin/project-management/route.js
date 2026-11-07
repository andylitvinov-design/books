import {ownerMaterialRequest} from '@/lib/clients/material-library-http';
import {privateJson} from '@/lib/clients/delivery-http';
import {transaction,consumeRate,closeDatabase} from '@/lib/app/database';
import {uuid,sanitizeEpic,sanitizePRLink} from '@/lib/project-management/plans.mjs';
import {readProjectManagement,createEpic,proposeEpicOptions,selectEpicOption,linkTaskPR,pmTaskSource} from '@/lib/project-management/store.mjs';
import {inspectCommandTaskDelivery} from '@/lib/command-center/release-proof.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const maxDuration=30;
const actions={
 create_epic:['action','requestId','projectId','title','problem','outcome','priority'],
 propose_options:['action','requestId','epicId'],
 select_option:['action','requestId','epicId','optionId'],
 link_pr:['action','requestId','taskId','prUrl'],
 inspect_pr:['action','requestId','taskId']
};
const isPlainObject=value=>value&&typeof value==='object'&&!Array.isArray(value);

export async function GET(request){
 try{return await ownerMaterialRequest(request,async({config})=>{
  if(new URL(request.url).search)return privateJson({error:'INVALID_QUERY'},400);
  return privateJson(await transaction(config,null,db=>readProjectManagement(db),{server:true}));
 });}finally{await closeDatabase();}
}
export async function POST(request){
 // Browser writes must be same origin; owner session is checked separately.
 const origin=request.headers.get('origin');
 if(!origin||origin!==new URL(request.url).origin)return privateJson({error:'CROSS_ORIGIN_DENIED'},403);
 try{return await ownerMaterialRequest(request,async({config,data})=>{
  if(!isPlainObject(data)||!uuid(data.requestId)||!Object.hasOwn(actions,data.action)||
   Object.keys(data).some(key=>!actions[data.action].includes(key)))return privateJson({error:'INVALID_CONTROL'},400);
  await consumeRate(config,'owner-project-management-v1',8,60);
  let result;
  if(data.action==='create_epic'){
   const epic=sanitizeEpic(data);
   if(!epic)return privateJson({error:'INVALID_EPIC'},400);
   result=await transaction(config,null,db=>createEpic(db,epic,data.requestId),{server:true});
  }else if(data.action==='propose_options'){
   if(!uuid(data.epicId))return privateJson({error:'INVALID_EPIC_ID'},400);
   result=await transaction(config,null,db=>proposeEpicOptions(db,data.epicId,data.requestId),{server:true});
  }else if(data.action==='select_option'){
   if(!uuid(data.epicId)||!uuid(data.optionId))return privateJson({error:'INVALID_OPTION_ID'},400);
   result=await transaction(config,null,db=>selectEpicOption(db,data.epicId,data.optionId,data.requestId),{server:true});
  }else if(data.action==='link_pr'){
   const pr=sanitizePRLink(data.prUrl);
   if(!uuid(data.taskId)||!pr)return privateJson({error:'INVALID_PR_LINK'},400);
   result=await transaction(config,null,db=>linkTaskPR(db,data.taskId,pr,data.requestId),{server:true});
  }else if(data.action==='inspect_pr'){
   if(!uuid(data.taskId))return privateJson({error:'INVALID_TASK_ID'},400);
   const source=await transaction(config,null,db=>pmTaskSource(db,data.taskId),{server:true});
   if(!source)return privateJson({error:'PR_NOT_LINKED'},404);
   result=await inspectCommandTaskDelivery(source);
   // This is read-only. Exact-current-HEAD + served SHA are not functional LIVE.
  }
  return privateJson(result?.error?result:result||{error:'UNKNOWN_RESULT'},result?.error?409:200);
 },{body:true});}finally{await closeDatabase();}
}
import {NextResponse} from 'next/server';
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config';
import {createRequestAuth} from '@/lib/app/session';
import {operationHash} from '@/lib/app/crypto';
import {consumeRate} from '@/lib/app/database';
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http';
import {AppError} from '@/lib/assessments/contracts';
import {
 readOwnChatHistory,setOwnChatHistoryConsent,appendOwnChatHistory,eraseOwnChatHistory,
} from '@/lib/holistic-support/agent-chat-history-store';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
async function endpoint(request){
 let auth;
 try{
  // A provider/feature kill switch must NOT lock users out of erasing earlier
  // saved data. Reads, explicit opt-out and DELETE remain account-protected.
  const historyEnabled=process.env.HH_AGENT_CHAT_HISTORY_ENABLED==='true';
  const config=getAppConfig();
  if(request.method==='GET')requestOrigin(request,config);
  else requireSameOrigin(request,config);
  auth=createRequestAuth(request,config);
  const actor=await auth.verified();
  const ownerBinding=operationHash({op:'agent-chat-history-owner-v1',accountId:actor.id},config);
  let result;
  if(request.method==='GET'){
   result={...await readOwnChatHistory(config,actor),ownerBinding};
  }else{
   await consumeRate(config,{op:'agent-chat-history-mutation',actorId:actor.id},30,60);
   if(request.headers.get('x-hh-chat-owner')!==ownerBinding)
    throw new AppError('CHAT_HISTORY_ACCOUNT_CHANGED',409);
   if(request.method==='DELETE'){
    result=await eraseOwnChatHistory(config,actor);
   }else if(request.method==='POST'){
    const body=await readBody(request,30000);
    if(!body||Object.keys(body).some(key=>!['action','accepted','turnId','user','assistant'].includes(key)))
     throw new AppError('INVALID_CHAT_HISTORY_REQUEST',400);
    if(body.action==='consent'&&Object.keys(body).every(key=>['action','accepted'].includes(key))){
     if(body.accepted!==false&&!historyEnabled)
      throw new AppError('CHAT_HISTORY_UNAVAILABLE',503);
     result=await setOwnChatHistoryConsent(config,actor,body.accepted);
    } else if(body.action==='append'&&Object.keys(body).every(key=>['action','turnId','user','assistant'].includes(key))){
     if(!historyEnabled)throw new AppError('CHAT_HISTORY_UNAVAILABLE',503);
     result=await appendOwnChatHistory(config,actor,body.turnId,body.user,body.assistant);
    }
    else throw new AppError('INVALID_CHAT_HISTORY_REQUEST',400);
   }else throw new AppError('METHOD_NOT_ALLOWED',405);
  }
  return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}));
 }catch(error){
  const safe=safeError(error);
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS});
  return auth?auth.apply(response):response;
 }
}
export const GET=endpoint;
export const POST=endpoint;
export const DELETE=endpoint;

import {NextResponse} from 'next/server';
import {AppError} from '@/lib/assessments/contracts';
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config';
import {createRequestAuth} from '@/lib/app/session';
import {consumeRate} from '@/lib/app/database';
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http';
import {createVideoPaidOrderService} from '@/lib/mandala/video-paid-orders';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
async function handle(request,write){
 let auth;
 try{
  const config=getAppConfig();
  if(write)requireSameOrigin(request,config);else requestOrigin(request,config);
  auth=createRequestAuth(request,config);
  const actor=await auth.verified();
  if(request.headers.has('x-hh-account-id')&&request.headers.get('x-hh-account-id')!==actor.id)
   throw new AppError('ACCOUNT_CHANGED',409);
  await consumeRate(config,{op:write?'video-paid-create':'video-paid-list',id:actor.id},write?5:60,3600);
  const service=createVideoPaidOrderService(config);
  const result=write?await service.request(actor,await readBody(request,1024)):await service.list(actor);
  return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}));
 }catch(e){
  const safe=safeError(e);
  const res=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS});
  return auth?auth.apply(res):res;
 }
}
export async function GET(request){return handle(request,false)}
export async function POST(request){return handle(request,true)}

import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {AppError} from '@/lib/assessments/contracts';
import {getAppConfig,requireSameOrigin} from '@/lib/app/config';
import {createRequestAuth} from '@/lib/app/session';
import {createAppRepository} from '@/lib/app/repository';
import {consumeRate} from '@/lib/app/database';
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http';
import {accessStatus,accessRequestPatch,requestKey,eligibilityKey} from '@/lib/holistic-support/wave-gemini-access.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
async function handle(request,mutate){
 let auth;
 try{
  const config=getAppConfig();
  if(mutate)requireSameOrigin(request,config);
  auth=createRequestAuth(request,config);
  const actor=await auth.verified();
  await createAppRepository(config).ensureAccount(actor);
  await consumeRate(config,{op:'wave-gemini-access',actorId:actor.id},12,60);
  if(!config.secretKey)throw new AppError('SERVICE_UNAVAILABLE',503);
  const admin=createClient(config.supabaseUrl,config.secretKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}).auth.admin;
  const read=async()=>{
   const {data,error}=await admin.getUserById(actor.id);
   if(error||data?.user?.id!==actor.id||data.user.is_anonymous===true||!data.user.email_confirmed_at)throw new AppError('ACCESS_DENIED',403);
   return data.user.app_metadata||{};
  };
  let meta=await read();
  if(mutate){
   const body=await readBody(request,1024);
   const patch=accessRequestPatch(body);
   if(!patch)throw new AppError('INVALID_AGENT_INPUT',400);
   if(body.action==='request'&&accessStatus(meta)==='eligible')return auth.apply(NextResponse.json({status:'eligible'},{headers:PRIVATE_HEADERS}));
   const {error}=await admin.updateUserById(actor.id,{app_metadata:patch});
   if(error)throw new AppError('SERVICE_UNAVAILABLE',503);
   meta=await read();
   if(meta[requestKey]?.status!==patch[requestKey].status||body.action==='revoke'&&meta[eligibilityKey]?.publicGeminiConsent!==false)throw new AppError('CONFLICT',409);
  }
  return auth.apply(NextResponse.json({status:accessStatus(meta)},{headers:PRIVATE_HEADERS}));
 }catch(error){
  const e=safeError(error),response=NextResponse.json({error:e.code},{status:e.status,headers:PRIVATE_HEADERS});
  return auth?auth.apply(response):response;
 }
}
export async function GET(request){return handle(request,false);}
export async function POST(request){return handle(request,true);}

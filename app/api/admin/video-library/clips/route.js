import {requireAdminRequest} from '@/lib/prescriptions/admin';
import {getAppConfig,requireSameOrigin} from '@/lib/app/config';
import {
 listOwnerVideoLibrary,prepareOwnerVideoLibrary,completeOwnerVideoLibrary,
 previewOwnerVideoLibrary,reviewOwnerVideoLibrary,removeOwnerVideoLibrary
} from '@/lib/video-library/owner-video-server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0',
 'X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow, noarchive'};
const respond=(obj,status=200)=>Response.json(obj,{status,headers});
const only=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).every(k=>keys.includes(k));
export async function GET(){
 if(!await requireAdminRequest())return respond({error:'NOT_FOUND'},404);
 try{return respond(await listOwnerVideoLibrary(getAppConfig()))}
 catch{return respond({error:'VIDEO_LIBRARY_UNAVAILABLE'},503)}
}
export async function POST(request){
 if(!await requireAdminRequest())return respond({error:'NOT_FOUND'},404);
 let body,config;
 try{
  config=getAppConfig();requireSameOrigin(request,config);
  if(!request.headers.get('content-type')?.startsWith('application/json'))
   return respond({error:'INVALID_REQUEST'},415);
  const text=await request.text();
  if(text.length>1900)return respond({error:'INVALID_REQUEST'},413);
  body=JSON.parse(text);
 }catch{return respond({error:'INVALID_REQUEST'},400)}
 try{
  if(body.action==='prepare'&&only(body,['action','filename','mime','bytes','title','category','tags']))
   return respond({intent:await prepareOwnerVideoLibrary(config,body)},201);
  if(body.action==='complete'&&only(body,['action','assetId']))
   return respond(await completeOwnerVideoLibrary(config,body));
  if(body.action==='preview'&&only(body,['action','assetId']))
   return respond(await previewOwnerVideoLibrary(config,body));
  if(body.action==='review'&&only(body,['action','assetId','qualityScore','rightsConfirmed','peopleCleared','sourceType','sourcePage']))
   return respond(await reviewOwnerVideoLibrary(config,body));
  if(body.action==='remove'&&only(body,['action','assetId','confirmed']))
   return respond(await removeOwnerVideoLibrary(config,body));
  return respond({error:'INVALID_REQUEST'},400);
 }catch(error){
  const code=typeof error?.code==='string'?error.code:'VIDEO_LIBRARY_UNAVAILABLE';
  const status=Number.isInteger(error?.status)&&error.status>=400&&error.status<=503?error.status:503;
  return respond({error:code},status);
 }
}

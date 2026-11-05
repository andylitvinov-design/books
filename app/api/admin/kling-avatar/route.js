import {NextResponse} from 'next/server';
import {requireAdminRequest} from '@/lib/prescriptions/admin';
import {KLING_AVATAR_LIMITS, KlingAvatarInputError, submitKlingAvatar, queryKlingAvatar} from '@/lib/kling-avatar.mjs';
import {checkKlingAccount} from '@/lib/kling-video.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=45;
const HEADERS={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'};
function json(body,status=200){return NextResponse.json(body,{status,headers:HEADERS});}
function errorCode(e){return e instanceof KlingAvatarInputError?'validation'
  :e?.message==='not_configured'?'not_configured':'provider_unavailable';}
function config(){return {
  key:process.env.KLING_API_KEY||'',
  // An extra, dedicated owner-likeness safety switch. Scene generation alone never enables this.
  enabled:process.env.HH_KLING_PAID_GENERATION_ENABLED==='true' &&
    process.env.HH_KLING_AVATAR_PAID_ENABLED==='true',
};}
function sameOrigin(request){
  try {return request.headers.get('origin')===new URL(request.url).origin;}catch{return false;}
}
export async function POST(request){
  if(!await requireAdminRequest())return json({ok:false,error:'unauthorized'},401);
  if(!sameOrigin(request))return json({ok:false,error:'origin'},403);
  const settings=config();
  if(!settings.enabled)return json({ok:false,error:'disabled'},503);
  if(!settings.key)return json({ok:false,error:'not_configured'},503);
  const size=Number(request.headers.get('content-length'));
  if(Number.isFinite(size) && size>KLING_AVATAR_LIMITS.totalBytes+200000)
    return json({ok:false,error:'validation'},413);
  let id=null;
  try{
    const contentType=request.headers.get('content-type')||'';
    if(!contentType.startsWith('multipart/form-data;'))return json({ok:false,error:'validation'},415);
    const input=await request.formData();
    id=input.get('externalTaskId');
    const photo=input.get('image'),audio=input.get('audio');
    if(input.get('paidApproved')!=='true' || input.get('identityApproved')!=='true' ||
       input.get('privacyApproved')!=='true')return json({ok:false,error:'approval'},400);
    if(!(photo instanceof File) || !(audio instanceof File) ||
       photo.size<60 || photo.size>KLING_AVATAR_LIMITS.imageBytes ||
       audio.size<48 || audio.size>KLING_AVATAR_LIMITS.audioBytes ||
       photo.size+audio.size>KLING_AVATAR_LIMITS.totalBytes)return json({ok:false,error:'validation'},400);
    const imageBytes=new Uint8Array(await photo.arrayBuffer());
    const audioBytes=new Uint8Array(await audio.arrayBuffer());
    const result=await submitKlingAvatar({
      imageBytes,imageMime:photo.type,audioBytes,audioMime:audio.type,
      prompt:input.get('prompt'),externalTaskId:id,
    },{apiKey:settings.key});
    return json({ok:true,result});
  }catch(error){
    // Provider timeouts may mean a paid render was accepted. Never retry automatically.
    return json({ok:false,error:errorCode(error),
      externalTaskId:typeof id==='string' && /^hh_avatar_[a-f0-9]{32}$/.test(id)?id:null},400);
  }
}
export async function GET(request){
  if(!await requireAdminRequest())return json({ok:false,error:'unauthorized'},401);
  const settings=config();
  if(!settings.key)return json({ok:false,error:'not_configured'},503);
  try{
    const params=new URL(request.url).searchParams;
    if(params.get('mode')==='connection') {
      // Admin-only GET to Kling account usage. Not a generate call and needs no paid flag.
      return json({ok:true,result:await checkKlingAccount({apiKey:settings.key})});
    }
    const taskId=params.get('taskId');
    return json({ok:true,result:await queryKlingAvatar(taskId,{apiKey:settings.key})});
  }catch(error){return json({ok:false,error:errorCode(error)},400);}
}

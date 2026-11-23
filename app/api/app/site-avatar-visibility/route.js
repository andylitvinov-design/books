import {NextResponse} from 'next/server';
import {AppError} from '@/lib/assessments/contracts';
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config';
import {createRequestAuth} from '@/lib/app/session';
import {transaction,consumeRate} from '@/lib/app/database';
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http';
import {practitionerEmailAllowed} from '@/lib/app/practitioner-access';
import {isSiteOwnerAvatarId} from '@/lib/coaching/site-owner-avatar-presets.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
async function context(request,write=false){
  const config=getAppConfig();
  if(write)requireSameOrigin(request,config);else requestOrigin(request,config);
  const auth=createRequestAuth(request,config);
  const actor=await auth.verified();
  if(!practitionerEmailAllowed(actor))throw new AppError('OWNER_REQUIRED',403);
  await consumeRate(config,{op:write?'site-avatar-hide':'site-avatar-list',accountId:actor.id},write?20:90,60);
  return {config,auth,actor};
}
function fail(error,auth){
  const safe=safeError(error);
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS});
  return auth?auth.apply(response):response;
}
export async function GET(request){
  let auth;
  try{
    const ctx=await context(request);auth=ctx.auth;
    const hiddenIds=await transaction(ctx.config,ctx.actor,async db=>
      (await db.query('select preset_id from app_private.site_avatar_hidden_v1 where account_id=$1',
      [ctx.actor.id])).rows.map(row=>row.preset_id).filter(isSiteOwnerAvatarId));
    return auth.apply(NextResponse.json({hiddenIds},{headers:PRIVATE_HEADERS}));
  }catch(error){return fail(error,auth);}
}
export async function POST(request){
  let auth;
  try{
    const ctx=await context(request,true);auth=ctx.auth;
    const input=await readBody(request,512);
    if(!input||typeof input!=='object'||Array.isArray(input)||
      Object.keys(input).sort().join(',')!=='action,id'||
      !isSiteOwnerAvatarId(input.id)||!['hide','restore'].includes(input.action))
      throw new AppError('INVALID_AVATAR_VISIBILITY',400);
    await transaction(ctx.config,ctx.actor,async db=>{
      if(input.action==='hide')await db.query(
        'insert into app_private.site_avatar_hidden_v1(account_id,preset_id) values($1,$2) on conflict do nothing',
        [ctx.actor.id,input.id]);
      else await db.query(
        'delete from app_private.site_avatar_hidden_v1 where account_id=$1 and preset_id=$2',
        [ctx.actor.id,input.id]);
    });
    return auth.apply(NextResponse.json({ok:true,hidden:input.action==='hide'},{headers:PRIVATE_HEADERS}));
  }catch(error){return fail(error,auth);}
}

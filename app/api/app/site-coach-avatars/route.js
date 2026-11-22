import {NextResponse} from 'next/server'
import {AppError} from '@/lib/assessments/contracts'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {transaction,consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {practitionerEmailAllowed} from '@/lib/app/practitioner-access'
import {SITE_COACH_AVATAR_CATALOG,isSiteCoachAvatarId} from '@/lib/app/site-coach-avatar-catalog.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

async function handle(request,action='list'){
  let auth
  try{
    const config=getAppConfig()
    if(action==='list')requestOrigin(request,config)
    else requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.has('x-hh-account-id')&&
      request.headers.get('x-hh-account-id')!==actor.id)
      throw new AppError('ACCOUNT_CHANGED',403)
    // These licensed site-owned coach clips are a special collection
    // in the practitioner's own Cabinet, not a client file gallery.
    if(!practitionerEmailAllowed(actor))throw new AppError('ACCESS_DENIED',403)
    let id
    if(action!=='list'){
      const input=await readBody(request,512)
      if(Object.keys(input).length!==1||!isSiteCoachAvatarId(input.id))
        throw new AppError('INVALID_AVATAR',400)
      id=input.id
      await consumeRate(config,{op:'site-coach-avatar-hide',accountId:actor.id},30,3600)
    }else{
      await consumeRate(config,{op:'site-coach-avatar-list',accountId:actor.id},60,60)
    }
    const data=await transaction(config,actor,async db=>{
      if(action==='hide'){
        await db.query(
          'insert into app_private.site_coach_avatar_hidden(account_id,avatar_id) values($1,$2) on conflict do nothing',
          [actor.id,id])
        return {removedFromCabinet:true}
      }
      if(action==='restore'){
        await db.query(
          'delete from app_private.site_coach_avatar_hidden where account_id=$1 and avatar_id=$2',
          [actor.id,id])
        return {restored:true}
      }
      const {rows}=await db.query(
        'select avatar_id from app_private.site_coach_avatar_hidden where account_id=$1',
        [actor.id])
      return {avatars:SITE_COACH_AVATAR_CATALOG,hiddenIds:rows.map(row=>row.avatar_id)}
    })
    // Hiding a shared preset never deletes a public site asset or affects
    // another account. Real user uploads have separate private DELETE APIs.
    return auth.apply(NextResponse.json(data,{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},
      {status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
export async function GET(request){return handle(request)}
export async function DELETE(request){return handle(request,'hide')}
export async function POST(request){return handle(request,'restore')}

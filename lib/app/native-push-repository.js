import 'server-only'
import {randomUUID,createHash} from 'node:crypto'
import {transaction} from './database.js'
import {seal,openSealed} from './crypto.js'
import {nativePushReady,nativeTokenValid} from './native-push-transport.js'
import {AppError,onlyKeys,requireUUID} from '../assessments/contracts.js'
const digest=(platform,token)=>createHash('sha256').update(platform+':'+token).digest('hex')
const context=(account,id)=>({accountId:account,recordId:id,field:'native.push.token'})
function invalid(){throw new AppError('INVALID_NATIVE_PUSH',400)}
export function createNativePushRepository(config,env=process.env){
  async function state(actor,platform){
    if(!['ios','android'].includes(platform))invalid()
    return transaction(config,actor,async db=>{
      const devices=(await db.query(
        'select id,platform,locale,consented_at from app_private.native_push_devices where account_id=$1 and message_alerts=true order by created_at desc limit 5',
        [actor.id])).rows
      return {platform,ready:nativePushReady(env,platform),
        enabled:devices.some(d=>d.platform===platform),
        deviceCount:devices.filter(d=>d.platform===platform).length}
    })
  }
  async function register(actor,body){
    onlyKeys(body,['platform','token','locale','environment','messageAlerts'])
    const {platform,token,locale,environment}=body
    if(!['ios','android'].includes(platform)||!nativeTokenValid(platform,token)||
      !['en','ru'].includes(locale)||!['sandbox','production'].includes(environment)||
      body.messageAlerts!==true)invalid()
    if(platform==='android'&&environment!=='production')invalid()
    if(!nativePushReady(env,platform))throw new AppError('NATIVE_PUSH_NOT_CONFIGURED',503)
    return transaction(config,actor,async db=>{
      const account=(await db.query('select status,onboarding_state from app.accounts where id=$1 for update',
        [actor.id])).rows[0]
      if(account?.status!=='active'||account.onboarding_state!=='active')
        throw new AppError('ACCOUNT_UNAVAILABLE',403)
      const hashed=digest(platform,token)
      const owned=(await db.query(
        'select id,environment,platform from app_private.native_push_devices where account_id=$1 and token_hash=$2',
        [actor.id,hashed])).rows[0]
      if(owned && (owned.platform!==platform||owned.environment!==environment))
        throw new AppError('NATIVE_PUSH_DEVICE_CONFLICT',409)
      const amount=Number((await db.query(
        'select count(*)::int as n from app_private.native_push_devices where account_id=$1',
        [actor.id])).rows[0]?.n||0)
      if(!owned&&amount>=5)throw new AppError('DEVICE_LIMIT',409)
      requireUUID(actor.claims?.session_id)
      const id=owned?.id||randomUUID()
      const ciphertext=seal({token},context(actor.id,id),config)
      const sql=[
        'insert into app_private.native_push_devices',
        '(id,account_id,session_id,platform,environment,token_hash,token_ciphertext,locale,message_alerts,consented_at)',
        'values($1,$2,$3,$4,$5,$6,$7,$8,true,now())',
        'on conflict(token_hash) do update set',
        'token_ciphertext=excluded.token_ciphertext,session_id=excluded.session_id,locale=excluded.locale,',
        'message_alerts=true,consented_at=now(),updated_at=now()',
        'where app_private.native_push_devices.account_id=excluded.account_id',
        'and app_private.native_push_devices.id=excluded.id',
        'and app_private.native_push_devices.platform=excluded.platform',
        'and app_private.native_push_devices.environment=excluded.environment',
        'returning id'
      ].join(' ')
      const saved=await db.query(sql,
        [id,actor.id,actor.claims.session_id,platform,environment,hashed,ciphertext,locale])
      if(!saved.rowCount)throw new AppError('NATIVE_PUSH_DEVICE_CONFLICT',409)
      return {registered:true,platform,ready:true,enabled:true}
    })
  }
  async function disable(actor){
    await transaction(config,actor,async db=>{
      await db.query('delete from app_private.native_push_devices where account_id=$1',[actor.id])
    })
    return {revoked:true}
  }
  return {state,register,disable}
}
export async function claimNativePushTargets(config,messageId){
  requireUUID(messageId)
  return transaction(config,null,async db=>{
    const claimed=(await db.query('select * from app_private.claim_native_private_message_push($1)',
      [messageId])).rows
    return claimed.map(row=>{
      const opened=openSealed(row.token_ciphertext,context(row.account_id,row.device_id),config)
      if(!nativeTokenValid(row.platform,opened?.token))
        throw new AppError('NATIVE_TOKEN_UNAVAILABLE',503)
      return {id:row.device_id,requestId:row.request_id,
        platform:row.platform,locale:row.locale,token:opened.token,environment:row.environment}
    })
  },{server:true})
}
export async function finishNativePush(config,messageId,deviceId,state,providerStatus){
  requireUUID(messageId);requireUUID(deviceId)
  return transaction(config,null,db=>db.query(
    'select app_private.finish_native_private_message_push($1,$2,$3,$4)',
    [messageId,deviceId,state,Number.isInteger(providerStatus)?providerStatus:null]
  ),{server:true})
}

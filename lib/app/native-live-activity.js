import 'server-only'
import {createHash,createPrivateKey,sign} from 'node:crypto'
import {connect as connectH2} from 'node:http2'
import {transaction} from './database.js'
import {AppError,onlyKeys,requireUUID} from '../assessments/contracts.js'
const hash=s=>createHash('sha256').update(s).digest('hex')
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url')
export function apnsConfig(env=process.env){
  const key=env.HH_APNS_PRIVATE_KEY?.replace(/\\n/g,'\n')
  const keyId=env.HH_APNS_KEY_ID,team=env.HH_APNS_TEAM_ID
  const environment=env.HH_APNS_ENV==='production'?'production':'sandbox'
  let ready=false
  if(/^[A-Z0-9]{10}$/.test(keyId||'')&&/^[A-Z0-9]{10}$/.test(team||'')&&
      typeof key==='string'&&key.includes('BEGIN PRIVATE KEY')) {
    try {ready=createPrivateKey(key).asymmetricKeyType==='ec'} catch{ready=false}
  }
  return {ready,keyId,team,key,environment,bundle:'app.psialchemy.mobile'}
}
function validToken(s){return typeof s==='string'&&/^[0-9a-f]{64}$/.test(s)}
function validActivity(s){return typeof s==='string'&&s.length>=8&&s.length<=160&&/^[A-Za-z0-9._:-]+$/.test(s)}
function invalid(){throw new AppError('INVALID_LIVE_ACTIVITY',400)}
export async function registerLiveActivity(config,actor,body,env=process.env){
  onlyKeys(body,['cycleId','activityId','pushToken','locale'])
  requireUUID(body.cycleId)
  if(!validActivity(body.activityId)||!validToken(body.pushToken)||!['en','ru'].includes(body.locale))invalid()
  if(!apnsConfig(env).ready)throw new AppError('LIVE_ACTIVITY_NOT_CONFIGURED',503)
  await transaction(config,actor,async db=>{
    const valid=(await db.query(`select c.id from app_private.growth_cycles c
      join app.accounts a on a.id=c.account_id
      where c.id=$1 and c.account_id=$2 and c.status='active'
        and a.status='active' and a.onboarding_state='active'
        and (now() at time zone c.time_zone)::date>=c.start_local_date
        and (now() at time zone c.time_zone)::date<c.start_local_date+c.duration_days`,
      [body.cycleId,actor.id])).rows[0]
    if(!valid)throw new AppError('LIVE_COURSE_REQUIRED',409)
    const result=await db.query(`insert into app_private.live_activity_tokens
      (account_id,cycle_id,activity_id,token_hash,push_token,locale)
      values($1,$2,$3,$4,$5,$6)
      on conflict(activity_id) do update set token_hash=excluded.token_hash,
       push_token=excluded.push_token,updated_at=now()
      where app_private.live_activity_tokens.account_id=excluded.account_id
        and app_private.live_activity_tokens.cycle_id=excluded.cycle_id
      returning id`,[actor.id,body.cycleId,body.activityId,hash(body.pushToken),
      body.pushToken,body.locale])
    if(!result.rowCount)throw new AppError('LIVE_ACTIVITY_OWNERSHIP',409)
  })
  return {registered:true}
}
export async function stopLiveActivity(config,actor,body){
  onlyKeys(body,['activityId'])
  if(body.activityId!==null&&!validActivity(body.activityId))invalid()
  await transaction(config,actor,db=>body.activityId===null
    ?db.query('delete from app_private.live_activity_tokens where account_id=$1',[actor.id])
    :db.query('delete from app_private.live_activity_tokens where account_id=$1 and activity_id=$2',[actor.id,body.activityId]))
  return {revoked:true}
}
function apnsJwt(cfg){
  const now=Math.floor(Date.now()/1000)
  const message=encode({alg:'ES256',kid:cfg.keyId})+'.'+encode({iss:cfg.team,iat:now})
  const sig=sign('sha256',Buffer.from(message),{key:createPrivateKey(cfg.key),dsaEncoding:'ieee-p1363'})
  return message+'.'+sig.toString('base64url')
}
export function sendLivePush(token,content,env=process.env){
  const cfg=apnsConfig(env)
  if(!cfg.ready||!validToken(token))return Promise.reject(new Error('APNS_NOT_CONFIGURED'))
  const host=cfg.environment==='production'?'https://api.push.apple.com':'https://api.sandbox.push.apple.com'
  const body=JSON.stringify({aps:{
    timestamp:Math.floor(Date.now()/1000),
    event:content.finished?'end':'update',
    'content-state':{day:content.day,completedToday:Boolean(content.completedToday),finished:Boolean(content.finished)},
    'stale-date':Math.floor(Date.now()/1000)+86400,
  }})
  return new Promise((resolve,reject)=>{
    const client=connectH2(host)
    let code=0,ended=false
    const settle=(error,value)=>{
      if(ended)return
      ended=true
      client.close()
      if(error)reject(error);else resolve(value)
    }
    client.setTimeout(6000,()=>settle(new Error('APNS_TIMEOUT')))
    client.on('error',settle)
    const stream=client.request({
      ':method':'POST',':path':'/3/device/'+token,
      authorization:'bearer '+apnsJwt(cfg),
      'apns-topic':cfg.bundle+'.push-type.liveactivity',
      'apns-push-type':'liveactivity','apns-priority':'10',
      'content-type':'application/json',
    })
    stream.on('response',h=>{code=Number(h[':status']||0)})
    stream.on('error',settle)
    stream.on('data',()=>{})
    stream.on('end',()=>settle(null,{accepted:code===200,expired:code===410||code===400,status:code}))
    stream.end(body)
  })
}
// Non-blocking follow-up to a persisted course action; the user's lesson save
// must never fail because Apple is unavailable.
export async function updateLiveActivities(config,actor,courseState,env=process.env){
  if(!apnsConfig(env).ready||!courseState?.cycle?.id)return {sent:0}
  const cycle=courseState.cycle
  const tokens=await transaction(config,actor,async db=>(
    await db.query('select id,push_token from app_private.live_activity_tokens where account_id=$1 and cycle_id=$2',
      [actor.id,cycle.id])).rows)
  const finished=cycle.status!=='active'||cycle.afterCycle
  const status={day:Math.max(1,Math.min(14,cycle.day)),
    completedToday:Boolean(courseState.currentSession),finished}
  let sent=0
  for(const device of tokens) {
    try {
      const response=await sendLivePush(device.push_token,status,env)
      if(response.accepted)sent++
      if(response.expired||finished)await transaction(config,actor,db=>db.query(
        'delete from app_private.live_activity_tokens where id=$1 and account_id=$2',
        [device.id,actor.id]))
    }catch{/* APNs delivery is best-effort; never expose tokens in logs. */}
  }
  return {sent}
}

import 'server-only'
import {AppError,onlyKeys,requireUUID} from '../assessments/contracts.js'
import {transaction} from '../app/database.js'
import {creditBalance,videoCreditCatalog,videoCreditSettings,videoXpV2Settings,STARTER_CREDITS,VIDEO_CREDIT_PRICE,VIDEO_XP_V2_PRICES,XP_V2_WELCOME_CREDITS,XP_V2_PRICE_VERSION} from './model.mjs'

const fail=(code,status=409)=>{throw new AppError(code,status)}
const toInt=v=>{const x=Number(v);if(!Number.isSafeInteger(x))fail('VIDEO_CREDIT_LEDGER_INVALID',503);return x}
const currentPeriod="date_trunc('month',timezone('UTC',now()))::date"

function requireActor(actor){
  requireUUID(actor?.id)
  if(actor?.claims?.sub!==actor.id||actor?.claims?.role!=='authenticated')
    fail('SIGN_IN_REQUIRED',401)
}
async function lockAccount(db,id){
  const a=(await db.query('select status,onboarding_state,created_at from app.accounts where id=$1 for update',[id])).rows[0]
  if(!a||a.status!=='active'||a.onboarding_state!=='active')fail('ACCOUNT_UNAVAILABLE',403)
  return a
}
async function grantCredits(db,id,{xpV2=false,cutover=null,accountCreatedAt=null}={}){
  const newAccount=xpV2&&Number.isFinite(Date.parse(cutover||''))&&
    Number.isFinite(Date.parse(accountCreatedAt||''))&&
    Date.parse(accountCreatedAt)>=Date.parse(cutover)
  const welcome=newAccount?XP_V2_WELCOME_CREDITS:1300
  // Called exclusively under app.accounts FOR UPDATE. Nothing is backfilled.
  await db.query(
    "insert into app_private.video_credit_grants(account_id,grant_key,kind,credits) values($1,'starter','starter',$2) on conflict(account_id,grant_key) do nothing",
    [id,welcome],
  )
  await db.query(
    `insert into app_private.video_credit_grants(account_id,grant_key,kind,period_start,credits)
     select $1,'monthly:'||to_char(${currentPeriod},'YYYY-MM'),'monthly',${currentPeriod},300
     where exists(select 1 from app_private.video_credit_grants
       where account_id=$1 and grant_key='starter' and credits=1300
       and created_at<(date_trunc('month',timezone('UTC',now())) at time zone 'UTC'))
     on conflict(account_id,grant_key) do nothing`,
    [id],
  )
}
async function expire(db,id){
  await db.query(
    "update app_private.video_credit_charges set status='released',updated_at=now() where account_id=$1 and status='held' and expires_at<=now() and (sku is null or sku<>'live_gift')",
    [id],
  )
}
async function balance(db,id,{xpV2=false}={}){
  const g=(await db.query(
    `select coalesce(sum(credits) filter(where kind='starter'),0)::bigint as starter,
      coalesce(sum(credits) filter(where kind='monthly' and period_start=${currentPeriod}),0)::bigint as monthly
     from app_private.video_credit_grants where account_id=$1`,[id],
  )).rows[0]||{}
  const spent=(await db.query(
    `select coalesce(sum(starter_used),0)::bigint as starter,
      coalesce(sum(monthly_used) filter(where monthly_period=${currentPeriod}),0)::bigint as monthly
     from app_private.video_credit_charges where account_id=$1
       and (status='completed' or (status='held' and (expires_at>now() or sku='live_gift')))`,[id],
  )).rows[0]||{}
  const starterGranted=toInt(g.starter||0)
  const amount=creditBalance({
    starterGranted,monthlyGranted:toInt(g.monthly||0),
    starterSpent:toInt(spent.starter||0),monthlySpent:toInt(spent.monthly||0),
    // A stored welcome grant remains valid after the pilot is switched off.
    starterLimit:starterGranted===XP_V2_WELCOME_CREDITS?XP_V2_WELCOME_CREDITS:STARTER_CREDITS,
  })
  return {...amount,priceCredits:xpV2?VIDEO_XP_V2_PRICES.basic:VIDEO_CREDIT_PRICE}
}
async function history(db,id){
  const [grants,charges]=await Promise.all([
    db.query('select kind,credits,created_at from app_private.video_credit_grants where account_id=$1 order by created_at desc limit 12',[id]),
    db.query('select operation_id,credits,status,created_at from app_private.video_credit_charges where account_id=$1 order by created_at desc limit 12',[id]),
  ])
  return [...grants.rows.map(r=>({kind:r.kind,delta:r.credits,date:r.created_at})),
    ...charges.rows.map(r=>({kind:'video',delta:r.status==='released'?0:-r.credits,
      status:r.status,operationId:r.operation_id,date:r.created_at}))]
    .sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,16)
}
function publicCharge(r){
  return {operationId:r.operation_id,status:r.status,priceCredits:r.credits,
    sku:r.sku||null,expiresAt:r.expires_at}
}

export function createVideoCreditService(config,{run=transaction,env=process.env}={}){
  const flags=videoCreditSettings(env)
  const requireEnabled=actor=>{
    requireActor(actor)
    const v2=videoXpV2Settings(env,actor)
    if(!flags.ready||(v2.enabled&&!v2.ready))fail('VIDEO_CREDITS_UNAVAILABLE',503)
    return v2
  }
  async function prepare(db,id,v2){
    const account=await lockAccount(db,id)
    await grantCredits(db,id,{xpV2:v2.ready,cutover:v2.cutover,
      accountCreatedAt:account.created_at})
    await expire(db,id)
  }
  return {
    catalog:actor=>videoCreditCatalog(env,actor),
    async status(actor){
      const v2=requireEnabled(actor)
      return run(config,actor,async db=>{
        await prepare(db,actor.id,v2)
        return {...videoCreditCatalog(env,actor),...await balance(db,actor.id,{xpV2:v2.ready}),history:await history(db,actor.id)}
      })
    },
    async hold(actor,body){
      const v2=requireEnabled(actor)
      onlyKeys(body,v2.ready?['operationId','sku']:['operationId']);requireUUID(body.operationId)
      const sku=v2.ready?(body.sku||'basic'):null
      if(v2.ready&&sku!=='basic')fail('VIDEO_SKU_RENDERER_UNAVAILABLE',503)
      const price=v2.ready?VIDEO_XP_V2_PRICES.basic:VIDEO_CREDIT_PRICE
      return run(config,actor,async db=>{
        await prepare(db,actor.id,v2)
        const prior=(await db.query(
          'select * from app_private.video_credit_charges where account_id=$1 and operation_id=$2',
          [actor.id,body.operationId],
        )).rows[0]
        if(prior){
          if(v2.ready&&(prior.sku!==sku||Number(prior.credits)!==price))fail('VIDEO_CREDIT_OPERATION_MISMATCH')
          return {...publicCharge(prior),balance:await balance(db,actor.id,{xpV2:v2.ready})}
        }
        const available=await balance(db,actor.id,{xpV2:v2.ready})
        if(available.balanceCredits<price)fail('VIDEO_CREDITS_INSUFFICIENT',402)
        const monthly=Math.min(available.monthlyCredits,price)
        const starter=price-monthly
        const insertSql=v2.ready?
          'insert into app_private.video_credit_charges (account_id,operation_id,credits,monthly_used,starter_used,monthly_period,sku,price_version) '+
          'values($1,$2,$3,$4,$5,case when $4>0 then '+currentPeriod+' else null end,$6,$7) returning *':
          'insert into app_private.video_credit_charges (account_id,operation_id,credits,monthly_used,starter_used,monthly_period) '+
          'values($1,$2,$3,$4,$5,case when $4>0 then '+currentPeriod+' else null end) returning *'
        const values=v2.ready?
          [actor.id,body.operationId,price,monthly,starter,sku,XP_V2_PRICE_VERSION]:
          [actor.id,body.operationId,price,monthly,starter]
        const charge=(await db.query(insertSql,values)).rows[0]
        return {...publicCharge(charge),balance:await balance(db,actor.id,{xpV2:v2.ready})}
      })
    },
    async finish(actor,body,mode){
      const v2=requireEnabled(actor)
      onlyKeys(body,mode==='completed'?['operationId','bytes']:['operationId'])
      requireUUID(body.operationId)
      if(mode==='completed'&&(!Number.isSafeInteger(body.bytes)||body.bytes<1024))
        fail('VIDEO_CREDIT_ARTIFACT_INVALID',400)
      return run(config,actor,async db=>{
        await lockAccount(db,actor.id)
        // The account lock serializes settlement. FOR UPDATE on the charge
        // would apply the held-only update policy even when reading a retry.
        const charge=(await db.query(
          'select * from app_private.video_credit_charges where account_id=$1 and operation_id=$2',
          [actor.id,body.operationId],
        )).rows[0]
        if(!charge)fail('VIDEO_CREDIT_OPERATION_NOT_FOUND',404)
        // HeyGen Live Gift settlement is provider-verified and server-only.
        // Public /complete or /release must never unlock an in-flight 500 XP hold.
        if(charge.sku==='live_gift')fail('VIDEO_CREDIT_SERVER_SETTLEMENT_REQUIRED',403)
        if(charge.status==='held'){
          const to=mode==='released'||new Date(charge.expires_at).getTime()<=Date.now()
            ?'released':'completed'
          const rows=(await db.query(
            "update app_private.video_credit_charges set status=$3,artifact_bytes=$4,updated_at=now() where account_id=$1 and operation_id=$2 and status='held' returning *",
            [actor.id,body.operationId,to,to==='completed'?body.bytes:null],
          )).rows
          if(rows.length!==1)fail('VIDEO_CREDIT_CONFLICT',409)
          charge.status=to
        }
        if(mode==='released'&&charge.status==='completed')fail('VIDEO_CREDITS_ALREADY_CHARGED',409)
        return {...publicCharge(charge),balance:await balance(db,actor.id,{xpV2:v2.ready})}
      })
    },
  }
}

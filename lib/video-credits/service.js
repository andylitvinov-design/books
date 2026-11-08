import 'server-only'
import {AppError,onlyKeys,requireUUID} from '../assessments/contracts.js'
import {transaction} from '../app/database.js'
import {creditBalance,videoCreditCatalog,videoCreditSettings,VIDEO_CREDIT_PRICE} from './model.mjs'

const fail=(code,status=409)=>{throw new AppError(code,status)}
const toInt=v=>{const x=Number(v);if(!Number.isSafeInteger(x))fail('VIDEO_CREDIT_LEDGER_INVALID',503);return x}
const currentPeriod="date_trunc('month',timezone('UTC',now()))::date"

function requireActor(actor){
  requireUUID(actor?.id)
  if(actor?.claims?.sub!==actor.id||actor?.claims?.role!=='authenticated')
    fail('SIGN_IN_REQUIRED',401)
}
async function lockAccount(db,id){
  const a=(await db.query('select status,onboarding_state from app.accounts where id=$1 for update',[id])).rows[0]
  if(!a||a.status!=='active'||a.onboarding_state!=='active')fail('ACCOUNT_UNAVAILABLE',403)
}
async function grantCredits(db,id){
  // Called exclusively under app.accounts FOR UPDATE. Nothing is backfilled.
  await db.query(
    "insert into app_private.video_credit_grants(account_id,grant_key,kind,credits) values($1,'starter','starter',1300) on conflict(account_id,grant_key) do nothing",
    [id],
  )
  await db.query(
    `insert into app_private.video_credit_grants(account_id,grant_key,kind,period_start,credits)
     select $1,'monthly:'||to_char(${currentPeriod},'YYYY-MM'),'monthly',${currentPeriod},300
     where exists(select 1 from app_private.video_credit_grants
       where account_id=$1 and grant_key='starter'
       and created_at<(date_trunc('month',timezone('UTC',now())) at time zone 'UTC'))
     on conflict(account_id,grant_key) do nothing`,
    [id],
  )
}
async function expire(db,id){
  await db.query(
    "update app_private.video_credit_charges set status='released',updated_at=now() where account_id=$1 and status='held' and expires_at<=now()",
    [id],
  )
}
async function balance(db,id){
  const g=(await db.query(
    `select coalesce(sum(credits) filter(where kind='starter'),0)::bigint as starter,
      coalesce(sum(credits) filter(where kind='monthly' and period_start=${currentPeriod}),0)::bigint as monthly
     from app_private.video_credit_grants where account_id=$1`,[id],
  )).rows[0]||{}
  const spent=(await db.query(
    `select coalesce(sum(starter_used),0)::bigint as starter,
      coalesce(sum(monthly_used) filter(where monthly_period=${currentPeriod}),0)::bigint as monthly
     from app_private.video_credit_charges where account_id=$1
       and (status='completed' or (status='held' and expires_at>now()))`,[id],
  )).rows[0]||{}
  const amount=creditBalance({
    starterGranted:toInt(g.starter||0),monthlyGranted:toInt(g.monthly||0),
    starterSpent:toInt(spent.starter||0),monthlySpent:toInt(spent.monthly||0),
  })
  return {...amount,priceCredits:VIDEO_CREDIT_PRICE}
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
    expiresAt:r.expires_at}
}

export function createVideoCreditService(config,{run=transaction,env=process.env}={}){
  const flags=videoCreditSettings(env)
  const requireEnabled=()=>{if(!flags.ready)fail('VIDEO_CREDITS_UNAVAILABLE',503)}
  return {
    catalog:()=>videoCreditCatalog(env),
    async status(actor){
      requireActor(actor);requireEnabled()
      return run(config,actor,async db=>{
        await lockAccount(db,actor.id);await grantCredits(db,actor.id);await expire(db,actor.id)
        return {...videoCreditCatalog(env),...await balance(db,actor.id),history:await history(db,actor.id)}
      })
    },
    async hold(actor,body){
      requireActor(actor);requireEnabled()
      onlyKeys(body,['operationId']);requireUUID(body.operationId)
      return run(config,actor,async db=>{
        await lockAccount(db,actor.id);await grantCredits(db,actor.id);await expire(db,actor.id)
        const prior=(await db.query(
          'select * from app_private.video_credit_charges where account_id=$1 and operation_id=$2',
          [actor.id,body.operationId],
        )).rows[0]
        if(prior)return {...publicCharge(prior),balance:await balance(db,actor.id)}
        const available=await balance(db,actor.id)
        if(available.balanceCredits<VIDEO_CREDIT_PRICE)fail('VIDEO_CREDITS_INSUFFICIENT',402)
        const monthly=Math.min(available.monthlyCredits,VIDEO_CREDIT_PRICE)
        const starter=VIDEO_CREDIT_PRICE-monthly
        const charge=(await db.query(
          `insert into app_private.video_credit_charges
           (account_id,operation_id,credits,monthly_used,starter_used,monthly_period)
           values($1,$2,$3,$4,$5,case when $4>0 then ${currentPeriod} else null end)
           returning *`,
          [actor.id,body.operationId,VIDEO_CREDIT_PRICE,monthly,starter],
        )).rows[0]
        return {...publicCharge(charge),balance:await balance(db,actor.id)}
      })
    },
    async finish(actor,body,mode){
      requireActor(actor);requireEnabled()
      onlyKeys(body,mode==='completed'?['operationId','bytes']:['operationId'])
      requireUUID(body.operationId)
      if(mode==='completed'&&(!Number.isSafeInteger(body.bytes)||body.bytes<1024))
        fail('VIDEO_CREDIT_ARTIFACT_INVALID',400)
      return run(config,actor,async db=>{
        await lockAccount(db,actor.id)
        const charge=(await db.query(
          'select * from app_private.video_credit_charges where account_id=$1 and operation_id=$2 for update',
          [actor.id,body.operationId],
        )).rows[0]
        if(!charge)fail('VIDEO_CREDIT_OPERATION_NOT_FOUND',404)
        if(charge.status==='held'){
          const to=mode==='released'||new Date(charge.expires_at).getTime()<=Date.now()
            ?'released':'completed'
          const rows=(await db.query(
            "update app_private.video_credit_charges set status=$3,artifact_bytes=$4,updated_at=now() where account_id=$1 and operation_id=$2 returning *",
            [actor.id,body.operationId,to,to==='completed'?body.bytes:null],
          )).rows
          if(rows.length!==1)fail('VIDEO_CREDIT_CONFLICT',409)
          charge.status=to
        }
        if(mode==='released'&&charge.status==='completed')fail('VIDEO_CREDITS_ALREADY_CHARGED',409)
        return {...publicCharge(charge),balance:await balance(db,actor.id)}
      })
    },
  }
}

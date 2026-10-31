import 'server-only'
import { createHmac } from 'node:crypto'
import { AppError, onlyKeys, requireUUID } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { xpSettings, xpQuote, xpCatalog, XP_CAD_MINOR_PER_POINT } from './model.js'

const fail = (code, status=409) => { throw new AppError(code,status) }
const toNumber = value => {
  const n=Number(value)
  if(!Number.isSafeInteger(n)) fail('XP_BALANCE_INVALID',503)
  return n
}
function requireActor(actor) {
  requireUUID(actor?.id)
  if(actor?.claims?.sub !== actor.id || actor?.claims?.role !== 'authenticated')
    fail('SIGN_IN_REQUIRED',401)
}
async function account(db,id) {
  const row=(await db.query(
    "select id,status,onboarding_state,created_at from app.accounts where id=$1 for update",
    [id],
  )).rows[0]
  if(!row || row.status!=='active' || row.onboarding_state!=='active')
    fail('ACCOUNT_UNAVAILABLE',403)
  return row
}
async function expire(db,id) {
  await db.query(
    "update app_private.xp_charges set status='released',updated_at=now() where account_id=$1 and status='held' and expires_at<now()",
    [id],
  )
}
async function balance(db,id,settings) {
  const rewards=toNumber((await db.query(
    "select coalesce(sum(points),0)::bigint as n from app_private.xp_rewards where account_id=$1",[id]
  )).rows[0]?.n||0)
  const charges=(await db.query(
    "select coalesce(sum(promo_spent),0)::bigint as promo,coalesce(sum(cad_spent_minor),0)::bigint as cad from app_private.xp_charges where account_id=$1 and status in ('held','completed')",[id]
  )).rows[0]||{}
  const promoRemaining=Math.max(0,rewards-toNumber(charges.promo||0))
  let cadRemaining=0
  if(settings.walletRedemption) {
    const credited=toNumber((await db.query(
      "select coalesce(sum(amount_minor),0)::bigint as n from app_private.wallet_entries where account_id=$1",[id]
    )).rows[0]?.n||0)
    cadRemaining=credited-toNumber(charges.cad||0)
  }
  return {
    earnedXp:promoRemaining,
    paidXp:Math.max(0,Math.floor(cadRemaining/XP_CAD_MINOR_PER_POINT)),
    balanceXp:promoRemaining+Math.max(0,Math.floor(cadRemaining/XP_CAD_MINOR_PER_POINT)),
    walletAvailable:settings.walletRedemption,
  }
}
async function recent(db,id) {
  const [rewards,charges]=await Promise.all([
    db.query("select kind,points,created_at from app_private.xp_rewards where account_id=$1 order by created_at desc limit 12",[id]),
    db.query("select features,price_xp,status,created_at from app_private.xp_charges where account_id=$1 order by created_at desc limit 12",[id]),
  ])
  return [
    ...rewards.rows.map(x=>({kind:x.kind,deltaXp:x.points,date:x.created_at})),
    ...charges.rows.map(x=>({kind:'video',features:x.features,status:x.status,
      deltaXp:x.status==='released'?0:-x.price_xp,date:x.created_at})),
  ].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,15)
}
async function inviteCode(db,id,config) {
  const code=createHmac('sha256',config.encryptionKey)
    .update('hh-xp-invite-v1\0'+id).digest('hex').slice(0,16).toUpperCase()
  await db.query(
    'insert into app_private.xp_invites(account_id,code) values($1,$2) on conflict(account_id) do nothing',
    [id,code],
  )
  const row=(await db.query(
    'select code from app_private.xp_invites where account_id=$1',[id]
  )).rows[0]
  return row?.code||null
}
async function claimReferral(db,actor,referralCode,createdAt) {
  if(!referralCode || !/^[A-F0-9]{16}$/.test(referralCode) || !actor.emailConfirmed)
    return {claimed:false,reason:actor.emailConfirmed?'no-code':'email-unverified'}
  if(Date.now()-new Date(createdAt).getTime()>7*24*3600*1000)
    return {claimed:false,reason:'not-new'}
  await db.query("select set_config('hh.xp_invite_lookup','1',true)")
  const candidate=(await db.query(
    'select account_id from app_private.xp_invites where code=$1',[referralCode]
  )).rows[0]?.account_id
  if(!candidate || candidate===actor.id) return {claimed:false,reason:'invalid-referral'}
  // The advisory lock serializes the referral cap across separate invitees.
  await db.query("select pg_advisory_xact_lock(hashtext($1))",['xp-referral-'+candidate])
  const already=(await db.query(
    'select invitee_id from app_private.xp_referrals where invitee_id=$1',[actor.id]
  )).rows[0]
  if(already) return {claimed:false,reason:'already-claimed'}
  const count=toNumber((await db.query(
    "select count(*)::bigint as n from app_private.xp_referrals where inviter_id=$1 and created_at>now()-interval '30 days'",
    [candidate],
  )).rows[0]?.n||0)
  if(count>=10) return {claimed:false,reason:'referral-cap'}
  const inserted=(await db.query(
    'insert into app_private.xp_referrals(invitee_id,inviter_id) values($1,$2) on conflict(invitee_id) do nothing returning invitee_id',
    [actor.id,candidate],
  )).rows[0]
  if(!inserted) return {claimed:false,reason:'already-claimed'}
  await db.query("select set_config('hh.xp_referral_reward','1',true)")
  await db.query(
    "insert into app_private.xp_rewards(account_id,kind,reference_id,points) values($1,'referral',$2,10) on conflict(account_id,kind,reference_id) do nothing",
    [candidate,actor.id],
  )
  return {claimed:true}
}
async function syncAssessment(db,id) {
  // Only an actual completed server result qualifies, not a click or self-report.
  const result=(await db.query(
    "select 1 from app.assessment_results where account_id=$1 limit 1",[id]
  )).rows[0]
  if(!result) return false
  const inserted=(await db.query(
    "insert into app_private.xp_rewards(account_id,kind,reference_id,points) values($1,'assessment',$1,5) on conflict(account_id,kind,reference_id) do nothing returning id",
    [id],
  )).rows[0]
  return Boolean(inserted)
}
async function chargeSnapshot(db,id,op) {
  return (await db.query(
    'select operation_id,features,price_xp,status from app_private.xp_charges where account_id=$1 and operation_id=$2',
    [id,op],
  )).rows[0]||null
}
function publicCharge(row) {
  return {operationId:row.operation_id,features:row.features,priceXp:row.price_xp,status:row.status}
}

export function createXpService(config,{run=transaction,env=process.env}={}) {
  const settings=xpSettings(env)
  function checkEnabled(){if(!settings.enabled) fail('XP_UNAVAILABLE',503)}
  return {
    catalog(){return xpCatalog(env)},
    async status(actor) {
      requireActor(actor)
      if(!settings.enabled) return {...xpCatalog(env),balanceXp:0,earnedXp:0,paidXp:0,inviteCode:null,history:[]}
      return run(config,actor,async db=>{
        await expire(db,actor.id)
        const [money,history,code]=await Promise.all([
          balance(db,actor.id,settings),recent(db,actor.id),
          db.query('select code from app_private.xp_invites where account_id=$1',[actor.id]),
        ])
        return {...xpCatalog(env),...money,history,inviteCode:code.rows[0]?.code||null}
      })
    },
    async sync(actor,referralCode) {
      requireActor(actor);checkEnabled()
      return run(config,actor,async db=>{
        const a=await account(db,actor.id)
        const code=await inviteCode(db,actor.id,config)
        const referral=await claimReferral(db,actor,referralCode,a.created_at)
        const assessmentReward=await syncAssessment(db,actor.id)
        await expire(db,actor.id)
        return {inviteCode:code,referral,assessmentReward,...await balance(db,actor.id,settings)}
      })
    },
    async hold(actor,body) {
      requireActor(actor);checkEnabled()
      onlyKeys(body,['operationId','features'])
      requireUUID(body.operationId)
      const quote=xpQuote(body.features,settings)
      if(!quote.priceXp) return {operationId:body.operationId,priceXp:0,status:'free'}
      return run(config,actor,async db=>{
        await account(db,actor.id);await expire(db,actor.id)
        const existing=await chargeSnapshot(db,actor.id,body.operationId)
        if(existing){
          if(JSON.stringify(existing.features)!==JSON.stringify(quote.features))
            fail('XP_IDEMPOTENCY_CONFLICT')
          return publicCharge(existing)
        }
        const available=await balance(db,actor.id,settings)
        if(available.balanceXp<quote.priceXp) fail('XP_INSUFFICIENT',402)
        const promo=Math.min(available.earnedXp,quote.priceXp)
        const cad=(quote.priceXp-promo)*XP_CAD_MINOR_PER_POINT
        const row=(await db.query(
          "insert into app_private.xp_charges(account_id,operation_id,features,price_xp,promo_spent,cad_spent_minor) values($1,$2,$3,$4,$5,$6) returning operation_id,features,price_xp,status",
          [actor.id,body.operationId,quote.features,quote.priceXp,promo,cad],
        )).rows[0]
        return {...publicCharge(row),balance:await balance(db,actor.id,settings)}
      })
    },
    async finish(actor,body,mode) {
      requireActor(actor);checkEnabled()
      onlyKeys(body,mode==='completed'?['operationId','bytes']:['operationId'])
      requireUUID(body.operationId)
      if(mode==='completed' && (!Number.isSafeInteger(body.bytes)||body.bytes<1024))
        fail('XP_ARTIFACT_INVALID',400)
      return run(config,actor,async db=>{
        await account(db,actor.id)
        const row=(await db.query(
          'select * from app_private.xp_charges where account_id=$1 and operation_id=$2 for update',
          [actor.id,body.operationId],
        )).rows[0]
        if(!row) fail('XP_OPERATION_NOT_FOUND',404)
        if(row.status==='held'){
          const to=mode==='released'||new Date(row.expires_at).getTime()<=Date.now()
            ?'released':'completed'
          await db.query(
            'update app_private.xp_charges set status=$3,updated_at=now() where account_id=$1 and operation_id=$2',
            [actor.id,body.operationId,to],
          )
          row.status=to
        }
        if(mode==='completed' && row.status!=='completed') fail('XP_RESERVATION_EXPIRED')
        if(mode==='released' && row.status==='completed') fail('XP_ALREADY_COMPLETED')
        return {...publicCharge(row),balance:await balance(db,actor.id,settings)}
      })
    },
  }
}

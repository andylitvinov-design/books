/** Existing XP ledger adapter for one consented HeyGen Live Gift. No second wallet. */
import { AppError } from '../assessments/contracts.js';

export const LIVE_GIFT_XP = 500;
export const LIVE_GIFT_SKU = 'live_gift';
export const LIVE_GIFT_PRICE_VERSION = 'xp-v2-20261121';
const MONTH = "date_trunc('month',timezone('UTC',now()))::date";
const fail = (code, status=409) => { throw new AppError(code,status); };
const amount = value => {
  const number=Number(value);
  if(!Number.isSafeInteger(number)||number<0)fail('VIDEO_CREDIT_LEDGER_INVALID',503);
  return number;
};

/** Three independent gates: existing wallet v2, owner-paid HeyGen toggle, approved bridge. */
export function isLiveGiftXpEnabled(env=process.env){
  const cutover=env.HH_VIDEO_XP_V2_CUTOVER_UTC||'';
  return env.HH_LIVE_PHOTOS_XP_BRIDGE_ENABLED==='true' &&
    env.HH_VIDEO_XP_V2_ENABLED==='true' &&
    env.HH_VIDEO_XP_V2_SCHEMA_APPROVED==='true' &&
    env.HH_VIDEO_CREDITS_ENABLED==='true' &&
    env.HH_VIDEO_CREDITS_SCHEMA_APPROVED==='true' &&
    env.HH_APP_ENABLED==='true' &&
    (env.VERCEL_ENV!=='production'||env.HH_APP_PRODUCTION_APPROVED==='true') &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(cutover) &&
    Number.isFinite(Date.parse(cutover));
}
async function lockAccount(db, id){
  const account=(await db.query(
    'select status,onboarding_state from app.accounts where id=$1 for update',[id]
  )).rows[0];
  if(!account||account.status!=='active'||account.onboarding_state!=='active')
    fail('ACCOUNT_UNAVAILABLE',403);
}
export async function reserveLiveGiftXp(db,accountId,operationId){
  await lockAccount(db,accountId);
  const prior=(await db.query(
    'select credits,sku,price_version from app_private.video_credit_charges where account_id=$1 and operation_id=$2',
    [accountId,operationId],
  )).rows[0];
  if(prior)fail('VIDEO_CREDIT_OPERATION_MISMATCH',409);
  const grants=(await db.query(
    `select coalesce(sum(credits) filter(where kind='starter'),0)::bigint as starter,
       coalesce(sum(credits) filter(where kind='monthly' and period_start=${MONTH}),0)::bigint as monthly
       from app_private.video_credit_grants where account_id=$1`,[accountId]
  )).rows[0]||{};
  const spent=(await db.query(
    `select coalesce(sum(starter_used),0)::bigint as starter,
       coalesce(sum(monthly_used) filter(where monthly_period=${MONTH}),0)::bigint as monthly
       from app_private.video_credit_charges where account_id=$1
       and (status='completed' or (status='held' and expires_at>now()))`,[accountId]
  )).rows[0]||{};
  const starter=amount(grants.starter)-amount(spent.starter);
  const monthly=amount(grants.monthly)-amount(spent.monthly);
  if(starter<0||monthly<0)fail('VIDEO_CREDIT_LEDGER_INVALID',503);
  if(starter+monthly<LIVE_GIFT_XP)fail('VIDEO_CREDITS_INSUFFICIENT',402);
  const monthlyUsed=Math.min(monthly,LIVE_GIFT_XP);
  const starterUsed=LIVE_GIFT_XP-monthlyUsed;
  const inserted=(await db.query(
    `insert into app_private.video_credit_charges
      (account_id,operation_id,credits,monthly_used,starter_used,monthly_period,sku,price_version,expires_at)
      values($1,$2,$3,$4,$5,case when $4>0 then ${MONTH} else null end,$6,$7,
        now()+interval '30 days') returning operation_id`,
    [accountId,operationId,LIVE_GIFT_XP,monthlyUsed,starterUsed,LIVE_GIFT_SKU,LIVE_GIFT_PRICE_VERSION],
  )).rows[0];
  if(!inserted)fail('VIDEO_CREDIT_RESERVATION_FAILED',503);
  return { operationId, priceXp:LIVE_GIFT_XP };
}
/** Call only from a verified owner action or a provider-verified job state. */
export async function settleLiveGiftXp(db,accountId,operationId,outcome,bytes=null){
  if(outcome!=='completed'&&outcome!=='released')fail('INVALID_XP_SETTLEMENT');
  if(outcome==='completed'&&(!Number.isSafeInteger(bytes)||bytes<1024||bytes>12000000))
    fail('VIDEO_CREDIT_ARTIFACT_INVALID',400);
  await lockAccount(db,accountId);
  const charge=(await db.query(
    'select credits,sku,price_version,status,artifact_bytes from app_private.video_credit_charges where account_id=$1 and operation_id=$2 for update',
    [accountId,operationId],
  )).rows[0];
  if(!charge||Number(charge.credits)!==LIVE_GIFT_XP||
     charge.sku!==LIVE_GIFT_SKU||charge.price_version!==LIVE_GIFT_PRICE_VERSION)
    fail('VIDEO_CREDIT_OPERATION_MISMATCH',409);
  if(charge.status===outcome){
    if(outcome==='completed'&&Number(charge.artifact_bytes)!==bytes)
      fail('VIDEO_CREDIT_OPERATION_MISMATCH',409);
    return outcome;
  }
  if(charge.status!=='held')fail('VIDEO_CREDIT_OPERATION_MISMATCH',409);
  if(outcome==='completed'){
    const row=(await db.query(
      "update app_private.video_credit_charges set status='completed',artifact_bytes=$3,updated_at=now() where account_id=$1 and operation_id=$2 and status='held' returning status",
      [accountId,operationId,bytes],
    )).rows[0];
    if(!row)fail('VIDEO_CREDIT_SETTLEMENT_FAILED',503);
  }else{
    const row=(await db.query(
      "update app_private.video_credit_charges set status='released',updated_at=now() where account_id=$1 and operation_id=$2 and status='held' returning status",
      [accountId,operationId],
    )).rows[0];
    if(!row)fail('VIDEO_CREDIT_SETTLEMENT_FAILED',503);
  }
  return outcome;
}

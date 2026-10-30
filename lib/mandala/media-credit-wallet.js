import "server-only";
import { randomUUID } from "node:crypto";
import { AppError, requireUUID } from "../assessments/contracts.js";
import { transaction } from "../app/database.js";
import { createAppRepository } from "../app/repository.js";
import { MEDIA_TOPUP_PACKS, WELCOME_BONUS_MINOR, mediaOffer } from "./media-credit-catalog.mjs";

const fail = (code, status = 409) => { throw new AppError(code, status); };
const view = w => ({currency:"USD",bonusMinor:w.bonus_minor,purchasedMinor:w.paid_minor,
  balanceMinor:w.bonus_minor+w.paid_minor,debtMinor:w.debt_minor,blocked:w.debt_minor>0});
const uuid = v => { requireUUID(v); return v; };

async function welcome(db, id) {
  const created = await db.query("insert into app_private.media_credit_wallets(account_id) values($1) on conflict do nothing returning account_id", [id]);
  if (created.rowCount) await db.query(
    "insert into app_private.media_credit_ledger(account_id,idempotency_key,kind,bonus_delta) values($1,$2,'welcome',$3)",
    [id,"welcome:"+id,WELCOME_BONUS_MINOR]);
}
export async function creditWallet(config,actor) {
  await createAppRepository(config).ensureAccount(actor);
  return transaction(config,actor,async db => {
    await welcome(db,actor.id);
    const w=(await db.query("select * from app_private.media_credit_wallets where account_id=$1",[actor.id])).rows[0];
    if(!w) fail("CREDITS_UNAVAILABLE",503);
    const rows=(await db.query("select id,provider,amount_minor,status,created_at from app_private.media_credit_topups where account_id=$1 order by created_at desc limit 10",[actor.id])).rows;
    return {...view(w),topups:rows.map(x=>({id:x.id,provider:x.provider,amountMinor:x.amount_minor,status:x.status,createdAt:x.created_at}))};
  });
}
export async function createCreditTopup(config,actor,{operationId,provider,amountMinor,locale,environment}) {
  uuid(operationId);
  if(!["stripe","paypal"].includes(provider)||!MEDIA_TOPUP_PACKS.includes(amountMinor)||
     !["en","ru","es"].includes(locale)||!["live","sandbox"].includes(environment))
    fail("CREDIT_TOPUP_INVALID",400);
  await createAppRepository(config).ensureAccount(actor);
  return transaction(config,actor,async db=>{
    await welcome(db,actor.id);
    await db.query("insert into app_private.media_credit_topups(operation_id,account_id,provider,environment,amount_minor,locale) values($1,$2,$3,$4,$5,$6) on conflict(account_id,operation_id) do nothing",
      [operationId,actor.id,provider,environment,amountMinor,locale]);
    const row=(await db.query("select * from app_private.media_credit_topups where account_id=$1 and operation_id=$2 for update",[actor.id,operationId])).rows[0];
    if(!row||row.provider!==provider||row.amount_minor!==amountMinor||row.environment!==environment||row.locale!==locale)
      fail("CREDIT_TOPUP_CHANGED");
    return row;
  });
}
export async function getCreditTopup(config,actor,topupId) {
  uuid(topupId);
  const row=await transaction(config,actor,async db=>(await db.query(
    "select * from app_private.media_credit_topups where id=$1 and account_id=$2",[topupId,actor.id])).rows[0]);
  if(!row) fail("CREDIT_TOPUP_NOT_FOUND",404);
  return row;
}
export async function storeCreditCheckout(config,actor,topupId,checkoutId) {
  uuid(topupId);
  if(typeof checkoutId!=="string"||!/^[a-zA-Z0-9_-]{8,200}$/.test(checkoutId)) fail("CREDIT_PAYMENT_MISMATCH");
  return transaction(config,actor,async db=>{
    const row=(await db.query("select * from app_private.media_credit_topups where id=$1 and account_id=$2 for update",[topupId,actor.id])).rows[0];
    if(!row||!["pending","checkout_ready"].includes(row.status)||
       (row.provider_checkout_id&&row.provider_checkout_id!==checkoutId))
      fail("CREDIT_PAYMENT_MISMATCH");
    await db.query("update app_private.media_credit_topups set provider_checkout_id=$2,status='checkout_ready',updated_at=now() where id=$1",[topupId,checkoutId]);
  });
}
// These operations are only for authenticated provider handlers AFTER provider-side readback.
export async function applyVerifiedCreditTopup(config,{topupId,accountId,provider,environment,amountMinor,checkoutId,captureId}) {
  uuid(accountId);
  uuid(topupId);
  if(!/^[a-zA-Z0-9_-]{8,200}$/.test(checkoutId||"")||!/^[a-zA-Z0-9_-]{8,200}$/.test(captureId||""))
    fail("CREDIT_PAYMENT_MISMATCH");
  return transaction(config,null,async db=>{
    await db.query("select set_config('hh.media_payment_verified','true',true)");
    const row=(await db.query("select * from app_private.media_credit_topups where id=$1 for update",[topupId])).rows[0];
    if(!row||row.account_id!==accountId||row.provider!==provider||row.environment!==environment||row.amount_minor!==amountMinor||
       (row.provider_checkout_id&&row.provider_checkout_id!==checkoutId)||
       (row.provider_capture_id&&row.provider_capture_id!==captureId))
      fail("CREDIT_PAYMENT_MISMATCH");
    if(row.status==="paid") return {credited:false,alreadyPaid:true};
    if(["held","reversed"].includes(row.status)) return {credited:false,blocked:true};
    await db.query("update app_private.media_credit_topups set status='paid',provider_checkout_id=$2,provider_capture_id=$3,paid_at=now(),updated_at=now() where id=$1",
      [topupId,checkoutId,captureId]);
    const w=(await db.query("select * from app_private.media_credit_wallets where account_id=$1 for update",[row.account_id])).rows[0];
    if(!w) fail("CREDITS_UNAVAILABLE",503);
    const repayment=Math.min(w.debt_minor,amountMinor), addition=amountMinor-repayment;
    await db.query("update app_private.media_credit_wallets set paid_minor=paid_minor+$2,debt_minor=debt_minor-$3,updated_at=now() where account_id=$1",
      [row.account_id,addition,repayment]);
    await db.query("insert into app_private.media_credit_ledger(account_id,idempotency_key,kind,paid_delta,debt_delta) values($1,$2,'topup',$3,$4)",
      [row.account_id,"topup:"+row.id,addition,-repayment]);
    return {credited:true};
  },{server:true});
}
// A disputed or partially refunded purchase is frozen until a verified resolution.
export async function holdVerifiedCreditTopup(config,{topupId,provider,captureId}) {
  uuid(topupId);
  return transaction(config,null,async db=>{
    await db.query("select set_config('hh.media_payment_verified','true',true)");
    const row=(await db.query("select * from app_private.media_credit_topups where id=$1 for update",[topupId])).rows[0];
    if(!row||row.provider!==provider||row.provider_capture_id!==captureId)
      fail("CREDIT_PAYMENT_MISMATCH");
    if(row.status==="held"||row.status==="reversed") return {held:false};
    if(row.status!=="paid") fail("CREDIT_PAYMENT_REVIEW");
    const w=(await db.query("select * from app_private.media_credit_wallets where account_id=$1 for update",[row.account_id])).rows[0];
    if(!w) fail("CREDITS_UNAVAILABLE",503);
    const taken=Math.min(w.paid_minor,row.amount_minor),debt=row.amount_minor-taken;
    await db.query("update app_private.media_credit_wallets set paid_minor=paid_minor-$2,debt_minor=debt_minor+$3,updated_at=now() where account_id=$1",[row.account_id,taken,debt]);
    await db.query("update app_private.media_credit_topups set status='held',updated_at=now() where id=$1",[topupId]);
    await db.query("insert into app_private.media_credit_ledger(account_id,idempotency_key,kind,paid_delta,debt_delta) values($1,$2,'chargeback',$3,$4)",
      [row.account_id,"hold:"+row.id,-taken,debt]);
    return {held:true,debtMinor:debt};
  },{server:true});
}

export async function reverseVerifiedCreditTopup(config,{topupId,provider,captureId}) {
  uuid(topupId);
  return transaction(config,null,async db=>{
    await db.query("select set_config('hh.media_payment_verified','true',true)");
    const row=(await db.query("select * from app_private.media_credit_topups where id=$1 for update",[topupId])).rows[0];
    if(!row||row.provider!==provider||row.provider_capture_id!==captureId) fail("CREDIT_PAYMENT_MISMATCH");
    if(row.status==="reversed") return {reversed:false};
    if(row.status==="held") {
      await db.query("update app_private.media_credit_topups set status='reversed',updated_at=now() where id=$1",[topupId]);
      return {reversed:true,alreadyFrozen:true};
    }
    if(row.status!=="paid") fail("CREDIT_PAYMENT_REVIEW");
    const w=(await db.query("select * from app_private.media_credit_wallets where account_id=$1 for update",[row.account_id])).rows[0];
    if(!w) fail("CREDITS_UNAVAILABLE",503);
    const taken=Math.min(w.paid_minor,row.amount_minor),debt=row.amount_minor-taken;
    await db.query("update app_private.media_credit_wallets set paid_minor=paid_minor-$2,debt_minor=debt_minor+$3,updated_at=now() where account_id=$1",[row.account_id,taken,debt]);
    await db.query("update app_private.media_credit_topups set status='reversed',updated_at=now() where id=$1",[topupId]);
    await db.query("insert into app_private.media_credit_ledger(account_id,idempotency_key,kind,paid_delta,debt_delta) values($1,$2,'chargeback',$3,$4)",
      [row.account_id,"reverse:"+row.id,-taken,debt]);
    return {reversed:true,debtMinor:debt};
  },{server:true});
}
// Internal generator hooks: charge a real, server-submitted paid job exactly once.
export async function reserveMediaCreditJob(config,actor,{operationId,sku}) {
  uuid(operationId);
  const offer=mediaOffer(sku);
  if(!offer||offer.minor<=0) fail("CREDIT_JOB_INVALID",400);
  await createAppRepository(config).ensureAccount(actor);
  return transaction(config,actor,async db=>{
    await welcome(db,actor.id);
    const w=(await db.query("select * from app_private.media_credit_wallets where account_id=$1 for update",[actor.id])).rows[0];
    const prior=(await db.query("select * from app_private.media_credit_jobs where account_id=$1 and operation_id=$2",[actor.id,operationId])).rows[0];
    if(prior){if(prior.sku!==sku)fail("CREDIT_JOB_CHANGED");return prior;}
    if(w.debt_minor||w.bonus_minor+w.paid_minor<offer.minor) fail("CREDIT_INSUFFICIENT_BALANCE",402);
    const bonus=Math.min(w.bonus_minor,offer.minor),paid=offer.minor-bonus,id=randomUUID();
    await db.query("update app_private.media_credit_wallets set bonus_minor=bonus_minor-$2,paid_minor=paid_minor-$3,updated_at=now() where account_id=$1",[actor.id,bonus,paid]);
    await db.query("insert into app_private.media_credit_jobs(id,account_id,operation_id,sku,price_minor,bonus_spent,paid_spent) values($1,$2,$3,$4,$5,$6,$7)",
      [id,actor.id,operationId,sku,offer.minor,bonus,paid]);
    await db.query("insert into app_private.media_credit_ledger(account_id,idempotency_key,kind,bonus_delta,paid_delta) values($1,$2,'spend',$3,$4)",
      [actor.id,"job:"+id,-bonus,-paid]);
    return {id,sku,status:"reserved",price_minor:offer.minor};
  });
}
export async function finishMediaCreditJob(config,actor,jobId,{succeeded,providerTaskId=null}) {
  uuid(jobId);
  if(typeof succeeded!=="boolean") fail("CREDIT_JOB_INVALID",400);
  return transaction(config,actor,async db=>{
    const job=(await db.query("select * from app_private.media_credit_jobs where id=$1 and account_id=$2 for update",[jobId,actor.id])).rows[0];
    if(!job) fail("CREDIT_JOB_NOT_FOUND",404);
    if(job.status!=="reserved") return {status:job.status};
    if(succeeded){
      if(!providerTaskId||!/^[a-zA-Z0-9_-]{8,200}$/.test(providerTaskId)) fail("CREDIT_JOB_PROOF_MISSING");
      await db.query("update app_private.media_credit_jobs set status='completed',provider_task_id=$3,finished_at=now() where id=$1 and account_id=$2",[jobId,actor.id,providerTaskId]);
      return {status:"completed"};
    }
    await db.query("update app_private.media_credit_jobs set status='failed',finished_at=now() where id=$1 and account_id=$2",[jobId,actor.id]);
    await db.query("update app_private.media_credit_wallets set bonus_minor=bonus_minor+$2,paid_minor=paid_minor+$3,updated_at=now() where account_id=$1",
      [actor.id,job.bonus_spent,job.paid_spent]);
    await db.query("insert into app_private.media_credit_ledger(account_id,idempotency_key,kind,bonus_delta,paid_delta) values($1,$2,'restore',$3,$4)",
      [actor.id,"restore:"+jobId,job.bonus_spent,job.paid_spent]);
    return {status:"failed",refundedMinor:job.price_minor};
  });
}

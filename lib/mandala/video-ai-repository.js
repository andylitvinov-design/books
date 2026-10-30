import "server-only";
import {randomUUID} from "node:crypto";
import {transaction} from "@/lib/app/database";
import {AppError} from "@/lib/assessments/contracts";
import {VIDEO_AI_CATALOG,buildVideoAiRequest} from "@/lib/mandala/video-ai-openrouter.mjs";
import {mintVideoCode,hashVideoCode,validateVideoCodeIssue,safeVideoRequestHash} from "@/lib/mandala/video-redemption.mjs";

const REDEEM_DENIED=()=>new AppError("VIDEO_CODE_INVALID_OR_USED",409);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedStatuses=new Set(["pending","in_progress","completed","failed","cancelled","expired"]);

export async function issueVideoCode(config,owner,input,{secret=process.env.HH_VIDEO_CODE_HMAC_KEY}={}){
  const i=validateVideoCodeIssue(input),code=mintVideoCode(),hash=hashVideoCode(code,secret);
  await transaction(config,owner,async db=>{
    await db.query(
      `insert into app_private.video_generation_codes
        (id,code_hash,tier,kind,payment_channel,payment_reference,price_cents,
         owner_verified_at,issued_by,gift_recipient_id,expires_at)
       values ($1,$2,$3,$4,$5,$6,$7,now(),$8,$9,now()+($10::integer*interval '1 day'))`,
      [i.id,hash,i.tier,i.kind,i.channel,i.paymentReference,i.priceCents,
        owner.id,i.recipientId,i.expiresDays]
    );
  });
  return {code,tier:i.tier,kind:i.kind,priceCents:i.priceCents,expiresDays:i.expiresDays};
}

export async function claimVideoCode(config,actor,{code,...input},{
  secret=process.env.HH_VIDEO_CODE_HMAC_KEY,
}={}){
  // Validate the prompt, budget and explicit third-party consent before touching a code.
  const request=buildVideoAiRequest(input),requestHash=safeVideoRequestHash(input);
  const hash=hashVideoCode(code,secret);
  return transaction(config,actor,async db=>{
    const row=(await db.query(
      `select id,tier,kind,gift_recipient_id,status,expires_at,owner_verified_at
       from app_private.video_generation_codes where code_hash=$1 for update`,
      [hash]
    )).rows[0];
    if(!row||row.tier!==request.tier||!row.owner_verified_at||new Date(row.expires_at).getTime()<=Date.now())
      throw REDEEM_DENIED();
    if(row.kind==="gift"&&row.gift_recipient_id!==actor.id)throw REDEEM_DENIED();
    if(row.status==="claimed"){
      // A network retry does not spend again. Return the ORIGINAL job only when
      // it belongs to this same user and has the exact same visual plan.
      const original=(await db.query(
        `select id,status from app_private.video_generation_jobs
         where code_id=$1 and owner_id=$2 and request_hash=$3`,
        [row.id,actor.id,requestHash]
      )).rows[0];
      if(!original)throw REDEEM_DENIED();
      return {jobId:original.id,status:original.status,existing:true};
    }
    if(row.status!=="issued")throw REDEEM_DENIED();
    const jobId=randomUUID();
    await db.query(
      `insert into app_private.video_generation_jobs
        (id,code_id,owner_id,tier,request_hash,model,estimate_cents,limit_cents,status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,'submitting')`,
      [jobId,row.id,actor.id,request.tier,requestHash,request.body.model,
        request.estimateCents,request.costCeilingCents]
    );
    const claimed=await db.query(
      `update app_private.video_generation_codes set status='claimed',claimed_by=$1,claimed_at=now()
       where id=$2 and status='issued'`,[actor.id,row.id]);
    if(claimed.rowCount!==1)throw REDEEM_DENIED();
    return {jobId,status:"submitting",existing:false};
  });
}
export async function markVideoJobSubmitted(config,actor,jobId,provider){
  if(!UUID.test(jobId)||!allowedStatuses.has(provider.status))throw new AppError("INVALID_JOB",400);
  return transaction(config,actor,async db=>{
    const out=await db.query(
      `update app_private.video_generation_jobs set external_id=$1,status=$2,updated_at=now()
       where id=$3 and owner_id=$4 and status='submitting' returning id,status`,
      [provider.id,provider.status,jobId,actor.id]
    );
    if(out.rowCount!==1)throw new AppError("VIDEO_JOB_CONFLICT",409);
    return {jobId:out.rows[0].id,status:out.rows[0].status};
  });
}
export async function markVideoJobUnknown(config,actor,jobId){
  if(!UUID.test(jobId))return;
  // A timeout can mean accepted and billed: never silently refund/retry.
  return transaction(config,actor,async db=>{
    await db.query(`update app_private.video_generation_jobs
      set status='unknown',updated_at=now()
      where id=$1 and owner_id=$2 and status='submitting'`,[jobId,actor.id]);
  });
}
export async function getVideoJob(config,actor,jobId){
  if(!UUID.test(jobId))throw new AppError("INVALID_JOB",400);
  return transaction(config,actor,async db=>{
    const row=(await db.query(
      `select id,owner_id,tier,status,external_id,created_at,updated_at
       from app_private.video_generation_jobs where id=$1 and owner_id=$2`,
      [jobId,actor.id]
    )).rows[0];
    if(!row)throw new AppError("VIDEO_JOB_NOT_FOUND",404);
    return row;
  });
}
export async function syncVideoJob(config,actor,jobId,status){
  if(!allowedStatuses.has(status))throw new AppError("INVALID_JOB",400);
  return transaction(config,actor,async db=>{
    const row=(await db.query(
      `update app_private.video_generation_jobs set status=$1,updated_at=now(),
       completed_at=case when $1 in ('completed','failed','cancelled','expired')
         then now() else completed_at end
       where id=$2 and owner_id=$3 and status in ('pending','in_progress')
       returning id,status`,
      [status,jobId,actor.id]
    )).rows[0];
    if(!row)throw new AppError("VIDEO_JOB_CONFLICT",409);
    return {jobId:row.id,status:row.status};
  });
}

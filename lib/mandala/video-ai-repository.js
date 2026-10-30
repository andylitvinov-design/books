import "server-only";
import {randomUUID} from "node:crypto";
import {transaction} from "@/lib/app/database";
import {AppError} from "@/lib/assessments/contracts";
import {buildVideoAiRequest} from "@/lib/mandala/video-ai-heygen.mjs";
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
      `select id,owner_id,tier,status,external_id,storage_state,storage_path,asset_bytes,stored_at,created_at,updated_at
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


/** List only the current verified user's clips; no profile, prompt, receipts or secrets. */
export async function listVideoAiJobs(config,actor){
  return transaction(config,actor,async db=>(await db.query(
    `select id,tier,status,storage_state,asset_bytes,stored_at,created_at
      from app_private.video_generation_jobs where owner_id=$1
      order by created_at desc,id desc limit 20`,[actor.id]
  )).rows.map(row=>({
    jobId:row.id,tier:row.tier,status:row.status,storageState:row.storage_state,
    size:row.asset_bytes,storedAt:row.stored_at,createdAt:row.created_at,
  })));
}
const PRIVATE_BUCKET_PATH=id=>/^[a-f0-9-]{36}$/i.test(id||'');
const MAX_ASSET_BYTES=12_000_000;
export async function reserveVideoAiArchive(config,actor,jobId){
  if(!PRIVATE_BUCKET_PATH(jobId))throw new AppError("INVALID_JOB",400);
  return transaction(config,actor,async db=>{
    // Shared with the existing private video quota, so one owner cannot
    // silently saturate the finite private bucket.
    await db.query("select pg_advisory_xact_lock(598228614)");
    const row=(await db.query(
      `select id,status,storage_state,storage_path from app_private.video_generation_jobs
       where id=$1 and owner_id=$2 for update`,[jobId,actor.id])).rows[0];
    if(!row||row.status!=="completed")throw new AppError("VIDEO_NOT_READY",409);
    if(row.storage_state==="ready")return {existing:true,key:row.storage_path};
    if(row.storage_state==="uploading")throw new AppError("VIDEO_ARCHIVE_IN_PROGRESS",409);
    const own=(await db.query(
      `select count(*)::int n,coalesce(sum(case when storage_state='uploading' then 12000000 else asset_bytes end),0)::bigint size
       from app_private.video_generation_jobs where owner_id=$1 and
        storage_state in ('ready','uploading')`,[actor.id])).rows[0];
    const global=(await db.query(
      `select coalesce(sum(case when storage_state='uploading' then 12000000 else asset_bytes end),0)::bigint size
       from app_private.video_generation_jobs where storage_state in ('ready','uploading')`
    )).rows[0];
    const other=(await db.query(
      `select coalesce(sum(bytes),0)::bigint size
       from app_private.personal_videos where status<>'deleted' or released_at is null`
    )).rows[0];
    if(own.n>=3||Number(own.size)+MAX_ASSET_BYTES>36_000_000||
      Number(global.size)+Number(other.size)+MAX_ASSET_BYTES>180_000_000)
      throw new AppError("VIDEO_STORAGE_QUOTA",413);
    const key="ai-videos/"+actor.id+"/"+jobId+"/master.mp4";
    await db.query(
      `update app_private.video_generation_jobs
         set storage_state='uploading',storage_path=$3,updated_at=now()
       where id=$1 and owner_id=$2 and storage_state in ('none','failed')`,
      [jobId,actor.id,key]);
    return {existing:false,key,maxBytes:MAX_ASSET_BYTES};
  });
}
export async function completeVideoAiArchive(config,actor,jobId,{key,bytes,sha256}){
  if(!PRIVATE_BUCKET_PATH(jobId)||typeof key!=="string"||
    !key.startsWith("ai-videos/"+actor.id+"/"+jobId+"/")||
    !Number.isInteger(bytes)||bytes<1024||bytes>MAX_ASSET_BYTES||
    !/^[a-f0-9]{64}$/.test(sha256))throw new AppError("INVALID_VIDEO_ASSET",400);
  return transaction(config,actor,async db=>{
    const updated=await db.query(
      `update app_private.video_generation_jobs
         set storage_state='ready',asset_bytes=$3,asset_sha256=$4,
           stored_at=now(),updated_at=now()
       where id=$1 and owner_id=$2 and storage_state='uploading'
       and storage_path=$5 returning id`,
      [jobId,actor.id,bytes,sha256,key]);
    if(updated.rowCount!==1)throw new AppError("VIDEO_ARCHIVE_CONFLICT",409);
    return {jobId,archived:true,bytes};
  });
}
export async function failVideoAiArchive(config,actor,jobId){
  if(!PRIVATE_BUCKET_PATH(jobId))return;
  return transaction(config,actor,db=>db.query(
    `update app_private.video_generation_jobs
       set storage_state='failed',updated_at=now()
       where id=$1 and owner_id=$2 and storage_state='uploading'`,
    [jobId,actor.id]));
}

import 'server-only';
import {createHash,createHmac,randomUUID} from 'node:crypto';
import {AppError,requireUUID} from '../assessments/contracts.js';
import {transaction} from '../app/database.js';
import {buildCinematicStoryboard,safeCinematicPrompt} from './cinematic-director.mjs';
import {normalizePaidVideoOrder,normalizePaidVideoReceipt,paidVideoFlags,publicPaidVideoOrder,validPaidVideoUuid} from './video-paid-order-model.mjs';

const fail=(code,status=409)=>{throw new AppError(code,status)};
const requireActor=actor=>{requireUUID(actor?.id);if(actor.claims?.sub!==actor.id||actor.claims?.role!=='authenticated')fail('SIGN_IN_REQUIRED',401)};
async function accountReady(db,id){
 const row=(await db.query("select status,onboarding_state from app.accounts where id=$1 for update",[id])).rows[0];
 if(!row||row.status!=='active'||row.onboarding_state!=='active')fail('ACCOUNT_UNAVAILABLE',403);
}
function safePrompt(order,index) {
 const plan=buildCinematicStoryboard({locale:'en',theme:order.theme,style:'nature',
  aspect:order.aspect_ratio==='9:16'?'portrait':'landscape',durationSeconds:30});
 const prompt=safeCinematicPrompt(plan,index);
 if(typeof prompt!=='string'||prompt.length<20)fail('VIDEO_SCENE_INVALID',400);
 return prompt;
}
const safeScene=r=>({id:r.id,orderId:r.paid_order_id,sceneNumber:r.shot_index,status:r.status,
 submitted:Boolean(r.external_id),sourceVerified:r.status==='completed'&&Boolean(r.provider_asset_ref)});
export function createVideoPaidOrderService(config,{run=transaction,env=process.env}={}){
 const flags=paidVideoFlags(env);
 const enabled=()=>{if(!flags.ordersReady)fail('VIDEO_PAID_ORDERS_DISABLED',503)};
 const admin=(actor,fn)=>run(config,actor,fn,{moderator:true});
 return Object.freeze({
  settings:()=>flags,
  async request(actor,input){
   requireActor(actor);enabled();
   let p;try{p=normalizePaidVideoOrder(input)}catch{fail('INVALID_VIDEO_PAID_ORDER',400)}
   return run(config,actor,async db=>{
    await accountReady(db,actor.id);
    const old=(await db.query('select * from app_private.video_paid_orders_v1 where account_id=$1 and operation_id=$2 for update',[actor.id,p.operationId])).rows[0];
    if(old){
     if(old.tier!==p.tier||old.theme!==p.theme||old.locale!==p.locale||old.aspect_ratio!==p.aspectRatio)fail('VIDEO_ORDER_IDEMPOTENCY_CONFLICT');
     return {created:false,order:publicPaidVideoOrder(old)};
    }
    const row=(await db.query('insert into app_private.video_paid_orders_v1 (account_id,operation_id,tier,theme,locale,aspect_ratio,price_eur_minor,ai_seconds,library_seconds,provider_budget_usd_cents) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *',[actor.id,p.operationId,p.tier,p.theme,p.locale,p.aspectRatio,p.priceMinor,p.aiSeconds,p.librarySeconds,p.costUsdCents])).rows[0];
    return {created:true,order:publicPaidVideoOrder(row)};
   });
  },
  async list(actor){
   requireActor(actor);
   if(!flags.ordersReady)return {enabled:false,orders:[]};
   return run(config,actor,async db=>({enabled:true,orders:(await db.query('select * from app_private.video_paid_orders_v1 where account_id=$1 order by created_at desc limit 20',[actor.id])).rows.map(publicPaidVideoOrder)}));
  },
  async adminList(actor){
   requireActor(actor);enabled();
   return admin(actor,async db=>{
    const orders=(await db.query("select * from app_private.video_paid_orders_v1 order by case when status in ('requested','payment_verified','generating','qa_pending') then 0 else 1 end, created_at desc limit 40")).rows;
    const jobs=orders.length?(await db.query('select id,paid_order_id,shot_index,status,external_id,provider_asset_ref from app_private.video_generation_jobs where paid_order_id=any($1::uuid[]) order by shot_index',[orders.map(r=>r.id)])).rows:[];
    return {orders:orders.map(r=>({...publicPaidVideoOrder(r),accountId:r.account_id,verifiedAt:r.verified_at,scenes:jobs.filter(j=>j.paid_order_id===r.id).map(safeScene)})),providerReady:flags.providerReady,receiptReviewEnabled:env.HH_VIDEO_PAID_MANUAL_REVIEW_ENABLED==='true'};
   });
  },
  async verifyReceipt(actor,input){
   requireActor(actor);enabled();
   if(env.HH_VIDEO_PAID_MANUAL_REVIEW_ENABLED!=='true')fail('VIDEO_MANUAL_REVIEW_DISABLED',503);
   let e;try{e=normalizePaidVideoReceipt(input)}catch{fail('INVALID_VIDEO_RECEIPT',400)}
   if(typeof config.encryptionKey!=='string'||config.encryptionKey.length<32)fail('VIDEO_RECEIPT_SECRET_MISSING',503);
   const digest=createHmac('sha256',config.encryptionKey).update('hh-video-paypal-v1\0'+e.reference).digest('hex');
   return admin(actor,async db=>{
    const row=(await db.query('select * from app_private.video_paid_orders_v1 where id=$1 for update',[e.orderId])).rows[0];
    if(!row)fail('VIDEO_PAID_ORDER_NOT_FOUND',404);
    if(row.status!=='requested'||row.revision!==e.expectedRevision)fail('VIDEO_RECEIPT_ALREADY_REVIEWED');
    if(Number(row.price_eur_minor)!==e.amountMinor)fail('VIDEO_RECEIPT_AMOUNT_MISMATCH',400);
    const changed=(await db.query("update app_private.video_paid_orders_v1 set status='payment_verified',receipt_digest=$2,verified_at=now(),reviewer_id=$3,revision=revision+1,updated_at=now() where id=$1 and status='requested' and revision=$4 returning *",[row.id,digest,actor.id,e.expectedRevision])).rows[0];
    if(!changed)fail('VIDEO_RECEIPT_CONFLICT');
    return {order:publicPaidVideoOrder(changed)};
   });
  },
  async reserveScene(actor,input){
   requireActor(actor);enabled();
   if(!flags.providerReady)fail('VIDEO_PAID_PROVIDER_DISABLED',503);
   if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['action','orderId','sceneNumber','approvedMaxUsdCents','confirmed'].includes(k))||input.action!=='submit'||!validPaidVideoUuid(input.orderId)||!Number.isInteger(input.sceneNumber)||input.sceneNumber<1||input.sceneNumber>2||input.approvedMaxUsdCents!==30||input.confirmed!==true)fail('VIDEO_SCENE_APPROVAL_REQUIRED',400);
   return admin(actor,async db=>{
    const order=(await db.query('select * from app_private.video_paid_orders_v1 where id=$1 for update',[input.orderId])).rows[0];
    if(!order)fail('VIDEO_PAID_ORDER_NOT_FOUND',404);
    if(!['payment_verified','generating'].includes(order.status)||!order.receipt_digest||!order.verified_at)fail('VIDEO_PAYMENT_NOT_VERIFIED');
    if(input.sceneNumber>order.ai_seconds/6)fail('VIDEO_SCENE_OUT_OF_PLAN',400);
    const old=(await db.query('select * from app_private.video_generation_jobs where paid_order_id=$1 and shot_index=$2 for update',[order.id,input.sceneNumber])).rows[0];
    if(old)return {existing:true,scene:safeScene(old)};
    const prior=Number((await db.query('select coalesce(sum(limit_cents),0)::integer as amount from app_private.video_generation_jobs where paid_order_id=$1',[order.id])).rows[0]?.amount||0);
    if(prior+30>order.provider_budget_usd_cents)fail('VIDEO_SCENE_BUDGET_EXCEEDED');
    const prompt=safePrompt(order,input.sceneNumber);
    const hash=createHash('sha256').update(prompt+'\0'+order.aspect_ratio+'\0'+input.sceneNumber).digest('hex');
    const job=(await db.query("insert into app_private.video_generation_jobs (id,code_id,paid_order_id,shot_index,owner_id,tier,request_hash,model,estimate_cents,limit_cents,status) values($1,null,$2,$3,$4,$5,$6,'veo-3.1-lite-generate-001',30,30,'submitting') returning *",[randomUUID(),order.id,input.sceneNumber,order.account_id,order.tier,hash])).rows[0];
    await db.query("update app_private.video_paid_orders_v1 set status='generating',revision=revision+1,updated_at=now() where id=$1",[order.id]);
    return {existing:false,scene:safeScene(job),prompt,aspectRatio:order.aspect_ratio};
   });
  },
  async task(actor,id){
   requireActor(actor);enabled();
   if(!validPaidVideoUuid(id))fail('INVALID_VIDEO_SCENE',400);
   return admin(actor,async db=>{
    const row=(await db.query('select id,status,external_id from app_private.video_generation_jobs where id=$1 and paid_order_id is not null',[id])).rows[0];
    if(!row)fail('VIDEO_SCENE_NOT_FOUND',404);
    return row;
   });
  },
  async markScene(actor,id,{status,externalId=null,assetUri=null}={}){
   requireActor(actor);enabled();
   if(!validPaidVideoUuid(id)||!['unknown','pending','in_progress','completed','failed'].includes(status))fail('INVALID_VIDEO_SCENE',400);
   return admin(actor,async db=>{
    const old=(await db.query('select * from app_private.video_generation_jobs where id=$1 and paid_order_id is not null for update',[id])).rows[0];
    if(!old)fail('VIDEO_SCENE_NOT_FOUND',404);
    const allowed=old.status==='submitting'?['unknown','pending'].includes(status):['pending','in_progress'].includes(old.status)&&['in_progress','completed','failed'].includes(status);
    if(!allowed)fail('VIDEO_SCENE_STATE_CONFLICT');
    if(status!=='unknown'&&(typeof externalId!=='string'||externalId.length<8||externalId.length>512))fail('VIDEO_PROVIDER_ID_INVALID',400);
    if(old.external_id&&old.external_id!==externalId)fail('VIDEO_PROVIDER_ID_CHANGED');
    if(status==='completed'&&!assetUri)fail('VIDEO_SCENE_SOURCE_REQUIRED',400);
    if(assetUri){
      const prefix=env.HH_VEO_GCS_OUTPUT_URI;
      if(status!=='completed'||typeof prefix!=='string'||!prefix.startsWith('gs://')||!assetUri.startsWith(prefix)||!/^gs:\/\/[a-z0-9][a-z0-9._-]{2,62}\/[a-zA-Z0-9/_-]+\.mp4$/.test(assetUri))fail('VIDEO_ASSET_SOURCE_INVALID',400);
    }
    const changed=(await db.query('update app_private.video_generation_jobs set status=$2,external_id=coalesce(external_id,$3),provider_asset_ref=coalesce($4,provider_asset_ref),updated_at=now(),completed_at=case when $2 in (\'completed\',\'failed\') then now() else completed_at end where id=$1 returning *',[id,status,externalId,assetUri])).rows[0];
    const order=(await db.query('select * from app_private.video_paid_orders_v1 where id=$1 for update',[old.paid_order_id])).rows[0];
    const rows=(await db.query('select status,provider_asset_ref from app_private.video_generation_jobs where paid_order_id=$1',[old.paid_order_id])).rows;
    if(order?.status==='generating'&&rows.length===order.ai_seconds/6&&rows.every(r=>r.status==='completed'&&r.provider_asset_ref)){
      await db.query("update app_private.video_paid_orders_v1 set status='qa_pending',revision=revision+1,updated_at=now() where id=$1 and status='generating'",[order.id]);
    }
    return {scene:safeScene(changed)};
   });
  },
  async deliver(actor,input){
   requireActor(actor);enabled();
   if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['action','orderId','personalVideoId','qaManifestSha256','qaApproved'].includes(k))||input.action!=='deliver'||!validPaidVideoUuid(input.orderId)||!validPaidVideoUuid(input.personalVideoId)||input.qaApproved!==true||!/^[a-f0-9]{64}$/.test(input.qaManifestSha256||''))fail('VIDEO_QA_REQUIRED',400);
   return admin(actor,async db=>{
    const order=(await db.query('select * from app_private.video_paid_orders_v1 where id=$1 for update',[input.orderId])).rows[0];
    if(!order||order.status!=='qa_pending')fail('VIDEO_ORDER_NOT_QA_READY');
    const jobs=(await db.query('select status,provider_asset_ref from app_private.video_generation_jobs where paid_order_id=$1',[order.id])).rows;
    if(jobs.length!==order.ai_seconds/6||jobs.some(j=>j.status!=='completed'||!j.provider_asset_ref))fail('VIDEO_SCENES_NOT_VERIFIED');
    // Existing personal_videos owner RLS forbids a broad admin read. Limit this
    // transaction to the exact order and exact client-owned private MP4 under QA.
    await db.query("select set_config('hh.video_paid_qa_order_id',$1,true)",[order.id]);
    await db.query("select set_config('hh.video_paid_qa_video_id',$1,true)",[input.personalVideoId]);
    const v=(await db.query('select id,status,duration_seconds,aspect,mime from app_private.personal_videos where id=$1 and account_id=$2',[input.personalVideoId,order.account_id])).rows[0];
    if(!v||v.status!=='ready'||v.duration_seconds!==30||v.mime!=='video/mp4'||v.aspect!==(order.aspect_ratio==='9:16'?'portrait':'landscape'))fail('VIDEO_PRIVATE_MASTER_NOT_VERIFIED');
    const row=(await db.query("update app_private.video_paid_orders_v1 set status='delivered',final_video_id=$2,qa_manifest_sha256=$3,qa_at=now(),revision=revision+1,updated_at=now() where id=$1 and status='qa_pending' returning *",[order.id,v.id,input.qaManifestSha256])).rows[0];
    return {order:publicPaidVideoOrder(row)};
   });
  },
 });
}

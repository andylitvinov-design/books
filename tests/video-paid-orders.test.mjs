import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {
 normalizePaidVideoOrder,normalizePaidVideoReceipt,paidVideoFlags,
} from '../lib/mandala/video-paid-order-model.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const id='12345678-1234-4567-8123-123456789abc';
const input={operationId:id,tier:'extra',theme:'energy',aspectRatio:'16:9',
 locale:'ru',fictionalSceneConsent:true};
test('Extra €3 and PRO €5 include exact 30-second hybrid quantities',()=>{
 for(const [tier,price,ai,library] of [['extra',300,6,24],['pro',500,12,18]]){
  const value=normalizePaidVideoOrder({...input,tier});
  assert.equal(value.priceMinor,price);
  assert.equal(value.aiSeconds,ai);
  assert.equal(value.librarySeconds,library);
  assert.equal(value.costUsdCents,ai*5);
 }
});
test('private details, price tampering and missing consent fail closed',()=>{
 for(const bad of [{...input,clientId:id},{...input,photo:'file://private'},
  {...input,diagnosis:'sensitive'}, {...input,priceMinor:1},
  {...input,tier:'smart'}, {...input,operationId:'bad'},
  {...input,aspectRatio:'1:1'}, {...input,locale:'fr'},
  {...input,fictionalSceneConsent:false}, {...input,theme:'personal'}]){
  assert.throws(()=>normalizePaidVideoOrder(bad),/INVALID_PAID_VIDEO_ORDER/);
 }
});
test('receipt requires exact admin proof shape, never customer reference alone',()=>{
 const q={action:'verify',orderId:id,expectedRevision:0,amountMinor:300,
  receiptSource:'paypal_transaction',receiptReference:'PAYPAL-REAL-123456',confirmed:true};
 assert.equal(normalizePaidVideoReceipt(q).reference,'PAYPAL-REAL-123456');
 for(const bad of [{...q,receiptReference:'1'}, {...q,confirmed:false},
  {...q,receiptSource:'screenshot'}, {...q,expectedRevision:-1},
  {...q,userConfirmedPaid:true}])
  assert.throws(()=>normalizePaidVideoReceipt(bad),/INVALID_PAID_VIDEO_ORDER/);
});
test('all paid flags are disabled by default and rate proof expires',()=>{
 const env={HH_VIDEO_PAID_ORDERS_SCHEMA_APPROVED:'true',
  HH_VIDEO_PAID_ORDERS_ENABLED:'true',HH_VIDEO_PAID_PROVIDER_ENABLED:'true',
  HH_VEO_PAID_ENABLED:'true',HH_VIDEO_VEO_USD_CENTS_PER_SECOND:'5',
  HH_VIDEO_VEO_RATE_VERIFIED_UNTIL:'2026-11-19T00:00:00Z',
  HH_VEO_GCP_PROJECT_ID:'test-project-2026',
  HH_VEO_GCS_OUTPUT_URI:'gs://private-test-bucket/ai/',
  HH_VEO_SERVICE_ACCOUNT_JSON:'test-not-a-real-secret'};
 const now=Date.parse('2026-11-17T12:00:00Z');
 assert.equal(paidVideoFlags().providerReady,false);
 assert.equal(paidVideoFlags(env,now).providerReady,true);
 for(const key of Object.keys(env))
  assert.equal(paidVideoFlags({...env,[key]:undefined},now).providerReady,false,key);
 assert.equal(paidVideoFlags({...env,HH_VIDEO_VEO_RATE_VERIFIED_UNTIL:'2026-10-01T00:00:00Z'},now).providerReady,false);
 assert.equal(paidVideoFlags({...env,HH_VIDEO_VEO_RATE_VERIFIED_UNTIL:'2026-12-25T00:00:00Z'},now).providerReady,false);
});
test('new pipeline extends previous job ledger rather than inventing a second',()=>{
 const sql=read('supabase/migrations/20261117120000_hh_video_paid_hybrid_orders_v1.sql');
 const admin=read('app/api/admin/videos/paid-orders/route.js');
 const client=read('app/api/app/video-paid/orders/route.js');
 const service=read('lib/mandala/video-paid-orders.js');
 assert.match(sql,/alter table app_private\.video_generation_jobs/);
 assert.match(sql,/create unique index video_generation_paid_shot_unique/);
 assert.match(sql,/force row level security/);
 assert.match(sql,/video_generation_jobs_source_exclusive/);
 assert.match(sql,/video_paid_job_insert_guard/);
 assert.equal(sql.split('as $$').length-1,2);
 assert.equal(sql.split('end $$;').length-1,2);
 assert.match(sql,/hh_video_paid_qa_exact_asset_read/);
 assert.match(sql,/hh.video_paid_qa_video_id/);
 assert.doesNotMatch(sql,/create table app_private\.video_generation_jobs/);
 assert.match(admin,/requireAdminRequest\(\)/);
 assert.match(admin,/VIDEO_OWNER_RECONCILIATION_REQUIRED/);
 assert.match(admin,/service\.reserveScene\(actor,input\)/);
 assert.match(client,/createRequestAuth/);
 assert.match(client,/requireSameOrigin/);
 assert.match(service,/VIDEO_PAYMENT_NOT_VERIFIED/);
 assert.match(service,/VIDEO_SCENE_STATE_CONFLICT/);
 assert.match(service,/VIDEO_PRIVATE_MASTER_NOT_VERIFIED/);
 assert.doesNotMatch(service,/video_agent_generate|createDeployment|vercel --prod/);
});
test('30-second delivery requires owner QA and existing private master',()=>{
 const service=read('lib/mandala/video-paid-orders.js');
 assert.match(service,/status!=='ready'/);
 assert.match(service,/duration_seconds!==30/);
 assert.match(service,/v\.status/);
 assert.match(service,/set_config\('hh.video_paid_qa_order_id'/);
 assert.match(service,/set_config\('hh.video_paid_qa_video_id'/);
 assert.match(service,/qaManifestSha256/);
});

import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=readFileSync(new URL("../lib/mandala/video-gift-heygen.mjs",import.meta.url),"utf8");
const adapter=await import("data:text/javascript;base64,"+
  Buffer.from(src.replace('import "server-only";',"")).toString("base64"));
const validEnv={
  HH_VIDEO_GIFT_PAID_ENABLED:"true",
  HH_VIDEO_GIFT_PAYMENT_GATE_VERIFIED:"true",
  HH_VIDEO_GIFT_PROVIDER_5S_USD_CENTS:"10",
  HH_VIDEO_GIFT_PER_JOB_LIMIT_USD_CENTS:"15",
  HH_VIDEO_GIFT_MONTHLY_BUDGET_USD_CENTS:"30",
  HEYGEN_API_KEY:"test-key-not-real"
};
const validJob={
 idempotency_key:"123e4567-e89b-42d3-a456-426614174000",
 mode:"heygen",provider:"heygen",provider_model:"heygen-video-1",
 ai_seconds:5,status:"processing",provider_claimed_at:new Date().toISOString(),
 payment_verified_at:new Date().toISOString(),payment_receipt_digest:"a".repeat(64),
 rights_confirmed:true,source_owner:"other",subject_consent:true,
 guardian_consent:false,consent_recorded_at:new Date().toISOString(),
 max_job_usd_cents:15,estimate_usd_cents:10,motion:"smile"
};
test("provider is off by default and when any budget or payment gate is missing",()=>{
 assert.equal(adapter.heyGenVideoGiftSettings({}).enabled,false);
 for(const key of Object.keys(validEnv)){
  const env={...validEnv};delete env[key];
  assert.equal(adapter.heyGenVideoGiftSettings(env).enabled,false,"missing "+key);
 }
});
test("one 5s i2v API call has a stable idempotency key and safe fixed prompt",async()=>{
 let calls=0;
 const fetchImpl=async(url,request)=>{
  calls++;
  assert.equal(url,"https://api.heygen.com/v3/models/videos");
  assert.equal(request.method,"POST");
  assert.equal(request.headers["Idempotency-Key"],validJob.idempotency_key);
  const body=JSON.parse(request.body);
  assert.equal(body.mode,"image_to_video");
  assert.equal(body.duration,5);
  assert.equal(body.resolution,"480p");
  assert.deepEqual(body.image,{type:"asset_id",asset_id:"ASSET_1234567"});
  assert.doesNotMatch(body.prompt,/София|email|phone|medical/);
  return {ok:true,status:202,json:async()=>({video_id:"abc_12345678"})};
 };
 const result=await adapter.submitHeyGenVideoGiftFragment({
  job:validJob,assetId:"ASSET_1234567",remainingMonthlyUsdCents:20
 },{env:validEnv,fetchImpl});
 assert.equal(calls,1);assert.equal(result.providerJobId,"abc_12345678");
});
test("rejected proof, missing person consent or budget never calls provider",async()=>{
 let calls=0;const fetchImpl=async()=>{calls++;throw new Error("unexpected provider network");};
 for(const job of [
  {...validJob,subject_consent:false},
  {...validJob,source_owner:"minor",guardian_consent:false},
  {...validJob,payment_verified_at:null},
  {...validJob,provider_claimed_at:null},
  {...validJob,estimate_usd_cents:50},
 ]){
  await assert.rejects(()=>adapter.submitHeyGenVideoGiftFragment({
    job,assetId:"ASSET_1234567",remainingMonthlyUsdCents:20
  },{env:validEnv,fetchImpl}));
 }
 await assert.rejects(()=>adapter.submitHeyGenVideoGiftFragment({
  job:validJob,assetId:"ASSET_1234567",remainingMonthlyUsdCents:0
 },{env:validEnv,fetchImpl}));
 assert.equal(calls,0);
});
test("unknown provider response is never reported as success",async()=>{
 await assert.rejects(()=>adapter.submitHeyGenVideoGiftFragment({
  job:validJob,assetId:"ASSET_1234567",remainingMonthlyUsdCents:20
 },{env:validEnv,fetchImpl:async()=>{throw Error("network lost");}}),/GIFT_PROVIDER_RESULT_UNKNOWN/);
});

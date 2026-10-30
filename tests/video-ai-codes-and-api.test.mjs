import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 VIDEO_AI_CATALOG,videoAiEnabled,buildVideoAiRequest,
 submitVideoAiJob,readVideoAiJob,fetchVideoAiContent,getVideoAiProviderInfo
} from "../lib/mandala/video-ai-heygen.mjs";
import {
 mintVideoCode,normalizeVideoCode,hashVideoCode,sameVideoCodeHash,
 validateVideoCodeIssue,safeVideoRequestHash
} from "../lib/mandala/video-redemption.mjs";
const secret="a".repeat(42),key="heygen_test_api_".repeat(3);
const jobKey="246aa1a3-a371-5a83-9f4b-cd23ff027a76";
const input={tier:"smart",visualPrompt:
 "A gentle cinematic camera moves through a warm forest at sunrise",
 aspectRatio:"9:16",consentExternal:true};

test("Smart/Pro fixed price and short HeyGen Video 1 clips at ordinary rates",()=>{
 assert.equal(VIDEO_AI_CATALOG.smart.priceUsd,2);
 assert.equal(VIDEO_AI_CATALOG.pro.priceUsd,9.9);
 const a=buildVideoAiRequest(input);
 assert.equal(a.body.model,"heygen-video-1");
 assert.equal(a.body.mode,"text_to_video");
 assert.equal(a.body.duration,8);
 assert.equal(a.body.resolution,"768p");
 assert.equal(a.body.aspect_ratio,"9:16");
 assert.equal(a.estimateCents,24);
 assert.ok(a.estimateCents<=a.costCeilingCents);
 const b=buildVideoAiRequest({...input,tier:"pro"});
 assert.equal(b.body.duration,15);
 assert.ok(b.estimateCents<=b.costCeilingCents);
 assert.equal(getVideoAiProviderInfo().pausedByDefault,true);
});
test("two independent server-side pause switches and no implicit paid action",()=>{
 const config={HH_VIDEO_PAID_ENABLED:"true",HH_VIDEO_HEYGEN_API_KEY:key,HH_VIDEO_CODE_HMAC_KEY:secret};
 assert.equal(videoAiEnabled(config),false);
 assert.equal(videoAiEnabled({...config,HH_VIDEO_HEYGEN_RELEASE_APPROVED:"true"}),true);
 assert.equal(videoAiEnabled({...config,HH_VIDEO_PAID_ENABLED:"false",HH_VIDEO_HEYGEN_RELEASE_APPROVED:"true"}),false);
 assert.throws(()=>buildVideoAiRequest({...input,consentExternal:false}),/external_consent_required/);
 assert.throws(()=>buildVideoAiRequest({...input,visualPrompt:"Client name me@personal.com"}),/invalid_visual_prompt/);
 assert.throws(()=>buildVideoAiRequest({...input,visualPrompt:"Пациент с диагнозом депрессия"}),/invalid_visual_prompt/);
});
test("single-use HMAC code and owner-verification requirements",()=>{
 const a=mintVideoCode(),b=mintVideoCode();
 assert.notEqual(a,b);
 assert.equal(normalizeVideoCode(a),a.replaceAll("-",""));
 assert.match(hashVideoCode(a,secret),/^[0-9a-f]{64}$/);
 assert.equal(sameVideoCodeHash(hashVideoCode(a,secret),hashVideoCode(a,secret)),true);
 assert.equal(sameVideoCodeHash(hashVideoCode(a,secret),hashVideoCode(b,secret)),false);
 assert.throws(()=>hashVideoCode("abc",secret),/invalid_video_code/);
 assert.throws(()=>validateVideoCodeIssue({tier:"smart",kind:"paid",paymentChannel:"paypal",paymentReference:"ORDER-1234"}),/owner_verification_required/);
 const paid=validateVideoCodeIssue({tier:"smart",kind:"paid",ownerVerified:true,paymentChannel:"paypal",paymentReference:"ORDER-1234"});
 assert.equal(paid.priceCents,200);
 const gift=validateVideoCodeIssue({tier:"smart",kind:"gift",ownerVerified:true,recipientId:jobKey});
 assert.equal(gift.priceCents,0);
 assert.throws(()=>validateVideoCodeIssue({tier:"pro",kind:"gift",ownerVerified:true,recipientId:jobKey}),/gift_smart_only/);
});
test("official HeyGen v3 POST receives a single fixed budgeted request and idempotency key",async()=>{
 const calls=[];
 const mock=async(url,opts)=>{
  calls.push({url,method:opts.method,headers:opts.headers,body:JSON.parse(opts.body)});
  return new Response(JSON.stringify({data:{video_id:"heygen_video_000001",status:"pending"}}),{status:202});
 };
 const result=await submitVideoAiJob(input,{key,jobKey,fetchImpl:mock});
 assert.equal(result.id,"heygen_video_000001");
 assert.equal(result.status,"pending");
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,"https://api.heygen.com/v3/models/videos");
 assert.equal(calls[0].method,"POST");
 assert.equal(calls[0].headers["Idempotency-Key"],jobKey);
 assert.equal(calls[0].headers["x-api-key"],key);
 assert.equal(calls[0].body.duration,8);
 assert.equal(calls[0].body.resolution,"768p");
 assert.equal(calls[0].body.mode,"text_to_video");
 assert.ok(!JSON.stringify(calls[0]).includes("personal profile"));
});
test("HeyGen status polling and media readback use provider-confirmed MP4 only",async()=>{
 const calls=[];
 const mock=async(url,opts)=>{
  calls.push({url,method:opts.method});
  if(url.endsWith("/heygen_video_000001")){
   return new Response(JSON.stringify({status:"completed",video_id:"heygen_video_000001",
    video_url:"https://resource2.heygen.ai/video/one.mp4"}),{status:200});
  }
  assert.equal(url,"https://resource2.heygen.ai/video/one.mp4");
  return new Response(new Uint8Array([0,0,0,24,102,116,121,112]),{
   status:200,headers:{"Content-Type":"video/mp4"}});
 };
 const state=await readVideoAiJob("heygen_video_000001",{key,fetchImpl:mock});
 assert.equal(state.ready,true);
 assert.equal(state.videoReady,true);
 const media=await fetchVideoAiContent("heygen_video_000001",{key,fetchImpl:mock});
 assert.equal(media.headers.get("content-type"),"video/mp4");
 assert.equal(calls.length,3);
 assert.ok(calls.every(c=>c.method==="GET"));
});
test("HeyGen provider failures and unsafe CDN URLs fail closed",async()=>{
 await assert.rejects(submitVideoAiJob(input,{key,jobKey,fetchImpl:async()=>new Response(JSON.stringify({id:"short",status:"pending"}),{status:202})}),/invalid_video_id/);
 const fakeUrl=async()=>new Response(JSON.stringify({
  video_id:"heygen_video_000001",status:"completed",
  video_url:"https://attacker.example.com/payload.mp4",
 }),{status:200});
 await assert.rejects(fetchVideoAiContent("heygen_video_000001",{key,fetchImpl:fakeUrl}),/heygen_asset_url_unavailable/);
 await assert.rejects(submitVideoAiJob(input,{key,fetchImpl:async()=>{throw Error("network")}}),/invalid_idempotency_key/);
});
test("durable one-time code claim before provider submit, owner-only private archive, no public autoplay",()=>{
 const root=new URL("../",import.meta.url);
 const file=p=>readFileSync(new URL(p,root),"utf8");
 const repository=file("lib/mandala/video-ai-repository.js");
 const route=file("app/api/app/videos/generate/route.js");
 const issue=file("app/api/admin/videos/codes/route.js");
 const archived=file("app/api/app/videos/generate/archive/route.js");
 const content=file("app/api/app/videos/generate/content/route.js");
 const studio=file("components/mandala-free-video-studio.tsx");
 const player=file("components/mandala-my-ai-videos.tsx");
 assert.match(repository,/for update/);
 assert.match(repository,/status='claimed'/);
 assert.match(repository,/status='unknown'/);
 assert.match(repository,/storage_state='uploading'/);
 assert.match(route,/await claimVideoCode/);
 assert.match(route,/await submitVideoAiJob/);
 assert.ok(route.indexOf("await claimVideoCode")<route.indexOf("await submitVideoAiJob"));
 assert.match(route,/jobKey:claimed\.jobId/);
 assert.match(route,/requireSameOrigin/);
 assert.match(issue,/requireAdminRequest/);
 assert.match(archived,/consentStore!==true/);
 assert.match(archived,/privateVideoArchiveEnabled\(\)/);
 assert.match(content,/signedPrivateVideoAsset/);
 assert.match(content,/getVideoJob/);
 assert.match(player,/<video controls playsInline preload="none"/);
 assert.match(studio,/data-video-tier-selector/);
 assert.match(studio,/MandalaVideoCodeRedeemer/);
 const fingerprint=safeVideoRequestHash(input);
 assert.match(fingerprint,/^[a-f0-9]{64}$/);
 assert.ok(!fingerprint.includes(input.visualPrompt));
});

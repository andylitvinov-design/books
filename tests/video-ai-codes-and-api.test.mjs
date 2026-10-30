import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  VIDEO_AI_CATALOG,videoAiEnabled,buildVideoAiRequest,submitVideoAiJob,
  readVideoAiJob,fetchVideoAiContent
} from "../lib/mandala/video-ai-openrouter.mjs";
import {
  mintVideoCode,normalizeVideoCode,hashVideoCode,sameVideoCodeHash,
  validateVideoCodeIssue,safeVideoRequestHash
} from "../lib/mandala/video-redemption.mjs";

const secret="a".repeat(42),key="fake_".repeat(12);
const input={tier:"smart",visualPrompt:
  "Gentle cinematic camera passing through a bright forest into a sunrise",
  aspectRatio:"9:16",consentExternal:true};

test("Smart $2 and Pro $9.90 budget worst-case NORMAL provider pricing",()=>{
  assert.equal(VIDEO_AI_CATALOG.smart.priceUsd,2);
  assert.equal(VIDEO_AI_CATALOG.pro.priceUsd,9.9);
  const s=buildVideoAiRequest(input);
  assert.equal(s.body.model,"heygen/heygen-video-1");
  assert.equal(s.body.duration,8);
  assert.equal(s.body.resolution,"768p");
  assert.equal(s.estimateCents,32);
  assert.ok(s.costCeilingCents<100);
  assert.equal(s.body.generate_audio,false);
  const p=buildVideoAiRequest({...input,tier:"pro"});
  assert.equal(p.body.duration,15);
  assert.ok(p.estimateCents<=p.costCeilingCents);
  assert.throws(()=>buildVideoAiRequest({...input,tier:"premium"}),/invalid_video_tier/);
});
test("no paid request without explicit third-party consent or safe visual prompt",()=>{
  assert.throws(()=>buildVideoAiRequest({...input,consentExternal:false}),/external_consent_required/);
  assert.throws(()=>buildVideoAiRequest({...input,visualPrompt:"Client email me@personal.com and their session"}),/invalid_visual_prompt/);
  assert.throws(()=>buildVideoAiRequest({...input,visualPrompt:"Медицинская карта пациента и диагноз"}),/invalid_visual_prompt/);
  assert.equal(videoAiEnabled({}),false);
  assert.equal(videoAiEnabled({HH_VIDEO_PAID_ENABLED:"true",
    HH_VIDEO_OPENROUTER_API_KEY:key,HH_VIDEO_CODE_HMAC_KEY:secret}),true);
});
test("one-time code is cryptographically random, opaque, HMAC hashed, and not guessable",()=>{
  const a=mintVideoCode(),b=mintVideoCode();
  assert.notEqual(a,b);
  assert.equal(normalizeVideoCode(a),a.replaceAll("-",""));
  const h=hashVideoCode(a,secret);
  assert.match(h,/^[0-9a-f]{64}$/);
  assert.ok(!h.includes(a.replaceAll("-","")));
  assert.equal(hashVideoCode(a,secret),h);
  assert.equal(sameVideoCodeHash(h,h),true);
  assert.equal(sameVideoCodeHash(h,hashVideoCode(b,secret)),false);
  assert.throws(()=>hashVideoCode("1234",secret),/invalid_video_code/);
  assert.throws(()=>hashVideoCode(a,"short"),/video_code_secret_missing/);
});
test("owner verification, payment receipts, and one gift per specific account are required",()=>{
  assert.throws(()=>validateVideoCodeIssue({tier:"smart",kind:"paid",
    paymentChannel:"paypal",paymentReference:"PAID123456"}),/owner_verification_required/);
  assert.throws(()=>validateVideoCodeIssue({tier:"smart",kind:"paid",
    ownerVerified:true,paymentChannel:"paypal",paymentReference:""}),/verified_payment_reference_required/);
  const paid=validateVideoCodeIssue({tier:"smart",kind:"paid",ownerVerified:true,
    paymentChannel:"paypal",paymentReference:"PAYPAL-125456"});
  assert.equal(paid.priceCents,200);
  assert.equal(paid.kind,"paid");
  const gift=validateVideoCodeIssue({tier:"smart",kind:"gift",ownerVerified:true,
    recipientId:"246aa1a3-a371-5a83-9f4b-cd23ff027a76"});
  assert.equal(gift.priceCents,0);
  assert.equal(gift.recipientId.length,36);
  assert.throws(()=>validateVideoCodeIssue({tier:"pro",kind:"gift",ownerVerified:true,
    recipientId:"246aa1a3-a371-5a83-9f4b-cd23ff027a76"}),/gift_smart_only/);
  assert.throws(()=>validateVideoCodeIssue({tier:"smart",kind:"gift",ownerVerified:true}),
    /gift_recipient_required/);
});
test("provider: one POST to official OpenRouter async video API; no pay on preflight",async()=>{
  const calls=[];
  const fetchImpl=async(url,options)=>{
    calls.push({url,method:options.method,auth:options.headers.Authorization,
      payload:JSON.parse(options.body)});
    return new Response(JSON.stringify({id:"job-abc12345",status:"pending"}),
      {status:202,headers:{"Content-Type":"application/json"}});
  };
  const result=await submitVideoAiJob(input,{key,fetchImpl});
  assert.equal(result.id,"job-abc12345");
  assert.equal(result.status,"pending");
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,"https://openrouter.ai/api/v1/videos");
  assert.equal(calls[0].method,"POST");
  assert.equal(calls[0].payload.duration,8);
  assert.equal(calls[0].payload.aspect_ratio,"9:16");
  assert.equal(calls[0].payload.generate_audio,false);
  assert.ok(calls[0].auth.startsWith("Bearer "));
});
test("provider status is polled read-only and completed video is fetched by authenticated server proxy",async()=>{
  const a=await readVideoAiJob("job-abc12345",{key,fetchImpl:async(url,opts)=>{
    assert.equal(opts.method,"GET");
    assert.ok(url.endsWith("/videos/job-abc12345"));
    return new Response(JSON.stringify({id:"job-abc12345",status:"completed"}),
      {headers:{"Content-Type":"application/json"}});
  }});
  assert.equal(a.ready,true);
  const r=await fetchVideoAiContent("job-abc12345",{key,fetchImpl:async(url,opts)=>{
    assert.ok(url.endsWith("/videos/job-abc12345/content?index=0"));
    assert.equal(opts.headers.Authorization,"Bearer "+key);
    return new Response(new Uint8Array([0,0,0,24]),{headers:{"Content-Type":"video/mp4"}});
  }});
  assert.equal(r.headers.get("content-type"),"video/mp4");
});
test("malformed provider replies reject instead of fabricating a video link",async()=>{
  await assert.rejects(submitVideoAiJob(input,{key,fetchImpl:async()=>
    new Response(JSON.stringify({id:"wrong",status:"pending"}),{status:202})}),
    /invalid_video_job_id/);
  await assert.rejects(fetchVideoAiContent("job-abc12345",{key,fetchImpl:async()=>
    new Response("<html/>",{headers:{"Content-Type":"text/html"}})}),
    /video_content_unavailable/);
});
test("protected API routes use verified user, same-origin, durable claim then submit",()=>{
  const base=new URL("../",import.meta.url);
  const path=relative=>readFileSync(new URL(relative,base),"utf8");
  const repo=path("lib/mandala/video-ai-repository.js");
  const submit=path("app/api/app/videos/generate/route.js");
  const issue=path("app/api/admin/videos/codes/route.js");
  const content=path("app/api/app/videos/generate/content/route.js");
  assert.match(repo,/for update/);
  assert.match(repo,/status='claimed'/);
  assert.match(repo,/original\.id/);
  assert.match(repo,/status='unknown'/);
  assert.match(submit,/await claimVideoCode/);
  assert.match(submit,/await submitVideoAiJob/);
  assert.ok(submit.indexOf("await claimVideoCode")<submit.indexOf("await submitVideoAiJob"));
  assert.match(submit,/requireSameOrigin/);
  assert.match(submit,/auth\.verified\(\)/);
  assert.match(submit,/consumeRate/);
  assert.match(issue,/requireAdminRequest/);
  assert.match(issue,/ownerVerified/);
  assert.match(content,/getVideoJob/);
  assert.match(content,/job\.status!=="completed"/);
  assert.match(content,/fetchVideoAiContent/);
  const fingerprint=safeVideoRequestHash(input);
  assert.match(fingerprint,/^[a-f0-9]{64}$/);
  assert.ok(!fingerprint.includes(input.visualPrompt));
});

import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  CINEMATIC_THEMES,CINEMATIC_STYLES,CINEMATIC_PLAN_VERSION,
  buildCinematicStoryboard,findCinematicShot,safeCinematicPrompt,
} from "../lib/mandala/cinematic-director.mjs";
import {
  CINEMATIC_PROVIDER_CATALOG,listCinematicRoutes,evaluateCinematicSpend,
  draftCinematicJob,advanceCinematicJob,buildCinematicAssemblyManifest,
} from "../lib/mandala/cinematic-production.mjs";
import {validateAssemblyInput,buildFfmpegArgs} from "../scripts/cinematic-video-assemble.mjs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const studio=read("components/mandala-free-video-studio.tsx");
const directorUI=read("components/mandala-cinematic-director.tsx");
const css=read("components/mandala-cinematic-director.module.css");
const prefix="hidden-PRIVATE-test-score-417";
const jobArgs={id:"cinema_job_unique_123",idempotencyKey:"cinema_idempotency_unique_456",
  provider:"kling_turbo",scope:"approved_public",planVersion:CINEMATIC_PLAN_VERSION};

test("six existing themes, EN/RU/ES and four distinct contiguous licensed-safe shots",()=>{
  assert.equal(CINEMATIC_THEMES.length,6);
  assert.equal(Object.keys(CINEMATIC_STYLES).length,4);
  for(const locale of ["en","ru","es"])for(const theme of CINEMATIC_THEMES){
    for(const durationSeconds of [20,30,60]){
      const p=buildCinematicStoryboard({locale,theme,durationSeconds,style:"nature",aspect:"portrait"});
      assert.equal(p.version,CINEMATIC_PLAN_VERSION);
      assert.equal(p.shotCount,4);
      assert.equal(p.durationSeconds,durationSeconds);
      assert.equal(p.shots.length,4);
      assert.deepEqual(p.shots.map(x=>x.number),[1,2,3,4]);
      assert.equal(new Set(p.shots.map(x=>x.sceneId)).size,4);
      assert.equal(p.shots.reduce((sum,shot)=>sum+shot.durationSeconds,0),durationSeconds);
      assert.ok(p.shots.every((shot,i)=>shot.theme===theme&&shot.startSeconds===
        p.shots.slice(0,i).reduce((sum,x)=>sum+x.durationSeconds,0)));
      assert.equal(p.noExternalClientData,true);
      assert.equal(p.paidRenderApproved,false);
    }
  }
});
test("user wish influences the curated scene order without entering any provider prompt",()=>{
  const p=buildCinematicStoryboard({locale:"ru",theme:"money",style:"dream",
    wish:"Хочу "+prefix+" c рассветом и доходом",avoid:"избегать темноты "+prefix});
  assert.equal(p.shots[2].sceneId,"wealth-sunrise");
  assert.equal(new Set(p.shots.map(s=>s.sceneId)).size,4);
  const prompts=p.shots.map(s=>s.providerPrompt).join(" ");
  assert.doesNotMatch(prompts,/hidden-PRIVATE|доходом|Хочу|избегать|тест/i);
  assert.ok(p.shots.every((s,i)=>safeCinematicPrompt(p,i+1)===s.providerPrompt));
  const malicious=structuredClone(p);
  malicious.shots[0].providerPrompt=prefix;
  assert.throws(()=>safeCinematicPrompt(malicious,1),/invalid_cinematic_shot/);
});
test("visual avoid rules do not leak private text or force an untrusted prompt",()=>{
  const p=buildCinematicStoryboard({theme:"health",locale:"en",wish:prefix,
    avoid:"water, ocean, stream "+prefix});
  assert.ok(p.shots.every(s=>!s.providerPrompt.includes(prefix)));
  assert.ok(p.shots.some(s=>s.sceneId==="morning-dew"));
  assert.throws(()=>buildCinematicStoryboard({theme:"clinic-UNKNOWN"}),/invalid_cinematic_theme/);
  assert.equal(findCinematicShot(p.shots,0)?.number,1);
  assert.equal(findCinematicShot(p.shots,p.durationSeconds)?.number,4);
  assert.equal(findCinematicShot([],4),null);
});
test("client-private external provider is always blocked; no fabricated price or enabled paid CTA",()=>{
  const list=listCinematicRoutes({visibility:"client_private",capabilities:{kling_turbo:true,runway:true}});
  assert.equal(list.find(x=>x.id==="local").status,"local_ready");
  assert.ok(list.filter(x=>x.id!=="local").every(x=>x.status==="private_content_blocked"&&
    x.canSubmit===false&&x.priceMinor===null));
  assert.ok(Object.keys(CINEMATIC_PROVIDER_CATALOG).includes("heygen_owner"));
  assert.equal(evaluateCinematicSpend({provider:"kling_turbo",visibility:"client_private",
    configured:true,serverEnabled:true}).reason,"private_content_blocked");
  assert.equal(evaluateCinematicSpend({provider:"kling_turbo",visibility:"approved_public",
    configured:true,serverEnabled:false}).reason,"provider_disabled");
  assert.equal(evaluateCinematicSpend({provider:"runway",visibility:"approved_public",
    configured:true,serverEnabled:true,commercialRightsVerified:true}).reason,"verified_quote_required");
});
test("theoretical paid gate requires server quote, owner cap, commercial rights and verified payment",()=>{
  const base={provider:"kling_turbo",visibility:"approved_public",configured:true,serverEnabled:true,
    commercialRightsVerified:true,quote:{totalMinor:400,currency:"EUR",verifiedByServer:true,
      expiresAt:Date.now()+60000,providerQuoteId:"quote_verified_1234"},
    ownerApproval:{approved:true,maxMinor:500,currency:"EUR",approvalId:"owner_approval_1234"},
    order:{verifiedByServer:true,totalMinor:400,currency:"EUR",receiptId:"receipt_server_1234"}};
  assert.equal(evaluateCinematicSpend(base).allowed,true);
  assert.equal(evaluateCinematicSpend({...base,quote:{...base.quote,totalMinor:900}}).allowed,false);
  assert.equal(evaluateCinematicSpend({...base,order:{...base.order,verifiedByServer:false}}).allowed,false);
  assert.equal(evaluateCinematicSpend({...base,commercialRightsVerified:false}).allowed,false);
});
test("job state machine requires real provider id, hash, owner approval and delivery proof",()=>{
  const base=draftCinematicJob(jobArgs);
  assert.equal(base.status,"draft");
  assert.throws(()=>advanceCinematicJob(base,"submitted"),/invalid_cinematic_transition/);
  const quoted=advanceCinematicJob(base,"quoted");
  assert.throws(()=>advanceCinematicJob(quoted,"approved"),/owner_approval_required/);
  const approved=advanceCinematicJob(quoted,"approved",{ownerApproved:true});
  assert.throws(()=>advanceCinematicJob(approved,"payment_verified"),/verified_payment_required/);
  const verified=advanceCinematicJob(approved,"payment_verified",
    {verifiedPayment:true,receiptId:"receipt_server_1234"});
  assert.throws(()=>advanceCinematicJob(verified,"submitted"),/provider_job_receipt_required/);
  const submitted=advanceCinematicJob(verified,"submitted",{providerJobId:"provider_task_1234"});
  assert.throws(()=>advanceCinematicJob(submitted,"provider_ready"),/stored_master_checksum_required/);
  const mastered=advanceCinematicJob(submitted,"provider_ready",{assetSha256:"a".repeat(64)});
  assert.throws(()=>advanceCinematicJob(mastered,"qa_passed"),/media_qa_required/);
  const qa=advanceCinematicJob(mastered,"qa_passed",{qaApproved:true});
  assert.throws(()=>advanceCinematicJob(qa,"delivered"),/actual_delivery_required/);
  const delivered=advanceCinematicJob(qa,"delivered",{privateDeliveryVerified:true});
  assert.equal(delivered.status,"delivered");
  assert.equal(delivered.revision,7);
});
test("free montage manifest always has a bounded, contiguous timeline and explicit sound rights",()=>{
  const p=buildCinematicStoryboard({theme:"relationships",locale:"es",durationSeconds:30});
  const m=buildCinematicAssemblyManifest(p);
  assert.equal(m.clips.length,4);
  assert.equal(m.durationSeconds,30);
  assert.equal(m.renderMode,"local_canvas_preview");
  assert.equal(m.storage,"device_only");
  assert.equal(m.publicationApproved,false);
  assert.throws(()=>buildCinematicAssemblyManifest(p,{audio:"user_approved"}),/audio_rights_required/);
  assert.equal(buildCinematicAssemblyManifest(p,{audio:"user_approved",licensedAudio:true}).rightsConfirmed,true);
});
test("no-cost offline FFmpeg assembler validates local rights and builds explicit H264/AAC graph",()=>{
  const input={version:"hh-assembly-1",locale:"ru",aspect:"landscape",audioMode:"narration_with_music",
    clips:[1,2,3,4].map(i=>({file:"clip-"+i+".mp4",seconds:5,rightsConfirmed:true})),
    narration:{file:"narration.wav",rightsConfirmed:true},music:{file:"music.wav",rightsConfirmed:true}};
  assert.equal(validateAssemblyInput(input).seconds,20);
  const cmd=buildFfmpegArgs(input,{clips:input.clips.map(x=>x.file),
    narration:"narration.wav",music:"music.wav"},"out.mp4");
  assert.ok(cmd.includes("libx264"));assert.ok(cmd.includes("+faststart"));
  assert.ok(cmd.some(x=>x.includes("amix=inputs=2")));
  assert.ok(cmd.some(x=>x.includes("concat=n=4")));
  assert.ok(!cmd.includes("-y"));
  assert.throws(()=>validateAssemblyInput({...input,music:{file:"music.wav",rightsConfirmed:false}}),
    /invalid_cinematic_assembly/);
  assert.throws(()=>validateAssemblyInput({...input,clips:[{...input.clips[0],seconds:999}]}),
    /invalid_cinematic_assembly/);
});
test("same iPhone editor records actual four-shot canvas montage without sending private brief",()=>{
  assert.match(studio,/MandalaCinematicDirector/);
  assert.match(studio,/onApplyStoryboard=\{plan=>\{/);
  assert.match(studio,/setCinematicPlan\(plan\)/);
  assert.match(studio,/paintCinematicFrame\(ctx,image,effect,Math\.min\(duration/);
  assert.match(studio,/const activeFilm = cinematicPlan \? null/);
  assert.match(studio,/setCinematicPlan\(null\)/);
  assert.match(studio,/data-mandala-video-generate/);
  assert.match(directorUI,/data-director-create-plan/);
  assert.match(directorUI,/data-director-storyboard/);
  assert.match(directorUI,/data-director-apply-montage/);
  assert.match(directorUI,/data-director-provider-quote/);
  assert.doesNotMatch(directorUI,/fetch\(|localStorage|sessionStorage|sendBeacon|\.upload\(/);
  assert.match(css,/@media\(max-width:360px\)/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

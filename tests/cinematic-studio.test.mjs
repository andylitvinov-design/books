import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  CINEMATIC_THEMES,CINEMATIC_STYLES,CINEMATIC_PLAN_VERSION,
  buildCinematicStoryboard,customizeCinematicShot,cinematicPreviewSeconds,findCinematicShot,safeCinematicPrompt,
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
    for(const durationSeconds of [20,30]){
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
test("a one-minute montage has six distinct contiguous shots and a valid manifest",()=>{
  for(const locale of ["en","ru","es"])for(const theme of CINEMATIC_THEMES){
    const plan=buildCinematicStoryboard({locale,theme,durationSeconds:60});
    assert.equal(plan.shotCount,6);
    assert.equal(new Set(plan.shots.map(shot=>shot.sceneId)).size,6);
    assert.equal(plan.shots.reduce((sum,shot)=>sum+shot.durationSeconds,0),60);
    assert.equal(buildCinematicAssemblyManifest(plan).clips.length,6);
    assert.equal(cinematicPreviewSeconds(plan,61),1);
    assert.ok(safeCinematicPrompt(plan,6));
  }
});
test("a fifteen-second brief keeps its explicitly selected duration",()=>{
  const plan=buildCinematicStoryboard({locale:"en",theme:"energy",style:"warm",durationSeconds:15});
  assert.equal(plan.durationSeconds,15);
  assert.equal(plan.shots.at(-1)?.startSeconds+plan.shots.at(-1)?.durationSeconds,15);
  assert.match(studio,/const durations = \[10, 15, 20, 30, 60\] as const/);
});
test("brief audio and caption choices reuse existing local controls without rendering",()=>{
  assert.match(directorUI,/onMusicPreference/);
  assert.match(directorUI,/onCaptionPreference/);
  assert.match(studio,/onMusicPreference=\{choice=>/);
  assert.match(studio,/choice==="calm"\?"meditation":choice==="energetic"\?"energy":"none"/);
  assert.match(studio,/onCaptionPreference=\{choice=>setCaptionMode\(choice==="none"\?"none":"theme"\)\}/);
  assert.doesNotMatch(directorUI,/fetch\(["']https?:\/\/|sendBeacon/);
});
test("long-running cinematic preview loops actual scene times and synchronized affirmations",()=>{
  const film=buildCinematicStoryboard({theme:"money",durationSeconds:20,locale:"ru"});
  assert.equal(cinematicPreviewSeconds(film,0),0);
  assert.equal(cinematicPreviewSeconds(film,5),5);
  assert.equal(cinematicPreviewSeconds(film,19.999),19.999);
  assert.equal(cinematicPreviewSeconds(film,20),0,"start scene one on the next preview loop");
  assert.equal(cinematicPreviewSeconds(film,25),5);
  assert.equal(cinematicPreviewSeconds(film,47),7);
  assert.equal(cinematicPreviewSeconds(film,NaN),0);
  assert.equal(cinematicPreviewSeconds(film,-1),0);
  assert.equal(cinematicPreviewSeconds(null,2),0);
  assert.equal(findCinematicShot(film.shots,cinematicPreviewSeconds(film,22))?.number,1);
  assert.equal(findCinematicShot(film.shots,cinematicPreviewSeconds(film,28))?.number,2);
  assert.match(studio,/const filmSecond=storyboard\?cinematicPreviewSeconds\(storyboard,time\):time/);
  assert.match(studio,/const frameSecond=cinematicPlan\?cinematicPreviewSeconds\(cinematicPlan,elapsed\):elapsed/);
  assert.match(studio,/paintVideoAffirmations\(ctx,frameSecond,affirmationLines,affirmations\)/,
    "looping visual stage and timed affirmations must share one clock");
  assert.match(studio,/paintCinematicFrame\(ctx,image,effect,Math\.min\(duration/,
    "final encoded video still uses the original bounded timeline");
});

test("storyboard scene selectors show real localized scene names without touching safe export prompts",()=>{
  assert.match(directorUI,/function sceneDisplayName\(theme:VideoTheme,sceneId:string,locale:PublicLocale\)/);
  assert.match(directorUI,/moneyScenes\.find\(item=>item\.id===sceneId\)\?\.label\[locale\]/);
  assert.match(directorUI,/otherVideoScenes\[theme\]\.find\(item=>item\.id===sceneId\)\?\.label\[locale\]/);
  assert.match(directorUI,/sceneDisplayName\(shot\.theme,shot\.sceneId,locale\)/);
  assert.match(directorUI,/sceneDisplayName\(item\.theme,item\.sceneId,locale\)/);
  assert.match(directorUI,/data-director-scene-choice=\{shot.number\}/);
  const plan=buildCinematicStoryboard({theme:"money",locale:"ru",wish:"достойная оплата"});
  assert.match(plan.shots[2].providerPrompt,/cinematic|natural|scene/i);
  assert.doesNotMatch(JSON.stringify(plan),/достойная оплата/);
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
test("detailed client requests choose a matching APPROVED scene, not just the four defaults",()=>{
  const cases=[
    {theme:"money",locale:"ru",wish:"Хочу достойную оплату за мой труд",scene:"money-magnet"},
    {theme:"money",locale:"en",wish:"I need more customers and partners",scene:"partners"},
    {theme:"energy",locale:"ru",wish:"Мне нужен отдых и расслабление",scene:"light-waterfall"},
    {theme:"energy",locale:"en",wish:"Breathe freely in the mountain air",scene:"mountain-air"},
    {theme:"life",locale:"en",wish:"Flowers blooming in spring",scene:"wildflower-dance"},
    {theme:"health",locale:"es",wish:"Necesito descanso y relax",scene:"gentle-falls"},
  ];
  for(const {theme,locale,wish,scene} of cases){
    const p=buildCinematicStoryboard({theme,locale,wish,aspect:"landscape"});
    assert.equal(p.shots[2].sceneId,scene,theme+" must be responsive to user words");
    assert.equal(new Set(p.shots.map(s=>s.sceneId)).size,4,"all four shots stay distinct");
    assert.ok(p.shots.every(s=>s.providerPrompt===safeCinematicPrompt(p,s.number)));
    assert.ok(!JSON.stringify(p).includes(wish),"raw personal prompt never enters exported storyboard");
  }
});

test("shot choices reject untrusted motifs, swap without duplicates, and never reuse stale client words",()=>{
  for(const theme of CINEMATIC_THEMES){
    const plan=buildCinematicStoryboard({locale:"ru",theme,wish:prefix,avoid:"ocean and river"});
    assert.ok(plan.sceneChoices.length>=4);
    const initial=plan.shots.map(x=>x.sceneId);
    const swap=customizeCinematicShot(plan,1,initial[3]);
    assert.equal(swap.shots[0].sceneId,initial[3]);
    assert.equal(swap.shots[3].sceneId,initial[0]);
    assert.equal(plan.shots[0].sceneId,initial[0],"original plan is immutable");
    assert.equal(new Set(swap.shots.map(x=>x.sceneId)).size,4);
    assert.equal(swap.shots.reduce((n,x)=>n+x.durationSeconds,0),plan.durationSeconds);
    assert.ok(swap.shots.every(x=>safeCinematicPrompt(swap,x.number)===x.providerPrompt));
    const extra=plan.sceneChoices.find(x=>!initial.includes(x.sceneId));
    if(extra){
      const changed=customizeCinematicShot(plan,2,extra.sceneId);
      assert.equal(changed.shots[1].sceneId,extra.sceneId);
      assert.equal(new Set(changed.shots.map(x=>x.sceneId)).size,4);
    }
    assert.throws(()=>customizeCinematicShot(plan,2,"untrusted-client-prompt"),/unapproved_cinematic_scene/);
    assert.throws(()=>customizeCinematicShot(plan,5,initial[0]),/invalid_cinematic_edit/);
    assert.ok(!JSON.stringify(swap).includes(prefix));
  }
  assert.match(directorUI,/data-director-scene-choice=\{shot\.number\}/);
  assert.match(directorUI,/onInvalidateStoryboard\(\)/);
  assert.match(studio,/onInvalidateStoryboard=\{\(\)=>setCinematicPlan\(null\)\}/);
});
test("therapy-mode storyboards require practitioner review and make no autonomous treatment claims",()=>{
  const privateTherapy=buildCinematicStoryboard({theme:"energy",locale:"ru",
    wish:"У меня стресс и напряжение",mode:"therapy"});
  assert.equal(privateTherapy.requiresPractitionerReview,true);
  assert.equal(privateTherapy.paidRenderApproved,false);
  assert.equal(privateTherapy.noExternalClientData,true);
  assert.equal(buildCinematicStoryboard({theme:"energy",mode:"creative"}).requiresPractitionerReview,false);
  assert.match(studio,/therapyMode=\{studioMode==="therapy"\}/);
  assert.match(directorUI,/data-director-therapy-review/);
  assert.match(directorUI,/customPlan\.requiresPractitionerReview===therapyMode/);
  assert.match(directorUI,/generated && generatedMode===therapyMode/);
  assert.match(studio,/setCinematicPlan\(null\);setNotice\(""\);/);
});
test("visual avoid rules do not leak private text or force an untrusted prompt",()=>{
  const p=buildCinematicStoryboard({theme:"health",locale:"en",wish:prefix,
    avoid:"water, ocean, stream "+prefix});
  assert.ok(p.shots.every(s=>!s.providerPrompt.includes(prefix)));
  assert.ok(p.shots.some(s=>s.sceneId==="morning-dew"));
  assert.equal(new Set(p.shots.map(s=>s.sceneId)).size,4,
    "avoidance cannot quietly give four copies of the same artwork");
  assert.ok(p.shots.every(s=>!/(?:ocean|sea|water|coast|stream|wave)/i.test(s.visualCue)),
    "water avoidance must hold even when the selected health theme has few safe scenes");
  assert.ok(p.shots.some(s=>s.theme!=="health"),
    "a real, separately identified first-party motif should cover a narrow category");
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
  for(const totalMinor of [Infinity,NaN,'400',0,-1,400.5,1000001]) {
    assert.equal(evaluateCinematicSpend({...base,order:{...base.order,totalMinor}}).allowed,false,
      'paid gate requires a finite positive bounded integer amount: '+String(totalMinor));
  }
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
  assert.throws(()=>advanceCinematicJob(approved,"payment_verified",
    {verifiedPayment:true}),/payment_receipt_required/);
  assert.throws(()=>advanceCinematicJob(approved,"payment_verified",
    {verifiedPayment:true,receiptId:"bad"}),/payment_receipt_required/);
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
test("four style choices visibly grade the SAME local Canvas frames in preview and recorded file",()=>{
  for(const style of ["warm","nature","dream","minimal"])
    assert.ok(studio.includes('storyboard.styleId==="'+style+'"'),
      style+" must change actual video pixels, not only a paid-provider prompt");
  assert.match(studio,/paintCinematicFrame\(ctx,image,effect,0,aspect/);
  assert.match(studio,/paintCinematicFrame\(ctx,image,effect,Math\.min\(duration/);
  assert.match(studio,/ctx\.createRadialGradient\(w\*\.53,h\*\.36/);
  assert.match(studio,/ctx\.fillRect\(0,0,w,h\)/);
});

test("free local browser export requests smoother fps on capable devices without overloading low-end iPhone",()=>{
  assert.match(studio,/const baselineFramesPerSecond = affirmations\.enabled/);
  assert.match(studio,/const suggestedFps = phone/);
  assert.match(studio,/quality === "fullhd" \? \(cores>=8 \? 25 : 20\)/);
  assert.match(studio,/quality === "fullhd" \? \(cores>=6 \? 20 : 16\)/);
  assert.match(studio,/baselineFramesPerSecond === 25 \|\| \(phone && cores<=2\)/);
  assert.match(studio,/canvas\.captureStream\(framesPerSecond\)/);
  assert.match(studio,/1000 \/ previewFps && !document\.hidden/);
  assert.doesNotMatch(studio,/fetch\(["']https:\/\/.*framesPerSecond/);
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
  // Portrait footage in landscape masters preserves the original image:
  // moving blurred fill replaces enormous static black side pillars.
  assert.ok(cmd.some(x=>x.includes("boxblur=12:1")));
  assert.ok(cmd.some(x=>x.includes("force_original_aspect_ratio=decrease[fg")));
  assert.ok(cmd.some(x=>x.includes("overlay=(W-w)/2:(H-h)/2:shortest=1")));
  assert.ok(!cmd.some(x=>x.includes("pad=1920:1080")||x.includes("pad=1080:1920")));
  assert.ok(!cmd.includes("-y"));
  assert.throws(()=>validateAssemblyInput({...input,music:{file:"music.wav",rightsConfirmed:false}}),
    /invalid_cinematic_assembly/);
  assert.throws(()=>validateAssemblyInput({...input,clips:[{...input.clips[0],seconds:999}]}),
    /invalid_cinematic_assembly/);
});
test("cinematic director preserves the agreed four-field profile flow without private-data leakage",()=>{
  assert.match(directorUI,/const FIELDS:Field\[\]=\["theme","difficulty","goal","profile"\]/);
  assert.match(directorUI,/data-director-profile-consent checked=\{profileConsent\}/);
  assert.match(directorUI,/disabled=\{disabled\|\|!profileConsent\|\|profileState==="loading"\}/);
  assert.match(directorUI,/if\(!profileConsent\|\|disabled\|\|profileState==="loading"\)return/);
  assert.match(directorUI,/fetch\("\/api\/app\/bootstrap\?view=portrait"/);
  assert.match(directorUI,/credentials:"same-origin",cache:"no-store",redirect:"error"/);
  assert.match(directorUI,/buildPsychPortrait\(data\.results\)/);
  assert.match(directorUI,/suggestGuidedGoalsFromProfile\(buildPsychPortrait\(data\.results\)\)/);
  assert.match(directorUI,/profileRequestRef\.current\+\+/);
  assert.match(directorUI,/const withdrawProfile=\(\)=>\{/);
  assert.match(directorUI,/setProfileConsent\(false\);setProfileSuggestions\(\[\]\)/);
  assert.match(directorUI,/profileSuggestions\.map\(item=>/);
  assert.match(directorUI,/data-director-visual-preferences/);
  assert.doesNotMatch(directorUI,/localStorage|sessionStorage|sendBeacon|fetch\("https:/);
});
test("same iPhone editor records actual four-shot canvas montage without sending private brief",()=>{
  assert.match(studio,/MandalaCinematicDirector/);
  assert.match(studio,/onApplyStoryboard=\{applyCinematicStoryboard\}/);
  assert.match(studio,/const applyCinematicStoryboard=\(plan:CinematicStoryboard\)=>\{/);
  assert.match(studio,/setCinematicPlan\(plan\)/);
  assert.match(studio,/paintCinematicFrame\(ctx,image,effect,Math\.min\(duration/);
  assert.match(studio,/const activeFilm = cinematicPlan \? null/);
  assert.match(studio,/data-hero-promo=\{!cinematicPlan&&!photoUrl&&!previewPlaying&&!recording/,
    "applied cinematic storyboard must show its real first frame, not old static hero promo");
  assert.match(studio,/setCinematicPlan\(null\)/);
  assert.match(studio,/data-mandala-video-generate/);
  assert.match(directorUI,/data-director-create-plan/);
  assert.match(directorUI,/data-director-storyboard/);
  assert.match(directorUI,/data-director-apply-montage/);
  assert.match(directorUI,/data-director-provider-quote/);
  // The director may read the owner's saved profile only after explicit consent
  // through the same-origin, credentialed bootstrap route checked above. It must
  // never send a private brief to an external provider or browser storage.
  assert.doesNotMatch(directorUI,/fetch\(["']https?:\/\/|localStorage|sessionStorage|sendBeacon|\.upload\(/);
  assert.match(css,/@media\(max-width:360px\)/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test("one director-owned idea field follows the preview and shares the existing wish state",()=>{
  assert.equal((studio.match(/<MandalaCinematicDirector/g)||[]).length,1);
  assert.match(studio,/MandalaCinematicDirector locale=\{locale\} theme=\{theme\} intentText=\{wish\}/);
  assert.doesNotMatch(studio,/data-video-quick-wish/);
  assert.doesNotMatch(studio,/id="personal-video-wish"/);
  assert.match(directorUI,/onIntentTextChange/);
});

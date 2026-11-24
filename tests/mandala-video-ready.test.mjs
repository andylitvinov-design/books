import test from "node:test";
import {buildFfmpegArgs,validateAssemblyInput} from "../scripts/cinematic-video-assemble.mjs";
import assert from "node:assert/strict";
import {personalVideoStorageCsp} from "../lib/app/personal-video-storage-csp.mjs";
import {readFileSync} from "node:fs";
import {selectResourcePractice} from "../lib/mandala/resource-practice-selector.mjs";
import {VIDEO_CART_PRODUCTS,createVideoCartSelection} from "../lib/commerce/cart.js";

const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const ready=readFileSync(new URL("../components/mandala-video-ready.tsx",import.meta.url),"utf8");
const delivery=readFileSync(new URL("../components/mandala-video-delivery.tsx",import.meta.url),"utf8");
const uploader=readFileSync(new URL("../lib/mandala/signed-private-video-upload.mjs",import.meta.url),"utf8");

test("Ready is the sixth existing editor tab, never a seventh or a parallel renderer",()=>{
  assert.match(studio,/type StudioWorkspace =[^;]*"ready"/);
  const rail=studio.slice(studio.indexOf("const workspaceTabs=["),studio.indexOf("] as const;",studio.indexOf("const workspaceTabs=[")));
  assert.equal((rail.match(/id:"/g)||[]).length,6);
  assert.match(rail,/id:"pro"[^]*id:"ready"/);
  assert.doesNotMatch(rail,/id:"practices"/);
  assert.match(studio,/data-active-workspace=\{activeWorkspace/);
  assert.match(ready,/data-ready-view=\{view\}/);
});
test("Video must be verified; guests get login before save, and existing signed upload is reused",()=>{
  assert.match(ready,/if\(!verified\|\|!video\|\|disabled\)return/);
  assert.match(ready,/if\(!signedIn\|\|intent==="house"\)/,
    "guest save and Telegram entry open the action-invoked gate");
  assert.match(studio,/<MandalaVideoReady/);
  assert.match(ready,/data-video-ready/);
  assert.match(delivery,/data-video-save-to-library/);
  assert.match(delivery,/await privateUpload\(\)/);
  assert.match(delivery,/savePrivateMp4/);
  assert.match(uploader,/uploadToSignedUrl/);
  assert.match(uploader,/uploadSignedPrivateVideoChunks/);
  assert.match(uploader,/request\("personal-videos\/"\+session.created.id,undefined,"POST"\)/);
});
test("Ritual uses existing no-provider safety selector in three languages",()=>{
  for(const locale of ["en","ru","es"]){
    const ordinary=selectResourcePractice({locale,theme:"energy",kind:"ritual",focus:{goal:"calm and balance"}});
    assert.equal(ordinary.status,"ready");
    assert.equal(ordinary.steps.length,3);
    const urgent=selectResourcePractice({locale,theme:"energy",kind:"ritual",focus:{goal:"I want to die"}});
    assert.equal(urgent.status,"blocked");
    const unsafeAnchor=selectResourcePractice({locale,theme:"energy",kind:"ritual",
      focus:{goal:"calm and balance",details:["I want to die"]}});
    assert.equal(unsafeAnchor.status,"blocked","the optional anchor must be screened");
  }
  assert.match(ready,/selectResourcePractice/);
  assert.match(ready,/details:\[anchor,\.\.\.focus\.details\]/);
  assert.match(ready,/focus\.details,anchor,wish/);
  assert.match(ready,/navigator\.clipboard\.writeText/);
  assert.match(ready,/onOpenCourse/);
});

test("approved Save gate opens only from an explicit Ready action",()=>{
  assert.match(ready,/function chooseDelivery\(intent:/);
  assert.match(ready,/data-ready-save-gate-overlay/);
  assert.match(ready,/role="dialog" aria-modal="true"/);
  assert.match(ready,/aria-labelledby="ready-save-gate-title"/);
  assert.match(ready,/data-ready-save-gate-signin/);
  assert.match(ready,/data-ready-save-gate-continue/);
  assert.match(ready,/data-ready-save-gate-telegram-start/);
  assert.match(ready,/data-ready-save-gate-refresh-login/);
  assert.match(ready,/setView\("login"\);return;/);
  assert.doesNotMatch(ready,/useEffect\(\(\)=>\s*setView\("login"\)/);
  assert.match(ready,/if\(view!=="login"\)return/);
  assert.match(ready,/event\.key==="Escape"/);
  assert.match(ready,/document\.body\.style\.overflow=oldOverflow/);
  assert.match(ready,/gateLauncherRef\.current\?\.focus\(\{preventScroll:true\}\)/);
});
test("Telegram Start uses signed challenge, never impersonates sign-in or silently uploads",()=>{
  assert.match(ready,/if\(!signedIn\|\|telegramStatus==="loading"\)return/);
  assert.match(ready,/appFetch\("personal-videos\/delivery",\{\s*action:"connect",locale,consent:true\s*\},"POST"\)/);
  assert.ok(ready.includes(String.raw`https:\/\/t\.me\/`),"only validated Telegram URL");
  assert.match(ready,/start=\[A-Za-z0-9_-\]\{32\}/);
  assert.match(ready,/target="_blank" rel="noopener noreferrer" data-ready-save-gate-telegram-start/);
  assert.match(ready,/appFetch\("personal-videos\/delivery"\)/);
  assert.doesNotMatch(ready,/https:\/\/t\.me\/andydotbot/);
  assert.doesNotMatch(ready,/window\.location\s*=/);
  assert.match(ready,/«Старт» привязывает бота к вашему кабинету, но не отправляет и не сохраняет видео автоматически/);
});
test("Save gate matches approved warm mobile design and all three locales",()=>{
  const css=readFileSync(new URL("../components/mandala-video-ready.module.css",import.meta.url),"utf8");
  for(const locale of ["en","ru","es"]){
    const start=ready.indexOf("  "+locale+":{",ready.indexOf("const COPY={"));
    const end=locale==="en"?ready.indexOf("  ru:{",start):
      locale==="ru"?ready.indexOf("  es:{",start):ready.indexOf("} as const;",start);
    assert.ok(start>0&&end>start,"locale block "+locale);
    assert.match(ready.slice(start,end),/saveGateTitle:/);
    assert.match(ready.slice(start,end),/saveGateTelegram:/);
  }
  assert.match(css,/\.gateBackdrop\{position:fixed/);
  assert.match(css,/\.gateDialog\{position:relative/);
  assert.match(css,/max-height:calc\(100dvh - 22px\)/);
  assert.match(css,/overflow-y:auto/);
  assert.match(css,/ready-save-sunrise-portrait\.jpg/);
  assert.match(css,/@media\(max-width:370px\)/);
  assert.match(ready,/data-ready-save-intent=\{gateIntent\}/);
});


test("Ready guided meditation and 8-session actions open sixth Therapy tab without inline expansion",()=>{
  const css=readFileSync(new URL("../components/mandala-video-ready.module.css",import.meta.url),"utf8");
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const therapy=readFileSync(new URL("../components/mandala-therapy-studio.tsx",import.meta.url),"utf8");
  const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
  const tabs=[...studio.matchAll(/\{id:"(video|phrases|editor|pro|ready|effects)",Icon:/g)].map(hit=>hit[1]);
  assert.deepEqual(tabs,["video","phrases","editor","pro","ready","effects"]);
  for(const [offer,format] of [["meditation","single"],["journey","course"]]){
    assert.match(ready,new RegExp('onClick=\\{\\(\\)=>onOpenTherapy\\("'+format+'"\\)\\} data-ready-'+offer));
    assert.match(ready,new RegExp('data-ready-therapy-format="'+format+'"'));
    assert.doesNotMatch(ready,new RegExp('onClick=\\{\\(\\)=>selectOffer\\("'+offer+'"\\)\\}'));
    assert.doesNotMatch(ready,new RegExp('data-ready-'+offer+'[^>]*aria-expanded'));
  }
  assert.match(studio,/onOpenTherapy=\{format=>\{/);
  assert.match(studio,/setTherapyInitialFormat\(format\)/);
  assert.match(studio,/activateQuickWorkspace\("effects"\)/);
  assert.match(studio,/initialFormat=\{therapyInitialFormat\}/);
  assert.match(studio,/focus=\{meditationFocus\}/);
  assert.match(therapy,/const \[isCourse,setIsCourse\]=useState\(initialFormat==="course"\)/);
  assert.match(therapy,/const \[pane,setPane\]=useState<Pane>\("meditation"\)/);
  assert.match(therapy,/data-therapy-format="single"/);
  assert.match(therapy,/data-therapy-format="course"/);
  assert.match(browser,/ready-therapy-one-tap-navigation-verified/);
  assert.match(browser,/toHaveAttribute\("data-therapy-course","true"\)/);
  assert.match(browser,/toHaveAttribute\("data-therapy-course","false"\)/);
  // Preserve the optional local ritual and existing actual account-gated delivery.
  assert.match(ready,/onClick=\{\(\)=>selectOffer\("ritual"\)\} data-ready-ritual/);
  assert.match(ready,/data-ready-offer-panel data-ready-offer=\{activeOffer\}/);
  assert.match(ready,/onClick=\{generateOffer\}/);
  assert.match(ready,/data-ready-ritual-result/);
  assert.match(ready,/data-ready-save-choices/);
  assert.match(ready,/data-ready-save-gate-overlay/);
  assert.match(ready,/onSendTelegramDirect/);
  assert.match(ready,/onShareWhatsApp/);
  assert.match(css,/\.offerPanel\{display:grid/);
  for(const loc of ["en","ru","es"]){
    const from=ready.indexOf("  "+loc+":{",ready.indexOf("const COPY={"));
    const to=loc==="en"?ready.indexOf("  ru:{",from):loc==="ru"?ready.indexOf("  es:{",from):ready.indexOf("} as const;",from);
    const lang=ready.slice(from,to);
    for(const key of ["meditationNext","journeyNext","generateText"])
      assert.ok(lang.includes(key+":"),loc+" preserves "+key);
  }
});

test("the three reused local writers return goal-aware texts for EN, RU and ES",async()=>{
  const [{buildPersonalMeditationScript},{buildPersonalImageryCourse}]=await Promise.all([
    import("../lib/mandala/personal-meditation-script.mjs"),
    import("../lib/mandala/personal-guided-course.mjs"),
  ]);
  for(const locale of ["en","ru","es"]){
    const focus={difficulty:"stress in the evening",goal:"feel connected",goals:["relationships"],details:[]};
    const meditation=buildPersonalMeditationScript({locale,theme:"relationships",wish:"connection",focus,length:5});
    assert.ok(meditation.length>350,locale+" has a real meditation script");
    assert.ok(meditation.includes("feel connected"),locale+" preserves explicit personal goal");
    const course=buildPersonalImageryCourse({locale,theme:"relationships",goals:focus.goals,
      keyDifficulty:focus.difficulty,keyGoal:focus.goal,detailGoals:focus.details});
    assert.equal(course.sessionCount,8);
    assert.equal(course.sessions.length,8);
    assert.ok(course.sessions.every(s=>s.script.length>70));
    assert.ok(course.sessions[0].script.includes("feel connected"));
    const ritual=selectResourcePractice({locale,theme:"relationships",kind:"ritual",focus});
    assert.equal(ritual.status,"ready");
    assert.equal(ritual.steps.length,3);
    const blocked=selectResourcePractice({locale,theme:"relationships",kind:"ritual",focus:{goal:"I want to die"}});
    assert.equal(blocked.status,"blocked");
  }
});


test("Ready has one Free Generate immediately below the preview; Extra owns paid formats",()=>{
  const offer=readFileSync(new URL("../components/mandala-montage-pro-offer.tsx",import.meta.url),"utf8");
  assert.doesNotMatch(ready,/data-ready-video-tiers|data-ready-video-tier=|name="ready-video-tier"/);
  assert.doesNotMatch(ready,/createVideoCartSelection|VIDEO_CART_STORAGE_KEY|useRouter/);
  assert.match(studio,/promo:\{ru:"Extra",en:"Extra",es:"Extra"\}/);
  assert.match(studio,/montagePanel==="promo" \? <MandalaMontageProOffer/);
  assert.match(studio,/montagePanel==="settings" \? <details className=\{videoStyles\.montageStoryAdvanced\}/);
  assert.match(offer,/data-video-montage-pro-offer/);
  const preview=ready.indexOf("{header}");
  const generate=ready.indexOf('data-ready-generate>');
  const ideas=ready.indexOf('className={css.nextTitle}');
  assert.ok(preview>0&&generate>preview&&ideas>generate,"Ready preview → Free Generate → ideas");
  assert.match(ready,/onClick=\{generateSelectedVideo\} data-ready-generate/);
  assert.match(ready,/onGenerateBasicVideo\(\)/);
  assert.match(studio,/return createQuickVideo\(\)/);
  assert.match(studio,/readyBasicVideoAccess\(/);
  assert.match(ready,/data-ready-video-credit-cost/);
  assert.match(ready,/data-ready-sign-in-credits/);
  assert.match(ready,/if\(!basicFreeAvailable\)/);
  assert.match(ready,/data-ready-generating/);
  assert.match(ready,/data-ready-checkin/);
  assert.match(ready,/progressQuestionnaire/);
  assert.match(ready,/rendering\?t\.generating/);
  const prices=Object.fromEntries(VIDEO_CART_PRODUCTS.map(item=>[item.id,item.amountMinor]));
  assert.deepEqual(prices,{"video-extra":300,"video-pro":500});
  assert.deepEqual(createVideoCartSelection("video-extra"),{id:"video-extra",brief:""});
  assert.deepEqual(createVideoCartSelection("video-pro"),{id:"video-pro",brief:""});
  assert.equal(createVideoCartSelection("video-unknown"),null);
});

test("Safari-visible Ready player unlocks new encoded Blob before final credit-confirmed state",()=>{
  assert.match(studio,/if\(result\?\.url&&result\.mode!=="catalog"\)setReadyGenerationPending\(false\)/);
  assert.match(studio,/checking=\{Boolean\(!readyGenerationPending&&result&&playbackStatus==="checking"\)\}/);
  assert.match(studio,/progressQuestionnaire=\{renderCheckIn\("ready-assessment-heading"\)\}/);
  assert.match(studio,/activeWorkspace==="video"\?renderCheckIn\("video-assessment-heading"\):null/);
  assert.match(ready,/data-video-file=\{video\?"true":undefined\}/);
  assert.match(ready,/onCanPlay=\{event=>onVerifyPlayback\(event\.currentTarget\)\}/);
  assert.match(ready,/\{completed\?<button type="button" data-ready-generate-new onClick=\{onStartNewVideo\}>/);
  assert.match(studio,/playbackStatus==="ready"&&creditConfirmed/);
});

test("WebKit voice advanced settings use native one-tap disclosure without a double toggle",()=>{
  const voice=readFileSync(new URL("../components/mandala-affirmation-voice.tsx",import.meta.url),"utf8");
  const begin=voice.indexOf("data-video-affirmation-voice-advanced");
  const end=voice.indexOf("{compact?deviceSampleControl:null}",begin);
  assert.ok(begin>0&&end>begin,"real advanced disclosure remains reachable");
  const disclosure=voice.slice(begin,end);
  assert.match(disclosure,/<summary onClick=\{event=>\{/);
  assert.match(disclosure,/voiceAdvancedOpenRef\.current=!node\.open/);
  assert.doesNotMatch(disclosure,/event\.preventDefault\(\)/,
    "native summary default must not be blocked");
  assert.doesNotMatch(disclosure,/node\.open\s*=\s*!node\.open/,
    "a synchronous manual toggle can be reversed by WebKit's native click");
  assert.match(disclosure,/onToggle=\{event=>\{/);
});

test("Ready Basic auto-attaches suggested music before Generate without bypassing manual audio rights",()=>{
  const start=studio.indexOf("// Auto-music must be ATTACHED before the Montage Generate tap");
  const end=studio.indexOf("// A paused film",start);
  assert.ok(start>0&&end>start,"the original shared audio effect remains in the studio");
  const effect=studio.slice(start,end);
  assert.match(effect,/if\(!audioAuto\|\|uploadedAudio\|\|attachedAudio\?\.kind==="file"\|\|/);
  assert.match(effect,/attachedAudio\?\.kind==="presets"\)return/);
  assert.match(effect,/activeWorkspace!=="editor"&&activeWorkspace!=="ready"/);
  assert.match(effect,/setAttachedAudio\(current=>/);
  assert.match(studio,/const audioNeedsAttachment=selectedAudioKey!==attachedAudioKey/);
  assert.match(studio,/if\(audioNeedsAttachment\)\{\s*setNotice\(audioUi\.needsAttach\)/);
  assert.match(studio,/onGenerateBasicVideo=\{\(\)=>\{/);
  assert.match(studio,/return createQuickVideo\(\)/);
});

test("approved Ready result has a thin status, full player and account-gated Save, Telegram and WhatsApp",()=>{
  const css=readFileSync(new URL("../components/mandala-video-ready.module.css",import.meta.url),"utf8");
  const studioCss=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
  assert.match(ready,/data-ready-state=\{completed\?"complete":"choose"\}/);
  assert.match(ready,/data-ready-status/);
  assert.match(ready,/data-ready-status-phase=\{completed\?"complete":rendering\?"rendering":checking\?"verifying":"idle"\}/);
  assert.match(ready,/<strong>\{completed\?t\.ready:pendingStatus\}<\/strong>/);
  assert.match(ready,/data-ready-save><Download/);
  assert.match(ready,/data-ready-telegram><Send/);
  assert.match(ready,/data-ready-whatsapp><MessageCircle/);
  assert.match(ready,/data-ready-generate-new onClick=\{onStartNewVideo\}/);
  assert.match(ready,/onLoadedData=\{event=>onVerifyPlayback\(event\.currentTarget\)\}/);
  assert.match(ready,/onCanPlay=\{event=>onVerifyPlayback\(event\.currentTarget\)\}/);
  assert.match(studio,/onVerifyPlayback=\{confirmVideoPlayback\}/);
  assert.match(studio,/onStartNewVideo=\{\(\)=>\{/);
  assert.match(studio,/inert=\{activeWorkspace==="ready"\}/);
  assert.match(studioCss,/data-active-workspace="ready"[^\n]*\[data-video-result\]:not\(\[hidden\]\)/);
  assert.match(css,/\.root\[data-ready-state="complete"\] \.selectedVideo\{width:100%;aspect-ratio:16\/9/);
  assert.match(css,/\.root\[data-ready-state="complete"\] \.journey\{grid-template-columns:minmax\(0,1fr\)/);
  for(const locale of ["en","ru","es"]){
    const start=ready.indexOf("  "+locale+":{",ready.indexOf("const COPY={"));
    const end=locale==="en"?ready.indexOf("  ru:{",start):
      locale==="ru"?ready.indexOf("  es:{",start):ready.indexOf("} as const;",start);
    for(const key of ["ready","nextSteps","nextLead","newVideo","sendTelegram","meditationNext","journeyNext"]){
      assert.ok(ready.slice(start,end).includes(key+":"),locale+" missing "+key);
    }
  }
});


test("verified voice retains the original narration while Music Match forbids synthesized bed suggestions",()=>{
  const source=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
  assert.ok(source.includes("tracks:voiceBedMode?[]:rankedAudioPool,"));
  assert.match(source,/data-phrase-music-guidance=\{voiceBedMode\?"voice":"melody"\}/);
  assert.match(browser,/await expect\(personalMusic\.locator\('\[role="radio"\]'\)\)\.toHaveCount\(0\)/);
  assert.match(browser,/await expect\(page\.locator\("\[data-video-live-audio\]"\)\)\.toContainText\(expectedFileName\)/);
  assert.match(browser,/await page\.locator\("\[data-video-bed-volume\]"\)\.focus\(\)/);
  assert.match(browser,/await page\.waitForFunction\(previous=>/);
});


test("real Safari encoded-Blob guest helper gates Save without relying on the removed Download button",()=>{
  const helper=readFileSync(new URL("../scripts/benchmarking/real-guest-video-file.mjs",import.meta.url),"utf8");
  assert.match(helper,/await ready\.locator\('\[data-ready-save\]'\)\.click\(\)/);
  assert.doesNotMatch(helper,/data-ready-download/);
  assert.match(helper,/await expect\(page\.locator\('\[data-mandala-video-download\]'\)\)\.toBeHidden\(\)/);
  assert.match(helper,/await expect\.poll\(\(\)=>renderedPlayer\.evaluate/);
  assert.match(helper,/window\.__hhTestRecordedVideoBlobs/);
  assert.match(helper,/assert\.equal\(downloads,0,'GUEST_DOWNLOAD_MUST_REQUIRE_LOGIN'\)/);
  assert.match(helper,/data-ready-save-gate-signin/);
  assert.match(helper,/\[data-video-effect-overlay\]/);
});


test("verified signed-in Ready Save uses the existing signed uploader after private MP4 consent",()=>{
  const css=readFileSync(new URL("../components/mandala-video-ready.module.css",import.meta.url),"utf8");
  assert.match(ready,/if\(!signedIn\|\|intent==="house"\)/);
  assert.match(ready,/if\(intent==="save"\)\{saveWithConsent\(\);return;\}/);
  assert.match(ready,/if\(cloudConsent\)onSaveDirect\(true\)/);
  assert.match(ready,/data-ready-save-status/);
  assert.match(ready,/disabled=\{disabled\|\|saveStatus\.busy\}/);
  assert.match(ready,/data-ready-download-fallback/);
  assert.match(studio,/const deliveryRef=useRef<VideoDeliveryHandle\|null>\(null\)/);
  assert.match(studio,/if\(deliveryRef\.current\)void deliveryRef\.current\.saveToLibrary\(consentApproved\)/);
  assert.match(studio,/onStatusChange=\{setReadySaveStatus\}/);
  assert.match(delivery,/forwardRef<VideoDeliveryHandle,Props>/);
  assert.match(delivery,/useImperativeHandle\(ref,\(\)=>\(\{saveToLibrary,sendToTelegram,shareToWhatsApp\}\)/);
  assert.match(delivery,/if\(!current\.cloudAvailable\)\{setNotice\(t\.cloudSaveOff\);return;\}/);
  assert.match(delivery,/savingRef\.current=true/);
  assert.match(delivery,/const id=await privateUpload\(accountId\)/);
  assert.match(delivery,/setSavedId\(id\)/);
  assert.match(css,/\.saveStatus\{display:flex/);
  for(const loc of ["en","ru","es"]){
    const i=delivery.indexOf(" "+loc+":{");
    const e=loc==="en"?delivery.indexOf(" es:{",i):
      loc==="ru"?delivery.indexOf(" en:{",i):delivery.indexOf("} as const;",i);
    assert.ok(i>0&&e>i&&delivery.slice(i,e).includes("cloudSaveOff:"),loc+" clear cloud error");
  }
});

test("personal signed MP4 CSP follows private storage availability on exact EN/RU/ES routes",()=>{
  const env={HH_APP_SUPABASE_URL:"https://abcdefghijklmnopqrst.supabase.co"};
  const api="https://abcdefghijklmnopqrst.supabase.co";
  const tus="https://abcdefghijklmnopqrst.storage.supabase.co";
  for(const locale of ["en","ru","es"]){
    assert.deepEqual(personalVideoStorageCsp("/"+locale+"/holistic-support/mandala",env),
      {connect:" "+api+" "+tus,media:""});
    assert.deepEqual(personalVideoStorageCsp("/"+locale+"/app/videos",env),
      {connect:" "+api+" "+tus,media:" blob: "+api});
  }
  for(const path of ["/en/app/messages","/ru/app/practice","/en/app/videos/another",
      "/ru/holistic-support/mobile","/api/app/personal-videos","/admin/videos"]){
    assert.deepEqual(personalVideoStorageCsp(path,env),{connect:"",media:""},path);
  }
  assert.deepEqual(personalVideoStorageCsp("/ru/holistic-support/mandala",
    {...env,HH_PERSONAL_VIDEO_CLOUD_SAVE_ENABLED:"false"}),{connect:" "+api+" "+tus,media:""});
  assert.deepEqual(personalVideoStorageCsp("/ru/app/videos",
    {...env,HH_PERSONAL_VIDEO_CLOUD_SAVE_ENABLED:"false"}),{connect:" "+api+" "+tus,media:" blob: "+api});
  for(const bad of ["http://abcdefghijklmnopqrst.supabase.co",
    "https://abcdefghijklmnopqrst.supabase.co.evil.test",
    "https://abcdefghijklmnopqrst.supabase.co:4433",
    "https://user:secret@abcdefghijklmnopqrst.supabase.co",
    "https://abcdefghijklmnopqrst.supabase.co/other-path",
    "https://abcdefghijklmnopqrst.supabase.co/?api_key=bad",
    "https://other.supabase.co"]){
    assert.deepEqual(personalVideoStorageCsp("/en/holistic-support/mandala",
      {...env,HH_APP_SUPABASE_URL:bad}),{connect:"",media:""},bad);
  }
  const middleware=readFileSync(new URL("../middleware.ts",import.meta.url),"utf8");
  assert.match(middleware,/personalVideoStorageCsp\(pathname,process\.env\)/);
  assert.match(middleware,/"connect-src 'self'".*personalVideoStorage\.connect/);
  assert.match(middleware,/directMessageStorageOrigin \+ personalVideoStorage\.media/);
  assert.match(middleware,/humanSpecialistVideoPage/);
  assert.doesNotMatch(middleware,/connect-src[^\n]*https:\/\/\*\.supabase\.co/);
});

test("Add video keeps the existing hydrated first-video editor visible across Safari workspace transitions",()=>{
  const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
  const source=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const exportBrowser=readFileSync(new URL("../scripts/benchmarking/first-video-live-export.mjs",import.meta.url),"utf8");
  const decoder=readFileSync(new URL("../scripts/verify-tantra-testimonials.mjs",import.meta.url),"utf8");
  assert.match(source,/data-video-advanced-open=\{\(showAdvancedVideo\|\|videoScenarioOpen\)\?"true":"false"\}/);
  assert.match(source,/const openVideoScenarioStep = \(\) => \{[\s\S]*?setVideoScenarioOpen\(true\);[\s\S]*?setShowAdvancedVideo\(true\);/);
  assert.match(source,/onAddVideo=\{\(\)=>\{[\s\S]*?openVideoScenarioStep\(\);/);
  assert.match(css,/data-video-advanced-open="false"\] \.quickBuilder>\[data-video-first-video-advanced\]/);
  assert.match(exportBrowser,/data-first-free-video\]\[data-first-video-hydrated="true"\]/);
  // Third-party native WebKit decoder recovery must not throw away healthy metadata.
  assert.match(decoder,/if\(needsInitialMetadata\)el\.load\(\)/);
  assert.match(decoder,/\,pendingNoMetadata\)/);
  assert.doesNotMatch(decoder,/if \(el\.readyState === 0\) el\.load\(\)/);
  // Real WebKit seeks that rebuild the decoder cannot be mistaken for success:
  // one same-source recovery only after native seeking ends and fresh frames move.
  assert.match(decoder,/const rebuildingSameSourceSeek = Boolean\(/);
  assert.match(decoder,/stalled\.paused && stalled\.seeking && !stalled\.ended/);
  assert.match(decoder,/stalled\.frames === 0/);
  assert.match(decoder,/stalled\.presentedFrame\.at > initial\.presentedFrame\.at/);
  assert.match(decoder,/!genuineSameSourceStall && !pendingNoMetadata && !rebuildingSameSourceSeek/);
  assert.match(decoder,/el\.paused && !el\.seeking &&/);
  assert.match(decoder,/Math\.abs\(el\.currentTime - pinned\.time\) < 0\.1/);
  assert.match(decoder,/observation\.nativeSeekRecovery\.after = resumed/);
  assert.match(decoder,/frame\.mediaTime > before\.time \+ 0\.35/);
  assert.doesNotMatch(decoder,/if \(rebuildingSameSourceSeek\)[\s\S]*?metadataReload: true/);
  // WebKit/GStreamer can reset presentedFrames after the native decoder is
  // rebuilt, even as the actual player clock and decoded frames advance.
  // Never require this resettable counter to be monotonic across resumes.
  assert.match(decoder,/frame\.at > \(before\.presentedFrame\?\.at \?\? -1\)/);
  assert.match(decoder,/frame\.mediaTime > before\.time \+ 0\.35/);
  assert.match(decoder,/Math\.abs\(frame\.mediaTime - el\.currentTime\) < 0\.35/);
  assert.doesNotMatch(decoder,/frame\.presentedFrames > before\.presentedFrame\.presentedFrames/);
  assert.match(decoder,/!el\.paused && !el\.seeking && !el\.ended && !el\.error/);
  assert.match(decoder,/sample\.error, null/);
});

test("Ready primes Safari media on trusted Create before awaiting account credit hold",()=>{
  const begin=studio.indexOf("async function createVideo(");
  const end=studio.indexOf("  function stopSoundPreview()",begin);
  assert.ok(begin>0&&end>begin);
  const create=studio.slice(begin,end);
  const at=(fragment)=>{
    const position=create.indexOf(fragment);
    assert.ok(position>=0,"Missing render step: "+fragment);
    return position;
  };
  const primedVideo=at("const stylePreparation=");
  const primedAudio=at("const audioPreparation =");
  const audioStarted=at("musicSession=audioPreparation?await withLocalMediaDeadline");
  const sceneCheck=at("if(!(await filmPreparation))");
  const masterStarted=at("await withLocalMediaDeadline(master.play(),12000)");
  const creditHold=at('const hold=await videoCreditRequest("hold"');
  const encoder=at("const canvas = canvasRef.current;");
  assert.ok(primedVideo<primedAudio&&primedAudio<audioStarted&&audioStarted<sceneCheck);
  assert.ok(sceneCheck<masterStarted&&masterStarted<creditHold&&creditHold<encoder,
    "No network hold/capability call may steal the original Safari tap before decoders start");
  assert.ok(at('appFetch("video-export/capabilities"')>masterStarted);
  assert.match(studio,/async function withLocalMediaDeadline<T>/);
  assert.match(studio,/image_load_timeout/);
  assert.match(create,/await withLocalMediaDeadline\(image\.decode\(\),20000\)/);
  assert.match(create,/setExportUnavailable\(true\)/);
});

test("credit hold times out instead of leaving a signed-in iPhone in Preparing",async()=>{
  const {postVideoCreditAction}=await import("../lib/video-credits/client.mjs");
  const originalFetch=globalThis.fetch;
  let aborted=false;
  try{
    globalThis.fetch=(url,init)=>{
      assert.equal(url,"/api/app/video-credits/hold");
      assert.equal(init.method,"POST");
      assert.equal(init.credentials,"same-origin");
      return new Promise((_resolve,reject)=>init.signal.addEventListener("abort",()=>{
        aborted=true;reject(new Error("AbortError"));
      },{once:true}));
    };
    await assert.rejects(postVideoCreditAction("hold",{operationId:"synthetic-hold"},{timeoutMs:40}),
      /VIDEO_CREDITS_UNAVAILABLE/);
    assert.equal(aborted,true,"the hung browser request must be aborted");
  }finally{globalThis.fetch=originalFetch;}
});

test("Add Video keeps the optional source editor closed on landing and opens it on user navigation",()=>{
  assert.match(studio,/const \[firstVideoAdvancedOpen,setFirstVideoAdvancedOpen\] = useState\(false\)/);
  assert.match(studio,/open=\{firstVideoAdvancedOpen\}/);
  assert.match(studio,/setFirstVideoAdvancedOpen\(opened\)/,
    "real native summary toggle owns open and close");
  const from=studio.indexOf("const openQuickDetailed=");
  const to=studio.indexOf("const openVideoScenarioStep",from);
  assert.ok(from>0&&to>from);
  assert.match(studio.slice(from,to),
    /if\(anchor==="video-templates"\)\{[\s\S]*?setFirstVideoAdvancedOpen\(true\)/,
    "Add Video reveals the real first-party source editor before Safari can lose a second tap");
  assert.match(studio,/data-video-first-video-advanced>/);
});


test("Ready Telegram sends directly to the verified own bot without the chooser",()=>{
  assert.match(ready,/if\(intent==="telegram"\)\{onSendTelegramDirect\(\);return;\}/);
  assert.match(studio,/onSendTelegramDirect=\{\(\)=>\{if\(deliveryRef\.current\)void deliveryRef\.current\.sendToTelegram\(\);\}\}/);
  assert.match(delivery,/async function sendToTelegram\(\)/);
  assert.match(delivery,/const current=await refresh\(\)/);
  assert.match(delivery,/if\(!current\.telegram\.linked\)/);
  assert.match(delivery,/if\(!current\.cloudAvailable\|\|!current\.telegram\.sendingAvailable\)/);
  assert.match(delivery,/await sendViaBot\(false\)/);
  assert.match(ready,/data-ready-telegram-link-step/);
  assert.match(ready,/data-ready-verify-telegram/);
  assert.doesNotMatch(ready,/if\(!signedIn\|\|intent==="telegram"/);
});

test("Ready WhatsApp requires own verified link, never claims Meta MP4 delivery",()=>{
  assert.match(ready,/data-ready-whatsapp><MessageCircle/);
  assert.match(ready,/data-ready-whatsapp-link-step/);
  assert.match(delivery,/getCabinetBootstrap\("portrait"\)/);
  assert.match(delivery,/appFetch\("whatsapp-link",undefined,"GET",\{accountId\}\)/);
  assert.match(delivery,/accountId:current\.accountId/);
  assert.match(delivery,/if\(consentApproved!==true\)/);
  assert.match(ready,/data-ready-whatsapp-link-consent/);
  assert.match(ready,/disabled=\{!whatsappConsent\|\|saveStatus\.busy\}/);
  assert.match(ready,/onShareWhatsApp\(true\)/);
  assert.match(delivery,/if\(whatsappLink\?\.linked\)\{/);
  assert.match(delivery,/await shareFromDevice\(\)/);
  assert.match(delivery,/action:"begin",noticeVersion:"hh-whatsapp-account-link-v1",permissionAccepted:true/);
  assert.match(delivery,/setWhatsappUrl\(link\)/);
  assert.match(delivery,/setNotice\(t\.whatsappUnavailable\)/);
  assert.match(ready,/direct automated MP4 sending is not enabled/);
  assert.doesNotMatch(delivery,/channel:"whatsapp"/);
});


test("Ready catches the physical iPhone MP4 playback error and offers a safe retry",()=>{
  const css=readFileSync(new URL("../components/mandala-video-ready.module.css",import.meta.url),"utf8");
  assert.match(ready,/onError=\{event=>handleReadyPlaybackError\(event\.currentTarget\)\}/,
    "the visible Ready video must report real native Safari decoding failures");
  assert.match(ready,/data-ready-export-failed/);
  assert.match(ready,/data-ready-retry-compatible/);
  assert.match(ready,/role="alert" data-ready-export-failed/);
  assert.match(ready,/onRetryExport\}/);
  assert.match(ready,/retryCompatible:"Retry in compatibility mode"/);
  assert.match(ready,/retryCompatible:"Повторить в совместимом режиме"/);
  assert.match(ready,/retryCompatible:"Reintentar en modo compatible"/);
  assert.match(css,/\.exportFailure\{display:grid/);
  assert.match(studio,/video=\{!readyGenerationPending&&playbackStatus!=="failed"&&result/,
    "rejected MP4 must become a real poster, not a black broken native player");
  assert.match(studio,/onPlaybackError=\{handleNativeVideoPlaybackFailure\}/);
  assert.match(studio,/onError=\{event=>handleNativeVideoPlaybackFailure\(event\.currentTarget\)\}/);
  assert.match(studio,/if\(rejectedPlaybackUrlRef\.current===result\.url\)return/);
  assert.match(studio,/if\(result\?\.url===rejectedPlaybackUrlRef\.current\)return/);
  assert.match(studio,/if\(creditOpRef\.current\)return/);
  assert.match(studio,/setPlaybackStatus\("failed"\)/);
  assert.match(studio,/setPendingCompatibleRetry\(signature\)/,
    "existing one-shot native WebM recovery remains connected");
});

test("client MP4 global quota is RLS-safe and expired signed upload reservations are reaped only after token expiry",()=>{
  const personalVideos=readFileSync(new URL("../lib/app/personal-videos.js",import.meta.url),"utf8");
  const migration=readFileSync(new URL("../supabase/migrations/20261118052326_hh_personal_video_global_quota_rls_guard.sql",import.meta.url),"utf8");
  assert.match(personalVideos,/select pg_advisory_xact_lock\(598228614\)/);
  assert.match(personalVideos,/select app_private\.personal_video_reserved_global_bytes\(\) total/);
  assert.doesNotMatch(personalVideos,/select coalesce\(sum\(bytes\),0\)::bigint total from app_private\.personal_videos where status/);
  assert.match(migration,/SECURITY DEFINER/);
  assert.match(migration,/SET search_path = pg_catalog/);
  assert.match(migration,/REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated, hh_app_inbox/);
  assert.match(migration,/GRANT EXECUTE ON FUNCTION[\s\S]*TO hh_app_backend/);
  assert.match(personalVideos,/status='deleted' and released_at is null and created_at<now\(\)-interval '3 hours'/);
  assert.match(personalVideos,/status='pending' and created_at<now\(\)-interval '3 hours'/);
  assert.match(personalVideos,/created_at<now\(\)-interval '3 hours'/);
  assert.match(personalVideos,/const \{error\}=await storage\.remove\(\[file\.object_key\]\)/);
  assert.match(personalVideos,/if\(error\)continue/);
});

test("iPhone Ready verifies one visible exported MP4 and retries its transport without another encode",()=>{
  assert.match(ready,/import \{isAppleMobileDevice\} from "@\/lib\/mandala\/recording-codecs\.mjs"/);
  assert.match(ready,/type VideoFile=\{url:string;extension:"mp4"\|"webm";bytes:number;duration:number;blob\?:Blob\}/);
  assert.match(studio,/blob:result\.blob/);
  assert.match(studio,/\{activeWorkspace!=="ready"\?<video ref=\{resultVideoRef\}/,
    "the inactive legacy decoder must be unmounted while Ready owns the video");
  assert.match(ready,/data-mandala-video-preview data-ready-native-player/);
  assert.match(ready,/player\.srcObject=video\.blob/);
  assert.match(ready,/isAppleMobileDevice\(navigator\.userAgent,navigator\.maxTouchPoints\)/);
  assert.match(ready,/readySourceModeRef\.current=attached\?"safari-blob":"object-url"/);
  assert.match(ready,/readyUrlRecoveryRef\.current=video\.url/);
  assert.match(ready,/player\.srcObject=null;\s*player\.src=video\.url;/);
  assert.match(ready,/player\.dataset\.readyMediaTransport="blob-url"/);
  assert.match(ready,/player\.load\(\);\s*return;/);
  assert.match(ready,/onPlaybackError\(player\)/,
    "only after the original Blob has been retried via a second source transport may it fail");
  assert.doesNotMatch(ready,/<video key=\{video\.url\} src=\{video\.url\}/,
    "React must not eagerly create a competing blob: decoder before Safari srcObject attaches");
  assert.match(ready,/checking&&video&&!rendering\?<button/);
  assert.match(ready,/data-ready-play-verify/);
  assert.match(studio,/nativeIphoneMp4Retry=\{iphoneLocalPlayback&&nativeIphoneMp4Available\}/);
  assert.match(studio,/if\(nativeIphoneMp4Available\)void createVideo\(false,true\)/,
    "the explicit retry must use the existing native MP4 recorder, not a second WebCodecs run");
  assert.match(studio,/!iphoneLocalPlayback\|\|nativeIphoneMp4Available/);
  assert.match(ready,/!waiting&&!exportFailed&&!courseFlow/,
    "one clear retry CTA rather than another identical Generate action when MP4 failed");
  assert.match(studio,/if\(creditOpRef\.current\)return/);
  assert.match(studio,/playbackStatus==="ready"&&creditConfirmed/);
});

// Fast Assembly inherits the existing six-shot plan and source rights.
test("Fast Assembly compiles 6 x 5s, visible RU captions and one AAC mix",()=>{
  const clips=Array.from({length:6},(_,i)=>({file:"s"+i+".mp4",seconds:5,rightsConfirmed:true}));
  const plan={version:"hh-assembly-1",locale:"ru",aspect:"portrait",fast:true,
    audioMode:"narration_with_music",clips,
    narration:{file:"voice.wav",rightsConfirmed:true},
    music:{file:"music.mp3",rightsConfirmed:true},
    subtitles:{file:"captions.srt",rightsConfirmed:true}};
  assert.deepEqual(validateAssemblyInput(plan),{seconds:30,clips:6});
  const args=buildFfmpegArgs(plan,{clips:clips.map((_,i)=>"/tmp/s"+i+".mp4"),
    narration:"/tmp/voice.wav",music:"/tmp/music.mp3",
    subtitles:"/tmp/captions.srt"},"/tmp/final.mp4");
  const graph=args[args.indexOf("-filter_complex")+1];
  assert.equal((graph.match(/setpts=PTS-STARTPTS,scale=/g)||[]).length,6);
  assert.match(graph,/concat=n=6:v=1:a=0\[vbase\]/);
  assert.match(graph,/subtitles=filename='\/tmp\/captions\.srt'/);
  assert.match(graph,/\[voice\]\[bed\]amix=/);
  assert.doesNotMatch(graph,/boxblur|fade=t|force_original_aspect_ratio=increase/);
  assert.equal(args[args.indexOf("-preset")+1],"veryfast");
  assert.equal(args[args.indexOf("-crf")+1],"24");
  assert.equal(args[args.indexOf("-r")+1],"24");
  assert.equal(args[args.indexOf("-c:a")+1],"aac");
  assert.equal(args.filter(x=>x==="[aout]").length,1);
  assert.equal(args[args.indexOf("-t")+1],"30");
  assert.ok(args.includes("+faststart"));
});
test("Fast Assembly rejects unlicensed sources and dangerous subtitle paths",()=>{
  const clips=Array.from({length:6},(_,i)=>({file:"s"+i+".mp4",seconds:5,rightsConfirmed:true}));
  const plan={version:"hh-assembly-1",locale:"en",aspect:"landscape",fast:true,
    audioMode:"silent",clips,subtitles:{file:"captions.srt",rightsConfirmed:true}};
  assert.throws(()=>validateAssemblyInput({...plan,clips:[...clips,...clips]}));
  assert.throws(()=>validateAssemblyInput({...plan,
    clips:clips.map((clip,i)=>i===3?{...clip,rightsConfirmed:false}:clip)}));
  assert.throws(()=>buildFfmpegArgs(plan,{clips:clips.map(x=>x.file),
    subtitles:"/tmp/unsafe:captions.srt"},"/tmp/final.mp4"));
});
test("Narration-only requires Fast mode, keeps AAC, and checks length before render",()=>{
  const clips=Array.from({length:6},(_,i)=>({file:"s"+i+".mp4",seconds:5,rightsConfirmed:true}));
  const input={version:"hh-assembly-1",locale:"en",aspect:"portrait",
    audioMode:"narration",clips,
    narration:{file:"narration.wav",rightsConfirmed:true}};
  assert.throws(()=>validateAssemblyInput(input),
    "the legacy assembler does not mux narration-only and must reject it up front");
  assert.deepEqual(validateAssemblyInput({...input,fast:true}),{seconds:30,clips:6});
  const args=buildFfmpegArgs({...input,fast:true},
    {clips:clips.map(c=>"/tmp/"+c.file),narration:"/tmp/narration.wav"},
    "/tmp/voice-film.mp4");
  assert.equal(args[args.indexOf("-c:a")+1],"aac");
  assert.ok(args.includes("[aout]"),"narration maps to the single output AAC stream");
  const assembler=readFileSync(new URL("../scripts/cinematic-video-assemble.mjs",import.meta.url),"utf8");
  const beforeEncode=assembler.slice(assembler.indexOf("if(input.narration){"),
    assembler.indexOf("const out=inside("));
  assert.match(beforeEncode,/narrationProbe\.seconds>check\.seconds\+0\.25/);
  assert.match(beforeEncode,/fast_narration_longer_than_video/);
  assert.doesNotMatch(beforeEncode,/runner\('ffmpeg'/);
});
test("Ready uses existing Canvas for personal preview, not a fake exported file",()=>{
  assert.match(ready,/data-ready-sequence-canvas/);
  assert.match(ready,/data-ready-sequence-play/);
  assert.match(ready,/data-ready-sequence-seek/);
  assert.match(ready,/previewSourceCanvasRef\?\.current/);
  assert.match(studio,/previewSourceCanvasRef=\{canvasRef\}/);
  assert.match(studio,/previewAvailable=\{Boolean\(cinematicPlan/);
  assert.match(ready,/if\(video\|\|!previewAvailable\)return/);
  assert.match(ready,/Preview ≠ MP4/);
  assert.match(ready,/if\(!verified\|\|!video\|\|disabled\)return/);
});

/**
 * Mocked-Gemini E2E: real Next UI and actual client WAV handling without API
 * credentials, provider billing or customer data. NOT a provider E2E claim.
 */
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdirSync} from "node:fs";
import {chromium,webkit,expect} from "@playwright/test";
import {verifyGuidedPractices} from "./verify-mandala-practices-browser.mjs";

const BASE=(process.env.HH_TEST_PUBLIC_ORIGIN||"http://127.0.0.1:3100").replace(/\/$/,"");
function wav(seconds=3) {
  const rate=24000,n=rate*seconds,b=Buffer.alloc(44+n*2);
  b.write("RIFF",0);b.writeUInt32LE(b.length-8,4);b.write("WAVE",8);b.write("fmt ",12);
  b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
  b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);
  b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(n*2,40);
  for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*280/rate)*8000),44+i*2);
  return b;
}
// A first click must not be offered before React attaches the workspace handlers.
// Hold only this fresh context's same-origin JS, then verify one real tap after
// hydration. All writes and third-party requests remain blocked.
async function verifyWorkspaceHydration(browser,locale){
  const context=await browser.newContext({viewport:{width:390,height:840},isMobile:true,hasTouch:true,serviceWorkers:"block"});
  let release;const hold=new Promise(resolve=>{release=resolve});let held=0;
  try{
    await context.route("**/*",async route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.origin!==new URL(BASE).origin||!["GET","HEAD"].includes(request.method()))return route.abort();
      if(url.pathname.includes("/_next/static/")&&url.pathname.endsWith(".js")){held++;await hold;}
      return route.continue();
    });
    const page=await context.newPage();
    await page.goto(BASE+"/"+locale+"/holistic-support/mandala",{waitUntil:"commit",timeout:90000});
    const studio=page.locator('[data-video-studio-hydrated]');
    const tabs=page.locator('[data-video-quick-controls] button');
    await expect(studio).toHaveAttribute("data-video-studio-hydrated","false",{timeout:60000});
    await expect(tabs).toHaveCount(6);
    for(let i=0;i<6;i++)await expect(tabs.nth(i)).toBeDisabled();
    // Native first-screen navigation: only real visible clicks.
    const continueToIdeas=page.locator('[data-video-continue-scenarios]');
    const allStories=page.locator('[data-auto-video-all-scenes]');
    await expect(continueToIdeas).toBeDisabled();
    await expect(allStories).toBeHidden();
    await expect.poll(()=>held,{timeout:10000,message:"the test must actually delay JavaScript"}).toBeGreaterThan(0);
    release();
    await expect(studio).toHaveAttribute("data-video-studio-hydrated","true",{timeout:60000});
    // The separately validated Messenger handoff may open this existing
    // compact Goals disclosure; the non-handoff UI remains closed/hidden.
    const handoffPanel=page.locator('[data-video-director-chat-details][data-workspace-section="video"]');
    await expect(handoffPanel).toBeHidden();
    await handoffPanel.evaluate(element=>{element.open=true;});
    await expect(handoffPanel).toBeVisible({timeout:15000});
    await handoffPanel.evaluate(element=>{element.open=false;});
    await expect(handoffPanel).toBeHidden();
    await expect(continueToIdeas).toBeEnabled();
    await continueToIdeas.click();
    const ideas=page.locator('[data-video-quick-control="phrases"]');
    await expect(ideas).toHaveAttribute("aria-pressed","true");
    await expect(studio).toHaveAttribute("data-active-workspace","phrases");
    await expect(page.locator('[data-workspace-section="phrases"][data-video-quick-phrases]')).toBeVisible();
    // Optional Goal refinement belongs to Ideas/Personalization. It becomes
    // intentionally hidden on Montage Text, so exercise it BEFORE navigation.
    const refinement=page.locator('[data-video-ideas-refinement]');
    await expect(refinement.locator(":scope > summary")).toBeVisible();
    // The native details may already be open after the Ideas transition.
    // Exercise a genuine close/open toggle instead of assuming initial state.
    if(await refinement.evaluate(node=>node.open)){
      await refinement.locator(":scope > summary").click();
      await expect(refinement).not.toHaveAttribute("open","");
    }
    await refinement.locator(":scope > summary").click();
    await expect(refinement).toHaveAttribute("open","");
    await expect(page.locator('[data-auto-video-topic-panel]')).toBeVisible();
    // Validate the physical Ideas -> Montage Text CTA and the shared editor.
    await page.locator('[data-video-ideas-open-montage-text]').click();
    await expect(page.locator('[data-video-montage-tab="text"]'))
      .toHaveAttribute("aria-pressed","true");
    await expect(page.locator('[data-video-montage-text]')).toBeVisible();
    // Return to Ideas before testing the independent top-level Montage tap.
    await ideas.tap();
    await expect(studio).toHaveAttribute("data-active-workspace","phrases");
    const montage=page.locator('[data-video-quick-control="editor"]');
    await expect(montage).toBeVisible({timeout:15000});
    await expect(montage).toBeEnabled({timeout:15000});
    // On iPhone WebKit the native touch path is authoritative. One
    // physical user tap, no force, no artificial second click.
    await montage.tap();
    try{
      await expect(studio).toHaveAttribute("data-active-workspace","editor",{timeout:15000});
      await expect(montage).toHaveAttribute("aria-pressed","true");
    }catch(error){
      const state=await page.evaluate(()=>({
        hydrated:document.querySelector('[data-video-studio-hydrated]')?.getAttribute('data-video-studio-hydrated'),
        workspace:document.querySelector('[data-mandala-free-video]')?.getAttribute('data-active-workspace'),
        editorPressed:document.querySelector('[data-video-quick-control="editor"]')?.getAttribute('aria-pressed'),
        editorDisabled:document.querySelector('[data-video-quick-control="editor"]')?.disabled??null,
      })).catch(()=>({diagnosticsUnavailable:true}));
      throw new Error("WEBKIT_MONTAGE_SINGLE_TAP_NOT_COMMITTED "+JSON.stringify(state),{cause:error});
    }
    // Open the independent video storyboard in Montage. The written Concept stays in Ideas.
    const montageStyle=page.locator('[data-video-montage-tab="effects"]');
    await expect(montageStyle).toHaveAttribute("aria-pressed","true");
    const montageStoryboardTab=page.locator('[data-video-montage-tab="concept"]');
    await expect(montageStoryboardTab).toBeVisible();
    await montageStoryboardTab.tap();
    await expect(montageStoryboardTab).toHaveAttribute("aria-pressed","true");
    const montageVideoConcept=page.locator('[data-video-montage-concept]');
    await expect(montageVideoConcept).toBeVisible();
    // Story is the EXISTING automatic storyboard generated from the Ideas concept.
    // No manual prompt/questionnaire: check real scene cards and licensed posters.
    const automaticStoryboard=montageVideoConcept.locator('[data-video-auto-storyboard]');
    await expect(automaticStoryboard).toBeVisible({timeout:20000});
    const cards=automaticStoryboard.locator('[data-video-story-scene]');
    const storyboardShotCount=Number(await automaticStoryboard.getAttribute('data-storyboard-scenes'));
    assert.ok(Number.isSafeInteger(storyboardShotCount) && storyboardShotCount>=0,
      "automatic storyboard must report a finite scene count");
    await expect(cards).toHaveCount(storyboardShotCount);
    assert.equal(await automaticStoryboard.locator("textarea").count(),0,
      "the Story tab must render its proposal, not ask the user to fill it out");
    if(storyboardShotCount>0){
      assert.ok(storyboardShotCount>0&&storyboardShotCount<=5,
        "compact storyboard shows at most five verified scene summaries");
      await expect(automaticStoryboard.locator('[data-video-auto-storyboard-list]')).toBeVisible();
      await expect(cards.first()).toContainText(
        locale==="ru"?"Сцена 1":locale==="es"?"Escena 1":"Scene 1");
      const firstPoster=cards.first().locator("img");
      if(await firstPoster.count()){
        assert.ok((await firstPoster.getAttribute("src"))?.startsWith("/"),
          "source-backed poster uses an approved local URL");
        assert.ok((await firstPoster.getAttribute("alt"))?.trim(),
          "visible poster retains a meaningful source label");
      }else{
        await expect(cards.first()).toContainText(
          locale==="ru"?"Превью недоступно":locale==="es"?"Vista previa no disponible":"Preview unavailable");
      }
    }else{
      // No fictional clips: missing verified footage must fail closed with a
      // visible explanation, not restore the retired manual storyboard editor.
      await expect(automaticStoryboard.getByRole("status")).toBeVisible();
      await expect(automaticStoryboard.locator('[data-video-auto-storyboard-apply]')).toHaveCount(0);
    }
    await montageStyle.tap();
    await expect(montageStyle).toHaveAttribute("aria-pressed","true");
    const ideasTop=page.locator('[data-video-quick-control="phrases"]');
    await ideasTop.tap();
    const ideasConceptTab=page.locator('[data-video-ideas-tab="concept"]');
    const ideasPersonalTab=page.locator('[data-video-ideas-tab="personalization"]');
    await expect(ideasPersonalTab).toHaveAttribute("aria-pressed","true");
    await ideasConceptTab.tap();
    const concept=page.locator("[data-video-ideas-concept-panel]");
    await expect(concept).toBeVisible();
    const headline=concept.locator("[data-video-concept-main-idea]");
    const narrative=concept.locator("[data-video-concept-paragraph]");
    await expect(headline).toBeVisible();
    await expect(narrative).toBeVisible();
    await expect(concept.locator("[data-video-concept-all-parameters]")).toBeVisible();
    const mainBox=await headline.boundingBox(),storyBox=await narrative.boundingBox();
    assert.ok(mainBox&&storyBox&&mainBox.y<storyBox.y,"Main idea above story on iPhone");
    const rects=await concept.locator("[data-concept-parameter]").evaluateAll(nodes=>
      nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y};}));
    assert.ok(rects.length>=6&&rects.length<=26,"Only visible decision-relevant parameters");
    for(let i=1;i<rects.length;i++)assert.ok(rects[i].y>rects[i-1].y&&
      Math.abs(rects[i].x-rects[0].x)<3,"Parameters stay in one vertical column");
    await concept.locator("[data-video-concept-edit]").click();
    await expect(page.locator("[data-video-concept-auth-overlay]")).toBeVisible();
    await page.locator("[data-video-concept-auth-close]").click();
    await expect(page.locator("[data-video-concept-auth-overlay]")).toHaveCount(0);
    await concept.locator("[data-video-concept-approve]").click();
    await expect(studio).toHaveAttribute("data-active-workspace","editor");
    await expect(montageStyle).toHaveAttribute("aria-pressed","true");
    await ideasTop.tap();
    await expect(ideasConceptTab).toHaveAttribute("aria-pressed","true");
    await expect(page.locator("[data-video-concept-auto]"))
      .toHaveAttribute("data-concept-approved","true");
    await montage.tap();
    // Explicit Style selection remains a real tap, not a render bypass.
    const styleTab=page.locator('[data-video-montage-tab="effects"]');
    await expect(styleTab).toBeVisible();
    await styleTab.tap();
    await expect(styleTab).toHaveAttribute("aria-pressed","true");
    const styles=page.locator("[data-video-montage-style]");
    await expect(styles).toHaveCount(6);
    const minimal=styles.nth(3);
    await expect(minimal).toBeVisible();
    const hero=page.locator("[data-video-mandala-hero]");
    const master=page.locator("[data-mandala-master-mp4]");
    await minimal.tap();
    await expect(minimal).toHaveAttribute("aria-pressed","true");
    await expect(hero).toHaveAttribute("data-video-preview-style","minimal");
    await expect(hero).toHaveAttribute("data-preview-playing","true");
    await expect(master).toHaveCount(1);
    await expect.poll(()=>master.evaluate(video=>video.preload),{timeout:15000}).toBe("auto");
    await expect.poll(()=>master.evaluate(video=>
      video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0&&!video.error),
      {timeout:20000}).toBe(true);
    // Actual route-matched recipient path: ONE header switch, working kind,
    // real occasion and the original Goal→Ideas action. The ordinary visitor
    // must not need a hidden storyboard Confirm to stage these four captions.
    const goalTab=page.locator('[data-video-quick-control="video"]');
    await goalTab.click();
    await expect(goalTab).toHaveAttribute("aria-pressed","true");
    const others=page.locator('[data-auto-video-audience="others"]');
    await expect(page.locator('[data-auto-video-audience]')).toHaveCount(2);
    await expect(page.locator('[data-video-goal-audience-option]')).toHaveCount(0);
    await others.click();
    await expect(others).toHaveAttribute("aria-pressed","true");
    const recipientCatalog=page.locator('[data-video-recipient-catalog]');
    await expect(recipientCatalog).toBeVisible();
    await expect(recipientCatalog).toHaveAttribute("data-video-recipient-aspect","portrait");
    await expect(page.locator('[data-video-recipient-format-note]')).toContainText("9:16");
    await expect(page.locator('[data-video-goal-topic-chips]')).toHaveCount(0);
    // Four full-width horizontal format rows; Reels is the existing vertical video
    // pipeline, not a new renderer. Measure actual geometry on mobile WebKit.
    const recipientFormats=page.locator('[data-auto-video-recipient-kind]');
    await expect(recipientFormats).toHaveCount(4);
    for(const width of [320,354,390,430]){
      await page.setViewportSize({width,height:840});
      const boxes=await recipientFormats.evaluateAll(elements=>elements.map(element=>{
        const rect=element.getBoundingClientRect();
        const image=element.querySelector("img")?.getBoundingClientRect();
        const body=element.querySelector("span")?.getBoundingClientRect();
        return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,
          width:rect.width,imageRight:image?.right||0,bodyLeft:body?.left||0};
      }));
      assert.equal(boxes.length,4,"four format choices "+width);
      assert.ok(boxes.every((item,index)=>index===0||item.top>=boxes[index-1].bottom-2),
        "one vertical list of horizontal cards "+width+" "+JSON.stringify(boxes));
      assert.ok(boxes.every(item=>item.width>190&&item.imageRight<item.bodyLeft+3&&item.right<=width+1),
        "photo at left, copy at right, no overflow "+width+" "+JSON.stringify(boxes));
    }
    await page.setViewportSize({width:390,height:840});
    const reelsFormat=page.locator('[data-auto-video-recipient-kind="reels"]');
    await reelsFormat.click();
    await expect(reelsFormat).toHaveAttribute("aria-pressed","true");
    await expect(page.locator('[data-video-recipient-topic-summary]')).toContainText("Reels");
    await expect(page.locator('[data-auto-video-recipient-occasion]')).toHaveCount(0);
    // Audio is still its original local, opt-in flow.
    const audioFormat=page.locator('[data-auto-video-recipient-kind="audio_visual"]');
    await audioFormat.click();
    await expect(audioFormat).toHaveAttribute("aria-pressed","true");
    const audioFlow=page.locator('[data-video-recipient-audio-panel]');
    await expect(audioFlow).toBeVisible();
    const transcribe=page.locator('[data-video-recipient-audio-transcribe]');
    const nextAudio=page.locator('[data-video-recipient-audio-next]');
    await expect(transcribe).toBeDisabled();
    await expect(nextAudio).toBeDisabled();
    await expect(page.locator('[data-video-recipient-audio-record]')).toBeVisible();
    const outboundStt=[];
    page.on("request",request=>{
      if(request.method()==="POST"&&request.url().includes("/api/holistic-support/audio-storyboard"))
        outboundStt.push(request.url());
    });
    await page.locator('[data-video-recipient-audio-upload]').setInputFiles({
      name:"sample.wav",mimeType:"audio/wav",buffer:wav(2)
    });
    await expect(audioFlow).toContainText("sample.wav");
    await expect(page.locator('[data-video-recipient-audio-rights-notice]')).toBeVisible();
    await expect(page.locator('[data-video-recipient-audio-stt-notice]')).toBeVisible();
    await expect(audioFlow.locator('input[type="checkbox"]')).toHaveCount(0);
    await expect(transcribe).toBeEnabled();
    await expect(nextAudio).toBeDisabled();
    assert.equal(outboundStt.length,0,"no STT request before clicking Transcribe");
    // Moving to a different recipient must discard this local private audio.
    const greeting=page.locator('[data-auto-video-recipient-kind="greeting"]');
    await greeting.click();
    await expect(audioFlow).toBeHidden();
    await expect(greeting).toHaveAttribute("aria-pressed","true");
    const birthday=page.locator('[data-auto-video-recipient-occasion="birthday"]');
    await birthday.click();
    await expect(birthday).toHaveAttribute("aria-pressed","true");
    await continueToIdeas.click();
    await expect(ideas).toHaveAttribute("aria-pressed","true");
    await expect(studio).toHaveAttribute("data-active-workspace","phrases");
    // These are the actual source-backed montage title inputs; source edits
    // use the same data fed to compileFreeFilmPreset, not a fake screenshot.
    const firstCaption=page.locator('[data-auto-video-stage-caption="0"]');
    await expect(firstCaption).toHaveValue(locale==="ru"?"День рождения":"Birthday");
    await expect(page.locator('[data-video-mandala-hero]')).toHaveAttribute(
      "data-video-preview-clips",/^(4|5|6|7|8|9|10|11|12)$/);
  }finally{release();await context.close();}
}
// Real guest route browser acceptance: the fragment carries only optional
// user-approved text; a fresh recipient tab must not inherit consent. No
// provider calls, personal audio upload, paid models or fake recorder output.
async function verifyGuestVoiceConsent(browser,locale){
  const context=await browser.newContext({
    viewport:{width:390,height:840},isMobile:true,hasTouch:true,
    acceptDownloads:true,serviceWorkers:"block",
  });
  const providerPosts=[];
  try{
    const page=await context.newPage();
    page.on("request",request=>{
      if(request.method()==="POST" &&
        /\/api\/holistic-support\/(?:voice|loved-voices)(?:[/?]|$)/.test(request.url()))
        providerPosts.push(request.url());
    });
    await page.goto(BASE+"/"+locale+"/holistic-support/voice-message",{
      waitUntil:"domcontentloaded",timeout:90000,
    });
    const guest=page.locator("[data-guest-voice-message]");
    await expect(guest).toBeVisible({timeout:25000});
    await expect(guest).toHaveAttribute("data-guest-voice-hydrated","true",{timeout:30000});
    const start=page.locator("[data-guest-message-start]");
    await expect(start).toBeDisabled();
    await expect(page.locator("[data-guest-message-consent]")).toHaveAttribute("aria-checked","false");
    const phrase=locale==="ru"?"Я рядом и поддерживаю тебя.":"I am here to support you.";
    await page.locator("[data-guest-message-phrase]").fill(phrase);
    await expect(page.locator("[data-guest-message-phrase]")).toHaveValue(phrase);
    const invitation=page.locator("[data-guest-message-link]");
    await expect(invitation).toBeVisible();
    const uri=new URL(await invitation.inputValue());
    assert.equal(uri.origin,new URL(BASE).origin);
    assert.equal(uri.search,"","the invited phrase must not enter server query or logs");
    assert.equal(uri.hash,"#t="+encodeURIComponent(phrase));
    await expect(page.locator("[data-guest-message-copy]")).toBeEnabled();
    await page.locator("[data-guest-message-phrase]").fill("https://invalid.example");
    await expect(page.locator("[data-guest-message-copy]")).toBeDisabled();
    await page.locator("[data-guest-message-phrase]").fill(phrase);
    // Native Safari implicit-label toggling failed on real macOS WebKit.
    // Check explicit user-triggered React consent and its revocation.
    const consentBox=page.locator("[data-guest-message-consent]");
    await expect(consentBox).toHaveAttribute("role","checkbox");
    await expect(consentBox).toHaveAttribute("aria-checked","false");
    // Mac WebKit is running as an emulated touch iPhone. Use an actual tap,
    // not desktop mouse click on a touch target. Capture events only for
    // non-sensitive CI diagnosis if the React toggle still does not update.
    await page.evaluate(()=>{
      const button=document.querySelector("[data-guest-message-consent]");
      const probe={clicks:0,touches:0};
      window.__guestConsentTapProbe=probe;
      button?.addEventListener("click",()=>{probe.clicks+=1;});
      button?.addEventListener("touchend",()=>{probe.touches+=1;});
    });
    await consentBox.tap();
    try{await expect(consentBox).toHaveAttribute("aria-checked","true",{timeout:10000});}
    catch(error){
      const observed=await page.evaluate(()=>({
        clicks:window.__guestConsentTapProbe?.clicks??null,
        touches:window.__guestConsentTapProbe?.touches??null,
        focused:document.hasFocus(),visible:document.visibilityState,
        value:document.querySelector("[data-guest-message-consent]")?.getAttribute("aria-checked")
      }));
      console.error("VOICE_GUEST_TOUCH_CONSENT_DIAG "+JSON.stringify(observed));
      throw error;
    }
    await expect(start).toBeEnabled();
    await consentBox.tap();
    await expect(consentBox).toHaveAttribute("aria-checked","false");
    await expect(start).toBeDisabled();
    await consentBox.tap();
    await expect(consentBox).toHaveAttribute("aria-checked","true");
    await expect(start).toBeEnabled();
    await expect(page.locator("[data-guest-message-play]")).toHaveCount(0);
    await expect(page.locator("[data-guest-message-save]")).toHaveCount(0);
    // The caller's consent is exercised while its tab has never left the foreground.
    // Only afterwards open the independent recipient and prove no consent inherits.
    const recipient=await context.newPage();
    try{
      await recipient.goto(uri.href,{waitUntil:"domcontentloaded",timeout:90000});
      await expect(recipient.locator("[data-guest-voice-message]")).toHaveAttribute("data-guest-voice-hydrated","true",{timeout:30000});
      await expect(recipient.locator("[data-guest-message-phrase]")).toHaveValue(phrase,{timeout:15000});
      await expect(recipient.locator("[data-guest-message-consent]")).toHaveAttribute("aria-checked","false");
      await expect(recipient.locator("[data-guest-message-start]")).toBeDisabled();
    }finally{await recipient.close();}
    assert.deepEqual(providerPosts,[],"guest invitation or consent cannot call a cloud TTS API");
  }finally{await context.close();}
}

// Linux WebKit often lacks Canvas capture codecs. Run the very same real
// encoded video+audio acceptance on macOS WebKit and Linux Chromium.
// The default still exercises BOTH engines for developer/manual runs.
const requestedEngine=process.env.HH_VOICE_E2E_ENGINE||"both";
assert.ok(["both","webkit","chromium"].includes(requestedEngine),"unknown test browser");
// Test a real native window/compositor on macOS WebKit only; Chromium stays headless.
// This flag never relaxes downloaded media, PCM, consent or privacy assertions.
const headedWebKit=requestedEngine==="webkit" && process.env.HH_VOICE_E2E_HEADED==="1";
if(process.env.HH_VOICE_E2E_HEADED==="1"){
  assert.equal(requestedEngine,"webkit","headed media acceptance is WebKit-only");
  assert.equal(process.platform,"darwin","headed WebKit acceptance requires macOS");
}
// Fail closed with evidence instead of consuming the entire macOS runner quota.
// Actual encoded 10-second voice video should not run indefinitely.
let lastPhase="not-started";
const phase=(engine,stage)=>{lastPhase=engine+":"+stage;console.log("VOICE_E2E_PHASE "+lastPhase);};
// A frozen WebKit renderer can make page.evaluate or browser.close wait forever.
// Playwright's default action timeout does NOT cover page.evaluate. Keep the
// real-media acceptance red, but surface the original recorder failure promptly.
const withDeadline=(work,ms,label)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error(label+" timed out after "+ms+"ms")),ms);
  Promise.resolve(work).then(
    value=>{clearTimeout(timer);resolve(value);},
    error=>{clearTimeout(timer);reject(error);}
  );
});
const watchdog=setTimeout(()=>{
  console.error("VOICE_E2E_WATCHDOG_TIMEOUT engine="+requestedEngine+" elapsed_seconds=360 last_phase="+lastPhase);
  process.exit(1);
},360000);
for(const [engine,browserType] of [["webkit",webkit],["chromium",chromium]]
  .filter(([name])=>requestedEngine==="both"||name===requestedEngine)) {
  phase(engine,"launch");
  const browser=await browserType.launch({headless:!(engine==="webkit" && headedWebKit)});
  try {
    const locale=engine==="webkit"?"ru":"en";
    phase(engine,"workspace-hydration");
    await verifyWorkspaceHydration(browser,locale);
    phase(engine,"guest-local-recording-invitation");
    await verifyGuestVoiceConsent(browser,locale);
    phase(engine,"guest-local-recording-invitation-passed");
    const context=await browser.newContext({viewport:{width:390,height:840},acceptDownloads:true,hasTouch:engine==="webkit",serviceWorkers:"block"});
    // Playwright has no default action timeout: an obscured iPhone control can
    // otherwise hang until the six-minute process watchdog with no locator.
    context.setDefaultTimeout(25000);
    context.setDefaultNavigationTimeout(90000);
    try{
      if(process.env.HH_VOICE_SKIP_GUIDED_PRACTICES==="1"){
        // The workflow runs dedicated consent-only WebKit acceptance separately.
        // Real encoded voice/video media acceptance continues below.
        phase(engine,"guided-practices-skipped-by-exact-ci-only-policy");
      }else{
        phase(engine,"guided-practices-mobile");
        await verifyGuidedPractices({browser,base:BASE,engine});
        phase(engine,"guided-practices-passed");
      }
      // Retain only the REAL File objects created by the browser's own
      // MediaRecorder. Reading blob: URLs through fetch can be blocked by
      // connect-src CSP even while native audio playback works correctly.
      await context.addInitScript(()=>{
        const originalCreate=URL.createObjectURL;
        const recordedFiles=new Map();
        const recordedVideos=new Map();
        window.__hhOwnVoiceFiles=recordedFiles;
        window.__hhRecordedVideoBlobs=recordedVideos;
        URL.createObjectURL=function(blob){
          const uri=originalCreate.call(URL,blob);
          if(blob instanceof File && /^holistic-house-voice-\d+\.(?:m4a|webm)$/.test(blob.name))
            recordedFiles.set(uri,blob);
          if(blob instanceof Blob && blob.type.startsWith("video/"))recordedVideos.set(uri,blob);
          return uri;
        };
      });
      const page=await context.newPage();
      const payloads=[];
      const errors=[];
      const requests=[];
      page.on("request",req=>{if(req.url().includes("/api/holistic-support/voice"))requests.push({method:req.method(),url:req.url()});});
      page.on("requestfailed",req=>{if(req.url().includes("/api/holistic-support/voice"))errors.push("network:"+req.method()+":"+req.failure()?.errorText);});
      page.on("pageerror",e=>errors.push(e.message));
      page.on("console",msg=>{
        const code=msg.text();
        if(code.startsWith("HH_WEBKIT_MP4_EXPORT_FAILURE:"))errors.push(code);
      });
      page.on("crash",()=>phase(engine,"page-crashed"));
      // Single permanent fixture route. Dynamically refuse only Sofia while
      // testing provider errors; stacking/unrouting Playwright handlers can
      // leave the following REAL browser affirmation POST unmatched in WebKit.
      let rejectSofiaSample=false;
      await page.route("**/api/holistic-support/voice",async route=>{
        const req=route.request();
        if(req.method()==="GET"){
          await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({enabled:true,publicAffirmationsEnabled:true,languages:["ru","en","es"]})});
          return;
        }
        const body=req.postDataJSON();
        if(rejectSofiaSample && body?.mode==="sample" && body?.voiceId==="sofia"){
          await route.fulfill({status:503,contentType:"application/json",
            body:JSON.stringify({error:"TTS_PROVIDER_UNAVAILABLE"})});
          return;
        }
        payloads.push(body);
        await route.fulfill({status:200,contentType:"audio/wav",body:wav()});
      });
      phase(engine,"navigate");
      await page.goto(BASE+"/"+locale+"/holistic-support/mandala",{waitUntil:"domcontentloaded",timeout:90000});
      await page.locator("[data-video-quick-builder]").waitFor({state:"visible",timeout:25000});
      // Next renders the workspace tabs before client event handlers hydrate.
      // On Safari an early click can be swallowed and leave Montage hidden.
      await page.locator('[data-video-studio-hydrated="true"]').waitFor({state:"attached",timeout:35000});
      phase(engine,"editor-ready");
      // A real visitor sets duration using Montage → Music, then moves to
      // Phrases. The retired Video quick-audio disclosure is intentionally
      // hidden by the canonical six-workspace layout: do not bypass its CSS.
      const editorTab=page.locator('[data-video-quick-control="editor"]');
      await editorTab.click();
      await expect(editorTab).toHaveAttribute("aria-pressed","true",{timeout:15000});
      // Montage opens on the Style tab, not the retired Concept screen.
      const montageStyleTab=page.locator('[data-video-montage-tab="effects"]');
      await expect(montageStyleTab)
        .toHaveAttribute("aria-pressed","true",{timeout:15000});
      await expect(montageStyleTab).toBeVisible();
      await montageStyleTab.click();
      await expect(montageStyleTab).toHaveAttribute("aria-pressed","true",{timeout:15000});
      // Owner-approved Montage PRO is a real fourth tab with three clear
      // offers and TWO navigation actions, not a checkout or a second renderer.
      const montageProTab=page.locator('[data-video-montage-tab="promo"]');
      await montageProTab.click();
      const montageProOffer=page.locator('[data-video-montage-pro-offer]');
      await expect(montageProOffer).toBeVisible();
      await expect(montageProOffer.locator('[data-video-pro-feature]')).toHaveCount(3);
      await expect(montageProOffer.locator('[data-video-montage-pro-free]')).toBeVisible();
      await expect(montageProOffer.locator('[data-video-montage-pro-explore]')).toBeVisible();
      // Verify iPhone widths without replacing the live editor with a mock.
      for(const width of [320,390,430]){
        await page.setViewportSize({width,height:844});
        const geometry=await page.evaluate(()=>({
          viewport:document.documentElement.clientWidth,
          document:document.documentElement.scrollWidth
        }));
        assert.ok(geometry.document<=geometry.viewport+2,
          'MONTAGE_PRO_NO_HORIZONTAL_OVERFLOW_'+width+' '+JSON.stringify(geometry));
      }
      await page.setViewportSize({width:390,height:844});
      await montageProOffer.locator('[data-video-montage-pro-free]').click();
      await expect(page.locator('[data-video-montage-tab="concept"]')).toHaveAttribute('aria-pressed','true');
      await montageProTab.click();
      await montageProOffer.locator('[data-video-montage-pro-explore]').click();
      await expect(page.locator('[data-video-quick-control="pro"]')).toHaveAttribute('aria-pressed','true');
      await editorTab.click();
      await montageStyleTab.click();
      await expect(montageStyleTab).toHaveAttribute('aria-pressed','true');
      phase(engine,"montage-pro-offer-routes-passed");
      // Reproduce the owner's iPhone case before recording real voice.
      const selectedStyle=page.locator('[data-video-montage-style="3"]');
      const selectedMaster=page.locator("[data-mandala-master-mp4]");
      await expect(selectedStyle).toBeVisible();
      await expect(selectedMaster).toHaveAttribute("preload","none");
      if(engine==="webkit")await selectedStyle.tap();
      else await selectedStyle.click();
      await expect(selectedStyle).toHaveAttribute("aria-pressed","true");
      await expect(page.locator("[data-video-mandala-hero]")).toHaveAttribute("data-video-preview-style","minimal");
      await expect.poll(()=>selectedMaster.evaluate(video=>video.preload),{timeout:15000}).toBe("auto");
      // Modern Montage shows the voice and music controls only after choosing Audio.
      // Exercise the real visible tab instead of waiting for an unmounted drawer.
      // Current Montage has four compact tabs. Real duration is under Settings
      // and current sound/library controls are in the independent Audio tab.
      await page.locator('[data-video-montage-tab="concept"]').click();
      const montageSettingsTab=page.locator('[data-video-story-open-settings]');
      await montageSettingsTab.click();
      await expect(page.locator('[data-video-basic-editor]')).toHaveAttribute("data-montage-panel","settings");
      const durationSelect=page.locator('[data-video-montage-preference="duration"]');
      await durationSelect.waitFor({state:"visible",timeout:25000});
      await durationSelect.selectOption("10");
      await expect(durationSelect).toHaveValue("10");
      const montageAudio=page.locator('[data-video-montage-open-audio]');
      await montageAudio.click();
      await expect(page.locator('[data-video-montage-audio]')).toBeVisible();
      await expect(page.locator('[data-video-montage-audio]')).toBeVisible();
      const compactGrid=page.locator('[data-video-audio-compact-grid]');
      await expect(compactGrid).toBeVisible();
      // Initial filter follows the approved video concept; choose All to
      // inspect the entire approved collection, then prove Focus narrows it.
      const allMusic=page.locator('[data-video-audio-category="all"]');
      const focusMusic=page.locator('[data-video-audio-category="focus"]');
      await allMusic.click();
      await expect(allMusic).toHaveAttribute("aria-pressed","true");
      await expect(compactGrid.locator('[data-video-audio-compact-track]')).toHaveCount(5);
      await focusMusic.click();
      await expect(focusMusic).toHaveAttribute("aria-pressed","true");
      await expect(compactGrid.locator('[data-video-audio-compact-track]')).toHaveCount(1);
      await allMusic.click();
      await expect(compactGrid.locator('[data-video-audio-compact-track]')).toHaveCount(5);
      await expect(page.locator('[data-video-audio-compact-upload]')).toHaveCount(1);
      await expect(page.locator('[data-video-audio-mode]')).toHaveCount(0);
      await page.locator('[data-video-audio-compact-silent]').click();
      const choices=compactGrid.locator('[data-video-audio-compact-select]');
      await choices.nth(0).click();
      await choices.nth(1).click();
      await expect(choices.nth(0)).toHaveAttribute("aria-pressed","true");
      await expect(choices.nth(1)).toHaveAttribute("aria-pressed","true");
      await expect(page.locator('[data-video-audio-compact-selected]')).toContainText("2/3");
      await expect(page.locator('[data-video-stage-actions="montage"] [data-video-quick-generate]')).toBeVisible();
      await page.locator('[data-video-audio-compact-silent]').click();
      await page.locator('[data-video-quick-control="phrases"]').click();
      const phrases=page.locator('[data-workspace-section="phrases"][data-video-quick-phrases]');
      await phrases.waitFor({state:"visible"});
      // Ideas has two tabs. Voice and My Voice are visible opt-in submodes.
      const ideasModes=phrases.locator("[data-video-ideas-tabs]");
      await expect(ideasModes).toBeVisible();
      const personalTab=ideasModes.locator('[data-video-ideas-tab="personalization"]');
      const conceptTab=ideasModes.locator('[data-video-ideas-tab="concept"]');
      await expect(personalTab).toHaveAttribute("aria-pressed","true");
      await expect(phrases.locator("[data-video-ideas-personalization-panel]")).toBeVisible();
      await expect(phrases.locator("[data-personalization-kind]")).toHaveCount(3);
      await conceptTab.click();
      await expect(phrases.locator("[data-video-ideas-concept-panel]")).toBeVisible();
      await personalTab.click();
      const advancedText=phrases.locator('[data-video-phrase-audio-shortcut]');
      await expect(advancedText).toBeVisible();
      await advancedText.click();
      const advancedVoice=phrases.locator('[data-video-ideas-advanced-voice]');
      await expect(advancedVoice).toHaveAttribute("open","");
      const voiceModeButton=phrases.locator('[data-video-ideas-voice-mode="voice"]');
      const myVoiceModeButton=phrases.locator('[data-video-ideas-voice-mode="my-voice"]');
      await voiceModeButton.click();
      await expect(voiceModeButton).toHaveAttribute("aria-pressed","true");
      await expect(phrases.locator("[data-hypno-voice]")).toBeVisible();
      // Own-file upload belongs only to the explicit My Voice mode, not standard Voice.
      await expect(phrases.locator("[data-video-ideas-own-upload]")).toHaveCount(0);
      await expect(phrases.locator('[data-video-affirmation-gender="male"]')).toBeVisible();
      const compactVoicePanel=phrases.locator('[data-video-affirmation-voice][data-voice-layout="compact"]');
      await expect(compactVoicePanel).toBeVisible();
      await expect(compactVoicePanel.locator('[data-video-affirmation-phrase]')).toBeVisible();
      await expect(compactVoicePanel.locator('[data-video-affirmation-selection-summary]')).toHaveCount(0);
      await expect(compactVoicePanel.locator('[data-video-affirmation-voice-consent]')).toHaveCount(1);
      for(const width of [320,354,390,430]){
        phase(engine,"ideas-voice-compact-"+width);
        await page.setViewportSize({width,height:840});
        const shape=await compactVoicePanel.evaluate(panel=>{
          const cards=[...panel.querySelectorAll('[data-video-affirmation-voice-card]')].filter(n=>n.getBoundingClientRect().width>0);
          const genders=[...panel.querySelectorAll('[data-video-affirmation-gender]:not([hidden])')].map(n=>n.getBoundingClientRect());
          return {tops:cards.map(n=>n.getBoundingClientRect().top),widths:cards.map(n=>n.getBoundingClientRect().width),
            genders:genders.map(n=>n.top),
            sampleBottom:panel.querySelector('[data-video-affirmation-voice-select]')?.getBoundingClientRect().bottom,
            consentTop:panel.querySelector('[data-video-affirmation-voice-consent]')?.getBoundingClientRect().top,
            choiceTop:panel.querySelector('[data-video-affirmation-voice-select]')?.getBoundingClientRect().top,
            action:panel.querySelector('[data-video-generate-affirmation-audio]')?.getBoundingClientRect().top,
            doc:document.documentElement.scrollWidth,screen:document.documentElement.clientWidth};
        });
        assert.equal(shape.widths.length,3,"3 voice cards "+width);
        assert.ok(shape.widths.every(x=>x>=60),"readable cards "+width+" "+JSON.stringify(shape));
        assert.ok(shape.tops.every(x=>Math.abs(x-shape.tops[0])<3),"one card row "+width);
        assert.ok(shape.genders.length===2&&Math.abs(shape.genders[0]-shape.genders[1])<3,"two gender tabs "+width);
        assert.ok(shape.consentTop<shape.choiceTop,"explicit consent precedes voice cards "+width);
        assert.ok(shape.action>=shape.sampleBottom&&shape.action-shape.sampleBottom<32,
          "generation follows voice sample "+width);
        assert.ok(shape.doc<=shape.screen+2,"no horizontal overflow "+width);
        if(engine==="chromium"){mkdirSync("artifacts/hypno-compact",{recursive:true});
          await page.screenshot({path:"artifacts/hypno-compact/ideas-voice-"+locale+"-"+width+".png",fullPage:true});}
      }
      await page.setViewportSize({width:390,height:840});
      await myVoiceModeButton.click();
      await expect(myVoiceModeButton).toHaveAttribute("aria-pressed","true");
      await expect(phrases.locator("[data-video-ideas-own-upload]")).toHaveCount(1);
      await expect(phrases.locator("[data-video-ideas-record-voice]")).toHaveCount(1);
      await expect(phrases.locator("[data-video-own-voice-record]")).toBeVisible();
      await expect(phrases.locator("[data-video-generate-affirmation-audio]")).toHaveCount(0);
      await expect(phrases.locator('[data-video-affirmation-voice-card="maya"]')).toBeHidden();
      // Change back to the standard voice while its controls are visible,
      // then return to Personalization for the phrase and idea review.
      await voiceModeButton.click();
      await expect(voiceModeButton).toHaveAttribute("aria-pressed","true");
      await personalTab.click();
      await expect(personalTab).toHaveAttribute("aria-pressed","true");
      await expect(phrases.locator("[data-video-ideas-personalization-panel]")).toBeVisible();
      // Owner-approved Phrases: measure the actual DOM in three iPhone widths.
      // These checks fail on double-row tabs, a tall portrait player or overflow.
      for(const width of [320,390,430]){
        phase(engine,"phrases-geometry-"+width);
        await page.setViewportSize({width,height:840});
        const measured=await page.evaluate(()=>{
          const nav=document.querySelector("[data-video-quick-controls]");
          const stage=document.querySelector("[data-video-mandala-hero]");
          const tabs=[...nav.querySelectorAll("button")].map(node=>{
            const rect=node.getBoundingClientRect();
            return {top:rect.top,bottom:rect.bottom};
          });
          const rect=stage.getBoundingClientRect();
          return {tabs,navBottom:nav.getBoundingClientRect().bottom,
            stageTop:rect.top,ratio:rect.width/rect.height,
            documentWidth:document.documentElement.scrollWidth,
            viewportWidth:document.documentElement.clientWidth};
        });
        assert.equal(measured.tabs.length,6,"six workspace tabs: "+width);
        assert.ok(measured.tabs.every(t=>Math.abs(t.top-measured.tabs[0].top)<3),
          "single row of six tabs: "+width+" "+JSON.stringify(measured));
        assert.ok(measured.navBottom<=measured.stageTop+2,
          "tabs above video: "+width+" "+JSON.stringify(measured));
        assert.ok(Math.abs(measured.ratio-16/9)<.18,
          "video is 16:9: "+width+" "+JSON.stringify(measured));
        assert.ok(measured.documentWidth<=measured.viewportWidth+2,
          "no horizontal overflow: "+width+" "+JSON.stringify(measured));
        if(engine==="chromium"){
          mkdirSync("artifacts/hypno-compact",{recursive:true});
          await page.screenshot({path:"artifacts/hypno-compact/phrases-"+locale+"-"+width+".png",fullPage:true});
        }
      }
      await page.setViewportSize({width:390,height:840});
      // The original voice editor was opened by the real opt-in gesture above.
      await expect(advancedVoice).toHaveAttribute("open","");
      // The approved one phrase editor now lives in Montage Text. Traverse
      // through visible Ideas → Montage → Text, then Record → My Voice.
      await phrases.locator('[data-video-ideas-open-montage-text]').click();
      await expect(page.locator('[data-video-montage-tab="text"]')).toHaveAttribute("aria-pressed","true");
      await expect(page.locator('[data-video-montage-text]')).toBeVisible();
      const montageIdeas=page.locator('[data-video-montage-text] [data-video-ideas-compact]');
      await expect(montageIdeas).toBeVisible();
      const montageCountLabel=montageIdeas.locator('[data-video-ideas-selected-count]');
      await expect(montageCountLabel).toBeVisible();
      const initialMontageCount=Number(((await montageCountLabel.innerText()).match(/^\s*(\d+)/)||[])[1]||0);
      assert.ok(initialMontageCount>=5,"Montage Text starts with at least five selected phrases");
      const firstIdea=montageIdeas.locator('[data-video-idea-select="0"]');
      await expect(firstIdea).toHaveAttribute("aria-pressed","true");
      // The real text editor owns phrase choice: deselecting the first phrase
      // drops below the minimum; restoring it returns the editor to a valid state.
      await firstIdea.click();
      await expect(firstIdea).toHaveAttribute("aria-pressed","false");
      await expect(montageCountLabel).toContainText(String(initialMontageCount-1)+" /");
      await expect(montageIdeas.locator("[data-video-ideas-minimum]")).toBeVisible();
      await firstIdea.click();
      await expect(firstIdea).toHaveAttribute("aria-pressed","true");
      await expect(montageCountLabel).toContainText(String(initialMontageCount)+" /");
      await expect(montageIdeas.locator("[data-video-ideas-minimum]")).toHaveCount(0);
      const recordEntry=page.locator('[data-video-montage-text] [data-video-ideas-record]');
      await expect(recordEntry).toBeVisible();
      await recordEntry.click();
      await expect(advancedVoice).toBeVisible({timeout:15000});
      await expect(advancedVoice).toHaveAttribute("open","");
      await expect(myVoiceModeButton).toHaveAttribute("aria-pressed","true",{timeout:15000});
      await expect(page.locator('[data-video-own-voice-record]')).toBeVisible();
      // My Voice is deliberately only a recorder/uploader. For phrase
      // fine-tuning the visitor returns to Text and opens its visible advanced
      // shortcut: never click controls hidden beneath another tab.
            await personalTab.click();
      await expect(personalTab).toHaveAttribute("aria-pressed","true");
      // Switching back from Montage returns to Personalization with the
      // advanced disclosure collapsed. Reopen it through the same visible
      // shortcut a visitor uses before choosing the standard voice mode.
      await expect(advancedText).toBeVisible();
      await advancedText.click();
      await expect(advancedVoice).toBeVisible({timeout:15000});
      await expect(advancedVoice).toHaveAttribute("open","");
      // On a mobile WebKit handoff, verify the actual user touch interaction.
      // Keep the same strict selected-state assertion: do not bypass the control.
      await expect(voiceModeButton).toBeVisible();
      if(engine==="webkit")await voiceModeButton.tap();
      else await voiceModeButton.click();
      await expect(voiceModeButton).toHaveAttribute("aria-pressed","true");
      await expect(personalTab).toHaveAttribute("aria-pressed","true");
            // Voice mode intentionally hides the separate personal-intention editor;
      // that content belongs to Personalization and phrase editing belongs to
      // Montage → Text. Keep this voice-only panel focused on approved speech.
      const intentDetails=phrases.locator('[data-hypno-idea-details]');
      await expect(intentDetails).toBeHidden();
      await expect(phrases.locator('[data-video-ideas-personalization-panel]')).toBeVisible();
      await expect(phrases.locator('[data-ideas-subtab="voice"] [data-hypno-select-tone]')).toBeHidden();
      const voicePhraseSelect=compactVoicePanel.locator("[data-video-affirmation-phrase]");
      await expect(voicePhraseSelect).toBeVisible();
      assert.ok(await voicePhraseSelect.locator("option").count()>=3,
        "compact voice exposes approved phrase choices and All");
      await voicePhraseSelect.selectOption("1");
      await expect(voicePhraseSelect).toHaveValue("1");
      await voicePhraseSelect.selectOption("all");
      await expect(voicePhraseSelect).toHaveValue("all");
      await expect(compactVoicePanel.locator('[data-video-affirmation-transcript-review]')).toHaveCount(1);
      await expect(page.locator("[data-hypno-pending]")).toHaveCount(0);
      await expect(page.locator("[data-video-voice-approval-required]")).toHaveCount(0);
      // iPhone WebKit dispatches native taps; a synthetic click can lose the
      // React gender-filter update during the Voice/My Voice handoff.
      if(engine==="webkit")await voiceModeButton.tap();
      else await voiceModeButton.click();
      await expect(voiceModeButton).toHaveAttribute("aria-pressed","true");
      const chooserPending=page.locator("[data-video-affirmation-voice-select]");
      const maleGender=chooserPending.locator('[data-video-affirmation-gender="male"]');
      await expect(maleGender).toBeEnabled();
      if(engine==="webkit")await maleGender.tap();
      else await maleGender.click();
      await expect(maleGender).toHaveAttribute("aria-pressed","true");
      const leonCard=chooserPending.locator('[data-video-affirmation-voice-card="leon"]');
      await expect(leonCard).toBeVisible();
      if(engine==="webkit")await leonCard.tap();
      else await leonCard.click();
      await expect(chooserPending.locator('[data-video-affirmation-voice-card="leon"]')).toHaveAttribute("aria-pressed","true");
      const previewButton=chooserPending.locator('[data-video-affirmation-voice-preview="leon"]');
      await expect(previewButton).toBeEnabled();
      await previewButton.click();
      await expect(page.locator('[data-video-affirmation-sample-ready] audio')).toBeVisible({timeout:30000});
      const preview=payloads.find(item=>item.mode==="sample"&&item.voiceId==="leon");
      assert.ok(preview,"actual male sample request reaches the TTS route");
      assert.equal(preview.language,locale);
      assert.ok(!("text" in preview)&&!("consent" in preview),"fixed public samples contain no private script");
      // Safari blocks autoplay after network completion. A second real tap
      // must directly invoke native play() on the cached WAV, without TTS.
      await expect(previewButton).toHaveAttribute("aria-busy","false");
      await page.evaluate(()=>{
        const el=document.querySelector('[data-video-affirmation-sample-ready] audio');
        window.__hhPreviewReplayCount=0;
        el.play=()=>{window.__hhPreviewReplayCount++;return Promise.resolve();};
      });
      const beforeReplay=payloads.length;
      await previewButton.click();
      await expect.poll(()=>page.evaluate(()=>window.__hhPreviewReplayCount)).toBe(1);
      assert.equal(payloads.length,beforeReplay,"replay must not spend a second free TTS request");
      await chooserPending.locator('[data-video-affirmation-gender="female"]').click();
      await expect(page.locator("[data-video-affirmation-sample-ready]")).toHaveCount(0);
      await expect(chooserPending.locator('[data-video-affirmation-voice-card="maya"]')).toHaveAttribute("aria-pressed","true");
      // A refused provider response must release all three choices and show
      // the failure, rather than leaving the screenshot's frozen Loading UI.
      rejectSofiaSample=true;
      const sofiaPreview=chooserPending.locator('[data-video-affirmation-voice-preview="sofia"]');
      await sofiaPreview.click();
      await expect(sofiaPreview).toHaveAttribute("aria-busy","false",{timeout:10000});
      await expect(chooserPending.locator('[data-video-affirmation-voice-preview="maya"]')).toBeEnabled();
      await expect(page.locator('[data-video-affirmation-voice-select] [role="status"]'))
        .toContainText(locale==="ru"?"Не удалось прослушать":"Could not load");
      rejectSofiaSample=false;
      await expect(page.locator("[data-video-generate-affirmation-audio]")).toBeDisabled();
      // The live editor commits phrase selection in Montage → Text. Voice has
      // no second Hypno approval control; keep this separate from TTS consent.
      await personalTab.click();
      await expect(advancedVoice).toHaveAttribute("open","");
      await expect(advancedText).toBeVisible();
      await expect(intentDetails).toBeHidden();
      await expect(page.locator("[data-hypno-approve]")).toBeHidden();
      await expect(page.locator("[data-hypno-pending]")).toHaveCount(0);
      await expect(page.locator("[data-video-voice-approval-required]")).toHaveCount(0);
      await voiceModeButton.click();
      await page.locator("[data-video-affirmation-voice]").waitFor({state:"visible"});
      // Record two independent browser-local tracks using the real
      // MediaRecorder and a deterministic WebAudio microphone fixture.
      await myVoiceModeButton.click();
      await expect(myVoiceModeButton).toHaveAttribute("aria-pressed","true");
      const ownPanel=page.locator("[data-video-own-voice]");
      await expect(ownPanel).toBeVisible();
      await expect(page.locator('[data-video-affirmation-voice-card="maya"]')).toBeHidden();
      const beforeOwnRequests=payloads.length;
      if(engine==="chromium"){
        const available=await page.evaluate(()=>{
          if(!navigator.mediaDevices||typeof MediaRecorder==="undefined"||
            !["audio/mp4","audio/webm;codecs=opus","audio/webm"].some(
              type=>MediaRecorder.isTypeSupported(type)))return false;
          const ctx=new AudioContext(),tone=ctx.createOscillator(),
            gain=ctx.createGain(),destination=ctx.createMediaStreamDestination();
          gain.gain.value=.2;tone.frequency.value=330;
          tone.connect(gain);gain.connect(destination);tone.start();
          Object.defineProperty(navigator.mediaDevices,"getUserMedia",{
            configurable:true,value:async()=>destination.stream.clone()});
          window.__hhSyntheticMic={ctx,tone};
          return true;
        });
        assert.ok(available,"real Chromium audio MediaRecorder is available");
        const record=ownPanel.locator("[data-video-own-voice-record]");
        for(let count=1;count<=2;count++){
          await record.click();
          await expect(record).toHaveAttribute("aria-pressed","true");
          await page.evaluate(()=>window.__hhSyntheticMic.ctx.resume());
          await page.waitForTimeout(900);
          await record.click();
          await expect(ownPanel.locator("[data-video-own-voice-track]")).toHaveCount(count,{timeout:15000});
        }
        const tracks=ownPanel.locator("[data-video-own-voice-track]");
        const file=await tracks.nth(1).locator("audio").evaluate(async audio=>{
          const source=window.__hhOwnVoiceFiles?.get(audio.src);
          if(!(source instanceof File))return {size:0,type:"",containerValid:false};
          const header=new Uint8Array(await source.slice(0,12).arrayBuffer());
          const webm=header[0]===0x1a&&header[1]===0x45&&header[2]===0xdf&&header[3]===0xa3;
          const mp4=String.fromCharCode(...header.slice(4,8))==="ftyp";
          return {size:source.size,type:source.type,containerValid:webm||mp4};
        });
        assert.ok(file.size>128&&file.type.startsWith("audio/")&&file.containerValid,
          "real MediaRecorder wrote a playable local file "+JSON.stringify(file));
        await tracks.nth(1).locator("[data-video-own-voice-attach]").click();
        await expect(page.locator("[data-video-live-audio]")).toContainText("holistic-house-voice-2");
        // Confirm the chosen recorded track survives the ACTUAL local MP4/WebM
        // export. Reading a selection badge or blob URL is not E2E evidence.
        await page.locator('[data-video-quick-control="editor"]').click();
        // The original recorder's export button is available in the real
        // Montage Audio step, never in the intentionally hidden Style footer.
        await page.locator('[data-video-montage-tab="concept"]').click();
        await page.locator('[data-video-story-open-settings]').click();
        const ownAudioStep=page.locator('[data-video-montage-open-audio]');
        await ownAudioStep.click();
        await expect(page.locator('[data-video-montage-audio]')).toBeVisible();
        const ownCreate=page.locator("[data-video-quick-generate]");
        await expect(ownCreate).toBeEnabled({timeout:30000});
        await ownCreate.click();
        const ownDownload=page.locator("[data-mandala-video-download]");
        await ownDownload.waitFor({state:"visible",timeout:45000});
        // Primary Save opens the real choice of Files / Telegram / WhatsApp.
        // The download event belongs to the next explicit Files choice.
        await ownDownload.click();
        const ownDelivery=page.locator("[data-video-messenger-delivery]");
        await expect(ownDelivery).toBeVisible({timeout:10000});
        await expect(ownDelivery.locator("[data-video-telegram-share]")).toBeVisible();
        await expect(ownDelivery.locator("[data-video-whatsapp-share]")).toBeVisible();
        const [ownFile]=await Promise.all([
          page.waitForEvent("download",{timeout:20000}),
          ownDelivery.locator("[data-video-save-direct-choice]").click(),
        ]);
        const ownBytes=[];
        for await(const chunk of await ownFile.createReadStream())
          ownBytes.push(Buffer.from(chunk));
        const ownedVideo=Buffer.concat(ownBytes);
        assert.ok(ownedVideo.length>10000,"recorded personal voice produced a real movie");
        const ownProbe=spawnSync("ffprobe",["-v","error",
          "-show_entries","stream=codec_type","-of","json","-"],
          {input:ownedVideo,encoding:"utf8",timeout:15000});
        assert.equal(ownProbe.status,0,"own-voice movie decodes: "+ownProbe.stderr);
        const ownStreams=JSON.parse(ownProbe.stdout).streams.map(x=>x.codec_type);
        assert.ok(ownStreams.includes("video")&&ownStreams.includes("audio"),
          "personal track exported as a real movie with audio");
        const ownPcm=spawnSync("ffmpeg",["-v","error","-i","pipe:0",
          "-map","0:a:0","-t","1","-ar","8000","-ac","1","-f","s16le","pipe:1"],
          {input:ownedVideo,maxBuffer:1024*1024,timeout:20000});
        assert.equal(ownPcm.status,0,"own-voice audio decodes: "+ownPcm.stderr);
        assert.ok(ownPcm.stdout.some(byte=>byte!==0),"recorded voice is audible, not silent");
        phase(engine,"own-voice-encoded-video-passed");
        await page.locator('[data-video-quick-control="phrases"]').click();
        await expect(ownPanel).toBeVisible();

        await tracks.nth(1).locator("button").last().click();
        await expect(tracks).toHaveCount(1);
        await expect(page.locator("[data-video-live-audio]")).toHaveCount(0);
        await tracks.nth(0).locator("[data-video-own-voice-attach]").click();
        await expect(page.locator("[data-video-live-audio]")).toContainText("holistic-house-voice-1");
        await tracks.nth(0).locator("button").last().click();
        await expect(tracks).toHaveCount(0);
        await expect(page.locator("[data-video-live-audio]")).toHaveCount(0);
        await page.evaluate(async()=>{
          const mic=window.__hhSyntheticMic;
          if(mic){mic.tone.stop();await mic.ctx.close();}
        });
      }
      assert.equal(payloads.length,beforeOwnRequests,"local voice cannot leak to a TTS provider");
      await voiceModeButton.click();
      await expect(ownPanel).toBeHidden();
      // Compact Voice deliberately omits the old permanent selectedPhrase
      // summary. Its approved phrase is always visible in the native selector;
      // the full transcript is an opt-in disclosure ONLY for "All phrases".
      await expect(page.locator("[data-video-affirmation-selection-summary]")).toHaveCount(0);
      await expect(page.locator("[data-video-affirmation-voice-advanced]")).toHaveCount(1);
      await expect(page.locator("[data-video-generate-affirmation-audio]")).toBeDisabled();
      const phraseSelector=page.locator("[data-video-affirmation-phrase]");
      await phraseSelector.waitFor({state:"visible"});
      assert.ok((await phraseSelector.locator("option").count())>=3,
        "the visitor can choose one of their approved phrases or all");
      // A single approved phrase stays compact; the full transcript is
      // available only when the visitor explicitly chooses All phrases.
      await phraseSelector.selectOption("1");
      await expect(phraseSelector).toHaveValue("1");
      await expect(page.locator("[data-video-affirmation-transcript-review]")).toBeHidden();
      await phraseSelector.selectOption("all");
      await expect(page.locator("[data-video-affirmation-transcript-review]")).toBeVisible();
      await phraseSelector.selectOption("1");
      await expect(page.locator("[data-video-affirmation-transcript-review]")).toBeHidden();
      const approved=(await phraseSelector.locator('option[value="1"]').innerText())
        .replace(/^2\.\s*/,"").trim();
      const expectedSpeech=/[.!?…]$/u.test(approved)?approved:approved+".";
      assert.ok(expectedSpeech.length>5&&expectedSpeech.length<=45,
        "one visible approved phrase fits the free narrator");
      await phraseSelector.selectOption("all");
      await expect(phraseSelector).toHaveValue("all");
      const transcriptDisclosure=page.locator("[data-video-affirmation-transcript-review]");
      await expect(transcriptDisclosure).toHaveCount(1);
      await transcriptDisclosure.locator(":scope > summary").click();
      const speech=transcriptDisclosure.locator("[data-video-affirmation-spoken-text]");
      await expect(speech).toBeVisible();
      const allTranscript=((await speech.textContent())||"").trim();
      assert.ok(allTranscript.length>expectedSpeech.length&&allTranscript.includes(expectedSpeech),
        "the optional review contains the exact selected phrase plus approved alternatives");
      await phraseSelector.selectOption("1");
      await expect(phraseSelector).toHaveValue("1");
      await expect(transcriptDisclosure).toHaveCount(0);
      const transcript=expectedSpeech;
      const chooser=page.locator("[data-video-affirmation-voice-select]");
      assert.equal(await chooser.locator("[data-video-affirmation-voice-card]").count(),3);
      await chooser.locator('[data-video-affirmation-gender="male"]').click();
      assert.equal(await chooser.locator("[data-video-affirmation-voice-card]").count(),3);
      await chooser.locator('[data-video-affirmation-voice-card="leon"]').click();
      await expect(chooser.locator('[data-video-affirmation-voice-card="leon"]')).toHaveAttribute("aria-pressed","true");
      await expect(page.locator("[data-video-affirmation-voice-consent]")).not.toBeChecked();
      const voiceOptions=page.locator("[data-video-affirmation-voice] details")
        .filter({has:page.locator("[data-video-affirmation-bed]")});
      if(await voiceOptions.getAttribute("open")===null)
        await voiceOptions.locator(":scope > summary").click();
      // Verify that Safari committed native disclosure, not only the click.
      await expect(voiceOptions).toHaveAttribute("open","",{timeout:15000});
      await expect(page.locator("[data-video-affirmation-bed]")).toBeVisible({timeout:15000});
      await page.locator("[data-video-affirmation-bed]").selectOption("ocean");
      const narrationConsent=page.locator("[data-video-affirmation-voice-consent]");
      await narrationConsent.check();
      await expect(narrationConsent).toBeChecked();
      const generateNarration=page.locator("[data-video-generate-affirmation-audio]");
      await expect(generateNarration).toBeEnabled();
      // Observe real user input on macOS without recording the approved text,
      // credentials, media or account data in any CI log.
      await page.evaluate(()=>{
        const button=document.querySelector("[data-video-generate-affirmation-audio]");
        window.__hhVoiceSubmitProbe={pointers:0,clicks:0,touches:0};
        button?.addEventListener("pointerup",()=>{window.__hhVoiceSubmitProbe.pointers++;});
        button?.addEventListener("click",()=>{window.__hhVoiceSubmitProbe.clicks++;});
        button?.addEventListener("touchend",()=>{window.__hhVoiceSubmitProbe.touches++;});
      });
      if(engine==="webkit")await generateNarration.tap();
      else await generateNarration.click();
      try {
        await page.locator("[data-video-affimations-audio-ready]").waitFor({state:"visible",timeout:30000});
        phase(engine,"voice-wav-ready");
      }catch(error){
        const status=await page.locator('[data-video-affirmation-voice] [role="status"]').allTextContents();
        const buttonDisabled=await page.locator("[data-video-generate-affirmation-audio]").isDisabled();
        const state=await page.evaluate(()=>({
          gesture:window.__hhVoiceSubmitProbe??null,
          consented:document.querySelector("[data-video-affirmation-voice-consent]")?.checked===true,
          wordsLength:document.querySelector("[data-video-affirmation-spoken-text]")?.textContent?.trim().length??0,
          readyNodes:document.querySelectorAll("[data-video-affimations-audio-ready]").length,
          mountedPanels:document.querySelectorAll("[data-video-affirmation-voice]").length
        }));
        throw new Error(engine+" voice failed: "+JSON.stringify({status,buttonDisabled,state,
          providerModes:payloads.map(item=>item.mode),
          providerRequests:payloads.length,networkRequests:requests,jsErrors:errors}),{cause:error});
      }
      const affirmationRequests=payloads.filter(item=>item.mode==="affirmations");
      assert.equal(affirmationRequests.length,1);
      assert.equal(affirmationRequests[0].text,transcript);
      assert.equal(affirmationRequests[0].voiceId,"leon");
      assert.equal(affirmationRequests[0].consent,true);
      assert.equal(affirmationRequests[0].language,locale);
      const expectedFileName="holistic-house-affirmations-"+locale+"-leon.wav";
      // Real attached WAV is reflected on the shared live video stage, not
      // merely in a hidden legacy audio panel or a transient preview label.
      await expect(page.locator("[data-video-live-audio]")).toContainText(expectedFileName);
      // Music Match now permits compatible background beds with approved voice.
      // Prove it with a physical Safari click and confirm the narration WAV
      // remains attached: no standalone music silently replaces a client's voice.
      const personalMusic=page.locator('[data-hypno-music][data-personalized-music-match]');
      await expect(personalMusic).toBeVisible({timeout:15000});
      await expect(personalMusic.locator('[role="radio"]')).toHaveCount(3);
      const bedChoice=personalMusic.locator('[data-phrase-music-attach]').first();
      await expect(bedChoice).toBeVisible();
      await expect(bedChoice).toBeEnabled();
      await bedChoice.click();
      await expect(bedChoice).toHaveAttribute("aria-checked","true");
      await expect(page.locator("[data-video-live-audio]")).toContainText(expectedFileName);
      const firstAudio=await page.locator("[data-video-affimations-audio-ready] audio").getAttribute("src");
      assert.equal(await page.locator("[data-video-affirmation-bed] option").count(),14,
        "the first-party library offers none and thirteen backgrounds");
      await page.locator("[data-video-voice-volume]").focus();
      await page.keyboard.press("ArrowLeft");
      await page.locator("[data-video-bed-volume]").focus();
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(previous=>{
        const audio=document.querySelector("[data-video-affimations-audio-ready] audio");
        return audio?.getAttribute("src") && audio.getAttribute("src")!==previous;
      },firstAudio,{timeout:25000});
      phase(engine,"offline-remix-ready");
      assert.equal(payloads.filter(item=>item.mode==="affirmations").length,1,
        "remixing voice/music must not invoke voice generation again");
      // Exercise the actual third-workspace Audio cards in real WebKit.
      // The approved TTS track is already attached; both effects must render
      // locally into a real stereo WAV before the movie export starts.
      await page.locator('[data-video-quick-control="effects"]').click();
      // Hypno has three exclusive subtabs: Visual, Audio effects and Effects.
      // Verify the relocated effect presets in macOS WebKit before the audio mixer.
      const hypnoTabs=page.locator('[data-hypno-tabs]');
      await hypnoTabs.waitFor({state:"visible",timeout:10000});
      const visualTab=hypnoTabs.locator('[data-hypno-tab="visual"]');
      const audioTab=hypnoTabs.locator('[data-hypno-tab="audio"]');
      const effectsTab=hypnoTabs.locator('[data-hypno-tab="effects"]');
      await expect(hypnoTabs.getByRole("tab")).toHaveCount(3);
      await expect(visualTab).toBeVisible();
      await expect(audioTab).toBeVisible();
      await expect(effectsTab).toBeVisible();
      await expect(visualTab).toHaveAttribute("aria-selected","true");
      const visualGroup=page.locator('[data-hypno-group="visual"]');
      const audioGroup=page.locator('[data-hypno-group="audio"]');
      const effectsGroup=page.locator('[data-hypno-group="effects"]');
      await expect(visualGroup).toBeVisible();
      await expect(audioGroup).toBeHidden();
      await expect(effectsGroup).toBeHidden();
      const lightPresets=visualGroup.locator('[data-hypno-light-preset]');
      await expect(lightPresets).toHaveCount(3);
      const balancedLight=lightPresets.nth(1);
      await expect(balancedLight).toBeEnabled();
      await balancedLight.click();
      await expect(balancedLight).toHaveAttribute("aria-pressed","true");
      await expect(visualGroup.locator('[data-hypno-card]').first().getByRole("switch"))
        .toHaveAttribute("aria-checked","true");
      const textPosition=visualGroup.locator('[data-hypno-text-position="top"]');
      await expect(textPosition).toBeVisible();
      await textPosition.click();
      await expect(textPosition).toHaveAttribute("aria-pressed","true");
      await expect(page.locator('[data-hypno-summary]')).toContainText(
        locale==="ru"?"Выбрано":locale==="es"?"Elegidos":"Selected");
      // Exercise the experimental short-frame control, then restore its
      // initial OFF state; its effect is never presented as clinical proof.
      const briefFrame=visualGroup.locator('[data-hypno-card]').nth(2).getByRole("switch");
      await briefFrame.click();
      await expect(briefFrame).toHaveAttribute("aria-checked","true");
      await briefFrame.click();
      await expect(briefFrame).toHaveAttribute("aria-checked","false");
      // Exercise the new Effects tab and its original no-flash Canvas presets.
      await effectsTab.click();
      await expect(effectsTab).toHaveAttribute("aria-selected","true");
      await expect(visualGroup).toBeHidden();
      await expect(effectsGroup).toBeVisible();
      const sunlight=effectsGroup.locator('[data-hypno-visual-effect="sunlight"]');
      await sunlight.click();
      await expect(sunlight).toHaveAttribute("aria-pressed","true");
      await expect(effectsGroup.locator("#video-hypno-effect-strength")).toBeEnabled();
      const waves=effectsGroup.locator('[data-hypno-visual-effect="waves"]');
      await waves.click();
      await expect(waves).toHaveAttribute("aria-pressed","true");
      await audioTab.click();
      await expect(effectsGroup).toBeHidden();
      await expect(audioTab).toHaveAttribute("aria-selected","true");
      await expect(visualGroup).toBeHidden();
      await expect(audioGroup).toBeVisible();
      const speechCard=audioGroup.locator("[data-hypno-card]").first();
      await speechCard.locator("button").first().click();
      await expect(audioGroup.locator("[data-hypno-speech-settings] [data-hypno-voice]"))
        .toBeVisible({timeout:10000});
      // Opening voice settings can start an async local preparation pass.
      // Wait until the real busy indicator is gone and the switch is enabled;
      // never force-click a disabled effect control.
      await expect(page.locator("[data-hypno-audio-effect-busy]")).toHaveCount(0,{timeout:60000});
      const whisperName=locale==="ru"?"Гипнозвук":locale==="es"?"Voz tenue":"Quiet speech";
      const binauralName=locale==="ru"?"Бинауральные ритмы":locale==="es"?"Ritmos binaurales":"Binaural beats";
      const whisperSwitch=audioGroup.getByRole("switch",{name:whisperName,exact:true});
      const binauralSwitch=audioGroup.getByRole("switch",{name:binauralName,exact:true});
      await expect(whisperSwitch).toHaveAttribute("aria-checked","false");
      await expect(whisperSwitch).toBeEnabled({timeout:30000});
      await whisperSwitch.click();
      await expect(whisperSwitch).toHaveAttribute("aria-checked","true",{timeout:30000});
      await binauralSwitch.click();
      await expect(binauralSwitch).toHaveAttribute("aria-checked","true",{timeout:30000});
      await expect(page.locator("[data-hypno-audio-effect-busy]")).toHaveCount(0);
      phase(engine,"hypno-audio-effects-rendered");
      await page.locator('[data-video-quick-control="video"]').click();
      await page.locator('[data-video-quick-control="editor"]').click();
      // #3933 introduced TWO explicit actions: Generate Video exports on tap;
      // Add Effects navigates. Never tap Generate merely to advance a tab.
      // Exercise the visible Style and Audio controls, then create exactly once
      // below at phase(start-media-recorder).
      const creationStyleTab=page.locator('[data-video-montage-tab="effects"]');
      await expect(creationStyleTab).toBeVisible();
      await creationStyleTab.click();
      await expect(creationStyleTab).toHaveAttribute("aria-pressed","true");
      await page.locator('[data-video-montage-tab="concept"]').click();
        await page.locator('[data-video-story-open-settings]').click();
      const montageAudioTab=page.locator('[data-video-montage-open-audio]');
      await expect(montageAudioTab).toBeVisible();
      await montageAudioTab.click();
      await expect(page.locator('[data-video-montage-audio]')).toBeVisible();
      const generate=page.locator("[data-video-quick-generate]");
      await expect(generate).toBeVisible({timeout:30000});
      await expect(generate).not.toHaveAttribute("data-video-montage-next",/./);
      await expect(generate).toBeEnabled({timeout:30000});
      assert.equal(await page.locator("[data-video-quick-generate]").isDisabled(),false,
        "newly remixed WAV must automatically attach to local movie");
      // One Create tap decodes the idle MP4 and exports the actual voice video.
      if(engine==="chromium"||engine==="webkit") {
        const sourceVideo=page.locator("[data-mandala-master-mp4]");
        if(await sourceVideo.count()) {
          assert.equal(await sourceVideo.getAttribute("preload"),"auto",
            "the user's earlier Style tap must already prime the real MP4");
        }
        // Real locally encoded file: not a mere blob preview or a silent fake.
        await expect(generate).toBeEnabled({timeout:30000});
        const mediaCapabilities=await page.evaluate(()=>({
          userAgent:navigator.userAgent,
          canvasCapture:typeof HTMLCanvasElement.prototype.captureStream==="function",
          supportedMimes:['video/webm;codecs="vp8,opus"','video/webm',
            'video/mp4;codecs="avc1.42E01E,mp4a.40.2"','video/mp4'].filter(
              mime=>typeof MediaRecorder!=="undefined" && MediaRecorder.isTypeSupported(mime)),
        }));
        console.log("VOICE_E2E_MEDIA_CAPABILITIES "+engine+" "+JSON.stringify(mediaCapabilities));
        phase(engine,"start-media-recorder");
        await generate.click();
        // The idle source remains preload=none until the user's actual Create
        // gesture; Safari must then start a physical decode, never a CSS-only
        // preview or an unverified download.
        if(await sourceVideo.count()){
          await expect.poll(()=>sourceVideo.evaluate(video=>video.preload),
            {timeout:5000}).toBe("auto");
        }
        phase(engine,"recording-started");
        const output=page.locator("[data-mandala-video-download]");
        // Authenticated visitors can download; a first-time guest can watch a
        // real encoded local film but MUST sign in before Save, share or upload.
        const guestPreview=page.locator("[data-video-guest-preview-actions]");
        // The verified film can auto-open Ready and hide legacy Result actions.
        const readyView=page.locator("[data-video-ready]");
        const readyVideo=readyView.locator("video");
        phase(engine,"waiting-for-export");
        try {
          // An iPhone/WebKit MP4 can require a physical Play gesture before
          // the native video element decodes its first frame. The export is NOT
          // considered ready or downloadable before native playback succeeds.
          let verificationTapped=false;
          const verifyPlayback=page.locator("[data-video-verify-playback]");
          await expect.poll(async()=>{
            if(await output.isVisible()||await guestPreview.isVisible()||await readyVideo.isVisible())return true;
            if(!verificationTapped&&await verifyPlayback.isVisible()){
              try{
                await verifyPlayback.click({timeout:2000});
                verificationTapped=true;
              }catch(error){
                // Native MP4 may become playable between isVisible and click:
                // React then unmounts this optional button. Require the real
                // download control, never accept a status label or mock file.
                if(await output.isVisible())return true;
                if(await verifyPlayback.isVisible())throw error;
              }
            }
            return await output.isVisible()||await guestPreview.isVisible()||await readyVideo.isVisible();
          },{timeout:45000,intervals:[250,500,1000]}).toBe(true);
          if(!await guestPreview.isVisible()&&!await readyVideo.isVisible())
            await output.waitFor({state:"visible",timeout:45000});
        } catch (error) {
          phase(engine,"download-control-timed-out");
          let uiState;
          try {
            uiState=await withDeadline(page.evaluate(()=>{
            const video=document.querySelector("[data-mandala-master-mp4]");
            const create=document.querySelector("[data-video-quick-generate]");
            const result=document.querySelector("[data-video-result]");
            return {
              canClick:create instanceof HTMLButtonElement ? !create.disabled : null,
              source:video instanceof HTMLVideoElement ? {
                readyState:video.readyState,width:video.videoWidth,height:video.videoHeight,
                error:video.error?.code??null,networkState:video.networkState,
                preload:video.preload,sourceLoaded:Boolean(video.currentSrc)
              } : null,
              resultHidden:result instanceof HTMLElement ? result.hidden : null,
              progress:document.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow")??null,
              notices:[...document.querySelectorAll('[role="status"],[role="alert"]')].map(x=>x.textContent?.trim()).filter(Boolean).slice(0,8),
            };
          }),4000,engine+" media-state evaluation");
          } catch (diagnosticError) {
            uiState={diagnosticsUnavailable:diagnosticError instanceof Error
              ? diagnosticError.message:"WebKit renderer did not respond"};
          }
          phase(engine,"recording-error-reported");
          throw new Error(engine+" recorded video never became downloadable: "+
            JSON.stringify({...uiState,encoderFailureCodes:errors.filter(item=>
              item.startsWith("HH_WEBKIT_MP4_EXPORT_FAILURE:")).slice(-5)}),{cause:error});
        }
        let bytes;
        if(await readyVideo.isVisible()){
          // The actual verified export was promoted to the approved Ready tab.
          // Legacy Result is deliberately CSS-hidden in Ready; never click it.
          await expect(readyView).toHaveAttribute("data-ready-view","home");
          await expect(page.locator("[data-video-result]"))
            .toHaveAttribute("data-video-result-mode","rendered");
          await expect(output).toBeHidden();
          await expect(page.locator("[data-video-save-direct]")).toBeHidden();
          await expect(readyView.locator("[data-ready-download]")).toBeVisible();
          // Read native decoded media, not just a Ready label or simulated file.
          await expect.poll(()=>page.locator("[data-mandala-video-preview]").evaluate(video=>
            video instanceof HTMLVideoElement&&video.readyState>=2&&
            video.videoWidth>0&&video.videoHeight>0&&!video.error),
            {timeout:20000}).toBe(true);
          // Guest Save/Download must invoke actual login gate, not a download.
          await readyView.locator("[data-ready-download]").click();
          await expect(readyView.locator("[data-ready-save-gate]")).toBeVisible();
          await expect(readyView.locator("[data-ready-save-gate-signin]")).toBeVisible();
          await readyView.locator("[data-ready-save-close]").click();
          await expect(readyView.locator("[data-ready-save-gate]")).toHaveCount(0);
          // The original exact Blob is retained in this test tab by the
          // createObjectURL wrapper; CSP does not need to allow fetch(blob:).
          const readyMovie=await page.evaluate(async()=>{
            const video=document.querySelector("[data-mandala-video-preview]");
            if(!(video instanceof HTMLVideoElement)||!video.currentSrc.startsWith("blob:")||
               video.readyState<2||video.videoWidth===0||video.videoHeight===0||video.error)
              throw Error("GUEST_REAL_VIDEO_PREVIEW_INVALID");
            const blob=window.__hhRecordedVideoBlobs?.get(video.currentSrc);
            if(!(blob instanceof Blob))throw Error("GUEST_REAL_VIDEO_BLOB_UNAVAILABLE");
            if(blob.size<10000||blob.size>16000000)
              throw Error("GUEST_REAL_VIDEO_BYTES_INVALID");
            const dataUrl=await new Promise((resolve,reject)=>{
              const reader=new FileReader();
              reader.onerror=()=>reject(Error("GUEST_REAL_VIDEO_BLOB_READ_FAILED"));
              reader.onload=()=>resolve(reader.result);
              reader.readAsDataURL(blob);
            });
            return {base64:String(dataUrl).split(",")[1],
              width:video.videoWidth,height:video.videoHeight};
          });
          assert.ok(readyMovie.width>0&&readyMovie.height>0&&readyMovie.base64?.length>15000);
          bytes=Buffer.from(readyMovie.base64,"base64");
          phase(engine,"ready-real-encoded-mp4-auth-gate-verified");
        }else if(await guestPreview.isVisible()){
          // This is a synthetic test-owned in-memory Blob; exposing the normal
          // Save/Telegram/YouTube controls to an anonymous visitor is forbidden.
          await expect(page.locator("[data-video-result]"))
            .toHaveAttribute("data-video-result-mode","rendered");
          await expect(output).toBeHidden();
          await expect(page.locator("[data-video-save-direct]")).toBeHidden();
          await expect(page.locator("[data-video-guest-save-hint]")).toBeVisible();
          const player=page.locator("[data-mandala-video-preview]");
          await expect(player).toBeVisible();
          // User Play is the required Safari decode gesture; never fake loadeddata.
          await guestPreview.locator("[data-video-guest-play]").click();
          await expect.poll(()=>player.evaluate(video=>
            video instanceof HTMLVideoElement&&video.readyState>=2&&
            video.videoWidth>0&&video.videoHeight>0&&!video.error),{timeout:20000}).toBe(true);
          // Inspect the genuine locally rendered movie without invoking a
          // privileged download, network upload or fake signed-in session.
          const localMovie=await page.evaluate(async()=>{
            const video=document.querySelector("[data-mandala-video-preview]");
            if(!(video instanceof HTMLVideoElement)||!video.currentSrc.startsWith("blob:")||
               video.readyState<2||video.videoWidth===0||video.videoHeight===0)
              throw Error("GUEST_REAL_VIDEO_PREVIEW_INVALID");
            const blob=window.__hhRecordedVideoBlobs?.get(video.currentSrc);
            if(!(blob instanceof Blob))throw Error("GUEST_REAL_VIDEO_BLOB_UNAVAILABLE");
            if(blob.size<10000||blob.size>16000000)
              throw Error("GUEST_REAL_VIDEO_BYTES_INVALID");
            const dataUrl=await new Promise((resolve,reject)=>{
              const reader=new FileReader();
              reader.onerror=()=>reject(Error("GUEST_REAL_VIDEO_BLOB_READ_FAILED"));
              reader.onload=()=>resolve(reader.result);
              reader.readAsDataURL(blob);
            });
            return {base64:String(dataUrl).split(",")[1],mime:blob.type,
              width:video.videoWidth,height:video.videoHeight};
          });
          assert.ok(localMovie.base64?.length>15000);
          assert.ok(localMovie.width>0&&localMovie.height>0);
          bytes=Buffer.from(localMovie.base64,"base64");
          phase(engine,"guest-real-encoded-mp4-auth-gate-verified");
        }else{
          phase(engine,"download-control-ready");
          // Signed-in visitors open the actual Save chooser, then choose the
          // physical file. This path remains required when authorized.
          await output.click();
          const delivery=page.locator("[data-video-messenger-delivery]");
          await expect(delivery).toBeVisible({timeout:10000});
          await expect(delivery.locator("[data-video-telegram-share]")).toBeVisible();
          await expect(delivery.locator("[data-video-whatsapp-share]")).toBeVisible();
          phase(engine,"delivery-chooser-open");
          const [download]=await Promise.all([
            page.waitForEvent("download",{timeout:20000}),
            delivery.locator("[data-video-save-direct-choice]").click(),
          ]);
          phase(engine,"download-started");
          const parts=[];
          for await(const chunk of await download.createReadStream())parts.push(Buffer.from(chunk));
          bytes=Buffer.concat(parts);
        }
        assert.ok(bytes.length>10000,"real video must be recorded");
        const probe=spawnSync("ffprobe",["-v","error","-show_entries","stream=codec_type,channels",
          "-of","json","-"],{input:bytes,encoding:"utf8",timeout:15000});
        assert.equal(probe.status,0,"real video container must decode: "+probe.stderr);
        const streams=JSON.parse(probe.stdout).streams;
        const tracks=streams.map(row=>row.codec_type);
        assert.ok(tracks.includes("video"),"real video stream present");
        const audioTrack=streams.find(row=>row.codec_type==="audio");
        assert.ok(audioTrack,"generated affirmation WAV survived into exported video");
        assert.equal(Number(audioTrack.channels),2,"real encoded audio track must remain stereo");
        const pcm=spawnSync("ffmpeg",["-v","error","-i","pipe:0","-map","0:a:0",
          "-t","1","-ar","8000","-ac","1","-f","s16le","pipe:1"],
          {input:bytes,maxBuffer:1024*1024,timeout:20000});
        assert.equal(pcm.status,0,"generated voice audio decodes: "+pcm.stderr);
        assert.ok(pcm.stdout.some(value=>value!==0),"the encoded audio must not be silent");
        phase(engine,"encoded-audio-verified");
      }
      // Adding another approved phrase must preserve the WAV of the
      // exact one-line text already spoken and encoded in the exported MP4.
      await page.locator('[data-video-quick-control="phrases"]').click();
      // The subsequent stale-WAV safety cases change approved phrases, not
      // narration options, so expose Text's real advanced editor first.
      await personalTab.click();
      await expect(advancedText).toBeVisible();
      await advancedText.click();
      // My Voice intentionally hides the Hypno phrase picker. Return to the
      // standard Voice mode before testing the real selected-phrase editor.
      const standardVoiceMode=advancedVoice.locator('[data-video-ideas-voice-mode="voice"]');
      await expect(standardVoiceMode).toBeVisible();
      if(await standardVoiceMode.getAttribute("aria-pressed")!=="true"){
        if(engine==="webkit")await standardVoiceMode.tap();
        else await standardVoiceMode.click();
      }
      await expect(standardVoiceMode).toHaveAttribute("aria-pressed","true");
      // Phrase selection is now owned by the real Montage → Text editor.
      // Do not use the retired hidden Ideas/Hypno phrase picker. WebKit needs
      // the visitor's real touch gesture after recording and switching modes:
      // a synthetic click can leave Ideas selected with Text hidden.
      const montageTextEntry=phrases.locator('[data-video-ideas-open-montage-text]');
      await expect(montageTextEntry).toBeVisible();
      if(engine==="webkit")await montageTextEntry.tap();
      else await montageTextEntry.click();
      await expect(page.locator('[data-video-quick-control="editor"]'))
        .toHaveAttribute("aria-pressed","true",{timeout:15000});
      await expect(page.locator('[data-video-montage-tab="text"]'))
        .toHaveAttribute("aria-pressed","true",{timeout:15000});
      const phraseEditor=page.locator('[data-video-montage-text] [data-video-ideas-phrases]');
      await expect(phraseEditor).toBeVisible({timeout:15000});
      const phraseRows=phraseEditor.locator('[data-video-idea-phrase]');
      const spokenPhrase=phraseRows.filter({hasText:approved});
      await expect(spokenPhrase).toHaveCount(1);
      const spokenToggle=spokenPhrase.locator('[data-video-idea-select]');
      await expect(spokenToggle).toHaveAttribute('aria-pressed','true');
      // Adding an unspoken phrase must preserve the WAV already approved for
      // the spoken line. This uses the same visible control as a real visitor.
      const unselectedToggle=phraseEditor.locator('[data-video-idea-select][aria-pressed="false"]').first();
      await expect(unselectedToggle).toBeEnabled();
      const unselectedIndex=await unselectedToggle.getAttribute('data-video-idea-select');
      assert.ok(unselectedIndex!==null,"unselected phrase has a stable source index");
      const countBeforeAddition=Number(((await montageCountLabel.innerText()).match(/^\s*(\d+)/)||[])[1]||0);
      const optionCountBeforeAddition=await phraseRows.count();
      assert.ok(countBeforeAddition>=5,"approved phrase selection remains above the five-phrase minimum");
      assert.ok(countBeforeAddition<10,"an additional phrase can be selected below the hard maximum");
      if(engine==="webkit")await unselectedToggle.tap();
      else await unselectedToggle.click();
      await expect(phraseEditor.locator(`[data-video-idea-select="${unselectedIndex}"]`)).toHaveAttribute('aria-pressed','true');
      await expect(montageCountLabel).toContainText(`${countBeforeAddition+1} / ${optionCountBeforeAddition}`);
      assert.ok(countBeforeAddition+1<=10,"adding a phrase never exceeds the ten-phrase export limit");
      assert.equal(await page.locator('[data-video-narration-stale]').isVisible(),false,
        "adding an unspoken phrase does not invalidate the actual WAV");
      await expect(page.locator('[data-video-live-audio]')).toContainText("holistic-house-hypno-audio.wav");
      // A removed spoken phrase must block stale WAV reuse or detach it before export.
      // The exact approved text remains the safety boundary; no silent reuse is allowed.
      await spokenToggle.click();
      await expect(spokenToggle).toHaveAttribute('aria-pressed','false');
      // Montage Text owns phrase selection. Its current, visible release
      // contract is a reapproval notice plus a disabled Create action; the
      // legacy Voice-only [data-video-narration-stale] node is not mounted here.
      await expect(page.locator('[data-video-narration-reapproval]')).toBeVisible({timeout:15000});
      await expect(page.locator('[data-video-quick-generate]')).toBeDisabled({timeout:15000});
      assert.equal(await page.locator('[data-video-live-audio]').count(),1,
        "the old WAV may remain attached, but must be unusable until narration is regenerated");
      // The explicit cloud-voice consent control belongs to its dedicated
      // Voice editor and is not mounted in Montage Text. The isolated Voice
      // component and opt-in browser tests cover that consent gate; here the
      // real Montage path must remain fail-closed while its narration is stale.
      await expect(page.locator("[data-video-narration-reapproval]")).toBeVisible();
      await expect(page.locator('[data-video-quick-generate]')).toBeDisabled();
      await page.locator('[data-video-quick-control="editor"]').click();
      await page.locator('[data-video-montage-tab="concept"]').click();
        await page.locator('[data-video-story-open-settings]').click();
      const montageAudioAfterExport=page.locator('[data-video-montage-open-audio]');
      await montageAudioAfterExport.click();
      await expect(page.locator('[data-video-montage-audio]')).toBeVisible();
      // Compact Audio preserves an explicitly opened cloud Voice Studio,
      // without the retired basic nested tab.
      // The phrase warning is intentionally unmounted in Montage. If the
      // old narration is still attached there, export must remain disabled;
      // an independently selected soundtrack is not stale narration.
      const soundtrackLabels=await page.locator("[data-video-live-audio]").allTextContents();
      const stillHasOldVoice=soundtrackLabels.some(label=>
        label.includes("holistic-house-hypno-audio.wav")||label.includes(expectedFileName));
      if(stillHasOldVoice)await expect(page.locator("[data-video-quick-generate]")).toBeDisabled();
      const voicePanel=page.locator("[data-video-voice-studio]");
      await voicePanel.waitFor({state:"visible",timeout:25000});
      if(await voicePanel.getAttribute("open")===null)
        await voicePanel.locator(":scope > summary").click();
      const studio=voicePanel.locator("[data-voice-studio]");
      await studio.waitFor({state:"visible"});
      assert.equal(await studio.locator("[data-voice-id]").count(),6);
      await studio.locator("[data-voice-studio-generate]").click();
      await studio.locator("[data-voice-studio-audio]").waitFor({state:"visible",timeout:30000});
      const sample=payloads.find(item=>item.mode==="sample"&&item.voiceId==="mark");
      assert.ok(sample,engine+" free text-to-speech sample reached provider");
      assert.equal(sample.voiceId,"mark");
      assert.equal(sample.language,locale);
      assert.ok(!("text" in sample),"public voice sample never sends private content");
      await studio.getByRole("button",{name:locale==="ru"?"Мой текст":"My own script",exact:true}).click();
      const customText=locale==="ru"?"Сегодня я выбираю спокойствие.":"Today I choose calm.";
      await studio.locator("textarea").fill(customText);
      const studioConsent=studio.locator('input[type="checkbox"]');
      await expect(studioConsent).not.toBeChecked({timeout:10000});
      await expect(studio.locator("[data-voice-studio-generate]")).toBeDisabled();
      await studioConsent.check();
      await studio.locator("[data-voice-studio-generate]").click();
      await studio.locator("[data-voice-studio-audio]").waitFor({state:"visible",timeout:30000});
      const typed=payloads.find(item=>item.mode==="short_text");
      assert.ok(typed,engine+" guest short text reached TTS API");
      assert.equal(typed.text,customText);
      assert.equal(typed.consent,true);
      assert.deepEqual(errors,[],engine+" should not log client exceptions");
      phase(engine,"all-assertions-passed");
      process.stdout.write("PASS "+engine+" "+locale+" mocked TTS + locally encoded video/audio + nature WAV attachment + stale guard\n");
    }finally{phase(engine,"closing-context");await withDeadline(context.close(),10000,engine+" context.close");}
  }finally{phase(engine,"closing-browser");await withDeadline(browser.close(),10000,engine+" browser.close");phase(engine,"closed");}
}
clearTimeout(watchdog);

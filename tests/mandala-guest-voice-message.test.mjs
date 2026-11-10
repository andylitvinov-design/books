import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("guest voice messages are real recordings, not paid or cloned provider output",()=>{
 const ui=read("components/mandala-guest-voice-message.tsx");
 const page=read("app/[locale]/holistic-support/voice-message/page.tsx");
 const nav=read("app/[locale]/holistic-support/mandala/page.tsx");
 const css=read("components/mandala-guest-voice-message.module.css");
 for(const x of ["data-guest-message-consent","data-guest-message-start","data-guest-message-stop",
   "data-guest-message-save","data-guest-message-share","data-guest-message-link",
   "data-guest-message-play","getUserMedia({audio:true,video:false})",
   "new MediaRecorder(","getTracks().forEach(track=>track.stop())",
   "URL.revokeObjectURL(","new File(chunks","navigator.share({files:[file]"])
  assert.ok(ui.includes(x),x);
 assert.ok(ui.includes("disabled={!approved}"));
 assert.ok(ui.includes('data-guest-voice-hydrated={origin?"true":"false"}'));
 assert.ok(ui.includes("disabled={!origin}"),"form disabled before client hydration");
 assert.ok(ui.includes("MAX_RECORD_MS=30_000,MAX_BYTES=8*1024*1024"));
 assert.ok(ui.includes("encodeURIComponent(good)"));
 assert.ok(ui.includes('window.location.hash.startsWith("#t=")'));
 assert.ok(ui.includes("decodeURIComponent(window.location.hash.slice(3))"));
 assert.ok(!ui.includes("fetch(")&&!ui.includes("FormData(")&&!ui.includes("localStorage")&&!ui.includes("sessionStorage"));
 assert.match(page,/robots:\{index:false,follow:false\}/);
 assert.match(nav,/holistic-support\/voice-message/);
 assert.match(css,/@media\(max-width:390px\)/);
 for(const phrase of ["Настоящий голос близкого","A loved one's real voice","La voz real de un ser querido",
  "Telegram","WhatsApp","настоящая запись","real recording","grabación"])
  assert.ok(ui.includes(phrase),phrase);
});

test("WebKit always retains a single mocked voice route after the Sofia refusal",()=>{
 const source=read("scripts/verify-affirmation-voice-browser.mjs");
 assert.match(source,/let rejectSofiaSample=false/);
 assert.match(source,/if\(rejectSofiaSample && body\?\.mode==="sample" && body\?\.voiceId==="sofia"\)/);
 assert.match(source,/rejectSofiaSample=true/);
 assert.match(source,/rejectSofiaSample=false;/);
 assert.doesNotMatch(source,/page\.unroute\(".*holistic-support\/voice"/);
 assert.doesNotMatch(source,/page\.route\(".*holistic-support\/voice",refuseSofia/);
});


test("actual browser route checks speaker consent, fragment invitation, and no provider submission",()=>{
 const browser=read("scripts/verify-affirmation-voice-browser.mjs");
 assert.match(browser,/async function verifyGuestVoiceConsent\(browser,locale\)/);
 assert.match(browser,/await verifyGuestVoiceConsent\(browser,locale\)/);
 for(const selector of ["data-guest-voice-message","data-guest-message-start",
  "data-guest-message-consent","data-guest-message-link",
  "data-guest-message-phrase","data-guest-message-save"]){
  assert.ok(browser.includes(selector),selector);
 }
 assert.match(browser,/assert\.equal\(uri\.search,""/);
 assert.match(browser,/recipient\.locator\("\[data-guest-message-consent\]"/);
 assert.match(browser,/assert\.deepEqual\(providerPosts,\[\]/);
 assert.ok(browser.includes('toHaveAttribute("data-guest-voice-hydrated","true"'),"real WebKit must wait for React hydration");
});

test("macOS WebKit hydration follows Ideas → Montage, then opens the top-level Audio workspace",()=>{
 const browser=read("scripts/verify-affirmation-voice-browser.mjs");
 const studio=read("components/mandala-free-video-studio.tsx");
 const practice=read("scripts/verify-mandala-practices-browser.mjs");
 const first=browser.indexOf("async function verifyWorkspaceHydration");
 const last=browser.indexOf("// Real guest route browser acceptance",first);
 const flow=browser.slice(first,last);
 const ideasClick=flow.indexOf("await continueToIdeas.click()");
 const ideasState=flow.indexOf('toHaveAttribute("data-active-workspace","phrases")',ideasClick);
 const refinement=flow.indexOf("const refinement=page.locator",ideasState);
 const montage=flow.indexOf("await montage.tap()",refinement);
 const storyboard=flow.indexOf("const montageStoryboardTab=page.locator",montage);
 const concept=flow.indexOf("const montageVideoConcept=page.locator",storyboard);
 const audio=browser.indexOf("const audioWorkspaceAfterExport=page.locator");
 const audioClick=browser.indexOf("await audioWorkspaceAfterExport.click()",audio);
 const voice=browser.indexOf('await page.locator(\'[data-video-audio-tab="voice"]\').click()',audioClick);
 assert.ok(first>=0&&last>first&&ideasClick>=0&&ideasState>ideasClick&&refinement>ideasState&&
   montage>refinement&&storyboard>montage&&concept>storyboard&&audio>concept&&audioClick>audio&&voice>audioClick,
   "Ideas → Montage and the separate post-export Audio → Voice journey are real and ordered");
 assert.match(studio,/data-video-audio-panel="music"/);
 assert.match(studio,/data-video-audio-panel="voice"/);
 assert.match(studio,/data-video-audio-panel="meditations"/);
 assert.match(practice,/data-guided-add-meditation/);
 assert.match(practice,/data-guided-skip-meditation/);
 assert.match(studio,/data-video-phrase-audio-shortcut[\s\S]*?setActiveWorkspace\("effects"\);setAudioWorkspaceTab\("voice"\)/);
});
test("macOS WebKit exercises explicit accessible adult consent and revocation",()=>{
 const source=read("scripts/verify-affirmation-voice-browser.mjs");
 const ui=read("components/mandala-guest-voice-message.tsx");
 const css=read("components/mandala-guest-voice-message.module.css");
 assert.match(ui,/type="button" role="checkbox" aria-checked=\{approved\}/);
 // WebKit's emulated iPhone emits touchend but can omit the compatibility click.
 // Preserve explicit opt-in, swipe cancellation, keyboard click and no double-toggle.
 for(const expected of [
  'onTouchStart={event=>{','onTouchMove={event=>{','onTouchCancel={()=>{consentTouchOrigin.current=null;}',
  'onTouchEnd={event=>{','lastConsentTouchAt.current=Date.now();',
  'Math.hypot(finger.clientX-start.x,finger.clientY-start.y)>12',
  'if(Date.now()-lastConsentTouchAt.current>=700)',
  'setApproved(current=>!current)'
 ])assert.ok(ui.includes(expected),expected);
 assert.ok(ui.includes('data-guest-message-consent'));
 assert.ok(ui.includes('disabled={!approved}'));
 assert.ok(ui.includes('if(!approved||busy||pending.current'));
 assert.ok(!ui.includes('type="checkbox"'));
 assert.ok(css.includes('.check[aria-checked="true"] .checkIcon'));
 for(const step of ['await consentBox.tap();',
  'VOICE_GUEST_TOUCH_CONSENT_DIAG',
  'await expect(consentBox).toHaveAttribute("aria-checked","true",{timeout:10000});',
  'await expect(consentBox).toHaveAttribute("aria-checked","false");',
  'await expect(start).toBeDisabled();',
  'await expect(start).toBeEnabled();',
  'assert.deepEqual(providerPosts,[]'])
   assert.ok(source.includes(step),step);
 assert.equal(source.split('await consentBox.tap();').length-1,3);
 assert.ok(!source.includes("await consentLabel.click()"));
 const firstClick=source.indexOf("await consentBox.tap();");
 const recipientOpen=source.indexOf("const recipient=await context.newPage();");
 const recipientClose=source.indexOf("finally{await recipient.close();}");
 assert.ok(firstClick>0&&recipientOpen>firstClick&&recipientClose>recipientOpen,
  "headed WebKit must complete a real original-page click before opening the invitee tab");
 assert.ok(!source.includes("await page.bringToFront()"),
  "no original-tab interaction should depend on restoring focus after another tab");
});

test("Ideas keeps Personalization and Concept; Voice / My Voice live only in Audio",()=>{
 const studio=read("components/mandala-free-video-studio.tsx");
 const browser=read("scripts/verify-affirmation-voice-browser.mjs");
 assert.equal((studio.match(/data-video-ideas-tab="/g)||[]).length,2);
 assert.match(studio,/data-video-ideas-tab="personalization"/);
 assert.match(studio,/data-video-ideas-tab="concept"/);
 assert.match(studio,/data-video-audio-voice-mode="voice"/);
 assert.match(studio,/data-video-audio-voice-mode="my-voice"/);
 assert.match(studio,/data-video-audio-panel="voice"[\s\S]*?hypnoVoiceEditor/);
 assert.match(studio,/ownVoiceOnly=\{ideasVoiceMode==="my-voice"\}/);
 const legacy=studio.indexOf("data-video-legacy-phrase-editor");
 assert.ok(legacy>0);
 assert.match(studio.slice(legacy,legacy+600),/hidden=\{true\}/,
   "old voice controls in Ideas are preserved but not displayed");
 assert.match(studio,/data-video-phrase-audio-shortcut[\s\S]*?setActiveWorkspace\("effects"\);setAudioWorkspaceTab\("voice"\)/);
 const audio=browser.indexOf("const audioWorkspaceAfterExport=page.locator");
 const open=browser.indexOf("await audioWorkspaceAfterExport.click()",audio);
 const panel=browser.indexOf('await expect(page.locator(\'[data-video-audio-panel="voice"]\')).toBeVisible()',open);
 const voice=browser.indexOf('const standardAudioMode=page.locator',panel);
 const my=browser.indexOf('await myVoiceAudioMode.click()',voice);
 const consent=browser.indexOf('await narrationConsent.check()');
 assert.ok(audio>=0&&open>audio&&panel>open&&voice>panel&&my>voice&&consent>=0,
   "real WebKit opens Audio Voice / My Voice mode controls and retains explicit narration consent");
 assert.match(browser,/data-video-audio-voice-mode="voice"/);
 assert.match(browser,/data-video-audio-voice-mode="my-voice"/);
 assert.match(browser,/data-video-affirmation-transcript-review/);
 assert.match(browser,/spawnSync\("ffprobe"/);
});
test("guided meditation Add opens the single Audio / Meditations composer; Skip revokes its seed",()=>{
 const studio=read("components/mandala-free-video-studio.tsx");
 const audio=studio.indexOf('data-video-audio-panel="meditations"');
 const composer=studio.indexOf("<MandalaPersonalMeditation",audio);
 assert.ok(audio>0&&composer>audio,"one dedicated Audio / Meditations panel owns the composer");
 assert.match(studio,/onAddMeditation=\{script=>\{[\s\S]*?setCourseMeditationDraft\(script\);[\s\S]*?setActiveWorkspace\("effects"\);setAudioWorkspaceTab\("meditations"\)/);
 assert.match(studio,/onOmitMeditation=\{\(\)=>\{[\s\S]*?setCourseMeditationDraft\(""\);[\s\S]*?setAttachedAudio\(current=>/);
 assert.match(studio,/coursePreview=\{Boolean\(courseMeditationDraft\)\} seedScript=\{courseMeditationDraft\}/);
 assert.equal((studio.match(/<MandalaPersonalMeditation\b/g)||[]).length,1,
   "there is one composer, not another one in Ready or Practices");
 assert.doesNotMatch(studio,/courseMeditationIncluded|courseMeditationOmitted|<details[^>]*data-video-therapy-meditation-audio/,
   "the obsolete inline-details composer state is not reintroduced");
});

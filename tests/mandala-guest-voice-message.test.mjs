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

test("macOS WebKit follows Goal 1 → Goal 2 → Ideas → Montage with native clicks",()=>{
 const browser=read("scripts/verify-affirmation-voice-browser.mjs");
 const studio=read("components/mandala-free-video-studio.tsx");
 const style=read("components/mandala-video-mobile.module.css");
 const first=browser.indexOf("async function verifyWorkspaceHydration");
 const last=browser.indexOf("// Real guest route browser acceptance",first);
 const flow=browser.slice(first,last);
 const click=flow.indexOf("await continueToIdeas.click()");
 const goal=flow.indexOf('data-video-goal-clarification',click);
 const goalNext=flow.indexOf("await goal2.locator('[data-video-goal-clarify-continue]').click()",goal);
 const ideas=flow.indexOf('toHaveAttribute("data-active-workspace","phrases")',goalNext);
 const refinement=flow.indexOf('const refinement=page.locator',ideas);
 const toggle=flow.indexOf('const refineToggle=refinement.locator',refinement);
 const conditional=flow.indexOf('if(await refineToggle.getAttribute("aria-expanded")==="true")',toggle);
 const closed=flow.indexOf('await expect(refineToggle).toHaveAttribute("aria-expanded","false")',conditional);
 const open=flow.indexOf('await refineToggle.click()',closed);
 const verify=flow.indexOf('await expect(refineToggle).toHaveAttribute("aria-expanded","true")',open);
 const montage=flow.indexOf("await montage.tap()",verify);
 assert.ok(first>=0&&last>first&&click>=0&&goal>click&&goalNext>goal&&ideas>goalNext&&refinement>ideas&&toggle>refinement&&conditional>toggle&&closed>conditional&&open>closed&&verify>open&&montage>verify,
   "native Goal 1 → Goal 2 → Ideas refinement → Montage, no fake shortcut");
 assert.match(flow,/data-video-continue-scenarios/);
 assert.match(flow,/await expect\(allStories\)\.toBeHidden\(\)/);
 assert.doesNotMatch(flow,/await allStories\.click\(\)|\.click\(\{force:true\}\)/);
 assert.match(studio,/data-video-scenario-open=\{videoScenarioOpen\?"true":"false"\}/);
 assert.match(studio,/onClick=\{openGoalClarification\}/);
 assert.match(studio,/onContinue=\{continueToIdeas\}/);
 assert.match(style,/\[data-video-scenario-open="false"\]/);
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

test("Ideas advanced voice stays opt-in and is exercised through a real WebKit click",()=>{
 const studio=read("components/mandala-free-video-studio.tsx");
 const browser=read("scripts/verify-affirmation-voice-browser.mjs");
 assert.match(studio,/data-video-ideas-advanced-voice open=\{ideasVoiceAdvancedOpen\}/);
 assert.ok(studio.includes('setIdeasVoiceAdvancedOpen(true)'),"the visible Ideas audio shortcut opens the editor");
 assert.ok(studio.includes('hidden={activeWorkspace!=="phrases"}'),"voice editor is visible only within Ideas");
 assert.ok(studio.includes('{deepHypnoPane}'),"existing voice and approval controls are retained");
 // Retain real user initiation: Ideas hides this panel until a visible
 // audio/voice shortcut is clicked. A CSS-hidden summary is never clicked.
 const modes=browser.indexOf('const ideasModes=phrases.locator("[data-video-ideas-tabs]")');
 const voiceTab=browser.indexOf('await ideasModes.locator(\'[data-video-ideas-tab="voice"]\').click()',modes);
 const textTab=browser.indexOf('await ideasModes.locator(\'[data-video-ideas-tab="text"]\').click()',voiceTab);
 const recordEntry=browser.indexOf("const recordEntry=phrases.locator",textTab);
 const hidden=browser.indexOf('await expect(advancedVoice).toBeHidden()',recordEntry);
 const visible=browser.indexOf("await expect(recordEntry).toBeVisible",hidden);
 const tapped=browser.indexOf("await recordEntry.click()",visible);
 const opened=browser.indexOf('await expect(advancedVoice).toHaveAttribute("open","")',tapped);
 const details=browser.indexOf('await intentDetails.locator(":scope > summary").click()',opened);
 const options=browser.indexOf("await expect(advancedVoice.locator",details);
 assert.ok(modes>=0&&voiceTab>modes&&textTab>voiceTab&&recordEntry>textTab&&
   hidden>recordEntry&&visible>hidden&&tapped>visible&&opened>tapped&&details>opened&&options>details,
   "WebKit must use real Ideas Text/Voice, Record click and Hypno summary");
 assert.ok(browser.includes('data-video-ideas-own-upload'),"own audio upload remains available");
 assert.ok(!browser.includes('await advancedVoice.locator(":scope > summary").click()'),
  "hidden summary interaction is not an acceptable visitor path");
 assert.ok(browser.includes("await expect(advancedVoice.locator('[data-hypno-select-tone]')).toBeVisible()"));
 assert.ok(!browser.includes("advancedVoice.click({force:true})"),"never force hidden voice controls");
 const css=read("components/mandala-video-mobile.module.css");
 assert.ok(css.includes('[data-video-legacy-phrase-editor]:not([hidden])'),"opt-in advanced editor not hidden by retired CSS");
 assert.ok(css.includes('[data-video-phrase-audio-shortcut]'),"audio shortcut remains visible");
 assert.ok(css.includes('data-active-workspace="phrases"'),"visibility exception scoped to Ideas");
});

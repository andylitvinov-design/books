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

test("macOS WebKit hydration follows visible Goals → Ideas → Montage without legacy clicks",()=>{
 const browser=read("scripts/verify-affirmation-voice-browser.mjs");
 const studio=read("components/mandala-free-video-studio.tsx");
 const style=read("components/mandala-video-mobile.module.css");
 const first=browser.indexOf("async function verifyWorkspaceHydration");
 const last=browser.indexOf("// Real guest route browser acceptance",first);
 const flow=browser.slice(first,last);
 const click=flow.indexOf("await continueToIdeas.click()");
 const ideas=flow.indexOf('toHaveAttribute("data-active-workspace","phrases")',click);
 const refinement=flow.indexOf('const refinement=page.locator',ideas);
 const open=flow.indexOf('await refinement.locator(":scope > summary").click()',refinement);
 const verify=flow.indexOf('await expect(refinement).toHaveAttribute("open","")',open);
 const montage=flow.indexOf("await montage.tap()",verify);
 assert.ok(first>=0&&last>first&&click>=0&&ideas>click&&refinement>ideas&&open>refinement&&verify>open&&montage>verify,
   "one real visitor click reaches Ideas, native topic disclosure, then Montage");
 assert.match(flow,/data-video-continue-scenarios/);
 assert.match(flow,/await expect\(allStories\)\.toBeHidden\(\)/);
 assert.doesNotMatch(flow,/await allStories\.click\(\)|\.click\(\{force:true\}\)/);
 assert.match(studio,/data-video-scenario-open=\{videoScenarioOpen\?"true":"false"\}/);
 assert.match(studio,/onClick=\{continueToIdeas\}/);
 assert.match(style,/\[data-video-scenario-open="false"\]/);
 // The live Style controls are direct buttons, not the removed legacy wrapper.
 assert.ok(flow.includes('const styleTab=page.locator(\'[data-video-montage-tab="effects"]\')'));
 assert.ok(flow.includes('await styleTab.tap()'));
 assert.ok(flow.includes('const styles=page.locator("[data-video-montage-style]")'));
 assert.ok(flow.includes('await expect(styles).toHaveCount(6)'));
 assert.ok(flow.includes('await minimal.tap()'));
 assert.ok(flow.includes('await expect(minimal).toHaveAttribute("aria-pressed","true")'));
 assert.ok(flow.includes('toBeHidden()'),"legacy Director filter is not the active style picker");
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

test("Ideas Personalization and Concept retain a single opt-in Voice/My Voice WebKit path",()=>{
 const studio=read("components/mandala-free-video-studio.tsx");
 const browser=read("scripts/verify-affirmation-voice-browser.mjs");
 assert.match(studio,/data-video-ideas-advanced-voice open=\{ideasVoiceAdvancedOpen\}/);
 assert.match(studio,/hidden=\{activeWorkspace!=="phrases"\|\|ideasSubtab!=="personalization"\}/);
 assert.equal((studio.match(/data-video-ideas-tab="/g)||[]).length,2);
 for(const marker of ['data-video-ideas-tab="personalization"','data-video-ideas-tab="concept"',
  'data-video-ideas-voice-mode="voice"','data-video-ideas-voice-mode="my-voice"',
  'data-video-phrase-audio-shortcut','data-video-ideas-own-upload'])
  assert.ok(studio.includes(marker),marker);
 assert.equal((studio.match(/<MandalaAffirmationVoice locale/g)||[]).length,1);
 const modes=browser.indexOf('const ideasModes=phrases.locator("[data-video-ideas-tabs]")');
 const personal=browser.indexOf('const personalTab=ideasModes.locator',modes);
 const concept=browser.indexOf('await conceptTab.click()',personal);
 const back=browser.indexOf('await personalTab.click()',concept);
 const disclosure=browser.indexOf('await advancedText.click()',back);
 const voice=browser.indexOf('await voiceModeButton.click()',disclosure);
 const my=browser.indexOf('await myVoiceModeButton.click()',voice);
 const consent=browser.indexOf('await narrationConsent.check()',my);
 assert.ok(modes>=0&&personal>modes&&concept>personal&&back>concept&&
   disclosure>back&&voice>disclosure&&my>voice&&consent>my,
   "actual user opens Personalization and the protected voice editor before consenting");
 assert.match(browser,/data-video-affirmation-transcript-review/);
 assert.match(browser,/spawnSync\("ffprobe"/);
 assert.doesNotMatch(browser,/advancedVoice\.click\(\{force:true\}\)/);
 const css=read("components/mandala-video-mobile.module.css");
 assert.ok(css.includes('[data-ideas-subtab="voice"] [data-video-legacy-phrase-editor][data-video-ideas-recording-open="true"]{display:block!important}'), "the voice editor is exposed only inside its selected Voice/My Voice submode");
 assert.match(css,/data-video-phrase-audio-shortcut\]:not\(\[hidden\]\)/);
});


test("guided meditation include/omit commits native narration disclosure after React state",()=>{
 const studio=read("components/mandala-free-video-studio.tsx");
 assert.match(studio,/const \[courseMeditationIncluded,setCourseMeditationIncluded\]=useState\(false\)/);
 assert.match(studio,/else if\(courseMeditationIncluded&&courseMeditationDraft\)details\.open=true/);
 assert.match(studio,/if\(courseMeditationOmitted\)details\.open=false/);
 assert.match(studio,/setCourseMeditationIncluded\(true\);\s*setCourseMeditationDraft\(script\);/);
 assert.match(studio,/onOmitMeditation=\{\(\)=>\{\s*setCourseMeditationIncluded\(false\);/);
 assert.doesNotMatch(studio,/onAddMeditation=\{script=>\{[\s\S]{0,500}requestAnimationFrame/);
});

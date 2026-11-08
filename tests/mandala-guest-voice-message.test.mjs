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

test("macOS WebKit follows Goal 1 → Goal 2 → Ideas → Montage without hidden actions",()=>{
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
   "native Goal 1 → Goal 2 → Ideas refinement → Montage; no hidden shortcut");
 assert.match(flow,/data-video-continue-scenarios/);
 assert.match(flow,/await expect\(allStories\)\.toBeHidden\(\)/);
 assert.doesNotMatch(flow,/await allStories\.click\(\)|\.click\(\{force:true\}\)/);
 assert.match(studio,/data-video-scenario-open=\{videoScenarioOpen\?"true":"false"\}/);
 assert.match(studio,/data-video-goal-page=\{goalPage\}/);
 assert.match(studio,/data-video-continue-scenarios[\s\S]*?onClick=\{openGoalClarification\}/);
 assert.match(studio,/data-video-stage-generate="goal"[\s\S]*?onClick=\{generateFromGoal\}/);
 assert.match(studio,/onContinue=\{continueToIdeas\}/);
 assert.match(style,/\[data-video-goal-page="clarify"\]/);
 assert.ok(flow.includes('const styleTab=page.locator(\'[data-video-montage-tab="effects"]\')'));
 assert.ok(flow.includes('await styleTab.tap()'));
 assert.ok(flow.includes('const styles=page.locator("[data-video-montage-style]")'));
 assert.ok(flow.includes('await expect(styles).toHaveCount(6)'));
 assert.ok(flow.includes('await minimal.tap()'));
 assert.ok(flow.includes('await expect(minimal).toHaveAttribute("aria-pressed","true")'));
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
 const myVoiceTab=browser.indexOf('await ideasModes.locator(\'[data-video-ideas-tab="my-voice"]\').click()',voiceTab);
 const textTab=browser.indexOf('await ideasModes.locator(\'[data-video-ideas-tab="text"]\').click()',myVoiceTab);
 const recordEntry=browser.indexOf("const recordEntry=phrases.locator",textTab);
 const hidden=browser.indexOf('await expect(advancedVoice).toBeHidden()',recordEntry);
 const visible=browser.indexOf("await expect(recordEntry).toBeVisible",hidden);
 const tapped=browser.indexOf("await recordEntry.click()",visible);
 const opened=browser.indexOf('await expect(advancedVoice).toHaveAttribute("open","")',tapped);
 const ownMode=browser.indexOf('await expect(phrases).toHaveAttribute("data-ideas-active-tab","my-voice"',opened);
 const returnText=browser.indexOf('await ideasModes.locator(\'[data-video-ideas-tab="text"]\').click()',ownMode);
 const advancedText=browser.indexOf("const advancedText=phrases.locator",returnText);
 const textOpened=browser.indexOf("await advancedText.click()",advancedText);
 const ideaToggle=browser.indexOf("const ideaToggle=intentDetails.locator('[data-hypno-idea-toggle]')",textOpened);
 const ideaClick=browser.indexOf("await ideaToggle.click()",ideaToggle);
 const ideaExpanded=browser.indexOf('await expect(ideaToggle).toHaveAttribute("aria-expanded","true")',ideaClick);
 const options=browser.indexOf("await expect(advancedVoice.locator",ideaExpanded);
 assert.ok(modes>=0&&voiceTab>modes&&myVoiceTab>voiceTab&&textTab>myVoiceTab&&
   recordEntry>textTab&&hidden>recordEntry&&visible>hidden&&tapped>visible&&
   opened>tapped&&ownMode>opened&&returnText>ownMode&&advancedText>returnText&&
   textOpened>advancedText&&ideaToggle>textOpened&&ideaClick>ideaToggle&&
   ideaExpanded>ideaClick&&options>ideaExpanded,
   "WebKit must visit Text, Voice and My Voice, then open the real Text disclosure by user taps");
 const hypno=read("components/mandala-hypno-compact.tsx");
 assert.ok(hypno.includes('data-hypno-idea-toggle')&&hypno.includes('aria-expanded={ideaDisclosureOpen}'),
   "the fine-tuning control must remain a real accessible disclosure button");
 assert.ok(hypno.includes('useEffect(()=>{if(autoExpandIdea)setIdeaDisclosureOpen(true);},[autoExpandIdea])'),
   "the Text Advanced user action must restore the fine-tuning panel after Safari remount");
 assert.ok(studio.includes('autoExpandIdea={activeWorkspace==="phrases"&&ideasSubtab==="text"&&ideasVoiceAdvancedOpen}'),
   "only Text's explicit Advanced action auto-opens fine-tuning; Voice and My Voice stay compact");
 assert.ok(!studio.includes('document.querySelector<HTMLDetailsElement>("[data-hypno-idea-details]")'),
   "Personalize must not write to a removed native details control");
 assert.ok(!studio.includes('document.querySelector<HTMLButtonElement>("[data-hypno-suggest-tests]")?.click()'),
   "opening settings must not synthesize a hidden click or fetch private tests");
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

test("macOS WebKit reaches real Create through visible Style → Audio and keeps MP4 + voice acceptance",()=>{
 const flow=read("scripts/verify-affirmation-voice-browser.mjs");
 const studio=read("components/mandala-free-video-studio.tsx");
 const css=read("components/mandala-video-mobile.module.css");
 const start=flow.indexOf('phase(engine,"hypno-audio-effects-rendered")');
 const finish=flow.indexOf('phase(engine,"start-media-recorder")',start);
 assert.ok(start>0&&finish>start);
 const journey=flow.slice(start,finish);
 let last=-1;
 for(const action of [
   'await page.locator(\'[data-video-quick-control="editor"]\').click()',
   'const creationStyleTab=page.locator(\'[data-video-montage-tab="effects"]\')',
   'await expect(creationStyleTab).toBeVisible',
   'await creationStyleTab.click()',
   'await expect(creationStyleTab).toHaveAttribute("aria-pressed","true")',
   'const montageAudioTab=page.locator(\'[data-video-montage-tab="audio"]\')',
   'await montageAudioTab.click()',
   'await expect(montageAudioTab).toHaveAttribute("aria-pressed","true")',
   'const generate=page.locator("[data-video-quick-generate]")',
   'await expect(generate).toBeVisible',
   'await expect(generate).toBeEnabled'

 ]){
   const at=journey.indexOf(action,last+1);
   assert.ok(at>last,action+" follows the real visitor path");
   last=at;
 }
 assert.match(studio,/data-video-montage-next=\{montagePanel==="effects"\?"audio":"hypno"\}/);
 assert.match(studio,/data-video-quick-generate[\s\S]*?onClick=\{createQuickVideo\}/);
 assert.match(studio,/const continueMontageOrGenerate=\(\)=>/);
 assert.match(css,/\[data-montage-panel="effects"\] \[data-video-order-bar\]\{display:none!important\}/);
 assert.doesNotMatch(journey,/\.click\(\{\s*force:\s*true/);
 assert.ok(flow.includes('const output=page.locator("[data-mandala-video-download]")'));
 assert.ok(flow.includes('await generate.click()'));
});

test("macOS consent acceptance requires real meditation opt-out without WebKit RAF waits",()=>{
 const browser=read("scripts/verify-practices-mobile-browser.mjs");
 const guided=read("components/mandala-guided-course.tsx");
 const stage=read("components/mandala-free-video-studio.tsx");
 const begin=browser.indexOf('const skipButton=course.locator("[data-guided-skip-meditation]")');
 const end=browser.indexOf('await programmeButton.click()',begin);
 assert.ok(begin>0&&end>begin);
 const flow=browser.slice(begin,end);
 for(const step of [
   "await skipButton.click();",
   'await expect(skipButton).toHaveAttribute("aria-pressed","true"',
   'await expect(audio).not.toHaveAttribute("open",""',
   'node instanceof HTMLDetailsElement ? node.open : null',
   ').toBe(false);',
   'assert.equal(await audio.getAttribute("open"),null',
   'assert.equal(await skipButton.getAttribute("aria-pressed"),"true")'
 ])assert.ok(flow.includes(step),step);
 assert.doesNotMatch(flow,/page\.waitForFunction|force:\s*true|\.evaluate\([^]*?\.open\s*=/,
    "do not bypass the visitor action or trust suspended RAF polling");
 assert.match(guided,/data-guided-skip-meditation[\s\S]*?flushSync\(\(\)=>setMeditationChoice\("omit"\)\);[\s\S]*?onOmitMeditation\?\.\(\)/);
 assert.match(stage,/onOmitMeditation=\{\(\)=>\{[\s\S]*?setCourseMeditationOmitted\(true\)/);
 assert.match(browser,/await consentLabel\.click\(\)/,
    "the actual consent label must still receive a real click");
 assert.match(browser,/await expect\(consentBox\)\.toBeChecked/);
 assert.match(browser,/await expect\(send\)\.toBeEnabled/);
});

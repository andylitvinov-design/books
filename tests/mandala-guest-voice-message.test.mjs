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

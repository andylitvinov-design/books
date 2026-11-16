import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const v=read("components/mandala-affirmation-voice.tsx");
const s=read("components/mandala-free-video-studio.tsx");
const l=read("components/mandala-local-voice-tracks.tsx");
const c=read("components/mandala-affirmation-voice.module.css");
const b=read("scripts/verify-affirmation-voice-browser.mjs");
test("one compact Ideas voice flow retains consent and original renderer",()=>{
 for(const key of ["data-voice-layout","data-video-affirmation-phrase-count","consentBrief","privacyDetails","data-video-generate-affirmation-audio","data-video-affirmation-voice-consent","data-video-affirmation-voice-advanced","data-video-affirmation-voice-preview"])
  assert.ok(v.includes(key),key);
 assert.ok(s.includes('compact={activeWorkspace==="phrases"&&ideasVoiceAdvancedOpen}'));
 assert.ok(s.includes('ownVoiceOnly={activeWorkspace==="phrases"&&ideasVoiceMode==="my-voice"&&ideasVoiceAdvancedOpen}'));
 assert.ok(s.includes('data-video-ideas-voice-mode="my-voice"'));
 assert.ok(s.includes('data-ideas-active-tab={ideasSubtab}'));
 assert.ok(v.includes('uploadAction={ownVoiceOnly?extraActions:null}'));
 assert.ok(l.includes('data-video-ideas-record-voice={compact?"":undefined}'));
 for(const key of ["data-video-ideas-own-upload","chooseAudioFile(file)","data-video-ideas-voice-mode=\"my-voice\""])assert.ok(s.includes(key),key);
 assert.equal((v.match(/data-video-affirmation-voice-consent/g)||[]).length,1);
 assert.equal((s.match(/<MandalaAffirmationVoice locale/g)||[]).length,1);
 assert.match(v,/!speechText\|\|!consent\|\|voiceRequestInFlight/);
});
test("6 licensed first-party scene posters and warm reference palette",()=>{
 const images={"mark":"mountain-air.jpg","alexander":"sunbeam-flow.jpg","leon":"calm-sea.jpg","sofia":"meadow-morning.jpg","maya":"wildflower-dance.jpg","alisa":"sea-breeze.jpg"};
 for(const [id,name] of Object.entries(images)){
  assert.ok(existsSync(new URL("../public/videos/holistic-house/film-collection-v2/"+name,import.meta.url)),name);
  assert.ok(c.includes('data-video-affirmation-voice-card="'+id+'"]::before'),id);
 }
 assert.ok(c.includes("background:#FFFCF7"));
 assert.ok(c.includes("background:linear-gradient(115deg,#13A887,#03765F)"));
});
test("real browser covers mobile geometry 320-430, original Text, and explicit consent",()=>{
 assert.ok(b.includes("for(const width of [320,354,390,430])"));
 assert.ok(b.includes("generation follows voice sample"));
 assert.ok(b.includes("no horizontal overflow"));
 assert.ok(b.includes('data-video-ideas-tab="personalization"'));
});

test("My Voice owns real recorder/upload; cloud consent and apply remain Voice-only",()=>{
 assert.ok(s.includes('data-video-ideas-voice-mode="my-voice"'));
 assert.ok(v.includes('hidden={!ownVoiceOnly&&voiceGender!=="own"}'));
 assert.ok(v.includes('!ownVoiceOnly&&voiceGender!=="own" ? <>'));
 assert.ok(l.includes('getUserMedia({audio:true})'));
 assert.equal((s.match(/<MandalaAffirmationVoice locale/g)||[]).length,1);
 const mobile=read("components/mandala-video-mobile.module.css");
 assert.match(mobile,/\.ideasSubtabs\{\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.ok(c.includes('>.voiceChoices{order:4;margin-bottom:0}'));
 assert.ok(c.includes('>.action{order:5}'));
});

test("Personalization exposes real Voice/My Voice consent through a visible action",()=>{
 const css=read("components/mandala-video-mobile.module.css");
 const script=read("scripts/verify-affirmation-voice-browser.mjs");
 assert.ok(css.includes('[data-video-quick-phrases][data-ideas-subtab="personalization"]>button[data-video-phrase-audio-shortcut]:not([hidden])'));
 assert.ok(script.includes("const advancedText=phrases.locator('[data-video-phrase-audio-shortcut]')"));
 assert.ok(script.includes("await advancedText.click()"));
 assert.ok(script.includes("await personalTab.click()"));
 assert.ok(script.includes("await myVoiceModeButton.click()"));
 assert.ok(script.includes('await narrationConsent.tap()'));
 assert.ok(script.includes('await expect(narrationConsent).toHaveAttribute("aria-checked","false")'));
});

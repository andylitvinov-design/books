import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const v=read("components/mandala-affirmation-voice.tsx");
const s=read("components/mandala-free-video-studio.tsx");
const c=read("components/mandala-affirmation-voice.module.css");
const b=read("scripts/verify-affirmation-voice-browser.mjs");
test("one compact Ideas voice flow retains consent and original renderer",()=>{
 for(const key of ["data-voice-layout","data-video-affirmation-phrase-count","consentBrief","privacyDetails","data-video-generate-affirmation-audio","data-video-affirmation-voice-consent","data-video-affirmation-voice-advanced","data-video-affirmation-voice-preview"])
  assert.ok(v.includes(key),key);
 assert.ok(s.includes('compact={activeWorkspace==="phrases"&&ideasVoiceAdvancedOpen}'));
 for(const key of ["data-video-ideas-own-upload","data-video-ideas-record-voice","chooseAudioFile(file)","data-video-affirmation-gender=\"own\""])assert.ok(s.includes(key),key);
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
test("real browser covers mobile geometry 320-430, personalized Ideas, and explicit consent",()=>{
 assert.ok(b.includes("for(const width of [320,354,390,430])"));
 assert.ok(b.includes("upload and record before generation"));
 assert.ok(b.includes("no horizontal overflow"));
 assert.ok(b.includes('data-video-ideas-tab="personalization"'));
});

import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const r=f=>readFileSync(new URL(f,import.meta.url),"utf8");
const d=r("../components/mandala-auto-video-director.tsx");
const s=r("../components/mandala-free-video-studio.tsx");
test("For others shows three distinct formats; greeting and gift stay separate real occasions",()=>{
 for(const id of ["greeting","presentation","audio_visual"])assert.match(d,new RegExp('id:"'+id+'"'));
 assert.match(d,/data-auto-video-recipient-kind=\{item.id\}/);
 assert.match(d,/data-video-recipient-celebration=\{kind\}/);
 assert.match(d,/recipientAudioMode\?recipientAudioPanel/);
});
test("audio on Goal reuses consented STT, original speech, verified shot matcher, Montage",()=>{
 for(const data of ["data-video-recipient-audio-upload","data-video-recipient-audio-record",
  "data-video-recipient-audio-rights","data-video-recipient-audio-stt-consent",
  "data-video-recipient-audio-transcribe","data-video-recipient-audio-plan","data-video-recipient-audio-concept",
  "data-video-recipient-audio-next"])assert.ok(s.includes(data),data);
 assert.match(s,/requestConsentedTimedTranscript\(entry.file,locale,sttConsent/);
 assert.match(s,/planAudioVisualStoryboard\(\{/);
 assert.match(s,/audioStoryboardReady=\{audioPlanApplied&&Boolean\(voiceVisualPlan\?\.canExport\)\}/);
 assert.match(s,/setAttachedAudio\(\{kind:"file",file:entry.file,id:entry.url,nonLoop:true\}\)/);
});

test("rights revocation and switching away protect personal audio from recipients",()=>{
 assert.match(s,/if\(!audioPlanApplied\|\|!voiceVisualPlan\?\.canExport\|\|!audioRights\)return/);
 assert.match(s,/audioStoryboardReady=\{audioPlanApplied&&Boolean\(voiceVisualPlan\?\.canExport\)&&audioRights\}/);
 assert.match(s,/onAudioSelectionChange=\{active=>\{/);
 assert.match(s,/if\(!active&&recipientAudioSelected\)\{/);
 assert.match(s,/setAttachedAudio\(current=>current\?\.kind==="file"\?null:current\)/);
 const browser=r("../scripts/verify-affirmation-voice-browser.mjs");
 assert.match(browser,/data-auto-video-recipient-kind="audio_visual"/);
 assert.match(browser,/data-video-recipient-audio-stt-consent/);
 assert.match(browser,/data-video-recipient-audio-upload/);
 assert.match(browser,/assert.equal\(outboundStt.length,0/);
});

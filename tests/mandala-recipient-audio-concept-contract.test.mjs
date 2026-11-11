import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const studio=read("../components/mandala-free-video-studio.tsx");
const director=read("../components/mandala-auto-video-director.tsx");
const styles=read("../components/mandala-video-mobile.module.css");
const stt=read("../lib/mandala/consented-audio-stt.ts");
const concept=read("../lib/mandala/audio-concept-director.mjs");

test("one production Goal audio flow is enriched, not replaced by a second editor",()=>{
 assert.match(director,/recipientAudioMode\?recipientAudioPanel/);
 assert.match(director,/recipientFormatCards\.map/);
 assert.match(studio,/recipientAudioPanel=\{recipientAudioPanel\}/);
 assert.match(studio,/voiceConcept=useMemo\(\(\)=>deriveAudioVideoConcept\(\{/);
 assert.match(studio,/data-video-recipient-audio-concept-preview/);
 assert.match(studio,/data-video-recipient-audio-goal/);
 assert.match(studio,/data-video-recipient-audio-purpose/);
 assert.match(studio,/data-video-recipient-audio-category/);
 assert.match(studio,/data-video-recipient-audio-style/);
 assert.match(studio,/data-video-recipient-audio-symbol/);
 assert.match(studio,/data-video-recipient-audio-pace/);
 assert.match(studio,/data-video-recipient-audio-keywords/);
 assert.match(studio,/data-video-recipient-audio-preview/);
 assert.match(studio,/data-video-recipient-audio-no-footage/);
 assert.match(styles,/\.recipientAudioFields\{/);
 assert.doesNotMatch(studio,/MandalaRecipientAudioEntry/);
});
test("transcript stays in memory, candidate shots remain preview-only until manual approval",()=>{
 assert.match(studio,/setVoiceVisualPlan\(planAudioVisualStoryboard\(\{/);
 assert.match(studio,/onClick=\{\(\)=>applyTranscriptVideo\(\)\}/);
 assert.match(studio,/disabled=\{!audioPlanApplied\|\|!voiceVisualPlan\?\.canExport\|\|!audioRights\}/);
 assert.match(studio,/setAttachedAudio\(\{kind:"file",file:entry\.file,id:entry\.url,nonLoop:true\}\)/);
 assert.match(studio,/data-video-recipient-audio-stt-notice/);
 assert.match(studio,/data-video-recipient-audio-rights-notice/);
 assert.match(studio,/data-video-recipient-audio-transcript/);
 assert.doesNotMatch(studio.slice(studio.indexOf("const recipientAudioPanel="),
   studio.indexOf("const activateQuickWorkspace=")),/type="checkbox"/);
 assert.match(concept,/sourceVerified:false/);
 assert.match(concept,/previewOnly:true,requiresReview:true/);
 assert.match(concept,/origin:"quoted_source_not_generated"/);
 assert.doesNotMatch(concept,/fetch\(|localStorage|sessionStorage|indexedDB/i);
});
test("iPhone Files generic MIME is normalized only with explicit consent and strict allowlist",()=>{
 assert.match(stt,/AUDIO_STT_CONSENT_REQUIRED/);
 assert.match(stt,/file\.size>4\*1024\*1024/);
 assert.match(stt,/if\(!mime\)throw Error\("AUDIO_STT_INVALID_FILE"\)/);
 assert.match(stt,/const declaredType=file\.type\.toLowerCase\(\)\.split\(";"\)\[0\]\.trim\(\)/);
 assert.match(stt,/audio\/mp4;codecs=mp4a\.40\.2/);
 assert.match(stt,/new File\(\[file\],file\.name,\{type:mime,lastModified:file\.lastModified\}\)/);
 assert.match(stt,/form\.append\("file",normalized,normalized\.name\)/);
});

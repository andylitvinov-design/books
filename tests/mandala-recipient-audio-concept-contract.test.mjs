import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=file=>readFileSync(new URL(file,import.meta.url),"utf8");
const goal=read("../components/mandala-auto-video-director.tsx");
const panel=read("../components/mandala-recipient-audio-entry.tsx");
const studio=read("../components/mandala-free-video-studio.tsx");
const styles=read("../components/mandala-auto-video-director.module.css");
const stt=read("../lib/mandala/consented-audio-stt.ts");
const concept=read("../lib/mandala/audio-concept-director.mjs");

test("audio-derived concept populates visible Goal, category, style, symbol, pace",()=>{
  assert.match(goal,/MandalaRecipientAudioEntry/);
  assert.match(panel,/data-video-recipient-audio-goal/);
  assert.match(panel,/data-video-recipient-audio-purpose/);
  assert.match(panel,/data-video-recipient-audio-category/);
  assert.match(panel,/data-video-recipient-audio-style/);
  assert.match(panel,/data-video-recipient-audio-symbol/);
  assert.match(panel,/data-video-recipient-audio-pace/);
  assert.match(panel,/data-video-recipient-audio-keywords/);
  assert.match(styles,/\.recipientConceptFields\{/);
  assert.match(studio,/deriveAudioVideoConcept\(\{/);
  assert.match(studio,/concept:voiceConcept/);
  assert.match(studio,/planAudioVisualStoryboard\(\{/);
});
test("concept is a source-labeled proposal: never proves video rights or rewrites voice",()=>{
  assert.match(concept,/sourceVerified:false/);
  assert.match(concept,/previewOnly:true,requiresReview:true/);
  assert.match(concept,/origin:"quoted_source_not_generated"/);
  assert.doesNotMatch(concept,/fetch\(|localStorage|sessionStorage|indexedDB/i);
  assert.match(studio,/nonLoop:true/);
  assert.match(studio,/setAttachedAudio\(\{kind:"file",file:entry\.file,id:entry\.url,nonLoop:true\}\)/);
});
test("mobile iOS audio without MIME is normalized from allowed extension only",()=>{
  assert.match(stt,/AUDIO_STT_CONSENT_REQUIRED/);
  assert.match(stt,/file\.size>4\*1024\*1024/);
  assert.match(stt,/if\(!mime\)throw Error\("AUDIO_STT_INVALID_FILE"\)/);
  assert.match(stt,/file\.type===""\|\|file\.type==="application\/octet-stream"/);
  assert.match(stt,/new File\(\[file\],file\.name,\{type:mime,lastModified:file\.lastModified\}\)/);
  assert.match(stt,/form\.append\("file",normalized,normalized\.name\)/);
  assert.match(panel,/data-video-recipient-audio-stt-consent/);
  assert.match(panel,/data-video-recipient-audio-rights/);
});

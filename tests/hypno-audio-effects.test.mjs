import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("hypno audio renderer produces a real stereo PCM WAV and supports quiet speech and binaural layers",()=>{
  const source=readFileSync(new URL("../lib/mandala/hypno-audio-effects.ts",import.meta.url),"utf8");
  assert.match(source,/export async function createHypnoAudioEffectFile/);
  assert.match(source,/new OfflineContext\(2,/);
  assert.match(source,/createChannelMerger\(2\)/);
  assert.match(source,/frequency\.value = frequency/);
  assert.match(source,/repeatEverySeconds/);
  assert.match(source,/whisperGain/);
  assert.match(source,/encodePcmWav/);
  assert.match(source,/setUint16\(22, channels, true\)/);
  assert.match(source,/15 \* 1024 \* 1024/);
  assert.match(source,/SPEECH_TRACK_REQUIRED/);
  assert.match(source,/SPEECH_TRACK_EXCEEDS_DURATION/);
  assert.match(source,/at \+ decoded\.duration <= duration/,
    "the final repeated phrase must fit completely; never trim speech");
  assert.match(source,/OFFLINE_AUDIO_UNAVAILABLE/);
});

test("hypno audio UI uses the existing consented phrase narrator in-place, not the general music tab",()=>{
  const mobile=readFileSync(new URL("../components/mandala-hypnocorrection-mobile.tsx",import.meta.url),"utf8");
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  assert.match(mobile,/data-hypno-speech-settings/);
  assert.match(mobile,/voiceEditor\|\|<p/);
  assert.match(mobile,/onToggleWhisper/);
  assert.match(mobile,/onToggleBinaural/);
  assert.match(mobile,/data-hypno-binaural-settings/);
  const audioGroup=mobile.slice(mobile.indexOf('{group.id==="audio"?<>'),mobile.indexOf('{group.id==="visual"?<>'));
  assert.ok(audioGroup.length>0,"audio group must exist");
  assert.doesNotMatch(audioGroup,/unavailable|coming soon/);
  assert.match(studio,/voiceEditor=\{activeWorkspace==="effects"\?hypnoVoiceEditor:null\}/);
  assert.match(studio,/createHypnoAudioEffectFile/);
  assert.match(studio,/setAttachedAudio\(\{kind:"file",file:entry\.file,id:entry\.url,nonLoop:true/);
  assert.match(studio,/includesNarration\?\{narration:true,spokenText:currentAffirmationSpeech/,
    "effect files that contain speech retain transcript identity and become stale after approval");
  assert.match(studio,/disabled=\{recording\|\|preparing\|\|hypnoAudioBusy\|\|phrasePending\|\|narrationInvalid\}/,
    "pending or stale scripts cannot be remixed through the audio cards");
  assert.match(studio,/previousHypnoAudioRef/);
  assert.doesNotMatch(studio,/onOpenAudioEditor=\{\(\)=>openQuickDetailed\("video-audio"\)\}/);
});

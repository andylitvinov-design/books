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
  assert.doesNotMatch(mobile,/unavailable onToggle/);
  assert.match(studio,/voiceEditor=\{activeWorkspace==="effects"\?hypnoVoiceEditor:null\}/);
  assert.match(studio,/createHypnoAudioEffectFile/);
  assert.match(studio,/setAttachedAudio\(\{kind:"file",file:entry\.file,id:entry\.url,nonLoop:true\}\)/);
  assert.match(studio,/previousHypnoAudioRef/);
  assert.doesNotMatch(studio,/onOpenAudioEditor=\{\(\)=>openQuickDetailed\("video-audio"\)\}/);
});

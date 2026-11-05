import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {extractMyTubeWaveform,validateMyTubeWaveform,
  MYTUBE_WAVEFORM_PEAKS,MYTUBE_WAVEFORM_MAX_FILE_BYTES}
  from "../lib/mandala/creative-editor-waveform.mjs";

test("real local PCM bursts paint real peaks, rather than random decorative bars",()=>{
  const samples=new Float32Array(48000);
  for(let i=12000;i<24000;i++)samples[i]=Math.sin(i*.07)*.8;
  const peaks=extractMyTubeWaveform(samples);
  assert.equal(peaks.length,MYTUBE_WAVEFORM_PEAKS);
  assert.ok(peaks.slice(0,10).every(x=>x===0));
  assert.ok(peaks.slice(12,24).some(x=>x>.8));
  assert.ok(peaks.slice(28).every(x=>x===0));
  assert.deepEqual(validateMyTubeWaveform(peaks),peaks);
});
test("silent voice stays visually silent and no missing data is fabricated",()=>{
  const silent=new Float32Array(48000);
  assert.ok(extractMyTubeWaveform(silent).every(x=>x===0));
  const low=new Float32Array(48000).fill(1e-12);
  assert.ok(extractMyTubeWaveform(low).every(x=>x===0));
});
test("invalid output size, malicious or nonfinite peaks are rejected",()=>{
  assert.throws(()=>extractMyTubeWaveform(new Float32Array(4)),/invalid_mytube_waveform/);
  assert.throws(()=>extractMyTubeWaveform(new Float32Array(400),129),/invalid_mytube_waveform/);
  assert.throws(()=>validateMyTubeWaveform([0,NaN,Infinity]),/invalid_mytube_waveform/);
  assert.throws(()=>validateMyTubeWaveform(Array(10).fill(-1)),/invalid_mytube_waveform/);
  assert.equal(MYTUBE_WAVEFORM_MAX_FILE_BYTES,8*1024*1024);
});
test("the current audio source stays local and the output renderer is unchanged",()=>{
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const timeline=readFileSync(new URL("../components/mandala-multitrack-timeline.tsx",import.meta.url),"utf8");
  assert.match(studio,/new OfflineAudioContext\(1,1,44100\)/);
  assert.match(studio,/waveformFile\.arrayBuffer\(\)/);
  assert.match(studio,/extractMyTubeWaveform\(decoded\.getChannelData\(0\)\)/);
  assert.match(studio,/peaks:audioWaveform\?\?undefined/);
  assert.match(studio,/encodeLocalWebCodecsMp4\(/);
  assert.match(timeline,/data-video-timeline-real-waveform/);
  assert.doesNotMatch(timeline,/▂▅▇▃▆▂▇▅▃▇▃▆/);
  assert.doesNotMatch(timeline,/▁▃▅▇▄▅▃▆▂▅▇▃/);
  const waveform=readFileSync(new URL("../lib/mandala/creative-editor-waveform.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(waveform,/\bfetch\s*\(|sendBeacon\s*\(|XMLHttpRequest|localStorage/);
});

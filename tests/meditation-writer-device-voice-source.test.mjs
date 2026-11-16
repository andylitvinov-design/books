import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../components/meditation-writer-device-voice.tsx",import.meta.url),"utf8");
const page=readFileSync(new URL("../components/meditation-writer-preview.tsx",import.meta.url),"utf8");
test("device speech is optional local preview, with stop and no external provider",()=>{
 for(const s of ["speechSynthesis","SpeechSynthesisUtterance","synth.cancel()",
   "utterance.onerror","ru-RU","en-US","es-ES","No MP3 is created"])
   assert.ok(source.includes(s),s);
 for(const forbidden of ["ElevenLabs","apiKey","fetch(","audioAssetId","createObjectURL"])
   assert.equal(source.includes(forbidden),false,forbidden);
 assert.ok(page.includes("MeditationWriterDeviceVoice"));
});

test("Writer Mandala changes must execute real Linux media and macOS WebKit instead of skipped gates",()=>{
 const workflow=readFileSync(new URL("../.github/workflows/holistic-support-mandala.yml",import.meta.url),"utf8");
 const lines=workflow.split(String.fromCharCode(10));
 const required="startsWith(github.head_ref, 'feat/meditation-writer-')";
 for(const name of ["Build","Install isolated Chromium and WebKit (no external account)","Ensure ffprobe and ffmpeg for real encoded video/audio verification","Verify all 44 first-party MP4 sources, SHA-256, real codec and frame decode","Public mandala photo, PNG and video browser flow · 320/390/430px"]){
  const index=lines.indexOf("      - name: "+name);
  assert.ok(index>=0, "real media step missing: "+name);
  assert.ok(lines[index+1]?.includes(required),name+" must run for a Meditation Writer PR");
 }
 const mac=lines.findIndex(line=>line==="  voice-webkit-macos:");
 assert.ok(mac>=0,"real macOS WebKit job missing");
 assert.ok(lines[mac+1]?.includes(required),"macOS job must run, not skip, for a Writer PR");
 const macBody=lines.slice(mac).join(String.fromCharCode(10));
 for(const entry of ["runs-on: macos-15","node scripts/verify-affirmation-voice-browser.mjs","node scripts/benchmarking/first-video-live-export.mjs"])
  assert.ok(macBody.includes(entry),"missing real Safari-platform media acceptance: "+entry);
 assert.equal(macBody.includes("continue-on-error: true"),false,"never waive a failed media run");
});

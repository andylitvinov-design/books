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

import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {affirmationNarrationText,wavDurationFromHeader} from "../lib/mandala/affirmation-voice.mjs";
import {validateStudioRequest,buildStudioPayload} from "../lib/mandala/voice-studio.mjs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("selected exact affirmation lines yield the speech transcript without wish/profile/metadata",()=>{
  const lines=["Я ценю свой труд","Я дышу спокойно","Мне можно отдыхать"];
  assert.equal(affirmationNarrationText(lines),"Я ценю свой труд. Я дышу спокойно. Мне можно отдыхать.");
  assert.equal(affirmationNarrationText([]),"");
  assert.equal(affirmationNarrationText(["<secret>"]),"");
  assert.equal(affirmationNarrationText(["one\nsecond"]),"");
  assert.equal(affirmationNarrationText(["a".repeat(41)]),"");
  assert.equal(affirmationNarrationText(Array(11).fill("I feel safe")),"");
  assert.equal(affirmationNarrationText(["I take my time!"]),"I take my time!");
});
test("guest mode refuses missing consent and only permits prebuilt voices and RU/EN/ES",()=>{
  const data={mode:"affirmations",voiceId:"maya",language:"ru",text:"Я ценю свой труд.",consent:true};
  const valid=validateStudioRequest(data);
  const payload=buildStudioPayload(valid);
  assert.equal(valid.mode,"affirmations");
  assert.equal(payload.input[0].content[0].text,data.text);
  assert.deepEqual(payload.generation_config.speech_config,[{voice:"Sulafat"}]);
  assert.throws(()=>validateStudioRequest({...data,consent:false}));
  assert.throws(()=>validateStudioRequest({...data,voiceId:"made-up"}));
  assert.throws(()=>validateStudioRequest({...data,language:"xx"}));
  assert.equal(validateStudioRequest({...data,language:"es"}).language,"es");
  assert.throws(()=>validateStudioRequest({...data,text:"<inject>"}));
  assert.throws(()=>validateStudioRequest({...data,text:"x".repeat(651)}));
  assert.throws(()=>validateStudioRequest({...data,provider:"paid"}));
});
test("WAV duration parser reads RIFF/fmt/data safely for exact video fit",()=>{
  const sampleRate=24000,durationSeconds=7;
  const bytes=Buffer.alloc(44+sampleRate*2*durationSeconds);
  bytes.write("RIFF",0);bytes.writeUInt32LE(bytes.length-8,4);bytes.write("WAVE",8);
  bytes.write("fmt ",12);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);
  bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(sampleRate,24);bytes.writeUInt32LE(sampleRate*2,28);
  bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);
  bytes.write("data",36);bytes.writeUInt32LE(sampleRate*2*durationSeconds,40);
  const head=bytes.subarray(0,128);
  assert.equal(wavDurationFromHeader(head.buffer.slice(head.byteOffset,head.byteOffset+head.byteLength)),7);
  assert.equal(wavDurationFromHeader(new ArrayBuffer(12)),null);
});
test("real button uses selected runtime affirmations and attaches WAV to existing video export",()=>{
  const page=read("components/mandala-free-video-studio.tsx");
  const client=read("components/mandala-affirmation-voice.tsx");
  const api=read("app/api/holistic-support/voice/route.js");
  const mix=read("lib/mandala/voice-audio-mix.ts");
  const local=read("lib/mandala/local-video-music.ts");
  const browser=read("scripts/verify-affirmation-voice-browser.mjs");
  assert.match(page,/lines=\{affirmationLines\}/);
  assert.match(page,/attachedAudio\.narration!==true/);
  assert.match(page,/onAttach=\{attachGeneratedAffirmationAudio\}/);
  assert.match(page,/setAttachedAudio\(\{kind:"file",file:entry\.file,id:entry\.url,narration:true/);
  assert.match(page,/narrationInvalid/);
  assert.match(page,/attachedAudio\.voiceId!==voicePreferences\.voiceId/);
  assert.match(page,/onPreferencesChange=\{setVoicePreferences\}/);
  assert.match(client,/data-video-generate-affirmation-audio/);
  assert.match(client,/mode:"affirmations"/);
  assert.match(client,/consent:true/);
  assert.match(client,/mixVoiceWithNature\(clip\.blob,selected\.bed,clip\.mixSeconds,selected\)/);
  assert.match(client,/URL\.createObjectURL\(file\)/);
  assert.match(api,/voice-studio-affirmations-daily/);
  assert.match(api,/requireSameOrigin/);
  assert.match(api,/voiceStudioKey\(process\.env\)/);
  assert.match(mix,/minimumSeconds/);
  assert.match(mix,/mixPcmWavs/);
  assert.match(local,/source\.loop = options\.loop !== false/);
  assert.match(browser,/page\.route/);
});

test("six-voice affirmation editor is visible in the Phrases workspace rather than hidden legacy extras",()=>{
  const page=read("components/mandala-free-video-studio.tsx");
  const section=page.indexOf('data-workspace-section="phrases" data-video-quick-phrases');
  const voice=page.indexOf('<MandalaAffirmationVoice locale={locale}');
  const next=page.indexOf('data-workspace-section="effects"',section);
  const hidden=page.indexOf('data-video-quick-legacy');
  assert.ok(section>0 && voice>section && next>voice && hidden>next,
    "voice must be usable from the single visible Phrases tab");
  assert.equal((page.match(/<MandalaAffirmationVoice locale/g)||[]).length,1,
    "do not duplicate the voice editor or API requests");
  assert.match(page.slice(section,next),/data-video-narration-stale/,
    "the warning for stale narration stays beside the visible controls");
  const browser=read("scripts/verify-affirmation-voice-browser.mjs");
  assert.match(browser,/data-video-quick-control="phrases"/);
  assert.match(browser,/data-video-quick-affirmation="0"/);
  assert.match(browser,/data-video-quick-control="video"/);
  assert.doesNotMatch(browser,/advanced\.locator\(":scope > summary"\)\.click/,
    "do not test inaccessible old controls");
});

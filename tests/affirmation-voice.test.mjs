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

test("six-voice affirmation editor is mounted in the approved Phrases workspace rather than legacy extras",()=>{
  const page=read("components/mandala-free-video-studio.tsx");
  const voiceEditor=page.indexOf("const hypnoVoiceEditor = (");
  const deepPane=page.indexOf("const deepHypnoPane = (");
  const phraseMount=page.indexOf('{activeWorkspace==="phrases" ? hypnoVoiceEditor : null}',deepPane);
  const music=page.indexOf("data-hypno-music",phraseMount);
  const hidden=page.indexOf("data-video-quick-legacy");
  assert.ok(voiceEditor>0 && deepPane>voiceEditor && phraseMount>deepPane && music>phraseMount && hidden>music,
    "the single consented voice editor is mounted after the phrase catalog and before music in Phrases");
  assert.match(page.slice(deepPane,music),/data-video-phrase-catalog-details[\\s\\S]*data-hypno-voice/);
  assert.equal((page.match(/<MandalaAffirmationVoice locale/g)||[]).length,1,
    "do not duplicate the voice editor or API requests");
  assert.match(page.slice(voiceEditor,deepPane),/data-video-narration-stale/,
    "the stale narration warning stays inside the visible voice editor");
});;

test("three women and three men use original voices, never autoplay on selection",()=>{
 const ui=read("components/mandala-affirmation-voice.tsx");
 const styles=read("components/mandala-affirmation-voice.module.css");
 for(const marker of ['data-video-affirmation-voice-select','data-video-affirmation-gender={id}',
  'data-video-affirmation-voice-card={v.id}','VOICE_STUDIO_VOICES.filter(v=>v.gender===voiceGender)',
  'setVoiceId(id==="female"?"maya":"mark")'])assert.ok(ui.includes(marker),marker);
 assert.match(styles,/\.voiceCards\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.doesNotMatch(ui,/autoPlay/);
});


test("voice samples are fixed server-owned text on RU/EN/ES, independent of phrase approval",()=>{
  for(const language of ["ru","en","es"]){
    const valid=validateStudioRequest({mode:"sample",voiceId:"maya",language});
    assert.equal(valid.mode,"sample");
    assert.equal(valid.language,language);
    assert.ok(valid.text.length>20);
    assert.equal(valid.consent,false);
    assert.equal(buildStudioPayload(valid).input[0].content[0].text,valid.text);
    assert.throws(()=>validateStudioRequest({mode:"sample",voiceId:"maya",language,text:"private words"}));
    assert.throws(()=>validateStudioRequest({mode:"sample",voiceId:"maya",language,consent:true}));
  }
  assert.throws(()=>validateStudioRequest({mode:"short_text",voiceId:"maya",language:"es",
    text:"abc",consent:true}),"the guest script route remains RU/EN-only");
});

test("all six voices can be selected and their real samples requested before phrase approval",()=>{
  const editor=read("components/mandala-affirmation-voice.tsx");
  const page=read("components/mandala-free-video-studio.tsx");
  const styles=read("components/mandala-affirmation-voice.module.css");
  assert.match(page,/disabled=\{recording\|\|preparing\} approvalPending=\{phrasePending\}/);
  assert.match(editor,/approvalPending\?\:boolean/);
  assert.match(editor,/disabled=\{busy\|\|disabled\} onClick=\{\(\)=>\{/);
  assert.doesNotMatch(editor,/disabled=\{busy\|\|disabled\|\|approvalPending\} onClick/);
  assert.match(editor,/\!\!languageAvailable\|\|disabled\|\|approvalPending\|\|busy|disabled=\{\!languageAvailable\|\|\!speechText\|\|\!consent\|\|busy\|\|mixing\|\|disabled\|\|approvalPending\}/);
  for(const marker of ['data-video-affirmation-voice-preview={v.id}',
    'data-video-affirmation-sample-ready','mode:"sample",voiceId:id,language',
    'sampleCacheRef','sampleControllerRef','sampleAudioRef','aria-label={t.sample+" "+v.name[locale]}'])
    assert.ok(editor.includes(marker),marker);
  assert.match(styles,/\.sampleButton\{/);
  assert.match(styles,/\.samplePlayer audio\{/);
  assert.doesNotMatch(editor,/autoPlay/);
  assert.ok(editor.includes("if(textChanged)setConsent(false)"),
    "newly approved phrase text must require new consent before external narration");
  const ownSample=editor.slice(editor.indexOf('async function previewSample('),
    editor.indexOf('async function createAudio()'));
  assert.doesNotMatch(ownSample,/speechText|consent:true|onAttach\(/,
    "sample must never transmit private phrases or replace the video narration");
});

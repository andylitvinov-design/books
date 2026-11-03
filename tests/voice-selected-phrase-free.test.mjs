import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {affirmationNarrationText} from "../lib/mandala/affirmation-voice.mjs";
import {VOICE_STUDIO_VOICES,validateStudioRequest,buildStudioPayload} from "../lib/mandala/voice-studio.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("all six selected voices synthesize exactly the approved phrase through distinct free Gemini IDs",()=>{
  const phrase=affirmationNarrationText(["Я выбираю спокойствие"]);
  assert.equal(phrase,"Я выбираю спокойствие.");
  const names=new Set();
  for(const voice of VOICE_STUDIO_VOICES){
    const input=validateStudioRequest({mode:"affirmations",voiceId:voice.id,
      language:"ru",text:phrase,consent:true});
    const payload=buildStudioPayload(input);
    assert.equal(input.text,phrase);
    assert.equal(input.voice.id,voice.id);
    assert.equal(payload.input[0].content[0].text,phrase);
    assert.deepEqual(payload.generation_config.speech_config,[{voice:voice.provider}]);
    assert.ok(!names.has(voice.provider),"voice mappings must differ");
    names.add(voice.provider);
    assert.throws(()=>validateStudioRequest({mode:"affirmations",
      voiceId:voice.id,language:"ru",text:phrase,consent:false}));
  }
  assert.equal(names.size,6);
});

test("previewing a voice selects it for the actual phrase and WAV filename",()=>{
  const ui=read("components/mandala-affirmation-voice.tsx");
  assert.ok(ui.includes("if(voiceId!==v.id){setVoiceId(v.id);setConsent(false);}"),
    "sample preview must select that exact voice, not keep the previously selected voice");
  assert.ok(ui.includes('body:JSON.stringify({mode:"sample",voiceId:id,language})'),
    "comparison sample uses provider-owned generic script, not any private words");
  assert.ok(ui.includes('body:JSON.stringify({mode:"affirmations",voiceId,language,text:speechText,consent:true})'),
    "the chosen voice must synthesize the chosen exact approved text");
  assert.ok(ui.includes("data-video-affirmation-selected-phrase"));
  assert.ok(ui.includes("data-video-affirmation-selected-voice"));
  assert.ok(ui.includes("data-video-generate-affirmation-audio"));
  assert.ok(ui.includes("data-video-affimations-audio-ready"));
  assert.ok(ui.includes("ref={generatedAudioRef} controls"));
  assert.ok(ui.includes("generatedAudioRef.current?.play().catch"),
    "try playing the real generated WAV; keep visible native controls on Safari");
  assert.ok(ui.includes("onAttach({file,spokenText:speechText,voiceId,language"),
    "the SAME voice and phrases must reach the final movie");
  assert.ok(ui.includes("approvalPending||busy||!speechText||!consent"));
  assert.ok(ui.includes("if(textChanged)setConsent(false)"));
  for(const label of ["Озвучить выбранные фразы бесплатно","Narrate selected phrases for free","Narrar gratis las frases elegidas"])
    assert.ok(ui.includes(label),label);
});

test("guest selected phrases cannot invoke a paid backup even if enabled for a signed-in custom session",()=>{
  const route=read("app/api/holistic-support/voice/route.js");
  assert.ok(route.includes("publicAffirmationsEnabled:publicFreeAvailable"));
  assert.ok(route.includes("if(!wav && backupKey && validated.mode==='custom')"));
  assert.ok(!route.includes("if(!wav && backupKey) {"),
    "public no-charge samples and affirmations must never fall back to paid TTS");
  assert.match(route,/validated\.mode==='affirmations'\|\|validated\.mode==='short_text'/);
  assert.ok(route.includes("requireSameOrigin(request,config)"));
  assert.ok(route.includes("consumeRate(config"));
});

test("phone voice picker keeps phrase summary compact and audible result accessible",()=>{
  const css=read("components/mandala-affirmation-voice.module.css");
  const parent=read("components/mandala-free-video-studio.tsx");
  assert.match(css,/\.selectedPhrase\{/);
  assert.match(css,/\.selectedPhrase p\{/);
  assert.ok(parent.includes("approvalPending={phrasePending}"));
  assert.ok(parent.includes("onAttach={attachGeneratedAffirmationAudio}"));
  assert.ok(parent.includes("data-video-voice-approval-required"));
});

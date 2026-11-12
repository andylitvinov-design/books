import assert from "node:assert/strict";
import "./public-voice-sample-cache.test.mjs";
import test from "node:test";
import {readFileSync} from "node:fs";
import {affirmationNarrationText} from "../lib/mandala/affirmation-voice.mjs";
import {VOICE_STUDIO_VOICES,VOICE_STUDIO_SAMPLE,validateStudioRequest,buildStudioPayload} from "../lib/mandala/voice-studio.mjs";

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

test("six real sample buttons remain usable, with bounded cancellation and iPhone tap replay",()=>{
  const ui=read("components/mandala-affirmation-voice.tsx");
  assert.match(ui,/timer=setTimeout\(\(\)=>\{timedOut=true;controller\.abort\(\);\},27000\)/,
    "a slow provider must not trap all voice previews in Loading forever");
  assert.ok(ui.includes("if(sampleBusyId===id)"),"tapping active Loading cancels it");
  assert.ok(ui.includes("if(!sampleBusyId && sampleVoiceId===id && sampleUrl && sampleAudioRef.current)"),
    "replay must re-use a real cached WAV");
  assert.ok(ui.includes("await player.play()"),"iPhone replay must be invoked during a real tap");
  assert.ok(ui.includes("disabled={busy||disabled||!languageAvailable}"),
    "other sample buttons must remain usable during one network request");
  assert.ok(ui.includes("if(timer!==null)clearTimeout(timer)"),
    "no orphan timeout after network success/failure");
  assert.ok(ui.includes('sampleBusyId?t.sampleBusyHelp:sampleMessage'),
    "spinner must explain progress and cancellation");
  assert.ok(ui.includes('onCanPlay={sampleCanPlay} onError={samplePlaybackError}'),
    "native audio decode failures must invoke the self-healing error handler");
  assert.ok(ui.includes('setSampleMessage(t.sampleAudioError)') &&
    ui.includes('deletePublicVoiceSample(storageKey)'),
    "failed audio must show an error and evict that exact cached voice");
  for(const language of ["ru","en","es"]){
    const txt=VOICE_STUDIO_SAMPLE[language];
    assert.ok(txt.length>=35&&txt.length<=85,"short public sample in "+language);
    const checked=validateStudioRequest({mode:"sample",voiceId:"sofia",language});
    assert.equal(checked.text,txt);
    assert.equal(checked.consent,false);
  }
});

test("guest can explicitly hear a labeled device-voice text example without burning free Gemini quota",()=>{
  const ui=read("components/mandala-affirmation-voice.tsx");
  assert.ok(ui.includes("function previewDeviceSample()"));
  assert.ok(ui.includes("new SpeechSynthesisUtterance(VOICE_STUDIO_SAMPLE[language])"),
    "device preview must narrate ONLY the fixed public sample, not client or medical text");
  assert.ok(ui.includes("data-video-affirmation-device-voice"));
  assert.ok(ui.includes("window.speechSynthesis.speak(utterance)"));
  assert.ok(ui.includes("deviceSpeechAvailable"),"unsupported Safari must not show an inert fallback");
  assert.ok(ui.includes("deviceUtteranceRef.current"),"old speech must stop on mode/voice change");
  assert.ok(ui.includes("НЕ выбранный голос Софии, Майи или Алисы"),
    "Russian disclosure must not misrepresent a device voice as the Gemini preset");
  assert.ok(ui.includes("NOT the selected Sofia, Maya or Alisa"),
    "English device fallback must be explicitly distinct from exact premium voices");
  assert.ok(ui.includes("NO la voz seleccionada"),
    "Spanish device fallback must identify its actual audio provenance");
  assert.ok(!ui.includes("body:JSON.stringify({mode:\"device_sample\""),
    "device-only narration may not invoke a cloud provider");
  const css=read("components/mandala-affirmation-voice.module.css");
  assert.ok(css.includes(".deviceSampleButton{"));
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
  assert.ok(ui.includes("approvalPending?t.pendingText:speechText||t.enable"),"summary must match the actual selected transcript, including all-mode");
  assert.ok(ui.includes("data-video-affirmation-phrase"));
  assert.ok(ui.includes("data-video-affirmation-selected-voice"));
  assert.ok(ui.includes("data-video-generate-affirmation-audio"));
  assert.ok(ui.includes("data-video-affimations-audio-ready"));
  assert.ok(ui.includes("ref={generatedAudioRef} controls"));
  assert.ok(ui.includes("generatedAudioRef.current?.play().catch"),
    "try playing the real generated WAV; keep visible native controls on Safari");
  assert.match(ui,/onAttach\(\{file,(?:speechFile,)?spokenText:speechText,voiceId,language/,
    "the SAME voice and phrases must reach the final movie, with its optional isolated speech source");
  assert.ok(ui.includes("approvalPending||busy||!speechText||!consent"));
  assert.ok(ui.includes("if(textChanged)setConsent(false)"));
  for(const label of ["Бесплатно озвучить фразу","Narrate phrase for free","Narrar frase gratis"])
    assert.ok(ui.includes(label),label);
});

test("guest selected phrases cannot invoke a paid backup even if enabled for a signed-in custom session",()=>{
  const route=read("app/api/holistic-support/voice/route.js");
  assert.ok(route.includes("publicAffirmationsEnabled:publicFree"));
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

test("actual voice route never calls paid fallback for guest modes after free provider failure",async()=>{
  const {runInNewContext}=await import("node:vm");
  const ts=(await import("typescript")).default;
  const voice=await import("../lib/mandala/voice-studio.mjs");
  const calls=[],rates=[];
  class AppError extends Error{constructor(code,status){super(code);this.code=code;this.status=status;}}
  class FakeResponse{constructor(body,options={}){this.body=body;this.status=options.status||200;this.headers=options.headers||{};}
    static json(body,options){return new FakeResponse(body,options);}}
  const modules={
    "next/server":{NextResponse:FakeResponse},
    "@/lib/assessments/contracts":{AppError},
    "@/lib/app/config":{getAppConfig:()=>({}),requireSameOrigin:()=>calls.push("origin")},
    "@/lib/app/session":{createRequestAuth:()=>({verified:async()=>({id:"synthetic"}),apply:x=>x})},
    "@/lib/app/database":{consumeRate:async(_config,rule)=>rates.push(rule.op)},
    "@/lib/app/http":{readBody:async request=>request.syntheticBody,PRIVATE_HEADERS:{},safeError:e=>({code:e.code||"ERROR",status:e.status||500})},
    "@/lib/mandala/voice-studio.mjs":voice,
    "@/lib/mandala/voice-studio-provider.mjs":{requestStudioAudio:async()=>{calls.push("free");throw new AppError("FREE_UNAVAILABLE",503);}},
    "@/lib/mandala/voice-studio-openrouter-provider.mjs":{requestOpenRouterStudioAudio:async()=>{calls.push("paid");return new Uint8Array([1,2,3]);}},
  };
  const compiled=ts.transpileModule(read("app/api/holistic-support/voice/route.js"),{fileName:"route.js",compilerOptions:{allowJs:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  const env={HH_VOICE_STUDIO_ENABLED:"true",HH_VOICE_STUDIO_FREE_TIER_CONFIRMED:"true",HH_VOICE_STUDIO_GEMINI_API_KEY:"synthetic-only",HH_VOICE_STUDIO_OPENROUTER_ENABLED:"true",HH_VOICE_STUDIO_PAID_BACKUP_APPROVED:"true",HH_VOICE_STUDIO_OPENROUTER_API_KEY:"synthetic-only"};
  runInNewContext(compiled,{exports,process:{env},AbortSignal,Uint8Array,require:name=>{assert.ok(Object.hasOwn(modules,name),name);return modules[name];}});
  for(const mode of ["sample","affirmations","short_text"]){
    calls.length=0;rates.length=0;
    const body=mode==="sample"?{mode,voiceId:"maya",language:"en"}:
      {mode,voiceId:"maya",language:"en",text:"A safe synthetic phrase",consent:true};
    const response=await exports.POST({syntheticBody:body,headers:new Headers()});
    assert.equal(response.status,503,mode);
    assert.ok(calls.includes("origin")&&calls.includes("free"),mode);
    assert.ok(!calls.includes("paid"),mode+" must not reach the paid provider");
    assert.ok(!rates.includes("voice-studio-openrouter-paid-day"),mode+" must not consume paid quota");
  }
  calls.length=0;rates.length=0;
  const custom=await exports.POST({syntheticBody:{mode:"custom",voiceId:"maya",language:"en",text:"Synthetic operator text",consent:true},headers:new Headers()});
  assert.equal(custom.status,200);
  assert.ok(calls.includes("paid"),"the explicitly authenticated optional custom path remains intact");
  assert.ok(rates.includes("voice-studio-openrouter-paid-day"));
});

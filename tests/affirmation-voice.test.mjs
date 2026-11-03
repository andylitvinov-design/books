import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {affirmationNarrationText,affirmationNarrationForSelection,isApprovedAffirmationNarration,wavDurationFromHeader} from "../lib/mandala/affirmation-voice.mjs";
import {validateStudioRequest,buildStudioPayload,VOICE_STUDIO_VOICES,voiceStudioProviders} from "../lib/mandala/voice-studio.mjs";
import {fixedLivePhraseRequest,verifyLiveSelectedPhrase,verifyLiveVoiceBytes} from "../scripts/verify-live-selected-voice-phrase.mjs";

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
  const deepPane=page.indexOf('const deepHypnoPane =');
  const voiceCard=page.indexOf('data-hypno-voice');
  assert.ok(deepPane>0 && voiceCard>deepPane && voice>voiceCard && section>voice && next>section && hidden>next,
    "single consented voice lives inside the rendered Phrases editor after the phrase list");
  assert.match(page.slice(section,next),/\{deepHypnoPane\}/,
    "the visible Phrases tab mounts the only shared editor");
  assert.equal((page.match(/<MandalaAffirmationVoice locale/g)||[]).length,1,
    "do not duplicate the voice editor or API requests");
  assert.match(page.slice(voiceCard,section),/data-video-narration-stale/,
    "the warning for stale narration stays inside the visible numbered voice card");
  const browser=read("scripts/verify-affirmation-voice-browser.mjs");
  assert.match(browser,/data-video-quick-control="phrases"/);
  const compact=read("components/mandala-hypno-compact.tsx");
  assert.match(compact,/data-hypno-ready/);
  assert.match(compact,/data-hypno-phrase=\{i\}/);
  assert.match(browser,/data-hypno-ready/);
  assert.match(browser,/data-hypno-phrase="0"/);
  assert.match(browser,/data-hypno-phrase="4"/);
  assert.doesNotMatch(browser,/data-video-quick-affirmation="/, "the removed quick-affirmation UI must not drive voice acceptance");
  assert.match(browser,/data-video-quick-control="video"/);
  assert.doesNotMatch(browser,/advanced\.locator\(":scope > summary"\)\.click/,
    "do not test inaccessible old controls");
});

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

test("one approved phrase is free narration default; all-phrases stays explicit",()=>{
  const phrases=["Я спокоен","Я выбираю жизнь","Я могу действовать"];
  assert.equal(affirmationNarrationForSelection(phrases,0),"Я спокоен.");
  assert.equal(affirmationNarrationForSelection(phrases,1),"Я выбираю жизнь.");
  assert.equal(affirmationNarrationForSelection(phrases,2),"Я могу действовать.");
  assert.equal(affirmationNarrationForSelection(phrases,"all"),
    "Я спокоен. Я выбираю жизнь. Я могу действовать.");
  for(const bad of [-1,3,"1",null,undefined,1.5]) {
    if(bad===undefined)continue; // default intentionally selects first phrase
    assert.equal(affirmationNarrationForSelection(phrases,bad),"");
  }
  assert.equal(isApprovedAffirmationNarration(phrases,"Я выбираю жизнь."),true);
  assert.equal(isApprovedAffirmationNarration(phrases,"Я выбираю жизнь.",false),false);
  assert.equal(isApprovedAffirmationNarration(["Я спокоен"],"Я выбираю жизнь."),false);
  assert.equal(isApprovedAffirmationNarration(phrases,"Чужая фраза."),false);
  assert.equal(affirmationNarrationForSelection(["<script>"],0),"");
});

test("all six selected Gemini voices synthesize precisely the selected phrase, no paid provider",()=>{
  const expected={mark:"Enceladus",alexander:"Charon",leon:"Puck",sofia:"Gacrux",maya:"Sulafat",alisa:"Zephyr"};
  assert.equal(VOICE_STUDIO_VOICES.length,6);
  assert.equal(new Set(VOICE_STUDIO_VOICES.map(v=>v.provider)).size,6);
  for(const voice of VOICE_STUDIO_VOICES){
    const text=affirmationNarrationForSelection(["Я могу отдыхать.","Я выбираю спокойствие."],1);
    const validated=validateStudioRequest({mode:"affirmations",voiceId:voice.id,language:"ru",text,consent:true});
    const payload=buildStudioPayload(validated);
    assert.equal(payload.input[0].content[0].text,"Я выбираю спокойствие.");
    assert.deepEqual(payload.generation_config.speech_config,[{voice:expected[voice.id]}]);
    assert.equal(payload.response_format.type,"audio");
    assert.throws(()=>validateStudioRequest({mode:"affirmations",voiceId:voice.id,language:"ru",text,consent:false}));
  }
  assert.deepEqual(voiceStudioProviders({
    HH_VOICE_STUDIO_ENABLED:"true",
    HH_VOICE_STUDIO_FREE_TIER_CONFIRMED:"true",
    HH_VOICE_STUDIO_GEMINI_API_KEY:"synthetic-free-gemini-key-not-real",
  }),{gemini:true,openrouterFree:false,openrouter:false});
});

test("mobile one-phrase selection uses approved lines only, revokes consent and stale audio",()=>{
  const ui=read("components/mandala-affirmation-voice.tsx");
  const parent=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-affirmation-voice.module.css");
  assert.ok(ui.includes('data-video-affirmation-phrase'));
  assert.ok(ui.includes('affirmationNarrationForSelection(lines,phraseChoice==="all"?"all":selectedIndex??0)'));
  assert.ok(ui.includes('setConsent(false)'));
  assert.ok(ui.includes('if(voiceDataRef.current)onInvalidateRef.current?.()'));
  assert.ok(ui.includes('body:JSON.stringify({mode:"affirmations",voiceId,language,text:speechText,consent:true})'));
  assert.match(ui,/data-video-affimations-audio-ready/);
  assert.match(parent,/isApprovedAffirmationNarration\(affirmationLines,attachedAudio\.spokenText,affirmations\.enabled\)/);
  assert.match(css,/\.phrasePick select\{/);
  assert.doesNotMatch(ui,/autoPlay/);
});

test("one real-network acceptance request is strictly fixed to approved phrase and free Leon",async()=>{
  const expected={mode:"affirmations",voiceId:"leon",language:"ru",text:"Я выбираю спокойствие.",consent:true};
  assert.deepEqual(fixedLivePhraseRequest(),expected);
  const requests=[];
  const wavRate=24000,frames=24000;
  const wav=Buffer.alloc(44+frames*2);
  wav.write("RIFF",0);wav.writeUInt32LE(wav.length-8,4);
  wav.write("WAVEfmt ",8);wav.writeUInt32LE(16,16);
  wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
  wav.writeUInt32LE(wavRate,24);wav.writeUInt32LE(wavRate*2,28);
  wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);
  wav.write("data",36);wav.writeUInt32LE(frames*2,40);
  for(let i=0;i<frames;i++)wav.writeInt16LE(Math.round(11000*Math.sin(2*Math.PI*220*i/wavRate)),44+i*2);
  const fetchImpl=async (url,opts)=>{
    requests.push({url,opts});
    if(opts.method==="GET")return new Response(JSON.stringify({
      enabled:true,providers:{gemini:true,openrouterFree:true,openrouter:false},languages:["en","ru","es"],
    }),{status:200,headers:{"content-type":"application/json"}});
    return new Response(wav,{status:200,headers:{"content-type":"audio/wav","cache-control":"private, no-store","x-hh-voice-provider":"gemini"}});
  };
  const evidence=await verifyLiveSelectedPhrase({fetchImpl});
  assert.equal(evidence.voiceId,"leon");
  assert.equal(evidence.provider,"gemini");
  assert.ok(evidence.rms>0.002);
  assert.equal(requests.length,2,"one actual phrase request, not six paid retries");
  assert.deepEqual(JSON.parse(requests[1].opts.body),expected);
  assert.equal(requests[1].opts.headers.Origin,"https://holistichouse.vercel.app");
  assert.equal("Authorization" in requests[1].opts.headers,false);
  const silent=Buffer.from(wav);silent.fill(0,44);
  assert.throws(()=>verifyLiveVoiceBytes(silent.buffer.slice(silent.byteOffset,silent.byteOffset+silent.byteLength)),/SILENT/);
  await assert.rejects(verifyLiveSelectedPhrase({fetchImpl:async(url,opts)=>
    opts.method==="GET"?new Response(JSON.stringify({enabled:false}),{status:200}):new Response(wav)}),
    /FREE_PROVIDER_NOT_READY/);
});

test("anonymous selected phrase can never hit paid backup even if operator custom mode has it",()=>{
  const route=read("app/api/holistic-support/voice/route.js");
  const voice=read("components/mandala-affirmation-voice.tsx");
  assert.match(route,/if\(!wav && backupKey && validated\.mode==='custom'\)/,
    "only authenticated custom mode can ever consider the approved paid fallback");
  assert.match(route,/const publicFree=providers\.gemini\|\|providers\.openrouterFree/);
  assert.match(route,/publicAffirmationsEnabled:publicFree/);
  assert.match(route,/const languages=providers\.gemini\?/);
  assert.doesNotMatch(voice,/xAI \(operator-funded backup\)|xAI \(respaldo/);
  assert.ok(voice.includes('mode:"affirmations",voiceId,language,text:speechText,consent:true'));
});

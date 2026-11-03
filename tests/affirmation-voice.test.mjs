import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {affirmationNarrationText,wavDurationFromHeader} from "../lib/mandala/affirmation-voice.mjs";
import {validateStudioRequest,buildStudioPayload} from "../lib/mandala/voice-studio.mjs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const source=read("scripts/verify-affirmation-voice-browser.mjs");

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
  const voiceEditor=read("components/mandala-affirmation-voice.tsx");
  assert.match(voiceEditor,/const speechFile=new File\(\[clip\.blob\]/,
    "keep the isolated generated narration separate from its mixed music WAV");
  assert.match(voiceEditor,/onAttach\(\{file,speechFile,/);
  assert.match(page,/setAttachedAudio\(\{kind:"file",file:entry\.file,id:entry\.url,narration:true/);
  assert.match(page,/narrationInvalid/);
  assert.match(page,/narrationDurationMismatch[\s\S]*Math\.abs\(\(attachedAudio\.mixSeconds\?\?0\)-duration\)>0\.35/,
    "sub-frame WAV duration rounding is not misclassified as stale narration");
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
  assert.match(page.slice(voiceEditor,deepPane),/data-hypno-voice[\s\S]*data-video-narration-stale/);
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


test("voice browser opens the compact studio advanced audio controls before using them",()=>{
  assert.match(source,/data-video-advanced-toggle/);
  assert.match(source,/advancedToggle\.click\(\)[\s\S]*?musicSettings\.waitFor\(\{state:"visible"/);
});

test("voice browser selects the visible montage workspace before recording",()=>{
  assert.match(source,/phase\(engine,"offline-remix-ready"\)[\s\S]*?data-video-quick-control="editor"[\s\S]*?expect\(generate\)\.toBeVisible/);
});

test("affirmation attachment acceptance verifies the visible live movie soundtrack",()=>{
  const phrase=source.indexOf('[data-video-quick-control="phrases"]');
  const generate=source.indexOf('await page.locator("[data-video-generate-affirmation-audio]").click()',phrase);
  const expected=source.indexOf('const expectedFileName="holistic-house-affirmations-"+locale+"-maya.wav"',generate);
  const visible=source.indexOf('await expect(page.locator("[data-video-live-audio]")).toContainText(expectedFileName)',expected);
  const remix=source.indexOf('phase(engine,"offline-remix-ready")',visible);
  const render=source.indexOf('[data-video-quick-control="video"]',remix);
  assert.ok(phrase>=0&&generate>phrase&&expected>generate&&visible>expected&&remix>visible&&render>remix,
    "inspect the visible attached audio in the canonical video stage, then record the remixed movie");
  assert.doesNotMatch(source,/\.textContent\(/,"hidden DOM text is not visible UI evidence");
});

test("voice release encodes audible video in both Chromium and WebKit, never preview-only",()=>{
  assert.match(source,/if\(engine==="chromium"\|\|engine==="webkit"\)/);
  assert.match(source,/await output\.waitFor\(\{state:"visible",timeout:45000\}\)/);
  assert.match(source,/const audioTrack=streams\.find\(row=>row\.codec_type==="audio"\)/);
  assert.match(source,/assert\.ok\(audioTrack/);
  assert.match(source,/Number\(audioTrack\.channels\),2/);
  assert.match(source,/pcm\.stdout\.some\(value=>value!==0\)/);
});

test("disclosure acceptance retains provider privacy, real exported audio and stale narration gates",()=>{
  for(const assertion of [
    'assert.equal(affirmationRequests.length,1)',
    'assert.equal(affirmationRequests[0].text,transcript)',
    'assert.equal(affirmationRequests[0].consent,true)',
    'tracks.includes("video")',
    'const audioTrack=streams.find(row=>row.codec_type==="audio")',
    'assert.ok(audioTrack',
    'Number(audioTrack.channels),2',
    'pcm.stdout.some(value=>value!==0)',
    '[data-video-narration-stale]',
    'assert.equal(await page.locator("[data-video-quick-generate]").isDisabled(),true)',
  ])assert.ok(source.includes(assertion),assertion);
});

test("cross-platform voice export acceptance is real Chromium/Linux plus WebKit/macOS",()=>{
  const workflow=readFileSync(new URL("../.github/workflows/holistic-support-mandala.yml",import.meta.url),"utf8");
  assert.match(source,/HH_VOICE_E2E_ENGINE/);
  assert.match(workflow,/HH_VOICE_E2E_ENGINE=chromium node scripts\/verify-affirmation-voice-browser\.mjs/);
  assert.match(workflow,/voice-webkit-macos:/);
  assert.match(workflow,/runs-on: macos-15/);
  assert.match(workflow,/HH_VOICE_E2E_ENGINE: webkit/);
  assert.match(workflow,/node scripts\/verify-affirmation-voice-browser\.mjs/);
  assert.doesNotMatch(workflow,/voice-webkit-macos:[\s\S]*continue-on-error:\s*true/);
});

test("stalled WebKit recorder diagnostics cannot conceal a real export failure",()=>{
  assert.match(source,/phase\(engine,"waiting-for-export"\)/);
  assert.match(source,/phase\(engine,"download-control-timed-out"\)/);
  assert.match(source,/withDeadline\(page\.evaluate\(/);
  assert.match(source,/4000,engine\+" media-state evaluation"/);
  assert.match(source,/withDeadline\(context\.close\(\),10000/);
  assert.match(source,/withDeadline\(browser\.close\(\),10000/);
  assert.match(source,/await output\.waitFor\(\{state:"visible",timeout:45000\}\)/);
  assert.match(source,/const audioTrack=streams\.find\(row=>row\.codec_type==="audio"\)/);
  assert.match(source,/assert\.ok\(audioTrack/);
  assert.match(source,/Number\(audioTrack\.channels\),2/);
  assert.match(source,/pcm\.stdout\.some\(value=>value!==0\)/);
});

test("WebKit macOS media acceptance is headed, real encoded audio and never a mock download",()=>{
  const workflow=readFileSync(new URL("../.github/workflows/holistic-support-mandala.yml",import.meta.url),"utf8");
  assert.ok(workflow.includes("HH_VOICE_E2E_HEADED: '1'"));
  assert.ok(workflow.includes("HH_VOICE_E2E_ENGINE: webkit"));
  assert.ok(source.includes('const headedWebKit=requestedEngine==="webkit" && process.env.HH_VOICE_E2E_HEADED==="1"'));
  assert.ok(source.includes('browserType.launch({headless:!(engine==="webkit" && headedWebKit)})'));
  assert.ok(source.includes('assert.equal(process.platform,"darwin"'));
  assert.ok(source.includes('await output.waitFor({state:"visible",timeout:45000})'));
  for(const requirement of ['tracks.includes("video")','const audioTrack=streams.find(row=>row.codec_type==="audio")',
    'assert.ok(audioTrack',
    'Number(audioTrack.channels),2','pcm.stdout.some(value=>value!==0)']) assert.ok(source.includes(requirement));
});

test("post-edit consent reset is checked after entering custom narration text",()=>{
  const panel=source.indexOf('const voicePanel=page.locator("[data-video-voice-studio]")');
  const studio=source.indexOf('const studio=voicePanel.locator("[data-voice-studio]")',panel);
  const custom=source.indexOf('await studio.getByRole("button",{name:locale==="ru"?"Мой текст":"My own script",exact:true}).click()',studio);
  const fill=source.indexOf('await studio.locator("textarea").fill(customText)',custom);
  const consent=source.indexOf('studio.locator(\'input[type="checkbox"]\')',fill);
  const unchecked=source.indexOf('await expect(studioConsent).not.toBeChecked({timeout:10000})',consent);
  const disabled=source.indexOf('await expect(studio.locator("[data-voice-studio-generate]")).toBeDisabled()',unchecked);
  const grant=source.indexOf('await studioConsent.check()',disabled);
  assert.ok(panel>=0&&studio>panel&&custom>studio&&fill>custom&&consent>fill&&unchecked>consent&&disabled>unchecked&&grant>disabled,
    "enter custom text, prove consent starts unchecked and generation is disabled, then explicitly grant consent");
});

test("real WebKit export enables inline Hypno whisper and binaural controls before stereo movie recording",()=>{
  assert.match(source,/data-video-quick-control=\"effects\"/);
  assert.match(source,/data-hypno-group=\"audio\"/);
  assert.match(source,/data-hypno-speech-settings/);
  assert.match(source,/audioGroup\.getByRole\(\"switch\",\{name:whisperName,exact:true\}\)/);
  assert.match(source,/audioGroup\.getByRole\(\"switch\",\{name:binauralName,exact:true\}\)/);
  assert.match(source,/hypno-audio-effects-rendered/);
  assert.match(source,/stream=codec_type,channels/);
  assert.match(source,/Number\(audioTrack\.channels\),2/);
});

import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {affirmationNarrationText,affirmationNarrationForSelection,isApprovedAffirmationNarration,wavDurationFromHeader} from "../lib/mandala/affirmation-voice.mjs";
import {validateStudioRequest,buildStudioPayload,VOICE_STUDIO_VOICES,voiceStudioProviders} from "../lib/mandala/voice-studio.mjs";
import {fixedLivePhraseRequest,verifyLiveSelectedPhrase,verifyLiveVoiceBytes} from "../scripts/verify-live-selected-voice-phrase.mjs";

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
  assert.match(page,/const narrationPhraseMismatch=attachedAudio\?\.kind==="file"&&attachedAudio\.narration&&[\s\S]*!isApprovedAffirmationNarration\(affirmationLines,attachedAudio\.spokenText,affirmations\.enabled\)/,
    "removing an actually spoken phrase invalidates its WAV immediately, even during pending edits");
  assert.match(page,/narrationPhraseMismatch \|\| \(!phrasePending&&/,
    "only unrelated duration and voice-setting changes wait for phrase approval");
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
  const previewAt=editor.indexOf('data-video-affirmation-voice-preview={v.id}');
  assert.ok(previewAt>=0,"six genuine preview controls exist");
  const previewHandler=editor.slice(previewAt,previewAt+520);
  assert.match(previewHandler,/if\(voiceId!==v\.id\)\{setVoiceId\(v\.id\);setConsent\(false\);\}/,
    "Preview must also select that voice and revoke older narration consent");

  assert.doesNotMatch(editor,/autoPlay/);
  assert.ok(editor.includes("if(textChanged)setConsent(false)"),
    "newly approved phrase text must require new consent before external narration");
  const ownSample=editor.slice(editor.indexOf('async function previewSample('),
    editor.indexOf('async function createAudio()'));
  assert.doesNotMatch(ownSample,/speechText|consent:true|onAttach\(/,
    "sample must never transmit private phrases or replace the video narration");
});


test("voice browser opens Ideas and applies six visible Montage styles with decoded playback",()=>{
 const start=source.indexOf("async function verifyWorkspaceHydration");
 const end=source.indexOf("// Real guest route browser acceptance",start);
 const flow=source.slice(start,end);
 const click=flow.indexOf("await continueToIdeas.click()");
 const ideas=flow.indexOf('data-active-workspace","phrases"',click);
 const refinement=flow.indexOf('const refinement=page.locator',ideas);
 const tap=flow.indexOf('await refinement.locator(":scope > summary").click()',refinement);
 const open=flow.indexOf('await expect(refinement).toHaveAttribute("open","")',tap);
 const topic=flow.indexOf('data-auto-video-topic-panel',open);
 const montage=flow.indexOf('await montage.tap()',topic);
 const style=flow.indexOf('const styles=page.locator("[data-video-montage-style]")',montage);
 const six=flow.indexOf('await expect(styles).toHaveCount(6)',style);
 const selected=flow.indexOf('await minimal.tap()',six);
 const reflected=flow.indexOf('data-video-preview-style","minimal"',selected);
 const decoded=flow.indexOf('video.readyState>=2&&video.videoWidth>0',reflected);
 assert.ok(start>=0&&end>start&&click>=0&&ideas>click&&refinement>ideas&&tap>refinement&&open>tap&&topic>open&&montage>topic&&style>montage&&six>style&&selected>six&&reflected>selected&&decoded>reflected,
   "real visitor must open Ideas refinement, select one of six visible Montage styles and decode an MP4");
 assert.match(flow,/await expect\(allStories\)\.toBeHidden\(\)/);
 assert.doesNotMatch(flow,/await allStories\.click\(\)|\.click\(\{force:true\}\)/);
 assert.match(source,/voiceOptions\.locator\(":scope > summary"\)\.tap\(\)[\s\S]*?data-video-affirmation-bed/);
 assert.match(source,/else await voiceOptions\.locator\(":scope > summary"\)\.click\(\)/);
});

test("WebKit selects a real male narration voice with native touch before consented export",()=>{
  const start=source.indexOf("const transcript=expectedSpeech;");
  const end=source.indexOf("const voiceOptions=",start);
  const stage=source.slice(start,end);
  assert.ok(start>=0&&end>start,"inspect the post-own-voice narration selection, not earlier sample");
  assert.match(stage,/if\(engine==="webkit"\)await maleTab\.tap\(\)/);
  assert.match(stage,/await expect\(maleTab\)\.toHaveAttribute\("aria-pressed","true"/);
  assert.match(stage,/data-video-affirmation-voice-card="leon"/);
  assert.match(stage,/\.toBeVisible\(\{timeout:15000\}\)/);
  assert.match(stage,/if\(engine==="webkit"\)await leon\.tap\(\)/);
  assert.match(stage,/await expect\(leon\)\.toHaveAttribute\("aria-pressed","true"\)/);
  assert.match(stage,/VOICE_MALE_SELECTION_NOT_COMMITTED/);
  assert.doesNotMatch(stage,/force:\s*true|node\.click\(\)/);
});

test("voice browser selects the visible montage workspace before recording",()=>{
  assert.match(source,/phase\(engine,"offline-remix-ready"\)[\s\S]*?data-video-quick-control="editor"[\s\S]*?expect\(generate\)\.toBeVisible/);
});

test("affirmation attachment acceptance verifies the visible live movie soundtrack",()=>{
  const phrase=source.indexOf('[data-video-quick-control="phrases"]');
  const generate=source.indexOf('const generateNarration=page.locator(',phrase);
  const webkitTap=source.indexOf('await generateNarration.tap()',generate);
  const chromiumClick=source.indexOf('await generateNarration.click()',webkitTap);
  assert.ok(generate>phrase&&webkitTap>generate&&chromiumClick>webkitTap,
    "real WebKit tap and Chromium click require consented narration");
  const expected=source.indexOf('const expectedFileName="holistic-house-affirmations-"+locale+"-leon.wav"',generate);
  const visible=source.indexOf('await expect(page.locator("[data-video-live-audio]")).toContainText(expectedFileName)',expected);
  const remix=source.indexOf('phase(engine,"offline-remix-ready")',visible);
  const render=source.indexOf('[data-video-quick-control="video"]',remix);
  assert.ok(phrase>=0&&generate>phrase&&expected>generate&&visible>expected&&remix>visible&&render>remix,
    "inspect the visible attached audio in the canonical video stage, then record the remixed movie");
  assert.doesNotMatch(source.slice(generate,remix),/\.textContent\(/,"attachment evidence must use the visible UI");
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
    'await expect(page.locator("[data-video-quick-generate]")).toBeDisabled()',
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
  assert.ok(ui.includes('onInvalidateRef.current?.();'));
  const speechChangeEffect=ui.slice(
    ui.indexOf('    const textChanged=previous.speechText!==speechText;'),
    ui.indexOf('  },[speechText,voiceId,language,busy,mixing,locale]);'));
  assert.match(speechChangeEffect,/onInvalidateRef\.current\?\.\(\);/,
    "changing the spoken phrase must detach its previous WAV even after the voice panel remounts");
  assert.doesNotMatch(speechChangeEffect,/if\(voiceDataRef\.current\)/,
    "parent-attached WAV invalidation cannot depend on a child-local Blob ref");
  assert.match(ui,/useLayoutEffect\(\(\)=>\{/,"detach stale audio before the next paint");
  assert.match(ui,/previous\.speechText===speechText && previous\.voiceId===voiceId/,
    "identical approved input must never abort valid narration");
  assert.doesNotMatch(speechChangeEffect,/voiceDataRef\.current&&!textChanged/,
    "do not leave the removed spoken line attached merely because its text changed");
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

test("hypno remix keeps the actual consented spoken phrase and refuses stale source",()=>{
  const parent=read("components/mandala-free-video-studio.tsx");
  assert.match(parent,/setHypnoSpeechText\(clip\.source==="local"\?"":clip\.spokenText\)/);
  assert.match(parent,/isApprovedAffirmationNarration\(affirmationLines,hypnoSpeechText,affirmations\.enabled\)/);
  assert.match(parent,/spokenText:effectSpokenText/);
  assert.match(parent,/spokenText:hypnoSpeechText/);
  assert.doesNotMatch(parent,/spokenText:currentAffirmationSpeech/);
});

test("post-effect browser acceptance checks the actual mixed WAV after an unrelated phrase edit",()=>{
  const afterEffect=source.slice(source.indexOf('phase(engine,"hypno-audio-effects-rendered")'));
  assert.match(afterEffect,/data-video-live-audio[^\n]*toContainText\("holistic-house-hypno-audio\.wav"\)/);
});

test("browser stale-audio check removes the spoken phrase through the visible Montage Text selection",()=>{
  assert.match(source,/const spokenPhrase=phraseRows\.filter\(\{hasText:approved\}\)/);
  assert.match(source,/const spokenToggle=spokenPhrase\.locator\('\[data-video-idea-select\]'\)/);
  assert.match(source,/await spokenToggle\.click\(\)/);
  assert.match(source,/data-video-narration-reapproval/);
  assert.match(source,/data-video-quick-generate/);
  assert.match(source,/the old WAV may remain attached, but must be unusable until narration is regenerated/);
});

test('dedicated Voice workspace keeps explicit consent opt-in and separate from Montage',()=>{
  const voice=read("components/mandala-affirmation-voice.tsx");
  assert.match(voice,/const \[consent,setConsent\]=useState\(false\)/);
  assert.match(voice,/data-video-affirmation-voice-consent type="checkbox" checked=\{consent\}/);
  assert.match(source,/data-video-narration-reapproval/);
  assert.match(source,/await expect\(page\.locator\('\[data-video-quick-generate\]'\)\)\.toBeDisabled/);
});

test('stale narration safety remains checked after the phrase warning unmounts',()=>{
  const start=source.indexOf('the old WAV may remain attached, but must be unusable until narration is regenerated');
  const after=source.slice(start,source.indexOf('const voicePanel=',start));
  assert.match(after,/const stillHasOldVoice=/);
  assert.match(after,/stillHasOldVoice[\s\S]*?toBeDisabled\(\)/);
  assert.match(after,/holistic-house-hypno-audio\.wav/);
  assert.match(after,/expectedFileName/);
});

test("real WebKit selects Settings duration, then Audio and real voice before rendering",()=>{
 const browser=read("scripts/verify-affirmation-voice-browser.mjs");
 const studio=read("components/mandala-free-video-studio.tsx");
 const entry=browser.indexOf("const editorTab=page.locator");
 const settings=browser.indexOf("await openMontageSettingsViaQuality(page);",entry);
 const duration=browser.indexOf("const durationSelect=page.locator",settings);
 const audio=browser.indexOf("const montageAudio=page.locator",duration);
 const click=browser.indexOf("await montageAudio.click()",audio);
 const selected=browser.indexOf("await expect(page.locator('[data-video-montage-audio]')).toBeVisible()",click);
 assert.ok(entry>=0&&settings>entry&&duration>settings&&audio>duration&&click>audio&&selected>click,
   "actual visitor must set duration in Settings then open Audio");
 assert.ok(studio.includes("data-video-montage-tab={item.id}"));
 assert.ok(studio.includes('montagePanel==="audio" ?'));
 assert.ok(browser.includes('data-video-voice-studio'));
 assert.ok(browser.includes('data-video-quick-generate'));
});

test("post-export stale narration refusal reopens mounted Audio and consented Voice",()=>{
 const start=source.indexOf('the old WAV may remain attached, but must be unusable until narration is regenerated');
 const audio=source.indexOf("const montageAudioAfterExport=page.locator",start);
 const tap=source.indexOf("await montageAudioAfterExport.click()",audio);
 const selected=source.indexOf("await expect(page.locator('[data-video-montage-audio]')).toBeVisible()",tap);
 const disabled=source.indexOf("const stillHasOldVoice=",selected);
 const voice=source.indexOf('const voicePanel=page.locator("[data-video-voice-studio]")',disabled);
 const expand=source.indexOf('await voicePanel.locator(":scope > summary").click()',voice);
 assert.ok(start>=0&&audio>start&&tap>audio&&selected>tap&&disabled>selected&&voice>disabled&&expand>voice,
   "stale WAV must be blocked before visitor can reopen consented Voice");
 assert.doesNotMatch(source.slice(audio,expand),/data-video-montage-settings|data-video-basic-tab/);
});

test("WebKit release follows fifth Montage advanced settings, Audio, and voice disclosure",()=>{
 assert.match(source,/async function openMontageSettingsViaQuality\(page\)/);
 assert.match(source,/data-video-montage-tab="promo"/);
 assert.match(source,/data-video-stories-advanced/);
 assert.match(source,/data-video-stories-settings/);
 assert.match(source,/await openMontageSettingsViaQuality\(page\)/);
 assert.match(source,/data-montage-panel","settings"/);
 assert.match(source,/const durationSelect=page\.locator\('\[data-video-montage-preference="duration"\]'\)/);
 assert.match(source,/await durationSelect\.selectOption\("10"\)/);
 assert.match(source,/await expect\(page\.locator\('\[data-video-montage-audio\]'\)\)\.toBeVisible\(\)/);
 assert.match(source,/const voicePanel=page\.locator\("\[data-video-voice-studio\]"\)/);
 assert.match(source,/voicePanel\.locator\(":scope > summary"\)\.click\(\)/);
 assert.doesNotMatch(source,/data-video-montage-settings|data-video-basic-tab=|data-video-audio-length="/);
});

test("one consented WebKit touch produces a real WAV and decoded MP4 without duplicate POST",()=>{
 const ui=read("components/mandala-affirmation-voice.tsx");
 assert.match(ui,/voiceRequestInFlight\.current=true/);
 assert.match(ui,/onTouchEnd=\{event=>\{/);
 assert.match(ui,/lastSubmitTouchAt\.current=Date\.now\(\)/);
 assert.match(ui,/onTouchMove=\{event=>/);
 assert.match(ui,/Math\.hypot\(finger\.clientX-start\.x,finger\.clientY-start\.y\)>14/);
 assert.match(ui,/if\(event\.detail!==0&&Date\.now\(\)-lastSubmitTouchAt\.current<950\)return/);
 assert.match(source,/hasTouch:engine==="webkit"/);
 assert.match(source,/if\(engine==="webkit"\)await generateNarration\.tap\(\)/);
 assert.match(source,/assert\.equal\(affirmationRequests\.length,1\)/);
 assert.match(source,/encoded-audio-verified/);
 assert.match(source,/data-video-affimations-audio-ready/);
});

test("consented narration handles a real WebKit pointer gesture exactly once",()=>{
  const source=readFileSync(new URL("../components/mandala-affirmation-voice.tsx",import.meta.url),"utf8");
  assert.match(source,/onPointerDown=\{event=>/);
  assert.match(source,/onPointerUp=\{event=>/);
  assert.match(source,/Math\.hypot\(event\.clientX-start\.x,event\.clientY-start\.y\)>14/);
  assert.match(source,/event\.detail!==0&&Date\.now\(\)-lastSubmitPointerAt\.current<750/);
  assert.match(source,/voiceRequestInFlight\.current=true/);
  assert.match(source,/!speechText\|\|!consent\|\|voiceRequestInFlight\.current/);
  assert.ok(source.includes('body:JSON.stringify({mode:"affirmations",voiceId,language,text:speechText,consent:true})'));
  assert.match(source,/voiceRequestInFlight\.current=false/);
  const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
  assert.match(browser,/window\.__hhVoiceSubmitProbe/);
  assert.match(browser,/await generateNarration\.click\(\)/);
  assert.match(browser,/await page\.locator\("\[data-video-affimations-audio-ready\]"\)\.waitFor/);
  assert.ok(!browser.includes("generateNarration.click({force:true})"));
});


test("headed WebKit narration uses a real short touch without duplicate provider requests",()=>{
  const client=readFileSync(new URL("../components/mandala-affirmation-voice.tsx",import.meta.url),"utf8");
  const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
  for(const marker of [
    "onTouchStart={event=>","onTouchMove={event=>","onTouchCancel={()=>{submitTouchStart.current=null;}",
    "onTouchEnd={event=>","event.changedTouches.length!==1",
    "Math.hypot(finger.clientX-start.x,finger.clientY-start.y)>14",
    "lastSubmitTouchAt.current=Date.now()",
    'event.pointerType==="touch"',
    "event.detail!==0&&Date.now()-lastSubmitTouchAt.current<950",
    "voiceRequestInFlight.current=true",
  ])assert.ok(client.includes(marker),"physical touch / one request contract: "+marker);
  assert.ok(browser.includes('hasTouch:engine==="webkit"'));
  assert.ok(browser.includes('if(engine==="webkit")await generateNarration.tap()'));
  assert.ok(browser.includes('else await generateNarration.click()'));
  assert.ok(browser.includes('window.__hhVoiceSubmitProbe.touches++'));
  assert.ok(browser.includes('assert.equal(affirmationRequests.length,1)'));
  assert.ok(browser.includes('pcm.stdout.some(value=>value!==0)'));
});

test("voice export uses visible Audio-stage Generate, never the hidden Style-stage CTA",()=>{
  const effects=source.indexOf('phase(engine,"hypno-audio-effects-rendered")');
  const audio=source.indexOf('const montageAudioTab=page.locator',effects);
  const click=source.indexOf('await montageAudioTab.click()',audio);
  const pressed=source.indexOf("await expect(page.locator('[data-video-montage-audio]')).toBeVisible()",click);
  const generate=source.indexOf('const generate=page.locator("[data-video-quick-generate]")',pressed);
  assert.ok(effects>=0&&audio>effects&&click>audio&&pressed>click&&generate>pressed,
    "video with consented narration must use a real visible Audio-tab export button");
  assert.doesNotMatch(source.slice(effects,generate),/click\(\{force:true\}\)/);
});

test("WebKit cached voice replay invokes one native play() per real tap, never a second TTS request",()=>{
  const voice=read("components/mandala-affirmation-voice.tsx");
  const browser=read("scripts/verify-affirmation-voice-browser.mjs");
  assert.ok(voice.includes('const lastAutoPlayedSampleUrlRef=useRef("")'));
  assert.match(voice,/lastAutoPlayedSampleUrlRef\.current=sampleUrl;\s*try\{player\.currentTime=0;await player\.play\(\)/);
  assert.match(voice,/if\(!sampleUrl\|\|lastAutoPlayedSampleUrlRef\.current===sampleUrl\)return/);
  assert.match(voice,/lastAutoPlayedSampleUrlRef\.current=sampleUrl;\s*void sampleAudioRef\.current\?\.play\(\)/);
  assert.match(browser,/await expect\.poll\(\(\)=>page\.evaluate\(\(\)=>window\.__hhPreviewReplayCount\)\)\.toBe\(1\)/);
  assert.match(browser,/replay must not spend a second free TTS request/);
});

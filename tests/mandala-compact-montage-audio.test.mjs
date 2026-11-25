import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {requiresRealMediaWebKit} from "../lib/ci/merge-check-light.mjs";
const source=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
test("Montage audio is an owner-approved compact panel, not a second generator",()=>{
  const start=source.indexOf('{montagePanel==="audio" ? <div className={videoStyles.montageAudioCompact');
  const end=source.indexOf('data-video-audio-bed-panel',start);
  const pane=source.slice(start,end+300);
  assert.ok(start>0&&end>start,"dedicated compact pane");
  assert.match(pane,/Choose Music/);
  assert.match(pane,/attachedPresetIds\.length>=3/);
  for(const marker of ["data-video-audio-category","data-video-audio-compact-grid",
    "data-video-audio-compact-track","data-video-audio-compact-select","data-video-audio-compact-play",
    "data-video-audio-compact-upload","data-video-audio-compact-selected","data-video-audio-compact-volume",
    "data-video-audio-compact-attach",
    "data-video-audio-library","{deepAudioPane}"])assert.ok(pane.includes(marker),marker);
  assert.doesNotMatch(pane,/data-video-audio-mode=/);
  assert.match(pane,/filteredAudio\.slice\(0,4\)/);
  assert.doesNotMatch(pane,/data-video-audio-affirmations|data-video-voice-studio/);
  assert.match(pane,/setAudioCategoryOverride\(item\.id\)/);
  assert.match(pane,/attachedPresetIds\.includes\(id\)/);
  assert.match(pane,/toggleQuickMusic\(id\)/);
  assert.match(pane,/playQuickTrack\(id\)/);
  assert.ok(!pane.includes("data-video-basic-duration"));
  assert.ok(!pane.includes("data-video-basic-format"));
  assert.ok(!pane.includes("data-video-basic-tab"));
  assert.ok(source.includes('data-montage-panel={activeWorkspace==="editor"?montagePanel:undefined}'));
  assert.ok(css.includes('.montageAudioHero'));
  assert.ok(source.includes('onClick={attachSelectedAudio}'));
  assert.ok(source.includes('onClick={openReadyForGeneration}'));
});
test("Style, Add text, Audio, Montage PRO and real audio source actions remain",()=>{
  const start=source.indexOf('<nav className={videoStyles.montageQuickTools}');
  const rail=source.slice(start,source.indexOf('</nav>',start));
  assert.match(rail,/id:"effects".*id:"audio"[\s\S]*id:"promo"[\s\S]*id:"text"[\s\S]*id:"concept"/);
  assert.match(source,/data-video-montage-style/);
  assert.match(rail,/id:"text"/);
  assert.ok(source.includes('data-video-audio-compact-upload'));
  assert.ok(source.includes('chooseAudioFile(event.currentTarget.files?.[0])'));
  assert.ok(source.includes('data-video-audio-rights'));
});

test("Montage Audio shows music only; voice lives in Hypno",()=>{
  const panel=source.slice(source.indexOf('{montagePanel==="audio" ? <div className={videoStyles.montageAudioCompact'),
    source.indexOf('{musicWarning?<p role="alert" className={videoStyles.montageAudioWarning}>'));
  assert.doesNotMatch(panel,/data-video-voice-studio|MandalaCloudVoiceStudio|data-video-audio-affirmations/);
  assert.match(source,/voiceEditor=\{activeWorkspace==="effects"\?hypnoVoiceEditor:null\}/);
  assert.match(source,/"voice-studio":"effects"/);
  assert.match(source,/if\(hash==="voice-studio"\)\{setHypnoEntryGroup\("audio"\)/);
});

test("compact Montage Audio runs the existing macOS WebKit and Chromium paths",()=>{
  const workflow=readFileSync(new URL("../.github/workflows/holistic-support-mandala.yml",import.meta.url),"utf8");
  for(const filename of ["components/mandala-free-video-studio.tsx","lib/mandala/local-video-music.ts","components/studio-music-picker.jsx"])
    assert.equal(requiresRealMediaWebKit([{status:"M",filename}]),true,filename);
  const macos=workflow.slice(workflow.indexOf("  voice-webkit-macos:"),workflow.indexOf("  voice-webkit-macos:")+12000);
  assert.match(macos,/needs\.webkit_preflight\.outputs\.media_required == 'true'/);
  assert.match(macos,/runs-on: macos-15/);
  assert.match(macos,/node scripts\/verify-affirmation-voice-browser\.mjs/);
  assert.match(workflow,/requiresRealMediaWebKit\(changed\)/);
  assert.match(workflow,/playwright install --with-deps chromium webkit/);
  assert.match(workflow,/HH_VOICE_E2E_ENGINE=chromium node scripts\/verify-affirmation-voice-browser\.mjs/);
  assert.match(workflow,/startsWith\(github\.head_ref, 'codex\/montage-audio-'\)/);

});

test("physical original-motion WebKit exports selected licensed music without requiring upload-only Attach",()=>{
  const browser=readFileSync(new URL("../scripts/benchmarking/verify-original-motion-export.mjs",import.meta.url),"utf8");
  const start=browser.indexOf("const audioTab=page.locator");
  const end=browser.indexOf("let captured;",start);
  assert.ok(start>0&&end>start,"exercise actual Montage Audio and then encode");
  const audioStep=browser.slice(start,end);
  assert.match(audioStep,/data-video-montage-audio/);
  assert.match(audioStep,/data-video-audio-compact-select/);
  assert.match(audioStep,/availableTrack\.tap\(\)/,"WebKit must exercise real touch controls");
  assert.match(audioStep,/selectedTracks\.count\(\)>=1/,"require a selected licensed recording");
  assert.match(audioStep,/selectedTracks\.count\(\)<=3/,"respect three-track mix limit");
  assert.match(audioStep,/await generate\.click/,"render only after actual music choice");
  assert.doesNotMatch(audioStep,/attach\.waitFor|attach\.click/,"upload-only Attach is not present for catalog music");
  assert.match(browser,/assert\.ok\(probe\.streams\.some\(s => s\.codec_type === 'audio'\)\)/);
  assert.match(browser,/Math\.sqrt\(power \/ \(pcm\.length \/ 2\)\) > 0\.003/,"real exported audio must decode and be audible");
  assert.match(browser,/sceneCorrelations:/,"preserve four physical footage comparisons");
});

test("Audio two-button route never performs premature render and keeps a single-row soundtrack",()=>{
  const studio=source;
  const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
  const from=studio.indexOf('data-video-stage-actions="montage"');
  const actions=studio.slice(from,studio.indexOf("data-video-narration-reapproval",from));
  assert.ok(from>0,"reuse one existing Montage footer, no second button component");
  assert.match(actions,/onClick=\{continueMontageOrGenerate\}/);
  assert.match(actions,/onClick=\{openReadyForGeneration\}/);
  assert.doesNotMatch(actions,/onClick=\{createQuickVideo\}/);
  assert.match(studio,/const openReadyForGeneration\s*=/);
  assert.match(css,/grid-auto-flow:column;grid-auto-columns:clamp\(84px,27vw,112px\)/);
  assert.match(css,/max-width:100%;overflow-x:auto;overflow-y:hidden/);
  assert.match(css,/\[data-video-order-bar\] \.quickOrderSummary\{\s*display:none!important/);
  assert.match(css,/\[data-video-stage-actions="montage"\]>\.quickGenerate/);
  assert.match(css,/order:0;min-height:49px;background:#fffcf7!important/);
  assert.match(css,/order:1;min-height:49px;border:1px solid #087e61!important/);
  assert.match(studio,/filteredAudio\.slice\(0,4\)/);
});


test("captured microphone voice automatically attaches without repeat consent and has native playback",()=>{
  const mic=source.slice(source.indexOf("async function startMicRecording()"),source.indexOf("function handleNativeVideoPlaybackFailure"));
  assert.match(mic,/chooseAudioFile\(file,false,true\)/);
  assert.match(mic,/setAttachedAudio\(\{kind:"file",file:selected\.file,id:selected\.url,nonLoop:true\}\)/);
  assert.match(mic,/setSoundVolume\(100\);setAudioStartSeconds\(0\)/);
  assert.match(mic,/recorder\.start\(\)/);
  assert.match(source,/if\(fromMicrophone\|\|recipientAudioSelected\)setAudioRights\(true\)/);
  assert.match(source,/uploadedAudio&&!uploadedAudio\.recorded\?\s*<div className=\{videoStyles\.audioCompactRights\}/);
  assert.match(source,/uploadedAudio&&!uploadedAudio\.recorded\s*\?\s*<label className=\{videoStyles\.audioRights\}/);
  assert.match(source,/uploadedAudio&&!uploadedAudio\.recorded\?\s*<label className=\{videoStyles\.audioLibraryRights\}/);
  assert.match(source,/if\(uploadedAudio\?\.recorded&&player\.getAttribute\("src"\)===uploadedAudio\.url\)return false/);
  assert.match(source,/data-video-recorded-audio-play/);
  assert.match(source,/onClick=\{playSelectedRecording\}/);
  assert.match(source,/if\(uploadedAudio&&!audioRights\)/);
  assert.equal(source.match(/data-video-audio-player data-video-audio-source/g)?.length,1);
});

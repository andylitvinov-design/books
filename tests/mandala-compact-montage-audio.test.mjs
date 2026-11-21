import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {requiresRealMediaWebKit} from "../lib/ci/merge-check-light.mjs";
const source=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
test("Montage audio is an owner-approved compact panel, not a second generator",()=>{
  const start=source.indexOf('{montagePanel==="audio" ? <div className={videoStyles.montageAudioCompact}');
  const end=source.indexOf('data-video-audio-bed-panel',start);
  const pane=source.slice(start,end+300);
  assert.ok(start>0&&end>start,"dedicated compact pane");
  assert.match(pane,/Choose audio tracks/);
  assert.match(pane,/up to 3/);
  for(const marker of ["data-video-audio-category","data-video-audio-compact-grid",
    "data-video-audio-compact-track","data-video-audio-compact-select","data-video-audio-compact-play",
    "data-video-audio-compact-upload","data-video-audio-compact-selected","data-video-audio-compact-volume",
    "data-video-audio-compact-attach",
    "data-video-audio-library","{deepAudioPane}"])assert.ok(pane.includes(marker),marker);
  assert.doesNotMatch(pane,/data-video-audio-mode=/);
  assert.match(pane,/filteredAudio\.slice\(0,12\)/);
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
  assert.match(rail,/id:"effects".*id:"audio"[\s\S]*id:"text"[\s\S]*id:"concept"[\s\S]*id:"promo"/);
  assert.ok(source.includes('"Choose your style"'));
  assert.match(source,/"Add Text"/);
  assert.ok(source.includes('data-video-audio-compact-upload'));
  assert.ok(source.includes('chooseAudioFile(event.currentTarget.files?.[0])'));
  assert.ok(source.includes('data-video-audio-rights'));
});

test("Montage Audio shows music only; voice lives in Hypno",()=>{
  const panel=source.slice(source.indexOf('{montagePanel==="audio" ? <div className={videoStyles.montageAudioCompact}'),
    source.indexOf('{musicWarning?<p role="alert" className={videoStyles.montageAudioWarning}>'));
  assert.doesNotMatch(panel,/data-video-voice-studio|MandalaCloudVoiceStudio|data-video-audio-affirmations/);
  assert.match(source,/voiceEditor=\{activeWorkspace==="effects"\?hypnoVoiceEditor:null\}/);
  assert.match(source,/"voice-studio":"effects"/);
  assert.match(source,/if\(hash==="voice-studio"\)\{setHypnoEntryGroup\("audio"\)/);
});

test("compact Montage Audio runs the existing macOS WebKit and Chromium paths",()=>{
  const workflow=readFileSync(new URL("../.github/workflows/holistic-support-mandala.yml",import.meta.url),"utf8");
  assert.equal(requiresRealMediaWebKit(["components/mandala-free-video-studio.tsx"]),true);
  assert.match(workflow,/requiresRealMediaWebKit\(changed\)/);
  assert.match(workflow,/runs-on: macos-15/);
  assert.match(workflow,/node scripts\/verify-affirmation-voice-browser\.mjs/);
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

test("Audio two-button route never renders early and shows a vertical track playlist",()=>{
  const studio=source;
  const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
  const from=studio.indexOf('data-video-stage-actions="montage"');
  const actions=studio.slice(from,studio.indexOf("data-video-narration-reapproval",from));
  assert.ok(from>0,"reuse one existing Montage footer, no second button component");
  assert.match(actions,/onClick=\{continueMontageOrGenerate\}/);
  assert.match(actions,/onClick=\{openReadyForGeneration\}/);
  assert.doesNotMatch(actions,/onClick=\{createQuickVideo\}/);
  assert.match(studio,/const openReadyForGeneration\s*=/);
  assert.match(css,/\.studio\[data-montage-panel="audio"\] \.audioCompactGrid\{\s*display:flex;flex-direction:column/);
  assert.match(css,/overflow-x:hidden;overflow-y:auto/,"vertical scrolling inside music library");
  assert.match(css,/max-height:clamp\(172px,33dvh,300px\)/);
  assert.match(css,/@media\(max-width:430px\)\{\s*\.studio\[data-montage-panel="audio"\] \.audioCompactGrid\{max-height:clamp\(160px,29dvh,244px\)\}/);
  const playlistRules=[...css.matchAll(/\.audioCompactGrid\s*\{([^}]*)\}/g)].map(match=>match[1]);
  assert.ok(playlistRules.length>0);
  for(const rule of playlistRules)assert.doesNotMatch(rule,/grid-auto-flow:\s*column/);
  assert.match(css,/\.audioCompactWave/);
  assert.match(css,/\.audioCompactTile\[data-selected="true"\]/);
  assert.match(css,/\[data-video-order-bar\] \.quickOrderSummary\{display:none!important/);
  assert.match(css,/\[data-video-stage-actions="montage"\]>\.quickGenerate/);
  assert.match(css,/order:0;background:#fffcf7!important/);
  assert.match(css,/order:1;border:1px solid #087e61!important/);
  assert.match(studio,/filteredAudio\.slice\(0,12\)/);
});

test("Audio is an accessible, slim music list with actual controls, not film posters",()=>{
  const begin=source.indexOf('{montagePanel==="audio" ? <div className={videoStyles.montageAudioCompact}');
  const end=source.indexOf('data-video-audio-compact-selected',begin);
  const audio=source.slice(begin,end);
  assert.match(audio,/data-video-audio-clip-seconds=\{Math\.min\(duration,30\)\}/);
  assert.match(audio,/data-video-audio-compact-upload-tile/);
  assert.match(audio,/className=\{videoStyles\.audioCompactTrackInfo\}/);
  assert.match(audio,/className=\{videoStyles\.audioCompactWave\}/);
  assert.match(audio,/className=\{videoStyles\.audioCompactDuration\}/);
  assert.match(audio,/role="group"/);
  assert.doesNotMatch(audio,/<img/,"Audio mode must never use film stills as music covers");
  const featured=readFileSync(new URL("../components/studio-music-picker.jsx",import.meta.url),"utf8");
  assert.match(featured,/data-video-studio-featured-play/);
  assert.match(featured,/data-video-audio-compact-track=\{"library:"\+row\.id\}/);
  assert.doesNotMatch(featured,/<img src=\{poster\}/);
});

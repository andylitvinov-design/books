import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
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
    "data-video-audio-compact-attach","data-video-audio-affirmations",
    "data-video-audio-library","{deepAudioPane}"])assert.ok(pane.includes(marker),marker);
  assert.doesNotMatch(pane,/data-video-audio-mode=/);
  assert.match(pane,/filteredAudio\.slice\(0,5\)/);
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
  assert.ok(source.includes('onClick={createQuickVideo}'));
});
test("Style, Add text, Audio, Montage PRO and real audio source actions remain",()=>{
  const start=source.indexOf('<nav className={videoStyles.montageQuickTools}');
  const rail=source.slice(start,source.indexOf('</nav>',start));
  assert.match(rail,/id:"effects".*id:"text"[\s\S]*id:"audio".*id:"promo"/);
  assert.ok(source.includes('"Choose your style"'));
  assert.match(source,/"Add Text"/);
  assert.ok(source.includes('data-video-audio-compact-upload'));
  assert.ok(source.includes('chooseAudioFile(event.currentTarget.files?.[0])'));
  assert.ok(source.includes('data-video-audio-rights'));
});

test("The compact Audio pane preserves one opt-in consented RU/EN voice editor",()=>{
  const panel=source.slice(source.indexOf('{montagePanel==="audio" ? <div className={videoStyles.montageAudioCompact}'),
    source.indexOf('{musicWarning?<p role="alert" className={videoStyles.montageAudioWarning}>'));
  assert.ok(panel.includes('data-video-voice-studio open={voiceStudioActivated}'));
  assert.ok(panel.includes('onToggle={event=>setVoiceStudioActivated(event.currentTarget.open)}'));
  assert.match(panel,/voiceStudioActivated\?<MandalaCloudVoiceStudio locale=\{locale\}/);
  assert.match(panel,/sourceText=\{currentAffirmationSpeech\} sourceIsPublic/);
  assert.match(panel,/onAudioReady=\{attachMeditationNarration\}/);
  assert.match(panel,/onAudioInvalidated=\{\(\)=>setAttachedAudio/);
  assert.doesNotMatch(panel,/data-video-basic-tab/);
  assert.match(source,/if\(hash==="voice-studio"\)\{[\s\S]*?setMontagePanel\("audio"\);setBasicPanelTab\("voice"\);/);
});


test("compact Montage Audio runs the existing macOS WebKit and Chromium paths",()=>{
  const workflow=readFileSync(new URL("../.github/workflows/holistic-support-mandala.yml",import.meta.url),"utf8");
  const eligible="startsWith(github.head_ref, 'codex/montage-audio-')";
  assert.equal(workflow.split(eligible).length-1,8,
    "seven existing Linux browser steps and the mandatory macOS runner");
  const macos=workflow.slice(workflow.indexOf("  voice-webkit-macos:"),
    workflow.indexOf("    needs: [webkit_preflight]",workflow.indexOf("  voice-webkit-macos:")));
  assert.match(macos,/codex\/montage-audio-/);
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

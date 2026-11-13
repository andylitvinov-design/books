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
  assert.ok(source.includes('onClick={createQuickVideo}'));
});
test("Style, Add text, Audio, Montage PRO and real audio source actions remain",()=>{
  const start=source.indexOf('<nav className={videoStyles.montageQuickTools}');
  const rail=source.slice(start,source.indexOf('</nav>',start));
  assert.match(rail,/id:"effects".*id:"audio"[\s\S]*id:"text".*id:"promo"/);
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
  assert.match(audioStep,/data-video-ideas-generate/,"Text renders with its active original Generate button");
  assert.match(audioStep,/await generate\.click/,"render only after actual music choice");
  assert.doesNotMatch(audioStep,/attach\.waitFor|attach\.click/,"upload-only Attach is not present for catalog music");
  assert.match(browser,/assert\.ok\(probe\.streams\.some\(s => s\.codec_type === 'audio'\)\)/);
  assert.match(browser,/Math\.sqrt\(power \/ \(pcm\.length \/ 2\)\) > 0\.003/,"real exported audio must decode and be audible");
  assert.match(browser,/sceneCorrelations:/,"preserve four physical footage comparisons");
});

test("mobile Montage Audio has one visible next action: support phrases in Text",()=>{
  const audio=source.slice(source.indexOf('{montagePanel==="audio" ? <div className={videoStyles.montageAudioCompact}'),
    source.indexOf('{musicWarning?<p role="alert" className={videoStyles.montageAudioWarning}>')+1000);
  assert.match(audio,/data-video-audio-next-text data-video-montage-next="text"/);
  assert.match(audio,/onClick=\{continueMontageOrGenerate\}/);
  for(const phrase of ["Добавить фразы поддержки","Añadir frases de apoyo","Add support phrases"])
    assert.ok(audio.includes(phrase),phrase);
  assert.match(source,/data-video-order-bar\s+hidden=\{montagePanel==="promo"\|\|montagePanel==="audio"\}/,
    "the credit quote and Record Video action are hidden on Audio only");
  assert.match(css,/\.audioCompactNext\{display:flex;[\s\S]*?min-height:52px/);
  assert.match(css,/\.audioCompactGrid\{[\s\S]*?grid-auto-flow:column;[\s\S]*?overflow-x:auto/,
    "music is one horizontal rail on phones, not a twelve-tile vertical wall");
  assert.match(css,/grid-auto-columns:clamp\(84px,27vw,112px\)/);
  assert.match(source,/filteredAudio\.slice\(0,12\)/,
    "preserve full licensed soundtrack selection and limit of three");
});


test("all native audio browser flows advance to Text before actual Create",()=>{
  // The former hidden browser test still clicked Generate in Audio twice.
  // Ensure both recorded-voice and generated-WAV paths preserve the real encode.
  const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
  const voice=browser.slice(browser.indexOf("const ownAudioStep=page.locator("),
    browser.indexOf("const ownDownload=page.locator("));
  assert.match(voice,/await expect\(ownCreate\)\.toBeHidden\(\)/);
  assert.match(voice,/data-video-audio-next-text/);
  assert.match(voice,/data-video-ideas-generate/);
  assert.match(voice,/await expect\(ownTextCreate\)\.toBeVisible/);
  assert.match(voice,/await ownTextCreate\.click\(\)/);
  const generate=browser.slice(browser.indexOf("const montageAudioTab=page.locator("),
    browser.indexOf("phase(engine,\"start-media-recorder\")"));
  assert.match(generate,/await expect\(generate\)\.toBeHidden\(\)/);
  assert.match(generate,/data-video-audio-next-text/);
  assert.match(generate,/data-video-ideas-generate/);
  assert.match(generate,/await expect\(textGenerate\)\.toBeVisible/);
  assert.match(browser,/await expect\(page\.locator\('\[data-video-price-summary\]'\)\)\.toBeHidden\(\)/);
  assert.match(css,/\.quickBuilder>\[data-video-order-bar\]\[hidden\]\{display:none!important\}/,
    "the original author CSS rule makes Audio price/XP truly hidden even with display:grid");
});


test("Text uses its own Generate CTA while the redundant montage footer remains hidden",()=>{
  const studioCss=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
  const ideas=readFileSync(new URL("../components/mandala-video-ideas.tsx",import.meta.url),"utf8");
  assert.match(ideas,/data-video-ideas-generate/);
  assert.match(ideas,/onClick=\{onGenerate\}/);
  assert.match(source,/onGenerate=\{createQuickVideo\}/);
  assert.match(studioCss,/\[data-montage-panel="text"\] \[data-video-order-bar\] \.stageActionPair\{[\s\S]*?display:none!important/);
  const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
  assert.match(browser,/await expect\(generate\)\.toBeHidden\(\)/);
  assert.match(browser,/await textGenerate\.click\(\)/);
});

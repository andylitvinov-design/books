import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");

test("Montage opens on Style, preserves real recorder and five functional tabs with Audio replacing Effects",()=>{
  assert.match(studio,/useState<"settings"\|"effects"\|"text"\|"concept"\|"audio">\("effects"\)/);
  const tabStart=studio.indexOf("<nav className={videoStyles.montageQuickTools}");
  const tabMarkup=studio.slice(tabStart,studio.indexOf("</nav>",tabStart));
  assert.ok(tabStart>0,"Montage nav must exist");
  assert.deepEqual([...tabMarkup.matchAll(/id:"(settings|effects|text|audio)",Icon:/g)].map(m=>m[1]),["effects","audio","text","settings"]);
  assert.match(studio,/data-video-montage-tab=\{item.id\}/);
  assert.match(studio,/if\(id==="editor"\)setMontagePanel\("effects"\)/);
  assert.match(studio,/aria-pressed=\{montagePanel===item.id\}/);
  assert.match(studio,/data-video-montage-preferences/);
  for(const field of ["format","duration","transitions","speed","quality"])
    assert.ok(studio.includes('data-video-montage-preference="'+field+'"'),field);
  assert.match(studio,/onChange=\{event=>changeVideoAspect/);
  assert.match(studio,/onChange=\{event=>changeVideoDuration/);
  assert.match(studio,/onChange=\{event=>setQuality/);
  assert.match(studio,/onClick=\{\(\)=>quickPickStyle\(index\)\}/);
  assert.match(studio,/data-video-montage-style=\{index\}/);
  assert.doesNotMatch(studio,/data-video-montage-preference="style"/);
  for(const label of ["Choose your style","Add Text","Añadir texto","Добавить текст"])
    assert.ok(studio.includes(label),label);
  assert.match(studio,/onClick=\{createQuickVideo\}/);
  assert.match(studio,/Создать видео/);
  assert.equal((studio.match(/data-video-montage-export/g)||[]).length,0,"no duplicate export CTA");
  assert.equal((studio.match(/data-video-quick-generate/g)||[]).length,1,"one real generate CTA");
});
test("The editable timeline, script, audio and draft tools are preserved, but not on initial screen",()=>{
  assert.match(studio,/data-video-montage-text hidden=\{montagePanel!=="text"\}/);
  assert.match(studio,/active=\{activeWorkspace==="editor"&&montagePanel==="text"\}/);
  assert.equal((studio.match(/<MandalaVideoIdeas locale/g)||[]).length,1);
  assert.match(studio,/<MandalaMultiTrackTimeline/);
  assert.match(studio,/data-video-montage-script-update/);
  assert.match(studio,/data-video-editor-draft-save/);
  assert.match(studio,/montagePanel==="audio" \? <div[^>]+data-video-montage-audio/);
  assert.match(studio,/data-video-audio-bed-panel/);
  assert.match(studio,/data-video-music-editor/);
  const audio=studio.slice(studio.indexOf('montagePanel==="audio" ? <div'),
    studio.indexOf('data-video-audio-bed-panel'));
  assert.doesNotMatch(audio,/data-video-basic-tab|data-video-basic-duration|data-video-basic-format|data-video-editor-style-settings/);
  assert.match(audio,/\{deepAudioPane\}/);
  assert.match(studio,/data-video-voice-studio/);
  assert.doesNotMatch(studio,/data-video-audio-length=/);
  const settings=studio.slice(studio.indexOf('montagePanel==="settings" ? <div'),
    studio.indexOf('montagePanel==="text" ? <div'));
  assert.match(settings,/\{deepVideoPane\}/);
  assert.match(settings,/data-video-montage-photo-open/);
  assert.match(settings,/basicPanelTab==="photo" \? deepCharacterPhotoPane : null/);
  assert.match(css,/\.montagePreferencesGrid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.studio\[data-active-workspace="editor"\] \.previewStage \.heroRail\{display:none!important\}/);
});

test("Montage auto recommendation is attached before the direct renderer and never forces Audio",()=>{
  const selector=studio.slice(studio.indexOf("// Auto-music must be ATTACHED"),
    studio.indexOf("// A paused film",studio.indexOf("// Auto-music must be ATTACHED")));
  assert.match(selector,/activeWorkspace!=="editor"/);
  assert.match(selector,/recommendedAudioId\|\|"none"/);
  assert.match(selector,/setAttachedAudio\(current=>/);
  assert.match(selector,/current\?\.kind==="file"/);
  assert.match(selector,/current\?\.kind==="presets"/);
  assert.match(studio,/data-video-montage-auto-sound/);
  const handler=studio.slice(studio.indexOf("const createQuickVideo ="),
    studio.indexOf("const openVideoScenarioStep ="));
  assert.match(handler,/return startFromHero\(\)/);
  assert.match(studio,/onClick=\{createQuickVideo\}/);
});

test("Montage iPhone retains the compact header, real six selectors and on-screen CTA",()=>{
  assert.doesNotMatch(css,/quickBuilder>\.quickBrandBar\{display:none!important\}/);
  assert.match(css,/\.studio\[data-active-workspace\] \.quickBuilder>\.quickBrandBar\s*\{/);
  assert.match(css,/\.studio\[data-active-workspace\] \.quickBrandMobileTitle\{display:none!important\}/);
  assert.match(css,/05 Nov Montage follow-up: viewport-first/);
  assert.match(css,/\.previewStage>\.heroWithRail\{\s*display:block!important/);
  assert.match(css,/max-width:278px!important/);
  assert.match(css,/\[data-video-order-bar\] \.quickGenerate\{\s*min-height:50px!important/);
  assert.match(studio,/data-video-montage-auto-sound/);
});

test("Original motion WebKit export reaches advanced Audio via Settings without fake fifth tab",()=>{
 const motion=readFileSync(new URL("../scripts/benchmarking/verify-original-motion-export.mjs",import.meta.url),"utf8");
 assert.match(motion,/data-video-montage-tab="settings"/);
 assert.match(motion,/data-video-montage-preference="duration"/);
 assert.match(motion,/await duration\.selectOption\('20'\)/);
 assert.match(motion,/data-video-montage-open-audio/);
 assert.match(motion,/data-video-audio-compact-attach/);
 assert.match(motion,/await generate\.click\(\)/);
 assert.match(motion,/ffprobe|ffmpeg/);
 assert.doesNotMatch(motion,/data-video-montage-settings|data-video-basic-tab=|data-video-audio-length="/);
});

test("Choosing a Montage style preserves the compiled film and paints the live and exported player",()=>{
  const start=studio.indexOf("const quickPickStyle = (index:number) => {");
  const end=studio.indexOf("// Keep the deep editor tabs usable",start);
  assert.ok(start>0&&end>start,"real Montage click handler exists");
  const handler=studio.slice(start,end);
  assert.doesNotMatch(handler,/setCinematicPlan\(null\)/,"style must not discard approved source clips");
  assert.match(handler,/setCinematicPlan\(current=>current\?\{\.\.\.current,styleId:visualStyleId\}:null\)/);
  assert.match(handler,/setCreationMode\("catalog"\);setFreeVideoPlan\(null\)/,
    "return from procedural animation to film footage");
  assert.match(handler,/setPreviewSeekSeconds\(0\);setPreviewPlayhead\(0\)/);
  assert.match(handler,/setPreviewPlaying\(true\)/);
  for(const style of ["nature","warm","dream","minimal","water","light"])
    assert.ok(studio.includes('styleId==="'+style+'"'),"visible filter "+style);
  assert.match(studio,/paintStudioVisualGrade\(ctx,montageStyleId\)/,
    "style works for a single physical MP4 too");
  assert.match(studio,/paintStudioVisualGrade\(ctx,montageStyleId\|\|storyboard.styleId\)/,
    "style applies across all the licensed shots");
  assert.match(studio,/data-video-preview-style=\{activeMontageStyleId/);
  assert.match(studio,/data-video-preview-clips=\{usingFreeFilmCompilation/);
  assert.match(studio,/autoPlay=\{previewPlaying&&!recording&&!preparing\}/);
  assert.match(studio,/onCanPlay=\{event=>\{\s*setPremiumReady\(true\);[\s\S]*?event.currentTarget.play\(\)/);
  assert.equal((studio.match(/activeMontageStyleId,styleFilmRef\.current,storyboardPhotos\)/g)||[]).length,5,
    "still preview, animation preview and both MP4 export encoders use the same style");
  assert.match(studio,/creationMode,activeMontageStyleId,currentFreeVideoPlan/,
    "a style edit invalidates only the previous exported recording");
});

test("iPhone Style primes a newly mounted MP4 without fetching on first render",()=>{
  assert.match(studio,/preload="none"/,"idle first paint must keep HD loading lazy");
  assert.match(studio,/if\(previewPlaying&&!recording&&!preparing&&video\.readyState<2\)/);
  assert.match(studio,/video\.preload="auto"/);
  assert.match(studio,/if\(video\.networkState!==2\)video\.load\(\)/);
  const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
  assert.match(browser,/await minimal\.tap\(\)/);
  assert.match(browser,/data-video-preview-style","minimal"/);
  assert.match(browser,/video\.readyState>=2&&video\.videoWidth>0/);
  assert.doesNotMatch(browser,/\[data-video-director-style-controls\] \[data-mytube-style-filter\]/);
});

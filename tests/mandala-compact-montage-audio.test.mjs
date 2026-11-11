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
  assert.match(pane,/Background music/);
  for(const marker of ['data-video-audio-mode="library"','data-video-audio-mode="upload"',
    "data-video-audio-category","data-video-audio-compact-selected",
    "data-video-audio-compact-volume","data-video-audio-compact-attach",
    "data-video-audio-library","{deepAudioPane}"])assert.ok(pane.includes(marker),marker);
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

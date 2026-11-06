import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
const source=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
test("Montage audio is an owner-approved compact panel, not a second generator",()=>{
  const pane=source.split('{montagePanel==="audio" ? <div className={videoStyles.montageAudioCompact}')[1]
    ?.split('</div> : null}')[0];
  assert.ok(pane,"dedicated compact pane");
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
test("Style, Add text, Audio, Settings and real audio source actions remain",()=>{
  const rail=source.split('data-video-montage-tools')[1]?.split('</nav>')[0];
  assert.match(rail,/id:"effects".*id:"text"[\s\S]*id:"audio".*id:"settings"/);
  assert.ok(source.includes('"Choose your style"'));
  assert.ok(source.includes('en:"Add text"'));
  assert.ok(source.includes('data-video-audio-compact-upload'));
  assert.ok(source.includes('chooseAudioFile(event.currentTarget.files?.[0])'));
  assert.ok(source.includes('data-video-audio-rights'));
});
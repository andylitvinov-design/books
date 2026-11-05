import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");

test("Montage opens on preferences, preserves real recorder and exactly four functional tabs",()=>{
  assert.match(studio,/useState<"settings"\|"effects"\|"text"\|"audio">\("settings"\)/);
  const tabStart=studio.indexOf("<nav className={videoStyles.montageQuickTools}");
  const tabMarkup=studio.slice(tabStart,studio.indexOf("</nav>",tabStart));
  assert.ok(tabStart>0,"Montage nav must exist");
  assert.equal((tabMarkup.match(/id:"(settings|effects|text|audio)",Icon:/g)||[]).length,4);
  assert.match(studio,/data-video-montage-tab=\{item.id\}/);
  assert.match(studio,/if\(item.id==="editor"\)setMontagePanel\("settings"\)/);
  assert.match(studio,/aria-pressed=\{montagePanel===item.id\}/);
  assert.match(studio,/data-video-montage-preferences/);
  for(const field of ["format","duration","transitions","speed","quality","style"])
    assert.ok(studio.includes('data-video-montage-preference="'+field+'"'),field);
  assert.match(studio,/onChange=\{event=>changeVideoAspect/);
  assert.match(studio,/onChange=\{event=>changeVideoDuration/);
  assert.match(studio,/onChange=\{event=>setQuality/);
  assert.match(studio,/onChange=\{event=>quickPickStyle/);
  assert.match(studio,/onClick=\{createQuickVideo\}/);
  assert.match(studio,/Сгенерировать видео/);
  assert.equal((studio.match(/data-video-montage-export/g)||[]).length,0,"no duplicate export CTA");
  assert.equal((studio.match(/data-video-quick-generate/g)||[]).length,1,"one real generate CTA");
});
test("The editable timeline, script, audio and draft tools are preserved, but not on initial screen",()=>{
  assert.match(studio,/montagePanel==="text" \? <div[^>]+data-video-montage-text/);
  assert.match(studio,/<MandalaMultiTrackTimeline/);
  assert.match(studio,/data-video-montage-script-update/);
  assert.match(studio,/data-video-editor-draft-save/);
  assert.match(studio,/montagePanel==="audio" \? <div[^>]+data-video-montage-audio/);
  assert.match(studio,/data-video-audio-bed-panel/);
  assert.match(studio,/data-video-music-editor/);
  assert.match(css,/\.montagePreferencesGrid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.studio\[data-active-workspace="editor"\] \.previewStage \.heroRail\{display:none!important\}/);
});

import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const studio=read("components/mandala-free-video-studio.tsx");
const layout=read("components/mandala-video-mobile.module.css");
const ui=read("components/mandala-video-ideas.tsx");
const css=read("components/mandala-video-ideas.module.css");

test("Montage Text retains the original seven-phrase editor and all three phrase actions",()=>{
 assert.equal((studio.match(/<MandalaVideoIdeas locale/g)||[]).length,1);
 assert.ok(studio.includes('data-video-montage-text hidden={montagePanel!=="text"}'));
 for(const key of ["data-video-ideas-regenerate","data-video-ideas-own-phrase",
  "data-video-ideas-record","data-video-idea-select","data-video-idea-play",
  "data-video-idea-edit-button","data-video-ideas-generate","data-video-ideas-create"])
  assert.ok(ui.includes(key),key);
 assert.ok(ui.includes("const allFive=[0,1,2,3,4]"));
 assert.ok(ui.includes("limit:7"));
 assert.ok(studio.includes('onGenerate={openReadyForGeneration} status={notice}/>'));
});
test("Text-only mobile UI hides size, note, refine, clear and outer duplicate CTA",()=>{
 assert.ok(layout.includes('[data-montage-panel="text"] .quickBuilder>[data-video-order-bar]'));
 assert.match(layout,/\.quickBuilder>\[data-video-order-bar\]\{[\s\S]*?display:grid!important/);
 for(const cls of [".quickOrderSummary",".stageActionPair"])
  assert.ok(layout.includes('[data-montage-panel="text"] [data-video-order-bar] '+cls),cls);
 assert.ok(studio.includes('data-video-narration-reapproval'),'stale narration warning stays mounted');
 assert.ok(studio.includes('data-video-phrase-approval-required'),'unapproved phrase warning stays mounted');
 assert.ok(studio.includes('if(narrationInvalid){'),'actual Generate remains narration guarded');
 assert.ok(studio.includes('if(phrasePending){'),'actual Generate remains phrase guarded');
 assert.ok(layout.includes('[data-montage-panel="text"] [data-video-montage-text]>.montageMovedNote'));
 for(const cls of [".sizeCard",".subtitle",".refine",".clear",".privacy"])
  assert.ok(css.includes('[data-montage-panel="text"]) '+cls),cls);
 assert.ok(css.includes('[data-montage-panel="text"]) .actions'));
 assert.ok(css.includes('[data-montage-panel="text"]) .stageActions'));
 assert.ok(css.includes('max-height:clamp(220px,42dvh,350px)'));
 assert.ok(css.includes('max-height:clamp(165px,31dvh,245px)'));
});
test("intentional Play reveals the original Canvas; render and effects are not cloned",()=>{
 assert.ok(studio.includes('data-video-preview-playing={previewPlaying?"true":undefined}'));
 assert.ok(layout.includes(':not([data-video-preview-playing="true"]) .previewStage'));
 assert.ok(studio.includes("const openAffirmationPreview = () => {"));
 assert.ok(studio.includes("setPreviewPlaying(true)"));
 assert.ok(studio.includes("data-video-live-stage"));
 assert.ok(studio.includes('onCreate={()=>{setMontagePanel("audio");setBasicPanelTab("music");setPreviewPlaying(false);}}'));
});

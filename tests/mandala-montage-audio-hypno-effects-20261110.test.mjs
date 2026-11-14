import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const hypno=readFileSync(new URL("../components/mandala-hypnocorrection-mobile.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-hypnocorrection-mobile.module.css",import.meta.url),"utf8");

test("Montage puts Story before the final Montage PRO choice",()=>{
  const start=studio.indexOf("<nav className={videoStyles.montageQuickTools}");
  const nav=studio.slice(start,studio.indexOf("</nav>",start));
  assert.deepEqual([...nav.matchAll(/\{id:"(\w+)",Icon:/g)].map(m=>m[1]),
    ["effects","audio","text","concept","promo"]);
  assert.match(nav,/audio:\{ru:"Аудио",en:"Audio",es:"Audio"\}/);
  assert.doesNotMatch(nav,/id:"visual"/);
  for(const marker of ["data-video-montage-audio","Background music","Фоновая музыка",
    "Música de fondo","data-video-audio-library-confirm","data-video-audio-compact-attach",
    "data-video-audio-compact-play"])assert.ok(studio.includes(marker),marker);
  assert.doesNotMatch(studio,/data-video-montage-visual-effect/);
});

test("Hypno adds a third exclusive Effects tab to the original shared Canvas",()=>{
  assert.match(hypno,/type GroupId = "visual" \| "audio" \| "effects";/);
  assert.match(hypno,/id:"effects",title:t.presetTitle,tab:t.effectsTab/);
  assert.match(hypno,/aria-selected=\{activeGroup===group.id\}/);
  assert.match(hypno,/hidden=\{activeGroup!==group.id\}/);
  for(const id of ["none","sunlight","glow","waves"])
    assert.match(hypno,new RegExp('id:"'+id+'"'));
  assert.equal((hypno.match(/data-hypno-visual-effect=\{item.id\}/g)||[]).length,1);
  assert.match(hypno,/data-hypno-effect-status/);
  assert.match(studio,/initialGroup=\{hypnoEntryGroup\}/);
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.equal((studio.match(/paintHypnoLightOverlay\(ctx,/g)||[]).length,5);
});

test("macOS WebKit E2E verifies all three Hypno subtabs and live visual presets",()=>{
  const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
  for(const required of [
    'hypnoTabs.getByRole("tab")).toHaveCount(3)',
    'const effectsTab=hypnoTabs.locator',
    'await effectsTab.click();',
    'await expect(effectsGroup).toBeVisible();',
    'data-hypno-visual-effect="sunlight"',
    'video-hypno-effect-strength',
    'await expect(effectsGroup).toBeHidden();'
  ])assert.ok(browser.includes(required),required);
  assert.ok(!browser.includes('hypnoTabs.getByRole("tab")).toHaveCount(2)'),
    "the previous two-tab expectation is obsolete");
});

test("Selecting music and moving to effects never renders or charges by itself",()=>{
  const block=studio.slice(studio.indexOf("const continueMontageOrGenerate="),
    studio.indexOf("// First mobile step is only",studio.indexOf("const continueMontageOrGenerate=")));
  assert.match(block,/setMontagePanel\("audio"\)/);
  assert.match(block,/setHypnoEntryGroup\("effects"\);setActiveWorkspace\("effects"\)/);
  assert.doesNotMatch(block,/createQuickVideo\(|videoCreditRequest\(|startFromHero\(|appFetch\(/);
  const options=hypno.slice(hypno.indexOf("data-hypno-visual-effect={item.id}"),
    hypno.indexOf('{group.id==="visual"?<>'));
  assert.match(options,/enabled:item.id!=="none"/);
  assert.doesNotMatch(options,/createVideo|videoCreditRequest|postVideoCreditAction|appFetch/);
  assert.match(studio,/onClick=\{createQuickVideo\}/);
});

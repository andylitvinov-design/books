import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
const browser=readFileSync(new URL("../scripts/verify-holistic-mandala-browser.mjs",import.meta.url),"utf8");
test("visible Basic, Smart, Pro choices sit before six existing controls",()=>{
  assert.match(studio,/data-video-tier-selector/);
  assert.match(studio,/data-video-tier=\{id\}/);
  assert.match(studio,/const \[tierMode,setTierMode\] = useState<"basic"\|"smart"\|"pro">\("basic"\)/);
  assert.ok(studio.indexOf("data-video-tier-selector")<studio.indexOf("data-video-quick-builder"));
  assert.match(studio,/data-video-quick-section="6"/);
  assert.match(browser,/data-video-tier="smart"/);
  assert.match(browser,/data-video-tier="pro"/);
  assert.match(css,/\.videoTierCards\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:380px\)/);
});
test("prices are explicitly proposed and cannot trigger fake paid jobs",()=>{
  for(const marker of ['smartPrice:"$2"','proPrice:"$9.90"','basicPrice:"$0"']){
    assert.ok(studio.includes(marker),marker);
  }
  assert.match(studio,/planned:"Планируемая цена, USD"/);
  assert.match(studio,/blocked:"AI-рендер и автоматическая оплата ещё не подключены/);
  assert.match(studio,/freeExpl:"После запуска и подтверждения аккаунта/);
  assert.match(studio,/data-video-tier-gate=\{tierMode\}/);
  assert.match(studio,/data-video-tier-storyboard onClick=\{prepareAiStoryboard\}/);
  assert.match(studio,/setQuickDetailedOpen\(true\)/);
  assert.match(studio,/tierMode==="basic"\?quick\.create:tier\.draft/);
  assert.doesNotMatch(studio,/fetch\(["']\/api\/.*(?:purchase|payment|render|charge)/);
});
test("proposed plans do not alter the existing local recorder and consent",()=>{
  assert.match(studio,/onClick=\{createQuickVideo\}/);
  assert.match(studio,/new MediaRecorder\(stream,recorderOptions\)/);
  assert.match(studio,/data-video-photo-consent/);
  assert.match(studio,/data-free-video-source="generated"/);
  assert.match(studio,/data-free-video-source="catalog"/);
  assert.match(studio,/paintFreeVideoFrame\(ctx,freePlan,time,permittedPortrait\?image:null\)/);
});

import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const story=readFileSync(new URL("../components/mandala-automatic-storyboard.tsx",import.meta.url),"utf8");
const styles=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
const offer=readFileSync(new URL("../components/mandala-montage-pro-offer.tsx",import.meta.url),"utf8");

test("Style, Audio, Text, Story, Montage is the only five-step visible editor order",()=>{
 const start=studio.indexOf("<nav className={videoStyles.montageQuickTools} data-video-montage-tools");
 assert.ok(start>=0);
 const nav=studio.slice(start,studio.indexOf("</nav>",start));
 const tokens=['id:"effects"','id:"audio"','id:"text"','id:"concept"','id:"promo"'];
 const positions=tokens.map(token=>nav.indexOf(token));
 assert.ok(positions.every(n=>n>=0),"all five tabs remain");
 assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
 assert.match(nav,/promo:\{ru:"Монтаж",en:"Montage",es:"Montaje"\}/);
 assert.match(studio,/montagePanel==="text"\|\|montagePanel==="settings"\)\{\s*setMontagePanel\("concept"\)/);
 assert.match(studio,/montagePanel==="concept"\)\{\s*setMontagePanel\("promo"\)/);
});

test("five compact Story cards do not replace or invent the underlying approved film cuts",()=>{
 assert.match(story,/manualFiveReady\?5:Math\.min\(5,guides\.scenes\.length\)/);
 assert.match(story,/Math\.floor\(\(index\+1\)\*guides\.scenes\.length\/visibleCount\)/);
 assert.match(story,/data-storyboard-clips/);
 assert.match(story,/data-video-auto-storyboard-list/);
 assert.match(story,/data-video-story-scene/);
 assert.match(story,/data-reviewed-filmed-only/);
 assert.match(story,/planReviewedFilmedStory/);
 assert.match(story,/isReviewedFilmedStorySequence/);
 assert.match(story,/isReviewedFilmedStoryScene/);
 assert.match(story,/data-video-story-select-quality/);
 assert.match(story,/onApply\(proposal\.shots,concept,storyKey,/);
 assert.match(story,/if\(!ok\)return;[\s\S]*onChooseQuality\(\)/);
 assert.match(story,/quality:"Select generation quality"/);
 assert.match(story,/quality:"Выбрать качество генерации"/);
 assert.match(story,/quality:"Elegir calidad de generación"/);
 assert.equal([0,1,2,3,4].map(i=>Math.floor((i+1)*6/5)).at(-1),6,
   "five cards summarize all six verified 5-second masters in a 30-second video");
});

test("advanced five-scene source/photo editor preserved in fifth Montage, closed by default",()=>{
 assert.match(studio,/data-video-montage-concept/);
 assert.match(studio,/montagePanel==="promo" \? <details className=\{videoStyles\.montageStoryAdvanced\}/);
 assert.match(studio,/data-video-stories-advanced/);
 assert.match(studio,/data-video-montage-storyboard/);
 assert.match(studio,/data-video-stories-photo=/);
 assert.match(studio,/data-video-stories-source=/);
 assert.match(studio,/onChooseQuality=\{\(\)=>\{/);
 assert.match(studio,/setMontagePanel\("promo"\)/);
 assert.match(styles,/data-montage-panel="concept"\] \[data-video-live-stage\]/);
 assert.match(styles,/height:66px;min-height:66px/);
 assert.match(offer,/goStory:"Create free video"/);
});

test("navigation is only a selection; export, checks and payment stay behind the existing Create flow",()=>{
 assert.match(story,/if\(!manualFiveReady&&!applied&&eligible\)/);
 assert.match(story,/if\(!ok\)return/);
 assert.doesNotMatch(story,/createQuickVideo|startFromHero|stripe|chargeWallet/);
 assert.match(studio,/data-video-quick-generate/);
 assert.match(studio,/onClick=\{createQuickVideo\}/);
 assert.match(studio,/onGoStory=\{createQuickVideo\}/,
   "the fifth Montage free action must invoke the real renderer in the same user gesture");
 assert.doesNotMatch(studio,/document\.querySelector\('\[data-video-quick-generate\]'\)/,
   "do not scroll visitors to the hidden Create button in Montage");
 assert.match(studio,/if\(narrationInvalid\)\{/);
 assert.match(studio,/if\(creditCatalog\?\.chargeRequired&&creditSession==="guest"&&guestFirstVideoUsed\)/);
 assert.match(studio,/data-video-montage-next=\{montagePanel==="effects"/);
});


test("compact Story source branch runs mandatory macOS WebKit instead of skipped Safari",()=>{
 const workflow=readFileSync(new URL("../.github/workflows/holistic-support-mandala.yml",import.meta.url),"utf8");
 const match=workflow.match(/^  voice-webkit-macos:\n    if: \$\{\{ (.+) \}\}$/m);
 assert.ok(match,"original WebKit job stays present");
 assert.ok(match[1].includes("github.head_ref == 'codex/video-story-five-cards-quality-last-20261112'"));
 assert.match(workflow,/voice-webkit-macos:[\s\S]*?needs: \[webkit_preflight\][\s\S]*?runs-on: macos-15/);
 assert.match(workflow,/HH_VOICE_E2E_ENGINE: webkit/);
});

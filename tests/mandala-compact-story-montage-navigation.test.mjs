import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const story=readFileSync(new URL("../components/mandala-automatic-storyboard.tsx",import.meta.url),"utf8");
const styles=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
const offer=readFileSync(new URL("../components/mandala-montage-pro-offer.tsx",import.meta.url),"utf8");
const ideas=readFileSync(new URL("../components/mandala-video-ideas.tsx",import.meta.url),"utf8");
const webkit=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
const firstVideoSmoke=readFileSync(new URL("../scripts/benchmarking/first-video-live-export.mjs",import.meta.url),"utf8");

test("Style, Audio, Text, Story, Montage is the only five-step visible editor order",()=>{
 const start=studio.indexOf("<nav className={videoStyles.montageQuickTools} data-video-montage-tools");
 assert.ok(start>=0);
 const nav=studio.slice(start,studio.indexOf("</nav>",start));
 const tokens=['id:"effects"','id:"audio"','id:"text"','id:"concept"','id:"promo"'];
 const positions=tokens.map(token=>nav.indexOf(token));
 assert.ok(positions.every(n=>n>=0),"all five tabs remain");
 assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
 assert.match(nav,/promo:\{ru:"Монтаж PRO",en:"Montage PRO",es:"Montaje PRO"\}/);
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
 assert.match(story,/sourceReady=onApply\(proposal\.shots,concept,storyKey,/);
 assert.match(story,/onChooseQuality\(sourceReady\)/);
 assert.doesNotMatch(story,/if\(!ok\)return;/,
   "choosing quality cannot be blocked by a failed optional scene application");
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
 assert.match(studio,/onChooseQuality=\{sourceReady=>\{/);
 assert.match(studio,/setNotice\(sourceReady\?""/,
   "unapplied story must show a real warning without fabricating applied footage");
 assert.match(studio,/setMontagePanel\("promo"\)/);
 assert.match(studio,/setMontagePanel\("promo"\);\s*setNotice\(locale==="ru"/,
   "successfully compiled five licensed scenes remain in fifth Montage advanced editor");
 assert.match(styles,/data-montage-panel="concept"\] \[data-video-live-stage\]/);
 assert.match(styles,/height:66px;min-height:66px/);
 assert.match(offer,/data-video-montage-pro-choice=\{item.id\}/);
 assert.match(offer,/onChooseFree/);
 assert.match(offer,/onChooseCharacter/);
 assert.match(offer,/onChooseCinematic/);
});

test("navigation is only a selection; export, checks and payment stay behind the existing Create flow",()=>{
 assert.match(story,/if\(!manualFiveReady&&!applied&&eligible\)/);
 assert.match(story,/onChooseQuality\(sourceReady\)/);
 assert.doesNotMatch(story,/if\(!ok\)return/,
   "a failed media preflight cannot hide the fifth Montage quality chooser");
 assert.doesNotMatch(story,/createQuickVideo|startFromHero|stripe|chargeWallet/);
 assert.match(studio,/data-video-quick-generate/);
 assert.match(studio,/onClick=\{createQuickVideo\}/);
 assert.match(studio,/onChooseFree=\{\(\)=>\{[\s\S]*?createQuickVideo\(\)/,
   "the fifth Montage free choice must invoke the real renderer within the same trusted gesture");
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
 assert.ok(workflow.includes('codex/video-story-five-cards-quality-last-20261112 ]]; then'),
   "the same existing macOS runner must verify real five-scene H264/AAC Story output");
 assert.match(workflow,/verify-five-scene-stories-browser\.mjs/);
});

test("Text shows only one review CTA, navigating forward to fourth Story without rendering",()=>{
 const start=ideas.indexOf('data-video-stage-actions="ideas"');
 const footer=ideas.slice(start,ideas.indexOf("</div>",start));
 assert.ok(start>0);
 assert.equal(footer.split("<button").length-1,1);
 assert.ok(footer.includes("data-video-ideas-create"));
 assert.ok(!footer.includes("data-video-ideas-generate"));
 assert.ok(!footer.includes("onGenerate"));
 assert.ok(footer.includes("disabled={disabled||selectedCount<5}"));
 for(const phrase of ["Проверить storyboard","Review storyboard","Revisar storyboard"])
  assert.ok(footer.includes(phrase));
 assert.ok(studio.includes('setMontagePanel("concept");setPreviewPlaying(false);setNotice("");'));
 assert.ok(!studio.includes('onCreate={()=>{setMontagePanel("audio");setBasicPanelTab("music");setPreviewPlaying(false);}}'));
 assert.ok(webkit.includes("await reviewStory.tap();"));
 assert.ok(webkit.includes("await expect(textFooter.locator(\"button\")).toHaveCount(1);"));
 assert.ok(webkit.includes("await expect(page.locator('[data-video-montage-tab=\"concept\"]')).toHaveAttribute"));
});

test("real first-video Safari export uses fifth Montage advanced settings twice, never a hidden Story CTA",()=>{
 assert.equal((firstVideoSmoke.match(/await openMontageSettings\(page\);/g)||[]).length,2);
 assert.doesNotMatch(firstVideoSmoke,/data-video-story-open-settings/);
 assert.match(firstVideoSmoke,/page\.locator\('\[data-video-montage-tab="promo"\]'\)/);
 assert.match(firstVideoSmoke,/page\.locator\('\[data-video-stories-advanced\]'\)/);
 assert.match(firstVideoSmoke,/if\(!await advanced\.evaluate\(node=>node\.open\)\)/);
 assert.match(firstVideoSmoke,/advanced\.locator\(':scope > summary'\)\.click\(\)/);
 assert.match(firstVideoSmoke,/advanced\.locator\('\[data-video-stories-settings\]'\)/);
 assert.match(firstVideoSmoke,/data-montage-panel'\)===\x27settings\x27/);
 assert.match(firstVideoSmoke,/readRealGuestVideo\(page,\{timeout:80000\}\)/);
 assert.match(firstVideoSmoke,/mediaTool\('ffmpeg'/);
});

test("physical WebKit Story quality tap commits fifth Montage without skipping media gates",()=>{
 const browser=readFileSync(new URL("../scripts/benchmarking/verify-five-scene-stories-browser.mjs",import.meta.url),"utf8");
 assert.match(studio,/onChooseQuality=\{sourceReady=>\{[\s\S]*?flushSync\(\(\)=>\{[\s\S]*?setMontagePanel\("promo"\)/);
 assert.match(browser,/await quality\.tap\(\)/);
 assert.match(browser,/tab\?\.getAttribute\('aria-pressed'\)==='true'/);
 assert.match(browser,/panel\?\.getAttribute\('data-montage-panel'\)==='promo'/);
 assert.match(browser,/STORY_QUALITY_PANEL_MUST_COMMIT/);
 assert.match(browser,/STORY_MONTAGE_TRANSITION_STATE/);
 assert.match(browser,/HH_STORIES_FIVE_SHOT_WEBKIT_PASS/);
 assert.match(browser,/STORIES_H264_REQUIRED|STORIES_AAC_REQUIRED/);
 assert.match(browser,/await free\.tap\(\{timeout:30000\}\)/);
 assert.doesNotMatch(browser,/await free\.click\(/);
 assert.match(browser,/STORIES_FREE_NATIVE_TAP_NOT_STARTED/);
 assert.match(browser,/STORIES_FREE_RENDER_NOT_READY/);
 assert.match(browser,/readRealGuestVideo\(page,\{timeout:150000\}\)/);
 assert.doesNotMatch(browser,/force:\s*true/);
});

import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(path)=>readFileSync(new URL(path,import.meta.url),"utf8");
const studio=read("../components/mandala-free-video-studio.tsx");
const director=read("../components/mandala-auto-video-director.tsx");
const css=read("../components/mandala-video-goal-refresh.css");
const data=JSON.parse(read("../data/video-catalog/mytube-content-taxonomy-4x4x4-v2.json"));

test("approved Goal screen orders wish and real match action BEFORE goal cards",()=>{
 assert.equal((studio.match(/data-video-request-prompt/g)||[]).length,1,"one director request host");
 assert.ok(studio.indexOf("data-video-wish-above-goals")<studio.indexOf("data-video-director-goal-controls"));
 assert.ok(studio.indexOf("data-video-director-goal-controls")<studio.indexOf("data-video-director-topic-controls"));
 assert.ok(studio.indexOf("data-video-director-topic-controls")<studio.indexOf("data-video-continue-scenarios"));
 assert.match(studio,/data-video-director-audience-controls/);
 assert.doesNotMatch(studio,/data-video-goal-audience-selector/,"no disconnected second audience switch");
 assert.match(director,/const audienceBar=/);
 assert.match(director,/data-auto-video-audience=\{mode\}/);
 assert.match(director,/aria-pressed=\{videoAudience===mode\}/);
 assert.match(director,/createPortal\(audienceBar,audienceTarget\)/);
 assert.match(studio,/onClick=\{continueToIdeas\}/);
 assert.match(director,/data-video-request-design className=\{css\.designRequest\}/);
 assert.match(director,/onClick=\{designFromRequest\}/);
 assert.match(director,/const classification=inferred;/);
 assert.match(director,/setSelectedCategoryId\(classification\.categoryId as CanonicalCategoryId\)/);
});

test("four illustrated goals and nine real topic chips are grounded in canonical taxonomy",()=>{
 const marker="const goalTopicIds:Record<CanonicalCategoryId,readonly string[]>=";
 const start=director.indexOf(marker);
 assert.ok(start>0);
 const end=director.indexOf(";",start+marker.length);
 const map=JSON.parse(director.slice(start+marker.length,end));
 assert.equal(Object.keys(map).length,4);
 for(const category of data.categories){
  const list=map[category.id];
  assert.equal(list?.length,9,category.id+" offers nine visible themes");
  assert.equal(new Set(list).size,9);
  const valid=new Set(category.subcategories.flatMap(s=>s.topics.map(t=>t.id)));
  for(const id of list)assert.ok(valid.has(id),category.id+":"+id);
 }
 assert.match(director,/data-video-goal-topic-chips/);
 assert.match(director,/data-video-goal-topic=\{id\}/);
 assert.match(director,/onClick=\{\(\)=>chooseTaxonomyTopic\(id\)\}/);
 assert.match(director,/setSelectedSubcategoryId\(found\.subcategory\.id\);setSelectedTopicId\(topicId\)/);
 assert.match(director,/data-video-optional-topic disabled=\{disabled\|\|!selectedSubcategoryId\}/);
 assert.match(director,/createPortal\(goalPanel,goalTarget\)/);
 assert.match(director,/createPortal\(quickTopicPanel,topicTarget\)/);
 assert.match(director,/const quickTopicPanel=videoAudience==="others"/);
 assert.match(director,/data-video-recipient-catalog/);
 assert.match(director,/buildRecipientVideoCaptions\(/);
 assert.match(studio,/if\(goalContinueRef\.current\?\.\(\)===false\)return/);
 assert.match(director,/const prepareGoalForIdeas=\(\):boolean=>/);
 assert.match(director,/onApply\(chosen\.id,length as 10\|15\|20\|30\|60/);
 assert.match(director,/captionTexts:\[\.\.\.stageCaptions\]/);
 assert.match(director,/recipientCaptionOverrides/);
 assert.match(director,/Object\.prototype\.hasOwnProperty\.call\(recipientCaptionOverrides,index\)/);
 assert.match(director,/keepGoalFlow:true/);
 assert.match(director,/data-video-recipient-topic-summary/);
 for(const art of ["stress","love","energy","growth"]){
  const bytes=readFileSync(new URL("../public/images/video-goal-art/"+art+".webp",import.meta.url));
  assert.equal(bytes.toString("ascii",0,4),"RIFF");
  assert.equal(bytes.toString("ascii",8,12),"WEBP");
  assert.ok(bytes.length<3500,"small first-party mock artwork");
 }
});

test("mobile CSS uses legible image grid and category/topic tags without replacing the renderer",()=>{
 assert.match(css,/data-video-wish-above-goals/);
 assert.match(css,/data-video-request-design/);
 assert.match(css,/data-video-goal-art/);
 assert.match(css,/data-video-goal-category-title/);
 assert.match(css,/data-video-goal-topic-chips/);
 assert.match(css,/repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/data-video-quick-controls/);
 assert.match(css,/data-video-mandala-hero/);
 assert.match(css,/data-mandala-mode="video"/);
 assert.match(css,/max-width:350px/);
 assert.match(css,/focus-visible/);
 assert.match(studio,/data-video-preview-toggle/);
 assert.match(studio,/data-video-quick-control=\{item\.id\}/);
 assert.doesNotMatch(css,/display:none!important;\s*\/\*.*?data-video-continue-scenarios/s);
});

test("recipient intent uses real portrait footage with restorable self-video format",()=>{
  assert.match(director,/selfAspectRef=useRef<"landscape"\|"portrait"\|"square">\(aspect\)/);
  assert.match(director,/onAspectChange\?\.\("portrait"\)/);
  assert.match(director,/onAspectChange\?\.\(selfAspectRef\.current\)/);
  assert.match(director,/data-video-recipient-aspect=\{aspect\}/);
  assert.match(studio,/onAspectChange=\{next=>\{/);
  assert.match(studio,/setAspect\(next\);setCinematicPlan\(null\);setPreviewPlaying\(false\)/);
});

test("existing guided course accepts a real public deep link, not an obsolete seventh tab",()=>{
  const guided=read("../scripts/verify-mandala-practices-browser.mjs");
  const mobile=read("../scripts/verify-practices-mobile-browser.mjs");
  assert.match(studio,/"guided-video-series":"practices"/);
  assert.match(guided,/mandala#guided-video-series/);
  assert.match(guided,/toHaveAttribute\("data-active-workspace","practices"\)/);
  assert.match(guided,/toHaveCount\(6\)/);
  assert.match(mobile,/data-video-studio-mode/);
  assert.match(mobile,/data-guided-generate-meditation/);
  assert.doesNotMatch(guided,/data-video-quick-control="practices"/);
  assert.doesNotMatch(mobile,/data-video-quick-control="practices"/);
});

test("WebKit Ideas optional disclosure preserves native Safari toggle across portal renders",()=>{
  assert.match(director,/const bindIdeaRefinement=useCallback/);
  assert.match(director,/ref=\{bindIdeaRefinement\}/);
  assert.match(director,/ideaRefinementOpenRef\.current=event\.currentTarget\.open/);
  assert.doesNotMatch(director,/open=\{ideaRefinementOpen\}/);
  const browser=read("../scripts/verify-affirmation-voice-browser.mjs");
  assert.match(browser,/refinement\.locator\(":scope > summary"\)\.click\(\)/);
  assert.match(browser,/expect\(refinement\)\.toHaveAttribute\("open",""\)/);
});
test("macOS WebKit uses real Ideas Text→Voice switch and own-voice opt-in",()=>{
 const browser=read("../scripts/verify-affirmation-voice-browser.mjs");
 assert.match(studio,/data-video-ideas-tabs/);
 assert.match(studio,/setIdeasSubtab\("concept"\)/);
 assert.match(studio,/data-video-ideas-record/);
 assert.match(browser,/data-video-ideas-tab="concept"/);
 assert.match(browser,/data-video-ideas-tab="personalization"/);
 assert.match(browser,/await expect\(advancedVoice\)\.toHaveAttribute\("open",""\)/);
 assert.match(browser,/await recordEntry\.click\(\)/);
 assert.match(browser,/await expect\(advancedVoice\)\.toBeVisible\(\{timeout:15000\}\)/);
 assert.match(browser,/data-hypno-idea-details/);
 assert.doesNotMatch(browser,/advancedVoice\.click\(\{force:true\}\)/);
});
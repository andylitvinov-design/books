import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const studio=read("components/mandala-free-video-studio.tsx");
const director=read("components/mandala-auto-video-director.tsx");
const mirror=read("components/mandala-magic-mirror-goal.tsx");
const mirrorCss=read("components/mandala-magic-mirror-goal.module.css");
const mobile=read("components/mandala-video-mobile.module.css");
const personal=read("components/mandala-video-personalization.tsx");
const browser=read("scripts/verify-affirmation-voice-browser.mjs");

test("approved Magic Mirror is a mobile skin over one authentic video player and Canvas/MP4",()=>{
 assert.match(studio,/MandalaMagicMirrorTitle/);
 assert.match(studio,/MandalaMagicMirrorGoal/);
 assert.match(studio,/data-video-therapy-intro="ready"/);
 assert.match(studio,/ref=\{introVideoRef\}/);
 assert.match(studio,/poster="\/images\/video-studio-presentation-ru\.jpg"/);
 assert.equal((studio.match(/data-mandala-cinematic-canvas/g)||[]).length,1);
 assert.equal((studio.match(/<MandalaAutoVideoDirector/g)||[]).length,1);
 assert.match(mobile,/\.previewStage \.heroWithRail:after/);
 assert.match(mobile,/Preserve the two functional Intro \/ My Video actions/);
 assert.match(mobile,/data-hh-mirror-advanced="false"/);
 assert.match(mirrorCss,/@media\(max-width:359px\)/);
});

test("the approved mobile Mirror contains only three scopes, a compact input Next and four choices",()=>{
 for(const label of ["For Me","For Work","Present","Для работы","Подарок","Para el trabajo","Regalo"])
  assert.ok(mirror.includes(label),label);
 assert.equal((mirror.match(/categoryId:"(goals-money|love-relationships|energy-confidence|stress-anxiety)"/g)||[]).length,12);
 assert.match(mirror,/data-hh-mirror-audience=\{item\}/);
 assert.match(mirror,/data-hh-mirror-wish/);
 assert.match(mirror,/data-hh-mirror-goal-choice=\{item\.id\}/);
 assert.match(mirror,/data-hh-mirror-next/);
 assert.ok(mirror.indexOf("data-hh-mirror-next")<mirror.indexOf("data-hh-mirror-goal-choice"),
  "Next belongs beside the wish field ABOVE all four cards");
 assert.match(mirrorCss,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(mirrorCss,/\.entry\{display:grid;grid-template-columns:minmax\(0,1fr\) auto/);
 assert.match(mobile,/Magic Mirror v3/);
 assert.match(mobile,/quickBuilder>:not\(\.quickBrandBar\):not\(\[data-hh-mirror-title\]\):not\(\.previewStage\):not\(\[data-hh-mirror-goals\]\)/);
 assert.match(mobile,/max-height:740px/);
 assert.doesNotMatch(mirror,/fetch\(|localStorage|navigator\.sendBeacon|createQuickVideo\(/);
});

test("photo -> exactly two visible taxonomy choices -> Goal; Next auto-classifies and skips them",()=>{
 assert.match(mirror,/onClick=\{\(\)=>\{setSelectedId\(item\.id\);setSubcategoryId\(""\);/);
 assert.match(mirror,/onSelectCategory\(item\.theme\);changeStep\(2\)/);
 assert.match(mirror,/data-hh-mirror-subcategory=\{item\.id\}/);
 assert.match(mirror,/setSubcategoryId\(item\.id\);changeStep\(3\)/);
 assert.match(mirror,/data-hh-mirror-topic=\{item\.id\}/);
 assert.match(mirror,/listMyTubeSubcategories/);
 assert.match(mirror,/listMyTubeTopics/);
 assert.match(mirror,/classifyMyTubeRequest\(wish,locale\)/);
 assert.match(mirror,/finish\(categoryId,subId,topicId,goalText\)/);
 assert.match(studio,/mirrorResolveRef\.current\?\.\(path\)/);
 assert.match(studio,/setIdeasSubtab\("goal"\);setActiveWorkspace\("phrases"\)/);
 assert.match(studio,/setMirrorAdvanced\(false\);setVideoScenarioOpen\(false\)/);
 assert.match(director,/mirrorResolveRef\.current=resolve/);
 assert.match(director,/found\.category\.id!==path\.categoryId/);
 assert.match(director,/found\.subcategory\.id!==path\.subcategoryId/);
 assert.match(director,/setSelectedTopicId\(path\.topicId\)/);
 assert.match(director,/path\.scope==="present"/);
 assert.match(director,/setRecipientKindId\(kindId\)/);
 assert.match(browser,/data-hh-mirror-subcategory/);
 assert.match(browser,/data-hh-mirror-topic/);
 assert.match(browser,/data-hh-mirror-next/);
});

test("Work has four one-tap formats with distinct photos, EN/RU/ES and output framing",async()=>{
 const formats=["insta-reels","video-about-me","service-presentation","client-video-offer"];
 const captions=["Insta Reels","Video About Me","Service Presentation","Client Video Offer"];
 for(let i=0;i<4;i++){
  assert.ok(mirror.includes('id:"'+formats[i]+'"'));
  assert.ok(mirror.includes('en:"'+captions[i]+'"'));
 }
 assert.match(mirror,/if\(scope==="business"\)\{/);
 assert.match(mirror,/scope==="business"\?item\.label\?\.\[locale\]/);
 assert.match(mirror,/referrerPolicy=\{scope==="business"\?"no-referrer":undefined\}/);
 const localWorkPhotos=[...mirror.matchAll(/image:"(\/videos\/holistic-house\/film-collection-v3\/[^"]+\.jpg)"/g)];
  assert.equal(localWorkPhotos.length,4);
  assert.equal(new Set(localWorkPhotos.map(match=>match[1])).size,4);
  assert.match(mirror,/item\.image\.startsWith\("\/"\)\?item\.image/);
 assert.doesNotMatch(read("middleware.ts"),/https:\/\/images\.unsplash\.com/);
 assert.match(director,/path\.scope==="business"&&path\.workFormat/);
 assert.match(director,/workAspect=path\.workFormat==="insta-reels"/);
 assert.match(browser,/data-hh-mirror-goal-choice="insta-reels"/);
 const {getMyTubeTopic}=await import("../lib/mandala/mytube-content-taxonomy.mjs");
 const rows=[...mirror.matchAll(/\{id:"(insta-reels|video-about-me|service-presentation|client-video-offer)",theme:"[^"]+",categoryId:"([^"]+)",image:"[^"]+",defaultTopicId:"([^"]+)"/g)];
 assert.equal(rows.length,4);
 for(const [,id,category,topic] of rows)assert.equal(getMyTubeTopic(topic)?.category.id,category,id);
});

test("typed wishes map locally only to canonical taxonomy IDs",async()=>{
 const {classifyMyTubeRequest}=await import("../lib/mandala/mytube-prompt-classifier.mjs");
 const {getMyTubeTopic,listMyTubeSubcategories,listMyTubeTopics}=
  await import("../lib/mandala/mytube-content-taxonomy.mjs");
 for(const [input,lang] of [["I want more energy","en"],["Хочу меньше тревоги","ru"],["Quiero más confianza","es"]]){
  const resolved=classifyMyTubeRequest(input,lang);
  assert.ok(resolved?.categoryId&&resolved?.subcategoryId&&resolved?.topicId,input);
  const found=getMyTubeTopic(resolved.topicId);
  assert.equal(found?.category.id,resolved.categoryId);
  assert.equal(found?.subcategory.id,resolved.subcategoryId);
 }
 for(const locale of ["en","ru","es"]){
  for(const category of ["goals-money","love-relationships","energy-confidence","stress-anxiety"]){
   const subs=listMyTubeSubcategories(category,locale);
   assert.equal(subs.length,4);
   assert.ok(subs.every(s=>listMyTubeTopics(category,s.id,locale).length===4));
  }
 }
});

test("preserve protected purpose-first Goal and adaptive Personalization to Concept",()=>{
 assert.match(studio,/useState<"personalization"\|"goal"\|"concept">\("goal"\)/);
 assert.match(studio,/disabled=\{!chosenIdeaGoal\} onClick=\{\(\)=>setIdeasSubtab\("personalization"\)\}/);
 assert.match(studio,/applyPurposePhrases\(chosenIdeaGoal\.type,ideasProfile\.supportNeed\|\|""\)/);
 for(const line of ['goalType==="leisure"','["desired","energy","name"]',
   '["current","desired","support","energy","name"]',
   '["current","desired","meaning","energy","name"]',
   'data-personalization-kind="energy-current" hidden={stage!=="energy"}',
   'data-video-personalization-energy={score}'])
   assert.ok(personal.includes(line),line);
 assert.match(personal,/className=\{css\.energyScale\}/);
 assert.match(personal,/energyStart:value\.energy>=1\?value\.energy:undefined/);
});

test("visible Free Film catalogue owns the guarded portrait-only recovery, not hidden legacy",()=>{
 const catalog=studio.indexOf('<section className={videoStyles.quickSection} data-free-film-compilation-catalog');
 const end=studio.indexOf("</section>",catalog);
 const retry=studio.indexOf("data-video-portrait-retry");
 const legacy=studio.indexOf("data-video-quick-legacy");
 assert.ok(catalog>=0&&end>catalog&&retry>catalog&&retry<end,
   "9:16 recovery must be visible beside the real licensed catalogue");
 assert.ok(legacy>end,"legacy controls must remain separate from visible film recovery");
 assert.equal((studio.match(/data-video-portrait-retry/g)||[]).length,1,
   "only one real guarded retry button may exist");
 assert.match(studio.slice(catalog,end),
   /portraitRetry\.edit,"portrait"\)/,"retry must compile the same approved source in physical 9:16");
 assert.match(mobile,/\.studio\[data-active-workspace\] \[data-video-quick-legacy\],/,
   "existing mobile CSS intentionally hides legacy controls");
 assert.match(mobile,/\[data-video-quick-start\]\{display:none\}/,
   "the hidden legacy group must not contain the recovery CTA");
});

test("Next uses a relevant canonical default for every approved card, never arbitrary first topic",async()=>{
 const {getMyTubeTopic}=await import("../lib/mandala/mytube-content-taxonomy.mjs");
 const choices=[...mirror.matchAll(/\{id:"([^"]+)",theme:"[^"]+",categoryId:"([^"]+)",image:"[^"]+",defaultTopicId:"([^"]+)"/g)];
 assert.equal(choices.length,12,"four cards in each of three tabs");
 assert.deepEqual(choices.slice(0,4).map(([,id,category])=>category),
  ["stress-anxiety","love-relationships","goals-money","energy-confidence"],
  "first-screen axis order must match the canonical MyTube and Telegram taxonomy");
 assert.match(mirror,/categoryLabels\.find\(category=>category\.id===item\.categoryId\)\?\.label/,
  "visible cards use real localized canonical category names");

 for(const [,card,category,topicId] of choices){
  const found=getMyTubeTopic(topicId);
  assert.ok(found,"default topic exists for "+card);
  assert.equal(found.category.id,category,"default topic stays in selected category for "+card);
 }
 assert.match(mirror,/const curated=getMyTubeTopic\(selected\.defaultTopicId\)/);
 assert.doesNotMatch(mirror,/const fallbackSub=subcategories\[0\]/);
});

test('owner reference: compact choices, readable wish and separate drafts per intent',()=>{
 assert.ok(mirror.includes('scopeWishes,setScopeWishes'));
 assert.ok(mirror.includes('onWishChange(scopeWishes[next]||""'));
 assert.ok(mirror.includes('type="text" maxLength={500}'));
 assert.ok(mirrorCss.includes('.promptRow input'));
 assert.ok(mirrorCss.includes('.choiceIcon'));
 assert.ok(mobile.includes('Magic Mirror owner reference 2026-11-21'));
 assert.ok(mobile.includes('.previewStage .therapyHeroLaunch{background:url('));
 for(const poster of ['sun-warm-ocean-dawn.jpg','heart-flow.jpg','lone-tree.jpg','sun-autumn-hills.jpg'])assert.ok(mirror.includes(poster));
});

test("Mirror quiz image URL survives category then subcategory and topic",()=>{
 assert.ok(mirror.includes('const mirrorPosterUrl=(image:string)=>image.startsWith("/")?image:'));
 assert.equal((mirror.match(/mirrorPosterUrl\(available\[index%available\.length\]\.image\)/g)||[]).length,2);
 assert.equal((mirror.match(/<img src=\{"\/videos\/holistic-house\/film-collection-v2\/"\+/g)||[]).length,0);
});

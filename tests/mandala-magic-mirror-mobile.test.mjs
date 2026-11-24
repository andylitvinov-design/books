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
 assert.doesNotMatch(mirror,/data-hh-mirror-audience=\{item\}/);
 assert.match(mirror,/data-hh-mirror-enter="me"/);
 assert.match(mirror,/data-hh-mirror-enter="others"/);
 assert.match(mirror,/data-hh-mirror-enter="work"/);
 assert.doesNotMatch(mirror,/data-hh-mirror-plan/);
 assert.match(mirror,/data-hh-mirror-tier-option=\{option.id\}/);
 assert.doesNotMatch(mirror,/data-hh-mirror-ideas-cta/);
 assert.match(mirror,/data-hh-mirror-open-advanced/);
 assert.match(mirror,/data-hh-mirror-guide-menu/);
 assert.match(mirror,/data-hh-mirror-back-landing/);
 assert.match(mirrorCss,/Owner 2026-11-23 · approved Goal Topic/);
 assert.match(browser,/async function revealMirrorAdvanced/);
 assert.match(browser,/await revealMirrorAdvanced\(page,engine\)/);
 assert.doesNotMatch(browser,/await expect\(moreGoals\)\.toBeVisible\(\{timeout:15000\}\)/);
 assert.match(mirror,/videoFormat,goalPurposeId\}\);/);
 for(const price of ["250","500","2000"])assert.ok(mirror.includes("credits:"+price));
 assert.match(mirrorCss,/\.destinationCards/);
 assert.match(mirrorCss,/\.formatRows/);
 assert.match(mirrorCss,/\.composerToolbar/);
 assert.match(mirrorCss,/reiki-approved-sunrise-v3\.webp/);
 assert.equal((mirror.match(/className=\{css\.destinationImage\}/g)||[]).length,3);
 assert.match(mirrorCss,/magic-mirror-owner-cards-20261123\.avif/);
 assert.match(mirror,/data-hh-mirror-wish/);
 assert.match(mirror,/data-hh-mirror-goal-choice=\{item\.id\}/);
 assert.match(mirror,/data-hh-mirror-next/);
 assert.ok(mirror.indexOf("data-hh-mirror-next")<mirror.indexOf("data-hh-mirror-goal-choice"),
  "Next belongs beside the wish field ABOVE all four cards");
 assert.match(mirrorCss,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(mirrorCss,/\.entry\{display:grid;grid-template-columns:minmax\(0,1fr\) auto/);
 assert.match(mobile,/Magic Mirror v3/);
 assert.match(mobile,/data-hh-mirror-video-preview="open"/);
 assert.match(mirror,/setIntroExpanded\(true\)/);
 assert.match(mirror,/data-hh-mirror-video-preview=\{introExpanded/);
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
 assert.match(studio,/setIdeasSubtab\("goal"\);setActiveWorkspace\("editor"\);setMontagePanel\("effects"\)/);
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
   '["current","desired","energy","name"]',
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
  ["love-relationships","goals-money","stress-anxiety","energy-confidence"],
  "owner-approved second-screen order keeps canonical MyTube category IDs");
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
 assert.ok(mirror.includes('rows={3} maxLength={500}'));
 assert.ok(mirror.includes("data-hh-mirror-composer"));
 assert.ok(mirrorCss.includes('.composer textarea'));
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

test("Format is Screen 2 before canonical Topic and Purpose; no early XP charge",()=>{
 const landing=mirror.slice(mirror.indexOf('if(screen==="landing")'),mirror.indexOf('if(screen==="purpose")'));
 const purpose=mirror.slice(mirror.indexOf('if(screen==="purpose")'),mirror.indexOf('if(screen==="format")'));
 const format=mirror.slice(mirror.indexOf('if(screen==="format")'),mirror.indexOf('return <section className={css.goals} data-hh-mirror-screen="topic"'));
 assert.equal((landing.match(/data-hh-mirror-enter="/g)||[]).length,3);
 for(const [id,next] of [["me","me"],["others","present"],["work","business"]])
  assert.match(landing,new RegExp('data-hh-mirror-enter="'+id+'"[^]*?onClick=\\{\\(\\)=>enterScreen\\("'+next+'"\\)\\}'));
 assert.ok(mirror.includes('formatTitle:"Choose a Creation Format"'));
 assert.ok(mirror.includes('therapy:"Video Therapy for Myself"'));
 assert.match(mirror,/useState<"landing"\|"purpose"\|"format"\|"topic">\("landing"\)/);
 assert.match(mirror,/const enterScreen=\(next:MirrorScope\)=>/);
 assert.match(mirror,/setScreen\("purpose"\)/);
 assert.match(mirror,/const continueFromGoal=\(\)=>/);
 assert.match(mirror,/setScreen\("format"\)/);
 assert.match(mirror,/const chooseFormat=\(next:MirrorVideoFormat\)=>/);
 const pick=mirror.slice(mirror.indexOf("const chooseFormat="),mirror.indexOf("const playExistingIntro="));
 assert.doesNotMatch(pick,/onComplete\(|fetch\(|confirmCredit\(/);
 assert.match(pick,/setVideoFormat\(next\)/);
 assert.match(pick,/setScreen\("topic"\)/);
 assert.match(mirror,/data-hh-mirror-selected-format=\{videoFormat\}/);
 assert.match(mirror,/const formatOptions=\[\{id:"pro",credits:500/);
 assert.match(mirrorCss,/grid-column:1\/-1;position:relative;isolation:isolate/);
 assert.match(mirror,/setVideoFormat\(next\)/);
 assert.match(mirror,/setScreen\("topic"\)/);
 assert.match(purpose,/<MandalaVideoIdeaGoal/);
 assert.match(purpose,/data-hh-mirror-purpose-step/);
 assert.match(purpose,/data-hh-mirror-back-purpose/);
 assert.match(purpose,/onContinue=\{continueFromGoal\}/);
 assert.match(format,/data-hh-mirror-back-format/);
 assert.equal((format.match(/data-hh-mirror-video-format=\{option\.id\}/g)||[]).length,1);
 assert.match(format,/onClick=\{\(\)=>chooseFormat\(option\.id\)\}/);
 assert.doesNotMatch(landing,/data-hh-mirror-plan|data-hh-mirror-video-format|formatOptions/);
 assert.doesNotMatch(purpose,/data-hh-mirror-video-format/);
 assert.doesNotMatch(format,/data-hh-mirror-plan|data-hh-mirror-ideas-cta/);
 for(const price of ["250","500","2000"])assert.ok(mirror.includes("credits:"+price));
 assert.match(mirror,/videoFormat,goalPurposeId/);
 assert.match(mirror,/useState<MirrorVideoFormat\|undefined>\(undefined\)/);
 assert.match(mirror,/data-hh-mirror-tier-option=\{option\.id\}/);
 assert.match(mirrorCss,/\.purposeScreen \[data-video-ideas-goal-picker\]/);
 assert.match(mirrorCss,/\.formatRows/);
 assert.match(mobile,/second screen reuses original Goal UI/i);
 assert.match(studio,/setPendingMirrorPurpose\(path\.goalPurposeId/);
 assert.match(studio,/setIdeasGoalChoice\(\{contextKey:personalGoalOptions\.contextKey,id:goal\.id\}\)/);
 assert.match(browser,/data-hh-mirror-purpose-step/);
 assert.match(browser,/data-hh-mirror-back-purpose/);
 const exportBrowser=read("scripts/benchmarking/first-video-live-export.mjs");
 assert.match(exportBrowser,/data-video-ideas-goal-choice="rest"/);
 assert.match(exportBrowser,/data-hh-mirror-video-format="basic"/);
});
test("direct Work selection shows its own localized Topic heading, not the gift heading",()=>{
 assert.match(mirror,/scope==="me"\?copy\.therapy:scope==="business"\?copy\.work:copy\.other/);
 assert.match(mirror,/scope==="me"\?copy\.therapyHint:scope==="business"\?copy\.workHint:copy\.otherHint/);
 for(const name of ['work:"Видео для работы"','work:"Videos for Work"','work:"Vídeos para el trabajo"'])
  assert.ok(mirror.includes(name),name);
});
test("owner goal step uses the actual three goal IDs and original editor",async()=>{
 const {buildPersonalVideoGoalOptions}=await import("../lib/mandala/video-personal-goal-composer.mjs");
 for(const locale of ["en","ru","es"]){
  const found=buildPersonalVideoGoalOptions({locale,theme:"energy"});
  assert.deepEqual(found.goals.map(goal=>goal.id),["rest","accept","reframe"]);
 }
 const reused=read("components/mandala-video-idea-goal.tsx");
 assert.match(reused,/continueLabel?:string/);
 assert.match(reused,/introOverride?:string/);
 assert.match(reused,/data-video-ideas-goal-choice={choice.id}/);
});

test("chosen format persists as planning state in original Studio, never a debit",()=>{
 assert.match(studio,/const \[mirrorPlannedFormat,setMirrorPlannedFormat\]=useState<MirrorResolution\["videoFormat"\]>\(undefined\)/);
 assert.match(studio,/setMirrorPlannedFormat\(path\.videoFormat\)/);
 assert.match(studio,/data-hh-mirror-planned-format=\{mirrorPlannedFormat\}/);
 const landing=mirror.slice(mirror.indexOf('if(screen==="landing")'),mirror.indexOf('if(screen==="purpose")'));
 const purpose=mirror.slice(mirror.indexOf('if(screen==="purpose")'),mirror.indexOf('if(screen==="format")'));
 assert.doesNotMatch(landing+purpose,/fetch\(|createQuickVideo\(|confirmCredit\(/);
});

test("Screen 3 preserves one video and shows three progress bulbs on each topic quiz stage",()=>{
 assert.match(mirror,/setScreen\("format"\);setPendingPath\(null\)/);
 assert.match(mirror,/data-hh-mirror-quiz-heading/);
 assert.match(mirror,/data-hh-mirror-quiz-lightbulb=\{number\}/);
 assert.match(mirror,/aria-current=\{step===number\?"step":undefined\}/);
 assert.equal((mirror.match(/data-hh-mirror-quiz-card\b/g)||[]).length,3);
 assert.match(mirror,/data-hh-mirror-own-description/);
 assert.match(mobile,/all three numbered-bulb quiz screens/);
 for(const text of ["Which goal topic","Какую тему цели","¿Qué tema de tu objetivo"])
  assert.ok(mirror.includes(text),text);
});

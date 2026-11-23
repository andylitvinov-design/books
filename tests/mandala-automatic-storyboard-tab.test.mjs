import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import catalog from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import original from "../data/video-catalog/original-motion-scenes-v1.json" with {type:"json"};
import {suggestVideoConcept} from "../lib/mandala/auto-video-concept.mjs";
import {STORY_PHOTO_BY_ID,isTrustedStoryPhoto,MYTUBE_SCENARIO_PHOTO_COVERAGE}
 from "../lib/mandala/story-photo-library.mjs";
import {storyboardPhotoReferences,STORYBOARD_REFERENCE_STATUS}
 from "../lib/mandala/storyboard-photo-references.mjs";
import {
  planReviewedFilmedStory,isReviewedFilmedStoryScene,isReviewedFilmedStorySequence
} from "../lib/mandala/reviewed-filmed-story.mjs";

const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const tab=readFileSync(new URL("../components/mandala-automatic-storyboard.tsx",import.meta.url),"utf8");
const sources=[...catalog.scenes,...original.scenes];
const byId=new Map(sources.map(s=>[s.id,s]));

test("Montage Story uses the Ideas concept and only reviewed film, not the retired questionnaire",()=>{
 const montage=studio.split("data-video-montage-concept aria-label=")[1]
   .split("</section> : null}")[0];
 assert.match(montage,/MandalaAutomaticStoryboard/);
 assert.doesNotMatch(montage,/deepVideoDirectorPane/);
 assert.match(tab,/suggestVideoConcept/);
 assert.match(tab,/planReviewedFilmedStory/);
 assert.match(tab,/isReviewedFilmedStorySequence/);
 assert.match(tab,/data-video-story-graphics-detected/);
 assert.match(tab,/data-video-auto-storyboard-list/);
 assert.match(tab,/data-video-story-scene/);
 assert.match(tab,/data-reviewed-filmed-only/);
 assert.match(studio,/applyAutoFilm\(preset.id,duration,edit,"portrait",true\)/);
 const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
 assert.match(browser,/automaticStoryboard=montageVideoConcept\.locator/);
 assert.match(browser,/data-video-story-scene/);
 assert.doesNotMatch(browser,/data-cinematic-director/);
});

test("30-second Story always uses six DISTINCT 5s verified filmed masters in all themes/languages",()=>{
 const categories=["goals-money","love-relationships","energy-confidence","stress-anxiety"];
 for(const categoryId of categories)for(const locale of ["ru","en","es"]){
   const plan=planReviewedFilmedStory({
     categoryId,locale,aspect:"portrait",durationSeconds:30,scenes:sources
   });
   assert.equal(plan.ok,true,categoryId+"/"+locale+": "+plan.status);
   assert.equal(plan.status,"REVIEWED_FILMED_STORYBOARD");
   assert.equal(plan.sourcePolicy,"filmed_editorially_verified_only");
   assert.equal(plan.shots.length,6);
   assert.deepEqual(plan.shots.map(s=>s.startMs),[0,5000,10000,15000,20000,25000]);
   assert.ok(plan.shots.every(s=>s.durationMs===5000&&!s.loopRequired));
   assert.equal(new Set(plan.shots.map(s=>s.sourceMasterKey)).size,6);
   assert.ok(plan.shots.every(s=>isReviewedFilmedStoryScene(byId.get(s.sceneId),"portrait")));
   assert.ok(plan.shots.every(s=>byId.get(s.sceneId)?.collection==="film-collection-v3"));
   assert.equal(plan.canExport,false);
   assert.equal(plan.publishAuthorized,false);
   assert.ok(isReviewedFilmedStorySequence({scenes:sources,aspect:"portrait",
      shots:plan.shots.map(s=>({sceneId:s.sceneId,startSeconds:s.startMs/1000,
        durationSeconds:s.durationMs/1000}))}));
 }
});

test("graphical MP4s, weak composites and forged licenses cannot enter the reviewed film plan",()=>{
 const graphical=original.scenes[0];
 const composite=catalog.scenes.find(s=>s.id==="lake-mist-dawn");
 const reviewed=catalog.scenes.find(s=>s.id==="sun-trees-forest");
 assert.ok(graphical);
 assert.ok(composite);
 assert.ok(reviewed);
 assert.equal(isReviewedFilmedStoryScene(graphical),false,"encoded animation is not camera footage");
 assert.equal(isReviewedFilmedStoryScene(composite),false,"unreviewed two-shot composite is not a filmed master");
 assert.equal(isReviewedFilmedStoryScene(reviewed),true);
 assert.equal(isReviewedFilmedStoryScene({...reviewed,technicalQuality:{...reviewed.technicalQuality,
   editorialApproved:false}}),false);
 assert.equal(isReviewedFilmedStoryScene({...reviewed,rightsReference:{
   ...reviewed.rightsReference,sourcePage:"https://unapproved.invalid/video/"}}),false);
 assert.equal(isReviewedFilmedStoryScene({...reviewed,poster:"https://example.com/art.jpg"}),false);
 const plan=planReviewedFilmedStory({
   categoryId:"energy-confidence",locale:"en",aspect:"portrait",durationSeconds:30,
   scenes:[graphical,composite,reviewed]
 });
 assert.equal(plan.ok,false);
 assert.equal(plan.status,"INSUFFICIENT_REVIEWED_FILMED_FOOTAGE");
 assert.deepEqual(plan.shots,[]);
});

test("previous montage with one illustrated shot cannot masquerade as reviewed footage",()=>{
 const plan=planReviewedFilmedStory({
   categoryId:"love-relationships",locale:"en",aspect:"portrait",durationSeconds:30,scenes:sources
 });
 assert.equal(plan.ok,true);
 const shots=plan.shots.map(s=>({
   sceneId:s.sceneId,startSeconds:s.startMs/1000,durationSeconds:s.durationMs/1000
 }));
 assert.ok(isReviewedFilmedStorySequence({shots,scenes:sources}));
 assert.equal(isReviewedFilmedStorySequence({
   shots:[...shots.slice(0,2),{...shots[2],sceneId:original.scenes[0].id},...shots.slice(3)],
   scenes:sources
 }),false);
 assert.equal(isReviewedFilmedStorySequence({
   shots:[shots[0],{...shots[1],sceneId:shots[0].sceneId}],
   scenes:sources
 }),false,"duplicate footage is not a second distinct shot");
 assert.equal(isReviewedFilmedStorySequence({
   shots:[{...shots[0],durationSeconds:7}],scenes:sources
 }),false,"do not stretch a five-second source");
});

test("no cartoon fallback for 60s when only eight distinct filmed sources exist",()=>{
 const plan=planReviewedFilmedStory({
  categoryId:"goals-money",locale:"ru",aspect:"portrait",durationSeconds:60,scenes:sources
 });
 assert.equal(plan.ok,false);
 assert.equal(plan.status,"INSUFFICIENT_REVIEWED_FILMED_FOOTAGE");
 assert.equal(plan.requiredUniqueMasters,12);
 assert.ok(plan.availableUniqueMasters<12);
 assert.equal(plan.shots.length,0);
});

test("love as an Ideas topic still produces six filmed story cards",()=>{
 const c=suggestVideoConcept({locale:"ru",goal:"любовь и отношения",theme:"relationships"});
 assert.equal(c.categoryId,"love-relationships");
 const plan=planReviewedFilmedStory({
   categoryId:c.categoryId,locale:"ru",aspect:"portrait",durationSeconds:30,scenes:sources
 });
 assert.equal(plan.ok,true);
 assert.equal(plan.shots.length,6);
 assert.ok(plan.shots.every(s=>byId.get(s.sceneId)?.media==="licensed_mp4"));
});

test("all 256 canonical film scenarios display six distinct real photographic references, not six schematic placeholders",()=>{
 const scenarios=Object.keys(MYTUBE_SCENARIO_PHOTO_COVERAGE);
 assert.equal(scenarios.length,256);
 for(const scenarioId of scenarios){
  const categoryId=MYTUBE_SCENARIO_PHOTO_COVERAGE[scenarioId].categoryId;
  const photos=storyboardPhotoReferences({scenarioId,categoryId,shotCount:6});
  assert.equal(photos.length,6,scenarioId);
  assert.ok(photos.every(photo=>photo&&isTrustedStoryPhoto(photo)),scenarioId);
  assert.equal(new Set(photos.map(photo=>photo.id)).size,6,scenarioId);
  assert.ok(photos.every(photo=>photo.src==="/api/video/story-photo/"+photo.id),
    "only the same-origin licensed photo proxy is allowed");
 }
});

test("Making Room for Love has six DIFFERENT action-near photographs, still explicitly unverified for MP4",()=>{
 const photos=storyboardPhotoReferences({
  scenarioId:"ready-relationship-s1",categoryId:"love-relationships",shotCount:6
 });
 assert.deepEqual(photos.map(photo=>photo?.id),[
  "pexels-36113252","pexels-13410205","pexels-7747182",
  "pexels-40043387","pexels-37713503","pexels-17123438"
 ]);
 assert.ok(photos.every(photo=>STORY_PHOTO_BY_ID.get(photo.id)===photo));
 assert.equal(STORYBOARD_REFERENCE_STATUS,"editorial_photo_reference_not_action_verified");
 assert.match(tab,/getMyTubeScenarioPhotos|storyboardPhotoReferences/);
 assert.match(tab,/data-storyboard-reference-only/);
 assert.match(tab,/data-storyboard-reference-photo/);
 assert.match(tab,/data-storyboard-reference-status/);
 assert.match(tab,/data-storyboard-reference-count/);
 assert.match(tab,/data-story-media-kind=\{photo\?"photo":shot\?"video":reference\?"reference":"missing"\}/);
 assert.match(tab,/data-storyboard-media-ready=\{manualFiveReady\|\|eligible\|\|photoAdaptationApplied\}/,
  "photo reference is NOT the licence, matched action or permission to generate MP4");
 assert.match(tab,/v3RequiresActionProof/);
 assert.doesNotMatch(tab,/onApply\(references|onApply\(storyboardPhotoReferences/,
  "reference photos must never silently be handed off to renderer");
});

test("preview references fail closed on unknown scenario/categories and people exclusion",()=>{
 assert.deepEqual(storyboardPhotoReferences({scenarioId:"unknown",categoryId:"unknown",shotCount:6}),
  [null,null,null,null,null,null]);
 assert.deepEqual(storyboardPhotoReferences({shotCount:99}),[]);
 const withoutPeople=storyboardPhotoReferences({scenarioId:"ready-relationship-s1",
  categoryId:"love-relationships",shotCount:6,avoidImagery:["no people"]});
 assert.ok(withoutPeople.every(photo=>!photo||!photo.tags.some(tag=>
  /^(?:people|person|man|woman|women|men|couple|friend|hands|family|crowd|child|walking)$/.test(tag))));
});


test("real photograph reference remains separate from opt-in six-photo rendering authorization",()=>{
 // A photo-reference label is not an exported MP4.
 assert.match(tab,/storyboardPhotoReferences\(\{/);
 assert.match(tab,/data-storyboard-reference-only/);
 assert.match(tab,/data-storyboard-photo-reference-label/);
 assert.match(tab,/onPhotoLoaded/);
 assert.match(tab,/naturalWidth>=600&&img\.naturalHeight>=600/);
 assert.match(tab,/onPhotoUnavailable/);
 assert.match(tab,/const referencesDecoded=hasSixPhotoReferences/);
 assert.match(tab,/const photoAdaptationApplied=Boolean\(hasSixPhotoReferences/);
 assert.match(tab,/data-storyboard-apply-reference-photos/);
 assert.match(tab,/disabled=\{disabled\|\|!referencesDecoded\}/);
 assert.match(tab,/if\(!referencesDecoded\|\|references\.some\(photo=>!photo\|\|!isTrustedStoryPhoto\(photo\)\)\)return/);
 assert.match(tab,/sourceMasterKey:photo!\.id/);
 assert.match(tab,/startMs:index\*5000/);
 assert.match(tab,/durationMs:5000,sourceDurationMs:5000/);
 assert.match(tab,/depictedEventVerified:false as const/);
 assert.match(tab,/if\(onApply\(photoShots,concept,storyKey/);
 assert.match(tab,/data-storyboard-user-selected-photo-interpretation/);
 assert.match(tab,/user_approved_symbolic_photo_montage/);
 assert.match(tab,/data-reviewed-filmed-only=\{!proposalHasPhotos&&!photoAdaptationApplied\}/);
 assert.match(tab,/\(!hasSixPhotoReferences\|\|photoAdaptationApplied\|\|eligible\)/);
 assert.doesNotMatch(tab,/setAppliedStoryKey\(/,
  "Story only proposes, while the existing trusted Studio onApply saves user intent");
 // No automatic conversion on mount, no fabricated render or extra charge:
 const photoFlow=tab.slice(tab.indexOf("data-storyboard-apply-reference-photos"),
   tab.indexOf("data-storyboard-user-selected-photo-interpretation"));
 assert.ok(photoFlow.includes("onClick={() =>")||photoFlow.includes("onClick={()=>"));
 assert.doesNotMatch(photoFlow,/videoCreditRequest|fetch\(|navigator\.sendBeacon|window\.location=/);
 for(const id of storyboardPhotoReferences({
  scenarioId:"ready-relationship-s1",categoryId:"love-relationships",shotCount:6
 }).map(photo=>photo.id)){
  assert.ok(STORY_PHOTO_BY_ID.has(id),"only existing source-page-reviewed Pexels used");
 }
});

test("six selected, actual decoded JPEGs may use original MP4 renderer in 9:16 or 16:9 only",()=>{
 const source=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
 assert.match(tab,/data-storyboard-photo-output-aspect/);
 assert.match(tab,/const \[photoOutputAspect,setPhotoOutputAspect\]=useState<"portrait"\|"landscape">/);
 assert.match(tab,/onClick=\{\(\)=>setPhotoOutputAspect\(format\)\}/);
 assert.match(tab,/aspect===photoOutputAspect/);
 assert.match(tab,/photoOutputAspect\)\)onChooseQuality\(true\)/);
 assert.match(source,/if\(\(aspect!=="portrait"&&aspect!=="landscape"\)\|\|clipIds.length<4/);
 assert.match(source,/return photo\? !isTrustedStoryPhoto\(photo\)\|\|/);
 assert.match(source,/\(aspect!=="portrait"&&aspect!=="landscape"\)/);
 assert.match(source,/\(aspect==="portrait"\|\|aspect==="landscape"\)&&/);
 assert.match(source,/applyAutoFilm\(preset.id,duration,edit,outputAspect,true\)/);
 assert.match(css,/\.storyPhotoAspectChoices\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\[aria-pressed="true"\]/);
 assert.doesNotMatch(tab,/onApply\(references,/);
 assert.match(tab,/depictedEventVerified:false as const/);
});

test("six photo references require explicit approval before quality navigation",()=>{
 assert.match(tab,/const photoApprovalRequired=hasSixPhotoReferences&&durationSeconds===30&&!photoAdaptationApplied/);
 assert.match(tab,/data-storyboard-photo-approval-required/);
 assert.match(tab,/if\(photoApprovalRequired\)\{onChooseQuality\(false\);return;\}/);
 const quality=studio.slice(studio.indexOf("onChooseQuality={sourceReady=>"),studio.indexOf("onOpenIdeas={()=>",studio.indexOf("onChooseQuality={sourceReady=>")));
 assert.match(quality,/if\(!sourceReady\)\{/);
 assert.match(quality,/data-storyboard-apply-reference-photos/);
 const next=studio.slice(studio.indexOf("const continueMontageOrGenerate="),studio.indexOf("const continueToIdeas =",studio.indexOf("const continueMontageOrGenerate=")));
 assert.match(next,/setMontagePanel\("promo"\)/);
 assert.doesNotMatch(next,/data-storyboard-media-ready/,
   "Navigation to Extra must remain available; only the actual encoder is blocked");
 assert.match(studio,/const startFromHero=\(\)=>\{\s*if\(storySourcePendingRef\.current\)/);
});

test("unfinished Story source selection blocks direct Ready export across tab navigation",()=>{
 assert.match(tab,/onApprovalRequiredChange\?:\(pending:boolean\)=>void/);
 assert.match(tab,/const storyboardSourcesPending=!manualFiveReady&&!eligible&&!photoAdaptationApplied/);
 assert.match(tab,/onApprovalRequiredChange\?\.\(storyboardSourcesPending\)/);
 assert.match(studio,/const storySourcePendingRef=useRef\(false\)/);
 assert.match(studio,/onApprovalRequiredChange=\{pending=>\{/);
 assert.ok(studio.includes("const independentCatalogSource=Boolean(usingFreeFilmCompilation&&freeFilmSourcesListed&&"),
   "a separately selected verified 4-MP4 film remains usable after visiting Story settings");
 assert.ok(studio.includes("cinematicPlan?.shots.every(shot=>!STORY_PHOTO_BY_ID.has(shot.sceneId))"),
   "unapproved photo Story media cannot masquerade as independent verified footage");
 assert.match(studio,/else if\(!independentCatalogSource\)storySourcePendingRef\.current=true/);
 assert.match(studio,/if\(!sourceReady\)\{\s*\/\/ A visitor[\s\S]*?storySourcePendingRef\.current=true;/);
 assert.match(studio,/const createQuickVideo = \(\) => \{\s*if\(storySourcePendingRef\.current\)/);
 assert.match(studio,/const startFromHero=\(\)=>\{\s*if\(storySourcePendingRef\.current\)/);
 assert.match(studio,/storySourcePendingRef\.current=false; \/\/ New explicit Express recipe/);
});

test("Story visibly links chosen captions to the six real shots and opens the existing Text editor",()=>{
 assert.match(tab,/const linkedPhraseCount=guides\.scenes\.filter/);
 assert.match(tab,/data-storyboard-phrase-summary/);
 assert.match(tab,/data-storyboard-has-phrase=\{Boolean\(sourcePhrase\)\}/);
 assert.match(tab,/data-storyboard-scene-phrase data-storyboard-edit-phrase=\{index\+1\}/);
 assert.match(tab,/onEditPhrase:\(phrase:string\)=>void/);
 assert.match(tab,/onClick=\{\(\)=>onEditPhrase\(sourcePhrase\)\}/);
 assert.match(tab,/<Pencil size=\{15\} aria-hidden="true"\/>/);
 assert.match(studio,/onEditPhrase=\{phrase=>\{/);
 assert.match(studio,/flushSync\(\(\)=>setMontagePanel\("text"\)\)/);
 assert.match(studio,/querySelector<HTMLElement>\('\[data-video-montage-text\]'\)/);
 assert.match(studio,/querySelector<HTMLButtonElement>\('\[data-video-idea-edit-button\]'\)\?\.click\(\)/);
 assert.match(studio,/querySelector<HTMLInputElement>\('\[data-video-idea-edit\]'\)\?\.focus\(\)/);
 const textPanel=studio.slice(studio.indexOf('data-video-montage-text hidden='),studio.indexOf('data-video-montage-text-tools'));
 assert.match(textPanel,/<MandalaVideoIdeas/);
 assert.match(textPanel,/onChange=\{setAffirmations\}/);
 assert.match(css,/\.storyAutoPhraseEdit:focus-visible/);
 assert.match(css,/\.storyAutoCard\[data-storyboard-has-phrase="true"\]/);
 assert.match(css,/@media\(max-width:350px\)/);
 const actualEditor=readFileSync(new URL("../components/mandala-video-ideas.tsx",import.meta.url),"utf8");
 assert.match(actualEditor,/data-video-idea-phrase=\{index\}/);
 assert.match(actualEditor,/data-video-idea-edit-button=\{index\}/);
 assert.match(actualEditor,/data-video-idea-edit=\{index\}/);
 // Opening Text does not render, charge or mutate phrases:
 const callback=studio.slice(studio.indexOf("onEditPhrase={phrase=>{"),studio.indexOf("onApprovalRequiredChange={pending=>"));
 assert.doesNotMatch(callback,/fetch\(|videoCreditRequest|createVideo\(|setAffirmations\(/);
});

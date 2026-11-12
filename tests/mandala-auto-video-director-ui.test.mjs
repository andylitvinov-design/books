import test from "node:test";
import "./free-film-source-loader.test.mjs";
import "./mandala-video-ideas-eight-axes.test.mjs";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateMontageClips} from "../lib/mandala/video-montage-sources.mjs";
import {recommendPromptShotPlan} from "../lib/mandala/prompt-shot-director.mjs";

const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const director=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
const policy=readFileSync(new URL("../lib/mandala/auto-video-director.mjs",import.meta.url),"utf8");

test("Auto Director reuses the one studio renderer and precedes the real result",()=>{
 assert.ok(studio.includes("<MandalaAutoVideoDirector"));
 assert.ok(studio.indexOf('data-video-quick-audio-choices') < studio.indexOf("<MandalaAutoVideoDirector"));
 assert.ok(studio.indexOf("<MandalaAutoVideoDirector") < studio.indexOf('id="personal-video-result"'));
 assert.ok(studio.includes("compileFreeFilmPreset(preset,locale,seconds"));
 assert.match(studio,/onApply=\{\(presetId,seconds,edit,options\)=>[\s\S]{0,190}applyAutoFilm\(presetId,seconds,edit,aspect,options\?\.keepGoalFlow\)/);
 assert.match(studio,/goalContinueRef=\{goalContinueRef\}/);
 assert.match(director,/goalContinueRef\.current=prepareGoalForIdeas/);
 assert.ok(studio.includes("setPracticeLevels(value=>({...value,video:\"basic\"}))"));
});
test("only one goal input, a visible proposal and a confirmation gate",()=>{
 assert.ok(director.includes("data-auto-video-director"));
 assert.ok(director.includes("data-auto-video-input"));
 assert.ok(director.includes("data-auto-video-confirm"));
 assert.ok(director.includes("recommendAutoVideo({goal,locale,fallbackTheme:theme,presets,scenes})"));
 assert.ok(director.includes("data-auto-video-category={item.id}"));
 assert.ok(director.includes('data-auto-video-goal={variant==="subcategory"?item.id:undefined}'));
 assert.ok(studio.includes('scenes={FREE_FILM_CATALOG}'));
 assert.ok(director.includes('scene.description[locale]'));
 assert.ok(director.includes('scene.tags.slice(0,3)'));
 assert.ok(director.includes("onClick={()=>chooseCategory(item.theme,item.id)}"));
 assert.ok(director.includes("setSelectedTopicId(topicId)"));
 assert.ok(director.includes("onGoalChange(nextGoal)"));
 assert.ok(!studio.includes("<input data-video-quick-wish"));
 assert.ok(director.includes("onApply(chosen.id,length"),"confirmation applies real edited clips and stage durations");
 assert.ok(director.includes("data-auto-video-story-options"));
 assert.ok(director.includes("data-auto-video-option={id}"));
 assert.ok(director.includes("aria-pressed={chosen.id===id}"));
 assert.ok(director.includes("proposalContext?.goal===goal"));
 assert.ok(studio.includes("setWish(next.slice(0,800))"),"retain full 800-character context and trailing spaces while editing");
 assert.ok(!studio.includes("setWish(graphemeTrim(next))"),"do not trim the final word boundary");
 assert.ok(studio.includes("aspect={aspect}"),"retain user-selected aspect");
});
test("recommendation never initiates external paid generation or user-data upload",()=>{
 assert.ok(policy.includes("paidRenderApproved:false"));
 assert.ok(policy.includes("noExternalClientData:true"));
 assert.ok(!director.includes("fetch("));
 assert.ok(!director.includes("providerApi"));
 assert.ok(!policy.includes("localStorage"));
 assert.ok(!policy.includes("sessionStorage"));
});

test("iPhone goal fields stay at native scale and the browser retries real codec options",()=>{
 const style=readFileSync(new URL("../components/mandala-auto-video-director.module.css",import.meta.url),"utf8");
 const free=readFileSync(new URL("../components/mandala-first-video-start.module.css",import.meta.url),"utf8");
 assert.match(style,/\.goal input\{[^}]*font-size:16px/);
 assert.match(style,/\.storyChoices button\[aria-pressed="true"\]/);
 assert.match(free,/iOS Safari zooms any editable control/);
 assert.match(studio,/forceMp4:forceMp4ForRetry\|\|\(isApplePhone&&!preferWebm\)/);
 assert.match(studio,/data-video-retry-compatible/);
 assert.match(studio,/data-video-save-direct/);
 assert.match(studio,/data-mandala-video-preview/);
});

test("owner's iPhone mock uses ONE live player, one shared goal and four pictured story options",()=>{
 const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
 const autoCss=readFileSync(new URL("../components/mandala-auto-video-director.module.css",import.meta.url),"utf8");
 const taxonomy=JSON.parse(readFileSync(new URL("../data/video-catalog/scene-taxonomy.json",import.meta.url),"utf8"));
 assert.equal((studio.match(/data-video-director-goal-controls/g)||[]).length,1,
   "the theme card provides exactly one portal host for the actual Director input");
 assert.match(director,/createPortal\(goalPanel,goalTarget\)/,
   "the same interactive goal controls move to the theme card; no second goal state");
 assert.equal((director.match(/data-auto-video-input value=\{requestDraft\}/g)||[]).length,1);
 assert.match(director,/const videoGoalCategories=\[/);
 assert.match(director,/data-auto-video-category=\{item.id\}/);
 assert.match(director,/data-auto-video-topic-panel/);
 assert.match(director,/taxonomySubcategories\.map\(item=>/);
 assert.match(director,/taxonomyTopics\.map\(item=>/);
 assert.match(director,/taxonomyScenarios\.length===4/);
 assert.match(director,/const STSE_ENABLED=process\.env\.NEXT_PUBLIC_HH_STSE_ENABLED!=="false"/);
 assert.match(director,/const STSE_DRAFTS_ENABLED=STSE_ENABLED&&process\.env\.NEXT_PUBLIC_HH_STSE_CONTENT_EXPANSION_ENABLED==="true"/);
 assert.match(director,/allowEditorialDrafts=\{false\}/);
 assert.match(director,/listMyTubeMotifScenarios\(selectedTopicId,selectedMeaningAxisId,selectedMotifId,locale\)/);
 assert.match(director,/data-stse-media-unbound/);
 assert.match(director,/data-mytube-scenario=\{scenario.id\}/);

 assert.match(director,/taxonomySubcategories\.map\(item=>/);
 assert.match(director,/data-auto-video-clarify/);
 assert.match(director,/data-auto-video-refine-panel/);
 assert.match(director,/data-auto-video-option=\{id\}/);
 assert.match(director,/scenePoster\(option\.clips\[0\]\)/);
 assert.match(director,/scenePoster\(clip\)/);
 assert.match(director,/data-auto-video-create/);
 assert.match(studio,/onCreate=\{createQuickVideo\}/,"the button calls the existing local MediaRecorder path");
 assert.match(studio,/canCreate=\{canStartSelectedFilm\}/,
   "The real iPhone Create control must remain tappable for audio/photo consent");
 assert.match(studio,/createFeedback=\{preparing\|\|exportUnavailable\?notice:""\}/,
   "real decoder/preparation errors remain visible beside the Create action");
 assert.match(studio,/prepareFourFilmSources\(freeFilmShots,freeFilmPlayerRefs\.current/,
   "the four approved MP4s must prime after a user tap");
 assert.match(studio,/data-video-result-empty/);
 assert.match(studio,/data-video-result-play/);
 assert.match(studio,/resultVideoRef\.current/);
 assert.match(studio,/function toggleQuickMusic\(choice:PresetId\)/);
 assert.match(studio,/data-video-quick-music-check=\{id\}/);
 assert.match(studio,/data-video-quick-music-play=\{id\}/);
 assert.match(studio,/startPresetMixAudio\(attachedAudio\.ids,soundVolume,\{startSeconds:effectiveAudioStartSeconds,deferStart:true\}\)/);
 assert.match(studio,/featuredMelodies\.slice\(0,3\)/);
 assert.match(studio,/const featuredMelodies=rankPersonalMusic/);
 assert.match(studio,/selectScenarioMusic\(preset\.id\)/,"confirmed film assigns a real first-party soundtrack only when auto-music is enabled");
 assert.match(studio,/const musicContext=\{[\s\S]*?theme:audioTheme,wish/);
 assert.match(studio,/\.\.\.musicContext,kind:"melody"/);
 assert.match(studio,/featuredMelodies\.slice\(0,3\)/);
 assert.match(studio,/data-video-theme-advanced/,"existing six topical video scenes remain editable");
 assert.match(css,/\.studio \.quickBuilder>\.previewStage\{order:1/);
 assert.match(css,/\[data-video-quick-section="1"\]\{order:3/);
 assert.match(css,/\[data-video-topic-section\]\{order:4/);
 assert.match(css,/data-active-workspace="phrases"/);
 assert.match(css,/\[data-auto-video-director\]\{order:5/);
 assert.match(css,/\[data-video-result\]/);
 assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/,
   "six workspaces fit into one mobile row");
 assert.match(autoCss,/\.storyChoices\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(autoCss,/\.shots\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 const approved=taxonomy.scenes.filter(scene=>scene.status==="approved");
 assert.equal(approved.length,56);
 assert.ok(approved.every(scene=>scene.poster?.startsWith("/videos/holistic-house/")&&
   scene.poster.endsWith(".jpg") && scene.video.endsWith(".mp4")));
});

test("mobile six workspaces use short locale labels without changing full panel titles",()=>{
 const labels={
  ru:["Цель","Идеи","Гипноэффект","Курс практик","Монтаж","PRO"],
  en:["Goal","Ideas","Hypno effect","Practice course","Montage","PRO"],
  es:["Objetivo","Ideas","Efecto hipno","Curso práctico","Montaje","PRO"],
 };
 const source=studio.slice(studio.indexOf("const workspaceCopy ="),studio.indexOf("const workspaceTabs="));
 for(const language of Object.keys(labels)){
   const start=source.indexOf(" "+language+":{");
   const next=language==="ru"?source.indexOf(" en:{",start):language==="en"?
     source.indexOf(" es:{",start):source.indexOf("} as const;",start);
   assert.ok(start>=0&&next>start,"localized workspace "+language);
   const group=source.slice(start,next);
   for(const label of labels[language])assert.ok(group.includes('tab:"'+label+'"'),language+" "+label);
 }
 assert.match(studio,/aria-pressed=\{activeWorkspace===item\.id\|\|\(activeWorkspace==="practices"&&item\.id==="ready"\)\|\|\(!activeWorkspace&&item\.id==="video"\)\}/,
   "Ready highlights the retained course planner and Goal stays selected at entry");
});

test("desktop keeps six themes while iPhone uses four canonical MyTube goals",()=>{
 const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
 assert.match(studio,/quickThemeAdvancedRef=useRef<HTMLDetailsElement>\(null\)/);
 assert.match(studio,/window\.matchMedia\("\(min-width: 760px\)"\)/);
 assert.match(studio,/quickThemeAdvancedRef\.current\.open=large\.matches/);
 assert.match(studio,/data-video-theme-advanced/);
 assert.match(css,/@media\(min-width:760px\)\{[\s\S]*?\.quickThemeAdvanced>summary\{display:none\}/);
 assert.match(css,/\.quickThemeAdvanced \.quickThemeRail\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
});

test("the selected real soundtrack is synchronized with the original central Canvas Play",()=>{
 assert.match(studio,/if\(activeWorkspace!=="phrases"&&!previewPlaying\)startMovieSound\(attachedAudio,soundVolume,previewSeekSeconds>=duration\?0:previewSeekSeconds\)/,
   "selected audio must begin from the same trusted Play tap on Safari");
 assert.match(studio,/if\(previewPlaying\)\{stopMovieSound\(\);setPreviewPlaying\(false\);\}/,
   "pausing the video must pause its selected native audio");
 assert.match(studio,/function playQuickTrack\(choice:PresetId\)/,
   "retain the existing one user-gesture audio player");
 assert.match(studio,/const openAffirmationPreview = \(\) => \{\s*if\s*\(recording \|\| preparing\) return;[\s\S]*?if\(activeWorkspace!=="phrases"&&!previewPlaying\)startMovieSound\(attachedAudio,soundVolume,previewSeekSeconds>=duration\?0:previewSeekSeconds\);\s*setPreviewPlaying\(true\)/,
   "Play never starts audio during export; Ideas has an intentionally silent visual preview");
});

// Regression from #2900: four real preview cards must appear before the first click.
test("approved home displays a source-backed example before rendering",()=>{
 assert.match(director,/recommendAutoVideo\(\{goal,locale,fallbackTheme:theme,presets,scenes\}\)/);
 assert.match(director,/const videoGoalCategories=\[/);
 assert.match(director,/const taxonomySubcategories=listMyTubeSubcategories\(selectedCategoryId,locale\)/);
 assert.match(director,/data-auto-video-topic-panel/);
 assert.match(director,/data-auto-video-category=\{item.id\}/);
 assert.match(director,/data-auto-video-preview-example/);
 assert.match(director,/data-auto-video-story-options/);
 assert.match(director,/data-auto-video-storyboard/);
 assert.match(director,/data-auto-video-confirm/);
 assert.match(director,/data-auto-video-create/);
});

test("four canonical goal pills, exclusive subcategories and real scenario/audio continuation",()=>{
 const css=readFileSync(new URL("../components/mandala-auto-video-director.module.css",import.meta.url),"utf8");
 assert.match(css,/\.goalPanel \.goalChoices\{\s*display:flex;flex-wrap:nowrap/,"five scrollable mobile goal pills override the former four columns");
 assert.match(css,/\.topicChoices\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(director,/scenePoster\(item.poster\)/,"goal categories are text-only; film choices keep original artwork");
 assert.match(director,/data-auto-video-subcategories/);
 assert.match(director,/selectedGoalIds.length<2/);
 for(const id of ["confidence","connection","fresh-start","stability","calm","vitality"])
   assert.match(director,new RegExp('(?:\\b|")'+id+'(?:\\b|")'));
 assert.match(director,/onCategoryChange\?\.\(nextTheme\)/);
 const topicHandler=director.slice(director.indexOf("const chooseReadyGoal="),
   director.indexOf("const chooseCategory="));
 assert.ok(topicHandler.includes("const selectedTheme="),"subtopics inherit the active category");
 const taxonomyHandler=director.slice(director.indexOf("const chooseTaxonomyTopic="),
   director.indexOf("const chooseTaxonomyScenario="));
 assert.ok(taxonomyHandler.includes("const nextTheme=legacyThemeForSubcategory[found.subcategory.id]||theme"));
 assert.doesNotMatch(topicHandler,/setSelectedCategoryId\(/,
   "choosing a topic must not silently replace the selected high-level goal");
 assert.match(director,/onGoalChange\(nextGoal\)/);
 assert.match(director,/setProposal\(recommendAutoVideo\(\{goal:nextGoal/);
 assert.match(director,/onContinue\?\.\(\)/);
 assert.match(studio,/onContinue=\{\(\)=>\{/);
 assert.match(studio,/setActiveWorkspace\("phrases"\)/);
 assert.match(studio,/data-video-phrase-audio-shortcut/);
 assert.ok(studio.includes("data-video-phrase-audio-shortcut") && studio.includes("setPhraseAudioExpanded(true)") && studio.includes("data-video-ideas-advanced-voice"), "the visible Ideas shortcut opens the current advanced voice disclosure");
 assert.equal((director.match(/data-auto-video-input value=\{requestDraft\}/g)||[]).length,1);
 assert.equal((studio.match(/data-mandala-cinematic-canvas/g)||[]).length,1);
 assert.match(studio,/data-video-advanced-toggle/);
});

test("Free help opens the ONE production AI Director without adding a second player or hidden paid action",()=>{
 const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
 assert.equal((studio.match(/<MandalaVideoDirectorChat/g)||[]).length,1,
   "the existing #2913 AI chat is preserved exactly once");
 assert.match(studio,/data-video-director-chat-details/);
 assert.match(studio,/open=\{directorChatOpen\}/);
 assert.match(studio,/onToggle=\{event=>setDirectorChatOpen\(event\.currentTarget\.open\)\}/);
 assert.match(studio,/onClarify=\{\(\)=>\{/);
 assert.match(studio,/setDirectorChatOpen\(true\)/);
 assert.match(director,/aria-expanded=\{onClarify\?helpOpen:refineOpen\}/);
 assert.match(director,/if\(onClarify\)\{onClarify\(\);return;\}/);
 assert.match(css,/\.directorChatDetails:not\(\[open\]\)\{display:none!important\}/);
 assert.equal((studio.match(/data-mandala-cinematic-canvas/g)||[]).length,1);
 assert.match(studio,/onCreate=\{createQuickVideo\}/);
 assert.match(studio,/onConfirm=\{\(\{scenario\}\)=>\{/);
 assert.match(studio,/scenario\.readyToExecute/);
 assert.match(studio,/onGoalChange=\{next=>\{setWish\(next\.slice\(0,800\)\)/);
});

test("audio guidance remains actionable from both the compact Video screen and Support Phrases",()=>{
 const style=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
 assert.match(studio,/if\(anchor==="video-audio"\|\|anchor==="voice-studio"\|\|anchor==="video-templates"\)\s+setShowAdvancedVideo\(true\)/);
 assert.match(studio,/if\(hash==="video-audio"\|\|hash==="voice-studio"\|\|hash==="video-templates"\)\s+setShowAdvancedVideo\(true\)/);
 assert.match(studio,/activeWorkspace==="video" \? deepAudioPane : null/);
 assert.match(studio,/activeWorkspace==="phrases" \? deepAudioPane : null/);
 assert.match(style,/data-active-workspace="phrases"[\s\S]*?data-video-quick-audio-choices/);
 assert.match(studio,/data-video-phrase-audio-shortcut/);
 assert.equal((studio.match(/id="video-audio"/g)||[]).length,1);
});


test("Holistic Light mobile overrides the legacy small-card grid without adding a second renderer",()=>{
 const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
 const autoCss=readFileSync(new URL("../components/mandala-auto-video-director.module.css",import.meta.url),"utf8");
 assert.match(css,/Holistic Light — Warm & Alive, owner-approved 02 Nov 2026/);
 assert.match(css,/aspect-ratio:1\.54\/1!important/,"hero no longer uses a narrow 2.78:1 strip");
 const finalNavCss=css.slice(css.lastIndexOf("/* Owner 03 Nov:"));
 assert.match(finalNavCss,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/,
   "the latest mobile cascade restores six tabs in one row");
 const finalGoalCss=autoCss.slice(autoCss.lastIndexOf("/* Owner-approved 03 Nov Video Studio first screen:"));
 assert.match(finalGoalCss,/\.goalPanel \.goalChoices\{\s*display:flex;flex-wrap:nowrap/,
   "five photo-free goal buttons scroll horizontally instead of using tall cards");
 assert.match(finalGoalCss,/\.subcategories \.topicChoices\{\s*display:flex;flex-wrap:nowrap/,
   "subtopics use one horizontal swipe rail with two real selections");
 assert.match(finalGoalCss,/\.popularTopics\{\s*display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/,
   "popular recommendations are visible before typing");
 assert.match(finalGoalCss,/\.storyChoices\{\s*display:grid;grid-template-columns:none;grid-auto-flow:column/,
   "four licensed story previews appear in one horizontal row");
 assert.match(finalGoalCss,/\.topicPanel \.topicInput input\{\s*min-height:56px;height:56px/,
   "iPhone text entry stays at readable 16px below recommendations");
 assert.match(finalGoalCss,/\.confirm\{\s*min-height:65px/,
   "support-and-audio CTA stays prominent");
 assert.match(css,/\.studio\[data-active-workspace="video"\] \.quickBuilder>\.quickVideoNav,\s*\.studio\[data-active-workspace="editor"\] \.quickBuilder>\.quickVideoNav\{\s*order:1/,
   "six workspaces precede the actual player in the first screen");
 assert.match(css,/\.studio\[data-active-workspace="video"\] \.previewStage \.hero,\s*\.studio\[data-active-workspace="video"\]\[data-video-studio-mode="therapy"\] \.previewStage \.hero\{\s*width:100%;aspect-ratio:16\/9!important/,
   "the original playable hero is a mobile 16:9 video frame");
 assert.match(studio,/className=\{videoStyles\.heroEyebrow\}/);
 assert.match(studio,/Создавайте видео для поддержки, баланса и развития/);
 assert.equal((studio.match(/data-video-practice-shortcuts/g)||[]).length,1);
 assert.match(studio,/data-video-practice-shortcut=\{kind\}/);
 assert.match(studio,/setActiveWorkspace\("practices"\);setStudioMode\("therapy"\)/,
   "all three entry points reuse the existing guided course");
 for(const selector of ["data-guided-meditation-step","data-guided-practice-step","data-guided-programme-step","data-video-therapy-focus"])
   assert.ok(studio.includes(selector));
 assert.equal((studio.match(/data-mandala-cinematic-canvas/g)||[]).length,1,
   "do not duplicate the recorder or stage");
 assert.equal((studio.match(/<MandalaGuidedCourse /g)||[]).length,1,
   "create meditation, ritual and course with the existing one module");
});


test("Montage and PRO retain one operational video/audio pipeline without duplicate controls",()=>{
  const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
  assert.match(studio,/\{id:"video",Icon:Film\},\s*\{id:"phrases",Icon:Heart\},\s*\{id:"editor",Icon:Scissors\}/);
  assert.match(studio,/\{id:"pro",Icon:Zap\},\{id:"ready",Icon:Check\}/);
  assert.match(studio,/editor:\{tab:"Монтаж",title:"Быстрая генерация"/);
  assert.match(studio,/pro:\{tab:"PRO",title:"PRO генерация"/);
  assert.match(studio,/data-video-basic-editor/);
  const nav=studio.slice(studio.indexOf('<nav className={videoStyles.montageQuickTools}'),
    studio.indexOf('</nav>',studio.indexOf('<nav className={videoStyles.montageQuickTools}')));
  assert.deepEqual([...nav.matchAll(/id:"(effects|text|audio|promo|concept)",Icon:/g)].map(m=>m[1]),
    ["effects","audio","text","promo","concept"],"Style, Audio, Text, Montage PRO and Story under the existing player");
  assert.match(studio,/data-video-montage-text hidden=\{montagePanel!=="text"\}/);
  assert.match(studio,/data-video-montage-audio/);
  assert.doesNotMatch(studio,/data-video-montage-visual-effect=/);
  assert.match(studio,/data-video-montage-aspect-switch/);
  assert.match(studio,/data-video-montage-open-concept/);
  assert.match(studio,/data-video-montage-concept/);
  assert.match(studio,/data-video-story-open-settings/);
  assert.match(studio,/data-video-pro-open-montage-storyboard/);
  assert.match(studio,/data-video-montage-open-audio/);
  assert.match(studio,/data-video-concept-text-tools/,"caption editor and timeline remain available");
  assert.match(studio,/data-video-montage-style=\{index\}/);
  assert.match(studio,/onClick=\{\(\)=>quickPickStyle\(index\)\}/);
  assert.match(studio,/basicPanelTab==="photo" \? deepCharacterPhotoPane : null/);
  assert.match(studio,/data-video-montage-photo-open/);
  assert.match(studio,/\{deepAudioPane\}/);
  assert.match(studio,/data-video-voice-studio/);
  assert.equal((studio.match(/<MandalaCloudVoiceStudio /g)||[]).length,1);
  assert.equal((studio.match(/id="video-audio"/g)||[]).length,1);
  assert.equal((studio.match(/<MandalaCinematicDirector /g)||[]).length,1);
  assert.equal((studio.match(/<MandalaStoriesCharacters /g)||[]).length,1);
  assert.match(studio,/data-video-montage-preference="format"/);
  assert.match(studio,/data-video-montage-preference="duration"/);
  assert.doesNotMatch(studio,/data-video-basic-tab=|data-video-basic-format=|data-video-basic-duration=/);
  assert.match(studio,/data-video-final-editor/);
  assert.match(studio,/data-video-editor-style-settings/);
  assert.match(studio,/data-video-quick-generate/);
  assert.match(css,/\.montageQuickTools\{\s*display:grid!important;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.equal((studio.match(/data-mandala-cinematic-canvas/g)||[]).length,1);
});

test("MyTube cards display the original scenario, not the four generic archetype headings",()=>{
 assert.match(director,/data-mytube-scenario-concepts/);
 assert.match(director,/<strong>\{scenario\.label\}<\/strong>/);
 assert.match(director,/data-mytube-concept-storyboard/);
 assert.match(director,/sceneOutline\.map\(\(beat,index\)=>/);
 assert.ok(!director.includes("scenarioCardHeading"),"generic shared titles must never override unique story concepts");
 assert.match(director,/Scenario concept; matching footage is verified separately/);
});

test("owner correction: canonical subcategory and optional topic and request precede the story",()=>{
 const goals=director.slice(director.indexOf("const goalPanel="),director.indexOf("return <section className={css.root}"));
 const goalBlock=goals.slice(0,goals.indexOf("const quickTopicPanel="));
 assert.match(goalBlock,/subcategoriesOpen&&!requestNeedsChoice\?<div className=\{css\.subcategories\}/,
   "show subcategories only after an explicit or reliable category selection");
 assert.match(goalBlock,/aria-pressed=\{selectedCategoryId===item\.id&&!requestNeedsChoice\}/,
   "an unmatched wish must not show the previously selected category as checked");
 assert.match(director,/if\(!classification\|\|broad\)\{[\s\S]*?setProposal\(null\);setTimelineEdits\(null\);return/,
   "unresolved or broad wishes must not inherit a ready film timeline");
 assert.match(goalBlock,/taxonomySubcategories\.map\(item=>/);
 assert.match(goalBlock,/data-auto-video-subcategory=\{item\.id\}/);
 assert.match(goalBlock,/selectedSubcategoryId===item\.id/);
 assert.doesNotMatch(goalBlock,/categoryPoster|scenePoster\(item.poster\)/);
 assert.match(director,/setSelectedGoalIds\(nextIds\)/);
 assert.match(director,/goalId:nextIds\[0\],locale,\s*fallbackTheme:selectedTheme,preferredTheme:selectedTheme/,
   "subtopics must refine, never silently replace, the selected parent video category");
 assert.match(director,/data-video-optional-topic/);
 assert.match(director,/data-auto-video-input value=\{requestDraft\}/);
 assert.match(director,/createPortal\(requestInput,requestTarget\)/,
   "the single manual prompt remains in the production first-screen slot");
 assert.match(studio,/const selectedStyleScenario=timelineTextClips\?\.length/,
   "manual timed captions take precedence over the original film plan");
 assert.match(studio,/:cinematicPlan\?\.shots\.length[\s\S]*?\?cinematicPlan\.shots\.map/,
   "the original shot captions remain the fallback when no timed edit exists");
 assert.match(studio,/data-video-montage-script/);
 assert.match(studio,/data-video-montage-script-update/);
});

test("local prompt director selects four different APPROVED scenes for individual storyboard beats",()=>{
 const scenes=JSON.parse(readFileSync(new URL("../data/video-catalog/scene-taxonomy.json",import.meta.url),"utf8")).scenes;
 const baseClipIds=["solar-surge","ocean-pulse","sunbeam-flow","river-power"];
 const plan=recommendPromptShotPlan({
   goal:"Хочу почувствовать спокойствие в лесу, увидеть утреннее солнце и путь вперёд",
   theme:"energy",scenes,baseClipIds,
 });
 assert.equal(plan.version,"hh-prompt-four-shot-v1");
 assert.equal(plan.mode,"personalized");
 assert.equal(plan.canExport,true);
 assert.equal(plan.clipIds.length,4);
 assert.equal(new Set(plan.clipIds).size,4,"the same source is never repeated");
 assert.deepEqual(plan.stages.map(stage=>stage.id),["arrival","support","movement","integration"]);
 assert.ok(plan.matchedSignals.includes("forest"),"visual forest signal must not be lost");
 assert.ok(plan.matchedSignals.includes("sun"),"sun is a separately retrieved visual cue");
 assert.ok(validateMontageClips(plan.clipIds,scenes));
 assert.match(director,/recommendPromptShotPlan\(\{/);
 assert.match(director,/data-auto-video-per-shot/);
 assert.match(director,/personalizedShotIds\|\|\[\.\.\.chosen\.clips\]/);
 assert.match(director,/onApply\(chosen\.id,length/,"use original real export path");
});

test("per-shot matching enforces water exclusions and never selects unlicensed or duplicate URLs",()=>{
 const scenes=JSON.parse(readFileSync(new URL("../data/video-catalog/scene-taxonomy.json",import.meta.url),"utf8")).scenes;
 const forged={...scenes[0],id:"fake-mountain",video:"https://example.com/fake.mp4",
   tags:["mountain","sun","forest"],motifs:["mountain"],
   rightsReference:{kind:"unlicensed_remote_source"}};
 const plan=recommendPromptShotPlan({
   goal:"Хочу спокойствия, лес, горы, но без моря",
   theme:"health",scenes:[...scenes,forged],excludedMotifs:["water"],
   baseClipIds:["calm-sea","ocean-pulse","river-power","soft-horizon"],
 });
 assert.equal(plan.canExport,true);
 assert.equal(plan.mode,"personalized");
 assert.ok(!plan.clipIds.includes("fake-mountain"));
 assert.ok(!plan.clipIds.includes("calm-sea"));
 assert.ok(validateMontageClips(plan.clipIds,scenes,["water"]));
 const disallowed=recommendPromptShotPlan({goal:"mountain",theme:"energy",
   scenes:scenes.slice(0,3),baseClipIds:[]});
 assert.equal(disallowed.canExport,false,"fewer than four distinct verified sources is not a movie");
 assert.deepEqual(disallowed.clipIds,[]);
});

test("unrecognized video prompts retain only the source-backed preset, without invented footage",()=>{
 const scenes=JSON.parse(readFileSync(new URL("../data/video-catalog/scene-taxonomy.json",import.meta.url),"utf8")).scenes;
 const baseClipIds=["wealth-sunrise","golden-harvest","prosperity-coast","radiant-portal"];
 const plan=recommendPromptShotPlan({goal:"unrecognized fantasy figure",theme:"money",scenes,baseClipIds});
 assert.equal(plan.mode,"template");
 assert.deepEqual(plan.clipIds,baseClipIds);
 assert.deepEqual(plan.matchedSignals,[]);
 const source=readFileSync(new URL("../lib/mandala/prompt-shot-director.mjs",import.meta.url),"utf8");
 assert.doesNotMatch(source,/\bfetch\s*\(/);
 assert.doesNotMatch(source,/\b(?:localStorage|sessionStorage|paidRenderApproved)\b/);
});


test("approved first screen keeps six tabs above a real 16:9 Canvas and one right-side video rail",()=>{
 const mobile=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
 const nav=studio.indexOf("data-video-quick-controls");
 const film=studio.indexOf('id="video-hero"');
 assert.ok(nav>=0&&film>nav,"six tabs precede the first video frame in the same preview section");
 assert.match(studio,/data-video-player-with-controls/);
 assert.match(studio,/data-video-next-sample/);
 assert.match(studio,/data-video-open-scenarios/);
 assert.match(studio,/data-video-another-sample/);
 assert.match(studio,/quickPickStyle\(\(quickStyleIndex\+1\)%quickStylePosters.length\)/);
 assert.equal((studio.match(/data-mandala-cinematic-canvas/g)||[]).length,1);
 assert.match(mobile,/\.heroWithRail/);
 assert.match(mobile,/\.previewStage \.heroWithRail>\.hero/);
 assert.match(mobile,/aspect-ratio:16\/9!important/);
});

test("the approved single wish and match action precede goal cards, category, topic and scenario choices",()=>{
 const prompt=studio.indexOf("data-video-request-prompt");
 const goal=studio.indexOf("data-video-director-goal-controls");
 const topic=studio.indexOf("data-video-director-topic-controls");
 const next=studio.indexOf("data-video-continue-scenarios");
 assert.ok(prompt>=0&&prompt<goal&&goal<topic&&topic<next,"approved wish → goal → category/topic → Ideas order");
 assert.match(studio,/data-video-wish-above-goals/);
 assert.match(studio,/data-video-director-audience-controls/);
 assert.match(director,/data-auto-video-audience=\{mode\}/);
 assert.match(director,/createPortal\(audienceBar,audienceTarget\)/);
 assert.doesNotMatch(studio,/data-video-goal-audience-option/);
 assert.match(director,/data-video-goal-topic-chips/);
 assert.match(director,/onClick=\{designFromRequest\}/);
 assert.match(studio,/data-video-continue-scenarios/);
 assert.match(studio,/setVideoScenarioOpen\(true\)/);
 assert.equal((director.match(/data-auto-video-input value=\{requestDraft\}/g)||[]).length,1);
 assert.match(director,/createPortal\(requestInput,requestTarget\)/);
 assert.match(director,/createPortal\(goalPanel,goalTarget\)/);
 assert.match(director,/createPortal\(quickTopicPanel,topicTarget\)/);
 assert.match(director,/createPortal\(<details[\s\S]*?,ideaTarget\)/);
 assert.match(director,/createPortal\(montageStylePanel,montageTarget\)/);
 assert.match(director,/data-auto-video-story-options/);
});

test("brief and detailed questionnaires choose from existing licensed clips without a second provider",()=>{
 assert.match(studio,/data-video-profile-picker/);
 assert.match(director,/data-video-profile-short/);
 assert.match(director,/data-video-profile-extended/);
 assert.match(director,/data-video-profile-apply/);
 assert.match(director,/profileMode==="extended"/);
 assert.match(director,/onClick=\{applyProfile\}/);
 assert.match(director,/setProposal\(recommendAutoVideo\(\{goal:nextGoal,goalId:profileFocus/);
 assert.match(director,/onCategoryChange\?\.\(nextTheme\);onGoalChange\(nextGoal\)/);
 assert.doesNotMatch(director,/fetch\(/);
 assert.doesNotMatch(director,/localStorage|sessionStorage/);
});


test("new prompt and profile choice invalidate every prior MyTube plot selection",()=>{
 // Request JSX now renders requestField; the real input onChange and explicit
 // Design button sit outside requestInput after category-intake consolidation.
 // Check EVERY actual handler instead of relying on an obsolete JSX boundary.
 for(const [start,end] of [
  ["const applyProfile=","const designFromRequest="],
  ["const designFromRequest=","const analyzedPath="],
 ]){
  const from=director.indexOf(start),to=director.indexOf(end,from+start.length);
  assert.ok(from>=0&&to>from,start+" handler exists");
  const handler=director.slice(from,to);
  for(const setter of ["setSelectedSubcategoryId", "setSelectedTopicId", "setSelectedScenarioId", "setSelectedPlotId", "setSymbolicPlotFallback", "setTimelineEdits", "setConfirmedTimelineKey"])
   assert.ok(handler.includes(setter+"("),start+" invalidates "+setter);
 }
 const request=director.slice(director.indexOf("const requestInput="),director.indexOf("const profilePanel="));
 const field=director.slice(director.indexOf("const requestField="),director.indexOf("const requestInput="));
 assert.match(request,/\{requestField\}/,"visible request composer must use the resettable field");
 assert.match(request,/onClick=\{designFromRequest\}/,"Design action must invoke checked handler");
 assert.match(field,/onChange=\{event=>/,"typing must trigger the reset handler");
 assert.match(field,/onGoalChange\(nextGoal\)/,"typing must update the active request");
 for(const setter of ["setSelectedSubcategoryId(","setSelectedTopicId("])
   assert.ok(!field.includes(setter),"optional request preserves taxonomy");
 for(const setter of ["setSelectedScenarioId(","setSelectedPlotId(","setTimelineEdits("])
   assert.ok(field.includes(setter),"new request invalidates stale storyboard");
});

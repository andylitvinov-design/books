import test from "node:test";
import "./free-film-source-loader.test.mjs";
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
 assert.ok(studio.includes("onApply={applyAutoFilm}"));
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
 assert.equal((director.match(/data-auto-video-input value=\{goal\}/g)||[]).length,1);
 assert.match(director,/const videoGoalCategories=\[/);
 assert.match(director,/data-auto-video-category=\{item.id\}/);
 assert.match(director,/data-auto-video-topic-panel/);
 assert.match(director,/taxonomySubcategories\.map\(item=>/);
 assert.match(director,/taxonomyTopics\.map\(item=>/);
 assert.match(director,/taxonomyScenarios\.length===4/);
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
 assert.match(studio,/featuredMelodies\.slice\(0,4\)/);
 assert.match(studio,/const featuredMelodies=\(scenarioTracks\.length\?scenarioTracks:recommendMandalaAudio/);
 assert.match(studio,/selectScenarioMusic\(preset\.id\)/,"confirmed film assigns a real first-party soundtrack only when auto-music is enabled");
 assert.match(studio,/theme:audioTheme,kind:"melody",wish/);
 assert.match(studio,/featuredMelodies\.slice\(0,4\)/);
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
 assert.equal(approved.length,44);
 assert.ok(approved.every(scene=>scene.poster?.startsWith("/videos/holistic-house/")&&
   scene.poster.endsWith(".jpg") && scene.video.endsWith(".mp4")));
});

test("mobile six workspaces use short locale labels without changing full panel titles",()=>{
 const labels={
  ru:["Стиль видео","Фразы и гипнокоррекция","Гипноэффект","Курс практик","Монтаж","PRO"],
  en:["Video style","Phrases & hypnocorrection","Hypno effect","Practice course","Montage","PRO"],
  es:["Estilo vídeo","Frases e hipnocorrección","Efecto hipno","Curso práctico","Montaje","PRO"],
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
 assert.match(studio,/aria-pressed=\{activeWorkspace===item.id\|\|\(!activeWorkspace&&item.id==="video"\)\}/,
   "Video tab is selected on the initial one-screen mock");
});

test("desktop retains six explicit theme choices while iPhone offers five compact goal pills",()=>{
 const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
 assert.match(studio,/quickThemeAdvancedRef=useRef<HTMLDetailsElement>\(null\)/);
 assert.match(studio,/window\.matchMedia\("\(min-width: 760px\)"\)/);
 assert.match(studio,/quickThemeAdvancedRef\.current\.open=large\.matches/);
 assert.match(studio,/data-video-theme-advanced/);
 assert.match(css,/@media\(min-width:760px\)\{[\s\S]*?\.quickThemeAdvanced>summary\{display:none\}/);
 assert.match(css,/\.quickThemeAdvanced \.quickThemeRail\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
});

test("the selected real soundtrack is synchronized with the original central Canvas Play",()=>{
 assert.match(studio,/if\(!previewPlaying\)startMovieSound\(attachedAudio,soundVolume,previewSeekSeconds>=duration\?0:previewSeekSeconds\)/,
   "selected audio must begin from the same trusted Play tap on Safari");
 assert.match(studio,/if\(previewPlaying\)\{stopMovieSound\(\);setPreviewPlaying\(false\);\}/,
   "pausing the video must pause its selected native audio");
 assert.match(studio,/function playQuickTrack\(choice:PresetId\)/,
   "retain the existing one user-gesture audio player");
 assert.match(studio,/const openAffirmationPreview = \(\) => \{\s*if\s*\(recording \|\| preparing\) return;[\s\S]*?if\(!previewPlaying\)startMovieSound\(attachedAudio,soundVolume,previewSeekSeconds>=duration\?0:previewSeekSeconds\);\s*setPreviewPlaying\(true\)/,
   "Play never starts audio during export");
});

// Regression from #2900: four real preview cards must appear before the first click.
test("approved home displays a source-backed example before rendering",()=>{
 assert.match(director,/recommendAutoVideo\(\{goal,locale,fallbackTheme:theme,presets,scenes\}\)/);
 assert.match(director,/const videoGoalCategories=\[/);
 assert.match(director,/const taxonomySubcategories=listMyTubeSubcategories\(taxonomyCategoryForGoal\[selectedCategoryId\],locale\)/);
 assert.match(director,/data-auto-video-topic-panel/);
 assert.match(director,/data-auto-video-category=\{item.id\}/);
 assert.match(director,/data-auto-video-preview-example/);
 assert.match(director,/data-auto-video-story-options/);
 assert.match(director,/data-auto-video-storyboard/);
 assert.match(director,/data-auto-video-confirm/);
 assert.match(director,/data-auto-video-create/);
});

test("five photo-free goal pills, two selectable inline subcategories, and real scenario/audio continuation",()=>{
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
 assert.match(director,/setProposal\(recommendAutoVideo\(\{goal:value/);
 assert.match(director,/onContinue\?\.\(\)/);
 assert.match(studio,/onContinue=\{\(\)=>\{/);
 assert.match(studio,/setActiveWorkspace\("phrases"\)/);
 assert.match(studio,/data-video-phrase-audio-shortcut/);
 assert.match(studio,/data-video-phrase-audio-shortcut[\s\S]*?setPhraseAudioExpanded\(true\)[\s\S]*?getElementById\("phrase-audio-settings"\)/);
 assert.equal((director.match(/data-auto-video-input value=\{goal\}/g)||[]).length,1);
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


test("owner-approved second Montage and sixth PRO reuse one operational video/audio pipeline",()=>{
 const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
 assert.match(studio,/\{id:"video",Icon:Film\},\s*\{id:"editor",Icon:Scissors\},\s*\{id:"phrases",Icon:Heart\}/);
 assert.match(studio,/\{id:"practices",Icon:Leaf\},\{id:"pro",Icon:Zap\}/);
 assert.match(studio,/editor:\{tab:"Монтаж",title:"Быстрая генерация"/);
 assert.match(studio,/pro:\{tab:"PRO",title:"PRO генерация"/);
 assert.match(studio,/data-video-basic-editor/);
 for(const id of ["style","photo","voice","music"])assert.ok(studio.includes('id:"'+id+'"'));
 assert.match(studio,/data-video-basic-style=\{index\}/);
 assert.match(studio,/onClick=\{\(\)=>quickPickStyle\(index\)\}/);
 assert.match(studio,/basicPanelTab==="photo" \? deepCharacterPhotoPane : null/);
 assert.match(studio,/basicPanelTab==="music" \? <div className=\{videoStyles.basicMusicPane\}/);
 assert.equal((studio.match(/<MandalaCloudVoiceStudio /g)||[]).length,1,
   "only the original voice panel is mounted in Montage");
 assert.equal((studio.match(/id="video-audio"/g)||[]).length,1,
   "single shared audio editor and native playback dock");
 assert.equal((studio.match(/<MandalaCinematicDirector /g)||[]).length,1);
 assert.equal((studio.match(/<MandalaStoriesCharacters /g)||[]).length,1);
 assert.match(studio,/data-video-basic-format=\{value\}/);
 assert.match(studio,/data-video-basic-duration=\{value\}/);
 assert.match(studio,/data-video-final-editor/);
 assert.match(studio,/data-video-editor-style-settings/);
 assert.match(studio,/data-video-quick-generate/);
 assert.match(css,/\.basicTabs\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
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

test("owner correction: two independent subtopics selected, input last and style script shared",()=>{
 const goals=director.slice(director.indexOf("const goalPanel="),director.indexOf("return <section className={css.root}"));
 const goalBlock=goals.slice(0,goals.indexOf("const topicPanel="));
 const topicBlock=goals.slice(goals.indexOf("const topicPanel="));
 assert.match(goalBlock,/subcategoriesOpen\?<div className=\{css\.subcategories\}/);
 assert.match(goalBlock,/popularTopicOrder\[selectedCategoryId\]\.map/);
 assert.doesNotMatch(goalBlock,/categoryPoster|scenePoster\(item.poster\)/);
 assert.match(director,/setSelectedGoalIds\(nextIds\)/);
 assert.match(director,/goalId:nextIds\[0\],locale,\s*fallbackTheme:selectedTheme,preferredTheme:selectedTheme/,
   "subtopics must refine, never silently replace, the selected parent video category");
 assert.match(director,/selectedGoalIds\.includes\(item\.id\)/);
 assert.match(director,/selectedGoalIds\.length>=2/);
 assert.ok(topicBlock.indexOf("data-auto-video-input")>topicBlock.indexOf("data-auto-video-popular-topics"),
   "manual input is the final action of Describe your topic");
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

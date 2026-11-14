import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {MEANING_LINES,suggestMeaningPhrases} from "../lib/mandala/video-meaning-phrases.mjs";
const data=JSON.parse(readFileSync(new URL("../data/video-catalog/meaning-emotion-ideas-v1.json",import.meta.url),"utf8"));
const cmp=readFileSync(new URL("../components/mandala-video-ideas.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
test("eight exact canonical axes, all three languages, five safe unique phrases",()=>{
 const ids=data.axes.map(x=>x.id);
 assert.deepEqual(ids,["anchor","connection","freedom","agency","dignity","wholeness","meaning","growth"]);
 for(const lang of ["ru","en","es"]){
  assert.deepEqual(Object.keys(MEANING_LINES[lang]),ids);
  for(const id of ids){
   const phrases=suggestMeaningPhrases(lang,[id],"fatigue","calm",4,6);
   assert.equal(phrases.length,5);assert.equal(new Set(phrases).size,5);
   phrases.forEach(s=>assert.ok(Array.from(s).length<=36&&s.length>0,s));
  }
  const ref=suggestMeaningPhrases(lang,["anchor"],"fatigue","calm",4,6);
  for(const args of [[["agency"],"fatigue","calm",4,6],[["anchor"],"anxiety","calm",4,6],
    [["anchor"],"fatigue","hope",4,6],[["anchor"],"fatigue","calm",9,9]])
    assert.notDeepEqual(ref,suggestMeaningPhrases(lang,...args));
 }
});
test("one phrase editor supplies Montage Text with selected and manually edited lines",()=>{
 for(const marker of ["data-video-ideas-current","data-video-ideas-desired","data-video-ideas-state-score",
   "data-video-ideas-energy-score","data-video-meaning-axis","data-video-idea-phrase","data-video-ideas-create"])
  assert.ok(cmp.includes(marker),marker);
 assert.match(cmp,/listMeaningAxes\(locale\)/);
 assert.doesNotMatch(cmp,/fetch\(|appFetch\(|localStorage|sessionStorage|navigator\.sendBeacon/);
 assert.match(studio,/data-video-montage-text hidden=\{montagePanel!=="text"\}/);
 assert.match(studio,/onCreate=\{\(\)=>\{\s*setMontagePanel\("concept"\);setPreviewPlaying\(false\);setNotice\(""\);/);
 assert.match(studio,/const workspaceTabs=\[\s*\{id:"video",Icon:Film\},\s*\{id:"phrases",Icon:Heart\},\s*\{id:"editor",Icon:Scissors\}/);
});

test("Ideas shortcut opens the single Montage Text editor without renderer or paid request",()=>{
 const start=studio.indexOf("const goToMontageFromIdeas = () => {");
 const end=studio.indexOf("const createQuickVideo = () => {",start);
 assert.ok(start>0&&end>start,"Ideas navigation handler");
 const action=studio.slice(start,end);
 assert.match(action,/setActiveWorkspace\("editor"\)/);
 assert.match(action,/setMontagePanel\("text"\)/);
  assert.match(studio,/data-video-ideas-concept-panel/);
  assert.match(studio,/data-video-concept-text-tools/);
 assert.match(action,/scrollIntoView/);
 assert.doesNotMatch(action,/createQuickVideo\(|createVideo\(|startFromHero\(/);
 assert.ok(studio.includes('data-video-ideas-open-montage-text') &&
   studio.includes('setMontagePanel("concept");setPreviewPlaying(false);setNotice("");') &&
   cmp.includes("data-video-ideas-generate") &&
   studio.includes("onGenerate={openReadyForGeneration}"),
   'Montage Text opens Ready for a guarded render and preserves Storyboard navigation');
 assert.match(cmp,/data-video-ideas-create[\s\S]*?disabled=\{disabled\|\|selectedCount<5\}/);
 assert.doesNotMatch(cmp,/canGenerate/,"moving to Montage must not depend on video readiness");
 assert.match(studio,/\{activeWorkspace==="video" \? <section className=\{videoStyles\.quickMusicSection\}/,
  "quick music must only mount in Goal");
 assert.doesNotMatch(css,/\[data-active-workspace="phrases"\]\s*\.quickBuilder>\[data-video-quick-audio-choices\]/,
  "mobile styles must not force Music & Voice into Ideas");
 assert.match(studio,/montagePanel==="audio" \?/,"Montage keeps its real audio editor");
});


test("approved seven-choice Ideas mock retains five-minimum, real canvas text size and voice handoff",()=>{
 for(const lang of ["ru","en","es"]){
  const seven=suggestMeaningPhrases(lang,["anchor"],"fatigue","calm",4,6,0,7);
  assert.equal(seven.length,7);
  assert.equal(new Set(seven).size,7);
  seven.forEach(value=>assert.ok(Array.from(value).length<=36));
 }
 for(const marker of ["data-video-ideas-size","data-video-ideas-text-size","data-video-idea-select",
  "data-video-ideas-selected-count","data-video-ideas-regenerate","data-video-ideas-own-phrase",
  "data-video-ideas-record","data-video-ideas-minimum","data-video-ideas-refine"])
  assert.ok(cmp.includes(marker),marker);
 assert.match(cmp,/selectedCount<5/);
 assert.match(studio,/data-video-montage-text hidden=\{montagePanel!=="text"\}/);
 assert.match(studio,/onCreate=\{\(\)=>\{\s*setMontagePanel\("concept"\);setPreviewPlaying\(false\);setNotice\(""\);/);
 assert.match(cmp,/planIdeaSelection\(candidates,indices,suggested,signature\)/);
 const renderer=readFileSync(new URL("../lib/mandala/video-affirmations.ts",import.meta.url),"utf8");
 assert.match(renderer,/textScale\?: "small" \| "medium" \| "large"/);
 assert.match(renderer,/const textScale = settings\.textScale === "small"/);
 assert.match(studio,/onRecord=\{\(\)=>\{[\s\S]*?setIdeasVoiceMode\("my-voice"\)/);
 assert.match(studio,/data-video-own-voice-record/);
});


test("Ideas rolling preview iPhone bug regression: first selected phrase is shown at the actual video size",()=>{
 const render=readFileSync(new URL("../lib/mandala/video-affirmations.ts",import.meta.url),"utf8");
 assert.ok(render.includes('motion?: "rise"'),"render settings offer actual film motion");
 assert.ok(render.includes('if (settings.motion === "rise")'),"only approved Ideas affects render mode");
 assert.ok(render.includes('Math.max(1,totalSeconds)/lines.length'),"all lines get deterministic time slots");
 assert.ok(render.includes('height*(0.75-0.48*progress)'),"each phrase moves slowly up the real screen");
 assert.ok(render.includes('ctx.fillText(part,width*0.5,lineY,maxWidth)'),"real video Canvas draws text");
 assert.ok(render.includes('textScale === "small"')&&render.includes('textScale === "large"'));
 assert.ok(cmp.includes('onResetPreview();onChange(old=>'),"size slider refreshes the first actual phrase");
 assert.ok(cmp.includes('motion:"rise"'),"Ideas enables rolling renderer");
 assert.ok(studio.includes('paintSingleVideoTextOverlay(ctx,previewSeekSeconds,singleTextSource,affirmationLines,affirmations,duration,cinematicPlan,timelineTextClips)'));
 assert.equal((studio.match(/paintSingleVideoTextOverlay\(ctx,/g)||[]).length,5,
   "live preview and all three export paths share the same renderer");
});

test("Ideas Play reuses film, not unstable speech synthesis; preserve real voice editor and Montage",()=>{
 assert.ok(!cmp.includes("SpeechSynthesisUtterance")&&!cmp.includes("speechSynthesis."),
   "Safari in-app browser cannot crash on speech synthesis");
 assert.ok(cmp.includes('onClick={()=>editing===index?moveDown(index):onPreview()}'),
   "list Play invokes the shared film viewer");
 assert.ok(studio.includes('if(activeWorkspace==="phrases"||previewSeekSeconds>=duration)'),
   "Play starts from the first selected phrase");
 assert.ok(studio.includes('const playback=film.play()'),"video playback is guarded for Safari");
 assert.ok(studio.includes('const visibleCaption=singleTextSource==="caption"?caption:""') && studio.includes('paintSingleVideoTextOverlay(ctx,previewSeekSeconds,'),
   "legacy caption is not drawn on top of Ideas text");
 assert.ok(studio.includes('onResetPreview={()=>{setPreviewPlaying(false);setPreviewSeekSeconds(0);setPreviewPlayhead(0);}}'));
 assert.ok(studio.includes('data-video-ideas-recording-open={ideasVoiceAdvancedOpen?"true":"false"}'));
 assert.ok(studio.includes('data-video-ideas-open-montage-text'), 'Ideas retains an explicit working Montage destination');
});

test("compact Ideas mobile layout has no conflicting Intro/My Film rail and list fits the screen",()=>{
 const local=readFileSync(new URL("../components/mandala-video-ideas.module.css",import.meta.url),"utf8");
 for(const marker of ["data-video-ideas-scroll","data-video-ideas-size","data-video-ideas-create"])
  assert.ok(cmp.includes(marker),marker);
 assert.ok(cmp.includes('aria-describedby="ideas-choice-help"'));
 assert.ok(local.includes('max-height:clamp(130px,29dvh,256px)'),"scroll limits list height");
 assert.ok(local.includes('@media(max-height:750px) and (max-width:759px)'),"small iPhone height");
 assert.ok(css.includes('Ideas iPhone rising phrases repair'),"last responsive override");
 assert.ok(css.includes('.heroRail,')&&css.includes('.heroEditorial{display:none!important}'));
 assert.ok(css.includes('.heroCanvas{opacity:1!important;z-index:1!important}'));
 assert.ok(css.includes('[data-video-phrase-audio-shortcut]{display:none!important}'));
});

const read = path => readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("Ideas shows Personalization and Concept without cloning Montage or the recorder",()=>{
 const studio=read("components/mandala-free-video-studio.tsx");
 assert.equal((studio.match(/data-video-ideas-tab="/g)||[]).length,2);
 for(const name of ["personalization","concept"])
  assert.ok(studio.includes('data-video-ideas-tab="'+name+'"'),name);
 assert.match(studio,/data-video-ideas-personalization-panel/);
 assert.match(studio,/data-video-ideas-concept-panel/);
 assert.equal((studio.match(/<MandalaVideoConcept /g)||[]).length,1);
 assert.equal((studio.match(/<MandalaVideoIdeas locale/g)||[]).length,1);
 assert.equal((studio.match(/<MandalaAffirmationVoice locale/g)||[]).length,1);
 assert.match(studio,/data-video-montage-text hidden=\{montagePanel!=="text"\}/);
 assert.match(studio,/data-video-ideas-voice-mode="voice"/);
 assert.match(studio,/data-video-ideas-voice-mode="my-voice"/);
 assert.match(studio,/data-video-ideas-own-upload/);
 const recorder=read("components/mandala-local-voice-tracks.tsx");
 assert.match(recorder,/data-video-ideas-record-voice/);
 assert.match(studio,/chooseAudioFile\(file\)\)setPhraseAudioExpanded\(true\)/);
});
test("WebKit keeps two Ideas tabs and real opt-in voice while five Montage tabs remain",()=>{
 const styles=read("components/mandala-video-mobile.module.css");
 const browser=read("scripts/verify-affirmation-voice-browser.mjs");
 assert.match(styles,/\.studio\[data-active-workspace="phrases"\] \.ideasSubtabs\{/);
 assert.match(styles,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(browser,/const ideasModes=phrases\.locator/);
 assert.match(browser,/data-video-ideas-tab="personalization"/);
 assert.match(browser,/data-video-ideas-tab="concept"/);
 assert.match(browser,/await advancedText\.click\(\)/);
 assert.match(browser,/await myVoiceModeButton\.click\(\)/);
 assert.match(browser,/data-video-affirmation-voice-consent/);
 for(const tab of ['id:"effects",Icon:Sparkles','id:"text",Icon:Type','id:"audio",Icon:Music2','id:"promo",Icon:Zap'])
  assert.ok(studio.includes(tab),tab);
 assert.ok(studio.includes("data-video-story-open-settings"),"legacy video settings remain under Story");
});

test("selecting a new phrase at the ten-phrase cap replaces the last choice and reports it",()=>{
 assert.match(cmp,/else if\(chosen\.length>=10\)\{[\s\S]*?apply\(options,\[\.\.\.chosen\.slice\(0,-1\),index\]\);[\s\S]*?setFeedback\(t\.savedReplaced\);/);
 assert.match(cmp,/Choose up to 10 phrases|Выбрано максимум 10|Elige hasta 10/i);
});

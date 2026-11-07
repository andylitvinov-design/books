import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");

test("exactly six real workspaces with all RU EN ES labels",()=>{
 const tabBlock=studio.match(/const workspaceTabs=\[([\s\S]*?)\] as const;/)?.[1];
 assert.ok(tabBlock,"workspace registry");
 const ids=[...tabBlock.matchAll(/id:"([a-z]+)"/g)].map(m=>m[1]);
 assert.deepEqual(ids,["video","phrases","editor","effects","practices","pro"]);
 for(const locale of ["ru","en","es"]){
   assert.match(studio,new RegExp(locale+":[\\s\\S]*?video:\\{tab:"));
   for(const id of ids)assert.match(studio,new RegExp(id+":\\{tab:"));
 }
 assert.match(studio,/phrases:\{tab:"Идеи",title:"Идеи для видео"/);
 assert.match(studio,/Гипноэффекты/);
 assert.match(studio,/Курс практик/);
 assert.match(studio,/pro:\{tab:"PRO",title:"PRO генерация"/);
 assert.match(studio,/editor:\{tab:"Монтаж",title:"Быстрая генерация"/);
});
test("top row uses local tab state rather than scrollIntoView or two anchors for settings",()=>{
 const nav=studio.slice(studio.indexOf("<nav className={videoStyles.quickVideoNav}"),studio.indexOf("</nav>",studio.indexOf("<nav className={videoStyles.quickVideoNav}")));
 assert.match(nav,/setActiveWorkspace\(item\.id\)/);
 assert.match(nav,/aria-pressed=\{activeWorkspace===item\.id\|\|\(!activeWorkspace&&item\.id==="video"\)\}/);
 assert.match(nav,/aria-controls="video-workspace-panel"/);
 assert.doesNotMatch(nav,/scrollIntoView|openQuickDetailed|location\.hash|pushState/);
 assert.match(studio,/data-video-workspace-heading/);
});
test("reuse existing one player and one full audio, hypnosis and photo editor",()=>{
 assert.equal((studio.match(/id="video-hero"/g)||[]).length,1);
 assert.equal((studio.match(/id="video-audio"/g)||[]).length,1);
 assert.equal((studio.match(/id="video-hypnosis"/g)||[]).length,1);
 assert.equal((studio.match(/<details className=\{videoStyles\.previewCoverOptions\} data-video-cover-options/g)||[]).length,1);
 assert.equal((studio.match(/id="video-settings"/g)||[]).length,1);
 for(const name of ["deepAudioPane","deepHypnoPane","deepVideoPane","deepCharacterPhotoPane"]){
   assert.equal((studio.match(new RegExp("const "+name+" =","g"))||[]).length,1);
   assert.ok(studio.includes("activeWorkspace"),"local selection retained");
 }
 assert.match(studio,/data-workspace-section="practices"/);
 assert.match(studio,/\{activeWorkspace==="video" \? deepAudioPane : null\}/);
 assert.match(studio,/\{activeWorkspace==="phrases" \? deepAudioPane : null\}/);
 assert.equal((studio.match(/\{deepHypnoPane\}/g)||[]).length,1,
   "the single phrase editor stays mounted while its workspace is hidden");
 assert.match(studio,/\{basicPanelTab==="photo" \? deepCharacterPhotoPane : null\}/,
   "second Montage reuses one original photo editor");
 assert.match(studio,/<details className=\{videoStyles\.montageStyleSettings\} data-video-editor-style-settings/,
   "the one advanced style settings panel now belongs to the second Montage workspace");
 assert.match(studio,/\{deepVideoPane\}/);
});
test("mobile has six compact navigation columns, without removing old player or protected audio",()=>{
 assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
 assert.match(css,/quickVideoNav button\[aria-pressed="true"\]/);
 assert.match(css,/data-active-workspace="phrases"/);
 assert.match(css,/data-active-workspace="effects"/);
 assert.match(css,/data-active-workspace="practices"/);
 assert.match(css,/data-active-workspace="pro"/);
 assert.match(css,/data-active-workspace="video"/);
 assert.match(css,/data-active-workspace="editor"/);
 assert.match(studio,/\<MandalaGuidedCourse/);
 assert.match(studio,/\<MandalaHypnoCompact/);
 assert.match(studio,/data-video-audio-attach/);
});


import {runInNewContext} from 'node:vm';
import ts from 'typescript';
const source=readFileSync(new URL('../components/mandala-free-video-studio.tsx',import.meta.url),'utf8');
const workspaces=[null,'video','phrases','effects','practices','editor','pro'];
function exercise(input,workspace,overrides={}){
 const ast=ts.createSourceFile('studio.tsx',input,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let handler;const visit=n=>{if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='startFromHero')handler=n.initializer;ts.forEachChild(n,visit);};visit(ast);
 assert.ok(handler);
 const js=ts.transpileModule('const startFromHero='+handler.getText(ast)+';startFromHero();',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 let active=workspace,queued=workspace,basicTab=null,renders=0,picks=0;const cover={open:false},frames=[],scrolls=[],notices=[];
 const state={recording:false,preparing:false,hypnoAudioBusy:false,photoPending:false,phrasePending:false,locale:'ru',photoUrl:'blob:synthetic',backgroundOnly:false,photoConsent:false,audioNeedsAttachment:false,uploadedAudio:null,audioRights:false,source:'synthetic',...overrides};
 // Models only the source-defined workspace/display and native-details state,
 // not pixels or a real browser. React state commits at the frame boundary.
 const consent={scrollIntoView:()=>scrolls.push({open:cover.open,workspace:active,
   visible:cover.open&&(active==='video'||active==='editor')})};
 runInNewContext(js,{...state,canGenerate:true,preparingRef:{current:state.preparing},jobRef:{current:null},webCodecJobRef:{current:null},activeWorkspace:workspace,setActiveWorkspace:value=>{queued=value;},
   setBasicPanelTab:value=>{basicTab=value;},setMontagePanel:()=>{},setMontageStyleSettingsOpen:()=>{},setIntroPlaying:()=>{},setNotice:value=>notices.push(value),supportUi:{heroConsent:'Consent required'},audioUi:{needsAttach:'Attach audio'},ui:{audioRightsHelp:'Audio rights required'},onPickPhoto:()=>picks++,createVideo:()=>renders++,window:{requestAnimationFrame:cb=>frames.push(cb)},document:{querySelector:selector=>selector==='[data-video-cover-options]'?cover:selector==='[data-video-photo-consent]'?consent:{scrollIntoView(){}}}},{timeout:1000});
 assert.equal(scrolls.length,0,'scroll must retain two-frame boundary');
 while(frames.length){active=queued;frames.shift()();}
 return {workspace:active,basicTab,open:cover.open,scrolls,notices,renders,picks};
}
test('one original consent pane is accessible in Video or fifth Montage Photo',()=>{
 assert.match(source,/activeWorkspace==="video" \? deepCharacterPhotoPane : null/);
 assert.match(source,/basicPanelTab==="photo" \? deepCharacterPhotoPane : null/);
 assert.equal((source.match(/<input type="checkbox" data-video-photo-consent/g)||[]).length,1);
 assert.doesNotMatch(source,/styleLibraryRef|data-video-style-more/);
});
test('actual hero handler reveals consent in all six workspaces and legacy layout',()=>{
 for(const workspace of workspaces){
  const r=exercise(source,workspace),target=workspace==='video'?'video':'editor';
  assert.deepEqual(r.scrolls,[{open:true,workspace:target,visible:true}],String(workspace));
  assert.equal(r.basicTab,workspace==='video'?null:'photo');
  assert.equal(r.renders,0);
  assert.deepEqual(r.notices,['Consent required']);
 }
});
test('recording/preparing locks, consent, background, missing photo and audio gates are retained',()=>{
 for(const workspace of workspaces){
  for(const flag of [{recording:true},{preparing:true},{photoPending:true}]){const r=exercise(source,workspace,flag);assert.equal(r.workspace,workspace);assert.equal(r.open,false);assert.equal(r.renders,0);assert.deepEqual(r.scrolls,[]);}
  for(const flag of [{photoConsent:true},{backgroundOnly:true}]){const r=exercise(source,workspace,flag);assert.equal(r.renders,1);assert.equal(r.workspace,workspace);assert.equal(r.open,false);}
  const missing=exercise(source,workspace,{photoUrl:null});assert.equal(missing.picks,1);assert.equal(missing.renders,0);assert.equal(missing.workspace,workspace);
  for(const flag of [{photoConsent:true,audioNeedsAttachment:true},{photoConsent:true,uploadedAudio:{},audioRights:false}])assert.equal(exercise(source,workspace,flag).renders,0);
 }
});
test('negative control rejects previous handler in four nonowner workspaces',()=>{
 const line='      if(activeWorkspace!=="video"){setActiveWorkspace("editor");setMontagePanel("settings");setMontageStyleSettingsOpen(true);setBasicPanelTab("photo");}';
 assert.equal(source.split(line).length,2);
 for(const workspace of ['phrases','effects','practices','pro']){
  const r=exercise(source.replace(line,''),workspace);
  assert.equal(r.scrolls[0].visible,false);
  assert.equal(r.renders,0);
  assert.throws(()=>assert.equal(r.scrolls[0].visible,true));
 }
});

// Approved iPhone mock: show one simple path without losing advanced functionality.
test("Video opens as the only active workspace, advanced first-video remains accessible",()=>{
  assert.match(studio,/useState<StudioWorkspace>\("video"\)/);
  assert.match(studio,/data-video-first-video-advanced>/);
  assert.match(studio,/<details className=\{videoStyles\.quickExtras\} data-workspace-section="video"/);
  assert.match(studio,/<MandalaFirstVideoStart/);
  assert.match(studio,/<MandalaAutoVideoDirector/);
  assert.match(studio,/<MandalaGuidedCourse/);
  assert.match(studio,/data-video-audio-attach/);
});
test("approved Intro/My rail uses only one main video hero and local Canvas",()=>{
  const nav=studio.indexOf('<nav className={videoStyles.quickVideoNav}');
  const start=studio.indexOf('id="video-hero"');
  const end=studio.indexOf('data-video-intro-my-rail',start);
  assert.ok(nav>0&&start>nav&&end>start);
  const hero=studio.slice(start,end);
  assert.match(hero,/data-mandala-cinematic-canvas/);
  assert.match(hero,/showIntroHero \? <div className=\{videoStyles\.therapyHero\} data-video-therapy-info/);
  assert.match(hero,/data-video-therapy-intro="ready"/);
  assert.match(hero,/data-video-therapy-intro="playing"/);
  assert.match(hero,/data-video-preview-toggle/);
  assert.match(studio,/data-video-intro-info/);
  assert.match(studio,/data-video-my-film/);
  assert.equal((studio.match(/data-mandala-cinematic-canvas/g)||[]).length,1);
  assert.equal((studio.match(/data-video-therapy-info/g)||[]).length,1);
  assert.doesNotMatch(studio,/therapyIntroStandalone/);
});
test("iPhone music is one scannable rail with distinct Listen and Include controls",()=>{
  assert.match(css,/grid-auto-columns:minmax\(188px,49%\)/);
  assert.match(css,/scroll-snap-type:x proximity/);
  assert.match(css,/\.studio \.quickMusicRail \.quickMusicPlay\{position:static/);
  assert.match(studio,/data-video-quick-music-play=\{id\}/);
  assert.match(studio,/data-video-quick-music-check=\{id\}/);
  assert.match(css,/font:650 clamp\(10px,2.75vw,12px\)/);
});
test("the approved Studio route opens directly without the separate diagnostic marketing CTA",()=>{
 const page=readFileSync(new URL("../app/[locale]/holistic-support/mandala/page.tsx",import.meta.url),"utf8");
 assert.match(page,/<MandalaMeditationClient/);
 assert.doesNotMatch(page,/styles\.slimDiagnostic|data-video-diagnostic-banner|const promo =/);
});

test("video studio lazily loads optional editor workspaces and collapsed tools", () => {
  // Main video preview and functioning Auto Director remain available on entry.
  assert.match(studio, /import \{ MandalaAutoVideoDirector \} from "\.\/mandala-auto-video-director";/);
  for (const [name, path] of [
    ["MandalaGuidedCourse", "mandala-guided-course"],
    ["MandalaHypnocorrectionMobile", "mandala-hypnocorrection-mobile"],
    ["MandalaCinematicDirector", "mandala-cinematic-director"],
    ["MandalaVideoDirectorChat", "mandala-video-director-chat"],
    ["MandalaFirstVideoStart", "mandala-first-video-start"],
    ["MandalaStoriesCharacters", "mandala-stories-characters"],
    ["MandalaPersonalMeditation", "mandala-personal-meditation"],
    ["MandalaCloudVoiceStudio", "mandala-cloud-voice-studio"],
  ]) {
    assert.ok(studio.includes(`const ${name} = dynamic(() => import("./${path}").then(module => module.${name}));`),
      name + " should be loaded on demand");
    assert.ok(!studio.includes(`import { ${name} } from "./${path}";`));
  }
  assert.match(studio, /onToggle=\{event=>\{if\(event\.currentTarget\.open\)setFirstVideoAdvancedActivated\(true\);\}\}/);
  assert.match(studio, /\{firstVideoAdvancedActivated \? <MandalaFirstVideoStart/);
  // Voice can now be activated by a deep link and its one live details
  // panel owns the same state as the lazily mounted studio.
  assert.match(studio, /data-video-voice-studio open=\{voiceStudioActivated\}/);
  assert.match(studio, /onToggle=\{event=>setVoiceStudioActivated\(event\.currentTarget\.open\)\}/);
  assert.match(studio, /\{voiceStudioActivated\?<MandalaCloudVoiceStudio/);
  assert.match(studio, /useState<StudioWorkspace>\("video"\)/);
  assert.match(studio, /<MandalaAutoVideoDirector/);
});

test("final approved six tabs lead to exactly one real workspace each",()=>{
  const expected=['tab:"Цель"','tab:"Идеи"','tab:"Гипноэффект"',
    'tab:"Курс практик"','tab:"Монтаж"','tab:"PRO"'];
  for(const label of expected)assert.ok(studio.includes(label),"missing "+label);
  assert.match(studio,/data-video-quick-control=\{item.id\}/);
  assert.match(studio,/setActiveWorkspace\(item.id\)/);
  assert.match(studio,/data-video-topic-section/);
  assert.match(studio,/data-video-director-goal-controls/);
  assert.match(studio,/data-video-director-topic-controls/);
  assert.match(studio,/data-video-phrase-audio-shortcut/);
  assert.match(studio,/data-video-final-editor/);
  assert.match(studio,/data-video-audio-details/);
});

test("pending Phrases selection blocks the actual shared hero handler in every workspace",()=>{
  for(const workspace of workspaces){
    const state=exercise(source,workspace,{phrasePending:true,photoConsent:true});
    assert.equal(state.renders,0,"cannot export the old approved words");
    assert.equal(state.workspace,"phrases","visitor is sent to the approval tab");
    assert.ok(state.notices.some(note=>note.includes("Сначала утвердите фразы")));
  }
});

test("compact Ideas preserves one opt-in advanced phrase and voice editor",()=>{
 const start=studio.indexOf('<section className={videoStyles.quickPhraseSection} data-workspace-section="phrases"');
 const end=studio.indexOf('<section className={videoStyles.quickPhraseSection} data-workspace-section="effects"',start);
 assert.ok(start>0 && end>start);
 const section=studio.slice(start,end);
 const editor=section.indexOf('data-video-phrase-editor-first');
 const audio=section.indexOf('data-video-phrase-audio-shortcut');
 assert.ok(editor>0&&audio>editor);
 assert.equal((section.match(/\{deepHypnoPane\}/g)||[]).length,1);
 assert.match(section,/<MandalaVideoIdeas/);
 assert.match(section,/data-video-legacy-phrase-editor\s+hidden=\{activeWorkspace!=="phrases"\} aria-hidden=\{activeWorkspace!=="phrases"\}/);
 assert.match(section,/data-video-ideas-advanced-voice open=\{ideasVoiceAdvancedOpen\}/);
 assert.equal((studio.match(/<MandalaHypnoCompact /g)||[]).length,1);
 assert.match(studio,/onPendingChange=\{setPhrasePending\}/);
 assert.match(studio,/onChange=\{setAffirmations\}/);
 assert.match(studio,/onPreview=\{openAffirmationPreview\}/);
 for(const label of ['tab:"Идеи"','tab:"Ideas"'])
   assert.ok(studio.includes(label),label);
 assert.match(css,/\.studio\[data-active-workspace="phrases"\] \.phraseEditorLead\{/);
});
test("hydrated Studio gates the first local MP4 test before its first real user click",()=>{
 const benchmark=readFileSync(new URL("../scripts/benchmarking/first-video-live-export.mjs",import.meta.url),"utf8");
 assert.match(studio,/data-video-studio-hydrated=\{studioHydrated\?"true":"false"\}/);
 assert.match(studio,/useEffect\(\(\)=>setStudioHydrated\(true\),\[\]\)/);
 assert.ok(benchmark.indexOf("data-video-studio-hydrated")<benchmark.indexOf("data-video-first-video-advanced"),
   "hydration must complete before the first direct free-video disclosure");
 assert.match(benchmark,/LICENSED_SCENE_ORDER_MISMATCH/);
});

test("owner 03 Nov: compact tabs, real scenario updates and moved settings",()=>{
 const tabs=studio.slice(studio.indexOf("const workspaceTabs=["),studio.indexOf("] as const;",studio.indexOf("const workspaceTabs=[")));
 assert.ok(tabs.indexOf('id:"phrases"')<tabs.indexOf('id:"editor"'),"Ideas is second, Montage third");
 const nav=studio.slice(studio.indexOf("<nav className={videoStyles.quickVideoNav}"),studio.indexOf("</nav>",studio.indexOf("<nav className={videoStyles.quickVideoNav}")));
 assert.match(nav,/quickNavCompact/,"iPhone labels are genuinely short");
 assert.match(nav,/quickNavFull/,"full labels remain on wider screens");
 const mobileCss=css.slice(css.lastIndexOf("/* Owner 03 Nov:"));
 assert.match(mobileCss,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/,"one row overrides legacy 3x2");
 const editor=studio.slice(studio.indexOf('data-video-editor-scenario'),studio.indexOf('data-video-quick-personal'));
 const scenario=editor.indexOf('data-video-editor-scenario');
 assert.ok(scenario>=0&&scenario<editor.indexOf('data-video-montage-audio'),"script is available before Audio");
 assert.match(editor,/data-video-montage-script-update/);
 assert.match(editor,/normalizeStageCaption\(lines\[index\]\|\|""\)/,
   "editing a four-shot montage changes the local actual caption track");
 assert.match(editor,/setCaptionMode\("custom"\)/,
   "single-scene style applies the script as a real caption");
 assert.match(studio,/data-video-editor-style-settings/);
 assert.equal((studio.match(/\{deepVideoPane\}/g)||[]).length,1,"no duplicate settings panels");
 assert.doesNotMatch(studio,/Все настройки стиля видео/,"remove old stray style disclosure");
});

test("owner 04 Nov: Montage retains the editor but places compact tabs and video first",()=>{
 const layout=css.slice(css.lastIndexOf("/* 04 Nov owner visual recovery"));
 assert.match(layout,/quickBuilder>\.quickVideoNav\s*\{[^}]*order:1!important/);
 assert.match(layout,/quickBuilder>\.previewStage\s*\{[^}]*order:2!important/);
 assert.match(layout,/data-active-workspace="editor"\] \.quickBuilder>\[data-video-basic-editor\]\s*\{\s*order:4!important/);
 assert.match(layout,/aspect-ratio:16\/9!important/);
 assert.match(layout,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)!important/);
 assert.ok(studio.indexOf("data-video-quick-controls") < studio.indexOf("data-video-live-stage"),
   "one tab row stays between brand and player in every mode");
 const timelineCss=readFileSync(new URL("../components/mandala-multitrack-timeline.module.css",import.meta.url),"utf8");
 const tracks=timelineCss.slice(timelineCss.lastIndexOf("/* HH iPhone track order"));
 for(const [kind,order] of [["video",2],["audio",3],["text",4]]){
   assert.ok(tracks.includes('.trackRow[data-video-track="'+kind+'"]{order:'+order+';}'));
 }
});

test("all six workspaces use the same in-flow navigation and one real export",()=>{
 assert.equal((studio.match(/<nav className=\{videoStyles\.quickVideoNav\}/g)||[]).length,1);
 assert.ok(studio.indexOf("data-video-quick-controls")<studio.indexOf("data-video-live-stage"));
 assert.doesNotMatch(studio,/createPortal|effectsNavTarget|montageNavTarget|data-video-hypno-nav-slot|data-video-montage-nav-slot/,
   "no mode can teleport the navigation to a different vertical position");
 const editor=studio.slice(studio.indexOf("data-video-basic-editor"),studio.indexOf("data-video-quick-personal"));
 assert.match(editor,/data-video-montage-tools/);
 assert.match(editor,/data-video-montage-tab=\{item.id\}/);
 assert.match(editor,/data-video-montage-preferences/);
 assert.doesNotMatch(editor,/data-video-montage-export/, "the old second export button must stay removed");
 assert.match(studio,/onClick=\{createQuickVideo\}/,"the single real Generate CTA must reuse the original renderer");
 const mobileCss=css.slice(css.lastIndexOf("/* 04 Nov owner visual recovery"));
 assert.match(mobileCss,/\.studio\[data-active-workspace\] \.quickVideoNav button/);
 assert.match(css,/\.montageQuickTools\{[^}]*flex-wrap:nowrap/);
});


test("guided meditation opt-out is reconciled after React commit without losing explicit reopen",()=>{
  assert.match(studio,/const \[courseMeditationOmitted,setCourseMeditationOmitted\]=useState\(false\)/);
  assert.match(studio,/useLayoutEffect\(\(\)=>\{\s*if\(!courseMeditationOmitted\)return;/);
  assert.match(studio,/if\(details instanceof HTMLDetailsElement\)details\.open=false/);
  assert.match(studio,/\},\[courseMeditationOmitted,courseMeditationDraft\]\)/);
  assert.match(studio,/onAddMeditation=\{script=>\{[\s\S]*?setCourseMeditationOmitted\(false\)/);
  assert.match(studio,/onOmitMeditation=\{\(\)=>\{[\s\S]*?setCourseMeditationOmitted\(true\)/);
});

test("validated Messenger video handoff visibly opens the original Studio Director on compact Goals",()=>{
 const director=readFileSync(new URL("../components/mandala-video-director-chat.tsx",import.meta.url),"utf8");
 assert.match(director,/sessionStorage\.getItem\(MESSENGER_VIDEO_HANDOFF_KEY\)/);
 assert.match(director,/decodeMessengerVideoHandoff\(packet,locale\)/);
 assert.match(director,/nextVideoChatTreeStep\(incoming\)/);
 assert.match(director,/if\(panel instanceof HTMLDetailsElement\)panel\.open=true/);
 const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
 assert.match(browser,/const handoffPanel=page\.locator/);
 assert.match(browser,/await handoffPanel\.evaluate\(element=>\{element\.open=true;\}\)/);
 assert.match(browser,/await expect\(handoffPanel\)\.toBeVisible/);

 assert.match(studio,/data-video-director-chat-details data-workspace-section="video"/);
 const rule=css.slice(css.lastIndexOf("/* Messenger Video validated handoff visibility."));
 assert.ok(rule.length>100,"Goals handoff visibility must survive compact-page CSS");
 assert.match(rule,/data-video-scenario-open="false"\]:not\(\[data-hh-video-ihelp-open="true"\]\)/);
 assert.match(rule,/\[data-video-director-chat-details\]\[data-workspace-section="video"\]\[open\]\s*\{\s*display:grid!important;/);
 assert.doesNotMatch(rule,/display:none!important/,"the opened handoff must be visible");
 assert.match(css,/\[data-workspace-section="video"\]:not\(\[data-video-topic-section\]\)\s*\{\s*display:none!important;/,
   "unopened legacy Goals sections remain hidden");
});

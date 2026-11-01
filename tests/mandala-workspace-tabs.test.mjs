import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");

test("exactly six real workspaces with all RU EN ES labels",()=>{
 const tabBlock=studio.match(/const workspaceTabs=\[([\s\S]*?)\] as const;/)?.[1];
 assert.ok(tabBlock,"workspace registry");
 const ids=[...tabBlock.matchAll(/id:"([a-z]+)"/g)].map(m=>m[1]);
 assert.deepEqual(ids,["video","phrases","effects","practices","pro","editor"]);
 for(const locale of ["ru","en","es"]){
   assert.match(studio,new RegExp(locale+":[\\s\\S]*?video:\\{tab:"));
   for(const id of ids)assert.match(studio,new RegExp(id+":\\{tab:"));
 }
 assert.match(studio,/Фразы поддержки и аудиогид/);
 assert.match(studio,/Гипноэффекты/);
 assert.match(studio,/Курс практик/);
 assert.match(studio,/pro:\{tab:"PRO генерация",title:"PRO генерация"/);
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
 assert.match(studio,/\{activeWorkspace==="pro" \? deepCharacterPhotoPane : null\}/);
 assert.match(studio,/\{activeWorkspace==="editor" \? deepVideoPane : null\}/);
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
const workspaces=[null,'video','phrases','effects','practices','pro','editor'];
function exercise(input,workspace,overrides={}){
 const ast=ts.createSourceFile('studio.tsx',input,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let handler;const visit=n=>{if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='startFromHero')handler=n.initializer;ts.forEachChild(n,visit);};visit(ast);
 assert.ok(handler);
 const js=ts.transpileModule('const startFromHero='+handler.getText(ast)+';startFromHero();',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 let active=workspace,queued=workspace,renders=0,picks=0;const cover={open:false},frames=[],scrolls=[],notices=[];
 const state={recording:false,preparing:false,photoUrl:'blob:synthetic',backgroundOnly:false,photoConsent:false,audioNeedsAttachment:false,uploadedAudio:null,audioRights:false,source:'synthetic',...overrides};
 // Models only the source-defined workspace/display and native-details state,
 // not pixels or a real browser. React state commits at the frame boundary.
 const consent={scrollIntoView:()=>scrolls.push({open:cover.open,workspace:active,visible:cover.open&&(!active||active==='video'||active==='pro')})};
 runInNewContext(js,{...state,activeWorkspace:workspace,setActiveWorkspace:value=>{queued=value;},setIntroPlaying:()=>{},setNotice:value=>notices.push(value),supportUi:{heroConsent:'Consent required'},audioUi:{needsAttach:'Attach audio'},ui:{audioRightsHelp:'Audio rights required'},onPickPhoto:()=>picks++,createVideo:()=>renders++,window:{requestAnimationFrame:cb=>frames.push(cb)},document:{querySelector:selector=>selector==='[data-video-cover-options]'?cover:selector==='[data-video-photo-consent]'?consent:{scrollIntoView(){}}}},{timeout:1000});
 assert.equal(scrolls.length,0,'scroll must retain two-frame boundary');
 while(frames.length){active=queued;frames.shift()();}
 return {workspace:active,open:cover.open,scrolls,notices,renders,picks};
}
test('current source mounts one shared consent pane in Video or Characters without old Style disclosure',()=>{
 assert.match(source,/activeWorkspace!=="pro" \? deepCharacterPhotoPane : null/);
 assert.match(source,/activeWorkspace==="pro" \? deepCharacterPhotoPane : null/);
 assert.equal((source.match(/<input type="checkbox" data-video-photo-consent/g)||[]).length,1);
 assert.doesNotMatch(source,/styleLibraryRef|data-video-style-more/);
});
test('actual hero handler reveals consent in all six workspaces and legacy layout',()=>{
 for(const workspace of workspaces){const r=exercise(source,workspace);assert.deepEqual(r.scrolls,[{open:true,workspace:workspace&&workspace!=='pro'?'video':workspace,visible:true}],String(workspace));assert.equal(r.renders,0);assert.deepEqual(r.notices,['Consent required']);}
});
test('recording/preparing locks, consent, background, missing photo and audio gates are retained',()=>{
 for(const workspace of workspaces){
  for(const flag of [{recording:true},{preparing:true}]){const r=exercise(source,workspace,flag);assert.equal(r.workspace,workspace);assert.equal(r.open,false);assert.equal(r.renders,0);assert.deepEqual(r.scrolls,[]);}
  for(const flag of [{photoConsent:true},{backgroundOnly:true}]){const r=exercise(source,workspace,flag);assert.equal(r.renders,1);assert.equal(r.workspace,workspace);assert.equal(r.open,false);}
  const missing=exercise(source,workspace,{photoUrl:null});assert.equal(missing.picks,1);assert.equal(missing.renders,0);assert.equal(missing.workspace,workspace);
  for(const flag of [{photoConsent:true,audioNeedsAttachment:true},{photoConsent:true,uploadedAudio:{},audioRights:false}])assert.equal(exercise(source,workspace,flag).renders,0);
 }
});
test('negative control rejects previous handler in four nonowner workspaces',()=>{
 const line='      if(activeWorkspace && activeWorkspace!=="pro")setActiveWorkspace("video");';assert.equal(source.split(line).length,2);
 for(const workspace of ['phrases','effects','practices','editor']){const r=exercise(source.replace(line,''),workspace);assert.equal(r.scrolls[0].visible,false);assert.equal(r.renders,0);assert.throws(()=>assert.equal(r.scrolls[0].visible,true));}
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
test("published informational YouTube no longer overlays the original Canvas hero",()=>{
  const start=studio.indexOf('id="video-hero"');
  const finish=studio.indexOf('<nav className={videoStyles.quickVideoNav}',start);
  assert.ok(start>0&&finish>start);
  assert.doesNotMatch(studio.slice(start,finish),/data-video-therapy-intro/);
  assert.match(studio,/className=\{videoStyles\.therapyIntroStandalone\}/);
  assert.match(studio,/data-workspace-section="practices" data-video-therapy-info/);
  assert.match(studio,/if\(item\.id!=="practices"\)setIntroPlaying\(false\)/);
  assert.equal((studio.match(/data-mandala-cinematic-canvas/g)||[]).length,1);
});
test("iPhone music is one scannable rail with distinct Listen and Include controls",()=>{
  assert.match(css,/grid-auto-columns:minmax\(188px,49%\)/);
  assert.match(css,/scroll-snap-type:x proximity/);
  assert.match(css,/\.studio \.quickMusicRail \.quickMusicPlay\{position:static/);
  assert.match(studio,/data-video-quick-music-play=\{id\}/);
  assert.match(studio,/data-video-quick-music-check=\{id\}/);
  assert.match(css,/font:650 clamp\(10px,2.75vw,12px\)/);
});
test("free personal video starts before the separate diagnostic marketing CTA",()=>{
 const page=readFileSync(new URL("../app/[locale]/holistic-support/mandala/page.tsx",import.meta.url),"utf8");
 const studioPos=page.indexOf("<MandalaMeditationClient");
 const promoPos=page.indexOf("styles.slimDiagnostic");
 assert.ok(studioPos>=0&&promoPos>studioPos);
});

test("final approved six tabs lead to exactly one real workspace each",()=>{
  const expected=['tab:"Стиль видео"','tab:"Фразы поддержки"','tab:"Гипноэффект"',
    'tab:"Курс практик"','tab:"PRO генерация"','tab:"Монтаж"'];
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

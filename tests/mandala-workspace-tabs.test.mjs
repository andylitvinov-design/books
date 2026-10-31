import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");

test("exactly six real workspaces with all RU EN ES labels",()=>{
 const tabBlock=studio.match(/const workspaceTabs=\[([\s\S]*?)\] as const;/)?.[1];
 assert.ok(tabBlock,"workspace registry");
 const ids=[...tabBlock.matchAll(/id:"([a-z]+)"/g)].map(m=>m[1]);
 assert.deepEqual(ids,["video","audio","characters","hypnotherapy","psychocorrection","courses"]);
 for(const locale of ["ru","en","es"]){
   assert.match(studio,new RegExp(locale+":[\\s\\S]*?video:\\{tab:"));
   for(const id of ids)assert.match(studio,new RegExp(id+":\\{tab:"));
 }
 assert.match(studio,/Гипнотерапия/);
 assert.match(studio,/Психокоррекция/);
 assert.match(studio,/Курсы и медитации/);
 assert.match(studio,/Герои и образы/);
});
test("top row uses local tab state rather than scrollIntoView or two anchors for settings",()=>{
 const nav=studio.slice(studio.indexOf("<nav className={videoStyles.quickVideoNav}"),studio.indexOf("</nav>",studio.indexOf("<nav className={videoStyles.quickVideoNav}")));
 assert.match(nav,/setActiveWorkspace\(item\.id\)/);
 assert.match(nav,/aria-pressed=\{activeWorkspace===item\.id\}/);
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
 assert.match(studio,/data-workspace-section="courses"/);
 assert.match(studio,/\{activeWorkspace==="audio" \? deepAudioPane : null\}/);
 assert.match(studio,/\{activeWorkspace==="psychocorrection" \? deepHypnoPane : null\}/);
 assert.match(studio,/\{activeWorkspace==="characters" \? deepCharacterPhotoPane : null\}/);
 assert.match(studio,/\{activeWorkspace==="video" \? deepVideoPane : null\}/);
});
test("mobile has three accessible columns, without removing old player or protected audio",()=>{
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/quickVideoNav button\[aria-pressed="true"\]/);
 assert.match(css,/data-active-workspace="audio"/);
 assert.match(css,/data-active-workspace="psychocorrection"/);
 assert.match(css,/data-active-workspace="hypnotherapy"/);
 assert.match(css,/data-active-workspace="characters"/);
 assert.match(css,/data-active-workspace="video"/);
 assert.match(css,/data-active-workspace="courses"/);
 assert.match(studio,/\<MandalaGuidedCourse/);
 assert.match(studio,/\<MandalaHypnoCompact/);
 assert.match(studio,/data-video-audio-attach/);
});

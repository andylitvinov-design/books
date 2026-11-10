import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const painter=studio.slice(studio.indexOf("function paintCinematicFrame("),studio.indexOf("function paintSingleVideoTextOverlay("));
test("Stories extend the existing Story tab; Settings and Hypno remain intact",()=>{
 const start=studio.indexOf("<nav className={videoStyles.montageQuickTools}");
 const nav=studio.slice(start,studio.indexOf("</nav>",start));
 assert.match(nav,/id:"concept",Icon:Film/);
 assert.match(nav,/id:"settings",Icon:SlidersHorizontal/);
 assert.match(nav,/concept:\{ru:"Сюжет",en:"Story",es:"Guion"\}/);
 assert.match(studio,/data-video-montage-concept/);
 assert.match(studio,/MandalaAutomaticStoryboard/);
 assert.match(studio,/montagePanel==="concept" \? <div className=\{videoStyles\.montagePreferences\} data-video-montage-storyboard/);
 assert.match(studio,/hypnoEntryGroup/);
});
test("all four story formats are selectable in the existing editor",()=>{
 for(const format of ["visual","motion","talking_character","ai_cinematic"])
  assert.ok(studio.includes('value="'+format+'"')||studio.includes('value="'+format+'">'),format);
 assert.match(studio,/data-video-stories-format/);
 assert.match(studio,/data-video-stories-create/);
 assert.match(studio,/getStoryFormatCopy\(storyFormat,locale\)/);
});
test("five-scene story uses only approved, physically verified, distinct portrait masters",()=>{
 const selector=studio.slice(studio.indexOf("function selectFiveStoryClips"),studio.indexOf("const effects: Effect[]"));
 assert.match(selector,/verifiedCategorySource/);
 assert.match(selector,/verifiedSceneAspect\(verified,aspect\)/);
 assert.match(selector,/isSafeMontageScene/);
 assert.match(selector,/canonicalSourceMasterKey/);
 assert.match(selector,/selected\.length===5/);
 assert.match(studio,/allocateVariableFilmTimeline\(20,clips\)/);
 assert.match(studio,/applyAutoFilm\(preset\.id,20,edit,"portrait",true\)/);
});
test("scene photographs are validated and remain local to the current browser session",()=>{
 const start=studio.indexOf("const setStoryboardPhoto=");
 const end=studio.indexOf("const hasStoryboardPhotoAt",start);
 const handler=studio.slice(start,end);
 assert.match(handler,/image\/jpeg/);assert.match(handler,/image\/png/);assert.match(handler,/image\/webp/);
 assert.match(handler,/15\*1024\*1024/);assert.match(handler,/naturalWidth<160/);
 assert.match(handler,/URL\.createObjectURL/);assert.match(handler,/URL\.revokeObjectURL/);
 assert.doesNotMatch(handler,/fetch\(|appFetch\(|FormData|upload/i);
 assert.match(studio,/useEffect\(\(\)=>\(\)=>\{/);
});
test("local still replaces only its assigned shot in both preview and final Canvas export",()=>{
 assert.match(studio,/function paintStoryboardStill/);
 assert.match(painter,/storyboardPhotos\[shot\.sceneId\]/);
 assert.match(painter,/paintStoryboardStill\(ctx,still,localTime,shot\.durationSeconds\)/);
 assert.match(studio,/if\(still\?\.complete&&still\.naturalWidth>0/);
 assert.match(studio,/hasStoryboardPhotoAt\(frameTime\)/);
 assert.match(studio,/hasStoryboardPhotoAt\(0\)/);
 assert.equal((studio.match(/activeMontageStyleId,styleFilmRef\.current,storyboardPhotos\)/g)||[]).length,5);
});
test("storyboard source replacement and reordering retain the existing safe source checks",()=>{
 assert.match(studio,/const replaceStoryboardSource=/);
 assert.match(studio,/verifiedSceneAspect\(verified,aspect\)/);
 assert.match(studio,/canonicalSourceMasterKey\(verified\)/);
 assert.match(studio,/data-video-stories-source=\{index\}/);
 assert.match(studio,/moveTimelineShot\(index,index-1\)/);
});
test("paid cinematic story never triggers Veo and the owner-only gate remains explicit",()=>{
 const contract=readFileSync(new URL("../lib/mandala/stories-studio.mjs",import.meta.url),"utf8");
 assert.match(studio,/data-video-stories-paid-gate/);
 assert.match(studio,/Платная генерация Veo выключена/);
 assert.match(studio,/paidRenderApproved:false/);
 assert.match(contract,/paidProviderRequests:0/);
 assert.match(contract,/authorizedSceneIds:Object\.freeze\(paidAllowed\?\[quote\.sceneId\]:\[\]\)/);
 assert.match(contract,/autoUpgradeModel:false/);
 assert.match(contract,/autoPublish:false/);
 assert.match(contract,/quote\.amount<=budgetLimitUsd/);
 assert.match(contract,/existingOperationStatus/);
 assert.match(contract,/autoRetryPaidRequests:false/);
});

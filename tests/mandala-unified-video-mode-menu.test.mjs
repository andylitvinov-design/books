import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const studio=read("components/mandala-free-video-studio.tsx");
const dock=read("components/holistic-support-mandala-dock.tsx");
const ready=read("components/mandala-video-ready.tsx");
test("one real user-opened site menu switches the existing editor in EN/RU/ES",()=>{
 for(const s of ["Video creation","Создание видео","Crear vídeo","data-video-export-menu-settings",
   "data-video-export-menu-mode={mode}","hh:video-export-mode-change","detail.accepted",
   "data-video-ffmpeg-offline"])assert.ok(dock.includes(s),s);
 assert.match(studio,/hh:video-export-mode-change/);
 assert.match(studio,/data-video-export-mode=\{videoExportMode\}/);
 assert.match(studio,/url\.searchParams\.set\("videoMode",mode\)/);
});
test("OpenMotion opens the actual template picker without a second exporter",()=>{
 assert.match(studio,/setFirstVideoAdvancedActivated\(true\)/);
 assert.match(studio,/\[data-first-video-openmotion-library\]/);
 assert.match(studio,/createMotionPresetVideo/);
 assert.match(studio,/setVideoExportMode\("openmotion"\)/);
 assert.match(ready,/data-ready-open-motion-picker/);
});
test("Express with no verified master cannot encode, hold credit, or claim a finished MP4",()=>{
 assert.match(studio,/if\(videoExportMode!=="personal"\)/);
 assert.match(studio,/if\(videoExportMode==="express"\)/);
 assert.match(studio,/creditOpRef\.current\)return false/);
 assert.match(studio,/motionPresetRetryRef\.current=null/);
 assert.match(ready,/data-ready-express-unavailable/);
 assert.match(ready,/exportMode==="personal"\?<button type="button" className=\{css\.primary\}/);
 assert.match(ready,/courseFlow&&!waiting&&exportMode==="personal"/);
 assert.match(studio,/normalizeNativeSafariMp4ForPlayback/);
 assert.match(studio,/holdVideoExportCredit/);
 assert.doesNotMatch(studio,/ffmpeg-static|child_process|ffmpeg\.wasm/);
});

test("the visible Studio header opens the single Settings menu even when the legacy docks are hidden",()=>{
 assert.match(studio,/data-video-settings-trigger aria-controls="mandala-support-settings"/);
 assert.match(studio,/dispatchEvent\(new Event\("hh:video-settings-toggle"\)\)/);
 assert.match(dock,/addEventListener\("hh:video-settings-toggle",toggleSettings\)/);
 assert.match(dock,/Template \(OpenMotion\)/);
});
test("Express uses the verified locale-matched master rather than personal preview or credit copy",()=>{
 assert.match(ready,/getPublishedStandardMotionFilm\("anti-stress-30s",locale\)/);
 assert.match(ready,/data-ready-express-standard><PublishedStandardMotionFilm/);
 assert.match(ready,/exportMode!=="express"\?header:null/);
 assert.match(ready,/exportMode==="personal"&&!completed&&basicFreeAvailable&&basicCreditCost/);
 const player=read("components/published-standard-motion-film.tsx");
 assert.match(player,/locale&&master.locale!==locale/);
 assert.match(player,/existing_approved_first_party_masters/);
 assert.match(player,/master\?\.sha256/);
});

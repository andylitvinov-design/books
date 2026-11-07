import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const s=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
test("Music Library is a compact picker, not the full Audio editor",()=>{
 const p=s.slice(s.indexOf('data-video-audio-library-dialog'),s.indexOf('data-video-audio-library-confirm'));
 for(const x of ["data-video-audio-library-search","data-video-audio-library-theme","data-video-audio-library-mood","data-video-audio-library-pace","data-video-audio-library-select","data-video-audio-library-play","data-video-audio-library-tracks","data-video-audio-library-upload","data-video-audio-library-record"])assert.ok(p.includes(x),x);
 assert.ok(!p.includes("audioLibraryHiddenEngine"));
 assert.ok(!p.includes('data-video-audio-bed-select'));
 assert.match(css,/\.audioLibraryHiddenEngine\{position:absolute/);
 assert.match(css,/\.audioLibraryFilters\{display:grid;grid-template-columns:repeat\(3/);
});

test("Compact Audio keeps its native player outside the library-only modal",()=>{
 const start=s.indexOf('data-video-montage-audio>');
 const modal=s.indexOf('{audioLibraryOpen ? <div',start);
 const closed=s.indexOf('            </div> : null}',modal);
 const dock=s.indexOf('className={videoStyles.audioLibraryHiddenEngine}',start);
 const nextTool=s.indexOf('data-video-voice-studio',dock);
 assert.ok(start>=0&&modal>start&&closed>modal&&dock>closed&&nextTool>dock,
  "Music player must remain mounted when the music library dialog is closed");
 assert.ok(s.slice(dock,nextTool).includes('{deepAudioPane}'));
 assert.ok(s.slice(start,modal).includes('onClick={toggleSoundPreview}'));
 assert.equal(s.split('<audio key={previewAudioUrl}').length-1,1,
  "A single shared HTMLAudioElement must serve both compact and modal Play");
});

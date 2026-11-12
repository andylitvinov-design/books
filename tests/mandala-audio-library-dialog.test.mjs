import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
test("Browse opens an accessible modal with search, playback, cancellation and confirmation",()=>{
 for(const x of ['aria-haspopup="dialog"','data-video-audio-library-dialog','role="dialog" aria-modal="true"',
 'data-video-audio-library-close','data-video-audio-library-cancel','data-video-audio-library-confirm',
 'data-video-audio-search','data-video-audio-sort','data-video-audio-tracks','data-video-audio-play',
 'data-video-audio-favorite','data-video-audio-rights','{deepAudioPane}',
 'onKey=(event:KeyboardEvent)','event.key==="Escape"','closeAudioLibrary(true)',
 'if(audioNeedsAttachment)attachSelectedAudio()'])assert.ok(src.includes(x),x);
 assert.match(css,/\.montageAudioOverlay\{position:fixed/);
 assert.match(css,/\.montageAudioDialogScroll\{[^}]*overflow-y:auto/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
 assert.doesNotMatch(src,/className=\{videoStyles\.montageAudioLibrary\}/);
});

import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const middleware=read("middleware.ts");
const picker=read("components/studio-music-picker.jsx");
const css=read("components/studio-music-picker.module.css");

test("Video Studio media and fetch CSP allow only configured signed music storage",()=>{
 assert.match(middleware,/const publicMandalaLocalImages = \/\^\\\/\(en\|ru\|es\)\\\/holistic-support\\\/mandala/);
 assert.match(middleware,/const studioMusicStorageOrigin = \(\(\) => \{/);
 assert.match(middleware,/if \(!publicMandalaLocalImages\) return ''/);
 assert.match(middleware,/new URL\(process\.env\.HH_APP_SUPABASE_URL \|\| ''\)/);
 assert.match(middleware,/url\.protocol === 'https:' && \/\^\[a-z0-9\]\{20\}/);
 assert.match(middleware,/\+ personalVideoStorage\.media \+ studioMusicStorageOrigin/);
 assert.match(middleware,/\+ personalVideoStorage\.connect \+ studioMusicStorageOrigin/);
 assert.doesNotMatch(middleware, /media-src[^;\n]*https:\/\/\*\.supabase\.co/);
});

test("iOS music picker retains safe signed preview, explicit player, and retry",()=>{
 assert.match(picker,/data-video-studio-music-library/);
 assert.match(picker,/data-video-studio-music-open/);
 assert.match(picker,/studioMusicFilter/);
 assert.match(picker,/sourceVerified/);
 assert.match(picker,/src=\{src\} preload="none"/);
 assert.match(picker,/audio\.play\(\)/);
 assert.match(picker,/onError=\{\(\)=>\{setFailed\(true\)/);
 assert.match(picker,/expiresAt:Date\.now\(\)\+/);
 assert.match(picker,/onRetry=\{\(\)=>void getRecording\(row,false\)\}/);
 assert.match(picker,/fetch\(url\.href,\{cache:"no-store"\}\)/);
 assert.match(picker,/buffer\.size!==row\.bytes/);
});

test("compact responsive audio cards keep controls aligned",()=>{
 assert.match(picker,/className=\{styles\.card\}/);
 assert.match(picker,/className=\{styles\.actions\}/);
 assert.match(picker,/className=\{styles\.search\}/);
 assert.match(picker,/items\.slice\(0,visibleCount\)/);
 assert.match(css,/\.actions\{display:grid;grid-template-columns:1fr 1fr/);
 assert.match(css,/\.cardHeader\{display:flex/);
 assert.match(css,/@media\(max-width:430px\)/);
});

test("merged audio UI retains both featured carousel and signed searchable player",()=>{
 assert.match(picker,/export function StudioMusicFeatured/);
 assert.match(picker,/data-video-studio-featured-recording/);
 assert.match(picker,/initialOpen=false/);
 assert.match(picker,/useState\(Boolean\(initialOpen\)\)/);
 assert.match(picker,/function AudioTransport/);
 assert.match(picker,/MUSIC_URL_UNTRUSTED/);
 assert.match(picker,/studioMusicFeaturedTracks/);
 assert.match(picker,/data-video-studio-music-library/);
});

test("signed preview cache expires safely and deduplicates preload",async()=>{
 const {createStudioMusicPreviewUrlCache}=await import("../lib/mandala/studio-music-preview-cache.mjs");
 let now=100000,calls=0;
 const cache=createStudioMusicPreviewUrlCache(async row=>{
  calls++;return {url:"https://example.supabase.co/"+row.id,expiresAt:now+60000};
 },{now:()=>now,minValidityMs:15000});
 const rows=Array.from({length:5},(_,id)=>({id:"track-"+id}));
 cache.prime(rows,3);
 const [a,b]=await Promise.all([cache.get(rows[0]),cache.get(rows[0])]);
 assert.equal(a,b);
 await Promise.all(rows.slice(0,3).map(row=>cache.get(row)));
 assert.equal(calls,3);
 assert.equal(cache.peek(rows[0].id),a);
 assert.equal(cache.peek(rows[4].id),null);
 now+=46000;assert.equal(cache.peek(rows[0].id),null);
 await cache.get(rows[0]);assert.equal(calls,4);
 cache.clear();assert.equal(cache.peek(rows[0].id),null);
});

test("iOS fast music preview keeps play() in the original click and never predownloads whole MP3",()=>{
 assert.match(picker,/createStudioMusicPreviewUrlCache\(verifiedStudioMusicUrl\)/);
 assert.match(picker,/signedUrlCache\.prime\(picked,3\)/);
 assert.match(picker,/const readyUrl=signedUrlCache\.peek\(row\.id\)/);
 assert.match(picker,/if\(readyUrl\)\{/);
 assert.match(picker,/playFromUrl\(row,readyUrl,sequence\)/);
 assert.match(picker,/audio\.play\(\)/);
 assert.match(picker,/onTouchStart=/);
 assert.match(picker,/data-audio-buffering=\{buffering\}/);
 assert.doesNotMatch(picker,/<audio[^>]*autoPlay/);
});

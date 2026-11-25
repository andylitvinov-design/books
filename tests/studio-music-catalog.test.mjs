import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {safeStudioMusicTags,studioMusicFilter,musicTagLabel,studioMusicFeaturedTracks,studioMusicAttachmentName} from "../lib/mandala/studio-music-catalog.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const rows=[
 {title:"Chopin · Nocturne",category:"calm",composer:"Frédéric Chopin",performer:"Frank Levy",tags:["piano","meditative","verified-audio"],mood:"calm"},
 {title:"Haydn · String quartet",category:"love",composer:"Haydn",performer:"Musopen",tags:["string-quartet","romantic"],mood:"focus"}
];
test("music tags strip unsafe markup, URLs and duplicates",()=>{
 assert.deepEqual(safeStudioMusicTags(["piano","piano","<img>","https://bad.com","cello"]),["piano","cello"]);
 assert.deepEqual(safeStudioMusicTags(null),[]);
});
test("catalogue filters by purpose, instrument, composer, mood and title",()=>{
 assert.equal(studioMusicFilter(rows,{category:"calm"}).length,1);
 assert.equal(studioMusicFilter(rows,{tag:"string-quartet"}).length,1);
 assert.equal(studioMusicFilter(rows,{query:"LEVY"}).length,1);
 assert.equal(studioMusicFilter(rows,{query:"Medita"}).length,1);
 assert.equal(studioMusicFilter(rows,{category:"love",tag:"piano"}).length,0);
 assert.equal(musicTagLabel("string-quartet","ru"),"Струнные");
 assert.equal(musicTagLabel("string-quartet","es"),"Cuerdas");
});
test("public preview requires original recording evidence and never invents listening score",()=>{
 const server=read("lib/mandala/studio-music-library-server.js");
 const picker=read("components/studio-music-picker.jsx");
 const route=read("app/api/app/studio-music/route.js");
 assert.match(server,/verified_sha256/);
 assert.match(server,/verified_sha1/);
 assert.match(server,/downloaded_bytes=a.bytes/);
 assert.match(server,/license_code in \('CC0-1.0','PDM-1.0'\)/);
 assert.ok(server.includes('row.status==="ready"&&row.source_verified===true'));
 assert.match(server,/technical_preview/);
 assert.ok(server.includes('const reviewed=row?.status==="published"&&row.rights_confirmed&&row.quality_score>=4;'));
 assert.match(picker,/studioMusicFilter/);
 assert.match(picker,/sourceVerified/);
 assert.match(picker,/preload="none"/);
 assert.match(route,/requireSameOrigin/);
});

test("verified original recordings are featured first in the user's chosen Audio category",()=>{
 const rows=[
  {id:"00000000-0000-4000-8000-000000000001",title:"Chopin · Nocturne No. 2 · Frank Levy",category:"love",mime:"audio/mpeg",bytes:1500000,status:"ready",reviewStage:"technical_preview",sourceVerified:true},
  {id:"00000000-0000-4000-8000-000000000002",title:"Bach · Prelude No. 1 · Kimiko Ishizaka",category:"calm",mime:"audio/mpeg",bytes:1800000,status:"ready",reviewStage:"technical_preview",sourceVerified:true},
  {id:"00000000-0000-4000-8000-000000000003",title:"Fake synthesized melody",category:"calm",mime:"audio/mpeg",bytes:1800000,status:"ready",reviewStage:"private",sourceVerified:false},
  {id:"00000000-0000-4000-8000-000000000004",title:"Unreviewed user upload",category:"energy",mime:"audio/mpeg",bytes:1800000,status:"published",rightsConfirmed:false,qualityScore:null}
 ];
 assert.deepEqual(studioMusicFeaturedTracks(rows,"love").map(x=>x.id),[rows[0].id]);
 assert.deepEqual(studioMusicFeaturedTracks(rows,"calm").map(x=>x.id),[rows[1].id]);
 assert.deepEqual(studioMusicFeaturedTracks(rows,"all").map(x=>x.id),[rows[1].id,rows[0].id]);
 assert.equal(studioMusicFeaturedTracks(rows,"energy").length,0);
 assert.equal(studioMusicAttachmentName(rows[0]),"Chopin · Nocturne No. 2 · Frank Levy.mp3");
});
test("approved Audio panel keeps verified recordings available without auto-play",()=>{
 const studio=read("components/mandala-free-video-studio.tsx");
 const featured=read("components/studio-music-picker.jsx");
 const start=studio.indexOf('data-video-audio-compact-grid');
 const insert=studio.indexOf('<StudioMusicFeatured',start);
 const legacy=studio.indexOf('filteredAudio.slice(0,4)',start);
 assert.ok(start>0&&legacy>start&&insert>legacy);
 assert.match(studio,/category=\{audioCategory\}/);
 assert.match(studio,/onSelect=\{attachVerifiedStudioMusic\}/);
 assert.match(studio,/verifiedLibraryAudioFileRef\.current/);
 assert.match(studio,/uploadedAudio\.file!==verifiedLibraryAudioFileRef\.current/);
 assert.match(featured,/data-video-studio-featured-recording/);
 assert.match(featured,/data-video-studio-featured-play/);
 assert.match(featured,/signedStudioMusicUrl|verifiedStudioMusicUrl/);
 assert.match(featured,/preload="none"/);
 assert.doesNotMatch(featured,/<audio[^>]*autoPlay/);
});

import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {safeStudioMusicTags,studioMusicFilter,musicTagLabel} from "../lib/mandala/studio-music-catalog.mjs";
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

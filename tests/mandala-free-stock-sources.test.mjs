import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {createHash} from "node:crypto";
import {STOCK_POLICIES,assessStockClip,validateFreeSceneBrief} from "../lib/mandala/free-stock-sources.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const now=new Date("2026-10-30T12:00:00Z");
const clip=(i,p="mixkit")=>({provider:p,file:"video-"+i+".mp4",author:"Owner "+i,
 clipTitle:"Landscape "+i,sourcePage:"https://"+STOCK_POLICIES[p].host+"/nature/"+i,
 licenseId:STOCK_POLICIES[p].id,licenseUrl:STOCK_POLICIES[p].license,checkedOn:"2026-10-29",
 licenseEvidence:"Verified on individual stock asset page",
 exactClipLicenseConfirmed:true,commercialUseApproved:true,editingApproved:true,identifiableSubjectsCleared:true,
 noRecognizablePeople:true,noVisibleBrandLogos:true});
const example=()=>({id:"quiet-meadow-01",theme:"health",symbol:"≋",tags:["calm","nature"],
 label:{ru:"Тихий луг",en:"Quiet meadow",es:"Pradera tranquila"},ownerApproved:true,rawClipsPublished:false,
 sources:[clip(1),clip(2)]});
test("licence is checked for each stock video, not provider globally",()=>{
 assert.equal(validateFreeSceneBrief(example(),now),true);
 for(const p of Object.keys(STOCK_POLICIES))assert.equal(assessStockClip(clip(1,p),now),null);
 const restricted=clip(1);restricted.licenseId="mixkit_video_restricted";
 assert.equal(assessStockClip(restricted,now),"unverified_license");
 const unsafe=clip(1);unsafe.sourcePage="https://mixkit.co.evil.example/watch";
 assert.equal(assessStockClip(unsafe,now),"untrusted_source_page");
 const old=clip(1);old.checkedOn="2025-01-01";
 assert.equal(assessStockClip(old,now),"outdated_license_review");
 const person=clip(1);person.noRecognizablePeople=false;
 assert.equal(assessStockClip(person,now),"subjects_or_logos_not_clear");
 const noRelease=clip(1);noRelease.identifiableSubjectsCleared=false;
 assert.equal(assessStockClip(noRelease,now),"unverified_rights");
 assert.equal(assessStockClip({...clip(1),provider:"coverr"},now),"unsupported_provider");
});
test("requires owner approval, two different sources, EN/RU/ES and no raw distribution",()=>{
 const v=example();v.rawClipsPublished=true;assert.throws(()=>validateFreeSceneBrief(v,now));
 v.rawClipsPublished=false;v.sources[1]=clip(1);assert.throws(()=>validateFreeSceneBrief(v,now));
 v.sources[1]=clip(2);v.label.ru="";assert.throws(()=>validateFreeSceneBrief(v,now));
 v.label.ru="Тихий луг";v.ownerApproved=false;assert.throws(()=>validateFreeSceneBrief(v,now));
});
test("static JSON-backed gallery only activates approved pre-encoded films",()=>{
 const data=JSON.parse(read("data/video-catalog/free-stock-scenes.json"));
 assert.ok(Array.isArray(data));assert.ok(data.every(x=>x.status==="approved"&&x.sha256));
 const theme=read("lib/mandala/holistic-video-themes.ts");
 const film=read("lib/mandala/film-collection-v2.ts");
 const cli=read("scripts/import-free-stock-scene.mjs");
 assert.match(theme,/free-stock-scenes\.json/);assert.match(film,/free-stock-scenes\.json/);
 assert.match(cli,/ffprobe/);assert.match(cli,/libx264/);assert.match(cli,/visibleCreditLine/);
 assert.doesNotMatch(cli,/\bfetch\s*\(|axios|process\.env\.[A-Z_]*API_KEY/);
 const prior=JSON.parse(read("public/videos/holistic-house/film-collection-v2/manifest.json"));
 assert.equal(prior.scenes.length,20);
});

test("all twelve produced CC-BY H.264 film files have matching SHA-256, posters and credits",()=>{
 const scenes=JSON.parse(read("data/video-catalog/free-stock-scenes.json"));
 assert.equal(scenes.length,12);
 for(const scene of scenes){
  const file=new URL("../public"+scene.video,import.meta.url);
  const poster=new URL("../public"+scene.poster,import.meta.url);
  const bytes=readFileSync(file);
  assert.ok(bytes.byteLength>20000,scene.id);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),scene.sha256,scene.id);
  assert.ok(existsSync(poster),scene.id);
  assert.match(scene.attribution,/Joel Holland/);
  assert.ok(scene.sources.every(s=>s.licenseId==="cc_by_4_0"&&s.creator==="Joel Holland"));
  assert.ok(scene.sources.every(s=>s.sourcePage.startsWith("https://dareful.com/")));
 }
});

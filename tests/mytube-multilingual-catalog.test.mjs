import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {rankDiscoveryVideos} from "../lib/video-discovery/ranker.mjs";
import {buildPublishedVideoIndex} from "../lib/video-discovery/catalog.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const json=path=>JSON.parse(read(path));
const video=(id,audioLanguage)=>({
  id,kind:"video",youtubeId:id,title:"Approved course",description:"Public class",
  audioLanguage,curation:"verified",sourceApproved:true,
});

test("RU audio remains discoverable on an English interface with mixed original languages",()=>{
  const items=buildPublishedVideoIndex([
    video("AaAaAaAaAa1","en"),video("BbBbBbBbBb2","ru"),
    video("CcCcCcCcCc3","ru"),video("BbBbBbBbBb2","ru"),
  ]);
  assert.equal(items.length,3,"same YouTube ID is listed only once");
  assert.deepEqual(rankDiscoveryVideos(items,{language:"ru"}).map(x=>x.youtubeId),
    ["BbBbBbBbBb2","CcCcCcCcCc3"]);
  assert.equal(rankDiscoveryVideos(items,{language:"es"}).length,0,
    "an empty language cannot silently serve dubbed or unrelated videos");
});

test("MyTube loads public owner publications across all languages, not the UI locale",()=>{
  const page=read("app/[locale]/mytube/page.tsx");
  const feed=read("lib/public-library-feed.ts");
  const hub=read("components/library-hub.tsx");
  assert.match(page,/loadPublicMyTubeVideos\(\)/);
  assert.match(feed,/\(\["ru", "en", "es"\] as const\)\.map\(language => listPublicLibraryVideos\(config, language\)\)/);
  assert.match(feed,/Promise\.allSettled/);
  assert.match(hub,/audioLanguage: video\.locale/);
  assert.match(hub,/greekVideoSeries\("ru"\)/);
  assert.match(hub,/approvedAcademyDiscoveryVideos\(\)/);
  assert.match(hub,/siteIntroductions/);
  assert.match(hub,/item\.sourceGroup!=="site-introduction"/);
});

test("extended Academy catalog uses only source-backed public embeds and excludes unreviewed records",()=>{
  const hub=read("components/library-hub.tsx");
  assert.match(hub,/preferredAcademyRecords\(sourceLocale,record=>/);
  assert.match(hub,/record\.sourceLocale===sourceLocale/);
  assert.match(hub,/record\.status!=="needs_review"/);
  assert.match(hub,/media\.status==="verified_legacy_public_embed"/);
  assert.match(hub,/sourceLabel:record\.sourceProvider==="psimaster"/);
  const sources=[...json("data/academy/sources.generated.json"),
    ...json("data/academy/psimaster-sources.generated.json")];
  const media=[...json("data/academy/media.generated.json"),
    ...json("data/academy/psimaster-media.generated.json")];
  const allowed=new Set(["videos","reiki","mysteries","symbolic"]);
  const original=new Map();
  for(const source of sources){
    if(!allowed.has(source.direction)||source.status==="needs_review")continue;
    if(!["ru","en"].includes(source.sourceLocale))continue;
    const exact=media.filter(item=>item.logicalId===source.logicalId&&item.sourceUrl===source.sourceUrl);
    const candidates=exact.some(item=>/youtube\.com\/embed\//.test(item.mediaUrl))
      ? exact : media.filter(item=>item.logicalId===source.logicalId);
    for(const item of candidates){
      if(item.status!=="verified_legacy_public_embed")continue;
      const id=item.mediaUrl.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/)?.[1];
      if(id&&!original.has(id))original.set(id,source.sourceLocale);
    }
  }
  assert.ok(original.size>=70,"at least 70 source-backed public teaching videos exist");
  assert.ok([...original.values()].some(x=>x==="ru"),"the Russian archive must be included");
});

test("newly included site videos are existing public service embeds, not invented uploads",()=>{
  const hub=read("components/library-hub.tsx");
  const service=read("data/service-video-library.ts");
  for(const id of ["eLsjFaKCBhI","vqRmI79cecQ","sfVFOQNr2qk"]){
    assert.match(hub,new RegExp(id));
    assert.match(service,new RegExp(id));
  }
  assert.match(hub,/sourceApproved:true/);
  assert.match(hub,/buildPublishedVideoIndex\(/);
});

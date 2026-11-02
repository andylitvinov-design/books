import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=name=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
const studio=read("components/mandala-free-video-studio.tsx");
const studioCss=read("components/mandala-video-mobile.module.css");
const page=read("app/[locale]/mytube/page.tsx");
const hub=read("components/library-hub.tsx");
const feed=read("components/library-feed.tsx");
const discover=read("components/video-discovery.tsx");
const feedCss=read("components/library-feed.module.css");
const mytubeCss=read("app/[locale]/mytube/mytube.module.css");
const localeCode=read("lib/public-locales.ts");

test("six old editor workspaces and an additional, real MyTube link",()=>{
  const items=studio.match(/const workspaceTabs=\[([\s\S]*?)\] as const;/)?.[1];
  assert.ok(items);
  assert.equal((items.match(/id:"/g)||[]).length,6);
  assert.match(studio,/data-video-quick-control="mytube"/);
  assert.match(studio,/href=\{"\/"\+locale\+"\/mytube"\}/);
  assert.match(studio,/aria-disabled=\{recording\|\|preparing\}/);
  assert.match(studioCss,/quickVideoNav\{grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
});
test("new MyTube screen reads the exact existing Library video index",()=>{
  assert.match(page,/data-mytube-page/);
  assert.match(page,/buildPublicVideoDiscoveryItems\(locale,videos,approvedMeditations\)/);
  assert.match(hub,/export function buildPublicVideoDiscoveryItems/);
  assert.match(hub,/view === "videos"\s*\?\s*buildPublicVideoDiscoveryItems/);
  assert.match(page,/loadApprovedVideoDiscoveries\(\)/);
  assert.match(page,/VideoDiscovery locale=\{locale\} videos=\{publicVideos\} variant="mytube"/);
});
test("deep filters use actual public metadata, not private scores or imaginary durations",()=>{
  assert.match(discover,/data-mytube-search/);
  assert.match(discover,/data-mytube-source/);
  assert.match(discover,/data-mytube-period/);
  assert.match(discover,/durationsAvailable/);
  assert.match(discover,/VIDEO_LIFE_AREAS\.map/);
  assert.match(discover,/videoLayout=\{variant==="mytube"\?"mytube":"default"\}/);
  assert.match(feed,/videoLayout\?: "default" \| "mytube"/);
  assert.match(feed,/data-video-layout=\{videoLayout\}/);
  assert.match(feed,/https:\/\/www\.youtube-nocookie\.com\/embed/);
  assert.match(feedCss,/\.mytubeFeed \.visual.*aspect-ratio:16\/9/s);
  assert.match(mytubeCss,/max-width:640px/);
});
test("MyTube route supports all three locales and existing locale switch",()=>{
  assert.match(localeCode,/mytube/);
  for(const locale of ["en","ru","es"])
    assert.match(page,new RegExp(locale+":\\{title:"));
});
test("new TSX sources parse without diagnostics",()=>{
  for(const file of ["components/video-discovery.tsx","components/library-hub.tsx",
    "components/library-feed.tsx","app/[locale]/mytube/page.tsx"]){
    const result=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,
      compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
    assert.deepEqual((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
      .map(d=>ts.flattenDiagnosticMessageText(d.messageText," ")),[],file);
  }
});

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

test("MyTube PR must run actual macOS WebKit encoded-video gate without widening unrelated PRs",()=>{
  const workflow=read(".github/workflows/holistic-support-mandala.yml");
  const match=workflow.match(/\n  voice-webkit-macos:\n    if: ([^\n]+)\n    runs-on: macos-15/);
  assert.ok(match,"macOS native WebKit job remains present and guarded");
  const guard=match[1];
  assert.match(guard,/github\.event_name == 'pull_request'/);
  assert.match(guard,/github\.event\.pull_request\.draft == false/);
  const prefixes=[...guard.matchAll(/startsWith\(github\.head_ref, '([^']+)'\)/g)].map(m=>m[1]);
  for(const prefix of [
    "codex/voice-studio-","codex/voice-mix-","fix/video-",
    "feat/video-phrase-catalog-","codex/perf-video-studio-",
    "codex/hypno-third-workspace-","feat/mytube-"
  ]) assert.equal(prefixes.filter(value=>value===prefix).length,1,prefix);
  const included=branch=>prefixes.some(prefix=>branch.startsWith(prefix));
  for(const branch of ["feat/mytube-seventh-video-studio-tool-20261102",
    "feat/video-phrase-catalog-new","fix/video-safari",
    "codex/voice-studio-verified"])
    assert.equal(included(branch),true,branch);
  for(const branch of ["feat/unrelated-ui","fix/security-other","docs/mytube",
    "feat/my-tube-typo","random/feature"])
    assert.equal(included(branch),false,branch);
  const job=workflow.slice(workflow.indexOf("\n  voice-webkit-macos:\n"));
  assert.match(job,/HH_VOICE_E2E_ENGINE: webkit/);
  assert.match(job,/HH_LIVE_VIDEO_ENGINE=webkit/);
  assert.match(job,/first-video-live-export\.mjs/);
  assert.match(job,/Preserve anonymous WebKit encoded video evidence/);
  assert.doesNotMatch(guard,/\|\| true|always\(\)/);
});

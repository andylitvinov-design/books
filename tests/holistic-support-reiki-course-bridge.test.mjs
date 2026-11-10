import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const read = p => readFileSync(new URL("../"+p,import.meta.url),"utf8");
const route=read("app/[locale]/holistic-support/mobile/page.tsx");
const mobile=read("components/holistic-support-mobile.tsx");
test("English Reiki originals appear in RU without dropping Russian archive",()=>{
 assert.ok(route.includes("const englishVideos: SupportMobileVideo[]"));
 assert.ok(route.includes("const russianVideos: SupportMobileVideo[]"));
 assert.ok(route.includes("courseKey: video.key"));
 assert.ok(route.includes("russianVideos.filter(video => !englishIds.has(video.id))"));
 assert.ok(mobile.includes("videos.filter(video => video.courseKey)"));
 for (const slug of ["tantra-reiki","kundalini-reiki","reiki-yggdrasil","flight-to-sun"])
  assert.ok(read("data/academy/english-guided-meditations.ts").includes('key: "'+slug+'"'),slug);
});
test("selected lesson updates hero, displays price pills and opens existing course",()=>{
 for(const s of ["Пройти курс бесплатно","Take the course free","Hacer el curso gratis",
 "Цена · €0","Видео на английском","activeReiki?.description",
 "data-support-free-reiki-cta","data-support-reiki-price","reikiAfterVideo","href={freeCourseHref}"])
  assert.ok(mobile.includes(s),s);
 assert.ok(read("lib/academy/reiki-free-course.ts").includes("principles-of-energywork/learn"));
 assert.ok(read("components/holistic-support-mobile.module.css").includes("max-width:350px"));
 assert.ok(mobile.includes("data-support-video-mode={choice}"));
 assert.match(read("components/holistic-support-mobile.module.css"),
   /\.videoSection\[data-support-video-mode="pump"\] \.videoCard::after \{ display:none; \}/);
});
test("changed TSX parses",()=>{
 for (const name of ["app/[locale]/holistic-support/mobile/page.tsx","components/holistic-support-mobile.tsx"]){
  const compiled=ts.transpileModule(read(name),{fileName:name,reportDiagnostics:true,
    compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
  assert.deepEqual((compiled.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
    .map(d=>ts.flattenDiagnosticMessageText(d.messageText," ")),[],name);
 }
});

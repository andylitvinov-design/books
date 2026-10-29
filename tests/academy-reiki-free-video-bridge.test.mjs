import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Academy provides three verified English Reiki lesson sources and free entry",()=>{
 const a=read("components/academy-video-courses.tsx"),v=read("components/academy-video-library-client.tsx");
 for(const s of ["english-tantra-reiki","english-kundalini-reiki","english-reiki-yggdrasil",
  "kundaliniVideo","REIKI_FREE_COURSE_PATH","t.kundaliniIntro"]) assert.ok(a.includes(s),s);
 for(const s of ["data-academy-free-reiki-course","course.freeCourseHref",
  "Пройти курс бесплатно","Цена · €0"]) assert.ok(v.includes(s),s);
 assert.ok(read("lib/academy/reiki-free-course.ts").includes("principles-of-energywork/learn"));
});
test("Academy TSX parses",()=>{
 for(const p of ["components/academy-video-courses.tsx","components/academy-video-library-client.tsx"]){
 const result=ts.transpileModule(read(p),{fileName:p,reportDiagnostics:true,
  compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
 assert.deepEqual((result.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
  .map(d=>ts.flattenDiagnosticMessageText(d.messageText," ")),[],p);
 }
});

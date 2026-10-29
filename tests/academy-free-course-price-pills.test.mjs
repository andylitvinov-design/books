import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const src=readFileSync(new URL("../components/academy-free-course-banner.tsx",import.meta.url),"utf8");
test("free Academy banner has compact price chips in EN/RU/ES",()=>{
 for(const text of ["Price · €0","Цена · €0","Precio · €0","styles.pricePill"])
  assert.ok(src.includes(text),text);
 const css=readFileSync(new URL("../components/academy-free-course-banner.module.css",import.meta.url),"utf8");
 assert.ok(css.includes(".pricePill"));
});
test("free Academy banner parses",()=>{
 const parsed=ts.transpileModule(src,{fileName:"academy-free-course-banner.tsx",reportDiagnostics:true,
  compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
 assert.deepEqual((parsed.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
   .map(d=>ts.flattenDiagnosticMessageText(d.messageText," ")),[]);
});

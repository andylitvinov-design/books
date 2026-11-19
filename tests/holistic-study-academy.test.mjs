import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const component=read("components/holistic-study-academy.tsx");
const css=read("components/holistic-study-academy.module.css");
const page=read("app/[locale]/holistic-support/mobile/page.tsx");
test("Study is three schools, eight source-backed courses and three locales",()=>{
 const matches=[...component.matchAll(/\{ id: "(reiki|mysteries|free)", keys: \[([^\]]+)\] \}/g)];
 assert.equal(matches.length,3);
 const ids=matches.flatMap(m=>[...m[2].matchAll(/"([^"]+)"/g)].map(x=>x[1]));
 assert.deepEqual(ids,["yggdrasil","tantra","kundalini","greece","egypt","practitioner","magic","meditation"]);
 for(const locale of ["ru","en","es"])assert.ok(component.includes('"'+locale+'": {'));
 assert.match(component,/data-study-academy-group/);
 assert.match(component,/data-study-academy-course/);
 assert.match(component,/REIKI_FREE_COURSE_PATH/);
 assert.match(component,/findAcademyRecord/);
 assert.match(component,/view=meditation/);
 assert.doesNotMatch(component,/Psycho-homeopathy|Systemic constellations|OPORA/);
});
test("Study default bypasses mixed player and DB catalog while other views remain",()=>{
 const early='if (initialChoice === "pump") return <HolisticStudyAcademy';
 assert.ok(page.includes(early));
 assert.ok(page.indexOf(early)<page.indexOf("const originalMysteryCourses"));
 assert.ok(page.includes("buildSupportLearningCatalog(locale, [], [])"));
 assert.ok(page.includes("<HolisticSupportMobile locale={locale} videos={videos}"));
});
test("Study TSX parses, mobile touch and bottom dock stay intact",()=>{
 const sf=ts.createSourceFile("study.tsx",component,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.deepEqual(sf.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText," ")),[]);
 for(const marker of ["@media(max-width:350px)","safe-area-inset-bottom","focus-visible"])
   assert.ok(css.includes(marker));
 assert.ok(read("lib/unified-mobile-dock.mjs").includes('case "practice": return prefix+"/shamanica"'));
});

import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const page=read("app/[locale]/academy/reiki/tantra-reiki/discover/page.tsx");
const css=read("app/[locale]/academy/reiki/tantra-reiki/discover/page.module.css");
test("Approved Tantra Reiki ad landing is trilingual and metadata-complete",()=>{
  for(const l of ["en","ru","es"]) assert.match(page,new RegExp("\\b"+l+":\\s*\\{"));
  assert.match(page,/generateMetadata/);assert.match(page,/alternates:\{canonical:path/);
});
test("Real free course/video options and an honest initiation path",()=>{
  assert.match(page,/reiki-approved-sunrise-v3\.webp/);
  assert.match(page,/free-initiation#tantra-practice-video/);
  assert.match(page,/const freeCourse=REIKI_FREE_COURSE_PATH/);
  assert.match(read("lib/academy/reiki-free-course.ts"), /principles-of-energywork\/learn/);
  assert.match(page,/free-initiation#initiation-choices/);
  assert.match(page,/does not confer an initiation/);
});
test("Responsive promotion without personal-data capture or unauthorized ads",()=>{
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/focus-visible/);
  assert.doesNotMatch(page,/fbq\(|retarget|autoplay|onSubmit|signIn|signUp/i);
});

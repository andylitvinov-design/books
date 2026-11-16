import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const source=read("components/services-assist-homeopathy.tsx");
const css=read("components/services-assist-homeopathy.module.css");
const assist=read("components/services-assist-mobile.tsx");
const qa=read("scripts/verify-public-services-production.mjs");

test("three real author-library remedy portraits and localized safe links",()=>{
  for(const slug of ["gelsemium","ignatia-amara","nux-vomica"]){
    assert.match(source,new RegExp('slug: "'+slug+'"'));
    assert.match(source,new RegExp('/media/remedies/'+slug+'/message'));
    assert.ok(qa.includes('"/"+libraryLocale+"/homeopathy/remedies/"+slug'));
  }
  assert.match(source,/homeopathy\/remedies\/" \+ item\.slug/);
  assert.match(source,/locale === "es" \? "en" : locale/);
  for(const locale of ["ru:","en:","es:"]) assert.ok(source.includes(locale));
});
test("consultation opens actual visible service, not hidden legacy anchor",()=>{
  assert.match(source,/locale \+ "\/services\/psychohomeopathy"/);
  assert.doesNotMatch(source,/href="#consultation"/);
  assert.match(source,/\/images\/holistic-house\/andy-about.png/);
  assert.match(source,/confirmed before booking/);
});
test("educational only, no unproven clinical claims or private transmission",()=>{
  assert.match(source,/not personalised prescriptions/);
  assert.match(source,/lacks reliable evidence/);
  assert.match(source,/не имеет надёжных доказательств/);
  assert.doesNotMatch(source,/\bdosage\b|\bpotency\b|\bmg\b/);
  assert.doesNotMatch(source,/fetch\(|localStorage|sessionStorage|axios/);
});
test("compact mobile shelf retains safe touch targets and keyboard access",()=>{
  assert.match(css,/max-width:760px/);
  assert.match(css,/min-height:44px/);
  assert.match(css,/:focus-visible/);
  assert.match(source,/aria-labelledby="assist-homeopathy-title"/);
  assert.match(source,/data-assist-remedy/);
});
test("non-crisis conditional is separate from single inline chat and MyTube",()=>{
  assert.match(assist,/import \{ ServicesAssistHomeopathy \} from "\.\/services-assist-homeopathy"/);
  assert.match(assist,/!crisis&&selection\?<ServicesAssistHomeopathy locale=\{locale\}/);
  assert.match(assist,/!crisis&&selection\?<ServicesAssistMyTube locale=\{locale\}/);
  assert.match(assist,/data-assist-dialogue/);
  assert.match(assist,/data-assist-reset/);
  assert.match(assist,/data-assist-topic-suggestions/);
});
test("real mobile browser acceptance verifies all three cards and crisis suppression",()=>{
  assert.match(qa,/const homeopathy=assist\.locator\("\[data-assist-homeopathy\]"\)/);
  assert.match(qa,/homeopathy\.locator\("a\[data-assist-remedy\]"\)\)\.toHaveCount\(3\)/);
  assert.match(qa,/Homeopathy library touch target/);
  assert.match(qa,/assist\.locator\("\[data-assist-homeopathy\]"\)\)\.toHaveCount\(0\)/);
  assert.match(qa,/data-assist-mytube/);
});

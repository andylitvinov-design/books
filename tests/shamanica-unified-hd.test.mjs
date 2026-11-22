import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const photoPath=name=>"public/images/holistic-house/"+name;
test("Shamanic uses high-definition first-party illustrations instead of tiny previews",()=>{
 const assets=[
  ["shamanic-cards-personal-hd.avif",20572],
  ["shamanic-cards-business-hd.avif",21541],
  ["shamanic-lounge-hd.avif",30943],
  ["shamanic-sun-hd.avif",5867],
 ];
 for(const [name,size] of assets){
  const path=photoPath(name);
  const bytes=readFileSync(new URL("../"+path,import.meta.url));
  assert.equal(statSync(new URL("../"+path,import.meta.url)).size,size,path);
  assert.equal(bytes.toString("ascii",4,12).slice(0,4),"ftyp",path);
 }
 const css=source("components/shamanica-mobile.module.css");
 const business=source("components/shamanica-business-content.module.css");
 for(const name of ["shamanic-cards-personal-hd.avif","shamanic-lounge-hd.avif"])assert.ok(css.includes(name));
 assert.ok(business.includes("shamanic-cards-business-hd.avif"));
});
test("Both routes use a SINGLE compact lounge and the same audience switch",()=>{
 const p=source("components/shamanica-mobile.tsx");
 const b=source("components/shamanica-business-content.tsx");
 const css=source("components/shamanica-mobile.module.css");
 const businessCss=source("components/shamanica-business-content.module.css");
 assert.match(p,/data-shamanica-business-page=\{business\?"true":undefined\}/);
 assert.match(p,/ShamanicaBusinessContent locale=\{locale\}/);
 assert.ok(p.indexOf('<section className={styles.hero}') < p.indexOf('{business?<ShamanicaBusinessContent'),"shared hero above business content");
 assert.doesNotMatch(b,/shamanica-business-title/);
 assert.doesNotMatch(b,/className=\{styles.feature\}/);
 assert.match(css,/SHAMANIC_UNIFIED_HD_ONE_SCREEN_20261121/);
 assert.match(css,/height:clamp\(155px,24dvh,226px\)/);
 assert.match(css,/grid-auto-rows:clamp\(72px,10\.8dvh,99px\)/);
 assert.match(businessCss,/SHAMANIC_BUSINESS_SHARED_CABINET_HD_20261121/);
 assert.match(businessCss,/grid-auto-rows:clamp\(72px,10\.8dvh,99px\)/);
});
test("All six personal cards open real subcategory choices, then real existing destinations",()=>{
 const p=source("components/shamanica-mobile.tsx");
 const expected=["guidance","rituals","remedies","mysteries","energy","academy"];
 const ids=expected.map(id=>p.indexOf('id:"'+id+'"'));
 assert.ok(ids.every(n=>n>=0));
 assert.deepEqual(ids,[...ids].sort((a,b)=>a-b),"approved 2x3 order");
 assert.match(p,/setSelectedShelf\(id\)/);
 assert.match(p,/data-shamanica-subcategories=\{selectedShelf\}/);
 assert.match(p,/personalSubcategories\[selectedShelf\]\.map/);
 assert.match(p,/data-shamanica-subcategory=/);
 for(const url of ["holistic-support#dao-guidance","services/psychohomeopathy","academy/mysteries/initiations","academy/reiki/kundalini-reiki"])assert.ok(p.includes(url),url);
 assert.match(p,/shamanicaCategoryHref\(locale,/);
 assert.match(p,/data-shamanica-quiz/);
});
test("Business cards reveal their existing priced and strategic follow-up choices",()=>{
 const b=source("components/shamanica-business-content.tsx");
 const css=source("components/shamanica-business-content.module.css");
 const expected=["express","remedies","strategy","artifacts","energy","energywork"];
 const ids=expected.map(id=>b.indexOf('id:"'+id+'"'));
 assert.deepEqual(ids,[...ids].sort((a,c)=>a-c));
 assert.match(b,/setSelectedShelf\(id\)/);
 assert.match(b,/data-business-second-level/);
 assert.match(b,/data-business-cabinet-shelves/);
 assert.match(b,/data-business-quiz/);
 assert.match(b,/data-business-extras/);
 assert.match(b,/MandatoryMessengerActions/);
 for(const value of ["FREE","45 CAD","75 CAD","200 CAD","300 CAD"])assert.ok(b.includes(value),value);
 for(const title of ["Strategic Goal Review","Business Functions Analyses","Business Teams Review","Growth Strategy & Implementation"])assert.ok(b.includes(title),title);
 assert.match(css,/\.root \.services\[data-expanded="true"\]/);
});
test("Shared bottom dock stays readable and duplicate floating help is suppressed",()=>{
 const css=source("app/unified-mobile-dock.css");
 assert.match(css,/SHAMANIC_UNIFIED_HD_DOCK_20261121/);
 assert.match(css,/body:has\(main\[data-shamanica-mobile\]\) \[data-hh-ihelp-trigger\]/);
 assert.match(css,/white-space:normal!important/);
 assert.match(css,/font-size:clamp\(10px,2\.5vw,10\.3px\)!important/);
});


test("Owner-approved Geanie invitation has real localized CTA and a single shared HD visual shell",()=>{
 const tsx=source("components/shamanica-mobile.tsx");
 const css=source("components/shamanica-mobile.module.css");
 const businessCss=source("components/shamanica-business-content.module.css");
 assert.match(tsx,/data-shamanica-ai-geanie/);
 assert.match(tsx,/data-shamanica-genie-ask/);
 for(const text of ["Need Hint? Help?","Ask our AI Geanie.","Ask a question","Задать вопрос","Hacer una pregunta"])
   assert.ok(tsx.includes(text),text);
 assert.match(tsx,/onClick=\{\(\)=>window\.dispatchEvent\(new Event\("hh:open-ihelp"\)\)\}/);
 assert.match(css,/SHAMANIC_GENIE_APPROVED_20261122/);
 assert.match(css,/shamanic-genie-lounge\.webp/);
 assert.match(css,/shamanic-genie-cards-personal\.webp/);
 assert.match(businessCss,/SHAMANIC_GENIE_BUSINESS_PARITY_20261122/);
 for(const [name,threshold] of [["shamanic-ai-geanie.webp",12000],["shamanic-genie-lounge.webp",60000],["shamanic-genie-cards-personal.webp",45000]]){
  const file=new URL("../"+photoPath(name),import.meta.url);
  assert.ok(statSync(file).size>=threshold,name+" full-resolution first-party image");
 }
 assert.match(css,/grid-auto-rows:clamp\(74px,11\.5dvh,99px\)/);
 assert.match(businessCss,/grid-auto-rows:clamp\(74px,11\.5dvh,99px\)/);
});

import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("the public Home is a tiny server boundary with one interactive leaf",()=>{
 const home=read("components/holistic-house-home.tsx");
 const es=read("app/es/page.tsx");
 const dialog=read("components/home-dialog-first.tsx");
 assert.doesNotMatch(home,/^["']use client["']/m);
 assert.doesNotMatch(home,/\b(?:useState|useEffect|window|document)\b/);
 assert.match(home,/<HomeDialogFirst locale=\{locale\}\/>/);
 assert.match(es,/<HomeDialogFirst locale="es"\/>/);
 assert.match(read("app/page.tsx"),/<HolisticHouseHome locale="en" \/>/);
 assert.match(read("app\/\[locale\]\/page.tsx"),/<HolisticHouseHome locale="ru" \/>/);
 for(const name of ["HomeSectionCarousel","HomeFeaturedWorkspace","MySpaceTopics",
   "ProfileHubTabs","PersonalTestimonials","HomeMoreDisclosure","HomePresentationVideoSection"])
   assert.doesNotMatch(home,new RegExp(name),"Heavy module in critical first-paint bundle: "+name);
 assert.match(dialog,/^["']use client["']/m);
 assert.match(dialog,/data-home-conversation-hero/);
 assert.match(dialog,/data-home-intent-form/);
 assert.match(dialog,/priority unoptimized/);
 assert.doesNotMatch(dialog,/fetch\(|getPublishedSiteVideo|<video|<iframe|autoplay/i);
});

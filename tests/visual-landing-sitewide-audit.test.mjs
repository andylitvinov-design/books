import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

const templates = [
  {
    id:"free-guidance", route:"/en/services/free-situation-review",
    path:"components/free-entry-landing.tsx",
    prefix:"data-free-visual-screen", capture:"<CompactLeadCapture",
    image:"<Image src={scenePhotos", final:"final-capture",
  },
  {
    id:"personal-sessions", route:"/en/services/imagery-therapy",
    path:"components/personal-service-landing.tsx",
    prefix:"data-service-visual-screen", capture:"<CompactLeadCapture",
    image:"<Image src={illustrations", final:"final-capture",
  },
  {
    id:"hypnotherapy-course", route:"/en/services/hypnotherapy-course",
    path:"components/core-service-detail.tsx",
    prefix:"data-core-visual-screen", capture:"<CompactLeadCapture",
    image:"<Image src={visualPhotos", final:"final-capture",
  },
  {
    id:"alchemy", route:"/en/services/alchemy-of-soul",
    path:"components/alchemy-soul-landing.tsx",
    prefix:"data-alchemy-visual-screen", capture:"<CompactLeadCapture",
    image:"<Image src={visualPhotos", final:"final-capture",
  },
  {
    id:"business", route:"/en/services/business-consulting",
    path:"components/business-consulting-landing.tsx",
    prefix:"data-business-visual-screen", capture:"<BusinessWebsiteEnquiry",
    image:"<Image src={visualPhotos", final:"final-capture",
  },
  {
    id:"monthly-support", route:"/en/services/personal-support",
    path:"components/personal-support-landing.tsx",
    prefix:"data-support-visual-screen", capture:"<CompactLeadCapture",
    image:"<Image src={photos", final:"final-capture",
  },
  {
    id:"free-reiki", route:"/en/academy/reiki/free-practitioner-course",
    path:"components/reiki-referral-landing.tsx",
    prefix:"data-reiki-visual-screen", capture:"<CompactLeadCapture",
    image:"<Image src={art[", final:"final-capture",
  },
  {
    id:"antistress", route:"/en/courses/antistress",
    path:"components/public-antistress-landing.tsx",
    prefix:"data-antistress-visual-screen", capture:"<CompactLeadCapture",
    image:"<img src={scenePhotos", final:"final-capture",
  },
  {
    id:"coaching-traditions", route:"/en/academy/coaching/egyptian",
    path:"components/academy-tradition-coaching-landing.tsx",
    prefix:"data-tradition-visual-screen", capture:"<CompactLeadCapture",
    image:"<img src={stageImages", final:"final-capture",
  },
];

test("every migrated template explicitly declares visual stages, real images and final form",()=>{
  for(const item of templates){
    const src=read(item.path);
    assert.ok(src.includes(item.prefix),item.id+" missing visual stage marker");
    assert.ok(src.includes(item.image),item.id+" missing real photographic media");
    assert.ok(src.includes(item.capture),item.id+" missing real capture");
    const last=src.lastIndexOf(item.final), capture=src.lastIndexOf(item.capture);
    assert.ok(last>0 && capture>last,item.id+" contact form belongs in last screen");
    assert.match(src,/locale/,item.id+" missing public locale handling");
  }
});
test("no default browser autoplay, private results, or fabricated bookings in visual stories",()=>{
  const concatenated=templates.map(x=>read(x.path)).join("\n");
  assert.doesNotMatch(concatenated,/autoplay|autoPlay|document\.cookie|localStorage\.|gtag\(|fbq\(/i);
  assert.match(read("components/compact-lead-capture.tsx"),/result\?\.saved !== true/);
  assert.match(read("components/business-website-enquiry.tsx"),/body\?\.received===true/);
  assert.match(read("lib/practitioners/public-service-enquiry.js"),/insert into app\.crm_contacts/);
});
test("all owned EN/RU/ES public service offers keep original route and booking ownership",()=>{
  const path="app/[locale]/services/";
  for(const route of [
    "imagery-therapy","psychohomeopathy","systemic-constellations",
    "business-consulting","personal-support","free-situation-review",
    "remote-energy-support","dao-health-profile",
  ]){
    const src=read(path+route+"/page.tsx");
    assert.match(src,/generateMetadata/);
    assert.match(src,/canonical:/);
  }
  const remote=read("components/remote-energy-support-booking.tsx");
  assert.match(remote,/data-public-visual-landing="remote-energy"/);
  assert.match(remote,/data-remote-visual-screen="final-capture"/);
  assert.match(remote,/window\.location\.assign/);
  assert.match(remote,/REMOTE_SUPPORT_DRAFT_KEY/);
  assert.doesNotMatch(remote,/CompactLeadCapture|\/api\/service-enquiries/);
});
test("no duplicate generic lead footer on migrated templates",()=>{
  const css=read("app/sitewide-capture.css");
  assert.match(css,/body:has\(\[data-public-visual-landing\]\) \[data-sitewide-capture\]/);
  assert.match(css,/body:has\(\[data-free-entry-landing\]\) \[data-sitewide-capture\]/);
  const remote=read("components/remote-energy-support-booking.tsx");
  assert.ok(remote.lastIndexOf("<form")>remote.lastIndexOf("className={styles.disclaimer}"));
});
test("source contract: courses remain freely startable without consented lead submission",()=>{
  const tradition=read("components/academy-tradition-coaching-landing.tsx");
  const ref=read("components/reiki-referral-landing.tsx");
  const reikiScreens=read("app/reiki-landing-screens.css");
  assert.match(tradition,/href=\{courseHref\(locale,slug\)\}/);
  assert.ok(tradition.indexOf("<Link href={courseHref")<tradition.lastIndexOf("<CompactLeadCapture"));
  assert.match(ref,/REIKI_FREE_COURSE_PATH/);
  assert.match(reikiScreens,/One editorial focus per viewport/);
});

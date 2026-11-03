import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

const templates = [
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

// The original Free Express and Alchemy already have newer production
// screens and explicit booking/privacy tests. Keep these real contracts.
const canonicalPages = [
  "components/free-entry-landing.tsx",
  "components/alchemy-soul-landing.tsx",
];
test("Free Express and Alchemy preserve their approved private and consented journeys",()=>{
  const free=read(canonicalPages[0]),alchemy=read(canonicalPages[1]);
  for(const token of ["data-free-entry-landing","data-free-review-intro-video",
    "data-featured-free-review-testimonials","<PersonalExpressEnquiry",
    "<CompactLeadCapture","<SiteVideoPlayer"])
    assert.ok(free.includes(token),"Free review missing "+token);
  assert.ok(free.lastIndexOf("<PersonalExpressEnquiry")>
    free.indexOf("data-featured-free-review-testimonials"));
  for(const token of ['data-alchemy-panel="reviews"','data-alchemy-panel="request"',
    "<SiteVideoPlayer","<StaticPortrait","<AlchemySoulLeadForm",
    'bookingSku="personal-session-60"','<ContactChannelChooser'])
    assert.ok(alchemy.includes(token),"Alchemy missing "+token);
  assert.ok(alchemy.indexOf('data-alchemy-panel="request"')>
    alchemy.indexOf('data-alchemy-panel="reviews"'));
  assert.ok(alchemy.lastIndexOf("<AlchemySoulLeadForm")>
    alchemy.indexOf('data-alchemy-panel="request"'));
});

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
  const concatenated=[...templates.map(x=>x.path),...canonicalPages].map(read).join("\n");
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
  assert.match(remote,/data-public-visual-landing=\{compactFinder \? undefined : "remote-energy"\}/);
  assert.match(remote,/data-remote-visual-screen="final-capture"/);
  // Same-tab app navigation deliberately preserves the private in-memory intention.
  // A hard reload would lose that ephemeral handoff and is not the approved contract.
  assert.match(remote,/stageRemoteSupportPrivateIntention\(selected\.serviceId, intention\)/);
  assert.match(remote,/router\.push\(/);
  assert.match(remote,/source=remote-energy-support/);
  assert.match(remote,/REMOTE_SUPPORT_DRAFT_KEY/);
  assert.doesNotMatch(remote,/CompactLeadCapture|\/api\/service-enquiries/);
});
test("no duplicate generic lead footer on migrated templates",()=>{
  const css=read("app/sitewide-capture.css");
  assert.match(css,/body:has\(\[data-public-visual-landing\]\) \[data-sitewide-capture\]/);
  assert.match(css,/body:has\(\[data-free-entry-landing\]\) \[data-sitewide-capture\]/);
  const remote=read("components/remote-energy-support-booking.tsx");
  assert.ok(remote.indexOf('<article key={master.serviceId}') < remote.indexOf('<form id={"remote-request-"'),
    "the request form belongs to its selected practitioner, not a duplicate global footer");
  assert.ok(remote.includes('data-remote-visual-screen="final-capture"'));
  assert.ok(remote.lastIndexOf("className={styles.disclaimer}") > remote.lastIndexOf('data-remote-public-order-contact'),
    "the public safety notice follows the selected-practitioner contact capture");
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

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("each shared personal service has photo or approved click-to-play video on every narrative screen", () => {
  const ui = read("components/personal-service-landing.tsx");
  const routes = ["psychohomeopathy", "imagery-therapy", "systemic-constellations"];
  for (const route of routes) {
    const page = read("app/[locale]/services/" + route + "/page.tsx");
    assert.match(page, /PersonalServiceLanding/, route);
  }
  assert.match(ui, /data-visual-service-landing="one-screen"/);
  assert.match(ui, /data-service-visual-screen="introduction"/);
  assert.match(ui, /data-service-visual-screen="video"/);
  assert.match(ui, /<ServiceVideoShowcase/);
  assert.match(ui, /<Image src=\{personalServiceImages\[service\]\}/);
  assert.match(ui, /data-service-visual-screen="questions"/);
  assert.match(ui, /data-service-visual-screen=\{`process-\$\{index \+ 1\}`\}/);
  assert.match(ui, /t\.process\.map/);
  assert.match(ui, /data-service-visual-screen="takeaways"/);
  assert.match(ui, /data-service-visual-screen="questions-before-booking"/);
  assert.ok((ui.match(/className=\{styles\.sceneImage\}/g) || []).length >= 4,
    "Each photography-led section must have a real image, not an empty gradient");
});

test("the paid landing ends with opt-in CRM form, rate choices, source attribution and saved receipt", () => {
  const ui = read("components/personal-service-landing.tsx");
  const form = read("components/compact-lead-capture.tsx");
  const css = read("app/sitewide-capture.css");
  assert.match(ui, /data-service-visual-screen="final-capture"/);
  assert.match(ui, /<CompactLeadCapture/);
  assert.match(ui, /sourcePath=\{`\/\$\{locale\}\/services\/\$\{service\}`\}/);
  assert.match(ui, /formatOptions=\{\[/);
  assert.ok(ui.lastIndexOf('data-service-visual-screen="final-capture"') >
    ui.lastIndexOf('data-service-visual-screen="questions-before-booking"'));
  assert.ok(ui.lastIndexOf("<CompactLeadCapture") > ui.lastIndexOf("<ServiceVideoShowcase"));
  assert.match(form, /fetch\("\/api\/service-enquiries"/);
  assert.match(form, /contactConsent: true/);
  assert.match(form, /result\?\.saved !== true/);
  assert.match(form, /committedReference = result\.referenceCode/);
  assert.match(form, /setReference\(committedReference\)/);
  assert.match(css, /data-visual-service-landing/);
  assert.match(css, /data-core-service-visual/);
});

test("other core service details reuse the same photo stages, approved video and final request", () => {
  const ui = read("components/core-service-detail.tsx");
  const form = read("components/compact-lead-capture.tsx");
  assert.match(ui, /data-core-service-visual="one-screen"/);
  assert.match(ui, /data-core-visual-screen="video"/);
  assert.match(ui, /data-core-visual-screen=\{`step-\$\{index \+ 1\}`\}/);
  assert.match(ui, /data-core-visual-screen="limitations"/);
  assert.match(ui, /data-core-visual-screen="final-capture"/);
  assert.ok(ui.lastIndexOf('<CompactLeadCapture') > ui.lastIndexOf('data-core-visual-screen="limitations"'));
  assert.match(ui, /src="\/images\/holistic-house\/andy-about\.png"/);
  assert.match(form, /Contact/);
});

test("portrait 320–430px and reduced-motion styles avoid text-heavy full-height sections", () => {
  const css = read("components/personal-service-landing.module.css");
  const core = read("components/core-service-detail.module.css");
  assert.match(css, /@media\(max-width:767px\)/);
  assert.match(css, /@media\(max-width:350px\)/);
  assert.match(css, /23svh/);
  assert.match(css, /\.capturePortrait/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(core, /@media\(max-width:760px\)/);
  assert.match(core, /@media\(max-width:350px\)/);
  assert.match(core, /\.captureScene/);
});

test("Alchemy and business method pages show their own photo-led sections before one last opt-in enquiry", () => {
  const alchemy = read("components/alchemy-soul-landing.tsx");
  const business = read("components/business-consulting-landing.tsx");
  const businessForm = read("components/business-website-enquiry.tsx");
  const css = read("app/sitewide-capture.css");

  // Alchemy's current production design uses consented booking, not the old generic footer.
  assert.match(alchemy, /data-alchemy-panel="reviews"/);
  assert.match(alchemy, /data-alchemy-panel="request"/);
  assert.match(alchemy, /data-alchemy-visual="video"/);
  assert.match(alchemy, /<SiteVideoPlayer/);
  assert.match(alchemy, /<StaticPortrait/);
  assert.match(alchemy, /bookingSku="personal-session-60"/);
  assert.match(alchemy, /<ContactChannelChooser/);
  assert.match(alchemy, /<AlchemySoulLeadForm locale=\{locale\}/);
  assert.ok(alchemy.lastIndexOf("<AlchemySoulLeadForm") > alchemy.lastIndexOf('data-alchemy-panel="reviews"'));
  assert.match(business, /data-public-visual-landing="business"/);
  assert.match(business, /data-business-visual-screen="final-capture"/);
  assert.match(business, /<BusinessWebsiteEnquiry locale=\{locale\}/);
  assert.ok(business.lastIndexOf("<BusinessWebsiteEnquiry") > business.lastIndexOf("t.faqs.map"));
  assert.match(businessForm, /fetch\("\/api\/services\/business-consulting"/);
  assert.match(businessForm, /contactConsent:consent/);
  assert.match(css, /body:has\(\[data-public-visual-landing\]\) \[data-sitewide-capture\]/);
});

test("monthly support and all three free-entry paths retain visual media on each step and an on-site final form", () => {
  const support = read("components/personal-support-landing.tsx");
  const free = read("components/free-entry-landing.tsx");
  const css = read("components/personal-support-landing.module.css");
  for(const stage of ['benefits','faq','final-capture']) {
    assert.ok(support.includes('data-support-visual-screen="' + stage + '"'));
  }
  assert.match(support, /data-public-visual-landing="personal-support"/);
  assert.match(support, /<CompactLeadCapture/);
  assert.match(support, /<Image src=\{photos/);

  // The current situation review has its own protected Express intake; other
  // free service types retain the consented compact capture.
  assert.match(free, /data-free-entry-landing=\{kind\}/);
  assert.match(free, /data-free-review-intro-video/);
  assert.match(free, /data-featured-free-review-testimonials/);
  assert.match(free, /<SiteVideoPlayer/);
  assert.match(free, /<PersonalExpressEnquiry/);
  assert.match(free, /<CompactLeadCapture/);
  const expressStart=free.indexOf("<PersonalExpressEnquiry"), expressEnd=free.indexOf("</PersonalExpressEnquiry>");
  const videoReviews=free.indexOf("data-featured-free-review-testimonials");
  assert.ok(expressStart>=0 && videoReviews>expressStart && expressEnd>videoReviews,
    "The verified video reviews remain inside the current consented Express wrapper");
  assert.match(css, /@media\(max-width:350px\)/);
});

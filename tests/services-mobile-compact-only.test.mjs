import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const stylesheet = readFileSync(new URL("../components/services-assist-mobile.module.css", import.meta.url), "utf8");
const acceptance = readFileSync(new URL("../scripts/verify-public-services-production.mjs", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/[locale]/services/page.tsx", import.meta.url), "utf8");

test("phone Services hides the obsolete studio cards, consent forms and editorial long sections", () => {
  assert.match(stylesheet, /@media\(max-width:760px\)[\s\S]*?\[data-services-studio-free\]/);
  for (const selector of [
    "[data-services-showcase-hero]", "[data-services-studio-free]",
    "[data-services-studio-card]", "[data-services-studio-paid] > header",
    "[data-services-studio-paid] > div:last-child", "#consultation",
    "[data-services-meet]", "[data-personal-testimonials=\"services\"]",
    "#method-videos", "[data-services-directory-invitation]",
    "[data-service-lead-capture]"
  ]) {
    assert.ok(stylesheet.includes(selector), "Missing hide contract: " + selector);
    assert.ok(acceptance.includes(selector), "Missing browser assertion: " + selector);
  }
});
test("approved compact shelves and guest enquiry actions stay mounted", () => {
  for (const name of [
    "ServicesAssistMobile", "ServicesPersonalConsultationMobile",
    "SpiritualReadingEntry", "ServicesStudioOffers", "ServicesMagicalHelpMobile"
  ]) assert.ok(page.includes("<" + name + " locale="), "Missing approved shelf: " + name);
  for (const selector of [
    "[data-assist-personal-consultation]", "[data-assist-spiritual-entry]",
    "[data-assist-video-generation]", "[data-assist-course-shelf]",
    "[data-assist-magical-help]"
  ]) assert.ok(acceptance.includes(selector), "Missing compact browser smoke: " + selector);
  assert.match(stylesheet, /\[data-services-studio-paid\][\s\S]*grid-template-columns:minmax\(0,1fr\)/);
  assert.doesNotMatch(stylesheet, /\.assistPage\s+:global\(\[data-assist-(personal-consultation|video-generation|course-shelf|magical-help)\]\)/);
});

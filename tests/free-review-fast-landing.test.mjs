import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const landing = readFileSync(new URL("../components/free-entry-landing.tsx", import.meta.url), "utf8");
const archive = readFileSync(new URL("../components/lazy-personal-testimonials.tsx", import.meta.url), "utf8");
const enquiry = readFileSync(new URL("../components/personal-express-enquiry.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/[locale]/services/free-situation-review/page.tsx", import.meta.url), "utf8");

test("free review remains a public localized server-rendered landing with its CTA", () => {
  assert.match(route, /generateStaticParams\(\)/);
  assert.match(route, /<FreeEntryLanding locale=\{locale\} kind="situation"\s*\/>/);
  assert.match(landing, /id="free-entry-title"/);
  assert.match(landing, /href=\{kind === "situation" \? "#request-free-review"/);
  assert.match(landing, /<TelegramDiagnosticEntry locale=\{locale\}/);
});

test("archived client video players stay out of initial page and load on expansion", () => {
  assert.match(landing, /<LazyPersonalTestimonials\s/);
  assert.doesNotMatch(landing, /<PersonalTestimonials\s/);
  assert.match(archive, /dynamic\(/);
  assert.match(archive, /ssr: false/);
  assert.match(archive, /onToggle=/);
  assert.match(archive, /openedOnce \? <PersonalTestimonials locale=\{locale\} variant="all" sameAudioOnly/);
  assert.match(archive, /data-review-stories/);
});

test("request wizard and contact chooser load only after request opens and keep their state", () => {
  assert.match(enquiry, /const ContactChannelChooser = dynamic\(/);
  assert.match(enquiry, /const FreeExpressWizard = dynamic\(/);
  assert.match(enquiry, /disclosureOpenedOnce \? \(publicWizard \? <FreeExpressWizard/);
  assert.match(enquiry, /if \(expanded\) setDisclosureOpenedOnce\(true\)/);
  assert.match(enquiry, /hidden=\{!expanded\}/);
  assert.match(enquiry, /id="request-free-review"/);
  assert.match(enquiry, /allowSecureExpressClaim/);
});

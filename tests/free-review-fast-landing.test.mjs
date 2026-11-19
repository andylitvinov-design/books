import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const landing = readFileSync(new URL("../components/free-entry-landing.tsx", import.meta.url), "utf8");

const enquiry = readFileSync(new URL("../components/personal-express-enquiry.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/[locale]/services/free-situation-review/page.tsx", import.meta.url), "utf8");

test("free review remains a public localized server-rendered landing with its CTA", () => {
  assert.match(route, /generateStaticParams\(\)/);
  assert.match(route, /<FreeEntryLanding locale=\{locale\} kind="situation"\s*\/>/);
  assert.match(landing, /id="free-entry-title"/);
  assert.match(landing, /href=\{kind === "situation" \? "#request-free-review"/);
  assert.match(landing, /<TelegramDiagnosticEntry locale=\{locale\}/);
});

test("twelve authentic click-to-play video posters show without a hidden archive", () => {
  assert.match(landing, /reviewVideos\.map\(\(item, index\) =>/);
  assert.match(landing, /data-review-count=\{reviewVideos\.length\}/);
  assert.match(landing, /data-review-list-direction="vertical"/);
  assert.match(landing, /locallyArchivedVideoPosterIds\.has\(item\.id\)/);
  assert.match(landing, /textLanguage=\{locale\} compact/);
  assert.doesNotMatch(landing, /<LazyPersonalTestimonials|<iframe|autoplay: "1"/);
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

test("public free review FAQ stays server-rendered and works without JavaScript", () => {
  assert.match(landing, /data-free-review-faq/);
  assert.match(landing, /<details key=\{question\} className=\{styles\.reviewFaqItem\}>/);
  assert.doesNotMatch(landing, /FAQModal|FAQDrawer|FaqPortal/);
});

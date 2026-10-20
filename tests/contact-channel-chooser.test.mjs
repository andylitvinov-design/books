import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { whatsappEnquiryUrl, telegramEnquiryUrlFromWhatsApp, TELEGRAM_USERNAME } from "../lib/whatsapp-enquiry.js";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Telegram prefill preserves all verified enquiry details in EN/RU/ES, without source query strings", () => {
  for (const locale of ["en", "ru", "es"]) {
    const wa = whatsappEnquiryUrl({
      locale, service: "Tantra Reiki Level 1",
      request: "Please confirm the full initiation and the available start date",
      option: "Personal initiation · €50 / 30 min",
      topic: "Energy practice",
      pagePath: "/" + locale + "/academy/reiki/tantra-reiki/free-initiation?private=do-not-send",
    });
    const tg = new URL(telegramEnquiryUrlFromWhatsApp(wa));
    assert.equal(tg.origin, "https://t.me");
    assert.equal(tg.pathname, "/" + TELEGRAM_USERNAME);
    assert.equal(tg.searchParams.get("text"), new URL(wa).searchParams.get("text"));
    assert.match(tg.searchParams.get("text") || "", /Tantra Reiki Level 1/);
    assert.doesNotMatch(tg.searchParams.get("text") || "", /do-not-send/);
  }
});

test("Telegram deep link helper rejects arbitrary URLs and generic messages", () => {
  for (const bad of [
    "https://evil.example/?text=hello",
    "https://wa.me/1000000000?text=hello",
    "https://wa.me/14376066502",
    "https://wa.me.evil.example/14376066502?text=hello",
  ]) assert.throws(() => telegramEnquiryUrlFromWhatsApp(bad));
});

test("contact chooser is a progressive, accessible mobile-friendly component", () => {
  const src = read("components/contact-channel-chooser.tsx");
  const submission = read("lib/practitioners/public-enquiry-submission.js");
  const css = read("components/contact-channel-chooser.module.css");
  for (const text of [
    'aria-expanded={open}', 'aria-controls={panelId}', 'hidden={!open}',
    'Расскажите, с чем вам нужна помощь', 'Describe what you would like help with',
    'Cuéntanos en qué podemos ayudarte', 'WhatsApp', 'Telegram',
    'data-contact-channel-chooser', 'data-contact-order',
    'telegramEnquiryUrlFromWhatsApp', 'role="group"',
  ]) assert.ok(src.includes(text), text);
  assert.match(src, /<button[\s\S]*?type="button"/);
  assert.match(src, /onClick=\{\(\) => setOpen\(\(value\) => !value\)\}/);
  assert.match(src, /<textarea[\s\S]*?required minLength=\{10\} maxLength=\{1400\}/);
  assert.match(src, /<form onSubmit=\{submit\}/);
  assert.match(src, /import \{ createPublicEnquirySubmissionScope \} from "@\/lib\/practitioners\/public-enquiry-submission"/);
  assert.match(src, /const scope = createPublicEnquirySubmissionScope\(\)/);
  assert.match(src, /const result = await scope\.submit\(\{/);
  assert.match(submission, /fetchImpl\('\/api\/service-enquiries', \{/);
  assert.match(submission, /method: 'POST', credentials: 'same-origin'/);
  assert.match(submission, /response\.ok && data\?\.saved === true/);
  assert.match(src, /if \(result\.kind === "saved"\)/);
  assert.match(src, /\{!saved \? \(/);
  assert.doesNotMatch(src, /fetch\s*\(/);
  assert.doesNotMatch(src + submission, /localStorage|sessionStorage|sendBeacon|autoSubmit/i);
  assert.match(css, /\.trigger/);
  assert.match(css, /min-height:56px/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@container \(max-width: 300px\)/);
  assert.match(src, /onChannelClick\?\./);
  assert.match(src, /scrollIntoView/);
});

test("primary capture components render channel chooser after service selection while downloads remain immediate", () => {
  for (const path of [
    "components/reiki-choice-capture.tsx",
    "components/academy-course-capture.tsx",
    "components/energywork-reiki-capture.tsx",
    "components/consultation-choice-capture.tsx",
    "components/sitewide-lead-capture.tsx",
    "components/core-service-detail.tsx",
    "components/yggdrasil-initiation-form.tsx",
    "components/tantra-initiation-form.tsx",
    "components/principles-of-energywork.tsx",
    "components/temple-initiation-chooser.tsx",
    "components/free-drawing-intake.tsx",
  ]) {
    const src = read(path);
    assert.match(src, /<ContactChannelChooser/, path);
    assert.match(src, /whatsappUrl=\{/, path);
  }
  assert.match(read("components/yggdrasil-initiation-form.tsx"), /href=\{pdfUrl\} download/);
  assert.match(read("components/reiki-choice-capture.tsx"), /href=\{guideUrl\}/);
  assert.match(read("components/consultation-choice-capture.tsx"), /isPaidRequest \? \(/);
});

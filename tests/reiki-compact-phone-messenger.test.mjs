import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const capture = read("components/reiki-choice-capture.tsx");
const chooser = read("components/contact-channel-chooser.tsx");
const captureCss = read("components/reiki-choice-capture.module.css");
const chooserCss = read("components/contact-channel-chooser.module.css");

test("both Reiki landings use one compact selected choice, phone and direct messenger buttons", () => {
  assert.match(capture, /data-reiki-choice-capture=\{course\}/);
  assert.match(capture, /"guide", "express", "personal"/);
  assert.match(capture, /<ContactChannelChooser\s+compactPhone\s+stayAfterSave/);
  assert.match(capture, /publicTopic=\{t\.common\.options\[selected\]\}/);
  assert.match(capture, /resetKey=\{course \+ "-" \+ placement \+ "-" \+ selected\}/);
  assert.equal((capture.match(/<ContactChannelChooser/g) || []).length, 1);
  assert.doesNotMatch(capture, /<div className=\{styles\.footer\}>|guide-secondary|<form|<input|<textarea/);
  assert.match(capture, /href=\{guideUrl\}/, "PDF downloads remain direct, not leads");
  assert.match(capture, /selected === "personal" \? <p className=\{styles\.priceLine\}/);
});

test("compact phone panel never displays Google sign-in, email or a separate register step", () => {
  const start = chooser.indexOf("  if (compactPhone) {\n    return (");
  const end = chooser.indexOf("\n  return (\n    <div className={styles.wrapper}", start);
  assert.ok(start >= 0 && end > start, "compact-mode early return is distinct");
  const compact = chooser.slice(start, end);
  for (const expected of [
    "data-reiki-phone-enquiry",
    "<PhoneCountryInput",
    'type="checkbox"',
    'data-contact-channel-submit="whatsapp"',
    'data-contact-channel-submit="telegram"',
    'saveEnquiry("whatsapp")',
    'saveEnquiry("telegram")',
    "role=\"status\"",
  ]) assert.ok(compact.includes(expected), expected);
  for (const forbidden of ["startGoogle", "googleButton", 'type="email"', "optionalName", "optionalNote", "Register my request"]) {
    assert.ok(!compact.includes(forbidden), "Unexpected second form element: " + forbidden);
  }
  for (const t of ["compactConsent:", "compactSaved:", "compactHandoff:"]) {
    assert.equal((chooser.match(new RegExp(t, "g")) || []).length, 3, "EN/RU/ES " + t);
  }
});

test("the first messenger tap saves the phone and selected option before offering a chat", () => {
  const start = chooser.indexOf("  async function saveEnquiry(channel?");
  const end = chooser.indexOf("\n  let preparedWhatsApp", start);
  assert.ok(start >= 0 && end > start);
  const save = chooser.slice(start, end);
  const write = save.indexOf('fetch("/api/service-enquiries"');
  const ack = save.indexOf("data.saved !== true");
  const receipt = save.indexOf("setSaved({ saved: true, referenceCode: data.referenceCode })");
  const handoff = save.indexOf("handoffWindow.location.replace(destination)");
  assert.ok(write >= 0 && write < ack && ack < receipt && receipt < handoff);
  assert.match(save, /const usePhone = compactPhone \|\| method === "phone"/);
  assert.match(save, /contact: \{ displayName: displayName\.trim\(\), email: usePhone \? "" : email\.trim\(\), phone: usePhone \? cleanedPhone : "" \}/);
  assert.match(save, /contactConsent: consent/);
  assert.match(save, /publicTopic\?\.trim\(\)/);
  assert.match(save, /channel === "whatsapp"[\s\S]*?telegramEnquiryUrlFromWhatsApp/);
  assert.match(save, /handoffWindow\?\.close\(\)/);
  assert.doesNotMatch(save, /request: .*phone|text.*cleanedPhone/, "Personal phone stays in CRM, never a URL");
  assert.match(chooser, /setMethod\("phone"\);[\s\S]*?setSaved\(null\);[\s\S]*?operationId\.current = null;/);
});

test("mobile Reiki actions have minimum tap targets and no giant request panel", () => {
  assert.match(captureCss, /Single-screen Reiki request/);
  assert.match(captureCss, /@media \(max-width:350px\)/);
  assert.match(captureCss, /min-height:43px/);
  assert.match(chooserCss, /\.compactChannels \{/);
  assert.match(chooserCss, /min-height:46px/);
  assert.match(chooserCss, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { whatsappEnquiryUrl, telegramEnquiryUrlFromWhatsApp, TELEGRAM_USERNAME } from "../lib/whatsapp-enquiry.js";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Telegram service handoff retains public title, not client text, prices or source queries", () => {
  for (const locale of ["en", "ru", "es"]) {
    const wa = whatsappEnquiryUrl({
      locale, service: "Tantra Reiki Level 1",
      request: "Please confirm the full initiation and available date — private",
      option: "Personal initiation · €50 / 30 min",
      topic: "Energy practice and sensitive context",
      context: "Confidential history",
      pagePath: "/" + locale + "/academy/reiki/tantra-reiki/free-initiation?private=do-not-send",
    });
    const tg = new URL(telegramEnquiryUrlFromWhatsApp(wa));
    const body = tg.searchParams.get("text") || "";
    assert.equal(tg.origin, "https://t.me");
    assert.equal(tg.pathname, "/" + TELEGRAM_USERNAME);
    assert.match(body, /Tantra Reiki Level 1/);
    assert.doesNotMatch(body, /private|available date|€50|Energy practice|sensitive context|Confidential history|\/academy\/|do-not-send|HH-REQ|hhreview/);
    assert.equal(tg.searchParams.has("start"), false);
    assert.ok(body.length < 260, "Only a bounded public service description belongs in the draft");
    // The original WhatsApp draft may retain voluntary client details; its
    // text is NOT a Telegram consent, request submission or medical record.
    assert.ok(new URL(wa).searchParams.get("text")?.includes("Selected option:") ||
      new URL(wa).searchParams.get("text")?.includes("Выбранный вариант:") ||
      new URL(wa).searchParams.get("text")?.includes("Opción elegida:"));
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
  const css = read("components/contact-channel-chooser.module.css");
  for (const text of [
    'aria-expanded={open}', 'aria-controls={panelId}', 'hidden={!interactive || (!open && !quick)}',
    'Оставьте контакт, чтобы записаться или узнать подробности',
    'Leave your contact to enquire or join',
    'Deja tus datos para consultar o inscribirte', 'WhatsApp', 'Telegram',
    'data-contact-channel-chooser', 'data-contact-order',
    'telegramEnquiryUrlFromWhatsApp', 'role="group"',
  ]) assert.ok(src.includes(text), text);
  assert.match(src, /<button[\s\S]*?type="button"/);
  assert.match(src, /onClick=\{\(\) => setOpen\(\(value\) => !value\)\}/);
  assert.match(src, /<details key=\{resetSignature\} className=\{styles\.optionalName\}>/);
  assert.match(src, /<summary>\{c\.nameOptional\}<\/summary>/);
  assert.doesNotMatch(src, /setNameOpen|open=\{nameOpen\}/);
  assert.match(src, /<details className=\{styles\.optionalNote\} open=\{noteOpen\}>/);
  assert.match(src, /setNoteOpen\(value => !value\)/);
  assert.match(src, /setNoteOpen\(false\)/);
  assert.match(src, /<textarea[\s\S]*?maxLength=\{1400\} rows=\{2\}/);
  assert.doesNotMatch(src, /c\.situation \+ ": " \+ description\.trim\(\)/);
  assert.match(src, /originalMessage \+ "\\n\\n" \+ c\.reference/);
  assert.match(src, /<form onSubmit=\{submit\}/);
  assert.match(src, /fetch\("\/api\/service-enquiries"/);
  assert.match(src, /if \(!response\.ok \|\| data\.saved !== true/);
  assert.match(src, /\{!saved \? \(/);
  assert.doesNotMatch(src, /localStorage|sendBeacon|autoSubmit/i);
  assert.match(css, /\.trigger/);
  assert.match(css, /min-height:56px/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /\.optionalNote > summary/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@container \(max-width: 300px\)/);
  assert.match(src, /onChannelClick\?\./);
  assert.match(src, /scrollIntoView/);
});

test("contact controls wait for the reset associated with the currently selected offer", () => {
  const src = read("components/contact-channel-chooser.tsx");
  assert.match(src, /settledResetSignature === resetSignature/);
  assert.match(src, /JSON\.stringify\(\[enquiryResetKey, quick, compactPhone, cartContact\]\)/);
  assert.equal((src.match(/setSettledResetSignature\(resetSignature\)/g)||[]).length, 2);
  assert.match(src, /if \(!interactive \|\| busy \|\| saved\) return/);
  assert.match(src, /if \(!interactive \|\| googleBusy \|\| busy\) return/);
});

test("primary capture components render channel chooser after service selection while downloads remain immediate", () => {
  for (const path of [
    "components/reiki-choice-capture.tsx",
    "components/academy-course-capture.tsx",
    "components/energywork-reiki-capture.tsx",
    "components/consultation-choice-capture.tsx",
    "components/core-service-detail.tsx",
    "components/yggdrasil-initiation-form.tsx",
    "components/tantra-initiation-choice.tsx",
    "components/principles-of-energywork.tsx",
    "components/temple-initiation-chooser.tsx",
  ]) {
    const src = read(path);
    assert.match(src, /<ContactChannelChooser/, path);
    assert.match(src, /whatsappUrl=\{/, path);
  }
  assert.match(read("components/tantra-initiation-form.tsx"), /<TantraInitiationChoice/);
  assert.match(read("components/tantra-initiation-form.tsx"), /whatsappUrl: tantraInitiationWhatsAppUrl\(locale, intent\)/);
  const privateEntry = read("components/free-drawing-intake.tsx");
  assert.doesNotMatch(privateEntry, /ContactChannelChooser|navigator\.clipboard/);
  assert.match(privateEntry, /\/coaching\/intake/);
  assert.match(read("components/yggdrasil-initiation-form.tsx"), /href=\{pdfUrl\} download/);
  assert.match(read("components/reiki-choice-capture.tsx"), /href=\{guideUrl\}/);
  assert.match(read("components/consultation-choice-capture.tsx"), /isPaidRequest \? \(/);
  // The global last-slide lead form uses the committed CRM intake directly.
  const footer = read("components/sitewide-lead-capture.tsx");
  assert.match(footer, /<CompactLeadCapture/);
  assert.doesNotMatch(footer, /<ContactChannelChooser/);

});

test("default cart is messenger-only; historical phone/Google form stays gated behind explicit rollback", () => {
  const ui = read("components/contact-channel-chooser.tsx");
  const qa = read("scripts/verify-storefront-shop-browser.mjs");
  assert.match(ui, /data-contact-hydrated=\{cartContact \? String\(cartFormHydrated\)/);
  assert.match(ui, /cartContact && !cartFormHydrated/);
  assert.match(ui, /onChange=\{event => \{ setConsent\(event\.target\.checked\)/);
  assert.match(ui, /\!consent/);
  assert.match(qa, /data-messenger-only-contact/);
  assert.match(qa, /No synthetic CRM save before provider confirmation/);
  assert.match(qa, /data-messenger-only-channel/);
  assert.match(qa, /syntheticEnquiries.length,0/);
});

test("WebKit cart consent fallback uses only a real checked click, never implicit consent", () => {
  const ui = read("components/contact-channel-chooser.tsx");
  const cart = ui.slice(ui.indexOf('data-contact-hydrated={cartContact ? String(cartFormHydrated)'));
  assert.ok(cart.length > 0, "cart-only contact form must exist");
  assert.match(cart, /onClick=\{cartContact \? event => \{[\s\S]*?setConsent\(event\.currentTarget\.checked\)/,
    "only a native cart checkbox click may reconcile Safari consent");
  assert.match(cart, /onChange=\{event => \{ setConsent\(event\.target\.checked\)/,
    "keep normal React change semantics");
  assert.match(cart, /disabled=\{busy \|\| googleBusy \|\| !interactive \|\| \(cartContact && !cartFormHydrated\) \|\|[\s\S]*?!consent\}/,
    "submission must still require explicit consent");
  assert.doesNotMatch(cart, /onClick=\{cartContact \? event => \{\s*setConsent\(true\)/,
    "never manufacture consent from a generic click");
  const qa = read("scripts/verify-storefront-shop-browser.mjs");
  assert.match(qa, /await wa\.waitFor\(/,
    "real WebKit acceptance must still exercise an actual visitor click");
  assert.match(qa, /No synthetic CRM save before provider confirmation/);
  assert.match(qa, /unverified phone or Google session/);
});

test("optional name disclosure uses one native user click, reset only on changed offer, and never changes consent", () => {
  const src = read("components/contact-channel-chooser.tsx");
  assert.match(src, /<details key=\{resetSignature\} className=\{styles\.optionalName\}>/);
  assert.match(src, /<summary>\{c\.nameOptional\}<\/summary>/);
  assert.doesNotMatch(src, /nameOpen|setNameOpen/);
  assert.match(src, /setDisplayName\("?"\)/);
  assert.match(src, /setConsent\(false\)/);
  assert.match(src, /checked=\{consent\}/);
  assert.match(src, /onChange=\{event => \{ setConsent\(event\.target\.checked\)/);
  assert.match(src, /resetSignature = JSON\.stringify\(\[enquiryResetKey, quick, compactPhone, cartContact\]\)/);
});

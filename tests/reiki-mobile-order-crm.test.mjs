import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { safePublicWhatsAppPath } from "../lib/whatsapp-enquiry.js";
import {
  remoteSupportPublicServiceTitle, remoteSupportPublicRequestSummary,
  readRemoteSupportDraft, REMOTE_SUPPORT_DRAFT_KEY,
} from "../lib/practitioners/remote-energy-support.js";
import { normalizePublicServiceEnquiry } from "../lib/practitioners/public-service-enquiry-input.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const now = Date.parse("2026-10-28T12:00:00.000Z");
const draft = {
  version: 2, serviceId: "43b527d8-7692-44b1-bb58-36b9cb1a0583",
  practitioner: "Andy", goal: "Energy and resources", method: "Tantra Reiki",
  format: "asynchronous", duration: 30, date: "2026-10-30", time: "15:00",
  timezone: "America/Toronto", startsAt: "2026-10-30T19:00:00.000Z",
  expectedPrice: 50, expectedCurrency: "EUR", savedAt: now,
};

test("public phone and Google orders may originate from exact mobile route, private paths remain denied", () => {
  for (const locale of ["en", "ru", "es"]) {
    assert.equal(safePublicWhatsAppPath("/" + locale + "/holistic-support/mobile"),
      "/" + locale + "/holistic-support/mobile");
    assert.equal(safePublicWhatsAppPath("/" + locale + "/holistic-support/mobile?private=ignored"),
      "/" + locale + "/holistic-support/mobile");
    assert.equal(safePublicWhatsAppPath("/" + locale + "/holistic-support/mobile/anything"), "");
    assert.equal(safePublicWhatsAppPath("/" + locale + "/app/consultations"), "");
  }
});

test("public request has only verified published preferences and not sensitive notes", () => {
  const privateText = "my private symptoms and secret medical report";
  const safeDraft = {...draft, intention: privateText, photo: "base64private"};
  const title = remoteSupportPublicServiceTitle(safeDraft);
  const summary = remoteSupportPublicRequestSummary(safeDraft, "ru");
  assert.equal(title, "Reiki support · Andy · 30 min");
  assert.match(summary, /Тантра|Tantra Reiki/);
  assert.match(summary, /2026-10-30 15:00/);
  assert.match(summary, /не запись и не оплата/);
  assert.doesNotMatch(title + summary, /private symptoms|medical report|base64private/i);
  assert.equal(remoteSupportPublicServiceTitle({...draft,duration:999}), "");
  const storage = {getItem(key) { return key === REMOTE_SUPPORT_DRAFT_KEY ? JSON.stringify(draft) : null; }};
  assert.equal(readRemoteSupportDraft(storage, draft.serviceId, now)?.startsAt, draft.startsAt);
  const payload = {
    operationId: "13b822f6-8d70-4b1c-b44e-d0c31ad1d82f",
    serviceTitle: title, description: summary,
    sourcePath: "/ru/holistic-support/mobile", locale: "ru",
    contactConsent: true, contact: { displayName: "", email: "", phone: "+14165550123" }, website: "",
  };
  const normalized = normalizePublicServiceEnquiry(payload);
  assert.equal(normalized.sourcePath, payload.sourcePath);
  assert.equal(normalized.contact.source, "website");
  assert.equal(normalized.contact.phone, "+14165550123");
  assert.equal(normalized.contactConsent, true);
  assert.equal(normalized.description, summary);
  assert.equal("paid" in normalized, false);
  assert.equal("bookingConfirmed" in normalized, false);
  assert.throws(() => normalizePublicServiceEnquiry({...payload,contactConsent:false}));
});

test("the in-modal request CTA changes to consented CRM contact instead of navigating to Cabinet", () => {
  const jsx = read("components/remote-energy-support-booking.tsx");
  const mobile = read("components/holistic-support-mobile.tsx");
  const gallery = read("components/holistic-support-master-gallery.tsx");
  const css = read("components/remote-energy-support-booking.module.css");
  assert.match(jsx, /if \(mode === "inline"\) \{[\s\S]*?setContactDraft\(draft\);\s*return;/);
  assert.match(jsx, /data-remote-public-order-contact/);
  assert.match(jsx, /<ContactChannelChooser[\s\S]*?quick cartContact stayAfterSave/);
  assert.match(jsx, /onSaved=\{\(\) => \{/);
  assert.match(jsx, /readRemoteSupportDraft\(window\.sessionStorage, selected\.serviceId\)/);
  assert.match(jsx, /pending\?\.service !== remoteSupportPublicServiceTitle\(draft\)/);
  assert.match(jsx, /remoteSupportPublicRequestSummary\(contactDraft, locale\)/);
  assert.match(mobile, /pending\.service\.startsWith\("Reiki support · "\) setChoice\("healing"\)/);
  assert.match(gallery, /setSelectedId\(master\.serviceId\);\s*setOrderOpen\(true\)/);
  assert.match(css, /\.publicContact\{display:grid/);
  assert.match(css, /@media\(max-width:650px\)/);
  // Unchanged standalone flow still offers the private structured booking.
  assert.match(jsx, /source=remote-energy-support/);
  assert.match(jsx, /setError\("past"\)/);
  assert.doesNotMatch(jsx, /createPaymentIntent|markAsPaid|paymentCaptured/);
});

test("the existing Google or phone consent path writes only after a real server receipt", () => {
  const chooser = read("components/contact-channel-chooser.tsx");
  const endpoint = read("app/api/service-enquiries/route.js");
  assert.match(chooser, /const \[consent, setConsent\] = useState\(false\)/);
  assert.match(chooser, /continueTo: "enquiry", returnPath: pathname/);
  assert.match(chooser, /fetch\("\/api\/service-enquiries"/);
  assert.match(chooser, /contactConsent: consent/);
  assert.match(chooser, /if \(!response\.ok \|\| data\.saved !== true/);
  assert.match(chooser, /onSaved\?\.\(data\.referenceCode\)/);
  assert.match(endpoint, /createPublicServiceEnquiry\(config, payload\)/);
  assert.match(read("lib/practitioners/public-service-enquiry.js"), /app\.crm_contacts/);
});

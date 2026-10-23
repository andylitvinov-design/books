import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { telegramEnquiryUrlFromWhatsApp, whatsappEnquiryUrl } from "../lib/whatsapp-enquiry.js";

const read = name => readFileSync(new URL("../" + name, import.meta.url), "utf8");
const banner = read("components/home-free-diagnosis-banner.tsx");
const endpoint = read("app/api/service-enquiries/route.js");
const intake = read("lib/practitioners/public-service-enquiry.js");
const classifier = read("lib/practitioners/public-service-enquiry-input.mjs");

test("free-review messenger choices save a consented contact-only enquiry before handoff", () => {
  assert.match(banner, /const contact = parseReplyContact\(address\)/);
  assert.match(banner, /if \(!contact\).*return;/);
  assert.match(banner, /if \(!consent\).*return;/);
  assert.match(banner, /contact: \{ displayName: "", email: contact.email, phone: contact.phone \}/);
  assert.match(banner, /operationId: currentId/);
  assert.match(banner, /if \(!response.ok \|\| result\?\.saved !== true/);
  assert.match(banner, /handoffWindow\.location\.replace\(destination\)/);
  assert.match(banner, /else window\.location\.assign\(destination\)/);
  assert.doesNotMatch(banner, /sendBeacon|localStorage|google-analytics|facebook\.com/);
  assert.match(endpoint, /requireSameOrigin\(request, config\)/);
  assert.match(endpoint, /consumeRate\(config, \{ op: 'guest-service-enquiry', ip \}, 6, 3600\)/);
  assert.match(intake, /if \(contact && !crmEnabled\(\)\)/);
  assert.match(intake, /insert into app\.public_service_enquiries/);
  assert.match(intake, /insert into app\.crm_contacts/);
  assert.match(intake, /on conflict do nothing/);
  assert.match(classifier, /value\.contactConsent !== true/);
  assert.match(classifier, /sourcePath !== value\.sourcePath/);
});

test("message drafts carry public offer and nonsecret reference, not contact or assessment data", () => {
  const referenceCode = "HH-1234ABCDEF56";
  const message = "Please send the written review instructions. Reference: " + referenceCode;
  const whatsapp = whatsappEnquiryUrl({
    locale: "en", service: "Free drawing-based situation review",
    request: message, pagePath: "/en/services/free-situation-review",
  });
  const url = new URL(whatsapp);
  assert.equal(url.hostname, "wa.me");
  assert.match(url.searchParams.get("text") || "", /Free drawing-based situation review/);
  assert.match(url.searchParams.get("text") || "", /HH-1234ABCDEF56/);
  assert.match(url.searchParams.get("text") || "", /\/en\/services\/free-situation-review/);
  assert.doesNotMatch(url.searchParams.get("text") || "", /email|phone|diagnosis|medical record/i);
  const telegram = new URL(telegramEnquiryUrlFromWhatsApp(whatsapp));
  assert.equal(telegram.hostname, "t.me");
  assert.equal(telegram.searchParams.get("text"), url.searchParams.get("text"));
});

test("failed database save closes popup and never starts the chat", () => {
  const checkpoint = banner.indexOf("if (!response.ok || result?.saved !== true");
  const confirmed = banner.indexOf("setReference(result.referenceCode)", checkpoint);
  const navigation = banner.indexOf("handoffWindow.location.replace(destination)", checkpoint);
  assert.ok(checkpoint >= 0 && confirmed > checkpoint && navigation > confirmed);
  assert.match(banner, /catch \{\s*try \{ handoffWindow\?\.close\(\)/);
  assert.match(banner, /try \{\s*window\.sessionStorage\.setItem\(RECEIPT_SESSION_KEY/);
  assert.doesNotMatch(banner, /telegramChatId|whatsappVerified|lead_created|booking_confirmed|payment_received/);
});

test("EN/RU/ES contact consent and mobile accessibility are preserved", () => {
  for (const label of ["Free situation assessment", "Бесплатная диагностика ситуации", "Evaluación gratuita de tu situación"]) assert.ok(banner.includes(label));
  for (const label of ["How would you like to write", "Куда удобно написать", "¿Dónde prefieres escribir"]) assert.ok(banner.includes(label));
  for (const label of ["No marketing", "без рекламных рассылок", "Sin publicidad"]) assert.ok(banner.includes(label));
  assert.match(banner, /andy-about\.png/);
  assert.match(banner, /aria-invalid=\{Boolean\(error\)\}/);
  assert.match(banner, /role="alert"/);
  assert.match(banner, /role="status" data-lead-saved/);
  const css = read("components/home-free-diagnosis-banner.module.css");
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(max-width: 365px\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /min-height: 46px/);
});

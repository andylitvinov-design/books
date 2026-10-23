import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizePublicServiceEnquiry } from "../lib/practitioners/public-service-enquiry-input.mjs";
import { whatsappEnquiryUrl, telegramEnquiryUrlFromWhatsApp } from "../lib/whatsapp-enquiry.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const banner = read("components/home-free-diagnosis-banner.tsx");
const bannerCss = read("components/home-free-diagnosis-banner.module.css");
const capture = read("components/compact-lead-capture.tsx");
const captureCss = read("components/compact-lead-capture.module.css");
const endpoint = read("app/api/service-enquiries/route.js");
const store = read("lib/practitioners/public-service-enquiry.js");

test("homepage retains one offer card, an inline channel chooser and EN/RU/ES", () => {
  assert.match(banner, /data-home-free-diagnosis-banner/);
  assert.match(banner, /data-home-diagnosis-order/);
  assert.match(banner, /aria-expanded=\{open\}/);
  assert.match(banner, /aria-controls=\{formId\}/);
  assert.match(banner, /hidden=\{!open\}/);
  assert.match(banner, /variant="messenger"/);
  assert.ok(banner.indexOf("data-home-diagnosis-request") < banner.indexOf("styles.note"));
  assert.match(bannerCss, /\.request \{ grid-column:1\/-1/);
  assert.match(bannerCss, /\.request:global\(\[hidden\]\) \{ display: none; \}/);
  for (const word of [
    "Free situation assessment", "Бесплатная диагностика ситуации",
    "Evaluación gratuita de tu situación", "Hide contact options",
    "Скрыть способы связи", "Ocultar opciones de contacto",
  ]) assert.ok(banner.includes(word), word);
});

test("anonymous contact must be submitted and confirmed BEFORE messenger handoff", () => {
  assert.match(capture, /data-messenger-lead-capture/);
  assert.match(capture, /data-compact-messenger-form/);
  assert.match(capture, /data-messenger-intake="whatsapp"/);
  assert.match(capture, /data-messenger-intake="telegram"/);
  assert.match(capture, /aria-busy=\{sending\}/);
  assert.match(capture, /disabled=\{sending\}/);
  assert.match(capture, /async function saveRequest\(requireCheckbox: boolean\)/);
  assert.match(capture, /contact: \{ displayName: "", \.\.\.contact \}/);
  assert.match(capture, /contactConsent: true/);
  assert.match(capture, /fetch\("\/api\/service-enquiries"/);
  assert.match(capture, /if \(!response\.ok \|\| result\?\.saved !== true/);
  assert.match(capture, /!\/\^HH-\[A-F0-9\]\{12\}\$\/\.test\(result\.referenceCode/);
  assert.match(capture, /const code = reference \|\| await saveRequest\(false\)/);
  assert.match(capture, /if \(!code\) \{ setActiveChannel\(null\); return; \}/);
  assert.match(capture, /window\.location\.assign\(messengerUrl\(channel, code\)\)/);
  assert.match(capture, /telegramEnquiryUrlFromWhatsApp\(url\.toString\(\)\)/);
  assert.match(capture, /Messenger contact|messengerSaved/);
  assert.match(capture, /consent|Consent/);
  assert.doesNotMatch(capture, /sendBeacon|localStorage|NEXT_PUBLIC.*SECRET/i);
  assert.match(captureCss, /\.section\.messengerInline/);
  assert.match(captureCss, /min-height:46px/);
  assert.match(captureCss, /font-size:16px/);
  assert.match(captureCss, /:focus-visible/);
});

test("existing non-home CRM capture remains consented and independent", () => {
  assert.match(capture, /variant === "inline" \|\| messengerMode \? undefined/);
  assert.match(capture, /<form className=\{styles\.form\}/);
  assert.match(capture, /<input type="checkbox" required checked=\{consent\}/);
  assert.match(capture, /await saveRequest\(true\)/);
  assert.match(endpoint, /requireSameOrigin\(request, config\)/);
  assert.match(endpoint, /consumeRate\(config/);
  assert.match(store, /import \{ crmEnabled \} from '\.\.\/crm\/repository\.js'/);
  assert.match(store, /if \(contact && !crmEnabled\(\)\)/);
  assert.match(store, /insert into app\.public_service_enquiries/);
  assert.match(store, /insert into app\.crm_contacts/);
  assert.match(store, /on conflict do nothing/);
  assert.match(store, /return \{ id, referenceCode, saved: true, contactPending: !contact \}/);
});

test("safe opt-in contact is valid for all locales; zero contact or missing consent is rejected", () => {
  for (const locale of ["en", "ru", "es"]) {
    for (const contact of [{ email: "person@example.org", phone: "" }, { email: "", phone: "+14165550123" }]) {
      const body = {
        operationId: "d3643333-8a17-4b02-a105-534da6ad19b3",
        locale,
        sourcePath: "/" + locale + "/services/free-situation-review",
        serviceTitle: "Free drawing-based situation review",
        contact: { displayName: "", ...contact },
        contactConsent: true,
      };
      const valid = normalizePublicServiceEnquiry(body);
      assert.equal(valid.contact.source, "website");
      assert.equal(valid.contact.email, contact.email);
      assert.equal(valid.contact.phone, contact.phone);
      assert.equal(valid.contactConsent, true);
      assert.throws(() => normalizePublicServiceEnquiry({ ...body, contactConsent: false }));
      assert.throws(() => normalizePublicServiceEnquiry({ ...body, contact: {} }));
    }
  }
});

test("trusted WhatsApp/Telegram links include only public service identity, never the saved contact", () => {
  for (const locale of ["en", "ru", "es"]) {
    const wa = new URL(whatsappEnquiryUrl({
      locale,
      service: "Free drawing-based situation review",
      request: "Please send the free review instructions",
      pagePath: "/" + locale + "/services/free-situation-review?private=discard",
    }));
    const tg = new URL(telegramEnquiryUrlFromWhatsApp(wa.toString()));
    assert.equal(wa.origin, "https://wa.me");
    assert.equal(tg.origin, "https://t.me");
    assert.equal(tg.searchParams.get("text"), wa.searchParams.get("text"));
    for (const url of [wa.toString(), tg.toString()]) {
      assert.match(url, /free-situation-review/);
      assert.doesNotMatch(url, /private=discard|person%40example|14165550123/i);
    }
  }
});

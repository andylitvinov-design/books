import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizePublicServiceEnquiry } from "../lib/practitioners/public-service-enquiry-input.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const id = "d64348a8-3f64-4688-94da-725a777b63c2";
const payload = {
  operationId: "13b822f6-8d70-4b1c-b44e-d0c31ad1d82f",
  serviceId: id,
  serviceTitle: "Guided Reiki",
  description: "",
  sourcePath: "/en/services/other-master/guided-reiki",
  locale: "en",
  contactConsent: true,
  contact: { displayName: "", email: "guest@example.test", phone: "" },
  website: "",
};

test("EN/RU/ES marketplace guest enquiries require contact+consent, keep the target UUID, accept no chatbot", () => {
  for (const locale of ["en", "ru", "es"]) {
    const input = { ...payload, locale, sourcePath: "/" + locale + "/services/other-master/guided-reiki" };
    const out = normalizePublicServiceEnquiry(input);
    assert.equal(out.serviceId, id);
    assert.equal(out.contactConsent, true);
    assert.equal(out.contact.email, "guest@example.test");
    assert.equal(out.contact.source, "website");
    assert.ok(out.description.length > 10);
  }
});

test("marketplace refuses cross-locale path, private path, missing consent, unknown fields, forged IDs", () => {
  for (const bad of [
    { ...payload, sourcePath: "/ru/services/other-master/guided-reiki" },
    { ...payload, sourcePath: "/en/app/consultations" },
    { ...payload, sourcePath: "/en/services/other-master/guided-reiki?to=wrong" },
    { ...payload, sourcePath: "/en/services/other-master" },
    { ...payload, contactConsent: false },
    { ...payload, contact: undefined },
    { ...payload, serviceId: "not-a-uuid" },
    { ...payload, practitionerId: id },
    { ...payload, website: "spam" },
  ]) assert.throws(() => normalizePublicServiceEnquiry(bad));
});

test("legacy Andrey and academy submissions remain unaffected without a marketplace serviceId", () => {
  const { serviceId, ...legacy } = payload;
  assert.equal(normalizePublicServiceEnquiry(legacy).serviceId, undefined);
});

test("guest page and directory send directly to the published service website form", () => {
  const page = read("app/[locale]/services/[practitionerSlug]/[serviceSlug]/page.tsx");
  const directory = read("components/master-network-explorer.tsx");
  const component = read("components/marketplace-website-enquiry.tsx");
  const css = read("components/marketplace-website-enquiry.module.css");
  assert.match(page, /<MarketplaceWebsiteEnquiry locale=/);
  assert.match(page, /const requestHref="#site-service-request"/);
  assert.match(directory, /"#site-service-request"/);
  assert.match(component, /id="site-service-request"/);
  assert.match(component, /fetch\("\/api\/service-enquiries"/);
  assert.match(component, /serviceId,/);
  assert.match(component, /contactConsent: true/);
  assert.match(component, /operationId\.current \|\|= window\.crypto\.randomUUID/);
  assert.match(component, /response\.ok && body\?\.saved === true/);
  assert.match(component, /!consent/);
  assert.match(component, /useState\(false\)/);
  assert.match(component, /data-marketplace-enquiry-saved/);
  assert.doesNotMatch(component, /gtag\(|lead_created|booking_confirmed|payment_received/);
  assert.match(css, /@media\(max-width: 430px\)/);
});

test("server verifies the real published target/owner and encrypts against that owner, not arbitrary user input", () => {
  const backend = read("lib/practitioners/public-service-enquiry.js");
  const api = read("app/api/service-enquiries/route.js");
  assert.match(backend, /join app\.practitioners p on p\.id=s\.practitioner_id/);
  assert.match(backend, /where s\.id=\$1 and s\.active/);
  assert.match(backend, /p\.trusted_auth_user_id as owner_id/);
  assert.match(backend, /p\.slug \|\| '\/' \|\| s\.slug/);
  assert.match(backend, /serviceCopy\(practitioner, locale\)\.title !== serviceTitle/);
  assert.match(backend, /\[id, recipientId, serviceTitle/);
  assert.match(backend, /enc\(recipientId, id, 'public_lead\.contact'\)/);
  assert.match(backend, /if \(prior\.operation_hash !== digest\)/);
  assert.match(backend, /on conflict do nothing/);
  assert.match(api, /requireSameOrigin\(request, config\)/);
  assert.match(api, /consumeRate\(config/);
});

test("CRM insert is restricted to the target published offering and matched owner; no public grants", () => {
  const sql = read("supabase/migrations/20261026221222_marketplace_direct_service_enquiry_crm_owner.sql");
  assert.match(sql, /for insert to hh_app_backend/);
  assert.match(sql, /e\.contact_ciphertext is not null/);
  assert.match(sql, /p\.trusted_auth_user_id = crm_contacts\.owner_id/);
  assert.match(sql, /s\.active and s\.localized_copy/);
  assert.match(sql, /e\.source_path = '\/' \|\| e\.locale \|\| '\/services\/'/);
  assert.doesNotMatch(sql, /grant.*(?:anon|authenticated)/i);
  assert.doesNotMatch(sql, /security definer/i);
});

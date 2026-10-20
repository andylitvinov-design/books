import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  paidAdLandingUrl, readPaidAdReferral, withPaidAdReferral,
} from "../lib/paid-ad-referrals.js";
import { whatsappEnquiryUrl, telegramEnquiryUrlFromWhatsApp } from "../lib/whatsapp-enquiry.js";

const path = "/en/services/free-situation-review";
const campaign = "hh_free_review_en_toronto_202610";
const base = whatsappEnquiryUrl({
  locale: "en",
  service: "Free written situation review",
  request: "I would like the instructions to request a personal written review.",
  pagePath: path,
});
const message = (value) => new URL(value).searchParams.get("text") || "";

test("paid Meta and Google ad URLs are allowlisted public landings with no PII", () => {
  for (const [source, medium] of [
    ["facebook", "paid_social"],
    ["instagram", "paid_social"],
    ["google", "cpc"],
    ["google_ads", "cpc"],
  ]) {
    const url = paidAdLandingUrl(path, { source, campaign, content: "ad_a" });
    const parsed = new URL(url);
    assert.equal(parsed.origin, "https://holistichouse.vercel.app");
    assert.equal(parsed.pathname, path);
    assert.deepEqual([...parsed.searchParams.keys()],
      ["utm_source", "utm_medium", "utm_campaign", "utm_content"]);
    assert.equal(parsed.searchParams.get("utm_medium"), medium);
    assert.equal(readPaidAdReferral(parsed.search, path)?.source,
      source === "google" ? "google_ads" : source);
  }
  for (const invalid of [
    "/en/client/tests", "/en/services", "/en/services/alchemy-of-soul",
    "//untrusted.example/path", "https://other.example/path",
    "/en/services/free-situation-review?email=user@example.com",
  ]) assert.throws(() => paidAdLandingUrl(invalid, { source: "facebook", campaign }), TypeError);
  for (const invalid of ["private@email.com", "anxiety depression", "x".repeat(65), "symptom/heart"])
    assert.throws(() => paidAdLandingUrl(path, { source: "facebook", campaign: invalid }), TypeError);
});

test("private, duplicated, mismatched, unknown or sensitive query params fail closed", () => {
  const valid = new URL(paidAdLandingUrl(path, { source: "facebook", campaign })).search;
  for (const bad of [
    valid + "&email=person@example.com",
    valid + "&client_id=unique-id",
    valid + "&answer=private",
    valid + "&utm_term=mental-health-condition",
    valid + "&utm_source=google",
    valid + "&utm_campaign=another",
    "?utm_source=facebook&utm_medium=cpc&utm_campaign=" + campaign,
    "?utm_source=google&utm_medium=paid_social&utm_campaign=" + campaign,
    "?utm_source=random&utm_medium=paid_social&utm_campaign=" + campaign,
    "?utm_source=facebook&utm_medium=paid_social&utm_campaign=private%20notes",
  ]) {
    assert.equal(readPaidAdReferral(bad, path), null, bad);
    assert.equal(withPaidAdReferral(base, bad, path), base);
  }
  assert.equal(readPaidAdReferral(valid, "/en/client/tests"), null);
  assert.equal(readPaidAdReferral(valid, "/en/services"), null);
  assert.equal(readPaidAdReferral(valid, "/admin"), null);
  assert.equal(readPaidAdReferral(valid, "//evil.example"), null);
});

test("provider click IDs are never placed in message or analytics; user must press Send", () => {
  for (const [source,medium,clickId] of [
    ["facebook","paid_social","fbclid=abc123"],
    ["instagram","paid_social","fbclid=xyz987"],
    ["google","cpc","gclid=secret123"],
  ]) {
    const url = paidAdLandingUrl(path, { source, campaign, content:"ad_b" });
    const attrs = new URL(url).search + "&" + clickId;
    for (const locale of ["en", "ru", "es"]) {
      const pathname = "/" + locale + "/services/free-situation-review";
      const whatsapp = whatsappEnquiryUrl({
        locale, service: "Written situation review",
        request: "Please send the instructions for the free written review.",
        pagePath: pathname,
      });
      const drafted = withPaidAdReferral(whatsapp, attrs, pathname, locale);
      assert.equal(new URL(drafted).origin, "https://wa.me");
      assert.deepEqual([...new URL(drafted).searchParams.keys()], ["text"]);
      assert.match(message(drafted), / · hh_free_review_en_toronto_202610 · ad_b/);
      assert.doesNotMatch(message(drafted), /gclid|fbclid|secret123|abc123|xyz987|utm_/);
      assert.match(message(telegramEnquiryUrlFromWhatsApp(drafted)), /Ad referral|Рекламный источник|Origen publicitario/);
    }
  }
});

test("the existing owner-approved Meta pilot remains draft-only, within CAD 35, with no health targeting", () => {
  const manifest = JSON.parse(readFileSync(new URL("../data/meta-ads-pilot-draft.json", import.meta.url), "utf8"));
  assert.equal(manifest.status, "DRAFT_ONLY_NOT_IMPORTED_NOT_ACTIVE");
  assert.equal(manifest.spendAuthorized, false);
  assert.equal(manifest.campaignCreated, false);
  assert.equal(manifest.accountId, null);
  assert.equal(manifest.accountRequirement.currency, "CAD");
  assert.equal(manifest.accountRequirement.timeZone, "America/Toronto");
  assert.equal(manifest.campaign.status, "PAUSED");
  assert.equal(manifest.campaign.lifetimeBudgetCad, 35);
  assert.equal(manifest.campaign.maxDurationDays, 7);
  assert.equal(manifest.campaign.budgetTypeRequired, "LIFETIME_HARD_CAP");
  assert.equal(manifest.campaign.targeting.sensitiveInterests, false);
  assert.equal(manifest.campaign.targeting.remarketing, false);
  assert.equal(manifest.campaign.targeting.healthSegments, false);
  assert.equal(manifest.campaign.adSet.status, "PAUSED");
  assert.ok(manifest.campaign.ads.length > 0 && manifest.campaign.ads.length <= 2);
  for (const ad of manifest.campaign.ads) {
    assert.equal(ad.status, "PAUSED");
    assert.equal(ad.cta, "Learn More");
    const source = new URL(ad.landingUrl).searchParams.get("utm_source");
    assert.equal(ad.landingUrl, paidAdLandingUrl(path, { source, campaign, content: ad.id }));
    assert.doesNotMatch(ad.headline + " " + ad.primaryText, /\b(depression|anxiety diagnosis|guaranteed cure|medical treatment|registered psychotherapist)\b/i);
  }
});

test("paid labels are opt-in user-controlled handoffs; existing organic referrals and consent hold remain untouched", () => {
  const chooser = readFileSync(new URL("../components/contact-channel-chooser.tsx", import.meta.url), "utf8");
  const logic = readFileSync(new URL("../lib/paid-ad-referrals.js", import.meta.url), "utf8");
  const analytics = readFileSync(new URL("../lib/public-analytics.ts", import.meta.url), "utf8");
  assert.match(chooser, /readPaidAdReferral\(window\.location\.search/);
  assert.match(chooser, /withPaidAdReferral\(/);
  assert.match(chooser, /withOrganicEventReferral\(whatsappUrl, publicEventSearch/);
  assert.match(chooser, /telegramEnquiryUrlFromWhatsApp\(preparedWhatsApp\)/);
  assert.doesNotMatch(logic, /fetch\(|sendBeacon|localStorage|sessionStorage|navigator\.sendBeacon/);
  assert.match(analytics, /PUBLIC_ANALYTICS_AVAILABLE = false/);
});

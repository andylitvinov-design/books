import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { META_PILOT, validateMetaPilot } from "../lib/meta-ads-campaign.js";
import { normalizePublicLeadReceipt, publicLeadAttribution } from "../lib/public-lead-receipt.js";

test("Meta pilot is a paused CAD 5/day, seven-day, CAD 35 hard-capped configuration", () => {
  assert.deepEqual(validateMetaPilot(META_PILOT), { valid: true });
  assert.equal(META_PILOT.status, "PAUSED");
  assert.equal(META_PILOT.dailyBudgetCad, 5);
  assert.equal(META_PILOT.durationDays, 7);
  assert.equal(META_PILOT.lifetimeBudgetCad, 35);
  assert.equal(META_PILOT.adSets, 1);
  assert.equal(META_PILOT.maxAds, 2);
  assert.equal(META_PILOT.stageTwoAllowedWithoutOwnerApproval, false);
});

test("pilot validation fails closed when an account minimum would require a higher spend", () => {
  assert.deepEqual(validateMetaPilot({ ...META_PILOT, minimumDailyBudgetCad: 6 }), {
    valid: false,
    reason: "META_MINIMUM_EXCEEDS_APPROVED_BUDGET",
  });
  assert.deepEqual(validateMetaPilot({ ...META_PILOT, status: "ACTIVE" }), {
    valid: false,
    reason: "PILOT_MUST_REMAIN_PAUSED",
  });
});

test("lead receipt keeps only minimal contact, topic and allowlisted campaign attribution", () => {
  const receipt = normalizePublicLeadReceipt({
    email: " Person@example.com ",
    preferredContact: "email",
    topic: "goal",
    consentToContact: true,
    locale: "en",
  });
  assert.deepEqual(receipt, {
    email: "person@example.com",
    preferredContact: "email",
    topic: "goal",
    locale: "en",
  });
  assert.equal(normalizePublicLeadReceipt({ email: "not-an-email", preferredContact: "email", topic: "goal", consentToContact: true, locale: "en" }), null);
  assert.equal(normalizePublicLeadReceipt({ email: "person@example.com", preferredContact: "email", topic: "wellbeing", consentToContact: false, locale: "en" }), null);
});

test("attribution accepts campaign tokens only and never complaint, drawing, test or identity fields", () => {
  const attribution = publicLeadAttribution(new URLSearchParams("utm_source=meta&utm_medium=paid_social&utm_campaign=free_review_ca_oct&utm_content=portrait-a&problem=private+text&email=person%40example.com&test_result=secret"));
  assert.deepEqual(attribution, {
    source: "meta",
    medium: "paid_social",
    campaign: "free_review_ca_oct",
    content: "portrait-a",
  });
  assert.deepEqual(publicLeadAttribution(new URLSearchParams("utm_source=Meta%20Ads&utm_medium=paid+social&utm_campaign=<script>")), {});
});

test("browser analytics and the receipt endpoint cannot treat a WhatsApp handoff as a received lead", () => {
  const analytics = readFileSync(new URL("../lib/public-analytics.ts", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/public-leads/route.js", import.meta.url), "utf8");
  const intake = readFileSync(new URL("../components/free-drawing-intake.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(analytics, /lead_received_verified/);
  assert.match(route, /PUBLIC_LEAD_RECEIVED/);
  assert.match(route, /requireSameOrigin/);
  assert.doesNotMatch(route, /problem|goal|obstacle|tried|drawing|answers/i);
  assert.match(intake, /Your request has been received/);
  assert.doesNotMatch(intake, /emitPublicAnalyticsEvent\("lead_received_verified"/);
});

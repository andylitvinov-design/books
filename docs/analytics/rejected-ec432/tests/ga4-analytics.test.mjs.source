import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { getRobotsPolicy } from "../data/seo.js";

const analyticsModule = new URL("../components/ga4-analytics.tsx", import.meta.url);
const consentModule = new URL("../components/analytics-consent.tsx", import.meta.url);

test("GA4 implementation has a dedicated consent-gated public analytics boundary", () => {
  assert.equal(existsSync(analyticsModule), true);
  assert.equal(existsSync(consentModule), true);
});

test("public conversion steps use separate allowlisted events without form payloads", () => {
  const intake = readFileSync(new URL("../components/free-drawing-intake.tsx", import.meta.url), "utf8");
  const course = readFileSync(new URL("../components/reiki-choice-capture.tsx", import.meta.url), "utf8");

  for (const event of ["free_questionnaire_started", "free_questionnaire_prepared", "whatsapp_handoff_click"]) {
    assert.match(intake, new RegExp(event));
  }
  for (const event of ["academy_level_one_initiation_enquiry_click", "academy_personal_initiation_enquiry_click", "academy_study_material_request_click"]) {
    assert.match(course, new RegExp(event));
  }
  assert.doesNotMatch(intake, /emitPublicAnalyticsEvent\([^)]*(?:problem|goal|obstacle|tried|answers)/);
});

test("robots policy excludes private cabinet, report and administration routes", () => {
  const policy = getRobotsPolicy("https://holistichouse.vercel.app");
  const disallow = policy.rules.disallow ?? [];
  for (const path of ["/en/app", "/ru/client", "/en/report", "/admin", "/api/"]) {
    assert.ok(disallow.includes(path), path);
  }
});

test("root metadata carries the Holistic House Search Console verification token", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /google-site-verification/);
});

test("Google collection is limited to the canonical production host and the shared event allowlist", () => {
  const analytics = readFileSync(new URL("../components/ga4-analytics.tsx", import.meta.url), "utf8");
  const links = readFileSync(new URL("../components/acquisition-event-link.tsx", import.meta.url), "utf8");
  const middleware = readFileSync(new URL("../middleware.ts", import.meta.url), "utf8");

  assert.match(analytics, /window\.location\.hostname === "holistichouse\.vercel\.app"/);
  assert.doesNotMatch(links, /dataLayer\?\.push/);
  assert.match(middleware, /response\.headers\.set\('Content-Security-Policy', csp\)/);
});

test("analytics is opt-in through the Privacy page with no sitewide popup", () => {
  const consent = readFileSync(consentModule, "utf8");
  const privacy = readFileSync(new URL("../app/privacy/page.tsx", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

  assert.match(layout, /<AnalyticsConsent\s*\/>/);
  assert.match(consent, /export function AnalyticsConsent\(\)/);
  assert.match(consent, /return null;/);
  assert.doesNotMatch(consent, /<aside\b|className="analytics-consent"/);
  assert.match(consent, /isPublicAnalyticsPath\(pathname\) \? savedConsent\(\) : "denied"/);
  assert.match(consent, /updatePublicAnalyticsConsent\(value\)/);
  assert.doesNotMatch(consent, /window\.gtag\?\.\(/);
  assert.match(consent, /if \(value === "denied"\) \{\s*eraseAnalyticsCookies\(\)/);
  assert.match(privacy, /<AnalyticsPreferences\s*\/>/);
});


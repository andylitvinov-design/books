import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { getRobotsPolicy } from "../data/seo.js";
import { ACQUISITION_EVENTS } from "../data/local-acquisition.js";

const analyticsModule = new URL("../components/ga4-analytics.tsx", import.meta.url);
const consentModule = new URL("../components/analytics-consent.tsx", import.meta.url);

test("GA4 implementation has a dedicated consent-gated public analytics boundary", () => {
  assert.equal(existsSync(analyticsModule), true);
  assert.equal(existsSync(consentModule), true);
});

test("public conversion steps use separate allowlisted events without form payloads", () => {
  const intake = readFileSync(new URL("../components/free-drawing-intake.tsx", import.meta.url), "utf8");
  const course = readFileSync(new URL("../components/reiki-choice-capture.tsx", import.meta.url), "utf8");

  for (const event of ["free_questionnaire_started", "free_questionnaire_prepared"]) {
    assert.match(intake, new RegExp(event));
  }
  const chooser = readFileSync(new URL("../components/contact-channel-chooser.tsx", import.meta.url), "utf8");
  assertContactAnalyticsContract(intake, chooser);
  for (const event of ["academy_level_one_initiation_enquiry_click", "academy_personal_initiation_enquiry_click", "academy_study_material_request_click"]) {
    assert.match(course, new RegExp(event));
  }
  assert.doesNotMatch(intake, /emitPublicAnalyticsEvent\([^)]*(?:problem|goal|obstacle|tried|answers)/);
});

function assertContactAnalyticsContract(intake, chooser) {
  assert.ok(ACQUISITION_EVENTS.includes("contact_click"), "The shared acquisition allowlist owns contact_click");
  const intakeChooser = intake.match(/<ContactChannelChooser\b[\s\S]*?\/>/)?.[0];
  assert.ok(intakeChooser, "Free review uses the shared chooser");
  assert.match(intakeChooser, /event="contact_click"/);
  assert.doesNotMatch(intakeChooser, /analyticsEvent=|attributes=|(?:problem|goal|obstacle|tried|answers)/);
  const channels = [...chooser.matchAll(/<AcquisitionEventLink\b[\s\S]*?<\/AcquisitionEventLink>/g)].map(match => match[0]);
  assert.equal(channels.length, 2);
  for (const channel of ["whatsapp", "telegram"]) {
    const link = channels.filter(value => value.includes('"data-contact-channel": "' + channel + '"'));
    assert.equal(link.length, 1);
    assert.match(link[0], /event=\{event\}/, channel + " must use the caller-supplied event");
  }
  const trigger = chooser.match(/<button\b[\s\S]*?<\/button>/)?.[0];
  assert.ok(trigger, "Order is a button");
  assert.match(trigger, /onClick=\{\(\) => setOpen\(\(value\) => !value\)\}/);
  assert.doesNotMatch(trigger, /emit|analytics|dispatchEvent|onChannelClick|event=/);
  assert.doesNotMatch(chooser, /emitPublicAnalyticsEvent|dispatchEvent|sendBeacon|window\.gtag/);
  assert.match(chooser, /fetch\("\/api\/service-enquiries", \{/);
  assert.match(chooser, /method: "POST"/);
  assert.doesNotMatch(chooser, /emitPublicAnalyticsEvent|dispatchEvent|sendBeacon|window\.gtag/);
}

test("handoff analytics rejects caller drift and records channel selection only", () => {
  const intake = readFileSync(new URL("../components/free-drawing-intake.tsx", import.meta.url), "utf8");
  const chooser = readFileSync(new URL("../components/contact-channel-chooser.tsx", import.meta.url), "utf8");
  assertContactAnalyticsContract(intake, chooser);
  assert.throws(() => assertContactAnalyticsContract(intake.replace('event="contact_click"', 'event="unknown_event"'), chooser));
  assert.throws(() => assertContactAnalyticsContract(intake, chooser.replace('event={event}', 'event="contact_click"')));
  assert.throws(() => assertContactAnalyticsContract(intake, chooser.replace('onClick={() => setOpen((value) => !value)}', 'onClick={() => { emit(event); setOpen((value) => !value); }}')));
  const links = readFileSync(new URL("../components/acquisition-event-link.tsx", import.meta.url), "utf8");
  assert.match(links, /if \(analyticsConsent !== "granted"\) return/);
  assert.match(links, /detail: \{ event \}/);
  assert.match(links, /onClick=\{\(\) => \{ onClick\?\.\(\); emit\(event\)/);
  assert.doesNotMatch(links, /FormData|problem|goal|obstacle|tried|answers/);
  const analytics = readFileSync(analyticsModule, "utf8");
  const publicAnalytics = readFileSync(new URL("../lib/public-analytics.ts", import.meta.url), "utf8");
  assert.match(publicAnalytics, /PUBLIC_ANALYTICS_AVAILABLE = false/);
  assert.match(publicAnalytics, /if \(!PUBLIC_ANALYTICS_AVAILABLE\) return/);
  assert.match(analytics, /if \(!PUBLIC_ANALYTICS_AVAILABLE \|\|/);
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
  assert.match(consent, /window\.gtag\?\.\("consent", "update"/);
  assert.match(consent, /if \(!PUBLIC_ANALYTICS_AVAILABLE \|\| value === "denied"\) eraseAnalyticsCookies\(\)/);
  assert.match(privacy, /<AnalyticsPreferences\s*\/>/);
});

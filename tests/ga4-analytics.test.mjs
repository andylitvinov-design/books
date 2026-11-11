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

test("private questionnaire entry emits no public analytics or messenger event", () => {
  const intake = readFileSync(new URL("../components/free-drawing-intake.tsx", import.meta.url), "utf8");
  const privateForm = readFileSync(new URL("../components/coaching-intake-form.tsx", import.meta.url), "utf8");
  const course = readFileSync(new URL("../components/reiki-choice-capture.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(intake + privateForm, /emitPublicAnalyticsEvent|sendBeacon|window\.gtag|ContactChannelChooser/);
  for (const event of ["academy_level_one_initiation_enquiry_click", "academy_personal_initiation_enquiry_click", "academy_study_material_request_click"]) assert.match(course, new RegExp(event));
});

function assertContactAnalyticsContract(intake, chooser) {
  assert.ok(ACQUISITION_EVENTS.includes("service_request_start"), "The shared acquisition allowlist owns contact_click");
  const intakeChooser = intake.match(/<ContactChannelChooser\b[\s\S]*?\/>/)?.[0];
  assert.ok(intakeChooser, "Paid request uses the shared chooser");
  assert.match(intakeChooser, /event="service_request_start"/);
  assert.doesNotMatch(intakeChooser, /analyticsEvent=|(?:problem|goal|obstacle|tried|answers)/);
  const channels = [...chooser.matchAll(/<AcquisitionEventLink\b[\s\S]*?<\/AcquisitionEventLink>/g)].map(match => match[0]);
  assert.equal(channels.length, 6); // Three mutually exclusive layouts, two channels each.
  for (const channel of ["whatsapp", "telegram"]) {
    const link = channels.filter(value => value.includes('"data-contact-channel": "' + channel + '"'));
    assert.equal(link.length, 3);
    for (const item of link) assert.match(item, /event=\{event\}/, channel + " must use the caller-supplied event");
  }
  const triggers = [...chooser.matchAll(/<button\b[\s\S]*?<\/button>/g)].map(match => match[0])
    .filter(button => button.includes("data-contact-order"));
  assert.equal(triggers.length, 3, "Each consented enquiry layout has one explicit trigger");
  assert.ok(triggers.some(button => /onClick=\{\(\) => setOpen\(\(value\) => !value\)\}/.test(button)),
    "The standard request remains an explicit opening action");
  for (const trigger of triggers)
    assert.doesNotMatch(trigger, /emit|analytics|dispatchEvent|onChannelClick|event=/);
  assert.doesNotMatch(chooser, /emitPublicAnalyticsEvent\([^)]*(?:answers|description|contact|phone|email)|dispatchEvent|sendBeacon|window\.gtag/);
  assert.match(chooser, /fetch\("\/api\/service-enquiries", \{/);
  assert.match(chooser, /method: "POST"/);
  assert.doesNotMatch(chooser, /emitPublicAnalyticsEvent\([^)]*(?:answers|description|contact|phone|email)|dispatchEvent|sendBeacon|window\.gtag/);
}

test("handoff analytics rejects caller drift and records channel selection only", () => {
  const intake = readFileSync(new URL("../components/consultation-choice-capture.tsx", import.meta.url), "utf8");
  const chooser = readFileSync(new URL("../components/contact-channel-chooser.tsx", import.meta.url), "utf8");
  assertContactAnalyticsContract(intake, chooser);
  assert.throws(() => assertContactAnalyticsContract(intake.replace('event="service_request_start"', 'event="unknown_event"'), chooser));
  assert.throws(() => assertContactAnalyticsContract(intake, chooser.replace('event={event}', 'event="service_request_start"')));
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

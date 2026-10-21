import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  organicEventLandingUrl,
  readOrganicEventReferral,
  withOrganicEventReferral,
} from "../lib/organic-event-referrals.js";
import { whatsappEnquiryUrl, telegramEnquiryUrlFromWhatsApp } from "../lib/whatsapp-enquiry.js";

const path = "/en/services/free-situation-review";
const en = (params) => new URLSearchParams(params).toString();
const baseline = whatsappEnquiryUrl({
  locale: "en", service: "Free written situation review",
  request: "I would like to request my written review.",
  pagePath: path,
});
const text = (link) => new URL(link).searchParams.get("text") || "";

test("event links use only verified first-party public service paths and bounded UTM values", () => {
  const url = organicEventLandingUrl(path, {
    source: "eventbrite", campaign: "stress-live-2026-11", content: "listing",
  });
  assert.equal(url, "https://holistichouse.vercel.app/en/services/free-situation-review?utm_source=eventbrite&utm_medium=organic_event&utm_campaign=stress-live-2026-11&utm_content=listing");
  assert.deepEqual(readOrganicEventReferral(new URL(url).search, path), {
    source: "eventbrite", label: "Eventbrite",
    campaign: "stress-live-2026-11", content: "listing",
  });
  assert.match(organicEventLandingUrl(
    "/ru/services/andy-litvinov/free-wu-xing-diagnostic",
    { source: "meetup", campaign: "wuxing-intro-2026-11" }
  ), /utm_source=meetup/);
  for (const pathname of ["/en/app", "/en/admin", "/en/services", "//evil.example/x",
     "https://evil.example/path", "/en/services/free-situation-review?email=private"]) {
    assert.throws(() => organicEventLandingUrl(pathname, {
      source: "eventbrite", campaign: "stress-live-2026-11",
    }), TypeError);
  }
});

test("invalid, unknown, duplicate, paid or potentially private query fields are never echoed", () => {
  const valid = en({ utm_source: "meetup", utm_medium: "organic_event",
    utm_campaign: "wuxing-live-2026-11" });
  for (const invalid of [
    "utm_source=meetup&utm_source=eventbrite&utm_medium=organic_event&utm_campaign=stress-live",
    "utm_source=meetup&utm_medium=paid&utm_campaign=stress-live",
    "utm_source=fake&utm_medium=organic_event&utm_campaign=stress-live",
    "utm_source=meetup&utm_medium=organic_event&utm_campaign=private%40email.com",
    "utm_source=meetup&utm_medium=organic_event&utm_campaign=stress-live&utm_content=\n",
    valid + "&email=someone%40example.org",
    valid + "&client_id=secret",
    valid + "&answer=I%20am%20unwell",
  ]) {
    assert.equal(readOrganicEventReferral("?" + invalid, path), null, invalid);
    assert.equal(withOrganicEventReferral(baseline, "?" + invalid, path), baseline);
  }
  for (const pathname of ["/en/app/portrait", "/admin", "/en/report/private",
    "/en/client/private"]) {
    assert.equal(readOrganicEventReferral("?" + valid, pathname), null);
  }
});

test("voluntary WhatsApp and Telegram handoffs identify safe organic source without sending personal query data", () => {
  const referral = "?" + en({
    utm_source: "eventbrite", utm_medium: "organic_event",
    utm_campaign: "stress-live-2026-11", utm_content: "event_followup",
  });
  for (const [locale, label] of [
    ["en", "Event referral"], ["ru", "Источник мероприятия"],
    ["es", "Origen del evento"],
  ]) {
    const base = whatsappEnquiryUrl({
      locale, service: "Live workshop follow-up",
      request: "Please send details for my free review.",
      pagePath: "/" + locale + "/services/free-situation-review",
    });
    const wa = withOrganicEventReferral(base, referral,
      "/" + locale + "/services/free-situation-review", locale);
    assert.equal(new URL(wa).origin, "https://wa.me");
    assert.deepEqual([...new URL(wa).searchParams.keys()], ["text"]);
    assert.match(text(wa), new RegExp(label));
    assert.match(text(wa), /Eventbrite · stress-live-2026-11/);
    assert.match(text(telegramEnquiryUrlFromWhatsApp(wa)), /Eventbrite · stress-live-2026-11/);
    assert.doesNotMatch(text(wa), /utm_|private|token=/);
  }
});

test("no stateful analytics, hidden dispatch or leaking raw URL query in contact chooser", () => {
  const component = readFileSync(new URL("../components/contact-channel-chooser.tsx", import.meta.url), "utf8");
  const submission = readFileSync(new URL("../lib/practitioners/public-enquiry-submission.js", import.meta.url), "utf8");
  const script = readFileSync(new URL("../lib/organic-event-referrals.js", import.meta.url), "utf8");
  assertReferralBoundary(component, submission, script);
});

function assertReferralBoundary(component, submission, script) {
  assert.match(component, /readOrganicEventReferral\(window\.location\.search/);
  assert.match(component, /withOrganicEventReferral\(whatsappUrl, publicEventSearch/);
  assert.match(component, /href=\{preparedWhatsApp\}/);
  assert.match(component, /telegramEnquiryUrlFromWhatsApp\(preparedWhatsApp\)/);
  assert.match(component, /import \{ createPublicEnquirySubmissionScope \} from "@\/lib\/practitioners\/public-enquiry-submission"/);
  assert.match(component, /const result = await scope\.submit\(\{/);
  assert.match(submission, /fetchImpl\('\/api\/service-enquiries', \{/);
  assert.match(submission, /method: 'POST', credentials: 'same-origin'/);
  assert.match(component, /event\.preventDefault\(\)/);
  assert.doesNotMatch(component + submission, /sendBeacon|localStorage|dispatchEvent|window\.gtag/);
  assert.doesNotMatch(submission, /sessionStorage/);
  // The only component-owned requests are the existing Google continuation.
  // Lead persistence remains solely in the immutable submission scope above.
  const calls = [...component.matchAll(/\bfetch\s*\(\s*(["'])([^"']+)\1/g)];
  assert.equal(calls.length, [...component.matchAll(/\bfetch\s*\(/g)].length, 'No dynamic component fetch');
  assert.deepEqual(calls.map(match => match[2]), ['/api/app/auth/contact-profile', '/api/app/auth/start'], 'Only exact Google continuation requests');
  assert.match(component, /fetch\("\/api\/app\/auth\/contact-profile", \{ method: "GET", credentials: "same-origin", cache: "no-store" \}\)/, 'Private profile GET is same-origin and uncached');
  assert.match(component, /fetch\("\/api\/app\/auth\/start", \{\s*method: "POST", credentials: "same-origin",\s*headers: \{ "Content-Type": "application\/json" \},\s*body: JSON\.stringify\(\{ locale, continueTo: "enquiry", returnPath: pathname \}\),\s*\}\)/, 'Auth start carries only public continuation identity');
  // One public path/service/panel marker only, never a contact or private note.
  assert.equal([...component.matchAll(/sessionStorage\.setItem\s*\(/g)].length, 1, 'One public identity marker write');
  assert.match(component, /sessionStorage\.setItem\("hh-google-enquiry-return",\s*JSON\.stringify\(\{ path: pathname, service: serviceTitle, panel: panelId \}\)\)/, 'Exact public identity marker only');
  assert.doesNotMatch(component, /sessionStorage\.setItem\([^;]*(?:email|phone|description|consent)/i);
  for (const match of component.matchAll(/sessionStorage\.(?:getItem|removeItem)\(([^)]*)\)/g)) {
    assert.equal(match[1], '"hh-google-enquiry-return"', 'Only the public continuation marker is read or removed');
  }
  assert.doesNotMatch(script, /fetch\(|sendBeacon|localStorage|sessionStorage/);
}

test("referral guards still reject raw query handoffs and hidden submission side effects", () => {
  const component = readFileSync(new URL("../components/contact-channel-chooser.tsx", import.meta.url), "utf8");
  const submission = readFileSync(new URL("../lib/practitioners/public-enquiry-submission.js", import.meta.url), "utf8");
  const script = readFileSync(new URL("../lib/organic-event-referrals.js", import.meta.url), "utf8");
  assertReferralBoundary(component, submission, script);
  for (const [before, after] of [
    ['withOrganicEventReferral(whatsappUrl, publicEventSearch', 'withOrganicEventReferral(whatsappUrl, window.location.search'],
    ['href={preparedWhatsApp}', 'href={whatsappUrl}'],
    ['telegramEnquiryUrlFromWhatsApp(preparedWhatsApp)', 'telegramEnquiryUrlFromWhatsApp(whatsappUrl)'],
    ['event.preventDefault()', 'event.stopPropagation()'],
  ]) {
    assert.ok(component.includes(before), before);
    assert.throws(() => assertReferralBoundary(component.replace(before, after), submission, script));
  }
  assert.throws(() => assertReferralBoundary(component, submission + "\n navigator.sendBeacon('/collect', payload)", script));
  assert.throws(() => assertReferralBoundary(component, submission, script + "\n sessionStorage.setItem('referral', input)"));
});

test("optional Google continuation cannot turn referral storage into private persistence or extra dispatch", () => {
  const component = readFileSync(new URL("../components/contact-channel-chooser.tsx", import.meta.url), "utf8");
  const submission = readFileSync(new URL("../lib/practitioners/public-enquiry-submission.js", import.meta.url), "utf8");
  const script = readFileSync(new URL("../lib/organic-event-referrals.js", import.meta.url), "utf8");
  for (const [before, after, diagnostic] of [
    ['"/api/app/auth/contact-profile"', '"/api/app/private"', /Only exact Google continuation requests/],
    ['cache: "no-store"', 'cache: "force-cache"', /Private profile GET is same-origin and uncached/],
    ['continueTo: "enquiry", returnPath: pathname', 'continueTo: "enquiry", returnPath: email', /Auth start carries only public continuation identity/],
    ['{ path: pathname, service: serviceTitle, panel: panelId }', '{ path: pathname, service: serviceTitle, panel: panelId, email }', /Exact public identity marker only/],
    ['sessionStorage.getItem("hh-google-enquiry-return")', 'sessionStorage.getItem("private-contact")', /Only the public continuation marker is read or removed/],
  ]) {
    assertReferralBoundary(component, submission, script);
    assert.ok(component.includes(before), before);
    assert.throws(() => assertReferralBoundary(component.replace(before, after), submission, script), diagnostic);
  }
  assertReferralBoundary(component, submission, script);
  assert.throws(() => assertReferralBoundary(component + '\nfetch(endpoint)', submission, script), /No dynamic component fetch/);
  assertReferralBoundary(component, submission, script);
  assert.throws(() => assertReferralBoundary(component + '\nwindow.sessionStorage.setItem("extra", "value")', submission, script), /One public identity marker write/);
});

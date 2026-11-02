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
  const script = readFileSync(new URL("../lib/organic-event-referrals.js", import.meta.url), "utf8");
  assert.match(component, /readOrganicEventReferral\(window\.location\.search/);
  assert.match(component, /withOrganicEventReferral\(whatsappUrl, publicEventSearch/);
  assert.match(component, /href=\{preparedWhatsApp\}/);
  assert.match(component, /telegramEnquiryUrlFromWhatsApp\(preparedWhatsApp\)/);
  assert.match(component, /fetch\("\/api\/service-enquiries", \{/);
  assert.match(component, /event\.preventDefault\(\)/);
  // OAuth may retain public route identity briefly in the same tab, but never
  // the visitor's contact, question, consent or an outbound message payload.
  assert.doesNotMatch(component, /sendBeacon|localStorage/);
  assert.match(component, /sessionStorage\.setItem\("hh-google-enquiry-return"/);
  assert.match(component, /JSON\.stringify\(\{ path: pathname, service: serviceTitle, panel: panelId \}\)/);
  assert.doesNotMatch(component, /sessionStorage\.setItem\([^;]*(?:email|phone|description|consent)/i);
  assert.doesNotMatch(script, /fetch\(|sendBeacon|localStorage|sessionStorage/);
});

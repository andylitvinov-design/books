import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MARKETING_SOURCES, validateMarketingLead, marketingSnapshot } from "../lib/crm/marketing.js";
import { organicEventLandingUrl, readOrganicEventReferral } from "../lib/organic-event-referrals.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const contactId = "123e4567-e89b-42d3-a456-426614174000";
const eventChannels = ["eventbrite", "meetup", "luma", "allevents", "humanitix", "tickettailor", "partner"];

test("all organic event handoff channels have an owner-confirmed CRM source", () => {
  const ui = read("components/app/crm-marketing.jsx");
  const migration = read("supabase/migrations/20261019174844_hh_crm_event_channel_sources_20261019.sql");
  const referrals = read("lib/organic-event-referrals.js");
  for (const source of eventChannels) {
    assert.ok(MARKETING_SOURCES.includes(source), source + " server missing");
    assert.match(migration, new RegExp("'" + source + "'"));
    assert.ok(ui.includes("['" + source + "','"), source + " UI missing");
    assert.ok(referrals.includes(source + ":"), source + " organic attribution missing");
    const lead = validateMarketingLead({ contactId, source, medium: "organic_event",
      campaign: "toronto-2026-10", creative: "listing", offer: "free_review" });
    assert.equal(lead.source, source);
  }
  assert.match(ui, /setMedium\('organic_event'\)/);
  assert.match(migration, /crm_marketing_opportunities_source_check/);
  assert.doesNotMatch(migration, /DROP POLICY|DISABLE ROW LEVEL SECURITY|GRANT.*anon|DELETE FROM|TRUNCATE/i);
});

test("event organic campaigns are anonymous and separate from received enquiries", () => {
  const link = organicEventLandingUrl("/en/services/free-situation-review", {
    source: "luma", campaign: "toronto-2026-10", content: "listing",
  });
  const url = new URL(link);
  assert.equal(url.origin, "https://holistichouse.vercel.app");
  assert.equal(url.searchParams.get("utm_medium"), "organic_event");
  assert.equal(readOrganicEventReferral(url.search, url.pathname)?.source, "luma");
  assert.equal(marketingSnapshot([{ source: "luma", stage: "received", contact_id: contactId }], []).totals.leads, 1);
  assert.equal(marketingSnapshot([], []).totals.leads, 0);
  assert.equal(readOrganicEventReferral("?utm_source=luma&utm_medium=organic_event&utm_campaign=toronto-2026-10&email=private@example.com", url.pathname), null);
  assert.throws(() => validateMarketingLead({ contactId, source: "luma", medium: "organic_event", campaign: "someone@example.com", offer: "free_review" }));
  assert.throws(() => validateMarketingLead({ contactId, source: "luma", medium: "organic_event", condition: "private", offer: "free_review" }));
});

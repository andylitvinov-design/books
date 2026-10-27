import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeTalismanEnquiry, readTalismanRequestDraft, TALISMAN_REQUEST_DRAFT_KEY } from "../lib/practitioners/remote-energy-support.js";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const approved = {
  slug: "remote-energy-support", area_key: "energy_spiritual", status: "published",
  active: true, delivery_format: "online", pricing_mode: "fixed",
};

test("Symbols and Energy Support cards route to separate focused pages and reuse the secured wizard", () => {
  const filter = read("components/holistic-support-topic-filter.tsx");
  const loader = read("components/holistic-inline-support-order.tsx");
  const wizard = read("components/remote-energy-support-booking.tsx");
  const css = read("components/holistic-inline-support-order.module.css");
  assert.match(filter, /data-holistic-order-trigger=\{id\}/);
  assert.match(filter, /\/talismans/);
  assert.match(filter, /\/support-options\?topic=/);
  assert.doesNotMatch(filter, /<HolisticInlineSupportOrder/);
  const standalone = read("components/holistic-support-order-page.tsx");
  assert.match(standalone, /<HolisticInlineSupportOrder standalone locale=\{locale\}/);
  assert.match(standalone, /router\.push\("\/" \+ locale \+ "\/holistic-support"\)/);
  assert.match(filter, /Order a talisman/);
  assert.match(filter, /Заказать талисман/);
  assert.match(filter, /Encargar un talismán/);
  assert.match(filter, /Book energy support/);
  assert.match(filter, /Заказать энергоподдержку/);
  assert.match(loader, /const query = "\/api\/public\/remote-energy-support-masters\?locale="/);
  assert.match(loader, /fetch\(query, \{ credentials: "omit"/);
  assert.match(loader, /kind=consultation/);
  assert.match(loader, /setSearched\(true\)/);
  assert.match(loader, /controller\.abort\(\)/);
  assert.match(loader, /role="alert"/);
  assert.match(wizard, /data-support-request-kind=\{requestKind\}/);
  assert.match(wizard, /selectedKind\?: SupportRequestKind/);
  assert.match(wizard, /mode === "inline"/);
  assert.match(wizard, /kind === "talisman"/);
  assert.match(css, /max-width:720px/);
  assert.match(css, /prefers-reduced-motion/);
});

test("Talisman inquiry is validated separately from session offers, without quoting a session as product price", () => {
  assert.deepEqual(normalizeTalismanEnquiry({ version: 1, goal: "Work and money" }, approved),
    { kind: "talisman_enquiry", goal: "Work and money" });
  for (const invalid of [
    { version: 1, goal: "Cure a diagnosis" },
    { version: 1, goal: "Work and money", expectedPrice: 50 },
    { version: 2, goal: "Work and money" },
  ]) assert.throws(() => normalizeTalismanEnquiry(invalid, approved));
  for (const invalid of [
    { ...approved, active: false },
    { ...approved, status: "submitted" },
    { ...approved, slug: "another" },
  ]) assert.throws(() => normalizeTalismanEnquiry({ version: 1, goal: "Work and money" }, invalid));
  const repo = read("lib/app/repository.js");
  assert.match(repo, /talismanRequest/);
  assert.match(repo, /normalizeTalismanEnquiry/);
  assert.match(repo, /NOT ORDERED OR PAID/);
  assert.match(repo, /remoteBooking \|\| talismanEnquiry/);
  assert.doesNotMatch(read("components/holistic-inline-support-order.tsx"), /sessionStorage|localStorage/);
});

test("Talisman draft keeps only controlled theme and master identity across OAuth", () => {
  const now = Date.now();
  const draft = { version: 1, serviceId: "a-public-offer", practitioner: "Master A", goal: "Work and money", savedAt: now };
  const storage = { getItem: key => key === TALISMAN_REQUEST_DRAFT_KEY ? JSON.stringify(draft) : null };
  assert.deepEqual(readTalismanRequestDraft(storage, draft.serviceId, now), draft);
  assert.equal(readTalismanRequestDraft(storage, "other", now), null);
  assert.equal(readTalismanRequestDraft(storage, draft.serviceId, now + 2 * 86400000), null);
  const bad = { getItem: () => JSON.stringify({ ...draft, goal: "Private medical details" }) };
  assert.equal(readTalismanRequestDraft(bad, draft.serviceId, now), null);
  const workspace = read("components/app/app-workspace.jsx");
  assert.match(workspace, /readTalismanRequestDraft\(window\.sessionStorage, service\.id\)/);
  assert.match(workspace, /talismanRequest: talismanDraft \? \{ version:1, goal:talismanDraft\.goal,/);
  assert.match(workspace, /catalogId:talismanDraft\.catalogId/);
  assert.match(workspace, /TALISMAN_REQUEST_DRAFT_KEY/);
  assert.match(workspace, /Via Holistic House portal/);
});

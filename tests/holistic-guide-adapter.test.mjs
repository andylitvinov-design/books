import test from "node:test";
import assert from "node:assert/strict";
import { buildHolisticGuidedTurn, GUIDED_INTELLIGENCE_VERSION } from "../lib/holistic-support/holistic-guide-adapter.mjs";

const video = (id = "video:approved", facet = "recovery::energy") => ({
  id, kind: "video", title: id, href: "/en/academy",
  status: "published", free: true, axisLinks: [{ ref: facet, strength: 3 }],
});
const offering = (id, slug) => ({ id, title: id, href: "/en/services/" + slug });
const base = () => ({
  locale: "en", intent: { goal: "energy", chosenAxes: ["recovery::energy"],
    enabledFormats: ["video"] }, safety: { status: "clear" },
  catalogs: { axisOffers: [video()] },
});

test("guided turns use one canonical policy and a source-verified item", () => {
  const result = buildHolisticGuidedTurn(base());
  assert.equal(result.guideVersion, GUIDED_INTELLIGENCE_VERSION);
  assert.equal(result.status, "recommend");
  assert.equal(result.primary.id, "video:approved");
  assert.deepEqual(result.primary.reasons, ["goal_axis", "client_chosen_focus", "chosen_topic"]);
  assert.equal(result.externalModelUsed, false);
  assert.equal(result.primary.requiresUserConfirmation, true);
  assert.ok(result.message.includes("video:approved"));
});
test("missing preflight, human review and urgency never expose resources", () => {
  for (const safety of [{}, { status: "human_review" }, { status: "urgent" }]) {
    const result = buildHolisticGuidedTurn({ ...base(), safety });
    assert.equal(result.suggestions.length, 0);
    assert.equal(result.status, safety.status ? "safety_handoff" : "safety_check_required");
  }
  const emergency = buildHolisticGuidedTurn({ ...base(),
    intent: { ...base().intent, rawUtterance: "Хочу покончить с собой" },
    locale: "ru" });
  assert.equal(emergency.status, "safety_handoff");
  assert.equal(emergency.suggestions.length, 0);
  assert.ok(!JSON.stringify(emergency).includes("покончить"));
});
test("no focus clarifies rather than inferring a need from source scores", () => {
  const result = buildHolisticGuidedTurn({ ...base(), intent: {},
    profile: { measurements: [{ rawValue: 2, resultId: "secret" }] },
    access: { authenticated: true, ownerScoped: true },
    consent: { profilePersonalization: true, measuredPersonalization: true } });
  assert.equal(result.status, "clarify");
  assert.equal(result.suggestions.length, 0);
  assert.ok(!JSON.stringify(result).includes("secret"));
});
test("paid sessions require an independent explicit opt-in", () => {
  const input = { locale: "en", safety: { status: "clear" },
    intent: { goal: "money", enabledFormats: ["service"] },
    catalogs: { services: [offering("business", "business-consulting"),
      offering("situation", "free-situation-review")] } };
  const free = buildHolisticGuidedTurn(input);
  assert.equal(free.status, "recommend");
  assert.deepEqual(free.suggestions.map(x => x.id), ["service:situation"]);
  const consent = buildHolisticGuidedTurn({ ...input, consent: { paidSuggestions: true } });
  assert.equal(consent.primary.id, "service:business");
});
test("sensitive relationship facets require separate approval", () => {
  const input = { locale: "en", safety: { status: "clear" },
    intent: { chosenAxes: ["connection::intimacy"], enabledFormats: ["video"] },
    catalogs: { axisOffers: [video("video:intimacy", "connection::intimacy")] } };
  assert.equal(buildHolisticGuidedTurn(input).status, "no_match");
  const enabled = buildHolisticGuidedTurn({ ...input, consent: { sensitiveContent: true } });
  assert.equal(enabled.primary.id, "video:intimacy");
});
test("current feedback works without saving, prior history is opt-in and owner-scoped", () => {
  const input = { ...base(),
    catalogs: { axisOffers: [video("video:first"), video("video:second")] } };
  const current = buildHolisticGuidedTurn({ ...input,
    feedback: { dismissedIds: ["video:first"] } });
  assert.equal(current.primary.id, "video:second");
  assert.equal(current.saved, false);
  const history = { completedIds: ["video:first"] };
  assert.equal(buildHolisticGuidedTurn({ ...input, history }).primary.id, "video:first");
  assert.equal(buildHolisticGuidedTurn({ ...input, history,
    consent: { practiceHistory: true } }).primary.id, "video:first");
  const authorized = buildHolisticGuidedTurn({ ...input, history,
    consent: { practiceHistory: true },
    access: { authenticated: true, ownerScoped: true } });
  assert.equal(authorized.primary.id, "video:second");
  assert.equal(authorized.historyUsed, true);
});
test("private test content and free text never appear in portable answer", () => {
  const r = buildHolisticGuidedTurn({ ...base(),
    intent: { ...base().intent, rawUtterance: "I want more energy" },
    access: { authenticated: true, ownerScoped: true },
    consent: { profilePersonalization: true, measuredPersonalization: true },
    profile: { measurements: [{ rawValue: 9, resultId: "secret-person-id",sourceTitle:"Private title" }] } });
  assert.equal(r.status, "recommend");
  const result = JSON.stringify(r);
  for (const value of ["rawValue", "secret-person-id", "Private title", "I want more energy"]) {
    assert.ok(!result.includes(value));
  }
});
test("unsafe or unpublished catalogues cannot create a next step", () => {
  const plan = { ...base(), catalogs: { axisOffers: [
    { ...video(), status: "draft" },
    { ...video("video:evil"), href: "javascript:alert(1)" },
  ] } };
  assert.equal(buildHolisticGuidedTurn(plan).status, "no_match");
});

test("null or malformed inputs fail closed", () => {
  const result = buildHolisticGuidedTurn({ locale: "ru", intent: null,
    access: null, safety: null, feedback: null, catalogs: null,
    profile: null, consent: null, history: null });
  assert.equal(result.status, "safety_check_required");
  assert.deepEqual(result.suggestions, []);
  assert.equal(buildHolisticGuidedTurn({ safety: { status: "clear" }, intent: null }).status, "clarify");
});

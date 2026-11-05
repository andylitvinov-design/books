import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {
  stageRemoteSupportLandingIntention,
  takeRemoteSupportLandingIntention,
} from "../lib/practitioners/remote-energy-support.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("private goal handoff is consumed once, capped and expires without browser storage", () => {
  const oldWindow = globalThis.window;
  globalThis.window = {};
  try {
    stageRemoteSupportLandingIntention("  A goal with a private situation  ", 1000);
    assert.equal(takeRemoteSupportLandingIntention(1100), "A goal with a private situation");
    assert.equal(takeRemoteSupportLandingIntention(1101), "");
    stageRemoteSupportLandingIntention("short", 1000);
    assert.equal(takeRemoteSupportLandingIntention(301001), "");
    stageRemoteSupportLandingIntention("x".repeat(900), 500);
    assert.equal(takeRemoteSupportLandingIntention(501).length, 500);
    stageRemoteSupportLandingIntention("old", 500);
    stageRemoteSupportLandingIntention("", 501);
    assert.equal(takeRemoteSupportLandingIntention(502), "");
  } finally {
    if (oldWindow === undefined) delete globalThis.window;
    else globalThis.window = oldWindow;
  }
});

test("energy CTA transfers only in memory to the existing private intent field", () => {
  const ideas = read("components/ideas-discovery.tsx");
  const booking = read("components/remote-energy-support-booking.tsx");
  const bridge = read("lib/practitioners/remote-energy-support.js");
  const screen = read("app/[locale]/holistic-support/page.tsx");
  assert.ok(ideas.includes('onClick={() => stageRemoteSupportLandingIntention(question)}'));
  assert.ok(ideas.includes("data-ideas-energy-support"));
  assert.ok(ideas.includes('href={"/" + locale + "/services/remote-energy-support"}'));
  assert.ok(booking.includes("const stagedIntention = takeRemoteSupportLandingIntention()"));
  assert.ok(booking.includes("if (stagedIntention) setIntention(stagedIntention)"));
  // Scope the no-storage rule to the ephemeral free-text handoff only.
  // The unrelated talisman draft added below this block deliberately stores
  // *controlled non-sensitive* theme + public master identity across login.
  const landing = bridge.slice(bridge.indexOf("// One-use, same-tab handoff"),
    bridge.indexOf("// The talisman choice"));
  assert.ok(landing.startsWith("// One-use, same-tab handoff"));
  assert.doesNotMatch(landing, /setItem\(|getItem\(|navigator\.sendBeacon|fetch\(|URLSearchParams\(/);
  const talisman = bridge.slice(bridge.indexOf("export function normalizeTalismanEnquiry"));
  assert.match(talisman, /REMOTE_SUPPORT_GOALS\.includes\(input\.goal\)/);
  assert.doesNotMatch(talisman, /stageRemoteSupportPrivateIntention|navigator\.sendBeacon|localStorage/);
  assert.ok(screen.includes('<HolisticSupportChoices locale={locale} />'));
  assert.match(read("components/holistic-support-choices.tsx"), /data-holistic-choose="energy"/);
  assert.ok(!screen.includes("<FreeDiagnosticStart") && !screen.includes("<CompactLeadCapture"));
});

test("first-screen language and actions remain readable at iPhone 320–430 widths", () => {
  const ideas = read("components/ideas-discovery.tsx");
  const scenic = read("components/ideas-discovery.module.css");
  for(const label of [
    "Your goal, question or situation", "Какая у вас цель, ситуация", "Tu objetivo, situación",
    "Get a free symbolic insight", "Получить бесплатную подсказку", "Recibir una reflexión gratuita",
    "Request energy support", "Получить энергетическую поддержку", "Solicitar apoyo energético",
  ]) assert.ok(ideas.includes(label), "missing text: " + label);
  assert.ok(scenic.includes("grid-template-columns: minmax(0,1fr)"));
  assert.ok(scenic.includes("@media (max-width: 360px)"));
  assert.ok(scenic.includes('.root[data-temple-mode="true"] .heroActions .diagnosticAction'));
  assert.ok(scenic.includes("ideas-pine-sharp.avif"));
});

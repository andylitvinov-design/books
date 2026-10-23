import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("monthly offer has a single localized, public, SEO-addressable page with real terms", () => {
  const route = read("app/[locale]/services/personal-support/page.tsx");
  const landing = read("components/personal-support-landing.tsx");
  const css = read("components/personal-support-landing.module.css");
  for (const locale of ["en","ru","es"]) {
    assert.ok(route.includes("/" + locale + "/services/personal-support"));
    assert.ok(landing.includes("  " + locale + ": {"));
  }
  assert.match(route, /generateMetadata/);
  assert.match(route, /generateStaticParams/);
  assert.match(route, /metadataBaseFor/);
  assert.match(route, /canonical: path/);
  assert.match(route, /"x-default": "\/en\/services\/personal-support"/);
  assert.match(landing, /€200/);
  assert.match(landing, /2 personal sessions · 60 minutes each/);
  assert.match(landing, /2 полноценные сессии · по 60 минут/);
  assert.match(landing, /2 sesiones completas · 60 minutos cada una/);
  assert.match(landing, /remote_no_call/);
  assert.match(landing, /personal report and video/);
  assert.match(landing, /не автоматич/);
  assert.match(landing, /data-personal-support-landing/);
  assert.match(landing, /StaticPortrait/);
  assert.match(css, /@media\(max-width:640px\)/);
  assert.match(css, /@media\(max-width:350px\)/);
  assert.match(css, /min-height:44px/);
});

test("personal-support request uses existing consented database write, no fake checkout or new sensitive transport", () => {
  const capture = read("components/compact-lead-capture.tsx");
  const landing = read("components/personal-support-landing.tsx");
  const server = read("app/api/service-enquiries/route.js");
  assert.match(landing, /<CompactLeadCapture/);
  assert.match(landing, /sourcePath=\{"\/" \+ locale \+ "\/services\/personal-support"\}/);
  assert.match(landing, /formatOptions=\{t\.formats\}/);
  assert.match(capture, /formatOptions\?: readonly/);
  assert.match(capture, /Preferred session format:/);
  assert.match(capture, /contactConsent: true/);
  assert.match(capture, /result\?\.saved !== true/);
  assert.match(server, /createPublicServiceEnquiry/);
  assert.doesNotMatch(landing, /Stripe|PayPal|autocharge|fetch\(|localStorage|sendBeacon/);
  assert.doesNotMatch(landing, /<iframe|youtube\.com\/embed/);
});

test("home and services discover the same €200 programme; alchemy monthly does not charge €100", () => {
  const home = read("components/home-featured-workspace.tsx");
  const offers = read("components/services-studio-offers.tsx");
  const facets = read("components/services-explorer-state.tsx");
  const alchemyForm = read("components/alchemy-soul-lead-form.tsx");
  assert.match(home, /support: "\/" \+ locale \+ "\/services\/personal-support"/);
  assert.match(home, /Personal support · €200\/month/);
  assert.match(home, /Личное сопровождение · €200\/мес/);
  assert.match(offers, /id: "monthly-support"/);
  assert.match(offers, /monthly: true/);
  assert.match(offers, /t\.viewProgram/);
  assert.match(facets, /"monthly-support": \{ modes: \["online", "toronto"\]/);
  assert.match(alchemyForm, /selected === "month" \? \(/);
  assert.match(alchemyForm, /format === "month" \? \(/);
  assert.match(alchemyForm, /href=\{"\/" \+ locale \+ "\/services\/personal-support"\}/);
  assert.match(alchemyForm, /selected !== "month" && \(wiseEnabled/);
  assert.match(alchemyForm, /€200 per month/);
  assert.doesNotMatch(home, /payment_success|autoRenew/);
});

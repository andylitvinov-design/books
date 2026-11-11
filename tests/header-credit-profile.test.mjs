import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatHeaderCredits, headerCreditPercentage } from "../lib/video-credits/header-display.mjs";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("credit indicator prints full numbers with the meter underneath", () => {
  assert.equal(formatHeaderCredits(8000), "8\u00a0000");
  assert.equal(formatHeaderCredits(1300), "1\u00a0300");
  assert.equal(formatHeaderCredits(0), "0");
  for (const bad of [null, undefined, -1, NaN, 1.2]) assert.equal(formatHeaderCredits(bad), "—");
  assert.equal(headerCreditPercentage(800, 1600), 50);
  assert.equal(headerCreditPercentage(1300, 1600), 81);
  assert.equal(headerCreditPercentage(0, 1600), 0);
  assert.equal(headerCreditPercentage(9000, 1600), 100);
  assert.equal(headerCreditPercentage(null, 1600), null);
  assert.equal(headerCreditPercentage(800, 0), null);
});

test("both mobile headers and desktop video nav use the shared compact credit profile", () => {
  const widget = read("components/header-credit-profile.tsx");
  const css = read("components/header-credit-profile.module.css");
  const studio = read("components/mandala-free-video-studio.tsx");
  const coach = read("components/my-coach-catalog.jsx");
  const nav = read("components/site-navigation.tsx");
  assert.match(widget, /fetchVideoCreditCatalog\(\)/);
  assert.match(widget, /fetchVideoCreditStatus\(\)/);
  assert.match(widget, /if \(!catalog\.ready\)/);
  assert.match(widget, /Number\.isSafeInteger\(status\.balanceCredits\)/);
  assert.match(widget, /data-hh-credit-profile/);
  assert.match(widget, /data-hh-credit-count/);
  assert.match(widget, /data-hh-credit-profile-link/);
  assert.match(widget, /<details/);
  assert.match(widget, /data-hh-credit-details/);
  assert.match(widget, /locale === "es" \? "en"/);
  assert.match(css, /\.readout\{display:grid/);
  assert.match(css, /\.track\{display:block/);
  const studioCss = read("components/mandala-video-mobile.module.css");
  assert.match(studioCss, /\.quickBrandIHelp\{margin-left:auto!important\}/);
  assert.match(studio, /<HeaderCreditProfile locale=\{locale\}/);
  assert.match(coach, /<HeaderCreditProfile locale=\{lang\}/);
  assert.match(nav, /<HeaderCreditProfile locale=\{activeLocale\}/);
  assert.doesNotMatch(widget, /8000|8[ ,]000|localStorage|service_role|postVideoCreditAction/);
  assert.doesNotMatch(widget, /setInterval|setTimeout|fetch\(/);
  for (const language of ["en", "ru", "es"]) assert.match(widget, new RegExp(language + ": \\{ title:"));
});

test("balance refresh follows only server-acknowledged credit changes", () => {
  const client = read("lib/video-credits/client.mjs");
  const api = read("app/api/app/video-credits/[action]/route.js");
  assert.match(client, /if\(!response\.ok\)throw Error/);
  assert.match(client, /hh:video-credits-changed/);
  assert.match(api, /auth\.verified\(\)/);
  assert.match(api, /PRIVATE_HEADERS/);
});

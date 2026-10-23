import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("homepage stays server-rendered, with client behavior in leaf boundaries only", () => {
  const home = read("components/holistic-house-home.tsx");
  assert.doesNotMatch(home, /^["']use client["'];?/m);
  assert.doesNotMatch(home, /use(?:State|Effect|Ref|Memo|Callback)\s*\(|\b(?:window|document|localStorage|sessionStorage)\./);
  assert.match(home, /<AcquisitionEventLink/);
  assert.match(home, /<SiteNavigation locale=\{locale\}/);
  assert.doesNotMatch(home, /HomeFreePaths/);
  const deferred = read("components/home-more-disclosure.tsx");
  assert.match(home, /<HomeMoreDisclosure locale=\{locale\}>/);
  assert.match(deferred, /<ServicesSolutions locale=\{locale\} variant="home" \/>/);
  assert.match(deferred, /ssr: false/);
  assert.doesNotMatch(home, /<ServicesSolutions locale=\{locale\} variant="home" \/>/);
  assert.match(read("app/page.tsx"), /<HolisticHouseHome/);
  assert.match(read("app\/\[locale\]\/page.tsx"), /<HolisticHouseHome/);
  assert.match(read("components/site-navigation.tsx"), /^["']use client["']/m);
  assert.match(read("components/acquisition-event-link.tsx"), /^["']use client["']/m);
});

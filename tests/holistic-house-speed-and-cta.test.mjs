import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("short-lived public video snapshot cache never includes drafts or request-specific HTML", () => {
  const publicSource = read("lib/site-videos/public.ts");
  const actions = read("app/admin/videos/actions.js");
  const middleware = read("middleware.ts");
  const layout = read("app/layout.tsx");
  assert.match(publicSource, /unstable_cache/);
  assert.match(publicSource, /revalidate: 60/);
  assert.match(publicSource, /tags: \['holistic-house-published-site-videos'\]/);
  assert.match(publicSource, /toPublishedSiteVideo\(record\)/);
  assert.match(publicSource, /noStore\(\)/);
  assert.match(actions, /revalidateTag\('holistic-house-published-site-videos'\)/);
  assert.match(actions, /await store\.save\(record, input\.expectedRevision\)/);
  assert.ok(actions.indexOf("await store.save") < actions.indexOf("revalidateTag("));
  assert.match(middleware, /Cache-Control', 'private, no-store/);
  assert.match(layout, /nonce=\{nonce\}/);
  assert.doesNotMatch(publicSource, /force-static|s-maxage|public, max-age/);
});

test("homepage offers a genuine consultation enquiry from the first screen without removing free entry", () => {
  const home = read("components/holistic-house-home.tsx");
  const capture = read("components/homepage-contact-cta.tsx");
  assert.match(home, /heroBook: "Book a consultation"/);
  assert.match(home, /heroBook: "Записаться на консультацию"/);
  assert.match(home, /href="#home-consultation"/);
  assert.match(home, /className="service-home-button service-home-button--consultation"/);
  assert.match(capture, /id="home-consultation"/);
  assert.match(capture, /variant="service"/);
  assert.match(home, /href=\{\x60\/\$\{locale\}\/services\/free-situation-review\x60\}/);
  assert.match(home, /href="#core-services"/);
  const firstScreen = home.indexOf('className="service-home-hero"');
  const book = home.indexOf('href="#home-consultation"');
  const belowFold = home.indexOf("<FreeInsightsPaths");
  assert.ok(firstScreen < book && book < belowFold, "Booking CTA must be inside the hero");
});

test("bypass paid transformation for owned ready-compressed WebP images only", () => {
  const player = read("components/site-video-player.tsx");
  const services = read("components/services-solutions.tsx");
  assert.match(player, /unoptimized=\{approvedPoster\.endsWith\("\.webp"\)\}/);
  assert.match(player, /unoptimized=\{fallbackPoster\.endsWith\("\.webp"\)\}/);
  assert.match(services, /unoptimized=\{isHome && homepageMedia\[offer\.id\]\.endsWith\("\.webp"\)\}/);
  assert.match(player, /https:\/\/www\.youtube-nocookie\.com\/embed/);
  // Portrait PNG and third-party YouTube stills keep their original optimized flow.
  assert.match(read("components/holistic-house-home.tsx"), /src="\/images\/holistic-house\/andy-about\.png"/);
  assert.match(player, /src=\{\x60https:\/\/i\.ytimg\.com\/vi\//);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compactNavigationIds, getCompactNavigation, activeCompactNavigationId } from "../lib/site-navigation-model.js";
import { buildPublishedVideoIndex } from "../lib/video-discovery/catalog.mjs";
import { rankDiscoveryVideos } from "../lib/video-discovery/ranker.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("MyTube is exactly the seventh public bottom navigation item for all three locales", () => {
  assert.equal(compactNavigationIds.length, 7);
  assert.equal(compactNavigationIds[6], "mytube");
  for (const locale of ["en", "ru", "es"]) {
    const items = getCompactNavigation(locale);
    assert.equal(items.length, 7);
    assert.deepEqual(items.at(-1), {
      id: "mytube", href: "/" + locale + "/mytube", label: "MyTube",
      ariaLabel: "MyTube", external: false,
    });
    assert.equal(activeCompactNavigationId("/" + locale + "/mytube"), "mytube");
    assert.ok(!items.some(item => item.id === "temple"),
      "Holistic Support stays in the expanded menu, not as an eighth mobile item");
  }
  assert.match(read("components/compact-navigation-icons.ts"), /mytube: Clapperboard/);
  assert.match(read("components/mobile-bottom-navigation.tsx"), /mytube: 'MyTube'/);
  assert.match(read("components/site-navigation.tsx"), /'events', 'temple'/);
});

test("MyTube uses the existing public Library/Academy projection and reviewed meditational source", () => {
  const page = read("app/[locale]/mytube/page.tsx");
  const hub = read("components/library-hub.tsx");
  assert.match(page, /loadPublicLibraryFeed\(locale\)/);
  assert.match(page, /loadApprovedVideoDiscoveries\(\)/);
  assert.match(page, /<LibraryHub locale=\{locale\} view="videos" myTube/);
  assert.match(hub, /buildPublishedVideoIndex\(\[\.\.\.seriesItems,/);
  assert.match(hub, /\.\.\.approvedAcademyDiscoveryVideos\(locale\)/);
  assert.match(hub, /\.\.\.approvedMeditations,/);
  assert.match(hub, /variant="mytube"/);
  assert.match(page, /canonical: `\/\$\{locale\}\/mytube`/);
  assert.match(page, /languages: \{ en: "\/en\/mytube", ru: "\/ru\/mytube", es: "\/es\/mytube"/);
  assert.match(read("lib/public-locales.ts"), /mytube/);
  assert.match(read("app/sitemap.ts"), /mytube/);
});

test("MyTube deep discovery contains real interactions and no additional player autoplay", () => {
  const discovery = read("components/video-discovery.tsx");
  const feed = read("components/library-feed.tsx");
  const css = read("components/library-feed.module.css");
  for (const label of ["myTubeSearch", "setArea", "setGoal", "setContentType", "setDirection",
    "setTradition", "setSeries", "setSource", "setLanguage", "setSort", "savedOnly", "setQuery"]) {
    assert.ok(discovery.includes(label), label);
  }
  assert.match(discovery, /rankDiscoveryVideos\(videos,/);
  assert.match(discovery, /youtubeLayout=\{myTube\}/);
  assert.match(feed, /playing \? \(/);
  assert.match(feed, /https:\/\/www\.youtube-nocookie\.com\/embed\//);
  assert.match(feed, /!youtubeLayout && <div className=\{styles\.toolbar\}>/);
  assert.match(css, /\.youtubeFeed \.list\{display:grid;grid-template-columns:repeat\(3,/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /min-height:44px/);
});

test("Only approved public media enter the MyTube catalog, never a candidate or private row", () => {
  const approved = { id: "published", kind: "video", youtubeId: "aa123456789",
    title: "Public meditation", description: "Calm", sourceApproved: true,
    audioLanguage: "en", topicTags: ["stress"], lifeAreas: ["energy_health"] };
  const candidate = { ...approved, id: "candidate", youtubeId: "bb123456789",
    editorial_status: "candidate", sourceApproved: false };
  const unreviewedExternal = { ...approved, id: "external", youtubeId: "cc123456789",
    source_kind: "external", sourceApproved: false };
  const privateRecord = { ...approved, id: "client", youtubeId: "dd123456789",
    editorial_status: "unlisted_private" };
  const index = buildPublishedVideoIndex([candidate, approved, unreviewedExternal, privateRecord]);
  assert.deepEqual(index.map(item => item.youtubeId), ["aa123456789"]);
  assert.deepEqual(rankDiscoveryVideos(index, { area: "energy_health", goal: "stress" })
    .map(item => item.youtubeId), ["aa123456789"]);
  assert.deepEqual(rankDiscoveryVideos(index, { area: "relationships" }), []);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compactNavigationIds, getCompactNavigation } from "../lib/site-navigation-model.js";
import { buildPublishedVideoIndex } from "../lib/video-discovery/catalog.mjs";
import { rankDiscoveryVideos } from "../lib/video-discovery/ranker.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("MyTube is the seventh VIDEO EDITOR dock action, while site-wide nav is untouched", () => {
  const dock = read("components/holistic-support-mandala-dock.tsx");
  const nav = dock.slice(dock.indexOf("<nav ref={mobileDockRef}"), dock.indexOf("</nav>"));
  const actions = [...nav.matchAll(/<(?:Link|button)\b/g)].length;
  assert.equal(actions, 7, "five existing destinations + AI + MyTube");
  assert.ok(nav.indexOf("data-support-video-ai") < nav.indexOf("data-video-my-tube"));
  assert.match(nav, /href=\{"\/" \+ locale \+ "\/mytube"\}/);
  assert.match(nav, /aria-current=\{mode === "mytube" \? "page" : undefined\}/);
  assert.ok(nav.includes("ref={mobileDockRef}"));
  const css = read("components/holistic-support-mobile.module.css");
  assert.match(css, /\.bottomNav\.mandalaBottomNav\{grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
  assert.match(css, /position: fixed; z-index: 58/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.ok(read("components/mobile-bottom-navigation.tsx").includes('mytube(?:\\/|$)'));
  assert.equal(compactNavigationIds.at(-1), "temple", "do not replace the public Holistic Support button");
  for(const locale of ["en","ru","es"]) {
    assert.equal(getCompactNavigation(locale).length,7);
    assert.equal(getCompactNavigation(locale).at(-1)?.id,"temple");
  }
});

test("MyTube route uses the same real public Library, Academy and reviewed meditation sources", () => {
  const page = read("app/[locale]/mytube/page.tsx");
  const hub = read("components/library-hub.tsx");
  assert.match(page,/loadPublicLibraryFeed\(locale\)/);
  assert.match(page,/loadApprovedVideoDiscoveries\(\)/);
  assert.match(page,/<LibraryHub locale=\{locale\} view="videos" myTube/);
  assert.match(page,/<HolisticSupportMandalaDock locale=\{locale\} mode="mytube" showHeader=\{false\}/);
  assert.match(page,/canonical: `\/\$\{locale\}\/mytube`/);
  assert.match(hub,/buildPublishedVideoIndex\(\[\.\.\.seriesItems,/);
  assert.match(hub,/\.\.\.approvedAcademyDiscoveryVideos\(locale\)/);
  assert.match(hub,/\.\.\.approvedMeditations,/);
  assert.match(hub,/variant="mytube"/);
  assert.match(read("lib/public-locales.ts"),/mytube/);
  assert.match(read("app/sitemap.ts"),/mytube/);
});

test("MyTube advanced filters, responsive cards, video click-to-play and AI back link are live controls", () => {
  const d = read("components/video-discovery.tsx");
  const feed = read("components/library-feed.tsx");
  const css = read("components/library-feed.module.css");
  const dock = read("components/holistic-support-mandala-dock.tsx");
  for(const control of ["myTubeSearch","setArea","setGoal","setContentType","setDirection",
    "setTradition","setSeries","setSource","setLanguage","setSort","savedOnly","setQuery"]) {
    assert.ok(d.includes(control), control);
  }
  assert.match(d,/rankDiscoveryVideos\(videos,/);
  assert.match(d,/youtubeLayout=\{myTube\}/);
  assert.match(feed,/playing \? \(/);
  assert.match(feed,/https:\/\/www\.youtube-nocookie\.com\/embed\//);
  assert.match(feed,/!youtubeLayout && <div className=\{styles\.toolbar\}>/);
  assert.match(css,/\.youtubeFeed \.list\{display:grid;grid-template-columns:repeat\(3,/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/min-height:44px/);
  assert.match(dock,/holistic-support\/mandala#video-director-chat/);
  assert.match(read("components/mandala-video-director-chat.module.css"),/\.window:target/);
  assert.match(read("components/mandala-free-video-studio.tsx"),/if\(hash==="video-director-chat"\)/);
});

test("Unreviewed, private and candidate source records cannot leak into MyTube", () => {
  const approved={id:"approved",kind:"video",youtubeId:"aa123456789",title:"Public meditation",
    description:"Calm",sourceApproved:true,audioLanguage:"en",topicTags:["stress"],lifeAreas:["energy_health"]};
  const candidate={...approved,id:"candidate",youtubeId:"bb123456789",editorial_status:"candidate",sourceApproved:false};
  const unreviewed={...approved,id:"external",youtubeId:"cc123456789",source_kind:"external",sourceApproved:false};
  const privateItem={...approved,id:"private",youtubeId:"dd123456789",editorial_status:"unlisted_private"};
  const index=buildPublishedVideoIndex([candidate,approved,unreviewed,privateItem]);
  assert.deepEqual(index.map(v=>v.youtubeId),["aa123456789"]);
  assert.deepEqual(rankDiscoveryVideos(index,{goal:"stress"}).map(v=>v.youtubeId),["aa123456789"]);
});


test("MyTube serves all three public locales rather than the RU/EN-only remedy guard",()=>{
 const page=read("app/[locale]/mytube/page.tsx");
 assert.match(page,/publicLocales\.map\(locale => \(\{ locale \}\)\)/);
 assert.match(page,/const isPublicLocale = \(value: string\): value is PublicLocale/);
 assert.match(page,/if \(!isPublicLocale\(locale\)\)/);
 assert.doesNotMatch(page,/isSupportedLocale|getHomeopathyLocaleParams/);
 assert.match(read("lib/public-locales.ts"),/publicLocales: readonly PublicLocale\[\] = \['ru', 'en', 'es'\]/);
});
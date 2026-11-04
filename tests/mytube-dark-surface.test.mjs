import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("MyTube uses a local high-contrast dark palette and YouTube-like red play identity",()=>{
 const page=read("app/[locale]/mytube/page.tsx");
 const css=read("app/[locale]/mytube/mytube.module.css");
 assert.match(page,/data-mytube-page/);
 assert.match(page,/<Play size=\{17\} fill="currentColor"/);
 assert.match(css,/--mytube-bg:#0f0f0f/);
 assert.match(css,/--mytube-red:#ff0033/);
 assert.match(css,/color-scheme:dark/);
 assert.match(css,/@media\(max-width:640px\)/);
 assert.match(css,/\.page a:focus-visible/);
});
test("Only MyTube variants recolor the discovery controls and the existing public video feed",()=>{
 const discovery=read("components/video-discovery.module.css");
 const feedCss=read("components/library-feed.module.css");
 const feed=read("components/library-feed.tsx");
 assert.match(discovery,/\.mytube \.lifeAreas\{display:flex;flex-wrap:nowrap/);
 assert.match(discovery,/\.mytube \.lifeAreas button\[aria-pressed=true\]/);
 assert.match(discovery,/\.mytube \.topSearch/);
 assert.match(feedCss,/\.mytubeFeed \.seriesHeading/);
 assert.match(feedCss,/\.mytubeFeed \.preferenceAction\[aria-pressed=true\]/);
 assert.match(feed,/data-video-layout=\{videoLayout\}/);
 assert.match(feed,/videoLayout !== "mytube"/);
 assert.match(feed,/videoLayout === "mytube"/);
 assert.match(feed,/https:\/\/www\.youtube-nocookie\.com\/embed\//);
 assert.match(feed,/onToggleSaved\(item\.youtubeId \|\| item\.id\)/);
 assert.match(feed,/onDismissVideo\(item\.youtubeId \|\| item\.id\)/);
});
test("Existing shared fixed six-item dock is recolored only on the MyTube route",()=>{
 const shell=read("app/unified-mobile-dock.css");
 const dock=read("components/unified-mobile-dock.tsx");
 assert.match(shell,/body:has\(\[data-mytube-page\]\) \[data-hh-unified-dock\]/);
 assert.match(shell,/body:has\(\[data-mytube-page\]\) \[data-unified-dock-item\]\[aria-current="page"\]/);
 assert.match(dock,/visualDockBottomCorrection/);
 assert.match(dock,/UNIFIED_DOCK_IDS\.map/);
});

test("MyTube hides secondary filter groups until the visitor explicitly refines",()=>{
 const view=read("components/video-discovery.tsx");
 const css=read("components/video-discovery.module.css");
 assert.match(view,/aria-controls="mytube-refine-controls mytube-more-controls"/);
 assert.match(view,/setFiltersOpen\(value=>!value\)/);
 assert.match(view,/hidden=\{variant==="mytube"&&!filtersOpen\}/);
 assert.match(css,/\.refine\[hidden\],\.moreControls\[hidden\]\{display:none!important\}/);
 assert.match(css,/\.wrapper:not\(\.mytube\) \.refine,\.moreControls\{display:contents\}/);
});

test("MyTube excludes the global free-review ribbon without altering other routes",()=>{
 const banner=read("components/sitewide-antistress-banner.tsx");
 const mytubeRoute=String.raw`/^\/(?:ru|en|es)\/mytube\/?$/.test(pathname)`;
 assert.ok(banner.includes(mytubeRoute),"dedicated MyTube no-promo rule");
 assert.match(banner,/isDistractionSensitivePage\(pathname\)/);
});

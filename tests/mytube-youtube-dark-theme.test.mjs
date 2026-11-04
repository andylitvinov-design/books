import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("MyTube black/graphite shell stays local to the /mytube route", () => {
  const page = read("app/[locale]/mytube/page.tsx");
  const style = read("app/[locale]/mytube/mytube.module.css");
  assert.match(page, /data-mytube-page/);
  assert.match(page, /<VideoDiscovery locale=\{locale\} videos=\{publicVideos\} variant="mytube"\s*\/>/);
  assert.match(style, /--mytube-canvas:#0f0f0f/);
  assert.match(style, /--mytube-red:#ff0033/);
  assert.match(style, /color-scheme:dark/);
  assert.match(style, /\.page a:focus-visible/);
});

test("Video-first mobile keeps real four-level taxonomy, search and saved controls", () => {
  const view = read("components/video-discovery.tsx");
  const css = read("components/video-discovery.module.css");
  assert.match(view, /data-mytube-search/);
  assert.match(view, /data-mytube-categories/);
  assert.match(view, /data-mytube-subcategories/);
  assert.match(view, /data-mytube-topics/);
  assert.match(view, /data-mytube-scenarios/);
  assert.match(view, /aria-expanded=\{filtersOpen\}/);
  assert.match(view, /aria-controls="mytube-refine-controls"/);
  assert.match(view, /hidden=\{variant==="mytube"&&!filtersOpen\}/);
  assert.match(view, /setFiltersOpen\(value=>!value\)/);
  assert.match(view, /onToggleSaved=\{save\}/);
  assert.match(view, /onDismissVideo=\{dismiss\}/);
  assert.match(view, /refine:"Уточнить подбор"/);
  assert.match(view, /refine:"Refine"/);
  assert.match(view, /refine:"Afinar selección"/);
  assert.match(css, /\.refine\[hidden\]\{display:none!important\}/);
  assert.match(css, /\.mytube \.lifeAreas\{[^}]*overflow-x:auto/s);
  assert.match(css, /\.mytube \.panel\{[^}]*background:transparent/s);
});

test("Feed changes are variant-specific and preserve click-to-play consent", () => {
  const feed = read("components/library-feed.tsx");
  const css = read("components/library-feed.module.css");
  assert.match(feed, /videoLayout === "mytube" && styles\.mytubeFeed/);
  assert.match(feed, /onClick=\{\(\) => setPlayingId\(item\.id\)\}/);
  assert.match(feed, /youtube-nocookie\.com\/embed/);
  assert.match(css, /\.mytubeFeed \.seriesHeading\{/);
  assert.match(css, /\.mytubeFeed \.channelAvatar\{/);
  assert.match(css, /\.mytubeFeed \.primaryAction\{/);
  assert.match(css, /\.mytubeFeed \.details h2/);
});

test("Unified mobile dock is dark only on localized MyTube and still six-tab", () => {
  const component = read("components/unified-mobile-dock.tsx");
  const css = read("components/unified-mobile-dock.module.css");
  assert.match(component, /darkMyTube = \/\^\\\/\(\?:ru\|en\|es\)\\\/mytube/);
  assert.match(component, /data-mytube-theme=\{darkMyTube \? "dark" : undefined\}/);
  assert.match(component, /UNIFIED_DOCK_IDS\.map/);
  assert.match(css, /\.dock\[data-mytube-theme="dark"\]/);
  assert.match(css, /\.dock\[data-mytube-theme="dark"\] \.item\[aria-current="page"\]/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Library header, tabs and all three content views stay compact", () => {
  const hub = source("components/library-hub.tsx");
  const feed = source("components/library-feed.tsx");
  const css = source("components/library-feed.module.css");
  const global = source("app/ia-v2.css");

  assert.match(hub, /leadLatest: "Свежие видео, статьи и методички Holistic House/);
  assert.match(hub, /guidesOnly=\{view === "books"\}/);
  assert.match(hub, /view=videos/);
  assert.match(hub, /view=books/);
  assert.doesNotMatch(hub, /CatalogShowcase items=/);
  assert.doesNotMatch(hub, /library-quick-guides/);
  assert.doesNotMatch(feed, /styles\.featured|className=\{styles\.bar\}/);
  assert.match(css, /@media\(max-width:640px\)/);
  assert.match(css, /grid-template-columns:116px minmax\(0,1fr\)/);
  assert.match(css, /@media\(min-width:920px\)/);
  assert.match(global, /\.library-heading h1 \{[^}]*font-size: clamp\(30px/);
  assert.match(global, /\.library-media-switch a \{[^}]*min-height: 36px/);
});

test("Compact video cards preserve click-to-play and no autoplay with sound", () => {
  const feed = source("components/library-feed.tsx");
  assert.match(feed, /setPlayingId\(item\.id\)/);
  assert.match(feed, /youtube-nocookie\.com\/embed/);
  assert.doesNotMatch(feed, /autoplay=1/);
  assert.match(feed, /item\.description/);
  assert.match(feed, /copy\.original/);
  assert.match(feed, /playing \? copy\.close : copy\.watch/);
  assert.match(feed, /aria-pressed=\{kind === filter\.id\}/);
});

test("Existing EN RU ES source materials, dates and consultation navigation remain available", () => {
  const hub = source("components/library-hub.tsx");
  const feed = source("components/library-feed.tsx");
  for (const phrase of ["All books & guides", "Все книги и методички", "Todos los libros y guías",
    "/homeopathy/remedies", "/wu-xing", "LibraryFeed", "PublicConsultationCta"]) {
    assert.ok(hub.includes(phrase), "Missing preserved library link: " + phrase);
  }
  for (const phrase of ["Ver en YouTube", "Открыть на YouTube", "Watch on YouTube", "Intl.DateTimeFormat"]) {
    assert.ok(feed.includes(phrase), "Missing localization: " + phrase);
  }
});

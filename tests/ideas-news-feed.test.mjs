import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Ideas keeps the original catalog and places the shared news feed below it in all locales", () => {
  const books = read("app/[locale]/books/page.tsx");
  const spanish = read("app/es/books/page.tsx");
  assert.ok(books.indexOf("<BookCatalog") < books.indexOf("<IdeasNewsFeed"));
  assert.ok(spanish.indexOf("<SpanishBookShowcase") < spanish.indexOf("<IdeasNewsFeed"));
  assert.match(books, /<IdeasNewsFeed locale=\{locale as Locale\}/);
  assert.match(spanish, /<IdeasNewsFeed locale="es"/);
  assert.match(books, /dynamic = "force-dynamic"/);
  assert.match(spanish, /dynamic = "force-dynamic"/);
});

test("Ideas and Library reuse exactly one public feed builder and publication retrieval", () => {
  const hub = read("components/library-hub.tsx");
  const libraryPage = read("app/[locale]/library/page.tsx");
  const ideas = read("components/ideas-news-feed.tsx");
  const loader = read("lib/public-library-feed.ts");
  assert.match(hub, /export function buildLibraryFeedItems/);
  assert.match(hub, /buildLibraryFeedItems\(locale, publishedVideos, articles\)/);
  assert.match(hub, /publishedIds\.has\(youtubeId\)/);
  assert.match(hub, /Date\.parse\(b\.publishedAt/);
  assert.match(ideas, /buildLibraryFeedItems\(locale, videos, articles\)/);
  assert.match(libraryPage, /loadPublicLibraryFeed\(locale\)/);
  assert.match(ideas, /loadPublicLibraryFeed\(locale\)/);
  assert.match(loader, /import "server-only"/);
  assert.match(loader, /listPublicLibraryVideos\(config, locale\)/);
  assert.match(loader, /createArticleRepository\(config\)\.publicList\(locale\)/);
  assert.doesNotMatch(loader, /privateMediaObjectStream|storage\.from|client:record/);
});

test("Ideas timeline is mobile-first and videos keep consent-based lazy click-to-play", () => {
  const feed = read("components/library-feed.tsx");
  const css = read("components/library-feed.module.css");
  const ideas = read("components/ideas-news-feed.tsx");
  assert.match(ideas, /<LibraryFeed locale=\{locale\} items=\{feedItems\} timeline \/>/);
  assert.match(feed, /timeline && styles\.timeline/);
  assert.match(feed, /setPlayingId\(item.id\)/);
  assert.match(feed, /youtube-nocookie\.com\/embed/);
  assert.match(feed, /setLimit\(current => current \+ 8\)/);
  assert.match(css, /\.timeline \.list\{grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /@media\(max-width:640px\)/);
});

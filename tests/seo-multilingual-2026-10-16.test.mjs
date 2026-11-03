import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("published ES home has one hero H1, free tools, testimonials and a consistent author name", () => {
  const es = read("app/es/page.tsx");
  assert.equal((es.match(/<h1\b/g) || []).length, 1);
  assert.match(es, /Andrey Litvinov/);
  assert.doesNotMatch(es, /Andrii Litvinov/);
  for (const marker of ['service-home-start', '/es/client/tests', '/es/academy', '/es/library', 'about-testimonials']) {
    assert.ok(es.includes(marker), marker);
  }
  assert.match(read("app/es/about/page.tsx"), /<h1 id="about-title">Andrey Litvinov<\/h1>/);
});

test("book, remedy and academy hubs retain a single source of H1, without duplicating it", () => {
  assert.match(read("components/book-catalog.tsx"), /<h1>\{text.heading\}<\/h1>/);
  assert.match(read("components/library-hub.tsx"), /<h1>\{text.title\}<\/h1>/);
  const academyHub = read("components/academy-hub.tsx");
  const academyHero = read("components/academy-discovery.tsx");
  assert.match(academyHub, /<AcademyDiscovery locale=\{locale\} view=\{view\}/);
  const academyHomeOnly = academyHub.slice(
    academyHub.indexOf("export function AcademyHub"),
    academyHub.indexOf("export function AcademyDirection"),
  );
  assert.ok(academyHomeOnly.includes("<AcademyDiscovery"), "Academy home uses the new hero");
  assert.equal((academyHomeOnly.match(/<h1\b/g) ?? []).length, 0, "Academy home does not duplicate its hero heading");
  assert.equal((academyHero.match(/<h1\b/g) ?? []).length, 1, "Academy hero owns one H1");
  assert.match(academyHero, /<h1 id="academy-discovery-title">/);
  assert.match(read("app/[locale]/homeopathy/remedies/page.tsx"), /<h1>\{current.heading\}<\/h1>/);
  assert.match(read("app/books/page.tsx"), /redirect\(/);
});

test("remedy and book descriptions are sentence-aware; no old fixed-length truncation", () => {
  const descriptions = read("lib/seo-descriptions.ts");
  assert.match(descriptions, /completeSentence/);
  assert.doesNotMatch(descriptions, /\.slice\(0, 1(?:55|60)\)/);
  for (const file of ["app/[locale]/homeopathy/remedies/[slug]/page.tsx", "app/es/homeopathy/remedies/[slug]/page.tsx"]) {
    assert.match(read(file), /remedySeoDescription/);
    assert.doesNotMatch(read(file), /description\.slice\(0, 155\)/);
  }
  assert.match(read("app/[locale]/books/[bookId]/page.tsx"), /bookSeoDescription/);
});

test("SEO sitemap includes canonical locale pages and derives actual reciprocal peer groups", () => {
  const site = read("app/sitemap.ts");
  assert.match(site, /'\/en\/books', '\/ru\/books'/);
  assert.match(site, /getSpanishRemedySlugs/);
  assert.match(site, /families = new Map/);
  assert.match(site, /'x-default': members.en/);
  assert.match(site, /lastModified: entry.lastModified \?\? releaseDate/);
  assert.match(site, /pathname !== '\/books'/);
  assert.doesNotMatch(site, /client\/tests|\/admin\/|\/api\//);
});

test("localized 404 recovery, old campaign aliases and privacy policy remain intact", () => {
  const missing = read("app/not-found.tsx");
  for (const p of ["/es", "/ru", "description", "404 — ${c.heading} | Holistic House", "homeopathy/remedies"]) {
    assert.ok(missing.includes(p), p);
  }
  const nextConfig = read("next.config.ts");
  for (const old of ["cabinet", "review"]) {
    assert.match(nextConfig, new RegExp('/:locale\\(en\\|ru\\|es\\)/' + old));
  }
  assert.ok(!nextConfig.includes('source: "/:locale(en|ru|es)/tests"'), 'Public editorial test landing must not redirect into private interactive tests');
  assert.match(read("app/[locale]/tests/page.tsx"), /type PublicLocale = "en" \| "ru" \| "es"/);
  assert.match(read("app/robots.ts"), /getRobotsPolicy/);
});

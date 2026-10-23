import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { auditDelegatedSeoHeading, auditSeoComponentMount } from "../scripts/verify-seo-source-contracts.mjs";
import { loadSeoTsx, leaf, seoNodes, publicTestsRoute, homeDisclosureModule, expandSeoDynamic } from "./helpers/seo-source-fixture.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

function assertCurrentSpanishCarousel(source = read("components/home-section-carousel.tsx")) {
  const { HomeSectionCarousel } = loadSeoTsx("components/home-section-carousel.tsx", { source, imports: {
    "@/components/static-portrait": { StaticPortrait: leaf("StaticPortrait") },
  } });
  const links = seoNodes(HomeSectionCarousel({ locale: "es" })).filter(node => node.type === "a").map(node => node.props.href);
  assert.deepEqual(links, ["/es/explore/energy", "/es/explore/love", "/es/explore/business", "/es/client/tests", "/es/books", "/en/app", "/es/services#consultation"]);
}

test("published ES home has one hero H1, free tools, testimonials and a consistent author name", async () => {
  const es = read("app/es/page.tsx");
  assert.equal((es.match(/<h1\b/g) || []).length, 1);
  assert.match(es, /Andrey Litvinov/);
  assert.doesNotMatch(es, /Andrii Litvinov/);
  for (const [componentName, moduleSpecifier] of [
    ["HomeSectionCarousel", "@/components/home-section-carousel"],
    ["HomeMoreDisclosure", "@/components/home-more-disclosure"],
    ["PersonalTestimonials", "@/components/personal-testimonials"],
  ]) {
    const report = auditSeoComponentMount({ pageSource: es, componentName, moduleSpecifier, props: { locale: "es" } });
    assert.deepEqual(report.failures, []);
  }
  assertCurrentSpanishCarousel();
  // Owner-merged #1609 moves Academy out of the carousel, not out of Home.
  // Follow the real on-demand import to prove the original route still exists.
  const { HomeMoreDisclosure } = homeDisclosureModule(true);
  const expanded = await expandSeoDynamic(HomeMoreDisclosure({ locale: "es", children: null }));
  assert.ok(seoNodes(expanded).some(node => node.type === "a" && node.props?.["data-home-explore-id"] === "academy" && node.props.href === "/es/academy"));
  assert.match(read("components/personal-testimonials.tsx"), /data-personal-testimonials=\{variant\}/);
  assert.match(read("app/es/about/page.tsx"), /<h1 id="about-title">Andrey Litvinov<\/h1>/);
});

test("book, remedy and academy hubs retain a single source of H1, without duplicating it", () => {
  const bookHeading = auditDelegatedSeoHeading({
    pageSource: read("components/book-catalog.tsx"), pageExport: "BookCatalog",
    componentSource: read("components/ideas-discovery.tsx"), componentName: "IdeasDiscovery",
    moduleSpecifier: "@/components/ideas-discovery", props: { locale: { identifier: "locale" } },
  });
  assert.deepEqual(bookHeading.failures, []);
  assert.match(read("components/library-hub.tsx"), /<h1>\{text.title\}<\/h1>/);
  const academyHub = read("components/academy-hub.tsx");
  const academyHero = read("components/academy-discovery.tsx");
  assert.deepEqual(auditDelegatedSeoHeading({
    pageSource: academyHub, pageExport: "AcademyHub", componentSource: academyHero,
    componentName: "AcademyDiscovery", moduleSpecifier: "@/components/academy-discovery",
    props: { locale: { identifier: "locale" }, view: { identifier: "view" } },
  }).failures, []);
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

test("localized 404 recovery, old campaign aliases and privacy policy remain intact", async () => {
  const missing = read("app/not-found.tsx");
  for (const p of ["/es", "/ru", "description", "404 — ${c.heading} | Holistic House", "homeopathy/remedies"]) {
    assert.ok(missing.includes(p), p);
  }
  const nextConfig = read("next.config.ts");
  for (const old of ["cabinet", "review"]) {
    assert.match(nextConfig, new RegExp('/:locale\\(en\\|ru\\|es\\)/' + old));
  }
  assert.ok(!nextConfig.includes('source: "/:locale(en|ru|es)/tests"'), 'Public editorial test landing must not redirect into private interactive tests');
  const route = await publicTestsRoute();
  assert.deepEqual(JSON.parse(JSON.stringify(route.generateStaticParams())), ["en", "ru", "es"].map(locale => ({ locale })));
  for (const locale of ["en", "ru", "es"]) {
    const params = Promise.resolve({ locale });
    const page = await route.default({ params });
    assert.equal(page.props.locale, locale);
    assert.equal(page.props.kind, "tests");
    const metadata = await route.generateMetadata({ params });
    assert.equal(metadata.alternates.canonical, "/" + locale + "/tests");
    for (const other of ["en", "ru", "es"]) assert.equal(metadata.alternates.languages[other], "/" + other + "/tests");
  }
  for (const locale of ["fr", "EN", "", "../admin"]) {
    await assert.rejects(route.default({ params: Promise.resolve({ locale }) }), /NEXT_NOT_FOUND/);
    assert.equal((await route.generateMetadata({ params: Promise.resolve({ locale }) })).robots.index, false);
  }
  assert.match(read("app/robots.ts"), /getRobotsPolicy/);
});

// These mutations leave the component and copy present, but break its actual links.
test("Spanish carousel route contract rejects each disconnected needs or legacy destination", () => {
  const source = read("components/home-section-carousel.tsx");
  for (const route of ["/explore/energy", "/explore/love", "/explore/business", "/client/tests", "/books"]) {
    const target = `href: "${route}"`;
    assert.ok(source.includes(target), route);
    assert.throws(() => assertCurrentSpanishCarousel(source.replace(target, 'href: "/missing-destination"')), { name: "AssertionError" }, route);
  }
  // ES deliberately uses the available English private-app route, independently
  // of the data table href. Mutate the actual rendered fallback, not dead data.
  assert.ok(source.includes('"/en/app"'));
  assert.throws(() => assertCurrentSpanishCarousel(source.replaceAll('"/en/app"', '"/es/missing-app"')), { name: "AssertionError" });
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getSitemapEntries, getRobotsPolicy } from "../data/seo.js";
import { getSiteNavigation } from "../lib/site-navigation-model.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const origin = "https://holistichouse.vercel.app";

test("EN/RU/ES homepage URLs are mutually canonical and safe for indexing", () => {
  const site = getSitemapEntries(origin);
  const main = site.find(entry => entry.url === origin + "/");
  const russian = site.find(entry => entry.url === origin + "/ru");
  assert.ok(main && russian);
  for (const entry of [main, russian]) {
    assert.deepEqual(entry.alternates.languages, {
      en: origin + "/", ru: origin + "/ru", es: origin + "/es", "x-default": origin + "/",
    });
  }
  assert.equal(getSiteNavigation("en").find(x => x.id === "home")?.href, "/");
  assert.equal(getSiteNavigation("ru").find(x => x.id === "home")?.href, "/ru");
  assert.equal(getSiteNavigation("es").find(x => x.id === "home")?.href, "/es");
  assert.ok(getRobotsPolicy(origin).rules.disallow.includes("/ru/client"));
  assert.ok(!site.some(e => /\/(client|admin|api|prescriptions)(\/|$)/.test(new URL(e.url).pathname)));
});

test("home SEO metadata and all three languages have real human-readable variants", () => {
  const home = read("lib/home-seo.ts");
  const english = read("app/page.tsx");
  const russian = read("app/[locale]/page.tsx");
  const spanish = read("app/es/page.tsx");
  const spanishMeta = read("lib/spanish-metadata.ts");
  const sitemap = read("app/sitemap.ts");
  assert.match(home, /openGraph:/);
  assert.match(home, /twitter:/);
  assert.match(home, /"x-default": "\/"/);
  assert.match(home, /en_CA/);
  assert.match(home, /ru_RU/);
  assert.match(english, /homeMetadataFor\("en"\)/);
  assert.match(russian, /homeMetadataFor\("ru"\)/);
  assert.match(russian, /locale="ru"/);
  assert.match(spanish, /spanishMetadata\('\/es'/);
  assert.match(spanishMeta, /absolute\(suffix \? '\/ru' \+ suffix : '\/ru'\)/);
  assert.match(spanishMeta, /metadataBase: base/);
  assert.doesNotMatch(spanishMeta, /metadataBase: null/);
  assert.match(sitemap, /homepageLanguages/);
  assert.match(sitemap, /\.\.\.network, \.\.\.homes/);
});

test("home SEO preserves visible photo offers and bottom blue free capture in EN/RU", () => {
  const home = read("components/holistic-house-home.tsx");
  const spanish = read("app/es/page.tsx");
  assert.equal(home.split("<HomepageContactCta locale={locale} />").length - 1, 1);
  assert.ok(home.indexOf("<ServicesSolutions locale={locale} variant=\"home\" />") < home.indexOf("<HomepageContactCta locale={locale} />"));
  assert.doesNotMatch(home, /data-home-path|data-home-extra-paths|service-home-more|service-home-progress/);
  assert.match(home, /href=\{\x60\/\$\{locale\}\/client\/tests\x60\}/);
  assert.doesNotMatch(home, /HomeFreeTestsBanner/);
  for (const comp of ["ServicesSolutions", "HomepageTopicJourneys", "PersonalTestimonials"]) {
    assert.ok(home.includes("<" + comp), comp);
  }
  assert.match(spanish, /href="\/es\/services\/free-situation-review"/);
  assert.match(spanish, /className="service-home-card-photo"/);
  assert.match(spanish, /<PublicConsultationCta locale="es" \/>/);
  assert.ok(spanish.indexOf("service-home-services") < spanish.indexOf("<PublicConsultationCta locale=\"es\" />"));
  assert.doesNotMatch(spanish, /service-home-more|service-home-progress/);
});

test("linked data represents actual organization/person without invented regulated credentials or location", () => {
  const layout = read("app/layout.tsx");
  for (const value of ['"WebSite"', '"Organization"', '"Person"', '"Toronto"', '"Andrey Litvinov"']) assert.ok(layout.includes(value), value);
  assert.doesNotMatch(layout, /medicalBusiness|aggregateRating|postalAddress|licenseNumber|streetAddress|jobTitle.*psychotherapist/i);
  assert.match(layout, /openGraph:/);
  assert.match(layout, /twitter:/);
  assert.match(read("app/[locale]/services/page.tsx"), /es: "\/es\/services"/);
  assert.doesNotMatch(read("components/holistic-house-home.tsx"), /fake-testimonial|stock-avatar/);
});

test("EN and RU home meta descriptions match the current paid and free offers within crawler limits", () => {
  const source = read("lib/home-seo.ts");
  const descriptions = [...source.matchAll(/description: "([^"]+)"/g)].map((match) => match[1]);
  assert.equal(descriptions.length, 2);
  for (const description of descriptions)
    assert.ok(description.length >= 100 && description.length <= 160, "Invalid home SEO length: " + description.length);
  assert.match(descriptions[0], /Toronto and online sessions from €50/);
  assert.match(descriptions[0], /free written review/);
  assert.match(descriptions[1], /Торонто и онлайн/);
  assert.match(descriptions[1], /бесплатный письменный разбор/);
});

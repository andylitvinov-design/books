import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const metadata = read("data/academy/seo-overrides.js");
const route = read("app/[locale]/academy/[[...slug]]/page.tsx");
const landing = read("components/tantra-free-initiation.tsx");
const styles = read("components/tantra-free-initiation.module.css");
const sitemap = read("data/seo-priority-paths.js");

test("free Tantra Reiki has dedicated search-intent metadata in EN, RU and ES", () => {
  assert.match(metadata, /"reiki\/tantra-reiki\/free-initiation": \{/);
  for (const title of [
    "Free Tantra Reiki Initiation Online | Level 1",
    "Бесплатная инициация Тантра Рейки онлайн",
    "Iniciación gratis de Tantra Reiki online",
  ]) assert.ok(metadata.includes(title), title);
  assert.match(route, /const seoOverride = seoMetaForAcademyRoute\(locale, routeKey\(slug\)\)/);
  assert.match(route, /"x-default": "\/en\/academy" \+ languageSuffix/);
  assert.match(route, /openGraph: \{/);
  assert.match(route, /twitter: \{/);
  assert.match(route, /const referralLanding = routeKey\(slug\) === "reiki\/free-practitioner-course"/);
  const sharingImageExpression = route.match(/const sharingImage = ([^;]+);/)?.[1];
  assert.ok(sharingImageExpression, "Shared metadata exposes an explicit cover expression");
  const coverFor = new Function("referralLanding", "return (" + sharingImageExpression + ")");
  assert.equal(coverFor(false), "/images/holistic-house/andy-about.png", "Tantra keeps its teacher portrait");
  assert.equal(coverFor(true), "/images/holistic-house/reiki-approved-sunrise-v3.webp", "Only the referral course receives its approved cover");
  assert.match(route, /images: \[\{ url: sharingImage, alt: sharingImageAlt \}\]/);
  assert.match(route, /images: \[sharingImage\]/);
  assert.match(route, /alternates: \{[\s\S]*?canonical: path/);
});

test("localized primary headings and concise FAQs match the actual teacher-guided offer", () => {
  for (const title of ["Free Tantra Reiki Initiation", "Бесплатная инициация Тантра Рейки", "Iniciación gratis de Tantra Reiki"]) {
    assert.ok(landing.includes('heroTitle: "' + title + '"'), title);
  }
  assert.match(landing, /<h1 id="tantra-landing-title">\{t.heroTitle\}<\/h1>/);
  assert.match(landing, /What is Tantra Reiki\?/);
  assert.match(landing, /const faqCopy = \{/);
  assert.match(landing, /className=\{styles.faqSection\}/);
  assert.match(landing, /<details className=\{styles.faqItem\} key=\{item.question\}>/);
  assert.match(styles, /\.faqList \{ display: grid; grid-template-columns: repeat\(3,/);
  assert.match(styles, /@media \(max-width: 760px\) \{[\s\S]*?\.faqList \{ grid-template-columns: 1fr/);
  assert.match(landing, /Watching a video or sending answers does not itself confer an initiation/);
});

test("JSON-LD represents a truthful website page and breadcrumb, not fake reviews or medical outcomes", () => {
  assert.match(landing, /"@type": "WebPage"/);
  assert.match(landing, /"@type": "BreadcrumbList"/);
  assert.match(landing, /"@type": "ListItem", position: 3, name: t.heroTitle, item: pageUrl/);
  assert.match(landing, /type="application\/ld\+json"/);
  assert.match(landing, /JSON.stringify\(structuredData\)\.replace\(\/<\/g/);
  assert.doesNotMatch(landing, /"@type": "AggregateRating"|"@type": "FAQPage"|"@type": "MedicalWebPage"/);
});

test("sitemap prioritizes the existing EN/RU/ES Tantra free initiation URLs with alternates", () => {
  assert.match(sitemap, /id: "tantra-free-initiation", suffix: "\/academy\/reiki\/tantra-reiki\/free-initiation", priority: 0\.85/);
  assert.match(sitemap, /SEO_PRIORITY_LOCALES = Object\.freeze\(\["en", "ru", "es"\]\)/);
  assert.match(sitemap, /alternates: \{ languages: \{ \.\.\.languages \} \}/);
});

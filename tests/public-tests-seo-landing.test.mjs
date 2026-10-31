import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import { getSitemapEntries, getRobotsPolicy } from "../data/seo.js";

const origin = "https://holistichouse.vercel.app";
const locales = ["en", "ru", "es"];
const route = "app/[locale]/tests/page.tsx";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const pageSource = read(route);
const landing = read("components/free-entry-landing.tsx");
const css = read("components/free-entry-landing.module.css");
const config = read("next.config.ts");
const privateSource = read("app/[locale]/client/tests/page.tsx");

test("public /tests guide is separate from private test explorer and has valid metadata", () => {
  assert.ok(existsSync(new URL("../" + route, import.meta.url)));
  assert.match(pageSource, /generateMetadata/);
  assert.match(pageSource, /generateStaticParams/);
  assert.match(pageSource, /languages/);
  assert.match(pageSource, /canonical/);
  assert.match(pageSource, /<FreeEntryLanding locale=\{locale\} kind="tests"/);
  assert.match(landing, /<h1 id="free-entry-title">/);
  assert.match(pageSource, /openGraph:/);
  assert.match(pageSource, /twitter:/);
  assert.match(landing, /\/client\/tests/);
  assert.match(landing, /do not diagnose or treat health conditions/);
  assert.doesNotMatch(config, /source:\s*["']\/\:locale\(en\|ru\|es\)\/tests["'],\s*destination:\s*["']\/\:locale\/client\/tests/);
  assert.match(privateSource, /robots:\s*\{\s*index:\s*false/);
  assert.match(privateSource, /referrer:\s*["']no-referrer/);
  const robots = getRobotsPolicy(origin);
  for (const locale of locales) assert.ok(robots.rules.disallow.includes("/" + locale + "/client"));
});

test("public /tests sitemap entries are absolute, reciprocal and private-path-safe", () => {
  const entries = getSitemapEntries(origin).filter(entry => /^https:\/\/holistichouse\.vercel\.app\/(en|ru|es)\/tests$/.test(entry.url));
  assert.equal(entries.length, 3);
  for (const entry of entries) {
    const locale = new URL(entry.url).pathname.split("/")[1];
    assert.equal(entry.url, origin + "/" + locale + "/tests");
    assert.deepEqual(Object.keys(entry.alternates.languages).sort(), ["en", "es", "ru", "x-default"]);
    for (const other of locales) assert.equal(entry.alternates.languages[other], origin + "/" + other + "/tests");
    assert.equal(entry.alternates.languages["x-default"], origin + "/en/tests");
    assert.equal(entry.changeFrequency, "monthly");
    assert.ok(entry.priority > 0);
    assert.ok(!entry.url.includes("/client/"));
  }
});

test("SEO benefits and accessible FAQs are translated and non-diagnostic", () => {
  const descriptions = [...pageSource.matchAll(/description: "([^"]+)"/g)].map(match => match[1]);
  assert.equal(descriptions.length, 3);
  for (const description of descriptions) assert.ok(description.length >= 100 && description.length <= 180);
  for (const snippet of [
    "From a feeling to a clearer picture", "От ощущения — к понятной картине", "De una sensación a una imagen más clara",
    "Questions before you begin", "Вопросы перед началом", "Preguntas frecuentes",
    "without signing in", "без входа", "sin iniciar sesión",
  ]) assert.ok(landing.includes(snippet) || pageSource.includes(snippet), "Missing translation: " + snippet);
  assert.match(landing, /data-public-tests-faq/);
  assert.match(landing, /t\.faq\.map\(\(\[question, answer\]\) => <details key=\{question\}><summary>\{question\}<\/summary>/);
  assert.match(landing, /<Link className=\{styles\.primary\} href=\{testsHref\}/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.doesNotMatch(pageSource + landing, /medical diagnosis guaranteed|certified diagnosis|cure your/i);
});

test("public guide remains discoverable from three homepages without forcing a signup", () => {
  const sharedHome = read("components/holistic-house-home.tsx");
  const spanishHome = read("app/es/page.tsx");
  // Current EN/RU/ES homepages render a compact carousel and a visible
  // catalogue link rather than the retired multi-section homepage grid.
  const carousel = read("components/home-section-carousel.tsx");
  const more = read("components/home-more-disclosure.tsx");
  assert.match(sharedHome, /<HomeSectionCarousel locale=\{locale\} \/>/);
  assert.match(spanishHome, /<HomeSectionCarousel locale="es" \/>/);
  assert.match(sharedHome, /<HomeMoreDisclosure locale=\{locale\} \/>/);
  assert.match(spanishHome, /<HomeMoreDisclosure locale="es" \/>/);
  for (const text of ["How free self-checks work", "Как работают бесплатные тесты", "Cómo funcionan las pruebas"])
    assert.ok(more.includes(text), "Missing visible guide link in home locale: " + text);
  assert.match(more, /href=\{"\/" \+ locale \+ "\/tests"\}/);
  assert.match(more, /data-home-test-guide/);
  // Current published carousel uses href, not the retired path field.
  assert.match(carousel, /\{ key: "tests", href: "\/client\/tests"/);
  assert.doesNotMatch(more, /onClick=\{.*signIn|auth\/start/);
});


test("PR SEO mobile browser executes all nine public EN/RU/ES viewports on isolated current code",()=>{
 const workflow=read(".github/workflows/hh-live-seo-audit.yml");
 const browser=read("scripts/verify-public-tests-mobile.mjs");
 assert.match(workflow,/^  pull_request:\n    types: \[opened, synchronize, reopened, ready_for_review, converted_to_draft\][\s\S]*?^  public-tests-mobile:\n    if: \$\{\{ github\.event_name != 'pull_request' \|\| github\.event\.pull_request\.draft == false \}\}\n    runs-on: ubuntu-latest/m,
   "The required browser specialist must execute, never skip, on a Ready PR");
 assert.match(workflow,/if \[\[ "\$\{\{ github\.event_name \}\}" == "pull_request" \]\]/);
 assert.match(workflow,/npx next dev --hostname 127\.0\.0\.1 --port 3182/);
 assert.match(workflow,/HH_SEO_AUDIT_ORIGIN=http:\/\/127\.0\.0\.1:3182 node scripts\/verify-public-tests-mobile\.mjs/);
 assert.match(workflow,/if \(\( attempt == 90 \)\); then/);
 assert.match(workflow,/trap 'kill "\$APP_PID" 2>\/dev\/null \|\| true' EXIT/);
 assert.match(workflow,/else\n            node scripts\/verify-public-tests-mobile\.mjs/);
 assert.match(workflow,/if: github\.event_name == 'push'\n        run: sleep 160/);
 assert.doesNotMatch(workflow,/public-tests-mobile:\n    if: github\.event_name != 'pull_request'/);
 assert.match(browser,/const locales = \["en", "ru", "es"\]/);
 assert.match(browser,/const widths = \[320, 390, 430\]/);
 assert.match(browser,/const canonicalOrigin = "https:\/\/holistichouse\.vercel\.app"/);
 assert.match(browser,/snapshot\.canonical === canonicalOrigin \+ path/);
 assert.match(browser,/const expected = canonicalOrigin \+ "\/"/);
 assert.match(browser,/Unexpected redirect URL/);
 assert.match(browser,/snapshot\.primaryVisible && snapshot\.primaryHeight >= 44/);
 assert.match(browser,/Horizontal overflow/);
 assert.match(browser,/Public landing unexpectedly noindex/);
 assert.match(browser,/no login|No login|No login,|No login,/i);
 assert.doesNotMatch(workflow,/continue-on-error:\s*true/);
});


test("SEO mobile QA installs pinned isolated Chromium without mutating repository dependencies",()=>{
 const workflow=read(".github/workflows/hh-live-seo-audit.yml");
 const script=read("scripts/verify-public-tests-mobile.mjs");
 assert.match(workflow,/npm install --prefix \/tmp\/hh-seo-browser-tools --no-audit --no-fund playwright@1\.63\.0/);
 assert.match(workflow,/\/tmp\/hh-seo-browser-tools\/node_modules\/\.bin\/playwright install --with-deps chromium/);
 assert.match(workflow,/HH_SEO_PLAYWRIGHT_PACKAGE: \/tmp\/hh-seo-browser-tools\/node_modules\/playwright/);
 assert.doesNotMatch(workflow,/npx --no-install playwright install/);
 assert.match(script,/import \{ createRequire \} from "node:module"/);
 assert.match(script,/require\(process\.env\.HH_SEO_PLAYWRIGHT_PACKAGE \|\| "playwright"\)/);
 assert.match(workflow,/pull_request:\n    types: \[opened, synchronize, reopened, ready_for_review, converted_to_draft\][\s\S]*?^  public-tests-mobile:\n    if: \$\{\{ github\.event_name != 'pull_request' \|\| github\.event\.pull_request\.draft == false \}\}\n    runs-on: ubuntu-latest/m);
 assert.match(workflow,/HH_SEO_AUDIT_ORIGIN=http:\/\/127\.0\.0\.1:3182 node scripts\/verify-public-tests-mobile\.mjs/);
 assert.match(script,/const canonicalOrigin = "https:\/\/holistichouse\.vercel\.app"/);
 assert.match(script,/const widths = \[320, 390, 430\]/);
 assert.doesNotMatch(workflow,/continue-on-error:\s*true/);
});


test("public tests mobile text and written review remain accessible", () => {
  assert.ok(css.includes('.page[data-free-entry-landing="tests"] .hero .lead{font-size:16px'),
    "The actual phone intro, not the decorative eyebrow, must be readable at >=15px");
  assert.ok(landing.includes('href={"/" + locale + "/services/free-situation-review"}'),
    "Offer the real local free written review without creating a lead on click");
  for (const label of ["Free personal written review", "Бесплатный личный письменный разбор",
    "Revisión personal gratuita por escrito"])
    assert.ok(landing.includes(label), "Missing translated written review CTA: " + label);
  assert.ok(css.includes(".testReviewLink{display:inline-flex;align-items:center;min-height:44px"),
    "Optional mobile review control must have a 44px touch target");
});

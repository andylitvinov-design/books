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
  assert.match(landing, /<details key=\{question\}><summary>\{question\}<\/summary>/);
  assert.match(landing, /<Link className=\{styles\.primary\} href=\{testsHref\}/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.doesNotMatch(pageSource + landing, /medical diagnosis guaranteed|certified diagnosis|cure your/i);
});

test("public guide remains discoverable from three homepages without forcing a signup", () => {
  const sharedHome = read("components/holistic-house-home.tsx");
  const spanishHome = read("app/es/page.tsx");
  assert.ok(sharedHome.includes("How free self-checks work"));
  assert.ok(sharedHome.includes("Как работают бесплатные тесты"));
  assert.match(sharedHome, /client\/tests/);
  assert.match(sharedHome, /\/tests/);
  assert.match(spanishHome, /href="\/es\/tests"/);
  assert.match(spanishHome, /href="\/es\/client\/tests"/);
});

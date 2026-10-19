import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import { getSitemapEntries, getRobotsPolicy } from "../data/seo.js";

const origin = "https://holistichouse.vercel.app";
const locales = ["en", "ru", "es"];
const route = "app/[locale]/tests/page.tsx";
const pageSource = readFileSync(new URL("../" + route, import.meta.url), "utf8");
const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
const privateSource = readFileSync(new URL("../app/[locale]/client/tests/page.tsx", import.meta.url), "utf8");

test("public tests have own crawleable locale page, distinct from private test explorer", () => {
  assert.ok(existsSync(new URL("../" + route, import.meta.url)));
  assert.ok(existsSync(new URL("../app/[locale]/tests/tests.module.css", import.meta.url)));
  assert.match(pageSource, /generateMetadata/);
  assert.match(pageSource, /generateStaticParams/);
  assert.match(pageSource, /languages/);
  assert.match(pageSource, /canonical/);
  assert.match(pageSource, /<h1/);
  assert.match(pageSource, /\/client\/tests/);
  assert.match(pageSource, /not medical or psychiatric diagnoses/);
  assert.doesNotMatch(config, /source:\s*["']\/\:locale\(en\|ru\|es\)\/tests["'],\s*destination:\s*["']\/\:locale\/client\/tests/);
  assert.match(privateSource, /robots:\s*\{\s*index:\s*false/);
  assert.match(privateSource, /referrer:\s*["']no-referrer/);
  const robots = getRobotsPolicy(origin);
  for (const locale of locales) assert.ok(robots.rules.disallow.includes("/" + locale + "/client"));
});

test("public /tests sitemap entries are absolute, reciprocal and never expose client paths", () => {
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

test("public SEO descriptions, topic explanations and FAQs are localized and non-diagnostic", () => {
  const descriptions = [...pageSource.matchAll(/description: "([^"]+)"/g)].map(match => match[1]);
  assert.equal(descriptions.length, 3);
  for (const description of descriptions) {
    assert.ok(description.length >= 100 && description.length <= 160,
      "Public test description must be human-readable and concise: " + description.length);
  }
  for (const snippet of [
    "What can I explore?", "Что можно исследовать?", "¿Qué puedes explorar?",
    "Common questions", "Частые вопросы", "Preguntas frecuentes",
    "without registration", "без регистрации", "sin registrarte",
  ]) assert.ok(pageSource.includes(snippet), "Missing localized guidance: " + snippet);
  assert.match(pageSource, /<details className=\{styles\.question\}/);
  assert.match(pageSource, /className=\{styles\.endCta\}/);
  assert.match(pageSource, /\/\$\{locale\}\/client\/tests/);
  assert.doesNotMatch(pageSource, /medical diagnosis guaranteed|certified diagnosis|cure your/i);
});

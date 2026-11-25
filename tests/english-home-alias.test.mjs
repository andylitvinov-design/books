import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("English / is canonical, /en redirects, and /ru has an independent indexable route", () => {
  const config = read("next.config.ts");
  const home = read("app/page.tsx");
  const russian = read("app/[locale]/page.tsx");
  const locales = read("lib/public-locales.ts");
  const meta = read("lib/home-seo.ts");
  assert.match(config, /source: "\/en", destination: "\/", permanent: true/);
  assert.doesNotMatch(config, /source: "\/ru", destination:/);
  assert.match(home, /requested === "ru" \|\| requested === "es"/);
  assert.match(home, /homeMetadataFor\("en"\)/);
  assert.match(russian, /homeMetadataFor\("ru"\)/);
  assert.match(russian, /locale="ru"/);
  assert.match(locales, /locale === 'en' \? '\/' : `\/\$\{locale\}`/);
  assert.match(meta, /canonical: path/);
  assert.match(meta, /ru: "\/ru", es: "\/es"/);
});

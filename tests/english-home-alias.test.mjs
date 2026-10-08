import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
const homepage = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("English homepage alias redirects without losing selected language", () => {
  assert.match(config, /source: "\/en", destination: "\/\?lang=en", permanent: true/);
  assert.match(homepage, /if \(lang === "en" \|\| lang === "ru"\) return lang/);
  assert.match(homepage, /en: "\/"|en: "\/\?lang=en"/);
});

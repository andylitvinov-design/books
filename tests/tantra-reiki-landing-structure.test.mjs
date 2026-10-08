import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Tantra Reiki landing surfaces course map, media and full source in a clear order", async () => {
  const page = await readFile("components/academy-record-page.tsx", "utf8");
  assert.match(page, /className="tantra-course-hero"/);
  assert.match(page, /id="tantra-levels"/);
  assert.match(page, /id="tantra-media"/);
  assert.match(page, /id="tantra-full-source"/);
  assert.match(page, /className="tantra-course-hero__visual"/);
  assert.match(page, /className="tantra-course-hero__cta"/);
  assert.match(page, /Ask for dates & format/);
});

test("Tantra Reiki keeps the full source text while moving media above it", async () => {
  const page = await readFile("components/academy-record-page.tsx", "utf8");
  const media = page.indexOf('id="tantra-media"');
  const full = page.indexOf('id="tantra-full-source"');
  assert.ok(media >= 0 && full >= 0 && media < full);
  assert.match(page, /renderBlocks\(publicBlocks\)/);
  assert.match(page, /sourceImages\.map/);
});

test("Reiki landing refresh has responsive language and Tantra layouts", async () => {
  const css = await readFile("app/academy.css", "utf8");
  assert.match(css, /Reiki Yggdrasil bilingual video library \+ Tantra Reiki landing refresh/);
  assert.match(css, /\.yggdrasil-language-badge--ru/);
  assert.match(css, /\.yggdrasil-english-guide/);
  assert.match(css, /\.tantra-course-hero/);
  assert.match(css, /\.tantra-source-strip/);
});

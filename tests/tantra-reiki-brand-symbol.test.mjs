import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const cover = "/images/holistic-house/tantra-reiki-yin-yang-cover.svg";
const mark = "/images/holistic-house/tantra-reiki-yin-yang-mark.svg";
const mayaDisk = "/library/maya-mysteries/media/post-217-1.jpg";

test("Tantra Reiki cards, video catalog and learner use the dedicated yin-yang artwork", () => {
  const hub = read("components/academy-hub.tsx");
  const tantraCard = hub.split('id: "academy-featured-tantra-reiki"')[1]?.split('id: "academy-featured-kundalini-reiki"')[0];
  assert.ok(tantraCard);
  assert.ok(tantraCard.includes(cover));
  assert.ok(!tantraCard.includes(mayaDisk));
  for (const path of [
    "components/academy-video-courses.tsx",
    "data/academy/energywork-ai-curriculum.ts",
    "components/academy-free-course-banner.tsx",
    "components/academy-course-capture.tsx",
    "data/academy/english-guided-meditations.ts",
  ]) {
    const source = read(path);
    assert.ok(source.includes(cover), path);
    assert.ok(!source.includes(mayaDisk), path);
  }
});

test("Tantra Reiki advertising landing shows yin-yang while preserving the approved photo and CTA", () => {
  const page = read("app/[locale]/academy/reiki/tantra-reiki/discover/page.tsx");
  const css = read("app/[locale]/academy/reiki/tantra-reiki/discover/page.module.css");
  assert.ok(page.includes(mark));
  assert.match(css, /\.yinYangMark\{/);
  assert.match(page, /reiki-approved-sunrise-v3\.webp/);
  assert.match(page, /free-initiation#tantra-practice-video/);
  assert.ok(!page.includes(mayaDisk));
});

test("Dedicated graphics contain a real two-part yin-yang, with no Maya motifs", () => {
  const artwork = read("public" + cover);
  const symbol = read("public" + mark);
  for (const svg of [artwork, symbol]) {
    assert.match(svg, /<svg\s/);
    assert.match(svg, /<path d="M(?:0|64) /);
    assert.match(svg, /<circle\s+cx="(?:0|64)"/);
    assert.doesNotMatch(svg, /<text|mayan-calendar|aztec-calendar/i);
  }
  // The preserved Maya Mysteries catalog stays separate from Tantra Reiki.
  assert.match(read("components/academy-hub.tsx"), /mysteries:\s*\[/);
});

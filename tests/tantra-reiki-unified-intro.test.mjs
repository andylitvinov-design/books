import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Tantra Reiki presents Level 1 before the combined PDF and later-level reference", async () => {
  const [page, journey, css] = await Promise.all([
    readFile("components/academy-record-page.tsx", "utf8"),
    readFile("components/tantra-reiki-journey.tsx", "utf8"),
    readFile("app/academy.css", "utf8"),
  ]);
  assert.equal((page.match(/className="tantra-mobile-guide tantra-mobile-guide--combined"/g) ?? []).length, 1);
  assert.match(page, /id="tantra-levels" aria-labelledby="tantra-mobile-guide-heading"/);
  assert.match(page, /<TantraReikiOverviewLinks locale=\{locale\} \/>/);
  assert.match(page, /<TantraReikiJourney locale=\{locale\} \/>/);
  assert.doesNotMatch(page, /tantra-mobile-guide__benefits|Your nine-level journey, beautifully designed/);
  assert.doesNotMatch(journey, /className="tantra-journey__intro"/);
  assert.match(journey, /href=\{"#tantra-level-" \+ \(group \* 3 \+ 1\)\}/);
  assert.match(journey, /href="#tantra-original-author-research"/);
  assert.match(journey, /photoContext/);
  assert.match(page, /"\/api\/academy\/reiki-guide\?course=tantra&locale=" \+ locale/);
  assert.match(css, /\.tantra-mobile-guide--combined \.tantra-journey__phase-links/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  const mergedIndex = page.indexOf("tantra-mobile-guide--combined");
  const lessonsIndex = page.indexOf('className="tantra-level-summary"');
  assert.ok(lessonsIndex > 0 && lessonsIndex < mergedIndex, "The first-level journey comes before optional resources");
});

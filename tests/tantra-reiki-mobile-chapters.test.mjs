import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Tantra Reiki renders one self-contained section per level, not a nine-card summary", async () => {
  const page = await readFile("components/academy-record-page.tsx", "utf8");
  const journey = await readFile("components/tantra-reiki-journey.tsx", "utf8");
  assert.match(page, /<TantraReikiJourney locale=\{locale\}/);
  assert.doesNotMatch(page, /className="tantra-level-summary__grid"/);
  assert.match(journey, /stages\.map\(\(stage, i\) =>/);
  assert.match(journey, /id=\{"tantra-level-"\+n\}/);
  assert.match(journey, /copy\.att\.map/);
  assert.match(journey, /copy\.practice/);
  assert.ok(journey.includes('"#tantra-level-"+(n+1)'));
  assert.match(journey, /#tantra-media/);
  assert.match(journey, /href="https:\/\/t.me\/AndyTherapist"/);
  assert.match(journey, /className="tantra-journey__photo"/);
  assert.match(journey, /levelApplications\[locale\]\[i\]/);
});

test("Tantra Reiki contains nine grounded level names and preserves EN/RU attunement variants", async () => {
  const journey = await readFile("components/tantra-reiki-journey.tsx", "utf8");
  const expected = ["Spring of Life","Fire of Life","Ocean of Unity","The Vertical of Love","Inner Light","Worlds of Unity","Illumination","Creation of the World","Fullness of Unity"];
  for(const label of expected) assert.ok(journey.includes(label), label);
  assert.match(journey, /Денежный магнит/);
  assert.match(journey, /Сжечь комплексы/);
  assert.match(journey, /Талисман/);
  assert.match(journey, /"Money Magnet"/);
  assert.match(journey, /"Burn Away Complexes"/);
  assert.match(journey, /"Attunement"/);
  assert.match(journey, /"Luck · acceleration of time"/);
  assert.match(journey, /"Talisman"/);
  assert.match(journey, /The historical English text places Attunement here/);
  assert.match(journey, /The historical English text lists Unity, Clearance and Luck here/);
  const source = JSON.parse(await readFile("data/academy/tantra-reiki-full.generated.json", "utf8"));
  assert.ok(source.blocks.en.some((block) => block.text.includes("Attunement (attunement of a person")));
  assert.ok(source.blocks.en.some((block) => block.text.includes("Clearance")));

  assert.match(journey, /as const;/);
});

test("Mobile Tantra Reiki chapters occupy a scroll screen without clipping content", async () => {
  const css = await readFile("app/academy.css", "utf8");
  assert.match(css, /\.tantra-journey__level \{ min-height: 100svh/);
  assert.doesNotMatch(css, /(?<!min-)height: 100svh/);
  assert.match(css, /\.tantra-journey__actions/);
  assert.match(css, /prefers-reduced-motion/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Alchemy of the Soul and Psycho-homeopathy are one canonical offer with four agreed method stages", () => {
  const detail = read("components/core-service-detail.tsx");
  const offers = read("data/core-service-offers.ts");
  const cards = read("components/services-solutions.tsx");
  const route = read("app/[locale]/services/alchemy-of-soul/page.tsx");
  for (const step of ["Situation analysis through constellations", "Hypnotherapy and guided imagery", "Complementary homeopathic selection", "Alchemical integration", "Анализ ситуации через расстановку", "Гипнотерапия: исследование корня", "Дополнительный гомеопатический подбор", "Алхимия, ресурсы и интеграция"])
    assert.ok(detail.includes(step), "Missing " + step);
  assert.match(offers, /Alchemy of the Soul · Psycho-homeopathy/);
  assert.match(offers, /Алхимия души · Психогомеопатия/);
  // #996 moves the hero to general enquiry; the canonical Alchemy offer stays in cards.
  const alchemyOffers = [...offers.matchAll(/\{\s*id: "alchemy",[\s\S]*?\n    \},/g)];
  assert.equal(alchemyOffers.length, 3);
  for (const [block] of alchemyOffers) assert.match(block, /route: "alchemy-of-soul"/);
  assert.match(offers, /href: "\/" \+ locale \+ "\/services\/" \+ item\.route/);
  assert.match(cards, /offer\.id === "alchemy" \? \(/);
  assert.match(cards, /className=\{styles\.cardDetails\} href=\{offer\.href\}/);
  assert.match(route, /AlchemySoulLanding/);
  assert.match(route, /DistanceHomeopathyGuide/);
  assert.match(detail, /2 sessions \+ 4 weeks/);
  assert.match(detail, /2 сессии \+ 4 недели/);
  assert.match(detail, /Homeopathy has no reliable evidence/);
  assert.match(detail, /Надёжных доказательств/);
  assert.match(detail, /€50/);
  assert.match(detail, /€100/);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { matchRemedyDescriptions, containsUrgentSymptoms } from "../lib/remedies/assist-matcher.mjs";
import { readFileSync } from "node:fs";

test("educational comparison produces source-backed Ambra Grisea with real matching excerpts in three locales", () => {
  const examples = {
    ru: "Стеснение в груди при волнении, дрожь при общении, запор на фоне стресса",
    en: "Chest tightness when anxious, trembling in company and stress related constipation",
    es: "Temblor en compañía, opresión en el pecho y estreñimiento por tensión",
  };
  for (const [locale, query] of Object.entries(examples)) {
    const result = matchRemedyDescriptions(query, locale);
    assert.equal(result.status, "matches");
    assert.equal(result.matches[0].slug, "ambra-grisea");
    assert.ok(result.matches[0].matchedSymptoms.length);
    assert.ok(result.matches.length <= 3);
  }
});
test("vague and irrelevant queries do not invent remedy suggestions", () => {
  assert.equal(matchRemedyDescriptions("Хочу разобраться с работой и деньгами", "ru").status, "insufficient");
  assert.equal(matchRemedyDescriptions("feeling", "en").status, "insufficient");
  assert.equal(matchRemedyDescriptions("any", "xx").status, "insufficient");
});
test("red flags always suppress the profile comparison", () => {
  for (const query of ["Боль в груди и трудно дышать", "chest pain and anxiety", "no puedo respirar", "suicidal thoughts"]) {
    assert.ok(containsUrgentSymptoms(query), query);
    assert.deepEqual(matchRemedyDescriptions(query, "ru"), { status: "urgent", matches: [] });
  }
});
test("no Bach flower profile is misrepresented as a medical remedy", () => {
  const result = matchRemedyDescriptions("Напряжение мышц при сомнениях, беспокойный сон, сильная усталость", "ru");
  assert.ok(result.matches.every((entry) => !entry.slug.startsWith("bach-")));
});
test("Assist remains local, translated and linked to public remedy sources", () => {
  const component = readFileSync("components/services-assist-homeopathy.tsx", "utf8");
  const assist = readFileSync("components/services-assist-mobile.tsx", "utf8");
  for (const language of ["ru:", "en:", "es:"]) assert.ok(component.includes(language));
  assert.match(component, /data-assist-homeopathy-mind/);
  assert.match(component, /homeopathy\/remedies/);
  assert.match(assist, /ServicesAssistHomeopathy/);
  assert.doesNotMatch(component, /fetch\s*\(|XMLHttpRequest|localStorage|sendBeacon/);
});

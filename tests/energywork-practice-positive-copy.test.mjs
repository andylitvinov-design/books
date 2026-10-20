import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ENERGYWORK_PRACTICE_VALUES, energyworkAnswerValid } from "../data/academy/energywork-ai-schema.js";

const curriculum = readFileSync(new URL("../data/academy/energywork-ai-curriculum.ts", import.meta.url), "utf8");
const learner = readFileSync(new URL("../components/energywork-ai-learner.tsx", import.meta.url), "utf8");

test("All four shared Reiki practice options invite further practice in EN and RU", () => {
  assert.match(curriculum, /id: "skipped", label: l\("I need more practice", "Мне нужно ещё попрактиковаться"\)/);
  assert.equal((curriculum.match(/question: practiceQuestion/g) || []).length, 4);
  assert.deepEqual([...ENERGYWORK_PRACTICE_VALUES], ["tried", "skipped"], "Keep historic private answers compatible");
  for (const id of ["intention-04", "boundaries-03", "ygg-03", "kun-03"]) {
    assert.match(curriculum, new RegExp('id: "' + id + '"[^\\n]*question: practiceQuestion'), id);
    assert.equal(energyworkAnswerValid(id, "tried"), true, id);
    assert.equal(energyworkAnswerValid(id, "skipped"), true, id);
  }
  assert.doesNotMatch(curriculum, /I chose to skip it today|Сегодня я решил\(а\) пропустить/);
});

test("Existing private choices and course summary display the supportive language", () => {
  assert.match(learner, /if \(value === "skipped"\) return locale === "ru"[\s\S]*?"Мне нужно ещё попрактиковаться"[\s\S]*?"I need more practice"/);
  assert.match(learner, /Practices to revisit: /);
  assert.match(learner, /Практики для повторения: /);
  assert.doesNotMatch(learner, /I chose to skip it today|You chose to skip|Сегодня я решил\(а\) пропустить|Вы выбрали пропустить практики/);
});

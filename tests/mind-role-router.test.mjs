import test from "node:test";
import assert from "node:assert/strict";
import {routeMindRole, mindRoleInstruction, MIND_ROLE_ROUTER_VERSION} from "../lib/holistic-support/mind-role-router.mjs";

test("one base-model role router is deterministic for Russian and English", () => {
  const cases = [
    ["ru", "Сколько стоит консультация?", "secretary"],
    ["en", "Can I book an appointment?", "secretary"],
    ["ru", "Мне сложно выбрать, хочу разобраться со своей целью", "coach"],
    ["en", "I feel stuck with my goal", "coach"],
    ["en", "Hi, what can you do?", "secretary"],
    ["ru", "Хочу записаться на коучинг", "secretary"],
  ];
  for (const [locale,message,role] of cases) {
    const result = routeMindRole({message,locale});
    assert.equal(result.role,role,locale+": "+message);
    assert.equal(result.version,MIND_ROLE_ROUTER_VERSION);
  }
});

test("service needs and explicit refusals override suggested coaching", () => {
  assert.equal(routeMindRole({locale:"en", message:"How much does goal coaching cost?",selectedGoal:"goals"}).role,"secretary");
  assert.equal(routeMindRole({locale:"ru",message:"Не хочу коучинг, только факты", selectedGoal:"relationships"}).role,"secretary");
  assert.equal(routeMindRole({locale:"en",message:"Just answer, no coaching",selectedGoal:"goals"}).role,"secretary");
});

test("only a real user's prior topic carries through short follow-ups", () => {
  assert.equal(routeMindRole({locale:"en",message:"what next", history:[
    {role:"user",text:"I feel stuck"},{role:"assistant",text:"How much to book?"}
  ]}).role,"coach");
  assert.equal(routeMindRole({locale:"ru",message:"продолжи",history:[
    {role:"user",text:"сколько стоит подписка"},{role:"assistant",text:"Мне тяжело"}
  ]}).role,"secretary");
});

test("unknown text does not trigger coaching and RU/EN pilot doesn't switch Spanish", () => {
  assert.equal(routeMindRole({locale:"en",message:"tell me something"}).role,"secretary");
  assert.equal(routeMindRole({locale:"es",message:"me siento perdido",selectedGoal:"goals"}).role,"general");
  assert.equal(routeMindRole({locale:"en",message:"Let's discuss",selectedGoal:"meaning"}).role,"coach");
});

test("role policies share boundaries and do not expose tools or model identifiers", () => {
  const secretary=mindRoleInstruction("secretary");
  const coach=mindRoleInstruction("coach");
  assert.match(secretary,/only verified trusted context/);
  assert.match(coach,/BEFORE offering advice/);
  assert.match(coach,/not a human or therapist/);
  assert.doesNotMatch(secretary+coach,/model:\\w|http:\/\/|api_key|\.ollama/i);
  assert.match(mindRoleInstruction("untrusted"),/neutral/);
});

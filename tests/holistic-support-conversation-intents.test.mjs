import assert from "node:assert/strict";
import test from "node:test";
import { interpretSupportUtterance, parseSupportMinutes, chooseSupportFormat } from "../lib/holistic-support/guide-dialogue.mjs";
import { understandConversationTurn } from "../lib/holistic-support/conversation-intelligence.mjs";
import { ruleConversationReply } from "../lib/holistic-support/rule-conversation.mjs";
import { planJudgmentTurn } from "../lib/holistic-support/judgment-mind.mjs";

test("natural-language inputs reuse the existing privacy-safe Home Guide parser", () => {
  assert.deepEqual(interpretSupportUtterance("Да", "ru").kind,"agree");
  assert.equal(interpretSupportUtterance("Другая тема", "ru").kind,"switch-topic");
  assert.equal(interpretSupportUtterance("Хочу сосредоточиться на отношениях", "ru").topic,"love");
  assert.equal(interpretSupportUtterance("I'd like help with money at work", "en").topic,"money");
  assert.equal(interpretSupportUtterance("Quiero más energía", "es").topic,"energy");
  assert.equal(interpretSupportUtterance("Хочу работать с целями", "ru").topic,"meaning");
  assert.equal(interpretSupportUtterance("I want to work on my goals", "en").topic,"meaning");
  assert.equal(interpretSupportUtterance("Хочу Рейки-поддержку", "ru").format,"healing");
  assert.equal(interpretSupportUtterance("Мне нужен курс", "ru").format,"courses");
  assert.equal(interpretSupportUtterance("Лучше пройти тест", "ru").format,"tests");
  assert.equal(interpretSupportUtterance("Что лучше: видео или тест?", "ru").question,"compare");
  assert.equal(interpretSupportUtterance("Сколько стоит консультация?", "ru").question,"price");
  assert.equal(interpretSupportUtterance("Почему именно эта тема?", "ru").question,"why");
  assert.equal(interpretSupportUtterance("Хочу умереть", "ru").kind,"safety");
  assert.equal(interpretSupportUtterance("I want to kill myself", "en").kind,"safety");
  assert.equal(interpretSupportUtterance("Quiero matarme", "es").kind,"safety");
  assert.equal(interpretSupportUtterance("", "ru").kind,"empty");
  assert.equal(interpretSupportUtterance("x".repeat(800), "ru").text.length, 240);
});

test("free-text time, including later and unrecognized inputs, never invents duration", () => {
  for (const [text, expected] of [
    ["10 минут",10], ["ten minutes",10], ["quince minutos",15],
    ["пять",5], ["30",30], ["Позже",null], ["not now",null],
    ["не знаю",undefined], ["345 минут",undefined], ["0 минут",undefined],
  ]) assert.equal(parseSupportMinutes(text), expected, text);
});

test("format suggestion uses explicit opt-in, free options, and never infers payment", () => {
  assert.equal(chooseSupportFormat({available:["tests","meditation","healing"], minutes:5,need:"Больше энергии"}),"meditation");
  assert.equal(chooseSupportFormat({available:["tests","meditation"],minutes:20,need:"Хочу понять ситуацию"}),"tests");
  assert.equal(chooseSupportFormat({available:["consultation","healing"],minutes:10,need:"Обсудить"}),"healing");
  assert.equal(chooseSupportFormat({available:["tests","meditation"],minutes:5,preferred:"consultation"}),"meditation");
  assert.equal(chooseSupportFormat({available:[],minutes:10,need:"энергия"}),null);
});

test("conversation intelligence honors corrections, follow-ups and the default chat route", () => {
  const correction = understandConversationTurn({ message: "Не про любовь, а про деньги", locale: "ru" });
  assert.equal(correction.act, "correction");
  assert.equal(correction.topic, "work_money");
  assert.match(correction.replyFallback, /работа и деньги/);

  const followUp = ruleConversationReply({
    message: "А почему?", locale: "ru",
    history: [{ role: "user", text: "Мне сложно в отношениях" }],
  });
  assert.equal(followUp.source, "conversation-intelligence");
  assert.equal(followUp.understanding.act, "follow_up");
  assert.equal(followUp.understanding.contextTopic, "relationships");

  const mixed = ruleConversationReply({
    message: "Я хочу сменить работу, но боюсь подвести команду", locale: "ru",
  });
  assert.equal(mixed.understanding.act, "ambivalence");

  const spanish = understandConversationTurn({
    message: "No me refiero al trabajo, sino a mi relación", locale: "es",
  });
  assert.equal(spanish.act, "correction");
  assert.equal(spanish.topic, "relationships");
});

test("conversation intelligence does not mistake disclosures or short yes for actions", () => {
  const disclosure = understandConversationTurn({ message: "Сегодня был тяжелый день", locale: "ru" });
  assert.equal(disclosure.act, "disclosure");
  assert.ok(disclosure.replyFallback);

  const yes = understandConversationTurn({ message: "Yes", locale: "en" });
  assert.equal(yes.act, "affirmation");
  assert.match(yes.replyFallback, /does not trigger actions/);

  const direct = ruleConversationReply({ message: "Напиши медитацию для сна", locale: "ru" });
  assert.notEqual(direct.source, "conversation-intelligence");
});

test("judgment turn orchestration uses conversation cues before broad emotion matching", () => {
  const correction = planJudgmentTurn({
    message: "Не про любовь, а про деньги", locale: "ru", safety: { status: "clear" },
  });
  assert.equal(correction.status, "handled");
  assert.equal(correction.state, "reframed");
  assert.match(correction.reply, /работа и деньги/);

  const followUp = planJudgmentTurn({
    message: "А почему?", locale: "ru", safety: { status: "clear" },
    history: [{ role: "user", text: "Мне сложно в отношениях" }],
  });
  assert.equal(followUp.status, "handled");
  assert.match(followUp.reply, /отношения/);

  const mixed = planJudgmentTurn({
    message: "Я хочу сменить работу, но боюсь подвести команду",
    locale: "ru", safety: { status: "clear" },
  });
  assert.equal(mixed.status, "handled");
  assert.match(mixed.reply, /желание и сомнение/);

  const concrete = planJudgmentTurn({
    message: "Я не могу начать работу", locale: "ru", safety: { status: "clear" },
  });
  assert.equal(concrete.status, "handled");
  assert.equal(concrete.state, "awaiting_choice");
  assert.equal(concrete.situationCode, "starting");
});

test("Reasoning Mind separates current evidence, user context, uncertainty and next move", async () => {
  const { reasonAboutConversationTurn, REASONING_MIND_VERSION } =
    await import("../lib/holistic-support/reasoning-mind.mjs");
  const history = [
    { role: "user", text: "Мне сложно в отношениях" },
    { role: "assistant", text: "Что именно вы хотите понять?" },
  ];
  const follow = reasonAboutConversationTurn({ message: "А почему?", locale: "ru", history });
  assert.equal(follow.act, "follow_up");
  assert.equal(follow.contextTopic, "relationships");
  assert.equal(follow.nextMove, "answer_in_recent_user_context");
  assert.ok(follow.evidence.includes("recent_user_turn_context"));

  const correction = reasonAboutConversationTurn({
    message: "Не про любовь, а про деньги", locale: "ru", history,
  });
  assert.equal(correction.currentTopic, "work_money");
  assert.equal(correction.rationaleCode, "CURRENT_CORRECTION_WINS");
  assert.ok(correction.contradictionSignals.includes("explicit_user_correction"));

  const mixed = reasonAboutConversationTurn({
    message: "Я хочу сменить работу, но боюсь подвести команду", locale: "ru",
  });
  assert.equal(mixed.confidence, "low");
  assert.equal(mixed.nextMove, "reflect_tradeoff_then_clarify");
  assert.ok(mixed.uncertainty.includes("competing_motivations"));

  const disclosure = reasonAboutConversationTurn({
    message: "Сегодня был тяжелый день", locale: "ru",
  });
  assert.equal(disclosure.nextMove, "acknowledge_before_advice");

  const noContext = reasonAboutConversationTurn({ message: "Why?", locale: "en" });
  assert.equal(noContext.contextTopic, null);
  assert.equal(noContext.nextMove, "ask_what_to_clarify");
  assert.equal(REASONING_MIND_VERSION, "hh-reasoning-mind-v1");
  assert.ok(!("chainOfThought" in follow));
  assert.ok(!("privateReasoning" in follow));
});

test("Judgment Mind carries a compact reasoning decision, not a chain-of-thought trace", async () => {
  const result = planJudgmentTurn({
    message: "Не про любовь, а про деньги", locale: "ru", safety: { status: "clear" },
  });
  assert.equal(result.state, "reframed");
  // Reasoning remains an internal decision aid; the public Judgment schema is unchanged.
  assert.equal("reasoning" in result, false);
  assert.equal("chainOfThought" in result, false);
});

test("owned-language-model prompt receives a bounded reasoning brief, never private deliberation", async () => {
  const { prepareNaturalDialogue } = await import("../lib/holistic-support/natural-dialogue.mjs");
  const envelope = prepareNaturalDialogue({
    message: "А почему?", locale: "ru",
    history: [{ role: "user", text: "Мне сложно в отношениях" }],
    decision: { status: "no_match", message: "Уточните вопрос", suggestions: [] },
    access: { authenticated: true, ownerScoped: true },
    consent: { ownedInference: true, agentMemory: false },
    channel: "owned",
  });
  assert.equal(envelope.modelAllowed, true);
  const serialized = envelope.modelRequest.messages.map(row => row.content || "").join("\n");
  assert.match(serialized, /FOLLOW_UP_GROUNDED_IN_USER_CONTEXT/);
  assert.match(serialized, /answer_in_recent_user_context/);
  assert.match(serialized, /recent_user_turn_context/);
  assert.doesNotMatch(serialized, /chainOfThought|privateReasoning/);
});

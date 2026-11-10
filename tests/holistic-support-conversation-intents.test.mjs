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

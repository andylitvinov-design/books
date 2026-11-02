import assert from "node:assert/strict";
import test from "node:test";
import { interpretSupportUtterance, parseSupportMinutes, chooseSupportFormat } from "../lib/holistic-support/guide-dialogue.mjs";

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

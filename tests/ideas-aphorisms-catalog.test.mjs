import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import catalog from "../data/ideas-aphorisms.json" with { type: "json" };
import {
  getIdeasAphorismMatches,
  getIdeasAphorisms,
  ideaTopics,
  matchIdeasAphorismTheme,
  matchIdeasTopic,
} from "../lib/ideas-guidance.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("128 individually curated ideas, 16 themes, 9 named public-domain reading sources and three complete languages", () => {
  assert.equal(catalog.items.length, 128);
  assert.equal(new Set(catalog.items.map(item => item.id)).size, 128);
  assert.equal(new Set(catalog.items.map(item => item.topic)).size, 16);
  assert.equal(Object.keys(catalog.sources).length, 9);
  for (const locale of ["en", "ru", "es"]) {
    const key = "text_" + locale;
    assert.equal(new Set(catalog.items.map(item => item[key])).size, 128);
    for (const item of catalog.items) assert.ok(item[key].length >= 25, item.id + " " + locale);
  }
  for (const item of catalog.items) {
    assert.equal(item.keywords.length > 2, true, item.id);
    assert.ok(["editorial", "inspired"].includes(item.kind));
    if (item.kind === "inspired") {
      const source = catalog.sources[item.source_id];
      assert.ok(source, item.id);
      assert.match(source.url, /^https:\/\//);
      assert.ok(source.author && source.work);
    } else assert.equal(item.source_id, null);
  }
});

test("question-to-theme matching handles concrete EN/RU/ES concerns without external AI", () => {
  const cases = [
    ["Я не доверяю партнёру и не могу поставить границы", "relationships", "boundaries"],
    ["Мне одиноко, не с кем поговорить", "relationships", "loneliness"],
    ["Я переживаю утрату после смерти близкого", "direction", "grief"],
    ["Я устал, выгорел, нет энергии", "resources", "resources"],
    ["How can I feel more confident and worthy?", "stress", "selfworth"],
    ["I am anxious and afraid of change", "stress", "stress"],
    ["How do I build a better career and job?", "work", "work"],
    ["Tengo miedo de hablar con mi pareja", "relationships", "relationships"],
    ["Quiero encontrar mi propósito", "direction", "purpose"],
    ["¿Cómo tener más confianza en mí mismo?", "stress", "selfworth"],
  ];
  for (const [question, _topic, expected] of cases) {
    assert.equal(matchIdeasAphorismTheme(question, _topic), expected, question);
  }
  assert.equal(matchIdeasTopic("my partner feels distant").topic, "relationships");
});

test("initial 3 and next 3 always keep stable order without repeats, scoped to relevant themes", () => {
  const questions = [
    ["Мне тревожно и страшно, что будет дальше", "stress"],
    ["У меня конфликт с любимым человеком", "relationships"],
    ["Я ищу смысл и направление жизни", "direction"],
    ["I feel exhausted and need sleep", "resources"],
    ["My business is struggling and I need better work", "work"],
    ["Me duele la soledad", "relationships"],
    ["", "direction"],
  ];
  for (const [question, topic] of questions) {
    for (const locale of ["en", "ru", "es"]) {
      const all = getIdeasAphorismMatches(question, locale, topic);
      const again = getIdeasAphorismMatches(question, locale, topic);
      assert.deepEqual(again, all);
      assert.ok(all.length >= 6, locale + " " + topic);
      assert.equal(new Set(all.map(item => item.id)).size, all.length);
      assert.equal(all.slice(0, 3).length, 3);
      assert.equal(all.slice(3, 6).length, 3);
      assert.ok(all.slice(0, 3).every(item => !all.slice(3, 6).some(next => next.id === item.id)));
      assert.ok(all.every(item => !item.source || item.kind === "inspired"));
    }
  }
  for (const topic of ideaTopics) for (const locale of ["ru", "en", "es"]) {
    assert.equal(getIdeasAphorisms(topic, locale).length, 3);
  }
});

test("mobile and privacy contract: question stays local, source labels and Show 3 more rendered", () => {
  const component = read("components/ideas-discovery.tsx");
  const style = read("components/ideas-discovery.module.css");
  const lib = read("lib/ideas-guidance.mjs");
  const schema = read("supabase/migrations/20261021125100_hh_public_ideas_aphorisms.sql");
  assert.match(component, /getIdeasAphorismMatches\(question, locale, result\.topic\)/);
  assert.match(component, /Math\.min\(count \+ 3, aphorismMatches\.length\)/);
  assert.match(component, /item\.id/);
  assert.match(component, /item\.source\.url/);
  assert.match(component, /visibleAphorisms/);
  assert.match(style, /\.moreAphorisms:focus-visible/);
  assert.match(style, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  for (const forbidden of ["fetch(", "XMLHttpRequest", "sendBeacon", "localStorage", "sessionStorage"]) {
    assert.ok(!component.includes(forbidden), "component must not " + forbidden);
    assert.ok(!lib.includes(forbidden), "matching library must not " + forbidden);
  }
  assert.match(schema, /ENABLE ROW LEVEL SECURITY/);
  assert.match(schema, /TO anon, authenticated USING \(is_published = true\)/);
  assert.match(schema, /REVOKE ALL ON public\.hh_ideas_aphorisms FROM PUBLIC, anon, authenticated/);
  assert.match(schema, /GRANT SELECT ON public\.hh_ideas_aphorisms TO anon, authenticated/);
});

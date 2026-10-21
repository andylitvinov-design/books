import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import catalog from "../data/ideas-aphorisms.json" with { type: "json" };
import {
  detectIdeasQuestionLocale,
  getIdeasAphorismMatches,
  getIdeasAphorisms,
  ideaTopics,
  matchIdeasAphorismTheme,
  matchIdeasTopic,
} from "../lib/ideas-guidance.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("142 curated Ideas texts in 16 themes and 10 documented sources, with three complete language versions", () => {
  assert.equal(catalog.items.length, 142);
  assert.equal(new Set(catalog.items.map(item => item.id)).size, 128);
  assert.equal(new Set(catalog.items.map(item => item.topic)).size, 16);
  assert.equal(Object.keys(catalog.sources).length, 10);
  for (const locale of ["en", "ru", "es"]) {
    const key = "text_" + locale;
    assert.equal(new Set(catalog.items.map(item => item[key])).size, 142);
    for (const item of catalog.items) assert.ok(item[key].length >= 25, item.id + " " + locale);
  }
  for (const item of catalog.items) {
    assert.equal(item.keywords.length > 2, true, item.id);
    assert.ok(["editorial", "inspired", "proverb"].includes(item.kind));
    if (item.kind === "inspired" || item.kind === "proverb") {
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
      assert.ok(all.every(item => !item.source || ["inspired", "proverb"].includes(item.kind)));
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
  assert.match(component, /getIdeasAphorismMatches\(question, answerLocale, result\.topic\)/);
  assert.match(component, /Math\.min\(count \+ 3, aphorismMatches\.length\)/);
  assert.match(component, /item\.id/);
  assert.match(component, /item\.source\.url/);
  assert.match(component, /className=\{styles\.aphorismAttribution\}/);
  assert.match(component, /answerCopy\.sourceLabel/);
  assert.match(component, /data-question-language=\{answerLocale\}/);
  assert.match(component, /lang=\{answerLocale\}/);
  assert.match(component, /detectIdeasQuestionLocale\(question, locale\)/);
  assert.match(style, /\.aphorismAttribution \{/);
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

test("answer language follows the question regardless of page locale; sources remain labeled", () => {
  const samples = [
    ["Как перестать тревожиться из-за работы?", "en", "ru"],
    ["Я хочу change и новый путь", "en", "ru"],
    ["I need courage to choose a new job", "ru", "en"],
    ["How do I feel better today?", "es", "en"],
    ["¿Cómo mejorar mi trabajo y mi vida?", "en", "es"],
    ["Tengo miedo de cambiar de trabajo", "ru", "es"],
    ["!?", "ru", "ru"],
  ];
  for (const [question, pageLocale, answerLocale] of samples) {
    assert.equal(detectIdeasQuestionLocale(question, pageLocale), answerLocale, question);
    const topic = matchIdeasTopic(question).topic;
    const matches = getIdeasAphorismMatches(question, answerLocale, topic);
    assert.equal(matches.length >= 6, true);
    assert.equal(matches[0].text, catalog.items.find(item => item.id === matches[0].id)["text_" + answerLocale]);
    assert.ok(matches.every(item => item.kind === "editorial" || item.source?.url.startsWith("https://")));
  }
  const ruSource = getIdeasAphorismMatches("партнер и отношения", "ru", "relationships").find(item => item.kind === "inspired");
  const enSource = getIdeasAphorismMatches("partner and relationships", "en", "relationships").find(item => item.kind === "inspired");
  assert.match(ruSource?.source?.author ?? "", /[А-Яа-яЁё]/);
  assert.match(ruSource?.source?.work ?? "", /[А-Яа-яЁё]/);
  assert.match(enSource?.source?.work ?? "", /[A-Za-z]/);
  assert.equal(ruSource?.source?.url, enSource?.source?.url);
  const ui = read("components/ideas-discovery.tsx");
  assert.match(ui, /Source · inspired by/);
  assert.match(ui, /Источник идеи · по мотивам/);
  assert.match(ui, /Holistic House · авторский афоризм/);
  assert.match(ui, /getIdeasAphorismMatches\(question, answerLocale, result\.topic\)/);
  assert.ok(!ui.includes("fetch("));
});

test("14 traditional proverbs: seven verified original languages and three independent sense translations", () => {
  const additions = catalog.items.filter(item => item.kind === "proverb");
  assert.equal(additions.length, 14);
  assert.deepEqual([...new Set(additions.map(item => item.original_language))].sort(), ["da", "de", "es", "fr", "it", "nl", "pt"]);
  const source = catalog.sources.bohn_polyglot_1857;
  assert.match(source.url, /^https:\/\/www\.gutenberg\.org\/files\/51090\//);
  assert.match(source.rights_note, /public domain/i);
  assert.match(source.work, /1857/);
  assert.equal(new Set(catalog.items.map(item => item.id)).size, 142);
  for (const item of additions) {
    assert.match(item.id, /^hh-proverb-(fr|it|de|nl|es|pt|da)-\d{2}$/);
    assert.ok(item.original_text.length >= 12, item.id);
    assert.ok(item.source_locator.includes("proverbs"), item.id);
    assert.equal(item.source_id, "bohn_polyglot_1857");
    assert.equal(item.translation_method, "new_editorial_sense_translation");
    assert.equal(item.source_license, "public_domain_1857_us");
    for (const locale of ["ru", "en", "es"]) {
      assert.ok(item["text_" + locale].length >= 25, item.id + "-" + locale);
      const resolved = getIdeasAphorismMatches(item["text_" + locale], locale, item.topic)
        .find(found => found.id === item.id);
      assert.ok(resolved, item.id + "-" + locale);
      assert.equal(resolved.kind, "proverb");
      assert.deepEqual(resolved.original, { text: item.original_text, language: item.original_language });
      assert.equal(resolved.source.url, source.url);
      assert.match(resolved.source.author, /\S/);
    }
  }
  const norm = text => text.normalize("NFKD").toLowerCase()
    .replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]/gu, "");
  for (const locale of ["en", "ru", "es"]) {
    assert.equal(new Set(catalog.items.map(item => norm(item["text_" + locale]))).size, 142, locale);
  }
  assert.equal(new Set(additions.map(item => norm(item.original_text))).size, 14);
});

test("traditional provenance, original shown beneath source, historical license and RLS preserved", () => {
  const ui = read("components/ideas-discovery.tsx");
  const css = read("components/ideas-discovery.module.css");
  const matcher = read("lib/ideas-guidance.mjs");
  const migration = read("supabase/migrations/20261021162000_hh_ideas_proverbs_sources.sql");
  assert.match(ui, /item\.kind !== "editorial" && item\.source/);
  assert.match(ui, /item\.kind === "proverb" && item\.original/);
  assert.match(ui, /lang=\{item\.original\.language\}/);
  assert.match(ui, /href=\{item\.source\.url\}/);
  assert.match(ui, /proverbSource: "Народная пословица"/);
  assert.match(css, /\.aphorisms p\.aphorismOriginal/);
  assert.match(matcher, /Traditional proverb/);
  assert.match(migration, /CHECK \(kind IN \('editorial', 'inspired', 'proverb'\)\)/);
  assert.match(migration, /original_language/);
  assert.match(migration, /source_locator/);
  assert.match(migration, /public\.hh_ideas_aphorisms/);
  assert.doesNotMatch(migration, /GRANT (?:INSERT|UPDATE|DELETE)/);
  for (const denied of ["fetch(", "sendBeacon", "XMLHttpRequest", "localStorage"]) {
    assert.ok(!ui.includes(denied)); assert.ok(!matcher.includes(denied));
  }
});

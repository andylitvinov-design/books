import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import postcss from "postcss";
import { createHash } from "node:crypto";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const curriculum = read("data/academy/energywork-ai-curriculum.ts");
const yggdrasil = read("data/academy/yggdrasil-testimonials.ts");
const learner = read("components/energywork-ai-learner.tsx");
const css = read("components/energywork-ai-learner.module.css");
const browser = read("scripts/verify-reiki-all-slides-browser.mjs");

test("Four meditation review screens remain in the correct slots among 53 original steps", () => {
  const ids = [...curriculum.matchAll(/id: "(?:welcome|flight|presence|intention|boundaries|paths|ygg|tan|kun|init|end)-[^"]+"/g)];
  assert.equal(ids.length, 53);
  for (const sequence of [["flight-03","flight-voices","flight-04"],
    ["tan-03","tan-voices","tan-04"],["kun-03","kun-voices","kun-04"],
    ["ygg-03","ygg-voices","ygg-04"]]) {
    let last = -1;
    for (const id of sequence) {
      const offset = curriculum.indexOf('id: "' + id + '"');
      assert.ok(offset > last, id + " must remain after the corresponding meditation");
      last = offset;
    }
  }
});

test("All five Yggdrasil and four independently sourced Tantra reviews are available", () => {
  assert.equal([...yggdrasil.matchAll(/id: "testimonial-[0-9]+"/g)].length, 5);
  assert.match(curriculum, /yggdrasilTextTestimonials\.map/);
  assert.match(curriculum, /testimonials: yggdrasilVoices/);
  assert.match(curriculum, /testimonials: tantraVoices/);
  const tantra = curriculum.split("const tantraVoices:")[1].split("export const energyworkPhases")[0];
  assert.deepEqual([...tantra.matchAll(/id: "([^"]+)"/g)].map(match => match[1]),
    ["margaret", "olga", "litten", "tantra-level-1"]);
  assert.match(curriculum, /Course reviews are NOT presented as reactions to this exact meditation recording/);
  assert.match(curriculum, /Explore comments on the original video, then share your own experience/);
});

test("Buttons switch quotes without navigating away or touching required student feedback", () => {
  assert.match(learner, /function MeditationVoices/);
  assert.match(learner, /data-meditation-review-carousel/);
  assert.match(learner, /data-review-prev/);
  assert.match(learner, /data-review-next/);
  assert.match(learner, /setActive\(\(index\) => \(index \+ 1\) % entries\.length\)/);
  assert.match(learner, /<MeditationVoices key=\{slide\.id\}/);
  assert.match(learner, /aria-live="polite" aria-atomic="true"/);
  assert.match(learner, /t\.voicesSource/);
  assert.match(learner, /t\.voicesComments/);
  assert.match(learner, /disabled=\{busy \|\| sync === "checking" \|\| experienceMissing \|\| feedbackMissing\}/);
  assert.match(browser, /Next switches quote in place/);
  assert.match(browser, /Previous restores quote/);
  assert.match(css, /\.voicesControls button:focus-visible/);
  assert.match(css, /grid-template-columns:44px/);
  assert.match(css, /REIKI REVIEW V4/);
  assert.match(css, /reiki-approved-sunrise-v3\.webp/);
  assert.match(learner, /styles\.voicesReferences/);
  assert.match(learner, /styles\.voiceDotActive/);
  assert.match(learner, /voicesArt = slide\.kind === "voices"/);
});

test("Full original Tantra Reiki testimonials survive without excerpt truncation", () => {
  const archive = JSON.parse(read("data/academy/tantra-reiki-full.generated.json"));
  const translations = JSON.parse(read("data/academy/tantra-reiki-ru-en.generated.json"));
  const english = archive.blocks.en;
  const russian = archive.blocks.ru;
  const tantra = curriculum.split("const tantraVoices:")[1].split("export const energyworkPhases")[0];
  const completeTexts = [
    english[89].text,
    english[84].text.replace(/^TESTIMONIAL: OLGA\s*/, ""),
    english[86].text + "\n\n" + english[87].text,
    [56, 57].map(index => translations.blocks.find(block => block.sourceIndex === index).text).join("\n\n"),
    russian.slice(61, 65).map(block => block.text).join("\n\n"),
    russian.slice(56, 58).map(block => block.text).join("\n\n"),
  ];
  for (const fullText of completeTexts) {
    assert.ok(tantra.includes(JSON.stringify(fullText)), "Original review must be published in full");
  }
  assert.match(tantra, /перевод с английского/);
  assert.match(tantra, /translated from Russian/);
});

// Execute only the real dictionary and carousel. This checks React output and
// handlers with synthetic state; it is not a browser/native-keyboard test.
function mountVoices(source, props) {
  const file = ts.createSourceFile("learner.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const copy = file.statements.find(node => ts.isVariableStatement(node) &&
    node.declarationList.declarations.some(item => item.name.getText(file) === "copy"));
  const component = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "MeditationVoices");
  assert.ok(copy && component, "Real dictionary and carousel must be present");
  const code = ts.transpileModule(copy.getText(file) + "\n" + component.getText(file) + "\n globalThis.renderVoices = MeditationVoices;", {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  let active;
  const context = {
    React: { createElement: (type, attributes, ...children) => ({ type, props: attributes ?? {}, children: children.flat(Infinity) }) },
    useState(initial) {
      if (active === undefined) active = initial;
      return [active, next => { active = typeof next === "function" ? next(active) : next; }];
    },
    styles: new Proxy({}, { get: (_, key) => key }),
    MessageCircle: "MessageCircle", ArrowLeft: "ArrowLeft", ArrowRight: "ArrowRight", ExternalLink: "ExternalLink", Link: "Link",
  };
  vm.runInNewContext(code, context, { timeout: 1000 });
  return () => context.renderVoices(props);
}

function elements(tree) {
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...tree.children.flatMap(elements)];
}
const contents = node => node.children.map(child => child && typeof child === "object" ? contents(child) : child ?? "").join("");
const labels = {
  en: { region: "Learner review", previous: "Previous review", next: "Next review" },
  ru: { region: "Отзыв участника", previous: "Предыдущий отзыв", next: "Следующий отзыв" },
};
function fixture(locale, count = 2) {
  return {
    locale, youtubeId: "synthetic-video", slide: {
      id: "synthetic-voices", kind: "voices", testimonials: Array.from({ length: count }, (_, index) => ({
        id: `review-${index}`, sourcePath: `synthetic-source-${index}`,
        quote: { en: (`Review ${index}. Full English text.\n`).repeat(80), ru: (`Отзыв ${index}. Полный русский текст.\n`).repeat(80) },
        attribution: { en: `English author ${index}`, ru: `Русский автор ${index}` },
      })),
    },
  };
}
function assertReview(tree, props, index) {
  const all = elements(tree);
  const regions = all.filter(node => "data-review-scroll" in node.props);
  assert.equal(regions.length, 1, "Exactly one review scroll region");
  const region = regions[0];
  assert.equal(region.type, "p");
  assert.equal(region.props.role, "region");
  assert.equal(region.props.tabIndex, 0, "Keyboard users can enter the scroll region");
  assert.equal(region.props["aria-label"], labels[props.locale].region);
  assert.equal(region.props["aria-hidden"], undefined);
  for (const handler of ["onKeyDown", "onKeyUp", "onKeyPress", "onWheel"]) {
    assert.equal(region.props[handler], undefined, "Do not intercept native scrolling keys or wheel");
  }
  assert.equal(contents(region), props.slide.testimonials[index].quote[props.locale], "Keep the complete selected localized text");
  const quote = all.find(node => node.type === "blockquote");
  assert.equal(quote.props.key, props.slide.testimonials[index].id);
  assert.equal(quote.props["aria-live"], "polite");
  assert.equal(quote.props["aria-atomic"], "true");
  assert.equal(contents(all.find(node => node.type === "cite")), props.slide.testimonials[index].attribution[props.locale]);
  assert.equal(contents(all.find(node => node.props.className === "voicesIndex")), `0${index + 1} / 0${props.slide.testimonials.length}`);
  const source = all.find(node => node.type === "Link");
  assert.equal(source.props.href, `/${props.locale}/academy/${props.slide.testimonials[index].sourcePath}`);
  const video = all.find(node => node.type === "a");
  assert.equal(video.props.href, "https://www.youtube.com/watch?v=synthetic-video");
  assert.equal(video.props.rel, "noopener noreferrer");
  if (props.slide.testimonials.length > 1) {
    for (const [marker, label] of [["data-review-prev", "previous"], ["data-review-next", "next"]]) {
      const button = all.find(node => marker in node.props);
      assert.equal(button.type, "button");
      assert.equal(button.props.type, "button");
      assert.equal(button.props["aria-label"], labels[props.locale][label]);
      assert.equal(typeof button.props.onClick, "function");
    }
    const dots = all.filter(node => ["voiceDot", "voiceDotActive"].includes(node.props.className));
    assert.deepEqual(dots.map(node => node.props.className), props.slide.testimonials.map((_, i) => i === index ? "voiceDotActive" : "voiceDot"));
  } else {
    assert.equal(all.filter(node => "data-review-prev" in node.props || "data-review-next" in node.props).length, 0);
  }
}
for (const locale of ["en", "ru"]) {
  test(`${locale}: named keyboard-focusable full review survives next/previous and wrap without changing lesson`, () => {
    const props = fixture(locale);
    const before = JSON.stringify(props);
    const render = mountVoices(learner, props);
    assertReview(render(), props, 0);
    for (const [marker, expected] of [["data-review-next", 1], ["data-review-next", 0], ["data-review-prev", 1], ["data-review-prev", 0]]) {
      elements(render()).find(node => marker in node.props).props.onClick();
      assertReview(render(), props, expected);
    }
    assert.equal(JSON.stringify(props), before, "Review navigation cannot mutate lesson or feedback data");
  });
  test(`${locale}: single and empty review states retain correct regions and controls`, () => {
    const single = fixture(locale, 1);
    assertReview(mountVoices(learner, single)(), single, 0);
    const empty = elements(mountVoices(learner, fixture(locale, 0))());
    assert.equal(empty.filter(node => "data-review-scroll" in node.props || "data-review-prev" in node.props || "data-review-next" in node.props).length, 0);
    assert.equal(empty.filter(node => node.props.className === "voicesEmpty").length, 1);
  });
}

function assertScrollableCss(source) {
  const rules = [];
  postcss.parse(source).walkRules(rule => {
    if (rule.selector !== '.page[data-reiki-reviews="v4"] .voiceQuote p') return;
    const media = [];
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type === "atrule" && parent.name === "media") media.unshift(parent.params.replace(/\s/g, ""));
    }
    const declarations = Object.fromEntries(rule.nodes.filter(node => node.type === "decl").map(node => [node.prop, node.value]));
    rules.push({ media: media.join(" & "), declarations });
  });
  const values = (media, property) => rules.filter(rule => rule.media === media).map(rule => rule.declarations[property]).filter(value => value !== undefined);
  assert.deepEqual(values("", "overflow-y"), ["auto"]);
  assert.deepEqual(values("", "overscroll-behavior"), ["contain"]);
  assert.deepEqual(values("", "max-height"), ["175px"]);
  assert.deepEqual(values("(max-width:760px)", "max-height"), ["min(14dvh,122px)"]);
  assert.deepEqual(values("(max-width:380px)", "max-height"), ["min(13dvh,110px)"]);
  assert.deepEqual(values("(max-width:760px)and(max-height:700px)", "max-height"), ["85px"]);
  assert.deepEqual(values("print", "max-height"), ["none"]);
  assert.deepEqual(values("print", "overflow"), ["visible"]);
}
test("Current owner screen height caps retain native overflow, with full-height print only", () => assertScrollableCss(css));

const mutations = [
  ["missing focus", ' tabIndex={0}', ""],
  ["unreachable focus", ' tabIndex={0}', ' tabIndex={-1}'],
  ["missing region", ' role="region"', ""],
  ["missing label", ' aria-label={t.voicesScrollLabel}', ""],
  ["wrong locale label", 'aria-label={t.voicesScrollLabel}', 'aria-label={copy.en.voicesScrollLabel}'],
  ["hidden region", 'data-review-scroll role=', 'data-review-scroll aria-hidden="true" role='],
  ["truncated text", '{currentReview.quote[locale]}</p>', '{currentReview.quote[locale].slice(0, 100)}</p>'],
  ["wrong locale text", '{currentReview.quote[locale]}</p>', '{currentReview.quote.en}</p>'],
  ["wrong locale caption", '{currentReview.attribution[locale]}', '{currentReview.attribution.en}'],
  ["intercepted keyboard", 'data-review-scroll role=', 'data-review-scroll onKeyDown={(event) => event.preventDefault()} role='],
];
for (const [name, before, after] of mutations) {
  test(`Review contract rejects ${name}`, () => {
    assert.equal(learner.split(before).length - 1, 1, "Mutation must target one real expression");
    const props = fixture("ru");
    assert.throws(() => assertReview(mountVoices(learner.replace(before, after), props)(), props, 0), assert.AssertionError);
  });
}
for (const [name, before, after] of [
  ["hidden scroll overflow", "overflow-y:auto;", "overflow-y:hidden;"],
  ["uncapped narrow mobile", "max-height:min(13dvh,110px);", "max-height:none;"],
  ["screen-style print cap", "max-height:none!important;overflow:visible!important;", "max-height:85px!important;overflow:hidden!important;"],
]) {
  test(`Review CSS contract rejects ${name}`, () => {
    assert.ok(css.includes(before));
    assert.throws(() => assertScrollableCss(css.replaceAll(before, after)), assert.AssertionError);
  });
}

function readTantraReviews(source = curriculum) {
  const file = ts.createSourceFile("curriculum.ts", source, ts.ScriptTarget.Latest, true);
  const declaration = file.statements.find(node => ts.isVariableStatement(node) &&
    node.declarationList.declarations.some(item => item.name.getText(file) === "tantraVoices"));
  assert.ok(declaration, "The actual Tantra review collection must exist");
  const context = { l: (en, ru) => ({ en, ru }) };
  vm.runInNewContext(ts.transpileModule(declaration.getText(file) + "\n globalThis.reviews = tantraVoices;", {}).outputText,
    context, { timeout: 1000 });
  return JSON.parse(JSON.stringify(context.reviews));
}
function assertCompleteTantraReviews(reviews) {
  const archive = JSON.parse(read("data/academy/tantra-reiki-full.generated.json"));
  const translations = JSON.parse(read("data/academy/tantra-reiki-ru-en.generated.json"));
  const translated = index => translations.blocks.find(block => block.sourceIndex === index).text;
  const expected = [
    { id: "margaret", en: archive.blocks.en[89].text,
      ruHash: "21335aa2bf7aaa801202daa14c3b6bcfb8b8bdbe6c12b2b3a7d4348fc113b179",
      attribution: { en: "Margaret · published Tantra Reiki learner review", ru: "Маргарет · отзыв о Тантра Рейки (перевод с английского)" } },
    { id: "olga", en: archive.blocks.en[84].text.replace(/^TESTIMONIAL: OLGA\s*/, ""),
      ru: archive.blocks.ru.slice(61, 65).map(block => block.text).join("\n\n"),
      attribution: { en: "Olga · published Tantra Reiki learner review", ru: "Ольга · опубликованный отзыв о Тантра Рейки" } },
    { id: "litten", en: [86, 87].map(index => archive.blocks.en[index].text).join("\n\n"),
      ruHash: "3d0d48daf72dba24cea8c86ad8373b9013bc8b76a2d8b59c411e387553a94d14",
      attribution: { en: "Litten · published Tantra Reiki learner review", ru: "Литтен · отзыв о Тантра Рейки (перевод с английского)" } },
    { id: "tantra-level-1", en: [56, 57].map(translated).join("\n\n"),
      ru: archive.blocks.ru.slice(56, 58).map(block => block.text).join("\n\n"),
      attribution: { en: "Tantra Reiki Level 1 learner · anonymous review (translated from Russian)", ru: "Участница Тантра Рейки 1-й ступени · отзыв без подписи" } },
  ];
  assert.deepEqual(reviews.map(review => review.id), expected.map(review => review.id));
  for (let index = 0; index < expected.length; index++) {
    const actual = reviews[index], original = expected[index];
    assert.equal(actual.sourcePath, "reiki/tantra-reiki");
    assert.deepEqual(Object.keys(actual.quote).sort(), ["en", "ru"]);
    assert.equal(actual.quote.en, original.en, `${original.id}: complete English archive text`);
    if (original.ruHash) {
      // These two previously published RU translations are not in the RU→EN
      // archive. Pin their exact953 bytes, curriculum blob 0d578feef942de17175f4531cd19b4f8d599f4e6.
      assert.equal(createHash("sha256").update(actual.quote.ru).digest("hex"), original.ruHash,
        `${original.id}: preserve the existing published Russian translation`);
    } else assert.equal(actual.quote.ru, original.ru, `${original.id}: complete Russian archive text`);
    assert.deepEqual(actual.attribution, original.attribution, "Keep source identity and translation provenance");
  }
}
test("All four Tantra identities retain exact complete EN/RU archive or published translation text", () => {
  assertCompleteTantraReviews(readTantraReviews());
});
for (const locale of ["en", "ru"]) {
  test(`${locale}: actual complete Tantra reviews and provenance cycle in the same lesson`, () => {
    const props = fixture(locale);
    props.slide.testimonials = readTantraReviews();
    const original = JSON.stringify(props);
    const render = mountVoices(learner, props);
    for (let index = 0; index < 4; index++) {
      assertReview(render(), props, index);
      elements(render()).find(node => "data-review-next" in node.props).props.onClick();
    }
    assertReview(render(), props, 0);
    assert.equal(JSON.stringify(props), original);
  });
}
for (const index of [0, 1, 2, 3]) {
  for (const locale of ["en", "ru"]) {
    test(`Archive contract rejects shortened ${index}/${locale} text`, () => {
      const reviews = readTantraReviews();
      reviews[index].quote[locale] = reviews[index].quote[locale].slice(0, -1);
      assert.throws(() => assertCompleteTantraReviews(reviews), assert.AssertionError);
    });
  }
  test(`Archive contract rejects swapped languages for review ${index}`, () => {
    const reviews = readTantraReviews();
    [reviews[index].quote.en, reviews[index].quote.ru] = [reviews[index].quote.ru, reviews[index].quote.en];
    assert.throws(() => assertCompleteTantraReviews(reviews), assert.AssertionError);
  });
}
for (const [index, locale, provenance] of [[0, "ru", " (перевод с английского)"], [2, "ru", " (перевод с английского)"], [3, "en", " (translated from Russian)"]]) {
  test(`Archive contract rejects removed translation provenance ${index}/${locale}`, () => {
    const reviews = readTantraReviews();
    assert.ok(reviews[index].attribution[locale].includes(provenance));
    reviews[index].attribution[locale] = reviews[index].attribution[locale].replace(provenance, "");
    assert.throws(() => assertCompleteTantraReviews(reviews), assert.AssertionError);
  });
}
for (const [name, mutate] of [
  ["missing review", reviews => reviews.pop()],
  ["duplicate identity", reviews => { reviews[1] = reviews[0]; }],
  ["wrong source course", reviews => { reviews[0].sourcePath = "reiki/yggdrasil"; }],
]) test(`Archive contract rejects ${name}`, () => {
  const reviews = readTantraReviews(); mutate(reviews);
  assert.throws(() => assertCompleteTantraReviews(reviews), assert.AssertionError);
});

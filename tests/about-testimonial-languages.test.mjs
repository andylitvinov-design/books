import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const source = read("components/about-testimonial-gallery.tsx");
const registry = read("components/personal-testimonials.tsx");
const css = read("components/about-testimonial-gallery.module.css");
const about = read("app/[locale]/about/page.tsx");
const spanish = read("app/es/about/page.tsx");

const section = locale => {
  const next = locale === "ru" ? "en" : locale === "en" ? "es" : "const copy";
  const before = registry.split("  " + locale + ": [")[1];
  assert.ok(before, "Missing " + locale + " video catalog");
  const literal = before.split("  ],")[0];
  return [...literal.matchAll(/\{ id: "([\w-]{11})", title: "([^"]+)", language: "(en|ru)" \}/g)]
    .map(([, id, title, language]) => ({ id, title, language }));
};

const catalogs = { en: section("en"), ru: section("ru"), es: section("es") };
const jsx = (type, props) => typeof type === "function" ? type(props ?? {}) : { type, props: props ?? {} };
const nodes = tree => !tree || typeof tree !== "object" ? [] : Array.isArray(tree)
  ? tree.flatMap(nodes) : [tree, ...nodes(tree.props.children)];

function render(locale, expanded) {
  let toggled;
  const modules = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react": { useState: () => [expanded, next => { toggled = next; }] },
    "next/link": { default: props => jsx("a", props) },
    "lucide-react": { ChevronDown: () => null },
    "@/components/site-video-player": { SiteVideoPlayer: props => jsx("video-fixture", props) },
    "./about-testimonial-gallery.module.css": { default: new Proxy({}, { get: (_, key) => String(key) }) },
  };
  const compiled = ts.transpileModule(source, {
    fileName: "about-testimonial-gallery.tsx",
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, require(name) {
    assert.ok(Object.hasOwn(modules, name), "Unexpected import " + name);
    return modules[name];
  } });
  const main = catalogs[locale];
  const otherLocale = locale === "ru" ? "en" : "ru";
  const tree = exports.AboutTestimonialGallery({
    locale, primaryVideos: main, otherLanguageVideos: catalogs[otherLocale],
  });
  return { elements: nodes(tree), toggled: () => toggled, otherLocale };
}

test("About pages reuse the single proven 6 EN + 6 RU catalog, no hardcoded Russian-only About list", () => {
  assert.equal(catalogs.en.length, 6);
  assert.equal(catalogs.ru.length, 6);
  assert.equal(catalogs.es.length, 6);
  assert.equal(new Set([...catalogs.en, ...catalogs.ru].map(video => video.id)).size, 12);
  assert.ok(catalogs.en.every(video => video.language === "en"));
  assert.ok(catalogs.ru.every(video => video.language === "ru"));
  assert.ok(catalogs.es.every(video => video.language === "en"));
  for (const page of [about, spanish]) {
    assert.match(page, /<AboutTestimonialGallery/);
    assert.match(page, /archivedTestimonialPosterFor/);
    assert.doesNotMatch(page, /const videoTestimonials =|const testimonials = \[/);
  }
  assert.match(about, /primaryVideos=\{testimonialVideos\[typedLocale\]\.map/);
  assert.match(about, /typedLocale === "ru" \? "en" : "ru"/);
  assert.match(spanish, /primaryVideos=\{testimonialVideos\.es\.map/);
  assert.match(spanish, /otherLanguageVideos=\{testimonialVideos\.ru\.map/);
  assert.match(registry, /locallyArchivedVideoPosterIds\.has\(id\)/);
});

for (const locale of ["en", "ru", "es"]) {
  test(locale + " About shows six matching-audio videos without loading other language", () => {
    const { elements, toggled, otherLocale } = render(locale, false);
    const cards = elements.filter(node => node.type === "video-fixture");
    assert.equal(cards.length, 6);
    assert.deepEqual(cards.map(node => node.props.video.youtubeId), catalogs[locale].map(video => video.id));
    assert.ok(cards.every(node => node.props.video.language === (locale === "ru" ? "ru" : "en")));
    assert.ok(cards.every(node => node.props.compact === true && node.props.locale === locale));
    if (locale === "es") assert.ok(cards.every(node => node.props.textLanguage === "es"));
    const disclosure = elements.find(node => node.type === "details");
    assert.equal(disclosure.props["data-about-other-language-testimonials"], "true");
    assert.equal(elements.filter(node => node.type === "summary").length, 1);
    const fallback = elements.find(node => node.type === "a");
    assert.equal(fallback.props.href, `/${otherLocale}/about#testimonials-title`);
    assert.equal(fallback.props.prefetch, false);
    disclosure.props.onToggle({ currentTarget: { open: true } });
    assert.equal(toggled(), true);
  });

  test(locale + " disclosure renders all six other-language originals only after opening", () => {
    const { elements, toggled, otherLocale } = render(locale, true);
    const cards = elements.filter(node => node.type === "video-fixture");
    assert.equal(cards.length, 12);
    assert.deepEqual(cards.slice(0, 6).map(node => node.props.video.youtubeId), catalogs[locale].map(video => video.id));
    assert.deepEqual(cards.slice(6).map(node => node.props.video.youtubeId), catalogs[otherLocale].map(video => video.id));
    assert.ok(cards.slice(6).every(node => node.props.video.language === otherLocale));
    assert.equal(elements.filter(node => node.type === "a").length, 0);
    elements.find(node => node.type === "details").props.onToggle({ currentTarget: { open: false } });
    assert.equal(toggled(), false);
  });
}

test("other-language action is localized, keyboard accessible and compact on small phones", () => {
  for (const label of ["View testimonials in other languages", "Посмотреть отзывы на других языках", "Ver testimonios en otros idiomas"]) {
    assert.ok(source.includes(label));
  }
  assert.match(css, /min-height: 52px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /max-width: 430px/);
  assert.match(css, /prefers-reduced-motion/);
});

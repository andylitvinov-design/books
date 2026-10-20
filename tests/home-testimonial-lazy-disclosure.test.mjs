import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../components/home-testimonial-more.tsx", import.meta.url), "utf8");
const jsx = (type, props) => typeof type === "function" ? type(props ?? {}) : { type, props: props ?? {} };
const nodes = tree => !tree || typeof tree !== "object" ? [] : Array.isArray(tree)
  ? tree.flatMap(nodes) : [tree, ...nodes(tree.props.children)];

const remainingVideos = [
  { id: "4NrryHcEF1A", title: "English extra 1", language: "en", fallbackPoster: "/images/holistic-house/testimonial-posters/4NrryHcEF1A.webp" },
  { id: "hYwRNMxIMjc", title: "English extra 2", language: "en", fallbackPoster: "/images/holistic-house/testimonial-posters/hYwRNMxIMjc.webp" },
];
const otherLanguageVideos = [
  "m9RfDgK76PU", "MIVLm1GUTtM", "ttQxUHopaUM", "VABgpmn4ZYA", "muOnIHllI7E", "5oj0BIbLT4w",
].map(id => ({ id, title: "Original Russian video " + id, language: "ru" }));

function render(expanded, locale = "en") {
  let toggled;
  const modules = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react": { useState: () => [expanded, next => { toggled = next; }] },
    "next/link": { default: props => jsx("a", props) },
    "@/components/site-video-player": { SiteVideoPlayer: props => jsx("video-fixture", props) },
    "./personal-testimonials.module.css": { default: new Proxy({}, { get: (_, name) => String(name) }) },
  };
  const compiled = ts.transpileModule(source, { fileName: "home-testimonial-more.tsx",
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, require(name) { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; } });
  const tree = exports.HomeTestimonialMore({
    locale, remainingVideos, otherLanguageVideos,
    title: "Watch more testimonials", sameLanguageTitle: "More in English", otherLanguageTitle: "Russian originals",
  });
  return { tree, toggled: () => toggled };
}

for (const locale of ["en", "ru", "es"]) {
  test(locale + " closed home disclosure sends no hidden players in server HTML/RSC", () => {
    const { tree, toggled } = render(false, locale);
    const elements = nodes(tree);
    assert.equal(elements.filter(node => node.type === "details").length, 1);
    assert.equal(elements.filter(node => node.type === "video-fixture").length, 0);
    assert.equal(elements.filter(node => node.type === "summary").length, 1);
    assert.equal(elements.find(node => node.type === "details").props["data-home-testimonial-disclosure"], "true");
    assert.equal(elements.filter(node => node.type === "a").length, 1, "No-JS archive fallback");
    assert.equal(elements.find(node => node.type === "a").props.href, "/" + locale + "/about#testimonials-title");
    elements.find(node => node.type === "details").props.onToggle({ currentTarget: { open: true } });
    assert.equal(toggled(), true);
  });

  test(locale + " opened disclosure preserves all eight exact video IDs and closes cleanly", () => {
    const { tree, toggled } = render(true, locale);
    const elements = nodes(tree);
    const originals = elements.filter(node => node.type === "video-fixture");
    assert.equal(originals.length, 8);
    assert.deepEqual(originals.map(node => node.props.video.youtubeId),
      [...remainingVideos, ...otherLanguageVideos].map(item => item.id));
    assert.ok(originals.every(node => node.props.locale === locale && node.props.compact === true));
    assert.equal(originals[0].props.fallbackPoster, remainingVideos[0].fallbackPoster);
    assert.equal(originals[2].props.fallbackPoster, undefined);
    elements.find(node => node.type === "details").props.onToggle({ currentTarget: { open: false } });
    assert.equal(toggled(), false, "Closing removes playback components on the next render");
  });
}

test("homepage never eagerly renders its eight extra players", () => {
  const parent = readFileSync(new URL("../components/personal-testimonials.tsx", import.meta.url), "utf8");
  assert.match(parent, /<HomeTestimonialMore/);
  assert.doesNotMatch(parent, /renderVideoCards\(remainingHomeVideos\)/);
  assert.doesNotMatch(parent, /renderVideoCards\(otherLanguageVideos/);
  assert.match(source, /onToggle=\{\(event\) => setExpanded\(event.currentTarget.open\)\}/);
});

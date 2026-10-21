import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("approved Ideas design keeps question, submit button and three touch-sized choices on one mobile row", () => {
  const ui = read("components/ideas-discovery.tsx");
  const css = read("components/ideas-discovery.module.css");
  assert.match(ui, /<form className=\{styles\.question\} onSubmit=\{submitQuestion\}>/);
  assert.match(ui, /<button type="submit" className=\{styles\.submit\}>/);
  assert.match(ui, /type="button" onClick=\{\(\) => choose\("dao"\)\}/);
  assert.match(ui, /type="button" onClick=\{\(\) => choose\("aphorisms"\)\}/);
  assert.match(ui, /type="button" onClick=\{\(\) => choose\("personal"\)\}/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.actions \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.action \{ flex-direction: column;[\s\S]*?min-height: 72px/);
  assert.match(css, /\.submit \{ width: 100%; min-height: 46px/);
  assert.match(css, /\.question textarea \{ min-height: 47px;[\s\S]*?font-size: 16px/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});

test("first screen shows an explicitly marked educational example, never a made-up personal answer", () => {
  const ui = read("components/ideas-discovery.tsx");
  assert.match(ui, /const exampleHexagram = getHexagram\(42\)/);
  assert.match(ui, /data-ideas-preview/);
  assert.match(ui, /previewNote: "Пример/);
  assert.match(ui, /previewNote: "A sample, not a response to you/);
  assert.match(ui, /previewNote: "Es un ejemplo/);
  assert.match(ui, /data-ideas-result=\{result\.mode\}/);
  assert.match(ui, /aria-live="polite"/);
  assert.match(ui, /maxLength=\{500\}/);
  assert.match(ui, /<details className=\{styles\.privacyDisclosure\}>/);
  for (const denied of ["fetch(", "sendBeacon(", "localStorage", "sessionStorage", "XMLHttpRequest"]) {
    assert.ok(!ui.includes(denied), denied + " would compromise question privacy");
  }
});

test("local illustrated hero and original books/news/film feed remain available in all locales", () => {
  const css = read("components/ideas-discovery.module.css");
  const svg = read("public/images/holistic-house/ideas-zen-landscape.svg");
  const catalog = read("components/book-catalog.tsx");
  const spanish = read("app/es/books/page.tsx");
  const localized = read("app/[locale]/books/page.tsx");
  assert.match(css, /url\("\/images\/holistic-house\/ideas-zen-landscape\.svg"\)/);
  assert.match(svg, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.ok(!svg.includes("<script"));
  assert.ok(!svg.includes("http://fonts"));
  assert.match(catalog, /<IdeasDiscovery locale=\{locale\}/);
  assert.match(spanish, /<IdeasDiscovery locale="es"/);
  assert.match(spanish, /<IdeasNewsFeed locale="es"/);
  assert.match(localized, /<IdeasNewsFeed locale=\{locale as Locale\}/);
});

test("approved image-based reference renders a real Dao card, expandable meaning and sourced three-column aphorisms", () => {
  const ui = read("components/ideas-discovery.tsx");
  const css = read("components/ideas-discovery.module.css");
  const browser = read("scripts/verify-ideas-mobile-browser.mjs");
  for(const marker of ["data-ideas-dao-card", "data-ideas-aphorisms", "daoInterpretation", "daoGlyphCard", "daoPoint", "daoExpanded", "t.topicStep[topic]"]) {
    assert.ok(ui.includes(marker), marker + " missing in interactive component");
  }
  assert.match(ui, /<details className=\{styles\.daoExpanded\} open=\{example\}>/);
  assert.match(ui, /getIdeasAphorismMatches\(question, answerLocale, result\.topic\)/);
  assert.match(ui, /href=\{item\.source\.url\}/);
  assert.match(ui, /accept="\.txt,\.md,text\/plain,text\/markdown"/);
  assert.ok(!ui.includes("navigator.clipboard"), "question must not be copied implicitly");
  assert.match(css, /ideas-pine-reference\.webp/);
  assert.match(css, /\.aphorisms \{ display:grid; grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /\.daoPoint p \{ font-size:12px/);
  assert.match(browser, /Ideas mobile browser acceptance passed/);
});

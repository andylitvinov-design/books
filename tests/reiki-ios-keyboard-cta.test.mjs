import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const learner = read("components/energywork-ai-learner.tsx");
const css = read("components/energywork-ai-learner.module.css");
const keyboard = css.slice(css.indexOf("/* REIKI iOS KEYBOARD CTA"));

test("iOS keyboard measurements move the full lesson to the visible viewport", () => {
  assert.match(learner, /const pageRef = useRef<HTMLElement \| null>\(null\)/);
  assert.match(learner, /<main ref=\{pageRef\}/);
  assert.match(learner, /const viewport = window\.visualViewport/);
  assert.match(learner, /viewport\.height > 180 && obscured > 100/);
  assert.match(learner, /page\.style\.setProperty\("--reiki-visual-height"/);
  assert.match(learner, /page\.style\.setProperty\("--reiki-visual-top"/);
  assert.match(keyboard, /\[data-reiki-keyboard-open="true"\] \{[\s\S]*?height: var\(--reiki-visual-height, 100dvh\)/);
  assert.match(keyboard, /top: var\(--reiki-visual-top, 0px\)/);
});

test("editing and blur do not hide Continue until the keyboard finishes closing", () => {
  assert.match(learner, /active\.matches\('textarea, input:not/);
  assert.match(learner, /editing \|\| page\.dataset\.reikiKeyboardOpen === "true"/);
  for (const event of ["resize", "scroll"]) {
    assert.match(learner, new RegExp('viewport\\.addEventListener\\("' + event + '", updateKeyboardViewport\\)'));
    assert.match(learner, new RegExp('viewport\\.removeEventListener\\("' + event + '", updateKeyboardViewport\\)'));
  }
  for (const event of ["focusin", "focusout"]) {
    assert.match(learner, new RegExp('document\\.addEventListener\\("' + event + '", updateKeyboardViewport\\)'));
    assert.match(learner, new RegExp('document\\.removeEventListener\\("' + event + '", updateKeyboardViewport\\)'));
  }
  assert.match(learner, /delete page\.dataset\.reikiKeyboardOpen/);
  assert.match(keyboard, /\.footer \{[\s\S]*?order: 5/);
  assert.match(keyboard, /\.next \{\s*min-height: 48px/);
  assert.match(learner, /data-energywork-next/);
});

test("keyboard mode keeps written questions scrollable and leaves desktop untouched", () => {
  assert.ok(keyboard.startsWith("/* REIKI iOS KEYBOARD CTA"));
  assert.match(keyboard, /@media screen and \(max-width: 760px\)/);
  assert.match(keyboard, /\.slideMain \{[\s\S]*?overflow-y: auto/);
  assert.match(keyboard, /scroll-padding-bottom: 16px/);
  assert.match(keyboard, /:is\(\.journey, \.progressFooter, \.programme\)/);
  assert.doesNotMatch(keyboard, /\.slideMain\s*\{[^}]*overflow-y:\s*hidden/);
  assert.match(css, /\.page\[data-course-portrait="v3"\]\[data-reiki-text-question="true"\] \.textarea/);
});

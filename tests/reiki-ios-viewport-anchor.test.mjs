import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("iPhone Reiki lessons lock only the underlying document, not other pages", () => {
  const globalStyles = read("app/globals.css");
  const scoped = globalStyles.slice(globalStyles.indexOf("/* iOS Safari: keep the immersive Reiki lesson"));
  assert.ok(scoped.startsWith("/* iOS Safari: keep the immersive Reiki lesson"));
  assert.match(scoped, /@media screen and \(max-width: 760px\)/);
  assert.match(scoped, /html:has\(main\[data-energywork-ai-learner\]\),\s*body:has\(main\[data-energywork-ai-learner\]\)/);
  assert.match(scoped, /height: 100%;\s*overflow: hidden;\s*overscroll-behavior: none/);
  assert.match(scoped, /scroll-behavior: auto/);
  assert.doesNotMatch(scoped, /body\s*\{\s*overflow: hidden/);
});

test("course and bottom controls stay attached to the dynamic viewport", () => {
  const styles = read("components/energywork-ai-learner.module.css");
  const viewport = styles.slice(styles.indexOf("/* iOS Safari: anchor every Reiki lesson"));
  assert.ok(viewport.startsWith("/* iOS Safari: anchor every Reiki lesson"));
  assert.match(viewport, /position: fixed;\s*inset: 0/);
  assert.match(viewport, /height: 100dvh;\s*max-height: 100dvh/);
  assert.match(viewport, /\.shell \{[\s\S]*?height: 100%;[\s\S]*?overflow: hidden/);
  assert.match(styles, /\.page\[data-course-theme\] \.slideMain \{[\s\S]*?overflow-y: auto/);
  const learner = read("components/energywork-ai-learner.tsx");
  assert.match(learner, /data-energywork-ai-learner/);
  assert.match(learner, /window\.scrollTo\(0, 0\)/);
  assert.match(learner, /window\.addEventListener\("pageshow", keepCourseAtTop\)/);
  assert.match(learner, /\}, \[index\]\);/);
});


test("short Russian video lessons reclaim only vertical whitespace", () => {
  const styles = read("components/energywork-ai-learner.module.css");
  const compact = styles.slice(styles.indexOf("/* Preserve the RU video poster width"));
  assert.ok(compact.startsWith("/* Preserve the RU video poster width"));
  assert.match(compact, /@media \(max-width: 760px\) and \(max-height: 700px\)/);
  const video = '.page[lang="ru"][data-course-portrait="v3"] [data-energywork-slide-kind="video"]';
  assert.ok(compact.includes(video + ' .video {\n    padding: 3px 9px;'));
  assert.ok(compact.includes(video + ' .slideMain {\n    gap: 6px;\n    padding-block: 8px;'));
  assert.doesNotMatch(compact, /^\s*(?:font-size|line-height|display|overflow|height|width|clip|opacity):/m);
  assert.doesNotMatch(compact, /data-energywork-slide-id/); // Covers all four videos, not just the failing first one.
});

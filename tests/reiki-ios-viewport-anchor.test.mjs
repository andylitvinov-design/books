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

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../components/client-assessment-invite.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../components/client-assessment-invite.module.css", import.meta.url), "utf8");

test("end-of-tests invitation keeps four selectable topics and the correct handoff", () => {
  assert.match(component, /const topics: Topic\[\] = \["personal", "goal", "business", "wellbeing"\]/);
  assert.match(component, /aria-pressed=\{topic === option\}/);
  assert.match(component, /onClick=\{\(\) => setTopic\(option\)\}/);
  assert.match(component, /free-situation-review\?topic=" \+ topic/);
  assert.match(component, /data-monitor-action="free-situation-review"/);
  assert.equal((component.match(/<Link\b/g) || []).length, 1, "Only one navigation CTA is visible");
});

test("compact EN/RU/ES copy preserves the written-review and safety meaning", () => {
  for (const value of [
    "Free drawing-based situation review",
    "Бесплатная диагностика по рисунку",
    "Evaluación gratuita mediante dibujo",
    "Personal situation", "Личная ситуация", "Situación personal",
    "not a medical diagnosis",
    "не медицинский диагноз",
    "no un diagnóstico médico",
  ]) assert.ok(component.includes(value), "Missing expected copy: " + value);
  assert.doesNotMatch(component, /className=\{styles\.(?:trust|art|kicker)\}/);
  assert.doesNotMatch(component, /\{t\.note\}/);
});

test("mobile invitation has compact two-column topics and one full-width action", () => {
  assert.match(styles, /@media\(max-width:720px\)/);
  assert.match(styles, /\.options\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.action\{justify-self:stretch;width:100%/);
  assert.match(styles, /focus-visible/);
});

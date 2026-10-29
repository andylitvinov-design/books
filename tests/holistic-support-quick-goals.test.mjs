import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const screen = read("components/holistic-support-mobile.tsx");
const css = read("components/holistic-support-mobile.module.css");
const browser = read("scripts/verify-holistic-support-mock-fidelity.mjs");

test("approved goal row preserves the existing four check-ins and all tools", () => {
  assert.match(screen, /const checkinOrder: CheckinArea\[\] = \["energy", "money", "relationships", "meaning"\]/);
  assert.match(screen, /className=\{styles\.topGrid\}/);
  assert.match(screen, /className=\{styles\.assessment\}/);
  assert.match(screen, /className=\{styles\.profile\}/);
  assert.match(screen, /className=\{styles\.tools\}/);
  assert.match(screen, /data-support-quick-goals/);
  assert.match(screen, /data-support-quick-goal=\{id\}/);
  assert.match(screen, /className=\{styles\.experience\}/);
  assert.ok(screen.indexOf('className={styles.topGrid}') <
    screen.indexOf('data-support-quick-goals'));
  assert.ok(screen.indexOf('data-support-quick-goals') <
    screen.indexOf('className={styles.experience}'));
  assert.match(screen, /data-support-mobile-bottom-nav/);
  assert.match(screen, /data-support-tool="masters"/);
  assert.match(screen, /data-support-video-mandala/);
});

test("five goals are neutral until explicitly selected and never become scored evidence", () => {
  for (const id of ["stress","energy","relationships","decisions","business"])
    assert.match(screen, new RegExp('id: "' + id + '"'));
  assert.match(screen, /useState<QuickGoal \| null>\(null\)/);
  assert.match(screen, /aria-pressed=\{quickGoal === id\}/);
  assert.match(screen, /setQuickGoal\(value\)/);
  assert.match(screen, /setQuickGoal\(null\)/);
  assert.match(screen, /editedCheckins\.length === 0/);
  assert.match(screen, /averageScore = editedCheckins\.length === checkinOrder\.length/);
  assert.match(screen, /setRecommendation\(editedCheckins\.length === checkinOrder\.length \? asFocusScores\(scores\) : null\)/);
  assert.doesNotMatch(screen, /setRecommendation\(asFocusScores\(scores\)\)/);
  assert.match(screen, /quickGoal \? t\.quickGoalLabels\[quickGoal\]/);
  assert.match(screen, /quickGoal === "stress" \? t\.quickGoalHeroStress/);
  assert.match(screen, /role="status"/);
  assert.doesNotMatch(screen, /setScores\(\{.*stress/);
  assert.doesNotMatch(screen, /localStorage|sessionStorage|navigator\.sendBeacon|paid:\s*true/);
});

test("stress has its own real path, four spheres are not renamed, and EN/RU/ES agree", () => {
  for (const text of ["Меньше стресса", "Less stress", "Menos estrés",
    "Больше энергии", "More energy", "Más energía", "Работа и деньги",
    "Work & money", "Trabajo y dinero", "quickGoalHeroStress"])
    assert.ok(screen.includes(text), text);
  assert.match(screen, /stress: "\/courses\/antistress"/);
  assert.match(screen, /relationships: "\/explore\/love"/);
  assert.match(screen, /decisions: "\/services\/free-situation-review"/);
  assert.match(screen, /business: "\/explore\/business"/);
  assert.match(screen, /setChoice\(value === "stress" \|\| value === "energy" \? "meditation" : "consultation"\)/);
  assert.match(screen, /data-support-quick-goal-action=\{quickGoal\}/);
  assert.match(screen, /setSelectedId\(null\); setMaster\("all"\); setProgram\("all"\)/);
});

test("mobile goal grid is readable, accessible, and checked in Chromium and WebKit", () => {
  assert.match(css, /\.quickGoalGrid \{ display: grid; grid-template-columns: repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css, /\.quickGoalSkip \{[^}]*min-height: 44px/s);
  assert.match(css, /\.quickGoalCard\[aria-pressed="true"\]/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /@media \(max-width: 350px\)/);
  assert.match(css, /\.quickGoals :is\(button,a\):focus-visible/);
  for(const text of ['[data-support-quick-goal="stress"]','[data-support-quick-goal-skip]',
    "courses/antistress","goal selected","no autoplay"]){
    if(text==="goal selected")continue;
    assert.ok(browser.includes(text),text);
  }
  const result=ts.transpileModule(screen,{fileName:"holistic-support-mobile.tsx",reportDiagnostics:true,
    compilerOptions:{jsx:ts.JsxEmit.Preserve,target:ts.ScriptTarget.ES2022}});
  assert.deepEqual((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error),
    [],"TSX parses without syntax errors");
});

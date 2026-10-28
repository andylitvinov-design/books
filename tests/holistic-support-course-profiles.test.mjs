import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const home = read("components/holistic-support-mobile.tsx");
const profiles = read("components/holistic-support-course-profiles.tsx");
const style = read("components/holistic-support-course-profiles.module.css");
const filter = read("components/holistic-support-goal-filter.tsx");

test("Courses shortcut opens four real profile tabs in the same mobile shell", () => {
  assert.match(home, /data-support-tool="pump"/);
  assert.match(home, /choice === "pump" \? \(\s*<HolisticSupportCourseProfiles/);
  for (const sector of ["energy", "money", "love", "meaning"]) {
    assert.match(profiles, new RegExp('id: "' + sector + '"'));
    assert.match(profiles, new RegExp('data-support-profile=\\{id\\}'));
  }
  for (const label of ["Профиль здоровья", "Профиль денег", "Профиль отношений", "Профиль смыслов"]) {
    assert.ok(profiles.includes(label), label);
  }
  assert.match(profiles, /aria-pressed=\{active === id\}/);
  assert.match(style, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(style, /@media \(max-width:640px\)/);
  assert.match(style, /@media \(max-width:350px\)/);
});

test("scenic background is the exact bundled original video hero", () => {
  assert.match(profiles, /support-mock-hero\.webp/);
  assert.match(home, /support-mock-hero\.webp/);
  assert.match(profiles, /data-support-profile-hero/);
  assert.match(style, /object-fit:cover/);
  assert.match(style, /prefers-reduced-motion/);
});

test("three hero actions are real, localized, and preserve existing diagnostic flow", () => {
  for (const action of ["test", "fill", "recommend"]) {
    assert.ok(profiles.includes("data-support-profile-" + action), action);
  }
  for (const label of ["Пройти тест", "Заполнить профиль", "Получить рекомендации",
    "Take a test", "Fill in profile", "Get recommendations",
    "Hacer un test", "Completar perfil", "Ver recomendaciones"]) {
    assert.ok(profiles.includes(label), label);
  }
  assert.match(home, /onTests=\{\(\) => changeChoice\("tests"\)\}/);
  assert.match(home, /onFillProfile=\{openCourseProfileFilter\}/);
  assert.match(home, /onRecommendations=\{showCourseProfileRecommendations\}/);
  assert.match(home, /if \(!saved \|\| saved\.checkin !== scores\[goalSectorCheckinKey\[sector\]\]\) \{/);
  assert.match(home, /openCourseProfileFilter\(sector\); return;/);
  assert.match(home, /applyGoalFilter\(\{ \.\.\.saved, sector, savedSectors: goalSavedSectors/);
  assert.match(filter, /preferredSector\?: GoalSector/);
  assert.match(filter, /initialSector = preferredSector \?\? initial\?\.sector/);
});

test("existing academy links remain available and no storage or fabricated reports are introduced", () => {
  assert.match(profiles, /\/academy\/reiki\/tantra-reiki\/discover/);
  assert.match(profiles, /\/academy\`/);
  assert.match(profiles, /courses\.map\(course => <Link href=\{course\.href\}/);
  assert.match(profiles, /solo|only until|до закрытия страницы/i);
  assert.doesNotMatch(profiles, /localStorage|sessionStorage|fetch\(|paid:\s*true|success:\s*true/);
});

test("profile TSX and diagnostic selection parse as TSX", () => {
  for (const [name, source] of [["profiles", profiles], ["home", home], ["filter", filter]]) {
    const result = ts.transpileModule(source, {
      fileName: name + ".tsx", reportDiagnostics: true,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    });
    const errors = (result.diagnostics ?? []).filter(item => item.category === ts.DiagnosticCategory.Error);
    assert.deepEqual(errors.map(item => ts.flattenDiagnosticMessageText(item.messageText, " ")), [], name);
  }
});

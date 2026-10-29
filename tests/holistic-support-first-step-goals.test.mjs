import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { quickGoalSelection, goalTopicForSelection, rankSupportGoalVideos } from "../lib/holistic-support/goal-filter.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const page = read("components/holistic-support-mobile.tsx");
const css = read("components/holistic-support-mobile.module.css");

test("five visible goals reuse the four canonical profile sectors and real editorial options", () => {
  const expected = {
    stress: ["energy", "stress", "stayCalm", "energy"],
    energy: ["energy", "lowEnergy", "moreEnergy", "energy"],
    relationships: ["love", "conflicts", "communication", "love"],
    decision: ["meaning", "uncertainty", "direction", "business"],
    work: ["money", "workStuck", "clearPlan", "business"],
  };
  for (const [id, [sector, concern, task, topic]] of Object.entries(expected)) {
    const selection = quickGoalSelection(id);
    assert.equal(selection.sector, sector);
    assert.deepEqual(selection.concerns, [concern]);
    assert.deepEqual(selection.tasks, [task]);
    assert.deepEqual(selection.ratings, {});
    assert.equal(Object.hasOwn(selection, "checkin"), false,
      id + " must not inherit an untouched 5/10 as a user rating");
    assert.equal(goalTopicForSelection(selection), topic);
  }
  assert.equal(quickGoalSelection("unknown"), null);
  assert.equal(quickGoalSelection(null), null);
  assert.equal(quickGoalSelection("__proto__"), null);
  assert.equal(quickGoalSelection("stress", 0).checkin, undefined);
  assert.equal(quickGoalSelection("stress", 11).checkin, undefined);
  assert.equal(quickGoalSelection("stress", 5).checkin, 5);
});

test("goals are source-backed relevance filters, not fake diagnoses, payments or videos", () => {
  const videos = [
    {id:"A1234567890", title:"Calm recording", topics:["health"], sourceLanguage:"en"},
    {id:"B1234567890", title:"Business recording", topics:["business"], sourceLanguage:"en"},
    {id:"C1234567890", title:"Energy recording", topics:["energy"], sourceLanguage:"ru"},
  ];
  const work = rankSupportGoalVideos({selection:quickGoalSelection("work"),videos,locale:"en"});
  assert.equal(work.videos[0].id, "B1234567890");
  assert.equal(work.matchedVideo, true);
  const stress = rankSupportGoalVideos({selection:quickGoalSelection("stress"),videos,locale:"ru"});
  assert.equal(stress.videos[0].id, "C1234567890");
  assert.equal(stress.topic, "energy");
  assert.equal(rankSupportGoalVideos({selection:quickGoalSelection("relationships"),videos}).matchedVideo, false);
});

test("the approved new band lives between the old full check-in and original real media", () => {
  assert.ok(page.indexOf("className={styles.topGrid}") < page.indexOf("data-support-quick-goals"));
  assert.ok(page.indexOf("data-support-quick-goals") < page.indexOf("className={styles.experience}"));
  assert.match(page, /const checkinOrder: CheckinArea\[\] = \["energy", "money", "relationships", "meaning"\]/);
  assert.match(page, /editedCheckins\.includes\(quickCheckinArea\) \? scores\[quickCheckinArea\] : undefined/);
  assert.match(page, /if \(quickSelection\) setGoalSelection\(quickSelection\)/);
  assert.match(page, /setQuickGoalId\(null\); \/\/ Detailed user-confirmed goal replaces quick choice/);
  assert.match(page, /data-support-quick-goal=\{id\}/);
  assert.match(page, /aria-pressed=\{quickGoalId === id\}/);
  assert.match(page, /data-support-quick-skip/);
  for (const id of ["stress","energy","relationships","decision","work"]) {
    assert.ok(page.includes('id: "' + id + '"'), id);
  }
  for (const label of ["3. Что хотите улучшить сейчас?", "3. What would you like to improve?",
    "3. ¿Qué quieres mejorar hoy?", "Меньше стресса", "Menos estrés", "Less stress"]) {
    assert.ok(page.includes(label), label);
  }
  assert.match(css,/\.quickGoalGrid/);
  assert.match(css,/scroll-snap-type: x proximity/);
  assert.match(css,/\.quickGoalTile\[aria-pressed="true"\]/);
  assert.match(page,/\{editedCheckins\.length === checkinOrder\.length \? averageScore \+ "\/10" : "—"\}/);
  assert.doesNotMatch(page, /fetch\(|localStorage|sessionStorage|navigator\.sendBeacon/);
});

test("screen still parses as TSX and retains authenticated routes and source media player", () => {
  const output=ts.transpileModule(page,{fileName:"holistic-support-mobile.tsx",
    compilerOptions:{jsx:ts.JsxEmit.Preserve,target:ts.ScriptTarget.ES2022},
    reportDiagnostics:true});
  assert.deepEqual((output.diagnostics||[]).map(d=>ts.flattenDiagnosticMessageText(d.messageText,"\n")),[]);
  for (const text of ["support-meditation-player","youtube-nocookie.com/embed","data-support-tool=\"masters\"",
    "data-support-tool=\"tests\"","data-support-video-mandala",
    "HolisticSupportInlineGuide","HolisticSupportGoalFilter","data-support-mobile-bottom-nav"]) {
    assert.ok(page.includes(text),text);
  }
});

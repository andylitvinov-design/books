import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {energyworkLessonRanges, energyworkSequence} from "../data/academy/energywork-ai-schema.js";
const read = path => readFileSync(new URL("../"+path, import.meta.url), "utf8");
test("Reiki Daybook groups every canonical slide into five variable-length weeks, including welcome and final photo", () => {
  const sequence = energyworkSequence();
  const weeks = energyworkLessonRanges().map((range,i)=>sequence.slice(i===0?0:range.start,range.end));
  assert.equal(weeks.length,5);
  assert.deepEqual(weeks.flat(),sequence);
  assert.deepEqual(weeks.map(week=>week.length),[11,16,18,16,7]);
  assert.equal(weeks[0][0],"welcome-01");
  assert.ok(weeks[4].includes("init-photo-01"));
  assert.equal(weeks[4].at(-1),"end-02");
});
test("Classic route stays available; alternative uses the same curriculum, private cursor and auth return", () => {
  const ui=read("components/energywork-ai-learner.tsx");
  const route=read("app/[locale]/academy/[[...slug]]/page.tsx");
  const api=read("app/api/app/[...path]/route.js");
  assert.ok(route.includes('layout="daybook"'));
  assert.ok(route.includes('key === "principles-of-energywork/learn"'));
  assert.ok(ui.includes("energyworkLessonRanges()"));
  assert.ok(ui.includes("position <= daybookFrontier"));
  assert.ok(ui.includes('if (daybook && !daybookCanOpen(target)) return;'));
  assert.ok(ui.includes('daybook ? { continueTo: "energywork-daybook" } : { continueTo: "energywork" }'));
  assert.ok(api.includes("/academy/principles-of-energywork/daybook"));
  assert.ok(ui.includes('data-cabinet-theme": "daybook"'));
  assert.ok(ui.includes('slides.slice(activeWeek.start, activeWeek.end)'));
  assert.ok(read("components/principles-of-energywork.tsx").includes("data-reiki-daybook-entry"));
});

test("Daybook is reachable from discovery and from the learner's saved slide", () => {
  const catalog = read("components/app/profile-courses-switch.jsx");
  const cabinet = read("components/app/cabinet-free-course-banners.jsx");
  assert.ok(catalog.includes("data-reiki-daybook-discover"));
  assert.ok(catalog.includes("/academy/principles-of-energywork/daybook"));
  assert.ok(cabinet.includes("/daybook?slide=' + encodeURIComponent(academyProgress.slideId)"));
});

test("both learner formats can load private course media under the same scoped policy", () => {
  const middleware = read("middleware.ts");
  const matcher = middleware.match(/const reikiLessonAudioPage = \/(.+?)\/\.test\(pathname\)/);
  assert.ok(matcher, "course media must be scoped to learner routes");
  const learnerPage = new RegExp(matcher[1]);
  for (const locale of ["en", "ru", "es"]) {
    for (const page of ["learn", "daybook"]) {
      assert.ok(learnerPage.test(`/${locale}/academy/principles-of-energywork/${page}`));
    }
    assert.equal(learnerPage.test(`/${locale}/academy/principles-of-energywork`), false);
    assert.equal(learnerPage.test(`/${locale}/academy/principles-of-energywork/daybook-other`), false);
  }
  assert.ok(read("components/reiki-initiation-photo.tsx").includes("reader.readAsDataURL(file)"));
});

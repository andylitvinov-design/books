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

test("Immersive Daybook shares the canonical five themes, current week and owned media", () => {
  const ui = read("components/energywork-ai-learner.tsx");
  const css = read("components/reiki-daybook.module.css");
  assert.ok(ui.includes('"data-reiki-daybook-design": "immersive-v2"'));
  assert.ok(ui.includes('"data-reiki-week": activeWeek.lesson'));
  assert.ok(ui.includes("REIKI_DAYBOOK_ART[activeWeek.lesson - 1]"));
  assert.ok(ui.includes("tantra-reiki-yin-yang-cover.svg"));
  assert.ok(ui.includes("slide.image ?? weekArt"));
  assert.ok(ui.includes("diagramArt"));
  assert.ok(ui.includes("data-reiki-art-layout"));
  assert.ok(ui.includes("5 weeks · 3 Reiki traditions"));
  assert.ok(ui.includes("5 недель · 3 системы Рейки"));
  assert.ok(ui.includes("styles.eyebrow"));
  assert.ok(ui.includes("daybookStyles.weekTitle"));
  assert.ok(ui.includes("daybookStyles.weekNumber"));
  assert.ok(ui.includes("compact={daybook}"));
  assert.ok(ui.includes('window.scrollTo({ top: 0, behavior: "auto" })'));
  for (const week of [2,3,4,5]) assert.ok(css.includes('[data-reiki-week="'+week+'"]'));
  assert.ok(css.includes("--db-accent"));
  assert.ok(css.includes('[data-reiki-art-layout="background"]'));
  assert.ok(css.includes('[data-daybook-cover="true"]'));
  assert.ok(css.includes('[data-reiki-diagram]'));
  assert.ok(css.includes('order:-1;z-index:1'));
  assert.ok(css.includes('env(safe-area-inset-bottom)'));
  assert.ok(css.includes("min-height:44px"));
  assert.ok(ui.indexOf("{lesson}\n        {progressPanel}\n        {daybook && controls}") >= 0);
  assert.ok(ui.includes("position < daybookFrontier"));
  assert.ok(ui.includes('sync === "ready" && courseCompleted'));
});

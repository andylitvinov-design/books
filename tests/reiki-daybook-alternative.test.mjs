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
  assert.ok(ui.includes('"data-reiki-daybook-design": "golden-one-screen-v3"'));
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
  assert.ok(css.includes('order:0;flex:none'));
  assert.ok(css.includes('env(safe-area-inset-bottom)'));
  assert.ok(css.includes("min-height:44px"));
  assert.ok(ui.includes('data-daybook-part="bottom-status">{progressPanel}{courseTools}'));
  assert.ok(ui.includes("position < daybookFrontier"));
  assert.ok(ui.includes('sync === "ready" && courseCompleted'));
});

test("Approved golden Reiki welcome is a single real screen with one primary action and no trailing course sections", () => {
  const ui = read("components/energywork-ai-learner.tsx");
  const css = read("components/reiki-daybook.module.css");
  assert.ok(ui.includes('const daybookWelcome = daybook && slide.id === "welcome-01"'));
  assert.ok(ui.includes('const lesson = daybookWelcome ? ('));
  assert.ok(ui.includes('data-daybook-part="welcome-about"'));
  assert.ok(ui.includes('daybookStyles.welcomeHero'));
  assert.ok(ui.includes('Begin your journey'));
  assert.ok(ui.includes('Request a free Level 1 initiation'));
  assert.ok(ui.includes('!daybookWelcome ? <>'));
  assert.ok(ui.includes('</> : controls}'));
  assert.ok(ui.includes(') : !daybookWelcome ? ('));
  assert.ok(ui.includes('"data-daybook-welcome-screen": daybookWelcome ? "true" : undefined'));
  assert.ok(ui.includes('value={weeklyCompleted}'));
  assert.ok(ui.includes('{count}/{range.count}'));
  assert.ok(css.includes('position:fixed;inset:0;z-index:110'));
  assert.ok(css.includes('height:100dvh;max-height:100dvh;min-height:0'));
  assert.ok(css.includes('env(safe-area-inset-bottom)'));
  assert.ok(css.includes('@media(max-height:720px)'));
});

test("Golden Daybook is viewport-bound on every slide, with all controls and disclosures retained", () => {
  const ui = read("components/energywork-ai-learner.tsx");
  const css = read("components/reiki-daybook.module.css").split("/* APPROVED GOLDEN ONE-SCREEN V3")[1];
  assert.ok(css);
  assert.ok(ui.includes('data-daybook-tools'));
  assert.ok(ui.includes('data-daybook-outline'));
  assert.ok(ui.includes('daybookWelcome ? (\n          <header'));
  assert.ok(ui.includes('{daybook ? lessonArt : null}'));
  assert.ok(ui.includes('{daybook ? lessonVideoBlock : null}'));
  assert.ok(ui.includes('{daybook ? controls : <>{programme}{controls}</>}'));
  assert.ok(css.includes('overflow:hidden;overscroll-behavior:none'));
  assert.ok(css.includes('flex:1 1 0;display:block;min-height:0'));
  assert.ok(css.includes('overflow-y:auto;overflow-x:hidden'));
  assert.ok(css.includes('data-sitewide-capture'));
  assert.ok(css.includes('var(--reiki-visual-height,100dvh)'));
  assert.ok(css.includes('env(safe-area-inset-bottom)'));
  assert.ok(css.includes('data-reiki-keyboard-open'));
  assert.ok(css.includes('data-daybook-density="activity"'));
  assert.ok(css.includes('data-reiki-diagram'));
  assert.ok(css.includes('max-height:min(60dvh,450px)'));
  assert.ok(ui.includes('window.dispatchEvent(new Event("hh:open-ihelp"))'));
  assert.ok(ui.includes('position <= daybookFrontier'));
});

test("Daybook content fit retains every canonical step and moves ordinary chrome to its menu", () => {
  const ui = read("components/energywork-ai-learner.tsx");
  const css = read("components/reiki-daybook.module.css").split("/* One-screen content fit")[1];
  const audio = read("components/reiki-lesson-intro-audio.tsx");
  const browser = read("scripts/verify-reiki-all-slides-browser.mjs");
  assert.ok(css.includes("container-type:size"));
  assert.ok(css.includes("max-height:min(210px,38cqh)"));
  assert.ok(css.includes("min-height:44px"));
  assert.ok(css.includes(".weekTitle,small"));
  assert.ok(ui.includes("daybookSaveNeedsAttention"));
  assert.ok(ui.includes("!daybookSaveNeedsAttention ? saveStatusPanel"));
  assert.ok(ui.includes("forwardOptionalAudio.current = daybook && !alreadyStored"));
  assert.ok(ui.includes("void next();"));
  assert.ok(audio.includes("if (ok && !published) onUnpublished?.(lesson)"));
  assert.ok(browser.includes("owner-reported slide must fit without inner scroll"));
  assert.ok(browser.includes("all answers simultaneously visible"));
  assert.ok(browser.includes("width:390,height:660"));
});

test("Approved Reiki tools remove duplicate controls, keep journey navigation and offer private master contact", () => {
  const ui = read("components/energywork-ai-learner.tsx");
  const css = read("components/reiki-daybook.module.css");
  const menu = ui.split("const courseTools = (")[1].split("const shell = (")[0];
  assert.ok(menu.indexOf("t.backCourse") < menu.indexOf("iHelp"));
  assert.ok(menu.indexOf("iHelp") < menu.indexOf("ReikiCourseReferralShare"));
  assert.ok(!menu.includes("switchFormat"));
  assert.ok(!menu.includes("db.steps"));
  assert.ok(menu.includes("Send a message / question to master"));
  assert.ok(menu.includes("href={masterQuestionUrl}"));
  assert.ok(ui.includes("{daybookOutline}"));
  assert.ok(ui.includes("I have a question about the Reiki Practitioner course."));
  assert.ok(css.includes("grid-template-columns:minmax(0,1.5fr) minmax(0,1fr) minmax(0,1fr)"));
  assert.ok(css.includes(".masterQuestion"));
});

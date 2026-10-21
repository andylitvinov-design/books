import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { reikiTomorrowCalendar, REIKI_LESSON_REMINDER_DEFAULT } from "../lib/academy/reiki-lesson-calendar.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const learner = read("components/energywork-ai-learner.tsx");
const css = read("components/energywork-ai-learner.module.css");

test("milestone opens an extra mobile-first screen with two save-or-continue options", () => {
  assert.match(learner, /data-reiki-lesson-choice-screen/);
  assert.match(learner, /data-reiki-save-tomorrow/);
  assert.match(learner, /data-reiki-continue-now/);
  assert.match(learner, /data-reiki-tomorrow-choice/);
  assert.match(learner, /data-energywork-next/);
  assert.match(learner, /decisionSave: "Save and return tomorrow"/);
  assert.match(learner, /decisionSave: "Сохранить и продолжить завтра"/);
  assert.match(learner, /decisionContinue: "Continue now"/);
  assert.match(learner, /decisionContinue: "Продолжить сейчас"/);
  assert.match(learner, /onClick=\{finishForToday\}/);
  assert.match(learner, /if \(slide\.kind === "milestone" && slide\.id !== "flight-save" && !milestoneDecision\)/);
  assert.match(learner, /slide\.kind !== "milestone" && !completed/);
  assert.doesNotMatch(learner, /data-reiki-milestone-choices|reminderSetupOpen|downloadTomorrowReminder/);
  assert.doesNotMatch(learner, /Notification\.requestPermission|pushManager\.subscribe/);
  assert.match(css, /\.lessonDecision/);
  assert.match(css, /\.decisionActions/);
  assert.match(css, /@media \(max-width: 430px\)/);
});

test("guest must consent and authenticate before server save and post-save install", () => {
  assert.match(learner, /if \(sync === "guest" \|\| sync === "consent"\)/);
  assert.match(learner, /setIndex\(slides\.findIndex\(item => item\.id === "flight-save"\)\)/);
  assert.match(learner, /data-reiki-first-lesson-consent/);
  assert.match(learner, /data-reiki-first-lesson-google-save/);
  assert.match(learner, /window\.sessionStorage\.setItem\(ENERGYWORK_FIRST_LESSON_STORAGE_KEY, value\)/);
  assert.match(learner, /if \(sync === "guest"\) await signIn\(\)/);
  assert.match(learner, /hydrate\(value\); \/\/ Private server persistence is confirmed before the app offer\./);
  assert.match(learner, /await store\(nextId\);\s*setShowInstallOffer\(true\)/);
  assert.match(learner, /if \(showInstallOffer && sync === "ready"\)/);
  assert.match(learner, /data-reiki-install-offer/);
  assert.match(learner, /href=\{"\/" \+ locale \+ "\/install"\}/);
  assert.match(learner, /href=\{"\/" \+ locale \+ "\/app\/course\?view=courses"\}/);
  assert.match(learner, /installPageNote: "Установка приложения не включает напоминания/);
  assert.match(css, /\.installOfferPage/);
  assert.match(css, /position: fixed; inset: 0/);
});
test("optional calendar utility remains neutral but is not part of the save path", () => {
  assert.equal(REIKI_LESSON_REMINDER_DEFAULT, "19:00");
  const at = new Date(2026, 9, 21, 23, 52, 0);
  const event = reikiTomorrowCalendar("ru", "19:30", at);
  assert.match(event, /^BEGIN:VCALENDAR\r\n/);
  assert.match(event, /DTSTART:20261022T193000\r\n/);
  assert.match(event, /BEGIN:VALARM\r\nACTION:DISPLAY\r\n/);
  assert.doesNotMatch(event, /patient|health|remedy|diagnos|assessment|token|\?slide=/i);
  assert.doesNotMatch(learner, /onClick=\{downloadTomorrowReminder\}/);
});

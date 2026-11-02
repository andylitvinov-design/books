import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { reikiTomorrowCalendar, REIKI_LESSON_REMINDER_DEFAULT } from "../lib/academy/reiki-lesson-calendar.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const learner = read("components/energywork-ai-learner.tsx");
const css = read("components/energywork-ai-learner.module.css");
const schema = read("data/academy/energywork-ai-schema.js");

test("Lesson 1 has one celebration and separate finish today / continue buttons", () => {
  const inline = learner.split("data-reiki-milestone-choices>")[1].split("</div>")[0];
  const footer = learner.split("<footer className={styles.footer}>")[1];
  assert.ok(inline && footer);
  assert.match(inline, /data-reiki-tomorrow-choice/);
  assert.match(inline, /onClick={finishForToday}/);
  assert.doesNotMatch(inline, /data-energywork-next|milestoneContinueChoice/);
  assert.match(footer, /onClick={next}[\s\S]*?data-energywork-next/);
  assert.match(footer, /data-reiki-first-lesson-google-save=/);
  assert.match(learner, /saveLessonOneToCabinet\("continue"\)/);
  assert.match(learner, /saveLessonOneToCabinet\("courses"\)/);
  const sequence = schema.slice(schema.indexOf("export function energyworkSequence"), schema.indexOf("export function energyworkAdvanceAlreadyStored"));
  assert.doesNotMatch(sequence, /'flight-save'/);
  assert.match(schema, /'flight-save': 'tan-01'/);
  assert.match(css, /\.milestoneInlineChoices/);
  assert.match(css, /\.milestoneActions/);
});

test("inline consent gates guest Google authentication and existing-account private save", () => {
  assert.match(learner, /slide.id === "flight-done" && \["guest", "consent"\]\.includes\(sync\)/);
  assert.match(learner, /data-reiki-first-lesson-save/);
  assert.match(learner, /data-reiki-first-lesson-consent/);
  assert.match(learner, /data-reiki-first-lesson-google-save/);
  assert.match(learner, /slide.id === "flight-done" && sync !== "ready" && !firstLessonConsent/);
  assert.match(learner, /window\.sessionStorage\.setItem\(ENERGYWORK_FIRST_LESSON_STORAGE_KEY, value\)/);
  assert.match(learner, /if \(sync === "guest"\) await signIn\(\)/);
  assert.match(learner, /firstLesson: \{ answers: handoff\.answers \}/);
  assert.match(learner, /hydrate\(value\); \/\/ Private server persistence is confirmed/);
  assert.match(learner, /if \(handoff\.afterSave === "courses"\) window\.location\.assign/);
  assert.doesNotMatch(learner, /showInstallOffer|data-reiki-save-dock|installOfferPage/);
  assert.doesNotMatch(learner, /Notification\.requestPermission|pushManager\.subscribe/);
});

test("optional calendar utility is neutral but not connected to this save path", () => {
  assert.equal(REIKI_LESSON_REMINDER_DEFAULT, "19:00");
  const at = new Date(2026, 9, 21, 23, 52, 0);
  const event = reikiTomorrowCalendar("ru", "19:30", at);
  assert.match(event, /^BEGIN:VCALENDAR\r\n/);
  assert.match(event, /DTSTART:20261022T193000\r\n/);
  assert.match(event, /BEGIN:VALARM\r\nACTION:DISPLAY\r\n/);
  assert.doesNotMatch(event, /patient|health|remedy|diagnos|assessment|token|\?slide=/i);
  assert.doesNotMatch(learner, /onClick={downloadTomorrowReminder}/);
});

test("one-screen phone layout retains an accessible CTA and one consent box", () => {
  assert.equal((learner.match(/data-reiki-first-lesson-google-save/g) || []).length, 1);
  assert.equal((learner.match(/data-reiki-first-lesson-consent/g) || []).length, 1);
  assert.match(learner, /data-reiki-first-lesson-gate=/);
  assert.match(learner, /<footer className={styles.footer}>/);
  assert.match(css, /data-reiki-first-lesson-gate="true"/);
  assert.match(css, /\[data-energywork-slide-id="flight-done"\] \.slideMain/);
  assert.match(css, /max-height: min\(16dvh, 110px\)/);
  assert.match(css, /min-height: 48px/);
  assert.match(css, /overflow-y: auto/);
  assert.doesNotMatch(css, /\.firstLessonSaveDock|\.installOfferPage/);
});

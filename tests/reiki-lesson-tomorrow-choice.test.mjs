import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { reikiTomorrowCalendar, REIKI_LESSON_REMINDER_DEFAULT } from "../lib/academy/reiki-lesson-calendar.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const learner = read("components/energywork-ai-learner.tsx");
const css = read("components/energywork-ai-learner.module.css");

test("all four lesson checkpoints offer tomorrow and continue-now choices without altering the 63-slide course", () => {
  assert.match(learner, /slide\.kind === "milestone" && slide\.id !== "flight-save" && reminderSetupOpen/);
  assert.match(learner, /data-reiki-tomorrow-choice/);
  assert.match(learner, /data-reiki-reminder-setup/);
  assert.match(learner, /data-energywork-next/);
  assert.match(learner, /continueNowSave: "Continue now — save lesson 1 first"/);
  assert.match(learner, /continueNow: "I'd like to continue now — next lesson"/);
  assert.match(learner, /tomorrowChoice: "Хорошая работа! До завтра — напомнить мне"/);
  assert.match(learner, /finishForToday\(\)[\s\S]*?await store\(nextId\)/);
  assert.match(learner, /sync === "ready" \? <button type="button" disabled=\{busy\}/);
  assert.match(learner, /slide\.id === "flight-done"[\s\S]*?t\.signInForTomorrow/);
  assert.match(learner, /href=\{"\/" \+ locale \+ "\/install"\}/);
  assert.match(learner, /href=\{"\/" \+ locale \+ "\/app\/settings#hh-phone-notifications"\}/);
  assert.match(learner, /app\/course\?view=courses/);
  assert.match(learner, /useEffect\(\(\) => \{ setReminderSetupOpen\(false\)/);
});
test("mobile choices are accessible and use no automatic push permission request", () => {
  assert.match(css, /@media \(max-width: 430px\)/);
  assert.match(css, /\.milestoneActions \.reminderChoice/);
  assert.match(css, /min-height: 66px/);
  assert.match(learner, /aria-expanded=\{reminderSetupOpen\}/);
  assert.match(learner, /type="time"/);
  assert.match(learner, /calendarReady/);
  assert.match(learner, /pushNote: "Автоматические push-напоминания именно об уроках Рейки пока не работают/);
  assert.doesNotMatch(learner, /Notification\.requestPermission|pushManager\.subscribe|fetch\(["']https?:/);
});
test("one-time calendar file is local-date-safe, neutral, and explicitly opt-in", () => {
  assert.equal(REIKI_LESSON_REMINDER_DEFAULT, "19:00");
  const at = new Date(2026, 9, 21, 23, 52, 0);
  const text = reikiTomorrowCalendar("ru", "19:30", at);
  assert.match(text, /^BEGIN:VCALENDAR\r\n/);
  assert.match(text, /DTSTART:20261022T193000\r\n/);
  assert.match(text, /DTEND:20261022T194000\r\n/);
  assert.match(text, /BEGIN:VALARM\r\nACTION:DISPLAY\r\n/);
  assert.match(text, /https:\/\/holistichouse\.vercel\.app\/ru\/academy\/principles-of-energywork\/learn/);
  assert.doesNotMatch(text, /patient|health|remedy|diagnos|assessment|token|\?slide=/i);
  assert.match(reikiTomorrowCalendar("en", "08:00", new Date(2026, 11, 31)), /DTSTART:20270101T080000/);
  assert.throws(() => reikiTomorrowCalendar("en", "04:00", at), /INVALID_REMINDER_TIME/);
  assert.throws(() => reikiTomorrowCalendar("en", "22:00", at), /INVALID_REMINDER_TIME/);
  assert.throws(() => reikiTomorrowCalendar("en", "19:00", new Date("no date")), /INVALID_REMINDER_DATE/);
  assert.match(learner, /link\.download = "holistic-house-next-lesson\.ics"/);
  assert.match(learner, /onClick=\{downloadTomorrowReminder\}/);
});

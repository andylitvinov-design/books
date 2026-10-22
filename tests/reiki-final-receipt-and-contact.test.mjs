import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { whatsappEnquiryUrl, telegramEnquiryUrlFromWhatsApp, WHATSAPP_NUMBER, TELEGRAM_USERNAME } from "../lib/whatsapp-enquiry.js";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const learner = read("components/energywork-ai-learner.tsx");
const curriculum = read("data/academy/energywork-ai-curriculum.ts");
const css = read("components/energywork-ai-learner.module.css");
const leads = read("lib/academy/reiki-course-leads.js");

test("last slide congratulates graduates without claiming a Level 1 initiation", () => {
  assert.match(curriculum, /id: "end-02", phase: "complete", kind: "finish"/);
  assert.match(curriculum, /Congratulations! All five Reiki lessons complete/);
  assert.match(curriculum, /Поздравляем! Все пять уроков Рейки пройдены/);
  assert.match(curriculum, /completing these lessons is not an initiation or certification/);
});

test("application receipt is displayed only for a server-confirmed CRM lead", () => {
  assert.match(learner, /\{applicationLead \? \(\s*<div className=\{styles\.finalReceipt\} data-reiki-application-accepted role="status">/);
  assert.match(learner, /finalAcceptedHeading: "Your application has been received!"/);
  assert.match(learner, /finalAcceptedHeading: "Ваша заявка принята!"/);
  assert.match(learner, /finalPendingHeading: "One last step/);
  assert.match(learner, /data-reiki-application-pending/);
  assert.match(learner, /action: "apply", version: ENERGYWORK_COURSE_VERSION/);
  assert.match(learner, /const value = await appFetch\("academy-energywork", \{[\s\S]*?action: "apply"[\s\S]*?hydrate\(value\)/);
  assert.match(leads, /applicationLead: application \? \{ id: application\.id/);
  assert.match(leads, /if \(progress\.status !== 'completed'\)/);
  assert.match(leads, /if \(!reikiInitiationRequestValid\(reason\)\)/);
});

test("sharing and application remain explicit private opt-ins, never automatic", () => {
  assert.match(learner, /data-reiki-final-share-consent/);
  assert.match(learner, /checked=\{shareConsented\}[\s\S]*?onClick=\{shareWithTeacher\}/);
  assert.match(learner, /disabled=\{busy \|\| !applicationConsented\} onClick=\{applyForInitiation\}/);
  assert.match(learner, /\{t\.initiationConfirm\}/);
  assert.doesNotMatch(learner, /useEffect\(\(\) => applyForInitiation\(\)/);
});

test("WhatsApp and Telegram draft only a generic course-next-step request", () => {
  for (const locale of ["en", "ru"]) {
    const request = locale === "ru"
      ? "Я завершил(а) все пять уроков Reiki Practitioner и хочу двигаться дальше — обсудить личную инициацию."
      : "I've completed all five Reiki Practitioner lessons and would like to move forward with personal initiation.";
    const url = whatsappEnquiryUrl({
      locale, service: "Reiki Practitioner", request,
      pagePath: "/" + locale + "/academy/principles-of-energywork/learn",
    });
    const message = new URL(url).searchParams.get("text") || "";
    assert.equal(new URL(url).pathname, "/" + WHATSAPP_NUMBER);
    assert.match(message, /Reiki Practitioner/);
    assert.match(message, /five|пять/);
    assert.doesNotMatch(message, /end-01|motivation|firstName|email|accountId|\{\s*"answers"/);
    const telegram = telegramEnquiryUrlFromWhatsApp(url);
    assert.equal(new URL(telegram).pathname, "/" + TELEGRAM_USERNAME);
    assert.equal(new URL(telegram).searchParams.get("text"), message);
  }
  assert.match(learner, /href=\{reikiWhatsAppUrl\}/);
  assert.match(learner, /href=\{reikiTelegramUrl\}/);
  assert.match(learner, /target="_blank" rel="noopener noreferrer"/);
});

test("finished learners can step Back and jump to any previous lesson", () => {
  assert.match(learner, /data-reiki-final-revisit/);
  assert.match(learner, /energyworkLessons\.map\(\(lesson, lessonIndex\) => \(/);
  assert.match(learner, /onClick=\{\(\) => jumpToSlide\(lesson\.firstSlideId\)\}/);
  assert.match(learner, /<footer className=\{styles\.footer\}>\s*<div className=\{styles\.actions/);
  assert.match(learner, /onClick=\{previous\}/);
  assert.match(learner, /\{!completed && slide\.id !== "flight-save" \? \(/);
  assert.match(css, /\.page\[data-reiki-current-kind="finish"\] \.back \{ min-height: 44px; \}/);
  assert.match(css, /@media \(max-width: 430px\)[\s\S]*?\.page\[data-reiki-current-kind="finish"\] \.back \{ display: inline-flex; width: 100%; min-height: 48px; \}/);
});

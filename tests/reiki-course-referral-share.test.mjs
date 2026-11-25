import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const share = read("components/reiki-course-referral-share.tsx");
const shareCss = read("components/reiki-course-referral-share.module.css");
const learner = read("components/energywork-ai-learner.tsx");
const learnerCss = read("components/energywork-ai-learner.module.css");
const routes = read("app/[locale]/academy/[[...slug]]/page.tsx");

test("Reiki footer replaces the right-hand private-save check and teacher CRM popover with an optional friend referral", () => {
  assert.match(learner, /import \{ ReikiCourseReferralShare \} from "@\/components\/reiki-course-referral-share"/);
  assert.match(learner, /<ReikiCourseReferralShare locale=\{locale\} \/>/);
  assert.doesNotMatch(learner, /className=\{styles\.saveManager\}/);
  assert.doesNotMatch(learnerCss, /\.saveManager/);
  assert.match(share, /<details className=\{styles\.root\} data-reiki-referral-share>/);
  assert.match(share, /<Share2 size=\{16\} aria-hidden="true" \/>/);
  assert.match(share, /trigger: "Поделиться"/);
  assert.match(share, /heading: "Порекомендуйте курс друзьям"/);
  assert.match(share, /heading: "Recommend this course to a friend"/);
});

test("friend link reaches an existing public three-language programme without leaking private notes", () => {
  assert.match(share, /https:\/\/holistichouse\.vercel\.app\//);
  assert.match(share, /\/academy\/reiki\/free-practitioner-course/);
  assert.match(routes, /key === "reiki\/free-practitioner-course"\) return <ReikiReferralLanding locale=\{locale\} \/>/);
  assert.match(share, /const message = t\.message \+ " " \+ url/);
  assert.match(share, /encodeURIComponent\(message\)/);
  assert.match(share, /encodeURIComponent\(url\)/);
  assert.doesNotMatch(share, /appFetch|sessionStorage|localStorage|answersRef|enrollmentLead|teacherConsent|sharingWithTeacher|clientId|accountId/);
  assert.match(share, /personal answers and progress are never included/);
  assert.match(share, /без ваших ответов, отзывов и прогресса/);
});

test("iPhone uses native share, and other devices have copy, WhatsApp, Telegram and email drafts", () => {
  assert.match(share, /typeof navigator\.share === "function"/);
  assert.match(share, /await navigator\.share\(\{ title: t\.heading, text: t\.message, url \}\)/);
  assert.match(share, /if \(\(error as \{ name\?: string \}\)\?\.name === "AbortError"\) return/);
  assert.match(share, /await navigator\.clipboard\.writeText\(url\)/);
  assert.match(share, /onFocus=\{event => event\.currentTarget\.select\(\)\}/);
  assert.match(share, /https:\/\/wa\.me\/\?text=/);
  assert.match(share, /https:\/\/t\.me\/share\/url\?url=/);
  assert.match(share, /mailto:\?subject=/);
  assert.match(share, /role="status"/);
  assert.match(shareCss, /@media \(max-width: 430px\)/);
  assert.match(shareCss, /width: min\(370px, calc\(100vw - 24px\)\)/);
  assert.match(shareCss, /min-height: 44px/);
  assert.match(shareCss, /:focus-visible/);
});

test("existing private save, Google first-lesson consent, reload and teacher application opt-in remain separate", () => {
  assert.match(learner, /data-reiki-first-lesson-consent/);
  assert.match(learner, /data-reiki-first-lesson-google-save/);
  assert.match(learner, /data-reiki-private-save-status/);
  assert.match(learner, /\{sync === "ready" \? <>[\s\S]*?t\.saved/);
  assert.match(learner, /className=\{styles\.saveSettings\}/);
  assert.match(learner, /action: "start", consent: true, teacherConsent: false/);
  assert.match(learner, /data-reiki-final-share-consent/);
  assert.match(learner, /onClick=\{shareWithTeacher\}/);
  assert.match(learner, /onClick=\{reloadProgress\}/);
  assert.doesNotMatch(share, /onClick=\{shareWithTeacher\}|t\.teacherShareAction/);
  assert.match(learnerCss, /\.savedLine/);
});

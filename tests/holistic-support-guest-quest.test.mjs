import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  QUEST_STEPS, GUEST_VIDEO_LIMIT, emptyQuest, normalizeQuest,
  nextQuestLaunch, markQuestStep, answerQuestVideoQuestion, questCompletedCount, remainingGuestLaunches,
} from "../lib/holistic-support/guest-quest.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Seven optional free steps: only actual player starts award a video badge", () => {
  assert.deepEqual(QUEST_STEPS, [
    "checkin", "category", "recommendation", "firstVideo", "secondVideo", "test", "course",
  ]);
  let state = emptyQuest();
  assert.equal(questCompletedCount(state), 0);
  state = markQuestStep(state, "category");
  state = markQuestStep(state, "checkin");
  state = markQuestStep(state, "recommendation");
  assert.equal(state.completed.firstVideo, false);
  assert.equal(state.completed.secondVideo, false);
  state = nextQuestLaunch(state);
  assert.equal(state.starts, 1);
  assert.equal(state.completed.firstVideo, true);
  assert.equal(state.completed.secondVideo, false);
  state = nextQuestLaunch(state);
  assert.equal(state.completed.secondVideo, true);
  assert.equal(questCompletedCount(state), 5);
  state = markQuestStep(markQuestStep(state, "test"), "course");
  assert.equal(questCompletedCount(state), 7);
});

test("The ten-launch guest budget is bounded; free signed-in use is not upsold as a requirement", () => {
  let state = emptyQuest();
  for (let i = 0; i < GUEST_VIDEO_LIMIT; i++) state = nextQuestLaunch(state);
  assert.equal(remainingGuestLaunches(state), 0);
  assert.equal(nextQuestLaunch(state), null);
  const member = nextQuestLaunch(state, true);
  assert.equal(member.starts, GUEST_VIDEO_LIMIT + 1);
  assert.equal(remainingGuestLaunches(member), 0);
});

test("Persisted payload is allowlisted; corrupt or injected private data cannot be replayed", () => {
  const source = { starts: 3, completed: { checkin: true, test: true, unknown: true },
    name: "secret", note: "private", scores: { money: 2 }, videoIds: ["secret-video"],
  };
  const value = normalizeQuest(source);
  assert.deepEqual(Object.keys(value), ["starts", "videoQuestionAnswered", "completed"]);
  assert.deepEqual(Object.keys(value.completed), QUEST_STEPS);
  assert.equal(JSON.stringify(value).includes("secret"), false);
  assert.equal(value.completed.firstVideo, true);
  assert.equal(value.completed.secondVideo, true);
  assert.equal(normalizeQuest({ starts: Infinity }).starts, 0);
  assert.equal(normalizeQuest({ starts: -1 }).starts, 0);
  assert.equal(normalizeQuest(null).starts, 0);
  assert.equal(markQuestStep(value, "firstVideo").starts, 3);
  assert.equal(answerQuestVideoQuestion(emptyQuest()).videoQuestionAnswered, false);
  const afterStart = nextQuestLaunch(emptyQuest());
  const afterReflection = answerQuestVideoQuestion(afterStart);
  assert.equal(afterReflection.videoQuestionAnswered, true);
  assert.equal(afterReflection.completed.firstVideo, true);
  assert.equal(afterReflection.completed.test, false);
  assert.equal(JSON.stringify(afterReflection).includes("yes"), false);
});

test("The existing original player, free tests and user-selected courses are reused", () => {
  const mobile = read("components/holistic-support-mobile.tsx");
  const panel = read("components/holistic-support-guest-quest.tsx");
  const css = read("components/holistic-support-guest-quest.module.css");
  const route = read("app/api/app/[...path]/route.js");
  assert.match(mobile, /onClick=\{startVideo\}/);
  assert.match(mobile, /quest\.launch\(\)/);
  assert.match(mobile, /SupportGuestQuestPanel/);
  assert.match(mobile, /data-support-meditation-feed/);
  assert.match(mobile, /HolisticSupportCourseProfiles/);
  assert.match(mobile, /data-support-open-tests/);
  assert.match(route, /joined === 'auth\/status' && method === 'GET'/);
  assert.match(route, /signedIn: true/);
  assert.match(panel, /api\/app\/auth\/status/);
  assert.match(panel, /data-support-quest-step=/);
  assert.match(panel, /data-support-quest-budget/);
  assert.match(panel, /support-journey\/test-status/);
  assert.doesNotMatch(panel, /data-support-test-self-report/);
  assert.match(panel, /data-support-quest-premium/);
  assert.match(css, /@media \(max-width: 430px\)/);
  assert.doesNotMatch(mobile, /localStorage|sessionStorage|navigator\.sendBeacon|fetch\(/);
  assert.doesNotMatch(panel, /analytics|gtag|sendBeacon|stripe\/checkout|Math\.random/);
});

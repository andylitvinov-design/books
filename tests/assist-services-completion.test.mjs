import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = path => readFileSync(resolve(root, path), "utf8");
const courses = read("components/services-courses-shelf.tsx");
const magical = read("components/services-magical-help-mobile.tsx");
const spiritual = read("components/services-spiritual-reading.tsx");
const video = read("components/services-video-generation-card.tsx");
const studio = read("components/mandala-free-video-studio.tsx");

test("Assist exposes source-backed published learning routes and a truthful archive", () => {
  for (const id of ["opora","practitioner","tantra","yggdrasil","kundalini","dionysus"])
    assert.match(courses, new RegExp('id: "' + id + '"'));
  assert.match(courses, /path: "courses\/antistress"/);
  assert.match(courses, /path: "academy\/reiki\/kundalini-reiki"/);
  assert.match(courses, /fixedLocale: "en"/);
  assert.match(courses, /"archived" in course && course\.archived/);
  assert.match(courses, /data-assist-course-archive/);
  assert.match(courses, /data-assist-course-start/);
  assert.match(courses, /course\.freeIntro \? <Link/);
  assert.doesNotMatch(courses, /"archive[^\n]*kind: "paid"/i);
  for (const locale of ["ru","en","es"]) {
    assert.ok(courses.includes(locale + ": {"), "Missing locale copy: " + locale);
  }
});

test("magical help offers separate talisman and ritual actions in all three locales", () => {
  assert.match(magical, /\["health", "money", "energy", "talisman", "ritual"\]/);
  assert.equal((magical.match(/talisman: \{/g) || []).length, 3);
  assert.equal((magical.match(/ritual: \{/g) || []).length, 3);
  assert.match(magical, /kind === "talisman"/);
  assert.match(magical, /kind === "ritual"/);
  assert.match(magical, /<ContactChannelChooser/);
  assert.match(magical, /whatsappEnquiryUrl/);
});

test("three video ideas open distinct, implemented first-party studio workspaces", () => {
  for (const hash of ["video-templates","personal-meditation","video-director-chat"]) {
    assert.ok(video.includes("#" + hash), hash);
    assert.ok(studio.includes('"' + hash + '"'), "Unrecognized studio workspace: " + hash);
  }
  assert.match(video, /href=\{url\+scenarioDestinations\[i\]\}/);
  assert.match(video, /data-assist-video-create/);
});

test("Spiritual Reading exposes Dao, Tarot and free reflection without implying generative AI", () => {
  for (const key of ["free","tao","tarot"])
    assert.ok(spiritual.includes('data-assist-spiritual-choice="' + key + '"'));
  assert.match(spiritual, /id="spiritual-tao"/);
  assert.match(spiritual, /id="spiritual-tarot"/);
  assert.match(spiritual, /Чтение И-Цзин/);
  assert.match(spiritual, /I Ching reflection/);
  assert.match(spiritual, /Reflexión del I Ching/);
  assert.doesNotMatch(spiritual, /freeTitle: "Taoist AI Reading"/);
});

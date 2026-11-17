import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFileSync(resolve(root, path), "utf8");
const assist = read("components/services-assist-mobile.tsx");
const styles = read("components/services-assist-mobile.module.css");
const courses = read("components/services-courses-shelf.tsx");
const supportRoute = read("app/[locale]/holistic-support/mobile/page.tsx");
const learning = read("lib/holistic-support/learning-catalog.ts");

test("Assist microphone only starts a device-local recognizer after a deliberate click", () => {
  assert.match(assist, /data-assist-local-dictation/);
  assert.match(assist, /onClick=\{toggleLocalDictation\}/);
  assert.match(assist, /if \(!\("processLocally" in speech\)\)/);
  assert.match(assist, /speech\.processLocally = true/);
  assert.match(assist, /speech\.start\(\)/);
  assert.match(assist, /speechRef\.current\?\.abort\(\)/);
  assert.match(assist, /aria-pressed=\{listening\}/);
  assert.match(styles, /\.voiceButton\[aria-pressed="true"\]/);
  assert.doesNotMatch(assist, /getUserMedia|MediaRecorder|\/api\/transcri|fetch\(/);
});

test("local dictation appends editable RU EN ES final text without auto-sending or storing speech", () => {
  for (const locale of ["ru-RU","en-US","es-ES"]) assert.ok(assist.includes(locale), locale);
  assert.match(assist, /if \(!result\?\.isFinal\) continue/);
  assert.match(assist, /setText\(current =>/);
  assert.match(assist, /\.slice\(0,280\)/);
  assert.match(assist, /setSpeechHint\(t\.voiceFallback\)/);
  assert.match(assist, /inputRef\.current\?\.focus\(\)/);
  const handler = assist.slice(assist.indexOf("function toggleLocalDictation()"),assist.indexOf("// Only the message history"));
  assert.doesNotMatch(handler, /requestSubmit|\.submit\(|\.post\(|localStorage|sessionStorage|sendBeacon/);
  assert.match(assist, /data-assist-speech-status/);
});

test("Assist learning offers all verified public directions without fake bookings for archive", () => {
  const ids = [...courses.matchAll(/^\s+\{ id: "([^"]+)"/gm)].map(m => m[1]);
  assert.deepEqual(ids,["opora","practitioner","tantra","yggdrasil","kundalini","egypt","magic","meditation","dionysus"]);
  for(const url of ["courses/antistress","academy/principles-of-energywork/learn",
    "academy/reiki/tantra-reiki/free-initiation","academy/reiki/yggdrasil",
    "academy/reiki/kundalini-reiki","academy/egyptian-priesthood/learn",
    "holistic-support/mobile?view=pump","meditations"])
    assert.ok(courses.includes(url),url);
  assert.match(supportRoute, /"pump"/);
  assert.match(learning, /egypt-osiris-free/);
  assert.match(courses, /"archived" in course && course\.archived/);
  assert.match(courses, /data-assist-course-archive/);
  assert.match(courses, /data-assist-course-start/);
  for(const locale of ["ru","en","es"]) assert.match(courses,new RegExp("^  "+locale+": \\{","m"));
  for(const key of ["egypt: {","magic: {","meditation: {"])
    assert.equal(courses.split(key).length-1,3,key);
});

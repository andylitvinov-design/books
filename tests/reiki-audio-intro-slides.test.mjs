import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { energyworkSequence, energyworkLessonRanges } from "../data/academy/energywork-ai-schema.js"
import { REIKI_INTRO_LESSONS } from "../lib/academy/reiki-intro-audio-model.js"

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8")
const curriculum = read("data/academy/energywork-ai-curriculum.ts")
const ui = read("components/energywork-ai-learner.tsx")
const player = read("components/reiki-lesson-intro-audio.tsx")
const css = read("components/energywork-ai-learner.module.css")
const ownerUi = read("components/admin-reiki-audio.jsx")

test("Every existing Reiki meditation video is directly preceded by a distinct audio slide", () => {
  const sequence = energyworkSequence()
  assert.equal(sequence.length, 67)
  assert.deepEqual(energyworkLessonRanges(sequence).map(item => item.count), [9,15,17,15,9])
  for (const [intro,audio,video,slot] of [
    ["flight-01","flight-audio","flight-02","flight"],
    ["tan-01","tan-audio","tan-02","tantra"],
    ["kun-01","kun-audio","kun-02","kundalini"],
    ["ygg-01","ygg-audio","ygg-02","yggdrasil"],
  ]) {
    assert.equal(sequence.indexOf(audio),sequence.indexOf(intro)+1)
    assert.equal(sequence.indexOf(video),sequence.indexOf(audio)+1)
    const segment = curriculum.split('id: "'+audio+'"')[1]?.split('id: "'+video+'"')[0] || ""
    assert.match(segment,/kind: "audio-intro"/)
    assert.ok(segment.includes('introAudioKey: "'+slot+'"'))
    assert.match(segment,/Аудиоприветствие от Андрея/)
    assert.match(segment,/An audio welcome from Andrey/)
  }
  assert.deepEqual([...REIKI_INTRO_LESSONS],["flight","tantra","kundalini","yggdrasil","initiation"])
})

test("The native audio player is optional, without autoplay or stale language bindings", () => {
  assert.match(ui,/slide\.kind === "audio-intro" && slide\.introAudioKey/)
  assert.match(ui,/data-reiki-audio-welcome=\{slide\.introAudioKey\}/)
  assert.match(ui,/key=\{slide\.introAudioKey \+ "-" \+ locale\}/)
  assert.match(ui,/showEmpty/)
  assert.match(ui,/slide\.introAudioKey === "initiation"/)
  assert.match(ui,/toVideo: "Continue to video"/)
  assert.match(ui,/toVideo: "Перейти к видео"/)
  assert.match(player,/<audio controls preload="none"/)
  assert.doesNotMatch(player,/autoPlay|autoplay/)
  assert.match(player,/if \(!audio\) return showEmpty \?/)
  assert.match(player,/role="status"/)
  assert.match(css,/\.audioWelcomeCard/)
  assert.match(css,/@media \(max-width: 760px\)/)
})

test("The owner still selects the published RU\/EN recording through the existing private library", () => {
  assert.match(ownerUi,/publish/i)
  assert.match(ownerUi,/upload/i)
  assert.match(ownerUi,/locale/i)
  assert.match(ownerUi,/lesson/i)
  assert.doesNotMatch(player,/secretKey|createSignedUploadUrl/)
})

test("Historical encrypted progress migration tables keep their original ordinal positions", () => {
  const registry = read("data/academy/energywork-ai-schema.js")
  const start = registry.indexOf("// Removed lesson-five screens must not reset existing p9")
  assert.ok(start > 0)
  const legacy = registry.slice(start)
  assert.doesNotMatch(legacy,/\b(?:flight|tan|kun|ygg)-audio\b/)
  assert.match(legacy,/const PREVIOUS_FLIGHT = Object\.freeze\(\['flight-01','flight-02'/)
  assert.match(legacy,/const P9_FLIGHT = Object\.freeze\(\['flight-01','flight-02'/)
})

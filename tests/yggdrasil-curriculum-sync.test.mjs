import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Yggdrasil full source parity", async () => {
  const curriculum = JSON.parse(await readFile("data/academy/yggdrasil-curriculum.json", "utf8"));
  const steps = curriculum.levels.flatMap((level) => level.steps);
  assert.equal(curriculum.source.repository, "andylitvinov-design/reiki-yggdrasil");
  assert.equal(curriculum.source.commit, "3fd7960aa77862c38f8a5754b64c3a79f5e0c96a");
  assert.equal(curriculum.source.totalLevels, 7);
  assert.equal(curriculum.source.totalSteps, 37);
  assert.equal(curriculum.source.totalSettings, 177);
  assert.equal(curriculum.source.totalVideos, 79);
  assert.deepEqual(curriculum.levels.map((level) => level.steps.length), [5, 6, 5, 5, 5, 5, 6]);
  assert.equal(steps.length, 37);
  for (const step of steps) {
    assert.ok(step.sourceText.intro);
    assert.ok(step.sourceText.meaning);
    assert.ok(step.sourceText.result);
    assert.ok(step.sourceText.opens.length);
    assert.ok(step.sourceText.skills.length);
    assert.ok(step.settings.length);
    for (const setting of step.settings) {
      assert.ok(setting.title);
      assert.ok(setting.description);
      assert.ok(setting.effect);
    }
    for (const video of step.video?.videos ?? []) {
      assert.ok(video.url.startsWith("https://"));
      assert.ok(video.youtubeId);
      assert.ok(video.posterUrl.includes(video.youtubeId));
    }
  }
  assert.equal(curriculum.practiceExercises.length, 3);
  assert.equal(curriculum.studentCollections.mandalas.length, 3);
  assert.equal(curriculum.studentCollections.artifacts.length, 3);
});

test("Yggdrasil page renders full content and poster-first videos", async () => {
  const [recordPage, component, css, player, middleware, nextConfig] = await Promise.all([
    readFile("components/academy-record-page.tsx", "utf8"),
    readFile("components/yggdrasil-curriculum.tsx", "utf8"),
    readFile("app/academy.css", "utf8"),
    readFile("components/academy-video-player.tsx", "utf8"),
    readFile("middleware.ts", "utf8"),
    readFile("next.config.ts", "utf8"),
  ]);
  assert.ok(recordPage.includes('record.routeKey === "reiki/yggdrasil"'));
  assert.ok(component.includes("sourceText"));
  assert.ok(component.includes("step.settings.map"));
  assert.ok(component.includes("AcademyVideoPlayer"));
  assert.ok(component.includes("practiceExercises"));
  assert.ok(component.includes("studentCollections"));
  assert.ok(css.includes(".yggdrasil-settings-grid"));
  assert.ok(css.includes(".yggdrasil-video-grid"));
  assert.ok(css.includes(".yggdrasil-practice-grid"));
  assert.ok(player.includes('import Image from "next/image"'));
  assert.ok(player.includes("youtube-nocookie.com/embed"));
  assert.ok(player.includes("i.ytimg.com/vi"));
  assert.ok(middleware.includes("academyVideoPage"));
  assert.ok(nextConfig.includes('hostname: "i.ytimg.com"'));
});

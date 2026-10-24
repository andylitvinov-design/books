import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(path, "utf8");
const data = async (path) => JSON.parse(await source(path));

test("all Russian PsiMaster video lessons are still distinct per course and ordered", async () => {
  const clips = await data("data/academy/psimaster-media.generated.json");
  const countByCourse = {
    "videos/planetary-power": 11, "videos/egypt-osiris": 7,
    "videos/greek-mysteries-dionysus": 7, "videos/strength-protection": 7,
    "videos/maya-archetypes": 6, "videos/greek-mysteries-demeter": 5,
    "videos/energy-pump-ups": 2,
  };
  assert.equal(clips.length, 45);
  for (const [id, count] of Object.entries(countByCourse)) {
    const lessons = clips.filter((clip) => clip.logicalId === id).sort((a, b) => a.order - b.order);
    assert.equal(lessons.length, count, id);
    assert.equal(new Set(lessons.map((clip) => clip.videoId)).size, count, id);
    assert.deepEqual(lessons.map((clip) => clip.order), Array.from({ length: count }, (_, i) => i + 1));
  }
});

test("intro → one video → its questions → next video, no advance restriction or autoplay", async () => {
  const [journey, css, player] = await Promise.all([
    source("components/academy-video-course-journey.tsx"),
    source("components/academy-video-course-journey.module.css"),
    source("components/academy-video-player.tsx"),
  ]);
  assert.match(journey, /const total = 2 \+ lessons\.length \* 2/);
  assert.match(journey, /const intro = position === 0/);
  assert.match(journey, /const complete = position === total - 1/);
  assert.match(journey, /const isVideo = !intro && !complete && position % 2 === 1/);
  assert.match(journey, /const isReflection = !intro && !complete && !isVideo/);
  assert.match(journey, /intro \? t\.start : isVideo \? t\.toReflection/);
  assert.match(journey, /lessonIndex < lessons\.length - 1 \? t\.nextVideo/);
  assert.match(journey, /<AcademyVideoPlayer key=\{lesson\.id\}/);
  assert.match(journey, /<textarea id=\{"video-course-note-/);
  assert.match(journey, /value=\{notes\[lesson\.id\] \|\| ""\}/);
  assert.match(journey, /maxLength=\{2000\}/);
  assert.match(journey, /sessionStorage\.getItem/);
  assert.match(journey, /sessionStorage\.setItem/);
  assert.match(journey, /navigator\.clipboard\.writeText/);
  assert.doesNotMatch(journey, /fetch\(|localStorage|autoPlay|new Date\(/);
  assert.match(player, /const \[playing, setPlaying\] = useState\(false\)/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /:focus-visible/);
});

test("native Academy page, Russian video index and Temple Studies reuse one runner", async () => {
  const [page, index, temple, playlist] = await Promise.all([
    source("components/academy-record-page.tsx"),
    source("components/academy-video-library-client.tsx"),
    source("components/temple-studies.tsx"),
    source("components/academy-course-video-playlist.tsx"),
  ]);
  assert.match(page, /record\.logicalId === "mysteries\/archetypes-of-gods"/);
  assert.match(page, /record\.logicalId === "mysteries\/guidance-of-gods"/);
  assert.match(page, /isVerbatimTantraArchive && \(videos\.length > 0 \|\| sourceVideos\.length > 0\)/);
  assert.match(page, /courseId=\{"tantra-original:" \+ record\.logicalId\}/);
  assert.match(playlist, /<AcademyVideoCourseJourney/);
  assert.match(index, /group\.language === "ru"/);
  assert.match(index, /<AcademyVideoCourseJourney/);
  assert.match(index, /!video\.unavailable/);
  assert.match(temple, /<AcademyVideoCourseJourney/);
  assert.match(temple, /collection\.videos\.map/);
  // Historical non-course testimonials are not silently converted into a course.
  assert.doesNotMatch(page, /record\.logicalId === "history\/student-experiences"/);
});

test("Russian practitioner courses with embedded/uploaded video get new lessons; text-only and other locales keep their viewer", async () => {
  const sourceCode = await source("components/public-practitioner-course-player.jsx");
  assert.match(sourceCode, /course\.locale==='ru'\?slides\.filter/);
  assert.match(sourceCode, /item\.kind==='embed'&&!!safeEmbed\(item\.videoUrl\)/);
  assert.match(sourceCode, /item\.kind==='video'&&!!item\.assetId/);
  assert.match(sourceCode, /data-russian-video-slides/);
  assert.match(sourceCode, /<AcademyVideoCourseJourney/);
  assert.match(sourceCode, /nonVideoSlides\.map/);
  assert.match(sourceCode, /return <main className=\{styles\.root\} data-public-master-course lang=/);
  assert.match(sourceCode, /https:\/\/www\.youtube-nocookie\.com\/embed/);
  assert.doesNotMatch(sourceCode, /autoPlay/);
});

test("Yggdrasil legacy videos retain all 7 source modules; unavailable clips aren't falsely playable", async () => {
  const [curriculum, library] = await Promise.all([
    data("data/academy/yggdrasil-curriculum.json"),
    source("components/academy-video-library-client.tsx"),
  ]);
  assert.equal(curriculum.levels.length, 7);
  assert.equal(curriculum.levels.reduce((total, module) =>
    total + module.steps.reduce((count, step) => count + (step.video?.videos?.length || 0), 0), 0), 79);
  assert.match(library, /!video\.unavailable && \/\^\[A-Za-z0-9_-\]\{11\}\$\/\.test\(video\.id\)/);
  assert.match(library, /if \(!available\.length\) return <p/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const read = (path) => readFile(path, "utf8");
const json = async (path) => JSON.parse(await read(path));

async function loadCourse() {
  const [source, media] = await Promise.all([
    read("data/academy/egyptian-priesthood-curriculum.ts"),
    json("data/academy/psimaster-media.generated.json"),
  ]);
  const output = ts.transpileModule(source, {
    fileName: "egyptian-priesthood-curriculum.ts",
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true },
  });
  assert.equal((output.diagnostics || []).filter((diag) => diag.category === ts.DiagnosticCategory.Error).length, 0,
    "Course curriculum TS syntax check");
  const mod = { exports: {} };
  const fn = vm.runInNewContext("(function(require,module,exports){" + output.outputText + "\n})");
  fn((id) => {
    assert.equal(id, "./psimaster-media.generated.json", "Unexpected imported content");
    return media;
  }, mod, mod.exports);
  return { course: mod.exports, media, source };
}

test("Egyptian Priesthood reuses all seven original Osiris videos in exactly the PsiMaster order", async () => {
  const { course, media } = await loadCourse();
  const original = media.filter((item) => item.logicalId === "videos/egypt-osiris").sort((a, b) => a.order - b.order);
  assert.equal(original.length, 7);
  assert.deepEqual(original.map((item) => item.order), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(Array.from(course.osirisOriginalVideos, (item) => item.id), original.map((item) => item.videoId));
  assert.equal(new Set(course.osirisOriginalVideos.map((item) => item.id)).size, 7);
  assert.ok(course.osirisOriginalVideos.every((item) => item.title.ru && item.title.en && item.title.es));
  assert.equal(course.egyptVideoSources.length, 2);
  assert.match(course.egyptVideoSources[0].url, /12472/);
  assert.match(course.egyptVideoSources[1].url, /12455/);
});

test("Egyptian Priesthood follows Reiki Practitioner's one-idea-per-screen rhythm in 3 locales", async () => {
  const { course } = await loadCourse();
  const slides = course.egyptPriesthoodScreens();
  assert.equal(course.egyptLessonTopics.length, 7);
  assert.equal(course.egyptFurtherModules.length, 6);
  assert.equal(slides.length, 51, "Welcome + seven days x seven screens + completion");
  assert.equal(new Set(slides.map((s) => s.id)).size, 51);
  assert.equal(slides[0].kind, "welcome");
  assert.equal(slides.at(-1).kind, "complete");
  for (const day of [1, 2, 3, 4, 5, 6, 7]) {
    const group = slides.filter((s) => s.day === day);
    assert.deepEqual(Array.from(group, (s) => s.kind), [
      "intro", "idea", "video", "practice", "reflection", "transfer", "milestone",
    ], "Day " + day);
    assert.equal(group[2].videoId, course.osirisOriginalVideos[day - 1].id);
    assert.ok(group[4].question?.ru.length > 15 && group[4].question?.en.length > 15);
    assert.ok(group.every((s) => s.title.ru && s.title.en && s.title.es && s.body.ru && s.body.en && s.body.es));
  }
  assert.ok(slides.every((s) => !/guarantee|miracle cure|certificate of priesthood/i.test(s.body.en)));
});

test("Egyptian course routes, discovery and source-links work without duplicated legacy curriculum", async () => {
  const [route, hub, discovery, videoIndex, sourcePage, landing, learner] = await Promise.all([
    read("app/[locale]/academy/[[...slug]]/page.tsx"),
    read("components/academy-hub.tsx"),
    read("components/academy-discovery.tsx"),
    read("components/academy-video-courses.tsx"),
    read("components/academy-record-page.tsx"),
    read("components/egyptian-priesthood-course.tsx"),
    read("components/egyptian-priesthood-learner.tsx"),
  ]);
  assert.match(route, /if \(key === "egyptian-priesthood"\) return <EgyptianPriesthoodLanding locale=\{locale\}/);
  assert.match(route, /if \(key === "egyptian-priesthood\/learn"\)/);
  assert.match(route, /<EgyptianPriesthoodLearner locale=\{locale\} initialDay=\{lesson\}/);
  assert.match(route, /\["principles-of-energywork\/learn", "egyptian-priesthood\/learn"\]/);
  assert.match(hub, /id: "academy-featured-egypt-priesthood"/);
  assert.match(hub, /courseHref: "\/" \+ locale \+ "\/academy\/egyptian-priesthood\/learn"/);
  assert.match(discovery, /"academy-featured-egypt-priesthood":/);
  assert.match(videoIndex, /record\.logicalId === "videos\/egypt-osiris" \? "egyptian-priesthood"/);
  assert.match(sourcePage, /data-egypt-course-invitation/);
  assert.match(landing, /egyptLessonTopics\.map/);
  assert.match(landing, /osirisOriginalVideos\[index\]/);
  assert.match(learner, /egyptPriesthoodScreens\(\)/);
  assert.match(learner, /<AcademyVideoPlayer key=\{slide\.videoId\}/);
});

test("Egyptian learner keeps reflections in volatile component state, never in persistent storage or CRM", async () => {
  const learner = await read("components/egyptian-priesthood-learner.tsx");
  const css = await read("components/egyptian-priesthood-course.module.css");
  assert.match(learner, /const \[answers, setAnswers\] = useState<Record<string, string>>\(\{\}\)/);
  assert.match(learner, /window\.localStorage\.setItem\(EGYPT_LOCAL_PROGRESS_KEY, JSON\.stringify\(progress\)\)/);
  assert.match(learner, /type Progress = \{[\s\S]*?screenId: string;[\s\S]*?completedDays: number\[\];[\s\S]*?watchedIds: string\[\];/);
  assert.doesNotMatch(learner, /appFetch\(|fetch\(|localStorage\.setItem\([^)]*answers/);
  assert.match(learner, /answer\.trim\(\)\.length >= 50/);
  assert.match(learner, /<AcademyVideoPlayer[\s\S]*?youtubeId=\{slide\.videoId\}/);
  assert.match(learner, /aria-current=\{current \? "step" : undefined\}/);
  assert.match(learner, /window\.confirm\(t\.restartConfirm\)/);
  assert.match(css, /height:100dvh/);
  assert.match(css, /@media\(max-width:360px\)/);
  assert.match(css, /@media\(max-height:650px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test("Original independent imagery course gets exactly two source-credited supplemental videos", async () => {
  const [extra, original, catalog] = await Promise.all([
    json("data/academy/psimaster-supplemental-media.generated.json"),
    json("data/academy/psimaster-media.generated.json"),
    read("data/academy/catalog.ts"),
  ]);
  assert.equal(extra.length, 2);
  assert.deepEqual(extra.map((item) => item.order), [1, 2]);
  assert.deepEqual(extra.map((item) => item.videoId), ["EhQPjuyNCS4", "m03fo3CW7Eo"]);
  assert.ok(extra.every((item) => item.logicalId === "applied/imagery-therapy/mirrorland" &&
    item.sourceTaxonomyId === "12308" && item.sourceProvider === "psimaster" && item.mediaUrl.endsWith(item.videoId)));
  assert.equal(extra.filter((item) => original.some((v) => v.videoId === item.videoId)).length, 0);
  assert.match(catalog, /psimasterSupplementalMedia/);
  assert.match(catalog, /\.\.\.\(psimasterSupplementalMedia as AcademyMediaRecord\[\]\)/);
});

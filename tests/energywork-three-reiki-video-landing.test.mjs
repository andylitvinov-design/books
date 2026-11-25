import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("Course-first landing retains the five-week rail and the three distinct photo-led Reiki screens", async () => {
 const [page,meditations] = await Promise.all([read("components/principles-of-energywork.tsx"),read("data/academy/english-guided-meditations.ts")]);
 assert.ok(page.indexOf("data-energywork-five-steps") < page.indexOf("data-reiki-system-overview"));
 for (const marker of ['data-energywork-screen="foundations"','id="energywork-flight-to-sun"','id="energywork-systems"','<ReikiPublicReviews']) assert.ok(!page.includes(marker),marker);
 for (const marker of ["Flight to the Sun","Полёт к Солнцу","Vuelo hacia el Sol","data-reiki-path={system.key}","src={artwork.src}","href={academyUrl(locale, system.study)}","href={academyUrl(locale, system.free)}"]) assert.ok(page.includes(marker),marker);
 assert.ok(meditations.includes('youtubeId: "HqfixazXqRY"'));
});
test("Three downloadable PDF course options point to the real production guide endpoint", async () => {
  const [form,route] = await Promise.all([
    read("components/energywork-reiki-capture.tsx"),
    read("app/api/academy/reiki-guide/route.js"),
  ]);
  for (const key of ["yggdrasil", "tantra", "kundalini"]) {
    assert.match(form,new RegExp(key));
    assert.match(route,new RegExp(key));
  }
  assert.match(form, /href=\{fileHref\} download/);
  assert.match(route, /if \(course === "kundalini"\)/);
  assert.match(route, /Kundalini_Reiki_Manual_Paul_Crick\.pdf/);
});

test("Complete original 78-video Yggdrasil archive source remains intact; the landing links to the school archive", async () => {
  const [server,client,css,raw,main] = await Promise.all([
    read("components/energywork-video-archive.tsx"),
    read("components/energywork-video-archive-client.tsx"),
    read("components/energywork-video-archive.module.css"),
    read("data/academy/yggdrasil-curriculum.json"),
    read("components/principles-of-energywork.tsx"),
  ]);
  const levels=JSON.parse(raw).levels;
  assert.equal(levels.length,7);
  const all=levels.flatMap(level=>level.steps.flatMap(step=>(step.video?.videos??[]).filter(v=>typeof v.youtubeId==="string"&&/^[\w-]{11}$/.test(v.youtubeId))));
  assert.equal(all.length,78);
  assert.equal(new Set(all.map(v=>v.youtubeId)).size,78,"The archived IDs should all be unique");
  assert.match(server, /curriculum\.levels as unknown as ArchiveLevel\[\]/);
  assert.match(server, /const total = groups\.reduce/);
  assert.match(server, /youtubeId: string/);
  assert.match(client, /const \[expanded, setExpanded\] = useState\(false\)/);
  assert.match(client, /\{expanded \? \(/);
  assert.match(client, /setModuleId\(group\.id\)/);
  assert.match(client, /<AcademyVideoPlayer youtubeId=\{video\.id\}/);
  assert.match(client, /Original Russian audio/);
  assert.match(main, /academyUrl\(locale, "reiki\/yggdrasil\/archive"\)/);
  assert.doesNotMatch(main, /<EnergyworkVideoArchive/);
  assert.match(css, /\.videoGrid/);
  assert.match(css, /@media \(max-width:690px\)/);
});

test("Verified meditations come only from their owner-supplied source registry", async () => {
  const [page,registry,free] = await Promise.all([
    read("components/principles-of-energywork.tsx"),
    read("data/academy/english-guided-meditations.ts"),
    read("components/yggdrasil-free-initiation.tsx"),
  ]);
  assert.match(registry, /youtubeId: "w2BN-HYmHUk"/);
  assert.match(registry, /youtubeId: "80xZ7jN6o2Y"/);
  assert.match(registry, /key: "kundalini-reiki",[\s\S]*?youtubeId: "_IOX0E8N-To"/);
  assert.match(page, /englishGuidedMeditations\.find\(item => item\.key === "reiki-yggdrasil"\)/);
  assert.ok(page.includes('youtubeId="DYo-fG-SyKw"'));
  assert.match(free, /originalLevelOneVideoId = "DYo-fG-SyKw"/);
  assert.match(page, /href=\{academyUrl\(locale, system\.study\)\}/);
});

test("Reiki landing offers the two owner-approved initiation formats without duplicate booking CTA", async () => {
 const [page,css] = await Promise.all([read("components/principles-of-energywork.tsx"),read("components/principles-of-energywork.module.css")]);
 for (const marker of ["data-energywork-five-steps","data-energywork-personal-rates","data-energywork-final-choices","data-energywork-final-online","€0","€100","data-reiki-yggdrasil-intro-videos"]) assert.ok(page.includes(marker),marker);
 for (const marker of ["€50","€60","data-energywork-final-personal","<ReikiPublicReviews"]) assert.ok(!page.includes(marker),marker);
 assert.ok(page.indexOf("data-reiki-system-overview")<page.indexOf('id="energywork-how"'));
 assert.ok(page.indexOf('id="energywork-how"')<page.indexOf("data-reiki-yggdrasil-intro-videos"));
 assert.ok(page.indexOf("data-reiki-yggdrasil-intro-videos")<page.indexOf("className={styles.finalCta}"));
 assert.ok(css.includes(".reikiIntroVideoGrid"));
});
test("Owner's Kundalini Reiki video remains on the dedicated course landing, not the course-first promo", async () => {
  const [registry, promo, course, css] = await Promise.all([
    read("data/academy/english-guided-meditations.ts"),
    read("components/principles-of-energywork.tsx"),
    read("components/kundalini-reiki-course.tsx"),
    read("components/kundalini-reiki-course.module.css"),
  ]);
  assert.match(registry, /key: "kundalini-reiki",[\s\S]*?youtubeId: "_IOX0E8N-To"/);
  assert.match(promo, /study: "reiki\/kundalini-reiki"/);
  assert.doesNotMatch(promo, /key === "kundalini-reiki"|youtubeId="_IOX0E8N-To"/);
  assert.match(course, /key === "kundalini-reiki"/);
  assert.match(course, /<AcademyVideoPlayer youtubeId=\{meditation\.youtubeId\}/);
  assert.match(course, /videoCopy\.eyebrow/);
  assert.match(css, /\.meditationFrame/);
  assert.match(css, /@media \(max-width:760px\)/);
  assert.doesNotMatch(promo, /data-video-source-pending="kundalini"/);
});

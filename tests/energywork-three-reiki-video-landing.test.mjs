import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("Principles of Energywork puts Flight to the Sun before all three Reiki video systems", async () => {
  const [page,styles,meditations] = await Promise.all([
    read("components/principles-of-energywork.tsx"),
    read("components/principles-of-energywork.module.css"),
    read("data/academy/english-guided-meditations.ts"),
  ]);
  const flight = page.indexOf('id="energywork-flight-to-sun"');
  const foundations = page.indexOf('aria-labelledby="energywork-foundations"');
  const systems = page.indexOf('id="energywork-systems"');
  assert.ok(foundations > 0 && foundations < flight && flight < systems, "Foundations may introduce the course, but Flight is the first numbered video step");
  assert.match(page, /href="#energywork-flight-to-sun"/);
  for (const title of ["Flight to the Sun", "Полёт к Солнцу", "Vuelo hacia el Sol"]) {
    assert.ok(page.includes(title), "Missing original title " + title);
  }
  assert.match(meditations, /key: "flight-to-sun",[\s\S]*?youtubeId: "HqfixazXqRY"/);
  assert.match(page, /flight\?\.youtubeId \? \([\s\S]*?<AcademyVideoPlayer youtubeId=\{flight\.youtubeId\}/);
  assert.match(page, /data-video-source-pending="flight-to-sun"/);
  assert.doesNotMatch(page, /qM_nFUkYJ1k|XvMdX5czoOc/);
  assert.match(styles, /\.sourcePending/);
  assert.match(styles, /@media \(max-width:550px\)/);
});

test("All three Reiki systems display video or explicit source-gated media and a capture below", async () => {
  const [page,form,css] = await Promise.all([
    read("components/principles-of-energywork.tsx"),
    read("components/energywork-reiki-capture.tsx"),
    read("components/energywork-reiki-capture.module.css"),
  ]);
  assert.match(page, /paths\.map\(\(system, index\)/);
  assert.match(page, /data-reiki-path=\{system\.key\}/);
  assert.match(page, /tantraPractice\?\.youtubeId/);
  assert.match(page, /yggdrasilMeditation\?\.youtubeId/);
  assert.match(page, /youtubeId="DYo-fG-SyKw"/);
  assert.match(page, /<AcademyVideoPlayer youtubeId=\{kundaliniMeditation\.youtubeId\} title=\{kundaliniMeditation\.title\}/);
  assert.doesNotMatch(page, /data-video-source-pending="kundalini"/);
  assert.doesNotMatch(page, /kundaliniMissing|kundaliniSource/);
  assert.match(page, /<EnergyworkReikiCapture locale=\{locale\} course=\{system\.key\} \/>/);
  assert.match(page, /href=\{academyUrl\(locale, system\.study\)\}/);
  assert.match(page, /href=\{academyUrl\(locale, system\.free\)\}/);
  assert.match(form, /type Choice = "gift" \| "donation" \| "personal" \| "pdf"/);
  assert.match(form, /const choices: Choice\[\] = \["gift", "donation", "personal", "pdf"\]/);
  assert.match(form, /aria-pressed=\{choice===option\}/);
  assert.match(form, /whatsappEnquiryUrl\(\{/);
  assert.match(form, /service: system\.name \+ " · Level 1"/);
  assert.match(form, /pdfUrl|fileHref/);
  assert.match(form, /reiki-guide\?course=/);
  assert.match(form, /data-energywork-action=\{choice\}/);
  assert.doesNotMatch(form, /<input|<textarea|type="file"|FormData|localStorage|navigator\.share/);
  assert.match(css, /\.choices \{ display:grid; grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
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

test("Complete existing 78-video Yggdrasil archive is present without loading hidden players", async () => {
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
  assert.match(main, /<EnergyworkVideoArchive locale=\{locale\} \/>/);
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
  assert.match(page, /englishGuidedMeditations\.find\(\(item\) => item\.key === "tantra-reiki"\)/);
  assert.match(page, /englishGuidedMeditations\.find\(\(item\) => item\.key === "reiki-yggdrasil"\)/);
  assert.match(free, /originalLevelOneVideoId = "DYo-fG-SyKw"/);
  assert.match(page, /youtubeId="DYo-fG-SyKw"/);
});

test("Reiki promo matches all five course steps in EN/RU/ES, with gift, donation and two booking prices", async () => {
  const [page, css, form] = await Promise.all([
    read("components/principles-of-energywork.tsx"),
    read("components/principles-of-energywork.module.css"),
    read("components/energywork-reiki-capture.tsx"),
  ]);
  for (const marker of [
    "STEP 1 ·", "STEP 5 ·", "STEPS 2–4 ·",
    "ШАГ 1 ·", "ШАГ 5 ·", "ШАГИ 2–4 ·",
    "PASO 1 ·", "PASO 5 ·", "PASOS 2–4 ·",
    'badge: "02"', 'badge: "03"', 'badge: "04"',
    'data-energywork-step="1"', 'data-energywork-step={String(index + 2)}', 'data-energywork-step="5"',
    "data-energywork-five-steps", "data-energywork-gift-offer",
    "data-energywork-personal-rates", "data-energywork-final-choices",
    "data-energywork-final-online", "data-energywork-final-personal",
    "€50", "€60",
  ]) assert.ok(page.includes(marker), "Missing course/offer marker: " + marker);
  assert.match(page, /styles\.sequenceStep/);
  assert.match(css, /\.sequenceStep\s*\{/);
  assert.match(css, /\.stepRail\s*\{/);
  assert.match(css, /\.giftOffer\s*\{/);
  assert.match(css, /\.personalRates\s*\{/);
  assert.match(css, /\.finalCtaActions\s*\{/);
  assert.match(page, /"Шаг" : locale === "es" \? "Paso" : "Step"\} \{system\.badge\}/);
  assert.ok(page.indexOf('id="energywork-flight-to-sun"') < page.indexOf('id="energywork-systems"'));
  assert.ok(page.indexOf('id="energywork-systems"') < page.indexOf('id="energywork-how"'));
  assert.ok(page.indexOf('id="energywork-how"') < page.indexOf('className={styles.finalCta}'));
  assert.match(form, /pay-what-you-wish donation/);
  assert.match(form, /добровольное пожертвование/);
  assert.match(form, /donación voluntaria/);
  assert.match(form, /€50 \/ 30 min · €60 \/ 60 min/);
});

test("Owner's Kundalini Reiki video is embedded in the promo and the dedicated course landing", async () => {
  const [registry, promo, course, css] = await Promise.all([
    read("data/academy/english-guided-meditations.ts"),
    read("components/principles-of-energywork.tsx"),
    read("components/kundalini-reiki-course.tsx"),
    read("components/kundalini-reiki-course.module.css"),
  ]);
  assert.match(registry, /key: "kundalini-reiki",[\s\S]*?youtubeId: "_IOX0E8N-To"/);
  assert.match(promo, /key === "kundalini-reiki"/);
  assert.match(course, /key === "kundalini-reiki"/);
  assert.match(course, /<AcademyVideoPlayer youtubeId=\{meditation\.youtubeId\}/);
  assert.match(course, /videoCopy\.eyebrow/);
  assert.match(css, /\.meditationFrame/);
  assert.match(css, /@media \(max-width:760px\)/);
  assert.doesNotMatch(promo, /data-video-source-pending="kundalini"/);
});

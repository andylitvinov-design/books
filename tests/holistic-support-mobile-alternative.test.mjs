import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const route = read("app/[locale]/holistic-support/mobile/page.tsx");
const client = read("components/holistic-support-mobile.tsx");
const css = read("components/holistic-support-mobile.module.css");
const chooser = read("components/holistic-support-choices.tsx");
const nav = read("components/mobile-bottom-navigation.tsx");

test("alternate support screen is separate, linked and localized without replacing the original", () => {
  const standard = read("app/[locale]/holistic-support/page.tsx");
  assert.match(standard, /<HolisticSupportChoices locale=\{locale\}/);
  assert.match(standard, /<HolisticMeditationGallery locale=\{locale\}/);
  assert.match(chooser, /data-support-alternative-link/);
  assert.match(chooser, /\/holistic-support\/mobile/);
  for (const locale of ["en", "ru", "es"]) {
    assert.match(route, new RegExp(locale + ': "/' + locale + '/holistic-support/mobile"'));
  }
  assert.match(route, /robots: \{ index: false, follow: true \}/);
  assert.match(nav, /holistic-support/);
  assert.match(nav, /\(\?:mobile\|mandala\)/);
  assert.match(client, /data-support-mobile-bottom-nav/);
});

test("personal scores and photos are local-only and accessible; no fake completion or payment", () => {
  assert.match(client, /type="range" min="1" max="10"/);
  assert.match(client, /aria-valuetext=\{scores\[id\]/);
  assert.match(client, /type="file" accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(client, /URL\.createObjectURL\(file\)/);
  assert.match(client, /URL\.revokeObjectURL\(photoUrl\)/);
  assert.match(client, /8 \* 1024 \* 1024/);
  assert.match(client, /data-support-recommendations/);
  assert.match(client, /recommendSupportByLowestScores\(/);
  assert.match(client, /Videos opened here|Видео открыто здесь|Vídeos abiertos aquí/);
  assert.doesNotMatch(client, /localStorage|sessionStorage|fetch\(|navigator\.sendBeacon|URLSearchParams|paid:\s*true/);
  assert.match(read("components/holistic-support-master-gallery.tsx"), /<RemoteEnergySupportBooking/);
  assert.match(client, /<TaoistTalismanCatalog/);
});

test("four real recording cards from published sources, not arbitrary stock samples", () => {
  assert.match(route, /freeMeditationVideos\("ru"\)/);
  assert.match(route, /englishGuidedMeditations/);
  assert.match(route, /youtubeId!/);
  assert.match(read("data/academy/english-guided-meditations.ts"), /key: "kundalini-reiki"/);
  assert.match(client, /\.slice\(0, 4\)/);
  assert.match(client, /data-support-video=\{video\.id\}/);
  assert.match(client, /youtube-nocookie\.com\/embed/);
  assert.match(client, /onClick=\{startVideo\}/);
  assert.match(client, /setPlaying\(false\)/);
  assert.match(client, /allowFullScreen loading="eager"/);
  assert.match(client, /noopener noreferrer/);
  assert.doesNotMatch(client, /<audio|autoplay=\{true\}|hardcodedYoutubeId|youtubeId: "[a-zA-Z0-9_-]{11}"/);
});

test("playback keeps visible selectors and explicit meditation topics filter honestly", () => {
  assert.ok(client.includes('data-playing={playing ? "true" : "false"}'));
  assert.ok(client.includes('theme !== "all"'));
  assert.ok(client.includes('return eligible.slice(0, 4)'));
  assert.ok(css.includes('.hero[data-playing="true"] .heroFilters'));
  assert.ok(css.includes('.iframeWrap { position: relative'));
  assert.ok(css.includes('aspect-ratio: 16 / 9'));
});

test("mobile mock structure and large-text 320–430 layout with no duplicate global nav", () => {
  for (const key of ["energy", "money", "relationships", "goals"]) {
    assert.ok(client.includes(key), key);
  }
  for (const label of [
    "Мастер", "Программа", "Тема", "Консультация", "Талисман",
    "Подобрать рекомендации", "Начать медитацию", "Мой прогресс",
  ]) assert.ok(client.includes(label), label);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /@media \(max-width: 350px\)/);
  assert.match(css.slice(css.indexOf(".bottomNav {"),css.indexOf(".bottomNav >")), /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /font-size: 17px/);
  assert.match(css, /min-height: 43px/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /prefers-reduced-motion/);
});

test("support mobile dock opens the EXISTING Messages conversations in EN/RU/ES", () => {
  const page = read("app/[locale]/app/messages/page.tsx");
  const orders = read("components/app/messages-orders-clients.jsx");
  const inbox = read("components/app/messages-hub.jsx");
  assert.match(client, /data-support-mobile-bottom-nav/);
  assert.match(client, /data-support-mobile-messages/);
  assert.match(client, /href=\{"\/" \+ locale \+ "\/app\/messages\?tab=chats"\} prefetch=\{false\}/);
  for (const pair of ['navMessages: "Messages"', 'navMessages: "Сообщения"', 'navMessages: "Mensajes"'])
    assert.ok(client.includes(pair), pair);
  // The tab query is critical: without it the existing route initially shows
  // Orders, not the already-approved person-by-person conversations.
  assert.match(orders, /q\.has\('tab'\)\?'clients':'orders'/);
  assert.match(inbox, /VALID_TABS=new Set\(\['chats','requests'\]\)/);
  assert.match(page, /<MessagesOrdersClients locale=\{locale\}><MessagesHub locale=\{locale\}\/><\/MessagesOrdersClients>/);
  assert.match(inbox, /<MessagesSimpleInbox/);
  assert.match(inbox, /<DirectMessageInbox/);
  assert.doesNotMatch(client, /<DirectMessageInbox|<CrmMessengerPanel|<MessagesHub/);
  const dock = css.slice(css.indexOf(".bottomNav {"), css.indexOf(".bottomNav >"));
  assert.match(dock, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 350px\)[\s\S]*?\.bottomNav > :is\(a,button\)/);
  assert.match(css, /safe-area-inset-bottom/);
});

test("new TSX and route transpile without TypeScript parser diagnostics", () => {
  for (const [name, input] of [["page", route], ["workspace", client]]) {
    const result = ts.transpileModule(input, {
      fileName: name + ".tsx",
      reportDiagnostics: true,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    });
    const errors = (result.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error);
    assert.deepEqual(errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, " ")), []);
  }
});

test("quick matching uses the lowest ratings while goal filtering expands the same video stage", () => {
  const model = read("lib/holistic-support/recommendation-engine.js");
  const assessment = client.split('<section className={styles.assessment}')[1].split("</section>")[0];
  const profile = client.split('<section className={styles.profile}')[1].split("</section>")[0];
  const tools = client.split('<section className={styles.tools}')[1].split("</section>")[0];
  assert.match(assessment, /data-support-goal-filter-trigger/);
  assert.match(assessment, /onClick=\{openGoalFilter\}/);
  assert.doesNotMatch(assessment, /data-support-recommendations/);
  assert.doesNotMatch(assessment, /data-support-detailed-analysis/);
  assert.match(profile, /focusSelector|data-support-active-focus/);
  assert.match(profile, /data-support-recommendations/);
  assert.match(profile, /onClick=\{onRecommendations\}/);
  assert.doesNotMatch(profile, /<select/);
  assert.match(profile, /data-support-photo/);
  assert.match(tools, /choices\.filter\(item => item\.id !== "pump"\)/);
  assert.match(tools, /data-support-tool="pump"/);
  assert.match(tools, /className=\{styles\.toolShortcuts\}/);
  assert.match(client, /recommendSupportByLowestScores\(\{ scores: recommendation, videos, locale \}\)/);
  assert.match(client, /rankSupportGoalVideos\(\{ selection: goalSelection, videos, locale \}\)/);
  assert.match(client, /<HolisticSupportGoalFilter locale=\{locale\}/);
  assert.match(client, /setRecommendation\(asFocusScores\(scores\)\)/);
  assert.match(client, /goals: values\.meaning/);
  assert.match(client, /checkinOrder: CheckinArea\[\] = \["energy", "money", "relationships", "meaning"\]/);
  assert.doesNotMatch(client, /energy: 5, money: 5, relationships: 5, goals: 5, meaning: 5/);
  assert.match(client, /setRecommendation\(null\)/);
  assert.match(client, /data-support-meditation-basis role="status"/);
  assert.match(client, /suggested\.priorities\.map\(/);
  assert.match(client, /data-support-meditation-gallery/);
  assert.match(client, /data-support-video=\{video\.id\}/);
  assert.doesNotMatch(client, /data-support-personal-recommendations|data-support-recommended-video|data-support-recommended-talisman/);
  assert.match(client, /id="support-meditation-gallery"/);
  assert.ok(client.indexOf('data-support-player data-playing=') <
    client.indexOf('id="support-meditation-gallery"'), "large scenic video must precede four miniatures");
  assert.match(client, /<HolisticSupportTalismanViewer key=\{focus\}/);
  assert.match(client, /<TaoistTalismanCatalog/);
  assert.match(client, /hidden=\{!talismanCatalogOpen\}/);
  assert.match(client, /id: "healing", Icon: HandHeart/);
  assert.match(client, /pump: "Courses", healing: "Reiki support"/);
  assert.match(client, /pump: "Курсы", healing: "Рейки поддержка"/);
  assert.match(client, /pump: "Cursos", healing: "Apoyo Reiki"/);
  const courseProfiles = read("components/holistic-support-course-profiles.tsx");
  assert.match(client, /choice === "tests" \? \(\s*<section className=\{styles\.testsPanel\}/);
  assert.match(courseProfiles, /data-support-courses-panel/);
  assert.match(client, /data-support-healing-panel/);
  assert.match(courseProfiles, /\/academy\/reiki\/tantra-reiki\/discover/);
  assert.match(read("app/[locale]/services/remote-energy-support/page.tsx"), /<RemoteEnergySupportBooking/);
  assert.match(client, /data-support-tool="masters"/);
  assert.match(read("components/holistic-support-master-gallery.tsx"), /"\/masters"/);
  assert.match(read("components/holistic-support-master-gallery.tsx"), /\/personality-profiles/);
  assert.match(read("components/holistic-support-master-gallery.tsx"), /<RemoteEnergySupportBooking/);
  assert.match(css, /grid-template-areas: "assessment profile tools"/);
  assert.match(css, /grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.toolShortcuts \{ display: grid;/);
  assert.match(css, /\.toolMicro \{ display: block;/);
  assert.match(css, /\.page \.assessment > \.goalFilterTrigger/);
  assert.match(css, /\.page \.profile > \.recommendButton/);
  assert.match(css, /\.gallerySelection/);
  assert.match(css, /\.heroBody \.playButton \{ position: relative; top: 8px;/);
  assert.match(model, /export function recommendSupportByLowestScores/);
  assert.match(model, /TALISMAN_BY_FOCUS/);
  assert.match(model, /YOUTUBE_ID/);
  assert.doesNotMatch(model, /fetch\(|localStorage|sessionStorage|navigator\.sendBeacon|\bdiagnose\(/);
});


test("same-window talisman viewer reuses real images, local basket, and protected quote form in all locales", () => {
  const viewer = read("components/holistic-support-talisman-viewer.tsx");
  const viewerCss = read("components/holistic-support-talisman-viewer.module.css");
  const cart = read("components/taoist-talisman-cart.tsx");
  const cartCss = read("components/taoist-talisman-cart.module.css");
  const source = read("lib/practitioners/taoist-talismans.js");
  const storage = read("lib/practitioners/taoist-talisman-cart.js");
  assert.match(client, /<HolisticSupportTalismanViewer key=\{focus\}/);
  assert.match(client, /<TaoistTalismanCatalog/);
  assert.match(client, /hidden=\{!talismanCatalogOpen\}/);
  assert.match(viewer, /data-support-talisman-viewer/);
  assert.match(viewer, /src=\{selected\.image\}/);
  assert.match(viewer, /onTouchStart=\{touchStart\}/);
  assert.match(viewer, /onTouchEnd=\{touchEnd\}/);
  assert.match(viewer, /Math\.abs\(dx\) > 45/);
  assert.match(viewer, /data-support-talisman-next/);
  assert.match(viewer, /data-support-talisman-thumb=\{item\.id\}/);
  assert.match(viewer, /data-support-talisman-filter="goal"/);
  assert.match(viewer, /saveBrowserTalismanCart/);
  assert.match(viewer, /<dialog ref=\{dialogRef\}/);
  assert.match(viewer, /<TaoistTalismanCart locale=\{locale\} inline/);
  assert.match(cart, /sourcePath: "\/" \+ locale \+ "\/holistic-support"/);
  assert.match(cart, /data-inline=\{inline \? "true"/);
  assert.match(cart, /data\?\.saved !== true \|\| data\?\.contactPending !== false/);
  assert.match(cartCss, /\.shell\[data-inline="true"\]/);
  assert.match(storage, /sessionStorage/);
  assert.match(source, /fu-balance/);
  assert.match(source, /fu-prosperity/);
  assert.match(source, /fu-harmony/);
  assert.match(viewerCss, /scroll-snap-type: x mandatory/);
  assert.match(viewerCss, /@media\(max-width:350px\)/);
  for (const text of ["Request talisman", "Заказать талисман", "Solicitar talismán"]) {
    assert.ok(viewer.includes(text), "localized call to request: " + text);
  }
  assert.doesNotMatch(viewer, /fetch\(|localStorage|sessionStorage|navigator\.sendBeacon|autoplay=1/);
  const parsed = ts.transpileModule(viewer, {
    fileName: "holistic-support-talisman-viewer.tsx", reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  assert.deepEqual((parsed.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error)
    .map(d => ts.flattenDiagnosticMessageText(d.messageText, " ")), []);
});


test("all support modes share scenic hero → actual miniature choices without fake masters", () => {
  const galleries = read("components/holistic-support-master-gallery.tsx");
  const masterCss = read("components/holistic-support-master-gallery.module.css");
  const talismanCss = read("components/holistic-support-talisman-viewer.module.css");
  const talisman = read("components/holistic-support-talisman-viewer.tsx");
  assert.match(client, /<HolisticSupportMasterGallery locale=\{locale\} kind=\{choice\}/);
  assert.match(client, /<HolisticSupportMasterGallery locale=\{locale\} kind="consultation"/);
  assert.match(client, /data-support-tool="masters"/);
  assert.match(client, /data-support-healing-panel/);
  assert.match(client, /data-support-consultation-panel/);
  assert.match(galleries, /data-support-master-hero=\{id\(selected\)\}/);
  assert.match(galleries, /data-support-master-rail/);
  assert.match(galleries, /data-support-master-thumb=\{id\(entry\)\}/);
  assert.match(galleries, /RemoteEnergySupportBooking key=\{selectedMaster.serviceId\}/);
  assert.match(galleries, /preferredPractitioner=\{selectedMaster.slug\}/);
  assert.match(galleries, /mode="inline" selectedKind="energy"/);
  assert.match(galleries, /credentials: "omit"/);
  assert.match(galleries, /\/api\/public\/remote-energy-support-masters\?locale=/);
  assert.match(galleries, /&kind=consultation/);
  assert.match(galleries, /setOrderOpen\(true\)/);
  assert.match(galleries, /validOffer\(offer, locale\)/);
  assert.match(galleries, /data-support-master-request/);
  assert.match(galleries, /data-support-offer-request/);
  assert.match(galleries, /\/personality-profiles/);
  assert.doesNotMatch(galleries, /saveBrowserTalismanCart|hardcodedMaster/);
  assert.match(masterCss, /\.hero\{/);
  assert.match(masterCss, /\.rail\{/);
  assert.match(masterCss, /\.thumb\[aria-pressed="true"\]/);
  assert.match(talismanCss, /\.rail\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(talismanCss, /\.heroCopy h2\{font-family:Arial/);
  assert.match(talisman, /data-support-talisman-request/);
  assert.ok(galleries.indexOf('className={styles.hero}') < galleries.indexOf('className={styles.more}'),
    "master/consultation hero must precede gallery");
  assert.ok(talisman.indexOf('className={styles.hero}') < talisman.indexOf('className={styles.more}'),
    "talisman hero must precede gallery");
  const parsed = ts.transpileModule(galleries, {
    fileName: "holistic-support-master-gallery.tsx", reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  assert.deepEqual((parsed.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error)
    .map(d => ts.flattenDiagnosticMessageText(d.messageText, " ")), []);
});

test("Maya Egyptian and Greek mysteries use existing Russian Academy courses, not duplicated video manifests", () => {
  const manifest = JSON.parse(read("data/academy/psimaster-media.generated.json"));
  const curricula = JSON.parse(read("data/academy/psimaster-sources.generated.json"));
  const count = new Map([
    ["videos/maya-archetypes", 6],
    ["videos/egypt-osiris", 7],
    ["videos/greek-mysteries-demeter", 5],
    ["videos/greek-mysteries-dionysus", 7],
  ]);
  assert.equal(manifest.length, 45, "source media inventory must remain unchanged");
  assert.equal(curricula.length, 22, "original course inventory must remain unchanged");
  for (const id of [
    "mysteries/maya-aztec/feathered-serpent",
    "mysteries/egypt/high-wisdom",
    "mysteries/greece-rome/beauty-and-power",
  ]) {
    assert.equal(curricula.filter(entry => entry.logicalId === id && entry.sourceLocale === "ru").length, 1, id);
    assert.ok(route.includes('programId: "' + id + '"'), id + " in source catalogue lookup");
  }
  for (const [id, expected] of count) {
    const lessons = manifest.filter(entry => entry.logicalId === id);
    assert.equal(lessons.length, expected, id);
    assert.equal(new Set(lessons.map(entry => entry.videoId)).size, expected, "unique original lessons");
    assert.ok(lessons.every(entry => entry.status === "verified_legacy_public_embed"), id);
    assert.ok(route.includes('"' + id + '"'), id + " links to original manifest");
  }
  assert.match(route, /findAcademyRecord\(entry\.programId, "ru"\)/);
  assert.match(route, /findAcademyRecord\(logicalId, "ru"\)/);
  assert.match(route, /mediaForRecord\(record\)/);
  assert.match(route, /youtubeIdFromUrl\(media\.mediaUrl\)/);
  assert.match(route, /if \(locale === "ru"\)/);
  assert.match(route, /videos=\{videos\} courses=\{originalMysteryCourses\}/);
  assert.match(route, /poster: "https:\/\/i\.ytimg\.com\/vi\/"/);
  assert.doesNotMatch(route, /new YouTube upload|generateHeyGen|createCourse\(/);
});

test("Russian course media picker returns in Courses while the four profiles live in Tests", () => {
  const courseProfiles = read("components/holistic-support-course-profiles.tsx");
  const courseCss = read("components/holistic-support-course-profiles.module.css");
  assert.match(client, /const scene = choice === "meditation" \|\| choice === "pump"/);
  assert.match(client, /choice === "tests" \? \(\s*<section className=\{styles\.testsPanel\}/);
  assert.match(client, /data-support-mystery-course=\{course\.id\}/);
  assert.match(client, /data-support-active-course-link/);
  assert.match(client, /<HolisticSupportCourseProfiles locale=\{locale\} courses=\{courses\}/);
  assert.match(courseProfiles, /courses\.length \? <details[^>]*data-support-mystery-courses/);
  assert.match(courseProfiles, /courses\.map\(course => <Link href=\{course\.href\} prefetch=\{false\} key=\{course\.id\}/);
  assert.match(courseProfiles, /<strong>\{course\.shortTitle\}<\/strong>/);
  assert.match(courseProfiles, /\{course\.videoCount\} \{t\.videos\}/);
  assert.match(courseProfiles, /src=\{course\.poster\}/);
  assert.match(courseProfiles, /\/academy\`/);
  assert.match(courseProfiles, /\/academy\/reiki\/tantra-reiki\/discover/);
  // Original manifests remain single-source. The course picker is reachable
  // again, while the four self-rating profile cards belong to Tests.
  assert.match(client, /const browseVideos = useMemo\(\(\) => choice === "pump"/);
  assert.match(client, /courses\.flatMap\(course => course\.videos\)/);
  assert.match(client, /recommendSupportByLowestScores\(\{ scores: recommendation, videos, locale \}\)/);
  assert.match(client, /rankSupportGoalVideos\(\{ selection: goalSelection, videos, locale \}\)/);
  assert.match(client, /data-support-filter="program"/);
  assert.match(client, /\{activeProgramValues\.map\(key =>/);
  assert.match(courseCss, /\.originals \{ display:grid; grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(courseCss, /\.originals a:focus-visible/);
  assert.match(courseCss, /@media \(max-width:640px\)[\s\S]*?\.originals \{ grid-template-columns:1fr/);
  assert.match(courseCss, /@media \(max-width:350px\)/);
  assert.doesNotMatch(client, /<iframe[^>]+autoPlay/);
});

test("central Tests and right-hand Video Mandala are swapped without returning to the old UI", () => {
  const mandalaPage = read("app/[locale]/holistic-support/mandala/page.tsx");
  const mandalaClient = read("components/mandala-meditation-client.tsx");
  const profile = client.split('<section className={styles.profile}')[1].split('</section>')[0];
  const tools = client.split('<section className={styles.tools}')[1].split('</section>')[0];
  assert.ok(profile.indexOf('data-support-photo') < profile.indexOf('data-support-tool="tests"'),
    "Tests now appears directly beneath the photo");
  assert.match(profile, /className=\{styles\.testsShortcut\}/);
  assert.match(profile, /onClick=\{\(\) => changeChoice\("tests"\)\}/);
  assert.doesNotMatch(profile, /data-support-video-mandala/);
  assert.match(tools, /className=\{styles\.mandalaShortcut\}/);
  assert.match(tools, /data-support-video-mandala/);
  assert.match(tools, /"\/holistic-support\/mandala"/);
  for (const label of ["Video mandala", "Видео-мандала", "Vídeo mandala"]) {
    assert.ok(client.includes(label), "localized action: " + label);
  }
  assert.match(mandalaPage, /MandalaMeditationClient/);
  assert.match(mandalaPage, /HolisticSupportMandalaDock/);
  assert.match(mandalaClient, /MandalaFreeVideoStudio|data-mandala/);
  assert.match(css, /\.testsShortcut/);
  assert.match(css, /\.profile > \.testsShortcut/);
  assert.match(css, /\.toolShortcuts \.mandalaShortcut/);
  assert.doesNotMatch(profile, /fetch\(|sessionStorage|localStorage/);
});

test("4 Reiki intention filters show ONLY published Reiki methods and never invent a booking", () => {
  const gallery = read("components/holistic-support-master-gallery.tsx");
  const galleryCss = read("components/holistic-support-master-gallery.module.css");
  const talismanCss = read("components/holistic-support-talisman-viewer.module.css");
  assert.match(gallery, /data-support-reiki-filters/);
  for (const [key,method] of [["strength","Kundalini Reiki"],["love","Tantra Reiki"],
    ["purpose","Runic Reiki"],["balance","Reiki Yggdrasil"]]) {
    assert.ok(gallery.includes(key + ":"), "real intent " + key);
    assert.ok(gallery.includes(method), "practice label " + method);
  }
  for (const title of ["Поддержка энергии", "Поддержка любви", "Поддержка цели", "Поддержка сознания"]) {
    assert.ok(gallery.includes(title), title);
  }
  assert.match(gallery, /const supportedMethods = kind !== "healing" \? null/);
  assert.match(gallery, /reikiFormat === "session" \? REIKI_METHODS\[reikiFocus\]/);
  assert.doesNotMatch(gallery, /<small>\{option\.method\}<\/small>/);
  assert.match(gallery, /<strong>\{option\.label\}<\/strong>/);
  assert.match(gallery, /reikiFormat === "session" && <div className=\{styles\.reikiFocusBar\}/);
  assert.match(gallery, /REIKI_METHODS\[reikiFocus\]/);
  assert.match(gallery, /master\.methods\.some\(offersMethod\)/);
  assert.match(read("components/holistic-reiki-offer-shelf.tsx"), /data-support-reiki-unavailable/);
  assert.match(gallery, /setReikiFocus\("love"\)/);
  assert.match(gallery, /onClick=\{\(\) => \{ setReikiFocus\(value\); setMethod\(""\);/);
  assert.match(gallery, /<RemoteEnergySupportBooking/);
  assert.match(gallery, /mode="inline" selectedKind="energy"/);
  assert.doesNotMatch(gallery, /handlePayment|createPaymentIntent|new ServiceOffering|autoSubmit/);
  assert.match(galleryCss, /grid-template-columns: repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(galleryCss, /\.reikiFocusButton\[aria-pressed="true"\]/);
  assert.match(galleryCss, /height: 288px; min-height: 288px; max-height: 288px/);
  assert.match(talismanCss, /height: 288px; min-height: 288px; max-height: 288px/);
  assert.match(galleryCss, /height: 282px; min-height: 282px; max-height: 282px/);
  assert.match(talismanCss, /height: 282px; min-height: 282px; max-height: 282px/);
  assert.match(css, /\.hero \{ min-height: 288px;/);
});


test("mobile Reiki center retains the photo with Main/Filter/Description/Video-audio tabs and verified public media", () => {
  const gallery = read("components/holistic-support-master-gallery.tsx");
  const css = read("components/holistic-support-master-gallery.module.css");
  const directory = read("lib/practitioners/public-remote-support-masters.ts");
  const booking = read("components/remote-energy-support-booking.tsx");
  for (const attr of ["data-support-reiki-central","data-support-reiki-tab",
    "data-support-reiki-panel","data-support-reiki-filter","data-support-reiki-media",
    "data-support-reiki-main","data-support-reiki-apply"]) assert.ok(gallery.includes(attr),attr);
  for (const label of ["Главное","Фильтр","Описание","Видео / аудио",
    "Main","Description","Video / audio","Inicio","Descripción","Vídeo / audio"]) {
    assert.ok(gallery.includes(label),label);
  }
  assert.match(gallery, /data-support-master-hero=\{selected \? id\(selected\)/);
  assert.match(css, /\.reikiStage:not\(\[data-active-tab="filter"\]\)/);
  // A shared mobile-page rule sets font:inherit on all buttons. Reiki selectors
  // must win that cascade or the real iPhone UI inflates into 100px tall tiles.
  assert.match(css, /\.reikiStage \.reikiStageTab \{/);
  assert.match(css, /\.reikiStage \.reikiOptions button \{/);
  assert.match(gallery, /data-support-reiki-photo-intro/);
  assert.match(gallery, /reikiStageBackdrop\} src="\/images\/holistic-house\/reiki-approved-sunrise-v3\.webp"/);
  const sunrise = readFileSync(new URL("../public/images/holistic-house/reiki-approved-sunrise-v3.webp", import.meta.url));
  assert.ok(sunrise.byteLength > 20_000, "hero must use the approved full-quality image, not 3 KB thumbnail");
  assert.match(gallery, /const PRICE_BANDS: Exclude<ReikiPrice, "all">\[\]/);
  assert.match(css, /height: 288px; min-height: 288px; max-height: 288px/);
  assert.match(css, /@media \(max-width:350px\)/);
  assert.match(directory, /isPublicPresentationUrl/);
  assert.match(directory, /intro\.media\.kind === "external"/);
  assert.doesNotMatch(directory, /presentations:\s*service\.serviceIntroductions/);
  assert.match(booking, /initialIntention\?: string/);
  assert.match(booking, /const \[intention, setIntention\] = useState\(initialIntention\)/);
  assert.match(gallery, /initialIntention=\{kind === "healing" \? filteredRequest : ""\}/);
});

test("Reiki options show 3 formats and report modes, with session-only provider and non-session certificate", () => {
  const gallery = read("components/holistic-support-master-gallery.tsx");
  const css = read("components/holistic-support-master-gallery.module.css");
  for (const label of ["Сессия","Инициация","Программа","Краткий",
    "Личный разбор текстом","Личный разбор голосом",
    "В течение суток","В течение 3 дней","В выбранный час",
    "От практика","От Рейки-мастера","С выдачей сертификата"]) assert.ok(gallery.includes(label),label);
  for (const section of ["data-support-reiki-format","data-support-reiki-price",
    "data-support-reiki-timing","data-support-reiki-report",
    "data-support-reiki-provider","data-support-reiki-certificate"]) assert.ok(gallery.includes(section),section);
  assert.match(gallery, /reikiFormat === "session" \? <fieldset[\s\S]*?data-support-reiki-provider/);
  assert.match(gallery, /: <label className=\{styles\.reikiCertificate\} data-support-reiki-certificate>/);
  assert.match(gallery, /setReikiRole\("any"\); setReikiCertificate\(false\)/);
  assert.match(gallery, /reikiPrice === "all" \|\| reikiPrice === "free"/);
  assert.match(gallery, /!reikiCertificate/);
  assert.match(gallery, /matchesReikiEuroPrice\(master, reikiPrice, option\.price\)/);
  assert.match(gallery, /master\.currency !== "EUR"/);
  assert.match(gallery, /price > 20 && price <= 50/);
  assert.match(gallery, /price > 50 && price <= 100/);
  assert.match(gallery, /price > 100/);
  assert.match(gallery, /priceOptions: matchingPriceOptions/);
  assert.match(gallery, /REIKI_FREE_COURSE_PATH/);
  assert.match(gallery, /listPublicReikiAcademyOffers\(locale\)\.filter\(offer => offer\.kind === "initiation"\)/);
  assert.match(gallery, /const selectedInitiation = reikiInitiations\.find\(offer => offer\.id === reikiInitiationId\) \|\| null/);
  assert.match(gallery, /selectedInitiation\?\.href \|\| reikiInitiations\[0\]\?\.href/);
  assert.match(gallery, /data-support-reiki-initiation-types/);
  assert.doesNotMatch(gallery, /free-initiation#initiation-choices/);
  assert.match(css, /\.reikiOptions\[data-cols="price"\]/);
  assert.match(css, /grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(gallery, /24 (?:offers|предложения|ofertas)/);
});

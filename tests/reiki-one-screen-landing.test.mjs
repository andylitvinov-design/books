import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read = (path) => readFile(path, "utf8");
test("Reiki landings share viewport stages and closed, accessible source detail", async () => {
  const [route, styles, ygg, module, book, tantra, journey, kundalini] = await Promise.all([
    read("app/[locale]/academy/[[...slug]]/page.tsx"),
    read("app/reiki-landing-screens.css"),
    read("components/yggdrasil-program-landing.tsx"),
    read("components/yggdrasil-module-landing.tsx"),
    read("components/yggdrasil-basic-course-description.tsx"),
    read("components/academy-record-page.tsx"),
    read("components/tantra-reiki-journey.tsx"),
    read("components/kundalini-reiki-course.tsx"),
  ]);
  assert.match(route, /import "@\/app\/reiki-landing-screens\.css"/);
  assert.match(styles, /scroll-snap-type: x proximity/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(styles, /summary:focus-visible/);
  assert.match(ygg, /reiki-module-jumps/);
  assert.match(ygg, /yggdrasil-module-grid" tabIndex=\{0\}/);
  assert.match(ygg, /yggdrasil-basic-level-attunements reiki-disclosure/);
  assert.match(ygg, /reiki-optional-capture/);
  assert.match(module, /reiki-roadmap-track/);
  assert.match(module, /reiki-disclosure--archive/);
  assert.match(book, /<details className="reiki-full-manual">/);
  assert.ok(book.indexOf("yggdrasil-description-summary") < book.indexOf("yggdrasil-full-book"), "overview should precede the long manual");
  assert.match(tantra, /tantra-course-hero reiki-screen/);
  assert.match(tantra, /TantraReikiProgrammeModules/);
  assert.match(journey, /tantra-journey__extras"/);
  assert.doesNotMatch(journey, /<details className="tantra-journey__extras" open=/);
  assert.match(kundalini, /className=\{styles\.levels\}/);
  assert.doesNotMatch(kundalini, /reiki-kundalini-levels|reiki-card-track/);
  assert.match(kundalini, /className=\{styles\.sourceDrawer\}/);
  assert.match(kundalini, /kundaliniOriginalManual\.fileName/);
});


test("Kundalini shows compact fire-colour photo panels and reuses the safe CRM selector", async () => {
  const [page, css, capture, captureStyles] = await Promise.all([
    read("components/kundalini-reiki-course.tsx"),
    read("components/kundalini-reiki-course.module.css"),
    read("components/kundalini-reiki-order-capture.tsx"),
    read("components/academy-course-capture.module.css"),
  ]);
  for (const path of [
    "/images/holistic-house/reiki-approved-sunrise-v3.webp",
    "/images/holistic-house/hero-olive-incense.webp",
    "/images/holistic-house/andy-about.png",
  ]) assert.ok(page.includes(path), "Use a verified same-origin photo: " + path);
  assert.ok(page.indexOf('id="kundalini-title"') < page.indexOf('id="kundalini-levels"'));
  assert.ok(page.indexOf('id="kundalini-levels"') < page.indexOf('id="kundalini-meditation-title"'));
  assert.ok(page.indexOf('id="kundalini-meditation-title"') < page.indexOf('id="kundalini-manual"'));
  assert.match(page, /<KundaliniReikiOrderCapture locale=\{locale\} \/>/);
  assert.doesNotMatch(page, /https:\/\/wa\.me|function enquiryUrl/);
  assert.match(page, /data-reiki-course-cta/);
  assert.match(page, /href=\{freeLevelHref\(locale\)\}/);
  assert.match(page, /href=\{REIKI_FREE_COURSE_PATH\}/);
  assert.match(page, /<AcademyVideoPlayer youtubeId=\{meditation\.youtubeId\}/);
  assert.match(page, /<details className=\{styles\.levelDetail\}>/);
  assert.match(page, /className=\{styles\.heroVisual\}/);
  assert.match(css, /#fff4cb|#ffe8ab/);
  assert.match(css, /#971c16/);
  assert.match(css, /\.levels \{ grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-height: 700px\)/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(capture, /method: "POST"|<ContactChannelChooser/);
  assert.match(captureStyles, /:global\(\.reiki-kundalini-page\) \.capture/);
});
, and a clear free-first next step", async () => {
  const [page, css] = await Promise.all([
    read("components/kundalini-reiki-course.tsx"),
    read("components/kundalini-reiki-course.module.css"),
  ]);
  for (const path of [
    "/images/holistic-house/reiki-approved-sunrise-v3.webp",
    "/images/holistic-house/hero-olive-incense.webp",
    "/images/holistic-house/andy-about.png",
  ]) assert.ok(page.includes(path), "Use the verified same-origin visual: " + path);
  assert.ok(page.indexOf("id=\"kundalini-title\"") < page.indexOf("id=\"kundalini-levels\""));
  assert.ok(page.indexOf("id=\"kundalini-levels\"") < page.indexOf("id=\"kundalini-meditation-title\""));
  assert.ok(page.indexOf("id=\"kundalini-meditation-title\"") < page.indexOf("id=\"kundalini-manual\""));
  assert.ok(page.indexOf("id=\"kundalini-manual\"") < page.indexOf("id=\"kundalini-enquire\""));
  assert.match(page, /data-reiki-course-cta/);
  assert.match(page, /href=\{freeLevelHref\(locale\)\}/);
  assert.match(page, /href=\{REIKI_FREE_COURSE_PATH\}/);
  assert.match(page, /<AcademyVideoPlayer youtubeId=\{meditation\.youtubeId\}/);
  assert.match(page, /<details className=\{styles\.levelDetail\}>/);
  assert.match(css, /\.levels \{ display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.levels \{ grid-template-columns: 1fr;/);
  assert.match(css, /\.page \.hero/);
  assert.match(css, /overflow-x: clip/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
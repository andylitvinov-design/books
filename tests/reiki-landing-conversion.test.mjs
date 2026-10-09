import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Reiki landing shows meditation, free first level and consultation before reviews", async () => {
  const hub = await readFile("components/yggdrasil-program-landing.tsx", "utf8");
  const meditation = hub.indexOf("<YggdrasilMeditationFeature");
  const leads = hub.indexOf("<YggdrasilLeadForms");
  const reviews = hub.indexOf("<YggdrasilTestimonials");
  const courseVideos = hub.indexOf("<YggdrasilEnglishVideoGuide");
  assert.ok(meditation > 0 && meditation < leads && leads < reviews && reviews < courseVideos);
  assert.match(hub, /href="#reiki-free-level-one"/);
  assert.match(hub, /Rediscover your centre/);
  assert.match(hub, /Encuentra tu centro/);
});

test("Reiki Yggdrasil now uses the compact three-choice blue capture", async () => {
  const [wrapper, capture, css] = await Promise.all([
    readFile("components/reiki-landing-forms.tsx", "utf8"),
    readFile("components/reiki-choice-capture.tsx", "utf8"),
    readFile("components/reiki-choice-capture.module.css", "utf8"),
  ]);
  assert.match(wrapper, /<ReikiChoiceCapture locale=\{locale\} course="yggdrasil"/);
  assert.match(capture, /"guide", "free", "master"/);
  assert.match(capture, /data-reiki-choice-capture=\{course\}/);
  assert.match(capture, /aria-pressed=\{selected === choice\}/);
  assert.match(capture, /id="reiki-free-consultation"/);
  assert.match(capture, /course === "tantra" \? "tantra-next-steps" : "reiki-free-level-one"/);
  assert.match(capture, /Free express initiation/);
  assert.match(capture, /Бесплатная первая ступень/);
  assert.match(capture, /Скачать подробное описание/);
  assert.match(capture, /wa\.me\/14376066502/);
  assert.match(capture, /t\.me\/AndyTherapist/);
  assert.match(capture, /download=\{download \? true : undefined\}/);
  for (const tag of ["<form", "<input", "<textarea", "<select", "new FormData"]) {
    assert.ok(!capture.includes(tag), "Unexpected long lead form: " + tag);
  }
  assert.match(css, /linear-gradient\(125deg, #e9f7fe/);
  assert.match(css, /\.choice\[data-selected="true"\]/);
  assert.match(css, /@media \(max-width: 640px\)/);
});

test("all ten YouTube testimonials are immediately accessible, with accurate classification", async () => {
  const [testimonials, audit] = await Promise.all([
    readFile("components/yggdrasil-testimonials.tsx", "utf8"),
    readFile("data/academy/yggdrasil-legacy-english-videos.ts", "utf8"),
  ]);
  assert.match(testimonials, /yggdrasilVideoTestimonials.map/);
  assert.doesNotMatch(testimonials, /<details/);
  assert.match(testimonials, /yggdrasil-testimonial-card__top/);
  for (const id of ["wN_SNwZ1Epo", "3Apc8P1Yudc", "XvMdX5czoOc", "hjmVJrgEsZ8", "u275Zz78vhs", "3msoUyWr6bY", "0G_xvbuClII", "Hk9XpeUI0BQ", "Nx8DwWk27VY", "p29qu8-dtZk"]) {
    assert.ok(audit.includes(id));
  }
});

test("Russian lesson videos are preserved but collapsed by default at bottom", async () => {
  const [guide, meditation] = await Promise.all([
    readFile("components/yggdrasil-english-video-guide.tsx", "utf8"),
    readFile("components/yggdrasil-meditation-feature.tsx", "utf8"),
  ]);
  assert.match(guide, /level.steps.map/);
  assert.match(guide, /RU audio · Original class/);
  assert.match(guide, /<details className="yggdrasil-russian-video-archive">/);
  assert.match(guide, /Collapsed · \{recordingCount\} Russian-language videos hidden · Tap to expand/);
  assert.doesNotMatch(guide, /<details[^>]+open=/);
  assert.match(guide, /Show videos/);
  assert.match(guide, /Hide videos/);
  assert.match(guide, /<AcademyVideoPlayer youtubeId=\{recording.youtubeId\}/);
  assert.match(guide, /id=\{scope === "all" \? "yggdrasil-english-guide"/);
  assert.match(meditation, /recording.youtubeId \? \(/);
  assert.match(meditation, /<AcademyVideoPlayer youtubeId=\{recording.youtubeId\}/);
  assert.doesNotMatch(meditation, /wN_SNwZ1Epo|qM_nFUkYJ1k/);
});

test("Tantra Reiki ends with the shared selector, without a long Master application", async () => {
  const [page, wrapper, chooser] = await Promise.all([
    readFile("components/academy-record-page.tsx", "utf8"),
    readFile("components/tantra-reiki-lead-forms.tsx", "utf8"),
    readFile("components/reiki-choice-capture.tsx", "utf8"),
  ]);
  assert.match(page, /isVerbatimTantraArchive \? <TantraReikiLeadForms locale=\{locale\}/);
  assert.match(wrapper, /<ReikiChoiceCapture locale=\{locale\} course="tantra"/);
  assert.match(chooser, /"tantra-master-course"/);
  assert.match(chooser, /Request free express initiation/);
  assert.match(chooser, /Tantra Reiki Master Course/);
  assert.match(chooser, /WhatsApp opens a prepared request/);
  assert.doesNotMatch(wrapper, /<form|<input|<select|<textarea/);
  assert.match(page, /!isCanonicalYggdrasil && !isVerbatimTantraArchive \? <PublicConsultationCta/);
});

test("mobile testimonial cards and two-stage forms have responsive spacing", async () => {
  const css = await readFile("app/academy.css", "utf8");
  assert.match(css, /\.reiki-landing-forms \{ scroll-margin-top/);
  assert.match(css, /Both contact cards fit one mobile screen/);
  assert.match(css, /\.reiki-offer-card__actions \{ display: grid/);
  assert.match(css, /\.yggdrasil-russian-video-archive\[open\]/);
  assert.match(css, /\.yggdrasil-testimonial-card__top/);
  assert.match(css, /@media \(max-width: 550px\)/);
});

test("all six download links serve actual localized detailed course guides", async () => {
  const chooser = await readFile("components/reiki-choice-capture.tsx", "utf8");
  assert.match(chooser, /"\/academy\/course-guides\/" \+ course \+ "\." \+ locale \+ "\.txt"/);
  for (const course of ["tantra", "yggdrasil"]) {
    for (const locale of ["en", "ru", "es"]) {
      const text = await readFile("public/academy/course-guides/" + course + "." + locale + ".txt", "utf8");
      assert.ok(text.length > 1100, "Guide is too short: " + course + "/" + locale);
      assert.match(text, new RegExp("holistichouse\\.vercel\\.app/" + locale + "/academy/reiki/" + (course === "tantra" ? "tantra-reiki" : "yggdrasil")));
    }
  }
});

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

test("two clear request forms work via confirmation in WhatsApp, not phantom backend", async () => {
  const forms = await readFile("components/reiki-landing-forms.tsx", "utf8");
  for (const term of ["first-level", "consultation", "motivation", "experience", "situation", "required", "wa.me/14376066502", "window.open", "preparedUrl", "reiki-free-consultation"]) {
    assert.ok(forms.includes(term), "Missing form element: " + term);
  }
  assert.match(forms, /No request is sent automatically/);
  assert.match(forms, /Tu primer nivel de Reiki Yggdrasil/);
  assert.match(forms, /Первая ступень Рейки Иггдрасиль/);
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

test("course step videos are shown at bottom without relabeling Russian audio as English", async () => {
  const [guide, meditation] = await Promise.all([
    readFile("components/yggdrasil-english-video-guide.tsx", "utf8"),
    readFile("components/yggdrasil-meditation-feature.tsx", "utf8"),
  ]);
  assert.match(guide, /level.steps.map/);
  assert.match(guide, /RU audio · Original class/);
  assert.match(guide, /<AcademyVideoPlayer youtubeId=\{recording.youtubeId\}/);
  assert.match(guide, /id=\{scope === "all" \? "yggdrasil-english-guide"/);
  assert.match(meditation, /recording.youtubeId \? \(/);
  assert.match(meditation, /<AcademyVideoPlayer youtubeId=\{recording.youtubeId\}/);
  assert.doesNotMatch(meditation, /wN_SNwZ1Epo|qM_nFUkYJ1k/);
});

test("Tantra Reiki has an embedded personal consultation form after content", async () => {
  const page = await readFile("components/academy-record-page.tsx", "utf8");
  assert.match(page, /isVerbatimTantraArchive \? <ReikiConsultationForm locale=\{locale\} course="Tantra Reiki"/);
  assert.match(page, /!isCanonicalYggdrasil && !isVerbatimTantraArchive \? <PublicConsultationCta/);
});

test("mobile testimonial cards and two-stage forms have responsive spacing", async () => {
  const css = await readFile("app/academy.css", "utf8");
  assert.match(css, /\.reiki-landing-forms \{ scroll-margin-top/);
  assert.match(css, /\.yggdrasil-testimonial-card__top/);
  assert.match(css, /@media \(max-width: 550px\)/);
});

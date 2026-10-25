import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { normalizeCourseDraft, assertPublishableCourse } from "../lib/practitioners/course-contracts.js";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const slide = kind => ({ id: randomUUID(), kind, title: "Original practice", body: "A guided pause" });

test("meditation classification survives safe normalization; ordinary lessons are not mislabeled", () => {
  const original = { title: "Morning calm", description: "Five minutes", locale: "en", slides: [slide("text")] };
  assert.equal(normalizeCourseDraft(original).contentType, "course");
  const tagged = normalizeCourseDraft({ ...original, contentType: "audio_meditation" });
  assert.equal(tagged.contentType, "audio_meditation");
  assert.ok(assertPublishableCourse(tagged));
  assert.equal(normalizeCourseDraft({ ...original, contentType: "video_meditation" }).contentType, "video_meditation");
  assert.throws(() => normalizeCourseDraft({ ...original, contentType: "clinical_patient_record" }), { code: "INVALID_COURSE_TYPE" });
});

test("public master storefront reuses moderated repositories and no private materials", async () => {
  const [page, builder, repo, articleRepo, courseRepo] = await Promise.all([
    read("app/[locale]/masters/[slug]/page.tsx"),
    read("components/app/practitioner-course-builder.jsx"),
    read("lib/practitioners/repository.js"),
    read("lib/practitioners/article-repository.js"),
    read("lib/practitioners/course-repository.js"),
  ]);
  assert.match(page, /getPublicPractitioner\(slug, locale\)/);
  assert.match(page, /publicByPractitioner\(practitioner\.slug\)/);
  assert.match(page, /createPractitionerCourseRepository\(config\)\.catalog\(\)/);
  assert.match(page, /item\.practitionerSlug === practitioner\.slug/);
  assert.match(page, /item\.course\?\.contentType === "audio_meditation"/);
  assert.match(page, /item\.course\?\.contentType === "video_meditation"/);
  assert.match(page, /profile\.videoMaterials/);
  assert.match(page, /<PractitionerServicesGrid services=\{services\} locale=\{locale\}/);
  assert.match(builder, /contentType:isMeditation\?meditationType\+'_meditation':'course'/);
  assert.match(courseRepo, /c\.status='published' and c\.published<>'\{\}'::jsonb/);
  assert.match(articleRepo, /publicSql/);
  assert.match(repo, /public_profile/);
  assert.doesNotMatch(page, /draft_profile|consultation_requests|assessment_results|crm_contacts|dangerouslySetInnerHTML/);
});

test("original language verification, honest empty states and localization on iPhone", async () => {
  const [page, css, catalog, gallery] = await Promise.all([
    read("app/[locale]/masters/[slug]/page.tsx"),
    read("app/[locale]/masters/[slug]/profile.module.css"),
    read("data/academy/holistic-support-meditations.ts"),
    read("components/practitioner-video-gallery.tsx"),
  ]);
  assert.match(page, /practitioner\.slug === "andy-litvinov"/);
  assert.match(page, /freeMeditationVideos\(ru \? "ru" : es \? "es" : "en"\)/);
  assert.match(catalog, /verified_legacy_public_embed/);
  assert.match(gallery, /youtube-nocookie\.com/);
  for (const id of ['practitioner-services','practitioner-meditations','practitioner-articles','practitioner-about']) {
    assert.ok(page.includes('id="' + id + '"'), id);
    assert.ok(page.includes('href="#' + id + '"'), id + " navigation");
  }
  for (const copy of ['Медитации · аудио и видео','Meditations · audio & video','Meditaciones · audio y vídeo','Опубликованных статей пока нет.','No published articles yet.']) assert.ok(page.includes(copy), copy);
  assert.match(css, /@media \(max-width: 650px\)/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /min-width:0/);
  assert.match(css, /:focus-visible/);
  assert.doesNotMatch(page, /testimonials|fakeRatings|fakeReviews|<iframe/);
});

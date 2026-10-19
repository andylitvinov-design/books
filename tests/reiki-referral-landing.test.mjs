import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import { energyworkSequence } from "../data/academy/energywork-ai-schema.js";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const landing = read("components/reiki-referral-landing.tsx");
const css = read("components/reiki-referral-landing.module.css");
const routes = read("app/[locale]/academy/[[...slug]]/page.tsx");
const sitemap = read("app/sitemap.ts");

test("a dedicated three-language referral route leads directly to the existing real Reiki course", () => {
  assert.match(routes, /key === "reiki\/free-practitioner-course"\) return <ReikiReferralLanding locale=\{locale\} \/>/);
  assert.match(routes, /"Тантра Рейки и энергетические практики — бесплатный курс и инициация"/);
  assert.match(routes, /"Tantra Reiki & Energywork — Free Course and Level 1 Initiation"/);
  assert.match(routes, /"Tantra Reiki — curso gratis e iniciación de Nivel 1"/);
  assert.match(sitemap, /\/reiki\/free-practitioner-course/);
  assert.match(routes, /const referralLanding = routeKey\(slug\) === "reiki\/free-practitioner-course"/);
  assert.match(routes, /tantraFreeInitiation \|\| referralLanding/);
  assert.match(landing, /const courseHref = REIKI_FREE_COURSE_PATH/);
  assert.match(read("lib/academy/reiki-free-course.ts"), /\/en\/academy\/principles-of-energywork\/learn/);
  assert.equal((landing.match(/event="academy_course_enquiry_click"/g) || []).length, 2);
});

test("offer truthfully promises a free introduction after completing the course, not automatic private attunement", () => {
  for (const phrase of [
    "Complete the course and arrange a free introductory Level 1 initiation",
    "Пройдите курс и получите бесплатную вводную инициацию I ступени",
    "Termina el curso y coordina una iniciación introductoria gratuita de Nivel 1",
    "Optional private one-to-one sessions are separate paid services",
    "Отдельные индивидуальные онлайн-сеансы и консультации являются платными услугами",
    "Andrey will review and arrange the next step personally",
    "Ваши заметки не отправляются Андрею автоматически",
  ]) assert.ok(landing.includes(phrase), phrase);
  assert.match(landing, /five lesson reports and five course answers/);
  assert.doesNotMatch(landing, /certificate automatically|guaranteed cure|automatic attunement/i);
});

test("conversion-first design is photo-led, readable on phones and avoids an extra lead form", () => {
  assert.ok(existsSync(new URL("../public/images/holistic-house/reiki-practitioner-sunrise.webp", import.meta.url)));
  assert.ok(existsSync(new URL("../public/images/holistic-house/andy-about.png", import.meta.url)));
  assert.match(landing, /reiki-practitioner-sunrise\.webp/);
  assert.match(landing, /<PublicSiteHeader locale=\{locale\}/);
  assert.match(landing, /<h1 id="reiki-referral-title">/);
  assert.match(landing, /<details key=\{item.question\}>/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /\.mainCta \{ min-height: 55px; width: 100%/);
  assert.match(css, /:focus-visible/);
  assert.doesNotMatch(landing, /<form|<input|<video|<iframe/);
});

test("shareable landing shows its image before text and primary action above secondary copy on phones", () => {
  const primary = landing.indexOf('attributes={{ "data-reiki-cta": "hero" }}');
  const supporting = landing.indexOf('<p className={styles.lead}>{t.lead}</p>');
  const secondary = landing.indexOf('attributes={{ "data-reiki-cta": "footer" }}');
  assert.ok(primary > 0 && primary < supporting && supporting < secondary,
    "the first action is visible before detailed copy");
  assert.match(css, /\.heroVisual \{ order: -1; min-height:/);
  assert.match(css, /\.heroText \{ padding: 24px 23px 23px; order: 1; \}/);
  assert.match(landing, /href=\{courseHref\}/);
  assert.doesNotMatch(landing, /learn\?start=1/);
});

test("canonical free-course entry starts at the beginning and saved learners can resume", () => {
  const course = read("components/energywork-ai-learner.tsx");
  assert.match(routes, /startAtExperience=\{query\.start === "1"\}/);
  assert.match(course, /startAtExperience\?: boolean/);
  assert.match(course, /useState\(startAtExperience \? 1 : 0\)/);
  assert.match(course, /const savedIndex = Math\.max\(0, restored\.findIndex\(\(item\) => item\.id === value\.slideId\)\)/);
  assert.match(course, /setIndex\(requestedIndex >= 0 && requestedIndex <= savedIndex \? requestedIndex : savedIndex\)/);
  assert.match(course, /startAtExperience = false/);
  assert.ok(read("data/academy/energywork-ai-curriculum.ts").includes('id: "welcome-02"'),
    "first course question remains the approved Reiki experience choice");
});

test("short referral flow is discoverable from both legacy Tantra pages without removing the existing initiation", () => {
  const tantra = read("components/tantra-free-initiation.tsx");
  const program = read("components/academy-record-page.tsx");
  assert.match(tantra, /className=\{styles\.freeCourseBridge\}/);
  assert.match(tantra, /freeCourseBridge\} href=\{REIKI_FREE_COURSE_PATH\}/);
  assert.match(program, /Try the free 5-lesson course/);
  assert.match(program, /academy\/reiki\/tantra-reiki\/free-initiation/);
  assert.match(routes, /reiki-approved-sunrise-v3\.webp/);
  assert.match(routes, /Free Reiki course and introductory initiation — Holistic House/);
});

test("after saved course completion the free initiation is named, not confused with a paid session", () => {
  const course = read("components/energywork-ai-learner.tsx");
  assert.match(course, /Request free Level 1 introduction in/);
  assert.match(course, /Запросить бесплатную вводную инициацию I ступени/);
  assert.match(course, /choice\.id === "tantra" \? "#apply-free"/);
  assert.match(course, /savedInitiationReady/);
  assert.match(course, /!busy && !saveError && dirtyRef\.current\.size === 0/);
  assert.match(course, /t\.reviewPrivate/);
});

function hydrateProgress(value, search, initialIndex = 1, course = read("components/energywork-ai-learner.tsx")) {
  const marker = "const hydrate = useCallback((value: StoredProgress) => {";
  const start = course.indexOf(marker), end = course.indexOf("\n  }, []);", start);
  assert.ok(start >= 0 && end > start, "execute the actual hydration callback");
  const state = { index: initialIndex };
  const dependencies = {
    energyworkSlides: () => energyworkSequence().map(id => ({ id })),
    accountIdRef: { current: null }, revisionRef: { current: 0 },
    progressRef: { current: "welcome-01" }, answersRef: { current: {} },
    dirtyRef: { current: new Set(["unsaved"]) },
    window: search === undefined ? undefined : { location: { search } },
  };
  for (const name of ["Index", "Answers", "SavedAt", "SharingWithTeacher", "ApplicationLead", "SaveError", "Sync"])
    dependencies["set" + name] = next => { state[name[0].toLowerCase() + name.slice(1)] = next; };
  new Function("value", ...Object.keys(dependencies), course.slice(start + marker.length, end))(value, ...Object.values(dependencies));
  return { state, dependencies };
}

test("actual saved hydration resumes its checkpoint and permits only reached deep links", () => {
  const sequence = energyworkSequence(), checkpoint = sequence.indexOf("kun-01");
  assert.ok(checkpoint > 2);
  const value = { accountId: "owner", enrolled: true, revision: 7, slideId: "kun-01", answers: { "welcome-02": "new" }, sharingWithTeacher: false };
  for (const initialIndex of [0, 1]) for (const [search, expected] of [
    [undefined, checkpoint], ["", checkpoint], ["?start=1", checkpoint],
    ["?slide=welcome-01", 0], ["?slide=flight-01", 2], ["?slide=kun-01", checkpoint],
    ["?slide=" + sequence[checkpoint + 1], checkpoint], ["?slide=missing", checkpoint], ["?slide=", checkpoint],
  ]) {
    const { state, dependencies } = hydrateProgress(value, search, initialIndex);
    assert.equal(state.index, expected, String(search));
    assert.equal(state.sync, "ready");
    assert.equal(state.answers, value.answers);
    assert.equal(state.sharingWithTeacher, false);
    assert.equal(dependencies.accountIdRef.current, "owner");
    assert.equal(dependencies.revisionRef.current, 7);
    assert.equal(dependencies.progressRef.current, "kun-01", "a review deep link must not overwrite saved progress");
    assert.equal(dependencies.dirtyRef.current.size, 0);
  }
  for (const slideId of [undefined, "unknown-slide"])
    assert.equal(hydrateProgress({ ...value, slideId }, "?slide=kun-01").state.index, 0, "an absent checkpoint cannot unlock lessons");
  for (const initialIndex of [0, 1]) {
    const { state } = hydrateProgress({ ...value, enrolled: false }, "?slide=end-02", initialIndex);
    assert.equal(state.index, initialIndex, "fresh campaign entry keeps its initial experience slide");
    assert.equal(state.sync, "consent");
    assert.equal(state.answers, undefined, "unenrolled answers are not hydrated");
  }
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const home = readFileSync(new URL("../components/holistic-house-home.tsx", import.meta.url), "utf8");
const form = readFileSync(new URL("../components/free-situation-review-form.tsx", import.meta.url), "utf8");
const testimonials = readFileSync(new URL("../components/personal-testimonials.tsx", import.meta.url), "utf8");

test("iteration 1: home hero offers direct routes, visible photo services and bottom free chooser", () => {
  assert.match(home, /heroPrimary: "Get a free written review"/);
  assert.match(home, /heroPrimary: "Получить бесплатный разбор"/);
  assert.match(home, /href=\{\x60\/\$\{locale\}\/client\/tests\x60\}/);
  assert.match(home, /services\/free-situation-review/);
  assert.match(home, /<HomepageContactCta locale=\{locale\} \/>/);
  assert.match(home, /event="service_request_start"/);
  assert.match(home, /src="\/images\/holistic-house\/andy-about\.png"/);
  assert.ok(home.indexOf("<ServicesSolutions locale={locale} variant=\"home\" />") < home.indexOf('<section className="service-home-start"'));
  assert.ok(home.indexOf("<ServicesSolutions locale={locale} variant=\"home\" />") < home.indexOf("<HomepageContactCta locale={locale} />"));
  assert.doesNotMatch(home, /data-home-extra-paths|service-home-progress/);
});

test("iteration 2: private questionnaire stays local beside the separate consented contact request", () => {
  const intake = readFileSync(new URL("../components/free-drawing-intake.tsx", import.meta.url), "utf8");
  assert.match(form, /<FreeDrawingIntake locale=\{locale\}/);
  assert.match(intake, /useState<Topic>\("personal"\)/);
  assert.match(intake, /<textarea required/);
  assert.match(intake, /navigator\.clipboard\.writeText\(answers\)/);
  assert.match(intake, /not a medical or mental-health diagnosis/i);
  assertQuestionnaireCopyBoundary(intake);
  assert.match(intake, /handwritten drawing/);
  assert.doesNotMatch(intake, /localStorage|sessionStorage|new FormData|sendBeacon|fetch\(/);
});

test("iteration 3: grounded personal introduction and contextual testimonial CTA", () => {
  assert.match(home, /I have been facilitating personal and group development since 2002/);
  assert.match(home, /Я работаю с индивидуальными и групповыми практиками с 2002 года/);
  assert.match(home, /<p>{text\.aboutIntro}<\/p>/);
  assert.match(testimonials, /variant === "all" \? "#request-free-review" : "\/" \+ locale \+ "\/services\/free-situation-review"/);
  assert.match(testimonials, /variant === "all"/);
  assert.match(testimonials, /presentedVideos\.map/);
  assert.doesNotMatch(testimonials, /isHome \? "\/" \+ locale \+ "\/services#consultation"/);
});

function assertQuestionnaireCopyBoundary(source) {
  assert.match(source, /This questionnaire does not upload your answers or drawing/);
  assert.match(source, /Submitting the separate request form sends your name, contact details, short enquiry and reply consent/);
  assert.match(source, /CRM registration/);
  assert.match(source, /You choose whether to share the questionnaire and drawing in a messenger/);
  assert.doesNotMatch(source, /Nothing is sent automatically|Nothing has been sent/);
}

test("public intake compatibility rejects misleading questionnaire storage or consent copy", () => {
  const source = readFileSync(new URL("../components/free-drawing-intake.tsx", import.meta.url), "utf8");
  assertQuestionnaireCopyBoundary(source);
  for (const [before, after] of [
    ["This questionnaire does not upload your answers or drawing", "This questionnaire uploads your answers and drawing"],
    ["short enquiry and reply consent", "short enquiry"],
    ["You choose whether to share the questionnaire and drawing in a messenger", "The questionnaire is shared automatically"],
    ["Your questionnaire answers are ready to copy.", "Nothing has been sent."],
  ]) {
    assert.ok(source.includes(before));
    assert.throws(() => assertQuestionnaireCopyBoundary(source.replace(before, after)));
  }
});

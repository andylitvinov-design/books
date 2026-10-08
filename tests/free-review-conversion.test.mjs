import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const landing = read("app/[locale]/services/free-situation-review/page.tsx");
const css = read("app/[locale]/services/free-situation-review/review.module.css");
const form = read("components/free-situation-review-form.tsx");

test("all three locales have distinct real offers, human-first content and correct SEO", () => {
  for (const phrase of ["Бесплатная диагностика ситуации", "Free situation & goal assessment", "Evaluación gratuita de tu situación", "Feeling stuck or unsure what to do next?", "¿Te sientes bloqueado", "Застряли в проблеме"]) {
    assert.ok(landing.includes(phrase), "Missing: " + phrase);
  }
  for (const path of ["/en/services/free-situation-review", "/ru/services/free-situation-review", "/es/services/free-situation-review"]) {
    assert.ok(landing.includes(path), "Locale/canonical missing: " + path);
  }
  assert.ok(landing.includes('Image src="/images/holistic-house/andy-about.png"'));
  assert.ok(landing.includes("<FreeSituationReviewForm locale={locale} />"));
  assert.ok(landing.includes('id="request-free-review"'));
  assert.ok(landing.includes('href="#request-free-review"'));
});

test("client funnel: above-fold form, three real steps, optional paths, FAQs", () => {
  assert.ok(landing.indexOf('className={styles.contentGrid}') < landing.indexOf('className={styles.details}'));
  assert.ok(landing.includes('<ol className={styles.steps}>'));
  assert.ok(landing.includes("t.steps.map"));
  assert.ok(landing.includes("t.directions.map"));
  assert.ok(landing.includes("t.faqs.map"));
  assert.ok(landing.includes("<details"));
  assert.ok(landing.includes("/services/\" + direction.href"));
  assert.ok(landing.includes("getHomeopathyLocaleParams"));
  assert.ok(landing.includes("isPublicLocale"));
});

test("privacy-first multilingual intake only prepares a WhatsApp draft", () => {
  assert.ok(form.includes('name="topic" required'));
  assert.ok(form.includes('value="" disabled'));
  assert.ok(form.includes('className={styles.optionalDetails}'));
  assert.ok(form.includes('name="situation" rows={3}'));
  assert.ok(!form.includes('name="situation" required'));
  assert.ok(form.includes("window.open(url"));
  assert.ok(form.includes("https://wa.me/14376066502?text="));
  assert.ok(form.includes("t.messageTitle"));
  assert.ok(form.includes("not sent automatically"));
  assert.ok(form.includes("НЕ отправляется автоматически"));
  assert.ok(form.includes("No se envía automáticamente"));
  assert.ok(!/localStorage|sessionStorage|sendBeacon|fetch\(/.test(form));
});

test("mobile editorial layout has no card-grid overload, usable input controls and reduced motion", () => {
  for (const s of [".contentGrid", ".capturePanel", ".steps", ".directions", ".about", ".faq", ".closing"]) assert.ok(css.includes(s));
  assert.ok(css.includes("@media(max-width:767px)"));
  assert.ok(css.includes("grid-template-columns:minmax(0,1fr)"));
  assert.ok(css.includes("min-height:58px"));
  assert.ok(css.includes(":focus-visible"));
  assert.ok(css.includes("prefers-reduced-motion"));
  assert.ok(!css.includes("repeat(3"));
});

test("do not imply a diagnosis, guaranteed outcome or compulsory paid continuation", () => {
  assert.ok(landing.includes("not a medical diagnosis"));
  assert.ok(landing.includes("no es un diagnóstico"));
  assert.ok(landing.includes("не медицинский"));
  assert.ok(landing.includes("optional"));
  assert.ok(!/guaranteed cure|лечим все|100% success|medical diagnosis provided/i.test(landing));
});

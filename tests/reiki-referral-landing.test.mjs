import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

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
  assert.match(landing, /const courseLocale = locale === "es" \? "en" : locale/);
  assert.match(landing, /\/academy\/principles-of-energywork\/learn/);
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

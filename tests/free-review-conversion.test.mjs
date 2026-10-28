import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const situationPage = read("app/[locale]/services/free-situation-review/page.tsx");
const daoPage = read("app/[locale]/services/dao-health-profile/page.tsx");
const testsPage = read("app/[locale]/tests/page.tsx");
const landing = read("components/free-entry-landing.tsx");
const css = read("components/free-entry-landing.module.css");
const capture = read("components/compact-lead-capture.tsx");
const captureCss = read("components/compact-lead-capture.module.css");
const form = read("components/free-situation-review-form.tsx");
const intake = read("components/free-drawing-intake.tsx");
const intakeCss = read("components/free-drawing-intake.module.css");
const offers = read("components/services-studio-offers.tsx");
const serviceData = read("data/core-service-offers.ts");

test("all three Services free cards open their own benefit-first, photo-led landing before entering an actual flow", () => {
  assert.match(offers, /href: "\/" \+ locale \+ "\/tests"/);
  assert.match(offers, /href: situation\.href/);
  assert.match(offers, /href: dao\.href/);
  assert.match(serviceData, /route: "free-situation-review"/);
  assert.match(serviceData, /route: "dao-health-profile"/);
  assert.match(testsPage, /kind="tests"/);
  assert.match(situationPage, /kind="situation"/);
  assert.match(daoPage, /kind="dao"/);
  assert.match(landing, /data-free-entry-landing=\{kind\}/);
  assert.match(landing, /<PublicSiteHeader locale=\{locale\} showAssessmentStrip=\{false\}/);
  for (const path of ["app/[locale]/tests/page.tsx", "app/[locale]/services/free-situation-review/page.tsx",
    "app/[locale]/services/dao-health-profile/page.tsx"]) {
    const source = read(path);
    for (const locale of ["en", "ru", "es"]) assert.ok(source.includes("/" + locale + "/"), "Missing locale " + locale + " at " + path);
  }
});

test("free landings explain benefits before closing with one short capture", () => {
  // Layout now uses conditional class names; check visible section order via stable anchors.
  const hero = landing.indexOf('aria-labelledby="free-entry-title"');
  const outcome = landing.indexOf('id="what-you-get"');
  const process = landing.indexOf('id="how-it-works"');
  const video = landing.indexOf('data-free-review-intro-video');
  const proof = landing.indexOf('data-featured-free-review-testimonials');
  const final = landing.lastIndexOf("<CompactLeadCapture");
  assert.ok(hero > 0 && hero < video && video < outcome && outcome < proof && proof < process && process < final,
    "A separate video introduction and three visible reviews belong to the same landing");
  assert.match(landing, /kind === "tests" \? <section className=\{\[styles\.scene, styles\.processScene/,
    "Only Wu Xing hides the redundant process section");
  assert.match(landing, /data-free-review-intro-video/);
  assert.match(landing, /data-featured-free-review-testimonials/);
  assert.match(landing, /<SiteVideoPlayer video=\{situationVideo\.video\}/);
  assert.doesNotMatch(landing, /<ServiceVideoShowcase topic="overview"/);
  assert.match(landing, /t\.bullets\.map/);
  assert.match(landing, /t\.outcomes\.map/);
  assert.match(landing, /t\.steps\.map/);
  assert.match(landing, /<h1 id="free-entry-title">\{t\.title\}<\/h1>/);
  assert.match(landing, /<p className=\{styles\.promise\}>\{t\.value\}<\/p>/);
  assert.match(landing, /src=\{images\.hero\} alt=\{t\.photoAlt\} fill priority/);
  assert.match(landing, /id=\{captureId\}/);
  assert.match(landing, /id="what-you-get"/);
  assert.match(landing, /id="how-it-works"/);
  assert.match(landing, /serviceTitle=\{serviceTitles\[kind\]\}/);
  assert.doesNotMatch(landing, /<FreeResourceEnquiry/);
  assert.doesNotMatch(landing, /className=\{styles\.end\}/);
  assert.match(landing, /<Link className=\{styles\.primary\} href=\{testsHref\}/);
});

test("all three locales explain real service advantages without health claims or invented diagnoses", () => {
  for (const phrase of [
    "Understand your starting point", "Лучше поймите себя", "Conoce mejor tu punto de partida",
    "Free personal express review with Andrey.", "Личная экспресс-диагностика с Андреем.", "Revisión personal exprés gratuita con Andrey.",
    "Discover what gives you strength.", "Узнайте, что даёт вам внутреннюю опору.",
    "Descubre qué te da fuerza.", "A symbolic guide for reflection — not a medical test.",
    "Символическая модель для самоисследования, а не медицинский тест.",
    "Un modelo simbólico de reflexión, no una prueba médica.",
    "Illustrative example — not your personal result.",
    "Условный пример — не ваш персональный профиль.",
    "diagnose or treat health conditions", "не диагностируют и не лечат заболевания",
  ]) assert.ok(landing.includes(phrase), "Missing benefit/safety: " + phrase);
  for (const phrase of ["Free personal express review with Andrey.", "Личная экспресс-диагностика с Андреем.",
    "Revisión personal exprés gratuita con Andrey.", "Five Elements", "Пять элементов", "Cinco Elementos"]) {
    assert.ok(landing.includes(phrase) || situationPage.includes(phrase) || daoPage.includes(phrase), phrase);
  }
  assert.doesNotMatch(landing + capture, /guaranteed cure|лечим все|100% success|medical diagnosis provided/i);
  assert.match(read("components/free-diagnosis-offers.tsx"), /30 MIN · €50/, "The paid 30-minute option remains €50");
  assert.doesNotMatch(landing + capture, /€100/, "Do not invent a second paid option here");
});

test("free drawing entry reuses private intake without duplicate collection or messenger export", () => {
  assert.match(landing, /<FreeSituationReviewForm locale=\{locale\} \/>/);
  assert.match(form, /<FreeDrawingIntake locale=\{locale\}/);
  assert.match(intake, /\/coaching\/intake\?topic=/);
  assert.match(intake, /Sign in to save an encrypted private draft/);
  assert.match(intake, /Saving does not send it to a coach/);
  assert.match(intake, /Keep the photo on your device/);
  assert.doesNotMatch(intake, /<form|<textarea|navigator\.clipboard|ContactChannelChooser|whatsappEnquiryUrl|localStorage|sessionStorage|fetch\(|sendBeacon/);
  assert.match(intakeCss, /@media\(max-width:767px\)/);
});

test("new DAO and situation footer submits a consented contact to the existing private CRM API", () => {
  for (const locale of ["en:", "ru:", "es:"]) assert.ok(capture.includes(locale));
  assert.match(landing, /const serviceTitles = \{/);
  assert.match(capture, /<form className=\{styles\.form\}/);
  assert.match(capture, /<input type="text" name="contact"/);
  assert.match(capture, /<input type="checkbox" required checked=\{consent\}/);
  assert.match(capture, /fetch\("\/api\/service-enquiries"/);
  assert.match(capture, /contactConsent: true/);
  assert.match(capture, /result\?\.saved !== true/);
  assert.match(capture, /setReference\(committedReference\)/);
  assert.match(capture, /committedReference = result.referenceCode/);
  assert.match(capture, /Please don\x27t enter health details/);
  assert.match(capture, /request: t\.message \+ " " \+ t\.reference \+ ": " \+ referenceCode/);
  assert.doesNotMatch(capture, /encodeURIComponent\(address\)|localStorage|sendBeacon|gtag\(/);
  assert.match(captureCss, /:focus-visible/);
  assert.match(captureCss, /@media\(max-width:600px\)/);
});

test("mobile layout offers one meaning per screen, authentic images, and accessible forms", () => {
  for (const key of [".hero", ".heroVisual", ".scene", ".outcomeScene", ".processScene", ".capture", ".captureForm", ".faq"]) {
    assert.ok(css.includes(key), "Missing " + key);
  }
  assert.match(css, /min-height:calc\(100svh - 150px\)/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /@media\(max-width:360px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.situationHero/);
  assert.match(css, /\.situationScene/);
  assert.match(css, /max-height:730px/);
  assert.match(css, /aspect-ratio:16\/9/);
  assert.match(css, /:focus-visible/);
  assert.match(landing, /"\/images\/holistic-house\/andy-about\.png"/);
  assert.match(landing, /"\/images\/holistic-house\/course-start-heron\.webp"/);
  assert.match(landing, /"\/academy\/reiki-yggdrasil\/source\/eastern-tradition\.png"/);
  assert.match(landing, /<PersonalTestimonials locale=\{locale\} variant="all" \/>/);
  assert.match(landing, /<PersonalExpressEnquiry locale=\{locale\} intro=\{/);
  assert.doesNotMatch(landing, /<FreeDiagnosisOffers/);
  assert.match(read("components/personal-express-enquiry.tsx"), /data-personal-express-enquiry/);
  assert.match(landing, /data-review-stories/);
  assert.match(css, /\.reviewBenefitsList/);
  assert.match(css, /\.reviewProcess/);
  assert.match(css, /\.reviewApproach/);
  assert.match(landing, /id="how-i-review"/);
});


test("express review WebKit reveal stays immediately below its button throughout the animation", () => {
  const expressCss = read("components/personal-express-enquiry.module.css");
  const express = read("components/personal-express-enquiry.tsx");
  assert.match(express, /data-express-reveal aria-expanded=\{expanded\}/);
  assert.match(express, /data-express-inline-disclosure hidden=\{!expanded\}/);
  assert.match(expressCss, /\.disclosure\[hidden\]\{display:none!important\}/);
  assert.match(expressCss, /@keyframes expressUnfold\{from\{opacity:0\}to\{opacity:1\}\}/);
  assert.doesNotMatch(expressCss, /@keyframes expressUnfold\{[^}]*transform:/,
    "Visual translateY moves an expanded in-flow region above its reveal button in WebKit before animation settles");
});

test("mobile browser acceptance taps the entire focus card and validates the native radio and unchanged consent", () => {
  const script = read("scripts/verify-free-review-live-mobile.mjs");
  const widget = read("components/personal-express-enquiry.tsx");
  const css = read("components/personal-express-enquiry.module.css");
  assert.match(widget, /<label className=\{styles\.choice\} data-express-focus=\{area\}/);
  assert.match(widget, /type="radio" name="express-review-focus" value=\{area\}/);
  assert.match(widget, /checked=\{focus === area\} onChange=\{\(\) => setFocus\(area\)\}/);
  // WebKit can skip the nested radio's forwarded change after tapping the
  // label; a single label click must also update the controlled focus.
  assert.match(widget, /onClick=\{\(\) => \{ if \(!focusLocked\) setFocus\(area\); \}\}/);
  // Validate a single real click, not retries or programmatic radio selection.
  assert.match(script, /async function tapFocusAndVerify\(page, enquiry, focus\)/);
  assert.match(script, /await enquiry\.locator\('\[data-express-focus=/);
  assert.match(script, /radio instanceof HTMLInputElement && radio\.checked/);
  assert.match(script, /card\?\.getAttribute\("data-selected"\) === "true"/);
  assert.match(script, /waitForFunction\(/);
  for (const focus of ["energy", "situation"]) {
    assert.ok(script.includes('await tapFocusAndVerify(page, enquiry, "' + focus + '")'),
      "One label tap eventually checks the native radio and its selected card: " + focus);
  }
  assert.match(script, /engine === "webkit" && locale === "es"/);
  assert.match(script, /width === 320 \|\| width === 430/);
  assert.doesNotMatch(script, /locator\('input\[value="(?:energy|situation)"\]'\)\.check\(\)/,
    "Do not emulate tapping a moving 19px radio dot on WebKit");
  assert.match(script, /"changing the focus cannot silently opt the user in"/);
  assert.match(script, /"changing focus is not a lead or booking"/);
  assert.match(css, /\.choice\{[^}]*min-height:94px/);
});

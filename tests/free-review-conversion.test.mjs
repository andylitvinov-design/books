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
    "A separate video introduction and all twelve visible reviews belong to one landing");
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
    "Tell me what's on your mind.", "Давайте разберём ваш вопрос.", "Cuéntame qué te preocupa.",
    "Discover what gives you strength.", "Узнайте, что даёт вам внутреннюю опору.",
    "Descubre qué te da fuerza.", "A symbolic guide for reflection — not a medical test.",
    "Символическая модель для самоисследования, а не медицинский тест.",
    "Un modelo simbólico de reflexión, no una prueba médica.",
    "Illustrative example — not your personal result.",
    "Условный пример — не ваш персональный профиль.",
    "diagnose or treat health conditions", "не диагностируют и не лечат заболевания",
  ]) assert.ok(landing.includes(phrase), "Missing benefit/safety: " + phrase);
  for (const phrase of ["Tell me what's on your mind.", "Давайте разберём ваш вопрос.",
    "Cuéntame qué te preocupa.", "Five Elements", "Пять элементов", "Cinco Elementos"]) {
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
  assert.match(intake, /Sign in to keep a private, encrypted draft/);
  assert.match(intake, /Saving the draft doesn't send it to Andrey/);
  assert.match(intake, /Keep any photo on your own device/);
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
  assert.match(landing, /const reviewVideos = kind === "situation"/);
  assert.match(landing, /reviewVideos\.map/);
  assert.match(landing, /data-review-list-direction="vertical"/);
  assert.match(landing, /data-review-count=\{reviewVideos\.length\}/);
  assert.doesNotMatch(landing, /<LazyPersonalTestimonials|featuredReviewVideos|reviewSwipeHint/);
  assert.match(landing, /<PersonalExpressEnquiry locale=\{locale\} intro=\{/);
  assert.doesNotMatch(landing, /<FreeDiagnosisOffers/);
  assert.match(read("components/personal-express-enquiry.tsx"), /data-personal-express-enquiry/);
  assert.doesNotMatch(landing, /data-review-stories/);
  assert.match(css, /\.reviewPreviewGrid\{display:flex;flex-direction:column/);
  assert.doesNotMatch(css, /grid-auto-flow:column|scroll-snap-type:x mandatory/);
  assert.match(css, /\.reviewPreviewCard :global\(\.site-video-title\)\{color:#143d3a/);
  assert.match(css, /\.reviewPreviewCard :global\(\.site-video-poster-title\)\{display:none\}/);
  assert.match(css, /\.reviewBenefitsList/);
  assert.match(css, /\.reviewProcess/);
  assert.match(css, /\.reviewApproach/);
  assert.match(css, /font-size:17px;line-height:1\.58/);
  assert.match(css, /\.reviewBenefitsList p,[\s\S]*?\.approachList p,[\s\S]*?\.reviewSteps p\{font-size:16px/);
  assert.match(landing, /id="how-i-review"/);
});


test("express review WebKit reveal stays immediately below its button throughout the animation", () => {
  const expressCss = read("components/personal-express-enquiry.module.css");
  const express = read("components/personal-express-enquiry.tsx");
  assert.match(express, /data-express-reveal[^\n>]*aria-expanded=\{expanded\}/);
  assert.match(express, /data-express-inline-disclosure hidden=\{!expanded\}/);
  assert.match(express, /const closeDisclosure = useCallback\(\(\) => \{/);
  assert.match(express, /window\.history\.replaceState\(window\.history\.state/);
  assert.match(express, /if \(expandedRef\.current\) closeDisclosure\(\); else openDisclosure\(\)/);
  assert.match(express, /const expandedRef = useRef\(false\)/);
  assert.match(express, /window\.addEventListener\("keydown", onEscape, true\)/);
  assert.match(express, /\}, \[closeDisclosure\]\);/);
  // A touch on a non-focusable choice can place focus on body at 320px.
  // An expanded form still closes on Escape; a nested active modal takes priority.
  assert.match(express, /event\.key !== "Escape"/);
  assert.match(express, /panelRef\.current\?\.hidden !== false/);
  assert.match(express, /event\.preventDefault\(\)/);
  assert.match(express, /activeDialog\?\.contains\(document\.activeElement\)\) return/);
  assert.match(express, /closeDisclosure\(\);\s*revealRef\.current\?\.focus\(\)/);
  assert.match(read("scripts/verify-free-review-live-mobile.mjs"), /closing clears the stale review anchor/);
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
  assert.match(script, /const card = enquiry\.locator\('\[data-express-focus=/);
  assert.match(script, /await card\.tap\(\)/, "mobile acceptance must use a native touch tap");
  assert.doesNotMatch(script, /await card\.click\(/, "mouse click is not a native touch gesture");
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
  assert.match(script, /"focus change never creates hidden consent or unverified web submission"/);
  assert.match(script, /"changing the selected focus never fabricates a CRM lead"/);
  assert.match(css, /\.choice\{[^}]*min-height:94px/);
});


test("free-review closing messenger buttons stay compact without losing either action", () => {
  const entry = read("components/telegram-diagnostic-entry.tsx");
  const entryCss = read("components/telegram-diagnostic-entry.module.css");
  assert.match(landing, /className=\{styles\.reviewContact\}/);
  assert.match(landing, /<TelegramDiagnosticEntry locale=\{locale\} \/>/);
  assert.match(entryCss, /:global\(\[data-personal-express-enquiry\]\) \.entry/);
  assert.match(entryCss, /:global\(\[data-personal-express-enquiry\]\) \.content p/);
  assert.match(entryCss, /:global\(\[data-personal-express-enquiry\]\) \.channels/);
  for (const channel of ["telegram", "whatsapp-manual"]) {
    assert.ok(entry.includes('data-express-review-channel="' + channel + '"'));
  }
  assert.match(entryCss, /@media \(max-width: 580px\)/);
});

test("free review has six native, photo-led FAQs at the very end in EN, RU and ES", () => {
  const anchor = landing.indexOf('data-free-review-faq');
  const enquiry = landing.indexOf('</PersonalExpressEnquiry>');
  assert.ok(anchor > enquiry, "FAQ comes after the working request form");
  assert.match(landing, /id="free-review-faq" data-free-review-faq/);
  assert.match(landing, /<Image src=\{images\.process\} alt=\{t\.processAlt\} fill/);
  assert.match(landing, /\{t\.faq\.map\(\(\[question, answer\]\) => \(/);
  assert.match(landing, /<details key=\{question\} className=\{styles\.reviewFaqItem\}>/);
  assert.match(landing, /<summary><span>\{question\}<\/span>/);
  assert.match(landing, /href="#request-free-review"/);
  for (const localeQuestion of [
    "How do I begin?", "Как начать?", "¿Cómo empiezo?",
    "What about my privacy?", "Что с конфиденциальностью?", "¿Qué ocurre con mis datos privados?",
  ]) assert.ok(landing.includes(localeQuestion), localeQuestion);
  assert.match(css, /\.reviewFaqItem>summary\{/);
  assert.match(css, /\.reviewFaqItem>summary:focus-visible/);
  assert.match(css, /\.reviewFaqItem\[open\]/);
  assert.match(css, /\.reviewFaqPhoto/);
  assert.match(css, /@media\(max-width:720px\)/);
});

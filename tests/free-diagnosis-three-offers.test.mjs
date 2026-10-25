import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const source = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const offers = source("components/free-diagnosis-offers.tsx");
const css = source("components/free-diagnosis-offers.module.css");
const landing = source("components/free-entry-landing.tsx");
const hub = source("app/[locale]/services/free-consultation/page.tsx");
const capture = source("components/compact-lead-capture.tsx");

test("both free-diagnosis entry routes reuse one localized three-offer selector, not separate incompatible carts", () => {
  assert.match(landing, /<FreeDiagnosisOffers locale=\{locale\} \/>/);
  assert.match(hub, /<FreeDiagnosisOffers locale=\{lang\} \/>/);
  assert.match(landing, /kind !== "situation" \? <CompactLeadCapture/);
  assert.match(landing, /<PersonalTestimonials locale=\{locale\} variant="all" \/>/);
  assert.match(hub, /<PersonalTestimonials locale=\{lang\} variant="all" \/>/);
  assert.match(hub, /data-free-consultation-hub/);
  assert.match(landing, /data-featured-constellations-video/);
});

test("three photo-backed horizontal cards expose the correct free and €50 offerings in EN/RU/ES", () => {
  for (const id of ["situation-written-free", "wu-xing-free", "personal-session-30-eur50"]) {
    assert.equal((offers.match(new RegExp('id: "' + id + '"', "g")) || []).length, 3, id + " across locales");
  }
  for (const phrase of [
    "Free situation diagnosis", "Бесплатная диагностика ситуации", "Diagnóstico gratuito de tu situación",
    "Wu Xing (Five Elements)", "У-Син (Пять стихий)", "Wu Xing (Cinco Elementos)",
    "Personal consultation", "Личная консультация", "Consulta personal",
    "30 MIN · €50", "30 МИН · €50", "БЕСПЛАТНО", "GRATIS",
  ]) assert.ok(offers.includes(phrase), "Missing localized offer: " + phrase);
  const paths = [
    "public/images/holistic-house/hero-olive-incense.webp",
    "public/academy/reiki-yggdrasil/source/eastern-tradition.png",
    "public/images/holistic-house/andy-about.png",
  ];
  for (const p of paths) assert.ok(existsSync(new URL("../" + p, import.meta.url)), "Missing authentic site image: " + p);
  assert.match(offers, /<Image src=\{photos\[offer\.id\]\} alt=\{offer\.imageAlt\} fill loading="lazy"/);
  assert.match(offers, /<details className=\{styles\.details\}>/);
  assert.match(offers, /<summary>\{t\.details\}/);
  assert.match(offers, /onClick=\{\(\) => setSelected\(offer\.id\)\}/);
  assert.match(offers, /href="#request-free-review"/);
  assert.match(css, /grid-template-columns:clamp\(150px,18vw,213px\) minmax\(0,1fr\)/);
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /:focus-visible/);
});

test("all three offer CTAs select a controlled option in the one consented CRM enquiry form", () => {
  assert.equal((offers.match(/<CompactLeadCapture/g) || []).length, 1);
  assert.match(offers, /selected === "situation-written-free" \? \(/);
  assert.match(offers, /<FreeDiagnosticStart locale=\{locale\} \/>/);
  assert.match(offers, /data-diagnosis-order-form/);
  const diagnostic = source("components/free-diagnostic-start.tsx");
  assert.match(diagnostic, /sessionStorage\.setItem\(DIAGNOSTIC_START_KEY/);
  assert.match(diagnostic, /window\.location\.assign\("\/" \+ locale \+ "\/coaching\/intake"\)/);
  assert.match(diagnostic, /until you explicitly send your completed questionnaire/);
  assert.match(offers, /selectedFormatValue=\{selected\}/);
  assert.match(offers, /serviceTitle=\{t\.offers\.find\(offer => offer\.id === selected\)\?\.title/);
  assert.match(offers, /onFormatChange=\{\(value\) => setSelected\(value as OfferId\)\}/);
  assert.match(offers, /formatOptions=\{t\.offers\.filter\(offer => offer\.id !== "situation-written-free"\)/);
  assert.match(capture, /const selectedFormat = selectedFormatValue \?\? internalFormat/);
  assert.match(capture, /onFormatChange\?\.\(event\.target\.value\)/);
  assert.match(capture, /fetch\("\/api\/service-enquiries"/);
  assert.match(capture, /contactConsent: true/);
  assert.match(capture, /setReference\(committedReference\)/);
  assert.match(capture, /"; Preferred session format: " \+ selectedFormat/);
  assert.doesNotMatch(offers, /fetch\(|gtag\(|dataLayer|autoplay|payment_received|payment_captured/);
  assert.match(offers, /not a confirmed appointment or payment/);
  assert.match(offers, /символическая модель/);
});

// Exercise the real controlled cards and CompactLeadCapture implementation,
// rather than requiring the obsolete receiptServiceTitle state variable.
const receiptCases = [
  "controlled confirmed receipt remains pinned to submitted service and format after external offer change",
  ...["en", "ru", "es"].map(locale => locale + ": actual FreeDiagnosisOffers card and dropdown use one controlled service/format through confirmed receipt"),
];
const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
function runReceiptCases(sourceRoot = repositoryRoot) {
  const env = { ...process.env, COMPACT_SOURCE_ROOT: sourceRoot };
  // A nested node:test runner must not inherit the parent's worker context.
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, [
    "--test", "--test-reporter=tap", "--test-name-pattern=^(" + receiptCases.join("|") + ")$",
    "tests/compact-enquiry-lifecycle.test.mjs",
  ], { cwd: repositoryRoot, env, encoding: "utf8", timeout: 60000 });
  assert.ifError(result.error);
  assert.equal(result.signal, null, "Receipt checks must finish, not time out or be cancelled");
  return result;
}
function receiptResultNames(output, status) {
  return output.split("\n").filter(line => line.startsWith(status + " ") && !/ # (?:SKIP|TODO)/.test(line))
    .map(line => line.replace(/^(?:not ok|ok) \d+ - /, ""));
}
test("confirmed three-offer receipt keeps the submitted service and format in both messenger links", () => {
  const result = runReceiptCases();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(receiptResultNames(result.stdout, "ok"), receiptCases,
    "All four named behavioral checks must actually execute; an empty/stale pattern cannot pass");
  assert.match(result.stdout, /^# pass 4$/m);
  for (const outcome of ["fail", "cancelled", "todo"]) assert.match(result.stdout, new RegExp("^# " + outcome + " 0$", "m"));
});

test("receipt checks reject links rebuilt from a later offer instead of the saved snapshot", () => {
  const before = "base = savedWhatsapp || currentWhatsappUrl()";
  assert.equal(capture.split(before).length, 2, "Mutation targets the actual receipt URL source exactly once");
  const root = mkdtempSync(join(tmpdir(), "hh-receipt-contract-"));
  try {
    mkdirSync(join(root, "components"));
    const mutated = capture.replace(before, "base = currentWhatsappUrl()");
    writeFileSync(join(root, "components/compact-lead-capture.tsx"), mutated);
    writeFileSync(join(root, "components/free-diagnosis-offers.tsx"), offers);
    assert.equal(readFileSync(join(root, "components/compact-lead-capture.tsx"), "utf8"), mutated);
    const result = runReceiptCases(root);
    assert.equal(result.status, 1, "A real receipt regression must fail, not use baseline source: " + result.stdout + result.stderr);
    assert.deepEqual(receiptResultNames(result.stdout, "not ok"), receiptCases,
      "Every selected service/format snapshot behavior must detect the regression");
    assert.match(result.stdout, /^# pass 0$/m);
    assert.match(result.stdout, /^# fail 4$/m);
    for (const outcome of ["cancelled", "todo"]) assert.match(result.stdout, new RegExp("^# " + outcome + " 0$", "m"));
    assert.match(result.stdout, /ERR_ASSERTION/, "Failure must come from behavior, not a missing dependency");
    assert.doesNotMatch(result.stdout + result.stderr, /ERR_MODULE_NOT_FOUND|Cannot find module|unapproved import/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

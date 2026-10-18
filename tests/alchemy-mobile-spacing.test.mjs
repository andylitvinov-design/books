import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const css = read("components/alchemy-soul-landing.module.css");
const form = read("components/alchemy-soul-lead-form.tsx");
const marker = "/* Measured 320px Alchemy formats panel:";
const correction = css.slice(css.indexOf(marker));

test("Measured formats correction is scoped to the existing mobile breakpoint", () => {
  assert.ok(css.includes(marker));
  assert.match(correction, /@media\(max-width:680px\)\{/);
  const selectors = [...correction.matchAll(/(?:^|[},])\s*(\.[^{}]+?)(?=\{|,)/gm)].map(match => match[1]);
  assert.ok(selectors.length >= 10);
  assert.ok(selectors.every(selector => selector.startsWith(".optionsSection")));
});

test("Only measured vertical padding, margins and gaps are tightened", () => {
  for (const rule of [
    ".optionsSection{padding-block:10px}",
    ".optionsSection .sectionHeading{margin-bottom:6px}",
    ".optionsSection .optionCard{padding-block:8px}",
    ".optionsSection .optionDescription{margin-top:5px}",
    ".optionsSection .monthlyCard{padding-block:6px}",
    ".optionsSection .monthlyText{margin-block:3px}",
    ".optionsSection .freeOption{margin-top:6px}",
    ".optionsSection .wisePayment{gap:4px}",
  ]) assert.ok(correction.includes(rule), rule);
  assert.match(correction, /\.optionCard strong,\s*\.optionsSection \.optionName,\s*\.optionsSection \.optionDescription\{margin-top:5px\}/);
});

test("Typography, horizontal dimensions and wrapping are not overridden", () => {
  assert.doesNotMatch(correction, /[{;]\s*(?:font(?:-[a-z-]+)?|line-height|letter-spacing|width|min-width|max-width|padding-inline|padding-left|padding-right|white-space|word-break|overflow-wrap|text-wrap)\s*:/);
  assert.match(css, /\.optionName\{font-size:19px;margin-top:10px\}/);
  assert.match(css, /\.optionDescription\{font-size:11px;line-height:1\.35\}/);
  assert.match(css, /\.wisePayment small\{max-width:510px;color:#4e737c;font-size:12px;line-height:1\.5\}/);
});

test("Every payment anchor includes the 44px target minimum", () => {
  assert.match(correction, /\.optionsSection \.wisePayment>a\{display:inline-flex;align-items:center;justify-content:center;min-height:44px\}/);
  assert.match(css, /\.wisePaymentCta\{display:inline-flex;min-height:44px;/);
  assert.match(css, /\.optionsOrder :global\(\[data-contact-order\]\),\.formOrder :global\(\[data-contact-order\]\)\{min-height:46px;font-size:13px\}/);
});

test("No disclosure is hidden, clipped, collapsed or truncated by the correction", () => {
  assert.doesNotMatch(correction, /display\s*:\s*none|visibility|overflow|line-clamp|max-height|height\s*:\s*0|opacity/);
  assert.doesNotMatch(form, /<details/);
  for (const marker of ["data-paypal-personal-offer", "data-zen-manual-request", "data-wise-payment-link"]) {
    assert.ok(form.includes(marker), marker);
  }
});

test("Payment gates and fixed-price destinations retain the original contract", () => {
  assert.match(form, /wiseEnabled && selected !== "month"/);
  assert.match(form, /paypalPersonalEnabled && selected !== "month"/);
  assert.match(form, /const zenInquiryUrl = selected === "month" \? null/);
  assert.match(form, /buildZenTransferInquiry\(\[selected === "30" \? "express-consultation-30" : "personal-session-60"\], locale\)/);
  for (const provider of ["wise", "paypal"]) {
    assert.ok(form.includes('"/api/payments/' + provider + '/" + (selected === "30" ? "express-consultation-30" : "personal-session-60")'));
  }
});

test("All three locales retain payment disclosures and the details link", () => {
  for (const text of [
    "После согласования сеанса. Выберите «Товары и услуги»",
    "Это запрос реквизитов для разовой сессии, а не оплата.",
    "After agreeing the session, choose Goods & Services",
    "Only a request for transfer instructions, not a completed payment.",
    "Tras acordar la sesión, elige Productos y servicios",
    "Solicitud de instrucciones para transferencia, no un pago.",
    "Условия и подтверждение оплаты",
    "Payment details & confirmation",
    "Instrucciones y confirmación",
  ]) assert.ok(form.includes(text), text);
});

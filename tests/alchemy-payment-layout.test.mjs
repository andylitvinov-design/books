import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const form = read("components/alchemy-soul-lead-form.tsx");
const css = read("components/alchemy-soul-landing.module.css");

test("Alchemy payment options share one layout group after the booking action", () => {
  assert.equal((form.match(/data-alchemy-payment-options/g) || []).length, 1);
  const start = form.indexOf('<div className={styles.paymentOptions} data-alchemy-payment-options>');
  const end = form.indexOf('<p className={styles.freeOption}>', start);
  assert.ok(start > form.indexOf('data-alchemy-booking": "formats"'));
  assert.ok(end > start);
  const group = form.slice(start, end);
  for (const attribute of ["data-wise-payment-link", "data-paypal-personal-offer", "data-zen-manual-request"]) {
    assert.ok(group.includes(attribute), attribute);
  }
});

test("Wide layout shares space between only the payment methods actually rendered", () => {
  assert.match(css, /@media\(min-width:851px\)\s*\{\s*\.paymentOptions\{display:grid;grid-auto-flow:column;grid-auto-columns:minmax\(0,1fr\);align-items:start;gap:16px;margin-top:10px\}/);
  assert.match(css, /\.paymentOptions>\.wisePayment\{min-width:0;margin:0\}/);
});

test("Mobile payment order and existing touch-target styles remain intact", () => {
  assert.match(css, /\.paymentOptions\{display:contents\}/);
  assert.match(css, /\.wisePaymentCta\{display:inline-flex;min-height:44px;/);
  assert.match(css, /\.wisePayment small\{max-width:510px;color:#4e737c;font-size:12px;line-height:1\.5\}/);
  assert.match(css, /\.paymentOptions:empty\{display:none\}/);
  const rules = [...css.matchAll(/\.paymentOptions[^{}]*\{([^{}]*)\}/g)].map(match => match[1]).join(";");
  assert.doesNotMatch(rules, /max-height|overflow|line-clamp|font-size|visibility/);
});

test("Existing payment gates and product-derived destinations remain unchanged", () => {
  assert.match(form, /wiseEnabled && selected !== "month"/);
  assert.match(form, /paypalPersonalEnabled && selected !== "month"/);
  assert.match(form, /const zenInquiryUrl = selected === "month" \? null/);
  assert.match(form, /buildZenTransferInquiry\(\[selected === "30" \? "express-consultation-30" : "personal-session-60"\], locale\)/);
  for (const provider of ["wise", "paypal"]) {
    assert.ok(form.includes('"/api/payments/' + provider + '/" + (selected === "30" ? "express-consultation-30" : "personal-session-60")'));
  }
});

test("Visible safety disclosures and payment instructions are preserved", () => {
  for (const text of [
    "WiseTag requires a Wise account and manual amount entry.",
    "After agreeing the session, choose Goods & Services and verify Andrii Litvinov. Manual payment verification.",
    "Only a request for transfer instructions, not a completed payment. Agree a session time and confirm ZEN availability first.",
    "Условия и подтверждение оплаты",
    "Instrucciones y confirmación",
    "Payment details & confirmation",
  ]) assert.ok(form.includes(text), text);
});

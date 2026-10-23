import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SERVICE_PRODUCTS } from "../lib/commerce/catalog.js";
import { buildPersonalPayPalCartUrl } from "../lib/commerce/paypal-personal.js";
import { buildInteracTransferInquiry } from "../lib/commerce/interac-transfer-inquiry.js";
import { buildSquarePaymentForServices } from "../lib/commerce/square-payment-links.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const ids = SERVICE_PRODUCTS.map(p => p.id);
const page = read("app/[locale]/payments/page.tsx");

test("personal payments page offers immediate Interac enquiry per priced service", () => {
  assert.match(page, /buildInteracTransferInquiry\(\[product\.id\], locale\)/);
  assert.match(page, /data-interac-direct-inquiry=\{product\.id\}/);
  assert.match(page, /data-interac-manual-inquiry/);
  for (const locale of ["en", "ru", "es"]) {
    for (const service of SERVICE_PRODUCTS) {
      const url = buildInteracTransferInquiry([service.id], locale);
      assert.equal(new URL(url).hostname, "wa.me");
      assert.match(new URL(url).searchParams.get("text"), /CAD/);
    }
  }
  assert.match(page, /При нажатии деньги не списываются/);
});

test("optional Square CTA requires fully verified configured amount", () => {
  assert.match(page, /configuredSquarePaymentLinks\(\)/);
  assert.match(page, /buildSquarePaymentForServices\(\[product\.id\], squareLinks\)/);
  const squareBlock = page.match(/\{squarePayment \? <div data-square-payment-options=[\s\S]*?<\/div> : null\}/)?.[0];
  assert.ok(squareBlock);
  assert.match(squareBlock, /href=\{squarePayment\.url\}/);
  assert.match(squareBlock, /data-square-manual-confirmation=\{product\.id\}/);
  assert.match(squareBlock, /squareReceiptUrl\(locale, product\.title, formatSquareCadAmount\(squarePayment\.amountMinor, locale\)!\)/);
  assert.match(page, /data-square-personal-link=\{product\.id\}/);
  assert.equal(buildSquarePaymentForServices([ids[0]], {}), null);
  assert.doesNotMatch(page, /data-stripe-checkout|markAsPaid|grantEntitlement/);
});

test("fixed price combined consultations use canonical PayPal EUR 150 amount", () => {
  assert.equal(SERVICE_PRODUCTS.length, 2);
  assert.equal(buildPersonalPayPalCartUrl(ids), "https://paypal.me/psitrends/150EUR");
  assert.match(page, /buildPersonalPayPalCartUrl\(combinedIds\)/);
  assert.match(page, /data-paypal-combined-link/);
  assert.match(page, /data-combined-cart-link/);
  assert.match(page, /products\.length === 2/);
  assert.doesNotMatch(page, /request\.json\(|URLSearchParams\(.+price/);
});

test("EN/RU/ES extra methods stay collapsed and no manual request is called paid", () => {
  for (const value of ["In Canada without PayPal?", "В Канаде без PayPal?", "¿En Canadá sin PayPal?"])
    assert.ok(page.includes(value), value);
  assert.match(page, /<details className=\{styles\.otherDetails\} data-zen-manual-inquiry>/);
  assert.match(page, /data-zen-transfer-inquiry=\{product\.id\}/);
  assert.match(page, /data-other-payment-methods/);
  assert.match(page, /data-paypal-manual-confirmation/);
  assert.match(page, /The website cannot automatically verify/);
});

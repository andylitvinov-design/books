import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const css = read("components/alchemy-soul-landing.module.css");

test("Owner #1003 mobile spacing replaces the superseded always-expanded layout repairs", () => {
  assert.doesNotMatch(css, /Measured 320px Alchemy formats panel|\.paymentOptions/);
  assert.match(css, /@media\(max-width:680px\)\{\s*\.optionsSection\{justify-content:flex-start;padding-top:16px;padding-bottom:16px\}/);
  assert.match(css, /@media\(max-width:350px\)\{\s*\.optionsSection\{padding-top:14px;padding-bottom:14px\}/);
  assert.match(css, /\.optionCard\{padding:12px\}/);
  assert.match(css, /\.monthlyCard\{margin-top:7px;padding-top:10px;padding-bottom:10px\}/);
});

test("Owner summary, payment links including terms, and booking keep 44px or larger targets", () => {
  assert.match(css, /\.paymentDisclosure summary\{[^}]*min-height:44px/);
  assert.match(css, /\.paymentDisclosureBody \.wisePayment>a\{display:inline-flex;align-items:center;justify-content:center;min-height:44px\}/);
  assert.match(css, /\.wisePaymentCta\{display:inline-flex;min-height:44px;/);
  assert.match(css, /\.optionsOrder :global\(\[data-contact-order\]\),\.formOrder :global\(\[data-contact-order\]\)\{min-height:46px;font-size:13px\}/);
  assert.match(css, /\.paymentDisclosure summary:focus-visible/);
});

test("Expanded disclosure uses natural height; only the closed body is hidden", () => {
  assert.match(css, /\.paymentDisclosure:not\(\[open\]\) \.paymentDisclosureBody\{display:none\}/);
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selector]) => selector.includes('.paymentDisclosure') && !selector.includes(':not([open])') && !selector.includes('::-webkit-details-marker'));
  assert.ok(rules.length >= 5);
  for (const [, selector, declarations] of rules) {
    assert.doesNotMatch(declarations, /(?:^|;)\s*(?:height|max-height)\s*:|line-clamp|display:none|visibility:hidden/, selector);
  }
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildPersonalPayPalCartUrl } from "../lib/commerce/paypal-personal.js";
import { buildZenTransferInquiry } from "../lib/commerce/zen-transfer-inquiry.js";
import { SERVICE_PRODUCTS, formatServiceAmount } from "../lib/commerce/catalog.js";
import { restoreServiceCart, SERVICE_CART_STORAGE_KEY, SERVICE_CART_UPDATED_EVENT } from "../lib/commerce/cart.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const ids = SERVICE_PRODUCTS.map(p => p.id);

test("PayPal amount is calculated from fixed catalog products, including two-item cart", () => {
  const one = buildPersonalPayPalCartUrl(["express-consultation-30"]);
  const two = buildPersonalPayPalCartUrl(ids);
  assert.equal(one, "https://paypal.me/psitrends/50EUR");
  assert.equal(two, "https://paypal.me/psitrends/150EUR");
  assert.equal(buildPersonalPayPalCartUrl(["personal-session-60"]), "https://paypal.me/psitrends/100EUR");
  assert.equal(buildPersonalPayPalCartUrl(ids, { HH_PAYPAL_PERSONAL_DISABLED: "true" }), null);
  for (const value of [[], null, ["fake"], ["free"], ["personal-session-60", "personal-session-60"],
    ["express-consultation-30", "any"], ["personal-session-60", "express-consultation-30", "free"],
    [{"id":"express-consultation-30", "price":1}]]) {
    assert.equal(buildPersonalPayPalCartUrl(value), null);
  }
  assert.match(formatServiceAmount(15000, "ru"), /150/);
});

test("consultation chooser is a compact paid cart entry, free written assessment stays separate", () => {
  const integration = read("components/public-consultation-cta.tsx");
  const entry = read("components/commerce/consultation-cart-entry.tsx");
  const css = read("components/commerce/consultation-cart-entry.module.css");
  assert.match(integration, /if \(serviceBooking\) return <ConsultationCartEntry/);
  assert.match(entry, /publicServiceCatalog\(locale\)/);
  assert.match(entry, /data-consultation-capture="service"/);
  assert.match(entry, /data-service-product=/);
  assert.match(entry, /services\/free-situation-review/);
  assert.match(entry, /SERVICE_CART_STORAGE_KEY/);
  assert.match(entry, /SERVICE_CART_UPDATED_EVENT/);
  assert.match(entry, /onClick=\{\(\) => toggle\(product\.id\)\}/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.doesNotMatch(entry, /paypal\.me|wise\.com|payment success|<ContactChannelChooser/);
});

test("cart route accepts only known cart items, has locale switch and no automatic payment assertions", () => {
  const page = read("app/[locale]/cart/page.tsx");
  const cart = read("components/commerce/personal-cart.tsx");
  const header = read("components/site-navigation.tsx");
  assert.match(page, /robots: \{ index: false/);
  assert.match(page, /personalPayPalEnabled\(\)/);
  assert.match(page, /wisePaymentsEnabled\(\)/);
  assert.match(cart, /restoreServiceCart\(/);
  assert.match(cart, /buildPersonalPayPalCartUrl\(chosen\.map/);
  assert.match(cart, /buildZenTransferInquiry\(chosen\.map/);
  assert.match(cart, /data-zen-transfer-inquiry="cart"/);
  assert.match(cart, /data-cart-paypal-personal/);
  assert.match(cart, /data-cart-wise-payment/);
  assert.match(cart, /type="radio"/);
  assert.match(cart, /setSelected\(next\)/);
  assert.match(cart, /aria-label=\{\x60\$\{t\.remove\}: \$\{product\.title\}\x60\}/);
  assert.match(header, /<CartNavLink locale=\{activeLocale\}/);
  assert.match(header, /data-nav-item="cart"/);
  assert.ok(SERVICE_CART_STORAGE_KEY.includes("cart"));
  assert.equal(SERVICE_CART_UPDATED_EVENT, "hh-service-cart-updated");
  assert.deepEqual(restoreServiceCart(JSON.stringify([...ids, ...ids, "injected"])), ids);
  assert.doesNotMatch(cart, /localStorage|orderStatus\s*=\s*"paid"|autoDebit|paymentIntent/);
});

test("manual ZEN is an enquiry for actual cart total, not a payment provider", () => {
  const url = buildZenTransferInquiry(ids, "en");
  assert.ok(url?.startsWith("https://wa.me/"));
  assert.match(new URL(url).searchParams.get("text"), /€150\.00/);
  const component = read("components/commerce/personal-cart.tsx");
  assert.match(component, /not a payment/);
  assert.match(component, /no subscription|sin suscripción|без подписки/i);
});

test("occupied Cart stays reachable in the menu and Cabinet remains visible on narrow phones", () => {
  const nav = read("components/commerce/cart-nav-link.tsx");
  const cartCss = read("components/commerce/cart-nav-link.module.css");
  const headerCss = read("app/holistic-house-home.css");
  assert.match(nav, /data-cart-has-items=\{count > 0 \? "true" : "false"\}/);
  assert.match(nav, /aria-label=\{\x60\$\{copy\[locale\]\} \(\$\{count\}\)\x60\}/);
  assert.match(cartCss, /position:absolute;top:-6px;right:-6px/);
  assert.match(headerCss, /@media \(max-width: 767px\)[\s\S]*data-cart-has-items="true"/);
  assert.match(headerCss, /@media \(max-width: 490px\)[\s\S]*a\[data-nav-item="cart"\]\[data-cart-has-items="true"\]/);
  assert.match(headerCss, /> a\[data-nav-item="cart"\]\[data-cart-has-items="true"\]\s*\{\s*display:\s*none/);
});

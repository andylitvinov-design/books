import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SERVICE_PRODUCTS } from "../lib/commerce/catalog.js";
import { normalizePublicServiceEnquiry } from "../lib/practitioners/public-service-enquiry-input.mjs";

const source = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("cart shows real service photographs and detail cards, including two empty-cart suggestions", () => {
  const cart = source("components/commerce/personal-cart.tsx");
  const css = source("components/commerce/personal-cart.module.css");
  assert.match(cart, /import Image from "next\/image"/);
  assert.match(cart, /const serviceImages: Record<string, string>/);
  assert.match(cart, /constellations-en-v1\.webp/);
  assert.match(cart, /andy-about\.png/);
  for (const item of SERVICE_PRODUCTS) assert.ok(cart.includes('"' + item.id + '":'), item.id);
  assert.match(cart, /data-cart-empty/);
  assert.match(cart, /data-cart-add=\{product\.id\}/);
  assert.match(cart, /className=\{styles\.servicePhoto\}/);
  assert.match(cart, /className=\{styles\.serviceDetails\}/);
  assert.match(cart, /className=\{styles\.serviceActions\}/);
  assert.match(cart, /product\.description/);
  assert.match(css, /grid-template-columns:100px minmax\(0,1fr\) 84px/);
  assert.match(css, /@media\(max-width:360px\)/);
  assert.match(css, /@media\(max-width:640px\)/);
});

test("order requires successful consented backend save before displaying the payment methods", () => {
  const cart = source("components/commerce/personal-cart.tsx");
  const chooser = source("components/contact-channel-chooser.tsx");
  const api = source("app/api/service-enquiries/route.js");
  const crm = source("lib/practitioners/public-service-enquiry.js");
  assert.match(cart, /<ContactChannelChooser locale=\{locale\} whatsappUrl=\{bookingUrl\} quick cartContact/);
  assert.match(cart, /stayAfterSave publicServiceTitle=\{description \|\| t\.service\}/);
  assert.match(cart, /onSaved=\{referenceCode => setOrderReceipt\(\{ cartKey, referenceCode \}\)\}/);
  assert.match(cart, /const orderReady = Boolean\(cartKey && orderReceipt\?\.cartKey === cartKey\)/);
  assert.match(cart, /\{showPayment && <fieldset className=\{styles\.methods\}>/);
  assert.match(cart, /\{showPayment && <div className=\{styles\.payment\} aria-live="polite">/);
  assert.match(chooser, /onSaved\?\.\(data\.referenceCode\)/);
  assert.match(chooser, /data\.saved === true/);
  assert.match(chooser, /fetch\("\/api\/service-enquiries"/);
  assert.match(chooser, /body: JSON\.stringify\(\{[\s\S]*?contactConsent: consent/);
  assert.match(api, /createPublicServiceEnquiry\(config, payload\)/);
  assert.match(crm, /app\.crm_contacts/);
  assert.doesNotMatch(cart, /localStorage|autoDebit|paymentIntent/);
});

test("order allows phone or existing Google OAuth, without claiming that phone is an authenticated account", () => {
  const cart = source("components/commerce/personal-cart.tsx");
  const chooser = source("components/contact-channel-chooser.tsx");
  assert.match(chooser, /cartContact\?: boolean/);
  assert.match(chooser, /cartContact \? "phone" : "email"/);
  assert.match(chooser, /\/api\/app\/auth\/start/);
  assert.match(chooser, /continueTo: "enquiry"/);
  assert.match(chooser, /\/api\/app\/auth\/contact-profile/);
  assert.match(chooser, /<PhoneCountryInput/);
  assert.match(chooser, /<input type="checkbox" required checked=\{consent\}/);
  for (const locale of ["en", "ru", "es"]) assert.match(cart, new RegExp("  " + locale + ": \\{"));
  assert.match(cart, /orderTitle: "Оформление заказа/);
  assert.match(cart, /paymentTitle: "Оплата"/);
  assert.match(cart, /orderAction: "Заказать"/);
  assert.match(cart, /payment:|data-cart-payment-step/);
});

test("stale payment and order receipts cannot survive a basket modification", () => {
  const cart = source("components/commerce/personal-cart.tsx");
  for (const name of ["function add(id: string)", "function remove(id: string)"]) {
    const start = cart.indexOf(name);
    assert.ok(start >= 0, name);
    const end = cart.indexOf("\n  }", start);
    const action = cart.slice(start, end);
    assert.match(action, /squareStatusGeneration\.current \+= 1/);
    assert.match(action, /setSquareStatus\(null\)/);
    assert.match(action, /setOrderReceipt\(null\)/);
    assert.match(action, /SERVICE_CART_UPDATED_EVENT/);
  }
});

test("order contact request is catalog-scoped and consented, not a paid invoice", () => {
  const payload = {
    operationId: "13b822f6-8d70-4b1c-b44e-d0c31ad1d82f",
    locale: "ru",
    sourcePath: "/ru/cart",
    serviceTitle: "Экспресс-консультация (30 min)",
    description: "Хочу заказать выбранные личные консультации.",
    contact: { displayName: "", phone: "+14165550123", email: "" },
    contactConsent: true,
    website: "",
  };
  const result = normalizePublicServiceEnquiry(payload);
  assert.equal(result.contact.source, "website");
  assert.equal(result.contact.phone, "+14165550123");
  assert.equal(result.contactConsent, true);
  assert.equal(result.sourcePath, "/ru/cart");
  assert.equal("paid" in result, false);
  assert.equal("paymentMethod" in result, false);
  assert.throws(() => normalizePublicServiceEnquiry({ ...payload, contactConsent: false }));
});

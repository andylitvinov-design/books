import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  normalizeTalismanCheckoutItems, configuredTalismanBasket, publicTalismanBasketView,
} from "../lib/commerce/talisman-checkout.js";
import {
  TALISMAN_GOOGLE_RETURN_KEY, TALISMAN_CART_STORAGE_KEY,
  isTalismanGoogleReturn,
} from "../lib/practitioners/taoist-talisman-cart.js";
import { safeEnquiryReturnPath } from "../lib/app/enquiry-auth-redirect.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const fixture = {
  VERCEL_ENV: "production",
  HH_TALISMAN_PRODUCT_PRICES_APPROVED: "true",
  HH_TALISMAN_DELIVERY_TERMS_APPROVED: "true",
  HH_TALISMAN_FU_PROSPERITY_EUR_MINOR: "4500",
  HH_TALISMAN_FU_HARMONY_EUR_MINOR: "3000",
  HH_TALISMAN_FU_BALANCE_EUR_MINOR: "2500",
  HH_TALISMAN_PAYPAL_PERSONAL_APPROVED: "true",
};

test("nothing is payable before fixed item prices and exact fulfilment are approved", () => {
  for (const env of [
    {}, { ...fixture, VERCEL_ENV:"preview" },
    { ...fixture, HH_TALISMAN_PRODUCT_PRICES_APPROVED:"false" },
    { ...fixture, HH_TALISMAN_DELIVERY_TERMS_APPROVED:"false" },
    { ...fixture, HH_TALISMAN_FU_PROSPERITY_EUR_MINOR:undefined },
    { ...fixture, HH_TALISMAN_FU_PROSPERITY_EUR_MINOR:"0" },
    { ...fixture, HH_TALISMAN_FU_PROSPERITY_EUR_MINOR:"40.00" },
    { ...fixture, HH_TALISMAN_FU_PROSPERITY_EUR_MINOR:"1e6" },
  ]) {
    assert.equal(configuredTalismanBasket(["fu-prosperity"],"ru",env),null);
  }
  assert.deepEqual(publicTalismanBasketView(null),
    {available:false,reason:"PRICE_NOT_APPROVED"});
  for (const ids of [[],["unapproved"],["fu-balance","unapproved"],
    ["fu-harmony","fu-harmony"],["__proto__"],[null],["fu-balance",42]]) {
    assert.equal(normalizeTalismanCheckoutItems(ids),null);
    assert.equal(configuredTalismanBasket(ids,"en",fixture),null);
  }
});

test("server owns exact EUR sum and does not leak hosted checkout links in public preview", () => {
  const basket = configuredTalismanBasket(["fu-prosperity","fu-harmony"],"ru",fixture);
  assert.deepEqual(basket.ids, ["fu-prosperity","fu-harmony"]);
  assert.equal(basket.amountMinor,7500);
  assert.equal(basket.currency,"EUR");
  assert.deepEqual(basket.items.map(item=>item.amountMinor),[4500,3000]);
  assert.equal(basket.methods.paypal.url,"https://paypal.me/psitrends/75EUR");
  assert.equal(basket.methods.paypal.currency,"EUR");
  const view = publicTalismanBasketView(basket);
  assert.equal(view.available,true);
  assert.equal(view.amountMinor,7500);
  assert.deepEqual(view.methods.paypal,{currency:"EUR",amountMinor:7500});
  assert.doesNotMatch(JSON.stringify(view),/paypal\.me|square\.link|checkoutUrl|payment_status|user_id/);
  // Wise Business OPEN is a separate owner-approved rail, not a personal
  // WiseTag. Its hosted link has only product IDs, exact amount and currency.
  const wiseEnv = {
    ...fixture,
    HH_TALISMAN_WISE_BUSINESS_APPROVED: "true",
    HH_WISE_PAYMENTS_ENABLED: "true",
    HH_WISE_PAYEE_APPROVED: "true",
    HH_WISE_PAYMENT_OPEN_LINK: "https://wise.com/pay/business/approved-owner",
  };
  const wise = configuredTalismanBasket(["fu-prosperity","fu-harmony"],"en",wiseEnv);
  assert.equal(wise.methods.wise.currency,"EUR");
  assert.equal(wise.methods.wise.amountMinor,7500);
  assert.equal(new URL(wise.methods.wise.url).searchParams.get("amount"),"75.00");
  assert.equal(new URL(wise.methods.wise.url).searchParams.get("currency"),"EUR");
  const wiseDisabled = configuredTalismanBasket(["fu-prosperity"],"en",{
    ...wiseEnv, HH_TALISMAN_WISE_BUSINESS_APPROVED:"false",
  });
  assert.equal(wiseDisabled.methods.wise,undefined);
  const wisetagOnly = configuredTalismanBasket(["fu-prosperity"],"en",{
    ...wiseEnv, HH_WISE_PAYMENT_OPEN_LINK:undefined,
    HH_WISE_PAYMENT_WISETAG_LINK:"https://wise.com/pay/me/approved-owner",
    HH_WISE_WISETAG_BUSINESS_VERIFIED:"true",
  });
  assert.equal(wisetagOnly.methods.wise,undefined);
  assert.equal(configuredTalismanBasket(["fu-harmony"],"es",fixture).items[0].title,
    "Fu · Armonía y vínculos");
  const off = configuredTalismanBasket(["fu-harmony"],"ru",{
    ...fixture,HH_TALISMAN_PAYPAL_PERSONAL_APPROVED:"false",
  });
  assert.deepEqual(off.methods,{});
  assert.deepEqual(publicTalismanBasketView(off).methods,{});
});

test("Square Canada is exact basket CAD only; other services' links and made-up FX are denied", () => {
  const flags = {
    ...fixture,HH_TALISMAN_SQUARE_LINKS_APPROVED:"true",
    HH_TALISMAN_SQUARE_FU_HARMONY_AND_FU_PROSPERITY_URL:"https://square.link/u/ABCDE12345",
    HH_TALISMAN_SQUARE_FU_HARMONY_AND_FU_PROSPERITY_CAD_MINOR:"11200",
  };
  const basket = configuredTalismanBasket(["fu-prosperity","fu-harmony"],"ru",flags);
  assert.equal(basket.methods.square.url,"https://square.link/u/ABCDE12345");
  assert.equal(basket.methods.square.amountMinor,11200);
  assert.equal(basket.methods.square.currency,"CAD");
  assert.equal(basket.amountMinor,7500);
  const notSameBasket = configuredTalismanBasket(["fu-balance"],"ru",flags);
  assert.equal(notSameBasket.methods.square,undefined);
  for (const invalid of [
    "https://square.link.evil.test/u/ABCDE12345",
    "https://square.link/u/ABCDE12345?amount=1",
    "https://paypal.me/psitrends/75EUR",
  ]) assert.equal(configuredTalismanBasket(["fu-harmony","fu-prosperity"],"ru",{
    ...flags,HH_TALISMAN_SQUARE_FU_HARMONY_AND_FU_PROSPERITY_URL:invalid,
  }).methods.square,undefined);
});

test("one-use public OAuth marker survives Google but never carries personal data or opens private routes", () => {
  const now = Date.parse("2026-10-28T13:00:00Z");
  const fake = new Map([
    [TALISMAN_GOOGLE_RETURN_KEY,JSON.stringify({path:"/ru/holistic-support/mobile",createdAt:now})],
    [TALISMAN_CART_STORAGE_KEY,JSON.stringify(["fu-balance"])],
  ]);
  const store = {getItem:key=>fake.get(key)};
  assert.equal(isTalismanGoogleReturn(store,"/ru/holistic-support/mobile","?hh_enquiry=google",now),true);
  for (const [p,q,when] of [
    ["/ru/app/portrait","?hh_enquiry=google",now],
    ["/ru/holistic-support/mobile","?hh_enquiry=anything",now],
    ["/ru/holistic-support/mobile","?hh_enquiry=google",now+61*60*1000],
  ]) assert.equal(isTalismanGoogleReturn(store,p,q,when),false);
  assert.equal(safeEnquiryReturnPath("/ru/holistic-support/mobile","ru"),
    "/ru/holistic-support/mobile");
  assert.equal(safeEnquiryReturnPath("/ru/talismans/cart","ru"),
    "/ru/talismans/cart");
  const standalone = new Map([
    [TALISMAN_GOOGLE_RETURN_KEY,JSON.stringify({path:"/ru/talismans/cart",createdAt:now})],
    [TALISMAN_CART_STORAGE_KEY,JSON.stringify(["fu-prosperity"])],
  ]);
  assert.equal(isTalismanGoogleReturn({getItem:key=>standalone.get(key)},
    "/ru/talismans/cart","?hh_enquiry=google",now),true);
  assert.equal(safeEnquiryReturnPath("/ru/app/portrait","ru"),"");
});

test("Google account button, one-contact fallback and trusted purchase CTA are scoped to existing cart", () => {
  const cart = read("components/taoist-talisman-cart.tsx");
  const viewer = read("components/holistic-support-talisman-viewer.tsx");
  const mobile = read("components/holistic-support-mobile.tsx");
  const price = read("app/api/public/talisman-checkout/route.js");
  const endpoint = read("app/api/payments/talismans/checkout/route.js");
  assert.match(cart,/data-taoist-talisman-cart/);
  assert.match(cart,/data-talisman-google-start/);
  assert.match(cart,/continueTo:"enquiry",returnPath:source/);
  assert.match(cart,/TALISMAN_GOOGLE_RETURN_KEY/);
  assert.match(cart,/\/api\/app\/auth\/contact-profile/);
  assert.match(cart,/data-talisman-google-ready/);
  assert.match(cart,/\/app\/portrait/);
  assert.match(cart,/data-talisman-contact/);
  assert.match(cart,/data-talisman-reply-consent/);
  assert.match(cart,/data-talisman-payment-unavailable/);
  assert.match(cart,/data-talisman-payment-ready=\{payable \? "true" : "false"\}/);
  assert.match(cart,/data-talisman-pay-now/);
  assert.match(cart,/data-talisman-payment-pending/);
  assert.match(cart,/data-talisman-manual-rails/);
  assert.match(cart,/manualTransferLink\("interac"\)/);
  assert.match(cart,/manualTransferLink\("wise"\)/);
  assert.match(cart,/manualTransferLink\("zen"\)/);
  assert.match(cart,/data\.amountMinor !== expected\.amountMinor/);
  assert.match(endpoint,/\['paypal','square','wise'\]/);
  assert.match(cart,/sourcePath: "\/" \+ locale \+ "\/holistic-support"/);
  assert.match(viewer,/consumeBrowserTalismanGoogleReturn/);
  assert.doesNotMatch(viewer,/fetch\(|localStorage|sessionStorage|navigator\.sendBeacon|autoplay=1/);
  assert.match(mobile,/pendingBrowserTalismanGoogleReturn\(\) \? "talisman" : "healing"/);
  assert.doesNotMatch(mobile,/localStorage|sessionStorage|navigator\.sendBeacon/);
  assert.match(price,/configuredTalismanBasket/);
  assert.match(price,/publicTalismanBasketView/);
  assert.match(endpoint,/requireSameOrigin\(request, config\)/);
  assert.match(endpoint,/const actor = await auth\.verified\(\)/);
  assert.match(endpoint,/createPublicServiceEnquiry\(config,/);
  assert.match(endpoint,/input\.replyConsent !== true/);
  assert.match(endpoint,/status:'payment_not_verified'/);
  assert.doesNotMatch(endpoint,/payment_status: 'paid'|autoCharge|markAsPaid|stripe/i);
});

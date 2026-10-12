import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { safePublicWhatsAppPath, whatsappEnquiryUrl, WHATSAPP_NUMBER } from "../lib/whatsapp-enquiry.js";
import { trainingEnquiryUrl } from "../lib/public-lead-capture.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const translations = {
  en: { service: "Service", request: "Request", option: "Selected option", topic: "Topic", page: "Page" },
  ru: { service: "Услуга", request: "Запрос", option: "Выбранный вариант", topic: "Тема", page: "Страница" },
  es: { service: "Servicio", request: "Solicitud", option: "Opción elegida", topic: "Tema", page: "Página" },
};
function decode(link) {
  const u = new URL(link);
  assert.equal(u.origin, "https://wa.me");
  assert.equal(u.pathname, "/" + WHATSAPP_NUMBER);
  assert.deepEqual([...u.searchParams.keys()], ["text"]);
  return u.searchParams.get("text") || "";
}

test("all locales encode a named service, exact action, selected option, topic and public source", () => {
  for (const [locale, words] of Object.entries(translations)) {
    for (const [service, request, topic, pagePath] of [
      ["Reiki Yggdrasil", "Full personal Level 1 initiation, please send dates and prices", "Initiation", "/" + locale + "/academy/reiki/yggdrasil"],
      ["Psychohomeopathy", "Request a private personal consultation", "Wellbeing & energy", "/" + locale + "/services/psychohomeopathy?utm_source=ad&private=secret"],
      ["Free situation review", "Book a free introductory conversation", "Work & business", "/" + locale + "/services/free-situation-review"],
    ]) {
      const message = decode(whatsappEnquiryUrl({ locale, service, request, option:"A confirmed selected service", topic, pagePath }));
      assert.ok(message.includes(words.service + ": " + service), message);
      assert.ok(message.includes(words.request + ": " + request), message);
      assert.ok(message.includes(words.option + ": A confirmed selected service"));
      assert.ok(message.includes(words.topic + ": " + topic));
      assert.ok(message.includes(words.page + ": https://holistichouse.vercel.app/" + locale));
      assert.ok(message.indexOf(words.service + ": ") < message.indexOf(words.request + ": "));
      assert.ok(!message.includes("utm_source"));
      assert.ok(!message.includes("private=secret"));
    }
  }
});

test("no bare, generic or malformed WhatsApp message may be constructed", () => {
  assert.throws(() => whatsappEnquiryUrl({locale:"en",request:"Help me"}), /explicit service and request/);
  assert.throws(() => whatsappEnquiryUrl({locale:"en",service:"Consultation"}), /explicit service and request/);
  assert.throws(() => whatsappEnquiryUrl({locale:"en",service:"  ",request:"  "}), /explicit service and request/);
  const message=decode(whatsappEnquiryUrl({locale:"en",service:"Personal consultation\nUntrusted: injected",request:"Arrange an appointment\r\nSecond line",topic:"Personal situation"}));
  assert.ok(message.includes("Service: Personal consultation Untrusted: injected"));
  assert.ok(message.includes("Request: Arrange an appointment Second line"));
  assert.ok(!message.includes("Service: Personal consultation\n"));
});

test("private cabinet names, tokens, query strings and reports never leak as source links", () => {
  for (const value of [
    "/en/client", "/ru/client/secret-selector", "/en/app/reports/123",
    "/en/tests/results/123", "/en/account", "/es/private/report",
    "/api/client/secret", "/en/report/token", "//evil.example/path",
    "/en/services/free-situation-review?token=secret#section",
  ]) {
    const source = safePublicWhatsAppPath(value);
    if(value.includes("?token=")&&value.startsWith("/en/services")) assert.equal(source, "/en/services/free-situation-review");
    else assert.equal(source, "", value);
  }
  const cabinet = decode(whatsappEnquiryUrl({locale:"ru",service:"Поддержка кабинета",request:"Есть вопрос",pagePath:"/ru/client/private-selector?secret=sensitive"}));
  assert.ok(!cabinet.includes("Страница:"));
  assert.ok(!cabinet.includes("private-selector"));
  assert.ok(!cabinet.includes("secret"));
});

test("academy requests name each programme and explicitly request programme, dates, format and price", () => {
  for (const locale of ["en","ru","es"]) {
    for (const [path,service] of [
      ["/"+locale+"/academy/reiki/tantra-reiki", "Tantra Reiki"],
      ["/"+locale+"/academy/reiki/yggdrasil", "DAO Reiki Yggdrasil"],
      ["/"+locale+"/academy/temple-studies", "Temple Studies"],
    ]) {
      const msg=decode(trainingEnquiryUrl(locale,path));
      assert.ok(msg.includes(service), msg);
      assert.ok(msg.includes(translations[locale].service + ": " + service));
      assert.ok(msg.includes(translations[locale].request + ": "));
      assert.ok(msg.includes("https://holistichouse.vercel.app" + path));
      assert.ok(msg.length > 120);
    }
  }
});

test("every site lead surface uses structured service/request WhatsApp links, never the vague 'about this topic' wording", () => {
  const sources = [
    ["components/consultation-choice-capture.tsx",/whatsappEnquiryUrl\(\{/],
    ["components/reiki-choice-capture.tsx",/whatsappEnquiryUrl\(\{/],
    ["components/reiki-landing-forms.tsx",/whatsappEnquiryUrl\(\{/],
    ["components/yggdrasil-free-initiation.tsx",/whatsappEnquiryUrl\(\{/],
    ["components/client-cabinet.jsx",/whatsappEnquiryUrl\(\{/],
    ["app/[locale]/homeopathy/page.tsx",/whatsappEnquiryUrl\(\{/],
    ["lib/public-lead-capture.js",/whatsappEnquiryUrl\(\{/],
    ["components/public-consultation-cta.tsx",/trainingEnquiryUrl\(locale, pathname\)/],
  ];
  for (const [path,expression] of sources) {
    const src=read(path);
    assert.match(src,expression,path);
    assert.doesNotMatch(src,/https:\/\/wa\.me\/14376066502(?!.*enquiry)/i,path);
  }
  const consultation=read("components/consultation-choice-capture.tsx");
  assert.match(consultation,/isPaidRequest = isService && serviceChoice !== "free"/);
  assert.match(consultation,/option: t\.serviceOptions\[serviceChoice\]/);
  assert.match(consultation,/const ctaHref = isPaidRequest \? whatsappUrl/);
  assert.doesNotMatch(consultation,/about this topic|по этой теме|sobre este tema/i);
  const cabinet=read("components/client-cabinet.jsx");
  assert.doesNotMatch(cabinet,/https:\/\/wa\.me\/14376066502\b/);
  assert.match(cabinet,/private selector, document IDs or client name/);
});


test("consultation choices do not duplicate the Request label in prepared WhatsApp text", () => {
  const capture = read("components/consultation-choice-capture.tsx");
  assert.doesNotMatch(capture, /serviceMessages:[\s\S]*?Request: I would like to book/);
  assert.doesNotMatch(capture, /serviceMessages:[\s\S]*?Запрос: хочу записаться/);
});

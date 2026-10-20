import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const form = read("components/alchemy-soul-lead-form.tsx");
function render({ locale, selected, wiseEnabled, paypalPersonalEnabled }, input = form) {
  const zenCalls = [];
  const jsx = (type, props) => ({ type, props: props || {} });
  const modules = {
    react: { useState: () => [selected, () => {}], useId: () => "fixture" },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/link": { default: "a", __esModule: true },
    "lucide-react": { Check: "check", ShieldCheck: "shield" },
    "@/components/contact-channel-chooser": { ContactChannelChooser: "contact-chooser" },
    "@/lib/whatsapp-enquiry": { whatsappEnquiryUrl: () => "https://example.invalid/request" },
    "@/lib/commerce/zen-transfer-inquiry": { buildZenTransferInquiry: (ids, lang) => {
      zenCalls.push({ ids: [...ids], locale: lang }); return "https://example.invalid/zen";
    } },
    "./alchemy-soul-landing.module.css": { default: new Proxy({}, { get: (_, name) => name }), __esModule: true },
  };
  const compiled = ts.transpileModule(input, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, require: name => {
    assert.ok(Object.hasOwn(modules, name), name); return modules[name];
  } });
  const tree = exports.AlchemySoulFormatSelector({ locale, wiseEnabled, paypalPersonalEnabled });
  const nodes = [];
  const walk = node => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    nodes.push(node); walk(node.props?.children);
  };
  walk(tree);
  return { nodes, zenCalls };
}
const marked = (nodes, name) => nodes.filter(node => Object.hasOwn(node.props, name));

function assertGates(input = form) {
  for (const locale of ["en", "ru", "es"]) for (const selected of ["30", "60", "month"])
    for (const wiseEnabled of [false, true]) for (const paypalPersonalEnabled of [false, true]) {
      const { nodes, zenCalls } = render({ locale, selected, wiseEnabled, paypalPersonalEnabled }, input);
      const monthly = selected === "month";
      const disclosures = marked(nodes, "data-alchemy-payment-disclosure");
      assert.equal(disclosures.length, monthly ? 0 : 1);
      if (!monthly) {
        assert.equal(disclosures[0].type, "details");
        assert.ok(!disclosures[0].props.open, "Payment details default closed");
        assert.equal(nodes.filter(node => node.type === "summary").length, 1);
      }
      assert.equal(marked(nodes, "data-wise-payment-link").length, !monthly && wiseEnabled ? 1 : 0);
      assert.equal(marked(nodes, "data-paypal-personal-offer").length, !monthly && paypalPersonalEnabled ? 1 : 0);
      assert.equal(marked(nodes, "data-zen-manual-request").length, monthly ? 0 : 1);
      const product = selected === "30" ? "express-consultation-30" : "personal-session-60";
      for (const [provider, enabled] of [["wise", wiseEnabled], ["paypal", paypalPersonalEnabled]]) {
        const links = nodes.filter(node => node.type === "a" && node.props.href?.startsWith("/api/payments/" + provider));
        assert.equal(links.length, !monthly && enabled ? 1 : 0);
        if (links.length) assert.equal(links[0].props.href, "/api/payments/" + provider + "/" + product);
      }
      assert.deepEqual(zenCalls, monthly ? [] : [{ ids: [product], locale }]);
      const terms = nodes.filter(node => node.type === "a" && node.props.href === "/" + locale + "/payments");
      assert.equal(terms.length, !monthly && paypalPersonalEnabled ? 1 : 0);
    }
}

test("Owner payment disclosure preserves every provider/month gate and product for EN/RU/ES", () => assertGates());

test("Open-by-default, unpriced-month and disabled-provider mutations fail", () => {
  for (const [before, after] of [
    ['data-alchemy-payment-disclosure>', 'data-alchemy-payment-disclosure open>'],
    ['selected !== "month" && (wiseEnabled', 'true && (wiseEnabled'],
    ['{wiseEnabled ? (', '{true ? ('],
    ['{paypalPersonalEnabled ? (', '{true ? ('],
  ]) {
    assert.ok(form.includes(before), before);
    assert.throws(() => assertGates(form.replace(before, after)), undefined, before);
  }
});

test("Owner disclosure follows booking and retains all safety text and localized terms", () => {
  assert.ok(form.indexOf('data-alchemy-payment-disclosure') > form.indexOf('data-alchemy-booking": "formats"'));
  assert.doesNotMatch(form, /data-alchemy-payment-options/);
  for (const text of [
    "WiseTag requires a Wise account and manual amount entry.",
    "After agreeing the session, choose Goods & Services and verify Andrii Litvinov. Manual payment verification.",
    "Only a request for transfer instructions, not a completed payment. Agree a session time and confirm ZEN availability first.",
    "После согласования сеанса. Выберите «Товары и услуги»",
    "Это запрос реквизитов для разовой сессии, а не оплата.",
    "Tras acordar la sesión, elige Productos y servicios",
    "Solicitud de instrucciones para transferencia, no un pago.",
    "Условия и подтверждение оплаты", "Instrucciones y confirmación", "Payment details & confirmation",
  ]) assert.ok(form.includes(text), text);
});

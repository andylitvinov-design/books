import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { whatsappEnquiryUrl } from "../lib/whatsapp-enquiry.js";
import { buildZenTransferInquiry } from "../lib/commerce/zen-transfer-inquiry.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const form = read("components/alchemy-soul-lead-form.tsx");
function render({ locale, selected, wiseEnabled, paypalPersonalEnabled }, input = form) {
  const zenCalls = [];
  const jsx = (type, props) => {
    assert.ok(typeof type === "string" || typeof type === "function", "Defined JSX component");
    return { type, props: props || {} };
  };
  const ast = ts.createSourceFile("alchemy-soul-lead-form.tsx", input, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(ast.parseDiagnostics.length, 0, "Actual selector source parses");
  const component = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "AlchemySoulFormatSelector");
  assert.ok(component?.body, "Actual format selector");
  const stateNames = component.body.statements.flatMap(statement => ts.isVariableStatement(statement)
    ? statement.declarationList.declarations.flatMap(declaration =>
      ts.isArrayBindingPattern(declaration.name) && declaration.initializer && ts.isCallExpression(declaration.initializer)
        && declaration.initializer.expression.getText(ast) === "useState"
        ? [declaration.name.elements[0].name.getText(ast)] : []) : []);
  assert.ok(stateNames.includes("selected"), "Selected format is seeded by actual hook name");
  let stateIndex = 0;
  const externalAttempts = [];
  function forbidden() {
    externalAttempts.push("external operation");
    throw new Error("External operation forbidden in Alchemy payment fixture");
  }
  const modules = {
    react: {
      useState: initial => [stateNames[stateIndex++] === "selected" ? selected : typeof initial === "function" ? initial() : initial, forbidden],
      useId: () => "fixture", useCallback: callback => callback,
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/link": { default: "a", __esModule: true },
    "lucide-react": { Check: "check", ShieldCheck: "shield" },
    "@/components/contact-channel-chooser": { ContactChannelChooser: "contact-chooser" },
    "@/lib/whatsapp-enquiry": { whatsappEnquiryUrl },
    "@/lib/commerce/zen-transfer-inquiry": { buildZenTransferInquiry: (ids, lang) => {
      zenCalls.push({ ids: [...ids], locale: lang }); return buildZenTransferInquiry(ids, lang);
    } },
    "./alchemy-soul-landing.module.css": { default: new Proxy({}, { get: (_, name) => name }), __esModule: true },
  };
  const compiled = ts.transpileModule(input, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, fetch: forbidden, XMLHttpRequest: forbidden, WebSocket: forbidden, require: name => {
    assert.ok(Object.hasOwn(modules, name), "Unexpected Alchemy dependency: " + name); return modules[name];
  } }, { timeout: 5000 });
  const tree = exports.AlchemySoulFormatSelector({ locale, wiseEnabled, paypalPersonalEnabled });
  assert.deepEqual(externalAttempts, [], "Alchemy fixture permits no external attempts, including caught failures");
  assert.equal(stateIndex, stateNames.length, "All actual selector state hooks executed");
  const nodes = [];
  const walk = node => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    nodes.push(node); walk(node.props?.children);
  };
  walk(tree);
  for (const button of nodes.filter(node => Object.hasOwn(node.props, "data-alchemy-format"))) {
    assert.equal(button.props.disabled, false, "Fresh selector does not invent an active submission lock");
  }
  return { nodes, zenCalls };
}
const marked = (nodes, name) => nodes.filter(node => Object.hasOwn(node.props, name));

function assertGates(input = form) {
  for (const locale of ["en", "ru", "es"]) for (const selected of ["30", "60", "month"])
    for (const wiseEnabled of [false, true]) for (const paypalPersonalEnabled of [false, true]) {
      const { nodes, zenCalls } = render({ locale, selected, wiseEnabled, paypalPersonalEnabled }, input);
      const monthly = selected === "month";
      const disclosures = marked(nodes, "data-alchemy-payment-disclosure");
      assert.equal(disclosures.length, monthly ? 0 : 1, "Payment disclosure count respects monthly gate");
      if (!monthly) {
        assert.equal(disclosures[0].type, "details");
        assert.ok(!disclosures[0].props.open, "Payment details default closed");
        const directChildren = [disclosures[0].props.children].flat(Infinity);
        assert.equal(directChildren.filter(node => node?.type === "summary").length, 1, "One direct summary for the payment disclosure; nested help disclosures are independent");
      }
      assert.equal(marked(nodes, "data-wise-payment-link").length, !monthly && wiseEnabled ? 1 : 0, "Wise respects enabled and monthly gates");
      assert.equal(marked(nodes, "data-paypal-personal-offer").length, !monthly && paypalPersonalEnabled ? 1 : 0, "PayPal respects enabled and monthly gates");
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
  assertGates(); // Negative controls must not pass just because the fixture cannot render.
  for (const [before, after] of [
    ['data-alchemy-payment-disclosure>', 'data-alchemy-payment-disclosure open>'],
    ['selected !== "month" && (wiseEnabled', 'true && (wiseEnabled'],
    ['{wiseEnabled ? (', '{true ? ('],
    ['{paypalPersonalEnabled ? (', '{true ? ('],
  ]) {
    assert.equal(form.split(before).length - 1, 1, "One exact mutation target: " + before);
    assert.throws(() => assertGates(form.replace(before, after)), error =>
      error.code === "ERR_ASSERTION" && /Payment details default closed|Payment disclosure count respects monthly gate|Wise respects enabled and monthly gates|PayPal respects enabled and monthly gates/.test(error.message), before);
  }
});

test("Alchemy fixture rejects unknown imports and never permits network effects", () => {
  const options = { locale: "en", selected: "30", wiseEnabled: false, paypalPersonalEnabled: false };
  assert.throws(() => render(options, 'import "@/unmapped-payment-dependency";\n' + form),
    /Unexpected Alchemy dependency: @\/unmapped-payment-dependency/);
  assert.throws(() => render(options, 'fetch("https://example.invalid/forbidden");\n' + form),
    /External operation forbidden in Alchemy payment fixture/);
  for (const effect of ['fetch("https://example.invalid/forbidden")', 'new XMLHttpRequest()', 'new WebSocket("wss://example.invalid/forbidden")']) {
    assert.throws(() => render(options, 'try { ' + effect + '; } catch {}\n' + form),
      /Alchemy fixture permits no external attempts, including caught failures/);
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

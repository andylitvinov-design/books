import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { WHATSAPP_NUMBER, whatsappEnquiryUrl } from "../lib/whatsapp-enquiry.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const source = read("components/tantra-initiation-form.tsx");
const chooser = read("components/contact-channel-chooser.tsx");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
  },
}).outputText;

// Render the one client-side selection using an inert JSX runtime. The stub
// does not run effects or network calls; all messenger drafts are read-only.
const jsx = (type, props) => ({ type, props });
let currentChoice = "free";
const dependencies = (name) => {
  if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "fragment" };
  if (name === "react") return {
    useState: () => [currentChoice, value => { currentChoice = value; }],
    useEffect: () => {},
  };
  if (name === "lucide-react") return new Proxy({}, { get: (_, key) => key });
  if (name === "@/lib/whatsapp-enquiry") return { whatsappEnquiryUrl };
  if (name === "@/components/contact-channel-chooser") return { ContactChannelChooser: "contact-channel-chooser" };
  if (name.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
  throw new Error("Unexpected import: " + name);
};

const compiledModule = { exports: {} };
new Function("require", "module", "exports", compiled)(
  dependencies, compiledModule, compiledModule.exports,
);
const { TantraInitiationForm, tantraInitiationWhatsAppUrl } = compiledModule.exports;
const intents = ["free", "personal", "session", "answers", "feedback"];

function flatten(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}
function render(locale, choice = "free") {
  currentChoice = choice;
  const nodes = flatten(TantraInitiationForm({ locale }));
  return {
    nodes,
    links: nodes.filter(node => node.type === "contact-channel-chooser"),
    selects: nodes.filter(node => node.type === "select"),
    options: nodes.filter(node => node.type === "option"),
    anchors: nodes.filter(node => node.type === "span" && /^apply-/.test(node.props?.id || "")),
  };
}

test("EN/RU/ES shows one choice, five deep links and one CRM-first phone handoff", () => {
  for (const locale of ["en", "ru", "es"]) {
    const { links, selects, options, anchors, nodes } = render(locale);
    assert.equal(links.length, 1);
    assert.equal(links[0].props.compactPhone, true);
    assert.equal(links[0].props.stayAfterSave, true);
    assert.equal(links[0].props.resetKey, "tantra-initiation-" + locale + "-free");
    assert.equal(selects.length, 1);
    assert.equal(selects[0].props.value, "free");
    assert.deepEqual(options.map(option => option.props.value), intents);
    assert.deepEqual(anchors.map(node => node.props.id), intents.map(intent => "apply-" + intent));
    assert.ok(nodes.some(node => node.props?.["data-tantra-whatsapp-capture"] !== undefined));
    assert.equal(nodes.filter(node => node.type === "form").length, 0, "No second signup form");
  }
});

test("switching intent updates the one chooser, topic and localized messenger draft", () => {
  for (const locale of ["en", "ru", "es"]) {
    const initial = render(locale);
    initial.selects[0].props.onChange({ target: { value: "personal" } });
    assert.equal(currentChoice, "personal");
    const personal = render(locale, currentChoice);
    assert.equal(personal.links[0].props.whatsappUrl, tantraInitiationWhatsAppUrl(locale, "personal"));
    assert.ok(personal.links[0].props.publicTopic.includes("€50 / 30"));
    personal.selects[0].props.onChange({ target: { value: "unknown" } });
    assert.equal(currentChoice, "personal", "Unknown intent cannot be selected");
    for (const intent of intents) {
      const { links } = render(locale, intent);
      assert.equal(links.length, 1);
      assert.equal(links[0].props.whatsappUrl, tantraInitiationWhatsAppUrl(locale, intent));
      assert.ok(links[0].props.publicTopic, intent);
    }
  }
});

test("all five localized drafts retain original service, pricing and feedback intent", () => {
  for (const locale of ["en", "ru", "es"]) {
    const messages = intents.map(intent => {
      const url = new URL(tantraInitiationWhatsAppUrl(locale, intent));
      assert.equal(url.origin, "https://wa.me");
      assert.equal(url.pathname, "/" + WHATSAPP_NUMBER);
      const draft = url.searchParams.get("text");
      assert.ok(draft.includes("holistichouse.vercel.app/" + locale + "/academy/reiki/tantra-reiki/free-initiation"));
      assert.match(draft, /Tantra Reiki|Тантра Рейки/);
      return draft;
    });
    assert.equal(new Set(messages).size, 5);
    assert.match(messages[0], /free|бесплатн|gratuit/i);
    assert.ok(messages[1].includes("€50 / 30"));
    assert.match(messages[2], /100\s?€|€100/);
    assert.match(messages[2], /60\s?(minutes|минут|minutos)/);
    assert.match(messages[3], /seven|7|siete/i);
    assert.match(messages[4], /review|impressions|practice|отзыв|impresiones|práctica/);
    assert.match(messages[4], /flow|поток|flujo/);
  }
});

test("personal and feedback deep links select the appropriate option on load/hash change", () => {
  assert.match(source, /window\.location\.hash === "#apply-" \+ value/);
  assert.match(source, /selectFromHash\(\)/);
  assert.match(source, /window\.addEventListener\("hashchange", selectFromHash\)/);
  assert.match(source, /window\.removeEventListener\("hashchange", selectFromHash\)/);
  assert.ok(!source.includes("localStorage"));
  assert.ok(!source.includes('type="email"'));
  assert.ok(!source.includes("<textarea"));
});

test("the phone is saved only after explicit consent and never attached to a messenger URL", () => {
  const save = chooser.slice(chooser.indexOf("  async function saveEnquiry(channel?"), chooser.indexOf("\n  let preparedWhatsApp"));
  assert.match(save, /!consent/);
  assert.match(save, /fetch\("\/api\/service-enquiries"/);
  assert.match(save, /contact: \{ displayName: displayName\.trim\(\), email: usePhone \? "" : email\.trim\(\), phone: usePhone \? cleanedPhone : "" \}/);
  assert.match(save, /setSaved\(\{ saved: true, referenceCode: data\.referenceCode \}\)/);
  assert.match(save, /handoffWindow\.location\.replace\(destination\)/);
  assert.doesNotMatch(save, /request: .*phone|text.*cleanedPhone/);
  for (const locale of ["en", "ru", "es"]) {
    const url = new URL(tantraInitiationWhatsAppUrl(locale, "answers"));
    const message = url.searchParams.get("text");
    assert.match(message, /1–7|seven|siete|выбранном мессенджере/);
    assert.ok(!message.includes("filename="));
    assert.ok(!message.includes("base64"));
  }
});

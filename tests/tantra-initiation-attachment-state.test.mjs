import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { WHATSAPP_NUMBER, whatsappEnquiryUrl } from "../lib/whatsapp-enquiry.js";

const source = readFileSync(new URL("../components/tantra-initiation-form.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
  },
}).outputText;

// Render the real server component with an inert JSX runtime. No browsers,
// files or messaging services are touched; only the URL drafts are inspected.
const jsx = (type, props) => ({ type, props });
const dependencies = (name) => {
  if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "fragment" };
  if (name === "lucide-react") return new Proxy({}, { get: (_, key) => key });
  if (name === "@/lib/whatsapp-enquiry") return { whatsappEnquiryUrl };
  if (name.endsWith(".module.css")) {
    return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
  }
  throw new Error("Unexpected import: " + name);
};

const compiledModule = { exports: {} };
new Function("require", "module", "exports", compiled)(
  dependencies,
  compiledModule,
  compiledModule.exports,
);
const { TantraInitiationForm, tantraInitiationWhatsAppUrl } = compiledModule.exports;

function flatten(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}

function render(locale) {
  const nodes = flatten(TantraInitiationForm({ locale }));
  return {
    nodes,
    links: nodes.filter((node) => node.type === "a"),
  };
}

test("EN/RU/ES capture renders exactly three direct WhatsApp actions", () => {
  for (const locale of ["en", "ru", "es"]) {
    const { links } = render(locale);
    assert.deepEqual(links.map((link) => link.props.id), [
      "apply-free",
      "apply-personal",
      "apply-answers",
    ]);
    assert.equal(links.length, 3);
    for (const link of links) {
      const url = new URL(link.props.href);
      assert.equal(url.origin, "https://wa.me");
      assert.equal(url.pathname, "/" + WHATSAPP_NUMBER);
      assert.equal(link.props.target, "_blank");
      assert.equal(link.props.rel, "noopener noreferrer");
      assert.ok(url.searchParams.get("text"));
    }
  }
});

test("free, personal and prepared-answers WhatsApp links keep distinct localized requests", () => {
  for (const locale of ["en", "ru", "es"]) {
    const { links } = render(locale);
    const messages = links.map((link) => new URL(link.props.href).searchParams.get("text"));
    assert.equal(new Set(messages).size, 3);
    const service = locale === "ru" ? "Тантра Рейки" : "Tantra Reiki";
    for (const message of messages) {
      assert.ok(message.includes(service), message);
      assert.ok(message.includes("holistichouse.vercel.app/" + locale + "/academy/reiki/tantra-reiki/free-initiation"));
    }
    assert.ok(/free|бесплатн|gratuit/i.test(messages[0]));
    assert.ok(messages[1].includes("€50 / 30"));
    assert.ok(/seven|7|siete/i.test(messages[2]));
  }
});

test("answers go into the user's WhatsApp draft, not a hidden uploaded document", () => {
  for (const locale of ["en", "ru", "es"]) {
    const direct = tantraInitiationWhatsAppUrl(locale, "answers");
    const fromCard = render(locale).links[2].props.href;
    assert.equal(fromCard, direct);
    const draft = new URL(direct).searchParams.get("text");
    assert.ok(draft.includes("WhatsApp"));
    assert.ok(!draft.includes("filename="));
    assert.ok(!draft.includes("base64"));
  }
});

test("capture has no form, inputs, file upload, internal state or hidden submissions", () => {
  for (const locale of ["en", "ru", "es"]) {
    const { nodes } = render(locale);
    const prohibited = ["form", "input", "textarea", "select", "button", "label"];
    assert.deepEqual(nodes.filter((node) => prohibited.includes(node.type)), []);
    assert.ok(!nodes.some((node) => node.props?.onSubmit || node.props?.onChange || node.props?.onClick));
  }
  assert.doesNotMatch(source, /navigator\.|window\.|localStorage|FormData|<input\b|<textarea\b/);
});

test("the site only prepares WhatsApp drafts; it never sends messages automatically", () => {
  const ru = render("ru");
  const t = ru.links[0].props.href;
  assert.match(t, /^https:\/\/wa\.me\/\d+\?text=/);
  const draft = new URL(t).searchParams.get("text");
  assert.ok(draft.includes("Запрос:"));
  assert.ok(draft.includes("Услуга:"));
  assert.ok(draft.includes("Хочу запросить бесплатную"));
  assert.ok(!draft.includes("Ваше имя:"));
  assert.ok(!draft.includes("Email:"));
});

test("review-after-video is a distinct localized WhatsApp draft and does not send automatically", () => {
  for (const locale of ["en", "ru", "es"]) {
    const url = new URL(tantraInitiationWhatsAppUrl(locale, "feedback"));
    assert.equal(url.origin, "https://wa.me");
    assert.equal(url.pathname, "/" + WHATSAPP_NUMBER);
    const message = url.searchParams.get("text");
    assert.ok(message.includes("Tantra Reiki") || message.includes("Тантра Рейки"));
    assert.match(message, /review|impressions|practice|отзыв|impresiones|práctica/);
    assert.match(message, /flow|поток|flujo/);
    assert.ok(message.includes("/" + locale + "/academy/reiki/tantra-reiki/free-initiation"));
    assert.notEqual(url.href, render(locale).links[2].props.href);
  }
});

test("the fifth step's personal distance initiation is optional and has its own enquiry", () => {
  for (const locale of ["en", "ru", "es"]) {
    const message = new URL(tantraInitiationWhatsAppUrl(locale, "personal")).searchParams.get("text");
    assert.match(message, /online|дистанционную|distancia/);
    assert.ok(message.includes("€50 / 30"));
    assert.notEqual(message, new URL(tantraInitiationWhatsAppUrl(locale, "free")).searchParams.get("text"));
  }
});

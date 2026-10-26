import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { environment, mount, turn, deferred, success, CONTACT_REFERENCE } from "./helpers/contact-component-fixture.mjs";
import { WHATSAPP_NUMBER, whatsappEnquiryUrl } from "../lib/whatsapp-enquiry.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const serverSource = read("components/tantra-initiation-form.tsx");
const clientSource = read("components/tantra-initiation-choice.tsx");
const chooser = read("components/contact-channel-chooser.tsx");
function compile(source) {
  return ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
}

// Render both real components with inert JSX; no effects, network or private data.
const jsx = (type, props) => ({ type, props });
let currentChoice = "free";
let ClientChoice;
const dependencies = (name) => {
  if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "fragment" };
  if (name === "react") return {
    useState: () => [currentChoice, value => { currentChoice = value; }],
    useEffect: () => {},
  };
  if (name === "lucide-react") return { ChevronDown: "chevron-down" };
  if (name === "@/lib/whatsapp-enquiry") return { whatsappEnquiryUrl };
  if (name === "@/components/contact-channel-chooser") return { ContactChannelChooser: "contact-channel-chooser" };
  if (name === "@/components/tantra-initiation-choice") return { TantraInitiationChoice: ClientChoice };
  if (name === "./tantra-free-initiation.module.css") return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
  throw new Error("Unexpected import: " + name);
};
const instantiate = source => {
  const componentModule = { exports: {} };
  new Function("require", "module", "exports", compile(source))(
    dependencies, componentModule, componentModule.exports,
  );
  return componentModule.exports;
};
ClientChoice = instantiate(clientSource).TantraInitiationChoice;
const { TantraInitiationForm, tantraInitiationWhatsAppUrl } = instantiate(serverSource);

function flatten(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}
function render(locale, choice = "free") {
  currentChoice = choice;
  const wrapper = TantraInitiationForm({ locale });
  assert.equal(wrapper.type, ClientChoice);
  const nodes = flatten(ClientChoice(wrapper.props));
  return {
    nodes,
    links: nodes.filter(node => node.type === "contact-channel-chooser"),
    selects: nodes.filter(node => node.type === "select"),
    options: nodes.filter(node => node.type === "option"),
    anchors: nodes.filter(node => node.type === "span" && /^apply-/.test(node.props?.id || "")),
  };
}
const intents = ["free", "personal", "session", "answers", "feedback"];


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
  assert.match(clientSource, /window\.location\.hash === "#apply-" \+ option\.intent/);
  assert.match(clientSource, /selectFromHash\(\)/);
  assert.match(clientSource, /window\.addEventListener\("hashchange", selectFromHash\)/);
  assert.match(clientSource, /window\.removeEventListener\("hashchange", selectFromHash\)/);
  assert.ok(!clientSource.includes("localStorage"));
  assert.ok(!clientSource.includes('type="email"'));
  assert.ok(!clientSource.includes("<textarea"));
});

async function assertTantraHandoff({ locale = "en", channel = "whatsapp", source = chooser, receiptFault } = {}) {
  // Props come from the real server wrapper and the selected real client branch.
  const props = render(locale, "answers").links[0].props;
  const pathname = "/" + locale + "/academy/reiki/tantra-reiki/free-initiation";
  const env = environment(locale, { pathname }), hold = deferred();
  const f = mount("contact-channel-chooser", "ContactChannelChooser", props, env, { sourceOverride: source });
  const channels = () => f.nodes().filter(node => node.type === "acquisition-link");
  f.change("input", value => value.type === "tel", "+14165550123");
  f.click("button", value => value["data-contact-channel-submit"] === channel);
  await turn(f);
  assert.equal(env.requests.length, 0, "No request without explicit consent");
  assert.equal(env.popups.length, 0, "No handoff window without explicit consent");
  assert.equal(channels().length, 0, "No messenger links before registration");
  f.change("input", value => value.type === "checkbox", true);
  env.setRespond(() => hold.promise);
  f.click("button", value => value["data-contact-channel-submit"] === channel);
  assert.equal(env.requests.length, 1);
  const body = JSON.parse(env.requests[0]);
  assert.equal(body.contactConsent, true);
  assert.deepEqual(body.contact, { displayName: "", email: "", phone: "+14165550123" });
  assert.equal(body.sourcePath, pathname);
  assert.equal(body.description, props.publicTopic);
  assert.ok(body.serviceTitle && props.publicTopic.startsWith(body.serviceTitle));
  assert.equal(env.popups.length, 1);
  assert.equal(env.popups[0].opener, null);
  assert.deepEqual(env.popups[0].destinations, [], "Pending response cannot hand off");
  assert.equal(channels().length, 0);
  assert.deepEqual(env.writes, []);
  hold.resolve(receiptFault ? { ok: receiptFault !== "http-error", json: async () => ({
    saved: receiptFault !== "saved-false", referenceCode: receiptFault === "bad-reference" ? "INVALID" : CONTACT_REFERENCE,
  }) } : success());
  await turn(f);
  if (receiptFault) {
    assert.deepEqual(env.popups[0].destinations, [], "Unconfirmed receipt cannot hand off");
    assert.equal(env.popups[0].closed, true);
    assert.equal(channels().length, 0, "Unconfirmed receipt cannot expose messenger links");
    assert.deepEqual(env.writes, []);
  } else {
    assert.equal(channels().length, 2);
    const suffix = "\n\n" + ({ en: "Enquiry", ru: "Заявка", es: "Solicitud" }[locale]) + ": " + CONTACT_REFERENCE;
    for (const link of channels()) {
      const kind = link.props.attributes["data-contact-channel"], url = new URL(link.props.href);
      assert.equal(url.origin, kind === "whatsapp" ? "https://wa.me" : "https://t.me");
      assert.equal(url.pathname, kind === "whatsapp" ? "/" + WHATSAPP_NUMBER : "/AndyTherapist");
      assert.deepEqual([...url.searchParams.keys()], ["text"]);
      assert.equal(url.searchParams.get("text"), new URL(props.whatsappUrl).searchParams.get("text") + suffix);
      assert.doesNotMatch(decodeURIComponent(link.props.href), /14165550123|contactConsent|operationId|filename=|base64/);
    }
    const destination = channels().find(link => link.props.attributes["data-contact-channel"] === channel).props.href;
    assert.deepEqual(env.popups[0].destinations, [destination], "Only the neutral acknowledged draft may be handed off");
    assert.doesNotMatch(decodeURIComponent(env.popups[0].destinations[0]), /14165550123|contactConsent|operationId|filename=|base64/);
    assert.equal(env.writes.length, 1);
    assert.deepEqual(Object.keys(JSON.parse(env.writes[0][1])).sort(), ["createdAt", "referenceCode"]);
  }
  assert.deepEqual(env.navigations, [], "Tantra stayAfterSave retains its acknowledged receipt");
}

test("the phone is saved only after explicit consent and never attached to a messenger URL", async () => {
  for (const locale of ["en", "ru", "es"]) for (const channel of ["whatsapp", "telegram"])
    await assertTantraHandoff({ locale, channel });
  for (const locale of ["en", "ru", "es"]) {
    const url = new URL(tantraInitiationWhatsAppUrl(locale, "answers"));
    const message = url.searchParams.get("text");
    assert.match(message, /1–7|seven|siete|выбранном мессенджере/);
    assert.ok(!message.includes("filename="));
    assert.ok(!message.includes("base64"));
  }
});


test("the wrapper fixture rejects unexpected module boundaries", () => {
  for (const specifier of ["node:fs", "unknown-module", "./unrelated.module.css", "@/lib/private-data"])
    assert.throws(() => instantiate('import "' + specifier + '"; export const value = true;'), /Unexpected import:/);
  assert.throws(() => instantiate(clientSource.replace('from "react"', 'from "unknown-react"')), /Unexpected import: unknown-react/);
  assert.throws(() => instantiate(serverSource.replace('from "@/components/tantra-initiation-choice"',
    'from "@/components/unreviewed-choice"')), /Unexpected import: @\/components\/unreviewed-choice/);
});


for (const receiptFault of ["saved-false", "bad-reference", "http-error"])
  test("Tantra rejects unconfirmed " + receiptFault + " before exposing or opening a messenger", () =>
    assertTantraHandoff({ receiptFault }));

function changeExactlyOnce(source, before, after) {
  assert.equal(source.split(before).length - 1, 1, "Mutation must target exactly one current guard");
  return source.replace(before, after);
}
test("Tantra behavioral proof rejects removed consent normalization", async () => {
  const source = changeExactlyOnce(chooser, "normalizePublicServiceEnquiry(payload);", "/* removed by negative control */");
  await assert.rejects(assertTantraHandoff({ source }), /No request without explicit consent/);
});
test("Tantra behavioral proof rejects accepting an unconfirmed save", async () => {
  const source = changeExactlyOnce(chooser, "data.saved !== true", "false");
  await assert.rejects(assertTantraHandoff({ source, receiptFault: "saved-false" }), /Unconfirmed receipt cannot hand off/);
});
test("Tantra behavioral proof rejects a phone leaked into the handoff URL", async () => {
  const source = changeExactlyOnce(chooser, "handoffWindow.location.replace(destination);",
    'handoffWindow.location.replace(destination + "&phone=" + encodeURIComponent(phone));');
  await assert.rejects(assertTantraHandoff({ source }), /Only the neutral acknowledged draft may be handed off/);
});

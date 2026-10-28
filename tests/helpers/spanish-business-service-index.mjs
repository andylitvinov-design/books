import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Follow the actual Spanish page -> studio -> core offers composition. Inert stubs
// exclude unrelated UI/commerce; the real provider defaults, filter and cards run.
async function spanishServiceIndex(read) {
  const fragment = Symbol("fragment");
  const jsx = (type, props) => ({ type, props: props || {} });
  const inert = () => null;
  const stubs = {
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: fragment },
    react: {
      createContext(value) { const context = { value }; context.Provider = { context }; return context; },
      useContext: context => context.value,
      useState: initial => [initial, inert],
    },
    "next/link": { default: props => jsx("a", props) },
    "next/image": { default: inert },
    "next/navigation": { redirect: () => assert.fail("Default Services index must not redirect") },
    "lucide-react": { ArrowRight: inert, ChevronDown: inert, ClipboardCheck: inert, ShieldCheck: inert },
    "@/components/public-site-header": { PublicSiteHeader: inert },
    "@/components/services-conversion-hero": { ServicesConversionHero: inert },
    "@/components/services-studio-extras": { ServicesIntroMedia: inert, ServicesMethodVideos: inert, ServicesDirectoryInvitation: inert },
    "@/components/personal-testimonials": { PersonalTestimonials: inert },
    "@/components/public-consultation-cta": { PublicConsultationCta: inert },
    "@/components/compact-lead-capture": { CompactLeadCapture: inert },
    "@/components/static-portrait": { StaticPortrait: inert },
    "@/components/contact-channel-chooser": { ContactChannelChooser: inert },
    "@/lib/commerce/wise-payments": { wisePaymentsEnabled: () => false },
    "@/lib/commerce/paypal-personal": { personalPayPalEnabled: () => false },
    "@/lib/spanish-metadata": { spanishMetadata: () => ({}) },
    "@/lib/whatsapp-enquiry": { whatsappEnquiryUrl: () => "https://example.invalid/inert-enquiry" },
    "./services-studio-offers.module.css": { default: {} },
  };
  const sources = {
    "@/components/services-studio-offers": "components/services-studio-offers.tsx",
    "@/components/services-explorer-state": "components/services-explorer-state.tsx",
    "@/data/core-service-offers": "data/core-service-offers.ts",
  };
  const cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path);
    const exports = {};
    cache.set(path, exports);
    const compiled = ts.transpileModule(read(path), { fileName: path, compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    } }).outputText;
    runInNewContext(compiled, { exports, require: name => {
      if (Object.hasOwn(stubs, name)) return stubs[name];
      assert.ok(Object.hasOwn(sources, name), "Known static Services dependency: " + name);
      return load(sources[name]);
    } });
    return exports;
  }
  function render(node) {
    if (Array.isArray(node)) return node.map(render);
    if (!node || typeof node !== "object") return node;
    if (node.type === fragment) return render(node.props.children);
    if (node.type?.context) {
      const context = node.type.context;
      const previous = context.value;
      context.value = node.props.value;
      try { return render(node.props.children); } finally { context.value = previous; }
    }
    if (typeof node.type === "function") return render(node.type(node.props));
    return { ...node, props: { ...node.props, children: render(node.props.children) } };
  }
  const page = load("app/es/services/page.tsx");
  return render(await page.default({ searchParams: Promise.resolve({}) }));
}

function descendants(tree, hidden = false) {
  if (Array.isArray(tree)) return tree.flatMap(child => descendants(child, hidden));
  if (!tree || typeof tree !== "object") return [];
  hidden ||= Boolean(tree.props.hidden) || tree.props["aria-hidden"] === true || tree.props["aria-hidden"] === "true";
  return [{ node: tree, hidden }, ...descendants(tree.props.children, hidden)];
}
const textContent = tree => Array.isArray(tree) ? tree.map(textContent).join("")
  : tree && typeof tree === "object" ? textContent(tree.props.children) : String(tree ?? "");

export async function assertSpanishBusinessServiceIndex(read) {
  const index = await spanishServiceIndex(read);
  assert.equal(index.type, "main");
  assert.equal(index.props.lang, "es");
  const paid = descendants(index).filter(({ node }) => node.props["data-services-studio-paid"]);
  assert.equal(paid.length, 1, "The Spanish index mounts the paid service list");
  assert.equal(paid[0].hidden, false, "Paid services remain visible by default");
  const business = descendants(paid[0].node).filter(({ node }) => node.props["data-services-studio-card"] === "business");
  assert.equal(business.length, 1, "One real business offer appears in the paid array");
  assert.equal(business[0].hidden, false, "Business is discoverable under the real default filters");
  const card = business[0].node;
  const title = descendants(card).filter(({ node }) => node.type === "h3");
  assert.equal(title.length, 1);
  assert.equal(title[0].hidden, false, "Title remains visible through its card ancestry");
  const details = descendants(card).filter(({ node }) => node.type === "details");
  assert.equal(details.length, 1, "The card retains native Details disclosure");
  assert.equal(details[0].hidden, false);
  const summary = descendants(details[0].node).filter(({ node }) => node.type === "summary");
  assert.equal(summary.length, 1);
  assert.equal(summary[0].hidden, false, "Details summary remains visible through its ancestry");
  assert.ok((summary[0].node.props.tabIndex ?? 0) >= 0, "Details summary remains keyboard reachable");
  assert.ok(textContent(summary[0].node).trim(), "Details has a usable label");
  for (const container of [title[0].node, details[0].node]) {
    const links = descendants(container).filter(({ node }) => node.type === "a");
    assert.equal(links.length, 1, "Title and Details each retain their service route");
    assert.equal(links[0].hidden, false);
    assert.equal(links[0].node.props.href, "/es/services/business-consulting");
    assert.equal(links[0].node.props.prefetch, false);
    assert.ok((links[0].node.props.tabIndex ?? 0) >= 0, "Service links remain keyboard reachable");
    assert.ok(textContent(links[0].node).trim(), "Service links have visible text");
  }
}

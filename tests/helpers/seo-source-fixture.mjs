import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as receipt from "../../lib/practitioners/enquiry-receipt.mjs";

export const readSeoSource = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const element = (type, props) => ({ type, props: props || {} });
export const leaf = (name) => (props) => element(name, props);
const icons = new Proxy({}, { get: (_, name) => leaf("icon:" + String(name)) });

// Execute only the real module under test in a bounded, offline VM. Imports must
// be explicitly supplied. Leaf UI integrations are opaque, not invented markup;
// these tests cover initial JSX/props and disclosure branches, not browser layout.
export function loadSeoTsx(path, { imports = {}, source = readSeoSource(path), states = [], stateWrites = [], effects = [], globals = {} } = {}) {
  let stateIndex = 0;
  const react = {
    useState: (initial) => {
      const index = stateIndex++;
      return [index < states.length ? states[index] : typeof initial === "function" ? initial() : initial,
        value => stateWrites.push({ index, value })];
    },
    useRef: (current) => ({ current }), useEffect: (effect) => { effects.push(effect); },
    useMemo: (factory) => factory(), useDeferredValue: (value) => value,
    useId: () => "synthetic-seo-id",
  };
  const modules = {
    "react": react,
    "react/jsx-runtime": { jsx: element, jsxs: element, Fragment: "fragment" },
    "next/link": { default: "a" }, "next/image": { default: "img" },
    "lucide-react": icons,
    ...imports,
  };
  const output = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: false,
  }, fileName: path, reportDiagnostics: true });
  assert.equal(output.diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error).length || 0, 0, path);
  const module = { exports: {} };
  new vm.Script(output.outputText, { filename: path }).runInNewContext({
    ...globals,
    exports: module.exports, module,
    require(name) {
      if (name.endsWith(".module.css")) return { default: new Proxy({}, { get: (_, key) => String(key) }) };
      assert.ok(Object.hasOwn(modules, name), "Unexpected SEO fixture dependency: " + name);
      return modules[name];
    },
  }, { timeout: 2000 });
  return module.exports;
}

export function seoNodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(seoNodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...seoNodes(tree.props?.children)];
}
export function seoText(tree) {
  if (Array.isArray(tree)) return tree.map(seoText).join(" ");
  if (tree == null || typeof tree === "boolean") return "";
  if (typeof tree !== "object") return String(tree);
  return seoText(tree.props?.children);
}

export function freeEntryModule(source, { CompactLeadCapture = leaf("CompactLeadCapture") } = {}) {
  return loadSeoTsx("components/free-entry-landing.tsx", { source, imports: {
    "@/components/public-site-header": { PublicSiteHeader: leaf("PublicSiteHeader") },
    "@/components/compact-lead-capture": { CompactLeadCapture },
    "@/components/free-situation-review-form": { FreeSituationReviewForm: leaf("FreeSituationReviewForm") },
    "@/components/service-video-showcase": { ServiceVideoShowcase: leaf("ServiceVideoShowcase") },
    "@/components/personal-testimonials": { PersonalTestimonials: leaf("PersonalTestimonials") },
  } });
}

export function compactLeadModule(locale, options = {}) {
  return loadSeoTsx("components/compact-lead-capture.tsx", { ...options, imports: {
    "next/navigation": { usePathname: () => "/" + locale + "/tests" },
    "@/lib/practitioners/enquiry-receipt.mjs": receipt,
  } });
}

export async function publicTestsRoute(source) {
  // Extract and run the actual shared validator, not a test-created replacement.
  const catalog = readSeoSource("data/academy/catalog.ts");
  const ast = ts.createSourceFile("catalog.ts", catalog, ts.ScriptTarget.Latest, true);
  const validator = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "isPublicLocale");
  assert.ok(validator, "Shared public locale validator exists");
  const { isPublicLocale } = loadSeoTsx("data/academy/catalog.ts", { source: validator.getText(ast) });
  const actualLanding = freeEntryModule();
  const metadata = await import("../../data/site-metadata.js");
  return loadSeoTsx("app/[locale]/tests/page.tsx", { source, imports: {
    "next/navigation": { notFound: () => { throw new Error("NEXT_NOT_FOUND"); } },
    "@/components/free-entry-landing": actualLanding,
    "@/data/academy/catalog": { isPublicLocale },
    "@/data/site-metadata": metadata,
  } });
}

export function homeDisclosureModule(expanded, source) {
  const stateWrites = [];
  const explore = loadSeoTsx("components/home-explore-sections.tsx", { imports: {
    "@/components/acquisition-event-link": { AcquisitionEventLink: leaf("AcquisitionEventLink") },
    "@/components/static-portrait": { StaticPortrait: leaf("StaticPortrait") },
  } });
  const modules = {
    "./home-explore-sections": explore,
    "./services-solutions": { ServicesSolutions: leaf("ServicesSolutions") },
    "./homepage-topic-journeys": { HomepageTopicJourneys: leaf("HomepageTopicJourneys") },
    "./sitewide-antistress-banner": { TestSelectionCourseBanner: leaf("TestSelectionCourseBanner") },
  };
  const result = loadSeoTsx("components/home-more-disclosure.tsx", { source, states: [expanded], stateWrites, imports: {
    ...modules,
    "next/dynamic": { default: (load) => Object.assign(leaf("Dynamic"), { load }) },
  } });
  return { ...result, stateWrites };
}

export async function expandSeoDynamic(tree) {
  if (Array.isArray(tree)) return Promise.all(tree.map(expandSeoDynamic));
  if (!tree || typeof tree !== "object") return tree;
  if (tree.type?.load) {
    const component = await tree.type.load();
    return expandSeoDynamic(component(tree.props));
  }
  return { ...tree, props: { ...tree.props, children: await expandSeoDynamic(tree.props?.children) } };
}

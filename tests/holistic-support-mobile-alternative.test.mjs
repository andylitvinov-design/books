import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { runInNewContext } from "node:vm";
import { recommendSupportContent } from "../lib/holistic-support/recommendation-engine.js";
import { TAOIST_TALISMANS } from "../lib/practitioners/taoist-talismans.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const route = read("app/[locale]/holistic-support/mobile/page.tsx");
const client = read("components/holistic-support-mobile.tsx");
const css = read("components/holistic-support-mobile.module.css");
const chooser = read("components/holistic-support-choices.tsx");
const nav = read("components/mobile-bottom-navigation.tsx");

test("alternate support screen is separate, linked and localized without replacing the original", () => {
  const standard = read("app/[locale]/holistic-support/page.tsx");
  assert.match(standard, /<HolisticSupportChoices locale=\{locale\}/);
  assert.match(standard, /<HolisticMeditationGallery locale=\{locale\}/);
  assert.match(chooser, /data-support-alternative-link/);
  assert.match(chooser, /\/holistic-support\/mobile/);
  for (const locale of ["en", "ru", "es"]) {
    assert.match(route, new RegExp(locale + ': "/' + locale + '/holistic-support/mobile"'));
  }
  assert.match(route, /robots: \{ index: false, follow: true \}/);
  assert.match(nav, /holistic-support\\\/mobile/);
  assert.match(client, /data-support-mobile-bottom-nav/);
});

test("personal scores and photos are local-only and accessible; no fake completion or payment", () => {
  assert.match(client, /type="range" min="1" max="10"/);
  assert.match(client, /aria-valuetext=\{scores\[id\]/);
  assert.match(client, /type="file" accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(client, /URL\.createObjectURL\(file\)/);
  assert.match(client, /URL\.revokeObjectURL\(photoUrl\)/);
  assert.match(client, /8 \* 1024 \* 1024/);
  assert.match(client, /data-support-recommendations/);
  assert.match(client, /focusTopics\[focus\]/);
  assert.match(client, /Videos opened here|Видео открыто здесь|Vídeos abiertos aquí/);
  assert.doesNotMatch(client, /localStorage|sessionStorage|fetch\(|navigator\.sendBeacon|URLSearchParams|paid:\s*true/);
  assert.match(client, /<HolisticInlineSupportOrder/);
  assert.match(client, /<TaoistTalismanCatalog/);
});

test("four real recording cards from published sources, not arbitrary stock samples", () => {
  assert.match(route, /freeMeditationVideos\("ru"\)/);
  assert.match(route, /englishGuidedMeditations/);
  assert.match(route, /youtubeId!/);
  assert.match(read("data/academy/english-guided-meditations.ts"), /key: "kundalini-reiki"/);
  assert.match(client, /\.slice\(0, 4\)/);
  assert.match(client, /data-support-video=\{video\.id\}/);
  assert.match(client, /youtube-nocookie\.com\/embed/);
  assert.match(client, /onClick=\{startVideo\}/);
  assert.match(client, /setPlaying\(false\)/);
  assert.match(client, /allowFullScreen loading="eager"/);
  assert.match(client, /noopener noreferrer/);
  assert.doesNotMatch(client, /<audio|autoplay=\{true\}|hardcodedYoutubeId|youtubeId: "[a-zA-Z0-9_-]{11}"/);
});

test("playback keeps visible selectors and explicit meditation topics filter honestly", () => {
  assert.ok(client.includes('data-playing={playing ? "true" : "false"}'));
  assert.ok(client.includes('theme !== "all"'));
  assert.ok(client.includes('return themed.slice(0, 4)'));
  assert.ok(css.includes('.hero[data-playing="true"] .heroFilters'));
  assert.ok(css.includes('.iframeWrap { position: relative'));
  assert.ok(css.includes('aspect-ratio: 16 / 9'));
});

test("mobile mock structure and large-text 320–430 layout with no duplicate global nav", () => {
  for (const key of ["energy", "money", "relationships", "goals"]) {
    assert.ok(client.includes(key), key);
  }
  for (const label of [
    "Мастер", "Программа", "Тема", "Тест или консультация", "Талисман",
    "Подобрать рекомендации", "Начать медитацию", "Мой прогресс",
  ]) assert.ok(client.includes(label), label);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /@media \(max-width: 350px\)/);
  assert.match(css, /grid-template-columns: repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /font-size: 17px/);
  assert.match(css, /min-height: 43px/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /prefers-reduced-motion/);
});

test("new TSX and route transpile without TypeScript parser diagnostics", () => {
  for (const [name, input] of [["page", route], ["workspace", client]]) {
    const result = ts.transpileModule(input, {
      fileName: name + ".tsx",
      reportDiagnostics: true,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    });
    const errors = (result.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error);
    assert.deepEqual(errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, " ")), []);
  }
});

test("personal recommendations rank verified recordings and existing talismans, with direct detailed-profile entry", () => {
  const model = read("lib/holistic-support/recommendation-engine.js");
  const talismans = read("components/taoist-talisman-catalog.tsx");
  assert.match(client, /recommendSupportContent\(/);
  assert.match(client, /scores: \{ \.\.\.scores \}/);
  assert.match(client, /recommended\.videos\.map\(/);
  assert.match(client, /data-support-personal-recommendations/);
  assert.match(client, /data-support-recommended-video/);
  assert.match(client, /data-support-recommended-talisman/);
  assert.match(client, /data-support-detailed-analysis/);
  assert.match(client, /data-support-recommended-detailed-analysis/);
  assert.match(client, /\/personality-profiles/);
  assert.match(talismans, /featuredId/);
  assert.match(talismans, /data-recommended=/);
  assert.match(model, /TALISMAN_BY_FOCUS/);
  assert.match(model, /YOUTUBE_ID/);
  assert.match(model, /matchingPrimary \? 100 : 0/);
  assert.doesNotMatch(model, /fetch\(|localStorage|sessionStorage|navigator\.sendBeacon|\bdiagnose\(/);
  assert.match(css, /\.recommendationPanel/);
  assert.match(css, /\.detailedAnalysisLink/);
});


test("personal recommendation under focus, four main options, Courses/Masters shortcuts and detailed test links", () => {
  const assessment = client.split('<section className={styles.assessment}')[1].split("</section>")[0];
  const profile = client.split('<section className={styles.profile}')[1].split("</section>")[0];
  const tools = client.split('<section className={styles.tools}')[1].split("</section>")[0];
  assert.match(assessment, /data-support-detailed-analysis/);
  assert.doesNotMatch(assessment, /data-support-recommendations/);
  assert.match(profile, /data-support-recommendations/);
  assert.doesNotMatch(profile, /data-support-detailed-analysis/);
  assert.doesNotMatch(tools, /data-support-detailed-analysis/);
  assert.match(tools, /choices\.filter\(item => item\.id !== "pump"\)/);
  assert.match(tools, /data-support-tool="pump"/);
  assert.match(tools, /className=\{styles\.toolShortcuts\}/);
  assert.match(client, /id: "healing", Icon: HandHeart/);
  assert.match(client, /pump: "Courses", healing: "Energy Healing"/);
  assert.match(client, /pump: "Курсы", healing: "Энергетическая поддержка"/);
  assert.match(client, /pump: "Cursos", healing: "Sanación energética"/);
  assert.match(client, /data-support-courses-panel/);
  assert.match(client, /\/academy\/reiki\/tantra-reiki\/discover/);
  assert.match(client, /data-support-healing-panel/);
  assert.match(client, /\/services\/remote-energy-support/);
  assert.match(client, /\/masters/);
  assert.match(client, /<HolisticInlineSupportOrder/);
  assert.match(css, /grid-template-areas: "assessment profile tools"/);
  assert.match(css, /grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.toolShortcuts \{ display: grid;/);
  assert.match(css, /\.toolMicro \{ display: block;/);
});

test("same-window talisman viewer reuses real images, local basket, and protected quote form in all locales", () => {
  const viewer = read("components/holistic-support-talisman-viewer.tsx");
  const viewerCss = read("components/holistic-support-talisman-viewer.module.css");
  const cart = read("components/taoist-talisman-cart.tsx");
  const cartCss = read("components/taoist-talisman-cart.module.css");
  const source = read("lib/practitioners/taoist-talismans.js");
  const storage = read("lib/practitioners/taoist-talisman-cart.js");
  assert.match(client, /<HolisticSupportTalismanViewer key=\{focus\}/);
  assert.match(client, /<TaoistTalismanCatalog/);
  assert.match(client, /hidden=\{!talismanCatalogOpen\}/);
  assert.match(viewer, /data-support-talisman-viewer/);
  assert.match(viewer, /src=\{selected\.image\}/);
  assert.match(viewer, /onTouchStart=\{touchStart\}/);
  assert.match(viewer, /onTouchEnd=\{touchEnd\}/);
  assert.match(viewer, /Math\.abs\(dx\) > 45/);
  assert.match(viewer, /data-support-talisman-next/);
  assert.match(viewer, /data-support-talisman-thumb=\{item\.id\}/);
  assert.match(viewer, /data-support-talisman-filter="goal"/);
  assert.match(viewer, /saveBrowserTalismanCart/);
  assert.match(viewer, /<dialog ref=\{dialogRef\}/);
  assert.match(viewer, /<TaoistTalismanCart locale=\{locale\} inline/);
  assert.match(cart, /sourcePath: "\/" \+ locale \+ "\/holistic-support"/);
  assert.match(cart, /data-inline=\{inline \? "true"/);
  assert.match(cart, /data\?\.saved !== true \|\| data\?\.contactPending !== false/);
  assert.match(cartCss, /\.shell\[data-inline="true"\]/);
  assert.match(storage, /sessionStorage/);
  assert.match(source, /fu-balance/);
  assert.match(source, /fu-prosperity/);
  assert.match(source, /fu-harmony/);
  assert.match(viewerCss, /scroll-snap-type: x mandatory/);
  assert.match(viewerCss, /@media\(max-width:350px\)/);
  for (const text of ["Request talisman", "Заказать талисман", "Solicitar talismán"]) {
    assert.ok(viewer.includes(text), "localized call to request: " + text);
  }
  assert.doesNotMatch(viewer, /fetch\(|localStorage|sessionStorage|navigator\.sendBeacon|autoplay=1/);
  const parsed = ts.transpileModule(viewer, {
    fileName: "holistic-support-talisman-viewer.tsx", reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  assert.deepEqual((parsed.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error)
    .map(d => ts.flattenDiagnosticMessageText(d.messageText, " ")), []);
});

test("inline Focus is one native radio group beside unchanged four scales, never a second photo selector", () => {
  assert.match(client, /useState<Focus>\("all"\)/);
  assert.match(client, /type="radio" name="support-focus" value="all"/);
  assert.match(client, /type="radio" name="support-focus" value=\{id\}/);
  assert.match(client, /checked=\{focus === "all"\}/);
  assert.match(client, /checked=\{focus === id\}/);
  assert.doesNotMatch(client, /select value=\{focus\}|className=\{styles\.focusSelector\}/);
  assert.match(css, /\.page \.inlineFocus input\[type="radio"\]:checked/);
  assert.match(client, /recommendation\.focus === "all" \? t\.allSummary/);
  for (const label of ["All areas", "Все сферы", "Todas las áreas"]) assert.ok(client.includes(label));
});

// Executes the real transpiled component and its state handlers in a network-free
// element harness. Browser layout, native radio keys and touch remain CI gates.
function focusHarness(source, exportName) {
  const slots = [];
  let cursor = 0;
  const jsx = (type, props, key) => ({ type, props: props || {}, key });
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === "function" ? value(slots[i]) : value; }];
    },
    useRef(value) { return react.useState(() => ({ current: value }))[0]; },
    useMemo: fn => fn(), useEffect() {},
  };
  const code = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exported = {};
  const localRequire = name => {
    if (name === "react") return react;
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "Fragment" };
    if (name === "lucide-react") return new Proxy({}, { get: (_, key) => String(key) });
    if (name === "next/image" || name === "next/link") return { default: name };
    if (name.endsWith(".module.css")) return { default: new Proxy({}, { get: (_, key) => String(key) }) };
    if (name === "@/lib/holistic-support/recommendation-engine") return { recommendSupportContent };
    if (name === "@/lib/practitioners/taoist-talismans") return { TAOIST_TALISMANS };
    if (name === "@/lib/practitioners/taoist-talisman-cart") return {
      readBrowserTalismanCart() { throw new Error("No cart operation in focus tests"); },
      saveBrowserTalismanCart() { throw new Error("No cart operation in focus tests"); },
    };
    if (name.startsWith("@/components/")) return new Proxy({}, { get: (_, key) => String(key) });
    throw new Error("Unexpected module: " + name);
  };
  runInNewContext(code, {
    exports: exported, require: localRequire,
    window: { requestAnimationFrame: fn => { fn(); return 1; }, matchMedia: () => ({ matches: true }) },
    document: { getElementById: () => null },
  }, { timeout: 1000 });
  return props => { cursor = 0; return exported[exportName](props); };
}
function focusNodes(node) {
  if (Array.isArray(node)) return node.flatMap(focusNodes);
  if (!node || typeof node !== "object") return [];
  return [node, ...focusNodes(node.props?.children)];
}
const focusFixture = [
  { id: "aaaaaaaaaaa", title: "Synthetic love", topics: ["love"], sourceLanguage: "en", author: "andrey", program: "sun" },
  { id: "bbbbbbbbbbb", title: "Synthetic energy", topics: ["energy"], sourceLanguage: "en", author: "andrey", program: "sun" },
  { id: "ccccccccccc", title: "Synthetic business", topics: ["business"], sourceLanguage: "en", author: "andrey", program: "sun" },
];

test("real Focus state handlers keep one selected, invalidate old results, and rank All privately", () => {
  for (const locale of ["en", "ru", "es"]) {
    const render = focusHarness(client, "HolisticSupportMobile");
    const nodes = () => focusNodes(render({ locale, videos: focusFixture }));
    const radios = () => nodes().filter(n => n.type === "input" && n.props.name === "support-focus");
    const setFocus = value => radios().find(n => n.props.value === value).props.onChange();
    assert.equal(radios().length, 5);
    const initialIds = nodes().filter(n => "data-support-video" in n.props).map(n => n.props["data-support-video"]);
    assert.deepEqual(initialIds, focusFixture.map(video => video.id), "All does not duplicate a short source library");
    assert.deepEqual(radios().filter(n => n.props.checked).map(n => n.props.value), ["all"]);
    for (const value of ["energy", "money", "relationships", "goals", "all"]) {
      setFocus(value);
      assert.deepEqual(radios().filter(n => n.props.checked).map(n => n.props.value), [value]);
      assert.equal(nodes().filter(n => "data-support-personal-recommendations" in n.props).length, 0);
    }
    const relationship = nodes().find(n => n.props["data-support-scale"] === "relationships");
    focusNodes(relationship).find(n => n.props.type === "range").props.onChange({ target: { value: "1" } });
    nodes().find(n => "data-support-recommendations" in n.props).props.onClick();
    assert.equal(nodes().find(n => "data-support-recommended-video" in n.props).props["data-support-recommended-video"], "aaaaaaaaaaa");
    assert.equal(nodes().find(n => "data-support-recommended-talisman" in n.props).props["data-support-recommended-talisman"], "fu-harmony");
    assert.equal(nodes().filter(n => n.type === "iframe").length, 0);
    setFocus("energy");
    assert.equal(nodes().filter(n => "data-support-personal-recommendations" in n.props).length, 0);
    nodes().find(n => "data-support-recommendations" in n.props).props.onClick();
    assert.equal(nodes().find(n => "data-support-recommended-talisman" in n.props).props["data-support-recommended-talisman"], "fu-balance");
    const energy = nodes().find(n => n.props["data-support-scale"] === "energy");
    focusNodes(energy).find(n => n.props.type === "range").props.onChange({ target: { value: "9" } });
    assert.equal(nodes().filter(n => "data-support-personal-recommendations" in n.props).length, 0);
  }
});

test("existing talisman viewer honors All ranking, preserves explicit goals and never submits on focus", () => {
  const viewer = read("components/holistic-support-talisman-viewer.tsx");
  for (const locale of ["en", "ru", "es"]) {
    const render = focusHarness(viewer, "HolisticSupportTalismanViewer");
    const nodes = () => focusNodes(render({ locale, focus: "all", rankedIds: ["fu-harmony", "fu-prosperity", "fu-balance"], catalogOpen: false, onToggleCatalog() {} }));
    assert.equal(nodes().find(n => "data-support-talisman" in n.props).props["data-support-talisman"], "fu-harmony");
    assert.equal(nodes().find(n => n.type === "select").props.value, "all");
    nodes().find(n => n.type === "select").props.onChange({ target: { value: "energy" } });
    assert.equal(nodes().find(n => "data-support-talisman" in n.props).props["data-support-talisman"], "fu-balance");
    nodes().find(n => "data-support-talisman-next" in n.props).props.onClick();
    assert.notEqual(nodes().find(n => "data-support-talisman" in n.props).props["data-support-talisman"], "fu-balance");
  }
});


test("native browser acceptance retains canonical geometry and exercises exclusive All and keyboard", () => {
  const mock = read("scripts/verify-holistic-support-mock-fidelity.mjs");
  const browser = read("scripts/verify-holistic-support-recommendations-mobile.mjs");
  assert.match(mock, /geometry\.hero\[0\]\.y-geometry\.a\[0\]\.y<285/);
  assert.match(mock, /geometry\.readableScores\.every\(t=>t\.fits\)/);
  assert.match(mock, /focusControls\.length, 5/);
  assert.match(browser, /native radio keyboard selects one domain/);
  assert.match(browser, /All prioritizes lower relationship rating/);
  assert.match(browser, /broad ranking reaches existing viewer/);
  assert.match(browser, /recommendations\.waitFor\(\{ state: "hidden" \}\)/);
  assert.doesNotMatch(mock, /select\[aria-label\].*selectOption/);
  assert.doesNotMatch(browser, /const focus = root\.locator\("select"\)/);
});


test("actual relevant-video memo passes strict TypeScript narrowing for nullable All topic", () => {
  const start = client.indexOf("  const relevantVideos = useMemo(() => {");
  const endMarker = "  }, [videos, master, program, theme, focus, choice, recommended]);";
  const end = client.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start);
  const actualMemo = client.slice(start, end + endMarker.length);
  const source = `
    export {};
    type Topic = "business" | "love" | "energy" | "health";
    type Focus = "all" | "energy" | "money" | "relationships" | "goals";
    declare const videos: {id: string; author: string; program: string; topics: Topic[]}[];
    declare const master: string, program: string, choice: string;
    declare const theme: Topic | "all", focus: Focus;
    declare const focusTopics: Record<Exclude<Focus, "all">, Topic>;
    declare const recommended: {videos: {id: string}[]} | null;
    declare function useMemo<T>(fn: () => T, deps: unknown[]): T;
    ${actualMemo}
  `;
  const filename = "/__focus_relevance_semantics__.ts";
  const options = { strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022 };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, ...args) => name === filename
    ? ts.createSourceFile(name, source, ts.ScriptTarget.ES2022, true) : getSourceFile(name, ...args);
  const program = ts.createProgram([filename], options, host);
  const errors = ts.getPreEmitDiagnostics(program).filter(d => d.category === ts.DiagnosticCategory.Error && d.file?.fileName === filename);
  assert.deepEqual(errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, " ")), []);
});

test('Focus hit areas use 44px desktop labels and honest 24px compact native controls, not overflow extensions',()=>{
  const focusCss=css.slice(css.indexOf('/* Exclusive Focus belongs'));
  const compact=focusCss.split('@media (max-width: 640px) {')[1].split('@media (max-width: 350px) {')[0];
  const small=focusCss.split('@media (max-width: 350px) {')[1];
  const declaration=(part,selector)=>{
    const start=part.indexOf(selector+' {');assert.ok(start>=0,selector);
    return part.slice(start+selector.length+2,part.indexOf('}',start));
  };
  const size=(rules,property)=>Number(rules.match(new RegExp('(?:^|;|\\s)'+property+':\\s*(\\d+)px'))?.[1]);
  const label=declaration(compact,'.inlineFocus');
  for(const dimension of ['width','height','min-width'])assert.ok(size(label,dimension)>=24,dimension);
  const input=declaration(compact,'.page .allFocus input[type="radio"], .page .inlineFocus input[type="radio"]');
  for(const dimension of ['width','height'])assert.ok(size(input,dimension)>=24,dimension);
  const row=declaration(compact,'.scaleRow');
  assert.match(row,/grid-template-columns: 24px minmax\(0,1fr\) 23px/);
  assert.match(row,/grid-template-rows: 15px 24px/);
  assert.ok(size(row,'column-gap')>=4);
  assert.ok(size(row,'min-height')>=39);
  assert.match(declaration(compact,'.scaleList'),/row-gap: 0;/);
  assert.match(declaration(small,'.scaleRow'),/grid-template-columns: 24px minmax\(0,1fr\) 20px/);
  assert.ok(size(declaration(compact,'.allFocus'),'min-height')>=24);
  const desktop=focusCss.split('@media')[0];
  assert.ok(size(declaration(desktop,'.allFocus'),'min-height')>=44);
  assert.doesNotMatch(declaration(desktop,'.focusHeader .subText'),/font-size|line-height|overflow/);
  assert.match(declaration(desktop,'.inlineFocus'),/flex: 0 0 44px; height: 44px/);
  assert.doesNotMatch(focusCss,/position: absolute(?!; width: 1px)|inset: -|margin: -[2-9]|max-width: 21px/);
  const header=client.split('<div className={styles.focusHeader} data-support-focus-header>')[1].split('</div>')[0];
  assert.ok(header.includes('{t.scoreGuide}')&&header.includes('data-focus-option="all"'));
  assert.ok(header.includes('data-support-focus-all-caption>{t.focusAllShort}'));
  assert.ok(header.includes('aria-label={t.focusLabelShort + ": " + t.foci.all}'));
  for(const short of ['All','Все','Todas'])assert.ok(client.includes('focusAllShort: "'+short+'"'));
});

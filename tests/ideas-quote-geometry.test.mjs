import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { measureIdeasOrderedLayout, ideasQuoteGeometryProblems } from "../scripts/helpers/ideas-quote-geometry.mjs";

// Exercise the actual serialized browser reader, not a copied implementation.
// These are disposable numeric DOM doubles: no browser/network/provider launch.
function fixture(locale = "es", width = 375, stage = "preview") {
  const compact = width <= 360, secret = "DO_NOT_READ_QUOTE_QUESTION_OR_URL", scrollY = 137;
  const nodes = {}, all = [];
  function node(name, selectors = []) {
    const n = { name, selectors: new Set(selectors), children: [], parentElement: null,
      css: { paddingLeft: "0px", paddingRight: "0px", borderLeftWidth: "0px", borderRightWidth: "0px",
        marginLeft: "0px", marginRight: "0px", transform: "none", display: "block" },
      rect: { left: 0, right: 1, width: 1, top: 400, bottom: 500, height: 100 }, clientWidth: 1, scrollWidth: 1,
      matches(selector) { return this.selectors.has(selector); },
      getBoundingClientRect() { return { ...this.rect, top: this.rect.top - scrollY, bottom: this.rect.bottom - scrollY }; },
      getClientRects() { return [this.getBoundingClientRect()]; },
      querySelector(selector) {
        if (selector === "[data-ideas-aphorisms]") return this.sectionOverride || nodes.section;
        if (selector === ":scope > ol") return this.listOverride || nodes.list;
        if (selector === "MIDDLE") return nodes.middle;
        if (selector === "AFTER") return nodes.after;
        throw Error("unexpected selector");
      },
      querySelectorAll(selector) {
        if (selector === "[data-ideas-aphorisms]") return [this.sectionOverride || nodes.section];
        if (selector === "div,p,a,span") return this.text || [];
        throw Error("unexpected selector");
      },
    };
    for (const key of ["textContent", "innerText", "outerHTML", "value", "href"]) Object.defineProperty(n, key, { get() { throw Error(secret); } });
    for (const key of ["click", "focus", "scrollIntoView", "setAttribute", "dispatchEvent", "appendChild", "getAttribute"]) n[key] = () => { throw Error("reader must not act or read attributes"); };
    nodes[name] = n; all.push(n); return n;
  }
  function horizontal(n, left, width, padding = 0, border = 0, margin = 0) {
    Object.assign(n.rect, { left, width, right: left + width });
    for (const side of ["Left", "Right"]) Object.assign(n.css, { ["padding" + side]: padding + "px", ["border" + side + "Width"]: border + "px", ["margin" + side]: margin + "px" });
    n.clientWidth = Math.round(width - 2 * border); n.scrollWidth = n.clientWidth;
  }
  const inset = n => parseFloat(n.css.paddingLeft) + parseFloat(n.css.borderLeftWidth);
  function child(parent, child, padding = 0, border = 0, margin = 0) {
    child.parentElement = parent; parent.children.push(child);
    horizontal(child, parent.rect.left + inset(parent) + margin, parent.rect.width - 2 * inset(parent) - 2 * margin, padding, border, margin);
  }
  function reflow(parent) {
    if (parent.lines) parent.lines = [{ left: parent.rect.left, right: parent.rect.right - 4 }];
    for (const n of parent.children) {
      const margin = parseFloat(n.css.marginLeft);
      horizontal(n, parent.rect.left + inset(parent) + margin, parent.rect.width - 2 * inset(parent) - 2 * margin,
        parseFloat(n.css.paddingLeft), parseFloat(n.css.borderLeftWidth), margin);
      reflow(n);
    }
  }
  const shell = node("shell", [locale === "es" ? "main.homeopathy-shell.remedies-landing" : "main.catalog-shell"]);
  horizontal(shell, 0, width, locale === "es" ? 20 : 10);
  child(shell, node("ideas", ["[data-ideas-discovery]"]), compact ? 5 : 7, 1);
  child(nodes.ideas, node("hub", ["[data-tests-coaching-hub]"]));
  child(nodes.hub, node("detail", ["#tests-coaching-detail"]), 14, 1);
  child(nodes.detail, node("temple", ["[data-tests-coaching-temple]"]));
  child(nodes.temple, node("result", [stage === "preview" ? "[data-ideas-preview]" : '[data-ideas-result="dao"]']), compact ? 2 : 7, 1, compact ? -6 : 0);
  child(nodes.result, node("section", ["[data-ideas-aphorisms]"]), compact ? 4 : 6, 1);
  child(nodes.section, node("list"));
  for (let i = 0; i < 3; i++) {
    const row = node("row" + i, ["li[data-ideas-aphorism-id]"]);
    child(nodes.list, row, compact ? 9 : 10, 1);
    Object.assign(row.rect, { top: 500 + i * 110, bottom: 600 + i * 110, height: 100 });
    row.text = ["body", "paragraph", "source"].map(name => {
      const t = node(name + i); child(row, t);
      Object.assign(t.rect, { top: row.rect.top + 15, bottom: row.rect.top + 35, height: 20 });
      t.lines = [{ left: t.rect.left, right: t.rect.right - 4 }];
      return t;
    });
  }
  for (const [name, top] of [["middle", 850], ["after", 1070]]) {
    const n = node(name); child(nodes.result, n); Object.assign(n.rect, { top, bottom: top + 200, height: 200 });
  }
  const context = { root: nodes.result, names: { middle: "MIDDLE", after: "AFTER" }, window: { scrollY, innerWidth: width },
    getComputedStyle: n => n.css, document: { createRange() { return { selectNodeContents(n) { this.n = n; }, getClientRects() { return this.n.lines; } }; } } };
  const read = () => JSON.parse(JSON.stringify(vm.runInNewContext("(" + measureIdeasOrderedLayout.toString() + ")(root, names)", context)));
  return { nodes, read, horizontal, child, reflow, secret, case: { locale, width } };
}

const expected = { en: [254, 279, 294, 334], ru: [254, 279, 294, 334], es: [234, 259, 274, 314] };
for (const locale of ["en", "ru", "es"]) for (const [i, width] of [320, 375, 390, 430].entries()) for (const stage of ["preview", "result"]) {
  test(`${locale}/${width}/${stage}: fills the independent shell/card hierarchy`, () => {
    const f = fixture(locale, width, stage), snapshot = f.read();
    assert.equal(snapshot.rows[0].width, expected[locale][i]);
    assert.equal(snapshot.rows[0].top, 500, "document coordinates are measured in the same task");
    assert.deepEqual(ideasQuoteGeometryProblems(snapshot, f.case), []);
    assert.equal(snapshot.quotes.stage, stage);
  });
}

test("observed ES375 is not an unconditional 259px floor", () => {
  const f = fixture(), snapshot = f.read();
  assert.deepEqual(snapshot.rows.map(({ left, width }) => ({ left, width })), Array(3).fill({ left: 58, width: 259 }));
  snapshot.quotes.layers.list.right -= 20;
  snapshot.quotes.layers.list.width -= 20;
  assert.ok(ideasQuoteGeometryProblems(snapshot, f.case).includes("list-content-width"));
});

function rejects(name, mutate, reason) {
  test(name, () => { const f = fixture(); mutate(f); assert.ok(ideasQuoteGeometryProblems(f.read(), f.case).includes(reason), reason); });
}
rejects("a genuinely shrunk row is rejected", f => {
  const n = f.nodes.row1; f.horizontal(n, n.rect.left, n.rect.width * .8, 10, 1); f.reflow(n);
}, "row-content-width");
rejects("three narrower rows cannot make their own denominator", f => {
  for (let i = 0; i < 3; i++) { const n = f.nodes["row" + i]; f.horizontal(n, n.rect.left, n.rect.width * .8, 10, 1); f.reflow(n); }
}, "row-content-width");
rejects("shrunk list with fully filling rows still fails", f => {
  const l = f.nodes.list; f.horizontal(l, l.rect.left, l.rect.width * .8);
  f.reflow(l);
}, "list-content-width");
rejects("shrunk aphorism wrapper is independently bounded", f => {
  const s = f.nodes.section; f.horizontal(s, s.rect.left, s.rect.width - 20, 6, 1); f.reflow(s);
}, "section-content-width");
rejects("larger wrapper padding with internally full-width rows fails its budget", f => {
  const s = f.nodes.section; f.horizontal(s, s.rect.left, s.rect.width, 20, 1);
  f.reflow(s);
  assert.deepEqual(ideasQuoteGeometryProblems(f.read(), f.case), ["section-inset-budget"], "only the independent padding budget detects this fully filling subtree");
}, "section-inset-budget");
rejects("increased outer page gutter cannot redefine readable width", f => {
  const s = f.nodes.shell; f.horizontal(s, 0, 375, 30); f.reflow(s);
}, "shell-inset-budget");
rejects("narrowed page shell fails even if all descendants shrink", f => {
  f.horizontal(f.nodes.shell, 10, 355, 20); f.reflow(f.nodes.shell);
}, "shell-width");
rejects("horizontal list overflow fails even when boxes line up", f => { f.nodes.list.scrollWidth += 15; }, "list-overflow");
rejects("horizontal row overflow fails even when boxes line up", f => { f.nodes.row0.scrollWidth += 15; }, "row-overflow");
rejects("inner source overflow is not hidden by correct quote width", f => { f.nodes.source0.scrollWidth += 15; }, "text-overflow");
rejects("inline text line overflow is caught without block scroll metrics", f => {
  const n = f.nodes.source0; n.css.display = "inline"; n.clientWidth = 0; n.scrollWidth = 0; n.lines[0].right += 50;
}, "text-line-overflow");
rejects("translated quote cannot pass through matching nominal width", f => { f.nodes.row0.css.transform = "matrix(1,0,0,1,20,0)"; }, "row-content-width");
rejects("shifted quote fails edge alignment", f => {
  const n = f.nodes.row0; f.horizontal(n, n.rect.left + 4, n.rect.width, 10, 1);
}, "row-content-width");
rejects("a three-column rail is not three stacked full-width rows", f => {
  for (let i = 0; i < 3; i++) { const n = f.nodes["row" + i]; f.horizontal(n, 58 + i * 90, 85, 10, 1); n.rect.top = 500; n.rect.bottom = 600; }
}, "vertical-order");
rejects("overlapping rows fail even if tops remain ordered", f => { f.nodes.row0.rect.bottom = 620; f.nodes.row0.rect.height = 120; }, "vertical-order");
rejects("Dao overlapping the third quote fails", f => { f.nodes.middle.rect.top = 800; f.nodes.middle.rect.height = 250; }, "vertical-order");
rejects("missing row fails", f => { f.nodes.list.children.pop(); }, "three-rows");
rejects("a same-width wrong parent is rejected by the actual DOM reader", f => { f.nodes.temple.selectors.clear(); }, "wrong-container");
rejects("quote-as-container cannot pass by sharing a width", f => { f.nodes.result.sectionOverride = f.nodes.row0; }, "wrong-container");
rejects("wrong shell type fails independently of identical geometry", f => { f.nodes.shell.selectors = new Set(["main.catalog-shell"]); }, "wrong-container");
rejects("missing finite padding is fail-closed", f => { f.nodes.section.css.paddingLeft = "not-a-number"; }, "missing-layer-geometry");

test("reader persists only finite numbers, booleans and fixed categories, and never reads content", () => {
  const f = fixture(), snapshot = f.read(), allowed = new Set(["preview", "result", "catalog", "spanish", "other"]);
  function inspect(value) {
    if (typeof value === "number") assert.ok(Number.isFinite(value));
    else if (typeof value === "string") assert.ok(allowed.has(value));
    else if (Array.isArray(value)) value.forEach(inspect);
    else if (value && typeof value === "object") Object.values(value).forEach(inspect);
    else assert.equal(typeof value, "boolean");
  }
  inspect(snapshot); assert.ok(!JSON.stringify(snapshot).includes(f.secret));
});

test("verifier retains full locale/width matrix, native touch, privacy and timeout gates", async () => {
  const source = await readFile(new URL("../scripts/verify-ideas-mobile-browser.mjs", import.meta.url), "utf8");
  assert.match(source, /const widths = \[320, 375, 390, 430\]/);
  assert.match(source, /for \(const locale of \["en", "ru", "es"\]\)/);
  assert.match(source, /for \(const width of widths\) await verify\(webkit, locale, width\)/);
  assert.match(source, /await verify\(chromium, locale, 390\)/);
  assert.match(source, /await testAction\.tap\(\)/);
  assert.match(source, /timeout: 12000/);
  assert.match(source, /never leak the private phrase through the address/);
  assert.match(source, /never duplicate requests/);
  assert.match(source, /no horizontal overflow with offers/);
  assert.match(source, /quote fills its intended content width/);
  assert.match(source, /aphorism-preview-geometry-/);
  assert.match(source, /aphorism-result-geometry-/);
  assert.doesNotMatch(source, /width \* \.72|force: true|\.dispatchEvent\(/);
});

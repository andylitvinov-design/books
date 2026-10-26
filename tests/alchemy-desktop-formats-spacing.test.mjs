import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import postcss from "postcss";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const source = read("components/alchemy-soul-landing.module.css");
const compact = value => value.replace(/\s+/g, "");

// Source/cascade contract only. It never computes or substitutes an estimated
// panel height for actual Chromium/WebKit geometry and portrait screenshots.
function desktopContract(css) {
  const root = postcss.parse(css);
  const media = root.nodes.filter(node => node.type !== "comment").at(-1);
  assert.equal(media?.type, "atrule", "The desktop override is a final top-level media rule");
  assert.equal(media.name, "media");
  assert.equal(compact(media.params), "(min-width:1024px)", "Only desktop widths opt in; no locale/height exemption");
  const rules = media.nodes.filter(node => node.type !== "comment");
  const expected = [
    [".panel.optionsSection", [
      ["display", "grid"], ["grid-template-columns", "minmax(220px,26%)minmax(0,1fr)"],
      ["column-gap", "24px"], ["row-gap", "0"], ["padding-block", "20px"], ["align-items", "start"],
    ]],
    [".optionsSection>.panelPhoto", [
      ["grid-column", "1"], ["grid-row", "1/span2"], ["height", "auto"], ["align-self", "stretch"],
    ]],
    [".optionsSection>.sectionHeading", [["grid-column", "2"], ["grid-row", "1"], ["min-width", "0"]]],
    [".optionsSection>:global([data-alchemy-booking-formats])", [["grid-column", "2"], ["grid-row", "2"], ["min-width", "0"]]],
  ];
  assert.equal(rules.length, expected.length, "Only the desktop formats panel and its existing three direct children change");
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i]; assert.equal(rule.type, "rule");
    assert.equal(compact(rule.selector), expected[i][0], "No shared/mobile/reviews/form selector");
    const declarations = rule.nodes.filter(node => node.type !== "comment");
    assert.deepEqual(declarations.map(node => {
      assert.equal(node.type, "decl");
      assert.equal(Boolean(node.important), false, "No !important cascade bypass");
      return [node.prop, compact(node.value)];
    }), expected[i][1], "No clipping, fixed panel height, typography, content or control changes");
  }
  return { root, media, rules, minimumWidth: Number(media.params.match(/\d+/)[0]) };
}

function parseTsx(path) {
  const ast = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(ast.parseDiagnostics.length, 0); return ast;
}
const opening = node => ts.isJsxElement(node) ? node.openingElement : node;
const attribute = (node, name) => opening(node).attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText() === name);

// Check actual source children rather than inventing a wrapper the live DOM lacks.
function assertExistingGridTargets() {
  const ast = parseTsx("components/alchemy-soul-landing.tsx"), matches = [];
  const visit = node => {
    if (ts.isJsxElement(node) && attribute(node, "data-alchemy-panel")?.initializer?.text === "formats") matches.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.equal(matches.length, 1);
  const children = matches[0].children.filter(node => ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node));
  assert.deepEqual(children.map(node => opening(node).tagName.getText(ast)), ["div", "header", "AlchemySoulFormatSelector"]);
  assert.equal(attribute(children[0], "className").initializer.expression.getText(ast), "styles.panelPhoto");
  assert.equal(attribute(children[1], "className").initializer.expression.getText(ast), "styles.sectionHeading");
  const selectorAst = parseTsx("components/alchemy-soul-lead-form.tsx");
  const selector = selectorAst.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "AlchemySoulFormatSelector");
  const returned = selector.body.statements.find(ts.isReturnStatement).expression;
  const element = ts.isParenthesizedExpression(returned) ? returned.expression : returned;
  assert.ok(ts.isJsxElement(element)); assert.equal(element.openingElement.tagName.getText(selectorAst), "div");
  assert.ok(attribute(element, "data-alchemy-booking-formats"), "Existing public selector root is the second-column flow container");
}

test("Parsed desktop formats contract uses only four scoped natural-flow grid rules", () => desktopContract(source));

test("Actual TSX has the photo, heading and public format-selector targets used by the grid", () => {
  desktopContract(source); assertExistingGridTargets();
});

test("Desktop width-only media rule leaves phones/tablets and their full-width reviews unchanged", () => {
  const { minimumWidth } = desktopContract(source);
  for (const width of [320, 350, 375, 390, 430, 680, 681, 850, 1023]) assert.equal(width >= minimumWidth, false);
  for (const width of [1024, 1188, 1280, 1440]) assert.equal(width >= minimumWidth, true);
});

test("Appended equal-specificity grid wins over photo-led flex while photo and content grow naturally", () => {
  const { root, media, rules } = desktopContract(source);
  const photoLed = root.nodes.find(node => node.type === "rule" && compact(node.selector) === ".panel:has(>.panelPhoto)");
  assert.ok(photoLed, "Actual existing photo-led flex rule");
  assert.equal(photoLed.nodes.find(node => node.prop === "display").value, "flex");
  assert.ok(root.nodes.indexOf(photoLed) < root.nodes.indexOf(media));
  // .panel.optionsSection and .panel:has(>.panelPhoto) each have two class
  // specificity components; the appended grid wins without !important.
  assert.equal(compact(rules[0].selector), ".panel.optionsSection");
  const photo = new Map(rules[1].nodes.map(node => [node.prop, node.value]));
  assert.equal(photo.get("height"), "auto"); assert.equal(photo.get("align-self"), "stretch");
  assert.equal(compact(photo.get("grid-row")), "1/span2");
  for (const rule of rules) for (const declaration of rule.nodes)
    assert.ok(!["max-height", "overflow", "overflow-y", "transform", "font-size", "line-height", "position"].includes(declaration.prop));
});

test("Parsed source rejects meaningful grid, breakpoint, clipping and portrait-strip mutations", () => {
  desktopContract(source);
  const value = (media, ruleIndex, property, next) => {
    const declaration = media.nodes[ruleIndex].nodes.find(node => node.prop === property);
    assert.ok(declaration, "Exact mutation target"); declaration.value = next;
  };
  const mutations = [
    ["shared panel", media => { media.nodes[0].selector = ".panel"; }],
    ["loses specificity", media => { media.nodes[0].selector = ".optionsSection"; }],
    ["shared photo", media => { media.nodes[1].selector = ".panelPhoto"; }],
    ["reviews spill", media => { media.nodes[0].selector += ", .reviewSection"; }],
    ["wrong selector root", media => { media.nodes[3].selector = ".optionsSection > div"; }],
    ["mobile breakpoint", media => { media.params = "(min-width: 680px)"; }],
    ["inverted breakpoint", media => { media.params = "(max-width: 1024px)"; }],
    ["height exemption", media => { media.params += " and (min-height: 844px)"; }],
    ["restored flex", media => value(media, 0, "display", "flex")],
    ["wrong columns", media => value(media, 0, "grid-template-columns", "1fr")],
    ["horizontal padding", media => { media.nodes[0].nodes.find(node => node.prop === "padding-block").prop = "padding-inline"; }],
    ["wrong padding", media => value(media, 0, "padding-block", "44px")],
    ["portrait strip", media => value(media, 1, "height", "56px")],
    ["old clamp strip", media => value(media, 1, "height", "clamp(56px, calc(100svh - 720px), 128px)")],
    ["photo no longer spans stack", media => value(media, 1, "grid-row", "1")],
    ["photo no longer stretches", media => value(media, 1, "align-self", "start")],
    ["heading wrong column", media => value(media, 2, "grid-column", "1")],
    ["selector wrong column", media => value(media, 3, "grid-column", "1")],
    ["clipping", media => { media.nodes[0].append({ prop: "overflow", value: "hidden" }); }],
    ["fixed panel", media => { media.nodes[0].append({ prop: "height", value: "688px" }); }],
    ["smaller controls", media => { media.nodes[3].append({ prop: "font-size", value: "10px" }); }],
    ["important", media => { media.nodes[0].nodes[0].important = true; }],
  ];
  for (const [name, mutate] of mutations) {
    const { root, media } = desktopContract(source); mutate(media);
    assert.throws(() => desktopContract(root.toString()), { code: "ERR_ASSERTION" }, name);
  }
});

import assert from "node:assert/strict";
import postcss from "postcss";

// WCAG 2.2 1.4.3: these 11–13px labels are normal text even at weight 750.
// Check the entire declared gradient conservatively, not an assumed glyph position.
// This source contract is not a replacement for native-browser geometry/contrast checks.
const rgb = hex => {
  assert.match(hex, /^#[0-9a-f]{6}$/i, "CTA gradient uses opaque sRGB colors");
  return [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
};
const linear = value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
const luminance = channels => channels.reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
const multiply = (matrix, vector) => matrix.map(row => row.reduce((sum, value, index) => sum + value * vector[index], 0));
const toLms = channels => multiply([
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005],
], channels.map(linear)).map(Math.cbrt);
const fromLms = channels => multiply([
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.7076147010],
], channels.map(value => value ** 3));
function whiteGradientContrast(start, end) {
  const a = rgb(start), b = rgb(end), lmsA = toLms(a), lmsB = toLms(b);
  // Include exact endpoints and 1,001 samples in both legacy sRGB and Oklab.
  // Linear interpolation in LMS cube roots is equivalent to Oklab interpolation.
  let maximumLuminance = Math.max(luminance(a.map(linear)), luminance(b.map(linear)));
  for (let step = 1; step < 1000; step++) {
    const t = step / 1000;
    const srgb = a.map((value, index) => value + (b[index] - value) * t).map(linear);
    const oklab = fromLms(lmsA.map((value, index) => value + (lmsB[index] - value) * t));
    assert.ok(oklab.every(value => value >= 0 && value <= 1), "CTA gradient stays within sRGB gamut");
    maximumLuminance = Math.max(maximumLuminance, luminance(srgb), luminance(oklab));
  }
  return 1.05 / (maximumLuminance + 0.05);
}
export function assertReadableHomeOfferCta(css) {
  const ast = postcss.parse(css);
  const rules = selector => ast.nodes.filter(node => node.type === "rule" && node.selector === selector);
  const unique = selector => {
    const found = rules(selector);
    assert.equal(found.length, 1, "Exactly one base rule for " + selector);
    return found[0];
  };
  const primary = unique(".offerPrimary"), hover = unique(".offerPrimary:hover");
  const value = (rule, prop) => {
    const found = rule.nodes.filter(node => node.type === "decl" && node.prop === prop);
    assert.equal(found.length, 1, rule.selector + " must declare one " + prop);
    assert.equal(Boolean(found[0].important), false, "No important CTA override");
    return found[0].value;
  };
  assert.equal(value(primary, "color").toLowerCase(), "#fff", "Keep explicit opaque white CTA labels");
  for (const rule of [primary, hover]) {
    const match = value(rule, "background").match(/^linear-gradient\(108deg, (#[\da-f]{6}) 0%, (#[\da-f]{6}) 100%\)$/i);
    assert.ok(match, "Keep the current two-stop CTA gradient, without overlays or transparent stops");
    const ratio = whiteGradientContrast(match[1], match[2]);
    assert.ok(ratio >= 4.5, rule.selector + " white text contrast " + ratio + ":1 must be at least 4.5:1 without rounding");
  }
  // Do not let a later state/media/descendant override evade the checked colors.
  ast.walkRules(rule => {
    if (!rule.selector.includes(".offerPrimary")) return;
    for (const declaration of rule.nodes.filter(node => node.type === "decl")) {
      if (["background", "background-image", "background-color", "color", "opacity", "filter", "mix-blend-mode"].includes(declaration.prop)) {
        assert.ok((rule === primary && ["background", "color"].includes(declaration.prop)) ||
          (rule === hover && declaration.prop === "background"), "Unexpected CTA contrast override");
      }
    }
  });
  const common = unique(".offerPrimary, .offerSecondary");
  assert.equal(value(common, "font"), "750 13px/1.25 Arial, Helvetica, sans-serif");
  assert.equal(value(common, "min-height"), "44px", "Keep the 44px action target");
  const focus = unique(".root :is(a, button, summary):focus-visible");
  assert.equal(value(focus, "outline"), "3px solid #a37d58", "Keep the visible keyboard focus ring");
  assert.equal(value(focus, "outline-offset"), "3px");
}

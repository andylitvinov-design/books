import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...parts) => readFileSync(path.join(root, ...parts), "utf8");

test("public consultation CTA uses compact buttons and clean external-link icons", () => {
  const component = read("components", "public-consultation-cta.tsx");
  const styles = read("app", "globals.css");

  assert.match(component, /ArrowUpRight/);
  assert.doesNotMatch(component, />↗</);
  assert.match(styles, /\.public-consultation-cta\s*\{[^}]*border-radius:\s*20px/);
  assert.match(styles, /\.public-consultation-cta__actions a\s*\{[^}]*min-height:\s*42px/);
  assert.match(styles, /\.public-consultation-cta__actions a svg\s*\{[^}]*width:\s*15px/);
  assert.match(styles, /@media \(max-width: 520px\)[\s\S]*?\.public-consultation-cta__actions a\s*\{[^}]*min-height:\s*40px/);
});

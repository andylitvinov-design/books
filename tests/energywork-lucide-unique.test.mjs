import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Reiki learner imports each lucide icon once, including Heart", () => {
  const source = readFileSync(new URL("../components/energywork-ai-learner.tsx", import.meta.url), "utf8");
  const match = source.match(/import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/);
  assert.ok(match, "Reiki icon import should exist");
  const names = match[1].split(",").map(value => value.trim()).filter(Boolean);
  assert.ok(names.includes("Heart"), "the existing heart UI still needs its icon");
  assert.equal(names.filter(name => name === "Heart").length, 1);
  assert.equal(new Set(names).size, names.length, "duplicate imports must not break the public build");
});

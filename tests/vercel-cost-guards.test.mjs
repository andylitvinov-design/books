import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { maySkipBuild, changedFilesBetween } from "../scripts/vercel-ignore-build.mjs";

test("ignore only internal documentation, README, and CI workflow edits", () => {
  assert.equal(maySkipBuild(["docs/myspace/opora/notes.md", "README.md"]), true);
  assert.equal(maySkipBuild([".github/workflows/hh-public-performance-audit.yml"]), true);
  assert.equal(maySkipBuild([]), false);
  assert.equal(maySkipBuild(null), false);
  for (const file of [
    "app/[locale]/services/page.tsx", "components/site-video-player.tsx",
    "data/personal-service-pages.ts", "public/images/portrait.webp",
    "next.config.ts", "vercel.json", "package.json",
    "scripts/vercel-ignore-build.mjs", "tests/image-delivery-budget.test.mjs",
    "docs/myspace/app/config.json", "docs/myspace/opora/notes.md/../../app/page.tsx",
  ]) {
    assert.equal(maySkipBuild([file]), false, `Must build for ${file}`);
  }
  assert.equal(maySkipBuild(["README.md", "app/page.tsx"]), false);
});

test("ignored-build comparison fails open on missing SHAs or git failures", () => {
  const good = "a".repeat(40), next = "b".repeat(40);
  assert.equal(changedFilesBetween("", next), null);
  assert.equal(changedFilesBetween(good, "invalid"), null);
  assert.equal(changedFilesBetween(good, next, () => {throw Error("missing Git tree");}), null);
  assert.deepEqual(changedFilesBetween(good, next, (_, args) => {
    assert.deepEqual(args, ["diff", "--name-only", "--no-renames", good, next]);
    return "README.md\napp/page.tsx\n";
  }), ["README.md", "app/page.tsx"]);
});

test("service hero WebP posters bypass billed Vercel transformations", () => {
  const component = readFileSync("components/personal-service-landing.tsx", "utf8");
  const images = readFileSync("data/personal-service-pages.ts", "utf8");
  assert.match(component, /unoptimized=\\{personalServiceImages\\[service\\]\\.endsWith\\("\\.webp"\\)\\}/);
  assert.match(images, /"business-consulting": "\\/images\\/holistic-house\\/video-posters\\/constellations-en-v1\\.webp"/);
});

test("Vercel source controls contain the known spend guards", () => {
  const v = JSON.parse(readFileSync("vercel.json", "utf8"));
  const n = readFileSync("next.config.ts", "utf8");
  assert.equal(v.ignoreCommand, "node scripts/vercel-ignore-build.mjs");
  assert.equal(v.git.deploymentEnabled["codex/public-book-library"], true);
  assert.match(n, /deviceSizes:\s*\[640, 828, 1080, 1440, 1920, 2560\]/);
  assert.match(n, /minimumCacheTTL:\s*86400/);
  assert.doesNotMatch(n, /images:\s*\{\s*unoptimized:\s*true/);
  assert.match(n, /outputFileTracingExcludes/);
});

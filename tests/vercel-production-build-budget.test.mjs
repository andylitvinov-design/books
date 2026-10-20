import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { shouldSkipPreviewBuild, maySkipBuild } from "../scripts/vercel-ignore-build.mjs";

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

test("only the verified Holistic House production branch automatically deploys", () => {
  assert.deepEqual(config.git.deploymentEnabled, {
    "**": false,
    "codex/public-book-library": true,
  });
  assert.equal(config.ignoreCommand, "node scripts/vercel-ignore-build.mjs");
  assert.ok(config.crons.some(job => job.path === "/api/internal/housekeeping"));
});

test("ignored Preview builds never suppress Production, including code changes", () => {
  assert.equal(shouldSkipPreviewBuild({ VERCEL_ENV: "preview" }), true);
  assert.equal(shouldSkipPreviewBuild({ VERCEL_ENV: "production" }), false);
  assert.equal(shouldSkipPreviewBuild({ VERCEL_ENV: "development" }), false);
  assert.equal(shouldSkipPreviewBuild({}), false);
  assert.equal(maySkipBuild(["app/layout.tsx"]), false);
  assert.equal(maySkipBuild(["next.config.ts"]), false);
  assert.equal(maySkipBuild(["README.md"]), true);
});

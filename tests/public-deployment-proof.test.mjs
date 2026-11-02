import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync("app/api/deployment-proof/route.ts", "utf8");

test("deployment proof is an uncached, read-only, public Vercel runtime identity", () => {
  assert.match(source, /export const dynamic = "force-dynamic"/);
  assert.match(source, /export const revalidate = 0/);
  assert.match(source, /export function GET\(\)/);
  assert.doesNotMatch(source, /export (?:async )?function (POST|PUT|PATCH|DELETE)/);
  assert.match(source, /"Cache-Control": "private, no-store/);
  assert.match(source, /"Vercel-CDN-Cache-Control": "no-store"/);
  assert.match(source, /process\.env\.VERCEL_GIT_COMMIT_SHA/);
  assert.match(source, /process\.env\.VERCEL_DEPLOYMENT_ID/);
  assert.match(source, /process\.env\.VERCEL_PROJECT_ID/);
  assert.match(source, /process\.env\.VERCEL_ENV/);
  assert.match(source, /process\.env\.VERCEL_GIT_COMMIT_REF/);
  assert.match(source, /process\.env\.VERCEL_GIT_REPO_OWNER/);
  assert.match(source, /process\.env\.VERCEL_GIT_REPO_SLUG/);
  assert.match(source, /projectId === PROJECT/);
  assert.match(source, /environment === "production"/);
  assert.match(source, /gitRef === HEAD_BRANCH/);
  assert.match(source, /repositoryOwner === OWNER/);
  assert.match(source, /repositoryName === REPO/);
});
test("deployment proof cannot claim ready if system variables are missing", () => {
  assert.match(source, /if \(!valid\)/);
  assert.match(source, /status: "UNVERIFIED"/);
  assert.match(source, /\{ status: 503, headers \}/);
  assert.match(source, /status: "RUNTIME_DEPLOYMENT"/);
  assert.match(source, /status: 200, headers/);
  assert.doesNotMatch(source, /process\.env\[(?:request|req)/i);
  assert.doesNotMatch(source, /Authorization|Bearer |token|secret|session|cookies/i);
});

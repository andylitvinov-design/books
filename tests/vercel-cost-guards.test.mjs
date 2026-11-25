import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { maySkipBuild, changedFilesBetween, changedFilesViaGithub } from "../scripts/vercel-ignore-build.mjs";

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

test("Vercel shallow clones use a bounded public GitHub compare without downloading history", async () => {
  const prev = "a".repeat(40), head = "b".repeat(40);
  const compare = ({ status = "ahead", files = ["docs/myspace/README.md"], ahead_by = 1, base_commit = {sha:prev}, head_commit={sha:head} } = {}) => ({
    status, files:files.map(filename => ({ filename, status:"modified" })), ahead_by, base_commit, head_commit,
  });
  let called = 0;
  const fakeFetch = async (url, options) => {
    called++;
    assert.match(url, /^https:\/\/api\.github\.com\/repos\/andylitvinov-design\/books\/compare\//);
    assert.ok(options.signal);
    return {ok:true,json:async()=>compare()};
  };
  assert.deepEqual(await changedFilesViaGithub(prev,head,fakeFetch),["docs/myspace/README.md"]);
  assert.equal(called,1);
  const fake = data => async () => ({ok:true,json:async()=>data});
  assert.equal((await changedFilesViaGithub(prev,head,fake(compare({files:["docs/myspace/README.md","components/site-navigation.tsx"]})))).length,2);
  assert.equal(await changedFilesViaGithub(prev,head,fake(compare({status:"diverged"}))),null);
  assert.equal(await changedFilesViaGithub(prev,head,fake(compare({ahead_by:251}))),null);
  assert.equal(await changedFilesViaGithub(prev,head,fake(compare({base_commit:{sha:"c".repeat(40)}}))),null);
  assert.equal(await changedFilesViaGithub(prev,head,async()=>({ok:false})),null);
  assert.equal(await changedFilesViaGithub(prev,head,async()=>{throw Error("Network disabled")}),null);
  assert.equal(await changedFilesViaGithub("invalid",head,fakeFetch),null);
  const renamed = compare(); renamed.files[0].status="renamed";
  assert.equal(await changedFilesViaGithub(prev,head,fake(renamed)),null);
  assert.equal(maySkipBuild(["docs/myspace/README.md"]),true);
  assert.equal(maySkipBuild(["docs/myspace/README.md","components/site-navigation.tsx"]),false);
});

test("service hero WebP posters bypass billed Vercel transformations", () => {
  const component = readFileSync("components/personal-service-landing.tsx", "utf8");
  const images = readFileSync("data/personal-service-pages.ts", "utf8");
  assert.ok(component.includes('unoptimized={personalServiceImages[service].endsWith(".webp")}'));
  assert.ok(images.includes('"business-consulting": "/images/holistic-house/video-posters/constellations-en-v1.webp"'));
});

test("Vercel source controls contain the known spend guards", () => {
  const v = JSON.parse(readFileSync("vercel.json", "utf8"));
  const n = readFileSync("next.config.ts", "utf8");
  assert.equal(v.ignoreCommand, "node scripts/vercel-ignore-build.mjs");
  assert.equal(v.git.deploymentEnabled["codex/public-book-library"], true);
  assert.match(n, /deviceSizes:\s*\[640, 828, 1080, 1440, 1920, 2560\]/);
  assert.match(n, /minimumCacheTTL:\s*2678400/);
  assert.match(n, /formats:\s*\["image\/webp"\]/);
  assert.match(n, /qualities:\s*\[75\]/);
  assert.ok(n.includes("static-card-media"));
  assert.doesNotMatch(n, /images:\s*\{\s*unoptimized:\s*true/);
  assert.match(n, /outputFileTracingExcludes/);
});

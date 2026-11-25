import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { verifyMediaFunctionTrace } from "../scripts/verify-vercel-media-trace.mjs";

async function fixture(t, tracedFiles) {
  const root = await mkdtemp(path.join(tmpdir(), "vercel-media-trace-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const traceFolder = path.join(root, ".next/server/app/media/[series]/[file]");
  await mkdir(traceFolder, { recursive: true });
  await writeFile(path.join(traceFolder, "route.js.nft.json"), JSON.stringify({
    version: 1,
    files: tracedFiles.map(f => path.relative(traceFolder, path.join(root, f))),
  }));
  return root;
}

test("accepts normal application and node runtime dependencies", async t => {
  const root = await fixture(t, ["data/media.js", "node_modules/next/dist/server/next.js"]);
  await verifyMediaFunctionTrace(root);
});

test("fails if a source-book photo leaks into media function trace", async t => {
  const root = await fixture(t, ["source-books/book-1-alchemy-soul/media/post_10_01.jpg"]);
  await assert.rejects(verifyMediaFunctionTrace(root), /Source-book images/);
});

test("fails if any Dao or Maya photo leaks into media function trace", async t => {
  for (const image of ["source-books/book-2-dao-books/photos/post_347_1.jpg", "source-books/book-3-maya-tradition/raw/photos/photo.jpg"]) {
    const root = await fixture(t, [image]);
    await assert.rejects(verifyMediaFunctionTrace(root), /Source-book images/);
  }
});

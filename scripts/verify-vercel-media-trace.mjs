import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Unlike a source-only test, this reads Next.js's real Node File Trace emitted
// by next build. An unexpectedly large traced photo corpus is a release blocker.
export async function verifyMediaFunctionTrace(root = process.cwd()) {
  const tracePath = path.resolve(root, ".next/server/app/media/[series]/[file]/route.js.nft.json");
  const trace = JSON.parse(await readFile(tracePath, "utf8"));
  assert.ok(Array.isArray(trace.files), "Missing actual media route function trace");

  const mediaDirectories = [
    "source-books/book-1-alchemy-soul/media",
    "source-books/book-2-dao-books/photos",
    "source-books/book-3-maya-tradition/raw/photos",
  ].map(dir => path.resolve(root, dir) + path.sep);

  const tracedImages = trace.files.filter(relative => {
    const absolute = path.resolve(path.dirname(tracePath), relative);
    return mediaDirectories.some(directory => absolute.startsWith(directory));
  });

  assert.deepEqual(
    tracedImages,
    [],
    "Source-book images are still inside the deployed media function. " +
      "Excluding them is required to prevent repeated Function Storage growth."
  );
  console.log(`PASS: media route's real server trace excludes all source-book photos (${trace.files.length} traced runtime files)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await verifyMediaFunctionTrace();
}

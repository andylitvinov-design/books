import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

// Outputs live in public/ (static CDN), not Vercel's /_next/image runtime.
// Every requested asset has a pinned original Git blob SHA and an immutable-by-
// content URL. Updating an original requires regenerating its registry entry.
const root = process.cwd();
const registry = JSON.parse(readFileSync(path.join(root, "data/public-card-artwork.json"), "utf8"));
const all = [
  ...Object.values(registry.books).map(item => ({ ...item, destinations: [[item.url, 720]] })),
  ...Object.values(registry.images).map(item => ({
    ...item,
    destinations: [[item.thumb, 256], [item.feature, 960]],
  })),
];
const outputRoot = "images/holistic-house/static-card-media/";
const fileHashes = new Map();
mkdirSync(path.join(root, "public", outputRoot), { recursive: true });

for (const item of all) {
  if (!/^[a-f0-9]{40}$/.test(item.sha)) throw new Error("Missing pinned image source revision");
  if (!/^(?:public|source-books)\//.test(item.source) || item.source.includes("..") || item.source.includes("\\")) {
    throw new Error("Unsafe source asset path");
  }
  const source = path.join(root, item.source);
  const original = readFileSync(source);
  const sha = createHash("sha1").update("blob " + original.length + "\0").update(original).digest("hex");
  if (sha !== item.sha) {
    throw new Error("Artwork source has changed; review and update the pinned asset manifest: " + item.source);
  }
  if (original.length !== item.bytes) throw new Error("Artwork source bytes changed: " + item.source);
  for (const [url, width] of item.destinations) {
    if (!url.startsWith("/" + outputRoot) || url.includes("..")
      || !url.endsWith(item.sha.slice(0, 16) + "-w" + width + ".webp")) {
      throw new Error("Unexpected static artwork destination: " + url);
    }
    // When a photo appears in multiple site placements, do the work just once.
    const existing = fileHashes.get(url);
    if (existing) {
      if (existing !== sha) throw new Error("Static artwork output collision");
      continue;
    }
    let output;
    try {
      output = await sharp(original, { failOn: "error" })
        .rotate()
        .resize({ width, withoutEnlargement: true, kernel: "lanczos3" })
        .webp({ quality: 76, alphaQuality: 90, effort: 4 })
        .toBuffer();
    } catch (error) {
      throw new Error("Cannot decode pinned static artwork source: " + item.source +
        " (" + item.sha + ", " + original.length + " bytes)", { cause: error });
    }
    writeFileSync(path.join(root, "public", url.slice(1)), output);
    fileHashes.set(url, sha);
  }
}

console.log(
  "[static-card-artwork] Generated " + fileHashes.size +
  " versioned WebP files from " + all.length +
  " pinned sources without Vercel request-time image transformations.",
);

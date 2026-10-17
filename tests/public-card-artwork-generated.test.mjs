import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";
import sharp from "sharp";

const registry = JSON.parse(readFileSync(new URL("../data/public-card-artwork.json", import.meta.url), "utf8"));
const renderTargets = [
  ...Object.values(registry.books).map(x => [x, [[x.url, 720]]]),
  ...Object.values(registry.images).map(x => [x, [[x.thumb, 256], [x.feature, 960]]]),
];

test("prebuild generates all 87 accessible, decodable public WebP files with bounded dimensions", async () => {
  const seen = new Set();
  for (const [original, variants] of renderTargets) {
    for (const [url, width] of variants) {
      assert.match(url, /^\/images\/holistic-house\/static-card-media\/[a-f0-9]{16}-w(?:256|720|960)\.webp$/);
      assert.ok(!seen.has(url), "Duplicate generated URL " + url);
      seen.add(url);
      const filepath = new URL("../public" + url, import.meta.url);
      const bytes = readFileSync(filepath);
      assert.equal(bytes.length, statSync(filepath).size);
      assert.ok(bytes.length > 100 && bytes.length < Math.max(500000, original.bytes * 2), url + " image is unexpectedly heavy");
      const meta = await sharp(bytes).metadata();
      assert.equal(meta.format, "webp");
      assert.ok(meta.width > 0 && meta.width <= width, url + " may be enlarged");
      assert.ok(meta.height > 0, url + " image decode failed");
    }
  }
  assert.equal(seen.size, 87);
});

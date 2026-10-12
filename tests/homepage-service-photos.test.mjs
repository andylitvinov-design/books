import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("the homepage shows local photographic stills for the two personal services, not abstract SVG placeholders", () => {
  const source = readFileSync(join(root, "components/services-solutions.tsx"), "utf8");
  const mapping = source.match(/const homepageMedia = \{([\s\S]*?)\} as const;/)?.[1];
  assert.ok(mapping, "The homepage-specific service image mapping must exist");
  for (const [id, filename] of Object.entries({
    alchemy: "constellations-en-v1.webp",
    hypnotherapy: "hypnotherapy-en-v1.webp",
  })) {
    const path = "/images/holistic-house/video-posters/" + filename;
    assert.ok(mapping.includes(id + ': "' + path + '"'), id + " must use an approved local photographic still");
    const asset = join(root, "public", path.slice(1));
    assert.ok(existsSync(asset), "Missing photo: " + asset);
    assert.equal(readFileSync(asset).toString("ascii", 8, 12), "WEBP", "Not a valid WebP still: " + asset);
  }
  assert.doesNotMatch(mapping, /homepage-constellations\.svg|homepage-guided-imagery\.svg/);
});

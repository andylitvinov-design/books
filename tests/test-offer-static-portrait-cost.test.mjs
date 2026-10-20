import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const banner = readFileSync(new URL("../components/sitewide-antistress-banner.tsx", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../data/static-portrait.json", import.meta.url), "utf8"));

test("test-offer practitioner picture reuses existing small static responsive portraits", () => {
  assert.match(banner, /import \{ StaticPortrait \} from "@\/components\/static-portrait"/);
  assert.match(banner, /<StaticPortrait src="\/images\/holistic-house\/andy-about\.png" alt=\{review\.photoAlt\} fill/);
  assert.doesNotMatch(banner, /<Image src="\/images\/holistic-house\/andy-about\.png"/);
  assert.match(banner, /<Image src=\{cardArtworkUrl\("\/images\/holistic-house\/course-focus-mountain-boy\.webp"\)\} unoptimized/);
  const publicRegistry = JSON.parse(readFileSync(new URL("../data/public-card-artwork.json", import.meta.url), "utf8"));
  assert.ok(publicRegistry.images["/images/holistic-house/course-focus-mountain-boy.webp"].thumb.endsWith("-w256.webp"));
  assert.match(banner, /data-tests-review-banner/);
  assert.match(banner, /data-tests-course-banner/);
  assert.equal(manifest.source, "/images/holistic-house/andy-about.png");
  assert.equal(manifest.sourceBytes, 2076018);
  assert.ok(manifest.variants.every(x => x.path.startsWith("/images/holistic-house/portrait-static/") && x.bytes < manifest.sourceBytes));
  assert.ok(manifest.variants.find(x => x.width === 96).bytes < 6000);
  assert.ok(manifest.variants.find(x => x.width === 192).bytes < 20000);
});

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
test("bounded public first-screen media caching; private responses unchanged", () => {
  const start=config.indexOf("PUBLIC_HERO_MEDIA_BOUNDED_CACHE_V1");
  const end=config.indexOf("// Versioned public video artwork",start);
  assert.ok(start>0&&end>start,"missing bounded cache block");
  const rules=config.slice(start,end);
  for(const path of ["/images/holistic-house/my-coach-motion/:path*","/images/holistic-house/ideas-pine-reference.webp","/images/video-goal-art/:path*"]) {
    assert.ok(rules.includes(JSON.stringify(path)),"missing public image cache rule "+path);
  }
  assert.ok(rules.includes("public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600"));
  assert.ok(!rules.includes("/api/")&&!rules.includes("/client/")&&!rules.includes("/admin/"));
  assert.ok(config.includes("source: \"/:path*\""),"existing common response headers remain");
});
test("all first-screen images exist as public static assets", () => {
  const paths=["public/images/holistic-house/my-coach-motion/max-living.webp","public/images/holistic-house/ideas-pine-reference.webp",...["stress","love","growth","energy"].map(s=>"public/images/video-goal-art/"+s+".webp")];
  for(const path of paths)assert.ok(existsSync(new URL("../"+path,import.meta.url)),path);
});

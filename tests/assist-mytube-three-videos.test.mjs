import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rankDiscoveryVideos } from "../lib/video-discovery/ranker.mjs";

const component = readFileSync(new URL("../components/services-assist-mytube.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/assist/public-mytube/route.ts", import.meta.url), "utf8");
const mytube = readFileSync(new URL("../app/[locale]/mytube/page.tsx", import.meta.url), "utf8");
const mobile = readFileSync(new URL("../components/services-assist-mobile.tsx", import.meta.url), "utf8");
const browserQA = readFileSync(new URL("../scripts/verify-public-services-production.mjs", import.meta.url), "utf8");

test("Assist offers three distinct topical, already published videos", () => {
  const titles = ["Quiet A", "Quiet B", "Quiet C", "Unrelated"];
  const fixture = titles.map((title, i) => ({
    id: String(i), kind: "video", title, description: "",
    youtubeId: String.fromCharCode(65 + i).repeat(11),
    topicTags: i < 3 ? ["stress"] : ["work"],
    curation: "verified", sourceGroup: "source" + i,
  }));
  const chosen = rankDiscoveryVideos(fixture, { goal: "stress" }).slice(0, 3);
  assert.equal(chosen.length, 3);
  assert.equal(new Set(chosen.map(item => item.youtubeId)).size, 3);
  assert.ok(chosen.every(item => item.topicTags.includes("stress")));
  assert.match(component, /\.slice\(0, 3\)/);
  assert.match(component, /data-assist-mytube-card/);
  assert.match(component, /data-assist-mytube-more/);
});

test("public catalog and links preserve privacy, approval and actual playback", () => {
  assert.match(route, /buildPublicVideoDiscoveryItems\(locale, published, approved\)/);
  assert.match(route, /loadPublicMyTubeVideos\(\)/);
  assert.doesNotMatch(route, /searchParams\.get\(["'](?:question|query|text|symptoms)["']\)/);
  assert.match(component, /fetch\("\/api\/assist\/public-mytube\?locale=" \+ locale/);
  assert.match(component, /mytube\?video=/);
  assert.match(component, /mytube\?goal=/);
  assert.match(mytube, /data-mytube-assist-featured/);
  assert.match(mobile, /<ServicesAssistMyTube locale=\{locale\} focus=\{selection\.focus\} question=\{selection\.text\}/);
  assert.match(mobile, /!crisis&&selection\?<ServicesAssistMyTube/);
  assert.match(mobile, /data-assist-topic-suggestions/);
  assert.match(mobile, /data-assist-reset/);
  assert.match(browserQA, /rankDiscoveryVideos\(publicVideos\.videos,\{goal:"stress",sort:"for-you"\}\)/);
  assert.match(browserQA, /publishedVideoUrl\.search,"\?locale="\+locale/);
  assert.match(browserQA, /data-assist-mytube/);
});

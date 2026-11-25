import assert from "node:assert/strict";
import test from "node:test";
import { siteVideoTitleId } from "../lib/site-videos/model.js";

test("published site-video title IDs are deterministic across server and browser renders", () => {
  const video = { heygenId: "48105a2f2228e7cb3a67391e97acaf8b" };

  assert.equal(siteVideoTitleId(video, "ru"), "site-video-title-ru-48105a2f2228e7cb3a67391e97acaf8b");
  assert.equal(siteVideoTitleId(video, "ru"), siteVideoTitleId({ ...video }, "ru"));
  assert.notEqual(siteVideoTitleId(video, "ru"), siteVideoTitleId(video, "en"));
});

test("published site-video title IDs support YouTube-only placements", () => {
  assert.equal(siteVideoTitleId({ youtubeId: "OkLEN8Zb-sY" }, "en"), "site-video-title-en-OkLEN8Zb-sY");
});

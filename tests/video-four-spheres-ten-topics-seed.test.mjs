import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// SQL is additive and persisted by the owner-managed database workflow.
// This test validates the source manifest. Production RLS, audio, copyright,
// embed rights and video playback need distinct real integration tests.
const sql = readFileSync(
  new URL("../data/video-catalog/ru-four-spheres-ten-topics-20261028.sql", import.meta.url),
  "utf8",
);

const topics = Object.freeze({
  business: ["work", "money"],
  relationships: ["connection"],
  energy_health: ["emotions", "recovery", "body"],
  personal_growth: ["traits", "support", "meaning", "goal"],
});

test("two new RU video candidates per each of 10 topical subcategories", () => {
  const rows = sql.split("\n").filter(line => /^\s*\('[A-Za-z0-9_-]{11}'/.test(line));
  assert.equal(rows.length, 20);
  const ids = new Set();
  const counts = new Map();

  for (const row of rows) {
    const id = row.match(/^\s*\('([A-Za-z0-9_-]{11})'/)?.[1];
    assert.ok(id, "a real YouTube-shaped video ID");
    assert.ok(!ids.has(id), "no duplicate YouTube ID");
    ids.add(id);

    const length = row.match(/, (\d+), (\d+), 'metadata_checked'/);
    assert.ok(length, id + " requires duration sourced from YouTube metadata");
    const hint = Number(length[1]);
    const seconds = Number(length[2]);
    assert.ok(seconds > 0 && seconds <= 600, id + " is over 10 minutes");
    assert.equal(hint, Math.ceil(seconds / 60));

    const group = row.match(/::jsonb,\s*ARRAY\['([^']+)',\s*'([^']+)'\]::text\[\]/);
    assert.ok(group, id + " requires two hierarchy tags");
    const [, area, topic] = group;
    assert.ok(topics[area]?.includes(topic), "unregistered discovery topic " + area + "/" + topic);
    const key = area + "/" + topic;
    counts.set(key, (counts.get(key) ?? 0) + 1);

    assert.match(row, /'external'/);
    assert.match(row, /'public_listing', 'candidate', 'unverified', 'pending_embed_check'/);
    assert.match(row, /'private_review'\)[,]?$/);
    assert.doesNotMatch(row, /'embed_approved'|'link_only'|'approved', 'confirmed'/);
  }

  assert.equal(ids.size, 20);
  const allTopics = Object.entries(topics).flatMap(([area, list]) => list.map(topic => area + "/" + topic));
  assert.equal(counts.size, allTopics.length);
  for (const topic of allTopics) assert.equal(counts.get(topic), 2, "expected exactly 2: " + topic);
  assert.match(sql, /INSERT INTO public\.hh_meditation_catalog_v1/);
  assert.match(sql, /ON CONFLICT \(youtube_id\) DO NOTHING/);
});

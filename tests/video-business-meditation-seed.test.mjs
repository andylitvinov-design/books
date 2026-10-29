import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Source-contract smoke test only. Live Supabase RLS, video audio, rights and playback
// require independent integration checks before any video gets editorial approval.
const source = readFileSync(
  new URL("../data/video-catalog/ru-business-short-meditations-20261028.sql", import.meta.url),
  "utf8",
);

test("RU business meditation seed has ten unique existing-table candidates <=10min", () => {
  const records = source.split("\n").filter((line) => /^\s*\('[A-Za-z0-9_-]{11}'/.test(line));
  assert.equal(records.length, 10);
  const ids = new Set();

  for (const line of records) {
    const id = line.match(/^\s*\('([A-Za-z0-9_-]{11})'/)?.[1];
    assert.ok(id, "valid YouTube ID");
    assert.ok(!ids.has(id), "YouTube ID must not repeat");
    ids.add(id);
    const runtime = line.match(/, (\d+), (\d+), 'metadata_checked'/);
    assert.ok(runtime, "duration hint and verified seconds must be recorded");
    const hint = Number(runtime[1]);
    const seconds = Number(runtime[2]);
    assert.ok(seconds > 0 && seconds <= 600, "actual metadata duration max 10:00");
    assert.equal(hint, Math.ceil(seconds / 60));
    assert.match(line, /ARRAY\['business',/);
    assert.match(line, /'public_listing', 'candidate', 'unverified', 'pending_embed_check'/);
    assert.match(line, /'private_review'\)[,]?$/);
  }

  assert.match(source, /INSERT INTO public\.hh_meditation_catalog_v1/);
  assert.match(source, /ON CONFLICT \(youtube_id\) DO NOTHING/);
  assert.doesNotMatch(source, /'embed_approved'|'approved', 'confirmed'/);
});

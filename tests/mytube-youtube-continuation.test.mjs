import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  normalizeMyTubeYouTubeScope, youtubeSearchUrl, durationSeconds, verifiedYouTubeMatches,
} from "../lib/video-discovery/mytube-youtube.mjs";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("only finite editorial topics are allowed and user's free text is rejected", () => {
  const scope = normalizeMyTubeYouTubeScope({shelf: "practices", locale: "ru", collection: "sun", goal: "work"});
  assert.equal(scope.topic, "sun");
  assert.match(scope.query, /солнца.*цели/);
  assert.ok(youtubeSearchUrl(scope).startsWith("https://www.youtube.com/results?search_query="));
  assert.equal(normalizeMyTubeYouTubeScope({shelf: "practices", locale: "ru", goal: "diabetes"}), null);
  assert.equal(normalizeMyTubeYouTubeScope({shelf: "practices", locale: "ru", collection: "../private"}), null);
  assert.equal(normalizeMyTubeYouTubeScope({shelf: "practices", locale: "ru", query: "patient notes"}).query.includes("patient"), false);
  assert.equal(normalizeMyTubeYouTubeScope({shelf: "courses", locale: "en", collection: "sun"}).topic, "courses");
  assert.equal(normalizeMyTubeYouTubeScope({shelf: "masters", locale: "es"}).topic, "masters");
  assert.equal(normalizeMyTubeYouTubeScope({shelf: "practices", locale: "xx"}), null);
});
test("query language follows original-audio choice or interface locale", () => {
  const ru = normalizeMyTubeYouTubeScope({shelf: "practices", locale: "ru", collection: "planets"});
  assert.match(ru.query, /планет/);
  assert.equal(ru.queryLanguage, "ru");
  const es = normalizeMyTubeYouTubeScope({shelf: "practices", locale: "ru", language: "es", collection: "planets"});
  assert.match(es.query, /planetas/);
  assert.equal(es.queryLanguage, "es");
  assert.match(normalizeMyTubeYouTubeScope({shelf: "practices", locale: "en", category: "goals-money"}).query, /goal/);
});
test("parses real ISO8601 YouTube durations, never guesses", () => {
  assert.equal(durationSeconds("PT15M"), 900);
  assert.equal(durationSeconds("PT15M1S"), 901);
  assert.equal(durationSeconds("PT1H1M2S"), 3662);
  assert.equal(durationSeconds("P1DT2H"), 93600);
  for (const invalid of [null, "PT", "LIVE", "PT-5M", "PT0S", "5m", "PT9999999999999999999S"])
    assert.equal(durationSeconds(invalid), null);
});
test("results are exactly public/embeddable and strict <=15m for practices", () => {
  const base = {status: {privacyStatus: "public", embeddable: true, madeForKids: false},
    snippet: {title: "Guided practice", channelTitle: "Example Channel", liveBroadcastContent: "none"}};
  const ids = ["aaaaaBBBBB1", "aaaaaBBBBB2", "aaaaaBBBBB3", "aaaaaBBBBB4", "aaaaaBBBBB5", "aaaaaBBBBB6", "aaaaaBBBBB7"];
  const search = {items: ids.map(videoId => ({id: {videoId}}))};
  const videos = {items: [
    {...base, id: ids[1], contentDetails: {duration: "PT14M59S"}},
    {...base, id: ids[0], contentDetails: {duration: "PT15M"}},
    {...base, id: ids[2], contentDetails: {duration: "PT15M1S"}},
    {...base, id: ids[3], status: {...base.status, privacyStatus: "unlisted"}, contentDetails: {duration: "PT10M"}},
    {...base, id: ids[4], status: {...base.status, embeddable: false}, contentDetails: {duration: "PT10M"}},
    {...base, id: ids[5], contentDetails: {duration: "PT0S"}},
    {...base, id: ids[6], status: {...base.status, madeForKids: true}, contentDetails: {duration: "PT10M"}},
  ]};
  const practices = verifiedYouTubeMatches(search, videos, "practices");
  assert.deepEqual(practices.map(v => v.id), ids.slice(0, 2));
  assert.equal(practices[0].provider, "youtube");
  assert.equal(practices[0].href, "https://www.youtube.com/watch?v=" + ids[0]);
  assert.equal(practices[0].durationSeconds, 900);
  assert.deepEqual(verifiedYouTubeMatches(search, videos, "courses").map(v => v.id), [ids[0], ids[1], ids[2]]);
  assert.deepEqual(verifiedYouTubeMatches(search, videos, "all"), []);
});
test("adapters keep owned course catalog and YouTube listings separate", () => {
  const client = read("components/mytube-youtube-continuation.tsx");
  const server = read("app/api/public/mytube-youtube/route.ts");
  assert.match(client, /data-mytube-youtube-continuation/);
  assert.match(client, /IntersectionObserver/);
  assert.match(client, /excludedIds/);
  assert.match(client, /setResult\(null\)/);
  assert.match(client, /YouTube/);
  assert.match(server, /HH_MYTUBE_YOUTUBE_ENABLED/);
  assert.match(server, /HH_MYTUBE_YOUTUBE_FREE_QUOTA_CONFIRMED/);
  assert.match(server, /unstable_cache/);
  assert.match(server, /maxResults: "50"/);
  assert.doesNotMatch(server, /NEXT_PUBLIC_YOUTUBE/);
  assert.doesNotMatch(client, /sourceApproved|curation:"verified"/);
  const source = read("components/video-discovery.tsx");
  assert.match(source, /<MyTubeYoutubeContinuation/);
  assert.match(source, /<MyTubeCoursePlaylists/);
});

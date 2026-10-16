import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getPrioritySitemapEntries } from "../data/seo-priority-paths.js";

const map = JSON.parse(readFileSync(new URL("../data/seo-demand-map.json", import.meta.url), "utf8"));

test("SEO keyword map owns unique locale-specific intentions and does not fabricate Google demand or paid Ads", () => {
  assert.match(map.status, /not_google_metrics/);
  assert.ok(map.keywords.length >= 26);
  const seen = new Set();
  const locales = new Set();
  for (const item of map.keywords) {
    const key = item.locale + ":" + item.cluster_id;
    assert.equal(seen.has(key), false, "duplicate keyword owner " + key);
    seen.add(key); locales.add(item.locale);
    assert.ok(["en", "ru", "es"].includes(item.locale));
    assert.ok(["P0","P1","P2"].includes(item.seo_priority));
    assert.ok(["candidate_after_review","research_only","hold"].includes(item.ads_gate));
    assert.equal(item.source, "editorial_seed_unvalidated");
    assert.ok(item.primary_keyword.length >= 3);
    assert.ok(item.supporting_keywords.length > 0);
    assert.ok(item.next_action.length > 12);
    for (const [name, value] of Object.entries(item.measured)) {
      assert.equal(value, null, key + ": " + name + " must be null without Google provider evidence");
    }
    if (item.primary_path !== null) {
      assert.ok(item.primary_path === "/" || item.primary_path.startsWith("/" + item.locale + "/"));
      assert.doesNotMatch(item.primary_path, /\/(client|app|admin|api|report|prescriptions|documents)(\/|$)/);
      assert.doesNotMatch(item.primary_path, /\?.*token/i);
    } else {
      assert.equal(item.ads_gate, "hold", "unbuilt landing must not be eligible for paid campaigns");
    }
  }
  assert.deepEqual([...locales].sort(), ["en","es","ru"]);
});

test("high-value public assessment and Yggdrasil level 1 URLs have explicit sitemap coverage", () => {
  const sitemapPaths = new Set(getPrioritySitemapEntries("https://holistichouse.vercel.app").map((x) => new URL(x.url).pathname));
  for (const item of map.keywords.filter((x) => ["S07", "R03", "R06", "B02"].includes(x.cluster_id))) {
    assert.ok(sitemapPaths.has(item.primary_path), item.cluster_id + " " + item.locale);
  }
  assert.ok(![...sitemapPaths].some((path) => path.includes("/client")));
});

test("Tantra free Level 1 has one truthful, separately owned EN/RU/ES search cluster", () => {
  const family = map.keywords.filter((item) => item.cluster_id === "R07");
  assert.deepEqual(family.map((item) => item.locale).sort(), ["en", "es", "ru"]);
  const priorityPaths = new Set(getPrioritySitemapEntries("https://holistichouse.vercel.app").map((item) => new URL(item.url).pathname));
  for (const item of family) {
    assert.equal(item.primary_path, "/" + item.locale + "/academy/reiki/tantra-reiki/free-initiation");
    assert.equal(item.seo_priority, "P0");
    assert.equal(item.ads_gate, "hold", "Tantra ad policy review is still required");
    assert.equal(item.source, "editorial_seed_unvalidated");
    assert.ok(priorityPaths.has(item.primary_path), item.primary_path);
    for (const metric of Object.values(item.measured)) assert.equal(metric, null);
  }
  assert.equal(map.keywords.find((item) => item.cluster_id === "R04" && item.locale === "en").primary_path,
    "/en/academy/reiki/tantra-reiki", "Keep the nine-level Tantra programme separate from free Level 1");
});

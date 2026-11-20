import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SEO_AUDIT_SITE, validateSeomatorSnapshot } from "../lib/seo/seomator-snapshot.mjs";

const RUN_URL = /^https:\/\/github\.com\/andylitvinov-design\/books\/actions\/runs\/[0-9]+$/;
const score = value => Number.isFinite(value) && value >= 0 && value <= 100 ?
  Math.round(value) : null;
const count = value => Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
const compact = value => typeof value === "string"
  ? value.replace(/https?:\/\/\S+/gi, "[link]").replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/[\r\n<>]/g, " ").trim().slice(0, 180) : "";
const titleFromId = id => id.split("-").map(s => s[0]?.toUpperCase() + s.slice(1)).join(" ");

export function buildSeomatorSnapshot(raw, previous = null, options = {}) {
  const runUrl = options.runUrl;
  const asOf = options.asOf ?? new Date().toISOString();
  if (!raw || typeof raw !== "object" || raw.error || raw.url !== SEO_AUDIT_SITE ||
      score(raw.overallScore) === null || !Array.isArray(raw.categoryResults) ||
      !Number.isInteger(raw.crawledPages) || raw.crawledPages < 1 ||
      !RUN_URL.test(runUrl ?? "") || !Number.isFinite(Date.parse(asOf))) {
    throw new Error("SEOMATOR_UNVERIFIED_REPORT");
  }
  const categories = raw.categoryResults.filter(c =>
    c && /^[a-z0-9-]{2,50}$/.test(c.categoryId) && score(c.score) !== null
  ).slice(0, 20).map(c => ({
    id: c.categoryId, score: score(c.score),
    fail: count(c.failCount), warn: count(c.warnCount),
  }));
  if (!categories.length) throw new Error("SEOMATOR_NO_CATEGORIES");

  const findings = raw.categoryResults.flatMap(c =>
    (Array.isArray(c.results) ? c.results : []).map(r => ({
      ruleId: r?.ruleId, status: r?.status, category: c.categoryId,
      title: compact(r?.name || r?.title) || titleFromId(String(r?.ruleId ?? "")),
      explanation: compact(r?.suggestion || r?.message || r?.description),
    }))
  ).filter(r => /^[a-z0-9-]{3,90}$/.test(r.ruleId) &&
      ["fail", "warn"].includes(r.status))
    .sort((a, b) => (a.status === "fail" ? 0 : 1) - (b.status === "fail" ? 0 : 1))
    .slice(0, 12);
  const safePrevious = validateSeomatorSnapshot(previous);
  const history = safePrevious.status === "live" || safePrevious.status === "stale"
    ? safePrevious.history : [];
  const updated = [...history.filter(h => h.asOf.slice(0, 10) !== asOf.slice(0, 10)),
    { asOf, score: score(raw.overallScore) }].slice(-12);
  return {
    schemaVersion: 1, site: SEO_AUDIT_SITE, asOf, engine: "SEOmator " + (options.version || "8.0.1"),
    runUrl, score: score(raw.overallScore), crawledPages: raw.crawledPages,
    categories, findings, history: updated,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [rawPath, previousPath, outPath] = process.argv.slice(2);
  if (!rawPath || !outPath) {
    process.stderr.write("Usage: node scripts/build-seomator-snapshot.mjs RAW PREVIOUS OUTPUT\n");
    process.exitCode = 2;
  } else {
    try {
      const raw = JSON.parse(readFileSync(rawPath, "utf8"));
      const previous = previousPath && existsSync(previousPath)
        ? JSON.parse(readFileSync(previousPath, "utf8")) : null;
      const result = buildSeomatorSnapshot(raw, previous, {
        runUrl: process.env.HH_SEO_AUDIT_RUN_URL,
        version: process.env.HH_SEO_AUDIT_VERSION,
      });
      writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n");
      process.stdout.write("Public-only SEO snapshot ready: " + result.score + "/100\n");
    } catch (error) {
      process.stderr.write("SEO snapshot not produced: " + error.message + "\n");
      process.exitCode = 2;
    }
  }
}

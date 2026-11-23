/**
 * Public-only SEOmator audit snapshots. The audit runs in GitHub Actions, never
 * inside a Vercel request. This reader has no tokens, user input or database.
 */
export const SEO_AUDIT_ASSET_URL =
  "https://github.com/andylitvinov-design/books/releases/download/hh-seomator-history/seo-audit.json";
export const SEO_AUDIT_SITE = "https://holistichouse.vercel.app/";
const RUN_URL = /^https:\/\/github\.com\/andylitvinov-design\/books\/actions\/runs\/[0-9]+$/;
const MAX_AGE_DAYS = 14;
const MAX_BYTES = 100_000;

const isScore = v => Number.isInteger(v) && v >= 0 && v <= 100;
const isDate = v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
const cleanText = (v, max = 120) => typeof v === "string" ? v.slice(0, max) : "";

export function validateSeomatorSnapshot(data, now = new Date()) {
  if (!data || typeof data !== "object" || Array.isArray(data) ||
      data.schemaVersion !== 1 || data.site !== SEO_AUDIT_SITE ||
      !isDate(data.asOf) || !isScore(data.score) ||
      !Number.isInteger(data.crawledPages) || data.crawledPages < 1 ||
      !RUN_URL.test(data.runUrl ?? "")) {
    return { status: "invalid" };
  }
  const ts = Date.parse(data.asOf);
  if (ts > now.getTime() + 86_400_000) return { status: "invalid" };
  const categories = (Array.isArray(data.categories) ? data.categories : [])
    .filter(c => c && /^[a-z0-9-]{2,50}$/.test(c.id) && isScore(c.score))
    .slice(0, 20).map(c => ({
      id: c.id, score: c.score, fail: Math.max(0, Math.min(9999, Number(c.fail) || 0)),
      warn: Math.max(0, Math.min(9999, Number(c.warn) || 0)),
    }));
  const findings = (Array.isArray(data.findings) ? data.findings : [])
    .filter(f => f && /^[a-z0-9-]{3,90}$/.test(f.ruleId) &&
      ["fail", "warn"].includes(f.status))
    .slice(0, 12).map(f => ({
      ruleId: f.ruleId, status: f.status,
      category: cleanText(f.category, 45), title: cleanText(f.title),
      explanation: cleanText(f.explanation, 200),
    }));
  const history = (Array.isArray(data.history) ? data.history : [])
    .filter(h => h && isDate(h.asOf) && isScore(h.score))
    .slice(-12).map(h => ({ asOf: h.asOf, score: h.score }));
  const ageDays = Math.max(0, Math.floor((now.getTime() - ts) / 86_400_000));
  return {
    status: ageDays > MAX_AGE_DAYS ? "stale" : "live",
    asOf: data.asOf, ageDays, score: data.score, crawledPages: data.crawledPages,
    engine: cleanText(data.engine, 40), runUrl: data.runUrl, categories, findings, history,
  };
}

export async function readSeomatorSnapshot(fetcher = fetch) {
  try {
    const response = await fetcher(SEO_AUDIT_ASSET_URL, {
      next: { revalidate: 3600 }, signal: AbortSignal.timeout(4500),
    });
    if (response.status === 404) return { status: "not_run" };
    if (!response.ok) return { status: "unavailable" };
    const body = await response.text();
    if (body.length > MAX_BYTES) return { status: "invalid" };
    return validateSeomatorSnapshot(JSON.parse(body));
  } catch {
    return { status: "unavailable" };
  }
}

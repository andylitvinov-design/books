import { createSign } from "node:crypto";
import baseline from "../../data/seo/verified-baseline-2026-10-17.json" with { type: "json" };

const SITE = "https://holistichouse.vercel.app/";
const SCOPED_URL = "https://www.googleapis.com/auth/webmasters.readonly";
let cachedToken = null;

export function isPublicSeoPath(url) {
  try {
    const value = new URL(url, SITE);
    return value.origin === new URL(SITE).origin
      && !/^\/(?:api|admin|document-preview|(?:en|ru|es)\/(?:app|client|report|prescriptions))(?:\/|$)/.test(value.pathname);
  } catch { return false; }
}

export function serviceAccountReady(env = process.env) {
  return Boolean(env.HH_GSC_SERVICE_ACCOUNT_EMAIL && env.HH_GSC_SERVICE_ACCOUNT_PRIVATE_KEY);
}

const dateString = date => date.toISOString().slice(0, 10);
export function searchDateRange(days, now = new Date()) {
  // Google Search Console's most recent data may be incomplete. Only settled dates.
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 3));
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - Math.max(1, Math.min(days, 90)) + 1);
  return { startDate: dateString(start), endDate: dateString(end) };
}

async function getAccessToken(env = process.env) {
  if (!serviceAccountReady(env)) return null;
  if (cachedToken && cachedToken.until > Date.now() + 90_000) return cachedToken.value;
  const email = env.HH_GSC_SERVICE_ACCOUNT_EMAIL.trim();
  const key = env.HH_GSC_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n");
  if (!/^[^\s@]+@[^\s@]+$/.test(email) || !key.includes("BEGIN PRIVATE KEY")) throw new Error("GSC_CONFIGURATION");
  const encode = data => Buffer.from(JSON.stringify(data)).toString("base64url");
  const header = encode({ alg: "RS256", typ: "JWT" });
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = encode({
    iss: email, scope: SCOPED_URL, aud: "https://oauth2.googleapis.com/token",
    iat: issuedAt, exp: issuedAt + 3500,
  });
  const unsigned = header + "." + payload;
  const signature = createSign("RSA-SHA256").update(unsigned).end().sign(key).toString("base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: unsigned + "." + signature }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("GSC_TOKEN_FAILURE");
  const data = await response.json();
  if (!data.access_token || typeof data.expires_in !== "number") throw new Error("GSC_TOKEN_INVALID");
  cachedToken = { value: data.access_token, until: Date.now() + Math.min(data.expires_in, 3500) * 1000 };
  return cachedToken.value;
}

async function querySearchConsole(accessToken, range, dimensions = [], rowLimit = 12) {
  const response = await fetch("https://searchconsole.googleapis.com/webmasters/v3/sites/" +
    encodeURIComponent(SITE) + "/searchAnalytics/query", {
      method: "POST", cache: "no-store",
      headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
      body: JSON.stringify({ ...range, type: "web", dataState: "final", dimensions, rowLimit }),
      signal: AbortSignal.timeout(14_000),
    });
  if (!response.ok) throw new Error(response.status === 403 ? "GSC_PROPERTY_ACCESS" : "GSC_API_UNAVAILABLE");
  const result = await response.json();
  return Array.isArray(result.rows) ? result.rows : [];
}

export async function readSearchMetrics(days = 28, env = process.env) {
  if (!serviceAccountReady(env)) {
    return { status: "not_connected", periodDays: days, source: "Google Search Console", range: null };
  }
  try {
    const token = await getAccessToken(env);
    const range = searchDateRange(days);
    const [totals, daily, queries, pages] = await Promise.all([
      querySearchConsole(token, range),
      querySearchConsole(token, range, ["date"], 90),
      querySearchConsole(token, range, ["query"], 12),
      querySearchConsole(token, range, ["page"], 30),
    ]);
    const summary = totals[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    const impressions = Number(summary.impressions) || 0;
    return {
      status: "live", periodDays: days, range, settledThrough: range.endDate,
      clicks: Number(summary.clicks) || 0, impressions,
      ctr: impressions > 0 ? Number(summary.ctr) : null,
      position: impressions > 0 ? Number(summary.position) : null,
      daily: daily.map(row => ({ date: row.keys?.[0], clicks: row.clicks ?? 0, impressions: row.impressions ?? 0 })).filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.date)).sort((a, b) => a.date.localeCompare(b.date)),
      queries: queries.map(row => ({ name: String(row.keys?.[0] ?? "").slice(0, 160), clicks: row.clicks ?? 0, impressions: row.impressions ?? 0, ctr: row.ctr ?? 0, position: row.position ?? 0 })).filter(row => row.name),
      pages: pages.filter(row => isPublicSeoPath(row.keys?.[0] ?? ""))
        .slice(0, 12).map(row => ({ name: new URL(row.keys[0]).pathname, clicks: row.clicks ?? 0, impressions: row.impressions ?? 0, ctr: row.ctr ?? 0, position: row.position ?? 0 })),
      source: "Google Search Console API", asOf: new Date().toISOString(),
    };
  } catch {
    // Never disclose API tokens, Google response bodies, or account configuration.
    return { status: "connection_error", periodDays: days, source: "Google Search Console" };
  }
}

export async function readPublicSitemap() {
  try {
    const response = await fetch(SITE + "sitemap.xml", { next: { revalidate: 900 }, signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error("sitemap");
    const xml = await response.text();
    const paths = [...xml.matchAll(/<loc>(https:\/\/holistichouse\.vercel\.app\/[^<]*)<\/loc>/g)].map(match => match[1]);
    const locales = { en: 0, ru: 0, es: 0, other: 0 };
    for (const url of paths) {
      const locale = new URL(url).pathname.match(/^\/(en|ru|es)(?=\/|$)/)?.[1];
      locales[locale ?? "other"]++;
    }
    return { status: "live", checkedAt: new Date().toISOString(), urls: new Set(paths).size, locales };
  } catch {
    return { status: "unavailable", urls: baseline.sitemap.submittedUrls, locales: null };
  }
}

export { baseline as verifiedSeoBaseline };

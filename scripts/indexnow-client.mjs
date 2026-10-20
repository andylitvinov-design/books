// Standalone, zero-dependency IndexNow contract for confirmed public pages.
// IndexNow is search engine notification, not ad targeting, analytics or indexing proof.
const OFFICIAL_HOST = "holistichouse.vercel.app";
const ENDPOINT = "https://api.indexnow.org/indexnow";
const KEY = /^[a-zA-Z0-9-]{8,128}$/;

const PUBLIC_PATHS = [
  /^\/(?:en|ru|es)\/services\/free-situation-review$/,
  /^\/en\/services\/systemic-constellations$/,
  /^\/en\/academy\/reiki\/yggdrasil$/,
  /^\/en\/academy\/reiki\/tantra-reiki\/discover$/,
  /^\/en\/toronto$/,
  /^\/en\/events\/love-magic-tarot-initiations-2026-10-25$/,
];

export function validateIndexNowPlan(config, keyFileContents) {
  if (!config || typeof config !== "object" || Array.isArray(config)
    || config.origin !== "https://" + OFFICIAL_HOST || config.endpoint !== ENDPOINT
    || typeof config.keyFile !== "string"
    || !/^\/[A-Za-z0-9-]{8,128}\.txt$/.test(config.keyFile)
    || !Array.isArray(config.paths) || config.paths.length === 0 || config.paths.length > 24) {
    throw new TypeError("INVALID_INDEXNOW_CONFIGURATION");
  }
  const key = String(keyFileContents).trim();
  if (!KEY.test(key) || config.keyFile !== "/" + key + ".txt") {
    throw new TypeError("INDEXNOW_VERIFICATION_KEY_MISMATCH");
  }
  const seen = new Set();
  const urlList = [];
  for (const path of config.paths) {
    if (typeof path !== "string" || path.length > 180
        || !PUBLIC_PATHS.some(pattern => pattern.test(path))
        || path.includes("//") || path.includes("?") || path.includes("#")
        || seen.has(path)) {
      throw new TypeError("PRIVATE_OR_INVALID_INDEXNOW_URL");
    }
    seen.add(path);
    urlList.push(config.origin + path);
  }
  return Object.freeze({
    host: OFFICIAL_HOST,
    key,
    keyLocation: config.origin + config.keyFile,
    urlList: Object.freeze(urlList),
    endpoint: ENDPOINT,
  });
}

export function canonicalInHtml(html, url) {
  return typeof html === "string"
    && html.includes('<link rel="canonical" href="' + url + '"')
    && !/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);
}

async function getVerifiedText(url, fetchImpl) {
  const response = await fetchImpl(url, {
    method: "GET",
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (response.status !== 200) throw new Error("INDEXNOW_TARGET_NOT_200:" + response.status);
  if (response.headers?.get("x-robots-tag")?.includes("noindex")) throw new Error("INDEXNOW_TARGET_NOINDEX");
  return response.text();
}

export async function verifyIndexNowPublicRoutes(plan, fetchImpl = fetch) {
  const proof = await getVerifiedText(plan.keyLocation, fetchImpl);
  if (proof.trim() !== plan.key) throw new Error("INDEXNOW_PROOF_NOT_LIVE");
  for (const url of plan.urlList) {
    const html = await getVerifiedText(url, fetchImpl);
    if (!canonicalInHtml(html, url)) {
      throw new Error("INDEXNOW_URL_NOT_CANONICAL_OR_NOINDEX:" + new URL(url).pathname);
    }
  }
  return Object.freeze({ keyVerified: true, validPublicPages: plan.urlList.length });
}

export async function sendIndexNow(plan, fetchImpl = fetch) {
  const response = await fetchImpl(plan.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": "HolisticHouse-IndexNow/1.0",
    },
    body: JSON.stringify({
      host: plan.host,
      key: plan.key,
      keyLocation: plan.keyLocation,
      urlList: plan.urlList,
    }),
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  // First verified submission may return 202 while search engines check the key.
  if (response.status !== 200 && response.status !== 202) {
    throw new Error("INDEXNOW_NOT_ACCEPTED_HTTP_" + response.status);
  }
  return Object.freeze({ accepted: true, httpStatus: response.status, urls: plan.urlList.length });
}

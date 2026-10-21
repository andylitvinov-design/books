// Read-only Metricool site API preflight. Never schedule, publish, upload media,
// create a brand, or reuse the separate ChatGPT Metricool OAuth connector.
// The API token stays on the server; do not return it in a server action.
const API = "https://app.metricool.com/api/admin/simpleProfiles";
const NUMERIC_ID = /^[1-9][0-9]{0,15}$/;
const MAX_RESPONSE_BYTES = 200_000;

export function metricoolSiteConfig(environment = process.env) {
  const token = environment.METRICOOL_USER_TOKEN;
  const userId = environment.METRICOOL_USER_ID;
  const blogId = environment.METRICOOL_BLOG_ID;
  const expectedName = environment.METRICOOL_BRAND_NAME;
  if (typeof token !== "string" || token.length < 12 || token.length > 512 ||
      /[\r\n\u0000-\u001f]/.test(token) ||
      typeof userId !== "string" || !NUMERIC_ID.test(userId) ||
      typeof blogId !== "string" || !NUMERIC_ID.test(blogId) ||
      typeof expectedName !== "string" || !expectedName.trim() ||
      expectedName.trim().length > 100 || /[\u0000-\u001f]/.test(expectedName)) {
    return {ready:false};
  }
  return {ready:true,token,userId,blogId,expectedName:expectedName.trim()};
}

function nameOf(profile) {
  const name = profile?.name ?? profile?.displayName ??
    profile?.blogName ?? profile?.title ?? profile?.description;
  return typeof name === "string" && name.length <= 200 ? name.trim() : "";
}
function selectProfiles(json) {
  const items = Array.isArray(json) ? json :
    Array.isArray(json?.data) ? json.data :
    Array.isArray(json?.profiles) ? json.profiles :
    Array.isArray(json?.result) ? json.result : null;
  return Array.isArray(items) && items.length <= 300 ? items : null;
}
const sameBrand = (a,b) => a.normalize("NFKC").toLowerCase() === b.normalize("NFKC").toLowerCase();

/**
 * Metricool Account Settings > API: requires a separately approved
 * Advanced/Custom REST API token + exact userId/blogId + expected brand name.
 * One GET of the documented official brand list; never infer provider posting
 * permission or connected social channels from this read-only receipt.
 */
export async function verifyMetricoolSiteBrand({
  environment = process.env,
  fetchFn = fetch,
}={}) {
  if (typeof window !== "undefined") return {state:"unavailable"};
  const config = metricoolSiteConfig(environment);
  if (!config.ready) return {state:"not_connected"};
  const url = new URL(API);
  url.searchParams.set("userId",config.userId);
  let controller;
  try {
    controller = new AbortController();
    const response = await fetchFn(url.href,{
      method:"GET",
      headers:{"X-Mc-Auth":config.token,Accept:"application/json"},
      cache:"no-store",credentials:"omit",redirect:"error",
      signal:AbortSignal.any([controller.signal,AbortSignal.timeout(9000)]),
    });
    if (response.status === 401 || response.status === 403) return {state:"auth_unverified"};
    if (!response.ok) return {state:"unavailable"};
    const length = Number(response.headers?.get?.("content-length")||"0");
    if (!Number.isFinite(length) || length > MAX_RESPONSE_BYTES) return {state:"unavailable"};
    const text = await response.text();
    if (text.length > MAX_RESPONSE_BYTES) return {state:"unavailable"};
    let json;
    try { json=JSON.parse(text); } catch {return {state:"unavailable"}}
    const entries=selectProfiles(json);
    if (!entries) return {state:"unavailable"};
    const selected=entries.filter(p=>{
      if (!p || typeof p!=="object" || Array.isArray(p)) return false;
      const id=p.blogId??p.id;
      return String(id)===config.blogId && NUMERIC_ID.test(String(id));
    });
    if (selected.length !== 1) return {state:"brand_unverified"};
    const name=nameOf(selected[0]);
    if (!name || !sameBrand(name,config.expectedName)) return {state:"brand_unverified"};
    return {state:"verified_read_only",blogId:config.blogId,brandName:name};
  } catch {
    return {state:"unavailable"};
  } finally {
    controller?.abort();
  }
}

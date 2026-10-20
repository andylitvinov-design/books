// Privacy-first attribution labels for voluntary public enquiries from paid ads.
// This is NOT conversion tracking. No cookies, storage, network requests or PII.
// Unknown campaign sources, duplicated fields and private query values fail closed.
import { safePublicWhatsAppPath, WHATSAPP_NUMBER } from "./whatsapp-enquiry.js";

const SOURCES = Object.freeze({
  facebook: Object.freeze({ label: "Facebook", medium: "paid_social" }),
  instagram: Object.freeze({ label: "Instagram", medium: "paid_social" }),
  google: Object.freeze({ label: "Google Ads", medium: "cpc" }),
  google_ads: Object.freeze({ label: "Google Ads", medium: "cpc" }),
});
// Exact approved campaign and creative codes, not arbitrary slug-shaped user text.
// Extend only after each new public ad campaign has been reviewed.
const APPROVED_CAMPAIGNS = new Set(["hh_free_review_en_toronto_202610"]);
const APPROVED_CREATIVES = new Set(["ad_a", "ad_b", "search_a"]);
const ALLOWED_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_content",
  // Providers can add click IDs; we never read, copy or transmit their values.
  "fbclid", "gclid", "gbraid", "wbraid", "gad_source",
]);
const PUBLIC_LANDING = /^\/(?:en|ru|es)\/services\/free-situation-review\/?$/;
const BASE = "https://holistichouse.vercel.app";

function privateOrUnknownQuery(params) {
  for (const key of params.keys()) {
    if (!ALLOWED_PARAMS.has(key) || params.getAll(key).length !== 1) return true;
  }
  return false;
}

/** Only whitelisted public source/campaign labels may be used for attribution. */
export function readPaidAdReferral(search, pathname) {
  if (typeof search !== "string" || search.length > 1500
      || typeof pathname !== "string" || !PUBLIC_LANDING.test(pathname)
      || !safePublicWhatsAppPath(pathname)) return null;
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (privateOrUnknownQuery(params)) return null;
  const source = params.get("utm_source");
  const medium = params.get("utm_medium");
  const campaign = params.get("utm_campaign");
  const content = params.get("utm_content");
  if (!source || !Object.hasOwn(SOURCES, source)
      || medium !== SOURCES[source].medium
      || !campaign || !APPROVED_CAMPAIGNS.has(campaign)
      || (content !== null && !APPROVED_CREATIVES.has(content))) return null;
  return Object.freeze({
    source: source === "google" ? "google_ads" : source,
    medium, label: SOURCES[source].label, campaign,
    ...(content !== null ? { content } : {}),
  });
}

/** A landing URL can be generated only for the approved public free-review offer. */
export function paidAdLandingUrl(pathname, {
  source, campaign, content = "ad_a",
} = {}) {
  if (typeof pathname !== "string" || !PUBLIC_LANDING.test(pathname)
      || !safePublicWhatsAppPath(pathname)
      || !source || !Object.hasOwn(SOURCES, source)
      || typeof campaign !== "string" || !APPROVED_CAMPAIGNS.has(campaign)
      || typeof content !== "string" || !APPROVED_CREATIVES.has(content)) {
    throw new TypeError("INVALID_PAID_AD_PUBLIC_LANDING");
  }
  const url = new URL(pathname, BASE);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", SOURCES[source].medium);
  url.searchParams.set("utm_campaign", campaign);
  url.searchParams.set("utm_content", content);
  return url.href;
}

/** Append only sanitized, non-personal labels to a user-controlled messenger draft.
 * No message is sent automatically; the person can review or remove the label.
 */
export function withPaidAdReferral(whatsappUrl, search, pathname, locale = "en") {
  const attribution = readPaidAdReferral(search, pathname);
  if (!attribution) return whatsappUrl;
  let url;
  try { url = new URL(whatsappUrl); } catch { return whatsappUrl; }
  if (url.origin !== "https://wa.me" || url.pathname !== "/" + WHATSAPP_NUMBER
      || [...url.searchParams.keys()].length !== 1 || !url.searchParams.has("text")) {
    return whatsappUrl;
  }
  const message = url.searchParams.get("text");
  if (!message || message.length > 8000) return whatsappUrl;
  const prefix = locale === "ru" ? "Рекламный источник"
    : locale === "es" ? "Origen publicitario" : "Ad referral";
  const suffix = "\n\n" + prefix + ": " + attribution.label + " · " + attribution.campaign
    + (attribution.content ? " · " + attribution.content : "");
  url.searchParams.set("text", message + suffix);
  return url.toString();
}

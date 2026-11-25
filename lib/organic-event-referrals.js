// Human-visible, first-party event referral labels for voluntary messenger enquiries.
// This is NOT a visit tracker: no cookies, no network calls, no browser storage.
// Only allow known public event channels, explicitly tagged organic event traffic,
// and short non-personal campaign slugs. Never carry arbitrary URL query data.
import { safePublicWhatsAppPath, WHATSAPP_NUMBER } from "./whatsapp-enquiry.js";

const SOURCES = Object.freeze({
  eventbrite: "Eventbrite",
  meetup: "Meetup",
  allevents: "AllEvents",
  luma: "Luma",
  humanitix: "Humanitix",
  tickettailor: "Ticket Tailor",
  google_business: "Google Business",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  telegram: "Telegram",
  partner: "Partner",
});
const MEDIUM = "organic_event";
const SLUG = /^[a-z0-9][a-z0-9_-]{2,63}$/;
const CONTENT = /^[a-z0-9][a-z0-9_-]{1,39}$/;
const FIRST_PARTY = "https://holistichouse.vercel.app";
const PUBLIC_DESTINATION = /^\/(?:en|ru|es)\/services\/(?:free-situation-review|andy-litvinov\/free-wu-xing-diagnostic)\/?$/;

function single(params, name) {
  const values = params.getAll(name);
  return values.length === 1 ? values[0] : null;
}
function validContent(value) {
  return value === null || CONTENT.test(value);
}

/** Invalid, duplicated or personal query data is silently ignored, not echoed. */
export function readOrganicEventReferral(search, pathname) {
  if (typeof search !== "string" || search.length > 1500
      || typeof pathname !== "string" || !safePublicWhatsAppPath(pathname)) return null;
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  // Never label an untrusted or ad click as this site's verified organic event.
  const source = single(params, "utm_source");
  const medium = single(params, "utm_medium");
  const campaign = single(params, "utm_campaign");
  const content = params.has("utm_content") ? single(params, "utm_content") : null;
  if (!source || !Object.hasOwn(SOURCES, source) || medium !== MEDIUM
      || !campaign || !SLUG.test(campaign) || !validContent(content)
      || (params.has("utm_content") && content === null)) return null;
  // If any URL parameter may contain visitor information, fail closed.
  for (const name of params.keys()) {
    if (/^(?:email|phone|name|client_id|user_id|token|answer|response|q|note|message|diagnosis|symptom|health|secret|access_key)$/i.test(name)) return null;
  }
  return Object.freeze({ source, label: SOURCES[source], campaign, ...(content ? { content } : {}) });
}

/** Generate a first-party landing link without redirect and without identity tags. */
export function organicEventLandingUrl(pathname, { source, campaign, content = "listing" } = {}) {
  if (typeof pathname !== "string" || !PUBLIC_DESTINATION.test(pathname)
      || !Object.hasOwn(SOURCES, source) || typeof campaign !== "string"
      || !SLUG.test(campaign) || !CONTENT.test(content)) {
    throw new TypeError("INVALID_PUBLIC_EVENT_REFERRAL_LINK");
  }
  const url = new URL(pathname, FIRST_PARTY);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", MEDIUM);
  url.searchParams.set("utm_campaign", campaign);
  url.searchParams.set("utm_content", content);
  return url.href;
}

/** Append only public source/campaign to a prepared WhatsApp enquiry.
 * The user still reviews and presses Send in their messenger.
 */
export function withOrganicEventReferral(whatsappUrl, search, pathname, locale = "en") {
  const attribution = readOrganicEventReferral(search, pathname);
  if (!attribution) return whatsappUrl;
  let url;
  try { url = new URL(whatsappUrl); } catch { return whatsappUrl; }
  if (url.origin !== "https://wa.me" || url.pathname !== "/" + WHATSAPP_NUMBER
      || [...url.searchParams.keys()].length !== 1 || !url.searchParams.has("text")) return whatsappUrl;
  const message = url.searchParams.get("text");
  if (!message || message.length > 8000) return whatsappUrl;
  const label = locale === "ru" ? "Источник мероприятия"
    : locale === "es" ? "Origen del evento" : "Event referral";
  const channel = attribution.label;
  const suffix = `\n\n${label}: ${channel} · ${attribution.campaign}`;
  url.searchParams.set("text", message + suffix);
  return url.toString();
}

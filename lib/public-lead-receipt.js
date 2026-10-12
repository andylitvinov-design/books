const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const topics = new Set(["personal", "goal", "business", "wellbeing"]);
const locales = new Set(["en", "ru", "es"]);
const contacts = new Set(["email", "whatsapp"]);
const trackingToken = /^[a-z0-9][a-z0-9_-]{0,79}$/i;

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizePublicLeadReceipt(input) {
  if (!input || input.consentToContact !== true) return null;
  const email = clean(input.email).toLowerCase();
  const preferredContact = clean(input.preferredContact);
  const topic = clean(input.topic);
  const locale = clean(input.locale);
  if (!emailPattern.test(email) || email.length > 254 || !contacts.has(preferredContact) || !topics.has(topic) || !locales.has(locale)) return null;
  return { email, preferredContact, topic, locale };
}

export function publicLeadAttribution(params) {
  const source = clean(params?.get("utm_source"));
  const medium = clean(params?.get("utm_medium"));
  const campaign = clean(params?.get("utm_campaign"));
  const content = clean(params?.get("utm_content"));
  const result = {};
  if (trackingToken.test(source)) result.source = source.toLowerCase();
  if (trackingToken.test(medium)) result.medium = medium.toLowerCase();
  if (trackingToken.test(campaign)) result.campaign = campaign.toLowerCase();
  if (trackingToken.test(content)) result.content = content.toLowerCase();
  return result;
}

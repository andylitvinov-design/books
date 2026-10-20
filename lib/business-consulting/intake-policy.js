// Pure public business enquiry validation; never imply marketing consent or booking.
/** The single public contact field explicitly opts for email or WhatsApp replies. */
export function parseBusinessReplyContact(value) {
  const contact = typeof value === "string" ? value.trim() : "";
  if (!contact) return null;
  if (contact.includes("@")) {
    const email = contact.toLowerCase();
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? {email, phone:"", replyChannel:"email"} : null;
  }
  const phone = contact.replace(/[\s().-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(phone)
    ? {email:"", phone, replyChannel:"whatsapp"} : null;
}

export const BUSINESS_FORMATS = Object.freeze(["free", "express", "full", "mentoring"]);
export const BUSINESS_REPLY_CHANNELS = Object.freeze(["email", "sms", "phone", "whatsapp"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BAD = /[\u0000-\u001f\u007f]/;
export function validateBusinessEnquiry(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("INVALID_REQUEST");
  const allowed = ["operationId", "locale", "format", "name", "email", "phone", "question", "contactConsent", "replyChannel", "website", "attribution"];
  if (Object.keys(raw).some(key => !allowed.includes(key))) throw new Error("INVALID_REQUEST");
  const { operationId, locale, format } = raw;
  if (typeof operationId !== "string" || !UUID.test(operationId)) throw new Error("INVALID_REQUEST");
  if (!["en","ru","es"].includes(locale) || !BUSINESS_FORMATS.includes(format)) throw new Error("INVALID_REQUEST");
  if (raw.contactConsent !== true) throw new Error("CONSENT_REQUIRED");
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  const phone = typeof raw.phone === "string" ? raw.phone.replace(/[\s().-]/g,"") : "";
  const question = typeof raw.question === "string" ? raw.question.trim() : "";
  if (name.length < 2 || name.length > 120 || BAD.test(name)) throw new Error("INVALID_NAME");
  if (email.length > 254 || (email && !EMAIL.test(email))) throw new Error("INVALID_CONTACT");
  if (phone.length > 40 || (phone && !/^\+[1-9]\d{7,14}$/.test(phone))) throw new Error("INVALID_CONTACT");
  if (!email && !phone) throw new Error("CONTACT_REQUIRED");
  // A preference permits a reply about THIS enquiry only; never marketing SMS.
  const replyChannel = raw.replyChannel === undefined ? null : raw.replyChannel;
  if (replyChannel !== null && !BUSINESS_REPLY_CHANNELS.includes(replyChannel))
    throw new Error("INVALID_REPLY_CHANNEL");
  if (replyChannel === "email" && !email) throw new Error("INVALID_REPLY_CHANNEL");
  if (replyChannel && replyChannel !== "email" && !phone) throw new Error("INVALID_REPLY_CHANNEL");
  if ((question.length > 0 && question.length < 5) || question.length > 700 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(question))
    throw new Error("INVALID_QUESTION");
  if (raw.website !== undefined && typeof raw.website !== "string") throw new Error("INVALID_REQUEST");
  if (raw.attribution !== undefined && (!raw.attribution || typeof raw.attribution !== "object" || Array.isArray(raw.attribution) ||
      Object.keys(raw.attribution).some(k => !["source","medium","campaign"].includes(k))))
    throw new Error("INVALID_REQUEST");
  const attribution = {};
  for (const key of ["source","medium","campaign"]) {
    const value = raw.attribution?.[key];
    if (typeof value === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(value)) attribution[key] = value;
  }
  return { operationId, locale, format, name, email, phone, question, replyChannel, contactConsent:true, attribution,
    honeypot: Boolean(raw.website?.trim()) };
}

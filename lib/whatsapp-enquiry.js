// Shared, privacy-aware WhatsApp handoff for Holistic House public enquiry CTAs.
// Every prefilled message identifies the service and the precise requested action.
// This only creates a link: visitors must confirm Send in WhatsApp themselves.
export const WHATSAPP_NUMBER = "14376066502";
const ORIGIN = "https://holistichouse.vercel.app";
const translations = {
  en: {
    greeting: "Hello Andrey!",
    headline: "Holistic House — service enquiry",
    service: "Service",
    request: "Request",
    option: "Selected option",
    topic: "Topic",
    context: "Context",
    page: "Page",
  },
  ru: {
    greeting: "Здравствуйте, Андрей!",
    headline: "Holistic House — запрос по услуге",
    service: "Услуга",
    request: "Запрос",
    option: "Выбранный вариант",
    topic: "Тема",
    context: "Контекст",
    page: "Страница",
  },
  es: {
    greeting: "Hola Andrey.",
    headline: "Holistic House — solicitud de servicio",
    service: "Servicio",
    request: "Solicitud",
    option: "Opción elegida",
    topic: "Tema",
    context: "Contexto",
    page: "Página",
  },
};

// Only include publicly navigable page URLs. Never send private/client routes,
// tokens, URL search parameters, result IDs or test reports through WhatsApp.
export function safePublicWhatsAppPath(pathname) {
  if (typeof pathname !== "string" || !pathname.startsWith("/") || pathname.startsWith("//")) return "";
  const path = pathname.split(/[?#]/, 1)[0];
  if (!path || path.length > 600 || /[\u0000-\u001f\\]/.test(path)) return "";
  const normalized = path.replace(/^\/(?:en|ru|es)(?=\/|$)/, "") || "/";
  if (/^\/(?:client|app|admin|api|auth|login|signup|register|account|settings|profile|dashboard|tests|test-results|reports|report|prescriptions|document-preview|practitioner|private|checkout|payments)(?:\/|$)/i.test(normalized)) return "";
  if (!/^\/(?:academy|courses|training|homeopathy|library|books|book|wu-xing|remedies|articles|stories|guides|services|toronto|masters|about|contact)(?:\/|$)/i.test(normalized)) return "";
  return path;
}

function tidy(value) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 500)
    : "";
}

export function whatsappEnquiryUrl({ locale = "en", service, request, option, topic, context, pagePath } = {}) {
  const strings = translations[locale] || translations.en;
  const serviceText = tidy(service);
  const requestText = tidy(request);
  if (!serviceText || !requestText) throw new Error("WhatsApp enquiry requires explicit service and request");
  const lines = [
    strings.greeting,
    strings.headline,
    "",
    strings.service + ": " + serviceText,
    strings.request + ": " + requestText,
  ];
  for (const [label, value] of [
    [strings.option, option],
    [strings.topic, topic],
    [strings.context, context],
  ]) {
    const valueText = tidy(value);
    if (valueText) lines.push(label + ": " + valueText);
  }
  const safePath = safePublicWhatsAppPath(pagePath);
  if (safePath) lines.push(strings.page + ": " + ORIGIN + safePath);
  return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
}

// Telegram supports ?text= on direct username deep links. Reuse the exact
// privacy-filtered WhatsApp draft so channel choice never drops the service,
// selected option or public source page. Neither channel sends automatically.
export const TELEGRAM_USERNAME = "AndyTherapist";

export function telegramEnquiryUrlFromWhatsApp(whatsappUrl) {
  const url = new URL(whatsappUrl);
  if (url.origin !== "https://wa.me" || url.pathname !== "/" + WHATSAPP_NUMBER) {
    throw new Error("Telegram enquiry requires a trusted Holistic House WhatsApp draft");
  }
  const message = url.searchParams.get("text");
  if (!message) throw new Error("Telegram enquiry requires a prepared request");
  return "https://t.me/" + TELEGRAM_USERNAME + "?text=" + encodeURIComponent(message);
}

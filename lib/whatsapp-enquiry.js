import {HOLISTIC_TELEGRAM_ACCOUNT,telegramBusinessServiceTitle,telegramServiceRequestUrl} from './assist/telegram-business-request.mjs';
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
  // The public home itself hosts a consented, phone-only free-review request.
  // Keep these exact paths public without opening private cabinet routes.
  if (["/", "/en", "/ru", "/es"].includes(path)) return path;
  const normalized = path.replace(/^\/(?:en|ru|es)(?=\/|$)/, "") || "/";
  if (/^\/(?:client|app|admin|api|auth|login|signup|register|account|settings|profile|dashboard|tests|test-results|reports|report|prescriptions|document-preview|practitioner|private|checkout|payments)(?:\/|$)/i.test(normalized)) return "";
  // The catalog cart has no customer-specific URL, but can host a reply-consented order.
  if (normalized === "/cart") return path;
  // Exact public Fu basket only, including Google OAuth reply-only continuation.
  if (normalized === "/talismans/cart") return path;
  // Public alternate Reiki gallery supports reply-consented contact registration.
  // Exact path only; no private nested pages or user-specific query strings.
  if (normalized === "/holistic-support/mobile") return path;
  // Exact public Video Studio page: a consented course enquiry may originate here.
  // Nested private paths, query parameters and fragments are never accepted as source evidence.
  if (normalized === "/holistic-support/mandala") return path;
  // This includes the consented Holistic Support master-enquiry form, not client health data.
  if (/^\/(?:explore\/(?:energy|love|business)|pro|holistic-support|coaching(?:\/intake)?)\/?$/.test(normalized)) return path;
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

// Service buttons always open the owner's real @holistichouse chat.
// Forward ONLY the public service title, never WhatsApp's optional question,
// topic, health context, contact details or draft notes into a Telegram URL.
// A supported exact title receives the server-recognized one-time service code;
// any other offer stays an honest manual request, NOT a diagnostic interview.
export const TELEGRAM_USERNAME = HOLISTIC_TELEGRAM_ACCOUNT;
const TELEGRAM_SERVICE_KEYS = Object.freeze(['homeopathy','coaching','reiki','constellations','business']);
const TELEGRAM_SERVICE_LABEL = Object.freeze({en:'Service',ru:'Услуга',es:'Servicio'});
const TELEGRAM_UNKNOWN_TITLE = Object.freeze({en:'a Holistic House service',ru:'услуга Holistic House',es:'un servicio de Holistic House'});

export function telegramEnquiryUrlFromWhatsApp(whatsappUrl) {
  const url = new URL(whatsappUrl);
  if (url.origin !== 'https://wa.me' || url.pathname !== '/' + WHATSAPP_NUMBER) {
    throw new Error('Telegram enquiry requires a trusted Holistic House WhatsApp draft');
  }
  const message = url.searchParams.get('text');
  if (!message) throw new Error('Telegram enquiry requires a prepared request');
  const lines = message.split(/\r?\n/);
  const entry = Object.entries(TELEGRAM_SERVICE_LABEL).map(([locale,label])=>({
    locale, line:lines.find(value=>value.startsWith(label+': ')),label,
  })).find(candidate=>candidate.line);
  if (!entry) throw new Error('Telegram enquiry requires a public selected service');
  const rawName = tidy(entry.line.slice(entry.label.length+2));
  const cleanName = rawName.replace(/\[HH-REQ:[^\]]*\]/gi,'').trim();
  // A suspicious or oversized free-text title must not enter a messenger URL.
  const title = cleanName.length>=2 && cleanName.length<=140 &&
    !/https?:\/\/|@[A-Za-z0-9_]{3,}|[<>{}]/i.test(cleanName)
      ?cleanName:TELEGRAM_UNKNOWN_TITLE[entry.locale];
  for (const service of TELEGRAM_SERVICE_KEYS) {
    if (title===telegramBusinessServiceTitle(service,entry.locale)) {
      return telegramServiceRequestUrl(service,entry.locale);
    }
  }
  const intro = entry.locale==='ru'?'Здравствуйте! Меня интересует «':
    entry.locale==='es'?'¡Hola! Me interesa «':'Hello! I am interested in «';
  const text = intro+title+'». '+(entry.locale==='ru'
    ?'Подскажите, как оформить запрос.':entry.locale==='es'
      ?'¿Cómo puedo solicitarlo?':'Could you help me make a request?');
  return 'https://t.me/'+TELEGRAM_USERNAME+'?text='+encodeURIComponent(text);
}

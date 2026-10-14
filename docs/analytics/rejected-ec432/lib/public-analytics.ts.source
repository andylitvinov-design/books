export const PUBLIC_ANALYTICS_EVENTS = [
  "free_situation_assessment_click",
  "free_questionnaire_started",
  "free_questionnaire_prepared",
  "whatsapp_handoff_click",
  "academy_course_enquiry_click",
  "academy_level_one_initiation_enquiry_click",
  "academy_personal_initiation_enquiry_click",
  "academy_study_material_request_click",
] as const;

export type PublicAnalyticsEvent = (typeof PUBLIC_ANALYTICS_EVENTS)[number];

export type PublicAnalyticsGtag = (...args: unknown[]) => void;

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: PublicAnalyticsGtag; [key: `ga-disable-${string}`]: boolean | undefined; }
}

let ownedTag: { measurementId: string; gtag: PublicAnalyticsGtag } | undefined;
let documentResetRequested = false;

export function registerPublicAnalyticsTag(measurementId: string, gtag: PublicAnalyticsGtag) {
  ownedTag = { measurementId, gtag };
}

export function ownsPublicAnalyticsTag(measurementId?: string) {
  return Boolean(ownedTag && window.gtag === ownedTag.gtag
    && (!measurementId || measurementId === ownedTag.measurementId));
}

export function analyticsDocumentResetPending() {
  return documentResetRequested;
}

export function resetAnalyticsDocument() {
  if (!ownsPublicAnalyticsTag() || documentResetRequested) return;
  // A disabled tag can still accumulate engagement time. Destroy the document
  // rather than reuse that SDK after private/off time. The flag closes the
  // collection gate immediately, while the browser performs the reload.
  documentResetRequested = true;
  window.location.reload();
}

export function updatePublicAnalyticsConsent(value: "granted" | "denied") {
  if (!ownsPublicAnalyticsTag()) return;
  ownedTag?.gtag("consent", "update", {
    analytics_storage: value,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

export function emitPublicAnalyticsEvent(event: PublicAnalyticsEvent) {
  if (document.documentElement.dataset.analyticsConsent !== "granted") return;
  window.dispatchEvent(new CustomEvent("holistic-house:acquisition", { detail: { event } }));
}

export function isPublicAnalyticsPath(pathname: string) {
  let normalized = pathname;
  try {
    // Fail closed on malformed or deeply encoded paths. Encoded private route
    // names must not bypass the same boundary used by the consent component.
    for (let attempt = 0; attempt < 3 && normalized.includes("%"); attempt++) {
      normalized = decodeURIComponent(normalized);
    }
  } catch {
    return false;
  }
  if (!normalized.startsWith("/") || normalized.startsWith("//") || normalized.includes("%")
    || normalized.includes("\\") || /(?:^|\/)\.{1,2}(?:\/|$)/.test(normalized)) return false;
  return !/^\/(?:(?:en|ru|es)\/)?(?:admin|api|document-preview|app|client|report|prescriptions)(?:\/|$)/i.test(normalized);
}


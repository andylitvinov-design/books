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


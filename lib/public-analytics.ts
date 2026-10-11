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
  return !/^\/(?:admin|api|document-preview)(?:\/|$)|^\/(?:en|ru|es)\/(?:app|client|report|prescriptions)(?:\/|$)/.test(pathname);
}

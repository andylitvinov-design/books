export const DIAGNOSTIC_START_KEY: string;
export const DIAGNOSTIC_SERVICE_TITLES: Readonly<Record<"free" | "short" | "full", string>>;
export function parseDiagnosticStart(
  raw: unknown, locale: "en" | "ru" | "es", now?: number
): null | { name: string; email: string; phone: string; question: string; topic: string };
export function buildCoachingDiagnosticEnquiry(raw: unknown): {
  operationId: string; locale: string; serviceTitle: string; description: string;
  sourcePath: string; contact: { displayName: string; email: string; phone: string };
  contactConsent: true; website: string;
};

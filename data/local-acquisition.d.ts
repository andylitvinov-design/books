export type AcquisitionEvent =
  | "gbp_landing_view"
  | "service_view"
  | "practitioner_view"
  | "self_check_start"
  | "contact_click"
  | "service_request_start";

export type AcquisitionService = {
  id: "hypnotherapy" | "systemic-constellations" | "business-decision-constellations" | "reiki-energy-work";
  title: string;
  subtitle: string;
  text: string;
};

export type LocalAcquisitionEntry = {
  hero: { eyebrow: string; title: string; intro: string; servicesLabel: string };
  selfCheck: { title: string; text: string; label: string; href: string };
  practitioner: { label: string; text: string; href: string };
  services: readonly AcquisitionService[];
};

export const ACQUISITION_EVENTS: readonly AcquisitionEvent[];
export const LOCAL_ACQUISITION: Readonly<Record<"en" | "ru", LocalAcquisitionEntry>>;
export function gbpHref(href: string): string;

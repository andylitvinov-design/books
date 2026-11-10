export type PublicReikiAcademyOption = {
  id: string;
  amountEur: number | null;
  durationMinutes: number | null;
  label: string;
};
export type PublicReikiAcademyOffer = {
  id: string;
  kind: "initiation" | "course";
  title: string;
  description: string;
  method: string;
  href: string;
  priceOptions: PublicReikiAcademyOption[];
  source: "public_academy";
  deliveryTiming: null;
  reportMode: null;
  certificateAvailable: null;
};
export declare function listPublicReikiAcademyOffers(locale?: "en" | "ru" | "es"): PublicReikiAcademyOffer[];
export declare function filterPublicReikiAcademyOffers(
  locale: "en" | "ru" | "es",
  options?: {kind?: "initiation" | "course"; price?: "all" | "free" | "low" | "mid" | "high" | "premium"}
): PublicReikiAcademyOffer[];

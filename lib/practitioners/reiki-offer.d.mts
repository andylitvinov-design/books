export type ReikiKind = 'session' | 'initiation' | 'course';
export type ReikiTiming = 'day' | 'days' | 'chosen';
export type ReikiReport = 'brief' | 'text' | 'voice';
export type ReikiVariant = { duration: 10 | 20 | 30 | 60 | null; report: ReikiReport; certificate: boolean; price: number };
export type ReikiOffer = {
  kind: ReikiKind; currency: 'EUR' | 'CAD' | 'USD';
  timings: ReikiTiming[]; role: 'practitioner' | 'master' | null; variants: ReikiVariant[];
};
export type ReikiFilter = {
  kind: ReikiKind; price?: 'all' | 'free' | 'low' | 'mid' | 'high' | 'premium';
  time?: 'any' | ReikiTiming; report?: ReikiReport; role?: 'any' | 'practitioner' | 'master';
  certificate?: boolean;
};
export declare const REIKI_KINDS: ReikiKind[];
export declare const REIKI_TIMINGS: ReikiTiming[];
export declare const REIKI_REPORTS: ReikiReport[];
export declare const REIKI_DURATIONS: number[];
export declare function normalizeReikiOffer(value: unknown, options?: {complete?: boolean}): ReikiOffer | null;
export declare function reikiOfferPricing(offer: ReikiOffer | null): {
  pricingMode: 'contact' | 'free' | 'fixed' | 'from'; confirmedPrice: number | null; currency: string;
};
export declare function matchesReikiEuroPrice(currency: string, band: NonNullable<ReikiFilter['price']>, price: number): boolean;
export declare function matchReikiVariants(offer: ReikiOffer | null | undefined, filter: ReikiFilter): ReikiVariant[];

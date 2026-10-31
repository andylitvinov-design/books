export interface PublicEnquiryAttribution {
  landingPath: string;
  previousPath: string | null;
  trafficSource: string;
  campaign?: string;
}
export interface PublicEnquiryCookie extends PublicEnquiryAttribution {
  lastPath: string;
}
export declare const ENQUIRY_ATTRIBUTION_COOKIE: string;
export declare const ENQUIRY_ATTRIBUTION_TTL: number;
export declare function normalizeEnquiryAttribution(value: unknown): PublicEnquiryAttribution | null;
export declare function parseEnquiryAttributionCookie(raw: unknown): PublicEnquiryCookie | null;
export declare function advanceEnquiryAttribution(
  raw: string, context: { path: string; href: string; referrer: string }
): string | null;
export declare function readPublicEnquiryAttribution(request: unknown): PublicEnquiryAttribution | null;

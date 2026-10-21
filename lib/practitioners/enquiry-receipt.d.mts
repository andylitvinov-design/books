export declare const RECEIPT_SESSION_KEY: string;
export declare const RECEIPT_TTL_MS: number;
export type EnquiryReceipt = { referenceCode: string; createdAt: number };
export declare function parseEnquiryReceipt(raw: unknown, now?: number): EnquiryReceipt | null;

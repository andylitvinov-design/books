// Types for the shared JS WhatsApp handoff. Runtime validation still prevents
// sending a link without a named service and a specific request.
export type WhatsAppEnquiryArgs = {
  locale?: string;
  service: string;
  request: string;
  option?: string;
  topic?: string;
  context?: string;
  pagePath?: string;
};

export declare const WHATSAPP_NUMBER: string;
export declare function safePublicWhatsAppPath(pathname: unknown): string;
export declare function whatsappEnquiryUrl(args: WhatsAppEnquiryArgs): string;

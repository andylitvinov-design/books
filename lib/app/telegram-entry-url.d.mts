/** An allowlisted Telegram invite, never a Supabase session or CRM proof. */
export declare function resolveTelegramFirstEntry(payload:unknown,locale:"en"|"ru"|"es"):{href:string;kind:"direct"|"review"}|null;
/** A public HH-REQ code is syntactically valid for this locale. */
export declare function isTelegramServiceDraft(telegramUrl:string,locale:"en"|"ru"|"es"):boolean;
/** Only public service and locale codes enter the intermediate route. */
export declare function resolveTelegramServiceHandoffUrl(telegramUrl:string,locale:"en"|"ru"|"es"):string|null;
/** Only an explicitly supported public service may enter the verified V3 bot. */
export declare function resolveTelegramServiceEntry(payload:unknown,telegramUrl:string,locale:"en"|"ru"|"es"):{href:string;kind:"service"}|null;

/** Canonical public free-review marker, not person identity or CRM access. */
export declare function isOfficialFreeReviewWhatsAppDraft(
 whatsappUrl:string,locale:"en"|"ru"|"es"
):boolean;

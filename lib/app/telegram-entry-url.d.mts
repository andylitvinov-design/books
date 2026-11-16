/** An allowlisted Telegram invite, never a Supabase session or CRM proof. */
export declare function resolveTelegramFirstEntry(payload:unknown,locale:"en"|"ru"|"es"):{href:string;kind:"direct"|"review"}|null;
/** Only an explicitly supported public service may enter the verified V3 bot. */
export declare function resolveTelegramServiceEntry(payload:unknown,telegramUrl:string,locale:"en"|"ru"|"es"):{href:string;kind:"service"}|null;

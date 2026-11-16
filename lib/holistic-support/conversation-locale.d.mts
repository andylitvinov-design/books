export type ConversationLocale = "ru" | "en" | "es";
export function detectConversationLocale(message:unknown,fallback?:ConversationLocale):ConversationLocale;

/** Public practitioner slug only. Null means the general private inbox. */
export declare function directMessengerRecipient(value: unknown): string | null;
/** Fixed, same-origin private Messenger URL. Throws for unsupported locales/slugs. */
export declare function directMessengerReturnPath(
  locale: 'en' | 'ru' | 'es', recipientSlug?: string | null,
): string;

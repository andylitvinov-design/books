/** Public practitioner slug only. Null means the general private inbox. */
export declare function directMessengerRecipient(value: unknown): string | null;
/** Fixed, same-origin private Messenger URL. Throws for unsupported locales/slugs. */
export declare function directMessengerReturnPath(
  locale: 'en' | 'ru' | 'es', recipientSlug?: string | null,
): string;
/** EN/RU/ES onboarding with safe return to the original Messenger language. */
export declare function directMessengerSetupPath(
  locale: 'en' | 'ru' | 'es', recipientSlug?: string | null,
): string;

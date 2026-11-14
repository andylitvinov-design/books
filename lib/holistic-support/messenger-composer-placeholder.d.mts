import type { PublicLocale } from "../public-locales";

export declare const MESSENGER_COMPOSER_HINTS: Readonly<Record<PublicLocale, readonly string[]>>;
export declare function animateMessengerComposerPlaceholder(
  input: HTMLTextAreaElement,
  locale: PublicLocale,
  fallback: string,
): () => void;

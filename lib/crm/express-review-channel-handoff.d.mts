// Declaration for the pure browser/server handoff module; no provider API.
export declare const EXPRESS_REVIEW_LOCALES: ReadonlyArray<'en'|'ru'|'es'>;
export declare function whatsappExpressReviewHandoff(locale:string):string|null;
export declare function whatsappExpressReviewLocale(text:unknown):'en'|'ru'|'es'|null;

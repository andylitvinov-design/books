export type ApprovedHolisticHousePresentation = Readonly<{
  locale: "ru" | "en" | "es";
  youtubeId: string;
  url: string;
  durationSeconds: number;
  title: string;
}>;
export declare const HOLISTIC_HOUSE_PRESENTATION_VIDEO: string;
export declare const APPROVED_HOLISTIC_HOUSE_PRESENTATIONS: Readonly<{
  ru: ApprovedHolisticHousePresentation;
  en: null;
  es: null;
}>;
export declare function approvedTelegramPresentation(locale: string): ApprovedHolisticHousePresentation | null;
export declare function telegramPresentationOnStart(rawText: unknown): boolean;
export declare function telegramPresentationMessage(text: string, locale: string, show?: boolean): {
  text: string;
  linkPreview: null | {
    is_disabled: false;
    url: string;
    prefer_large_media: true;
    show_above_text: true;
  };
};

/** Typed contract for the original, local-only video quick templates. */
export type VideoTemplateLocale = "ru" | "en" | "es";
export type VideoTemplateTheme = "money" | "energy" | "relationships" | "goals" | "life" | "health";
export type VideoQuickTemplate = Readonly<{
  id: string;
  theme: VideoTemplateTheme;
  style: "warm" | "nature" | "dream" | "minimal";
  aspect: "landscape" | "portrait" | "square";
  durationSeconds: 20 | 30 | 60;
  motion: "slow" | "dynamic";
  music: "none" | "harmony" | "meditation";
  caption: boolean;
  title: Readonly<Record<VideoTemplateLocale, string>>;
  hint: Readonly<Record<VideoTemplateLocale, string>>;
  wish: Readonly<Record<VideoTemplateLocale, string>>;
}>;
export type VideoQuickTemplatePreferences = Readonly<
  Pick<VideoQuickTemplate, "theme" | "style" | "aspect" | "durationSeconds" | "motion" | "music" | "caption">
  & { avoid: string }
>;
export const VIDEO_QUICK_TEMPLATES: readonly VideoQuickTemplate[];
export function getVideoQuickTemplateDraft(
  id: string,
  locale?: VideoTemplateLocale,
  existingAvoid?: string,
): Readonly<{
  id: string;
  wish: string;
  preferences: VideoQuickTemplatePreferences;
}> | null;

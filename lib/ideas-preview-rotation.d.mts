import type { IdeasAphorism } from "./ideas-guidance.mjs";
export declare function pickIdeasPreviewAphorisms(
  locale: "en" | "ru" | "es", previousIds?: string[], random?: () => number
): IdeasAphorism[];
export declare function rotateIdeasPreviewAphorisms(
  locale: "en" | "ru" | "es",
  storage?: Pick<Storage, "getItem" | "setItem"> | null
): IdeasAphorism[];

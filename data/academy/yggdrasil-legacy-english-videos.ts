// Provenance audit: these historical YouTube IDs were mistakenly labelled
// as Reiki Yggdrasil explanations, lessons or attunements. They are NOT
// suitable for the requested guided meditations. Confirmed real titles below
// came from individual public YouTube metadata checks on 2026-10-08.
export type LegacyVideoAudit = {
  youtubeId: string;
  classification: "testimonial" | "needs-verification";
  observedTitle: string;
};

export const yggdrasilLegacyEnglishVideoSource = "https://psitrends.com/studies/master-taory";
export const yggdrasilMislabelledLegacyVideos: readonly LegacyVideoAudit[] = [
  { youtubeId: "XvMdX5czoOc", classification: "testimonial", observedTitle: "Video testimonial, as promised. Part 1." },
  { youtubeId: "hjmVJrgEsZ8", classification: "needs-verification", observedTitle: "Title not confirmed" },
  { youtubeId: "u275Zz78vhs", classification: "testimonial", observedTitle: "Video testimonial, as promised. Part 3." },
  { youtubeId: "wN_SNwZ1Epo", classification: "needs-verification", observedTitle: "Title not confirmed independently" },
  { youtubeId: "3Apc8P1Yudc", classification: "testimonial", observedTitle: "Testimonial (2) Reiki Yggdrasil Course" },
  { youtubeId: "Hk9XpeUI0BQ", classification: "testimonial", observedTitle: "Video testimonial, as promised. Part 6." },
  { youtubeId: "p29qu8-dtZk", classification: "testimonial", observedTitle: "Video testimonial, as promised. Part 8." },
  { youtubeId: "0G_xvbuClII", classification: "testimonial", observedTitle: "Video testimonial, as promised. Part 5." },
  { youtubeId: "3msoUyWr6bY", classification: "testimonial", observedTitle: "Video testimonial, as promised. Part 4." },
  { youtubeId: "Nx8DwWk27VY", classification: "testimonial", observedTitle: "Video testimonial, as promised. Part 7." },
];

// Compatibility exports deliberately EMPTY: an unverified testimonial must
// never be silently mapped into an instructional step or video guide.
export type YggdrasilLegacyVideo = { youtubeId: string; title: string; language: "en"; kind: "overview" | "attunement" | "testimonial"; stepId?: string; sourcePage: string };
export const yggdrasilEnglishOverviewVideos: YggdrasilLegacyVideo[] = [];
export const yggdrasilEnglishStepVideos: Record<string, YggdrasilLegacyVideo[]> = {};

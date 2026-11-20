/** Canonical six non-esoteric Support entrances, each targeting a visible three-offer group.
 * Legacy aliases remain for pre-existing links; Shamanica is a separate route.
 */
export const servicesCategoryTargets = {
  // The first screen is a six-choice gateway. All targets are already published.
  diagnostics: "consultation",
  business: "business",
  homeopathy: "homeopathy",
  coaching: "coach",
  psychotherapy: "services",
  video: "video",
  // Below-the-fold/legacy options remain compatible; their panels belong to other PRs.
  therapy: "consultation",
  constellations: "services",
  tests: "browse",
  learning: "courses",
  practice: "reiki",
  study: "courses",
  videos: "video",
} as const;

export type ServicesQuickCategory = keyof typeof servicesCategoryTargets;

export function serviceGroupAnchor(group: string): string {
  return "service-group-" + group;
}

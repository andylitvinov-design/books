/** Canonical six non-esoteric Support entrances, each targeting a visible three-offer group.
 * Legacy aliases remain for pre-existing links; Shamanica is a separate route.
 */
export const servicesCategoryTargets = {
  therapy: "consultation",
  homeopathy: "homeopathy",
  constellations: "services",
  business: "business",
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

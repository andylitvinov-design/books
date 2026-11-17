/** One source of truth for six photo categories and the optional business shortcut.
 * Targets are real, always-visible three-offer groups on the same /{locale}/services page.
 * Full-description links inside each offer remain separate routes by explicit user choice.
 */
export const servicesCategoryTargets = {
  therapy: "consultation",
  homeopathy: "homeopathy",
  constellations: "services",
  practice: "reiki",
  study: "courses",
  videos: "video",
  business: "services",
} as const;

export type ServicesQuickCategory = keyof typeof servicesCategoryTargets;

export function serviceGroupAnchor(group: string): string {
  return "service-group-" + group;
}

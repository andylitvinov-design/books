export const META_PILOT = Object.freeze({
  status: "PAUSED",
  currency: "CAD",
  dailyBudgetCad: 5,
  durationDays: 7,
  lifetimeBudgetCad: 35,
  campaigns: 1,
  adSets: 1,
  maxAds: 2,
  objective: "traffic_to_public_landing_page",
  landingPath: "/en/services/free-situation-review",
  creatives: [
    {
      id: "andrey-library-portrait",
      feed4x5: "/ads/meta/free-review-andrey-feed-4x5-v1.png",
      story9x16: "/ads/meta/free-review-andrey-stories-9x16-v1.png",
    },
    {
      id: "drawing-process",
      status: "OWNER_ASSET_APPROVAL_REQUIRED",
    },
  ],
  stageTwoAllowedWithoutOwnerApproval: false,
});

export function validateMetaPilot(pilot, { minimumDailyBudgetCad } = {}) {
  if (!pilot || pilot.status !== "PAUSED") return { valid: false, reason: "PILOT_MUST_REMAIN_PAUSED" };
  if (pilot.currency !== "CAD" || pilot.dailyBudgetCad !== 5 || pilot.durationDays !== 7 || pilot.lifetimeBudgetCad !== 35)
    return { valid: false, reason: "PILOT_BUDGET_OUTSIDE_OWNER_APPROVAL" };
  if (pilot.campaigns !== 1 || pilot.adSets !== 1 || pilot.maxAds > 2)
    return { valid: false, reason: "PILOT_STRUCTURE_OUTSIDE_OWNER_APPROVAL" };
  const minimum = Number.isFinite(minimumDailyBudgetCad) ? minimumDailyBudgetCad : pilot.minimumDailyBudgetCad;
  if (Number.isFinite(minimum) && minimum > pilot.dailyBudgetCad)
    return { valid: false, reason: "META_MINIMUM_EXCEEDS_APPROVED_BUDGET" };
  return { valid: true };
}

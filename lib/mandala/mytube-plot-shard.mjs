/** Single source of truth for historical editorial plot shard ownership.
 * The public four-category taxonomy was regrouped without renaming existing
 * licensed/editorial plot IDs. Both MyTube and Telegram must resolve the same
 * legacy shard before projecting CURRENT category/subcategory/topic metadata.
 * Never choose an unrelated plot when the verified original shard is absent.
 */
export const LEGACY_PLOT_SHARD_BY_SUBCATEGORY=Object.freeze({
  "stress-fatigue":"energy-confidence","vital-energy":"energy-confidence",
  "confidence-calm":"energy-confidence","body-health":"energy-confidence",
  "purpose-development":"goals-money","business-career":"goals-money",
  "psychological-trauma":"stress-anxiety","depression-apathy":"stress-anxiety",
});
export const originalPlotShard=owner=>LEGACY_PLOT_SHARD_BY_SUBCATEGORY[owner.subcategoryId]||owner.categoryId;

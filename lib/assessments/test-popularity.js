/**
 * Compare anonymous catalog activity or voluntary usefulness ratings.
 * Missing ratings are UNRATED, not 0 stars. Completion is weighted more
 * heavily than starting a questionnaire, so accidental opens cannot dominate.
 */
export function compareTestSocialProof(a, b, mode, stats = {}) {
  const left = stats[a.key] || {}
  const right = stats[b.key] || {}
  if (mode === 'popular') {
    const leftScore = (Number(left.completions) || 0) * 3 + (Number(left.starts) || 0)
    const rightScore = (Number(right.completions) || 0) * 3 + (Number(right.starts) || 0)
    return rightScore - leftScore ||
      (Number(right.completions) || 0) - (Number(left.completions) || 0) ||
      (Number(right.starts) || 0) - (Number(left.starts) || 0) ||
      a.key.localeCompare(b.key)
  }
  if (mode === 'rating') {
    // Bayesian smoothing prevents a single five-star vote outranking well-reviewed tests.
    const score = (value) => {
      const n = Number(value.ratingCount) || 0
      if (!n || !Number.isFinite(Number(value.averageRating))) return -1
      return ((Number(value.averageRating) * n) + (3.5 * 5)) / (n + 5)
    }
    return score(right) - score(left) ||
      (Number(right.ratingCount) || 0) - (Number(left.ratingCount) || 0) ||
      a.key.localeCompare(b.key)
  }
  return 0
}

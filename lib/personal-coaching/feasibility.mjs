export function needsFeasibilityReview(enabled,rating){
  return enabled===true&&typeof rating==='string'&&/^[0-6]$/.test(rating)
}
export function canSaveFeasibility(enabled,rating,choice,safetyConcern){
  return safetyConcern===true||!needsFeasibilityReview(enabled,rating)||['considered','keep'].includes(choice)
}

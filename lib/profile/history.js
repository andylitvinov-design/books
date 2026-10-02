function assertSameAccount(results) {
  if (new Set(results.map(result => result.accountId)).size !== 1) throw new Error('Results must have the same owner')
}

export function compareResults(current, prior) {
  assertSameAccount([current, prior])
  if (current.definitionKey !== prior.definitionKey || current.definitionVersion !== prior.definitionVersion || current.instrumentLocale !== prior.instrumentLocale) throw new Error('Results are not compatible')
  const priorDimensions = new Map(prior.dimensions.map(dimension => [dimension.key, dimension]))
  return current.dimensions.flatMap(dimension => {
    const before = priorDimensions.get(dimension.key)
    if (!before || before.min !== dimension.min || before.max !== dimension.max || before.timeframe !== dimension.timeframe) return []
    return [{key: dimension.key, current: dimension.value, prior: before.value, delta: dimension.value - before.value, unit: 'points'}]
  })
}

export function createProfileSnapshot({id, accountId, generatedResult, carriedResults = [], createdAt}) {
  assertSameAccount([generatedResult, ...carriedResults])
  if (generatedResult.accountId !== accountId) throw new Error('Snapshot owner must own its generating result')
  const allResults = [generatedResult, ...carriedResults]
  return {id, accountId, generatingResultId: generatedResult.id, createdAt, dimensions: allResults.flatMap(result => result.dimensions.map(dimension => ({...dimension, sourceResultId: result.id, measurementAt: result.measurementAt, remeasured: result.id === generatedResult.id})))}
}

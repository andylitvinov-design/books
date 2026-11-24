import { AppError } from '../assessments/contracts.js'
// One owner/page lifetime. Never store private previews or locator tickets persistently.
export function createDaybookCoachClient(fetcher, accountId) {
  let epoch = 0, disposed = false
  const stale = () => new AppError('DAYBOOK_COACH_STALE', 409)
  return {
    invalidate() { epoch++ },
    dispose() { disposed = true; epoch++ },
    async run(input) {
      if (disposed) throw stale()
      const token = ++epoch
      try {
        const result = await fetcher('daybook-coach', input, 'POST', { accountId })
        if (disposed || token !== epoch) throw stale()
        return result
      } catch (error) {
        if (disposed || token !== epoch) throw stale()
        throw error
      }
    },
  }
}

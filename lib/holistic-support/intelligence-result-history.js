import 'server-only'
import { verifiedHistoryView } from '../assessments/verified-history.js'

// Only a minimal instrument-key projection leaves this server-only adapter.
// Verification is performed on the owner's exact saved source and score version.
export function projectVerifiedCompletedTestKeys({results,accountId,now=Date.now()}={}) {
  if (!Array.isArray(results) || typeof accountId !== 'string' || !accountId || !Number.isFinite(now))
    throw new Error('INVALID_RESULT_HISTORY')
  const owned=results.filter(row=>row?.accountId===accountId &&
    Number.isFinite(Date.parse(row.measurementAt)) && Date.parse(row.measurementAt)<=now)
  const keys=verifiedHistoryView(owned).current.map(row=>row.definitionKey)
    .filter(key=>typeof key==='string' && /^[a-z0-9][a-z0-9-]{1,95}$/.test(key))
  return {completedKeys:[...new Set(keys)].sort()}
}

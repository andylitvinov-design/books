import { AppError } from '../assessments/contracts.js'

// This header is a stale-account guard, never an authentication credential.
// The actor must already have been verified from the current request's cookies.
export function requireCommerceAccount(request, actor) {
  if (!actor?.id || request.headers.get('x-hh-account-id') !== actor.id)
    throw new AppError('ACCOUNT_CHANGED', 409)
  return actor.id
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// A mounted page binds exactly once. A logout/account switch invalidates the
// whole payment context; it cannot silently bind the same page to another user.
export function createCommerceAccountGuard() {
  let mounted = false, generation = 0, accountId = null, invalid = false
  return {
    mount() { mounted = true; generation += 1; return generation },
    unmount() { mounted = false; generation += 1 },
    invalidate() { invalid = true; generation += 1 },
    bindInitial(value, expectedGeneration) {
      if (!mounted || invalid || generation !== expectedGeneration || typeof value !== 'string' || !uuid.test(value)) return false
      if (accountId && accountId !== value) { invalid = true; generation += 1; return false }
      accountId = value
      return true
    },
    capture() { return mounted && !invalid && accountId ? { accountId, generation } : null },
    current(ticket) { return Boolean(ticket && mounted && !invalid && accountId === ticket.accountId && generation === ticket.generation) },
  }
}

export function commerceIdentityError(status) { return [401, 403, 409].includes(status) }

export async function verifyCommerceIdentity(guard, ticket, fetcher = fetch) {
  if (!guard.current(ticket)) return false
  const response = await fetcher('/api/app/commerce/status', {
    credentials: 'same-origin', cache: 'no-store', headers: { 'X-HH-Account-ID': ticket.accountId },
  })
  if (!guard.current(ticket)) return false
  if (commerceIdentityError(response.status)) {
    guard.invalidate()
    throw new Error('ACCOUNT_CHANGED')
  }
  if (!response.ok) throw new Error('SERVICE_CHECKOUT_UNAVAILABLE')
  const value = await response.json()
  if (!guard.current(ticket)) return false
  if (value.accountId !== ticket.accountId) {
    guard.invalidate()
    throw new Error('ACCOUNT_CHANGED')
  }
  return true
}

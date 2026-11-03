export type CommerceAccountTicket = { accountId: string; generation: number }
export type CommerceAccountGuard = {
  mount(): number
  unmount(): void
  invalidate(): void
  bindInitial(accountId: unknown, generation: number): boolean
  capture(): CommerceAccountTicket | null
  current(ticket: CommerceAccountTicket | null): boolean
}
export function createCommerceAccountGuard(): CommerceAccountGuard
export function commerceIdentityError(status: number): boolean
export function verifyCommerceIdentity(guard: CommerceAccountGuard, ticket: CommerceAccountTicket, fetcher?: typeof fetch): Promise<boolean>

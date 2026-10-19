export const SERVICE_CART_STORAGE_KEY: string
export const SERVICE_CART_UPDATED_EVENT: string
export function restoreServiceCart(value: string | null): string[]
export function selectServiceCart(ids: string[]): { id: string; amountMinor: number; currency: string }[]

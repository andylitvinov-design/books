export const SERVICE_CART_STORAGE_KEY: string
export const SERVICE_CART_UPDATED_EVENT: string
export function restoreServiceCart(value: string | null): string[]
export function selectServiceCart(ids: string[]): { id: string; amountMinor: number; currency: string }[]

export const VIDEO_CART_STORAGE_KEY: string
export const VIDEO_CART_PRODUCTS: ReadonlyArray<{ id:string;amountMinor:number;currency:string;title:{en:string;ru:string;es:string} }>
export type VideoCartSelection = { id:string;brief:string }
export function videoCartProduct(id:unknown): {id:string;amountMinor:number;currency:string;title:{en:string;ru:string;es:string}} | null
export function createVideoCartSelection(id:unknown,brief?:string): VideoCartSelection | null
export function restoreVideoCart(value:string|null): VideoCartSelection | null

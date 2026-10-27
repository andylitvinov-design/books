// The basket stores ONLY allowlisted public catalog IDs, never private goals,
// personal wishes, contact details, payment state or an assumed product price.
import { TAOIST_TALISMANS, talismanFromCatalog } from './taoist-talismans.js'

export const TALISMAN_CART_STORAGE_KEY = 'hh:taoist-talisman-cart:v1'
export const TALISMAN_CART_UPDATED_EVENT = 'hh:taoist-talisman-cart-updated'

export function normalizeTalismanCart(value) {
  if (!Array.isArray(value) || value.length > TAOIST_TALISMANS.length) return []
  if (value.some(id => typeof id !== 'string' || !talismanFromCatalog(id))) return []
  return [...new Set(value)]
}

export function readTalismanCart(storage) {
  try {
    const raw = storage?.getItem(TALISMAN_CART_STORAGE_KEY)
    if (typeof raw !== 'string' || raw.length > 300) return []
    return normalizeTalismanCart(JSON.parse(raw))
  } catch { return [] }
}

export function readBrowserTalismanCart() {
  if (typeof window === 'undefined') return []
  try { return readTalismanCart(window.sessionStorage) }
  catch { return [] }
}

export function saveBrowserTalismanCart(ids) {
  if (typeof window === 'undefined') return false
  const normalized = normalizeTalismanCart(ids)
  if (!Array.isArray(ids) || normalized.length !== new Set(ids).size) return false
  try {
    window.sessionStorage.setItem(TALISMAN_CART_STORAGE_KEY, JSON.stringify(normalized))
    window.dispatchEvent(new Event(TALISMAN_CART_UPDATED_EVENT))
    return true
  } catch { return false }
}

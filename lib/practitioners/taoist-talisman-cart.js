// The basket stores ONLY allowlisted public catalog IDs, never private goals,
// personal wishes, contact details, payment state or an assumed product price.
import { TAOIST_TALISMANS, talismanFromCatalog } from './taoist-talismans.js'

export const TALISMAN_CART_STORAGE_KEY = 'hh:taoist-talisman-cart:v1'
export const TALISMAN_CART_UPDATED_EVENT = 'hh:taoist-talisman-cart-updated'
// One-use OAuth return marker contains only the public pathname and expiry.
export const TALISMAN_GOOGLE_RETURN_KEY = 'hh:taoist-talisman-google-return:v1'

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


export function isTalismanGoogleReturn(storage, pathname, search, now = Date.now()) {
  try {
    if (typeof pathname !== 'string' ||
        !/^\/(?:en|ru|es)\/(?:holistic-support(?:\/mobile)?|talismans\/cart)$/.test(pathname) ||
        new URLSearchParams(search).get('hh_enquiry') !== 'google') return false
    const raw = storage?.getItem(TALISMAN_GOOGLE_RETURN_KEY)
    if (!raw || raw.length > 200) return false
    const marker = JSON.parse(raw)
    return marker?.path === pathname &&
      Number.isSafeInteger(marker.createdAt) &&
      marker.createdAt <= now + 60000 &&
      now - marker.createdAt <= 10 * 60 * 1000 &&
      readTalismanCart(storage).length > 0
  } catch { return false }
}

// Client navigation consults only the public OAuth marker and local allowlisted
// basket IDs, never a rating, photo, user email or account token.
export function pendingBrowserTalismanGoogleReturn() {
  if (typeof window === 'undefined') return false
  return isTalismanGoogleReturn(
    window.sessionStorage, window.location.pathname, window.location.search
  )
}


export function consumeBrowserTalismanGoogleReturn() {
  if (!pendingBrowserTalismanGoogleReturn()) return false
  try {
    const url = new URL(window.location.href)
    window.sessionStorage.removeItem(TALISMAN_GOOGLE_RETURN_KEY)
    url.searchParams.delete('hh_enquiry')
    url.searchParams.delete('auth')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
    return true
  } catch { return false }
}

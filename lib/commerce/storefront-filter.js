export const SHOP_KINDS = Object.freeze(['all', 'session', 'program', 'free'])
export const SHOP_SORTS = Object.freeze(['featured', 'price-low', 'price-high', 'name'])

export function filterStorefrontCards(cards, { kind = 'all', query = '', sort = 'featured' } = {}) {
  if (!Array.isArray(cards)) return []
  const selectedKind = SHOP_KINDS.includes(kind) ? kind : 'all'
  const safeQuery = typeof query === 'string' ? query.trim().slice(0, 90).toLocaleLowerCase() : ''
  const list = cards.filter(card =>
    card && SHOP_KINDS.includes(card.kind) && card.kind !== 'all' &&
    (selectedKind === 'all' || selectedKind === card.kind) &&
    (!safeQuery || String(card.title + ' ' + card.description + ' ' + card.label)
      .toLocaleLowerCase().includes(safeQuery))
  )
  if (!SHOP_SORTS.includes(sort) || sort === 'featured') return list
  return list.slice().sort((a, b) => {
    if (sort === 'name') return String(a.title).localeCompare(String(b.title))
    // Unpriced courses stay outside the price ranking and never masquerade as zero-cost items.
    const amountA = Number.isInteger(a.amountMinor) && a.amountMinor >= 0 ? a.amountMinor : null
    const amountB = Number.isInteger(b.amountMinor) && b.amountMinor >= 0 ? b.amountMinor : null
    if (amountA === null || amountB === null) return amountA === null ? amountB === null ? 0 : 1 : -1
    return sort === 'price-low' ? amountA - amountB : amountB - amountA
  })
}

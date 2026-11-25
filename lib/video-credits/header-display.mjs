// Presentation helpers only. The verified account API owns the balance.
export function formatHeaderCredits(amount) {
  if (!Number.isSafeInteger(amount) || amount < 0) return '—'
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
}
export function headerCreditPercentage(amount, capacity) {
  if (!Number.isSafeInteger(amount) || amount < 0 ||
      !Number.isSafeInteger(capacity) || capacity <= 0) return null
  return Math.min(100, Math.max(0, Math.round(amount / capacity * 100)))
}

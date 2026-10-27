import assert from 'node:assert/strict'

// A public request must never reveal payment methods until the assigned
// practitioner confirms a time. The existing cart is opened afterward.
export async function assertAlchemyBookingGate(main, expect, width) {
  const pricing = main.locator('[data-alchemy-booking-formats]')
  await expect(pricing).toHaveCount(1)
  const book = pricing.locator('[data-booking-cta="book"]')
  await expect(book).toHaveCount(1)
  const bounds = await book.boundingBox()
  assert.ok(bounds && bounds.height >= 44 && bounds.width >= 44,
    'Book a Session is a reachable 44px touch target at width ' + width)
  assert.equal(await pricing.locator('[data-alchemy-payment-disclosure]').count(), 0,
    'Legacy payment links must be removed from the public booking page')
  assert.equal(await pricing.locator('[data-booking-payment-options]').count(), 0,
    'Cart methods require a server-confirmed booking')
  assert.equal(await pricing.locator('[data-booking-cart-link]').count(), 0,
    'No cart link before master confirmation')
}

// Kept for the older verifier importing the existing file.
export const assertAlchemyPaymentsExpanded = assertAlchemyBookingGate

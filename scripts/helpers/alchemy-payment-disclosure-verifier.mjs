import assert from 'node:assert/strict';

// No payment methods on the booking page before an authenticated practitioner
// confirms a time. The single validated SKU enters the EXISTING cart after confirmation.
export async function assertAlchemyBookingGate(main, expect, width) {
  const pricing = main.locator('[data-alchemy-booking-formats]');
  await expect(pricing).toHaveCount(1);
  const book = pricing.locator('[data-booking-cta="book"]');
  await expect(book).toHaveCount(1);
  const bounds = await book.boundingBox();
  assert.ok(bounds && bounds.height >= 44 && bounds.width >= 44,
    'Book a Session is a reachable 44px touch target at width ' + width);
  assert.equal(await pricing.locator('[data-alchemy-payment-disclosure]').count(), 0,
    'Legacy payments must not be exposed on the public booking page');
  assert.equal(await pricing.locator('[data-booking-payment-options]').count(), 0,
    'Cart methods require a server-confirmed booking');
  assert.equal(await pricing.locator('[data-booking-cart-link]').count(), 0,
    'No cart link before owner confirmation');
}

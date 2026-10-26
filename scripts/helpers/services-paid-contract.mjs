import assert from 'node:assert/strict';

// Explicit reviewed identities/order, independent of the runtime offer array.
// Adding a seventh card, losing one, changing locale, route or order must fail.
export function paidServiceContract(locale, filter = 'all') {
  assert.ok(['en', 'ru', 'es'].includes(locale));
  assert.ok(['all', 'business', 'reiki'].includes(filter));
  const expected = [
    ['monthly-support', 'personal-support'],
    ['alchemy', 'alchemy-of-soul'],
    ['hypnotherapy', 'hypnotherapy-course'],
    ['constellations', 'systemic-constellations'],
    ['business', 'business-consulting'],
    ['remote-energy-support', 'remote-energy-support'],
  ].map(([id, route]) => ({id, headingRoutes:['/' + locale + '/services/' + route]}));
  if (filter === 'business') return expected.filter(card => ['monthly-support', 'business'].includes(card.id));
  if (filter === 'reiki') return expected.filter(card => card.id === 'remote-energy-support');
  return expected;
}

export async function assertPaidServiceCards(cards, locale, label, filter = 'all') {
  const actual = await cards.evaluateAll(nodes => nodes.map(node => ({
    id:node.getAttribute('data-services-studio-card'),
    headingRoutes:[...node.querySelectorAll('h3 a[href]')].map(link => link.getAttribute('href')),
  })));
  assert.deepEqual(actual, paidServiceContract(locale, filter), label + ': exact ordered personal-service identities and localized routes for ' + filter);
}

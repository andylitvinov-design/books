import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../scripts/verify-public-services-production.mjs', import.meta.url), 'utf8');
const start = source.indexOf('        const selectors = ["#services-conversion-title"');
const end = source.indexOf('      }), true, "Owner studio order:', start);
assert.ok(start > 0 && end > start);
const evaluate = new Function('document', 'Node', source.slice(start, end));
const order = ['#services-conversion-title', '#free-insights', '#solutions', '[data-services-meet]', '[data-personal-testimonials="services"]', '#method-videos', '#consultation', '[data-services-directory-invitation]'];
function check(sequence) {
  const document = { querySelectorAll: selector => sequence.flatMap((value, index) => value === selector ? [{ index, compareDocumentPosition(other) { return this.index < other.index ? 4 : 2; } }] : []) };
  return evaluate(document, { DOCUMENT_POSITION_FOLLOWING: 4 });
}
test('native Services predicate pins all eight owner-approved sections and rejects missing, duplicate or reversed placement', () => {
  assert.equal(check(order), true);
  for (const selector of order) {
    assert.equal(check(order.filter(value => value !== selector)), false, 'missing ' + selector);
    assert.equal(check([...order, selector]), false, 'duplicate ' + selector);
  }
  for (let index = 1; index < order.length; index++) {
    const swapped = [...order]; [swapped[index - 1], swapped[index]] = [swapped[index], swapped[index - 1]];
    assert.equal(check(swapped), false, 'wrong order ' + order[index]);
  }
});

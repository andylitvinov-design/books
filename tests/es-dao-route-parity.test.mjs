import assert from 'node:assert/strict';
import test from 'node:test';
import { mountPublicConversion } from './helpers/public-conversion-ui-harness.mjs';
import { exerciseDaoRequestUi } from '../scripts/helpers/dao-request-ui-verifier.mjs';

test('actual static Spanish DAO route preserves metadata and mounts one photo-led landing and one header', () => {
  const mounted = mountPublicConversion('es', 'dao');
  assert.deepEqual(Array.from(mounted.routeMetadata.syntheticMetadataArguments), [
    '/es/services/dao-health-profile',
    'Perfil gratuito de recursos Wu Xing — Holistic House',
    'Explora tus recursos personales mediante una guía simbólica Dao / Wu Xing, gratuita y no diagnóstica.',
  ]);
  assert.equal(mounted.page.locator('main[data-free-entry-landing="dao"]').selected().length, 1);
  assert.equal(mounted.page.locator('main[data-core-service-detail="dao"]').selected().length, 0);
  assert.equal(mounted.page.locator('header[data-test-public-header]').selected().length, 1);
  assert.equal(mounted.page.locator('[data-contact-channel-chooser]').selected().length, 1);
});

test('actual Spanish DAO route requires consented contact and confirmed save before optional messenger handoff', async () => {
  const mounted = mountPublicConversion('es', 'dao');
  await exerciseDaoRequestUi(mounted.page, mounted.expect, 'es');
  assert.equal(mounted.fetchCount(), 4);
  assert.ok(mounted.requests.every(request => request.contactConsent === true));
  assert.ok(mounted.requests.every(request => request.contact.email === 'visitor@example.test' && request.contact.phone === ''));
  assert.equal(mounted.externalClicks(), 0);
  assert.equal(mounted.intercepted(), false);
});

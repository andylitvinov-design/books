import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFESSIONAL_TEMPLATES, proposeProfessionalTemplate } from '../lib/mandala/professional-growth-templates.mjs';

test('P0 catalog has the twelve specified localized templates', () => {
  assert.deepEqual(PROFESSIONAL_TEMPLATES.map(item => item.id), ['A01','A03','A04','B01','B02','B03','C01','C02','C03','D01','D03','E01']);
  for (const item of PROFESSIONAL_TEMPLATES) {
    for (const locale of ['ru', 'en', 'es']) {
      assert.ok(item.title[locale]);
      assert.ok(item.description[locale]);
    }
    assert.equal(item.durationSec, 30);
    assert.equal(item.aspect, '9:16');
    assert.equal(item.beats.length, 4);
  }
});

test('chooses one matching template deterministically without claiming media availability', () => {
  const result = proposeProfessionalTemplate({goal: 'explain_method', locale: 'es'});
  assert.equal(result.templateId, 'D03');
  assert.equal(result.title, 'Explica tu método');
  assert.equal(result.mediaAvailability, 'not_checked');
  assert.equal(result.status, 'template_selected');
  assert.equal(result.durationSec, 30);
});

test('rejects unknown goals and locales instead of silently inventing a match', () => {
  assert.throws(() => proposeProfessionalTemplate({goal: 'unknown', locale: 'en'}), /unsupported_goal/);
  assert.throws(() => proposeProfessionalTemplate({goal: 'introduce', locale: 'fr'}), /unsupported_locale/);
});

test('each locale receives four timed editorial prompts, not invented claims', () => {
  for (const {goal} of PROFESSIONAL_TEMPLATES) {
    for (const locale of ['ru', 'en', 'es']) {
      const proposal = proposeProfessionalTemplate({goal, locale});
      assert.deepEqual(proposal.shotPlan.map(beat => [beat.startSec, beat.endSec]), [[0,3],[3,11],[11,24],[24,30]]);
      assert.ok(proposal.shotPlan.every(beat => typeof beat.instruction === 'string' && beat.instruction.length > 10));
      assert.equal(proposal.sceneIds.length, 0);
      assert.equal(proposal.requiresReview, true);
    }
  }
});

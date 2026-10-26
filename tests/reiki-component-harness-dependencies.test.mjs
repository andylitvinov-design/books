import assert from 'node:assert/strict';
import test from 'node:test';
import { createReikiLearner, oneReikiNode, readReikiSource, reikiNodes } from './helpers/reiki-current-component.mjs';
import { assertCurrentReviewSequence, assertCurrentSaveStatus } from './helpers/reiki-current-contracts.mjs';

const learnerPath = 'components/energywork-ai-learner.tsx';
const curriculumPath = 'data/academy/energywork-ai-curriculum.ts';
const learner = readReikiSource(learnerPath);
const curriculum = readReikiSource(curriculumPath);
const replaceOne = (source, before, after) => {
  assert.equal(source.split(before).length - 1, 1, 'One exact mutation target: ' + before);
  return source.replace(before, after);
};

test('Reiki fixture rejects unknown imports instead of silently creating empty adapters', () => {
  assert.throws(() => createReikiLearner({ overrides: {
    [learnerPath]: 'import "@/unmapped-reiki-dependency";\n' + learner,
  } }), /Unexpected dependency: @\/unmapped-reiki-dependency/);
  assert.throws(() => createReikiLearner({ overrides: {
    [curriculumPath]: 'import "@/unmapped-course-data";\n' + curriculum,
  } }), /Data dependencies stay local: @\/unmapped-course-data/);
});

test('Reiki fixture detects forbidden network attempts even when component code catches them', () => {
  const marker = 'export function EnergyworkAiLearner({ locale, startAtExperience = false }: Props) {';
  for (const effect of ['fetch("https://example.invalid/forbidden")', 'appFetch("/forbidden")', 'new XMLHttpRequest()', 'new WebSocket("wss://example.invalid/forbidden")']) {
    const input = replaceOne(learner, marker, marker + '\ntry { ' + effect + '; } catch {}');
    assert.throws(() => createReikiLearner({ overrides: { [learnerPath]: input } }).render(),
      /No external attempts, including caught failures/);
  }
});

function assertPhotoParent(overrides = {}) {
  for (const locale of ['en', 'ru']) for (const sync of ['guest', 'consent', 'checking', 'unavailable', 'ready']) {
    for (const submitted of [false, true]) {
      const fixture = createReikiLearner({ locale, slideId: 'init-photo-01', sync, overrides,
        state: { applicationLead: submitted ? { id: 'synthetic-application', status: 'submitted' } : null } });
      const photo = oneReikiNode(fixture.render(), node => node.type === 'initiation-photo', 'One explicit inert photo leaf');
      assert.equal(photo.props.locale, locale);
      assert.equal(photo.props.accountId, null, 'Effects are not run; the fixture never invents a signed-in account');
      assert.equal(photo.props.enabled, sync === 'ready' && !submitted, 'Photo replacement requires ready state and no submitted application');
      assert.equal(photo.props.photo, null, 'No private photo is fabricated by the harness');
      const syntheticPhoto = { exists: true, url: 'https://example.invalid/synthetic-private-photo' };
      photo.props.onSaved(syntheticPhoto);
      const saved = oneReikiNode(fixture.render(), node => node.type === 'initiation-photo', 'Same photo leaf after state-only callback');
      assert.equal(saved.props.photo, syntheticPhoto, 'The real parent retains the saved-photo callback binding');
      fixture.assertNoExternalOperations();
    }
  }
  for (const slideId of ['flight-voices', 'tan-voices', 'kun-voices', 'ygg-voices', 'end-02']) {
    const fixture = createReikiLearner({ slideId, overrides });
    assert.equal(reikiNodes(fixture.render()).filter(node => node.type === 'initiation-photo').length, 0,
      'Photo uploader is not moved onto review or completion screens');
    fixture.assertNoExternalOperations();
  }
}

test('Inert photo dependency preserves parent privacy gates without mounting upload or account effects', () => {
  assertPhotoParent();
});

test('Photo gate and consent-negative controls fail for their behavioral contract, not dependency errors', () => {
  const unsafePhoto = replaceOne(learner, 'enabled={sync === "ready" && !Boolean(applicationLead)}', 'enabled={true}');
  assert.throws(() => assertPhotoParent({ [learnerPath]: unsafePhoto }),
    /Photo replacement requires ready state and no submitted application/);
  const uncheckedSave = replaceOne(learner, 'disabled={!consented || busy} onClick={startSaving}', 'disabled={busy} onClick={startSaving}');
  assert.throws(() => assertCurrentSaveStatus({ [learnerPath]: uncheckedSave }), /Unchecked consent cannot save/);
});

test('Exact course-order contract rejects photo loss, duplication, displacement and report/practice reordering', () => {
  assertCurrentReviewSequence();
  const cases = [
    ['[initiationPhotoSlide, item]', '[item]', /All active screens/],
    ['[initiationPhotoSlide, item]', '[initiationPhotoSlide, initiationPhotoSlide, item]', /All active screens/],
    ['.flatMap((item) => item.id === "end-02"', '.flatMap((item) => item.id === "intention-04"', /Editorial and server-readable course order agree/],
    ['    ...practices,\n    finale,', '    finale,\n    ...practices,', /Editorial and server-readable course order agree/],
  ];
  for (const [before, after, expected] of cases) {
    const changed = replaceOne(curriculum, before, after);
    assert.throws(() => assertCurrentReviewSequence({ [curriculumPath]: changed }), expected);
  }
});

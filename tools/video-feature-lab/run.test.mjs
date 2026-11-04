import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {readManifest, validateReference, inspectOwnCode} from './run.mjs';

const manifest = readManifest();
test('official help-only features are scoped, unique and ready for offline planning', () => {
  assert.equal(manifest.features.length, 10);
  assert.equal(manifest.competitorServiceAccess, 'NOT_PERFORMED');
  assert.deepEqual(new Set(manifest.referenceDocs.map(x => x.id)).size, manifest.referenceDocs.length);
});
test('an own source file never counts as implementation, browser or MP4 verification', () => {
  const data = inspectOwnCode(manifest);
  assert.equal(data.rows.length, 10);
  assert.equal(data.productionReady, false);
  assert.equal(data.competitorCodeCopied, false);
  for (const row of data.rows) {
    assert.equal(row.implementationVerified, false);
    assert.equal(row.browserVerified, false);
    assert.equal(row.exportedVideoVerified, false);
  }
});
test('rejects external origin source URLs and paths that can escape the repo', () => {
  const clone = structuredClone(manifest);
  clone.referenceDocs[0].url = 'https://www.canva.com/login/?token=123';
  assert.throws(() => validateReference(clone), /source metadata/);
  clone.referenceDocs[0].url = manifest.referenceDocs[0].url;
  clone.features[0].hhFiles[0] = 'components/../../.env';
  assert.throws(() => validateReference(clone), /own source path/);
});
test('file existence probe stays limited to a synthetic first-party directory', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'hh-video-lab-test-'));
  try {
    mkdirSync(join(workspace, 'components'));
    writeFileSync(join(workspace, 'components', 'video.tsx'), 'export const video = true;');
    const one = {schemaVersion: 1, sourceEvidence:'OFFICIAL_HELP_PAGES_ONLY', competitorServiceAccess:'NOT_PERFORMED',
      referenceDocs:[manifest.referenceDocs[0]],
      features:[{id:'F99',name:'Own minimal feature proof',priority:'P0',source:'S01',
        hhFiles:['components/video.tsx'],next:'Verify actual browser behavior before shipping'}]};
    const data = inspectOwnCode(one, workspace);
    assert.equal(data.rows[0].filesPresent, 1);
    assert.equal(data.rows[0].implementationVerified, false);
  } finally { rmSync(workspace, {recursive:true, force:true}); }
});

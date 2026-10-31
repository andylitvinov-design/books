import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflows = [
  ['hh-assessment-quality.yml', 'hh-assessment-evidence'],
  ['hh-direct-video-notes.yml', 'hh-direct-media'],
  ['hh-gauntlet-loop.yml', 'hh-gauntlet'],
  ['hh-salesbot-remaster-feature.yml', 'hh-salesbot-remaster'],
  ['holistic-house-ocean-audio.yml', 'holistic-house-ocean'],
];

test('specialist concurrency isolates unrelated events and only cancels an older PR head', () => {
  const condition = "github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after";
  for (const [file, prefix] of workflows) {
    const source = readFileSync(`.github/workflows/${file}`, 'utf8');
    assert.ok(source.includes(`group: ${prefix}-` + '${{ ' + condition + " && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}"), file);
    assert.ok(source.includes('cancel-in-progress: ${{ ' + condition + ' }}'), file);
  }
});

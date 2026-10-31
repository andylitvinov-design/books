import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = filename => readFileSync(new URL('../.github/workflows/'+filename, import.meta.url), 'utf8');
const dollar=String.fromCharCode(36);
const events='  pull_request:\n    types: [opened, synchronize, reopened, ready_for_review, converted_to_draft]\n';
const gate="    if: "+dollar+"{{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}";
const cancel="  cancel-in-progress: "+dollar+"{{ github.event_name == 'pull_request' }}";
const refSelector=dollar+"{{ github.event_name == 'pull_request' && github.event.pull_request.number || github.run_id }}";

test('heavy Interpretation DB and Live Audio defer Draft jobs but fully rerun on Ready',()=>{
  for(const [file,job,group,original] of [
    ['hh-interpretation-database.yml','interpretation-database','hh-interpretation-database','tests/interpretation-database.integration.mjs'],
    ['hh-live-audio-ci.yml','verify-live-audio','hh-live-audio','tests/live-audio-pilot.test.mjs'],
  ]){
    const y=read(file);
    assert.ok(y.includes(events),file+': missing Ready and Draft transition events');
    assert.ok(y.includes('  '+job+':\n'+gate+'\n'),file+': heavy job must only execute for Ready');
    assert.ok(y.includes('  group: '+group+'-'+refSelector),file+': same-PR cancellation only');
    assert.ok(y.includes(cancel),file+': manual/other jobs must not get cancelled');
    assert.ok(y.includes("      - 'tests/ci-expensive-draft-ready-policy.test.mjs'"),file+': own policy test not self-triggered');
    assert.ok(y.includes('tests/ci-expensive-draft-ready-policy.test.mjs'),file+': policy test must execute');
    assert.ok(y.includes(original),file+': original specialist regression lost');
    assert.doesNotMatch(y,/continue-on-error:\s*true/,file+': no fail-open');
  }
});

test('isolated database privacy and no-provider audio permission checks remain',()=>{
  const db=read('hh-interpretation-database.yml');
  const audio=read('hh-live-audio-ci.yml');
  for(const must of ['postgres:17-alpine','HH_APP_TEST_RUNTIME: isolated','HH_INTERPRETATION_DB_TEST: synthetic-only',
    'HH_TEST_ADMIN_DATABASE_URL','tests/interpretation-db-isolation.test.mjs',
    'tests/interpretation-database.integration.mjs']) assert.ok(db.includes(must),'Database guard lost: '+must);
  for(const must of ['HH_LIVE_AUDIO_ENABLED','tests/live-audio-pilot.test.mjs',
    'lib/live-audio/policy.mjs','npm run build','microphone=(self)','microphone=()',
    'app/api/live-audio/status/route.js']) assert.ok(audio.includes(must),'Audio guard lost: '+must);
  assert.match(audio,/^  workflow_dispatch:/m);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildReadiness,
  isSupportedReaNode,
  REA_NODE_RANGE,
  REA_VERSION,
} from '../scripts/benchmarking/rea-node-readiness.mjs';

test('REA 6.8.0 rejects existing Mac Node 22.22.3 and unsupported 23/25', () => {
  for (const version of [
    'v22.22.3', '22.23.3', '22.19.0', 'v24.22.0',
    'v26.12.0', '23.99.0', '25.99.0',
    'v22.23.4-rc.1', '22.23.4+modified', '', 'junk', null, undefined,
  ]) {
    assert.equal(isSupportedReaNode(version), false, String(version));
  }
});

test('REA 6.8.0 accepts its exact supported minimum patch releases', () => {
  for (const version of [
    '22.23.4', 'v22.23.5', 'v22.24.0',
    '24.22.1', 'v24.22.2', '24.23.0',
    '26.12.1', 'v26.12.2', '26.13.0', '27.0.0',
  ]) {
    assert.equal(isSupportedReaNode(version), true, version);
  }
});

test('REA checker never claims a complete installation', () => {
  const blocked = buildReadiness('v22.22.3');
  assert.equal(blocked.outcome, 'BLOCKED_UNSUPPORTED_NODE');
  assert.equal(blocked.supported_range, REA_NODE_RANGE);
  assert.equal(blocked.version, REA_VERSION);
  assert.equal(blocked.installation_attempted, false);
  assert.equal(blocked.mcp_configuration_changed, false);

  const passes = buildReadiness('v22.23.4');
  assert.equal(passes.outcome, 'NODE_PASS_ONLY');
  assert.match(passes.next, /NOT proof of REA installation/);
  assert.equal(passes.installation_attempted, false);
});

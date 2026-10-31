/**
 * REA 6.8.0 Node.js readiness check (read-only; no npm, no MCP writes).
 * Source of runtime constraint: https://github.com/morluto/rea/tree/rea-agents-6.8.0
 */
import { pathToFileURL } from 'node:url';

export const REA_VERSION = '6.8.0';
export const REA_NODE_RANGE = '^22.23.4 || ^24.22.1 || >=26.12.1';

export function isSupportedReaNode(version) {
  if (typeof version !== 'string') return false;
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return false; // reject prereleases, malformed versions, untrusted output
  const [, majorText, minorText, patchText] = match;
  const [major, minor, patch] = [majorText, minorText, patchText].map(Number);
  if (![major, minor, patch].every(Number.isSafeInteger)) return false;
  if (major === 22) return minor > 23 || (minor === 23 && patch >= 4);
  if (major === 24) return minor > 22 || (minor === 22 && patch >= 1);
  return major > 26 || (major === 26 && (minor > 12 || (minor === 12 && patch >= 1)));
}

export function buildReadiness(version) {
  const supported = isSupportedReaNode(version);
  return {
    tool: 'rea-agents',
    version: REA_VERSION,
    node_version: version,
    supported_range: REA_NODE_RANGE,
    supported,
    outcome: supported ? 'NODE_PASS_ONLY' : 'BLOCKED_UNSUPPORTED_NODE',
    next: supported
      ? 'Run separately reviewed package integrity and sandboxed doctor; NOT proof of REA installation.'
      : 'Use a separate Node.js 22.23.4 or 24.22.1 runtime. Do not replace the Holistic House project runtime.',
    installation_attempted: false,
    mcp_configuration_changed: false,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = buildReadiness(process.version);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (process.argv.includes('--strict') && !result.supported) process.exitCode = 2;
}

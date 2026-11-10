'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
test('legacy fallback targets the current verified complete immutable standalone deployment', () => {
  // Verified one-tap Council complete production bundle: dpl_8M1qtKur2j5YVBHsnEfggUrHEqLJ.
  // Do not point this proxy at an incomplete Git-only archive.
  const rewrites = cfg.rewrites || [];
  assert.equal(rewrites.length, 1);
  assert.deepEqual(rewrites[0], {
    source: '/:path*',
    destination: 'https://holistic-house-pr-monitor-2yqc9bhgt-super10.vercel.app/:path*'
  });
  assert.match(JSON.stringify(cfg.headers), /ai-council-free-super10\.vercel\.app/);
});
test('new local Commander owner and Codex routes remain in the current source tree', () => {
  for (const file of [
    'api/commander-session.js',
    'api/commander-drafts.js',
    'api/commander-chats.js',
    'api/commander-codex.js',
    'lib/commander-private-store.js',
    'task-editor.html', 'chats.html', 'commander-codex.js'
  ]) assert.equal(fs.existsSync(path.join(root, file)), true, file);
});

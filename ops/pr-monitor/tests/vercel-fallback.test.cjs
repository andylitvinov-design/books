'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
test('standalone monitor does not proxy owner APIs to retired deployment', () => {
  // A verified, complete source manifest must be used for releases. A global
  // external fallback silently redirects private APIs or hides missing assets.
  const rewrites = cfg.rewrites || [];
  assert.equal(rewrites.length, 0, 'no blanket external rewrite on owner/API routes');
  assert.match(JSON.stringify(cfg.headers), /ai-council-free-super10\.vercel\.app/);
  assert.match(fs.readFileSync(path.join(root, 'api/commander-chats.js'), 'utf8'),
    /require\('\.\.\/lib\/commander-private-store'\)/);
  assert.equal(fs.existsSync(path.join(root, 'lib/commander-private-store.js')), true,
    'same-origin Supabase owner adapter required in Vercel deployment');
  assert.equal(fs.existsSync(path.join(root, 'index.html')), true, 'full site root required');
  assert.equal(fs.existsSync(path.join(root, 'pr-monitor.html')), true, 'full PR monitor required');
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

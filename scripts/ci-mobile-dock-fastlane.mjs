#!/usr/bin/env node
// Immutable-base classifier for the narrow Messages mobile-dock CI lane.
// This file MUST be loaded from HEAD^1 by the workflow, never from PR HEAD.
import { execFileSync } from 'node:child_process';

export const MOBILE_DOCK_ALLOWED_FILES = Object.freeze([
  'app/[locale]/app/[[...path]]/workspace.css',
  'app/[locale]/app/messages/messages-page.css',
  'components/app/messages-bottom-navigation.jsx',
  'lib/mobile-visual-bottom.mjs',
  'tests/mobile-visual-dock.test.mjs',
]);

const allowed = new Set(MOBILE_DOCK_ALLOWED_FILES);

export function isMobileDockOnlyChange(rows) {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > MOBILE_DOCK_ALLOWED_FILES.length) return false;
  const seen = new Set();
  for (const row of rows) {
    if (!row || row.status !== 'M' || typeof row.filename !== 'string' ||
        !allowed.has(row.filename) || seen.has(row.filename)) return false;
    seen.add(row.filename);
  }
  // The scope is specifically the one shared bottom dock, not arbitrary CSS
  // or a test-only PR that happens to use one of the allowlisted filenames.
  return seen.has('components/app/messages-bottom-navigation.jsx');
}

export function isExactMobileDockMerge({
  eventName, baseRef, expectedBase, expectedHead, mergeSha, firstParent,
  secondParent, baseIsAncestor, rows,
}) {
  if (eventName !== 'pull_request' || baseRef !== 'codex/public-book-library' ||
      !/^[0-9a-f]{40}$/.test(expectedBase || '') ||
      !/^[0-9a-f]{40}$/.test(expectedHead || '') ||
      !/^[0-9a-f]{40}$/.test(mergeSha || '') ||
      !/^[0-9a-f]{40}$/.test(firstParent || '') ||
      !/^[0-9a-f]{40}$/.test(secondParent || '') ||
      secondParent !== expectedHead ||
      (firstParent !== expectedBase && baseIsAncestor !== true)) return false;
  return isMobileDockOnlyChange(rows);
}

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 2_000_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function readChangedRows(base, head) {
  const raw = execFileSync('git', ['diff', '--no-renames', '--name-status', '-z', base, head], {
    encoding: 'utf8', maxBuffer: 1_000_000, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const fields = raw.split('\0');
  if (fields.at(-1) === '') fields.pop();
  if (!fields.length || fields.length % 2) return [];
  const rows = [];
  for (let index = 0; index < fields.length; index += 2) {
    rows.push({ status: fields[index], filename: fields[index + 1] });
  }
  return rows;
}

function main() {
  try {
    if (process.env.GITHUB_SHA !== git(['rev-parse', 'HEAD'])) return false;
    const parents = git(['rev-list', '--parents', '-n', '1', 'HEAD']).split(/\s+/);
    if (parents.length !== 3) return false;
    const [, firstParent, secondParent] = parents;
    const expectedBase = process.env.HH_EXPECTED_BASE || '';
    const expectedHead = process.env.HH_EXPECTED_HEAD || '';
    const baseIsAncestor = firstParent === expectedBase || (() => {
      try {
        execFileSync('git', ['merge-base', '--is-ancestor', expectedBase, firstParent], {
          stdio: 'ignore',
        });
        return true;
      } catch {
        return false;
      }
    })();
    const rows = readChangedRows(firstParent, process.env.GITHUB_SHA);
    return isExactMobileDockMerge({
      eventName: process.env.HH_PR_EVENT,
      baseRef: process.env.HH_BASE_REF,
      expectedBase,
      expectedHead,
      mergeSha: process.env.GITHUB_SHA,
      firstParent,
      secondParent,
      baseIsAncestor,
      rows,
    });
  } catch {
    return false;
  }
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  process.stdout.write(main() ? 'true\n' : 'false\n');
}

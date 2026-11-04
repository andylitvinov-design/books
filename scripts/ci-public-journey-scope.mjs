#!/usr/bin/env node
// Exact BASE/HEAD routing for the shared About/Contact/Toronto browser owner.
// Fail closed: unknown, mixed or unavailable changes run BOTH existing suites.
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const BOTH = Object.freeze({wave1: true, wave2: true});
const shared = path =>
  /^components\/public-pathway-strip\./.test(path) ||
  path === 'tests/public-pathway-migration.test.mjs' ||
  path === 'scripts/ci-public-journey-scope.mjs' ||
  path === 'tests/ci-public-journey-consolidation.test.mjs' ||
  path === '.github/workflows/hh-public-journey-wave1.yml';
const first = path =>
  /^components\/(?:public-journey-refresh|personal-testimonials)\.module\.css$/.test(path) ||
  /^app\/[^/]+\/about\/page\.tsx$/.test(path) ||
  /^app\/\[locale\]\/contact\//.test(path) ||
  path === 'scripts/verify-public-pathway-mobile.mjs' ||
  path === 'docs/design/PUBLIC_SITE_TRANSFORMATION_V1_20261028.md';
const toronto = path =>
  /^app\/\[locale\]\/toronto\//.test(path) ||
  path === 'tests/public-pathway-toronto.test.mjs' ||
  path === 'scripts/verify-public-pathway-toronto-mobile.mjs';

export function planPublicJourneys(paths) {
  if (!Array.isArray(paths) || paths.length === 0 ||
      paths.some(path => typeof path !== 'string' || !path || path.includes('\0'))) return {...BOTH};
  let wave1 = false, wave2 = false;
  for (const path of paths) {
    if (shared(path)) {wave1 = true; wave2 = true;}
    else if (first(path)) wave1 = true;
    else if (toronto(path)) wave2 = true;
    else return {...BOTH};
  }
  return {wave1, wave2};
}

export function planFromGitDiff(base, head, command = execFileSync) {
  if (!/^[0-9a-f]{40}$/i.test(base || '') || !/^[0-9a-f]{40}$/i.test(head || '')) return {...BOTH};
  try {
    const raw = command('git', ['diff','--no-renames','--name-only','-z',base,head], {
      encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
    });
    if (typeof raw !== 'string' || !raw.endsWith('\0')) return {...BOTH};
    return planPublicJourneys(raw.split('\0').filter(Boolean));
  } catch {
    return {...BOTH};
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const result = planFromGitDiff(process.env.HH_BASE_SHA, process.env.HH_HEAD_SHA);
  if (!result.wave1 && !result.wave2) throw Error('NO_PUBLIC_JOURNEY_SUITE_SELECTED');
  const output = 'wave1=' + result.wave1 + '\nwave2=' + result.wave2 + '\n';
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output);
  console.log('Public journey exact-scope routing: ' + JSON.stringify(result));
}

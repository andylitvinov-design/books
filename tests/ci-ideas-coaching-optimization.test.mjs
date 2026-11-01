import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runMobileBrowserCases } from '../scripts/ci-mobile-browser-batch.mjs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('browser engines are reused and at most two independent cases execute at once', async () => {
  const original = process.env.HH_BROWSER_QA_PARALLEL;
  process.env.HH_BROWSER_QA_PARALLEL = '2';
  const launched = [], closed = [], results = [];
  let active = 0, peak = 0;
  const engine = name => ({name: () => name, launch: async () => {
    launched.push(name);
    return {close: async () => { closed.push(name); }};
  }});
  try {
    await runMobileBrowserCases([
      {browserType: engine('webkit'), cases: [[1], [2], [3], [4]]},
      {browserType: engine('chromium'), cases: [[5], [6]]},
    ], async (type, browser, id) => {
      assert.ok(browser);
      active++;
      peak = Math.max(active, peak);
      await Promise.resolve();
      results.push(type.name() + ':' + id);
      active--;
    });
    assert.deepEqual(launched, ['webkit','chromium']);
    assert.deepEqual(closed, ['webkit','chromium']);
    assert.equal(results.length, 6);
    assert.equal(new Set(results).size, 6);
    assert.ok(peak <= 2 && peak >= 1);
  } finally {
    if (original === undefined) delete process.env.HH_BROWSER_QA_PARALLEL;
    else process.env.HH_BROWSER_QA_PARALLEL = original;
  }
});

test('a failed browser case still fails the suite and closes its browser', async () => {
  const original = process.env.HH_BROWSER_QA_PARALLEL;
  process.env.HH_BROWSER_QA_PARALLEL = '1';
  let closed = false;
  try {
    await assert.rejects(runMobileBrowserCases([
      {browserType: {launch: async () => ({close: async () => {closed = true;}})}, cases: [[1],[2]]},
    ], async () => {throw Error('original browser assertion failed');}), /original browser assertion failed/);
    assert.equal(closed, true);
  } finally {
    if (original === undefined) delete process.env.HH_BROWSER_QA_PARALLEL;
    else process.env.HH_BROWSER_QA_PARALLEL = original;
  }
});

test('all original Coaching, Support and Ideas browser cases retain isolated contexts', () => {
  const scripts = [
    'scripts/verify-coaching-lounge-mobile.mjs',
    'scripts/verify-holistic-support-browser.mjs',
    'scripts/verify-ideas-mobile-browser.mjs',
  ];
  for(const path of scripts) {
    const js = source(path);
    assert.match(js, /runMobileBrowserCases\(/, path);
    assert.match(js, /browser\.newContext\(/, path);
    assert.match(js, /await context\.close\(\)/, path);
    assert.doesNotMatch(js, /browser\.newPage\(|await browser\.close\(\)/, path);
    assert.match(js, /browserType: webkit/);
    assert.match(js, /browserType: chromium/);
  }
  assert.match(source(scripts[0]), /\[320, 390, 430\]/);
  assert.match(source(scripts[1]), /\["ru", 320, 568\]/);
  assert.match(source(scripts[1]), /\["en", 430, 844\]/);
  assert.match(source(scripts[2]), /const widths = \[320, 375, 390, 430\]/);
});

test('full Next.js and mobile browser runs remain manual-only, not a PR merge blocker', () => {
  const yaml = source('.github/workflows/hh-ideas-coaching-public.yml');
  for (const label of [
    'Next.js production build (manual full acceptance only)',
    'Install isolated mobile browsers',
    'Real choice-first mobile journey in Chromium and WebKit (EN/RU/ES)',
  ]) {
    const start = yaml.indexOf('      - name: ' + label + '\n');
    assert.ok(start !== -1, 'missing manual acceptance step ' + label);
    assert.ok(yaml.slice(start, start + 190).includes("if: github.event_name != 'pull_request'"),
      'expensive acceptance must remain manual-only: ' + label);
  }
  assert.match(yaml, /HH_BROWSER_QA_PARALLEL: '2'/);
  assert.match(yaml, /uses: actions\/cache@v4/);
  assert.match(yaml, /node --test tests\/ci-ideas-coaching-optimization\.test\.mjs/);
  for(const name of ['verify-coaching-lounge-mobile','verify-holistic-support-browser','verify-ideas-mobile-browser']) {
    assert.ok(yaml.includes('node scripts/' + name + '.mjs'), name);
  }
  assert.doesNotMatch(yaml, /continue-on-error:\s*true/);
});

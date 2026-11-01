import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {needsAlchemyBrowser} from '../scripts/ci-alchemy-impact.mjs';

const file=(filename,status='modified')=>({filename,status});
test('Known CI workflow edits and current router test changes use only source checks',()=>{
  assert.equal(needsAlchemyBrowser([
    file('.github/workflows/hh-alchemy-mobile-acceptance.yml'),
    file('scripts/ci-alchemy-impact.mjs','added'),
    file('tests/ci-alchemy-impact.test.mjs','added'),
    file('tests/pr-fast-lane.test.mjs')
  ]),false);
});
test('Current runtime, auth, payments, unknown and removed files retain real Alchemy Chromium acceptance',()=>{
  for(const files of [null,[],[file('components/alchemy-soul-landing.tsx')],[file('app/api/payments/route.js')],
    [file('.github/workflows/hh-pr-core-release.yml')],[file('tests/ci-alchemy-impact.test.mjs','removed')],
    [file('.github/workflows/hh-growth-studio.yml'),file('components/personal-testimonials.tsx')]]) {
    assert.equal(needsAlchemyBrowser(files),true);
  }
});
test('Alchemy source contracts run and relevant PRs retain real Chromium and WebKit',()=>{
  const s=readFileSync(new URL('../.github/workflows/hh-alchemy-mobile-acceptance.yml',import.meta.url),'utf8');
  assert.match(s,/node scripts\/ci-alchemy-impact\.mjs/);
  assert.match(s,/node --test tests\/ci-alchemy-impact\.test\.mjs/);
  for (const name of ['Install browser once for real responsive check',
    'Build production-mode Next and measure 16 viewports in Chromium and WebKit']) {
    const actual=s.split('      - name: '+name+'\n')[1]?.split('\n')[0]?.trim();
    assert.equal(actual,"if: github.event_name != 'pull_request' || steps.impact.outputs.browser == 'true'",name+' runs for relevant PRs');
  }
  assert.match(s,/node --test \\/);
  assert.match(s,/node scripts\/verify-alchemy-one-screen\.mjs/);
  assert.match(s,/HH_ALCHEMY_BROWSER=webkit node scripts\/verify-alchemy-one-screen\.mjs/);
  assert.doesNotMatch(s,/continue-on-error:\s*true/);
});
